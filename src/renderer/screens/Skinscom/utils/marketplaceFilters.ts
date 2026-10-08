import type { SkinscomListing } from "../../../../shared/types/skinscom.types";
import type { AcceptedPriceEntry } from "../../../hooks/useAcceptedPrices";
import { classifySkinscomItem, computeCloseness } from "./skinscomUtils";
import {
  type CategoryFilter,
  type SkinscomFilterState,
  WEAR_KEY_BY_NAME,
} from "../constants";

/**
 * Pure filtering/aggregation helpers for the Marketplace (So Close) tab.
 * Keeps the React component focused on state and rendering.
 */

export interface CeilingEntry {
  /** Oracle Buy Ceiling in USD cents. */
  cents: number;
  /** Supply stability score. */
  sss: number;
}

export type CeilingMap = Record<string, CeilingEntry>;

/** Convert the Oracle accepted-price map into a USD-cents ceiling map. */
export function buildCeilingMap(
  map: Record<string, AcceptedPriceEntry>,
): CeilingMap {
  const out: CeilingMap = {};
  Object.entries(map).forEach(([name, entry]) => {
    if (entry?.acceptedPrice && entry.acceptedPrice > 0) {
      out[name] = {
        cents: Math.round(entry.acceptedPrice * 100),
        sss: entry.supplyStabilityScore ?? 0,
      };
    }
  });
  return out;
}

function matchesCategory(name: string, category: CategoryFilter): boolean {
  if (category === "all") return true;
  const cat = classifySkinscomItem(name);
  if (category === "weapon_sticker") return cat !== "other";
  return cat === category;
}

function matchesWear(
  listing: SkinscomListing,
  filters: SkinscomFilterState,
): boolean {
  const key = listing.wear_name
    ? WEAR_KEY_BY_NAME[listing.wear_name]
    : undefined;
  if (!key) return true; // wear-less item (sticker, vanilla knife)
  return filters.allowedWears[key];
}

/**
 * A listing is rendered only when it matches the client-side filters AND has an
 * Oracle Buy Ceiling within Max Distance. Unmatched listings (no ceiling)
 * cannot be judged, so they are excluded.
 */
export function isListingVisible(
  listing: SkinscomListing,
  ceilings: CeilingMap,
  filters: SkinscomFilterState,
): boolean {
  if (!matchesCategory(listing.market_name, filters.category)) return false;
  if (!matchesWear(listing, filters)) return false;

  const ceiling = ceilings[listing.market_name];
  if (!ceiling) return false;

  const closeness = computeCloseness(listing.market_value, ceiling.cents);
  if (closeness === null || closeness > filters.maxCloseness) return false;
  if (filters.minSss > 0 && ceiling.sss < filters.minSss) return false;
  return true;
}

/** Visible listings, sorted closest-to-ceiling first. */
export function selectVisibleListings(
  items: SkinscomListing[],
  ceilings: CeilingMap,
  filters: SkinscomFilterState,
): SkinscomListing[] {
  return items
    .filter((l) => isListingVisible(l, ceilings, filters))
    .sort((a, b) => {
      const ca =
        computeCloseness(a.market_value, ceilings[a.market_name]?.cents) ??
        Infinity;
      const cb =
        computeCloseness(b.market_value, ceilings[b.market_name]?.cents) ??
        Infinity;
      return ca - cb;
    });
}

export function countMatchedCeilings(
  items: SkinscomListing[],
  ceilings: CeilingMap,
): number {
  return items.filter((i) => ceilings[i.market_name]).length;
}

export function countInCategory(
  items: SkinscomListing[],
  category: CategoryFilter,
): number {
  if (category === "all") return items.length;
  return items.filter((i) => {
    const cat = classifySkinscomItem(i.market_name);
    return category === "weapon_sticker" ? cat !== "other" : cat === category;
  }).length;
}
