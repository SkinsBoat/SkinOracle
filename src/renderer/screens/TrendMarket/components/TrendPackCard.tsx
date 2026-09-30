import React from "react";
import {
  TrendingUp,
  Download,
  Eye,
  ShieldCheck,
  Calendar,
  Layers,
  Loader2,
} from "lucide-react";
import { TrendMarketListing } from "../../../../shared/types/electron-api.types";

interface TrendPackCardProps {
  pack: TrendMarketListing;
  onPreview: (pack: TrendMarketListing) => void;
  onPurchase: (pack: TrendMarketListing) => Promise<void>;
  isPurchasing: boolean;
  isHeld?: boolean;
  /** True when this listing belongs to the current user (device-to-device sync). */
  isOwn?: boolean;
}

export const TrendPackCard = React.memo(function TrendPackCard({
  pack,
  onPreview,
  onPurchase,
  isPurchasing,
  isHeld = false,
  isOwn = false,
}: TrendPackCardProps) {
  return (
    <div style={styles.card}>
      {/* Top Header Row */}
      <div style={styles.headerRow}>
        <div style={styles.titleContainer}>
          <div style={styles.packTitle} title={pack.title}>
            {pack.title}
          </div>
          <div style={styles.sellerRow}>
            <span style={styles.versionBadge}>
              Dataset v{pack.version}
            </span>
            {isOwn && <span style={styles.ownBadge}>Your listing</span>}
          </div>
        </div>

        <div style={styles.priceContainer}>
          <div style={styles.priceTag}>{isOwn ? "$1.00" : "$5.00"}</div>
          <div style={styles.priceFiat}>
            {isOwn ? "Self-Sync Fee" : "Fixed Pack Price"}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricItem}>
          <Calendar size={13} style={styles.metricIcon} />
          <div>
            <div style={styles.metricValue}>{pack.daysCount} Days</div>
            <div style={styles.metricLabel}>Window</div>
          </div>
        </div>

        <div style={styles.metricItem}>
          <Layers size={13} style={styles.metricIconCyan} />
          <div>
            <div style={styles.metricValue}>
              {pack.itemCoverage.toLocaleString()}
            </div>
            <div style={styles.metricLabel}>Skins Covered</div>
          </div>
        </div>

        <div style={styles.metricItem}>
          <TrendingUp size={13} style={styles.metricIconPurple} />
          <div>
            <div style={styles.metricValue}>
              {pack.totalSnapshots.toLocaleString()}
            </div>
            <div style={styles.metricLabel}>Snapshots</div>
          </div>
        </div>

        <div style={styles.metricItem}>
          <ShieldCheck size={13} style={styles.metricIconGreen} />
          <div>
            <div style={styles.metricValue}>{pack.qualityScore}%</div>
            <div style={styles.metricLabel}>Data Quality</div>
          </div>
        </div>
      </div>

      {/* Footer Info & Actions */}
      <div style={styles.footerRow}>
        <div style={styles.salesInfo}>
          <span style={styles.salesCount}>{pack.salesCount} purchases</span>
          <span style={styles.dateInfo}>
            {pack.oldestDate} &rarr; {pack.latestDate}
          </span>
        </div>

        <div style={styles.actionsContainer}>
          <button
            type="button"
            style={styles.previewBtn}
            onClick={() => onPreview(pack)}
            title="Inspect interactive preview chart for sample skins"
          >
            <Eye size={13} />
            Test Sample Skins
          </button>

          <button
            type="button"
            style={styles.buyBtn}
            onClick={() => onPurchase(pack)}
            disabled={isPurchasing || isHeld}
            title={
              isHeld
                ? "Marketplace temporarily paused while the valuation engine restarts"
                : isOwn
                  ? "Sync your own pack to this device (platform fee only, no sale)"
                  : "Purchase and replace local trend history (SQLite)"
            }
          >
            {isPurchasing ? (
              <>
                <Loader2 size={13} className="spin" />
                Replacing…
              </>
            ) : (
              <>
                <Download size={13} />
                {isOwn ? "Replace Local Data" : "Buy Pack ($5.00)"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

// ── EXTRACTED STYLES ────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "8px",
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    transition: "border-color 0.2s ease, transform 0.2s ease",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
  },
  titleContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
    minWidth: 0,
  },
  packTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--so-text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  sellerRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  versionBadge: {
    fontSize: "10px",
    color: "var(--so-text-muted)",
    fontFamily: "monospace",
  },
  ownBadge: {
    fontSize: "10px",
    fontWeight: 600,
    color: "#c084fc",
    backgroundColor: "rgba(192, 132, 252, 0.12)",
    border: "1px solid rgba(192, 132, 252, 0.3)",
    padding: "1px 6px",
    borderRadius: "4px",
  },
  priceContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  priceTag: {
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--so-cyan-text, #38bdf8)",
  },
  priceFiat: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "10px",
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    padding: "10px 12px",
    borderRadius: "6px",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  metricItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  metricIcon: {
    color: "var(--so-text-secondary)",
  },
  metricIconCyan: {
    color: "var(--so-cyan-text, #38bdf8)",
  },
  metricIconPurple: {
    color: "#c084fc",
  },
  metricIconGreen: {
    color: "#4ade80",
  },
  metricValue: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--so-text-primary)",
  },
  metricLabel: {
    fontSize: "10px",
    color: "var(--so-text-muted)",
  },
  footerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  salesInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  salesCount: {
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--so-text-secondary)",
  },
  dateInfo: {
    fontSize: "10px",
    color: "var(--so-text-muted)",
    fontFamily: "monospace",
  },
  actionsContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  previewBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--so-text-primary)",
    backgroundColor: "transparent",
    border: "1px solid var(--so-border-medium, rgba(255, 255, 255, 0.15))",
    borderRadius: "5px",
    cursor: "pointer",
  },
  buyBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 14px",
    fontSize: "11px",
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "var(--so-primary, #2563eb)",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};
