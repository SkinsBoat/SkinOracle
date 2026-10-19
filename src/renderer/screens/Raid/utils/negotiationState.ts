/**
 * RAID — Live Negotiation Table state construction.
 *
 * This module is the public entry point for negotiation state. The reducer,
 * pricing math, and wire validation live in focused sibling modules and are
 * re-exported here so existing imports keep working.
 *
 * Privacy boundary: `buildNegotiationItems` is the only path from RAID audit
 * rows to the wire. It copies listing/proposed prices and display metadata
 * only. Ceilings, spreads, profit percentages, and Oracle formulas never leave
 * the trader's machine.
 */

import type {
  RaidAuditRow,
} from '../../../../shared/types/raid.types';
import type {
  NegotiationItem,
  NegotiationMarketplace,
  NegotiationState,
} from '../types/negotiation.types';
import { NEGOTIATION_LIMITS } from '../types/negotiation.types';
import {
  isNegotiationMarketplace,
  roundUsd,
} from './negotiationMath';
import { sanitizeImageUrl } from './negotiationValidation';

export * from './negotiationMath';
export * from './negotiationReducer';
export * from './negotiationValidation';

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

    const rawListingPrice = Number(item.price);
    const buyCeiling = Number(ceiling);
    if (!Number.isFinite(buyCeiling) || buyCeiling <= 0) continue;

    // Steam inventory has no seller asking price; negotiate from the ceiling.
    const listingPrice =
      item.priceUnavailable ||
      !Number.isFinite(rawListingPrice) ||
      rawListingPrice <= 0
        ? buyCeiling
        : rawListingPrice;

    const rawId = String(item.id ?? '')
      .trim()
      .slice(0, NEGOTIATION_LIMITS.maxIdLength);
    if (!rawId) continue;
    let id = `${item.marketplace}:${rawId}`;
    if (seen.has(id)) {
      // Never drop a second listing just because a marketplace reused or
      // omitted its listing id. A unique suffix keeps both negotiable.
      let suffix = 2;
      while (seen.has(`${id}#${suffix}`)) suffix += 1;
      id = `${id}#${suffix}`;
    }
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
