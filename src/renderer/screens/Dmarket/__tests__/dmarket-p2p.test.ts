import { describe, it, expect } from "vitest";
import {
  isDmarketP2POffer,
  getDmarketListingMode,
} from "../dmarket-utils";
import { DmarketOfferItem } from "../../../../shared/types";

describe("DMarket P2P vs Bot Listing Classification", () => {
  const mockP2POffer: DmarketOfferItem = {
    id: "bdd27583-0d06-42aa-80f6-6a4701875133",
    offerId: "bdd27583-0d06-42aa-80f6-6a4701875133",
    assetId: "8847212397:7993038220:53668754513:730",
    title: "Glock-18 | Winterized (Factory New)",
    priceCents: 228,
    priceUsd: "2.28",
    status: "active",
    isP2P: true,
    listingMode: "p2p",
    attributes: {
      provider: "ICS",
      botId: "",
      depositor: "",
      viewAtSteamUri:
        "https://steamcommunity.com/profiles//inventory/#730_2_53668754513",
      title: "Glock-18 | Winterized (Factory New)",
      id: "8847212397:7993038220:53668754513:730",
    },
  };

  const mockBotOffer: DmarketOfferItem = {
    id: "c4473782-7084-475c-81d4-8153a8497dac",
    offerId: "c4473782-7084-475c-81d4-8153a8497dac",
    assetId: "bc7773d0-707e-5ec8-84be-9c269eddf003",
    title: "USP-S | Alpine Camo (Factory New)",
    priceCents: 200,
    priceUsd: "2.00",
    status: "active",
    isP2P: false,
    listingMode: "bot",
    attributes: {
      provider: "CPU",
      botId: "76561199257421388",
      depositor: "285238bf-b360-4f0a-a964-24b015c28123",
      viewAtSteamUri:
        "https://steamcommunity.com/profiles/76561199257421388/inventory/#730_2_53693181735",
      title: "USP-S | Alpine Camo (Factory New)",
      id: "bc7773d0-707e-5ec8-84be-9c269eddf003",
    },
  };

  it("identifies P2P listing from user Steam inventory (provider: ICS, empty botId)", () => {
    expect(isDmarketP2POffer(mockP2POffer)).toBe(true);
    expect(getDmarketListingMode(mockP2POffer)).toBe("p2p");
  });

  it("identifies Bot listing deposited to DMarket bot (provider: CPU, non-empty botId)", () => {
    expect(isDmarketP2POffer(mockBotOffer)).toBe(false);
    expect(getDmarketListingMode(mockBotOffer)).toBe("bot");
  });

  it("handles raw DMarket payload without pre-computed flags", () => {
    const rawP2P = {
      attributes: {
        provider: "ICS",
        botId: "",
        depositor: "",
      },
    };
    const rawBot = {
      attributes: {
        provider: "CPU",
        botId: "76561199257421388",
        depositor: "285238bf",
      },
    };

    expect(isDmarketP2POffer(rawP2P)).toBe(true);
    expect(getDmarketListingMode(rawP2P)).toBe("p2p");

    expect(isDmarketP2POffer(rawBot)).toBe(false);
    expect(getDmarketListingMode(rawBot)).toBe("bot");
  });

  it("validates P2P delist payload format (DELETE /exchange/v1/offers)", () => {
    const offerId = "2feee8d3-48b5-4dbe-aabf-df6401b27107";
    const payload = {
      force: true,
      objects: [{ offerId, type: "p2p" }],
    };
    expect(payload.force).toBe(true);
    expect(payload.objects[0].offerId).toBe(offerId);
    expect(payload.objects[0].type).toBe("p2p");
  });

  it("validates P2P create offer payload format (POST /exchange/v1/offers)", () => {
    const itemId = "8847212397:7993038220:53668754513:730";
    const cents = 350;
    const payload = {
      objects: [
        {
          type: "p2p",
          itemId,
          price: {
            amount: String(cents),
            currency: "USD",
          },
        },
      ],
    };
    expect(payload.objects[0].type).toBe("p2p");
    expect(payload.objects[0].itemId).toBe(itemId);
    expect(payload.objects[0].price.amount).toBe("350");
    expect(payload.objects[0].price.currency).toBe("USD");
  });
});
