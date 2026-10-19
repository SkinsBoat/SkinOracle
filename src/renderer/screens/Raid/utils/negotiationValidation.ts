/**
 * RAID — Live Negotiation Table wire-message validation.
 *
 * Everything received over the WebRTC DataChannel and every compressed share
 * payload is untrusted input. These parsers normalize, bound, and reject
 * malformed payloads before they can touch canonical deal state.
 */

import type {
  NegotiationItem,
  NegotiationItemStatus,
  NegotiationMarketplace,
  NegotiationState,
  PeerWireMessage,
} from '../types/negotiation.types';
import { NEGOTIATION_LIMITS } from '../types/negotiation.types';
import {
  clampGlobalDiscountPct,
  isNegotiationMarketplace,
  roundUsd,
} from './negotiationMath';

const ITEM_STATUSES: NegotiationItemStatus[] = [
  'pending',
  'accepted',
  'rejected',
];

const MAX_URL_LENGTH = 2048;

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
export function sanitizeImageUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!/^https:\/\//i.test(trimmed)) return '';
  return trimmed.slice(0, MAX_URL_LENGTH);
}

function parseNegotiationItem(raw: unknown): NegotiationItem | null {
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
  const counterUpdatedAt = toFiniteNumber(raw.counterUpdatedAt);
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
    ...(counterUpdatedAt !== null ? { counterUpdatedAt } : {}),
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
  if (!isNegotiationMarketplace(raw.marketplace)) return null;

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

function parseItemIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entry of value.slice(0, NEGOTIATION_LIMITS.maxItems)) {
    if (typeof entry !== 'string') continue;
    const id = entry.trim().slice(0, NEGOTIATION_LIMITS.maxIdLength);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids.length > 0 ? ids : null;
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

    case 'TOGGLE_ITEMS': {
      const itemIds = parseItemIds(raw.itemIds);
      if (!itemIds || typeof raw.selected !== 'boolean') return null;
      return { type: 'TOGGLE_ITEMS', itemIds, selected: raw.selected };
    }

    case 'SET_ITEM_COUNTERS': {
      const itemIds = parseItemIds(raw.itemIds);
      const counterPrice = toFiniteNumber(raw.counterPrice);
      if (!itemIds || counterPrice === null || counterPrice <= 0) return null;
      return {
        type: 'SET_ITEM_COUNTERS',
        itemIds,
        counterPrice: roundUsd(counterPrice),
      };
    }

    case 'ACCEPT_COUNTERS':
    case 'DECLINE_COUNTERS': {
      const itemIds = parseItemIds(raw.itemIds);
      return itemIds ? { type: raw.type, itemIds } : null;
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
