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
  RaidSeller,
  RaidStockItem,
} from '../../../../shared/types/raid.types';
import {
  SkinportShopApiItem,
  SkinportShopApiResponse,
} from '../../../../shared/types/skinport.types';
import { CsFloatStallApiResponse } from '../../../../shared/types/csfloat.types';
import { DmarketStoreApiResponse, DmarketStoreOffer } from '../../../../shared/types/dmarket.types';

/** Skinport public website root (storefront + item links). */
export const SKINPORT_SITE = 'https://skinport.com';

/** Skinport shop slugs are lowercase alphanumerics with `_` / `-` separators. */
const STOREFRONT_HANDLE_RE = /^[A-Za-z0-9_.-]{1,64}$/;

/**
 * Provider registry. `skinport` is fully wired for scanning; the remaining
 * platforms are recognized so pasted links resolve to the correct seller and
 * the UI can report them honestly instead of silently failing.
 */
export const RAID_PROVIDERS: RaidProviderInfo[] = [
  {
    id: 'skinport',
    name: 'Skinport',
    hosts: ['skinport.com'],
    storefrontPrefixes: ['shop'],
    status: 'live',
  },
  {
    id: 'csfloat',
    name: 'CSFloat',
    hosts: ['csfloat.com'],
    storefrontPrefixes: ['stall', 'users'],
    status: 'live',
  },
  {
    id: 'dmarket',
    name: 'DMarket',
    hosts: ['dmarket.com'],
    storefrontPrefixes: ['store', 'user'],
    status: 'live',
  },
  {
    id: 'csmoney',
    name: 'CS.MONEY',
    hosts: ['cs.money'],
    storefrontPrefixes: ['market', 'user'],
    status: 'soon',
  },
  {
    id: 'steam',
    name: 'Steam Inventory',
    hosts: ['steamcommunity.com'],
    storefrontPrefixes: ['inventory', 'profiles', 'id'],
    status: 'soon',
  },
];

const PROVIDER_MAP: Record<string, RaidProviderInfo> = RAID_PROVIDERS.reduce(
  (acc, provider) => {
    acc[provider.id] = provider;
    return acc;
  },
  {} as Record<string, RaidProviderInfo>,
);

export function getRaidProvider(
  id: RaidMarketplaceId,
): RaidProviderInfo | undefined {
  return PROVIDER_MAP[id];
}

export function getRaidMarketplaceName(id: RaidMarketplaceId): string {
  return PROVIDER_MAP[id]?.name ?? id;
}

function matchProvider(hostname: string): RaidProviderInfo | undefined {
  const host = hostname.toLowerCase();
  return RAID_PROVIDERS.find((provider) =>
    provider.hosts.some((h) => host === h || host.endsWith(`.${h}`)),
  );
}

/** Extract a seller handle from path segments using the provider's prefixes. */
function extractHandle(
  segments: string[],
  provider: RaidProviderInfo,
): string {
  const lower = segments.map((s) => s.toLowerCase());
  for (const prefix of provider.storefrontPrefixes) {
    const idx = lower.indexOf(prefix.toLowerCase());
    if (idx >= 0 && segments[idx + 1]) {
      return decodeURIComponent(segments[idx + 1]);
    }
  }
  return segments.length > 0
    ? decodeURIComponent(segments[segments.length - 1])
    : '';
}

function buildSkinportRef(handle: string, originalUrl: string): RaidParseResult {
  if (!STOREFRONT_HANDLE_RE.test(handle)) {
    return {
      ok: false,
      error: 'That Skinport link does not contain a valid shop slug.',
    };
  }
  return {
    ok: true,
    ref: {
      marketplace: 'skinport',
      handle,
      originalUrl,
      canonicalUrl: `${SKINPORT_SITE}/shop/${handle}`,
      scanSupported: true,
    },
  };
}

/** CSFloat sellers are keyed by SteamID64 (17 digits). */
const CSFLOAT_STEAM_ID_RE = /^\d{17}$/;

/** DMarket sellers resolve to a 0x saga address on the public exchange. */
const DMARKET_SAGA_ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

function buildCsFloatRef(
  steamId: string,
  originalUrl: string,
): RaidParseResult {
  if (!CSFLOAT_STEAM_ID_RE.test(steamId)) {
    return {
      ok: false,
      error: 'That CSFloat link does not contain a SteamID64.',
    };
  }
  return {
    ok: true,
    ref: {
      marketplace: 'csfloat',
      handle: steamId,
      originalUrl,
      canonicalUrl: `https://csfloat.com/stall/${steamId}`,
      scanSupported: true,
    },
  };
}

function buildDmarketRef(
  address: string,
  originalUrl: string,
): RaidParseResult {
  if (!DMARKET_SAGA_ADDR_RE.test(address)) {
    return {
      ok: false,
      error:
        'That DMarket link does not contain a valid seller address (0x…).',
    };
  }
  return {
    ok: true,
    ref: {
      marketplace: 'dmarket',
      handle: address,
      originalUrl,
      canonicalUrl: `https://dmarket.com/ingame-items/item-list/csgo-skins?user=${address}`,
      scanSupported: true,
    },
  };
}

