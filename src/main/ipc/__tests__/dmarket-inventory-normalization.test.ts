import { describe, it, expect } from "vitest";
import {
  resolveDmarketTitle,
  resolveDmarketImageUrl,
  resolveDmarketAssetId,
  resolveDmarketPriceCents,
  formatAsUuid,
  findDmarketUuid,
} from "../dmarket.ipc";
import {
  getItemListingPriceWithMap,
  getTradeTitle,
} from "../../../renderer/screens/Dmarket/DmarketWorkstation";
import { ListingPriceInfo } from "../../../shared/types";

describe("DMarket Inventory & Offer Normalization Engine", () => {
  describe("resolveDmarketTitle", () => {
    it("should resolve title from standard title property", () => {
      expect(
        resolveDmarketTitle({ title: "AK-47 | Redline (Field-Tested)" }),
      ).toBe("AK-47 | Redline (Field-Tested)");
    });

    it("should resolve title from PascalCase Title (as in closed targets / buy order history)", () => {
      expect(
        resolveDmarketTitle({ Title: "AWP | Asiimov (Field-Tested)" }),
      ).toBe("AWP | Asiimov (Field-Tested)");
    });

    it("should resolve title from marketHashName / MarketHashName / market_hash_name", () => {
      expect(
        resolveDmarketTitle({
          marketHashName: "M4A4 | The Emperor (Factory New)",
        }),
      ).toBe("M4A4 | The Emperor (Factory New)");
      expect(
        resolveDmarketTitle({
          MarketHashName: "USP-S | Printstream (Minimal Wear)",
        }),
      ).toBe("USP-S | Printstream (Minimal Wear)");
      expect(
        resolveDmarketTitle({
          market_hash_name: "Glock-18 | Water Elemental (Field-Tested)",
        }),
      ).toBe("Glock-18 | Water Elemental (Field-Tested)");
    });

    it("should resolve title from assetTitle, extra.name, or attributes.title", () => {
      expect(
        resolveDmarketTitle({
          assetTitle: "Desert Eagle | Blaze (Factory New)",
        }),
      ).toBe("Desert Eagle | Blaze (Factory New)");
      expect(
        resolveDmarketTitle({
          extra: { name: "MP9 | Mount Fuji (Minimal Wear)" },
        }),
      ).toBe("MP9 | Mount Fuji (Minimal Wear)");
      expect(
        resolveDmarketTitle({
          attributes: { title: "SSG 08 | Dragonfire (Field-Tested)" },
        }),
      ).toBe("SSG 08 | Dragonfire (Field-Tested)");
    });

    it("should reconstruct wear condition in parentheses if missing from title but in attributes", () => {
      const itemWithExt = {
        title: "AK-47 | Slate",
        attributes: { exterior: "field-tested" },
      };
      expect(resolveDmarketTitle(itemWithExt)).toBe(
        "AK-47 | Slate (Field-Tested)",
      );

      const itemWithFn = {
        Title: "M4A1-S | Cyrex",
        attributes: { cs2: { exterior: "exterior_factory_new" } },
      };
      expect(resolveDmarketTitle(itemWithFn)).toBe(
        "M4A1-S | Cyrex (Factory New)",
      );
    });

    it("should reconstruct StatTrak prefix if flagged in attributes", () => {
      const stItem = {
        title: "AK-47 | Cartel (Field-Tested)",
        attributes: { cs2: { category: "CATEGORY_STATTRACK" } },
      };
      expect(resolveDmarketTitle(stItem)).toBe(
        "StatTrak™ AK-47 | Cartel (Field-Tested)",
      );
    });

    it("should return CS2 Item fallback when no title properties exist", () => {
      expect(resolveDmarketTitle({})).toBe("CS2 Item");
      expect(resolveDmarketTitle(null)).toBe("CS2 Item");
    });
  });

  describe("resolveDmarketImageUrl", () => {
    it("should preserve full http/https URLs", () => {
      const url =
        "https://steamcommunity-a.akamaihd.net/economy/image/example.png";
      expect(resolveDmarketImageUrl({ imageUrl: url })).toBe(url);
      expect(resolveDmarketImageUrl({ image: url })).toBe(url);
      expect(resolveDmarketImageUrl({ Image: url })).toBe(url);
    });

    it("should correctly prefix relative Steam CDN economy image hashes", () => {
      const hash =
        "-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5Ape";
      const expected = `https://community.cloudflare.steamstatic.com/economy/image/${hash}`;
      expect(resolveDmarketImageUrl({ image: hash })).toBe(expected);
      expect(resolveDmarketImageUrl({ imageUrl: hash })).toBe(expected);
      expect(resolveDmarketImageUrl({ attributes: { image: hash } })).toBe(
        expected,
      );
    });

    it("should fall back to Steam API endpoint using resolved item title", () => {
      const item = { title: "AK-47 | Redline (Field-Tested)" };
      const expected = `https://api.steamapis.com/image/item/730/${encodeURIComponent("AK-47 | Redline (Field-Tested)")}`;
      expect(resolveDmarketImageUrl(item)).toBe(expected);
    });
  });

  describe("formatAsUuid & findDmarketUuid", () => {
    it("should validate and format standard hyphenated UUIDs", () => {
      const validUuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      expect(formatAsUuid(validUuid)).toBe(validUuid);
      expect(formatAsUuid("  F47AC10B-58CC-4372-A567-0E02B2C3D479  ")).toBe(
        validUuid,
      );
    });

    it("should format 32-hex character strings into standard 8-4-4-4-12 UUID format", () => {
      const raw32 = "f47ac10b58cc4372a5670e02b2c3d479";
      expect(formatAsUuid(raw32)).toBe("f47ac10b-58cc-4372-a567-0e02b2c3d479");
    });

    it("should return null for non-UUID strings", () => {
      expect(formatAsUuid("45641473210")).toBeNull();
      expect(formatAsUuid("12345")).toBeNull();
      expect(formatAsUuid("")).toBeNull();
      expect(formatAsUuid(null)).toBeNull();
      expect(formatAsUuid(undefined)).toBeNull();
    });

    it("should find UUID across top-level and nested properties", () => {
      const uuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
      expect(findDmarketUuid({ itemId: uuid })).toBe(uuid);
      expect(findDmarketUuid({ id: uuid })).toBe(uuid);
      expect(findDmarketUuid({ extra: { itemId: uuid } })).toBe(uuid);
      expect(findDmarketUuid({ attributes: { id: uuid } })).toBe(uuid);
      expect(findDmarketUuid({ assetId: "45641473210", itemId: uuid })).toBe(
        uuid,
      );
    });

    it("should NEVER return owner or depositor user account UUIDs as item UUID", () => {
      const ownerUuid = "285238bf-b360-4f0a-a964-24b015c28123";
      const depositorUuid = "5f8a1c3e-9b2d-4e6f-8a1b-2c3d4e5f6a7b";
      const steamItem = {
        attributes: {
          owner: ownerUuid,
          depositor: depositorUuid,
          inGameAssetId: "8808581868:7993040398:53564593299:730",
          id: "8808581868:7993040398:53564593299:730",
        },
        inMarket: false,
      };
      expect(findDmarketUuid(steamItem)).toBeNull();
      // resolveDmarketAssetId must resolve to the unique inGameAssetId, NOT the owner UUID!
      expect(resolveDmarketAssetId(steamItem)).toBe(
        "8808581868:7993040398:53564593299:730",
      );
    });

    it("should ensure multiple Steam items for the same owner resolve distinct asset IDs", () => {
      const ownerUuid = "285238bf-b360-4f0a-a964-24b015c28123";
      const itemA = {
        attributes: {
          owner: ownerUuid,
          inGameAssetId: "1111:2222:3333:730",
        },
        inMarket: false,
      };
      const itemB = {
        attributes: {
          owner: ownerUuid,
          inGameAssetId: "4444:5555:6666:730",
        },
        inMarket: false,
      };
      const idA = resolveDmarketAssetId(itemA);
      const idB = resolveDmarketAssetId(itemB);
      expect(idA).toBe("1111:2222:3333:730");
      expect(idB).toBe("4444:5555:6666:730");
      expect(idA).not.toBe(idB);
      expect(idA).not.toBe(ownerUuid);
    });
  });

  describe("resolveDmarketAssetId", () => {
    it("should strictly prioritize UUID over numeric Steam asset ID when both are present", () => {
      const uuid = "d4b8e2a0-4f51-4c12-8821-39e2309f3e41";
      const itemWithBoth = {
        assetId: "45641473210",
        itemId: uuid,
      };
      // DMarket offers:batchCreate requires UUID in requests[i].asset_id
      expect(resolveDmarketAssetId(itemWithBoth)).toBe(uuid);

      const itemWithIdUuid = {
        assetId: "45641473210",
        id: uuid,
      };
      expect(resolveDmarketAssetId(itemWithIdUuid)).toBe(uuid);

      const itemWithNestedUuid = {
        assetId: "45641473210",
        extra: { itemId: uuid },
      };
      expect(resolveDmarketAssetId(itemWithNestedUuid)).toBe(uuid);
    });

    it("should resolve assetId across various naming conventions when no UUID is present", () => {
      expect(resolveDmarketAssetId({ assetId: "12345" })).toBe("12345");
      expect(resolveDmarketAssetId({ AssetId: "67890" })).toBe("67890");
      expect(resolveDmarketAssetId({ asset_id: "11121" })).toBe("11121");
      expect(resolveDmarketAssetId({ itemId: "33344" })).toBe("33344");
      expect(
        resolveDmarketAssetId({ attributes: { inGameAssetId: "99999" } }),
      ).toBe("99999");
    });
  });

  describe("resolveDmarketPriceCents", () => {
    it("should resolve price in cents from different DMarket price objects", () => {
      expect(resolveDmarketPriceCents({ priceCents: 1550 })).toBe(1550);
      expect(resolveDmarketPriceCents({ price_cents: "2300" })).toBe(2300);
      expect(resolveDmarketPriceCents({ PriceCents: 4500 })).toBe(4500);
      expect(resolveDmarketPriceCents({ price: { amount: "12.50" } })).toBe(
        1250,
      );
      expect(resolveDmarketPriceCents({ price: { USD: "1850" } })).toBe(1850);
    });
  });

  describe("getItemListingPriceWithMap & getTradeTitle", () => {
    const mockListingPriceMap: Record<string, ListingPriceInfo> = {
      "AK-47 | Redline (Field-Tested)": {
        listingPrice: 19.5,
        mode: "aggressive",
        offsetPercent: -1,
        lowestPrice: 19.7,
        averagePrice: 20.0,
      },
      "AWP | Asiimov (Field-Tested)": {
        listingPrice: 95.0,
        mode: "normal",
        offsetPercent: 0,
        lowestPrice: 95.0,
        averagePrice: 96.5,
      },
    };

    it("should match price directly with exact title", () => {
      const item = { title: "AK-47 | Redline (Field-Tested)" };
      const price = getItemListingPriceWithMap(item, mockListingPriceMap);
      expect(price?.listingPrice).toBe(19.5);
    });

    it("should match price when DMarket returns PascalCase Title", () => {
      const item = { Title: "AWP | Asiimov (Field-Tested)" };
      const price = getItemListingPriceWithMap(item, mockListingPriceMap);
      expect(price?.listingPrice).toBe(95.0);
    });

    it("should match price when wear is in attributes instead of title string", () => {
      const item = {
        title: "AK-47 | Redline",
        attributes: { exterior: "field-tested" },
      };
      const price = getItemListingPriceWithMap(item, mockListingPriceMap);
      expect(price?.listingPrice).toBe(19.5);
    });

    it("should match price case-insensitively", () => {
      const item = { title: "ak-47 | redline (field-tested)" };
      const price = getItemListingPriceWithMap(item, mockListingPriceMap);
      expect(price?.listingPrice).toBe(19.5);
    });

    it("getTradeTitle should properly resolve title and wear condition", () => {
      expect(getTradeTitle({ Title: "AK-47 | Redline (Field-Tested)" })).toBe(
        "AK-47 | Redline (Field-Tested)",
      );
      expect(
        getTradeTitle({
          title: "M4A4 | Buzz Kill",
          attributes: { exterior: "Minimal Wear" },
        }),
      ).toBe("M4A4 | Buzz Kill (Minimal Wear)");
    });
  });
});
