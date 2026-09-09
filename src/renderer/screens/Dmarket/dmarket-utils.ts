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
    trade.Title ||
    trade.title ||
    trade.marketHashName ||
    trade.MarketHashName ||
    trade.market_hash_name ||
    trade.name ||
    trade.Name ||
    trade.assetTitle ||
    trade.AssetTitle ||
    trade.extra?.name ||
    trade.extra?.title ||
    trade.attributes?.title ||
    trade.attributes?.Title ||
    trade.attributes?.marketHashName ||
    trade.attributes?.MarketHashName ||
    trade.attributes?.market_hash_name ||
    trade.attributes?.name ||
    trade.attributes?.assetTitle ||
    "CS2 Item";

  title = String(title).trim();
  if (!title || title.toLowerCase() === "cs2 item") {
    return "CS2 Item";
  }

  // Reconstruct wear condition in parentheses if missing
  if (!title.match(/\([^)]+\)$/)) {
    const rawExt =
      trade.attributes?.exterior ||
      trade.attributes?.cs2?.exterior ||
      trade.extra?.exterior ||
      trade.exterior ||
      trade.attributes?.Exterior ||
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
    item.marketHashName,
    item.MarketHashName,
    item.market_hash_name,
    item.name,
    item.Name,
    item.assetTitle,
    item.AssetTitle,
    item.extra?.name,
    item.attributes?.title,
    item.attributes?.marketHashName,
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
        item.attributes?.exterior ||
        item.attributes?.cs2?.exterior ||
        item.extra?.exterior ||
        item.exterior ||
        item.attributes?.Exterior ||
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

  const priceObj = trade.Price || trade.price;
  let raw: any = undefined;

  if (priceObj && typeof priceObj === "object") {
    raw =
      priceObj.Amount ??
      priceObj.amount ??
      priceObj.USD ??
      priceObj.usd ??
      priceObj.price ??
      priceObj.Price;
  } else if (typeof priceObj === "number" || typeof priceObj === "string") {
    raw = priceObj;
  }

  if (raw === undefined || raw === null || raw === "") {
    raw =
      trade.PriceCents ??
      trade.priceCents ??
      trade.PriceAmount ??
      trade.priceAmount ??
      trade.AmountCents ??
      trade.amountCents;
  }

  if (raw === undefined || raw === null || raw === "") return "—";

  const num = typeof raw === "number" ? raw : parseFloat(String(raw));
  if (isNaN(num)) return "—";

  const str = String(raw);
  if (str.includes(".")) return num.toFixed(2);
  if (priceObj?.USD !== undefined || priceObj?.usd !== undefined || num >= 50) {
    return (num / 100).toFixed(2);
  }
  return num.toFixed(2);
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

export interface TargetAnalysis {
  acceptedPrice: number;
  liquidityScore: number;
  isHyperLiquid: boolean;
  currentPrice: number;
  trendMomentum14d?: number;
}

export interface SoCloseResultItem {
  name: string;
  acceptedPrice: number;
  currentMarketPrice: number;
  closeness: number;
  closenessPercent: number;
  hasExistingTarget: boolean;
  iconUrl?: string;
  trendMomentum14d?: number;
}

export const formatItemFloat = (item: any): string | null => {
  if (!item) return null;
  const attr = item.attributes || {};
  const cs2 = attr.cs2 || {};
  const extra = item.extra || {};

  // 1. Direct decimal float value (e.g. "0.049684781581163406" or 0.04968)
  const candidateFloat =
    cs2.float ??
    attr.float ??
    item.float ??
    extra.floatValue ??
    attr.floatValue;

  if (
    candidateFloat !== undefined &&
    candidateFloat !== null &&
    candidateFloat !== ""
  ) {
    const num =
      typeof candidateFloat === "number"
        ? candidateFloat
        : parseFloat(String(candidateFloat));
    if (!isNaN(num) && num >= 0 && num <= 1) {
      return num.toFixed(4);
    }
  }

  // 2. Float Part / Sub-range bucket fallback (e.g. "FLOAT_PART_FN_4" -> "FN-4")
  const candidatePart =
    cs2.floatPart ??
    attr.floatPart ??
    attr.floatPartValue ??
    extra.floatPartValue;

  if (candidatePart && typeof candidatePart === "string") {
    const cleanPart = candidatePart
      .replace(/^FLOAT_PART_/i, "")
      .replace(/_/g, "-")
      .trim();
    if (cleanPart && !cleanPart.toLowerCase().includes("unspecified")) {
      return cleanPart;
    }
  }

  return null;
};
