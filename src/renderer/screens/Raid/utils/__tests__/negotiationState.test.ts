import { describe, it, expect } from 'vitest';
import type {
  RaidAuditRow,
  RaidStockItem,
} from '../../../../../shared/types/raid.types';
import {
  applyPeerMessage,
  buildNegotiationItems,
  clampGlobalDiscountPct,
  createNegotiationState,
  getEffectiveOfferPrice,
  getNegotiationTotals,
  groupNegotiationItems,
  parsePeerMessage,
  sortNegotiationItemsByAction,
  parseNegotiationState,
} from '../negotiationState';
import { buildDealShareUrl } from '../negotiationRoom';
import {
  decodeNegotiationState,
  encodeNegotiationShare,
  encodeNegotiationState,
} from '../negotiationShare';
import { compressToEncodedURIComponent } from 'lz-string';

function stockItem(
  overrides: Partial<RaidStockItem> = {},
): RaidStockItem {
  return {
    id: 'listing-1',
    marketplace: 'skinport',
    marketHashName: 'AK-47 | Redline (Field-Tested)',
    price: 100,
    imageUrl: 'https://example.test/ak.png',
    exterior: 'Field-Tested',
    floatValue: 0.22,
    ...overrides,
  };
}

function auditRow(overrides: Partial<RaidAuditRow> = {}): RaidAuditRow {
  return {
    item: stockItem(),
    ceiling: 120,
    spread: 20,
    profitPercent: 16.67,
    status: 'raid',
    ...overrides,
  };
}

describe('buildNegotiationItems', () => {
  it('exports only public offer fields and proposes min(listing, ceiling)', () => {
    const items = buildNegotiationItems([
      auditRow({
        item: stockItem({ id: 'a', price: 100 }),
        ceiling: 120,
      }),
      auditRow({
        item: stockItem({ id: 'b', price: 100, marketHashName: 'AWP | Asiimov (FT)' }),
        ceiling: 80,
      }),
    ]);

    expect(items).toHaveLength(2);
    expect(items[0].proposedPrice).toBe(100);
    expect(items[1].proposedPrice).toBe(80);
    expect(items.every((item) => item.selected)).toBe(true);
    expect(items.every((item) => item.status === 'pending')).toBe(true);
  });

  it('never serializes ceilings, spreads, or profit percentages', () => {
    const items = buildNegotiationItems([auditRow()]);
    const wire = JSON.stringify(items);

    expect(wire).not.toMatch(/ceiling/i);
    expect(wire).not.toMatch(/spread/i);
    expect(wire).not.toMatch(/profit/i);
  });

  it('skips rows without a usable ceiling or with unsupported markets', () => {
    const items = buildNegotiationItems([
      auditRow({ ceiling: undefined, status: 'no-ceiling' }),
      auditRow({ ceiling: Number.NaN }),
      auditRow({ ceiling: 0 }),
      auditRow({
        item: stockItem({ marketplace: 'steam' }),
        ceiling: 100,
      }),
    ]);

    expect(items).toHaveLength(0);
  });

  it('keeps duplicate listings even when the marketplace reuses an id', () => {
    const items = buildNegotiationItems([
      auditRow({ item: stockItem({ id: 'same' }) }),
      auditRow({ item: stockItem({ id: 'same' }) }),
    ]);

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.id)).toEqual([
      'skinport:same',
      'skinport:same#2',
    ]);
  });

  it('drops non-HTTPS image URLs', () => {
    const items = buildNegotiationItems([
      auditRow({
        item: stockItem({
          id: 'img',
          imageUrl: 'javascript:alert(1)',
        }),
      }),
    ]);

    expect(items[0].imageUrl).toBe('');
  });
});

