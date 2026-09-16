// Oracle Valuation & Workstation Analysis Types

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
