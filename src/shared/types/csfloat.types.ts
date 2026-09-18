// CSFloat Workstation & Trading Types

export interface CsFloatItemReference {
  base_price?: number;
  float_factor?: number;
  predicted_price?: number;
  quantity?: number;
  last_updated?: string;
  buy_order?: {
    max_price?: number;
    quantity?: number;
  };
}

export interface CsFloatInventoryItem {
  asset_id: string;
  market_hash_name: string;
  item_name?: string;
  wear_name?: string;
  float_value?: number;
  icon_url?: string;
  tradable?: number;
  listing_id?: string;
  price?: number; // price in cents if listed
  private?: boolean;
  is_sold?: boolean;
  trade_state?: string;
  trade_id?: string;
  serialized_inspect?: string;
  inspect_link?: string;
  gs_sig?: string;
  def_index?: number;
  paint_index?: number;
  paint_seed?: number;
  is_stattrak?: boolean;
  is_souvenir?: boolean;
  rarity?: number;
  rarity_name?: string;
  quality?: number;
  type?: string;
  type_name?: string;
  low_rank?: number;
  is_commodity?: boolean;
  description?: string;
  collection?: string;
  reference?: CsFloatItemReference;
  [key: string]: unknown;
}

export interface CsFloatItemBuyOrder {
  market_hash_name: string;
  price: number;
  qty: number;
  hybrid_properties?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ListingAnalysis {
  targetListingPrice: number;
  mode: string;
  offsetPercent: number;
  lowestPrice: number;
  averagePrice: number;
  currentPrice: number | null;
  isListed: boolean;
  drift: number;
  driftPercent: number;
  isActionRequired: boolean;
  isOverpriced: boolean;
  isUnderpriced: boolean;
  trendMomentum14d?: number;
}

export interface ListingPriceInfo {
  listingPrice: number;
  mode: string;
  offsetPercent: number;
  lowestPrice: number;
  averagePrice: number;
  trendMomentum14d?: number;
}
