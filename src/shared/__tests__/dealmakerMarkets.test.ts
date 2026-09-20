import { describe, it, expect } from "vitest";
import {
  DEALMAKER_MARKET_IDS,
  DEALMAKER_STORE_LINK_MARKETS,
  getDealMakerMarket,
  normalizeDealMakerMarketId,
  supportsStoreLink,
  validateDealMakerLink,
} from "../dealmakerMarkets";

describe("DealMaker market registry", () => {
  it("exposes the expected broadcast markets", () => {
    expect(DEALMAKER_MARKET_IDS).toEqual(
      expect.arrayContaining([
        "csfloat",
        "dmarket",
        "skinscom",
        "csmoney_market",
        "skinport",
      ]),
    );
  });

  it("excludes Skins.com from store-link markets", () => {
    const ids = DEALMAKER_STORE_LINK_MARKETS.map((m) => m.id);
    expect(ids).not.toContain("skinscom");
    expect(ids).toEqual(
      expect.arrayContaining([
        "csfloat",
        "dmarket",
        "csmoney_market",
        "skinport",
      ]),
    );
  });

  it("normalizes aliases and resolves configs", () => {
    expect(normalizeDealMakerMarketId("cs.money")).toBe("csmoney_market");
    expect(normalizeDealMakerMarketId("skin_port")).toBe("skinport");
    expect(normalizeDealMakerMarketId("nope")).toBeNull();
    expect(getDealMakerMarket("csmoney")?.name).toBe("CS.MONEY (Market)");
  });

  it("knows which markets support store links", () => {
    expect(supportsStoreLink("csfloat")).toBe(true);
    expect(supportsStoreLink("skinscom")).toBe(false);
  });

  describe("validateDealMakerLink", () => {
    it("accepts CSFloat listing and store links", () => {
      expect(
        validateDealMakerLink("csfloat", "listing", "https://csfloat.com/item/1")
          .valid,
      ).toBe(true);
      expect(
        validateDealMakerLink(
          "csfloat",
          "store",
          "https://csfloat.com/stall/76561190000000000",
        ).valid,
      ).toBe(true);
    });

    it("rejects insecure and mismatched links", () => {
      expect(
        validateDealMakerLink("csfloat", "listing", "http://csfloat.com/item/1")
          .valid,
      ).toBe(false);
      expect(
        validateDealMakerLink("csfloat", "listing", "https://dmarket.com/x")
          .valid,
      ).toBe(false);
    });

    it("validates CS.MONEY and Skinport store links", () => {
      expect(
        validateDealMakerLink(
          "csmoney",
          "store",
          "https://cs.money/market/buy/?steamId=76561190000000000",
        ).valid,
      ).toBe(true);
      expect(
        validateDealMakerLink("skinport", "store", "https://skinport.com/shop/32aG0oR")
          .valid,
      ).toBe(true);
      expect(
        validateDealMakerLink("skinport", "store", "https://skinport.com/shop")
          .valid,
      ).toBe(false);
    });

    it("validates Skins.com listing links", () => {
      expect(
        validateDealMakerLink("skinscom", "listing", "https://skins.com/item/abc")
          .valid,
      ).toBe(true);
    });

    it("validates Skinport item links (https://skinport.com/i/<code>)", () => {
      expect(
        validateDealMakerLink("skinport", "listing", "https://skinport.com/i/YBAOM21G1QC")
          .valid,
      ).toBe(true);
      expect(
        validateDealMakerLink(
          "skinport",
          "listing",
          "https://skinport.com/item/m4a4-dragon-king-minimal-wear/85566973",
        ).valid,
      ).toBe(true);
      expect(
        validateDealMakerLink("skinport", "listing", "https://skinport.com/i/")
          .valid,
      ).toBe(false);
    });

    it("rejects store links for Skins.com", () => {
      const result = validateDealMakerLink(
        "skinscom",
        "store",
        "https://skins.com/store/1",
      );
      expect(result.valid).toBe(false);
      expect(result.message).toContain("does not support store links");
    });
  });
});