describe('createNegotiationState', () => {
  it('starts unlocked with no readiness and the trader as last writer', () => {
    const state = createNegotiationState({
      roomId: 'raid-1234abcd',
      marketplace: 'csfloat',
      sellerHandle: 'Seller One',
      rows: [auditRow()],
      now: 1000,
    });

    expect(state.roomId).toBe('raid-1234abcd');
    expect(state.marketplace).toBe('csfloat');
    expect(state.items).toHaveLength(1);
    expect(state.dealLocked).toBe(false);
    expect(state.traderReady).toBe(false);
    expect(state.sellerReady).toBe(false);
    expect(state.lastUpdatedBy).toBe('trader');
    expect(state.updatedAt).toBe(1000);
  });
});

describe('applyPeerMessage', () => {
  const base = () =>
    createNegotiationState({
      roomId: 'raid-1234abcd',
      marketplace: 'dmarket',
      sellerHandle: 'Seller',
      rows: [auditRow(), auditRow({ item: stockItem({ id: 'second' }) })],
      now: 1000,
    });

  it('lets the seller toggle an item and records the writer', () => {
    const state = base();
    const next = applyPeerMessage(
      state,
      { type: 'TOGGLE_ITEM', itemId: state.items[0].id, selected: false },
      'seller',
      2000,
    );

    expect(next).not.toBe(state);
    expect(next.items[0].selected).toBe(false);
    expect(next.lastUpdatedBy).toBe('seller');
    expect(next.updatedAt).toBe(2000);
  });

  it('rejects readiness changes for the other party', () => {
    const state = base();
    const next = applyPeerMessage(
      state,
      { type: 'SET_READY', role: 'trader', ready: true },
      'seller',
    );

    expect(next).toBe(state);
  });

  it('allows both seller discounts and buyer premiums', () => {
    const state = base();
    const deep = applyPeerMessage(
      state,
      { type: 'SET_GLOBAL_DISCOUNT', discountPct: -99 },
      'seller',
    );
    expect(deep.globalDiscountPct).toBe(-25);

    const premium = applyPeerMessage(
      state,
      { type: 'SET_GLOBAL_DISCOUNT', discountPct: 99 },
      'trader',
    );
    expect(premium.globalDiscountPct).toBe(25);
  });

  it('accepts a counter at cents precision and re-includes the item', () => {
    const state = base();
    const itemId = state.items[0].id;
    const toggledOff = applyPeerMessage(
      state,
      { type: 'TOGGLE_ITEM', itemId, selected: false },
      'seller',
    );
    const next = applyPeerMessage(
      toggledOff,
      { type: 'SET_ITEM_COUNTER', itemId, counterPrice: 12.345 },
      'seller',
    );

    expect(next.items[0].counterPrice).toBe(12.35);
    expect(next.items[0].selected).toBe(true);
    expect(next.items[0].status).toBe('pending');
  });

  it('accepts or declines a seller counter without leaving stale counter state', () => {
    const state = base();
    const itemId = state.items[0].id;
    const countered = applyPeerMessage(
      state,
      { type: 'SET_ITEM_COUNTER', itemId, counterPrice: 95 },
      'seller',
    );

    const accepted = applyPeerMessage(
      countered,
      { type: 'ACCEPT_COUNTER', itemId },
      'trader',
    );
    expect(accepted.items[0].proposedPrice).toBe(95);
    expect(accepted.items[0].counterPrice).toBeUndefined();
    expect(accepted.items[0].status).toBe('accepted');
    expect(accepted.items[0].selected).toBe(true);

    const declined = applyPeerMessage(
      countered,
      { type: 'DECLINE_COUNTER', itemId },
      'trader',
    );
    expect(declined.items[0].proposedPrice).toBe(
      countered.items[0].proposedPrice,
    );
    expect(declined.items[0].counterPrice).toBeUndefined();
    expect(declined.items[0].status).toBe('pending');
  });

  it('locks only when both parties are ready, then freezes state', () => {
    const state = base();
    const blocked = applyPeerMessage(state, { type: 'LOCK_DEAL' }, 'seller');
    expect(blocked).toBe(state);

    const sellerReady = applyPeerMessage(
      state,
      { type: 'SET_READY', role: 'seller', ready: true },
      'seller',
    );
    const bothReady = applyPeerMessage(
      sellerReady,
      { type: 'SET_READY', role: 'trader', ready: true },
      'trader',
    );
    const locked = applyPeerMessage(bothReady, { type: 'LOCK_DEAL' }, 'seller');

    expect(locked.dealLocked).toBe(true);
    expect(locked.items[0].status).toBe('accepted');
    expect(locked.lastUpdatedBy).toBe('seller');

    const afterLock = applyPeerMessage(
      locked,
      { type: 'TOGGLE_ITEM', itemId: locked.items[0].id, selected: false },
      'seller',
    );
    expect(afterLock).toBe(locked);
  });

  it('marks de-selected items rejected when the deal locks', () => {
    const state = base();
    const toggled = applyPeerMessage(
      state,
      { type: 'TOGGLE_ITEM', itemId: state.items[0].id, selected: false },
      'seller',
    );
    const bothReady = applyPeerMessage(
      applyPeerMessage(
        toggled,
        { type: 'SET_READY', role: 'seller', ready: true },
        'seller',
      ),
      { type: 'SET_READY', role: 'trader', ready: true },
      'trader',
    );
    const locked = applyPeerMessage(bothReady, { type: 'LOCK_DEAL' }, 'trader');

    expect(locked.items[0].status).toBe('rejected');
    expect(locked.items[0].selected).toBe(false);
    expect(locked.items[1].status).toBe('accepted');
  });

  it('ignores guest SYNC_STATE snapshots', () => {
    const state = base();
    const next = applyPeerMessage(
      state,
      {
        type: 'SYNC_STATE',
        state: { ...state, globalDiscountPct: -25 },
      },
      'seller',
    );

    expect(next).toBe(state);
  });
});

