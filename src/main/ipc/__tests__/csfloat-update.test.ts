import { describe, it, expect } from "vitest";
import { snapCsFloatBuyOrderPriceCents } from "../../../shared/csfloatUtils";

export interface CSFloatUpdateBuyOrderPayload {
  max_price: number;
  quantity: number;
  [key: string]: any;
}

export function buildUpdateBuyOrderPayload(
  orderId: string,
  maxPriceCentsArg: any,
  quantityArg?: any,
  extraProps?: any,
): { targetUrl: string; payload: CSFloatUpdateBuyOrderPayload } {
  if (!orderId || typeof orderId !== "string") {
    throw new Error("CSFloat update error: Valid orderId string is required");
  }

  const rawPriceCents =
    typeof maxPriceCentsArg === "number"
      ? maxPriceCentsArg
      : parseFloat(maxPriceCentsArg);
  const quantity =
    quantityArg !== undefined
      ? typeof quantityArg === "number"
        ? quantityArg
        : parseInt(quantityArg, 10)
      : 1;

  if (isNaN(rawPriceCents) || rawPriceCents <= 0) {
    throw new Error(
      `CSFloat update error: Invalid maxPriceCents value: ${maxPriceCentsArg}`,
    );
  }

  const validPriceCents = snapCsFloatBuyOrderPriceCents(rawPriceCents);

  const payload: CSFloatUpdateBuyOrderPayload = {
    ...(extraProps && typeof extraProps === "object" ? extraProps : {}),
    max_price: validPriceCents,
    quantity: isNaN(quantity) || quantity < 1 ? 1 : Math.floor(quantity),
  };

  return {
    targetUrl: `https://csfloat.com/api/v1/buy-orders/${orderId}`,
    payload,
  };
}

describe("CSFloat Buy Order Update Payload Builder", () => {
  it("should construct valid payload with price in cents and default quantity 1", () => {
    const result = buildUpdateBuyOrderPayload("1015495269460083062", 235);
    expect(result.targetUrl).toBe(
      "https://csfloat.com/api/v1/buy-orders/1015495269460083062",
    );
    expect(result.payload).toEqual({
      max_price: 235,
      quantity: 1,
    });
  });

  it("should construct valid payload with custom quantity counter", () => {
    const result = buildUpdateBuyOrderPayload("1015495269460083062", 1250, 5);
    expect(result.payload).toEqual({
      max_price: 1250,
      quantity: 5,
    });
  });

  it("should preserve extra attributes like hybrid_properties (min_float, max_float)", () => {
    const extraProps = {
      hybrid_properties: {
        min_float: 0.07,
        max_float: 0.122,
      },
    };
    const result = buildUpdateBuyOrderPayload(
      "1015495269460083062",
      235,
      2,
      extraProps,
    );
    expect(result.payload).toEqual({
      hybrid_properties: {
        min_float: 0.07,
        max_float: 0.122,
      },
      max_price: 235,
      quantity: 2,
    });
  });

  it("should parse string number inputs accurately", () => {
    const result = buildUpdateBuyOrderPayload(
      "1015495269460083062",
      "450",
      "3",
    );
    expect(result.payload).toEqual({
      max_price: 450,
      quantity: 3,
    });
  });

  it("should throw error for invalid orderId", () => {
    expect(() => buildUpdateBuyOrderPayload("", 235)).toThrow(
      "Valid orderId string is required",
    );
  });

  it("should throw error for invalid or non-positive maxPriceCents", () => {
    expect(() => buildUpdateBuyOrderPayload("123", -50)).toThrow(
      "Invalid maxPriceCents value",
    );
    expect(() => buildUpdateBuyOrderPayload("123", "invalid")).toThrow(
      "Invalid maxPriceCents value",
    );
  });

  it("should fallback to quantity 1 if invalid or negative quantity provided", () => {
    const result = buildUpdateBuyOrderPayload("123", 500, -2);
    expect(result.payload.quantity).toBe(1);
  });

  describe("CSFloat Price Increment Rules for all tiers", () => {
    it("Tier 1: Below $5 allows 1 cent ($0.01) increments", () => {
      expect(snapCsFloatBuyOrderPriceCents(499)).toBe(499);
      expect(snapCsFloatBuyOrderPriceCents(1)).toBe(1);
    });

    it("Tier 2: $5 - $10 snaps to 5 cents ($0.05) increments", () => {
      // e.g. $7.18 -> $7.15 (715 cents)
      expect(snapCsFloatBuyOrderPriceCents(718)).toBe(715);
      expect(snapCsFloatBuyOrderPriceCents(500)).toBe(500);
      expect(snapCsFloatBuyOrderPriceCents(504)).toBe(500);
      expect(snapCsFloatBuyOrderPriceCents(999)).toBe(995);
    });

    it("Tier 3: $10 - $100 snaps to 10 cents ($0.10) increments", () => {
      // e.g. $13.37 -> $13.30 (1330 cents)
      expect(snapCsFloatBuyOrderPriceCents(1337)).toBe(1330);
      expect(snapCsFloatBuyOrderPriceCents(1000)).toBe(1000);
      expect(snapCsFloatBuyOrderPriceCents(1009)).toBe(1000);
      expect(snapCsFloatBuyOrderPriceCents(2915)).toBe(2910);
      expect(snapCsFloatBuyOrderPriceCents(9999)).toBe(9990);
    });

    it("Tier 4: $100 - $500 snaps to $1.00 (100 cents) increments", () => {
      // e.g. $125.40 -> $125.00 (12500 cents)
      expect(snapCsFloatBuyOrderPriceCents(12540)).toBe(12500);
      expect(snapCsFloatBuyOrderPriceCents(10000)).toBe(10000);
      expect(snapCsFloatBuyOrderPriceCents(49999)).toBe(49900);
    });

    it("Tier 5: $500 - $1,000 snaps to $5.00 (500 cents) increments", () => {
      // e.g. $552.80 -> $550.00 (55000 cents)
      expect(snapCsFloatBuyOrderPriceCents(55280)).toBe(55000);
      expect(snapCsFloatBuyOrderPriceCents(50000)).toBe(50000);
      expect(snapCsFloatBuyOrderPriceCents(99999)).toBe(99500);
    });

    it("Tier 6: Above $1,000 snaps to $10.00 (1000 cents) increments", () => {
      // e.g. $1234.50 -> $1230.00 (123000 cents)
      expect(snapCsFloatBuyOrderPriceCents(123450)).toBe(123000);
      expect(snapCsFloatBuyOrderPriceCents(100000)).toBe(100000);
      expect(snapCsFloatBuyOrderPriceCents(150999)).toBe(150000);
    });
  });
});
