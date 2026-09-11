import React from "react";
import toast from "react-hot-toast";
import { Zap, ChevronUp, ChevronDown, TrendingUp, Cpu } from "lucide-react";
import {
  BuildPreFilters,
  OracleStrategyProfile,
  NexusStrategyProfile,
} from "../../../store/useOracleStore";

import { PreFiltersPanel } from "./step2/PreFiltersPanel";
import { EngineStrategyPanel } from "./step2/EngineStrategyPanel";
import { NexusLabControls } from "./step2/NexusLabControls";
import { DevSimulatorPanel } from "./step2/DevSimulatorPanel";
import { CostLedgerSummary } from "./step2/CostLedgerSummary";

interface Step2AcceptedPricesProps {
  isOpen: boolean;
  onToggle: () => void;
  evaluatedSummary: {
    totalEvaluated: number;
    soCloseCount: number;
    highSssCount: number;
    isBatchEvaluating: boolean;
    lastBuiltAt: string | null;
    batchProgress?: {
      current: number;
      total: number;
      percent: number;
    } | null;
  };
  cacheStatus: {
    itemCount: number;
    isFetching: boolean;
    lastFetchedAt: string | null;
  };
  passingFilterCount: number;
  preFilters: BuildPreFilters;
  setPreFilters: React.Dispatch<React.SetStateAction<BuildPreFilters>>;
  toggleWear: (wearKey: keyof BuildPreFilters["allowedWears"]) => void;
  resetPreFilters: () => void;
  selectedEngine: "standard" | "nexus";
  setSelectedEngine: (engine: "standard" | "nexus") => void;
  strategyProfile: OracleStrategyProfile;
  setStrategyProfile: React.Dispatch<
    React.SetStateAction<OracleStrategyProfile>
  >;
  nexusProfile: NexusStrategyProfile;
  setNexusProfile: React.Dispatch<React.SetStateAction<NexusStrategyProfile>>;
  onBuildAcceptedPrices: () => void;
  canBuild: boolean;
}

