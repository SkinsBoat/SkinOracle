import { describe, expect, it } from "vitest";
import {
  scanMarketGaps,
  type MarketGapAllowedWears,
  type MarketGapCacheItem,
} from "../marketGapScanner";
import type { AcceptedPriceInfo } from "../../types/oracle.types";

const ALL_WEARS: MarketGapAllowedWears = {
  fn: true,
  mw: true,
  ft: true,
  ww: true,
  bs: true,
  souvenir: true,
  sticker: true,
};

const accept = (price: number, sss = 1.2): AcceptedPriceInfo => ({
  acceptedPrice: price,
  supplyStabilityScore: sss,
  isHyperStable: false,
  trendMomentum14d: 0.5,
});

const marketItem = (
  prices: Record<string, number>,
  iconUrl?: string,
): MarketGapCacheItem => ({
  n: "item",
  l: Object.entries(prices).map(([m, p]) => ({ m, p })),
  ...(iconUrl ? { icon_url: iconUrl } : {}),
});

const COVERAGE_ANCHOR = {
  __coverage_anchor__: marketItem({ csfloat: 1 }),
};

const baseOptions = {
  targetMarket: "csfloat",
  minOtherMarkets: 3,
  minPrice: 2,
  maxPrice: 100,
  allowedWears: ALL_WEARS,
  buyCeilingOnly: true,
};

