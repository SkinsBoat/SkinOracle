import React from "react";
import toast from "react-hot-toast";
import { confirmModal } from "../../../store/useConfirmStore";
import {
  Zap,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Cpu,
  RotateCw,
  Loader2,
  Clock,
  Ban,
} from "lucide-react";
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
import { evaluateTrendHealth, formatTimeAgo } from "../utils/oracleUtils";

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
  blockedSkins: string[];
  blockSkin: (name: string) => void;
  unblockSkin: (name: string) => void;
  clearBlockedSkins: () => void;
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
  blockedSkins,
  blockSkin,
  unblockSkin,
  clearBlockedSkins,
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

  const [, setTicker] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setTicker((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

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
    const confirmed = await confirmModal({
      title: "Wipe SQLite Snapshot History?",
      message:
        "Are you sure you want to wipe all SQLite price snapshot history to test $0.00 cold-start safety? Historical snapshots will be cleared.",
      confirmText: "Wipe History",
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!confirmed) return;
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
          `Simulating date: ${active}. Any newly updated prices will be recorded as this date.`,
        );
      } else {
        toast("Reset to live today date.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to set simulated date");
    }
  };

  const trendHealth = React.useMemo(() => {
    return evaluateTrendHealth(trendStats, simulatedDate);
  }, [trendStats, simulatedDate]);

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
    <div className="card" style={getAccordionCardStyle(isOpen)}>
      {/* Accordion Header Bar */}
      <div onClick={onToggle} style={getAccordionHeaderStyle(isOpen)}>
        <div style={styles.headerLeft}>
          <div>
            <div style={styles.headerTitle}>
              <Zap size={18} style={getEngineIconStyle(selectedEngine)} />
              Calculate Accepted Prices (Buy Ceilings)
            </div>
            <div style={styles.headerSubtitle}>
              Engine:{" "}
              {selectedEngine === "nexus"
                ? "OracleNexus v2 PRO (Trend-Shield)"
                : "SkinOracle v20 STANDARD"}
              {evaluatedSummary.lastBuiltAt
                ? ` • Calculated ${formatTimeAgo(evaluatedSummary.lastBuiltAt)} (${evaluatedSummary.totalEvaluated.toLocaleString()} items)`
                : " • Configure buy ceilings & risk filters"}
            </div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <span
            className={`badge ${selectedEngine === "nexus" ? "badge-cyan" : "badge-ghost"}`}
            style={styles.engineBadge}
          >
            {selectedEngine === "nexus" ? (
              <TrendingUp size={12} />
            ) : (
              <Cpu size={12} />
            )}
            {selectedEngine === "nexus" ? "Nexus Pro" : "Standard"}
          </span>
          {selectedEngine === "nexus" && (
            <span
              className={`badge ${
                trendHealth.isStale || trendHealth.isInsufficient
                  ? "badge-warning"
                  : "badge-ghost"
              }`}
              style={{
                ...styles.trendHealthBadge,
                ...getStaleBadgeStyle(trendHealth.isStale),
              }}
              title={
                trendHealth.warningMessage ||
                `Trend Data: ${trendHealth.badgeText}`
              }
            >
              {trendHealth.isInsufficient
                ? `▲ ${trendHealth.daysCount}/3d`
                : trendHealth.isStale
                  ? `▲ Stale (${trendHealth.daysSinceLatest}d)`
                  : `● ${trendStats?.daysCount ?? 0}d Trend`}
            </span>
          )}
          <span
            className={`badge ${evaluatedSummary.lastBuiltAt ? "badge-success" : "badge-ghost"}`}
            style={styles.headerBadge}
          >
            {evaluatedSummary.lastBuiltAt
              ? `✓ ${evaluatedSummary.totalEvaluated.toLocaleString()} Items`
              : "Not Calculated"}
          </span>

          <span
            className="badge badge-ghost"
            style={styles.timeAgoBadge}
            title={
              evaluatedSummary.lastBuiltAt
                ? `Last calculated: ${evaluatedSummary.lastBuiltAt}`
                : "Not calculated yet"
            }
          >
            <Clock size={11} style={styles.timeAgoIcon} />
            {formatTimeAgo(evaluatedSummary.lastBuiltAt)}
          </span>

          <div style={getHeaderActionContainerStyle(isOpen)}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={styles.headerActionBtn}
              onClick={(e) => {
                e.stopPropagation();
                handleBuildAcceptedPrices();
              }}
              disabled={
                !effectiveCanBuild ||
                evaluatedSummary.isBatchEvaluating ||
                cacheStatus.itemCount === 0
              }
              title={
                cacheStatus.itemCount === 0
                  ? "Price cache required (Scan Step 1 first)"
                  : isNexusTrendBlocked
                    ? `Nexus Pro requires at least 3 days of trend history (${trendStats?.daysCount ?? 0}/3 days)`
                    : evaluatedSummary.lastBuiltAt
                      ? "Recalculate Buy Ceilings using current engine & filters"
                      : "Calculate Buy Ceilings"
              }
            >
              {evaluatedSummary.isBatchEvaluating ? (
                <>
                  <Loader2 size={13} className="spin" />
                  {evaluatedSummary.batchProgress
                    ? `${evaluatedSummary.batchProgress.percent}%`
                    : "Calculating…"}
                </>
              ) : evaluatedSummary.lastBuiltAt ? (
                <>
                  <RotateCw size={13} /> Recalculate
                </>
              ) : (
                <>
                  <Zap size={13} /> Calculate
                </>
              )}
            </button>
          </div>

          <ChevronDown size={18} style={getChevronStyle(isOpen)} />
        </div>
      </div>

      <div style={getAccordionCollapseStyle(isOpen)}>
        <div style={getAccordionInnerStyle(isOpen)}>
          <div style={styles.body}>
            <p className="card-desc" style={styles.cardDesc}>
              Takes pre-filtered pricing data from active price providers and
              evaluates target accepted prices across CSFloat and Skins.com
              workstations. Unhedged, illiquid, or high-risk items are
              automatically suppressed by your risk profile and engine safety
              shields to protect capital.
            </p>

            {/* Blocked Skins Hint */}
            {blockedSkins.length > 0 && (
              <div style={styles.blockedSkinsHint}>
                <Ban size={13} style={styles.blockedHintIcon} />
                <span>
                  <strong>{blockedSkins.length}</strong> skin pattern
                  {blockedSkins.length !== 1 ? "s" : ""} blocked
                  &nbsp;&mdash;&nbsp;Oracle will silently skip all their
                  variants during evaluation.
                </span>
              </div>
            )}

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
              trendHealth={trendHealth}
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
              trendHealth={trendHealth}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC STYLE HELPERS ─────────────────────────

