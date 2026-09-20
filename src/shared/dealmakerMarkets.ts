/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DealMaker Supported Markets Registry (Renderer)
 * ─────────────────────────────────────────────────────────────────────────────
 * Mirror of the backend registry in
 * `saas-api/src/dealmaker/constants/supported-markets.ts`.
 *
 * Drives the marketplace pickers, the seller store-link config, and client-side
 * link validation so we never send a malformed listing / store link to the API.
 * The backend still re-validates every link authoritatively.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type DealMakerLinkKind = 'listing' | 'store';

export interface DealMakerMarketConfig {
  id: string;
  name: string;
  aliases: string[];
  /** Whether the marketplace lets a seller publish a personal store / stall link. */
  supportsStoreLink: boolean;
  /** Human term for the seller's store on this marketplace. */
  storeLinkLabel: string;
  listingUrlPattern: RegExp;
  storeUrlPattern?: RegExp;
  listingUrlPlaceholder: string;
  storeUrlPlaceholder?: string;
}

export const DEALMAKER_MARKETS: DealMakerMarketConfig[] = [
  {
    id: 'csfloat',
    name: 'CSFloat',
    aliases: ['csfloat', 'csgofloat', 'cs_float'],
    supportsStoreLink: true,
    storeLinkLabel: 'CSFloat Stall',
    listingUrlPattern:
      /^https:\/\/(www\.)?csfloat\.com\/(item|stall|search)\//i,
    storeUrlPattern:
      /^https:\/\/(www\.)?csfloat\.com\/stall\/[A-Za-z0-9_-]+\/?$/i,
    listingUrlPlaceholder: 'https://csfloat.com/item/...',
    storeUrlPlaceholder: 'https://csfloat.com/stall/76561190000000000',
  },
  {
    id: 'dmarket',
    name: 'DMarket',
    aliases: ['dmarket', 'd_market'],
    supportsStoreLink: true,
    storeLinkLabel: 'DMarket Personal Store',
    listingUrlPattern: /^https:\/\/(www\.)?dmarket\.com\//i,
    storeUrlPattern:
      /^https:\/\/(www\.)?dmarket\.com\/.*[?&]sagaAddress=0x[a-fA-F0-9]{40}/i,
    listingUrlPlaceholder: 'https://dmarket.com/ingame-items/item-list/...',
    storeUrlPlaceholder:
      'https://dmarket.com/ingame-items/item-list/csgo-skins?sagaAddress=0x1111111111111111111111111111111111111111',
  },
  {
    id: 'skinscom',
    name: 'Skins.com',
    aliases: ['skinscom', 'skins_com', 'skins.com'],
    supportsStoreLink: false,
    storeLinkLabel: 'Skins.com Store',
    listingUrlPattern: /^https:\/\/(www\.)?skins\.com\//i,
    listingUrlPlaceholder: 'https://skins.com/item/...',
  },
  {
    id: 'csmoney_market',
    name: 'CS.MONEY (Market)',
    aliases: [
      'csmoney',
      'cs_money',
      'cs.money',
      'csmoney_market',
      'csmoney_m',
      'csmoney_p2p',
    ],
    supportsStoreLink: true,
    storeLinkLabel: 'CS.MONEY Market Store',
    listingUrlPattern: /^https:\/\/cs\.money\//i,
    storeUrlPattern: /^https:\/\/cs\.money\/market\/buy\/\?steamId=\d{17}\/?$/i,
    listingUrlPlaceholder: 'https://cs.money/market/...',
    storeUrlPlaceholder:
      'https://cs.money/market/buy/?steamId=76561190000000000',
  },
  {
    id: 'skinport',
    name: 'Skinport',
    aliases: ['skinport', 'skin_port'],
    supportsStoreLink: true,
    storeLinkLabel: 'Skinport Shop',
    listingUrlPattern:
      /^https:\/\/(www\.)?skinport\.com\/(i\/[A-Za-z0-9_-]+|item\/[A-Za-z0-9_-]+|market)/i,
    storeUrlPattern: /^https:\/\/(www\.)?skinport\.com\/shop\/[A-Za-z0-9_-]+\/?$/i,
    listingUrlPlaceholder: 'https://skinport.com/i/YBAOM21G1QC',
    storeUrlPlaceholder: 'https://skinport.com/shop/32aG0oR',
  },
];

export const DEALMAKER_MARKET_IDS: string[] = DEALMAKER_MARKETS.map(
  (m) => m.id,
);

/** Markets that expose a seller store / market link. */
export const DEALMAKER_STORE_LINK_MARKETS: DealMakerMarketConfig[] =
  DEALMAKER_MARKETS.filter((m) => m.supportsStoreLink);

const MARKET_BY_ID = new Map<string, DealMakerMarketConfig>();
const MARKET_BY_ALIAS = new Map<string, DealMakerMarketConfig>();
for (const market of DEALMAKER_MARKETS) {
  MARKET_BY_ID.set(market.id, market);
  for (const alias of market.aliases) {
    MARKET_BY_ALIAS.set(alias, market);
  }
}

/** Normalize any raw market string to a canonical DealMaker market id. */
export function normalizeDealMakerMarketId(
  raw?: string | null,
): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.trim().toLowerCase();
  const match = MARKET_BY_ID.get(cleaned) || MARKET_BY_ALIAS.get(cleaned);
  return match ? match.id : null;
}

/** Resolve the full market config, or null when unknown. */
export function getDealMakerMarket(
  raw?: string | null,
): DealMakerMarketConfig | null {
  if (!raw || typeof raw !== 'string') return null;
  const cleaned = raw.trim().toLowerCase();
  return MARKET_BY_ID.get(cleaned) || MARKET_BY_ALIAS.get(cleaned) || null;
}

/** Whether a market exposes a seller store / market link. */
export function supportsStoreLink(raw?: string | null): boolean {
  return !!getDealMakerMarket(raw)?.supportsStoreLink;
}

export interface LinkValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Client-side link validation. Mirrors the backend rules so we can block bad
 * links before an IPC round-trip and show inline errors to the seller.
 */
export function validateDealMakerLink(
  marketRaw: string | null | undefined,
  kind: DealMakerLinkKind,
  url: string | null | undefined,
): LinkValidationResult {
  const label = kind === 'store' ? 'Store link' : 'Listing URL';
  const trimmed = (url || '').trim();
  if (!trimmed) {
    return { valid: false, message: `${label} is required` };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, message: `Invalid ${label.toLowerCase()} format` };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, message: `${label} must use secure HTTPS protocol` };
  }

  const market = getDealMakerMarket(marketRaw);
  if (!market) return { valid: true };

  if (kind === 'store') {
    if (!market.supportsStoreLink || !market.storeUrlPattern) {
      return {
        valid: false,
        message: `${market.name} does not support store links. Share a listing link instead.`,
      };
    }
    if (!market.storeUrlPattern.test(trimmed)) {
      return {
        valid: false,
        message: `Enter a valid ${market.name} store link (e.g. ${market.storeUrlPlaceholder})`,
      };
    }
    return { valid: true };
  }

  if (!market.listingUrlPattern.test(trimmed)) {
    return {
      valid: false,
      message: `Enter a valid ${market.name} listing link (e.g. ${market.listingUrlPlaceholder})`,
    };
  }

  return { valid: true };
}
