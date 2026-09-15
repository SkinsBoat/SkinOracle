import { ListingPriceInfo } from "../../../shared/types";
import {
  getMarketDisplayName,
  CANONICAL_MARKETS,
} from "../../../shared/canonicalMarkets";

export const MARKET_NAME_MAP: Record<string, string> = Object.fromEntries(
  CANONICAL_MARKETS.map((m) => [m.id, m.name]),
);

export const getHumanMarketName = (marketId: string): string => {
  return getMarketDisplayName(marketId);
};

export const getWearShortcut = (wear?: string): string => {
  if (!wear) return "";
  const w = wear.toLowerCase();
  if (w.includes("factory new") || w.includes("exterior_factory_new"))
    return "FN";
  if (w.includes("minimal wear") || w.includes("exterior_minimal_wear"))
    return "MW";
  if (w.includes("field-tested") || w.includes("exterior_field_tested"))
    return "FT";
  if (w.includes("well-worn") || w.includes("exterior_well_worn")) return "WW";
  if (w.includes("battle-scarred") || w.includes("exterior_battle_scarred"))
    return "BS";
  return wear;
};

export const getTradeTitle = (trade: any): string => {
  if (!trade) return "CS2 Item";
  let title =
    trade.title ||
    trade.Title ||
    trade.extra?.name ||
    trade.name ||
    "CS2 Item";

  title = String(title).trim();
  if (!title || title.toLowerCase() === "cs2 item") {
    return "CS2 Item";
  }

  // Reconstruct wear condition in parentheses if missing
  if (!title.match(/\([^)]+\)$/)) {
    const rawExt =
      trade.extra?.exterior ||
      trade.attributes?.exterior ||
      trade.cs2?.exterior ||
      trade.exterior ||
      "";
    const extStr = String(rawExt).toLowerCase().trim();
    let wearSuffix = "";
    if (
      extStr.includes("factory new") ||
      extStr.includes("exterior_factory_new") ||
      extStr === "fn"
    )
      wearSuffix = "(Factory New)";
    else if (
      extStr.includes("minimal wear") ||
      extStr.includes("exterior_minimal_wear") ||
      extStr === "mw"
    )
      wearSuffix = "(Minimal Wear)";
    else if (
      extStr.includes("field-tested") ||
      extStr.includes("field tested") ||
      extStr.includes("exterior_field_tested") ||
      extStr === "ft"
    )
      wearSuffix = "(Field-Tested)";
    else if (
      extStr.includes("well-worn") ||
      extStr.includes("well worn") ||
      extStr.includes("exterior_well_worn") ||
      extStr === "ww"
    )
      wearSuffix = "(Well-Worn)";
    else if (
      extStr.includes("battle-scarred") ||
      extStr.includes("battle scarred") ||
      extStr.includes("exterior_battle_scarred") ||
      extStr === "bs"
    )
      wearSuffix = "(Battle-Scarred)";

    if (wearSuffix) {
      title = `${title} ${wearSuffix}`;
    }
  }

  // Reconstruct StatTrak prefix if flagged in attributes
  const isStatTrak =
    trade.attributes?.cs2?.category === "CATEGORY_STATTRACK" ||
    trade.attributes?.category === "CATEGORY_STATTRACK" ||
    trade.attributes?.isStatTrak ||
    trade.attributes?.isStattrak ||
    trade.extra?.isStatTrak ||
    trade.extra?.isStattrak ||
    trade.isStatTrak;

  if (isStatTrak && !title.includes("StatTrak™")) {
    title = `StatTrak™ ${title}`;
  }

  return title;
};

/**
 * Flexible Oracle Listing Price lookup that handles case sensitivity,
 * alternate title properties, and missing exterior condition suffixes.
 */
