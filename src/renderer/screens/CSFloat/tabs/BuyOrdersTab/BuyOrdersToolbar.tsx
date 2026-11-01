import React, { useState } from "react";
import {
  ArrowUpDown,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Loader2,
  RotateCw,
  Sliders,
  Trash2,
  Wallet,
} from "lucide-react";

export type BuyOrderStatusFilter =
  | "all"
  | "action"
  | "exceeds"
  | "drift"
  | "unmatched"
  | "advanced";

export type BuyOrderSortKey = "price" | "drift" | "name" | "quantity";
export type BuyOrderSortDir = "asc" | "desc";

export interface BuyOrdersToolbarProps {
  totalOrders: number;
  actionRequiredCount: number;
  exceedsBalanceCount: number;
  driftCount: number;
  unmatchedCount: number;
  advancedCount: number;
  displayedCount: number;
  statusFilter: BuyOrderStatusFilter;
  onSetStatusFilter: (filter: BuyOrderStatusFilter) => void;
  isAllFilteredSelected: boolean;
  onToggleSelectFiltered: () => void;
  driftThresholdPercent: number;
  onDriftThresholdChange: (value: number) => void;
  batchProcessing: boolean;
  onDeleteAllOrders: () => void;
  loading: boolean;
  onSync: () => void;
  sortKey: BuyOrderSortKey;
  sortDir: BuyOrderSortDir;
  onSortChange: (key: BuyOrderSortKey, dir: BuyOrderSortDir) => void;
  userBalance?: number;
}

/**
 * Control bar for the CSFloat buy-order book: filters, drift threshold,
 * sort order, and the primary Sync action.
 */
