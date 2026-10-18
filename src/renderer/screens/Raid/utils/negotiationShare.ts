/**
 * RAID — Live Negotiation Table share-link codec.
 *
 * The deal snapshot travels in the URL fragment (`#...&data=...`), compressed
 * with lz-string. Fragments are never sent to the web host, so the offer is not
 * logged by Cloudflare/Vercel or any intermediate proxy.
 *
 * Payload v2 uses a compact tuple format and drops thumbnail URLs when the
 * compressed link would be uncomfortably long for Steam/Discord. The live
 * DataChannel always carries the full state, images included.
 */

import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string';
import type {
  NegotiationItem,
  NegotiationItemStatus,
  NegotiationMarketplace,
  NegotiationState,
} from '../types/negotiation.types';
import { NEGOTIATION_LIMITS } from '../types/negotiation.types';
import {
  NEGOTIATION_MARKETPLACES,
  parseNegotiationState,
} from './negotiationState';

export const SHARE_PAYLOAD_VERSION = 2;
export const LEGACY_SHARE_PAYLOAD_VERSION = 1;
export const MAX_SHARE_PAYLOAD_LENGTH = 100_000;
/** Compressed data budget before thumbnails are dropped. */
export const SHARE_LINK_SOFT_LIMIT = 1800;

const STATUS_TO_CODE: Record<NegotiationItemStatus, number> = {
  pending: 0,
  accepted: 1,
  rejected: 2,
};

const CODE_TO_STATUS: NegotiationItemStatus[] = [
  'pending',
  'accepted',
  'rejected',
];

type CompactItemV2 = [
  id: string,
  name: string,
  listingPrice: number,
  proposedPrice: number,
  exterior: string,
  floatValue: number,
  selected: number,
  status: number,
  counterPrice: number,
  imageUrl: string,
];

interface CompactPayloadV2 {
  v: typeof SHARE_PAYLOAD_VERSION;
  r: string;
  m: number;
  h: string;
  d: number;
  tr: number;
  sr: number;
  lk: number;
  w: number;
  it: CompactItemV2[];
}

interface LegacyPayloadV1 {
  v: typeof LEGACY_SHARE_PAYLOAD_VERSION;
  state: NegotiationState;
}