export const getItemListingPriceWithMap = (
  item: any,
  priceMap?: Record<string, ListingPriceInfo>,
): ListingPriceInfo | undefined => {
  if (!item || !priceMap || Object.keys(priceMap).length === 0)
    return undefined;

  const possibleTitles = [
    item.title,
    item.Title,
    item.extra?.name,
    item.name,
  ].filter(Boolean) as string[];

  // 1. Direct exact match
  for (const t of possibleTitles) {
    if (priceMap[t]) return priceMap[t];
  }

  // 2. Reconstruct wear condition if title does not contain "(...)"
  for (const t of possibleTitles) {
    const raw = String(t).trim();
    if (!raw.match(/\([^)]+\)$/)) {
      const rawExt =
        item.extra?.exterior ||
        item.attributes?.exterior ||
        item.cs2?.exterior ||
        item.exterior ||
        "";
      const extStr = String(rawExt).toLowerCase().trim();
      let wearSuffix = "";
      if (
        extStr.includes("factory new") ||
        extStr.includes("exterior_factory_new") ||
        extStr === "fn"
      )
        wearSuffix = "(Factory New)";
      else if (
        extStr.includes("minimal wear") ||
        extStr.includes("exterior_minimal_wear") ||
        extStr === "mw"
      )
        wearSuffix = "(Minimal Wear)";
      else if (
        extStr.includes("field-tested") ||
        extStr.includes("field tested") ||
        extStr.includes("exterior_field_tested") ||
        extStr === "ft"
      )
        wearSuffix = "(Field-Tested)";
      else if (
        extStr.includes("well-worn") ||
        extStr.includes("well worn") ||
        extStr.includes("exterior_well_worn") ||
        extStr === "ww"
      )
        wearSuffix = "(Well-Worn)";
      else if (
        extStr.includes("battle-scarred") ||
        extStr.includes("battle scarred") ||
        extStr.includes("exterior_battle_scarred") ||
        extStr === "bs"
      )
        wearSuffix = "(Battle-Scarred)";

      if (wearSuffix) {
        const reconstructed = `${raw} ${wearSuffix}`;
        if (priceMap[reconstructed]) return priceMap[reconstructed];
      }
    }
  }

  // 3. Case-insensitive fallback
  const mapKeys = Object.keys(priceMap);
  for (const t of possibleTitles) {
    const lower = String(t).toLowerCase().trim();
    const foundKey = mapKeys.find((k) => k.toLowerCase() === lower);
    if (foundKey) return priceMap[foundKey];
  }

  return undefined;
};

export const getTradePrice = (trade: any): string => {
  if (!trade) return "—";
  if (trade.priceUSD && trade.priceUSD !== "—") return trade.priceUSD;

  // DMarket standard price representation:
  // 1. price: { DMC: "", USD: "6786" } (cents)
  // 2. priceCents: 6786
  const rawUsd =
    trade.price?.USD ??
    trade.Price?.USD ??
    trade.priceCents ??
    trade._raw?.price?.USD;

  if (rawUsd !== undefined && rawUsd !== null && rawUsd !== "") {
    const num = typeof rawUsd === "number" ? rawUsd : parseFloat(String(rawUsd));
    if (!isNaN(num)) {
      const str = String(rawUsd);
      return str.includes(".") ? num.toFixed(2) : (num / 100).toFixed(2);
    }
  }

  return "—";
};

export const getTradeAmount = (trade: any): string => {
  return String(trade?.Amount || trade?.amount || "1");
};

export const getTradeDate = (trade: any): string => {
  const ts =
    trade?.ClosedAt ??
    trade?.closedAt ??
    trade?.ClosedTime ??
    trade?.closedTime ??
    trade?.CreatedAt ??
    trade?.createdAt;
  if (!ts) return "Recent";
  const num = typeof ts === "number" ? ts : parseInt(String(ts), 10);
  if (isNaN(num)) return String(ts);
  const sec = num > 1e11 ? Math.floor(num / 1000) : num;
  return new Date(sec * 1000).toLocaleString();
};

export type { TargetAnalysis, SoCloseResultItem } from "../../../shared/types";

