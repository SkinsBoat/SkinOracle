import {
  isBlockedMarket,
  isMarketMatch,
  toCanonicalMarketId,
} from "../canonicalMarkets";
import type { AcceptedPriceInfo, MarketGapResultItem } from "../types";

export interface MarketGapAllowedWears {
  fn: boolean;
  mw: boolean;
  ft: boolean;
  ww: boolean;
  bs: boolean;
  souvenir: boolean;
  sticker: boolean;
}

export interface MarketGapCacheItem {
  n?: string;
  l?: Array<{ m: string; p: number; q?: number }>;
  icon_url?: string;
  [key: string]: unknown;
}

export interface MarketGapScanOptions {
  /** Global market price cache, populated by any pricing provider. */
  priceCache: Record<string, MarketGapCacheItem | undefined> | null | undefined;
  /** Canonical market the item must be missing from (e.g. "csfloat", "dmarket"). */
  targetMarket: string;
  /** Minimum number of distinct non-target markets the item must appear on. */
  minOtherMarkets: number;
  /** Lowest source-market price range. */
  minPrice: number;
  maxPrice: number;
  allowedWears: MarketGapAllowedWears;
  /** Oracle accepted prices (Buy Ceilings), keyed by market hash name. */
  acceptedPrices?: Record<string, AcceptedPriceInfo> | null;
  /** When true, only include items with a valid Buy Ceiling. */
  buyCeilingOnly?: boolean;
  /** Minimum Supply Stability Score (0 disables the filter). */
  minSssScore?: number;
  /** Optional normalized active-order/target lookup for the workstation. */
  isActiveOrder?: (itemName: string) => boolean;
  /** Workstation-specific price rounding (CSFloat step, DMarket cents, ...). */
  roundPrice?: (price: number) => number;
  /** Safety cap for rendered results. Defaults to 200. */
  maxResults?: number;
}

export interface MarketGapScanSummary {
  results: MarketGapResultItem[];
  /** Number of cache items that already have a listing on the target market. */
  targetMarketCoverage: number;
  /** Number of matches before the maxResults cap. */
  totalCandidates: number;
  /** Number of cache entries inspected. */
  scannedItems: number;
}

const DEFAULT_MAX_RESULTS = 200;

const isWearAllowed = (
  name: string,
  allowed: MarketGapAllowedWears,
): boolean => {
  const lower = name.toLowerCase();
  if (lower.includes("souvenir") && !allowed.souvenir) return false;
  if (lower.includes("sticker |") && !allowed.sticker) return false;
  if (lower.includes("(factory new)") && !allowed.fn) return false;
  if (lower.includes("(minimal wear)") && !allowed.mw) return false;
  if (lower.includes("(field-tested)") && !allowed.ft) return false;
  if (lower.includes("(well-worn)") && !allowed.ww) return false;
  if (lower.includes("(battle-scarred)") && !allowed.bs) return false;
  return true;
};

/** True when the item has at least one valid listing on the given market. */
export const hasMarketListing = (
  cacheItem: MarketGapCacheItem | undefined,
  marketId: string,
): boolean =>
  Array.isArray(cacheItem?.l) &&
  cacheItem.l.some(
    (entry) =>
      typeof entry?.p === "number" &&
      Number.isFinite(entry.p) &&
      entry.p > 0 &&
      isMarketMatch(entry?.m, marketId),
  );

/**
 * Detects cross-market availability gaps: items listed on other marketplaces
 * but missing from the target market.
 *
 * The scan is a single pass over the unified price cache. It does not compare
 * markets pairwise: for each item it keeps the lowest price per non-target
 * market and counts those distinct markets.
 */
