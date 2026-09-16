// DMarket Trading API & Workstation Models (OpenAPI v2.0.0 Aligned)

/**
 * DMarket CS2 Target Attribute Category
 */
export type DmarketCS2Category =
  | "CATEGORY_NORMAL"
  | "CATEGORY_STATTRACK"
  | "CATEGORY_SOUVENIR"
  | "CATEGORY_STAR"
  | "normal"
  | "stattrak"
  | "souvenir"
  | string;

/**
 * DMarket CS2 Target Exterior / Wear
 */
export type DmarketCS2Exterior =
  | "EXTERIOR_FACTORY_NEW"
  | "EXTERIOR_MINIMAL_WEAR"
  | "EXTERIOR_FIELD_TESTED"
  | "EXTERIOR_WELL_WORN"
  | "EXTERIOR_BATTLE_SCARRED"
  | "factory new"
  | "minimal wear"
  | "field-tested"
  | "well-worn"
  | "battle-scarred"
  | string;

/**
 * DMarket Target Status
 */
export type DmarketTargetStatus =
  | "TARGET_STATUS_ACTIVE"
  | "TARGET_STATUS_INACTIVE"
  | "TARGET_STATUS_CLOSED"
  | "active"
  | "inactive"
  | "closed"
  | string;

/**
 * CS2 Target specific attribute filters for creating/updating targets
 */
export interface DmarketTargetAttrs {
  paintSeed?: number | null;
  phase?:
    | ""
    | "phase-1"
    | "phase-2"
    | "phase-3"
    | "phase-4"
    | "ruby"
    | "emerald"
    | "sapphire"
    | "black-pearl"
    | string
    | null;
  floatPartValue?:
    | ""
    | "FN-0"
    | "FN-1"
    | "FN-2"
    | "FN-3"
    | "FN-4"
    | "FN-5"
    | "FN-6"
    | "MW-0"
    | "MW-1"
    | "MW-2"
    | "MW-3"
    | "MW-4"
    | "FT-0"
    | "FT-1"
    | "FT-2"
    | "FT-3"
    | "FT-4"
    | "WW-0"
    | "WW-1"
    | "WW-2"
    | "WW-3"
    | "WW-4"
    | "BS-0"
    | "BS-1"
    | "BS-2"
    | "BS-3"
    | "BS-4"
    | string
    | null;
}

/**
 * Request payload for creating a single target within a batch
 */
export interface DmarketCreateTargetItemRequest {
  Amount: string; // 64-bit integer serialized as string
  Price: {
    Currency: "USD" | string;
    Amount: number; // e.g. 15.50
  };
  Title: string;
  Attrs?: DmarketTargetAttrs;
}

export interface DmarketBatchCreateTargetsRequest {
  GameID: string;
  Targets: DmarketCreateTargetItemRequest[];
}

export interface DmarketCreateTargetResultItem {
  CreateTarget?: {
    Amount: string;
    Price: { Currency: string; Amount: number };
    Title: string;
    Attrs?: DmarketTargetAttrs;
  };
  Successful: boolean;
  TargetID?: string;
  Error?: {
    Code: string;
    Message: string;
  };
}

export interface DmarketBatchCreateTargetsResponse {
  Result: DmarketCreateTargetResultItem[];
}

export interface DmarketDeleteTargetItemRequest {
  TargetID: string;
}

export interface DmarketBatchDeleteTargetsRequest {
  Targets: DmarketDeleteTargetItemRequest[];
}

export interface DmarketDeleteTargetResultItem {
  TargetID: string;
  Successful: boolean;
  Error?: {
    Code: string;
    Message: string;
  };
}

export interface DmarketBatchDeleteTargetsResponse {
  Result: DmarketDeleteTargetResultItem[];
}

/**
 * Detailed CS2 target attributes from DMarket API v2
 */
export interface DmarketTargetCS2Attributes {
  category?: DmarketCS2Category;
  exterior?: DmarketCS2Exterior;
  phase?: string; // e.g. "PHASE_TITLE_UNSPECIFIED"
  paintSeed?: number; // 0 for standard, >0 for specific paint seed
  floatPart?: string; // e.g. "FLOAT_PART_UNSPECIFIED"
  isAdvanced?: boolean; // false for standard targets, true for advanced targets
  [key: string]: any;
}

export interface DmarketTargetAttributes {
  categoryPath?: string; // e.g. "rifle/galil ar", "machinegun/m249"
  image?: string;
  title?: string;
  name?: string;
  cs2?: DmarketTargetCS2Attributes;
  [key: string]: any;
}

export interface DmarketTargetExtra {
  category?: string;
  exterior?: string;
  paintSeed?: number;
  isAdvanced?: boolean;
  inGameAssetID?: string;
  [key: string]: any;
}

/**
 * Raw target object returned by DMarket API v2 (/marketplace-api/v2/user/targets)
 */
