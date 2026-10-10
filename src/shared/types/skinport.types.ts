// ─────────────────────────────────────────────────────────────────
// Skinport Marketplace domain types
//
// Source of truth: https://docs.skinport.com (Items + Sale Feed).
// Items endpoint: GET https://api.skinport.com/v1/items (public, no auth,
// Brotli required, cached 5 min, 8 req / 5 min). Prices are USD dollars.
//
// Live feed: socket.io over `wss://skinport.com` using the msgpack parser.
// `saleFeedJoin` -> `saleFeed`. Sale prices are USD cents (integer).
// ─────────────────────────────────────────────────────────────────

export interface SkinportTag {
  name: string;
  name_localized?: string;
}

/** One item inside a `saleFeed` push (listed or sold). */
export interface SkinportSale {
  id: number;
  saleId: string | null;
  productId: number;
  assetId: number;
  itemId: number;
  appid: number;
  steamid: string;
  url: string;
  family: string;
  family_localized?: string;
  name: string;
  title: string;
  text: string;
  marketName: string;
  marketHashName: string;
  color: string;
  bgColor?: string | null;
  image: string;
  classid: string;
  assetid: string;
  lock: string | null;
  version: string;
  versionType: string;
  stackAble: boolean;
  suggestedPrice: number;
  salePrice: number;
  currency: string;
  saleStatus: string;
  saleType: string;
  category: string;
  category_localized?: string;
  subCategory: string;
  subCategory_localized?: string;
  pattern: number;
  finish: number;
  customName: string | null;
  wear: number | null;
  link: string;
  type: string;
  exterior: string;
  quality: string;
  rarity: string;
  rarityColor: string;
  collection: string | null;
  stickers: string[];
  screenshots?: string[];
  souvenir: boolean;
  stattrak: boolean;
  tags: SkinportTag[];
  ownItem: boolean;
}

export type SkinportFeedEventType = "listed" | "sold";

/** Raw payload emitted by Skinport on the `saleFeed` channel. */
export interface SkinportSaleFeedPayload {
  eventType: SkinportFeedEventType;
  sales: SkinportSale[];
}

/** One push from `skinport:stream-event` (main -> renderer). */
export interface SkinportStreamEvent {
  eventType: SkinportFeedEventType;
  receivedAt: number;
  sales: SkinportSale[];
}

export interface SkinportStreamStatus {
  connected: boolean;
  connecting: boolean;
  eventCount: number;
  lastEventAt: number | null;
  error: string | null;
}

/** One row of `GET /v1/items`. Prices are USD dollars (float). */
export interface SkinportMarketItem {
  market_hash_name: string;
  currency: string;
  suggested_price: number | null;
  item_page: string;
  market_page: string;
  min_price: number | null;
  max_price: number | null;
  mean_price: number | null;
  median_price: number | null;
  quantity: number;
  created_at: number;
  updated_at: number;
}

export interface SkinportItemsParams {
  app_id?: number;
  currency?: string;
  /** When false, non-tradable (trade-locked) items are included. */
  tradable?: boolean;
}
