import React from "react";
import { CheckSquare, ExternalLink, Square, X } from "lucide-react";

interface MarketplaceSelectionToolbarProps {
  selectedCount: number;
  visibleCount: number;
  isSidebarExpanded: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onOpenSelected: () => void;
}

/** Floating batch toolbar for selected Market Scan listings. */
export const MarketplaceSelectionToolbar: React.FC<
  MarketplaceSelectionToolbarProps
> = ({
  selectedCount,
  visibleCount,
  isSidebarExpanded,
  onSelectAll,
  onClear,
  onOpenSelected,
}) => {
  return (
    <div style={getFloatingToolbarStyle(isSidebarExpanded)}>
      <div style={styles.left}>
        <span style={styles.selectedText}>
          <CheckSquare size={16} style={styles.checkIcon} />
          <span>{selectedCount} Selected</span>
        </span>
        <div style={styles.divider} />
        <button
          onClick={onSelectAll}
          className="btn btn-sm btn-ghost"
          style={styles.ghostButton}
        >
          <CheckSquare size={12} /> Select Visible ({visibleCount})
        </button>
        <button
          onClick={onClear}
          className="btn btn-sm btn-ghost"
          style={styles.ghostClearButton}
        >
          <Square size={12} /> Clear Selection
        </button>
      </div>

      <div style={styles.right}>
        <button
          onClick={onOpenSelected}
          className="btn btn-primary btn-sm"
          style={styles.batchOpenButton}
        >
          <ExternalLink size={13} />
          Open on Skins.com ({selectedCount})
        </button>
        <button
          onClick={onClear}
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
  left: isSidebarExpanded ? "246px" : "84px",
  right: "24px",
  zIndex: 1000,
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
  transition: "left 0.2s ease",
});

const styles: Record<string, React.CSSProperties> = {
  left: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  selectedText: {
    fontSize: "13px",
    fontWeight: 800,
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  checkIcon: {
    color: "var(--so-primary)",
  },
  divider: {
    width: "1px",
    height: "16px",
    backgroundColor: "var(--so-border-subtle)",
  },
  ghostButton: {
    fontSize: "11px",
    padding: "3px 8px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  ghostClearButton: {
    fontSize: "11px",
    padding: "3px 8px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--so-text-primary)",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  batchOpenButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: 800,
  },
  clearCircleButton: {
    padding: "6px",
    borderRadius: "50%",
  },
};
