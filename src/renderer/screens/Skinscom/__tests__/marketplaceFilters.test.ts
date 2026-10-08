import { describe, it, expect } from "vitest";
import {
  DEFAULT_FILTERS,
  buildMarketplaceParams,
  type AllowedWears,
  type SkinscomFilterState,
} from "../constants";
import {
  buildCeilingMap,
  countMatchedCeilings,
  selectVisibleListings,
  type CeilingMap,
} from "../utils/marketplaceFilters";
import type { SkinscomListing } from "../../../../shared/types/skinscom.types";

const makeListing = (
  overrides: Partial<SkinscomListing>,
): SkinscomListing =>
  ({
    id: 1,
    market_name: "AK-47 | Redline (Field-Tested)",
    market_value: 10000,
    purchase_price: 10000,
    suggested_price: 10000,
    above_recommended_price: 0,
    price_is_unreliable: false,
    is_commodity: false,
    icon_url: "HASH",
    name_color: "D2D2D2",
    preview_id: null,
    wear: 0.2,
    wear_name: "Field-Tested",
    stickers: [],
    blue_percentage: null,
    fade_percentage: null,
    auction_ends_at: null,
    auction_highest_bid: null,
    auction_number_of_bids: 0,
    published_at: "2026-01-01T00:00:00Z",
    marketplace_privacy_protection_level: "base",
    depositor_stats: {
      delivery_rate_recent: 1,
      delivery_rate_long: 1,
      delivery_time_minutes_recent: 1,
      delivery_time_minutes_long: 1,
      delivery_rate_status: null,
      steam_level_min_range: null,
      steam_level_max_range: null,
      user_has_trade_notifications_enabled: true,
      user_online_status: 1,
    },
    ...overrides,
  }) as SkinscomListing;

const filters = (patch: Partial<SkinscomFilterState>): SkinscomFilterState => ({
  ...DEFAULT_FILTERS,
  ...patch,
});

describe("buildMarketplaceParams", () => {
  it("uses fixed-price default and USD-cents price bounds", () => {
    const p = buildMarketplaceParams(DEFAULT_FILTERS, 1);
    expect(p.auction).toBe("no");
    expect(p.price_min).toBe(200);
    expect(p.price_max).toBe(20000);
    expect(p.is_commodity).toBeUndefined();
    expect(p.wear_min).toBeUndefined();
    expect(p.page).toBe(1);
    expect(p.fetchAll).toBe(false);
  });

  it("sends is_commodity for weapon/sticker categories without wear", () => {
    expect(
      buildMarketplaceParams(filters({ category: "weapon" }), 1).is_commodity,
    ).toBe("no");
    expect(
      buildMarketplaceParams(filters({ category: "sticker" }), 1).is_commodity,
    ).toBe("yes");
  });

  it("sends a wear envelope (and drops is_commodity) for weapon subsets", () => {
    const allowedWears: AllowedWears = {
      fn: false,
      mw: true,
      ft: false,
      ww: false,
      bs: false,
    };
    const p = buildMarketplaceParams(
      filters({ category: "weapon", allowedWears }),
      1,
    );
    expect(p.wear_min).toBeCloseTo(0.07, 5);
    expect(p.wear_max).toBeCloseTo(0.15, 5);
    // Skins.com rejects is_commodity combined with wear filters.
    expect(p.is_commodity).toBeUndefined();
  });

  it("omits the wear envelope when all buckets are selected", () => {
    const p = buildMarketplaceParams(filters({ category: "weapon" }), 1);
    expect(p.wear_min).toBeUndefined();
    expect(p.wear_max).toBeUndefined();
    expect(p.is_commodity).toBe("no");
  });
});

describe("buildCeilingMap", () => {
  it("converts accepted-price dollars to cents and skips invalid entries", () => {
    const map = buildCeilingMap({
      "AK-47 | Redline (Field-Tested)": {
        acceptedPrice: 12.5,
        supplyStabilityScore: 1.3,
      },
      "Bad Item": { acceptedPrice: 0, supplyStabilityScore: 0 },
    } as any);
    expect(map["AK-47 | Redline (Field-Tested)"]).toEqual({
      cents: 1250,
      sss: 1.3,
    });
    expect(map["Bad Item"]).toBeUndefined();
  });
});

describe("selectVisibleListings", () => {
  const ceilings: CeilingMap = {
    "AK-47 | Redline (Field-Tested)": { cents: 10000, sss: 1.3 },
    "AWP | Asiimov (Well-Worn)": { cents: 10000, sss: 1.3 },
    "Low SSS (Field-Tested)": { cents: 10000, sss: 1.0 },
  };
  const f = filters({
    maxCloseness: 1.08,
    minSss: 1.2,
    category: "all",
  });

  it("keeps only listings with a ceiling within distance and SSS floor", () => {
    const items = [
      makeListing({ id: 1 }), // 1.0x, sss 1.3 -> visible
      makeListing({
        id: 2,
        market_name: "AWP | Asiimov (Well-Worn)",
        market_value: 12000,
      }), // 1.2x -> hidden
      makeListing({ id: 3, market_name: "No Ceiling (Field-Tested)" }), // no ceiling -> hidden
      makeListing({
        id: 4,
        market_name: "Low SSS (Field-Tested)",
      }), // sss 1.0 -> hidden
    ];
    const visible = selectVisibleListings(items, ceilings, f);
    expect(visible.map((l) => l.id)).toEqual([1]);
    expect(countMatchedCeilings(items, ceilings)).toBe(3);
  });

  it("sorts visible listings closest-to-ceiling first", () => {
    const localCeilings: CeilingMap = {
      "A (Field-Tested)": { cents: 10000, sss: 1.3 },
      "B (Field-Tested)": { cents: 10000, sss: 1.3 },
    };
    const items = [
      makeListing({ id: 10, market_name: "A (Field-Tested)", market_value: 10800 }),
      makeListing({ id: 11, market_name: "B (Field-Tested)", market_value: 10000 }),
    ];
    const visible = selectVisibleListings(items, localCeilings, f);
    expect(visible.map((l) => l.id)).toEqual([11, 10]);
  });
});
