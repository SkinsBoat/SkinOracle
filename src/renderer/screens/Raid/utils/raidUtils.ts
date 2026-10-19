/**
 * RAID — Targeted Seller Auditor core utilities.
 *
 * Pure, testable logic: storefront link resolution, provider registry,
 * provider payload normalization, and Buy-Ceiling audit / filtering.
 * No DOM / IPC access here so the whole module is unit-testable.
 */

import {
  DEFAULT_RAID_FILTERS,
  RaidAuditResult,
  RaidAuditRow,
  RaidBookmark,
  RaidFilters,
  RaidMarketplaceId,
  RaidParseResult,
  RaidProviderInfo,
  RaidOfferPayload,
  RaidOfferRow,
  RaidSeller,
  RaidStockItem,
} from '../../../../shared/types/raid.types';
import {
  SkinportShopApiItem,
  SkinportShopApiResponse,
} from '../../../../shared/types/skinport.types';
import { CsFloatStallApiResponse } from '../../../../shared/types/csfloat.types';
import { DmarketStoreApiResponse, DmarketStoreOffer } from '../../../../shared/types/dmarket.types';
import { SKINPORT_SITE } from '../../../../shared/raidStorefront';

// Storefront resolution is shared with the main process (clipboard paste).
export {
  RAID_PROVIDERS,
  getRaidProvider,
  getRaidMarketplaceName,
  parseStorefrontUrl,
  SKINPORT_SITE,
} from '../../../../shared/raidStorefront';

/** Converts a Skinport shop listing (USD cents) into the RAID shape (USD). */
export function normalizeSkinportItem(
  item: SkinportShopApiItem,
  index = 0,
): RaidStockItem {
  const toUsd = (cents: number | undefined): number | undefined =>
    typeof cents === 'number' && Number.isFinite(cents) ? cents / 100 : undefined;

  return {
    id: String(
      item.saleId ??
        item.shortId ??
        `${item.marketHashName}:${index}`,
    ),
    marketplace: 'skinport',
    marketHashName: item.marketHashName,
    price: toUsd(item.salePrice) ?? 0,
    referencePrice: toUsd(item.referencePrice),
    suggestedPrice: toUsd(item.suggestedPrice),
    imageUrl: item.image
      ? `https://community.cloudflare.steamstatic.com/economy/image/${item.image}`
      : `https://api.steamapis.com/image/item/730/${encodeURIComponent(item.marketHashName)}`,
    // No direct listing URL is built here: Skinport item links are opened via
    // the shared market URL generator (marketUrls.ts) which stays authoritative.
    exterior: item.exterior,
    quality: item.quality,
    rarity: item.rarity,
    rarityColor: item.rarityColor,
    collection: item.collection ?? undefined,
    floatValue: typeof item.wear === 'number' ? item.wear : undefined,
    stattrak: item.stattrak,
    souvenir: item.souvenir,
  };
}

export interface NormalizedStorefront {
  seller: RaidSeller;
  items: RaidStockItem[];
}

/** Normalizes a Skinport shop response into seller identity + stock items. */
export function normalizeSkinportShop(
  res: SkinportShopApiResponse,
): NormalizedStorefront {
  const items = (res.items || [])
    .map((item, index) => normalizeSkinportItem(item, index))
    .filter((item) => item.marketHashName && item.price > 0);

  const handle = res.shopLink || '';
  return {
    seller: {
      marketplace: 'skinport',
      id: handle,
      name: res.shopName || handle || 'Unknown Seller',
      url: handle ? `${SKINPORT_SITE}/shop/${handle}` : SKINPORT_SITE,
      steamId: res.shopSteamId,
      reportedTotal: res.filter?.total,
    },
    items,
  };
}

const STEAM_IMAGE_CDN =
  'https://community.cloudflare.steamstatic.com/economy/image';

function steamImageUrl(hash: string | undefined, marketHashName: string): string {
  return hash
    ? `${STEAM_IMAGE_CDN}/${hash}`
    : `https://api.steamapis.com/image/item/730/${encodeURIComponent(marketHashName)}`;
}

const toUsd = (cents: number | undefined): number | undefined =>
  typeof cents === 'number' && Number.isFinite(cents) ? cents / 100 : undefined;