export interface DmarketRawTargetItem {
  targetId: string;
  title: string;
  amount: string | number;
  status: DmarketTargetStatus;
  priceCents: string;
  attributes?: DmarketTargetAttributes;
  createdAt: string | number;
  updatedAt: string | number;
  extra?: DmarketTargetExtra;
  gameId?: string;
  ownerId?: string;
  [key: string]: any;
}

/**
 * Raw API response payload from DMarket targets endpoint
 */
export interface DmarketUserTargetsApiResponse {
  targets?: DmarketRawTargetItem[];
  items?: DmarketRawTargetItem[];
  total?: string | number;
  cursor?: string;
}

/**
 * Application-normalized DMarket Target Item
 */
export interface DmarketTargetItem {
  targetId: string;
  title: string;
  amount: string;
  status: string; // e.g. "TARGET_STATUS_ACTIVE"
  priceCents: string; // e.g. "1550"
  attributes: DmarketTargetAttributes;
  createdAt: string | number;
  updatedAt: string | number;
  createdAtMs?: number | null;
  updatedAtMs?: number | null;
  holdExpiresAt?: number | null;
  holdRemainingSeconds?: number;
  isHoldActive?: boolean;
  extra?: DmarketTargetExtra;
  isAdvanced?: boolean;
  _raw?: DmarketRawTargetItem;
  [key: string]: any;
}

export interface DmarketBalance {
  usd: string;
  usdAvailableToWithdraw: string;
  dmc: string;
  dmcAvailableToWithdraw: string;
  usdCents: number;
  usdFormatted: string;
}

export interface DmarketUserProfile {
  id: string;
  username: string;
  imageUrl?: string;
  settings?: {
    targetsLimit: number;
    tradingApiToken?: string;
  };
  [key: string]: any;
}

export type DmarketListingProvider = "ICS" | "CPU" | string;
export type DmarketListingMode = "p2p" | "bot";

export interface DmarketCS2Charm {
  name?: string;
  image?: string;
  rarity?: string;
  [key: string]: any;
}

export interface DmarketCS2Sticker {
  name?: string;
  image?: string;
  rarity?: string;
  slot?: number;
  [key: string]: any;
}