describe('stacked item groups', () => {
  const state = () =>
    createNegotiationState({
      roomId: '8f3a9b1c-1111-4222-8333-444455556666',
      marketplace: 'skinport',
      sellerHandle: 'Seller',
      rows: [
        auditRow({
          item: stockItem({ id: 'a', marketHashName: 'AK-47 | Redline (FT)' }),
          ceiling: 80,
        }),
        auditRow({
          item: stockItem({ id: 'b', marketHashName: 'AK-47 | Redline (FT)' }),
          ceiling: 70,
        }),
        auditRow({
          item: stockItem({ id: 'c', marketHashName: 'AWP | Asiimov (FT)' }),
          ceiling: 60,
        }),
      ],
      now: 1000,
    });

  it('groups identical market hash names and preserves order', () => {
    const groups = groupNegotiationItems(state().items);

    expect(groups).toHaveLength(2);
    expect(groups[0].name).toContain('AK-47');
    expect(groups[0].count).toBe(2);
    expect(groups[0].items.map((item) => item.id)).toEqual([
      'skinport:a',
      'skinport:b',
    ]);
    expect(groups[0].totalListing).toBe(200);
    expect(groups[0].totalProposed).toBe(150);
    expect(groups[0].allSelected).toBe(true);
    expect(groups[0].someSelected).toBe(false);
    expect(groups[1].count).toBe(1);
  });

  it('normalizes trademark symbols and whitespace before grouping', () => {
    const state = createNegotiationState({
      roomId: '8f3a9b1c-1111-4222-8333-444455556666',
      marketplace: 'skinport',
      sellerHandle: 'Seller',
      rows: [
        auditRow({
          item: stockItem({
            id: 'st-1',
            marketHashName: 'StatTrak\u2122 AK-47 | Redline (FT)',
          }),
        }),
        auditRow({
          item: stockItem({
            id: 'st-2',
            marketHashName: '  stattrak ak-47 | redline (ft) ',
          }),
        }),
      ],
      now: 1000,
    });

    const groups = groupNegotiationItems(state.items);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(2);
  });

  it('marks partial selection and counter counts', () => {
    const base = state();
    const countered = applyPeerMessage(
      base,
      {
        type: 'SET_ITEM_COUNTERS',
        itemIds: ['skinport:a', 'skinport:b'],
        counterPrice: 75,
      },
      'seller',
    );
    const partial = applyPeerMessage(
      countered,
      { type: 'TOGGLE_ITEMS', itemIds: ['skinport:a'], selected: false },
      'seller',
    );

    const group = groupNegotiationItems(partial.items)[0];
    expect(group.someSelected).toBe(true);
    expect(group.allSelected).toBe(false);
    expect(group.selectedCount).toBe(1);
    expect(group.counterCount).toBe(2);
  });

  it('applies bulk accept and decline to every linked item', () => {
    const base = state();
    const countered = applyPeerMessage(
      base,
      {
        type: 'SET_ITEM_COUNTERS',
        itemIds: ['skinport:a', 'skinport:b'],
        counterPrice: 75,
      },
      'seller',
    );

    const sellerAccepted = applyPeerMessage(
      countered,
      { type: 'ACCEPT_COUNTER', itemId: 'skinport:a' },
      'seller',
    );
    expect(sellerAccepted).toBe(countered);

    const accepted = applyPeerMessage(
      countered,
      { type: 'ACCEPT_COUNTERS', itemIds: ['skinport:a', 'skinport:b'] },
      'trader',
    );
    expect(accepted.items[0].proposedPrice).toBe(75);
    expect(accepted.items[1].proposedPrice).toBe(75);
    expect(accepted.items[0].counterPrice).toBeUndefined();
    expect(accepted.items[1].status).toBe('accepted');

    const declined = applyPeerMessage(
      countered,
      { type: 'DECLINE_COUNTERS', itemIds: ['skinport:a', 'skinport:b'] },
      'trader',
    );
    expect(declined.items[0].counterPrice).toBeUndefined();
    expect(declined.items[1].counterPrice).toBeUndefined();
    expect(declined.items[0].status).toBe('pending');
  });
});

