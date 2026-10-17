// ─────────────────────────────────────────────────────────────────
// RAID — Targeted Seller Auditor domain types
//
// A trader pastes a single seller's storefront link (Skinport shop,
// CSFloat stall, DMarket store, CS.MONEY user market, Steam inventory).
// RAID resolves the provider, streams the seller's listed stock, and
// audits every listing against the trader's locally calculated Oracle
// Buy Ceilings (Accepted Prices) to surface the "Raid Zone" — items
// priced at or below the ceiling.
//
// Provider-agnostic shapes live here. Marketplace-specific API payloads
// stay co-located with their integration module (e.g. skinport.types.ts).
// ─────────────────────────────────────────────────────────────────

/** Marketplaces RAID recognizes as seller storefront sources. */
export type RaidMarketplaceId =
  | "skinport"
  | "csfloat"
  | "dmarket"
  | "csmoney"
  | "steam";

export interface RaidProviderInfo {
  id: RaidMarketplaceId;
  /** Human-readable platform name for institutional UI. */
  name: string;
  /** Hostnames (subdomain-aware) that identify the marketplace. */
  hosts: string[];
  /** Storefront path prefixes, used to extract the seller handle. */
  storefrontPrefixes: string[];
  /**
   * `live` = fully wired for scanning. `soon` = recognized but the stock
   * endpoint is not connected yet, so the UI refuses to scan honestly.
   */
  status: "live" | "soon";
}

/** A resolved seller storefront reference. */
export interface RaidStorefrontRef {
  marketplace: RaidMarketplaceId;
  /** Provider-specific seller handle (Skinport shop link, CSFloat user id, ...). */
  handle: string;
  /** The original text the trader pasted. */
  originalUrl: string;
  /** Canonical public storefront URL, opened in the OS browser. */
  canonicalUrl: string;
  /** Whether this provider can be scanned right now. */
  scanSupported: boolean;
}

/**
 * Result of resolving pasted storefront text. `ref` is present when `ok` is
 * true; `error` describes the failure when `ok` is false.
 */
export interface RaidParseResult {
  ok: boolean;
  ref?: RaidStorefrontRef;
  error?: string;
}

/** Normalized seller identity across providers. */
export interface RaidSeller {
  marketplace: RaidMarketplaceId;
  /** Provider handle (also the storefront URL slug). */
  id: string;
  name: string;
  /** Public storefront URL. */
  url: string;
  steamId?: string;
  /** Total listings the provider reports for this seller. */
  reportedTotal?: number;
}

/** One listed item from a seller's stock, normalized to USD dollars. */
export interface RaidStockItem {
  id: string;
  marketplace: RaidMarketplaceId;
  marketHashName: string;
  /** USD dollars. */
  price: number;
  /** Provider reference/market price in USD dollars, if supplied. */
  referencePrice?: number;
  /** Provider suggested price in USD dollars, if supplied. */
  suggestedPrice?: number;
  imageUrl?: string;
  /** Direct listing URL for purchase. */
  listingUrl?: string;
  /** CS2 in-client inspect link when the provider supplies one. */
  inspectUrl?: string;
  exterior?: string;
  quality?: string;
  rarity?: string;
  rarityColor?: string;
  collection?: string;
  /** Float wear value (0..1) when supplied. */
  floatValue?: number;
  /**
   * Lowest price the seller will accept as an offer, in USD dollars.
   * Supplied by CSFloat (`min_offer_price`); absent when the seller takes no offers.
   */
  minOfferPrice?: number;
  stattrak?: boolean;
  souvenir?: boolean;
}

export type RaidAuditStatus = "raid" | "over-ceiling" | "no-ceiling";

export interface RaidAuditRow {
  item: RaidStockItem;
  /** Oracle Buy Ceiling for this item, when calculated locally. */
  ceiling?: number;
  /** ceiling - price in USD dollars (positive = below ceiling). */
  spread?: number;
  /** (ceiling - price) / ceiling * 100. */
  profitPercent?: number;
  /** True when the seller accepts an offer at or below this item's ceiling. */
  offerEligible?: boolean;
  status: RaidAuditStatus;
}

export interface RaidAuditSummary {
  totalItems: number;
  /** Items that have a local Buy Ceiling to audit against. */
  valuedItems: number;
  /** Items priced at or below the Buy Ceiling (the Raid Zone). */
  raidCount: number;
  /** Listings whose accepted offer price is at or below the Buy Ceiling. */
  offerCount: number;
  /** Total USD value of the seller's entire listed stock. */
  totalStockValue: number;
  /** Total USD value of the Raid Zone listings. */
  raidValue: number;
  /** Summed USD spread across the Raid Zone. */
  potentialProfit: number;
}

export interface RaidAuditResult {
  rows: RaidAuditRow[];
  summary: RaidAuditSummary;
}

export interface RaidFilters {
  /** Restrict to items at or below the Buy Ceiling. */
  onlyRaids: boolean;
  /** Restrict to items that matched a local Buy Ceiling (drop unvalued stock). */
  onlyCeiling: boolean;
  /** Minimum USD spread required for a raid to be shown. */
  minSpread: string;
  /** Minimum profit percent required for a raid to be shown. */
  minProfitPercent: string;
  /** Skin name search. */
  searchQuery: string;
}

export const DEFAULT_RAID_FILTERS: RaidFilters = {
  onlyRaids: false,
  onlyCeiling: false,
  minSpread: '',
  minProfitPercent: '',
  searchQuery: '',
};

/** A saved seller for quick re-scanning. Non-secret, device-local. */
export interface RaidBookmark {
  marketplace: RaidMarketplaceId;
  handle: string;
  name: string;
  url: string;
  savedAt: string;
}

// ─────────────────────────────────────────────────────────────────
// RAID — Purchase Offer export (PDF)
//
// The offer is the buyer's Buy Ceiling sheet for ALL seller listings that
// matched a local ceiling — including those currently priced above it.
// Amounts are USD dollars.
// ─────────────────────────────────────────────────────────────────

export interface RaidOfferRow {
  marketHashName: string;
  marketplace: RaidMarketplaceId;
  /** Seller's current listing price (reference). */
  listingPrice: number;
  /** Buyer's Oracle Buy Ceiling — the price offered for this item. */
  buyCeiling: number;
  /** buyCeiling - listingPrice (negative = seller is above the ceiling). */
  difference: number;
  /** True when the seller's listing is at or below the ceiling. */
  belowCeiling: boolean;
  exterior?: string;
  floatValue?: number;
}

export interface RaidOfferPayload {
  seller: {
    name: string;
    marketplace: RaidMarketplaceId;
    url: string;
    steamId?: string;
  };
  /** ISO timestamp of the audit the offer was built from. */
  generatedAt: string;
  rows: RaidOfferRow[];
  summary: {
    itemCount: number;
    /** Sum of the buyer's ceilings — total acquisition budget for this offer. */
    ceilingTotal: number;
    /** Sum of the seller's current listing prices (reference). */
    listingTotal: number;
    /** How many matched listings are currently at or below the ceiling. */
    belowCeilingCount: number;
  };
}
