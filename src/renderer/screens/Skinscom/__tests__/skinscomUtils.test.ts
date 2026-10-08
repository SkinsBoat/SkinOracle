import { describe, it, expect } from "vitest";
import {
  buildSkinscomImageUrl,
  chunkArray,
  classifySkinscomItem,
  computeCloseness,
  computeDeltaPercent,
  formatUsdFromCents,
  getWearShortcutFromFloat,
  getWearShortcutFromName,
  isListingOffTarget,
  isSoClose,
  isWeaponOrSticker,
  usdToCents,
} from "../utils/skinscomUtils";
import type { SkinscomListing } from "../../../../shared/types/skinscom.types";

const baseListing: SkinscomListing = {
  id: 1,
  market_name: "AWP | Asiimov (Well-Worn)",
  market_value: 16000,
  purchase_price: 16000,
  suggested_price: 20000,
  above_recommended_price: -20,
  price_is_unreliable: false,
  is_commodity: false,
  icon_url: "HASH123",
  name_color: "D2D2D2",
  preview_id: null,
  wear: 0.398,
  wear_name: "Well-Worn",
  stickers: [],
  blue_percentage: null,
  fade_percentage: null,
  auction_ends_at: null,
  auction_highest_bid: null,
  auction_number_of_bids: 0,
  published_at: "2026-09-24T17:11:43.378Z",
  marketplace_privacy_protection_level: "base",
  depositor_stats: {
    delivery_rate_recent: 1,
    delivery_rate_long: 1,
    delivery_time_minutes_recent: 5,
    delivery_time_minutes_long: 5,
    delivery_rate_status: null,
    steam_level_min_range: null,
    steam_level_max_range: null,
    user_has_trade_notifications_enabled: true,
    user_online_status: 1,
  },
};

describe("buildSkinscomImageUrl", () => {
  it("prefixes a bare Steam economy hash", () => {
    expect(buildSkinscomImageUrl("HASH123")).toBe(
      "https://community.cloudflare.steamstatic.com/economy/image/HASH123",
    );
  });

  it("passes through absolute URLs and handles empties", () => {
    expect(buildSkinscomImageUrl("https://cdn.example/x.png")).toBe(
      "https://cdn.example/x.png",
    );
    expect(buildSkinscomImageUrl("")).toBe("");
    expect(buildSkinscomImageUrl(null)).toBe("");
    expect(buildSkinscomImageUrl(undefined)).toBe("");
  });
});

describe("formatUsdFromCents", () => {
  it("formats integer cents as USD", () => {
    expect(formatUsdFromCents(16300)).toBe("$163.00");
    expect(formatUsdFromCents(5)).toBe("$0.05");
  });

  it("renders an em dash for missing values", () => {
    expect(formatUsdFromCents(null)).toBe("—");
    expect(formatUsdFromCents(undefined)).toBe("—");
    expect(formatUsdFromCents(NaN)).toBe("—");
  });
});

describe("usdToCents", () => {
  it("converts dollar inputs to rounded cents", () => {
    expect(usdToCents("163.00")).toBe(16300);
    expect(usdToCents("1.01")).toBe(101);
    expect(usdToCents(1.25)).toBe(125);
  });

  it("rejects non-positive or invalid input", () => {
    expect(usdToCents("0")).toBeNull();
    expect(usdToCents("-5")).toBeNull();
    expect(usdToCents("abc")).toBeNull();
  });
});

describe("chunkArray", () => {
  it("splits into fixed-size chunks (bulk endpoint cap of 20)", () => {
    const items = Array.from({ length: 45 }, (_, i) => i);
    const chunks = chunkArray(items, 20);
    expect(chunks.length).toBe(3);
    expect(chunks[0].length).toBe(20);
    expect(chunks[1].length).toBe(20);
    expect(chunks[2].length).toBe(5);
  });

  it("rejects a zero/negative chunk size", () => {
    expect(() => chunkArray([1, 2, 3], 0)).toThrow();
  });
});

describe("computeDeltaPercent / isListingOffTarget", () => {
  it("computes signed deviation from the sell target", () => {
    expect(computeDeltaPercent(10000, 20000)).toBe(-50);
    expect(computeDeltaPercent(22000, 20000)).toBe(10);
  });

  it("returns null when suggested price is missing", () => {
    expect(computeDeltaPercent(10000, null)).toBeNull();
    expect(computeDeltaPercent(10000, 0)).toBeNull();
  });

  it("flags listings beyond the threshold in either direction", () => {
    expect(isListingOffTarget(baseListing, 3)).toBe(true);
    expect(
      isListingOffTarget({ ...baseListing, market_value: 20500 }, 3),
    ).toBe(false);
    expect(
      isListingOffTarget({ ...baseListing, suggested_price: null }, 3),
    ).toBe(false);
  });
});

