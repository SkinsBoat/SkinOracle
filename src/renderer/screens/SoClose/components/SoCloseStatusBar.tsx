import React from "react";
import { RefreshCw } from "lucide-react";
import { WorkstationDataStatusCards } from "../../../components/WorkstationDataStatusCards";
import {
  SoCloseAcceptedMeta,
  SoCloseCacheStatus,
  SoCloseScanSummary,
} from "../hooks/useSoCloseScanner";
import { formatTimeAgo } from "../../Oracle/utils/oracleUtils";

export interface SoCloseStatusBarProps {
  cacheStatus: SoCloseCacheStatus;
  acceptedMeta: SoCloseAcceptedMeta | null;
  isRefreshingStatus: boolean;
  onRefresh: () => void;
  scanSummary: SoCloseScanSummary;
  resultCount: number;
  instantDealCount: number;
  snoozedCount: number;
  closestSpreadPercent: number | null;
}

/**
 * Data freshness strip + one-line scan summary so the trader can read the
 * workstation state without opening the log.
 */
export const SoCloseStatusBar: React.FC<SoCloseStatusBarProps> = ({
  cacheStatus,
  acceptedMeta,
  isRefreshingStatus,
  onRefresh,
  scanSummary,
  resultCount,
  instantDealCount,
  snoozedCount,
  closestSpreadPercent,
}) => {
  return (
    <div style={styles.wrapper}>
      <div style={styles.statusRow}>
        <WorkstationDataStatusCards
          cacheStatus={cacheStatus}
          oracle={acceptedMeta}
          oracleKind="accepted"
          oracleNoun="Accepted prices"
          oracleEmptyLabel="Accepted ceilings not built"
          cacheEmptyLabel="No market prices cached"
        />

        <button
          type="button"
          className={`btn btn-ghost btn-sm ${isRefreshingStatus ? "btn-loading" : ""}`}
          onClick={onRefresh}
          disabled={isRefreshingStatus}
          style={styles.refreshBtn}
          title="Refresh cache and accepted-price status"
        >
          <RefreshCw size={13} className={isRefreshingStatus ? "spin" : ""} />
          Refresh Status
        </button>
      </div>

      <div style={styles.summaryBar}>
        <SummaryStat
          label="Opportunities"
          value={resultCount.toLocaleString()}
          tone={resultCount > 0 ? "profit" : "muted"}
        />
        <span style={styles.divider} />
        <SummaryStat
          label="Instant Deals"
          value={instantDealCount.toLocaleString()}
          tone={instantDealCount > 0 ? "cyan" : "muted"}
        />
        <span style={styles.divider} />
        <SummaryStat
          label="Snoozed"
          value={snoozedCount.toLocaleString()}
          tone={snoozedCount > 0 ? "cyan" : "muted"}
        />
        <span style={styles.divider} />
        <SummaryStat
          label="Closest Spread"
          value={
            closestSpreadPercent === null
              ? "—"
              : `${closestSpreadPercent >= 0 ? "+" : ""}${closestSpreadPercent.toFixed(1)}%`
          }
          tone={
            closestSpreadPercent !== null && closestSpreadPercent <= 0
              ? "profit"
              : "muted"
          }
        />
        <span style={styles.divider} />
        <div style={styles.scanMeta}>
          {scanSummary.scannedAt
            ? `Last scan: ${scanSummary.matches} matches from ${scanSummary.checked.toLocaleString()} items checked — ${formatTimeAgo(scanSummary.scannedAt)}`
            : "No scan yet — run a scan to surface opportunities."}
        </div>
      </div>
    </div>
  );
};

const SummaryStat: React.FC<{
  label: string;
  value: string;
  tone: "profit" | "cyan" | "muted";
}> = ({ label, value, tone }) => (
  <div style={styles.stat}>
    <span style={styles.statLabel}>{label}</span>
    <span style={getStatValueStyle(tone)}>{value}</span>
  </div>
);

function getStatValueStyle(
  tone: "profit" | "cyan" | "muted",
): React.CSSProperties {
  const color =
    tone === "profit"
      ? "var(--so-profit-text)"
      : tone === "cyan"
        ? "var(--so-cyan-text)"
        : "var(--so-text-muted)";
  return { ...styles.statValue, color };
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
  },
  refreshBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11.5px",
  },
  summaryBar: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
    padding: "10px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    minWidth: "80px",
  },
  statLabel: {
    fontSize: "9.5px",
    fontWeight: 700,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    color: "var(--so-text-muted)",
  },
  statValue: {
    fontSize: "14px",
    fontWeight: 800,
    fontVariantNumeric: "tabular-nums",
  },
  divider: {
    width: "1px",
    height: "24px",
    backgroundColor: "var(--so-border-subtle)",
  },
  scanMeta: {
    fontSize: "11.5px",
    color: "var(--so-text-muted)",
    flex: 1,
    minWidth: "220px",
  },
};
