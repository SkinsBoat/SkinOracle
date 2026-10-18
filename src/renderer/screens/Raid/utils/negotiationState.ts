/**
 * RAID — Live Negotiation Table state machine and wire-message validation.
 *
 * Pure, framework-free logic so it can be unit-tested and mirrored by the
 * guest web client. The desktop trader app is the state authority: every guest
 * message is validated here before it can touch canonical deal state.
 *
 * Privacy boundary: `buildNegotiationItems` is the only path from RAID audit
 * rows to the wire. It copies listing/proposed prices and display metadata
 * only. Ceilings, spreads, profit percentages, and Oracle formulas never leave
 * the trader's machine.
 */

import type {
  RaidAuditRow,
  RaidMarketplaceId,
} from '../../../../shared/types/raid.types';
import {
  NEGOTIATION_DISCOUNT_MAX,
  NEGOTIATION_DISCOUNT_MIN,
  NEGOTIATION_LIMITS,
  NegotiationItem,
  NegotiationItemStatus,
  NegotiationMarketplace,
  NegotiationRole,
  NegotiationState,
  PeerMessage,
  PeerWireMessage,
} from '../types/negotiation.types';

export const NEGOTIATION_MARKETPLACES: NegotiationMarketplace[] = [
  'skinport',
  'csfloat',
  'dmarket',
];

const ITEM_STATUSES: NegotiationItemStatus[] = [
  'pending',
  'accepted',
  'rejected',
];

const MAX_URL_LENGTH = 2048;

export function isNegotiationMarketplace(
  value: RaidMarketplaceId | string | null | undefined,
): value is NegotiationMarketplace {
  return (
    value === 'skinport' || value === 'csfloat' || value === 'dmarket'
  );
}

export function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function clampGlobalDiscountPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(
    NEGOTIATION_DISCOUNT_MIN,
    Math.min(NEGOTIATION_DISCOUNT_MAX, Math.round(value)),
  );
}

/**
 * Converts selected RAID audit rows into the public negotiation bundle.
 *
 * `proposedPrice` is the lower of the seller's listing and the trader's Buy
 * Ceiling — the trader never bids above the asking price. No ceiling, spread,
 * profit, or margin field is copied.
 */
