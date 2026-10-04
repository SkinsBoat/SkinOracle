/**
 * ══════════════════════════════════════════════════════════════════════════
 *  PROFIT OVERRIDE — FRONT-END BID POLICY SEAM
 * ══════════════════════════════════════════════════════════════════════════
 *
 * This file is the designated extension seam for the desktop app. It lets a
 * trader adjust the Oracle's server-delivered accepted price (buy ceiling)
 * using their own structured criteria: a base margin, per-wear deltas, and
 * supply-stability (SSS) band deltas.
 *
 * DESIGN CONTRACT (read before forking):
 *
 *  1. This is BID POLICY, not valuation. It never re-derives the Oracle value.
 *     The server remains the single source of valuation truth. The original
 *     ceiling is preserved on each entry as `oracleAcceptedPrice`.
 *
 *  2. The adjustment is SIGNED:
 *        negative → trim the ceiling (more margin / defensive)
 *        positive → bid above the Oracle ceiling (aggressive / higher risk)
 *     Full range is intentional. The UI is responsible for making the signed
 *     consequence visible; the math does not silently clamp aggressiveness.
 *
 *  3. ZERO PASSTHROUGH (structural, do not remove):
 *        if (oraclePrice <= 0) return 0;
 *     A zero ceiling from the Oracle means "no valuation exists" (Nexus
 *     UNVERIFIED_NO_DATA / UNVERIFIED_STALE), NOT "cheap". Every bot in the
 *     ecosystem guards `if (price <= 0) skip`. This guard keeps that contract
 *     intact even if a forker later adds flat-dollar terms.
 *
 *  4. Pure and dependency-free (except the canonical CSFloat rounding helper).
 *     No store reads, no IPC, no React. Forkers can replace the body wholesale
 *     without touching any other module.
 *
 * Everything downstream (SoClose, DMarket targets, CSFloat orders) keeps
 * reading `acceptedPrice`; `overrideApplied` / `appliedAdjustmentPercent` mark
 * entries that were overridden so a bad fill stays traceable to the policy.
 */
import {
  AcceptedPriceInfo,
  ProfitOverridePolicy,
  ProfitSssBucket,
  ProfitWearBucket,
} from "../../../../shared/types/oracle.types";
import { roundToCsFloatStep } from "../../../../shared/csfloatUtils";

export type ProfitWearClassification = {
  wear: ProfitWearBucket;
  isStatTrak: boolean;
  isSouvenir: boolean;
  /** Stickers (and similar non-wear items) have no wear condition. */
  isSticker: boolean;
};

const WEAR_MATCHERS: { wear: ProfitWearBucket; re: RegExp }[] = [
  { wear: "fn", re: /\(factory new\)/i },
  { wear: "mw", re: /\(minimal wear\)/i },
  { wear: "ft", re: /\(field-tested\)/i },
  { wear: "ww", re: /\(well-worn\)/i },
  { wear: "bs", re: /\(battle-scarred\)/i },
];

const STICKER_RE = /^sticker\s*\|/i;

/**
 * Classifies an item by its primary wear plus any StatTrak / Souvenir
 * modifier. Vanilla knives/gloves (no wear suffix) fall into "vanilla".
 * Stickers are flagged separately because they have no wear condition and
 * must not inherit the vanilla (knife/glove) delta.
 */
export function classifyWear(itemName: string): ProfitWearClassification {
  const name = itemName || "";
  const matched = WEAR_MATCHERS.find((m) => m.re.test(name));
  return {
    wear: matched ? matched.wear : "vanilla",
    isStatTrak: /stattrak/i.test(name),
    isSouvenir: /souvenir/i.test(name),
    isSticker: STICKER_RE.test(name.trim()),
  };
}

/**
 * Buckets a supply-stability score. SSS is a stability measure, not liquidity.
 * There is no upper bound: a stronger (more stable) score is always better, so
 * Prime stays open-ended above 1.2.
 */
export function classifySss(score: number): ProfitSssBucket {
  const s = Number.isFinite(score) ? score : 0;
  if (s >= 1.2) return "prime";
  if (s >= 1.0) return "solid";
  if (s >= 0.5) return "moderate";
  return "thin";
}

/** True when the policy would actually change any stored bid. */
export function isProfitOverrideActive(policy: ProfitOverridePolicy): boolean {
  return Boolean(policy && policy.enabled && policy.mode !== "off");
}

/**
 * Computes the signed percent adjustment for a single item. Exported so the UI
 * can render a live preview without applying anything.
 *
 * Term activation is mode-scoped so each UI tab is self-contained:
 *   flat      → base only
 *   wear      → wear deltas only
 *   stability → SSS deltas only
 *   combined  → base + wear + SSS
 */
export function computeEffectiveAdjustment(
  policy: ProfitOverridePolicy,
  itemName: string,
  info: Pick<AcceptedPriceInfo, "supplyStabilityScore" | "isHyperStable">,
): number {
  const usesBase = policy.mode === "flat" || policy.mode === "combined";
  let adjustment = usesBase ? policy.bidAdjustmentPercent ?? 0 : 0;

  if (policy.mode === "wear" || policy.mode === "combined") {
    const wear = classifyWear(itemName);
    // Stickers have no wear condition: skip wear/vanilla/modifier deltas.
    if (!wear.isSticker) {
      adjustment += policy.wearAdjustments?.[wear.wear] ?? 0;
      if (wear.isStatTrak) adjustment += policy.wearAdjustments?.stattrak ?? 0;
      if (wear.isSouvenir) adjustment += policy.wearAdjustments?.souvenir ?? 0;
    }
  }

  if (policy.mode === "stability" || policy.mode === "combined") {
    const band = classifySss(info?.supplyStabilityScore ?? 0);
    adjustment += policy.sssAdjustments?.[band] ?? 0;
  }

  return adjustment;
}

/**
 * Applies the policy to one accepted-price entry and returns a new entry.
 * The input is never mutated. When the policy is inactive the Oracle value is
 * passed through unchanged (still normalized to the CSFloat step).
 */
export function applyProfitOverride(
  info: AcceptedPriceInfo,
  itemName: string,
  policy: ProfitOverridePolicy,
): AcceptedPriceInfo {
  const oraclePrice = info.oracleAcceptedPrice ?? info.acceptedPrice;

  // (3) Zero passthrough — see contract at top of file.
  if (!Number.isFinite(oraclePrice) || oraclePrice <= 0) {
    return {
      ...info,
      acceptedPrice: 0,
      oracleAcceptedPrice: Number.isFinite(oraclePrice) ? oraclePrice : 0,
      overrideApplied: false,
      appliedAdjustmentPercent: 0,
    };
  }

  if (!isProfitOverrideActive(policy)) {
    return {
      ...info,
      acceptedPrice: roundToCsFloatStep(oraclePrice),
      oracleAcceptedPrice: oraclePrice,
      overrideApplied: false,
      appliedAdjustmentPercent: 0,
    };
  }

  const adjustment = computeEffectiveAdjustment(policy, itemName, info);
  const rawBid = oraclePrice * (1 + adjustment / 100);
  const bidPrice = Math.max(0, roundToCsFloatStep(rawBid));

  return {
    ...info,
    acceptedPrice: bidPrice,
    oracleAcceptedPrice: oraclePrice,
    overrideApplied: true,
    appliedAdjustmentPercent: adjustment,
  };
}
