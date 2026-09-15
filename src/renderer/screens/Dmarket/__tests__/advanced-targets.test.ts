import { describe, it, expect } from "vitest";
import { isAdvancedTarget, calculateTargetDrift } from "../tabs/TargetTab/types";
import { DmarketTargetItem } from "../../../../shared/types";

describe("DMarket Target Advanced Classification", () => {
  // Exact payload structure from DMarket API
  const standardTarget1: DmarketTargetItem = {
    targetId: "07d079ca-8d9d-4548-8ecd-bad87f9af94c",
    title: "Galil AR | Metallic Squeezer (Minimal Wear)",
    amount: "1",
    status: "TARGET_STATUS_ACTIVE",
    priceCents: "9",
    attributes: {
      categoryPath: "rifle/galil ar",
      title: "Galil AR | Metallic Squeezer (Minimal Wear)",
      name: "Galil AR | Metallic Squeezer",
      cs2: {
        category: "CATEGORY_NORMAL",
        exterior: "EXTERIOR_MINIMAL_WEAR",
        phase: "PHASE_TITLE_UNSPECIFIED",
        paintSeed: 0,
        floatPart: "FLOAT_PART_UNSPECIFIED",
        isAdvanced: false,
      },
    },
    createdAt: "2026-09-15T20:30:22Z",
    updatedAt: "2026-09-15T20:30:22Z",
  };

  const standardTarget2: DmarketTargetItem = {
    targetId: "6d399861-5878-4a97-a0d1-a1448b9f8caa",
    title: "CZ75-Auto | Midnight Palm (Minimal Wear)",
    amount: "1",
    status: "TARGET_STATUS_ACTIVE",
    priceCents: "38",
    attributes: {
      categoryPath: "pistol/cz75-auto",
      title: "CZ75-Auto | Midnight Palm (Minimal Wear)",
      name: "CZ75-Auto | Midnight Palm",
      cs2: {
        category: "CATEGORY_NORMAL",
        exterior: "EXTERIOR_MINIMAL_WEAR",
        phase: "PHASE_TITLE_UNSPECIFIED",
        paintSeed: 0,
        floatPart: "FLOAT_PART_UNSPECIFIED",
        isAdvanced: false,
      },
    },
    createdAt: "2026-09-15T20:17:56Z",
    updatedAt: "2026-09-15T20:17:56Z",
  };

  const advancedTarget: DmarketTargetItem = {
    targetId: "95a843ab-1153-4ffd-b357-159ca0959220",
    title: "StatTrak™ M249 | Downtown (Minimal Wear)",
    amount: "1",
    status: "TARGET_STATUS_ACTIVE",
    priceCents: "35",
    attributes: {
      categoryPath: "machinegun/m249",
      title: "StatTrak™ M249 | Downtown (Minimal Wear)",
      name: "M249 | Downtown",
      cs2: {
        category: "CATEGORY_STATTRACK",
        exterior: "EXTERIOR_MINIMAL_WEAR",
        phase: "PHASE_TITLE_UNSPECIFIED",
        paintSeed: 13,
        floatPart: "FLOAT_PART_UNSPECIFIED",
        isAdvanced: true,
      },
    },
    createdAt: "2026-09-15T20:22:09Z",
    updatedAt: "2026-09-15T20:22:09Z",
  };

  it("correctly identifies standard targets as not advanced even when paintSeed is 0", () => {
    expect(isAdvancedTarget(standardTarget1)).toBe(false);
    expect(isAdvancedTarget(standardTarget2)).toBe(false);
  });

  it("correctly identifies advanced target with isAdvanced: true", () => {
    expect(isAdvancedTarget(advancedTarget)).toBe(true);
  });

  it("handles extra.isAdvanced and target.isAdvanced top-level flags", () => {
    expect(isAdvancedTarget({ ...standardTarget1, isAdvanced: true })).toBe(true);
    expect(
      isAdvancedTarget({
        ...standardTarget1,
        extra: { isAdvanced: true },
      }),
    ).toBe(true);
    expect(
      isAdvancedTarget({
        ...standardTarget1,
        extra: { isAdvanced: false },
      }),
    ).toBe(false);
    expect(isAdvancedTarget(null)).toBe(false);
    expect(isAdvancedTarget(undefined)).toBe(false);
  });

  it("ensures advanced targets are excluded from actionRequired in drift calculation", () => {
    const analysis = {
      acceptedPrice: 1.0, // Significant drift compared to 0.35
      suggestedPrice: 1.0,
      confidence: 1,
    };

    const driftNormal = calculateTargetDrift(
      { ...standardTarget2, priceCents: "35" },
      analysis as any,
    );
    expect(driftNormal?.isUnderbid).toBe(true);
    expect(driftNormal?.isActionRequired).toBe(true);

    const driftAdvanced = calculateTargetDrift(advancedTarget, analysis as any);
    expect(driftAdvanced?.isUnderbid).toBe(true);
    // Even though it drifts, advanced targets cannot be auto-updated, so isActionRequired is false
    expect(driftAdvanced?.isActionRequired).toBe(false);
  });
});
