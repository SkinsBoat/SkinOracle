import {
  csfloatLogo,
  skinsLogo,
  lisSkinsLogo,
  dmarketLogo,
  waxpeerLogo,
  avanMarketLogo,
  skinflowLogo,
  skinoutLogo,
  csgoMarketLogo,
  whiteMarketLogo,
  tradeItLogo,
  skinSwapLogo,
  skinportLogo,
  csmoneyLogo,
  buffLogo,
  buff163Logo,
  c5gameLogo,
  csdealsLogo,
  cstradeLogo,
  dupefiLogo,
  ecosteamLogo,
  haloSkinsLogo,
  itradeggLogo,
  manncoLogo,
  pirateSwapLogo,
  rapidSkinsLogo,
  shadowPayLogo,
  skinBaronLogo,
  skinLandLogo,
  skinPlaceLogo,
  skinsMonkeyLogo,
  skinVaultLogo,
  swapggLogo,
  youpinLogo,
} from "../../../assets/images";
import { toCanonicalMarketId } from "../../shared/canonicalMarkets";

/**
 * Authoritative mapping of marketplace identifiers (canonical & common raw aliases)
 * to their respective logo image assets.
 */
export const MARKET_LOGOS: Record<string, string> = {
  // CSFloat
  csfloat: csfloatLogo,
  csgofloat: csfloatLogo,
  cs_float: csfloatLogo,

  // Buff
  buff163: buff163Logo,
  buff_163: buff163Logo,
  buffmarket: buffLogo,
  buff_market: buffLogo,
  buff: buffLogo,

  // DMarket
  dmarket: dmarketLogo,
  d_market: dmarketLogo,

  // CS.MONEY
  csmoney: csmoneyLogo,
  csmoney_market: csmoneyLogo,
  csmoney_p2p: csmoneyLogo,
  csmoney_m: csmoneyLogo,
  csmoney_trade: csmoneyLogo,
  csmoney_t: csmoneyLogo,

  // Tradeit
  tradeit: tradeItLogo,
  tradeitgg: tradeItLogo,
  tradeit_store: tradeItLogo,
  tradeitgg_store: tradeItLogo,
  tradeit_s: tradeItLogo,
  tradeit_trade: tradeItLogo,
  tradeitgg_trade: tradeItLogo,
  tradeit_t: tradeItLogo,

  // Market CSGO
  market_csgo: csgoMarketLogo,
  marketcsgo: csgoMarketLogo,
  "market-csgo": csgoMarketLogo,

  // Skinport
  skinport: skinportLogo,
  skin_port: skinportLogo,

  // Skins.com
  skinscom: skinsLogo,
  skins_com: skinsLogo,
  skins: skinsLogo,

  // LisSkins
  lisskins: lisSkinsLogo,
  lis_skins: lisSkinsLogo,
  "lis-skins": lisSkinsLogo,

  // SkinLand
  skinland: skinLandLogo,
  skin_land: skinLandLogo,
  "skin-land": skinLandLogo,

  // Skinflow
  skinflow: skinflowLogo,
  skin_flow: skinflowLogo,

  // ShadowPay
  shadowpay: shadowPayLogo,
  shadow_pay: shadowPayLogo,

  // SkinSwap
  skinswap: skinSwapLogo,
  skinswap_market: skinSwapLogo,
  skinswap_m: skinSwapLogo,
  skinswap_trade: skinSwapLogo,
  skinswap_t: skinSwapLogo,

  // AvanMarket
  avanmarket: avanMarketLogo,
  avan_market: avanMarketLogo,
  avan: avanMarketLogo,

  // C5GAME
  c5: c5gameLogo,
  c5game: c5gameLogo,

  // CS.Trade
  cstrade: cstradeLogo,
  cs_trade: cstradeLogo,

  // CS.Deals
  csdeals: csdealsLogo,
  cs_deals: csdealsLogo,

  // ECOSteam
  ecosteam: ecosteamLogo,
  eco_steam: ecosteamLogo,

  // Youpin
  youpin: youpinLogo,
  youpin898: youpinLogo,

  // WhiteMarket
  whitemarket: whiteMarketLogo,
  white_market: whiteMarketLogo,
  "white.market": whiteMarketLogo,

  // Waxpeer
  waxpeer: waxpeerLogo,
  wax_peer: waxpeerLogo,

  // Mannco.store
  mannco: manncoLogo,
  manncostore: manncoLogo,
  mannco_store: manncoLogo,
  monacostore: manncoLogo,

  // iTrade.gg
  itradegg: itradeggLogo,
  itrade: itradeggLogo,

  // PirateSwap
  pirateswap: pirateSwapLogo,
  pirate_swap: pirateSwapLogo,

  // RapidSkins
  rapidskins: rapidSkinsLogo,
  rapidskin: rapidSkinsLogo,
  rapid_skins: rapidSkinsLogo,

  // SkinBaron
  skinbaron: skinBaronLogo,
  skin_baron: skinBaronLogo,

  // SkinOut
  skinout: skinoutLogo,
  skin_out: skinoutLogo,

  // SkinPlace
  skinplace: skinPlaceLogo,
  skin_place: skinPlaceLogo,

  // SkinsMonkey
  skinsmonkey: skinsMonkeyLogo,
  skins_monkey: skinsMonkeyLogo,

  // Skinvault
  skinvault: skinVaultLogo,
  skin_vault: skinVaultLogo,

  // Swap.gg
  swapgg: swapggLogo,
  swap_gg: swapggLogo,
  swap: swapggLogo,

  // Dupe.fi
  dupefi: dupefiLogo,
  dupe_fi: dupefiLogo,
  "dupe.fi": dupefiLogo,

  // HaloSkins
  haloskins: haloSkinsLogo,
  halo_skins: haloSkinsLogo,
  holoskins: haloSkinsLogo,
};

/**
 * Returns the logo image URL for any market ID (canonical, raw provider alias, or display name).
 * Returns `null` if no custom logo is available.
 */
export function getMarketLogo(
  marketId: string | null | undefined,
): string | null {
  if (!marketId || typeof marketId !== "string") return null;

  const raw = marketId.trim().toLowerCase();
  if (MARKET_LOGOS[raw]) return MARKET_LOGOS[raw];

  // Try canonical mapping
  const canonical = toCanonicalMarketId(raw);
  if (canonical && MARKET_LOGOS[canonical]) {
    return MARKET_LOGOS[canonical];
  }

  // Sanitize punctuation (e.g. 'CS.MONEY' -> 'csmoney')
  const stripped = raw.replace(/[^a-z0-9]/g, "");
  if (MARKET_LOGOS[stripped]) return MARKET_LOGOS[stripped];

  return null;
}

/**
 * Extracts a crisp 2-character monogram for markets that lack an explicit logo or
 * while a fallback badge is displayed.
 */
export function getMarketInitials(
  marketIdOrName: string | null | undefined,
): string {
  if (!marketIdOrName || typeof marketIdOrName !== "string") return "MK";

  const cleaned = marketIdOrName.trim().replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  // CamelCase or PascalCase split (e.g. "ExeSkins" -> "ES", "GameBoost" -> "GB")
  const capitals = marketIdOrName.replace(/[^A-Z]/g, "");
  if (capitals.length >= 2) {
    return capitals.slice(0, 2).toUpperCase();
  }

  return cleaned.slice(0, 2).toUpperCase() || "MK";
}