export const BuyOrdersToolbar: React.FC<BuyOrdersToolbarProps> = ({
  totalOrders,
  actionRequiredCount,
  exceedsBalanceCount,
  driftCount,
  unmatchedCount,
  advancedCount,
  displayedCount,
  statusFilter,
  onSetStatusFilter,
  isAllFilteredSelected,
  onToggleSelectFiltered,
  driftThresholdPercent,
  onDriftThresholdChange,
  batchProcessing,
  onDeleteAllOrders,
  loading,
  onSync,
  sortKey,
  sortDir,
  onSortChange,
  userBalance,
}) => {
  const [showExtraActions, setShowExtraActions] = useState(false);

  return (
    <div style={styles.controlBar}>
      <div style={styles.leftStatsWrapper}>
        <div style={styles.optionsGroup}>
          <button
            type="button"
            onClick={() => setShowExtraActions((prev) => !prev)}
            className="btn btn-sm"
            style={getOptionsToggleButtonStyle(showExtraActions)}
            title={
              showExtraActions
                ? "Hide Extra Controls"
                : "Open Extra Controls (Threshold & Delete All)"
            }
          >
            <Sliders
              size={12}
              style={getSlidersIconStyle(showExtraActions)}
            />
            <span style={styles.optionsToggleText}>
              {showExtraActions ? "Hide" : "Options"}
            </span>
            {showExtraActions ? (
              <ChevronLeft size={13} />
            ) : (
              <ChevronRight size={13} />
            )}
          </button>

          <div style={getExtraOptionsSliderStyle(showExtraActions)}>
            <div style={styles.thresholdPill}>
              <span style={styles.thresholdLabel}>Threshold:</span>
              <input
                type="number"
                step="0.5"
                min="0"
                value={driftThresholdPercent}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  onDriftThresholdChange(
                    isNaN(parsed) ? 0 : Math.max(0, parsed),
                  );
                }}
                style={styles.thresholdInput}
                title="Drift tolerance percentage before flagging an order as overbid or underbid"
              />
              <span style={styles.percentText}>%</span>
            </div>

            {totalOrders > 0 && (
              <button
                onClick={onDeleteAllOrders}
                disabled={batchProcessing}
                className="btn btn-danger btn-sm"
                style={styles.deleteAllBtn}
                title="Bulk cancel all active CSFloat buy orders"
              >
                <Trash2 size={11} /> Delete All
              </button>
            )}
          </div>
        </div>

        <div style={styles.statusChipsWrapper}>
          <button
            type="button"
            onClick={() => onSetStatusFilter("all")}
            style={getStatusChipStyle(statusFilter === "all", "all")}
          >
            All ({totalOrders})
          </button>

          {actionRequiredCount > 0 && (
            <button
              type="button"
              onClick={() =>
                onSetStatusFilter(
                  statusFilter === "action" ? "all" : "action",
                )
              }
              style={getStatusChipStyle(statusFilter === "action", "action")}
            >
              Action ({actionRequiredCount})
            </button>
          )}

          {exceedsBalanceCount > 0 && (
            <button
              type="button"
              onClick={() =>
                onSetStatusFilter(
                  statusFilter === "exceeds" ? "all" : "exceeds",
                )
              }
              style={getStatusChipStyle(statusFilter === "exceeds", "exceeds")}
              title={`Filter orders whose bid exceeds wallet balance ($${userBalance?.toFixed(2)})`}
            >
              <Wallet size={10} /> Exceeds Bal ({exceedsBalanceCount})
            </button>
          )}

          {driftCount > 0 && (
            <button
              type="button"
              onClick={() =>
                onSetStatusFilter(statusFilter === "drift" ? "all" : "drift")
              }
              style={getStatusChipStyle(statusFilter === "drift", "drift")}
            >
              Drift ({driftCount})
            </button>
          )}

          {unmatchedCount > 0 && (
            <button
              type="button"
              onClick={() =>
                onSetStatusFilter(
                  statusFilter === "unmatched" ? "all" : "unmatched",
                )
              }
              style={getStatusChipStyle(
                statusFilter === "unmatched",
                "unmatched",
              )}
            >
              Unmatched ({unmatchedCount})
            </button>
          )}

          {advancedCount > 0 && (
            <button
              type="button"
              onClick={() =>
                onSetStatusFilter(
                  statusFilter === "advanced" ? "all" : "advanced",
                )
              }
              style={getStatusChipStyle(
                statusFilter === "advanced",
                "advanced",
              )}
              title={`Filter ${advancedCount} advanced buy orders with custom hybrid parameters`}
            >
              Advanced ({advancedCount})
            </button>
          )}

          {displayedCount > 0 && (
            <button
              type="button"
              onClick={onToggleSelectFiltered}
              className={`btn btn-sm ${isAllFilteredSelected ? "btn-primary" : "btn-outline"}`}
              style={styles.actionRequiredButton}
              title={
                isAllFilteredSelected
                  ? "Click to unselect orders in the current filter"
                  : `Click to select all ${displayedCount} orders in current filter`
              }
            >
              <CheckSquare size={13} />
              <span>
                {isAllFilteredSelected ? "Unselect" : `Select ${displayedCount}`}
              </span>
            </button>
          )}
        </div>
      </div>

      <div style={styles.rightActionsGroup}>
        <SortControl
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={onSortChange}
        />
        <button
          onClick={onSync}
          disabled={loading}
          className={`btn btn-primary btn-sm ${loading ? "btn-loading" : ""}`}
        >
          {loading ? (
            <Loader2 size={14} className="spin" />
          ) : (
            <RotateCw size={14} />
          )}{" "}
          Sync Buy Orders
        </button>
      </div>
    </div>
  );
};

