import { describe, it, expect } from "vitest";
import {
  getFreshness,
  formatTtlLabel,
  formatRemainingLabel,
} from "../dataFreshness";

const NOW = new Date("2026-10-02T12:00:00.000Z").getTime();

describe("dataFreshness utils", () => {
  describe("getFreshness", () => {
    it("reports no timestamp when storedAt is missing", () => {
      const info = getFreshness(null, 60, NOW);
      expect(info.hasTimestamp).toBe(false);
      expect(info.isExpired).toBe(false);
      expect(info.expiresAt).toBeNull();
    });

    it("treats a zero/negative TTL as never expiring", () => {
      const storedAt = new Date(NOW - 7 * 24 * 60 * 60_000).toISOString();
      const zero = getFreshness(storedAt, 0, NOW);
      const negative = getFreshness(storedAt, -20, NOW);
      expect(zero.ttlMinutes).toBeNull();
      expect(zero.isExpired).toBe(false);
      expect(zero.expiresAt).toBeNull();
      expect(negative.isExpired).toBe(false);
    });

    it("marks data expired once it is older than the TTL", () => {
      const storedAt = new Date(NOW - 90 * 60_000).toISOString(); // 90 min old
      const info = getFreshness(storedAt, 60, NOW);
      expect(info.isExpired).toBe(true);
      expect(info.remainingMs).toBe(0);
      expect(info.ageMs).toBe(90 * 60_000);
    });

    it("keeps fresh data within the TTL window", () => {
      const storedAt = new Date(NOW - 30 * 60_000).toISOString(); // 30 min old
      const info = getFreshness(storedAt, 60, NOW);
      expect(info.isExpired).toBe(false);
      expect(info.remainingMs).toBe(30 * 60_000);
    });

    it("treats an unparseable timestamp as no timestamp", () => {
      const info = getFreshness("not-a-date", 60, NOW);
      expect(info.hasTimestamp).toBe(false);
      expect(info.isExpired).toBe(false);
    });
  });

  describe("formatTtlLabel", () => {
    it("formats hours, minutes, days and never", () => {
      expect(formatTtlLabel(0)).toBe("Never");
      expect(formatTtlLabel(null)).toBe("Never");
      expect(formatTtlLabel(60)).toBe("1h");
      expect(formatTtlLabel(180)).toBe("3h");
      expect(formatTtlLabel(90)).toBe("1h 30m");
      expect(formatTtlLabel(1440)).toBe("1d");
      expect(formatTtlLabel(1500)).toBe("1d 1h");
    });
  });

  describe("formatRemainingLabel", () => {
    it("describes expiry state", () => {
      expect(formatRemainingLabel(null)).toBe("no expiry");
      expect(formatRemainingLabel(0)).toBe("expired");
      expect(formatRemainingLabel(-5)).toBe("expired");
      expect(formatRemainingLabel(90 * 60_000)).toBe("1h 30m left");
    });
  });
});
