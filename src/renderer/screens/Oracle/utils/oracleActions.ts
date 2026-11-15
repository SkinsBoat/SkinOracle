import toast from "react-hot-toast";
import {
  OracleStrategyProfile,
  NexusStrategyProfile,
  ProfitOverridePolicy,
  AcceptedPriceInfo,
} from "../../../../shared/types/oracle.types";
import { SkinsnipeMarketId } from "../../../../shared/types";
import { isMarketMatch } from "../../../../shared/canonicalMarkets";
import { SKINSNIPE_AVAILABLE_MARKETS } from "../components/step1/skinsnipeMarkets";
import { passesSmartPreFilters, isBlockedBySkinList, roundToCsFloatStep } from "./oracleUtils";
import { applyProfitOverride } from "./profitOverride";
import { useOracleStore } from "../../../store/useOracleStore";

const CHUNK_SIZE = 1500;

export interface OracleBuildDeps {
  setEvaluatedSummary: (updater: any) => void;
  toast: {
    success: (msg: string, opts?: any) => void;
    error: (msg: string, opts?: any) => void;
  };
}

export interface OracleBuildResult {
  total: number;
  totalEvaluated: number;
  storedAt: string | null;
}

/**
 * Shared, single implementation of "Calculate Accepted Prices (Buy Ceilings)".
 * Used both by OracleDashboard (Step 2) and the global quick-actions card so
 * the trader can trigger it from any screen without repeating the logic.
 */