const SortControl: React.FC<{
  sortKey: BuyOrderSortKey;
  sortDir: BuyOrderSortDir;
  onSortChange: (key: BuyOrderSortKey, dir: BuyOrderSortDir) => void;
}> = ({ sortKey, sortDir, onSortChange }) => (
  <div style={styles.sortGroup} title="Sort the visible order book">
    <ArrowUpDown size={13} style={styles.sortIcon} />
    <select
      value={sortKey}
      onChange={(e) => onSortChange(e.target.value as BuyOrderSortKey, sortDir)}
      style={styles.sortSelect}
      aria-label="Sort buy orders by"
    >
      <option value="price" style={styles.sortOption}>
        Price
      </option>
      <option value="drift" style={styles.sortOption}>
        Drift
      </option>
      <option value="name" style={styles.sortOption}>
        Name
      </option>
      <option value="quantity" style={styles.sortOption}>
        Quantity
      </option>
    </select>
    <button
      type="button"
      onClick={() =>
        onSortChange(sortKey, sortDir === "asc" ? "desc" : "asc")
      }
      style={styles.sortDirButton}
      title={sortDir === "asc" ? "Ascending" : "Descending"}
    >
      {sortDir === "asc" ? "↑" : "↓"}
    </button>
  </div>
);

// ── Styles ──────────────────────────────────────────────────────────

const getOptionsToggleButtonStyle = (
  showExtraActions: boolean,
): React.CSSProperties => ({
  backgroundColor: showExtraActions
    ? "var(--so-surface-input)"
    : "var(--so-surface-panel)",
  color: showExtraActions
    ? "var(--so-primary)"
    : "var(--so-text-secondary)",
  border: "1px solid var(--so-border-medium)",
  padding: "4px 8px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 700,
  borderRadius: "var(--so-radius-sm)",
  transition:
    "background-color var(--so-duration-fast) var(--so-ease-out), color var(--so-duration-fast) var(--so-ease-out)",
});

const getSlidersIconStyle = (
  showExtraActions: boolean,
): React.CSSProperties => ({
  color: showExtraActions ? "var(--so-primary)" : "var(--so-text-muted)",
});

const getExtraOptionsSliderStyle = (
  showExtraActions: boolean,
): React.CSSProperties => ({
  maxWidth: showExtraActions ? "320px" : "0px",
  opacity: showExtraActions ? 1 : 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  transition:
    "max-width var(--so-duration-normal) var(--so-ease-out), opacity var(--so-duration-normal) var(--so-ease-out)",
  display: "flex",
  alignItems: "center",
  gap: "8px",
});

const getStatusChipStyle = (
  active: boolean,
  type: BuyOrderStatusFilter,
): React.CSSProperties => {
  if (type === "all") {
    return {
      fontSize: "10.5px",
      fontWeight: active ? 800 : 600,
      padding: "2px 8px",
      borderRadius: "3px",
      border: "none",
      cursor: "pointer",
      backgroundColor: active ? "var(--so-primary)" : "transparent",
      color: active ? "#ffffff" : "var(--so-text-muted)",
      transition:
        "background-color var(--so-duration-fast) var(--so-ease-out), color var(--so-duration-fast) var(--so-ease-out)",
    };
  }
  if (type === "action") {
    return {
      fontSize: "10.5px",
      fontWeight: active ? 800 : 600,
      padding: "2px 8px",
      borderRadius: "3px",
      border: `1px solid ${active ? "rgba(245, 158, 11, 0.5)" : "transparent"}`,
      cursor: "pointer",
      backgroundColor: active ? "rgba(245, 158, 11, 0.22)" : "transparent",
      color: active ? "#fbbf24" : "var(--so-text-secondary)",
      transition:
        "background-color var(--so-duration-fast) var(--so-ease-out), color var(--so-duration-fast) var(--so-ease-out)",
    };
  }
  if (type === "exceeds") {
    return {
      fontSize: "10.5px",
      fontWeight: 800,
      padding: "2px 8px",
      borderRadius: "3px",
      border: `1px solid ${active ? "#ef4444" : "rgba(239, 68, 68, 0.35)"}`,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "3px",
      backgroundColor: active
        ? "rgba(239, 68, 68, 0.25)"
        : "rgba(239, 68, 68, 0.1)",
      color: "var(--so-loss-text)",
      transition:
        "background-color var(--so-duration-fast) var(--so-ease-out), color var(--so-duration-fast) var(--so-ease-out)",
    };
  }
  if (type === "drift") {
    return {
      fontSize: "10.5px",
      fontWeight: active ? 800 : 600,
      padding: "2px 8px",
      borderRadius: "3px",
      border: `1px solid ${active ? "rgba(6, 182, 212, 0.5)" : "transparent"}`,
      cursor: "pointer",
      backgroundColor: active ? "rgba(6, 182, 212, 0.22)" : "transparent",
      color: active ? "var(--so-accent-cyan)" : "var(--so-text-secondary)",
      transition:
        "background-color var(--so-duration-fast) var(--so-ease-out), color var(--so-duration-fast) var(--so-ease-out)",
    };
  }
  if (type === "advanced") {
    return {
      fontSize: "10.5px",
      fontWeight: active ? 800 : 600,
      padding: "2px 8px",
      borderRadius: "3px",
      border: `1px solid ${active ? "rgba(168, 85, 247, 0.5)" : "transparent"}`,
      cursor: "pointer",
      backgroundColor: active ? "rgba(168, 85, 247, 0.22)" : "transparent",
      color: active ? "#c084fc" : "var(--so-text-secondary)",
      transition:
        "background-color var(--so-duration-fast) var(--so-ease-out), color var(--so-duration-fast) var(--so-ease-out)",
    };
  }
  return {
    fontSize: "10.5px",
    fontWeight: active ? 800 : 600,
    padding: "2px 8px",
    borderRadius: "3px",
    border: `1px solid ${active ? "rgba(148, 163, 184, 0.5)" : "transparent"}`,
    cursor: "pointer",
    backgroundColor: active ? "rgba(148, 163, 184, 0.2)" : "transparent",
    color: active ? "#ffffff" : "var(--so-text-muted)",
    transition:
      "background-color var(--so-duration-fast) var(--so-ease-out), color var(--so-duration-fast) var(--so-ease-out)",
  };
};

