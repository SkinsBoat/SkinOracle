import { describe, it, expect } from "vitest";
import {
  clampInt,
  evaluateTrendPackSuitability,
  isTrendPackId,
  sanitizeListingParams,
  sanitizeSkinName,
  sanitizeTitle,
} from "../trendMarketParams";

describe("trendMarketParams", () => {
  describe("clampInt", () => {
    it("clamps to bounds and truncates", () => {
      expect(clampInt(5.9, 1, 10, 1)).toBe(5);
      expect(clampInt(0, 1, 1000, 1)).toBe(1);
      expect(clampInt(99999, 1, 50, 12)).toBe(50);
    });

    it("falls back for non-numeric input", () => {
      expect(clampInt(undefined, 1, 50, 12)).toBe(12);
      expect(clampInt("abc", 1, 50, 12)).toBe(12);
      expect(clampInt(NaN, 1, 50, 12)).toBe(12);
    });

    it("accepts numeric strings", () => {
      expect(clampInt("7", 1, 50, 12)).toBe(7);
    });
  });

  describe("sanitizeListingParams", () => {
    it("applies safe defaults when params are missing", () => {
      expect(sanitizeListingParams()).toEqual({
        page: 1,
        limit: 12,
        sort: "popular",
        search: undefined,
      });
    });

    it("rejects an unknown sort value", () => {
      expect(sanitizeListingParams({ sort: "DROP TABLE" }).sort).toBe(
        "popular",
      );
    });

    it("keeps a valid sort value", () => {
      expect(sanitizeListingParams({ sort: "quality" }).sort).toBe("quality");
    });

    it("bounds pagination and truncates search", () => {
      const res = sanitizeListingParams({
        page: -3,
        limit: 5000,
        search: `  ${"a".repeat(300)}  `,
      });
      expect(res.page).toBe(1);
      expect(res.limit).toBe(50);
      expect(res.search).toHaveLength(120);
    });

    it("collapses whitespace-only search to undefined", () => {
      expect(sanitizeListingParams({ search: "   " }).search).toBeUndefined();
    });
  });

  describe("sanitizeTitle", () => {
    it("trims and bounds the title", () => {
      expect(sanitizeTitle("  My Pack  ")).toBe("My Pack");
      expect(sanitizeTitle("x".repeat(300))).toHaveLength(120);
    });

    it("throws for empty or non-string titles", () => {
      expect(() => sanitizeTitle("   ")).toThrow();
      expect(() => sanitizeTitle(undefined)).toThrow();
      expect(() => sanitizeTitle(42)).toThrow();
    });
  });

  describe("sanitizeSkinName", () => {
    it("trims and bounds skin names", () => {
      expect(sanitizeSkinName("  AK-47 | Redline  ")).toBe("AK-47 | Redline");
      expect(sanitizeSkinName("y".repeat(400))).toHaveLength(255);
    });

    it("returns undefined for non-strings and blanks", () => {
      expect(sanitizeSkinName(undefined)).toBeUndefined();
      expect(sanitizeSkinName("   ")).toBeUndefined();
      expect(sanitizeSkinName(123)).toBeUndefined();
    });
  });

  describe("isTrendPackId", () => {
    it("accepts a UUID", () => {
      expect(isTrendPackId("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    });

    it("rejects malformed ids", () => {
      expect(isTrendPackId("not-a-uuid")).toBe(false);
      expect(isTrendPackId(undefined)).toBe(false);
      expect(isTrendPackId("123e4567-e89b-12d3-a456-426614174000; DROP")).toBe(
        false,
      );
    });
  });

  describe("evaluateTrendPackSuitability", () => {
    it("accepts a contiguous 7-day pack", () => {
      const res = evaluateTrendPackSuitability({
        daysCount: 7,
        oldestDate: "2026-01-17",
        latestDate: "2026-01-23",
      });
      expect(res.ok).toBe(true);
      expect(res.missingDays).toBe(0);
      expect(res.spanDays).toBe(7);
    });

    it("rejects a pack with fewer than 3 days", () => {
      const res = evaluateTrendPackSuitability({
        daysCount: 2,
        oldestDate: "2026-01-22",
        latestDate: "2026-01-23",
      });
      expect(res.ok).toBe(false);
      expect(res.reason).toContain("at least 3");
    });

    it("rejects a pack with more than 3 missing days in its window", () => {
      // 10 present days but a 22-day span => 12 missing.
      const res = evaluateTrendPackSuitability({
        daysCount: 10,
        oldestDate: "2026-01-01",
        latestDate: "2026-01-22",
      });
      expect(res.ok).toBe(false);
      expect(res.missingDays).toBe(12);
      expect(res.reason).toContain("missing days");
    });

    it("tolerates up to 3 missing days", () => {
      const res = evaluateTrendPackSuitability({
        daysCount: 5,
        oldestDate: "2026-01-01",
        latestDate: "2026-01-08",
      });
      expect(res.missingDays).toBe(3);
      expect(res.ok).toBe(true);
    });
  });
});
