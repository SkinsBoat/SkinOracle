import { describe, it, expect } from "vitest";
import {
  buildCeilingMap,
  selectVisibleItems,
  selectVisibleSales,
  sortMarketItems,
  sortSales,
  type SkinportFeedEntry,
} from "../utils/skinportFilters";
import { calculateEventVelocity } from "../utils/skinportUtils";
import { DEFAULT_FILTERS } from "../constants";
import type {
  SkinportMarketItem,
  SkinportSale,
} from "../../../../shared/types/skinport.types";
import type { AcceptedPriceEntry } from "../../../hooks/useAcceptedPrices";

const accepted = (price: number, sss = 1.0): AcceptedPriceEntry => ({
  acceptedPrice: price,
  supplyStabilityScore: sss,
});

const item = (
  name: string,
  minPrice: number,
  updatedAt = 0,
): SkinportMarketItem => ({
  market_hash_name: name,
  currency: "USD",
  suggested_price: null,
  item_page: "",
  market_page: "",
  min_price: minPrice,
  max_price: minPrice,
  mean_price: minPrice,
  median_price: minPrice,
  quantity: 1,
  created_at: 0,
  updated_at: updatedAt,
});

const sale = (
  name: string,
  priceCents: number,
  wear = 0.2,
): SkinportSale =>
  ({
    marketHashName: name,
    salePrice: priceCents,
    wear,
    suggestedPrice: priceCents,
  }) as SkinportSale;

const entry = (
  name: string,
  priceCents: number,
  receivedAt: number,
  eventType: "listed" | "sold" = "listed",
): SkinportFeedEntry => ({
  identity: `${name}::${receivedAt}`,
  sale: sale(name, priceCents),
  eventType,
  receivedAt,
  count: 1,
});

// Base filters widen the price window so ceiling/SSS logic is what discriminates.
const baseFilters = {
  ...DEFAULT_FILTERS,
  priceMin: "1",
  priceMax: "10000",
  minSss: 0,
};

describe("sortSales", () => {
  const entries = [
    entry("A", 1200, 100), // closeness 1.2
    entry("B", 900, 300), // closeness 0.9
    entry("C", 1000, 200), // closeness 1.0
  ];

  it("orders newest-first by default", () => {
    expect(sortSales(entries).map((e) => e.receivedAt)).toEqual([300, 200, 100]);
  });
});

describe("sortMarketItems", () => {
  const ceilings = buildCeilingMap({
    A: accepted(1000, 0.5),
    B: accepted(1000, 1.3),
  });
  const items = [
    item("A", 12, 100),
    item("B", 9, 300),
  ];

  it("orders by closeness ascending by default", () => {
    expect(
      sortMarketItems(items, ceilings).map((i) => i.market_hash_name),
    ).toEqual(["B", "A"]);
  });
});

describe("calculateEventVelocity", () => {
  const now = 1_000_000;

  it("returns zero for no events or an empty window", () => {
    expect(calculateEventVelocity([], 60000, now)).toBe(0);
    expect(calculateEventVelocity([now - 120000], 60000, now)).toBe(0);
  });

  it("counts only events within the window (per minute)", () => {
    const stamps = [now - 1000, now - 30000, now - 90000];
    expect(calculateEventVelocity(stamps, 60000, now)).toBe(2);
  });

  it("normalises shorter windows to a per-minute rate", () => {
    const stamps = [now - 1000, now - 2000];
    expect(calculateEventVelocity(stamps, 30000, now)).toBe(4);
  });
});
