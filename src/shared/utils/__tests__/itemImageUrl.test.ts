import { describe, expect, it } from "vitest";
import {
  buildSteamApisImageUrl,
  buildSteamEconomyImageUrl,
  normalizeSteamMarketHashName,
  resolveItemImageUrl,
} from "../itemImageUrl";

const url = (name: string) =>
  `https://api.steamapis.com/image/item/730/${encodeURIComponent(name)}`;

describe("normalizeSteamMarketHashName", () => {
  it("leaves standard names untouched", () => {
    expect(normalizeSteamMarketHashName("AK-47 | Redline (Field-Tested)")).toBe(
      "AK-47 | Redline (Field-Tested)",
    );
  });

  it("strips Doppler phase suffixes", () => {
    expect(
      normalizeSteamMarketHashName(
        "★ Flip Knife | Doppler Phase 1 (Minimal Wear)",
      ),
    ).toBe("★ Flip Knife | Doppler (Minimal Wear)");
    expect(
      normalizeSteamMarketHashName(
        "★ Bayonet | Doppler Phase 4 (Minimal Wear)",
      ),
    ).toBe("★ Bayonet | Doppler (Minimal Wear)");
  });

  it("strips Doppler gem names", () => {
    expect(
      normalizeSteamMarketHashName(
        "★ Survival Knife | Doppler Black Pearl (Factory New)",
      ),
    ).toBe("★ Survival Knife | Doppler (Factory New)");
    expect(
      normalizeSteamMarketHashName("★ Karambit | Doppler Ruby (Factory New)"),
    ).toBe("★ Karambit | Doppler (Factory New)");
  });

  it("strips Gamma Doppler phase suffixes", () => {
    expect(
      normalizeSteamMarketHashName(
        "★ Flip Knife | Gamma Doppler Phase 2 (Factory New)",
      ),
    ).toBe("★ Flip Knife | Gamma Doppler (Factory New)");
    expect(
      normalizeSteamMarketHashName(
        "★ Talon Knife | Gamma Doppler Emerald (Factory New)",
      ),
    ).toBe("★ Talon Knife | Gamma Doppler (Factory New)");
  });

  it("restores the star prefix for knives and gloves", () => {
    expect(
      normalizeSteamMarketHashName("Flip Knife | Doppler (Minimal Wear)"),
    ).toBe("★ Flip Knife | Doppler (Minimal Wear)");
    expect(
      normalizeSteamMarketHashName(
        "Sport Gloves | Pandora's Box (Field-Tested)",
      ),
    ).toBe("★ Sport Gloves | Pandora's Box (Field-Tested)");
  });

  it("restores the star prefix before StatTrak", () => {
    expect(
      normalizeSteamMarketHashName(
        "StatTrak™ Karambit | Doppler Phase 2 (Factory New)",
      ),
    ).toBe("★ StatTrak™ Karambit | Doppler (Factory New)");
  });

  it("keeps a single star when already present", () => {
    expect(
      normalizeSteamMarketHashName(
        "★ Karambit | Doppler Phase 2 (Factory New)",
      ),
    ).toBe("★ Karambit | Doppler (Factory New)");
  });

  it("handles empty input", () => {
    expect(normalizeSteamMarketHashName("")).toBe("");
    expect(normalizeSteamMarketHashName("   ")).toBe("");
  });
});

describe("buildSteamApisImageUrl", () => {
  it("builds an encoded URL from the normalized name", () => {
    expect(
      buildSteamApisImageUrl(
        "★ Paracord Knife | Doppler Black Pearl (Factory New)",
      ),
    ).toBe(url("★ Paracord Knife | Doppler (Factory New)"));
  });

  it("returns an empty string for empty names", () => {
    expect(buildSteamApisImageUrl("")).toBe("");
  });
});

describe("buildSteamEconomyImageUrl", () => {
  const base = "https://community.cloudflare.steamstatic.com/economy/image/";

  it("passes through full URLs", () => {
    expect(buildSteamEconomyImageUrl("https://cdn.example.com/a.png")).toBe(
      "https://cdn.example.com/a.png",
    );
  });

  it("normalizes protocol-relative URLs", () => {
    expect(buildSteamEconomyImageUrl("//cdn.example.com/a.png")).toBe(
      "https://cdn.example.com/a.png",
    );
  });

  it("prefixes bare Steam image hashes", () => {
    expect(buildSteamEconomyImageUrl("-9a81dlWLwJ2UUGcVs")).toBe(
      `${base}-9a81dlWLwJ2UUGcVs`,
    );
  });

  it("returns an empty string when no icon is provided", () => {
    expect(buildSteamEconomyImageUrl()).toBe("");
    expect(buildSteamEconomyImageUrl("  ")).toBe("");
  });
});

describe("resolveItemImageUrl", () => {
  it("prefers the provided icon reference", () => {
    expect(
      resolveItemImageUrl("AK-47 | Redline (Field-Tested)", "-9a81dlWLw"),
    ).toBe(
      "https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLw",
    );
  });

  it("falls back to the normalized SteamApis lookup", () => {
    expect(
      resolveItemImageUrl("★ Navaja Knife | Doppler Phase 3 (Factory New)"),
    ).toBe(url("★ Navaja Knife | Doppler (Factory New)"));
  });
});