export async function runBuildAcceptedPrices(
  deps: OracleBuildDeps,
): Promise<OracleBuildResult | null> {
  const {
    setEvaluatedSummary,
    toast: { success, error },
  } = deps;

  const {
    preFilters,
    blockedSkins,
    selectedEngine,
    strategyProfile,
    nexusProfile,
    profitOverride,
    selectedMarkets,
  } = useOracleStore.getState();

  const blockedSet = new Set(blockedSkins);
  const electronAPI = window.electronAPI;

  if (evaluatedSummaryIsBatchEvaluating()) return null;

  setEvaluatedSummary((prev: any) => ({
    ...prev,
    isBatchEvaluating: true,
    batchProgress: null,
  }));

  let activeBatchId: string | null = null;
  let total = 0;
  let totalEvaluated = 0;
  let soClose = 0;
  let highLiq = 0;
  const acceptedPriceMap: Record<string, AcceptedPriceInfo> = {};

  try {
    const fullCache: any =
      electronAPI?.marketCache?.get
        ? await electronAPI.marketCache.get()
        : {};
    const allItemNames = Object.keys(fullCache || {});

    if (allItemNames.length === 0) {
      error(
        "No price cache found. Please scan prices via Skinsnipe or load a JSON cache file first.",
      );
      setEvaluatedSummary((prev: any) => ({
        ...prev,
        isBatchEvaluating: false,
        batchProgress: null,
      }));
      return null;
    }

    const filteredItemNames = allItemNames.filter(
      (name) =>
        passesSmartPreFilters(name, preFilters, fullCache[name]) &&
        !isBlockedBySkinList(name, blockedSet),
    );

    if (filteredItemNames.length === 0) {
      error(
        "0 items matched your smart pre-filters. Please broaden your wear or category filters.",
      );
      setEvaluatedSummary((prev: any) => ({
        ...prev,
        isBatchEvaluating: false,
        batchProgress: null,
      }));
      return null;
    }

    setEvaluatedSummary((prev: any) => ({
      ...prev,
      batchProgress: {
        current: 0,
        total: filteredItemNames.length,
        percent: 0,
      },
    }));

    const isNexus = selectedEngine === "nexus";

    if (isNexus && electronAPI?.trendStore) {
      try {
        const stats = await electronAPI.trendStore.getStats();
        const spanDays =
          stats?.oldestDate && stats?.latestDate
            ? Math.round(
                (Date.parse(`${stats.latestDate}T00:00:00Z`) -
                  Date.parse(`${stats.oldestDate}T00:00:00Z`)) /
                  (1000 * 60 * 60 * 24),
              ) + 1
            : 0;
        const missingDays = stats
          ? Math.max(0, spanDays - stats.daysCount)
          : 0;
        if (!stats || stats.daysCount < 3 || missingDays > 3) {
          error(
            missingDays > 3
              ? `Cannot build with Nexus Pro: trend history has ${missingDays} missing days (max 3 allowed). Purchase a clean trend pack or scan daily to restore continuity.`
              : `Cannot build with Nexus Pro: Minimum 3 days of trend history required (Recommended: 7 days). Currently have ${stats?.daysCount ?? 0} day(s).`,
          );
          setEvaluatedSummary((prev: any) => ({
            ...prev,
            isBatchEvaluating: false,
            batchProgress: null,
          }));
          return null;
        }
      } catch (trendErr) {
        console.warn("[OracleActions] Failed to verify trend stats:", trendErr);
      }
    }

    const batchStartRes = isNexus
      ? await electronAPI.oracle.startNexusBatch(filteredItemNames.length)
      : await electronAPI.oracle.startBatch(filteredItemNames.length);
    activeBatchId = batchStartRes.batchId;

    for (let i = 0; i < filteredItemNames.length; i += CHUNK_SIZE) {
      const chunk = filteredItemNames.slice(i, i + CHUNK_SIZE);
      const evalRes = isNexus
        ? await electronAPI.oracle.evaluateNexus(
            chunk,
            strategyProfile,
            nexusProfile,
            activeBatchId || undefined,
          )
        : await electronAPI.oracle.evaluate(
            chunk,
            strategyProfile,
            activeBatchId || undefined,
          );
      totalEvaluated += chunk.length;

      if (evalRes?.results) {
        evalRes.results.forEach((r: any) => {
          if (r.oracle?.finalAcceptedPrice) {
            const acceptedPrice = roundToCsFloatStep(
              r.oracle.finalAcceptedPrice,
            );
            const baseInfo: AcceptedPriceInfo = {
              acceptedPrice,
              supplyStabilityScore: r.oracle.supplyStabilityScore || 0,
              isHyperStable: r.oracle.isHyperStable || false,
              nexusDelta: r.oracle.nexusDelta,
              trendAdjustment: r.oracle.trendAdjustment,
              trendConfidence: r.oracle.trendConfidence,
              trendMomentum14d: r.oracle.trendMomentum14d,
              nexusConfidence: r.oracle.nexusConfidence,
              v1Benchmark: r.oracle.v1Benchmark,
            };
            const overridden = applyProfitOverride(
              baseInfo,
              r.name,
              profitOverride,
            );
            acceptedPriceMap[r.name] = overridden;
            total++;
            if ((r.oracle.supplyStabilityScore || 0) >= 1.2) highLiq++;

            const cacheListings = fullCache[r.name]?.l;
            if (Array.isArray(cacheListings)) {
              const activeMarkets =
                selectedMarkets && selectedMarkets.length > 0
                  ? selectedMarkets
                  : SKINSNIPE_AVAILABLE_MARKETS.map((m) => m.id);
              const hasSoCloseDeal = cacheListings.some((l: any) => {
                if (!l || !l.m || !l.p || l.p <= 0) return false;
                const isTargetMarket = activeMarkets.some((mId) =>
                  isMarketMatch(l.m, mId),
                );
                return (
                  isTargetMarket &&
                  overridden.acceptedPrice > 0 &&
                  l.p / overridden.acceptedPrice <= 1.1
                );
              });
              if (hasSoCloseDeal) soClose++;
            }
          }
        });
      }

      const current = Math.min(totalEvaluated, filteredItemNames.length);
      const percent = Math.round((current / filteredItemNames.length) * 100);

      setEvaluatedSummary((prev: any) => ({
        ...prev,
        totalEvaluated: total,
        soCloseCount: soClose,
        highSssCount: highLiq,
        batchProgress: { current, total: filteredItemNames.length, percent },
      }));

      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    success(
      `Computed accepted prices for ${total.toLocaleString()} items using ${
        isNexus ? "ORACLENEXUS PRO" : strategyProfile.preset.toUpperCase()
      } strategy!`,
    );
  } catch (err: any) {
    console.error("[OracleActions] Calculate Accepted Prices error:", err);
    const isRestartHold =
      err?.message?.includes("preparing for server restart") ||
      err?.message?.includes("ENGINE_RESTART_HOLD") ||
      err?.message?.includes("temporarily paused");

    if (isRestartHold) {
      error(
        "⚠️ Server is currently preparing for restart. Calculating accepted prices is temporarily paused. Please wait 10 seconds.",
        { duration: 8000, icon: "⏳" },
      );
    } else if (totalEvaluated > 0) {
      error(
        `Evaluation interrupted after ${totalEvaluated.toLocaleString()} items evaluated (${total.toLocaleString()} priced): ${err.message}. Processed prices were saved!`,
        { duration: 8000 },
      );
    } else {
      error(`Calculate Accepted Prices failed: ${err.message}`);
    }
  } finally {
    if (activeBatchId) {
      try {
        const finishRes = await electronAPI.oracle.finishBatch(
          activeBatchId,
          totalEvaluated,
        );
        if (finishRes && finishRes.refundedCents > 0) {
          success(
            `Auto-refunded $${(finishRes.refundedCents / 100).toFixed(2)} for ${finishRes.unusedItems.toLocaleString()} unused items.`,
            { icon: "💰" },
          );
        }
      } catch (finishErr) {
        console.warn(
          "[OracleActions] Failed to finish batch cleanly:",
          finishErr,
        );
      }
    }

    if (Object.keys(acceptedPriceMap).length > 0) {
      const storeResult =
        await electronAPI.oracle.storeAcceptedPrices(acceptedPriceMap);
      const builtAt = storeResult?.storedAt || new Date().toISOString();

      setEvaluatedSummary({
        totalEvaluated: total,
        soCloseCount: soClose,
        highSssCount: highLiq,
        isBatchEvaluating: false,
        lastBuiltAt: builtAt,
        batchProgress: null,
      });
    } else {
      setEvaluatedSummary((prev: any) => ({
        ...prev,
        isBatchEvaluating: false,
        batchProgress: null,
      }));
    }
  }

  return { total, totalEvaluated, storedAt: null };
}

/**
 * Shared "Scan Wide": switch to baseline scope, stop auto-refresh, run a
 * one-time price scan/stream using the current provider & market set.
 */
export async function runScanWide(): Promise<void> {
  useOracleStore.getState().setActiveScope("baseline");
  await window.electronAPI.autoRefresh?.stop?.();
  const { pricingProvider, selectedMarkets, selectedCs2capProviders } =
    useOracleStore.getState();
  const toastId = toast.loading("Scanning wide — baseline scope…");
  try {
    if (pricingProvider === "cs2cap") {
      await window.electronAPI.cs2cap?.fetchPrices?.({
        providers: selectedCs2capProviders,
        scope: "baseline",
      });
    } else {
      await window.electronAPI.skinsnipe?.fetchPrices?.(
        selectedMarkets,
        "baseline",
      );
    }
    toast.success("Wide scan started — baseline scope, auto-refresh off", {
      id: toastId,
    });
  } catch (err: any) {
    toast.error(err.message || "Wide scan failed", { id: toastId });
  }
}

/**
 * Shared "Scan Snipe": switch to snipe scope, enable auto-refresh (runs a
 * cycle immediately on enable) using the current provider & market set.
 */
export async function runScanSnipe(): Promise<void> {
  useOracleStore.getState().setActiveScope("snipe");
  const { pricingProvider, selectedMarkets, selectedCs2capProviders } =
    useOracleStore.getState();
  try {
    await window.electronAPI.autoRefresh?.setConfig?.({
      enabled: true,
      provider: pricingProvider,
      scope: "snipe",
      intervalMinutes: 5,
      ...(pricingProvider === "skinsnipe"
        ? { markets: selectedMarkets }
        : { providers: selectedCs2capProviders }),
    });
    toast.success("Snipe scan mode — auto-refresh enabled (5 min)");
  } catch (err: any) {
    toast.error(err.message || "Failed to enable snipe auto-refresh");
  }
}

function evaluatedSummaryIsBatchEvaluating(): boolean {
  try {
    // read from the dashboard's local state is not available here; the caller
    // guards via canBuild before invoking. This is a no-op safety hook kept for
    // signature symmetry.
    return false;
  } catch {
    return false;
  }
}

export type {
  OracleStrategyProfile,
  NexusStrategyProfile,
  ProfitOverridePolicy,
};
export type { SkinsnipeMarketId };
