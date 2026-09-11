import {
  CS2CAP_PROVIDERS,
  Cs2CapProviderInfo,
  DEFAULT_CS2CAP_PROVIDERS,
} from "../../shared/cs2capProviders";
import { toCanonicalMarketId } from "../../shared/canonicalMarkets";

// Standard internal PriceCache representation
export interface PriceListing {
  m: string;
  p: number;
  q?: number;
}

export type PriceCache = Record<string, { n: string; l: PriceListing[] }>;

export { CS2CAP_PROVIDERS, DEFAULT_CS2CAP_PROVIDERS };
export type { Cs2CapProviderInfo };

/**
 * Parses a single NDJSON line from CS2Cap and mutates the cache dictionary.
 * Normalizes lowest_ask cents into standard USD dollars.
 */
export function parseCs2CapLine(line: string, cache: PriceCache): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  try {
    const raw = JSON.parse(trimmed);
    const name = raw.market_hash_name || raw.name;
    const provider = raw.provider;
    const lowestAskCents = raw.lowest_ask;

    // Validate required fields and price sanity
    if (
      !name ||
      typeof name !== "string" ||
      !provider ||
      typeof lowestAskCents !== "number"
    ) {
      return false;
    }

    if (lowestAskCents <= 0) {
      return false;
    }

    // CS2Cap lowest_ask is delivered in cents (e.g. 3460 = $34.60)
    const priceUsd = Number((lowestAskCents / 100).toFixed(2));

    // Filter dust items below $0.20
    if (priceUsd < 0.2) {
      return false;
    }

    if (!cache[name]) {
      cache[name] = { n: name, l: [] };
    }

    // Normalize incoming provider identifier to canonical market ID
    const providerKey = toCanonicalMarketId(String(provider));
    const quantity =
      typeof raw.quantity === "number" && raw.quantity > 0
        ? raw.quantity
        : undefined;

    const existing = cache[name].l.find((l) => l.m === providerKey);
    if (existing) {
      if (priceUsd < existing.p) {
        existing.p = priceUsd;
      }
      if (quantity !== undefined) {
        existing.q =
          existing.q !== undefined ? Math.max(existing.q, quantity) : quantity;
      }
    } else {
      const listing: PriceListing = {
        m: providerKey,
        p: priceUsd,
      };
      if (quantity !== undefined) {
        listing.q = quantity;
      }
      cache[name].l.push(listing);
    }

    return true;
  } catch {
    // Skip invalid line
    return false;
  }
}

/**
 * Calculates market/provider counts from the price cache.
 */
export function getMarketCounts(cache: PriceCache): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of Object.values(cache)) {
    if (item?.l && Array.isArray(item.l)) {
      const seen = new Set<string>();
      for (const listing of item.l) {
        if (listing.m && !seen.has(listing.m)) {
          seen.add(listing.m);
          counts[listing.m] = (counts[listing.m] || 0) + 1;
        }
      }
    }
  }
  return counts;
}
