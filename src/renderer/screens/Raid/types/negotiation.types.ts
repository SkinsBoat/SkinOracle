/**
 * RAID — Live Negotiation Table wire protocol.
 *
 * The trader's desktop app is the only state authority. Everything the guest
 * receives is built from `buildNegotiationItems` (negotiationState.ts), which
 * copies ONLY the fields below — never ceilings, spreads, profit percentages,
 * Oracle formulas, or local margin parameters.
 *
 * Keep this file framework-free so the same shapes can be mirrored by the
 * guest web client.
 */

/** Marketplace the seller storefront was scanned from. */
export type NegotiationMarketplace = 'skinport' | 'csfloat' | 'dmarket';

export type NegotiationRole = 'trader' | 'seller';

export type NegotiationItemStatus = 'pending' | 'accepted' | 'rejected';

export interface NegotiationItem {
  /** Stable, marketplace-prefixed item key (`skinport:12345`). */
  id: string;
  marketHashName: string;
  imageUrl: string;
  exterior?: string;
  floatValue?: number;
  /** Seller's asking price, USD dollars. Public by definition. */
  listingPrice: number;
  /** Trader's proposed bid, USD dollars. Public by definition. */
  proposedPrice: number;
  /** Seller's counter-offer, USD dollars, when supplied. */
  counterPrice?: number;
  /** Host receive time of the latest counter, used to triage actionable items. */
  counterUpdatedAt?: number;
  /** Included in the current deal bundle. */
  selected: boolean;
  status: NegotiationItemStatus;
}

export interface NegotiationState {
  roomId: string;
  marketplace: NegotiationMarketplace;
  sellerHandle: string;
  items: NegotiationItem[];
  /**
   * Bundle-wide price adjustment. Negative = seller discount, positive =
   * buyer premium. Range [-25, 25].
   */
  globalDiscountPct: number;
  traderReady: boolean;
  sellerReady: boolean;
  dealLocked: boolean;
  lastUpdatedBy: NegotiationRole;
  updatedAt: number;
}

/**
 * Application-level messages exchanged over the WebRTC DataChannel.
 * Messages are validated with `parsePeerMessage` before they can mutate state.
 */
export type PeerMessage =
  | { type: 'INIT_DEAL_STATE'; state: NegotiationState }
  | { type: 'SYNC_STATE'; state: NegotiationState }
  | { type: 'TOGGLE_ITEM'; itemId: string; selected: boolean }
  | { type: 'TOGGLE_ITEMS'; itemIds: string[]; selected: boolean }
  | { type: 'SET_GLOBAL_DISCOUNT'; discountPct: number }
  | { type: 'SET_ITEM_COUNTER'; itemId: string; counterPrice: number }
  | { type: 'SET_ITEM_COUNTERS'; itemIds: string[]; counterPrice: number }
  | { type: 'ACCEPT_COUNTERS'; itemIds: string[] }
  | { type: 'DECLINE_COUNTERS'; itemIds: string[] }
  | { type: 'ACCEPT_COUNTER'; itemId: string }
  | { type: 'DECLINE_COUNTER'; itemId: string }
  | { type: 'SET_READY'; role: NegotiationRole; ready: boolean }
  | { type: 'LOCK_DEAL' }
  | { type: 'CHAT_MESSAGE'; sender: string; text: string; timestamp: number };

/**
 * Transport-internal keepalive used to display live round-trip latency.
 * These never touch `NegotiationState`.
 */
export type PeerTransportMessage =
  | { type: 'PEER_PING'; sentAt: number }
  | { type: 'PEER_PONG'; sentAt: number };

export type PeerWireMessage = PeerMessage | PeerTransportMessage;

/** Local-only chat history entry (not part of the synchronized deal state). */
export interface NegotiationChatMessage {
  id: string;
  role: NegotiationRole;
  sender: string;
  text: string;
  timestamp: number;
}

export type RaidPeerStatus =
  | 'idle'
  | 'initializing'
  | 'waiting'
  | 'connected'
  | 'error';

/**
 * Transport telemetry for the UI.
 * - `connecting`: PeerJS signaling / WebRTC handshake in progress.
 * - `p2p`: DataChannel open, direct peer-to-peer sync.
 * - `offline`: no direct channel; controls stay fully interactive and the
 *   share link's hash payload remains the source of truth.
 */
export type NegotiationTransportMode = 'connecting' | 'p2p' | 'offline';

export const NEGOTIATION_DISCOUNT_MIN = -25;
export const NEGOTIATION_DISCOUNT_MAX = 25;

export const NEGOTIATION_LIMITS = {
  /** Highest number of line items the host will publish. */
  maxItems: 500,
  /** Maximum chat message length. */
  maxChatLength: 500,
  /** Maximum display name length. */
  maxSenderLength: 64,
  /** Maximum item id / market hash name length. */
  maxIdLength: 200,
} as const;
