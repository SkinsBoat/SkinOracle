import { describe, it, expect } from "vitest";
import {
  parseTargetTimestamp,
  formatTargetCooldown,
  getTargetHoldInfo,
  TARGET_HOLD_DURATION_SECONDS,
} from "../targetHoldUtils";
import { DmarketTargetItem } from "../types";

describe("targetHoldUtils - 11-Minute Hold Logic & Cooldown Formatting", () => {
  describe("TARGET_HOLD_DURATION_SECONDS", () => {
    it("should be exactly 660 seconds (11 minutes)", () => {
      expect(TARGET_HOLD_DURATION_SECONDS).toBe(11 * 60);
      expect(TARGET_HOLD_DURATION_SECONDS).toBe(660);
    });
  });

  describe("parseTargetTimestamp", () => {
    it("parses ISO 8601 string correctly", () => {
      const iso = "2026-09-15T20:17:56Z";
      const expected = new Date(iso).getTime();
      expect(parseTargetTimestamp(iso)).toBe(expected);
    });

    it("parses Unix timestamp in milliseconds", () => {
      const ms = 1757967476000;
      expect(parseTargetTimestamp(ms)).toBe(ms);
    });

    it("parses Unix timestamp in seconds and converts to ms", () => {
      const sec = 1757967476;
      expect(parseTargetTimestamp(sec)).toBe(sec * 1000);
    });

    it("parses string integer timestamp in seconds and ms", () => {
      expect(parseTargetTimestamp("1757967476")).toBe(1757967476 * 1000);
      expect(parseTargetTimestamp("1757967476000")).toBe(1757967476000);
    });

    it("returns null for invalid or empty values", () => {
      expect(parseTargetTimestamp(null)).toBeNull();
      expect(parseTargetTimestamp(undefined)).toBeNull();
      expect(parseTargetTimestamp("")).toBeNull();
      expect(parseTargetTimestamp("   ")).toBeNull();
      expect(parseTargetTimestamp("invalid-date-string")).toBeNull();
      expect(parseTargetTimestamp(0)).toBeNull();
      expect(parseTargetTimestamp(-100)).toBeNull();
    });
  });

  describe("formatTargetCooldown", () => {
    it("formats 0 or negative seconds as 00:00", () => {
      expect(formatTargetCooldown(0)).toBe("00:00");
      expect(formatTargetCooldown(-5)).toBe("00:00");
    });

    it("formats seconds under 1 hour as MM:SS", () => {
      expect(formatTargetCooldown(660)).toBe("11:00");
      expect(formatTargetCooldown(648)).toBe("10:48");
      expect(formatTargetCooldown(59)).toBe("00:59");
      expect(formatTargetCooldown(5)).toBe("00:05");
    });

    it("formats seconds over 1 hour as H:MM:SS", () => {
      expect(formatTargetCooldown(3665)).toBe("1:01:05");
    });
  });

  describe("getTargetHoldInfo", () => {
    it("returns inactive hold when target is null or undefined", () => {
      const infoNull = getTargetHoldInfo(null);
      expect(infoNull.isHoldActive).toBe(false);
      expect(infoNull.remainingSeconds).toBe(0);
      expect(infoNull.formattedRemaining).toBe("00:00");

      const infoUndefined = getTargetHoldInfo(undefined);
      expect(infoUndefined.isHoldActive).toBe(false);
    });

    it("detects active hold when target was created 2 minutes ago", () => {
      const now = 1757967476000;
      const twoMinutesAgoIso = new Date(now - 2 * 60 * 1000).toISOString();

      const target: Partial<DmarketTargetItem> = {
        targetId: "target-123",
        title: "AK-47 | Redline (Field-Tested)",
        createdAt: twoMinutesAgoIso,
        updatedAt: twoMinutesAgoIso,
      };

      const info = getTargetHoldInfo(target, now);
      expect(info.isHoldActive).toBe(true);
      // 11 min - 2 min = 9 min (540 seconds)
      expect(info.remainingSeconds).toBe(9 * 60);
      expect(info.formattedRemaining).toBe("09:00");
      expect(info.holdExpiresAt).toBe(new Date(twoMinutesAgoIso).getTime() + 660 * 1000);
    });

    it("prefers updatedAt over createdAt for hold expiration", () => {
      const now = 1757967476000;
      const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
      const threeMinutesAgo = new Date(now - 3 * 60 * 1000).toISOString();

      const target: Partial<DmarketTargetItem> = {
        targetId: "target-456",
        title: "AWP | Asiimov (Field-Tested)",
        createdAt: oneHourAgo, // Created 1 hr ago (hold would be expired)
        updatedAt: threeMinutesAgo, // Updated 3 mins ago (hold is active!)
      };

      const info = getTargetHoldInfo(target, now);
      expect(info.isHoldActive).toBe(true);
      // 11 min - 3 min = 8 min (480 seconds)
      expect(info.remainingSeconds).toBe(8 * 60);
      expect(info.formattedRemaining).toBe("08:00");
    });

    it("marks hold as inactive when more than 11 minutes have passed", () => {
      const now = 1757967476000;
      const twelveMinutesAgo = new Date(now - 12 * 60 * 1000).toISOString();

      const target: Partial<DmarketTargetItem> = {
        targetId: "target-789",
        title: "M4A4 | The Emperor (Field-Tested)",
        createdAt: twelveMinutesAgo,
        updatedAt: twelveMinutesAgo,
      };

      const info = getTargetHoldInfo(target, now);
      expect(info.isHoldActive).toBe(false);
      expect(info.remainingSeconds).toBe(0);
      expect(info.formattedRemaining).toBe("00:00");
    });

    it("correctly handles DMarket API payload structure with ISO strings from user request", () => {
      // User's specific sample from prompt:
      const userRawTarget = {
        image: "https://steamcommunity-a.akamaihd.net/economy/image/-9a81dl...",
        title: "CZ75-Auto | Midnight Palm (Minimal Wear)",
        name: "CZ75-Auto | Midnight Palm",
        cs2: {
          category: "CATEGORY_NORMAL",
          exterior: "EXTERIOR_MINIMAL_WEAR",
          phase: "PHASE_TITLE_UNSPECIFIED",
          paintSeed: 0,
          floatPart: "FLOAT_PART_UNSPECIFIED",
          isAdvanced: false,
        },
        createdAt: "2026-09-15T20:17:56Z",
        updatedAt: "2026-09-15T20:17:56Z",
      };

      const targetTimeMs = new Date("2026-09-15T20:17:56Z").getTime();
      // Test when evaluated 5 minutes after creation
      const evaluationTime = targetTimeMs + 5 * 60 * 1000; // 5 mins later

      const target: Partial<DmarketTargetItem> = {
        targetId: "test-target-cz75",
        title: userRawTarget.title,
        createdAt: userRawTarget.createdAt,
        updatedAt: userRawTarget.updatedAt,
        _raw: userRawTarget as any,
      };

      const info = getTargetHoldInfo(target, evaluationTime);
      expect(info.isHoldActive).toBe(true);
      // 11 mins - 5 mins = 6 mins (360 seconds)
      expect(info.remainingSeconds).toBe(360);
      expect(info.formattedRemaining).toBe("06:00");
      expect(info.holdExpiresAt).toBe(targetTimeMs + 660 * 1000);
    });

    it("falls back to _raw timestamps if top-level fields are missing", () => {
      const now = 1757967476000;
      const fourMinutesAgo = new Date(now - 4 * 60 * 1000).toISOString();

      const target: Partial<DmarketTargetItem> = {
        targetId: "target-raw-only",
        title: "Desert Eagle | Printstream",
        _raw: {
          createdAt: fourMinutesAgo,
          updatedAt: fourMinutesAgo,
        } as any,
      };

      const info = getTargetHoldInfo(target, now);
      expect(info.isHoldActive).toBe(true);
      expect(info.remainingSeconds).toBe(7 * 60); // 11 - 4 = 7 mins
      expect(info.formattedRemaining).toBe("07:00");
    });
  });
});