export const formatItemFloat = (item: any): string | null => {
  if (!item) return null;

  // Direct DMarket CS2 float: item.cs2.floatValue (e.g. "0.07147438824176788")
  const rawFloat =
    item.cs2?.floatValue ??
    item.cs2?.float ??
    item._raw?.cs2?.floatValue ??
    item._raw?.cs2?.float ??
    item.attributes?.cs2?.floatValue ??
    item.attributes?.cs2?.float ??
    item.attributes?.float ??
    item.float;

  if (
    rawFloat !== undefined &&
    rawFloat !== null &&
    rawFloat !== ""
  ) {
    const num =
      typeof rawFloat === "number"
        ? rawFloat
        : parseFloat(String(rawFloat));
    if (!isNaN(num) && num >= 0 && num <= 1) {
      return num.toFixed(4);
    }
  }

  // Float Part sub-range bucket (e.g. "MW-0" or "FLOAT_PART_FN_4" -> "FN-4")
  const rawPart =
    item.cs2?.floatPartValue ??
    item._raw?.cs2?.floatPartValue ??
    item.attributes?.cs2?.floatPart ??
    item.attributes?.floatPart;

  if (rawPart && typeof rawPart === "string") {
    const cleanPart = rawPart
      .replace(/^FLOAT_PART_/i, "")
      .replace(/_/g, "-")
      .trim();
    if (cleanPart && !cleanPart.toLowerCase().includes("unspecified")) {
      return cleanPart;
    }
  }

  return null;
};

/**
 * Authoritative check if a DMarket listing offer or inventory item is in P2P mode
 * (listed directly from the user's Steam inventory, rather than deposited to DMarket bot custody).
 *
 * Hallmarks of P2P:
 * - provider === 'ICS' (In-Client / Steam inventory) vs 'CPU' (Central Platform Unit / Bot)
 * - botId is empty string ("")
 * - depositor is empty string ("")
 */
export const isDmarketP2POffer = (offer: any): boolean => {
  if (!offer) return false;
  if (typeof offer.isP2P === "boolean") return offer.isP2P;
  if (offer.listingMode === "p2p") return true;
  if (offer.listingMode === "bot") return false;

  // DMarket returns provider directly on item (provider: "ICS" for P2P, "CPU" for Bot)
  const provider =
    offer.provider ??
    offer._raw?.provider ??
    offer.attributes?.provider;

  if (provider === "ICS") return true;
  if (provider === "CPU") return false;

  const attrs =
    offer.attributes ||
    offer.extra ||
    offer._raw?.attributes ||
    offer._raw?.extra ||
    {};

  if (attrs.provider === "ICS") return true;
  if (attrs.provider === "CPU") return false;

  if (typeof attrs.botId === "string") {
    return attrs.botId.trim() === "";
  }

  if (attrs.depositor === "" && !attrs.botId) {
    return true;
  }

  return false;
};

export const getDmarketListingMode = (offer: any): "p2p" | "bot" => {
  return isDmarketP2POffer(offer) ? "p2p" : "bot";
};

/**
 * Authoritative resolver for DMarket instant sell price (highest active buy order / instant cashout).
 * DMarket returns instantPrice as:
 * { "DMC": "", "USD": "6289" } where USD is integer cents ("6289" cents -> $62.89)
 * or in some endpoints as numbers or decimal strings.
 */
export const resolveInstantPrice = (item: any): number | null => {
  if (!item) return null;

  if (typeof item.instantPriceUsd === "number" && item.instantPriceUsd > 0) {
    return item.instantPriceUsd;
  }

  // DMarket standard item structure: "instantPrice": { "DMC": "", "USD": "6289" }
  const rawUsd =
    item.instantPrice?.USD ??
    item.instantPrice?.usd ??
    item._raw?.instantPrice?.USD ??
    item._raw?.instantPrice?.usd;

  if (rawUsd === undefined || rawUsd === null || rawUsd === "") return null;

  const str = String(rawUsd).trim();
  if (!str) return null;

  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) return null;

  // If decimal point exists (e.g. "62.89"), it's in dollars; otherwise DMarket returns cents ("6289" -> 62.89)
  return str.includes(".") ? num : num / 100;
};

export {
  parseCooldownSeconds,
  formatCooldown,
  loadStoredCooldowns,
  saveStoredCooldowns,
  type CooldownEntry,
} from "./utils/cooldownUtils";
