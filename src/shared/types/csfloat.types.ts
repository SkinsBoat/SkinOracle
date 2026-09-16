// CSFloat Workstation & Trading Types

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
  reference?: {
    predicted_price?: number;
    quantity?: number;
  };
  [key: string]: any;
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
