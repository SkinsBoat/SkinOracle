import React from "react";
import { Zap } from "lucide-react";
import type { CategoryFilter } from "../constants";

interface MarketplaceStatsStripProps {
  itemsCount: number;
  /** Listings that matched an Oracle Buy Ceiling. */
  matchedCount: number;
  category: CategoryFilter;
  categoryCount: number;
  maxCloseness: number;
  /** Listings currently rendered. */
  visibleCount: number;
}

export const MarketplaceStatsStrip: React.FC<MarketplaceStatsStripProps> = ({
  itemsCount,
  matchedCount,
  category,
  categoryCount,
  maxCloseness,
  visibleCount,
}) => {
  return (
    <div style={styles.statsStrip}>
      <span style={styles.statItem}>
        Scanned: <strong>{itemsCount}</strong>
      </span>
      <span style={styles.statItem}>
        Matched to ceilings: <strong>{matchedCount}</strong>
      </span>
      <span style={styles.statItem}>
        In category: <strong>{categoryCount}</strong>
        {category !== "all" ? " (weapons/stickers)" : ""}
      </span>
      <span style={styles.statFiltered}>
        <Zap size={11} /> Within {maxCloseness.toFixed(2)}× · {visibleCount}{" "}
        item(s)
      </span>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  statsStrip: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    fontSize: "11.5px",
    fontWeight: 700,
    color: "var(--so-text-muted)",
    padding: "0 4px",
    flexShrink: 0,
  },
  statItem: {
    color: "var(--so-text-muted)",
  },
  statFiltered: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--so-accent-cyan)",
  },
};
