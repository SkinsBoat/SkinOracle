import { describe, it, expect } from "vitest";
import {
  toCanonicalMarketId,
  getMarketDisplayName,
  isMarketMatch,
  isTradeMarket,
  CANONICAL_MARKETS,
} from "../canonicalMarkets";
import { CS2CAP_PROVIDERS } from "../cs2capProviders";

describe("Canonical Market Registry & Normalization Engine", () => {
  it("should normalize Skinsnipe market IDs to standard canonical IDs", () => {
    expect(toCanonicalMarketId("csgofloat")).toBe("csfloat");
    expect(toCanonicalMarketId("csmoney_p2p")).toBe("csmoney_market");
    expect(toCanonicalMarketId("csmoney_trade")).toBe("csmoney_trade");
    expect(toCanonicalMarketId("tradeitgg")).toBe("tradeit_trade");
    expect(toCanonicalMarketId("tradeitgg_store")).toBe("tradeit_store");
    expect(toCanonicalMarketId("market_csgo")).toBe("market_csgo");
    expect(toCanonicalMarketId("manncostore")).toBe("mannco");
    expect(toCanonicalMarketId("whitemarket")).toBe("whitemarket");
    expect(toCanonicalMarketId("dmarket")).toBe("dmarket");
    expect(toCanonicalMarketId("avanmarket")).toBe("avanmarket");
  });

  it("should normalize CS2Cap backend enum IDs to standard canonical IDs", () => {
    expect(toCanonicalMarketId("csfloat")).toBe("csfloat");
    expect(toCanonicalMarketId("buff163")).toBe("buff163");
    expect(toCanonicalMarketId("buffmarket")).toBe("buffmarket");
    expect(toCanonicalMarketId("csmoney_m")).toBe("csmoney_market");
    expect(toCanonicalMarketId("csmoney_t")).toBe("csmoney_trade");
    expect(toCanonicalMarketId("marketcsgo")).toBe("market_csgo");
    expect(toCanonicalMarketId("mannco")).toBe("mannco");
    expect(toCanonicalMarketId("tradeit")).toBe("tradeit_store");
    expect(toCanonicalMarketId("youpin")).toBe("youpin");
    expect(toCanonicalMarketId("skinscom")).toBe("skinscom");
  });

  it("should correctly match markets across different provider spellings", () => {
    expect(isMarketMatch("csgofloat", "csfloat")).toBe(true);
    expect(isMarketMatch("csfloat", "csgofloat")).toBe(true);
    expect(isMarketMatch("csmoney_p2p", "csmoney_m")).toBe(true);
    expect(isMarketMatch("csmoney_trade", "csmoney_t")).toBe(true);
    expect(isMarketMatch("market_csgo", "marketcsgo")).toBe(true);
    expect(isMarketMatch("tradeitgg_store", "tradeit")).toBe(true);
    expect(isMarketMatch("tradeitgg", "tradeit_trade")).toBe(true);
    expect(isMarketMatch("tradeitgg", "tradeit")).toBe(false);
    expect(isMarketMatch("manncostore", "mannco")).toBe(true);
    expect(isMarketMatch("csfloat", "dmarket")).toBe(false);
  });

  it("should produce polished human-readable display names", () => {
    expect(getMarketDisplayName("csgofloat")).toBe("CSFloat");
    expect(getMarketDisplayName("csfloat")).toBe("CSFloat");
    expect(getMarketDisplayName("buff163")).toBe("BUFF163");
    expect(getMarketDisplayName("csmoney_m")).toBe("CS.MONEY (Market)");
    expect(getMarketDisplayName("csmoney_p2p")).toBe("CS.MONEY (Market)");
    expect(getMarketDisplayName("marketcsgo")).toBe("Market.CSGO");
    expect(getMarketDisplayName("tradeit")).toBe("Tradeit.gg");
    expect(getMarketDisplayName("tradeitgg_store")).toBe("Tradeit.gg");
    expect(getMarketDisplayName("tradeitgg")).toBe("Tradeit.gg (Trade)");
    expect(getMarketDisplayName("steam")).toBe("Steam Community Market");
    expect(getMarketDisplayName("skinscom")).toBe("Skins.com");
  });

  it("should cover all 41 CS2Cap providers in the canonical registry", () => {
    for (const provider of CS2CAP_PROVIDERS) {
      const canonicalId = toCanonicalMarketId(provider.id);
      expect(canonicalId).toBeDefined();
      expect(canonicalId.length).toBeGreaterThan(0);
      const displayName = getMarketDisplayName(provider.id);
      expect(displayName).toBeDefined();
      expect(displayName.length).toBeGreaterThan(0);
    }
  });

  it("should accurately identify trade markets vs real cash/p2p markets", () => {
    // Trade bot / swap markets
    expect(isTradeMarket("csmoney_trade")).toBe(true);
    expect(isTradeMarket("csmoney_t")).toBe(true);
    expect(isTradeMarket("tradeitgg")).toBe(true);
    expect(isTradeMarket("tradeit_trade")).toBe(true);
    expect(isTradeMarket("cstrade")).toBe(true);
    expect(isTradeMarket("itradegg")).toBe(true);
    expect(isTradeMarket("skinswap_trade")).toBe(true);
    expect(isTradeMarket("skinswap_t")).toBe(true);
    expect(isTradeMarket("swapgg")).toBe(true);
    expect(isTradeMarket("lootfarm")).toBe(true);
    expect(isTradeMarket("pirateswap")).toBe(true);
    expect(isTradeMarket("rapidskins")).toBe(true);
    expect(isTradeMarket("skinsmonkey")).toBe(true);

    // Cash / P2P / standard marketplace markets (must NOT be trade markets)
    expect(isTradeMarket("tradeit")).toBe(false); // CS2Cap cash store
    expect(isTradeMarket("tradeitgg_store")).toBe(false); // Skinsnipe cash store
    expect(isTradeMarket("tradeit_store")).toBe(false);
    expect(isTradeMarket("csfloat")).toBe(false);
    expect(isTradeMarket("csgofloat")).toBe(false);
    expect(isTradeMarket("buff163")).toBe(false);
    expect(isTradeMarket("dmarket")).toBe(false);
    expect(isTradeMarket("csmoney_p2p")).toBe(false);
    expect(isTradeMarket("csmoney_m")).toBe(false);
    expect(isTradeMarket("skinport")).toBe(false);
    expect(isTradeMarket("steam")).toBe(false);
    expect(isTradeMarket("lisskins")).toBe(false);
    expect(isTradeMarket("skinland")).toBe(false);
    expect(isTradeMarket("skinflow")).toBe(false);
    expect(isTradeMarket("shadowpay")).toBe(false);
    expect(isTradeMarket("avanmarket")).toBe(false);
    expect(isTradeMarket("waxpeer")).toBe(false);
    expect(isTradeMarket("whitemarket")).toBe(false);
  });

  it("should gracefully handle unknown or custom market names", () => {
    expect(toCanonicalMarketId("future_market_xyz")).toBe("future_market_xyz");
    expect(getMarketDisplayName("future_market_xyz")).toBe("Future Market Xyz");
    expect(toCanonicalMarketId("")).toBe("");
    expect(getMarketDisplayName("")).toBe("Unknown Market");
  });
});
