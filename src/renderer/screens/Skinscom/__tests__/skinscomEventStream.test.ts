import { describe, it, expect } from "vitest";
import { reduceStreamEvent } from "../hooks/useSkinscomEventStream";
import { buildStreamFilters, DEFAULT_EVENT_FILTERS } from "../constants";
import { getListingIdentity } from "../utils/skinscomUtils";
import type {
  SkinscomListing,
  SkinscomStreamEvent,
} from "../../../../shared/types/skinscom.types";

const listing = (overrides: Partial<SkinscomListing> = {}): SkinscomListing =>
  ({
    id: 1,
    market_name: "AWP | Asiimov (Well-Worn)",
    market_value: 16000,
    purchase_price: 16000,
    suggested_price: 20000,
    above_recommended_price: -20,
    price_is_unreliable: false,
    is_commodity: false,
    icon_url: "HASH",
    name_color: "D2D2D2",
    preview_id: null,
    wear: 0.398,
    wear_name: "Well-Worn",
    stickers: [],
    blue_percentage: null,
    fade_percentage: null,
    auction_ends_at: null,
    auction_highest_bid: null,
    auction_number_of_bids: 0,
    published_at: "2026-09-24T17:11:43.378Z",
    marketplace_privacy_protection_level: "base",
    depositor_stats: {
      delivery_rate_recent: 1,
      delivery_rate_long: 1,
      delivery_time_minutes_recent: 2,
      delivery_time_minutes_long: 4,
      delivery_rate_status: null,
      steam_level_min_range: null,
      steam_level_max_range: null,
      user_has_trade_notifications_enabled: true,
      user_online_status: 1,
    },
    ...overrides,
  }) as SkinscomListing;

const event = (
  type: SkinscomStreamEvent["type"],
  payload: Partial<SkinscomStreamEvent>,
): SkinscomStreamEvent => ({ type, receivedAt: 1000, ...payload });

const keyFor = (l: SkinscomListing) => getListingIdentity(l);

describe("reduceStreamEvent", () => {
  it("keeps one entry per item identity and lets the newest event win", () => {
    let state = reduceStreamEvent(
      {},
      event("new_item", { items: [listing({ id: 1 })] }),
    );
    state = reduceStreamEvent(
      state,
      event("updated_item", {
        items: [listing({ id: 1, market_value: 15000 })],
        receivedAt: 2000,
      }),
    );
    const key = keyFor(listing());
    expect(Object.keys(state)).toEqual([key]);
    expect(state[key].eventType).toBe("updated_item");
    expect(state[key].listing.market_value).toBe(15000);
    expect(state[key].receivedAt).toBe(2000);
    expect(state[key].ids).toEqual([1]);
  });

  it("merges a re-listed item (same name+float, new deposit id) into one entry", () => {
    let state = reduceStreamEvent(
      {},
      event("new_item", { items: [listing({ id: 111 })] }),
    );
    state = reduceStreamEvent(
      state,
      event("new_item", { items: [listing({ id: 222 })], receivedAt: 3000 }),
    );
    const key = keyFor(listing());
    expect(Object.keys(state)).toEqual([key]);
    expect(state[key].ids).toEqual([111, 222]);
    expect(state[key].id).toBe(222);
  });

  it("patches auction bids onto the entry that owns the deposit id", () => {
    const state = reduceStreamEvent(
      reduceStreamEvent({}, event("new_item", { items: [listing({ id: 7 })] })),
      event("auction_update", {
        auctions: [
          {
            id: 7,
            above_recommended_price: -1.87,
            auction_highest_bid: 3730,
            auction_number_of_bids: 2,
            auction_ends_at: 1790276430,
          },
          {
            id: 999,
            above_recommended_price: 0,
            auction_highest_bid: 100,
            auction_number_of_bids: 1,
            auction_ends_at: 1790276430,
          },
        ],
      }),
    );
    const key = keyFor(listing());
    expect(state[key].eventType).toBe("auction_update");
    expect(state[key].listing.auction_highest_bid).toBe(3730);
    expect(Object.keys(state)).toEqual([key]);
  });

  it("drops an item only when all of its deposit ids are deleted", () => {
    const seed = reduceStreamEvent({}, event("new_item", { items: [
      listing({ id: 111 }),
    ] }));
    const reListed = reduceStreamEvent(
      seed,
      event("new_item", { items: [listing({ id: 222 })] }),
    );
    // Old id deleted but the re-listed id survives.
    const afterOldDeleted = reduceStreamEvent(
      reListed,
      event("deleted_item", { deletedIds: [111] }),
    );
    const key = keyFor(listing());
    expect(afterOldDeleted[key].ids).toEqual([222]);
    // Last id deleted -> entry gone.
    const afterAllDeleted = reduceStreamEvent(
      afterOldDeleted,
      event("deleted_item", { deletedIds: [222] }),
    );
    expect(afterAllDeleted[key]).toBeUndefined();
  });
});

describe("getListingIdentity", () => {
  it("keys the same market name and float to one identity", () => {
    expect(getListingIdentity(listing({ id: 1, wear: 0.398 }))).toBe(
      getListingIdentity(listing({ id: 2, wear: 0.398 })),
    );
  });

  it("separates different floats and different names", () => {
    expect(getListingIdentity(listing({ wear: 0.398 }))).not.toBe(
      getListingIdentity(listing({ wear: 0.4 })),
    );
    expect(
      getListingIdentity(listing({ market_name: "A", wear: 0.1 })),
    ).not.toBe(getListingIdentity(listing({ market_name: "B", wear: 0.1 })));
  });
});

describe("buildStreamFilters", () => {
  it("maps the price range to cents and passes the auction filter through", () => {
    expect(
      buildStreamFilters({
        ...DEFAULT_EVENT_FILTERS,
        priceMin: "2",
        priceMax: "200",
        auctionFilter: "yes",
      }),
    ).toEqual({ priceMinCents: 200, priceMaxCents: 20000, auction: "yes" });
  });

  it("omits the auction narrowing for the All filter", () => {
    expect(
      buildStreamFilters({ ...DEFAULT_EVENT_FILTERS, auctionFilter: "all" })
        .auction,
    ).toBeUndefined();
  });
});
