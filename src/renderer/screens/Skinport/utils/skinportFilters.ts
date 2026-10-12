import type {
  SkinportMarketItem,
  SkinportSale,
} from "../../../../shared/types/skinport.types";
import type { AcceptedPriceEntry } from "../../../hooks/useAcceptedPrices";
import {
  classifySkinportItem,
  computeCloseness,
  isSouvenirName,
  itemPriceCents,
  saleIdentity,
  wearKeyFromFloat,
  wearKeyFromName,
} from "./skinportUtils";
import {
  type CategoryFilter,
  type SkinportFilterState,
  type SkinportSortOption,
  type WearKey,
} from "../constants";

export interface CeilingEntry {
  cents: number;
  sss: number;
}

export type CeilingMap = Record<string, CeilingEntry>;

/** Convert the Oracle accepted-price map (USD dollars) into a cents ceiling map. */
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
  const cat = classifySkinportItem(name);
  if (category === "weapon_sticker") return cat !== "other";
  return cat === category;
}

function matchesWear(
  key: WearKey | null,
  filters: SkinportFilterState,
): boolean {
  if (!key) return true;
  return filters.allowedWears[key];
}

function passesCeiling(
  priceCents: number | null,
  name: string,
  ceilings: CeilingMap,
  filters: SkinportFilterState,
): boolean {
  const ceiling = ceilings[name];
  if (!ceiling || priceCents === null) return false;
  const closeness = computeCloseness(priceCents, ceiling.cents);
  if (closeness === null || closeness > filters.maxCloseness) return false;
  if (filters.minSss > 0 && ceiling.sss < filters.minSss) return false;
  return true;
}

function inPriceRange(
  priceCents: number | null,
  filters: SkinportFilterState,
): boolean {
  if (priceCents === null) return false;
  const dollars = priceCents / 100;
  const min = parseFloat(filters.priceMin);
  const max = parseFloat(filters.priceMax);
  if (Number.isFinite(min) && dollars < min) return false;
  if (Number.isFinite(max) && dollars > max) return false;
  return true;
}

// ── SORT COMPARATORS ─────────────────────────────────────────────────

function saleCloseness(
  entry: SkinportFeedEntry,
  ceilings: CeilingMap,
): number {
  return (
    computeCloseness(
      entry.sale.salePrice,
      ceilings[entry.sale.marketHashName]?.cents,
    ) ?? Infinity
  );
}

function itemCloseness(
  item: SkinportMarketItem,
  ceilings: CeilingMap,
): number {
  return (
    computeCloseness(
      itemPriceCents(item) ?? Infinity,
      ceilings[item.market_hash_name]?.cents,
    ) ?? Infinity
  );
}

export function sortSales(
  entries: SkinportFeedEntry[],
  ceilings: CeilingMap,
  sortMode: SkinportSortOption,
): SkinportFeedEntry[] {
  const sorted = [...entries];
  switch (sortMode) {
    case "newest":
      return sorted.sort((a, b) => b.receivedAt - a.receivedAt);
    case "price_asc":
      return sorted.sort((a, b) => a.sale.salePrice - b.sale.salePrice);
    case "price_desc":
      return sorted.sort((a, b) => b.sale.salePrice - a.sale.salePrice);
    case "sss_desc":
      return sorted.sort(
        (a, b) =>
          (ceilings[b.sale.marketHashName]?.sss ?? 0) -
          (ceilings[a.sale.marketHashName]?.sss ?? 0),
      );
    case "closeness":
    default:
      return sorted.sort((a, b) => {
        const ca = saleCloseness(a, ceilings);
        const cb = saleCloseness(b, ceilings);
        if (ca !== cb) return ca - cb;
        return b.receivedAt - a.receivedAt;
      });
  }
}

export function sortMarketItems(
  items: SkinportMarketItem[],
  ceilings: CeilingMap,
  sortMode: SkinportSortOption,
): SkinportMarketItem[] {
  const sorted = [...items];
  switch (sortMode) {
    case "newest":
      return sorted.sort((a, b) => (b.updated_at ?? 0) - (a.updated_at ?? 0));
    case "price_asc":
      return sorted.sort(
        (a, b) => (itemPriceCents(a) ?? Infinity) - (itemPriceCents(b) ?? Infinity),
      );
    case "price_desc":
      return sorted.sort(
        (a, b) => (itemPriceCents(b) ?? 0) - (itemPriceCents(a) ?? 0),
      );
    case "sss_desc":
      return sorted.sort(
        (a, b) =>
          (ceilings[b.market_hash_name]?.sss ?? 0) -
          (ceilings[a.market_hash_name]?.sss ?? 0),
      );
    case "closeness":
    default:
      return sorted.sort(
        (a, b) => itemCloseness(a, ceilings) - itemCloseness(b, ceilings),
      );
  }
}

// ── VISIBILITY PREDICATES ────────────────────────────────────────────

export function isItemVisible(
  item: SkinportMarketItem,
  ceilings: CeilingMap,
  filters: SkinportFilterState,
): boolean {
  const name = item.market_hash_name;
  if (!matchesCategory(name, filters.category)) return false;
  if (!matchesWear(wearKeyFromName(name), filters)) return false;
  if (!filters.allowedWears.souvenir && isSouvenirName(name)) return false;
  const cents = itemPriceCents(item);
  if (!inPriceRange(cents, filters)) return false;
  return passesCeiling(cents, name, ceilings, filters);
}

export function selectVisibleItems(
  items: SkinportMarketItem[],
  ceilings: CeilingMap,
  filters: SkinportFilterState,
): SkinportMarketItem[] {
  const visible = items.filter((i) => isItemVisible(i, ceilings, filters));
  return sortMarketItems(visible, ceilings, filters.sortMode);
}

export function isSaleVisible(
  sale: SkinportSale,
  ceilings: CeilingMap,
  filters: SkinportFilterState,
): boolean {
  const name = sale.marketHashName;
  if (!matchesCategory(name, filters.category)) return false;
  if (!matchesWear(wearKeyFromFloat(sale.wear), filters)) return false;
  if (
    !filters.allowedWears.souvenir &&
    (sale.souvenir || isSouvenirName(name))
  ) {
    return false;
  }
  if (!inPriceRange(sale.salePrice, filters)) return false;
  return passesCeiling(sale.salePrice, name, ceilings, filters);
}

export interface SkinportFeedEntry {
  identity: string;
  sale: SkinportSale;
  eventType: "listed" | "sold";
  receivedAt: number;
  count: number;
}

export function selectVisibleSales(
  entries: SkinportFeedEntry[],
  ceilings: CeilingMap,
  filters: SkinportFilterState,
): SkinportFeedEntry[] {
  const visible = entries.filter(
    (e) =>
      (filters.feedType === "all" || e.eventType === filters.feedType) &&
      isSaleVisible(e.sale, ceilings, filters),
  );
  return sortSales(visible, ceilings, filters.sortMode);
}

export function countMatchedCeilings(
  items: SkinportMarketItem[],
  ceilings: CeilingMap,
): number {
  return items.filter((i) => ceilings[i.market_hash_name]).length;
}

export function countInCategory(
  items: SkinportMarketItem[],
  category: CategoryFilter,
): number {
  if (category === "all") return items.length;
  return items.filter((i) =>
    category === "weapon_sticker"
      ? classifySkinportItem(i.market_hash_name) !== "other"
      : classifySkinportItem(i.market_hash_name) === category,
  ).length;
}

export { saleIdentity };
