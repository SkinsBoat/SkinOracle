import React from "react";
import { CheckSquare, Loader2, PlusCircle, X } from "lucide-react";

interface InventoryBatchBarProps {
  selectedCount: number;
  isSidebarExpanded: boolean;
  onListSelected: () => void;
  onClear: () => void;
  processing: boolean;
}

/**
 * Floating batch bar for the Listings & Inventory tab. Each item keeps its own
 * list price; this only triggers a batch deposit of the selected items.
 */
export const InventoryBatchBar: React.FC<InventoryBatchBarProps> = ({
  selectedCount,
  isSidebarExpanded,
  onListSelected,
  onClear,
  processing,
}) => {
  return (
    <div style={getFloatingToolbarStyle(isSidebarExpanded)}>
      <div style={styles.left}>
        <span style={styles.selectedText}>
          <CheckSquare size={16} style={styles.checkIcon} />
          <span>{selectedCount} Selected</span>
        </span>
      </div>

      <div style={styles.right}>
        <button
          onClick={onListSelected}
          disabled={processing}
          className="btn btn-primary btn-sm"
          style={styles.listButton}
        >
          {processing ? (
            <Loader2 size={13} className="spin" />
          ) : (
            <PlusCircle size={13} />
          )}
          List Selected ({selectedCount})
        </button>
        <button
          onClick={onClear}
          className="btn btn-sm btn-ghost"
          style={styles.clearButton}
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
  right: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  listButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: 800,
  },
  clearButton: {
    padding: "6px",
    borderRadius: "50%",
  },
};
