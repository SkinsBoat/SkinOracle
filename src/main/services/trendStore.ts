import * as fs from "fs";
import * as path from "path";
import { app } from "electron";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";

export interface TrendStats {
  daysCount: number;
  totalSnapshots: number;
  itemCoverage: number;
  latestDate: string | null;
  oldestDate: string | null;
}

export interface TrendSeries {
  labels: string[];
  overallAverages: number[];
}

function getSqlWasmBuffer(): Buffer {
  const candidates: (string | undefined)[] = [
    process.resourcesPath
      ? path.join(process.resourcesPath, "sql-wasm.wasm")
      : undefined,
    path.join(__dirname, "sql-wasm.wasm"),
    typeof app !== "undefined" && app?.getAppPath
      ? path.join(app.getAppPath(), "dist-electron", "sql-wasm.wasm")
      : undefined,
    (() => {
      try {
        return require.resolve("sql.js/dist/sql-wasm.wasm");
      } catch {
        return undefined;
      }
    })(),
    path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm"),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return fs.readFileSync(candidate);
    }
  }

  throw new Error(
    `Could not locate sql-wasm.wasm in candidate paths: ${candidates.filter(Boolean).join(", ")}`,
  );
}

export class TrendStore {
  private static instance: TrendStore | null = null;
  private SQL: SqlJsStatic | null = null;
  private db: Database | null = null;
  private dbPath: string;
  private isInitialized = false;

  private simulatedDate: string | null = null;

  public constructor(customDbPath?: string) {
    const baseDir = customDbPath
      ? path.dirname(customDbPath)
      : app?.getPath
        ? app.getPath("userData")
        : process.env.USER_DATA_PATH || process.cwd();

    this.dbPath = customDbPath || path.join(baseDir, "analytics.sqlite");
  }

  public setSimulatedDate(date: string | null): void {
    this.simulatedDate = date ? date.trim().slice(0, 10) : null;
    console.log(
      `[TrendStore] Simulated snapshot date set to: ${this.simulatedDate || "LIVE (Today)"}`,
    );
  }

  public getSimulatedDate(): string | null {
    return this.simulatedDate;
  }

  public getEffectiveDate(): string {
    return this.simulatedDate || new Date().toISOString().slice(0, 10);
  }

  public static getInstance(customDbPath?: string): TrendStore {
    if (!TrendStore.instance || customDbPath) {
      TrendStore.instance = new TrendStore(customDbPath);
    }
    return TrendStore.instance;
  }

  public static resetInstance(): void {
    if (TrendStore.instance) {
      TrendStore.instance.close();
      TrendStore.instance = null;
    }
  }

  public async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    const wasmBuf = getSqlWasmBuffer();
    const wasmBinary = wasmBuf.buffer.slice(
      wasmBuf.byteOffset,
      wasmBuf.byteOffset + wasmBuf.byteLength,
    ) as ArrayBuffer;
    this.SQL = await initSqlJs({ wasmBinary });

    try {
      if (fs.existsSync(this.dbPath)) {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new this.SQL.Database(fileBuffer);
      } else {
        this.db = new this.SQL.Database();
      }
    } catch (err) {
      console.warn(
        "[TrendStore] Corrupt or unreadable database, creating fresh:",
        err,
      );
      this.db = new this.SQL.Database();
    }

    // Initialize Schema
    this.db.run(`
      CREATE TABLE IF NOT EXISTS price_snapshots (
        item_name TEXT NOT NULL,
        snapshot_date TEXT NOT NULL,
        median_price REAL NOT NULL,
        listing_count INTEGER NOT NULL,
        PRIMARY KEY (item_name, snapshot_date)
      );
      CREATE INDEX IF NOT EXISTS idx_snapshots_date ON price_snapshots(snapshot_date);
      CREATE INDEX IF NOT EXISTS idx_snapshots_item ON price_snapshots(item_name);
      CREATE INDEX IF NOT EXISTS idx_snapshots_item_date ON price_snapshots(item_name, snapshot_date ASC);
    `);