function getAccordionCardStyle(isOpen: boolean): React.CSSProperties {
  return {
    ...styles.cardContainer,
    borderColor: isOpen ? "var(--so-border-strong)" : "var(--so-border-medium)",
    boxShadow: isOpen ? "0 4px 20px rgba(0, 0, 0, 0.2)" : "none",
    transition: "border-color 0.25s ease, box-shadow 0.25s ease",
  };
}

function getAccordionHeaderStyle(isOpen: boolean): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    backgroundColor: isOpen
      ? "var(--so-surface-panel)"
      : "var(--so-surface-card)",
    borderBottom: "1px solid",
    borderBottomColor: isOpen ? "var(--so-border-subtle)" : "transparent",
    cursor: "pointer",
    userSelect: "none",
    transition: "background-color 0.25s ease, border-color 0.25s ease",
  };
}

function getAccordionCollapseStyle(isOpen: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateRows: isOpen ? "1fr" : "0fr",
    transition: "grid-template-rows 0.55s cubic-bezier(0.25, 1, 0.35, 1)",
    overflow: "hidden",
  };
}

function getAccordionInnerStyle(isOpen: boolean): React.CSSProperties {
  return {
    minHeight: 0,
    overflow: "hidden",
    opacity: isOpen ? 1 : 0,
    transform: isOpen ? "translateY(0)" : "translateY(-8px)",
    transition:
      "opacity 0.42s cubic-bezier(0.25, 1, 0.35, 1), transform 0.55s cubic-bezier(0.25, 1, 0.35, 1), visibility 0.55s ease",
    visibility: isOpen ? "visible" : "hidden",
  };
}

function getChevronStyle(isOpen: boolean): React.CSSProperties {
  return {
    ...styles.chevronIcon,
    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
    transition: "transform 0.4s cubic-bezier(0.25, 1, 0.35, 1)",
  };
}

function getHeaderActionContainerStyle(isOpen: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    opacity: isOpen ? 0 : 1,
    maxWidth: isOpen ? 0 : 160,
    overflow: "hidden",
    pointerEvents: isOpen ? "none" : "auto",
    transition:
      "opacity 0.2s ease, max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    whiteSpace: "nowrap",
  };
}

function getEngineIconStyle(
  selectedEngine: "standard" | "nexus",
): React.CSSProperties {
  return {
    color:
      selectedEngine === "nexus" ? "var(--so-primary)" : "var(--so-cyan-text)",
  };
}

function getStaleBadgeStyle(isStale?: boolean): React.CSSProperties {
  if (!isStale) return {};
  return {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "var(--so-danger-text, #ef4444)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
  };
}

const styles: Record<string, React.CSSProperties> = {
  cardContainer: {
    border: "1px solid var(--so-border-medium)",
    padding: 0,
    overflow: "hidden",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
    flex: "1 1 auto",
  },
  headerTitle: {
    fontSize: "15px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    whiteSpace: "nowrap",
  },
  headerSubtitle: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
    marginTop: "2px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "nowrap",
    flexShrink: 0,
  },
  engineBadge: {
    fontSize: "11px",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    whiteSpace: "nowrap",
  },
  trendHealthBadge: {
    fontSize: "11px",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    whiteSpace: "nowrap",
  },
  headerBadge: {
    fontSize: "11px",
    whiteSpace: "nowrap",
  },
  timeAgoBadge: {
    fontSize: "11px",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--so-text-muted)",
    border: "1px solid var(--so-border-subtle)",
    whiteSpace: "nowrap",
  },
  timeAgoIcon: {
    opacity: 0.75,
  },
  headerActionBtn: {
    padding: "3px 10px",
    fontSize: "11.5px",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    height: "26px",
    whiteSpace: "nowrap",
  },
  chevronIcon: {
    color: "var(--so-text-muted)",
  },
  body: {
    padding: "20px",
  },
  cardDesc: {
    marginBottom: "16px",
  },
  blockedSkinsHint: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 12px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-subtle)",
    fontSize: "12px",
    color: "var(--so-text-muted)",
    marginBottom: "14px",
  },
  blockedHintIcon: {
    color: "var(--so-text-muted)",
    flexShrink: 0,
    opacity: 0.6,
  },
};
