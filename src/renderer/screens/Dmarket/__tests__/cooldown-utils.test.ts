import { describe, it, expect, beforeEach } from "vitest";
import {
  parseCooldownSeconds,
  formatCooldown,
  loadStoredCooldowns,
  saveStoredCooldowns,
  COOLDOWNS_STORAGE_KEY,
} from "../utils/cooldownUtils";

describe("cooldownUtils", () => {
  describe("parseCooldownSeconds", () => {
    it("parses MM:SS format accurately (e.g. 10:48 from DMarket API)", () => {
      expect(parseCooldownSeconds("10:48")).toBe(648);
      expect(parseCooldownSeconds("05:00")).toBe(300);
      expect(parseCooldownSeconds("1:30")).toBe(90);
      expect(parseCooldownSeconds("00:15")).toBe(15);
    });

    it("parses HH:MM:SS format accurately", () => {
      expect(parseCooldownSeconds("01:10:48")).toBe(4248);
      expect(parseCooldownSeconds("00:05:30")).toBe(330);
    });

    it("parses plain integers and seconds strings", () => {
      expect(parseCooldownSeconds("648")).toBe(648);
      expect(parseCooldownSeconds("648s")).toBe(648);
      expect(parseCooldownSeconds(648)).toBe(648);
    });

    it("parses descriptive duration text", () => {
      expect(parseCooldownSeconds("10m 48s")).toBe(648);
      expect(parseCooldownSeconds("15 min")).toBe(900);
      expect(parseCooldownSeconds("1 hour 10 mins 48 secs")).toBe(4248);
    });

    it("falls back gracefully when string is unrecognized or empty", () => {
      expect(parseCooldownSeconds("")).toBe(600);
      expect(parseCooldownSeconds(null)).toBe(600);
      expect(parseCooldownSeconds(undefined)).toBe(600);
      expect(parseCooldownSeconds("unknown error", 900)).toBe(900);
    });
  });

  describe("formatCooldown", () => {
    it("formats minutes and seconds as MM:SS", () => {
      expect(formatCooldown(648)).toBe("10:48");
      expect(formatCooldown(300)).toBe("05:00");
      expect(formatCooldown(15)).toBe("00:15");
      expect(formatCooldown(0)).toBe("00:00");
      expect(formatCooldown(-5)).toBe("00:00");
    });

    it("formats hours, minutes, and seconds as H:MM:SS when >= 3600 seconds", () => {
      expect(formatCooldown(4248)).toBe("1:10:48");
      expect(formatCooldown(3600)).toBe("1:00:00");
    });
  });

  describe("Storage helpers", () => {
    let mockStore: Record<string, string> = {};

    beforeEach(() => {
      mockStore = {};
      (globalThis as any).window = {
        localStorage: {
          getItem: (key: string) => mockStore[key] ?? null,
          setItem: (key: string, value: string) => {
            mockStore[key] = String(value);
          },
          removeItem: (key: string) => {
            delete mockStore[key];
          },
          clear: () => {
            mockStore = {};
          },
        },
      };
    });

    it("saves and loads active cooldowns while pruning expired ones", () => {
      const now = Date.now();
      const mockCooldowns = {
        activeOffer: {
          offerId: "activeOffer",
          expiresAt: now + 60000,
          durationSeconds: 60,
        },
        expiredOffer: {
          offerId: "expiredOffer",
          expiresAt: now - 10000, // already expired
          durationSeconds: 60,
        },
      };

      saveStoredCooldowns(mockCooldowns as any);
      const loaded = loadStoredCooldowns();

      expect(loaded.activeOffer).toBeDefined();
      expect(loaded.activeOffer.offerId).toBe("activeOffer");
      expect(loaded.expiredOffer).toBeUndefined(); // pruned
    });
  });
});
