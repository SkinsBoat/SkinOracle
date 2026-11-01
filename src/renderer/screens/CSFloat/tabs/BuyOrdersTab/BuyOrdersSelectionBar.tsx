import React from "react";
import {
  AlertTriangle,
  CheckSquare,
  HelpCircle,
  Loader2,
  RotateCw,
  Square,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

export interface BuyOrdersSelectionBarProps {
  selectedCount: number;
  selectedOrdersTotal: number;
  totalOrders: number;
  actionRequiredCount: number;
  exceedsBalanceCount: number;
  unmatchedCount: number;
  unmatchedSelectedCount: number;
  isAllActionRequiredSelected: boolean;
  isAllExceedsSelected: boolean;
  isAllUnmatchedSelected: boolean;
  deleteUnmatched: boolean;
  onToggleDeleteUnmatched: () => void;
  batchProcessing: boolean;
  isOnlyUnmatchedSelected: boolean;
  isSidebarExpanded: boolean;
  onSelectAll: () => void;
  onToggleSelectActionRequired: () => void;
  onToggleSelectExceeds: () => void;
  onToggleSelectUnmatched: () => void;
  onDeselectAll: () => void;
  onBatchUpdate: () => void;
  onBatchDelete: () => void;
}

export const BuyOrdersSelectionBar: React.FC<BuyOrdersSelectionBarProps> = ({
  selectedCount,
  selectedOrdersTotal,
  totalOrders,
  actionRequiredCount,
  exceedsBalanceCount,
  unmatchedCount,
  unmatchedSelectedCount,
  isAllActionRequiredSelected,
  isAllExceedsSelected,
  isAllUnmatchedSelected,
  deleteUnmatched,
  onToggleDeleteUnmatched,
  batchProcessing,
  isOnlyUnmatchedSelected,
  isSidebarExpanded,
  onSelectAll,
  onToggleSelectActionRequired,
  onToggleSelectExceeds,
  onToggleSelectUnmatched,
  onDeselectAll,
  onBatchUpdate,
  onBatchDelete,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div style={getFloatingToolbarStyle(isSidebarExpanded)}>
      <div style={styles.floatingToolbarLeft}>
        <span style={styles.floatingToolbarSelectedText}>
          <CheckSquare size={16} style={styles.checkSquareIcon} />
          <span>
            {selectedCount} Selected
            {selectedOrdersTotal > 0 && (
              <span style={styles.selectedOrdersTotalText}>
                (${selectedOrdersTotal.toFixed(2)})
              </span>
            )}
          </span>
        </span>
        <div style={styles.floatingToolbarDivider} />
        <button
          onClick={onSelectAll}
          className="btn btn-sm btn-ghost"
          style={styles.ghostToolbarButton}
        >
          <CheckSquare size={12} /> Select All ({totalOrders})
        </button>
        {actionRequiredCount > 0 && (
          <button
            onClick={onToggleSelectActionRequired}
            className="btn btn-sm btn-ghost"
            style={getFloatingActionRequiredButtonStyle(
              isAllActionRequiredSelected,
            )}
            title={
              isAllActionRequiredSelected
                ? "Click to unselect action items"
                : "Click to select all orders requiring action"
            }
          >
            <AlertTriangle size={12} style={styles.actionReqAlertIcon} />{" "}
            {isAllActionRequiredSelected
              ? `Unselect Action (${actionRequiredCount})`
              : `Action Required (${actionRequiredCount})`}
          </button>
        )}
        {exceedsBalanceCount > 0 && (
          <button
            onClick={onToggleSelectExceeds}
            className="btn btn-sm btn-ghost"
            style={getFloatingExceedsButtonStyle(isAllExceedsSelected)}
            title={
              isAllExceedsSelected
                ? "Click to unselect orders exceeding balance"
                : "Click to select all buy orders exceeding available wallet balance"
            }
          >
            <Wallet size={12} style={styles.exceedsWalletIcon} />{" "}
            {isAllExceedsSelected
              ? `Unselect Exceeding (${exceedsBalanceCount})`
              : `Exceeds Balance (${exceedsBalanceCount})`}
          </button>
        )}
        {unmatchedCount > 0 && (
          <button
            onClick={onToggleSelectUnmatched}
            className="btn btn-sm btn-ghost"
            style={getFloatingUnmatchedButtonStyle(isAllUnmatchedSelected)}
            title={
              isAllUnmatchedSelected
                ? "Click to unselect orders not matched in Oracle cache"
                : "Click to select all buy orders not matched in Oracle cache"
            }
          >
            <HelpCircle size={12} style={styles.unmatchedHelpIcon} />{" "}
            {isAllUnmatchedSelected
              ? `Unselect Unmatched (${unmatchedCount})`
              : `Unmatched (${unmatchedCount})`}
          </button>
        )}
        <button
          onClick={onDeselectAll}
          className="btn btn-sm btn-ghost"
          style={styles.ghostClearButton}
        >
          <Square size={12} /> Clear Selection
        </button>
      </div>

      <div style={styles.floatingToolbarRight}>
        {unmatchedSelectedCount > 0 && (
          <button
            type="button"
            onClick={onToggleDeleteUnmatched}
            style={getDeleteUnmatchedToggleStyle(deleteUnmatched)}
            title="Toggle whether updating also deletes selected orders that have no matching accepted price in Oracle cache"
          >
            {deleteUnmatched ? (
              <CheckSquare size={13} style={styles.deleteCheckIcon} />
            ) : (
              <Square size={13} style={styles.deleteSquareIcon} />
            )}
            <span>Delete unmatched ({unmatchedSelectedCount})</span>
          </button>
        )}
        <button
          onClick={onBatchUpdate}
          disabled={
            batchProcessing || (isOnlyUnmatchedSelected && !deleteUnmatched)
          }
          className={`btn btn-sm ${
            isOnlyUnmatchedSelected && deleteUnmatched
              ? "btn-danger"
              : "btn-primary"
          }`}
          style={getBatchUpdateButtonStyle(
            isOnlyUnmatchedSelected,
            deleteUnmatched,
          )}
          title={
            isOnlyUnmatchedSelected && !deleteUnmatched
              ? "Selected orders have no price in Oracle cache. Enable 'Delete unmatched' or use Delete Selected."
              : undefined
          }
        >
          {batchProcessing ? (
            <Loader2 size={13} className="spin" />
          ) : isOnlyUnmatchedSelected && deleteUnmatched ? (
            <Trash2 size={13} />
          ) : (
            <RotateCw size={13} />
          )}
          {isOnlyUnmatchedSelected
            ? deleteUnmatched
              ? `Delete Unmatched (${unmatchedSelectedCount})`
              : `Cannot Update Unmatched (${unmatchedSelectedCount})`
            : deleteUnmatched && unmatchedSelectedCount > 0
              ? `Update & Prune (${selectedCount})`
              : `Update Selected (${selectedCount})`}
        </button>
        <button
          onClick={onBatchDelete}
          disabled={batchProcessing}
          className="btn btn-danger btn-sm"
          style={styles.batchDeleteBtn}
          title="Permanently delete the selected active buy orders from CSFloat"
        >
          {batchProcessing ? (
            <Loader2 size={13} className="spin" />
          ) : (
            <Trash2 size={13} />
          )}
          Delete Selected ({selectedCount})
        </button>
        <button
          onClick={onDeselectAll}
          className="btn btn-sm btn-ghost"
          style={styles.clearCircleButton}
          title="Clear selection"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

const getFloatingToolbarStyle = (
  isSidebarExpanded: boolean,
): React.CSSProperties => ({
  position: "fixed",
  bottom: "24px",
  left: isSidebarExpanded ? "246px" : "80px",
  right: "24px",
  zIndex: 50,
  backgroundColor: "rgba(23, 23, 33, 0.94)",
  backdropFilter: "blur(12px)",
  border: "1px solid var(--so-primary)",
  borderRadius: "var(--so-radius-md)",
  boxShadow:
    "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(99, 102, 241, 0.25)",
  padding: "12px 20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  animation: "slideUp var(--so-duration-normal) var(--so-ease-out)",
  transition: "left var(--so-duration-normal) var(--so-ease-out)",
});

const getFloatingActionRequiredButtonStyle = (
  isSelected: boolean,
): React.CSSProperties => ({
  fontSize: "11px",
  padding: "3px 8px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  color: "var(--so-warning)",
  backgroundColor: isSelected
    ? "rgba(245, 158, 11, 0.18)"
    : "rgba(245, 158, 11, 0.08)",
  border: "1px solid rgba(245, 158, 11, 0.25)",
  borderRadius: "4px",
});

const getFloatingExceedsButtonStyle = (
  isSelected: boolean,
): React.CSSProperties => ({
  fontSize: "11px",
  padding: "3px 8px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  color: "var(--so-loss-text)",
  backgroundColor: isSelected
    ? "rgba(239, 68, 68, 0.22)"
    : "rgba(239, 68, 68, 0.08)",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  borderRadius: "4px",
});

const getFloatingUnmatchedButtonStyle = (
  isSelected: boolean,
): React.CSSProperties => ({
  fontSize: "11px",
  padding: "3px 8px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  color: isSelected ? "#f1f5f9" : "var(--so-text-muted)",
  backgroundColor: isSelected
    ? "rgba(148, 163, 184, 0.25)"
    : "rgba(148, 163, 184, 0.08)",
  border: "1px solid rgba(148, 163, 184, 0.3)",
  borderRadius: "4px",
});

const getDeleteUnmatchedToggleStyle = (
  deleteUnmatched: boolean,
): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "11.5px",
  fontWeight: 600,
  color: deleteUnmatched ? "var(--so-loss-text)" : "var(--so-text-secondary)",
  cursor: "pointer",
  userSelect: "none",
  padding: "4px 9px",
  borderRadius: "4px",
  backgroundColor: deleteUnmatched
    ? "rgba(239, 68, 68, 0.16)"
    : "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${deleteUnmatched ? "rgba(239, 68, 68, 0.45)" : "var(--so-border-subtle)"}`,
  transition:
    "background-color var(--so-duration-fast) var(--so-ease-out), color var(--so-duration-fast) var(--so-ease-out)",
});

const getBatchUpdateButtonStyle = (
  isOnlyUnmatchedSelected: boolean,
  deleteUnmatched: boolean,
): React.CSSProperties => ({
  fontWeight: 800,
  fontSize: "12px",
  padding: "6px 14px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  color: "#ffffff",
  opacity: isOnlyUnmatchedSelected && !deleteUnmatched ? 0.6 : 1,
});

const styles: Record<string, React.CSSProperties> = {
  floatingToolbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  floatingToolbarSelectedText: {
    fontSize: "13px",
    fontWeight: 800,
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  checkSquareIcon: {
    color: "var(--so-primary)",
  },
  selectedOrdersTotalText: {
    color: "var(--so-accent-cyan)",
    marginLeft: "6px",
  },
  floatingToolbarDivider: {
    width: "1px",
    height: "16px",
    backgroundColor: "var(--so-border-subtle)",
  },
  ghostToolbarButton: {
    fontSize: "11px",
    padding: "3px 8px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  actionReqAlertIcon: {
    color: "var(--so-warning)",
  },
  exceedsWalletIcon: {
    color: "var(--so-loss-text)",
  },
  unmatchedHelpIcon: {
    color: "var(--so-text-secondary)",
  },
  ghostClearButton: {
    fontSize: "11px",
    padding: "3px 8px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--so-text-primary)",
  },
  floatingToolbarRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  deleteCheckIcon: {
    color: "var(--so-loss-text)",
  },
  deleteSquareIcon: {
    color: "var(--so-text-muted)",
  },
  batchDeleteBtn: {
    fontWeight: 800,
    fontSize: "12px",
    padding: "6px 14px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#ffffff",
  },
  clearCircleButton: {
    padding: "6px",
    borderRadius: "50%",
    color: "var(--so-text-primary)",
  },
};
