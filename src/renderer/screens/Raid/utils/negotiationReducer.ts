/**
 * RAID — Live Negotiation Table canonical state reducer.
 *
 * The trader's desktop app is the only state authority. Guest messages are
 * validated by `parsePeerMessage` before reaching this reducer, which then
 * enforces role authority, lock freezing, and no-op identity.
 */

import type {
  NegotiationRole,
  NegotiationState,
  PeerMessage,
} from '../types/negotiation.types';
import {
  clampGlobalDiscountPct,
  roundUsd,
} from './negotiationMath';

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

function removeCounter(
  item: NegotiationState['items'][number],
): NegotiationState['items'][number] {
  const rest = { ...item };
  delete rest.counterPrice;
  delete rest.counterUpdatedAt;
  return rest;
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

    case 'TOGGLE_ITEMS': {
      if (state.dealLocked) return state;
      const ids = new Set(message.itemIds);
      let changed = false;
      const items = state.items.map((item) => {
        if (!ids.has(item.id) || item.selected === message.selected) {
          return item;
        }
        changed = true;
        return { ...item, selected: message.selected };
      });
      if (!changed) return state;
      return withUpdate(state, { items }, fromRole, now);
    }

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
              counterUpdatedAt: now,
              selected: true,
              status: 'pending' as const,
            }
          : item,
      );
      return withUpdate(state, { items }, fromRole, now);
    }

    case 'SET_ITEM_COUNTERS': {
      if (state.dealLocked) return state;
      if (!Number.isFinite(message.counterPrice) || message.counterPrice <= 0) {
        return state;
      }
      const ids = new Set(message.itemIds);
      const counterPrice = roundUsd(message.counterPrice);
      let changed = false;
      const items = state.items.map((item) => {
        if (!ids.has(item.id)) return item;
        if (
          item.counterPrice === counterPrice &&
          item.selected &&
          item.status === 'pending'
        ) {
          return item;
        }
        changed = true;
        return {
          ...item,
          counterPrice,
          counterUpdatedAt: now,
          selected: true,
          status: 'pending' as const,
        };
      });
      if (!changed) return state;
      return withUpdate(state, { items }, fromRole, now);
    }

    case 'ACCEPT_COUNTERS': {
      if (fromRole !== 'trader') return state;
      if (state.dealLocked) return state;
      const ids = new Set(message.itemIds);
      let changed = false;
      const items = state.items.map((item) => {
        if (!ids.has(item.id) || typeof item.counterPrice !== 'number') {
          return item;
        }
        changed = true;
        return {
          ...removeCounter(item),
          proposedPrice: item.counterPrice,
          selected: true,
          status: 'accepted' as const,
        };
      });
      if (!changed) return state;
      return withUpdate(state, { items }, fromRole, now);
    }

    case 'DECLINE_COUNTERS': {
      if (fromRole !== 'trader') return state;
      if (state.dealLocked) return state;
      const ids = new Set(message.itemIds);
      let changed = false;
      const items = state.items.map((item) => {
        if (!ids.has(item.id) || typeof item.counterPrice !== 'number') {
          return item;
        }
        changed = true;
        return {
          ...removeCounter(item),
          status: 'pending' as const,
        };
      });
      if (!changed) return state;
      return withUpdate(state, { items }, fromRole, now);
    }

    case 'ACCEPT_COUNTER': {
      if (fromRole !== 'trader') return state;
      if (state.dealLocked) return state;
      const current = state.items.find((item) => item.id === message.itemId);
      if (!current || typeof current.counterPrice !== 'number') return state;
      const items = state.items.map((item) =>
        item.id === message.itemId
          ? {
              ...removeCounter(item),
              proposedPrice: current.counterPrice as number,
              selected: true,
              status: 'accepted' as const,
            }
          : item,
      );
      return withUpdate(state, { items }, fromRole, now);
    }

    case 'DECLINE_COUNTER': {
      if (fromRole !== 'trader') return state;
      if (state.dealLocked) return state;
      const current = state.items.find((item) => item.id === message.itemId);
      if (!current || typeof current.counterPrice !== 'number') return state;
      const items = state.items.map((item) =>
        item.id === message.itemId
          ? { ...removeCounter(item), status: 'pending' as const }
          : item,
      );
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