export const Step2AcceptedPrices: React.FC<Step2AcceptedPricesProps> = ({
  isOpen,
  onToggle,
  evaluatedSummary,
  cacheStatus,
  passingFilterCount,
  preFilters,
  setPreFilters,
  toggleWear,
  resetPreFilters,
  selectedEngine,
  setSelectedEngine,
  strategyProfile,
  setStrategyProfile,
  nexusProfile,
  setNexusProfile,
  onBuildAcceptedPrices,
  canBuild,
}) => {
  const [unitCostCents, setUnitCostCents] = React.useState(0.001);
  const [nexusUnitCostCents, setNexusUnitCostCents] = React.useState(0.002);
  const [trendStats, setTrendStats] = React.useState<{
    daysCount: number;
    totalSnapshots: number;
    itemCoverage: number;
    latestDate: string | null;
    oldestDate: string | null;
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = React.useState(false);
  const [simulatedDate, setSimulatedDate] = React.useState<string | null>(null);
  const [isSeedingHistory, setIsSeedingHistory] = React.useState(false);
  const [isClearingHistory, setIsClearingHistory] = React.useState(false);
  const [seedDays, setSeedDays] = React.useState<number>(
    nexusProfile.trendWindow || 14,
  );

  React.useEffect(() => {
    if (nexusProfile.trendWindow) {
      setSeedDays(nexusProfile.trendWindow);
    }
  }, [nexusProfile.trendWindow]);

  const fetchConfigAndStats = React.useCallback(async () => {
    if (window.electronAPI?.system) {
      try {
        const config = await window.electronAPI.system.getConfig();
        if (config?.oracleUnitCostCents !== undefined) {
          setUnitCostCents(Number(config.oracleUnitCostCents));
        }
        if (config?.nexusUnitCostCents !== undefined) {
          setNexusUnitCostCents(Number(config.nexusUnitCostCents));
        }
      } catch (err) {
        console.warn(
          "[Step2AcceptedPrices] Failed to fetch system config:",
          err,
        );
      }
    }

    if (window.electronAPI?.trendStore) {
      try {
        setIsLoadingStats(true);
        const stats = await window.electronAPI.trendStore.getStats();
        setTrendStats(stats);
      } catch (err) {
        console.warn("[Step2AcceptedPrices] Failed to fetch trend stats:", err);
      } finally {
        setIsLoadingStats(false);
      }

      if (window.electronAPI.trendStore.getSimulatedDate) {
        try {
          const simDate =
            await window.electronAPI.trendStore.getSimulatedDate();
          setSimulatedDate(simDate);
        } catch {}
      }
    }
  }, []);

  React.useEffect(() => {
    fetchConfigAndStats();
  }, [fetchConfigAndStats, isOpen]);

  const handleSeedMockHistory = async (customDays?: number) => {
    if (!window.electronAPI?.trendStore?.seedMockHistory) return;
    const daysToSeed = customDays || seedDays || nexusProfile.trendWindow || 14;
    try {
      setIsSeedingHistory(true);
      const res =
        await window.electronAPI.trendStore.seedMockHistory(daysToSeed);
      toast.success(
        `Seeded ${res.seededDays} days of realistic trend data (${res.totalSnapshots.toLocaleString()} snapshots)!`,
      );
      await fetchConfigAndStats();
    } catch (err: any) {
      toast.error(
        err.message ||
          "Failed to seed mock trend history. Make sure price cache is loaded.",
      );
    } finally {
      setIsSeedingHistory(false);
    }
  };

  const handleClearTrendHistory = async () => {
    if (!window.electronAPI?.trendStore?.clear) return;
    if (
      !confirm(
        "Wipe all SQLite price snapshot history to test $0.00 cold-start safety?",
      )
    )
      return;
    try {
      setIsClearingHistory(true);
      const rows = await window.electronAPI.trendStore.clear();
      toast.success(`Wiped ${rows} snapshots. Cache is now empty (0 days).`);
      await fetchConfigAndStats();
    } catch (err: any) {
      toast.error(err.message || "Failed to clear trend history");
    } finally {
      setIsClearingHistory(false);
    }
  };

  const handleSetSimulatedDate = async (date: string | null) => {
    if (!window.electronAPI?.trendStore?.setSimulatedDate) return;
    try {
      const active = await window.electronAPI.trendStore.setSimulatedDate(date);
      setSimulatedDate(active);
      if (active) {
        toast(
          `Simulating date: ${active}. Any refetched prices will be recorded as this date.`,
        );
      } else {
        toast("Reset to live today date.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to set simulated date");
    }
  };

  const activeUnitCost =
    selectedEngine === "nexus" ? nexusUnitCostCents : unitCostCents;
  const isNexusTrendBlocked =
    selectedEngine === "nexus" &&
    (trendStats === null || trendStats.daysCount < 3);
  const effectiveCanBuild = canBuild && !isNexusTrendBlocked;

  const handleBuildAcceptedPrices = () => {
    if (isNexusTrendBlocked) {
      toast.error(
        `Cannot build with Nexus Pro: Minimum 3 days of trend history required (Recommended: 7 days). Currently have ${trendStats?.daysCount ?? 0} day(s).`,
      );
      return;
    }
    onBuildAcceptedPrices();
  };

  return (
    <div
      className="card"
      style={{
        border: "1px solid var(--so-border-medium)",
        padding: 0,
        overflow: "hidden",
      }}
    >
      {/* Accordion Header Bar */}
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          backgroundColor: isOpen
            ? "var(--so-surface-panel)"
            : "var(--so-surface-card)",
          borderBottom: isOpen ? "1px solid var(--so-border-subtle)" : "none",
          cursor: "pointer",
          userSelect: "none",
          transition: "background-color 0.15s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 800,
                color: "var(--so-text-primary)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Zap
                size={18}
                style={{
                  color:
                    selectedEngine === "nexus"
                      ? "var(--so-primary)"
                      : "var(--so-cyan-text)",
                }}
              />
              Calculate Accepted Prices (Buy Ceilings)
            </div>
            {!isOpen && (
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--so-text-muted)",
                  marginTop: "2px",
                }}
              >
                Engine:{" "}
                {selectedEngine === "nexus"
                  ? "OracleNexus v2 PRO (Trend-Shield)"
                  : "SkinOracle v20 STANDARD"}{" "}
                • Configure buy ceilings & risk filters
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            className={`badge ${selectedEngine === "nexus" ? "badge-primary" : "badge-cyan"}`}
            style={{
              fontSize: "11px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {selectedEngine === "nexus" ? (
              <TrendingUp size={12} />
            ) : (
              <Cpu size={12} />
            )}
            {selectedEngine === "nexus" ? "Nexus Pro" : "Standard"}
          </span>
          {selectedEngine === "nexus" && trendStats && (
            <span
              className={`badge ${trendStats.daysCount >= 7 ? "badge-primary" : trendStats.daysCount >= 3 ? "badge-primary" : trendStats.daysCount > 0 ? "badge-warning" : "badge-ghost"}`}
              style={{
                fontSize: "11px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {trendStats.daysCount >= 7
                ? `● Verified (${trendStats.daysCount}d)`
                : trendStats.daysCount >= 3
                  ? `● Verified (${trendStats.daysCount}d — Recommended 7d)`
                  : trendStats.daysCount > 0
                    ? `▲ Baseline Building (${trendStats.daysCount}/3 Days — Recommended 7 Days)`
                    : `○ No History (0/3 Days — Recommended 7 Days)`}
            </span>
          )}
          <span
            className={`badge ${evaluatedSummary.lastBuiltAt ? "badge-cyan" : "badge-ghost"}`}
            style={{ fontSize: "11px" }}
          >
            {evaluatedSummary.lastBuiltAt
              ? `✓ Built (${evaluatedSummary.totalEvaluated.toLocaleString()} Items)`
              : "Not Built Yet"}
          </span>
          {isOpen ? (
            <ChevronUp size={18} style={{ color: "var(--so-text-muted)" }} />
          ) : (
            <ChevronDown size={18} style={{ color: "var(--so-text-muted)" }} />
          )}
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: "20px" }}>
          <p className="card-desc" style={{ marginBottom: "16px" }}>
            Takes cached pricing data from active price providers (Skinsnipe)
            and evaluates target accepted prices across CSFloat and Skins.com
            workstations.
          </p>

          {/* Section 1: Smart Pre-Evaluation Filters */}
          <PreFiltersPanel
            preFilters={preFilters}
            setPreFilters={setPreFilters}
            toggleWear={toggleWear}
            resetPreFilters={resetPreFilters}
            passingFilterCount={passingFilterCount}
            totalCacheCount={cacheStatus.itemCount}
          />

          {/* Engine Selection & Section 2 Valuation Strategy Profile */}
          <EngineStrategyPanel
            selectedEngine={selectedEngine}
            setSelectedEngine={setSelectedEngine}
            unitCostCents={unitCostCents}
            nexusUnitCostCents={nexusUnitCostCents}
            strategyProfile={strategyProfile}
            setStrategyProfile={setStrategyProfile}
          />

          {/* Section 3: Nexus Trend & Capital Shield Protection (Nexus Mode Only) */}
          {selectedEngine === "nexus" && (
            <NexusLabControls
              nexusProfile={nexusProfile}
              setNexusProfile={setNexusProfile}
            />
          )}

          {/* Section 4: Local SQLite Analytics & Dev Simulator */}
          <DevSimulatorPanel
            trendStats={trendStats}
            isLoadingStats={isLoadingStats}
            fetchConfigAndStats={fetchConfigAndStats}
            simulatedDate={simulatedDate}
            seedDays={seedDays}
            setSeedDays={setSeedDays}
            isSeedingHistory={isSeedingHistory}
            handleSeedMockHistory={handleSeedMockHistory}
            handleSetSimulatedDate={handleSetSimulatedDate}
            isClearingHistory={isClearingHistory}
            handleClearTrendHistory={handleClearTrendHistory}
          />

          {/* Section 5: Cost Breakdown & Build Trigger */}
          <CostLedgerSummary
            passingFilterCount={passingFilterCount}
            activeUnitCost={activeUnitCost}
            selectedEngine={selectedEngine}
            cacheStatus={cacheStatus}
            evaluatedSummary={evaluatedSummary}
            strategyProfilePreset={strategyProfile.preset}
            canBuild={effectiveCanBuild}
            onBuildAcceptedPrices={handleBuildAcceptedPrices}
            isNexusTrendBlocked={isNexusTrendBlocked}
            trendDaysCount={trendStats?.daysCount ?? 0}
          />
        </div>
      )}
    </div>
  );
};
