import { describe, it, expect } from "vitest";
import {
  AcceptedPriceInfo,
  ProfitOverridePolicy,
} from "../../../../../shared/types/oracle.types";
import {
  applyProfitOverride,
  classifySss,
  classifyWear,
  computeEffectiveAdjustment,
  isProfitOverrideActive,
} from "../profitOverride";

const makePolicy = (
  overrides: Partial<ProfitOverridePolicy> = {},
): ProfitOverridePolicy => ({
  enabled: true,
  mode: "flat",
  bidAdjustmentPercent: 0,
  wearAdjustments: {
    fn: 0,
    mw: 0,
    ft: 0,
    ww: 0,
    bs: 0,
    vanilla: 0,
    stattrak: 0,
    souvenir: 0,
  },
  sssAdjustments: { prime: 0, solid: 0, moderate: 0, thin: 0 },
  ...overrides,
});

const makeInfo = (
  overrides: Partial<AcceptedPriceInfo> = {},
): AcceptedPriceInfo => ({
  acceptedPrice: 100,
  supplyStabilityScore: 1.2,
  isHyperStable: false,
  ...overrides,
});

describe("profitOverride — classification", () => {
  it("classifies primary wear buckets", () => {
    expect(classifyWear("AK-47 | Redline (Factory New)").wear).toBe("fn");
    expect(classifyWear("AK-47 | Redline (Minimal Wear)").wear).toBe("mw");
    expect(classifyWear("AK-47 | Redline (Field-Tested)").wear).toBe("ft");
    expect(classifyWear("AK-47 | Redline (Well-Worn)").wear).toBe("ww");
    expect(classifyWear("AK-47 | Redline (Battle-Scarred)").wear).toBe("bs");
  });

  it("treats knives without a wear suffix as vanilla", () => {
    expect(classifyWear("★ Karambit").wear).toBe("vanilla");
    expect(classifyWear("★ Bayonet | Doppler").wear).toBe("vanilla");
  });

  it("flags StatTrak and Souvenir modifiers", () => {
    const st = classifyWear("StatTrak™ AK-47 | Redline (Field-Tested)");
    expect(st.wear).toBe("ft");
    expect(st.isStatTrak).toBe(true);

    const sv = classifyWear("Souvenir AWP | Dragon Lore (Factory New)");
    expect(sv.wear).toBe("fn");
    expect(sv.isSouvenir).toBe(true);
  });

  it("flags stickers separately from vanilla knives/gloves", () => {
    const sticker = classifyWear("Sticker | Titan (Holo) | Katowice 2014");
    expect(sticker.isSticker).toBe(true);
    expect(sticker.wear).toBe("vanilla");

    const knife = classifyWear("★ Karambit");
    expect(knife.isSticker).toBe(false);
    expect(knife.wear).toBe("vanilla");
  });

  it("buckets SSS by supply stability, not liquidity", () => {
    expect(classifySss(1.5)).toBe("prime");
    expect(classifySss(1.2)).toBe("prime");
    expect(classifySss(1.1)).toBe("solid");
    expect(classifySss(1.0)).toBe("solid");
    expect(classifySss(0.7)).toBe("moderate");
    expect(classifySss(0.5)).toBe("moderate");
    expect(classifySss(0.1)).toBe("thin");
    expect(classifySss(undefined as unknown as number)).toBe("thin");
  });
});

