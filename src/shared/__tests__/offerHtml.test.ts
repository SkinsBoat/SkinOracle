import { describe, it, expect } from "vitest";
import {
  buildOfferHtml,
  maskSteamId,
  maskSteamIdsInText,
} from "../offerHtml";
import { RaidOfferPayload } from "../types/raid.types";

// Synthetic 17-digit id — never a real account.
const STEAM_ID = "76561190000000001";

describe("offerHtml", () => {
  it("masks a SteamID to its last 5 characters", () => {
    expect(maskSteamId(STEAM_ID)).toBe("************00001");
    expect(maskSteamId(undefined)).toBe("");
  });

  it("masks a SteamID embedded in a storefront URL", () => {
    expect(
      maskSteamIdsInText(`https://csfloat.com/stall/${STEAM_ID}`),
    ).toBe("https://csfloat.com/stall/************00001");
  });

  it("never emits a full SteamID anywhere in the offer document", () => {
    const payload: RaidOfferPayload = {
      seller: {
        name: `Seller ${STEAM_ID}`,
        marketplace: "csfloat",
        url: `https://csfloat.com/stall/${STEAM_ID}`,
        steamId: STEAM_ID,
      },
      generatedAt: "2026-10-17T00:00:00Z",
      rows: [
        {
          marketHashName: "AK-47 | Redline (Field-Tested)",
          marketplace: "csfloat",
          listingPrice: 20,
          buyCeiling: 15,
          difference: -5,
          belowCeiling: false,
        },
      ],
      summary: {
        itemCount: 1,
        ceilingTotal: 15,
        listingTotal: 20,
        belowCeilingCount: 0,
      },
    };

    const html = buildOfferHtml(payload);

    expect(html).not.toContain(STEAM_ID);
    expect(html).not.toMatch(/\d{15,20}/);
    expect(html).toContain("************00001");
    expect(html).toContain("PURCHASE OFFER");
  });
});
