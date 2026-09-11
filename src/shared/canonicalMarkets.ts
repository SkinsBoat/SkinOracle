/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical Market Registry & Normalization Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides a single source of truth for CS2 marketplaces across all data sources
 * (Skinsnipe, CS2Cap, Pricempire, Steam, and offline JSON caches).
 *
 * Guarantees that:
 * 1. Market IDs are normalized to clean, consistent canonical IDs across the app.
 * 2. Workstations (CSFloat, DMarket, Skins.com) and SoClose scanners always match.
 * 3. UI tables and charts display unified human-readable names.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface CanonicalMarketInfo {
  /** Authoritative internal identifier used throughout our app and workstations */
  id: string;
  /** Polished human-readable name for UI display */
  name: string;
  /** Known raw strings emitted by external providers/APIs */
  aliases: string[];
  /** True if this is a trade-bot / swap platform with marked-up virtual credit pricing */
  isTradeMarket?: boolean;
}

export const CANONICAL_MARKETS: CanonicalMarketInfo[] = [
  {
    id: "csfloat",
    name: "CSFloat",
    aliases: ["csgofloat", "csfloat", "cs_float"],
  },
  { id: "buff163", name: "BUFF163", aliases: ["buff163", "buff_163", "buff"] },
  {
    id: "buffmarket",
    name: "BUFF.Market",
    aliases: ["buffmarket", "buff_market"],
  },
  { id: "dmarket", name: "DMarket", aliases: ["dmarket", "d_market"] },
  {
    id: "steam",
    name: "Steam Community Market",
    aliases: ["steam", "steam_market", "scm"],
  },
  {
    id: "csmoney_market",
    name: "CS.MONEY (Market)",
    aliases: ["csmoney_m", "csmoney_p2p", "csmoney_market"],
  },
  {
    id: "csmoney_trade",
    name: "CS.MONEY (Trade)",
    aliases: ["csmoney_t", "csmoney_trade"],
    isTradeMarket: true,
  },
  {
    id: "tradeit_store",
    name: "Tradeit.gg",
    aliases: ["tradeit", "tradeitgg_store", "tradeit_store", "tradeit_s"],
  },
  {
    id: "tradeit_trade",
    name: "Tradeit.gg (Trade)",
    aliases: ["tradeitgg", "tradeitgg_trade", "tradeit_t", "tradeit_trade"],
    isTradeMarket: true,
  },
  {
    id: "market_csgo",
    name: "Market.CSGO",
    aliases: ["marketcsgo", "market_csgo", "market-csgo"],
  },
  { id: "skinport", name: "Skinport", aliases: ["skinport", "skin_port"] },
  { id: "skinscom", name: "Skins.com", aliases: ["skinscom", "skins_com"] },
  {
    id: "lisskins",
    name: "LIS-SKINS",
    aliases: ["lisskins", "lis_skins", "lis-skins"],
  },
  {
    id: "skinland",
    name: "Skin.Land",
    aliases: ["skinland", "skin_land", "skin-land"],
  },
  { id: "skinflow", name: "Skinflow", aliases: ["skinflow", "skin_flow"] },
  { id: "shadowpay", name: "ShadowPay", aliases: ["shadowpay", "shadow_pay"] },
  {
    id: "skinswap_market",
    name: "SkinSwap (Market)",
    aliases: ["skinswap", "skinswap_market", "skinswap_m"],
  },
  {
    id: "skinswap_trade",
    name: "SkinSwap (Trade)",
    aliases: ["skinswap_t", "skinswap_trade"],
    isTradeMarket: true,
  },
  {
    id: "avanmarket",
    name: "Avan.Market",
    aliases: ["avanmarket", "avan_market", "avan"],
  },
  { id: "c5", name: "C5GAME", aliases: ["c5", "c5game"] },
  {
    id: "cstrade",
    name: "CS.Trade",
    aliases: ["cstrade", "cs_trade"],
    isTradeMarket: true,
  },
  { id: "csdeals", name: "CS.Deals", aliases: ["csdeals", "cs_deals"] },
  { id: "ecosteam", name: "ECOSteam", aliases: ["ecosteam", "eco_steam"] },
  { id: "youpin", name: "Youpin898", aliases: ["youpin", "youpin898"] },
  {
    id: "whitemarket",
    name: "white.market",
    aliases: ["whitemarket", "white_market", "white.market"],
  },
  { id: "waxpeer", name: "WAXPEER", aliases: ["waxpeer", "wax_peer"] },
  {
    id: "mannco",
    name: "Mannco.store",
    aliases: ["mannco", "manncostore", "mannco_store"],
  },
  { id: "exeskins", name: "ExeSkins", aliases: ["exeskins", "exe_skins"] },
  {
    id: "itradegg",
    name: "iTrade.gg",
    aliases: ["itradegg", "itrade"],
    isTradeMarket: true,
  },
  {
    id: "pirateswap",
    name: "PirateSwap",
    aliases: ["pirateswap", "pirate_swap"],
    isTradeMarket: true,
  },
  {
    id: "rapidskins",
    name: "RapidSkins",
    aliases: ["rapidskins", "rapid_skins"],
    isTradeMarket: true,
  },
  { id: "skinbaron", name: "SkinBaron", aliases: ["skinbaron", "skin_baron"] },
  { id: "skinout", name: "SkinOut", aliases: ["skinout", "skin_out"] },
  { id: "skinplace", name: "SkinPlace", aliases: ["skinplace", "skin_place"] },
  {
    id: "skinsmonkey",
    name: "SkinsMonkey",
    aliases: ["skinsmonkey", "skins_monkey"],
    isTradeMarket: true,
  },
  { id: "skinvault", name: "Skinvault", aliases: ["skinvault", "skin_vault"] },
  {
    id: "swapgg",
    name: "Swap.gg",
    aliases: ["swapgg", "swap_gg", "swap"],
    isTradeMarket: true,
  },
  { id: "dupefi", name: "Dupe.fi", aliases: ["dupefi", "dupe_fi", "dupe.fi"] },
  { id: "gameboost", name: "GameBoost", aliases: ["gameboost", "game_boost"] },
  { id: "haloskins", name: "HaloSkins", aliases: ["haloskins", "halo_skins"] },
  {
    id: "lootfarm",
    name: "LOOT.Farm",
    aliases: ["lootfarm", "loot_farm", "loot.farm"],
    isTradeMarket: true,
  },
  {
    id: "merchanttf",
    name: "Merchant TF",
    aliases: ["merchanttf", "merchant_tf"],
  },
];

