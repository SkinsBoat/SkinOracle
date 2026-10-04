export interface OracleStrategyProfile {
  preset?: "conservative" | "balanced" | "aggressive" | "custom";
  liquidityDepth?: "strict" | "moderate" | "broad";
  valuationMargin?: "conservative" | "standard" | "competitive";
  outlierProtection?: "strict" | "standard" | "permissive";
}

export interface NexusStrategyProfile {
  preset?: "capital_shield" | "balanced" | "aggressive" | "custom";
  trendWindow?: 7 | 14 | 30;
  downsideCut?: "strict" | "standard" | "light";
  volatilityFilter?: "strict" | "standard" | "permissive";
}

export interface EvaluatedOracleData {
  finalAcceptedPrice: number;
  supplyStabilityScore: number;
  isHyperStable: boolean;
  averageMarketPrice?: number;
  lowestPrice?: number;
  totalQty?: number;
  marketCount?: number;
  oracleVersion?: string;
  nexusDelta?: number;
  trendAdjustment?: number;
  trendConfidence?: string;
  trendMomentum7d?: number;
  trendMomentum14d?: number;
  trendMomentum30d?: number;
  trendVolatility?: number;
  priceStabilityIndex?: number;
  marketConsensus?: string;
  v1Benchmark?: number;
  nexusConfidence?: string;
  riskProfile?: string;
  overEstimationRisk?: string;
}

export interface EvaluatedOracleItem {
  name: string;
  oracle: EvaluatedOracleData | null;
}

export interface OracleEvaluationResponse {
  results: EvaluatedOracleItem[];
  count?: number;
  durationMs?: number;
  engine?: string;
  usageCount?: number;
  dailyRemaining?: number;
}

export interface AcceptedPriceInfo {
  acceptedPrice: number;
  supplyStabilityScore: number;
  isHyperStable: boolean;
  nexusDelta?: number;
  trendAdjustment?: number;
  trendConfidence?: string;
  trendMomentum14d?: number;
  nexusConfidence?: string;
  v1Benchmark?: number;
  /**
   * Server-authoritative Oracle ceiling BEFORE any front-end override was
   * applied. Kept immutable so a changed policy can be re-applied instantly
   * with no server call and no credits, and so the original value is
   * auditable after the fact.
   */
  oracleAcceptedPrice?: number;
  /** True when a front-end profit override changed the stored bid. */
  overrideApplied?: boolean;
  /** Signed percent the override applied (positive = above Oracle ceiling). */
  appliedAdjustmentPercent?: number;
}

/** Wear buckets used by the front-end profit override policy. */
export type ProfitWearBucket =
  | "fn"
  | "mw"
  | "ft"
  | "ww"
  | "bs"
  | "vanilla"
  | "stattrak"
  | "souvenir";

/**
 * Supply-stability (SSS) buckets. SSS is NOT a liquidity metric; it measures
 * how stable an item's supply is. In practice it stays at or below ~1.5, and a
 * strong score starts around 1.2.
 */
export type ProfitSssBucket = "prime" | "solid" | "moderate" | "thin";

export type ProfitOverrideMode =
  | "off"
  | "flat"
  | "wear"
  | "stability"
  | "combined";

/**
 * Front-end-only bid override policy.
 *
 * IMPORTANT: This layer never re-derives the Oracle valuation. It takes the
 * server-delivered ceiling and applies a trader-chosen, signed adjustment on
 * top of it. The backend is never contacted, no DTO/IPC contract changes, and
 * `oracleAcceptedPrice` is preserved so the pure Oracle value stays auditable.
 *
 * `bidAdjustmentPercent` is signed:
 *   negative → trim the ceiling (more profit margin, safer)
 *   positive → bid above the Oracle ceiling (aggressive, higher risk)
 */
export interface ProfitOverridePolicy {
  enabled: boolean;
  mode: ProfitOverrideMode;
  bidAdjustmentPercent: number;
  wearAdjustments: Record<ProfitWearBucket, number>;
  sssAdjustments: Record<ProfitSssBucket, number>;
}

/**
 * Common order analysis calculated by comparing active user orders or targets
 * against Oracle accepted prices and trend momentum across workstations.
 */
export interface WorkstationOrderAnalysis {
  acceptedPrice: number;
  supplyStabilityScore: number;
  isHyperStable: boolean;
  currentPrice: number;
  trendMomentum14d?: number;
}

export type OrderAnalysis = WorkstationOrderAnalysis;
export type TargetAnalysis = WorkstationOrderAnalysis;

/**
 * Universal result item for SoClose scanners across all market workstations
 * (CSFloat, DMarket, Skins.com).
 */
export interface SoCloseResultItem {
  name: string;
  acceptedPrice: number;
  currentMarketPrice: number;
  closeness: number;
  closenessPercent: number;
  market?: string;
  hasExistingOrder?: boolean;
  hasExistingTarget?: boolean;
  iconUrl?: string;
  trendMomentum14d?: number;
  supplyStabilityScore?: number;
}

export interface OracleBatchStartResult {
  batchId: string;
  totalItems: number;
  totalCostCents: number;
  freeCoveredCents: number;
  billableCents: number;
  expiresAt?: string;
}

export interface OracleBatchFinishResult {
  batchId: string;
  totalItems: number;
  completedItems: number;
  unusedItems: number;
  refundedCents: number;
}
