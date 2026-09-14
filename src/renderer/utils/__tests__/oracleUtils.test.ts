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

describe("formatTimeAgo", () => {
  it("formats timestamps relative to now", async () => {
    const { formatTimeAgo } = await import("../../screens/Oracle/utils/oracleUtils");

    expect(formatTimeAgo(null)).toBe("Never");
    expect(formatTimeAgo(undefined)).toBe("Never");
    expect(formatTimeAgo("")).toBe("Never");

    const now = Date.now();
    expect(formatTimeAgo(new Date(now - 10 * 1000).toISOString())).toBe("just now");
    expect(formatTimeAgo(new Date(now - 2 * 60 * 1000).toISOString())).toBe("2m ago");
    expect(formatTimeAgo(new Date(now - 45 * 60 * 1000).toISOString())).toBe("45m ago");
    expect(formatTimeAgo(new Date(now - 3 * 3600 * 1000).toISOString())).toBe("3h ago");
    expect(formatTimeAgo(new Date(now - 2 * 86400 * 1000).toISOString())).toBe("2d ago");
  });
});

describe("evaluateTrendHealth", () => {
  it("handles null or empty stats safely", async () => {
    const { evaluateTrendHealth } = await import(
      "../../screens/Oracle/utils/oracleUtils"
    );

    const empty = evaluateTrendHealth(null);
    expect(empty.status).toBe("empty");
    expect(empty.isInsufficient).toBe(true);
    expect(empty.isStale).toBe(false);
    expect(empty.badgeClass).toBe("badge-ghost");
  });

  it("identifies insufficient history when daysCount < 3", async () => {
    const { evaluateTrendHealth } = await import(
      "../../screens/Oracle/utils/oracleUtils"
    );

    const res = evaluateTrendHealth(
      {
        daysCount: 2,
        totalSnapshots: 100,
        itemCoverage: 50,
        latestDate: "2026-09-14",
        oldestDate: "2026-09-13",
      },
      "2026-09-14",
    );

    expect(res.isInsufficient).toBe(true);
    expect(res.status).toBe("insufficient");
    expect(res.badgeClass).toBe("badge-warning");
    expect(res.badgeText).toContain("2/3 Days");
  });

  it("detects STALE trend history when latest snapshot is > 3 days old (user question scenario: 7d to 4d ago)", async () => {
    const { evaluateTrendHealth } = await import(
      "../../screens/Oracle/utils/oracleUtils"
    );

    // Today is 2026-09-14. Oldest is 7 days ago (2026-09-07), latest is 4 days ago (2026-09-10).
    // daysCount is 4 (which is >= 3), but latest is 4 days ago (> 3 days).
    const res = evaluateTrendHealth(
      {
        daysCount: 4,
        totalSnapshots: 400,
        itemCoverage: 100,
        latestDate: "2026-09-10",
        oldestDate: "2026-09-07",
      },
      "2026-09-14",
    );

    expect(res.daysSinceLatest).toBe(4);
    expect(res.isStale).toBe(true);
    expect(res.status).toBe("stale");
    expect(res.badgeText).toContain("Stale Trends (4d ago");
    expect(res.warningMessage).toContain("Critical");
    expect(res.warningMessage).toContain("BYPASSED");
  });

  it("detects DECAYING trend history when latest snapshot is 2 days old", async () => {
    const { evaluateTrendHealth } = await import(
      "../../screens/Oracle/utils/oracleUtils"
    );

    // Today is 2026-09-14, latest is 2026-09-12 (2 days ago).
    const res = evaluateTrendHealth(
      {
        daysCount: 7,
        totalSnapshots: 700,
        itemCoverage: 100,
        latestDate: "2026-09-12",
        oldestDate: "2026-09-06",
      },
      "2026-09-14",
    );

    expect(res.daysSinceLatest).toBe(2);
    expect(res.isStale).toBe(false);
    expect(res.isDecaying).toBe(true);
    expect(res.status).toBe("decaying");
    expect(res.badgeText).toContain("Trends Outdated (2d lag)");
  });

  it("detects CONTINUITY GAP when > 2 days are missing in the date range span", async () => {
    const { evaluateTrendHealth } = await import(
      "../../screens/Oracle/utils/oracleUtils"
    );

    // Span from 2026-09-07 to 2026-09-14 is 8 days, but daysCount is only 4 (4 days missing).
    const res = evaluateTrendHealth(
      {
        daysCount: 4,
        totalSnapshots: 400,
        itemCoverage: 100,
        latestDate: "2026-09-14",
        oldestDate: "2026-09-07",
      },
      "2026-09-14",
    );

    expect(res.daysSinceLatest).toBe(0);
    expect(res.spanDays).toBe(8);
    expect(res.missingDaysInRange).toBe(4);
    expect(res.hasContinuityGap).toBe(true);
    expect(res.status).toBe("gap");
    expect(res.badgeText).toContain("4d missing");
  });

  it("marks contiguous 7+ days fresh history as verified and healthy", async () => {
    const { evaluateTrendHealth } = await import(
      "../../screens/Oracle/utils/oracleUtils"
    );

    const res = evaluateTrendHealth(
      {
        daysCount: 7,
        totalSnapshots: 700,
        itemCoverage: 100,
        latestDate: "2026-09-14",
        oldestDate: "2026-09-08",
      },
      "2026-09-14",
    );

    expect(res.daysSinceLatest).toBe(0);
    expect(res.missingDaysInRange).toBe(0);
    expect(res.isStale).toBe(false);
    expect(res.isDecaying).toBe(false);
    expect(res.hasContinuityGap).toBe(false);
    expect(res.status).toBe("healthy");
    expect(res.badgeText).toBe("● Verified (7d)");
    expect(res.badgeClass).toBe("badge-primary");
    expect(res.warningMessage).toBeNull();
  });
});