/**
 * Resolves any pasted storefront text into a provider + seller handle.
 * Accepts full URLs (with or without scheme) and a bare Skinport shop slug.
 */
export function parseStorefrontUrl(raw: string): RaidParseResult {
  const input = (raw || '').trim();
  if (!input) {
    return { ok: false, error: 'Paste a seller storefront link to raid.' };
  }

  // Bare, unambiguous identifiers.
  if (DMARKET_SAGA_ADDR_RE.test(input)) return buildDmarketRef(input, input);
  if (CSFLOAT_STEAM_ID_RE.test(input)) return buildCsFloatRef(input, input);

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input);
  const candidate = hasScheme ? input : `https://${input}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return {
      ok: false,
      error: 'That does not look like a valid storefront link.',
    };
  }

  // Accept a bare handle (e.g. the Skinport shop slug "coolcool").
  if (!url.hostname.includes('.')) {
    if (STOREFRONT_HANDLE_RE.test(input)) return buildSkinportRef(input, input);
    return { ok: false, error: 'Enter a full storefront URL or shop slug.' };
  }

  const provider = matchProvider(url.hostname);
  if (!provider) {
    return {
      ok: false,
      error: `Unrecognized storefront host: ${url.hostname}. Supported: ${RAID_PROVIDERS.map((p) => p.name).join(', ')}.`,
    };
  }

  const segments = url.pathname.split('/').filter(Boolean);
  const handle = extractHandle(segments, provider);

  if (provider.id === 'skinport') {
    // Only `/shop/{slug}` maps to the public shop API. Reject `/user/...`
    // (Steam-id profile pages) with a clear, actionable message.
    const hasShopSegment = segments.some((s) => s.toLowerCase() === 'shop');
    if (!hasShopSegment) {
      return {
        ok: false,
        error:
          'Paste the Skinport seller shop link (skinport.com/shop/…), not a profile page.',
      };
    }
    return buildSkinportRef(handle, input);
  }

  if (provider.id === 'csfloat') {
    const match = input.match(/\b(\d{17})\b/);
    if (!match) {
      return {
        ok: false,
        error:
          'Paste the CSFloat seller stall link (csfloat.com/stall/…), which contains a SteamID64.',
      };
    }
    return buildCsFloatRef(match[1], input);
  }

  if (provider.id === 'dmarket') {
    const candidates = [
      url.searchParams.get('user'),
      url.searchParams.get('sagaAddress'),
      url.searchParams.get('owner'),
      handle,
      (input.match(/0x[a-fA-F0-9]{40}/) || [])[0],
    ].filter((c): c is string => Boolean(c));
    const address = candidates.find((c) => DMARKET_SAGA_ADDR_RE.test(c));
    if (!address) {
      return {
        ok: false,
        error:
          'Paste a DMarket seller store link that includes the seller address (0x…), or the address itself.',
      };
    }
    return buildDmarketRef(address, input);
  }

  if (!handle) {
    return {
      ok: false,
      error: `Could not read a seller handle from that ${provider.name} link.`,
    };
  }

  return {
    ok: true,
    ref: {
      marketplace: provider.id,
      handle,
      originalUrl: input,
      canonicalUrl: hasScheme ? input : candidate,
      scanSupported: provider.status === 'live',
    },
  };
}

/** Converts a Skinport shop listing (USD cents) into the RAID shape (USD). */
export function normalizeSkinportItem(
  item: SkinportShopApiItem,
): RaidStockItem {
  const toUsd = (cents: number | undefined): number | undefined =>
    typeof cents === 'number' && Number.isFinite(cents) ? cents / 100 : undefined;

  return {
    id: String(item.saleId ?? item.shortId ?? item.marketHashName),
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
    .map(normalizeSkinportItem)
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
    .map((offer) => {
      const name = offer.title;
      const price = toUsd(offer.priceCents);
      if (!name || !price) return null;

      return {
        id: String(offer.offerId ?? offer.assetId ?? `${name}:${offer.priceCents}`),
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

export function isAnyRaidFilterActive(filters: RaidFilters): boolean {
  return (
    filters.onlyRaids !== DEFAULT_RAID_FILTERS.onlyRaids ||
    filters.minSpread.trim() !== '' ||
    filters.minProfitPercent.trim() !== '' ||
    filters.searchQuery.trim() !== ''
  );
}

/** Filters audit rows by the trader's raid criteria. */
export function filterRaidRows(
  rows: RaidAuditRow[],
  filters: RaidFilters,
): RaidAuditRow[] {
  const query = filters.searchQuery.trim().toLowerCase();
  const minSpread = parseFloat(filters.minSpread);
  const hasMinSpread = !Number.isNaN(minSpread);
  const minProfit = parseFloat(filters.minProfitPercent);
  const hasMinProfit = !Number.isNaN(minProfit);

  return rows.filter((row) => {
    if (filters.onlyRaids && row.status !== 'raid') return false;
    if (query && !row.item.marketHashName.toLowerCase().includes(query)) {
      return false;
    }
    if (hasMinSpread) {
      if (typeof row.spread !== 'number' || row.spread < minSpread) return false;
    }
    if (hasMinProfit) {
      if (
        typeof row.profitPercent !== 'number' ||
        row.profitPercent < minProfit
      ) {
        return false;
      }
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
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
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
