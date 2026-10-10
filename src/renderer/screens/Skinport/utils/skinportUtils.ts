import type {
  SkinportMarketItem,
  SkinportSale,
} from "../../../../shared/types/skinport.types";
import type { WearKey } from "../constants";

/**
 * Skinport helper utilities. Prices from `GET /v1/items` are USD dollars;
 * sale-feed prices are USD cents (integers).
 */

const STEAM_ECONOMY_IMAGE_PREFIX =
  "https://community.cloudflare.steamstatic.com/economy/image/";

/** CS2 item image for the public items feed (which carries no image hash). */
export function buildSkinportItemImageUrl(name: string): string {
  return `https://api.steamapis.com/image/item/730/${encodeURIComponent(name)}`;
}

/** Image for a sale-feed entry, which carries a Steam economy image hash. */
export function buildSkinportSaleImageUrl(image?: string | null): string {
  if (!image) return "";
  if (/^https?:\/\//i.test(image)) return image;
  return `${STEAM_ECONOMY_IMAGE_PREFIX}${image}`;
}

/** Format USD cents as `$X.XX`. */
export function formatUsdFromCents(cents?: number | null): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) {
    return "—";
  }
  return `$${(cents / 100).toFixed(2)}`;
}

/** Format a USD dollar value as `$X.XX`. */
export function formatUsd(dollars?: number | null): string {
  if (dollars === null || dollars === undefined || !Number.isFinite(dollars)) {
    return "—";
  }
  return `$${dollars.toFixed(2)}`;
}

/** Convert USD dollars to integer cents (rounded); null when non-positive. */
export function usdToCents(value: string | number): number | null {
  const num = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100);
}

/** Closeness of a market price to the Oracle Buy Ceiling. */
export function computeCloseness(
  marketCents: number,
  ceilingCents?: number | null,
): number | null {
  if (!ceilingCents || ceilingCents <= 0) return null;
  return marketCents / ceilingCents;
}

export type SkinportItemCategory = "weapon" | "sticker" | "other";

const SOUVENIR_PREFIX = /^Souvenir\s/i;

/** True when a market hash name is a Souvenir variant (e.g. "Souvenir AWP | …"). */
export function isSouvenirName(name: string): boolean {
  return SOUVENIR_PREFIX.test((name || "").trim());
}

const WEAR_SUFFIX =
  /\((?:Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/i;

/** Classify a market hash name into weapon / sticker / other (no API category). */
export function classifySkinportItem(name: string): SkinportItemCategory {
  const n = (name || "").trim();
  if (!n) return "other";
  if (/^Sticker\s*\|/i.test(n)) return "sticker";
  if (n.startsWith("★")) return "weapon";
  if (n.includes(" | ") && WEAR_SUFFIX.test(n)) return "weapon";
  return "other";
}

const WEAR_SHORTCUTS: Record<string, string> = {
  "factory new": "FN",
  "minimal wear": "MW",
  "field-tested": "FT",
  "well-worn": "WW",
  "battle-scarred": "BS",
};

/** Map a wear float to its short bucket (FN/MW/FT/WW/BS). */
export function wearShortcutFromFloat(wear?: number | null): string {
  if (wear === null || wear === undefined || !Number.isFinite(wear)) return "";
  if (wear < 0.07) return "FN";
  if (wear < 0.15) return "MW";
  if (wear < 0.38) return "FT";
  if (wear < 0.45) return "WW";
  return "BS";
}

/** Wear bucket key from a market hash name's trailing exterior token. */
export function wearKeyFromName(name: string): WearKey | null {
  const match = (name || "").match(
    /\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/i,
  );
  if (!match) return null;
  const normalized =
    match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  const map: Record<string, WearKey> = {
    "Factory new": "fn",
    "Minimal wear": "mw",
    "Field-tested": "ft",
    "Well-worn": "ww",
    "Battle-scarred": "bs",
  };
  return map[normalized] ?? null;
}

/** Wear bucket key from a sale-feed wear float. */
export function wearKeyFromFloat(wear?: number | null): WearKey | null {
  if (wear === null || wear === undefined || !Number.isFinite(wear)) return null;
  if (wear < 0.07) return "fn";
  if (wear < 0.15) return "mw";
  if (wear < 0.38) return "ft";
  if (wear < 0.45) return "ww";
  return "bs";
}

/** Split `AK-47 | Slate (Field-Tested)` into its clean title + wear shortcut. */
export function splitMarketName(name: string): {
  title: string;
  wear: string;
} {
  const n = name || "";
  const exterior = n.match(
    /\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/i,
  );
  const wear = exterior
    ? WEAR_SHORTCUTS[exterior[1].toLowerCase()] ?? exterior[1]
    : "";
  const title = exterior ? n.slice(0, exterior.index).trim() : n;
  return { title, wear };
}

/** Lowest listed price in USD cents for an items-feed row. */
export function itemPriceCents(item: SkinportMarketItem): number | null {
  if (item.min_price === null || item.min_price === undefined) return null;
  return Math.round(item.min_price * 100);
}

/** Suggested price in USD cents for an items-feed row. */
export function itemSuggestedCents(item: SkinportMarketItem): number | null {
  if (item.suggested_price === null || item.suggested_price === undefined) {
    return null;
  }
  return Math.round(item.suggested_price * 100);
}

/** Signed discount of the sale price vs the suggested price (negative = deal). */
export function saleDiscountPercent(sale: SkinportSale): number | null {
  if (!sale.suggestedPrice || sale.suggestedPrice <= 0) return null;
  return ((sale.salePrice - sale.suggestedPrice) / sale.suggestedPrice) * 100;
}

/** Stable identity of a feed sale (`market hash name` + exact float). */
export function saleIdentity(sale: SkinportSale): string {
  const wear =
    sale.wear !== null && sale.wear !== undefined ? String(sale.wear) : "";
  return `${sale.marketHashName}::${wear}`;
}
