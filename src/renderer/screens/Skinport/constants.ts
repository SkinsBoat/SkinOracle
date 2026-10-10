/**
 * Skinport Workstation constants and filter model. Kept out of the tabs so the
 * filter shape has a single source of truth. All prices are USD.
 */

export const DEFAULT_MAX_CLOSENESS = 1.08;
export const DEFAULT_MIN_SSS = 1.2;
export const DEFAULT_PRICE_MIN = "2";
export const DEFAULT_PRICE_MAX = "200";
/** Skinport appid for Counter-Strike 2. */
export const CS2_APPID = 730;
/** Skinport items endpoint caps requests at 8 / 5 min — refresh no faster. */
export const ITEMS_CACHE_MS = 5 * 60 * 1000;

export type CategoryFilter = "weapon_sticker" | "weapon" | "sticker" | "all";
export type FeedTypeFilter = "all" | "listed" | "sold";
export type WearKey = "fn" | "mw" | "ft" | "ww" | "bs";

export interface WearRange {
  key: WearKey;
  label: string;
  min: number;
  max: number;
}

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

export interface SkinportFilterState {
  priceMin: string;
  priceMax: string;
  maxCloseness: number;
  minSss: number;
  category: CategoryFilter;
  allowedWears: AllowedWears;
  /** Events tab only: restrict the feed to listed or sold items. */
  feedType: FeedTypeFilter;
}

export const DEFAULT_FILTERS: SkinportFilterState = {
  priceMin: DEFAULT_PRICE_MIN,
  priceMax: DEFAULT_PRICE_MAX,
  maxCloseness: DEFAULT_MAX_CLOSENESS,
  minSss: DEFAULT_MIN_SSS,
  category: "weapon_sticker",
  allowedWears: DEFAULT_ALLOWED_WEARS,
  feedType: "all",
};