describe("scanMarketGaps", () => {
  it("finds items listed on 3+ other markets but missing from the target market", () => {
    const priceCache = {
      "AK-47 | Redline (Field-Tested)": marketItem({
        buff163: 10,
        buffmarket: 11,
        skinport: 12,
      }),
      "AWP | Asiimov (Field-Tested)": marketItem({
        csfloat: 30,
        buff163: 31,
        buffmarket: 32,
        skinport: 33,
      }),
      "M4A1-S | Printstream (Minimal Wear)": marketItem({
        buff163: 40,
        skinport: 41,
      }),
    };

    const summary = scanMarketGaps({
      ...baseOptions,
      priceCache,
      acceptedPrices: {
        "AK-47 | Redline (Field-Tested)": accept(15),
        "M4A1-S | Printstream (Minimal Wear)": accept(50),
      },
    });

    expect(summary.targetMarketCoverage).toBe(1);
    expect(summary.scannedItems).toBe(3);
    expect(summary.totalCandidates).toBe(1);
    expect(summary.results).toHaveLength(1);
    expect(summary.results[0]).toMatchObject({
      name: "AK-47 | Redline (Field-Tested)",
      marketCount: 3,
      lowestPrice: 10,
      lowestMarket: "buff163",
      highestPrice: 12,
      acceptedPrice: 15,
      hasExistingOrder: false,
    });
  });

  it("deduplicates market aliases and keeps the lowest price per canonical market", () => {
    const summary = scanMarketGaps({
      ...baseOptions,
      priceCache: {
        ...COVERAGE_ANCHOR,
        "Item A": {
          n: "Item A",
          l: [
            { m: "buff163", p: 10 },
            { m: "buff", p: 9 },
            { m: "buff_market", p: 8 },
            { m: "skinport", p: 12 },
          ],
        },
      },
      acceptedPrices: { "Item A": accept(15) },
    });

    expect(summary.results).toHaveLength(1);
    expect(summary.results[0].marketCount).toBe(3);
    expect(summary.results[0].lowestPrice).toBe(8);
    expect(summary.results[0].lowestMarket).toBe("buffmarket");
  });

  it("ignores blocked and target-market listings when counting other markets", () => {
    const summary = scanMarketGaps({
      ...baseOptions,
      priceCache: {
        "Item A": marketItem({
          buff163: 10,
          buffmarket: 11,
          skinport: 12,
          csgoempire: 1,
          csfloat: 9,
        }),
        "Item B": marketItem({
          buff163: 10,
          buffmarket: 11,
          csgoempire: 1,
        }),
      },
      acceptedPrices: { "Item A": accept(15) },
    });

    // csfloat listing makes the item ineligible, so no gap is reported.
    expect(summary.results).toHaveLength(0);
    expect(summary.targetMarketCoverage).toBe(1);
  });

  it("applies the source price range and Buy Ceiling filters", () => {
    const priceCache = {
      ...COVERAGE_ANCHOR,
      "Cheap Item": marketItem({ buff163: 1, buffmarket: 2, skinport: 3 }),
      "In Range": marketItem({ buff163: 10, buffmarket: 11, skinport: 12 }),
      "Expensive Item": marketItem({
        buff163: 150,
        buffmarket: 151,
        skinport: 152,
      }),
      "No Ceiling": marketItem({ buff163: 20, buffmarket: 21, skinport: 22 }),
    };
    const acceptedPrices = {
      "Cheap Item": accept(5),
      "In Range": accept(15),
      "Expensive Item": accept(160),
    };

    const withCeilingOnly = scanMarketGaps({
      ...baseOptions,
      priceCache,
      acceptedPrices,
    });

    expect(withCeilingOnly.results.map((r) => r.name)).toEqual(["In Range"]);

    const withoutCeilingOnly = scanMarketGaps({
      ...baseOptions,
      buyCeilingOnly: false,
      priceCache,
      acceptedPrices,
    });

    expect(withoutCeilingOnly.results.map((r) => r.name)).toEqual([
      "In Range",
      "No Ceiling",
    ]);
  });

  it("applies wear filters and price rounding", () => {
    const priceCache = {
      ...COVERAGE_ANCHOR,
      "Souvenir Item (Factory New)": marketItem({
        buff163: 10,
        buffmarket: 11,
        skinport: 12,
      }),
      "Normal Item (Factory New)": marketItem({
        buff163: 20,
        buffmarket: 21,
        skinport: 22,
      }),
    };

    const summary = scanMarketGaps({
      ...baseOptions,
      allowedWears: { ...ALL_WEARS, souvenir: false },
      priceCache,
      acceptedPrices: {
        "Souvenir Item (Factory New)": accept(15),
        "Normal Item (Factory New)": accept(25.123),
      },
      roundPrice: (price) => parseFloat(price.toFixed(2)),
    });

    expect(summary.results.map((r) => r.name)).toEqual([
      "Normal Item (Factory New)",
    ]);
    expect(summary.results[0].acceptedPrice).toBe(25.12);
  });

  it("applies the minimum SSS filter", () => {
    const priceCache = {
      ...COVERAGE_ANCHOR,
      "Strong SSS Item": marketItem({
        buff163: 10,
        buffmarket: 11,
        skinport: 12,
      }),
      "Weak SSS Item": marketItem({
        buff163: 20,
        buffmarket: 21,
        skinport: 22,
      }),
    };

    const summary = scanMarketGaps({
      ...baseOptions,
      minSssScore: 1.2,
      priceCache,
      acceptedPrices: {
        "Strong SSS Item": accept(15, 1.5),
        "Weak SSS Item": accept(25, 0.9),
      },
    });

    expect(summary.results.map((r) => r.name)).toEqual(["Strong SSS Item"]);
  });

  it("reports active orders via the workstation callback", () => {
    const summary = scanMarketGaps({
      ...baseOptions,
      priceCache: {
        ...COVERAGE_ANCHOR,
        "Item A": marketItem({ buff163: 10, buffmarket: 11, skinport: 12 }),
      },
      acceptedPrices: { "Item A": accept(15) },
      isActiveOrder: (name) => name === "Item A",
    });

    expect(summary.results[0].hasExistingOrder).toBe(true);
  });

  it("returns no results when the cache has no target-market coverage", () => {
    const summary = scanMarketGaps({
      ...baseOptions,
      targetMarket: "dmarket",
      priceCache: {
        ...COVERAGE_ANCHOR,
        "Item A": marketItem({ buff163: 10, buffmarket: 11, skinport: 12 }),
      },
      acceptedPrices: { "Item A": accept(15) },
    });

    expect(summary.targetMarketCoverage).toBe(0);
    expect(summary.results).toHaveLength(0);
  });

  it("sorts by market count then lowest price and caps results", () => {
    const priceCache = {
      ...COVERAGE_ANCHOR,
      "Item A": marketItem({ buff163: 10, buffmarket: 11, skinport: 12 }),
      "Item B": marketItem({
        buff163: 5,
        buffmarket: 6,
        skinport: 7,
        csmoney_market: 8,
      }),
      "Item C": marketItem({ buff163: 9, buffmarket: 10, skinport: 11 }),
    };
    const acceptedPrices = {
      "Item A": accept(15),
      "Item B": accept(15),
      "Item C": accept(15),
    };

    const summary = scanMarketGaps({
      ...baseOptions,
      priceCache,
      acceptedPrices,
      maxResults: 2,
    });

    expect(summary.totalCandidates).toBe(3);
    expect(summary.results.map((r) => r.name)).toEqual(["Item B", "Item C"]);
  });
});