describe('action triage order', () => {
  it('moves counters to the top, oldest first, preserving the rest', () => {
    const base = createNegotiationState({
      roomId: '8f3a9b1c-1111-4222-8333-444455556666',
      marketplace: 'skinport',
      sellerHandle: 'Seller',
      rows: [
        auditRow({ item: stockItem({ id: 'a', marketHashName: 'A' }) }),
        auditRow({ item: stockItem({ id: 'b', marketHashName: 'B' }) }),
        auditRow({ item: stockItem({ id: 'c', marketHashName: 'C' }) }),
      ],
      now: 1000,
    });

    const withCounters = applyPeerMessage(
      applyPeerMessage(
        base,
        {
          type: 'SET_ITEM_COUNTER',
          itemId: 'skinport:b',
          counterPrice: 70,
        },
        'seller',
        2000,
      ),
      {
        type: 'SET_ITEM_COUNTER',
        itemId: 'skinport:c',
        counterPrice: 60,
      },
      'seller',
      1500,
    );

    expect(
      sortNegotiationItemsByAction(withCounters.items).map((item) => item.id),
    ).toEqual(['skinport:c', 'skinport:b', 'skinport:a']);
  });

  it('removes the action timestamp when a counter is accepted or declined', () => {
    const base = createNegotiationState({
      roomId: '8f3a9b1c-1111-4222-8333-444455556666',
      marketplace: 'skinport',
      sellerHandle: 'Seller',
      rows: [auditRow()],
      now: 1000,
    });
    const countered = applyPeerMessage(
      base,
      {
        type: 'SET_ITEM_COUNTER',
        itemId: base.items[0].id,
        counterPrice: 70,
      },
      'seller',
      2000,
    );
    expect(countered.items[0].counterUpdatedAt).toBe(2000);

    const accepted = applyPeerMessage(
      countered,
      { type: 'ACCEPT_COUNTER', itemId: base.items[0].id },
      'trader',
      3000,
    );
    expect(accepted.items[0].counterUpdatedAt).toBeUndefined();

    const declined = applyPeerMessage(
      countered,
      { type: 'DECLINE_COUNTER', itemId: base.items[0].id },
      'trader',
      3000,
    );
    expect(declined.items[0].counterUpdatedAt).toBeUndefined();
  });
});

