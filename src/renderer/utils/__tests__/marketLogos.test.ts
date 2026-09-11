import { describe, it, expect } from "vitest";
import { getMarketLogo, getMarketInitials } from "../marketLogos";

describe("getMarketLogo", () => {
  it("resolves canonical market IDs correctly", () => {
    expect(getMarketLogo("csfloat")).toBeTruthy();
    expect(getMarketLogo("buff163")).toBeTruthy();
    expect(getMarketLogo("buffmarket")).toBeTruthy();
    expect(getMarketLogo("dmarket")).toBeTruthy();
    expect(getMarketLogo("csmoney_market")).toBeTruthy();
    expect(getMarketLogo("csmoney_trade")).toBeTruthy();
    expect(getMarketLogo("tradeit_store")).toBeTruthy();
    expect(getMarketLogo("market_csgo")).toBeTruthy();
    expect(getMarketLogo("skinport")).toBeTruthy();
    expect(getMarketLogo("skinscom")).toBeTruthy();
    expect(getMarketLogo("lisskins")).toBeTruthy();
    expect(getMarketLogo("skinland")).toBeTruthy();
    expect(getMarketLogo("skinflow")).toBeTruthy();
    expect(getMarketLogo("shadowpay")).toBeTruthy();
    expect(getMarketLogo("avanmarket")).toBeTruthy();
    expect(getMarketLogo("c5")).toBeTruthy();
    expect(getMarketLogo("cstrade")).toBeTruthy();
    expect(getMarketLogo("csdeals")).toBeTruthy();
    expect(getMarketLogo("ecosteam")).toBeTruthy();
    expect(getMarketLogo("youpin")).toBeTruthy();
    expect(getMarketLogo("whitemarket")).toBeTruthy();
    expect(getMarketLogo("waxpeer")).toBeTruthy();
    expect(getMarketLogo("mannco")).toBeTruthy();
    expect(getMarketLogo("itradegg")).toBeTruthy();
    expect(getMarketLogo("pirateswap")).toBeTruthy();
    expect(getMarketLogo("rapidskins")).toBeTruthy();
    expect(getMarketLogo("skinbaron")).toBeTruthy();
    expect(getMarketLogo("skinout")).toBeTruthy();
    expect(getMarketLogo("skinplace")).toBeTruthy();
    expect(getMarketLogo("skinsmonkey")).toBeTruthy();
    expect(getMarketLogo("skinvault")).toBeTruthy();
    expect(getMarketLogo("swapgg")).toBeTruthy();
    expect(getMarketLogo("dupefi")).toBeTruthy();
    expect(getMarketLogo("haloskins")).toBeTruthy();
  });

  it("resolves external provider aliases and variations", () => {
    // Skinsnipe & CS2Cap aliases
    expect(getMarketLogo("csgofloat")).toBeTruthy();
    expect(getMarketLogo("csmoney_p2p")).toBeTruthy();
    expect(getMarketLogo("csmoney_t")).toBeTruthy();
    expect(getMarketLogo("tradeitgg")).toBeTruthy();
    expect(getMarketLogo("tradeitgg_store")).toBeTruthy();
    expect(getMarketLogo("marketcsgo")).toBeTruthy();
    expect(getMarketLogo("manncostore")).toBeTruthy();
    expect(getMarketLogo("monacostore")).toBeTruthy();
    expect(getMarketLogo("holoskins")).toBeTruthy();
    expect(getMarketLogo("rapidskin")).toBeTruthy();
    expect(getMarketLogo("c5game")).toBeTruthy();
  });

  it("handles case-insensitivity, spaces, and edge cases", () => {
    expect(getMarketLogo("  CSFloat  ")).toBeTruthy();
    expect(getMarketLogo("BUFF163")).toBeTruthy();
    expect(getMarketLogo("DMarket")).toBeTruthy();
    expect(getMarketLogo("")).toBeNull();
    expect(getMarketLogo(null)).toBeNull();
    expect(getMarketLogo(undefined)).toBeNull();
    expect(getMarketLogo("completely_unknown_platform_xyz")).toBeNull();
  });
});

describe("getMarketInitials", () => {
  it("extracts 2-letter monogram for multi-word or compound market names", () => {
    expect(getMarketInitials("Steam Community")).toBe("SC");
    expect(getMarketInitials("Tradeit GG")).toBe("TG");
    expect(getMarketInitials("ExeSkins")).toBe("ES");
    expect(getMarketInitials("GameBoost")).toBe("GB");
    expect(getMarketInitials("LootFarm")).toBe("LF");
    expect(getMarketInitials("Steam")).toBe("ST");
  });

  it("handles empty or null gracefully", () => {
    expect(getMarketInitials("")).toBe("MK");
    expect(getMarketInitials(null)).toBe("MK");
    expect(getMarketInitials(undefined)).toBe("MK");
  });
});
