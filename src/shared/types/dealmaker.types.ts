/**
 * 10-Minute Flash DealMaker Configuration Constants
 * Centralized control for fees, durations, and matchmaking rules.
 */
export const DEALMAKER_CONSTANTS = {
  /** Fee charged to seller to broadcast a deal (in cents). 40 = $0.40 */
  SELLER_BROADCAST_FEE_CENTS: 40,

  /** Fee charged to trader per offer placement (in cents). 20 = $0.20 */
  OFFER_FEE_CENTS: 20,

  /** Duration of an active deal in minutes */
  DURATION_MINUTES: 10,

  /** Minimum offer increment in USD */
  MIN_OFFER_INCREMENT_USD: 1.0,
} as const;

// Backward-compatibility alias
export const AUCTION_CONSTANTS = {
  ...DEALMAKER_CONSTANTS,
  BIDDER_FEE_CENTS: DEALMAKER_CONSTANTS.OFFER_FEE_CENTS,
  MIN_BID_INCREMENT_USD: DEALMAKER_CONSTANTS.MIN_OFFER_INCREMENT_USD,
} as const;

export type DealMakerStatus =
  | 'ACTIVE'
  | 'PENDING_LINK'
  | 'LISTING_POSTED'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED';

export type AuctionStatus = DealMakerStatus;

export interface DealMakerItem {
  id: string;
  sellerId: string;
  sellerTag?: string;
  marketHashName: string;
  wear?: string;
  floatValue?: string;
  inspectUrl?: string;
  imageUrl?: string;
  marketplace: string;
  startingPrice: number;
  highestBid: number | null; // Top Offer
  highestBidderId: string | null;
  highestBidderTag: string | null;
  bidsCount: number; // Offers count
  sellerFeeCents: number;
  status: DealMakerStatus;
  timerEndsAt: string;
  listingUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AuctionItem = DealMakerItem;

export interface DealMakerOffer {
  id: string;
  auctionId: string; // Deal ID
  bidderId: string;
  bidderTag?: string;
  bidAmount: number; // Offer amount
  bidFeeCents: number;
  createdAt: string;
}

export type AuctionBid = DealMakerOffer;

export interface CreateDealPayload {
  marketHashName: string;
  wear?: string;
  floatValue?: string;
  inspectUrl?: string;
  imageUrl?: string;
  marketplace?: string;
  startingPrice?: number;
  sellerTag?: string;
  tradable?: boolean;
  isLocked?: boolean;
  dmarketTradableConfirmed?: boolean;
}

export type CreateAuctionPayload = CreateDealPayload;

export interface PlaceOfferPayload {
  bidAmount: number;
  bidderTag?: string;
}

export type PlaceBidPayload = PlaceOfferPayload;
