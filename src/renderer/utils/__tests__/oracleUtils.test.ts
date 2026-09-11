import { describe, it, expect } from "vitest";
import { passesSmartPreFilters } from "../../screens/Oracle/utils/oracleUtils";
import { DEFAULT_PRE_FILTERS } from "../../store/useOracleStore";

describe("passesSmartPreFilters", () => {
  const baseFilters = { ...DEFAULT_PRE_FILTERS };

  it("handles Souvenir weapons properly according to excludeSouvenir", () => {
    const souvenirWeapon = "Souvenir AWP | Desert Hydra (Factory New)";

    // Allowed when excludeSouvenir is false
    expect(
      passesSmartPreFilters(souvenirWeapon, {
        ...baseFilters,
        excludeSouvenir: false,
      }),
    ).toBe(true);

    // Excluded when excludeSouvenir is true
    expect(
      passesSmartPreFilters(souvenirWeapon, {
        ...baseFilters,
        excludeSouvenir: true,
      }),
    ).toBe(false);
  });

  it("handles StatTrak weapons properly", () => {
    const stWeapon = "StatTrak™ AK-47 | Redline (Field-Tested)";

    expect(
      passesSmartPreFilters(stWeapon, {
        ...baseFilters,
        excludeStatTrak: false,
      }),
    ).toBe(true);

    expect(
      passesSmartPreFilters(stWeapon, {
        ...baseFilters,
        excludeStatTrak: true,
      }),
    ).toBe(false);
  });

  it("allows standard weapons with allowed wear conditions", () => {
    const fnSkin = "M4A4 | Asiimov (Factory New)";
    expect(
      passesSmartPreFilters(fnSkin, {
        ...baseFilters,
        allowedWears: { ...baseFilters.allowedWears, fn: true },
      }),
    ).toBe(true);

    expect(
      passesSmartPreFilters(fnSkin, {
        ...baseFilters,
        allowedWears: { ...baseFilters.allowedWears, fn: false },
      }),
    ).toBe(false);
  });

  it("allows vanilla knives without wear conditions", () => {
    expect(passesSmartPreFilters("★ Karambit", baseFilters)).toBe(true);
    expect(passesSmartPreFilters("★ Butterfly Knife", baseFilters)).toBe(true);
  });

  it("rejects non-wear commodity items like cases and containers", () => {
    expect(passesSmartPreFilters("Revolution Case", baseFilters)).toBe(false);
    expect(
      passesSmartPreFilters("Paris 2023 Mirage Souvenir Package", baseFilters),
    ).toBe(false);
  });
});

describe("auditCacheQuantityIntegrity", () => {
  it("accurately calculates verified vs missing quantities across market providers", async () => {
    const { auditCacheQuantityIntegrity } = await import(
      "../../screens/Oracle/utils/oracleUtils"
    );

    const mockCache = {
      "AK-47 | Redline (Field-Tested)": {
        n: "AK-47 | Redline (Field-Tested)",
        l: [
          { m: "buff163", p: 20, q: 290 }, // verified
          { m: "csfloat", p: 21, q: 15 }, // verified
          { m: "skinport", p: 22 }, // missing q entirely
        ],
      },
      "AWP | Asiimov (Field-Tested)": {
        n: "AWP | Asiimov (Field-Tested)",
        l: [
          { m: "buff163", p: 80, q: 50 }, // verified
          { m: "skinport", p: 85, q: 0 }, // non-positive (unverified)
        ],
      },
    };

    const report = auditCacheQuantityIntegrity(mockCache);
    expect(report.totalListings).toBe(5);
    expect(report.verifiedQtyListings).toBe(3);
    expect(report.missingQtyListings).toBe(2);
    expect(report.verifiedPercentage).toBe(60); // 3 / 5 = 60%
    expect(report.isFullyVerified).toBe(false);
    expect(report.marketsWithMissingQty["skinport"]).toBeDefined();
    expect(report.marketsWithMissingQty["skinport"].missingQtyListings).toBe(2);
    expect(report.marketsWithMissingQty["buff163"]).toBeUndefined();
  });

  it("reports 100% verified when all listings have genuine positive quantities", async () => {
    const { auditCacheQuantityIntegrity } = await import(
      "../../screens/Oracle/utils/oracleUtils"
    );

    const mockCache = {
      "Item A": {
        n: "Item A",
        l: [
          { m: "buff163", p: 10, q: 100 },
          { m: "csfloat", p: 11, q: 5 },
        ],
      },
    };

    const report = auditCacheQuantityIntegrity(mockCache);
    expect(report.totalListings).toBe(2);
    expect(report.verifiedQtyListings).toBe(2);
    expect(report.missingQtyListings).toBe(0);
    expect(report.verifiedPercentage).toBe(100);
    expect(report.isFullyVerified).toBe(true);
    expect(Object.keys(report.marketsWithMissingQty)).toHaveLength(0);
  });
});
