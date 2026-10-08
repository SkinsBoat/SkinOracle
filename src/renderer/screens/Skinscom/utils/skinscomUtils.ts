import type {
  SkinscomListing,
  SkinscomInventoryItem,
} from "../../../../shared/types/skinscom.types";

/**
 * Skins.com Trading API helper utilities.
 *
 * Reference: src/renderer/screens/Skinscom/SKINSCOM_TRADING_API.md
 * All prices are USD cents (integer) — 16300 => $163.00.
 */

/**
 * Skins.com returns `icon_url` as a bare Steam economy image hash. When a full
 * URL is already supplied we pass it through unchanged.
 */
const STEAM_ECONOMY_IMAGE_PREFIX =
  "https://community.cloudflare.steamstatic.com/economy/image/";

export function buildSkinscomImageUrl(iconUrl?: string | null): string {
  if (!iconUrl) return "";
  if (/^https?:\/\//i.test(iconUrl)) return iconUrl;
  return `${STEAM_ECONOMY_IMAGE_PREFIX}${iconUrl}`;
}

/** Format an integer USD-cents value as `$X.XX`. */
export function formatUsdFromCents(cents?: number | null): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) {
    return "—";
  }
  return `$${(cents / 100).toFixed(2)}`;
}

/** Convert a USD dollar string/number to integer cents (rounded). */
export function usdToCents(value: string | number): number | null {
  const num = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100);
}

/** Split an array into fixed-size chunks (bulk endpoints cap at 20 items). */
export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) throw new Error("chunk size must be > 0");
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Signed percent difference of the current listing price relative to the
 * Skins.com suggested price. Positive = priced above suggested.
 */
export function computeDeltaPercent(
  currentCents: number,
  suggestedCents?: number | null,
): number | null {
  if (!suggestedCents || suggestedCents <= 0) return null;
  return ((currentCents - suggestedCents) / suggestedCents) * 100;
}

/**
 * Closeness of a market listing price to the Oracle Buy Ceiling
 * (`acceptedPrice`). 1.0 = exactly at the ceiling; <1.0 = below (buyable);
 * >1.0 = above. Mirrors the So Close scanners on CSFloat/DMarket.
 */
export function computeCloseness(
  marketCents: number,
  ceilingCents?: number | null,
): number | null {
  if (!ceilingCents || ceilingCents <= 0) return null;
  return marketCents / ceilingCents;
}

/** True when the market price is within `maxCloseness` of the Buy Ceiling. */
export function isSoClose(
  closeness: number | null,
  maxCloseness: number,
): boolean {
  return closeness !== null && closeness <= maxCloseness;
}

/** True when a listing deviates from its sell target beyond the threshold. */
export function isListingOffTarget(
  listing: SkinscomListing,
  thresholdPercent: number,
): boolean {
  const delta = computeDeltaPercent(
    listing.market_value,
    listing.suggested_price,
  );
  if (delta === null) return false;
  return Math.abs(delta) > thresholdPercent;
}

export type SkinscomItemCategory = "weapon" | "sticker" | "other";

/** Trailing CS2 wear bucket, e.g. "(Field-Tested)". */
const WEAR_SUFFIX =
  /\((?:Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/i;

/**
 * Classify a Skins.com market name into weapon / sticker / other.
 *
 * `GET /trading/items` has no server-side category filter (the `item_search`
 * category/type/rarity fields are websocket-only), so the Marketplace scan
 * classifies each result by its market name:
 *
 * - **sticker** — names prefixed with `Sticker |`.
 * - **weapon**  — anything under a `★` (knives, gloves, vanilla) OR a
 *   `<Weapon> | <Skin> (<Wear>)` skin with a trailing wear bucket.
 * - **other**   — cases, capsules, graffiti, patches, music kits, agents,
 *   charms, pins, keys, passes, containers, tools, etc.
 */
export function classifySkinscomItem(name: string): SkinscomItemCategory {
  const n = (name || "").trim();
  if (!n) return "other";
  if (/^Sticker\s*\|/i.test(n)) return "sticker";
  if (n.startsWith("★")) return "weapon";
  if (n.includes(" | ") && WEAR_SUFFIX.test(n)) return "weapon";
  return "other";
}

/** True for weapons and stickers (excludes cases, graffiti, agents, etc.). */
export function isWeaponOrSticker(name: string): boolean {
  return classifySkinscomItem(name) !== "other";
}

/**
 * True when an inventory item cannot be deposited (`invalid` reason, per the
 * API spec). NOTE: the API exposes no listing/sale status, so this is not a
 * "listed" indicator — it only reflects Skins.com's own invalid reason.
 */
export function isInventoryListed(item: SkinscomInventoryItem): boolean {
  return Boolean(item.invalid);
}

const WEAR_SHORTCUTS: Record<string, string> = {
  "Factory New": "FN",
  "Minimal Wear": "MW",
  "Field-Tested": "FT",
  "Well-Worn": "WW",
  "Battle-Scarred": "BS",
};

/** Map a Skins.com `wear_name` to its short wear bucket (FN/MW/FT/WW/BS). */
export function getWearShortcutFromName(wearName?: string | null): string {
  if (!wearName) return "";
  const trimmed = wearName.trim();
  return WEAR_SHORTCUTS[trimmed] ?? trimmed;
}

/** Map a CS2 wear float to its short bucket (FN/MW/FT/WW/BS). */
export function getWearShortcutFromFloat(wear?: number | null): string {
  if (wear === null || wear === undefined || !Number.isFinite(wear)) return "";
  if (wear < 0.07) return "FN";
  if (wear < 0.15) return "MW";
  if (wear < 0.38) return "FT";
  if (wear < 0.45) return "WW";
  return "BS";
}

/**
 * Stable identity of a *physical* market item, used to visually collapse the
 * live feed. Skins.com assigns a fresh deposit id when an unsold auction is
 * re-listed, so the same item can arrive under several ids; identity is
 * `market_name` + exact float, matching how the marketplace presents one row
 * per item.
 */
export function getListingIdentity(listing: SkinscomListing): string {
  const wear =
    listing.wear !== null && listing.wear !== undefined
      ? String(listing.wear)
      : (listing.wear_name ?? "");
  return `${listing.market_name}::${wear}`;
}
