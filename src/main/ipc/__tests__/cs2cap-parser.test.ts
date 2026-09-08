import { describe, it, expect } from "vitest";
import {
  parseCs2CapLine,
  getMarketCounts,
  PriceCache,
  CS2CAP_PROVIDERS,
} from "../../services/cs2capParser";

describe("CS2Cap NDJSON Line Parser", () => {
  it("should parse a valid CS2Cap line with cents converted to dollars", () => {
    const cache: PriceCache = {};
    const sampleLine = JSON.stringify({
      provider: "buff163",
      item_id: 2,
      market_hash_name: "'Blueberries' Buckshot | NSWC SEAL",
      phase: null,
      lowest_ask: 3187,
      quantity: 84,
      link: "https://cs2c.app/r/buff163/2",
      url: "https://buff.163.com/goods/835687?from=market",
      timestamp: "2026-03-22T00:08:50.544878Z",
      last_updated: "2026-03-22T00:54:22.230624Z",
    });

    const parsed = parseCs2CapLine(sampleLine, cache);
    expect(parsed).toBe(true);

    const item = cache["'Blueberries' Buckshot | NSWC SEAL"];
    expect(item).toBeDefined();
    expect(item.n).toBe("'Blueberries' Buckshot | NSWC SEAL");
    expect(item.l).toHaveLength(1);
    expect(item.l[0].m).toBe("buff163");
    // 3187 cents => $31.87
    expect(item.l[0].p).toBe(31.87);
    expect(item.l[0].q).toBe(84);
  });

  it("should accumulate multiple providers for the same item", () => {
    const cache: PriceCache = {};
    const lineBuff = JSON.stringify({
      provider: "buff163",
      market_hash_name: "AK-47 | Redline (Field-Tested)",
      lowest_ask: 2150,
      quantity: 45,
    });
    const lineC5 = JSON.stringify({
      provider: "c5",
      market_hash_name: "AK-47 | Redline (Field-Tested)",
      lowest_ask: 2200,
      quantity: 12,
    });
    const lineAvan = JSON.stringify({
      provider: "avanmarket",
      market_hash_name: "AK-47 | Redline (Field-Tested)",
      lowest_ask: 2250,
      quantity: 5,
    });

    parseCs2CapLine(lineBuff, cache);
    parseCs2CapLine(lineC5, cache);
    parseCs2CapLine(lineAvan, cache);

    const item = cache["AK-47 | Redline (Field-Tested)"];
    expect(item).toBeDefined();
    expect(item.l).toHaveLength(3);
    expect(item.l.map((l) => l.m)).toEqual(["buff163", "c5", "avanmarket"]);
    expect(item.l.map((l) => l.p)).toEqual([21.5, 22.0, 22.5]);
  });

  it("should consolidate duplicate provider lines for same item by keeping lowest ask price and aggregating quantity", () => {
    const cache: PriceCache = {};
    const lineBuffPhase1 = JSON.stringify({
      provider: "buff163",
      market_hash_name: "★ Karambit | Doppler (Factory New)",
      lowest_ask: 120000, // $1200.00
      quantity: 5,
    });
    const lineBuffPhase2 = JSON.stringify({
      provider: "buff163",
      market_hash_name: "★ Karambit | Doppler (Factory New)",
      lowest_ask: 115000, // $1150.00 (lower!)
      quantity: 8,
    });
    const lineBuffPhase3 = JSON.stringify({
      provider: "buff163",
      market_hash_name: "★ Karambit | Doppler (Factory New)",
      lowest_ask: 125000, // $1250.00 (higher)
      quantity: 2,
    });

    parseCs2CapLine(lineBuffPhase1, cache);
    parseCs2CapLine(lineBuffPhase2, cache);
    parseCs2CapLine(lineBuffPhase3, cache);

    const item = cache["★ Karambit | Doppler (Factory New)"];
    expect(item).toBeDefined();
    // Must remain exactly 1 listing entry for buff163
    expect(item.l).toHaveLength(1);
    expect(item.l[0].m).toBe("buff163");
    expect(item.l[0].p).toBe(1150.0); // lowest ask
    expect(item.l[0].q).toBe(8); // Math.max(5, 8, 2)
  });

  it("should filter out dust items below $0.20", () => {
    const cache: PriceCache = {};
    const dustLine = JSON.stringify({
      provider: "c5",
      market_hash_name: "Sealed Graffiti | Salt (Violent Violet)",
      lowest_ask: 15, // $0.15 < $0.20 threshold
      quantity: 100,
    });

    const parsed = parseCs2CapLine(dustLine, cache);
    expect(parsed).toBe(false);
    expect(Object.keys(cache)).toHaveLength(0);
  });

  it("should reject zero or negative prices", () => {
    const cache: PriceCache = {};
    const zeroLine = JSON.stringify({
      provider: "c5",
      market_hash_name: "AK-47 | Safari Mesh (Battle-Scarred)",
      lowest_ask: 0,
      quantity: 10,
    });
    const negLine = JSON.stringify({
      provider: "c5",
      market_hash_name: "AK-47 | Safari Mesh (Battle-Scarred)",
      lowest_ask: -500,
      quantity: 10,
    });

    expect(parseCs2CapLine(zeroLine, cache)).toBe(false);
    expect(parseCs2CapLine(negLine, cache)).toBe(false);
    expect(Object.keys(cache)).toHaveLength(0);
  });

  it("should handle malformed JSON lines or empty lines gracefully", () => {
    const cache: PriceCache = {};
    expect(parseCs2CapLine("", cache)).toBe(false);
    expect(parseCs2CapLine("   ", cache)).toBe(false);
    expect(parseCs2CapLine("{ invalid json line ", cache)).toBe(false);
    expect(
      parseCs2CapLine(JSON.stringify({ some_other_key: 123 }), cache),
    ).toBe(false);
    expect(Object.keys(cache)).toHaveLength(0);
  });

  it("should correctly calculate provider market counts", () => {
    const cache: PriceCache = {
      "Item A": {
        n: "Item A",
        l: [
          { m: "buff163", p: 10, q: 2 },
          { m: "c5", p: 10.5, q: 1 },
        ],
      },
      "Item B": {
        n: "Item B",
        l: [
          { m: "buff163", p: 25, q: 5 },
          { m: "avanmarket", p: 26, q: 3 },
        ],
      },
    };

    const counts = getMarketCounts(cache);
    expect(counts).toEqual({
      buff163: 2,
      c5: 1,
      avanmarket: 1,
    });
  });

  it("should maintain authoritative list of all 41 supported CS2Cap market providers", () => {
    expect(CS2CAP_PROVIDERS).toHaveLength(41);
    const providerIds = CS2CAP_PROVIDERS.map((p) => p.id);
    expect(providerIds).toContain("buff163");
    expect(providerIds).toContain("c5");
    expect(providerIds).toContain("csfloat");
    expect(providerIds).toContain("dmarket");
    expect(providerIds).toContain("skinport");
    expect(providerIds).toContain("steam");
    expect(providerIds).toContain("youpin");
    expect(providerIds).toContain("marketcsgo");
    expect(providerIds).toContain("tradeit");
    expect(providerIds).toContain("csmoney_m");
    expect(providerIds).toContain("csmoney_t");
  });
});
