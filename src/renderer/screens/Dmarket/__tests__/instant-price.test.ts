import { describe, it, expect } from "vitest";
import { resolveInstantPrice } from "../dmarket-utils";

describe("resolveInstantPrice", () => {
  it("parses DMarket API instantPrice with USD string cents (e.g. USD: '6289')", () => {
    const item = {
      instantPrice: {
        DMC: "",
        USD: "6289",
      },
    };
    expect(resolveInstantPrice(item)).toBe(62.89);
  });

  it("parses 400 cents as $4.00", () => {
    const item = {
      instantPrice: {
        USD: "400",
      },
    };
    expect(resolveInstantPrice(item)).toBe(4.0);
  });

  it("handles decimal dollar strings without dividing by 100", () => {
    const item = {
      instantPrice: {
        USD: "62.89",
      },
    };
    expect(resolveInstantPrice(item)).toBe(62.89);
  });

  it("handles instantPrice directly on item or inside _raw wrapper", () => {
    expect(
      resolveInstantPrice({
        instantPrice: { USD: "1550" },
      }),
    ).toBe(15.5);

    expect(
      resolveInstantPrice({
        _raw: {
          instantPrice: { USD: "899" },
        },
      }),
    ).toBe(8.99);

    // Matches real DMarket Huntsman Knife payload
    expect(
      resolveInstantPrice({
        title: "★ StatTrak™ Huntsman Knife | Bright Water (Minimal Wear)",
        price: { DMC: "", USD: "6786" },
        instantPrice: { DMC: "", USD: "6289" },
      }),
    ).toBe(62.89);
  });

  it("returns null when instantPrice is empty, zero, or missing", () => {
    expect(resolveInstantPrice(null)).toBeNull();
    expect(resolveInstantPrice({})).toBeNull();
    expect(
      resolveInstantPrice({
        instantPrice: { DMC: "", USD: "" },
      }),
    ).toBeNull();
    expect(
      resolveInstantPrice({
        instantPrice: { USD: "0" },
      }),
    ).toBeNull();
  });
});
