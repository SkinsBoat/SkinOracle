import React from "react";
import {
  AlertTriangle,
  Trash2,
  Zap,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";

export interface TargetBatchBarProps {
  selectedCount: number;
  totalTargetsCount: number;
  actionRequiredCount: number;
  isAllActionRequiredSelected: boolean;
  unmatchedSelectedCount: number;
  eligibleSelectedCount?: number;
  isOnlyUnmatchedSelected?: boolean;
  deleteUnmatched: boolean;
  setDeleteUnmatched: (val: boolean) => void;
  batchProcessing: boolean;
  isSidebarExpanded: boolean;
  onSelectAll: () => void;
  onToggleSelectActionRequired: () => void;
  onClearSelection: () => void;
  onBatchDelete: () => void;
  onBatchUpdateToOracle: () => void;
}

export const TargetBatchBar: React.FC<TargetBatchBarProps> = ({
  selectedCount,
  totalTargetsCount,
  actionRequiredCount,
  isAllActionRequiredSelected,
  unmatchedSelectedCount,
  eligibleSelectedCount,
  isOnlyUnmatchedSelected,
  deleteUnmatched,
  setDeleteUnmatched,
  batchProcessing,
  isSidebarExpanded,
  onSelectAll,
  onToggleSelectActionRequired,
  onClearSelection,
  onBatchDelete,
  onBatchUpdateToOracle,
}) => {
  return (
    <div style={getBatchBarContainerStyle(isSidebarExpanded)}>
      {/* Left count indicator */}
      <div style={styles.leftInfoSection}>
        <span style={styles.selectedCountBadge}>{selectedCount}</span>
        <span>TARGETS SELECTED FOR BATCH OPERATIONS</span>
      </div>

      {/* Right actions */}
      <div style={styles.rightActionsSection}>
        <button
          onClick={onSelectAll}
          className="btn btn-sm btn-ghost"
          style={styles.whiteGhostButton}
        >
          Select All ({totalTargetsCount})
        </button>

        {actionRequiredCount > 0 && (
          <button
            onClick={onToggleSelectActionRequired}
            className="btn btn-sm btn-ghost"
            style={getActionReqButtonStyle(isAllActionRequiredSelected)}
            title={
              isAllActionRequiredSelected
                ? "Click to unselect action items"
                : "Click to select all targets requiring action"
            }
          >
            <AlertTriangle size={12} style={styles.alertIcon} />{" "}
            {isAllActionRequiredSelected
              ? `Unselect Action (${actionRequiredCount})`
              : `Action Req (${actionRequiredCount})`}
          </button>
        )}

        <button
          onClick={onClearSelection}
          className="btn btn-sm btn-ghost"
          style={styles.whiteGhostButton}
        >
          Clear Selection
        </button>

        <button
          onClick={onBatchDelete}
          disabled={batchProcessing}
          className="btn btn-danger btn-sm"
          style={styles.batchDeleteButton}
        >
          <Trash2 size={13} />
          <span>Delete Selected</span>
        </button>

        {unmatchedSelectedCount > 0 && (
          <button
            type="button"
            onClick={() => setDeleteUnmatched(!deleteUnmatched)}
            style={getDeleteUnmatchedToggleStyle(deleteUnmatched)}
            title="Toggle whether updating also deletes selected targets that have no matching accepted price in Oracle cache"
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
          onClick={onBatchUpdateToOracle}
          disabled={
            batchProcessing || (!!isOnlyUnmatchedSelected && !deleteUnmatched)
          }
          className={`btn btn-sm ${
            isOnlyUnmatchedSelected && deleteUnmatched
              ? "btn-danger"
              : "btn-primary"
          }`}
          style={getBatchUpdateButtonStyle(
            !!isOnlyUnmatchedSelected,
            deleteUnmatched,
          )}
          title={
            isOnlyUnmatchedSelected && !deleteUnmatched
              ? "Selected targets have no price in Oracle cache. Toggle 'Delete unmatched' or use Delete Selected."
              : undefined
          }
        >
          {batchProcessing ? (
            <>
              <Loader2 size={13} className="spin" />
              <span>UPDATING BATCH...</span>
            </>
          ) : isOnlyUnmatchedSelected && deleteUnmatched ? (
            <>
              <Trash2 size={13} />
              <span>DELETE UNMATCHED ({unmatchedSelectedCount})</span>
            </>
          ) : (
            <>
              <Zap size={13} />
              <span>
                {isOnlyUnmatchedSelected
                  ? `NO ORACLE PRICE (${unmatchedSelectedCount})`
                  : deleteUnmatched && unmatchedSelectedCount > 0
                    ? `UPDATE & PRUNE (${selectedCount})`
                    : `MATCH ORACLE PRICES${
                        eligibleSelectedCount !== undefined
                          ? ` (${eligibleSelectedCount})`
                          : ""
                      }`}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC STYLE HELPERS ─────────────────────────

const getBatchBarContainerStyle = (isSidebarExpanded: boolean): React.CSSProperties => ({
  position: "fixed",
  bottom: "20px",
  left: isSidebarExpanded ? "258px" : "96px",
  right: "28px",
  zIndex: 1000,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  backgroundColor: "rgba(17, 24, 39, 0.96)",
  backdropFilter: "blur(12px)",
  color: "#ffffff",
  padding: "12px 20px",
  borderRadius: "var(--so-radius-md)",
  border: "1px solid var(--so-border-medium)",
  boxShadow:
    "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(37, 99, 235, 0.25)",
  boxSizing: "border-box",
  transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
});

const getActionReqButtonStyle = (isSelected: boolean): React.CSSProperties => ({
  fontWeight: 700,
  padding: "6px 14px",
  fontSize: "12px",
  color: "#f59e0b",
  backgroundColor: isSelected
    ? "rgba(245, 158, 11, 0.18)"
    : "rgba(245, 158, 11, 0.08)",
  border: "1px solid rgba(245, 158, 11, 0.25)",
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  gap: "5px",
});

const getDeleteUnmatchedToggleStyle = (
  isChecked: boolean,
): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "12px",
  fontWeight: 600,
  color: isChecked ? "#f87171" : "var(--so-text-secondary, #94a3b8)",
  cursor: "pointer",
  userSelect: "none",
  padding: "6px 12px",
  borderRadius: "4px",
  backgroundColor: isChecked
    ? "rgba(239, 68, 68, 0.16)"
    : "rgba(255, 255, 255, 0.05)",
  border: `1px solid ${
    isChecked
      ? "rgba(239, 68, 68, 0.45)"
      : "var(--so-border-subtle, rgba(255, 255, 255, 0.1))"
  }`,
  transition: "all 0.15s ease",
  outline: "none",
});

const getBatchUpdateButtonStyle = (
  isOnlyUnmatchedSelected: boolean,
  deleteUnmatched: boolean,
): React.CSSProperties => ({
  fontWeight: 800,
  padding: "6px 18px",
  fontSize: "12px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  color: "#ffffff",
  opacity: isOnlyUnmatchedSelected && !deleteUnmatched ? 0.6 : 1,
  cursor:
    isOnlyUnmatchedSelected && !deleteUnmatched ? "not-allowed" : "pointer",
});

const styles = {
  leftInfoSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontWeight: 700,
    fontSize: "13px",
  } as React.CSSProperties,

  selectedCountBadge: {
    backgroundColor: "rgba(37, 99, 235, 0.2)",
    color: "var(--so-accent-cyan)",
    border: "1px solid var(--so-primary)",
    padding: "2px 9px",
    borderRadius: "4px",
    fontWeight: 900,
    fontSize: "14px",
  } as React.CSSProperties,

  rightActionsSection: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  } as React.CSSProperties,

  whiteGhostButton: {
    fontWeight: 700,
    padding: "6px 14px",
    fontSize: "12px",
    color: "#ffffff",
  } as React.CSSProperties,

  alertIcon: {
    color: "#f59e0b",
  } as React.CSSProperties,

  batchDeleteButton: {
    fontWeight: 800,
    padding: "6px 14px",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#ffffff",
  } as React.CSSProperties,

  deleteCheckIcon: {
    color: "#ef4444",
    flexShrink: 0,
  } as React.CSSProperties,

  deleteSquareIcon: {
    color: "var(--so-text-muted, #64748b)",
    flexShrink: 0,
  } as React.CSSProperties,
};
