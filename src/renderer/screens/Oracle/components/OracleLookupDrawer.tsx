import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Step4SingleLookup } from "./Step4SingleLookup";
import { ListingPriceStrategy } from "../../../store/useOracleStore";

export interface OracleLookupDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  evaluating: boolean;
  results: any[];
  listingStrategy: ListingPriceStrategy;
  onLookupSingleItem: (e?: React.FormEvent) => void;
}

/**
 * Slide-in drawer that hosts the ad-hoc Single Item Lookup. Kept outside the
 * batch Oracle accordion so the workflow stepper only describes batch steps.
 */
export const OracleLookupDrawer: React.FC<OracleLookupDrawerProps> = ({
  isOpen,
  onClose,
  ...lookupProps
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Single Item Lookup"
      >
        <div style={styles.drawerHeader}>
          <div>
            <h2 style={styles.drawerTitle}>Single Lookup</h2>
            <p style={styles.drawerSubtitle}>
              Ad-hoc market inspection — does not affect batch calculations.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.closeButton}
            title="Close (Esc)"
            aria-label="Close lookup drawer"
          >
            <X size={16} />
          </button>
        </div>

        <div style={styles.drawerBody}>
          <Step4SingleLookup
            isOpen={true}
            onToggle={() => {}}
            hideChevron={true}
            {...lookupProps}
          />
        </div>
      </aside>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  drawerHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "16px",
  },
  drawerTitle: {
    fontSize: "18px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    margin: 0,
  },
  drawerSubtitle: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
    margin: "3px 0 0 0",
  },
  closeButton: {
    width: "30px",
    height: "30px",
    borderRadius: "var(--so-radius-sm)",
    border: "1px solid var(--so-border-medium)",
    backgroundColor: "var(--so-surface-card)",
    color: "var(--so-text-secondary)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    transition:
      "background-color var(--so-duration-fast) var(--so-ease-out), color var(--so-duration-fast) var(--so-ease-out)",
  },
  drawerBody: {
    display: "flex",
    flexDirection: "column",
  },
};
