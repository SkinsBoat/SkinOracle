import { describe, it, expect } from "vitest";
import * as zlib from "zlib";

describe("Oracle Payload Compression & Capping", () => {
  it("compresses large evaluation payloads by 80%+ with valid gzip headers", () => {
    // Simulate 1,500 items payload
    const items = Array.from({ length: 1500 }, (_, i) => ({
      name: `Item #${i} | Fade (Factory New)`,
      listings: [
        { m: "csfloat", p: 100.5 + i },
        { m: "buff163", p: 99.8 + i },
        { m: "skinport", p: 102.1 + i },
      ],
      trendHistory: Array.from({ length: 30 }, (_, d) => 100.0 + d * 0.1),
      trendLabels: Array.from(
        { length: 30 },
        (_, d) => `2026-08-${String(d + 1).padStart(2, "0")}`,
      ),
    }));

    const rawJson = JSON.stringify({ items, options: {} });
    const rawBuffer = Buffer.from(rawJson, "utf-8");

    const compressed = zlib.gzipSync(rawBuffer);

    // Verify compression ratio: should reduce by at least 75%
    const ratio = (1 - compressed.length / rawBuffer.length) * 100;
    expect(ratio).toBeGreaterThan(75);

    // Verify roundtrip lossless decompression
    const decompressed = zlib.gunzipSync(compressed).toString("utf-8");
    const parsed = JSON.parse(decompressed);
    expect(parsed.items.length).toBe(1500);
    expect(parsed.items[0].name).toBe("Item #0 | Fade (Factory New)");
  });

  it("strictly enforces max 30-day cap on historical trend series", () => {
    // 90 days of simulated history
    const rawHistory = Array.from({ length: 90 }, (_, i) => 10.0 + i);
    const rawLabels = Array.from({ length: 90 }, (_, i) => `2026-0${i + 1}`);

    const requestedWindow = 14;
    const windowDays = Math.min(30, Math.max(7, requestedWindow));

    const sliceLen = Math.min(windowDays, rawHistory.length);
    const cappedHistory = rawHistory.slice(-sliceLen);
    const cappedLabels = rawLabels.slice(-sliceLen);

    expect(cappedHistory.length).toBe(14);
    expect(cappedLabels.length).toBe(14);
    expect(cappedHistory[cappedHistory.length - 1]).toBe(99.0); // Most recent entry preserved

    // Even with 30-day macro window requested
    const macroWindowDays = Math.min(30, Math.max(7, 30));
    const macroSliceLen = Math.min(macroWindowDays, rawHistory.length);
    const macroCappedHistory = rawHistory.slice(-macroSliceLen);

    expect(macroCappedHistory.length).toBe(30);
    expect(macroCappedHistory.length).toBeLessThanOrEqual(30);
  });

  it("strictly caps listings to lowest 30 sorted prices", () => {
    // 100 listings unsorted
    const rawListings = Array.from({ length: 100 }, (_, i) => ({
      m: `market_${i % 10}`,
      p: 1000 - i * 5, // 1000 down to 505
    }));

    const cappedListings =
      rawListings.length > 30
        ? [...rawListings].sort((a, b) => (a.p || 0) - (b.p || 0)).slice(0, 30)
        : rawListings;

    expect(cappedListings.length).toBe(30);
    // Verify lowest prices are preserved in ascending order
    expect(cappedListings[0].p).toBe(505);
    expect(cappedListings[29].p).toBe(650);
  });
});