export const scanMarketGaps = (
  options: MarketGapScanOptions,
): MarketGapScanSummary => {
  const {
    priceCache,
    targetMarket,
    minOtherMarkets,
    minPrice,
    maxPrice,
    allowedWears,
    acceptedPrices,
    buyCeilingOnly = true,
    minSssScore = 0,
    isActiveOrder,
    roundPrice = (price) => price,
    maxResults = DEFAULT_MAX_RESULTS,
  } = options;

  const entries = Object.entries(priceCache || {});
  const scannedItems = entries.length;
  const minMarkets = Math.max(1, Math.floor(minOtherMarkets));
  const minSourcePrice = Number.isFinite(minPrice) ? Math.max(0, minPrice) : 0;
  const maxSourcePrice = Number.isFinite(maxPrice)
    ? Math.max(0, maxPrice)
    : Number.POSITIVE_INFINITY;
  const minimumSss = Number.isFinite(minSssScore)
    ? Math.max(0, minSssScore)
    : 0;

  const targetMarketItemNames = new Set<string>();
  for (const [name, cacheItem] of entries) {
    if (hasMarketListing(cacheItem, targetMarket)) {
      targetMarketItemNames.add(name);
    }
  }
  const targetMarketCoverage = targetMarketItemNames.size;

  // Without any target-market data the cache cannot prove what is missing.
  if (targetMarketCoverage === 0) {
    return {
      results: [],
      targetMarketCoverage,
      totalCandidates: 0,
      scannedItems,
    };
  }

  const results: MarketGapResultItem[] = [];

  for (const [name, cacheItem] of entries) {
    if (!cacheItem?.l || !Array.isArray(cacheItem.l)) continue;
    if (!isWearAllowed(name, allowedWears)) continue;
    if (targetMarketItemNames.has(name)) continue;

    const bestPriceByMarket = new Map<string, number>();
    for (const entry of cacheItem.l) {
      if (
        !entry ||
        typeof entry.p !== "number" ||
        !Number.isFinite(entry.p) ||
        entry.p <= 0
      ) {
        continue;
      }

      const marketId = toCanonicalMarketId(entry.m);
      if (!marketId || isMarketMatch(marketId, targetMarket)) continue;
      if (isBlockedMarket(marketId)) continue;

      const existing = bestPriceByMarket.get(marketId);
      if (existing === undefined || entry.p < existing) {
        bestPriceByMarket.set(marketId, entry.p);
      }
    }

    if (bestPriceByMarket.size < minMarkets) continue;

    const otherMarkets = Array.from(bestPriceByMarket.entries())
      .map(([market, price]) => ({ market, price }))
      .sort((a, b) => a.price - b.price);

    const lowestPrice = otherMarkets[0].price;
    if (lowestPrice < minSourcePrice || lowestPrice > maxSourcePrice) continue;

    const acceptedEntry =
      acceptedPrices?.[name] ?? acceptedPrices?.[name.trim()];
    const rawAcceptedPrice = acceptedEntry?.acceptedPrice;
    const roundedAcceptedPrice =
      typeof rawAcceptedPrice === "number" &&
      Number.isFinite(rawAcceptedPrice) &&
      rawAcceptedPrice > 0
        ? roundPrice(rawAcceptedPrice)
        : undefined;
    const acceptedPrice =
      typeof roundedAcceptedPrice === "number" && roundedAcceptedPrice > 0
        ? roundedAcceptedPrice
        : undefined;

    const itemSss = acceptedEntry?.supplyStabilityScore ?? 0;
    if (itemSss < minimumSss) continue;
    if (buyCeilingOnly && !acceptedPrice) continue;

    results.push({
      name,
      otherMarkets,
      marketCount: otherMarkets.length,
      lowestPrice,
      lowestMarket: otherMarkets[0].market,
      highestPrice: otherMarkets[otherMarkets.length - 1].price,
      hasExistingOrder: isActiveOrder ? isActiveOrder(name) : false,
      acceptedPrice,
      iconUrl:
        typeof cacheItem.icon_url === "string" ? cacheItem.icon_url : undefined,
      trendMomentum14d: acceptedEntry?.trendMomentum14d,
      supplyStabilityScore: acceptedEntry?.supplyStabilityScore,
    });
  }

  results.sort(
    (a, b) => b.marketCount - a.marketCount || a.lowestPrice - b.lowestPrice,
  );

  const totalCandidates = results.length;
  const cappedResults = results.slice(0, Math.max(0, Math.floor(maxResults)));

  return {
    results: cappedResults,
    targetMarketCoverage,
    totalCandidates,
    scannedItems,
  };
};