    this.persist();
    this.isInitialized = true;
    console.log(`[TrendStore] Initialized SQLite at ${this.dbPath}`);
  }

  private persist(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dbPath, buffer);
    } catch (err) {
      console.error("[TrendStore] Failed to write database to disk:", err);
    }
  }

  // ─── Adaptive Price Filtering (IQR / Median / Min) ─────────────────────────

  private calculateMedian(values: number[]): number {
    if (!values || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private calculateIQR(values: number[]): {
    lowerFence: number;
    upperFence: number;
  } {
    if (!values || values.length < 4) {
      return { lowerFence: 0, upperFence: Number.MAX_SAFE_INTEGER };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      const index = (sorted.length - 1) * p;
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    };

    const q1 = getPercentile(0.25);
    const q3 = getPercentile(0.75);
    const iqr = q3 - q1;

    return {
      lowerFence: q1 - 1.5 * iqr,
      upperFence: q3 + 1.5 * iqr,
    };
  }

  /**
   * Filter raw listings per item and compute the representative daily price.
   */
  public computeDailyItemMedian(listings: { p?: number; price?: number }[]): {
    medianPrice: number;
    count: number;
  } {
    const validPrices = listings
      .map((l) => l.p ?? l.price ?? 0)
      .filter((p) => p > 0);
    if (validPrices.length === 0) return { medianPrice: 0, count: 0 };

    let filteredPrices = validPrices;

    if (validPrices.length >= 6) {
      // High density: IQR fence
      const { lowerFence, upperFence } = this.calculateIQR(validPrices);
      filteredPrices = validPrices.filter(
        (p) => p >= lowerFence && p <= upperFence,
      );
    } else if (validPrices.length >= 3) {
      // Medium density: Median with 1.8x spike cap
      const median = this.calculateMedian(validPrices);
      filteredPrices = validPrices.filter((p) => p <= median * 1.8);
    } else {
      // Low density: Min price + 10%
      const minPrice = Math.min(...validPrices);
      filteredPrices = validPrices.filter((p) => p <= minPrice * 1.1);
    }

    if (filteredPrices.length === 0) {
      filteredPrices = validPrices;
    }

    const median = this.calculateMedian(filteredPrices);
    return {
      medianPrice: parseFloat(median.toFixed(2)),
      count: filteredPrices.length,
    };
  }

  /**
   * Saves or updates today's snapshot for all items currently in the priceCache.
   */
  public async saveDailySnapshots(
    priceCache: Record<
      string,
      { n?: string; l?: { m: string; p: number; q?: number }[] }
    >,
    customDate?: string,
  ): Promise<{ inserted: number; snapshotDate: string }> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    const today = customDate || this.getEffectiveDate();
    let inserted = 0;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO price_snapshots (item_name, snapshot_date, median_price, listing_count)
      VALUES (?, ?, ?, ?)
    `);

    try {
      this.db.run("BEGIN TRANSACTION;");

      for (const [itemName, itemData] of Object.entries(priceCache)) {
        const listings = itemData?.l || [];
        if (!listings || listings.length === 0) continue;

        const { medianPrice, count } = this.computeDailyItemMedian(listings);
        if (medianPrice <= 0) continue;

        stmt.run([itemName, today, medianPrice, count]);
        inserted++;
      }

      this.db.run("COMMIT;");
      stmt.free();
      this.persist();

      console.log(
        `[TrendStore] Recorded ${inserted} snapshots for date: ${today}`,
      );
      return { inserted, snapshotDate: today };
    } catch (err) {
      this.db.run("ROLLBACK;");
      stmt.free();
      throw err;
    }
  }

  /**
   * Retrieves trend series (labels and overall daily medians) for an array of items over the last N days.
   */
  public async getTrendHistoryBatch(
    itemNames: string[],
    days: number = 14,
  ): Promise<Record<string, TrendSeries>> {
    await this.init();
    if (!this.db || itemNames.length === 0) return {};

    const effectiveDateStr = this.getEffectiveDate();
    const cutoff = new Date(effectiveDateStr + "T00:00:00.000Z");
    cutoff.setDate(cutoff.getDate() - (days + 2)); // Give a small buffer of days
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    const result: Record<string, TrendSeries> = {};
    itemNames.forEach((name) => {
      result[name] = { labels: [], overallAverages: [] };
    });

    // Query in batches to keep SQL statements manageable
    const chunkSize = 200;
    for (let i = 0; i < itemNames.length; i += chunkSize) {
      const chunk = itemNames.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => "?").join(",");

      const sql = `
        SELECT item_name, snapshot_date, median_price
        FROM price_snapshots
        WHERE item_name IN (${placeholders})
          AND snapshot_date >= ?
        ORDER BY snapshot_date ASC;
      `;

      const stmt = this.db.prepare(sql);
      stmt.bind([...chunk, cutoffDate]);

      while (stmt.step()) {
        const row = stmt.getAsObject() as {
          item_name: string;
          snapshot_date: string;
          median_price: number;
        };
        if (result[row.item_name]) {
          result[row.item_name].labels.push(row.snapshot_date);
          result[row.item_name].overallAverages.push(row.median_price);
        }
      }
      stmt.free();
    }

    return result;
  }

  /**
   * Aggregates stats about local trend storage health.
   */
  public async getStats(): Promise<TrendStats> {
    await this.init();
    if (!this.db) {
      return {
        daysCount: 0,
        totalSnapshots: 0,
        itemCoverage: 0,
        latestDate: null,
        oldestDate: null,
      };
    }

    const res = this.db.exec(`
      SELECT 
        COUNT(DISTINCT snapshot_date) as days_count,
        COUNT(*) as total_snapshots,
        COUNT(DISTINCT item_name) as item_coverage,
        MAX(snapshot_date) as latest_date,
        MIN(snapshot_date) as oldest_date
      FROM price_snapshots;
    `);

    if (
      !res ||
      res.length === 0 ||
      !res[0].values ||
      res[0].values.length === 0
    ) {
      return {
        daysCount: 0,
        totalSnapshots: 0,
        itemCoverage: 0,
        latestDate: null,
        oldestDate: null,
      };
    }

    const [daysCount, totalSnapshots, itemCoverage, latestDate, oldestDate] =
      res[0].values[0];

    return {
      daysCount: Number(daysCount || 0),
      totalSnapshots: Number(totalSnapshots || 0),
      itemCoverage: Number(itemCoverage || 0),
      latestDate: latestDate ? String(latestDate) : null,
      oldestDate: oldestDate ? String(oldestDate) : null,
    };
  }

  /**
   * Prunes snapshots older than retentionDays.
   */
  public async pruneOldSnapshots(retentionDays: number = 30): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    this.db.run(`DELETE FROM price_snapshots WHERE snapshot_date < ?;`, [
      cutoffDate,
    ]);
    const changes = this.db.getRowsModified();
    if (changes > 0) {
      this.persist();
      console.log(
        `[TrendStore] Pruned ${changes} snapshots older than ${cutoffDate}`,
      );
    }
    return changes;
  }

  /**
   * Clears all snapshot history from SQLite.
   */
  public async clearAllSnapshots(): Promise<number> {
    await this.init();
    if (!this.db) return 0;
    this.db.run("DELETE FROM price_snapshots;");
    const rows = this.db.getRowsModified();
    this.persist();
    console.log(`[TrendStore] Wiped all ${rows} snapshots from SQLite.`);
    return rows;
  }

  /**
   * Dev Mode: Seeds realistic synthetic multi-day trend history for testing OracleNexus.
   */
  public async seedMockHistory(
    priceCache: Record<
      string,
      { n?: string; l?: { m: string; p: number; q?: number }[] }
    >,
    days: number = 14,
  ): Promise<{ seededDays: number; totalSnapshots: number }> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    const entries = Object.entries(priceCache);
    if (entries.length === 0) {
      throw new Error(
        "Price cache is empty. Please fetch prices or load cache first.",
      );
    }

    const effectiveDateStr = this.getEffectiveDate();
    const now = new Date(effectiveDateStr + "T00:00:00.000Z");
    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    let inserted = 0;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO price_snapshots (item_name, snapshot_date, median_price, listing_count)
      VALUES (?, ?, ?, ?)
    `);

    try {
      this.db.run("BEGIN TRANSACTION;");

      for (let itemIdx = 0; itemIdx < entries.length; itemIdx++) {
        const [itemName, itemData] = entries[itemIdx];
        const listings = itemData?.l || [];
        if (listings.length === 0) continue;

        const { medianPrice: baseMedian, count } =
          this.computeDailyItemMedian(listings);
        if (baseMedian <= 0) continue;

        // 4 realistic trajectory archetypes:
        // 0: Bullish momentum (steady +5% to +8% rise, tests momentum bonus)
        // 1: Crashing slope (steep -10% to -18% fall, tests crash cut)
        // 2: Volatile oscillation (+/- 7% erratic swings, tests volatility noise filter)
        // 3: Stable baseline (+/- 0.5% quiet market drift)
        const patternType = itemIdx % 4;

        for (let dayIdx = 0; dayIdx < dates.length; dayIdx++) {
          const dateStr = dates[dayIdx];
          const progress = dayIdx / (dates.length - 1 || 1); // 0.0 to 1.0
          let dayPrice = baseMedian;

          if (patternType === 0) {
            // Bullish: climbs +6% over the window
            const change = -0.05 + progress * 0.07;
            dayPrice = baseMedian * (1 + change);
          } else if (patternType === 1) {
            // Crashing: drops -15% over the window
            const change = 0.08 - progress * 0.2;
            dayPrice = baseMedian * (1 + change);
          } else if (patternType === 2) {
            // Volatile: sinusoidal noise
            const noise = Math.sin(dayIdx * 1.8) * 0.07;
            dayPrice = baseMedian * (1 + noise);
          } else {
            // Stable: minimal drift
            const drift = Math.sin(dayIdx * 0.5) * 0.008;
            dayPrice = baseMedian * (1 + drift);
          }

          const finalPrice = Math.max(0.01, parseFloat(dayPrice.toFixed(2)));
          stmt.run([itemName, dateStr, finalPrice, Math.max(1, count)]);
          inserted++;
        }
      }

      this.db.run("COMMIT;");
      stmt.free();
      this.persist();

      console.log(
        `[TrendStore] Seeded mock trend data: ${dates.length} days, ${inserted} snapshots.`,
      );
      return { seededDays: dates.length, totalSnapshots: inserted };
    } catch (err) {
      this.db.run("ROLLBACK;");
      stmt.free();
      throw err;
    }
  }

  public close(): void {
    if (this.db) {
      this.persist();
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

export const trendStore = TrendStore.getInstance();
