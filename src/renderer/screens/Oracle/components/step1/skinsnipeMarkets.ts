import { SkinsnipeMarketId } from "../../../../../shared/types";

/**
 * Authoritative Skinsnipe market catalog exposed by the Skinsnipe Standard Plan.
 * Kept in its own module so both the Step 1 shell and the Skinsnipe provider
 * panel can consume it without importing the whole workstation component.
 */
export const SKINSNIPE_AVAILABLE_MARKETS: {
  id: SkinsnipeMarketId;
  name: string;
}[] = [
  { id: "avanmarket", name: "AvanMarket" },
  { id: "buffmarket", name: "BUFF.Market" },
  { id: "csgofloat", name: "CSFloat" },
  { id: "csmoney_p2p", name: "CS.MONEY P2P" },
  { id: "csmoney_trade", name: "CS.MONEY Trade" },
  { id: "cstrade", name: "CSTrade" },
  { id: "dmarket", name: "DMarket" },
  { id: "exeskins", name: "ExeSkins" },
  { id: "itradegg", name: "iTradeGG" },
  { id: "lisskins", name: "LisSkins" },
  { id: "manncostore", name: "ManncoStore" },
  { id: "market_csgo", name: "Market CSGO" },
  { id: "merchanttf", name: "Merchant TF" },
  { id: "shadowpay", name: "ShadowPay" },
  { id: "skinbaron", name: "SkinBaron" },
  { id: "skinflow", name: "SkinFlow" },
  { id: "skinland", name: "SkinLand" },
  { id: "skinport", name: "Skinport" },
  { id: "skinsmonkey", name: "SkinsMonkey" },
  { id: "skinswap", name: "SkinSwap" },
  { id: "tradeitgg", name: "Tradeit.GG" },
  { id: "tradeitgg_store", name: "Tradeit.GG Store" },
  { id: "waxpeer", name: "Waxpeer" },
  { id: "whitemarket", name: "WhiteMarket" },
];