export interface EncodedNegotiationShare {
  encoded: string;
  imagesIncluded: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripMarketplacePrefix(
  id: string,
  marketplace: NegotiationMarketplace,
): string {
  const prefix = `${marketplace}:`;
  return id.startsWith(prefix) ? id.slice(prefix.length) : id;
}

function toCompactItem(
  item: NegotiationItem,
  marketplace: NegotiationMarketplace,
  includeImages: boolean,
): CompactItemV2 {
  return [
    stripMarketplacePrefix(item.id, marketplace),
    item.marketHashName,
    item.listingPrice,
    item.proposedPrice,
    item.exterior ?? '',
    typeof item.floatValue === 'number' ? item.floatValue : -1,
    item.selected ? 1 : 0,
    STATUS_TO_CODE[item.status] ?? 0,
    typeof item.counterPrice === 'number' ? item.counterPrice : -1,
    includeImages ? item.imageUrl : '',
  ];
}

function encodeV2(
  state: NegotiationState,
  includeImages: boolean,
): string {
  const marketplaceIndex = NEGOTIATION_MARKETPLACES.indexOf(
    state.marketplace,
  );
  const payload: CompactPayloadV2 = {
    v: SHARE_PAYLOAD_VERSION,
    r: state.roomId,
    m: marketplaceIndex < 0 ? 0 : marketplaceIndex,
    h: state.sellerHandle,
    d: state.globalDiscountPct,
    tr: state.traderReady ? 1 : 0,
    sr: state.sellerReady ? 1 : 0,
    lk: state.dealLocked ? 1 : 0,
    w: state.lastUpdatedBy === 'seller' ? 1 : 0,
    it: state.items.map((item) =>
      toCompactItem(item, state.marketplace, includeImages),
    ),
  };
  return compressToEncodedURIComponent(JSON.stringify(payload));
}

/**
 * Encodes the public deal snapshot, preferring a thumbnail-rich payload and
 * automatically falling back to a compact no-thumbnail payload when the link
 * exceeds the chat-friendly soft limit.
 */
export function encodeNegotiationShare(
  state: NegotiationState,
): EncodedNegotiationShare {
  const withImages = encodeV2(state, true);
  if (withImages.length <= SHARE_LINK_SOFT_LIMIT) {
    return { encoded: withImages, imagesIncluded: true };
  }
  return { encoded: encodeV2(state, false), imagesIncluded: false };
}

export function encodeNegotiationState(state: NegotiationState): string {
  return encodeNegotiationShare(state).encoded;
}

function decodeV2(raw: Record<string, unknown>): NegotiationState | null {
  if (
    typeof raw.r !== 'string' ||
    typeof raw.h !== 'string' ||
    typeof raw.m !== 'number' ||
    !Array.isArray(raw.it)
  ) {
    return null;
  }

  const marketplace = NEGOTIATION_MARKETPLACES[raw.m];
  if (!marketplace) return null;

  const items: NegotiationItem[] = [];
  const seen = new Set<string>();

  for (const entry of raw.it.slice(0, NEGOTIATION_LIMITS.maxItems)) {
    if (!Array.isArray(entry) || entry.length < 10) continue;

    const [
      rawId,
      rawName,
      rawListing,
      rawProposed,
      rawExterior,
      rawFloat,
      rawSelected,
      rawStatus,
      rawCounter,
      rawImage,
    ] = entry;

    if (typeof rawId !== 'string' || typeof rawName !== 'string') continue;
    if (typeof rawListing !== 'number' || !Number.isFinite(rawListing)) {
      continue;
    }
    if (typeof rawProposed !== 'number' || !Number.isFinite(rawProposed)) {
      continue;
    }
    if (typeof rawSelected !== 'number') continue;
    if (typeof rawStatus !== 'number') continue;

    const id = `${marketplace}:${rawId}`;
    if (!rawId.trim() || seen.has(id)) continue;
    seen.add(id);

    const status = CODE_TO_STATUS[rawStatus] ?? 'pending';
    const floatValue =
      typeof rawFloat === 'number' && Number.isFinite(rawFloat) && rawFloat >= 0
        ? rawFloat
        : null;
    const counterPrice =
      typeof rawCounter === 'number' &&
      Number.isFinite(rawCounter) &&
      rawCounter > 0
        ? rawCounter
        : null;

    items.push({
      id,
      marketHashName: rawName,
      imageUrl: typeof rawImage === 'string' ? rawImage : '',
      ...(typeof rawExterior === 'string' && rawExterior
        ? { exterior: rawExterior }
        : {}),
      ...(floatValue !== null ? { floatValue } : {}),
      listingPrice: rawListing,
      proposedPrice: rawProposed,
      ...(counterPrice !== null ? { counterPrice } : {}),
      selected: rawSelected === 1,
      status,
    });
  }

  return parseNegotiationState({
    roomId: raw.r,
    marketplace,
    sellerHandle: raw.h,
    items,
    globalDiscountPct: typeof raw.d === 'number' ? raw.d : 0,
    traderReady: raw.tr === 1,
    sellerReady: raw.sr === 1,
    dealLocked: raw.lk === 1,
    lastUpdatedBy: raw.w === 1 ? 'seller' : 'trader',
    updatedAt: Date.now(),
  });
}

/**
 * Decompresses and re-validates an untrusted URL payload.
 * Supports legacy v1 links and compact v2 links.
 */
export function decodeNegotiationState(
  encoded: string,
  expectedRoomId?: string,
): NegotiationState | null {
  if (!encoded || encoded.length > MAX_SHARE_PAYLOAD_LENGTH) return null;

  let json: string;
  try {
    json = decompressFromEncodedURIComponent(encoded);
  } catch {
    return null;
  }
  if (!json) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;

  let state: NegotiationState | null = null;
  if (parsed.v === SHARE_PAYLOAD_VERSION) {
    state = decodeV2(parsed);
  } else if (parsed.v === LEGACY_SHARE_PAYLOAD_VERSION) {
    const legacy = parsed as unknown as LegacyPayloadV1;
    state = parseNegotiationState(legacy.state);
  }

  if (!state) return null;
  if (expectedRoomId && state.roomId !== expectedRoomId) return null;
  if (state.items.length === 0) return null;

  return state;
}
