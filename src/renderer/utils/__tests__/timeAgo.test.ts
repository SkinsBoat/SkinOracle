import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatTimeAgo,

} from "../timeAgo";

describe("timeAgo utils", () => {
  const baseTime = new Date("2026-09-23T12:00:00.000Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(baseTime);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("formatTimeAgo", () => {
    it("returns empty string for null, undefined or empty input", () => {
      expect(formatTimeAgo(null)).toBe("");
      expect(formatTimeAgo(undefined)).toBe("");
      expect(formatTimeAgo("")).toBe("");
    });

    it("returns empty string for invalid dates", () => {
      expect(formatTimeAgo("invalid-date-string")).toBe("");
    });

    it("returns 'just now' for timestamps within 45 seconds", () => {
      const thirtySecondsAgo = new Date(baseTime - 30 * 1000).toISOString();
      expect(formatTimeAgo(thirtySecondsAgo)).toBe("just now");
      expect(formatTimeAgo(new Date(baseTime))).toBe("just now");
    });

    it("returns minutes ago for timestamps under 60 minutes", () => {
      const fiveMinutesAgo = new Date(baseTime - 5 * 60 * 1000).toISOString();
      expect(formatTimeAgo(fiveMinutesAgo)).toBe("5m ago");

      const fiftyNineMinutesAgo = new Date(
        baseTime - 59 * 60 * 1000,
      ).toISOString();
      expect(formatTimeAgo(fiftyNineMinutesAgo)).toBe("59m ago");
    });

    it("returns hours ago for timestamps under 24 hours", () => {
      const twoHoursAgo = new Date(
        baseTime - 2 * 60 * 60 * 1000,
      ).toISOString();
      expect(formatTimeAgo(twoHoursAgo)).toBe("2h ago");

      const twentyThreeHoursAgo = new Date(
        baseTime - 23 * 60 * 60 * 1000,
      ).toISOString();
      expect(formatTimeAgo(twentyThreeHoursAgo)).toBe("23h ago");
    });

    it("returns days ago for timestamps under 7 days", () => {
      const threeDaysAgo = new Date(
        baseTime - 3 * 24 * 60 * 60 * 1000,
      ).toISOString();
      expect(formatTimeAgo(threeDaysAgo)).toBe("3d ago");
    });
  });

});
