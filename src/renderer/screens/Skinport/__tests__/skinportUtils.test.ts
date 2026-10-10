import { describe, it, expect } from "vitest";
import {
  classifySkinportItem,
  computeCloseness,
  formatUsd,
  formatUsdFromCents,
  isSouvenirName,
  itemPriceCents,
  saleDiscountPercent,
  saleIdentity,
  splitMarketName,
  usdToCents,
  wearKeyFromFloat,
  wearKeyFromName,
} from "../utils/skinportUtils";
import { buildCeilingMap, selectVisibleItems } from "../utils/skinportFilters";
import { DEFAULT_FILTERS } from "../constants";
import type {
  SkinportMarketItem,
  SkinportSale,
} from "../../../../shared/types/skinport.types";
import type { AcceptedPriceEntry } from "../../../hooks/useAcceptedPrices";

const item = (
  overrides: Partial<SkinportMarketItem> = {},
): SkinportMarketItem => ({
  market_hash_name: "AK-47 | Slate (Field-Tested)",
  currency: "USD",
  suggested_price: 13.18,
  item_page: "https://skinport.com/item/csgo/ak-47-slate-field-tested",
  market_page: "https://skinport.com/market/730?cat=Rifle",
  min_price: 11.33,
  max_price: 18.22,
  mean_price: 12.58,
  median_price: 13.37,
  quantity: 25,
  created_at: 1535988253,
  updated_at: 1568073728,
  ...overrides,
});

const accepted = (price: number, sss = 1.3): AcceptedPriceEntry => ({
  acceptedPrice: price,
  supplyStabilityScore: sss,
});

describe("skinportUtils", () => {
  it("splits a market hash name into title and wear", () => {
    expect(splitMarketName("AK-47 | Slate (Field-Tested)")).toEqual({
      title: "AK-47 | Slate",
      wear: "FT",
    });
    expect(splitMarketName("Sticker | Titan (Holo)")).toEqual({
      title: "Sticker | Titan (Holo)",
      wear: "",
    });
  });

  it("classifies weapons, stickers and other", () => {
    expect(classifySkinportItem("AK-47 | Slate (Field-Tested)")).toBe("weapon");
    expect(classifySkinportItem("★ Karambit | Fade (Factory New)")).toBe(
      "weapon",
    );
    expect(classifySkinportItem("Sticker | Titan (Holo)")).toBe("sticker");
    expect(classifySkinportItem("Operation Bravo Case")).toBe("other");
  });

  it("detects Souvenir variants by name prefix", () => {
    expect(isSouvenirName("Souvenir AWP | Desert Hydra (Field-Tested)")).toBe(
      true,
    );
    expect(isSouvenirName("AWP | Asiimov (Field-Tested)")).toBe(false);
  });

  it("maps wear names and floats to bucket keys", () => {
    expect(wearKeyFromName("AWP | Asiimov (Well-Worn)")).toBe("ww");
    expect(wearKeyFromFloat(0.05)).toBe("fn");
    expect(wearKeyFromFloat(0.5)).toBe("bs");
    expect(wearKeyFromFloat(null)).toBeNull();
  });

  it("converts and formats USD values", () => {
    expect(usdToCents("2.5")).toBe(250);
    expect(usdToCents("0")).toBeNull();
    expect(formatUsdFromCents(7903)).toBe("$79.03");
    expect(formatUsd(11.5)).toBe("$11.50");
    expect(itemPriceCents(item())).toBe(1133);
    expect(itemPriceCents(item({ min_price: null }))).toBeNull();
  });

  it("computes closeness and sale discount", () => {
    expect(computeCloseness(1100, 1200)).toBeCloseTo(0.9167, 3);
    expect(computeCloseness(1100, null)).toBeNull();
    const sale = { salePrice: 7903, suggestedPrice: 10004 } as SkinportSale;
    expect(saleDiscountPercent(sale)).toBeCloseTo(-21.0, 1);
  });

  it("derives a stable identity from name + float", () => {
    expect(
      saleIdentity({ marketHashName: "A", wear: 0.1 } as SkinportSale),
    ).toBe("A::0.1");
  });
});

describe("skinportFilters", () => {
  const ceilings = buildCeilingMap({
    "AK-47 | Slate (Field-Tested)": accepted(12),
  });

  it("converts accepted prices to cents and keeps matched listings", () => {
    expect(ceilings["AK-47 | Slate (Field-Tested)"].cents).toBe(1200);
    const visible = selectVisibleItems([item()], ceilings, {
      ...DEFAULT_FILTERS,
      priceMin: "1",
      priceMax: "200",
      minSss: 0,
    });
    expect(visible.map((i) => i.market_hash_name)).toEqual([
      "AK-47 | Slate (Field-Tested)",
    ]);
  });

  it("excludes items without a ceiling or outside the price window", () => {
    expect(
      selectVisibleItems([item()], {}, { ...DEFAULT_FILTERS, minSss: 0 }),
    ).toHaveLength(0);

    const pricey = item({ min_price: 500 });
    expect(
      selectVisibleItems([pricey], ceilings, {
        ...DEFAULT_FILTERS,
        priceMax: "200",
        minSss: 0,
      }),
    ).toHaveLength(0);
  });

  it("gates Souvenir variants behind the Souvenir toggle", () => {
    const souvenir = item({
      market_hash_name: "Souvenir AWP | Desert Hydra (Field-Tested)",
    });
    const souvenirCeilings = buildCeilingMap({
      "Souvenir AWP | Desert Hydra (Field-Tested)": accepted(12),
    });

    // Included by default.
    expect(
      selectVisibleItems([souvenir], souvenirCeilings, {
        ...DEFAULT_FILTERS,
        minSss: 0,
      }),
    ).toHaveLength(1);

    // Excluded when the Souvenir toggle is turned off.
    expect(
      selectVisibleItems([souvenir], souvenirCeilings, {
        ...DEFAULT_FILTERS,
        minSss: 0,
        allowedWears: { ...DEFAULT_FILTERS.allowedWears, souvenir: false },
      }),
    ).toHaveLength(0);
  });
});
