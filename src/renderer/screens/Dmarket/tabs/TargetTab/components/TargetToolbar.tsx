import React from "react";
import {
  RotateCw,
  Loader2,
  RefreshCw,
  Sliders,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  History,
  CheckSquare,
} from "lucide-react";
import { FilterAction } from "../types";

export interface TargetToolbarProps {
  targetSubTab: "active" | "history";
  setTargetSubTab: (tab: "active" | "history") => void;
  targetsCount: number;
  matchedCount: number;
  actionRequiredCount: number;
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

const FILTER_PILLS: Array<{ id: FilterAction; label: string }> = [
  { id: "all", label: "All" },
  { id: "action_required", label: "Action Req" },
  { id: "overbid", label: "Overbid" },
  { id: "underbid", label: "Underbid" },
  { id: "safe", label: "Safe" },
  { id: "hold", label: "Hold" },
];

const getFilterSelectLabel = (filter: FilterAction, count: number): string => {
  switch (filter) {
    case "action_required":
      return `Action ${count}`;
    case "overbid":
      return `Overbid ${count}`;
    case "underbid":
      return `Underbid ${count}`;
    case "safe":
      return `Safe ${count}`;
    case "hold":
      return `Hold ${count}`;
    case "all":
    default:
      return `Select ${count}`;
  }
};

export const TargetToolbar: React.FC<TargetToolbarProps> = ({
  targetSubTab,
  setTargetSubTab,
  targetsCount,
  matchedCount,
  actionRequiredCount,
  selectableFilteredCount,
  isAllFilteredSelected,
  onToggleSelectFiltered,
  holdCount,
  showExtraOptions,
  setShowExtraOptions,
  driftThresholdPercent,
  setDriftThresholdPercent,
  filterAction,
  setFilterAction,
  onSyncTargets,
  loadingTargets,
  onLoadAcceptedPrices,
  loadingPrices,
  hasAcceptedPricesMeta,
}) => {
  return (
    <div style={styles.container}>
      {/* Left Controls: Sub-Tabs & Stats Pill */}
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
          <div style={styles.statsPill}>
            <span style={styles.statLabel}>
              Targets:{" "}
              <strong style={styles.statPrimaryValue}>{targetsCount}</strong>
            </span>
            <span style={styles.statLabel}>
              Matched:{" "}
              <strong style={styles.statMatchedValue}>{matchedCount}</strong>
            </span>
            {actionRequiredCount > 0 && (
              <span style={styles.actionReqStatLabel}>
                Action Req:{" "}
                <strong style={styles.actionReqStatValue}>
                  {actionRequiredCount}
                </strong>
              </span>
            )}
            {holdCount !== undefined && holdCount > 0 && (
              <span
                style={{
                  ...styles.actionReqStatLabel,
                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                  borderColor: "rgba(245, 158, 11, 0.35)",
                  color: "#fbbf24",
                }}
                title={`${holdCount} target(s) currently under 11-minute hold`}
              >
                On Hold:{" "}
                <strong style={{ color: "#fbbf24" }}>{holdCount}</strong>
              </span>
            )}
          </div>
        )}

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
      </div>

      {/* Right Controls: Drift Filter Pills & Oracle Load */}
      {targetSubTab === "active" && (
        <div style={styles.rightControls}>
          <div style={styles.filterPillsRow}>
            {FILTER_PILLS.map((pill) => (
              <button
                key={pill.id}
                onClick={() => setFilterAction(pill.id)}
                style={getFilterPillStyle(filterAction === pill.id)}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {selectableFilteredCount > 0 && (
            <button
              type="button"
              onClick={onToggleSelectFiltered}
              className={`btn ${isAllFilteredSelected ? "btn-primary" : "btn-outline"} btn-sm`}
              style={styles.actionRequiredButton}
              title={
                isAllFilteredSelected
                  ? `Click to unselect ${getFilterSelectLabel(filterAction, selectableFilteredCount).toLowerCase()} targets`
                  : `Click to select all ${selectableFilteredCount} targets in current filter`
              }
            >
              <CheckSquare size={13} />
              <span>{getFilterSelectLabel(filterAction, selectableFilteredCount)}</span>
            </button>
          )}

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

const getFilterPillStyle = (isSelected: boolean): React.CSSProperties => ({
  padding: "3px 8px",
  fontSize: "11px",
  borderRadius: "12px",
  border: "1px solid",
  cursor: "pointer",
  fontWeight: 700,
  backgroundColor: isSelected ? "var(--so-primary)" : "transparent",
  color: isSelected ? "#ffffff" : "var(--so-text-secondary)",
  borderColor: isSelected ? "var(--so-primary)" : "var(--so-border-subtle)",
  transition: "all 0.15s ease",
});

const getActionRequiredButtonStyle = (isSelected: boolean): React.CSSProperties => ({
  backgroundColor: isSelected
    ? "rgba(245, 158, 11, 0.18)"
    : "rgba(245, 158, 11, 0.09)",
  color: "var(--so-text-primary, #e2e8f0)",
  border: `1px solid ${
    isSelected ? "rgba(245, 158, 11, 0.45)" : "rgba(245, 158, 11, 0.28)"
  }`,
  padding: "4px 10px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "11.5px",
  fontWeight: 600,
  cursor: "pointer",
  borderRadius: "var(--so-radius-sm)",
  transition: "all 0.15s ease",
});

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

  statsPill: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    padding: "4px 10px",
    borderRadius: "var(--so-radius-sm)",
    fontSize: "11.5px",
    fontWeight: 700,
  } as React.CSSProperties,

  statLabel: {
    color: "var(--so-text-muted)",
  } as React.CSSProperties,

  statPrimaryValue: {
    color: "var(--so-text-primary)",
  } as React.CSSProperties,

  statMatchedValue: {
    color: "var(--so-accent-cyan)",
  } as React.CSSProperties,

  actionReqStatLabel: {
    color: "var(--so-text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  } as React.CSSProperties,

  actionReqStatValue: {
    color: "#f59e0b",
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

  filterPillsRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  } as React.CSSProperties,

  actionRequiredButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11.5px",
    fontWeight: 700,
    padding: "5px 10px",
  } as React.CSSProperties,

  syncButton: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11.5px",
    padding: "5px 12px",
  } as React.CSSProperties,
};