const styles: Record<string, React.CSSProperties> = {
  controlBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    padding: "8px 14px",
    flexWrap: "wrap",
    gap: "10px",
    flexShrink: 0,
  },
  leftStatsWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  optionsGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  optionsToggleText: {
    fontSize: "10.5px",
  },
  thresholdPill: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-medium)",
    padding: "2px 6px",
    borderRadius: "var(--so-radius-sm)",
  },
  thresholdLabel: {
    fontSize: "10.5px",
    fontWeight: 700,
    color: "var(--so-text-secondary)",
  },
  thresholdInput: {
    width: "42px",
    padding: "1px 3px",
    fontSize: "11px",
    borderRadius: "3px",
    backgroundColor: "var(--so-surface-panel)",
    color: "var(--so-text-primary)",
    border: "1px solid var(--so-border-subtle)",
    textAlign: "center",
    fontWeight: 700,
  },
  percentText: {
    fontSize: "10px",
    color: "var(--so-text-muted)",
  },
  deleteAllBtn: {
    fontSize: "10.5px",
    fontWeight: 700,
    padding: "3px 8px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    whiteSpace: "nowrap",
  },
  statusChipsWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexWrap: "wrap",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    padding: "3px 6px",
    borderRadius: "var(--so-radius-sm)",
  },
  rightActionsGroup: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  actionRequiredButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11.5px",
    fontWeight: 700,
    padding: "4px 10px",
  },
  sortGroup: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "2px 6px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
  },
  sortIcon: {
    color: "var(--so-text-muted)",
  },
  sortSelect: {
    width: "auto",
    padding: "2px 4px",
    fontSize: "11px",
    height: "24px",
    border: "none",
    backgroundColor: "var(--so-surface-card)",
    color: "var(--so-text-primary)",
    colorScheme: "dark",
  },
  sortOption: {
    backgroundColor: "var(--so-surface-card)",
    color: "var(--so-text-primary)",
  },
  sortDirButton: {
    width: "22px",
    height: "22px",
    borderRadius: "3px",
    border: "1px solid var(--so-border-subtle)",
    backgroundColor: "var(--so-surface-input)",
    color: "var(--so-text-secondary)",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 800,
    lineHeight: 1,
  },
};
