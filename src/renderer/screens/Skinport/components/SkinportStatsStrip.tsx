import React from "react";
import { Zap } from "lucide-react";

export interface SkinportStat {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}

interface SkinportStatsStripProps {
  stats: SkinportStat[];
  /** Trailing "within max distance" note. */
  maxCloseness?: number;
  visibleCount?: number;
}

export const SkinportStatsStrip: React.FC<SkinportStatsStripProps> = ({
  stats,
  maxCloseness,
  visibleCount,
}) => {
  return (
    <div style={styles.statsStrip}>
      {stats.map((s) => (
        <span key={s.label} style={styles.statItem}>
          {s.label}: <strong style={styles.statValue}>{s.value}</strong>
        </span>
      ))}
      {maxCloseness !== undefined && visibleCount !== undefined && (
        <span style={styles.statFiltered}>
          <Zap size={11} /> Within {maxCloseness.toFixed(2)}× · {visibleCount}{" "}
          item(s)
        </span>
      )}
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
    flexWrap: "wrap",
  },
  statItem: {
    color: "var(--so-text-muted)",
  },
  statValue: {
    color: "var(--so-text-primary)",
  },
  statFiltered: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--so-accent-cyan)",
    marginLeft: "auto",
  },
};