function toFloat(value: string | number | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/** Normalizes a CSFloat public stall response (USD cents → USD). */
export function normalizeCsFloatStall(
  res: CsFloatStallApiResponse,
  steamIdHint?: string,
): NormalizedStorefront {
  const raw = Array.isArray(res?.data) ? res.data : [];

  const items: RaidStockItem[] = raw
    .map((entry) => {
      // Auctions are excluded: their `price` is the live top bid, not the
      // seller's asking price, so they are not comparable against a ceiling.
      if (typeof entry.type === 'string' && entry.type.toLowerCase() === 'auction') {
        return null;
      }

      const details = entry.item || {};
      const name = details.market_hash_name;
      const price = toUsd(entry.price);
      if (!name || !price) return null;

      const reference = entry.reference || {};
      return {
        id: String(entry.id ?? `${name}:${entry.price}`),
        marketplace: 'csfloat',
        marketHashName: name,
        price,
        referencePrice:
          toUsd(reference.predicted_price) ?? toUsd(reference.base_price),
        imageUrl: steamImageUrl(details.icon_url, name),
        exterior: details.wear_name,
        quality: details.type_name,
        rarity: details.rarity_name,
        floatValue: details.float_value,
        minOfferPrice: toUsd(entry.min_offer_price),
        stattrak: details.is_stattrak,
        souvenir: details.is_souvenir,
      } as RaidStockItem;
    })
    .filter((item): item is RaidStockItem => item !== null);

  const first = raw[0]?.seller;
  const steamId = first?.steam_id || steamIdHint || '';
  return {
    seller: {
      marketplace: 'csfloat',
      id: steamId,
      name: first?.username || 'CSFloat Seller',
      url: steamId ? `https://csfloat.com/stall/${steamId}` : 'https://csfloat.com',
      steamId,
      reportedTotal: items.length,
    },
    items,
  };
}

function extractDmarketOffers(res: DmarketStoreApiResponse): DmarketStoreOffer[] {
  if (Array.isArray(res?.offers)) return res.offers;
  if (Array.isArray(res?.objects)) return res.objects;
  if (Array.isArray(res?.items)) return res.items;
  return [];
}

/** Normalizes a DMarket public seller store response (USD cents → USD). */
export function normalizeDmarketStore(
  res: DmarketStoreApiResponse,
  address: string,
): NormalizedStorefront {
  const raw = extractDmarketOffers(res);

  const items: RaidStockItem[] = raw
    .map((offer, index) => {
      const name = offer.title;
      const price = toUsd(offer.priceCents);
      if (!name || !price) return null;

      return {
        id: String(
          offer.offerId ??
            offer.assetId ??
            `${name}:${offer.priceCents}:${index}`,
        ),
        marketplace: 'dmarket',
        marketHashName: name,
        price,
        referencePrice: toUsd(offer.recommendedPrice),
        imageUrl: offer.image || steamImageUrl(undefined, name),
        exterior: offer.cs2?.exterior,
        quality: offer.cs2?.quality,
        rarity: offer.cs2?.quality,
        rarityColor: offer.backgroundColor
          ? `#${String(offer.backgroundColor).replace(/^#/, '')}`
          : undefined,
        floatValue: toFloat(offer.cs2?.floatValue),
        stattrak: /StatTrak/i.test(name),
        souvenir: /Souvenir/i.test(name),
      } as RaidStockItem;
    })
    .filter((item): item is RaidStockItem => item !== null);

  const total =
    typeof res?.total === 'number'
      ? res.total
      : typeof res?.total?.items === 'number'
        ? res.total.items
        : items.length;

  return {
    seller: {
      marketplace: 'dmarket',
      id: address,
      name: 'DMarket Seller',
      url: `https://dmarket.com/ingame-items/item-list/csgo-skins?user=${address}`,
      reportedTotal: total,
    },
    items,
  };
}

/**
 * Audits a seller's listed stock against the trader's locally calculated
 * Oracle Buy Ceilings (Accepted Prices keyed by market hash name).
 */
export function auditStock(
  items: RaidStockItem[],
  ceilings: Record<string, number>,
): RaidAuditResult {
  const rows: RaidAuditRow[] = items.map((item) => {
    const ceiling = ceilings[item.marketHashName];
    const hasCeiling =
      typeof ceiling === 'number' && Number.isFinite(ceiling) && ceiling > 0;

    // The seller accepts an offer at or below our ceiling.
    const offerEligible =
      hasCeiling &&
      typeof item.minOfferPrice === 'number' &&
      item.minOfferPrice > 0 &&
      item.minOfferPrice <= ceiling;

    if (!hasCeiling) {
      return { item, offerEligible, status: 'no-ceiling' };
    }

    const spread = ceiling - item.price;
    const profitPercent = (spread / ceiling) * 100;
    return {
      item,
      ceiling,
      spread,
      profitPercent,
      offerEligible,
      status: item.price <= ceiling ? 'raid' : 'over-ceiling',
    };
  });

  const valuedItems = rows.filter((r) => r.status !== 'no-ceiling').length;
  const raidRows = rows.filter((r) => r.status === 'raid');
  // Informational only: how many listings accept an offer at or below ceiling.
  const offerCount = rows.filter((r) => r.offerEligible === true).length;
  const totalStockValue = items.reduce((acc, item) => acc + item.price, 0);
  const raidValue = raidRows.reduce((acc, row) => acc + row.item.price, 0);
  const potentialProfit = raidRows.reduce(
    (acc, row) => acc + (row.spread ?? 0),
    0,
  );

  return {
    rows,
    summary: {
      totalItems: items.length,
      valuedItems,
      raidCount: raidRows.length,
      offerCount,
      totalStockValue,
      raidValue,
      potentialProfit,
    },
  };
}

/**
 * Builds the acquisition-offer payload: the buyer's Buy Ceiling for every
 * seller listing that matched a local ceiling — including listings priced
 * above the ceiling (they are still offerd at the buyer's ceiling).
 */
export function buildRaidOfferPayload(
  seller: RaidSeller,
  rows: RaidAuditRow[],
  now: Date = new Date(),
): RaidOfferPayload {
  const offerRows: RaidOfferRow[] = rows
    .filter(
      (row) => typeof row.ceiling === 'number' && Number.isFinite(row.ceiling),
    )
    .map((row) => {
      const buyCeiling = row.ceiling as number;
      const listingPrice = row.item.price;
      return {
        marketHashName: row.item.marketHashName,
        marketplace: row.item.marketplace,
        listingPrice,
        buyCeiling,
        difference: buyCeiling - listingPrice,
        belowCeiling: listingPrice <= buyCeiling,
        exterior: row.item.exterior,
        floatValue: row.item.floatValue,
      };
    })
    .sort((a, b) => {
      // Currently actionable (below ceiling) first, then best difference.
      if (a.belowCeiling !== b.belowCeiling) return a.belowCeiling ? -1 : 1;
      if (a.difference !== b.difference) return b.difference - a.difference;
      return a.marketHashName.localeCompare(b.marketHashName);
    });

  const ceilingTotal = offerRows.reduce((sum, r) => sum + r.buyCeiling, 0);
  const listingTotal = offerRows.reduce((sum, r) => sum + r.listingPrice, 0);
  const belowCeilingCount = offerRows.filter((r) => r.belowCeiling).length;

  return {
    seller: {
      name: seller.name,
      marketplace: seller.marketplace,
      url: seller.url,
      steamId: seller.steamId,
    },
    generatedAt: now.toISOString(),
    rows: offerRows,
    summary: {
      itemCount: offerRows.length,
      ceilingTotal,
      listingTotal,
      belowCeilingCount,
    },
  };
}

export function isAnyRaidFilterActive(filters: RaidFilters): boolean {
  return (
    filters.onlyRaids !== DEFAULT_RAID_FILTERS.onlyRaids ||
    filters.onlyCeiling !== DEFAULT_RAID_FILTERS.onlyCeiling ||
    filters.searchQuery.trim() !== ''
  );
}

/** Filters audit rows by the trader's raid criteria. */
export function filterRaidRows(
  rows: RaidAuditRow[],
  filters: RaidFilters,
): RaidAuditRow[] {
  const query = filters.searchQuery.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.onlyRaids && row.status !== 'raid') return false;
    // Skip stock that never matched a local Buy Ceiling.
    if (filters.onlyCeiling && row.status === 'no-ceiling') return false;
    if (query && !row.item.marketHashName.toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });
}

