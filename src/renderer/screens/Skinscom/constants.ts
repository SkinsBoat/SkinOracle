import type {
  SkinscomListedItemsParams,
  SkinscomStreamFilters,
} from "../../../shared/types/skinscom.types";
import { usdToCents } from "./utils/skinscomUtils";

/**
 * Skins.com Marketplace ("So Close") workstation constants, filter types, and
 * the query-param builder. Kept out of the tabs/components so the filter model
 * has a single source of truth.
 */

// Max `per_page` allowed with an API key (200 without one). Scans require a
// key, so we use the max to fetch the market in ~10 requests instead of ~250.
export const PAGE_SIZE = 2500;
export const DEFAULT_MAX_CLOSENESS = 1.08;
export const DEFAULT_MIN_SSS = 1.2;
export const DEFAULT_PRICE_MIN = "2";
export const DEFAULT_PRICE_MAX = "200";
/** Main-process paging cap (must stay in sync with skinscom.ipc.ts). */
export const MAX_SCAN_PAGES = 40;
/** Skins.com `POST /trading/deposit` accepts at most 20 items per request. */
export const MAX_DEPOSIT_ITEMS = 20;

export type CategoryFilter = "weapon_sticker" | "weapon" | "sticker" | "all";
export type AuctionFilter = "all" | "yes" | "no";
export type WearKey = "fn" | "mw" | "ft" | "ww" | "bs";

export interface WearRange {
  key: WearKey;
  label: string;
  min: number;
  max: number;
}

/** CS2 wear buckets mapped to their float ranges. */
export const WEAR_RANGES: WearRange[] = [
  { key: "fn", label: "FN", min: 0.0, max: 0.07 },
  { key: "mw", label: "MW", min: 0.07, max: 0.15 },
  { key: "ft", label: "FT", min: 0.15, max: 0.38 },
  { key: "ww", label: "WW", min: 0.38, max: 0.45 },
  { key: "bs", label: "BS", min: 0.45, max: 1.0 },
];

export const WEAR_KEY_BY_NAME: Record<string, WearKey> = {
  "Factory New": "fn",
  "Minimal Wear": "mw",
  "Field-Tested": "ft",
  "Well-Worn": "ww",
  "Battle-Scarred": "bs",
};

export type AllowedWears = Record<WearKey, boolean>;

export const DEFAULT_ALLOWED_WEARS: AllowedWears = {
  fn: true,
  mw: true,
  ft: true,
  ww: true,
  bs: true,
};

export const CATEGORY_BADGES: { key: CategoryFilter; label: string }[] = [
  { key: "weapon_sticker", label: "All" },
  { key: "weapon", label: "Weapons" },
  { key: "sticker", label: "Stickers" },
];

export interface SkinscomFilterState {
  priceMin: string;
  priceMax: string;
  auctionFilter: AuctionFilter;
  maxCloseness: number;
  minSss: number;
  /** Category is filtered client-side (the API has no category param). */
  category: CategoryFilter;
  allowedWears: AllowedWears;
}

export const DEFAULT_FILTERS: SkinscomFilterState = {
  priceMin: DEFAULT_PRICE_MIN,
  priceMax: DEFAULT_PRICE_MAX,
  auctionFilter: "no",
  maxCloseness: DEFAULT_MAX_CLOSENESS,
  minSss: DEFAULT_MIN_SSS,
  category: "weapon_sticker",
  allowedWears: DEFAULT_ALLOWED_WEARS,
};

/**
 * Events tab defaults. Same model as Market Scan but `auctionFilter: "all"` so
 * the live feed surfaces auctions as well as fixed-price listings.
 */
export const DEFAULT_EVENT_FILTERS: SkinscomFilterState = {
  ...DEFAULT_FILTERS,
  auctionFilter: "all",
};

/**
 * Build `GET /trading/items` query params.
 *
 * Do NOT send `sort`/`order`: Skins.com only orders by `market_value`, so
 * cheapest-first floods the page with identical cheap listings; the default
 * (mixed/newest) order gives a useful sample and we sort by closeness client
 * side. `is_commodity` cannot be combined with wear filters (HTTP 422), so it
 * is dropped whenever a wear envelope is sent.
 */
export function buildMarketplaceParams(
  filters: SkinscomFilterState,
  page: number,
  autoFetchAll = false,
): SkinscomListedItemsParams {
  const selectedWears = WEAR_RANGES.filter((w) => filters.allowedWears[w.key]);
  const useWearRange =
    filters.category === "weapon" &&
    selectedWears.length > 0 &&
    selectedWears.length < WEAR_RANGES.length;

  return {
    price_min: usdToCents(filters.priceMin) ?? undefined,
    price_max: usdToCents(filters.priceMax) ?? undefined,
    wear_min: useWearRange
      ? Math.min(...selectedWears.map((w) => w.min))
      : undefined,
    wear_max: useWearRange
      ? Math.max(...selectedWears.map((w) => w.max))
      : undefined,
    is_commodity: useWearRange
      ? undefined
      : filters.category === "weapon"
        ? "no"
        : filters.category === "sticker"
          ? "yes"
          : undefined,
    auction:
      filters.auctionFilter === "all" ? undefined : filters.auctionFilter,
    per_page: PAGE_SIZE,
    page,
    fetchAll: autoFetchAll,
  };
}

/**
 * Derive the server-side narrowing emitted with the websocket `filters` packet.
 * Category/wear/SSS/max-distance are applied client-side (the feed has no such
 * params); only price and auction narrow the stream itself.
 */
export function buildStreamFilters(
  filters: SkinscomFilterState,
): SkinscomStreamFilters {
  return {
    priceMinCents: usdToCents(filters.priceMin) ?? undefined,
    priceMaxCents: usdToCents(filters.priceMax) ?? undefined,
    auction:
      filters.auctionFilter === "all" ? undefined : filters.auctionFilter,
  };
}