describe("computeCloseness / isSoClose (Buy Ceiling model)", () => {
  it("computes market price / buy ceiling", () => {
    expect(computeCloseness(10000, 10000)).toBe(1);
    expect(computeCloseness(10800, 10000)).toBeCloseTo(1.08, 5);
    expect(computeCloseness(9000, 10000)).toBe(0.9);
  });

  it("returns null without a valid ceiling", () => {
    expect(computeCloseness(10000, null)).toBeNull();
    expect(computeCloseness(10000, 0)).toBeNull();
  });

  it("flags So Close at or within the closeness threshold", () => {
    expect(isSoClose(1.0, 1.08)).toBe(true);
    expect(isSoClose(1.08, 1.08)).toBe(true);
    expect(isSoClose(1.09, 1.08)).toBe(false);
    expect(isSoClose(null, 1.08)).toBe(false);
  });
});

describe("classifySkinscomItem", () => {
  it("classifies weapon skins by wear suffix", () => {
    expect(classifySkinscomItem("AWP | Asiimov (Well-Worn)")).toBe("weapon");
    expect(
      classifySkinscomItem("StatTrak™ AK-47 | Redline (Field-Tested)"),
    ).toBe("weapon");
    expect(
      classifySkinscomItem("★ Sport Gloves | Pandora's Box (Field-Tested)"),
    ).toBe("weapon");
  });

  it("classifies knives/gloves/vanilla by the star prefix", () => {
    expect(classifySkinscomItem("★ Karambit")).toBe("weapon");
    expect(classifySkinscomItem("★ Bayonet | Fade (Factory New)")).toBe(
      "weapon",
    );
  });

  it("classifies stickers", () => {
    expect(classifySkinscomItem("Sticker | Crown (Foil)")).toBe("sticker");
    expect(
      classifySkinscomItem("Sticker | Titan (Holo) | Katowice 2014"),
    ).toBe("sticker");
  });

  it("classifies everything else as other", () => {
    expect(classifySkinscomItem("Fracture Case")).toBe("other");
    expect(classifySkinscomItem("Paris 2023 Legends Capsule")).toBe("other");
    expect(classifySkinscomItem("Sealed Graffiti | Salt (Fuchsia)")).toBe(
      "other",
    );
    expect(classifySkinscomItem("Patch | The Boss")).toBe("other");
    expect(classifySkinscomItem("Music Kit | Beartooth")).toBe("other");
    expect(classifySkinscomItem("Charm | Lil' Ava")).toBe("other");
    expect(classifySkinscomItem("")).toBe("other");
  });

  it("keeps only weapons and stickers", () => {
    expect(isWeaponOrSticker("AK-47 | Redline (Field-Tested)")).toBe(true);
    expect(isWeaponOrSticker("Sticker | Crown (Foil)")).toBe(true);
    expect(isWeaponOrSticker("Fracture Case")).toBe(false);
  });
});

describe("getWearShortcutFromName", () => {
  it("maps full wear names to short buckets", () => {
    expect(getWearShortcutFromName("Factory New")).toBe("FN");
    expect(getWearShortcutFromName("Minimal Wear")).toBe("MW");
    expect(getWearShortcutFromName("Field-Tested")).toBe("FT");
    expect(getWearShortcutFromName("Well-Worn")).toBe("WW");
    expect(getWearShortcutFromName("Battle-Scarred")).toBe("BS");
  });

  it("returns empty for missing wear and passes through unknowns", () => {
    expect(getWearShortcutFromName(null)).toBe("");
    expect(getWearShortcutFromName(undefined)).toBe("");
    expect(getWearShortcutFromName("Pristine")).toBe("Pristine");
  });
});

describe("getWearShortcutFromFloat", () => {
  it("buckets a float into the CS2 wear ranges", () => {
    expect(getWearShortcutFromFloat(0.01)).toBe("FN");
    expect(getWearShortcutFromFloat(0.1)).toBe("MW");
    expect(getWearShortcutFromFloat(0.2)).toBe("FT");
    expect(getWearShortcutFromFloat(0.4)).toBe("WW");
    expect(getWearShortcutFromFloat(0.5)).toBe("BS");
  });

  it("returns empty for missing/invalid floats", () => {
    expect(getWearShortcutFromFloat(null)).toBe("");
    expect(getWearShortcutFromFloat(undefined)).toBe("");
    expect(getWearShortcutFromFloat(NaN)).toBe("");
  });
});
