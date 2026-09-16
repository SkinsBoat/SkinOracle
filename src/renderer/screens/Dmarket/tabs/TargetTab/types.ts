import React from "react";
import { DmarketTargetItem, TargetAnalysis } from "../../../../../shared/types";

export type FilterAction = "all" | "action_required" | "overbid" | "underbid" | "safe" | "hold";

export interface TargetDriftDetails {
  acceptedPrice: number;
  currentPrice: number;
  drift: number;
  driftPercent: number;
  isActionRequired: boolean;
  isOverbid: boolean;
  isUnderbid: boolean;
  trendMomentum14d?: number;
}

export interface TargetTabProps {
  hasKey: boolean | null;
  targets: DmarketTargetItem[];
  setTargets: React.Dispatch<React.SetStateAction<DmarketTargetItem[]>>;
  loading: boolean;
  fetchTargets: () => Promise<void>;
  isSidebarExpanded: boolean;
  onUserDataUpdated: () => Promise<void>;
  onOpenLookupModal: (
    title: string,
    acceptedPrice?: number,
    marketPrice?: number,
    iconUrl?: string,
  ) => void;
  onOpenEditModal: (
    target: DmarketTargetItem,
    analysis?: TargetAnalysis,
  ) => void;
  onOpenMarket: (title: string) => void;
  driftThresholdPercent?: number;
  setDriftThresholdPercent?: React.Dispatch<React.SetStateAction<number>>;
}

export const isAdvancedTarget = (target?: DmarketTargetItem | null): boolean => {
  if (!target) return false;
  return Boolean(
    target.isAdvanced === true ||
    target.attributes?.cs2?.isAdvanced === true ||
    target.extra?.isAdvanced === true
  );
};

export const calculateTargetDrift = (
  target: DmarketTargetItem,
  analysis?: TargetAnalysis,
  driftThresholdPercent: number = 2,
): TargetDriftDetails | null => {
  if (!analysis?.acceptedPrice) return null;

  const currentPrice = parseFloat(target.priceCents) / 100;
  const oraclePrice = analysis.acceptedPrice;

  const drift =
    oraclePrice > 0 ? (currentPrice - oraclePrice) / oraclePrice : 0;
  const thresholdFraction = (driftThresholdPercent ?? 2) / 100;

  const isAdvanced = isAdvancedTarget(target);
  const isOverbid = drift > thresholdFraction;
  const isUnderbid = drift < -thresholdFraction;
  // Advanced targets with custom attributes cannot be auto-updated, so action required is false
  const isActionRequired = !isAdvanced && (isOverbid || isUnderbid);

  return {
    acceptedPrice: oraclePrice,
    currentPrice,
    drift,
    driftPercent: drift * 100,
    isActionRequired,
    isOverbid,
    isUnderbid,
    trendMomentum14d: analysis.trendMomentum14d,
  };
};

export {
  TARGET_HOLD_DURATION_SECONDS,
  getTargetHoldInfo,
  parseTargetTimestamp,
  type TargetHoldInfo,
} from "../../utils/targetHoldUtils";
