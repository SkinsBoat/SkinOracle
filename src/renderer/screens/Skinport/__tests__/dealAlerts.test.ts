import { describe, it, expect, beforeEach } from "vitest";
import {
  buildDealAlertMessage,
  isAlertEligible,
  pickNovelDeals,
  resetSkinportDealAlerts,
  type SkinportDealAlert,
} from "../hooks/useSkinportDealAlerts";

const deal = (
  overrides: Partial<SkinportDealAlert> = {},
): SkinportDealAlert => ({
  key: "AK-47 | Slate (Field-Tested)",
  name: "AK-47 | Slate (Field-Tested)",
  priceUsd: 10,
  ceilingUsd: 12,
  ...overrides,
});

describe("pickNovelDeals", () => {
  beforeEach(() => resetSkinportDealAlerts());

  it("returns only deals not seen before", () => {
    const seen = new Set<string>();
    const first = pickNovelDeals([deal()], seen);
    expect(first).toHaveLength(1);
    // Same identity second time -> suppressed (no repeated alerts).
    const second = pickNovelDeals([deal()], seen);
    expect(second).toHaveLength(0);
  });

  it("dedups within a single batch and ignores malformed entries", () => {
    const seen = new Set<string>();
    const novel = pickNovelDeals(
      [deal(), deal(), { ...deal(), key: "" } as SkinportDealAlert],
      seen,
    );
    expect(novel).toHaveLength(1);
  });
});

describe("isAlertEligible", () => {
  it("alerts at or below the ceiling", () => {
    expect(isAlertEligible(1000, 1200)).toBe(true);
    expect(isAlertEligible(1200, 1200)).toBe(true);
  });

  it("never alerts without a ceiling or above it", () => {
    expect(isAlertEligible(1000, null)).toBe(false);
    expect(isAlertEligible(1000, undefined)).toBe(false);
    expect(isAlertEligible(105, 100)).toBe(false);
    expect(isAlertEligible(3000, 1200)).toBe(false);
  });
});

describe("buildDealAlertMessage", () => {
  it("names the single best deal and its ceiling", () => {
    const { title, body } = buildDealAlertMessage([deal()]);
    expect(title).toBe("Target Match Detected");
    expect(body).toContain("AK-47 | Slate (Field-Tested)");
    expect(body).toContain("$10.00");
    expect(body).toContain("$12.00");
  });

  it("summarises a burst and highlights the deepest discount", () => {
    const { title, body } = buildDealAlertMessage([
      deal({ key: "a", name: "A", priceUsd: 11, ceilingUsd: 12 }),
      deal({ key: "b", name: "B", priceUsd: 3, ceilingUsd: 12 }),
      deal({ key: "c", name: "C", priceUsd: 9, ceilingUsd: 12 }),
    ]);
    expect(title).toBe("3 New Target Matches");
    expect(body.startsWith("B and 2 more")).toBe(true);
  });
});
