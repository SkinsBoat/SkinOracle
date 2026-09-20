import { DealMakerItem } from '../../../../shared/types/dealmaker.types';
import { isMarketMatch } from '../../../../shared/canonicalMarkets';

export interface DealFloorFilters {
  onlyBelowCeiling: boolean;
  marketFilter: string; // 'all' | 'csfloat' | 'dmarket' | etc.
  minPrice: string;
  maxPrice: string;
  searchQuery: string;
}

export type AuctionFloorFilters = DealFloorFilters;

export const DEFAULT_DEAL_FILTERS: DealFloorFilters = {
  onlyBelowCeiling: false,
  marketFilter: 'all',
  minPrice: '',
  maxPrice: '',
  searchQuery: '',
};

export const DEFAULT_AUCTION_FILTERS = DEFAULT_DEAL_FILTERS;

/**
 * Returns current effective price of a deal (highest offer if any, otherwise starting price).
 */
export function getDealEffectivePrice(deal: DealMakerItem): number {
  return Number(deal.highestBid || deal.startingPrice || 0);
}

export const getAuctionEffectivePrice = getDealEffectivePrice;

/**
 * Checks if a deal is priced at or below the trader's calculated buy ceiling.
 */
export function isDealWithinCeiling(
  deal: DealMakerItem,
  ceilingsMap: Record<string, number>,
): boolean {
  const ceiling = ceilingsMap[deal.marketHashName];
  if (typeof ceiling !== 'number' || ceiling <= 0) {
    return false;
  }
  const currentPrice = getDealEffectivePrice(deal);
  return currentPrice <= ceiling;
}

export const isAuctionWithinCeiling = isDealWithinCeiling;

/**
 * Counts how many deals in the list are within the trader's buy ceiling.
 */
export function countDealsWithinCeiling(
  deals: DealMakerItem[],
  ceilingsMap: Record<string, number>,
): number {
  return deals.reduce((acc, a) => {
    return isDealWithinCeiling(a, ceilingsMap) ? acc + 1 : acc;
  }, 0);
}

export const countAuctionsWithinCeiling = countDealsWithinCeiling;

/**
 * Checks whether any filter differs from default.
 */
export function isAnyFilterActive(filters: DealFloorFilters): boolean {
  return (
    filters.onlyBelowCeiling ||
    filters.marketFilter !== 'all' ||
    filters.minPrice.trim() !== '' ||
    filters.maxPrice.trim() !== '' ||
    filters.searchQuery.trim() !== ''
  );
}

/**
 * Filters deals based on trader-configured criteria:
 * 1. <= Buy Ceiling Only (profitable opportunities)
 * 2. Marketplace (all supported DealMaker markets)
 * 3. Min/Max price range applied to the trader's **Buy Ceiling** (not the deal's
 *    live offer), so the range reflects the trader's own valuation band.
 * 4. Skin Name Search Query
 */
export function filterDeals(
  deals: DealMakerItem[],
  ceilingsMap: Record<string, number>,
  filters: DealFloorFilters,
): DealMakerItem[] {
  const query = filters.searchQuery.trim().toLowerCase();
  const minP = parseFloat(filters.minPrice);
  const maxP = parseFloat(filters.maxPrice);
  const hasMin = !isNaN(minP) && minP > 0;
  const hasMax = !isNaN(maxP) && maxP > 0;

  return deals.filter((deal) => {
    const ceiling = ceilingsMap[deal.marketHashName];

    // 1. <= Buy Ceiling filter
    if (filters.onlyBelowCeiling) {
      if (!isDealWithinCeiling(deal, ceilingsMap)) {
        return false;
      }
    }

    // 2. Marketplace filter (canonical match across all aliases)
    if (filters.marketFilter !== 'all') {
      if (!isMarketMatch(deal.marketplace, filters.marketFilter)) {
        return false;
      }
    }

    // 3. Price Range filter — applied to the trader's Buy Ceiling. Deals without
    // a calculated ceiling are excluded while a range is active.
    if (hasMin || hasMax) {
      if (typeof ceiling !== 'number' || ceiling <= 0) {
        return false;
      }
      if (hasMin && ceiling < minP) {
        return false;
      }
      if (hasMax && ceiling > maxP) {
        return false;
      }
    }

    // 4. Search Query filter
    if (query && !deal.marketHashName.toLowerCase().includes(query)) {
      return false;
    }

    return true;
  });
}

export const filterAuctions = filterDeals;
