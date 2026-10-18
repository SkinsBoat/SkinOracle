import React from "react";
import {
  Loader2,
  RefreshCw,
  Sliders,
  ChevronLeft,
  ChevronRight,
  History,
  CheckSquare,
  Wallet,
} from "lucide-react";
import { FilterAction } from "../types";

export interface TargetToolbarProps {
  targetSubTab: "active" | "history";
  setTargetSubTab: (tab: "active" | "history") => void;
  targetsCount: number;
  actionRequiredCount: number;
  driftCount?: number;
  unmatchedCount?: number;
  safeCount?: number;
  exceedsBalanceCount?: number;
  userBalance?: number;
  holdCount?: number;
  showExtraOptions: boolean;
  setShowExtraOptions: React.Dispatch<React.SetStateAction<boolean>>;
  driftThresholdPercent: number;
  setDriftThresholdPercent: (val: number) => void;
  filterAction: FilterAction;
  setFilterAction: (action: FilterAction) => void;
  selectableFilteredCount: number;
  isAllFilteredSelected: boolean;
  onToggleSelectFiltered: () => void;
  onSyncTargets: () => void;
  loadingTargets: boolean;
  onLoadAcceptedPrices?: () => void;
  loadingPrices?: boolean;
  hasAcceptedPricesMeta?: boolean;
}

type ChipType =
  | "all"
  | "action"
  | "drift"
  | "unmatched"
  | "safe"
  | "hold"
  | "exceeds";

const getFilterSelectLabel = (filter: FilterAction, count: number): string => {
  switch (filter) {
    case "action_required":
      return `Action ${count}`;
    case "drift":
      return `Drift ${count}`;
    case "unmatched":
      return `Unmatched ${count}`;
    case "safe":
      return `Safe ${count}`;
    case "hold":
      return `Hold ${count}`;
    case "exceeds":
      return `Exceeds ${count}`;
    case "all":
    default:
      return `Select ${count}`;
  }
};

