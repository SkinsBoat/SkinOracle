export interface Cs2CapProviderInfo {
  id: string;
  name: string;
}

/**
 * Authoritative provider catalog supported by CS2Cap for live prices (lowest asks).
 * Total: 41 providers matching CS2Cap's exact backend enum identifiers.
 */
export const CS2CAP_PROVIDERS: Cs2CapProviderInfo[] = [
  { id: "avanmarket", name: "Avan.Market" },
  { id: "buff163", name: "BUFF163" },
  { id: "buffmarket", name: "BUFF.Market" },
  { id: "c5", name: "C5GAME" },
  { id: "csdeals", name: "CS.Deals" },
  { id: "csfloat", name: "CSFloat" },
  { id: "csmoney_m", name: "CS.MONEY - Market" },
  { id: "csmoney_t", name: "CS.MONEY - Trade" },
  { id: "cstrade", name: "CS.Trade" },
  { id: "dmarket", name: "DMarket" },
  { id: "dupefi", name: "Dupe.fi" },
  { id: "ecosteam", name: "ECOSteam" },
  { id: "gameboost", name: "GameBoost" },
  { id: "haloskins", name: "HaloSkins" },
  { id: "itradegg", name: "iTrade.gg" },
  { id: "lisskins", name: "LIS-SKINS" },
  { id: "lootfarm", name: "LOOT.Farm" },
  { id: "mannco", name: "Mannco.store" },
  { id: "marketcsgo", name: "Market.CSGO" },
  { id: "pirateswap", name: "PirateSwap" },
  { id: "rapidskins", name: "RapidSkins" },
  { id: "shadowpay", name: "ShadowPay" },
  { id: "skinbaron", name: "SkinBaron" },
  { id: "skinflow", name: "Skinflow" },
  { id: "skinland", name: "Skin.Land" },
  { id: "skinout", name: "SkinOut" },
  { id: "skinplace", name: "SkinPlace" },
  { id: "skinport", name: "Skinport" },
  { id: "skinscom", name: "Skins.com" },
  { id: "skinsmonkey", name: "SkinsMonkey" },
  { id: "skinswap", name: "SkinSwap - Market" },
  { id: "skinswap_t", name: "SkinSwap - Trade" },
  { id: "skinvault", name: "Skinvault" },
  { id: "steam", name: "Steam" },
  { id: "swapgg", name: "Swap.gg" },
  { id: "tradeit", name: "Tradeit.gg" },
  { id: "waxpeer", name: "WAXPEER" },
  { id: "whitemarket", name: "white.market" },
  { id: "youpin", name: "Youpin898" },
];

export const DEFAULT_CS2CAP_PROVIDERS = CS2CAP_PROVIDERS.map((p) => p.id);