export interface DmarketOfferAttributes {
  provider?: DmarketListingProvider; // "ICS" for P2P (In-Client / Steam inventory), "CPU" for Bot / Platform custody
  botId?: string;                    // Empty string "" in P2P mode, Steam ID in Bot mode
  depositor?: string;                // Empty string "" in P2P mode, user ID in Bot mode
  viewAtSteamUri?: string;           // Direct Steam inventory link
  categoryPath?: string;
  classId?: string;
  gameId?: string;
  gameType?: string;
  imageUri?: string;
  inGameAssetId?: string;            // Composite format: instanceId:classId:assetId:appId (required by deposit-assets)
  itemSlug?: string;
  name?: string;
  productId?: string;
  slug?: string;
  steamAssetId?: string;
  title?: string;
  tradable?: boolean;
  withdrawable?: boolean;
  type?: string;
  status?: string;
  // Steam Trade Protection & Availability flags from OpenAPI
  unlockDate?: string | null;           // ISO date-time when Steam trade lock expires (authoritative)
  tradeLockDays?: number;               // Deprecated in OpenAPI
  tradeLockDuration?: string | null;    // Deprecated in OpenAPI (protobuf duration e.g. "86400s")
  settlementTime?: string | null;       // ISO date-time when sale funds become withdrawable
  withdrawOnlyEndTime?: string | null;  // ISO date-time end of withdraw-only window
  tradeProtectionRemoved?: boolean;     // True when Steam Trade Protection is not in effect
  revertPendingUntil?: string | null;   // ISO date-time trade can still be reverted by Trade Protection
  withdrawalState8?: boolean;           // True when withdrawal temporarily blocked by Steam state 8
  overstocked?: boolean;                // True when title is overstocked on DMarket
  sellUnavailable?: boolean;            // True when title is not available for sale
  saleRestricted?: boolean;
  cs2?: {
    category?: string;
    collection?: string;
    family?: string;
    exterior?: string;
    float?: string;                     // Wear value as decimal string e.g. "0.2356003224849701"
    inspectInGameUri?: string;          // steam:// URI to inspect in game
    itemType?: string;
    phase?: string;
    phaseTitle?: string;
    quality?: string;
    rareInfo?: string;
    paintIndex?: number;
    paintSeed?: number;
    stickers?: DmarketCS2Sticker[];
    fadePercent?: string;               // Fade % as decimal string e.g. "82.23395515060388"
    rarePattern?: string;
    colors?: string[];
    floatPart?: string;
    charms?: DmarketCS2Charm[];         // Attached CS2 charms / keychains
    charmPattern?: number;              // Charm pattern 1-100000
    defIndex?: number;
    customName?: string;
    killEaterScoreType?: number;
    killEaterValue?: number;
    proskin?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface DmarketOfferItem {
  id: string;
  offerId?: string;
  assetId: string;
  title: string;
  priceCents: number;
  priceUsd: string;
  status: string;
  isP2P?: boolean;                    // true if listed in P2P mode (from user's Steam inventory)
  listingMode?: DmarketListingMode;    // 'p2p' | 'bot'
  attributes?: DmarketOfferAttributes;
  imageUrl?: string;
  createdDate?: string | number;
  discountPercent?: number;
  instantPrice?: { DMC?: string; USD?: string; [key: string]: any };
  instantPriceUsd?: number;
  _raw?: any;
  [key: string]: any;
}

export interface DmarketInventoryItem {
  assetId: string;
  inGameAssetId?: string;
  steamAssetId?: string;
  title: string;
  priceCents: number;
  priceUsd: string;
  tradable: boolean;
  inMarket: boolean;
  isP2P?: boolean;
  attributes?: DmarketOfferAttributes;
  imageUrl?: string;
  instantPrice?: { DMC?: string; USD?: string; [key: string]: any };
  instantPriceUsd?: number;
  _raw?: any;
  [key: string]: any;
}

// ── Additional DMarket OpenAPI v2 Models ───────────────────────────

export interface DmarketAggregatedPriceItem {
  title: string;
  orderBestPrice?: {
    amount: string; // Price in coins (cents)
    currency: string;
  };
  orderCount?: string;
  offerBestPrice?: {
    amount: string;
    currency: string;
  };
  offerCount?: string;
}

export interface DmarketAggregatedPricesRequest {
  titles: string[];
  game?: string; // CS2 is "a8db"
  limit?: string | number;
  cursor?: string;
}

export interface DmarketAggregatedPricesResponse {
  aggregatedPrices: DmarketAggregatedPriceItem[];
  nextCursor?: string;
}

export interface DmarketLastSaleItem {
  price: string; // Sale price in USD string with 2 decimals e.g. "1550.00"
  date: string | number; // Unix timestamp in seconds
  txOperationType: "Offer" | "Target";
  offerAttributes?: {
    floatValue?: number;
    paintSeed?: number;
    rareInfo?: string;
    phaseTitle?: string;
    stickers?: Array<{ name: string; image: string; rarity?: string }>;
    charms?: Array<{ name: string; image: string; rarity?: string }>;
    charmPattern?: number;
    [key: string]: any;
  };
  orderAttributes?: {
    isAdvanced?: boolean;
    rareInfo?: string;
    [key: string]: any;
  };
}

export interface DmarketLastSalesParams {
  title: string;
  gameId?: string; // default "a8db"
  filters?: string; // e.g. "exterior[]=factory new,phase[]=phase-1"
  txOperationType?: "Offer" | "Target" | "";
  limit?: number; // 1..20
  offset?: number;
}

export interface DmarketLastSalesResponse {
  sales: DmarketLastSaleItem[];
}

export interface DmarketMarketplaceOfferItem {
  offerId: string;
  priceCents: string;
  createdAt: string;
  locked: boolean;
  discountPercent?: number;
  attributes: DmarketOfferAttributes;
}

export interface DmarketMarketplaceOffersParams {
  gameId?: string; // default "a8db"
  title?: string;
  treeFilters?: string;
  priceFrom?: number; // in cents
  priceTo?: number; // in cents
  orderBy?: "price" | "title" | "float" | "createdAt" | "discount" | string;
  orderDir?: "asc" | "desc" | string;
  limit?: number; // 1..100
  cursor?: string;
}

export interface DmarketMarketplaceOffersResponse {
  items: DmarketMarketplaceOfferItem[];
  total: string | number;
  cursor: string;
}

export interface DmarketBuyOfferItemRequest {
  offerId: string;
  price: {
    amount: string; // in coins (cents for USD)
    currency: "USD" | "DMC" | string;
  };
  type: "dmarket" | "p2p";
}

export interface DmarketBuyOffersRequest {
  offers: DmarketBuyOfferItemRequest[];
}

export interface DmarketBuyOffersResponse {
  status: "TxPending" | "TxSuccess" | "TxFailed" | string;
  orderId: string;
  txId: string;
  dmOffersFailReason?: { code: string };
  dmOffersStatus?: Record<string, { started: boolean }>;
  p2pOffersStatus?: Record<string, { started: boolean }>;
  [key: string]: any;
}

export interface DmarketWithdrawAssetItem {
  id: string; // DMarket asset UUID
  gameId?: string; // default "a8db"
  classId?: string;
}

export interface DmarketWithdrawAssetsRequest {
  assets: DmarketWithdrawAssetItem[];
  requestId?: string;
}

export interface DmarketWithdrawAssetsResponse {
  transferId: string;
}

export interface DmarketDefaultFee {
  percentage: number;
}

export interface DmarketCustomizedFeeItem {
  title: string;
  feePercentage: number;
  discountPercentage: number;
}

export interface DmarketCustomizedFeesResponse {
  defaultFee: DmarketDefaultFee;
  reducedFees: DmarketCustomizedFeeItem[];
}

export interface DmarketDepositBlockedTitle {
  title: string;
  reason?: string;
}

export interface DmarketDepositBlockedTitlesResponse {
  gameId: string;
  titles: DmarketDepositBlockedTitle[];
  total?: string;
  cursor?: string;
  updatedAt?: string;
}