export const TargetToolbar: React.FC<TargetToolbarProps> = ({
  targetSubTab,
  setTargetSubTab,
  targetsCount,
  actionRequiredCount,
  driftCount = 0,
  unmatchedCount = 0,
  safeCount = 0,
  exceedsBalanceCount = 0,
  userBalance,
  selectableFilteredCount,
  isAllFilteredSelected,
  onToggleSelectFiltered,
  holdCount = 0,
  showExtraOptions,
  setShowExtraOptions,
  driftThresholdPercent,
  setDriftThresholdPercent,
  filterAction,
  setFilterAction,
  onSyncTargets,
  loadingTargets,
}) => {
  return (
    <div style={styles.container}>
      {/* Left Controls: Sub-Tabs, Options & Status Filter Chips */}
      <div style={styles.leftControls}>
        <div style={styles.subTabGroup}>
          <button
            type="button"
            onClick={() => setTargetSubTab("active")}
            style={getSubTabButtonStyle(targetSubTab === "active")}
          >
            Active ({targetsCount})
          </button>
          <button
            type="button"
            onClick={() => setTargetSubTab("history")}
            style={{
              ...getSubTabButtonStyle(targetSubTab === "history"),
              ...styles.historyButton,
            }}
          >
            <History size={12} /> History
          </button>
        </div>

        {targetSubTab === "active" && (
          <div style={styles.optionsWrapper}>
            <button
              type="button"
              onClick={() => setShowExtraOptions((prev) => !prev)}
              className="btn btn-sm"
              style={getOptionsButtonStyle(showExtraOptions)}
              title="Toggle Threshold & Options"
            >
              <Sliders size={12} />
              <span style={styles.optionsButtonText}>
                {showExtraOptions ? "Hide" : "Options"}
              </span>
              {driftThresholdPercent !== 2 && (
                <span style={styles.thresholdActiveDot} />
              )}
              {showExtraOptions ? (
                <ChevronLeft size={13} />
              ) : (
                <ChevronRight size={13} />
              )}
            </button>

            <div style={getOptionsCollapsibleStyle(showExtraOptions)}>
              <div style={styles.thresholdInputBox}>
                <span style={styles.thresholdLabel}>Threshold:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={driftThresholdPercent}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    setDriftThresholdPercent(
                      isNaN(parsed) ? 0 : Math.max(0, parsed),
                    );
                  }}
                  style={styles.thresholdInput}
                />
                <span style={styles.thresholdUnit}>%</span>
              </div>
            </div>
          </div>
        )}

        {/* Status Filter Chips + Select Filtered (single grouped bar) */}
        {targetSubTab === "active" && (
          <div style={styles.statusChipsWrapper}>
            <button
              type="button"
              onClick={() => setFilterAction("all")}
              style={getFilterChipStyle(filterAction === "all", "all")}
            >
              All ({targetsCount})
            </button>

            {actionRequiredCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setFilterAction(
                    filterAction === "action_required" ? "all" : "action_required",
                  )
                }
                style={getFilterChipStyle(
                  filterAction === "action_required",
                  "action",
                )}
              >
                Action ({actionRequiredCount})
              </button>
            )}

            {driftCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setFilterAction(filterAction === "drift" ? "all" : "drift")
                }
                style={getFilterChipStyle(filterAction === "drift", "drift")}
                title={`${driftCount} target(s) drifting from Oracle Buy Ceiling`}
              >
                Drift ({driftCount})
              </button>
            )}

            {unmatchedCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setFilterAction(
                    filterAction === "unmatched" ? "all" : "unmatched",
                  )
                }
                style={getFilterChipStyle(
                  filterAction === "unmatched",
                  "unmatched",
                )}
                title={`${unmatchedCount} target(s) have no matching Oracle Buy Ceiling`}
              >
                Unmatched ({unmatchedCount})
              </button>
            )}

            {safeCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setFilterAction(filterAction === "safe" ? "all" : "safe")
                }
                style={getFilterChipStyle(filterAction === "safe", "safe")}
              >
                Safe ({safeCount})
              </button>
            )}

            {holdCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setFilterAction(filterAction === "hold" ? "all" : "hold")
                }
                style={getFilterChipStyle(filterAction === "hold", "hold")}
                title={`${holdCount} target(s) currently under 11-minute hold`}
              >
                Hold ({holdCount})
              </button>
            )}

            {exceedsBalanceCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setFilterAction(filterAction === "exceeds" ? "all" : "exceeds")
                }
                style={getFilterChipStyle(
                  filterAction === "exceeds",
                  "exceeds",
                )}
                title={`Filter targets whose bid exceeds wallet balance${typeof userBalance === "number" ? ` ($${userBalance.toFixed(2)})` : ""}`}
              >
                <Wallet size={10} /> Exceeds ({exceedsBalanceCount})
              </button>
            )}

            {selectableFilteredCount > 0 && (
              <button
                type="button"
                onClick={onToggleSelectFiltered}
                className={`btn ${isAllFilteredSelected ? "btn-primary" : "btn-outline"} btn-sm`}
                style={styles.selectFilteredButton}
                title={
                  isAllFilteredSelected
                    ? `Click to unselect ${getFilterSelectLabel(filterAction, selectableFilteredCount).toLowerCase()} targets`
                    : `Click to select all ${selectableFilteredCount} targets in current filter`
                }
              >
                <CheckSquare size={13} />
                <span>
                  {getFilterSelectLabel(filterAction, selectableFilteredCount)}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right Controls: Main Action */}
      {targetSubTab === "active" && (
        <div style={styles.rightControls}>
          <button
            className="btn btn-primary btn-sm"
            onClick={onSyncTargets}
            disabled={loadingTargets}
            title="Refresh DMarket active targets"
            style={styles.syncButton}
          >
            {loadingTargets ? (
              <Loader2 size={12} className="spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            <span>Sync Targets</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC STYLE HELPERS ─────────────────────────

const getSubTabButtonStyle = (isActive: boolean): React.CSSProperties => ({
  padding: "3px 10px",
  fontSize: "11.5px",
  fontWeight: 700,
  borderRadius: "4px",
  border: "none",
  cursor: "pointer",
  backgroundColor: isActive ? "var(--so-primary)" : "transparent",
  color: isActive ? "#ffffff" : "var(--so-text-secondary)",
  transition: "all 0.15s ease",
});

const getOptionsButtonStyle = (isOpen: boolean): React.CSSProperties => ({
  backgroundColor: isOpen ? "var(--so-surface-input)" : "transparent",
  color: isOpen ? "var(--so-primary)" : "var(--so-text-muted)",
  border: "1px solid var(--so-border-subtle)",
  padding: "3px 7px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 700,
  borderRadius: "4px",
});

const getOptionsCollapsibleStyle = (isOpen: boolean): React.CSSProperties => ({
  maxWidth: isOpen ? "220px" : "0px",
  opacity: isOpen ? 1 : 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  display: "flex",
  alignItems: "center",
  gap: "6px",
});

const getFilterChipStyle = (
  active: boolean,
  type: ChipType,
): React.CSSProperties => {
  const base: React.CSSProperties = {
    fontSize: "10.5px",
    fontWeight: active ? 800 : 600,
    padding: "2px 8px",
    borderRadius: "3px",
    cursor: "pointer",
    transition: "all 0.15s ease",
  };

  switch (type) {
    case "all":
      return {
        ...base,
        border: "none",
        backgroundColor: active ? "var(--so-primary)" : "transparent",
        color: active ? "#ffffff" : "var(--so-text-muted)",
      };
    case "action":
      return {
        ...base,
        border: `1px solid ${active ? "rgba(245, 158, 11, 0.5)" : "transparent"}`,
        backgroundColor: active ? "rgba(245, 158, 11, 0.22)" : "transparent",
        color: active ? "#fbbf24" : "var(--so-text-secondary)",
      };
    case "drift":
      return {
        ...base,
        border: `1px solid ${active ? "rgba(6, 182, 212, 0.5)" : "transparent"}`,
        backgroundColor: active ? "rgba(6, 182, 212, 0.22)" : "transparent",
        color: active ? "var(--so-accent-cyan)" : "var(--so-text-secondary)",
      };
    case "unmatched":
      return {
        ...base,
        border: `1px solid ${active ? "rgba(148, 163, 184, 0.5)" : "transparent"}`,
        backgroundColor: active ? "rgba(148, 163, 184, 0.2)" : "transparent",
        color: active ? "#ffffff" : "var(--so-text-secondary)",
      };
    case "safe":
      return {
        ...base,
        border: `1px solid ${active ? "rgba(34, 197, 94, 0.5)" : "transparent"}`,
        backgroundColor: active ? "rgba(34, 197, 94, 0.22)" : "transparent",
        color: active ? "#4ade80" : "var(--so-text-secondary)",
      };
    case "hold":
      return {
        ...base,
        border: `1px solid ${active ? "rgba(168, 85, 247, 0.5)" : "transparent"}`,
        backgroundColor: active ? "rgba(168, 85, 247, 0.22)" : "transparent",
        color: active ? "#c084fc" : "var(--so-text-secondary)",
      };
    case "exceeds":
      return {
        ...base,
        fontWeight: 800,
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        border: `1px solid ${active ? "#ef4444" : "rgba(239, 68, 68, 0.35)"}`,
        backgroundColor: active
          ? "rgba(239, 68, 68, 0.25)"
          : "rgba(239, 68, 68, 0.1)",
        color: "#f87171",
      };
    default:
      return base;
  }
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    padding: "8px 14px",
    flexWrap: "wrap",
    gap: "10px",
  } as React.CSSProperties,

  leftControls: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  } as React.CSSProperties,

  subTabGroup: {
    display: "flex",
    gap: "3px",
    backgroundColor: "var(--so-surface-panel)",
    padding: "2px",
    borderRadius: "var(--so-radius-sm)",
    border: "1px solid var(--so-border-subtle)",
  } as React.CSSProperties,

  historyButton: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  } as React.CSSProperties,

  statusChipsWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexWrap: "wrap",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    padding: "3px 6px",
    borderRadius: "var(--so-radius-sm)",
  } as React.CSSProperties,

  selectFilteredButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11.5px",
    fontWeight: 700,
    padding: "3px 10px",
  } as React.CSSProperties,

  optionsWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  } as React.CSSProperties,

  optionsButtonText: {
    fontSize: "10.5px",
  } as React.CSSProperties,

  thresholdActiveDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "var(--so-accent-blue)",
  } as React.CSSProperties,

  thresholdInputBox: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-medium)",
    padding: "2px 6px",
    borderRadius: "var(--so-radius-sm)",
  } as React.CSSProperties,

  thresholdLabel: {
    fontSize: "10.5px",
    fontWeight: 700,
    color: "var(--so-text-secondary)",
  } as React.CSSProperties,

  thresholdInput: {
    width: "42px",
    padding: "1px 3px",
    fontSize: "11px",
    fontWeight: 800,
    textAlign: "center",
    backgroundColor: "var(--so-surface-card)",
    color: "var(--so-text-primary)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "3px",
  } as React.CSSProperties,

  thresholdUnit: {
    fontSize: "10.5px",
    fontWeight: 700,
    color: "var(--so-text-muted)",
  } as React.CSSProperties,

  rightControls: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  } as React.CSSProperties,

  syncButton: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11.5px",
    padding: "5px 12px",
  } as React.CSSProperties,
};