export function buildNegotiationItems(rows: RaidAuditRow[]): NegotiationItem[] {
  const items: NegotiationItem[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (items.length >= NEGOTIATION_LIMITS.maxItems) break;

    const item = row?.item;
    const ceiling = row?.ceiling;
    if (!item) continue;
    if (!isNegotiationMarketplace(item.marketplace)) continue;

    const listingPrice = Number(item.price);
    const buyCeiling = Number(ceiling);
    if (!Number.isFinite(listingPrice) || listingPrice <= 0) continue;
    if (!Number.isFinite(buyCeiling) || buyCeiling <= 0) continue;

    const rawId = String(item.id ?? '')
      .trim()
      .slice(0, NEGOTIATION_LIMITS.maxIdLength);
    if (!rawId) continue;
    const id = `${item.marketplace}:${rawId}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const proposedPrice = roundUsd(Math.min(listingPrice, buyCeiling));
    const marketHashName = String(item.marketHashName ?? '')
      .trim()
      .slice(0, NEGOTIATION_LIMITS.maxIdLength);
    if (!marketHashName) continue;

    items.push({
      id,
      marketHashName,
      imageUrl: sanitizeImageUrl(item.imageUrl),
      ...(item.exterior
        ? { exterior: String(item.exterior).slice(0, 64) }
        : {}),
      ...(typeof item.floatValue === 'number' &&
      Number.isFinite(item.floatValue)
        ? { floatValue: item.floatValue }
        : {}),
      listingPrice: roundUsd(listingPrice),
      proposedPrice,
      selected: true,
      status: 'pending',
    });
  }

  return items;
}

export interface CreateNegotiationStateArgs {
  roomId: string;
  marketplace: NegotiationMarketplace;
  sellerHandle: string;
  rows: RaidAuditRow[];
  now?: number;
}

export function createNegotiationState({
  roomId,
  marketplace,
  sellerHandle,
  rows,
  now = Date.now(),
}: CreateNegotiationStateArgs): NegotiationState {
  return {
    roomId,
    marketplace,
    sellerHandle: String(sellerHandle || 'Seller').slice(
      0,
      NEGOTIATION_LIMITS.maxSenderLength,
    ),
    items: buildNegotiationItems(rows),
    globalDiscountPct: 0,
    traderReady: false,
    sellerReady: false,
    dealLocked: false,
    lastUpdatedBy: 'trader',
    updatedAt: now,
  };
}

/** Applies the bundle discount to the trader's proposed bid. */
export function getEffectiveOfferPrice(
  item: NegotiationItem,
  globalDiscountPct: number,
): number {
  const discount = clampGlobalDiscountPct(globalDiscountPct);
  return roundUsd(item.proposedPrice * (1 + discount / 100));
}

export interface NegotiationTotals {
  itemCount: number;
  listedTotal: number;
  proposedTotal: number;
  savings: number;
}

/** Totals for the currently selected bundle, after the global discount. */
export function getNegotiationTotals(
  state: NegotiationState,
): NegotiationTotals {
  let listedTotal = 0;
  let proposedTotal = 0;
  let itemCount = 0;

  for (const item of state.items) {
    if (!item.selected) continue;
    itemCount += 1;
    listedTotal += item.listingPrice;
    proposedTotal += getEffectiveOfferPrice(
      item,
      state.globalDiscountPct,
    );
  }

  listedTotal = roundUsd(listedTotal);
  proposedTotal = roundUsd(proposedTotal);

  return {
    itemCount,
    listedTotal,
    proposedTotal,
    savings: roundUsd(listedTotal - proposedTotal),
  };
}

function withUpdate(
  state: NegotiationState,
  patch: Partial<NegotiationState>,
  role: NegotiationRole,
  now: number,
): NegotiationState {
  return {
    ...state,
    ...patch,
    lastUpdatedBy: role,
    updatedAt: now,
  };
}

/**
 * Applies an already-validated message to the canonical state.
 *
 * Returns the SAME state object when the message is a no-op, rejected, or
 * forbidden. The host uses identity to decide whether to broadcast.
 *
 * Authority rules:
 *  - `SYNC_STATE` is never applied; the host is the only state authority.
 *  - A party may only change its own readiness.
 *  - Nothing mutates after the deal is locked.
 *  - Locking requires both parties to be ready.
 */
export function applyPeerMessage(
  state: NegotiationState,
  message: PeerMessage,
  fromRole: NegotiationRole,
  now: number = Date.now(),
): NegotiationState {
  switch (message.type) {
    case 'SYNC_STATE':
      return state;

    case 'TOGGLE_ITEM': {
      if (state.dealLocked) return state;
      const current = state.items.find((item) => item.id === message.itemId);
      if (!current || current.selected === message.selected) return state;
      const items = state.items.map((item) =>
        item.id === message.itemId
          ? { ...item, selected: message.selected }
          : item,
      );
      return withUpdate(state, { items }, fromRole, now);
    }

    case 'SET_GLOBAL_DISCOUNT': {
      if (state.dealLocked) return state;
      const globalDiscountPct = clampGlobalDiscountPct(message.discountPct);
      if (globalDiscountPct === state.globalDiscountPct) return state;
      return withUpdate(state, { globalDiscountPct }, fromRole, now);
    }

    case 'SET_ITEM_COUNTER': {
      if (state.dealLocked) return state;
      if (!Number.isFinite(message.counterPrice) || message.counterPrice <= 0) {
        return state;
      }
      const counterPrice = roundUsd(message.counterPrice);
      const current = state.items.find((item) => item.id === message.itemId);
      if (!current) return state;
      if (
        current.counterPrice === counterPrice &&
        current.selected &&
        current.status === 'pending'
      ) {
        return state;
      }
      const items = state.items.map((item) =>
        item.id === message.itemId
          ? {
              ...item,
              counterPrice,
              selected: true,
              status: 'pending' as const,
            }
          : item,
      );
      return withUpdate(state, { items }, fromRole, now);
    }

    case 'ACCEPT_COUNTER': {
      if (state.dealLocked) return state;
      const current = state.items.find((item) => item.id === message.itemId);
      if (!current || typeof current.counterPrice !== 'number') return state;
      const items = state.items.map((item) => {
        if (item.id !== message.itemId) return item;
        const { counterPrice: _accepted, ...rest } = item;
        return {
          ...rest,
          proposedPrice: current.counterPrice as number,
          selected: true,
          status: 'accepted' as const,
        };
      });
      return withUpdate(state, { items }, fromRole, now);
    }

    case 'DECLINE_COUNTER': {
      if (state.dealLocked) return state;
      const current = state.items.find((item) => item.id === message.itemId);
      if (!current || typeof current.counterPrice !== 'number') return state;
      const items = state.items.map((item) => {
        if (item.id !== message.itemId) return item;
        const { counterPrice: _declined, ...rest } = item;
        return { ...rest, status: 'pending' as const };
      });
      return withUpdate(state, { items }, fromRole, now);
    }

    case 'SET_READY': {
      if (state.dealLocked) return state;
      // Each party controls only its own readiness flag.
      if (message.role !== fromRole) return state;
      if (message.role === 'trader') {
        if (state.traderReady === message.ready) return state;
        return withUpdate(
          state,
          { traderReady: message.ready },
          fromRole,
          now,
        );
      }
      if (state.sellerReady === message.ready) return state;
      return withUpdate(
        state,
        { sellerReady: message.ready },
        fromRole,
        now,
      );
    }

    case 'LOCK_DEAL': {
      if (state.dealLocked) return state;
      if (!state.traderReady || !state.sellerReady) return state;
      const items = state.items.map((item) => ({
        ...item,
        status: (item.selected ? 'accepted' : 'rejected') as
          | 'accepted'
          | 'rejected',
      }));
      return withUpdate(state, { dealLocked: true, items }, fromRole, now);
    }

    default:
      // CHAT_MESSAGE and transport keepalives never touch deal state.
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────
// Runtime validation — untrusted DataChannel input
// ─────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function safeString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

/** Only HTTPS images may reach either side's DOM. */
function sanitizeImageUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!/^https:\/\//i.test(trimmed)) return '';
  return trimmed.slice(0, MAX_URL_LENGTH);
}

function parseNegotiationItem(
  raw: unknown,
): NegotiationItem | null {
  if (!isRecord(raw)) return null;

  const id = safeString(raw.id, NEGOTIATION_LIMITS.maxIdLength);
  const marketHashName = safeString(
    raw.marketHashName,
    NEGOTIATION_LIMITS.maxIdLength,
  );
  const listingPrice = toFiniteNumber(raw.listingPrice);
  const proposedPrice = toFiniteNumber(raw.proposedPrice);
  if (!id || !marketHashName) return null;
  if (listingPrice === null || listingPrice <= 0) return null;
  if (proposedPrice === null || proposedPrice <= 0) return null;
  if (typeof raw.selected !== 'boolean') return null;
  if (
    typeof raw.status !== 'string' ||
    !ITEM_STATUSES.includes(raw.status as NegotiationItemStatus)
  ) {
    return null;
  }

  const counterPrice = toFiniteNumber(raw.counterPrice);
  const floatValue = toFiniteNumber(raw.floatValue);

  return {
    id,
    marketHashName,
    imageUrl: sanitizeImageUrl(raw.imageUrl),
    ...(typeof raw.exterior === 'string'
      ? { exterior: raw.exterior.slice(0, 64) }
      : {}),
    ...(floatValue !== null ? { floatValue } : {}),
    listingPrice: roundUsd(listingPrice),
    proposedPrice: roundUsd(proposedPrice),
    ...(counterPrice !== null && counterPrice > 0
      ? { counterPrice: roundUsd(counterPrice) }
      : {}),
    selected: raw.selected,
    status: raw.status as NegotiationItemStatus,
  };
}

export function parseNegotiationState(
  raw: unknown,
): NegotiationState | null {
  if (!isRecord(raw) || !Array.isArray(raw.items)) return null;

  const roomId = safeString(raw.roomId, 128);
  const sellerHandle = safeString(
    raw.sellerHandle,
    NEGOTIATION_LIMITS.maxSenderLength,
  );
  if (!roomId || !sellerHandle) return null;
  if (!isNegotiationMarketplace(raw.marketplace as string)) return null;

  const items: NegotiationItem[] = [];
  const seen = new Set<string>();
  for (const entry of raw.items.slice(0, NEGOTIATION_LIMITS.maxItems)) {
    const item = parseNegotiationItem(entry);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
  }

  const globalDiscountPct =
    typeof raw.globalDiscountPct === 'number'
      ? clampGlobalDiscountPct(raw.globalDiscountPct)
      : 0;
  const updatedAt = toFiniteNumber(raw.updatedAt);

  return {
    roomId,
    marketplace: raw.marketplace as NegotiationMarketplace,
    sellerHandle,
    items,
    globalDiscountPct,
    traderReady: raw.traderReady === true,
    sellerReady: raw.sellerReady === true,
    dealLocked: raw.dealLocked === true,
    lastUpdatedBy: raw.lastUpdatedBy === 'seller' ? 'seller' : 'trader',
    updatedAt: updatedAt === null ? Date.now() : updatedAt,
  };
}

/**
 * Validates and normalizes an untrusted DataChannel payload.
 * Returns null for malformed, oversized, or unknown messages.
 */
export function parsePeerMessage(raw: unknown): PeerWireMessage | null {
  if (!isRecord(raw) || typeof raw.type !== 'string') return null;

  switch (raw.type) {
    case 'INIT_DEAL_STATE':
    case 'SYNC_STATE': {
      const state = parseNegotiationState(raw.state);
      return state ? { type: raw.type, state } : null;
    }

    case 'TOGGLE_ITEM': {
      const itemId = safeString(raw.itemId, NEGOTIATION_LIMITS.maxIdLength);
      if (!itemId || typeof raw.selected !== 'boolean') return null;
      return { type: 'TOGGLE_ITEM', itemId, selected: raw.selected };
    }

    case 'SET_GLOBAL_DISCOUNT': {
      const discountPct = toFiniteNumber(raw.discountPct);
      if (discountPct === null) return null;
      return {
        type: 'SET_GLOBAL_DISCOUNT',
        discountPct: clampGlobalDiscountPct(discountPct),
      };
    }

    case 'SET_ITEM_COUNTER': {
      const itemId = safeString(raw.itemId, NEGOTIATION_LIMITS.maxIdLength);
      const counterPrice = toFiniteNumber(raw.counterPrice);
      if (!itemId || counterPrice === null || counterPrice <= 0) return null;
      return {
        type: 'SET_ITEM_COUNTER',
        itemId,
        counterPrice: roundUsd(counterPrice),
      };
    }

    case 'ACCEPT_COUNTER':
    case 'DECLINE_COUNTER': {
      const itemId = safeString(raw.itemId, NEGOTIATION_LIMITS.maxIdLength);
      return itemId ? { type: raw.type, itemId } : null;
    }

    case 'SET_READY': {
      if (raw.role !== 'trader' && raw.role !== 'seller') return null;
      if (typeof raw.ready !== 'boolean') return null;
      return { type: 'SET_READY', role: raw.role, ready: raw.ready };
    }

    case 'LOCK_DEAL':
      return { type: 'LOCK_DEAL' };

    case 'CHAT_MESSAGE': {
      const sender =
        safeString(raw.sender, NEGOTIATION_LIMITS.maxSenderLength) ??
        'Seller';
      const text = safeString(raw.text, NEGOTIATION_LIMITS.maxChatLength);
      if (!text) return null;
      const timestamp = toFiniteNumber(raw.timestamp);
      return {
        type: 'CHAT_MESSAGE',
        sender,
        text,
        timestamp: timestamp === null ? Date.now() : timestamp,
      };
    }

    case 'PEER_PING':
    case 'PEER_PONG': {
      const sentAt = toFiniteNumber(raw.sentAt);
      if (sentAt === null) return null;
      return { type: raw.type, sentAt };
    }

    default:
      return null;
  }
}
