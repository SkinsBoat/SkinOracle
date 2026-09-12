import { describe, it, expect } from "vitest";
import {
  getMarketItemUrl,
  handleCsfloatReferenceLink,
  handleDmarketReferenceLink,
  handleWaxpeerReferenceLink,
  handleAvanMarketReferenceLink,
  handleTradeitReferenceLink,
  handleSkinflowReferenceLink,
  handleWhiteMarketReferenceLink,
  handleLisSkinsReferenceLink,
  handleCsgoMarketReferenceLink,
  handleShadowPayReferenceLink,
  handleManncoReferenceLink,
  handleSkinlandReferenceLink,
  handleBuffMarketReferenceLink,
  handleSkinsComReferenceLink,
  handleSkinBaronReferenceLink,
} from "../marketUrls";

describe("Market Link Generators", () => {
  it("handleCsfloatReferenceLink formats canonical item names properly", () => {
    expect(handleCsfloatReferenceLink("AK-47 | Redline (Field-Tested)")).toBe(
      "https://csfloat.com/search?market_hash_name=AK-47%20%7C%20Redline%20(Field-Tested)&sort_by=lowest_price",
    );
  });

  it("handleDmarketReferenceLink handles StatTrak vs normal category flags", () => {
    expect(handleDmarketReferenceLink("StatTrak™ AK-47 | Redline (FT)")).toBe(
      "https://dmarket.com/ingame-items/item-list/csgo-skins?category_0=stattrak_tm&title=StatTrak%E2%84%A2%20AK-47%20%7C%20Redline%20(FT)",
    );
    expect(handleDmarketReferenceLink("AK-47 | Redline (FT)")).toBe(
      "https://dmarket.com/ingame-items/item-list/csgo-skins?category_1=not_souvenir&category_0=not_stattrak_tm&title=AK-47%20%7C%20Redline%20(FT)",
    );
  });

  it("handleWaxpeerReferenceLink creates search query link with exact search format", () => {
    expect(handleWaxpeerReferenceLink("Glock-18 | Shinobu (Factory New)")).toBe(
      "https://waxpeer.com/?game=csgo&sort=ASC&order=price&all=0&exact=0&search=Glock-18%20%7C%20Shinobu%20(Factory%20New)",
    );
  });

  it("handleLisSkinsReferenceLink creates clean item slug links on lis-skins.com", () => {
    expect(handleLisSkinsReferenceLink("Glock-18 | Shinobu (Factory New)")).toBe(
      "https://lis-skins.com/market/csgo/glock-18-shinobu-factory-new/",
    );
    expect(handleLisSkinsReferenceLink("StatTrak™ Glock-18 | Shinobu (Factory New)")).toBe(
      "https://lis-skins.com/market/csgo/stattrak-glock-18-shinobu-factory-new/",
    );
  });

  it("handleSkinflowReferenceLink formats Skinflow search query with stattrak/souvenir flags", () => {
    expect(handleSkinflowReferenceLink("Glock-18 | Shinobu (Factory New)")).toBe(
      "https://skinflow.gg/buy?search=Glock-18+|+Shinobu+(Factory+New)&sort_by=offered&offered=lte:2500000&trade_lock=0&stattrak=0&souvenir=0",
    );
    expect(handleSkinflowReferenceLink("StatTrak™ Glock-18 | Shinobu (Factory New)")).toBe(
      "https://skinflow.gg/buy?search=StatTrak™+Glock-18+|+Shinobu+(Factory+New)&sort_by=offered&offered=lte:2500000&trade_lock=0&stattrak=1",
    );
    expect(handleSkinflowReferenceLink("Souvenir Glock-18 | Shinobu (Factory New)")).toBe(
      "https://skinflow.gg/buy?search=Souvenir+Glock-18+|+Shinobu+(Factory+New)&sort_by=offered&offered=lte:2500000&trade_lock=0&souvenir=1",
    );
  });

  it("handleWhiteMarketReferenceLink formats item link with appId and nameHash", () => {
    expect(handleWhiteMarketReferenceLink("Glock-18 | Shinobu (Factory New)")).toBe(
      "https://white.market/item?appId=730&nameHash=Glock-18%20%7C%20Shinobu%20(Factory%20New)",
    );
  });

  it("handleCsgoMarketReferenceLink formats Market.CSGO search query with categories filter", () => {
    expect(handleCsgoMarketReferenceLink("Glock-18 | Shinobu (Factory New)")).toBe(
      "https://market.csgo.com/en/?search=Glock-18%20%7C%20Shinobu%20(Factory%20New)&categories=Normal",
    );
    expect(handleCsgoMarketReferenceLink("StatTrak™ Glock-18 | Shinobu (Factory New)")).toBe(
      "https://market.csgo.com/en/?search=StatTrak%E2%84%A2%20Glock-18%20%7C%20Shinobu%20(Factory%20New)&categories=StatTrak%E2%84%A2",
    );
    expect(handleCsgoMarketReferenceLink("Souvenir Glock-18 | Shinobu (Factory New)")).toBe(
      "https://market.csgo.com/en/?search=Souvenir%20Glock-18%20%7C%20Shinobu%20(Factory%20New)&categories=Souvenir",
    );
  });

  it("handleShadowPayReferenceLink formats exteriors, is_stattrak, and is_souvenir params correctly", () => {
    expect(handleShadowPayReferenceLink("Glock-18 | Shinobu (Factory New)")).toBe(
      "https://shadowpay.com/csgo-items?exteriors=%5B%22Factory%20New%22%5D&price_from=0&price_to=100000&is_stattrak=0&hold_days&sort_column=price&sort_dir=asc&search=Glock-18+%7C+Shinobu",
    );
    expect(handleShadowPayReferenceLink("StatTrak™ Glock-18 | Shinobu (Factory New)")).toBe(
      "https://shadowpay.com/csgo-items?exteriors=%5B%22Factory%20New%22%5D&price_from=0&price_to=100000&is_stattrak=1&hold_days&sort_column=price&sort_dir=asc&search=Glock-18+%7C+Shinobu",
    );
    expect(handleShadowPayReferenceLink("Souvenir Glock-18 | Shinobu (Factory New)")).toBe(
      "https://shadowpay.com/csgo-items?exteriors=%5B%22Factory%20New%22%5D&price_from=0&price_to=100000&is_stattrak&is_souvenir=1&hold_days&sort_column=price&sort_dir=asc&search=Glock-18+%7C+Shinobu",
    );
  });

  it("handleTradeitReferenceLink handles StatTrak and Souvenir params correctly", () => {
    expect(handleTradeitReferenceLink("Glock-18 | Shinobu (Factory New)")).toBe(
      "https://tradeit.gg/csgo/store?statTrak=No+StatTrak&search=Glock-18+%7C+Shinobu+(Factory+New)",
    );
    expect(handleTradeitReferenceLink("StatTrak™ Glock-18 | Shinobu (Factory New)")).toBe(
      "https://tradeit.gg/csgo/store?statTrak=Has+StatTrak&souvenir=No+Souvenir&search=StatTrak%E2%84%A2+Glock-18+%7C+Shinobu+(Factory+New)",
    );
    expect(handleTradeitReferenceLink("Souvenir Glock-18 | Shinobu (Factory New)")).toBe(
      "https://tradeit.gg/csgo/store?statTrak=No+StatTrak&souvenir=Has+Souvenir&search=Souvenir+Glock-18+%7C+Shinobu+(Factory+New)",
    );
  });

  it("handleManncoReferenceLink formats item slug links properly", () => {
    expect(handleManncoReferenceLink("Glock-18 | Shinobu (Factory New)")).toBe(
      "https://mannco.store/item/730-glock-18-shinobu-factory-new",
    );
    expect(handleManncoReferenceLink("StatTrak™ Bowie Knife | Autotronic (Factory New)")).toBe(
      "https://mannco.store/item/730-stattrak-bowie-knife-autotronic-factory-new",
    );
  });

  it("handleSkinlandReferenceLink formats skin.land cs2 market slug links", () => {
    expect(handleSkinlandReferenceLink("★ Driver Gloves | Black Tie (Factory New)")).toBe(
      "https://skin.land/market/cs2/%E2%98%85-driver-gloves-black-tie-factory-new",
    );
    expect(handleSkinlandReferenceLink("Glock-18 | Shinobu (Factory New)")).toBe(
      "https://skin.land/market/cs2/glock-18-shinobu-factory-new",
    );
  });

  it("handleBuffMarketReferenceLink formats goods/cs2 direct item links", () => {
    expect(handleBuffMarketReferenceLink("★ StatTrak™ Bowie Knife | Autotronic (Factory New)")).toBe(
      "https://buff.market/market/goods/cs2/%E2%98%85%20StatTrak%E2%84%A2%20Bowie%20Knife%20%7C%20Autotronic%20(Factory%20New)",
    );
    expect(handleBuffMarketReferenceLink("Glock-18 | Shinobu (Factory New)")).toBe(
      "https://buff.market/market/goods/cs2/Glock-18%20%7C%20Shinobu%20(Factory%20New)",
    );
  });

  it("handleSkinsComReferenceLink formats skins.com item URLs with exterior and st query params", () => {
    expect(handleSkinsComReferenceLink("StatTrak™ Glock-18 | Shinobu (Factory New)")).toBe(
      "https://skins.com/item/glock-18-shinobu?exterior=fn&st=true",
    );
    expect(handleSkinsComReferenceLink("StatTrak™ Bowie Knife | Autotronic (Factory New)")).toBe(
      "https://skins.com/item/bowie-knife-autotronic?exterior=fn&st=true",
    );
    expect(handleSkinsComReferenceLink("Bowie Knife | Autotronic (Factory New)")).toBe(
      "https://skins.com/item/bowie-knife-autotronic?exterior=fn",
    );
    expect(handleSkinsComReferenceLink("★ Driver Gloves | Black Tie (Factory New)")).toBe(
      "https://skins.com/item/driver-gloves-black-tie?exterior=fn",
    );
  });

  it("handleSkinBaronReferenceLink formats SkinBaron category/weapon/skin/exterior URLs", () => {
    expect(handleSkinBaronReferenceLink("Glock-18 | Shinobu (Factory New)")).toBe(
      "https://skinbaron.de/en/csgo/Pistol/Glock-18/Shinobu/Factory-New?sort=CF",
    );
    expect(handleSkinBaronReferenceLink("StatTrak™ Glock-18 | Shinobu (Factory New)")).toBe(
      "https://skinbaron.de/en/csgo/Pistol/Glock-18/Shinobu/Factory-New?sort=CF&statTrak=true",
    );
    expect(handleSkinBaronReferenceLink("StatTrak™ Bowie Knife | Autotronic (Factory New)")).toBe(
      "https://skinbaron.de/en/csgo/Knife/Bowie-Knife/Autotronic/Factory-New?sort=CF&statTrak=true",
    );
    expect(handleSkinBaronReferenceLink("★ Driver Gloves | Black Tie (Factory New)")).toBe(
      "https://skinbaron.de/en/csgo/Gloves/Driver-Gloves/Black-Tie/Factory-New?sort=CF",
    );
    expect(handleSkinBaronReferenceLink("StatTrak™ Bowie Knife | Autotronic (Field-Tested)")).toBe(
      "https://skinbaron.de/en/csgo/Knife/Bowie-Knife/Autotronic/Field-Tested?sort=CF&statTrak=true",
    );
  });

  it("getMarketItemUrl dispatches properly and resolves all supported platform aliases", () => {
    expect(getMarketItemUrl("dmarket", "AK-47 | Redline")).toContain("dmarket.com");
    expect(getMarketItemUrl("d_market", "AK-47 | Redline")).toContain("dmarket.com");
    expect(getMarketItemUrl("dmarket_target", "AK-47 | Redline")).toContain("dmarket.com");
    expect(getMarketItemUrl("dmarket_f", "AK-47 | Redline")).toContain("dmarket.com");
    expect(getMarketItemUrl("skinscom", "Glock-18 | Shinobu (Factory New)")).toContain("skins.com");
    expect(getMarketItemUrl("skinbaron", "Glock-18 | Shinobu (Factory New)")).toContain("skinbaron.de");
    expect(getMarketItemUrl("skinswap", "AK-47 | Redline")).toContain("skinswap.com");
    expect(getMarketItemUrl("skinswap_market", "AK-47 | Redline")).toContain("skinswap.com");
    expect(getMarketItemUrl("skinswap_trade", "AK-47 | Redline")).toContain("skinswap.com");
    expect(getMarketItemUrl("whitemarket", "AK-47 | Redline")).toContain("white.market");
    expect(getMarketItemUrl("skinflow", "AK-47 | Redline")).toContain("skinflow.gg");
    expect(getMarketItemUrl("mannco", "Glock-18 | Shinobu (Factory New)")).toContain("mannco.store");
    expect(getMarketItemUrl("skinland", "Glock-18 | Shinobu (Factory New)")).toContain("skin.land");
    expect(getMarketItemUrl("buffmarket", "Glock-18 | Shinobu (Factory New)")).toContain("buff.market");
    expect(getMarketItemUrl("unknown_market", "AK-47 | Redline")).toBeNull();
  });
});