describe('parsePeerMessage', () => {
  it('rejects malformed and unknown payloads', () => {
    expect(parsePeerMessage(null)).toBeNull();
    expect(parsePeerMessage([])).toBeNull();
    expect(parsePeerMessage({})).toBeNull();
    expect(parsePeerMessage({ type: 'DROP_TABLES' })).toBeNull();
    expect(
      parsePeerMessage({ type: 'TOGGLE_ITEM', itemId: 'a', selected: 'yes' }),
    ).toBeNull();
    expect(
      parsePeerMessage({
        type: 'SET_ITEM_COUNTER',
        itemId: 'a',
        counterPrice: Number.NaN,
      }),
    ).toBeNull();
    expect(
      parsePeerMessage({
        type: 'SET_ITEM_COUNTER',
        itemId: 'a',
        counterPrice: -5,
      }),
    ).toBeNull();
    expect(
      parsePeerMessage({ type: 'SET_GLOBAL_DISCOUNT', discountPct: 'x' }),
    ).toBeNull();
    expect(parsePeerMessage({ type: 'SET_READY', role: 'guest', ready: true }))
      .toBeNull();
  });

  it('accepts and sanitizes bulk item actions', () => {
    expect(
      parsePeerMessage({
        type: 'TOGGLE_ITEMS',
        itemIds: ['a', 'a', 'b'],
        selected: false,
      }),
    ).toEqual({
      type: 'TOGGLE_ITEMS',
      itemIds: ['a', 'b'],
      selected: false,
    });

    expect(
      parsePeerMessage({
        type: 'SET_ITEM_COUNTERS',
        itemIds: ['a', 'b'],
        counterPrice: 12.345,
      }),
    ).toEqual({
      type: 'SET_ITEM_COUNTERS',
      itemIds: ['a', 'b'],
      counterPrice: 12.35,
    });

    expect(parsePeerMessage({ type: 'TOGGLE_ITEMS', itemIds: [], selected: true }))
      .toBeNull();
    expect(
      parsePeerMessage({
        type: 'ACCEPT_COUNTERS',
        itemIds: ['a'],
      }),
    ).toEqual({ type: 'ACCEPT_COUNTERS', itemIds: ['a'] });
  });

  it('accepts INIT_DEAL_STATE as a full initial snapshot', () => {
    const state = createNegotiationState({
      roomId: '8f3a9b1c-1111-4222-8333-444455556666',
      marketplace: 'skinport',
      sellerHandle: 'Seller',
      rows: [auditRow()],
    });

    const parsed = parsePeerMessage({
      type: 'INIT_DEAL_STATE',
      state,
    });

    expect(parsed).toMatchObject({
      type: 'INIT_DEAL_STATE',
      state: {
        roomId: state.roomId,
        items: [{ id: state.items[0].id }],
      },
    });
  });

  it('accepts counter response messages', () => {
    expect(
      parsePeerMessage({ type: 'ACCEPT_COUNTER', itemId: 'skinport:1' }),
    ).toEqual({ type: 'ACCEPT_COUNTER', itemId: 'skinport:1' });
    expect(
      parsePeerMessage({ type: 'DECLINE_COUNTER', itemId: 'skinport:1' }),
    ).toEqual({ type: 'DECLINE_COUNTER', itemId: 'skinport:1' });
    expect(parsePeerMessage({ type: 'ACCEPT_COUNTER' })).toBeNull();
  });

  it('clamps discounts and rounds counters from the wire', () => {
    expect(
      parsePeerMessage({ type: 'SET_GLOBAL_DISCOUNT', discountPct: -90 }),
    ).toEqual({ type: 'SET_GLOBAL_DISCOUNT', discountPct: -25 });

    expect(
      parsePeerMessage({
        type: 'SET_ITEM_COUNTER',
        itemId: 'skinport:1',
        counterPrice: 9.999,
      }),
    ).toEqual({
      type: 'SET_ITEM_COUNTER',
      itemId: 'skinport:1',
      counterPrice: 10,
    });
  });

  it('caps chat text and sender length', () => {
    const parsed = parsePeerMessage({
      type: 'CHAT_MESSAGE',
      sender: 'S'.repeat(200),
      text: ` ${'hello '.repeat(200)}`,
      timestamp: 'not-a-number',
    });

    expect(parsed?.type).toBe('CHAT_MESSAGE');
    if (parsed?.type !== 'CHAT_MESSAGE') return;
    expect(parsed.sender).toHaveLength(64);
    expect(parsed.text).toHaveLength(500);
    expect(Number.isFinite(parsed.timestamp)).toBe(true);
  });

  it('accepts transport keepalives', () => {
    expect(parsePeerMessage({ type: 'PEER_PING', sentAt: 100 })).toEqual({
      type: 'PEER_PING',
      sentAt: 100,
    });
    expect(parsePeerMessage({ type: 'PEER_PONG', sentAt: 100 })).toEqual({
      type: 'PEER_PONG',
      sentAt: 100,
    });
  });
});