describe("profitOverride — apply", () => {
  it("passes through untouched when disabled and preserves oracle value", () => {
    const out = applyProfitOverride(
      makeInfo(),
      "AK-47 | Redline (Field-Tested)",
      makePolicy({ enabled: false, mode: "flat", bidAdjustmentPercent: -20 }),
    );
    expect(out.acceptedPrice).toBe(100);
    expect(out.oracleAcceptedPrice).toBe(100);
    expect(out.overrideApplied).toBe(false);
    expect(out.appliedAdjustmentPercent).toBe(0);
  });

  it("never resurrects a zero ceiling", () => {
    const out = applyProfitOverride(
      makeInfo({ acceptedPrice: 0, oracleAcceptedPrice: 0 }),
      "AWP | Atheris (Field-Tested)",
      makePolicy({ bidAdjustmentPercent: 25 }),
    );
    expect(out.acceptedPrice).toBe(0);
    expect(out.overrideApplied).toBe(false);
  });

  it("applies a flat defensive haircut", () => {
    const out = applyProfitOverride(
      makeInfo(),
      "AK-47 | Redline (Field-Tested)",
      makePolicy({ bidAdjustmentPercent: -10 }),
    );
    expect(out.acceptedPrice).toBe(90);
    expect(out.oracleAcceptedPrice).toBe(100);
    expect(out.overrideApplied).toBe(true);
    expect(out.appliedAdjustmentPercent).toBe(-10);
  });

  it("allows an aggressive premium above the Oracle ceiling", () => {
    const out = applyProfitOverride(
      makeInfo(),
      "AK-47 | Redline (Field-Tested)",
      makePolicy({ bidAdjustmentPercent: 10 }),
    );
    expect(out.acceptedPrice).toBe(110);
    expect(out.appliedAdjustmentPercent).toBe(10);
  });

  it("uses wear deltas only (base is ignored) in wear mode", () => {
    const policy = makePolicy({
      mode: "wear",
      bidAdjustmentPercent: -10,
      wearAdjustments: { ...makePolicy().wearAdjustments, ft: 5 },
    });
    const out = applyProfitOverride(
      makeInfo(),
      "AK-47 | Redline (Field-Tested)",
      policy,
    );
    expect(out.appliedAdjustmentPercent).toBe(5);
    expect(out.acceptedPrice).toBe(105);
  });

  it("stacks StatTrak and Souvenir modifiers", () => {
    const policy = makePolicy({
      mode: "wear",
      bidAdjustmentPercent: 0,
      wearAdjustments: {
        ...makePolicy().wearAdjustments,
        stattrak: -4,
        souvenir: 6,
      },
    });
    expect(
      computeEffectiveAdjustment(
        policy,
        "Souvenir AWP | Dragon Lore (Factory New)",
        makeInfo(),
      ),
    ).toBe(6);
    expect(
      computeEffectiveAdjustment(
        policy,
        "StatTrak™ AK-47 | Redline (Field-Tested)",
        makeInfo(),
      ),
    ).toBe(-4);
  });

  it("uses SSS deltas only (base is ignored) in stability mode", () => {
    const policy = makePolicy({
      mode: "stability",
      bidAdjustmentPercent: -5,
      sssAdjustments: { prime: 0, solid: 0, moderate: -3, thin: -12 },
    });
    expect(
      computeEffectiveAdjustment(policy, "x", makeInfo({ supplyStabilityScore: 2 })),
    ).toBe(0);
    expect(
      computeEffectiveAdjustment(policy, "x", makeInfo({ supplyStabilityScore: 0.7 })),
    ).toBe(-3);
    expect(
      computeEffectiveAdjustment(policy, "x", makeInfo({ supplyStabilityScore: 0.1 })),
    ).toBe(-12);
  });

  it("keeps scores above 1.5 in the open-ended Prime band", () => {
    const policy = makePolicy({
      mode: "stability",
      sssAdjustments: { prime: -20, solid: 0, moderate: 0, thin: 0 },
    });
    expect(
      computeEffectiveAdjustment(policy, "x", makeInfo({ supplyStabilityScore: 1.5 })),
    ).toBe(-20);
    expect(
      computeEffectiveAdjustment(policy, "x", makeInfo({ supplyStabilityScore: 1.55 })),
    ).toBe(-20);
    expect(
      computeEffectiveAdjustment(policy, "x", makeInfo({ supplyStabilityScore: 2.4 })),
    ).toBe(-20);
  });

  it("does not apply wear/vanilla deltas to stickers in wear mode", () => {
    const policy = makePolicy({
      mode: "wear",
      wearAdjustments: { ...makePolicy().wearAdjustments, vanilla: -15 },
    });
    expect(
      computeEffectiveAdjustment(
        policy,
        "Sticker | Titan (Holo) | Katowice 2014",
        makeInfo(),
      ),
    ).toBe(0);
    // A vanilla knife still receives the vanilla delta.
    expect(computeEffectiveAdjustment(policy, "★ Karambit", makeInfo())).toBe(
      -15,
    );
  });

  it("applies base (combined) and SSS (stability) to stickers", () => {
    const combined = makePolicy({
      mode: "combined",
      bidAdjustmentPercent: -10,
      wearAdjustments: { ...makePolicy().wearAdjustments, vanilla: -15 },
      sssAdjustments: { prime: 0, solid: 0, moderate: 0, thin: -20 },
    });
    // base (-10) + no wear + thin (-20) = -30
    expect(
      computeEffectiveAdjustment(
        combined,
        "Sticker | Titan (Holo) | Katowice 2014",
        makeInfo({ supplyStabilityScore: 0.2 }),
      ),
    ).toBe(-30);
  });

  it("sums base + wear + SSS in combined mode", () => {
    const policy = makePolicy({
      mode: "combined",
      bidAdjustmentPercent: -5,
      wearAdjustments: { ...makePolicy().wearAdjustments, bs: -6 },
      sssAdjustments: { prime: 0, solid: 0, moderate: -3, thin: -10 },
    });
    const out = applyProfitOverride(
      makeInfo({ supplyStabilityScore: 0.2 }),
      "AK-47 | Redline (Battle-Scarred)",
      policy,
    );
    expect(out.appliedAdjustmentPercent).toBe(-21);
  });

  it("is idempotent when re-applied from the preserved oracle value", () => {
    const policy = makePolicy({ bidAdjustmentPercent: -12 });
    const first = applyProfitOverride(
      makeInfo(),
      "AK-47 | Redline (Field-Tested)",
      policy,
    );
    const second = applyProfitOverride(
      first,
      "AK-47 | Redline (Field-Tested)",
      policy,
    );
    expect(second.acceptedPrice).toBe(first.acceptedPrice);
    expect(second.oracleAcceptedPrice).toBe(100);
  });

  it("does not mutate the input entry", () => {
    const info = makeInfo();
    const snapshot = { ...info };
    applyProfitOverride(info, "AK-47 | Redline (Field-Tested)", makePolicy({ bidAdjustmentPercent: -30 }));
    expect(info).toEqual(snapshot);
  });

  it("reports active only when enabled and not off", () => {
    expect(isProfitOverrideActive(makePolicy({ enabled: false }))).toBe(false);
    expect(isProfitOverrideActive(makePolicy({ mode: "off" }))).toBe(false);
    expect(isProfitOverrideActive(makePolicy({ enabled: true, mode: "flat" }))).toBe(
      true,
    );
  });
});
