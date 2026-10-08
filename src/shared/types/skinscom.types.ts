// ─────────────────────────────────────────────────────────────────
// Skins.com Trading API domain types
//
// Source of truth: src/renderer/screens/Skinscom/SKINSCOM_TRADING_API.md
// and the vendored OpenAPI spec (skinscomtradingopenapi.json).
//
// All monetary values are USD cents (integer). E.g. 16300 = $163.00.
// ─────────────────────────────────────────────────────────────────

export interface SkinscomSticker {
  sticker_id: number | null;
  wear: number | null;
  name: string;
  image: string;
}

export interface SkinscomDepositorStats {
  delivery_rate_recent: number | null;
  delivery_rate_long: number | null;
  delivery_time_minutes_recent: number | null;
  delivery_time_minutes_long: number | null;
  delivery_rate_status: string | null;
  steam_level_min_range: number | null;
  steam_level_max_range: number | null;
  user_has_trade_notifications_enabled: boolean;
  user_online_status: 0 | 1;
}

export interface SkinscomListing {
  id: number;
  market_name: string;
  market_value: number;
  purchase_price: number;
  suggested_price: number | null;
  above_recommended_price: number;
  price_is_unreliable: boolean;
  is_commodity: boolean;
  icon_url: string;
  name_color: string;
  preview_id: string | null;
  wear: number | null;
  wear_name: string | null;
  stickers: SkinscomSticker[];
  blue_percentage: number | null;
  fade_percentage: number | null;
  auction_ends_at: string | null;
  auction_highest_bid: number | null;
  auction_number_of_bids: number;
  published_at: string;
  marketplace_privacy_protection_level: string;
  depositor_stats: SkinscomDepositorStats;
}

export interface SkinscomListedItemsParams {
  page?: number;
  per_page?: number;
  auction?: string;
  sort?: string;
  order?: string;
  search?: string;
  price_min?: number;
  price_max?: number;
  price_max_above?: number;
  wear_min?: number;
  wear_max?: number;
  delivery_time_long_min?: number;
  delivery_time_long_max?: number;
  has_stickers?: string;
  is_commodity?: string;
  /**
   * When true, the main process pages through results (rate-limited, capped at
   * 40 pages). Defaults to false — most callers page explicitly.
   */
  fetchAll?: boolean;
}

export interface SkinscomListedItemsResponse {
  success: boolean;
  current_page: number;
  data: SkinscomListing[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

export interface SkinscomInventoryItem {
  id: number;
  asset_id: number;
  app_id: number;
  context_id: number;
  market_name: string;
  market_value: number;
  suggested_price: number | null;
  price_is_unreliable: boolean;
  custom_price_percentage: number | null;
  icon_url: string;
  name_color: string;
  preview_id: string | null;
  type: string | null;
  wear: number | null;
  blue_percentage: number | null;
  fade_percentage: number | null;
  stickers: SkinscomSticker[];
  is_commodity: boolean;
  tradable: boolean;
  tradelock: boolean;
  trade_exists: boolean;
  invalid: string | null;
  position: number | null;
  full_position: number | null;
  created_at: string;
  updated_at: string;
}

export interface SkinscomInventoryResponse {
  success: boolean;
  updatedAt: number;
  allowUpdate: boolean;
  data: SkinscomInventoryItem[];
}

export interface SkinscomCreateDepositItem {
  id?: number | string;
  asset_id?: number | string;
  coin_value: number;
}

export interface SkinscomCreateDepositResult {
  item_id: number;
  tracking_code: string;
  tracking_expires_at: number;
  asset_id: number;
}

export interface SkinscomCreateDepositResponse {
  success: boolean;
  data: SkinscomCreateDepositResult[];
}

export interface SkinscomBulkPriceItem {
  id: number | string;
  coin_value: number;
}

export interface SkinscomBulkUpdateSummary {
  attempted: number;
  updated: number;
  unchanged: number;
  failed: number;
}

export interface SkinscomBulkUpdatedEntry {
  index: number;
  id: number;
  old_price: number;
  new_price: number;
}

export interface SkinscomBulkUnchangedEntry {
  index: number;
  id: number;
}

export interface SkinscomBulkFailedEntry {
  index: number;
  id: number;
  error: string;
}

export interface SkinscomBulkUpdateData {
  summary: SkinscomBulkUpdateSummary;
  updated: SkinscomBulkUpdatedEntry[];
  unchanged: SkinscomBulkUnchangedEntry[];
  failed: SkinscomBulkFailedEntry[];
}

export interface SkinscomBulkUpdateResponse {
  success: boolean;
  data: SkinscomBulkUpdateData;
}

export interface SkinscomSuccessResponse {
  success: boolean;
}

export interface SkinscomSocketUser {
  id: number;
  steam_id: string | null;
  steam_name: string | null;
  username: string | null;
  avatar: string | null;
  balance: number;
  trade_url: string | null;
  steam_level: number | null;
  registration_timestamp: string;
  extra_security_type: "2fa" | null;
}

export interface SkinscomMetadataResponse {
  user: SkinscomSocketUser;
  socket_token: string;
  socket_signature: string;
}

// ─────────────────────────────────────────────────────────────────
// Live websocket feed (socket.io v4, namespace `/trade`)
//
// Events arrive as arrays. `new_item` / `updated_item` carry full listings;
// `auction_update` carries bid deltas (matched to an existing listing by id);
// `deleted_item` carries deposit ids that left the market.
// ─────────────────────────────────────────────────────────────────

export type SkinscomStreamEventType =
  | "new_item"
  | "updated_item"
  | "auction_update"
  | "deleted_item";

export interface SkinscomAuctionUpdate {
  id: number;
  above_recommended_price: number;
  auction_highest_bid: number;
  auction_number_of_bids: number;
  auction_ends_at: number;
}

/** One push from `skinscom:stream-event`. Only the fields for `type` are set. */
export interface SkinscomStreamEvent {
  type: SkinscomStreamEventType;
  receivedAt: number;
  items?: SkinscomListing[];
  auctions?: SkinscomAuctionUpdate[];
  deletedIds?: number[];
}

/** Server-side narrowing sent with the `filters` emit. */
export interface SkinscomStreamFilters {
  priceMinCents?: number;
  priceMaxCents?: number;
  auction?: "yes" | "no";
}

export interface SkinscomStreamStatus {
  connected: boolean;
  connecting: boolean;
  authenticated: boolean;
  eventCount: number;
  lastEventAt: number | null;
  error: string | null;
}
