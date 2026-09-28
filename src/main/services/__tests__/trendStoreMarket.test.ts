import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as zlib from "zlib";
import axios from "axios";
import { TrendStore } from "../trendStore";

describe("TrendStore Community Marketplace (Export & Atomic Merge)", () => {
  let tempDbPath: string;
  let store: TrendStore;

  beforeEach(() => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "trend-market-test-"));
    tempDbPath = path.join(tempDir, "market-analytics.sqlite");
    store = TrendStore.getInstance(tempDbPath);
  });

  afterEach(() => {
    store.close();
    vi.restoreAllMocks();
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
        fs.rmdirSync(path.dirname(tempDbPath));
      } catch {}
    }
  });

  it("exportTrendPackPayload() extracts sample skins and gzip compresses payload", async () => {
    await store.init();

    // Populate mock price snapshots across 60 distinct items
    const mockCache: Record<string, any> = {};
    for (let i = 1; i <= 60; i++) {
      const skinName = `Skin Type #${i} (Factory New)`;
      mockCache[skinName] = {
        n: skinName,
        l: [{ m: "csfloat", p: 10 + i }],
      };
    }

    const testDate = "2026-09-20";
    await store.saveDailySnapshots(mockCache, testDate);

    // Also add another day for the first 10 skins
    const testDate2 = "2026-09-21";
    const mockCacheDay2: Record<string, any> = {};
    for (let i = 1; i <= 10; i++) {
      const skinName = `Skin Type #${i} (Factory New)`;
      mockCacheDay2[skinName] = {
        n: skinName,
        l: [{ m: "csfloat", p: 11 + i }],
      };
    }
    await store.saveDailySnapshots(mockCacheDay2, testDate2);

    const exportResult = await store.exportTrendPackPayload(30);

    // Verify metadata
    expect(exportResult.daysCount).toBe(2);
    expect(exportResult.totalSnapshots).toBe(70); // 60 + 10
    expect(exportResult.itemCoverage).toBe(60);
    expect(exportResult.latestDate).toBe(testDate2);
    expect(exportResult.oldestDate).toBe(testDate);

    // Verify top 50 sample items cap
    const sampleKeys = Object.keys(exportResult.sampleItemsJson);
    expect(sampleKeys.length).toBeLessThanOrEqual(50);
    expect(sampleKeys.length).toBe(50);

    // The skins with 2 days of history should be prioritized in top 50
    expect(exportResult.sampleItemsJson["Skin Type #1 (Factory New)"]).toBeDefined();
    expect(
      exportResult.sampleItemsJson["Skin Type #1 (Factory New)"].prices.length,
    ).toBe(2);

    // Verify Gzip Compression
    expect(exportResult.payloadBuffer).toBeInstanceOf(Buffer);
    const decompressed = JSON.parse(
      zlib.gunzipSync(exportResult.payloadBuffer).toString("utf-8"),
    );
    expect(decompressed.v).toBe(1);
    expect(decompressed.snapshots.length).toBe(70);
    expect(decompressed.snapshots[0].n).toBeDefined();
    expect(decompressed.snapshots[0].d).toBeDefined();
    expect(decompressed.snapshots[0].p).toBeDefined();
  });

  it("importAndMergeTrendPackFromUrl() executes INSERT OR IGNORE without overwriting existing local snapshots", async () => {
    await store.init();

    // 1. User has their own scanned observation for AK-47 on 2026-09-15 @ $20.00
    const localCache = {
      "AK-47 | Redline (Field-Tested)": {
        n: "AK-47 | Redline (Field-Tested)",
        l: [{ m: "csfloat", p: 20.0 }],
      },
    };
    await store.saveDailySnapshots(localCache, "2026-09-15");

    const statsBefore = await store.getStats();
    expect(statsBefore.totalSnapshots).toBe(1);

    // 2. Marketplace trend pack has a conflicting observation for the same skin on the same date @ $12.00,
    // plus a new observation on 2026-09-16 @ $13.50, and a new skin
    const externalPayload = {
      v: 1,
      snapshots: [
        {
          n: "AK-47 | Redline (Field-Tested)",
          d: "2026-09-15",
          p: 12.0, // Conflicting price
          c: 10,
        },
        {
          n: "AK-47 | Redline (Field-Tested)",
          d: "2026-09-16",
          p: 13.5, // New date
          c: 12,
        },
        {
          n: "M4A4 | Howl (Factory New)",
          d: "2026-09-16",
          p: 4500.0, // New skin
          c: 2,
        },
      ],
    };

    const gzippedExternal = zlib.gzipSync(
      Buffer.from(JSON.stringify(externalPayload), "utf-8"),
    );

    // Mock axios.get to return gzipped external buffer
    vi.spyOn(axios, "get").mockResolvedValueOnce({
      data: gzippedExternal,
    });

    const mergeResult = await store.importAndMergeTrendPackFromUrl(
      "https://cloudflare-r2.mock/pack.json.gz",
    );

    // 2 new rows inserted (the conflicting row was IGNORED)
    expect(mergeResult.insertedRows).toBe(2);
    expect(mergeResult.daysAdded).toBe(1); // 2026-09-16 added
    expect(mergeResult.totalSnapshotsAfter).toBe(3);

    // Verify that buyer's own scan for 2026-09-15 was NOT overwritten
    const trend = await store.getTrendHistoryBatch([
      "AK-47 | Redline (Field-Tested)",
    ]);
    const akHistory = trend["AK-47 | Redline (Field-Tested)"];
    expect(akHistory.labels).toContain("2026-09-15");
    const idx20260915 = akHistory.labels.indexOf("2026-09-15");
    // Must remain the original $20.00, not the imported $12.00
    expect(akHistory.overallAverages[idx20260915]).toBe(20.0);
  });

  it("Cold-start simulation: zero-day SQLite database correctly ingests imported payload and updates getStats().daysCount", async () => {
    await store.init();

    // Verify initial cold-start zero-day status
    const initialStats = await store.getStats();
    expect(initialStats.daysCount).toBe(0);
    expect(initialStats.totalSnapshots).toBe(0);
    expect(initialStats.itemCoverage).toBe(0);

    // Prepare multi-day community trend pack (14 days of data for 5 skins)
    const snapshots: Array<{ n: string; d: string; p: number; c: number }> = [];
    for (let day = 1; day <= 14; day++) {
      const dateStr = `2026-09-${String(day).padStart(2, "0")}`;
      for (let s = 1; s <= 5; s++) {
        snapshots.push({
          n: `Skin Alpha #${s}`,
          d: dateStr,
          p: 50.0 + day,
          c: 5,
        });
      }
    }

    const payload = { v: 1, snapshots };
    const gzipped = zlib.gzipSync(Buffer.from(JSON.stringify(payload), "utf-8"));

    vi.spyOn(axios, "get").mockResolvedValueOnce({
      data: gzipped,
    });

    const mergeResult = await store.importAndMergeTrendPackFromUrl(
      "https://cloudflare-r2.mock/community-14d.json.gz",
    );

    expect(mergeResult.insertedRows).toBe(70); // 14 * 5
    expect(mergeResult.daysAdded).toBe(14);

    const postStats = await store.getStats();
    expect(postStats.daysCount).toBe(14);
    expect(postStats.totalSnapshots).toBe(70);
    expect(postStats.itemCoverage).toBe(5);
    expect(postStats.oldestDate).toBe("2026-09-01");
    expect(postStats.latestDate).toBe("2026-09-14");
  });
});