describe('parseNegotiationState', () => {
  it('sanitizes a guest snapshot', () => {
    const state = createNegotiationState({
      roomId: 'raid-1234abcd',
      marketplace: 'skinport',
      sellerHandle: 'Seller',
      rows: [auditRow()],
      now: 1000,
    });

    const parsed = parseNegotiationState({
      ...state,
      globalDiscountPct: -80,
      traderReady: 'yes',
      items: [
        ...state.items,
        { ...state.items[0], id: '' },
        { ...state.items[0], proposedPrice: Number.POSITIVE_INFINITY },
      ],
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.globalDiscountPct).toBe(-25);
    expect(parsed?.traderReady).toBe(false);
    expect(parsed?.items).toHaveLength(1);
  });
});

describe('bundle totals', () => {
  it('applies the global discount to selected items only', () => {
    const state = createNegotiationState({
      roomId: 'raid-1234abcd',
      marketplace: 'skinport',
      sellerHandle: 'Seller',
      rows: [
        auditRow({
          item: stockItem({ id: 'a', price: 100 }),
          ceiling: 80,
        }),
        auditRow({
          item: stockItem({ id: 'b', price: 100, marketHashName: 'Second' }),
          ceiling: 50,
        }),
      ],
      now: 1000,
    });
    const withDiscount: typeof state = { ...state, globalDiscountPct: -10 };
    const withSecondExcluded: typeof state = {
      ...withDiscount,
      items: withDiscount.items.map((item, index) =>
        index === 1 ? { ...item, selected: false } : item,
      ),
    };

    const totals = getNegotiationTotals(withSecondExcluded);
    expect(totals.itemCount).toBe(1);
    expect(totals.listedTotal).toBe(100);
    expect(totals.proposedTotal).toBe(72);
    expect(totals.savings).toBe(28);
    expect(
      getEffectiveOfferPrice(withSecondExcluded.items[0], -10),
    ).toBe(72);
    expect(
      getEffectiveOfferPrice(withSecondExcluded.items[0], 10),
    ).toBe(88);
  });

  it('clamps out-of-range discounts', () => {
    expect(clampGlobalDiscountPct(-40)).toBe(-25);
    expect(clampGlobalDiscountPct(40)).toBe(25);
    expect(clampGlobalDiscountPct(5)).toBe(5);
    expect(clampGlobalDiscountPct(Number.NaN)).toBe(0);
  });
});

describe('room helpers', () => {
  it('builds a short room + guest-token share URL with no deal payload', () => {
    const url = buildDealShareUrl(
      'https://skinsboat.com/deal',
      '8f3a9b1c-1111-4222-8333-444455556666',
      'guest-token',
    );
    expect(url).toBe(
      'https://skinsboat.com/deal#room=8f3a9b1c-1111-4222-8333-444455556666&token=guest-token',
    );
    expect(url).not.toContain('data=');
    expect(
      buildDealShareUrl('https://skinsboat.com/deal#room=old/', 'room-x'),
    ).toBe('https://skinsboat.com/deal#room=room-x');
  });
});

describe('share-link codec', () => {
  const state = () =>
    createNegotiationState({
      roomId: '8f3a9b1c-1111-4222-8333-444455556666',
      marketplace: 'skinport',
      sellerHandle: 'Seller',
      rows: [
        auditRow({
          item: stockItem({ id: 'a', price: 100 }),
          ceiling: 80,
        }),
        auditRow({
          item: stockItem({ id: 'b', price: 50, marketHashName: 'Second' }),
          ceiling: 60,
        }),
      ],
      now: 1000,
    });

  it('round-trips a sanitized snapshot through lz-string', () => {
    const original = state();
    const encoded = encodeNegotiationState(original);
    const decoded = decodeNegotiationState(
      encoded,
      original.roomId,
    );

    expect(decoded).not.toBeNull();
    expect(decoded?.roomId).toBe(original.roomId);
    expect(decoded?.items).toHaveLength(2);
    expect(decoded?.items[0].proposedPrice).toBe(80);
    expect(decoded?.items[1].proposedPrice).toBe(50);
  });

  it('rejects tampered, mismatched, or unsupported payloads', () => {
    const original = state();
    const encoded = encodeNegotiationState(original);

    expect(decodeNegotiationState('not-a-payload')).toBeNull();
    expect(
      decodeNegotiationState(encoded, 'different-room'),
    ).toBeNull();
    expect(
      decodeNegotiationState(
        compressToEncodedURIComponent(
          JSON.stringify({ v: 99, state: original }),
        ),
      ),
    ).toBeNull();
  });

  it('drops thumbnail URLs when the compressed link would be too long', () => {
    const noise = (seed: number, length: number): string => {
      let state = seed;
      const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let out = '';
      for (let index = 0; index < length; index += 1) {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        out += alphabet[state % alphabet.length];
      }
      return out;
    };
    const rows = Array.from({ length: 30 }, (_, index) =>
      auditRow({
        item: stockItem({
          id: `long-${index}`,
          marketHashName: `Skin ${index} | Very Long Listing Name (Factory New)`,
          price: 100 + index,
          imageUrl: `https://cdn.example.test/${noise(
            index + 7,
            200,
          )}.png`,
        }),
        ceiling: 90 + index,
      }),
    );
    const original = createNegotiationState({
      roomId: '8f3a9b1c-1111-4222-8333-444455556666',
      marketplace: 'skinport',
      sellerHandle: 'Seller',
      rows,
    });

    const share = encodeNegotiationShare(original);
    expect(share.imagesIncluded).toBe(false);
    expect(share.encoded.length).toBeLessThan(20_000);

    const decoded = decodeNegotiationState(share.encoded, original.roomId);
    expect(decoded?.items).toHaveLength(30);
    expect(decoded?.items[0].imageUrl).toBe('');
    expect(decoded?.items[0].marketHashName).toContain('Skin 0');
  });

  it('never serializes internal ceiling fields', () => {
    const encoded = encodeNegotiationState(state());
    const decoded = decodeNegotiationState(encoded);

    expect(JSON.stringify(decoded)).not.toMatch(/ceiling/i);
    expect(JSON.stringify(decoded)).not.toMatch(/spread/i);
    expect(JSON.stringify(decoded)).not.toMatch(/profit/i);
  });
});
