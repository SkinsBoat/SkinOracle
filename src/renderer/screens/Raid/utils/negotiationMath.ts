/**
 * RAID — Live Negotiation Table pricing and grouping math.
 *
 * Framework-free helpers shared by the host hook, the table UI, and the
 * share-link codec. Nothing here reads or writes negotiation state.
 */

import type {
  NegotiationItem,
  NegotiationMarketplace,
  NegotiationState,
} from '../types/negotiation.types';
import {
  NEGOTIATION_DISCOUNT_MAX,
  NEGOTIATION_DISCOUNT_MIN,
} from '../types/negotiation.types';

export const NEGOTIATION_MARKETPLACES: NegotiationMarketplace[] = [
  'skinport',
  'csfloat',
  'dmarket',
  'steam',
];

export function isNegotiationMarketplace(
  value: unknown,
): value is NegotiationMarketplace {
  return (
    value === 'skinport' ||
    value === 'csfloat' ||
    value === 'dmarket' ||
    value === 'steam'
  );
}

export function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function clampGlobalDiscountPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(
    NEGOTIATION_DISCOUNT_MIN,
    Math.min(NEGOTIATION_DISCOUNT_MAX, Math.round(value)),
  );
}

export interface NegotiationItemGroup {
  key: string;
  name: string;
  items: NegotiationItem[];
  count: number;
  selectedCount: number;
  allSelected: boolean;
  someSelected: boolean;
  totalListing: number;
  totalProposed: number;
  counterCount: number;
  exterior?: string;
  floatMin?: number;
  floatMax?: number;
}

/**
 * Counter-offers awaiting trader action are pulled to the top, oldest first,
 * so the trader can work through the queue without searching the bundle.
 */
export function sortNegotiationItemsByAction(
  items: NegotiationItem[],
): NegotiationItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aAction = typeof a.item.counterPrice === 'number' ? 1 : 0;
      const bAction = typeof b.item.counterPrice === 'number' ? 1 : 0;
      if (aAction !== bAction) return bAction - aAction;
      if (aAction === 1) {
        const aTime = a.item.counterUpdatedAt ?? 0;
        const bTime = b.item.counterUpdatedAt ?? 0;
        if (aTime !== bTime) return aTime - bTime;
      }
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

function normalizeGroupName(name: string): string {
  return name
    .replace(/[\u2122\u00ae\u2120]/gi, '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Groups identical skins (same market hash name) into one stacked card.
 * Order follows the first occurrence in the bundle.
 */
export function groupNegotiationItems(
  items: NegotiationItem[],
): NegotiationItemGroup[] {
  const groups = new Map<string, NegotiationItemGroup>();

  for (const item of items) {
    const key =
      normalizeGroupName(item.marketHashName) || item.id.toLowerCase();
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        name: item.marketHashName,
        items: [],
        count: 0,
        selectedCount: 0,
        allSelected: false,
        someSelected: false,
        totalListing: 0,
        totalProposed: 0,
        counterCount: 0,
      };
      groups.set(key, group);
    }

    group.items.push(item);
    group.count += 1;
    if (item.selected) group.selectedCount += 1;
    group.totalListing += item.listingPrice;
    group.totalProposed += item.proposedPrice;
    if (typeof item.counterPrice === 'number') group.counterCount += 1;
    if (!group.exterior && item.exterior) group.exterior = item.exterior;
    if (typeof item.floatValue === 'number') {
      group.floatMin =
        group.floatMin === undefined
          ? item.floatValue
          : Math.min(group.floatMin, item.floatValue);
      group.floatMax =
        group.floatMax === undefined
          ? item.floatValue
          : Math.max(group.floatMax, item.floatValue);
    }
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    totalListing: roundUsd(group.totalListing),
    totalProposed: roundUsd(group.totalProposed),
    allSelected: group.count > 0 && group.selectedCount === group.count,
    someSelected: group.selectedCount > 0 && group.selectedCount < group.count,
  }));
}

/** Applies the bundle discount to the trader's proposed bid. */
export function getEffectiveOfferPrice(
  item: NegotiationItem,
  globalDiscountPct: number,
): number {
  const discount = clampGlobalDiscountPct(globalDiscountPct);
  return roundUsd(item.proposedPrice * (1 + discount / 100));
}

export interface NegotiationTotals {
  itemCount: number;
  listedTotal: number;
  proposedTotal: number;
  savings: number;
}

/** Totals for the currently selected bundle, after the global discount. */
export function getNegotiationTotals(
  state: NegotiationState,
): NegotiationTotals {
  let listedTotal = 0;
  let proposedTotal = 0;
  let itemCount = 0;

  for (const item of state.items) {
    if (!item.selected) continue;
    itemCount += 1;
    listedTotal += item.listingPrice;
    proposedTotal += getEffectiveOfferPrice(
      item,
      state.globalDiscountPct,
    );
  }

  listedTotal = roundUsd(listedTotal);
  proposedTotal = roundUsd(proposedTotal);

  return {
    itemCount,
    listedTotal,
    proposedTotal,
    savings: roundUsd(listedTotal - proposedTotal),
  };
}
