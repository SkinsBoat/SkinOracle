import { describe, it, expect } from "vitest";
import {
  buildDmarketSpendableBalance,
  getTradeProtectedSpendableCents,
  parseDmarketCents,
} from "../dmarketUtils";

describe("dmarketUtils - balance helpers", () => {
  describe("parseDmarketCents", () => {
    it("parses integer strings", () => {
      expect(parseDmarketCents("4240")).toBe(4240);
    });

    it("returns 0 for null, undefined, empty, or non-positive values", () => {
      expect(parseDmarketCents(null)).toBe(0);
      expect(parseDmarketCents(undefined)).toBe(0);
      expect(parseDmarketCents("")).toBe(0);
      expect(parseDmarketCents("0")).toBe(0);
      expect(parseDmarketCents("-5")).toBe(0);
      expect(parseDmarketCents("abc")).toBe(0);
    });
  });

  describe("getTradeProtectedSpendableCents", () => {
    it("reads usdTradeProtected from the balance response", () => {
      expect(getTradeProtectedSpendableCents({ usdTradeProtected: "4240" })).toBe(
        4240,
      );
    });

    it("returns 0 when absent or invalid", () => {
      expect(getTradeProtectedSpendableCents({})).toBe(0);
      expect(getTradeProtectedSpendableCents(null)).toBe(0);
      expect(getTradeProtectedSpendableCents({ usdTradeProtected: "0" })).toBe(0);
    });
  });

  describe("buildDmarketSpendableBalance", () => {
    it("adds the flat USD balance and spendable trade-protected proceeds", () => {
      const result = buildDmarketSpendableBalance({
        usd: "1000",
        usdTradeProtected: "4240",
      });

      expect(result).toEqual({
        rawUsdCents: 1000,
        tradeProtectedSpendableCents: 4240,
        usdCents: 5240,
        usdFormatted: "$52.40",
      });
    });

    it("preserves the flat balance when nothing is trade protected", () => {
      const result = buildDmarketSpendableBalance({ usd: "0" });
      expect(result.usdCents).toBe(0);
      expect(result.usdFormatted).toBe("$0.00");
    });

    it("handles a zero flat balance with spendable protected funds", () => {
      const result = buildDmarketSpendableBalance({
        usd: "0",
        usdTradeProtected: "4240",
      });
      expect(result.usdCents).toBe(4240);
      expect(result.usdFormatted).toBe("$42.40");
    });
  });
});
