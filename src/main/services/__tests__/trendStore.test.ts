import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { TrendStore } from "../trendStore";

describe("TrendStore SQLite Service", () => {
  let tempDbPath: string;
  let store: TrendStore;

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "trend-test-"));
    tempDbPath = path.join(tempDir, "test-analytics.sqlite");
    store = TrendStore.getInstance(tempDbPath);
  });

  afterEach(() => {
    store.close();
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
        fs.rmdirSync(path.dirname(tempDbPath));
      } catch {}
    }
  });

  it("computes daily item median with IQR filtering for high listing density", () => {
    const listings = [
      { p: 10 },
      { p: 10.5 },
      { p: 11 },
      { p: 10.2 },
      { p: 10.8 },
      { p: 10.4 },
      { p: 50 }, // Outlier spike
    ];

    const result = store.computeDailyItemMedian(listings);
    expect(result.medianPrice).toBeGreaterThan(10);
    expect(result.medianPrice).toBeLessThan(12); // Outlier 50 should be discarded by IQR
  });

  it("saves and retrieves daily snapshots across multiple dates", async () => {
    const cacheDay1 = {
      "AK-47 | Redline (Field-Tested)": {
        n: "AK-47 | Redline (Field-Tested)",
        l: [
          { m: "csfloat", p: 12.5 },
          { m: "skinscom", p: 12.6 },
        ],
      },
      "AWP | Asiimov (Field-Tested)": {
        n: "AWP | Asiimov (Field-Tested)",
        l: [
          { m: "csfloat", p: 95.0 },
          { m: "skinscom", p: 96.0 },
        ],
      },
    };

    const cacheDay2 = {
      "AK-47 | Redline (Field-Tested)": {
        n: "AK-47 | Redline (Field-Tested)",
        l: [
          { m: "csfloat", p: 13.0 },
          { m: "skinscom", p: 13.1 },
        ],
      },
      "AWP | Asiimov (Field-Tested)": {
        n: "AWP | Asiimov (Field-Tested)",
        l: [
          { m: "csfloat", p: 94.0 },
          { m: "skinscom", p: 93.5 },
        ],
      },
    };

    const res1 = await store.saveDailySnapshots(cacheDay1, "2026-09-01");
    expect(res1.inserted).toBe(2);

    const res2 = await store.saveDailySnapshots(cacheDay2, "2026-09-02");
    expect(res2.inserted).toBe(2);

    const stats = await store.getStats();
    expect(stats.daysCount).toBe(2);
    expect(stats.totalSnapshots).toBe(4);
    expect(stats.itemCoverage).toBe(2);
    expect(stats.oldestDate).toBe("2026-09-01");
    expect(stats.latestDate).toBe("2026-09-02");

    const trends = await store.getTrendHistoryBatch(
      ["AK-47 | Redline (Field-Tested)"],
      14,
    );
    const akTrend = trends["AK-47 | Redline (Field-Tested)"];
    expect(akTrend).toBeDefined();
    expect(akTrend.labels).toEqual(["2026-09-01", "2026-09-02"]);
    expect(akTrend.overallAverages.length).toBe(2);
    expect(akTrend.overallAverages[0]).toBeCloseTo(12.55, 1);
    expect(akTrend.overallAverages[1]).toBeCloseTo(13.05, 1);
  });

  it("prunes old snapshots outside the retention window", async () => {
    const cache = {
      "Item A": { l: [{ m: "csfloat", p: 10.0 }] },
    };

    await store.saveDailySnapshots(cache, "2026-07-01"); // 60+ days ago
    await store.saveDailySnapshots(cache, "2026-09-07"); // today

    let stats = await store.getStats();
    expect(stats.daysCount).toBe(2);

    const pruned = await store.pruneOldSnapshots(30);
    expect(pruned).toBe(1);

    stats = await store.getStats();
    expect(stats.daysCount).toBe(1);
    expect(stats.latestDate).toBe("2026-09-07");
  });

  it("supports simulated date override for developer testing", async () => {
    store.setSimulatedDate("2026-08-15");
    expect(store.getSimulatedDate()).toBe("2026-08-15");
    expect(store.getEffectiveDate()).toBe("2026-08-15");

    const cache = {
      "Desert Eagle | Blaze (Factory New)": { l: [{ m: "csfloat", p: 500.0 }] },
    };

    await store.saveDailySnapshots(cache);
    const stats = await store.getStats();
    expect(stats.latestDate).toBe("2026-08-15");

    store.setSimulatedDate(null);
    expect(store.getSimulatedDate()).toBeNull();
  });

  it("seeds 14-day mock trend history and clears database on demand", async () => {
    const cache = {
      "AK-47 | Slate (Field-Tested)": {
        l: [
          { m: "csfloat", p: 8.5 },
          { m: "skinscom", p: 8.6 },
        ],
      },
      "M4A4 | Howl (Factory New)": { l: [{ m: "csfloat", p: 4500.0 }] },
      "Glock-18 | Fade (Factory New)": { l: [{ m: "csfloat", p: 1200.0 }] },
      "USP-S | Printstream (Field-Tested)": { l: [{ m: "csfloat", p: 45.0 }] },
    };

    const seedRes = await store.seedMockHistory(cache, 14);
    expect(seedRes.seededDays).toBe(14);
    expect(seedRes.totalSnapshots).toBe(14 * 4); // 56 snapshots

    let stats = await store.getStats();
    expect(stats.daysCount).toBe(14);
    expect(stats.totalSnapshots).toBe(56);
    expect(stats.itemCoverage).toBe(4);

    // Verify trend extraction works over the seeded 14 days
    const trends = await store.getTrendHistoryBatch(
      ["AK-47 | Slate (Field-Tested)"],
      14,
    );
    expect(trends["AK-47 | Slate (Field-Tested)"].labels.length).toBe(14);
    expect(trends["AK-47 | Slate (Field-Tested)"].overallAverages.length).toBe(
      14,
    );

    // Test clearAllSnapshots wipes the DB
    const clearedRows = await store.clearAllSnapshots();
    expect(clearedRows).toBe(56);

    stats = await store.getStats();
    expect(stats.daysCount).toBe(0);
    expect(stats.totalSnapshots).toBe(0);
    expect(stats.itemCoverage).toBe(0);
  });
});