export type RaidSortKey = 'spread' | 'profitPercent' | 'price' | 'ceiling';

/** Sorts audit rows; unknown-valued rows always sink to the bottom. */
export function sortRaidRows(
  rows: RaidAuditRow[],
  key: RaidSortKey = 'spread',
): RaidAuditRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    // Name is a stable tie-breaker so the same input always yields the same
    // order, no matter which sort the trader switched from.
    const byName = a.item.marketHashName.localeCompare(b.item.marketHashName);
    if (av === null && bv === null) return byName;
    if (av === null) return 1;
    if (bv === null) return -1;
    if (av === bv) return byName;
    // Price sorts ascending (cheapest first); margins sort descending (best first).
    return key === 'price' ? av - bv : bv - av;
  });
  return sorted;
}

function sortValue(row: RaidAuditRow, key: RaidSortKey): number | null {
  switch (key) {
    case 'price':
      return row.item.price;
    case 'ceiling':
      return typeof row.ceiling === 'number' ? row.ceiling : null;
    case 'profitPercent':
      return typeof row.profitPercent === 'number' ? row.profitPercent : null;
    case 'spread':
    default:
      return typeof row.spread === 'number' ? row.spread : null;
  }
}

// ── Formatting helpers ───────────────────────────────────────────

export function formatUsd(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `$${value.toFixed(2)}`;
}

export function formatSignedUsd(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const sign = value >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function formatPercent(value: number | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function getRaidStatusLabel(status: RaidAuditRow['status']): string {
  switch (status) {
    case 'raid':
      return 'RAID';
    case 'over-ceiling':
      return 'OVER CEILING';
    case 'no-ceiling':
    default:
      return 'NO CEILING';
  }
}

export function bookmarkKey(bookmark: {
  marketplace: RaidMarketplaceId;
  handle: string;
}): string {
  return `${bookmark.marketplace}:${bookmark.handle}`;
}

export function isBookmarked(
  bookmarks: RaidBookmark[],
  marketplace: RaidMarketplaceId,
  handle: string,
): boolean {
  const key = bookmarkKey({ marketplace, handle });
  return bookmarks.some((b) => bookmarkKey(b) === key);
}