/** Fast lookup map from any lowercase alias -> CanonicalMarketInfo */
const ALIAS_MAP: Map<string, CanonicalMarketInfo> = new Map();
const CANONICAL_MAP: Map<string, CanonicalMarketInfo> = new Map();

for (const market of CANONICAL_MARKETS) {
  CANONICAL_MAP.set(market.id.toLowerCase(), market);
  for (const alias of market.aliases) {
    ALIAS_MAP.set(alias.toLowerCase(), market);
  }
}

/**
 * Normalizes any raw provider string (e.g. 'csgofloat', 'csmoney_p2p', 'marketcsgo')
 * to its authoritative CanonicalMarketId (e.g. 'csfloat', 'csmoney_market', 'market_csgo').
 *
 * If the input is unrecognized, returns a sanitized lowercase trimmed version.
 */
export function toCanonicalMarketId(
  rawMarketId: string | null | undefined,
): string {
  if (!rawMarketId || typeof rawMarketId !== "string") return "";
  const cleaned = rawMarketId.trim().toLowerCase();
  const matched = ALIAS_MAP.get(cleaned) || CANONICAL_MAP.get(cleaned);
  return matched ? matched.id : cleaned;
}

/**
 * Returns the human-readable display name for any raw or canonical market identifier.
 * (e.g. 'csgofloat' -> 'CSFloat', 'buff163' -> 'BUFF163', 'csmoney_m' -> 'CS.MONEY (Market)').
 */
export function getMarketDisplayName(
  marketId: string | null | undefined,
): string {
  if (!marketId || typeof marketId !== "string") return "Unknown Market";
  const cleaned = marketId.trim().toLowerCase();
  const matched = ALIAS_MAP.get(cleaned) || CANONICAL_MAP.get(cleaned);
  if (matched) return matched.name;

  // Fallback title-cased representation
  return cleaned
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Checks whether two market identifiers refer to the same underlying marketplace.
 * Example: isMarketMatch('csgofloat', 'csfloat') === true
 */
export function isMarketMatch(
  rawIdA: string | null | undefined,
  rawIdB: string | null | undefined,
): boolean {
  if (!rawIdA || !rawIdB) return false;
  return toCanonicalMarketId(rawIdA) === toCanonicalMarketId(rawIdB);
}

/**
 * Checks whether a raw or canonical market identifier belongs to a trade-bot / swap platform
 * with inflated virtual credit pricing (e.g. CS.MONEY Trade, Tradeit.gg, CSTrade, etc.).
 * These markets distort price averaging and should be excluded from Oracle valuation.
 */
export function isTradeMarket(marketId: string | null | undefined): boolean {
  if (!marketId || typeof marketId !== "string") return false;
  const raw = marketId.trim().toLowerCase();
  // Tradeit store / CS2Cap tradeit is cash/market, NOT a trade-bot
  if (
    raw === "tradeit" ||
    raw === "tradeitgg_store" ||
    raw === "tradeit_store" ||
    raw === "tradeit_s"
  ) {
    return false;
  }

  const canonicalId = toCanonicalMarketId(marketId);
  const matched = CANONICAL_MAP.get(canonicalId.toLowerCase());
  if (matched?.isTradeMarket) return true;

  return (
    raw === "csmoney_t" ||
    raw === "csmoney_trade" ||
    raw === "tradeitgg" ||
    raw === "tradeitgg_trade" ||
    raw === "tradeit_t" ||
    raw === "tradeit_trade" ||
    raw === "cstrade" ||
    raw === "cs_trade" ||
    raw === "itradegg" ||
    raw === "itrade" ||
    raw === "skinswap_t" ||
    raw === "skinswap_trade" ||
    raw === "swapgg" ||
    raw === "lootfarm" ||
    raw === "pirateswap" ||
    raw === "rapidskins" ||
    raw === "skinsmonkey"
  );
}

