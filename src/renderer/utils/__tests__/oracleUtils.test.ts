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
