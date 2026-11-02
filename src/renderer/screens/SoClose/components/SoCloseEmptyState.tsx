import React from "react";
import { useNavigate } from "react-router-dom";
import { Calculator, Clock, Crosshair, Database } from "lucide-react";
import EmptyState from "../../../components/EmptyState";
import { Skeleton } from "../../../components/Skeleton";

export interface SoCloseEmptyStateProps {
  isScanning: boolean;
  cacheItemCount: number;
  acceptedItemCount: number;
  snoozedCount: number;
  totalResults: number;
  onScan: () => void;
}

/**
 * Context-aware empty state: skeleton while scanning, then a recovery path
 * that points at the exact missing prerequisite.
 */
export const SoCloseEmptyState: React.FC<SoCloseEmptyStateProps> = ({
  isScanning,
  cacheItemCount,
  acceptedItemCount,
  snoozedCount,
  totalResults,
  onScan,
}) => {
  const navigate = useNavigate();

  if (isScanning) {
    return (
      <div style={styles.skeletonGrid}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} style={styles.skeletonCard}>
            <Skeleton width="70%" height={12} />
            <Skeleton width="100%" height={95} borderRadius={8} />
            <Skeleton width="85%" height={12} />
            <Skeleton width="60%" height={12} />
            <Skeleton width="100%" height={54} borderRadius={6} />
          </div>
        ))}
      </div>
    );
  }

  if (cacheItemCount === 0) {
    return (
      <EmptyState
        icon={<Database size={40} />}
        title="Price Cache Empty"
        description="Scan market prices in the Oracle engine before running a SoClose sweep. The scanner compares cached listings against your buy ceilings."
        action={{ label: "Go to Oracle Step 1", onClick: () => navigate("/") }}
      />
    );
  }

  if (acceptedItemCount === 0) {
    return (
      <EmptyState
        icon={<Calculator size={40} />}
        title="Accepted Ceilings Not Built"
        description="SoClose needs calculated buy ceilings to measure how close listings are. Calculate Accepted Prices in Oracle Step 2 first."
        action={{ label: "Open Oracle", onClick: () => navigate("/") }}
      />
    );
  }

  if (totalResults > 0 && snoozedCount >= totalResults) {
    return (
      <EmptyState
        icon={<Clock size={40} />}
        title="All Opportunities Snoozed"
        description={`${snoozedCount} deal(s) are snoozed and hidden until their snooze expires. Session snoozes clear on app restart.`}
        action={{ label: "Run Scan", onClick: onScan }}
      />
    );
  }

  return (
    <EmptyState
      icon={<Crosshair size={40} />}
      title="No Snipe Opportunities Found"
      description="No listings currently sit within your closeness threshold. Adjust the max distance or SSS floor, or run a fresh scan after refreshing prices."
      action={{ label: "Run Scan", onClick: onScan }}
    />
  );
};

const styles: Record<string, React.CSSProperties> = {
  skeletonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
    gap: "12px",
  },
  skeletonCard: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-subtle)",
  },
};
