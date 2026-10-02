import React, { useEffect, useState } from "react";
import { Loader2, Clock, Database, AlertTriangle } from "lucide-react";
import { formatTimeAgo } from "../utils/timeAgo";
import { useDataFreshnessStore } from "../store/useDataFreshnessStore";
import { getFreshness, formatRemainingLabel } from "../utils/dataFreshness";

export interface WorkstationDataStatusCardsProps {
  /** Live market price cache status (shared in-memory cache). */
  cacheStatus: {
    itemCount: number;
    isFetching?: boolean;
    lastFetchedAt: string | null;
  } | null;
  /** Calculated Oracle dataset (accepted prices or listing prices). */
  oracle: {
    itemCount: number;
    storedAt: string | null;
  } | null;
  /** Which expiry window applies to the Oracle dataset. */
  oracleKind?: "accepted" | "listing";
  /** Noun for the Oracle dataset, used in the expiry tooltip. */
  oracleNoun?: string;
  /** Fallback text when the Oracle dataset is empty. */
  oracleEmptyLabel?: string;
  /** Fallback text when the market cache is empty. */
  cacheEmptyLabel?: string;
  /** Optional container style override. */
  style?: React.CSSProperties;
}

/**
 * The two data status cards used across market workstations: market price
 * cache + calculated Oracle dataset. Encapsulates trader-configured expiry
 * warnings so every screen shows identical visuals and staleness logic.
 * Advisory only — never blocks actions.
 */
export const WorkstationDataStatusCards: React.FC<
  WorkstationDataStatusCardsProps
> = ({
  cacheStatus,
  oracle,
  oracleKind = "accepted",
  oracleNoun,
  oracleEmptyLabel = "Not in memory",
  cacheEmptyLabel = "No prices cached",
  style,
}) => {
  const cacheExpiryMinutes = useDataFreshnessStore((s) => s.cacheExpiryMinutes);
  const acceptedPriceExpiryMinutes = useDataFreshnessStore(
    (s) => s.acceptedPriceExpiryMinutes,
  );
  const listingPriceExpiryMinutes = useDataFreshnessStore(
    (s) => s.listingPriceExpiryMinutes,
  );
  const warningsEnabled = useDataFreshnessStore(
    (s) => s.freshnessWarningsEnabled,
  );

  // Ticking state to advance relative time-ago / expiry countdown on screen.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const hasData = !!oracle && oracle.itemCount > 0;
  const timeAgoText = oracle?.storedAt ? formatTimeAgo(oracle.storedAt) : "";

  const cacheHasData = !!cacheStatus && cacheStatus.itemCount > 0;
  const cacheTimeAgoText = cacheStatus?.lastFetchedAt
    ? formatTimeAgo(cacheStatus.lastFetchedAt)
    : "";

  const datasetTtlMinutes =
    oracleKind === "listing"
      ? listingPriceExpiryMinutes
      : acceptedPriceExpiryMinutes;

  const cacheFreshness = getFreshness(
    cacheStatus?.lastFetchedAt,
    cacheExpiryMinutes,
    now,
  );
  const datasetFreshness = getFreshness(oracle?.storedAt, datasetTtlMinutes, now);

  const cacheIsStale =
    warningsEnabled && cacheHasData && cacheFreshness.isExpired;
  const datasetIsStale = warningsEnabled && hasData && datasetFreshness.isExpired;

  const datasetNoun =
    oracleNoun || (oracleKind === "listing" ? "Listing prices" : "Accepted prices");

  const tooltipText = hasData
    ? `Oracle dataset: ${oracle!.itemCount.toLocaleString()} items in memory. Calculated ${
        oracle!.storedAt ? new Date(oracle!.storedAt).toLocaleString() : "recently"
      }${
        datasetIsStale
          ? ` — ⚠ ${datasetNoun} expired (${formatRemainingLabel(
              datasetFreshness.remainingMs,
            )}). Recalculate in Oracle Dashboard.`
          : datasetFreshness.ttlMinutes
            ? ` — ${formatRemainingLabel(datasetFreshness.remainingMs)}`
            : ""
      }`
    : "No calculated prices in local Oracle memory. Click Load Oracle or calculate in Oracle Dashboard.";

  const cacheTooltipText = cacheHasData
    ? `Market price cache: ${cacheStatus!.itemCount.toLocaleString()} items in memory. Last scanned ${
        cacheStatus!.lastFetchedAt
          ? new Date(cacheStatus!.lastFetchedAt).toLocaleString()
          : "recently"
      }${
        cacheIsStale
          ? ` — ⚠ cache expired (${formatRemainingLabel(
              cacheFreshness.remainingMs,
            )}). Rescan or enable Auto-Refresh.`
          : cacheFreshness.ttlMinutes
            ? ` — ${formatRemainingLabel(cacheFreshness.remainingMs)}`
            : ""
      }`
    : cacheStatus?.isFetching
      ? "Market price scan in progress…"
      : "No market prices cached. Scan prices in Oracle Step 1 or enable Auto-Refresh.";

  return (
    <div style={{ ...styles.container, ...style }}>
      {/* Market Price Cache Card: how many prices are cached & how fresh */}
      <div
        style={getCacheIndicatorStyle(
          cacheHasData,
          !!cacheStatus?.isFetching,
          cacheIsStale,
        )}
        title={cacheTooltipText}
      >
        {cacheStatus?.isFetching ? (
          <Loader2 size={11} className="spin" style={styles.cacheSpinnerIcon} />
        ) : cacheIsStale ? (
          <AlertTriangle size={11} style={styles.warningIcon} />
        ) : (
          <Database
            size={11}
            style={
              cacheHasData ? styles.cacheIconActive : styles.cacheIconMuted
            }
          />
        )}
        {cacheHasData ? (
          <span style={styles.indicatorText}>
            <span style={styles.countText}>
              {cacheStatus!.itemCount.toLocaleString()} prices
            </span>
            {cacheTimeAgoText && (
              <span style={styles.timeAgoWrapper}>
                <Clock size={11} style={styles.clockIcon} />
                <span
                  style={cacheIsStale ? styles.staleText : styles.timeAgoText}
                >
                  {cacheTimeAgoText}
                </span>
              </span>
            )}
            {cacheIsStale && <span style={styles.staleBadge}>EXPIRED</span>}
          </span>
        ) : cacheStatus?.isFetching ? (
          <span style={styles.timeAgoText}>Scanning…</span>
        ) : (
          <span style={styles.noDataText}>{cacheEmptyLabel}</span>
        )}
      </div>

      {/* Calculated Oracle Dataset Card: item count & time ago */}
      <div style={getIndicatorStyle(hasData, datasetIsStale)} title={tooltipText}>
        <span style={getDotStyle(hasData, datasetIsStale)} />
        {hasData ? (
          <span style={styles.indicatorText}>
            {datasetIsStale && (
              <AlertTriangle size={11} style={styles.warningIcon} />
            )}
            <span style={styles.countText}>
              {oracle!.itemCount.toLocaleString()} items
            </span>
            {timeAgoText && (
              <span style={styles.timeAgoWrapper}>
                <Clock size={11} style={styles.clockIcon} />
                <span
                  style={datasetIsStale ? styles.staleText : styles.timeAgoText}
                >
                  {timeAgoText}
                </span>
              </span>
            )}
            {datasetIsStale && <span style={styles.staleBadge}>EXPIRED</span>}
          </span>
        ) : (
          <span style={styles.noDataText}>{oracleEmptyLabel}</span>
        )}
      </div>
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC HELPERS ─────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  indicatorText: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.2px",
  },
  countText: {
    color: "var(--so-text-primary)",
    fontWeight: 700,
  },
  timeAgoWrapper: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    color: "var(--so-text-muted)",
  },
  clockIcon: {
    opacity: 0.7,
  },
  timeAgoText: {
    color: "var(--so-text-secondary)",
    fontWeight: 500,
  },
  noDataText: {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--so-text-muted)",
  },
  cacheIconActive: {
    color: "#818cf8",
    flexShrink: 0,
  },
  cacheIconMuted: {
    color: "var(--so-text-muted)",
    flexShrink: 0,
  },
  cacheSpinnerIcon: {
    color: "#f59e0b",
    flexShrink: 0,
  },
  warningIcon: {
    color: "#f59e0b",
    flexShrink: 0,
  },
  staleText: {
    color: "#fbbf24",
    fontWeight: 700,
  },
  staleBadge: {
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.5px",
    padding: "1px 5px",
    borderRadius: "4px",
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    border: "1px solid rgba(245, 158, 11, 0.45)",
    color: "#fbbf24",
  },
};

const getIndicatorStyle = (
  hasData: boolean,
  isStale = false,
): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "3px 10px",
  borderRadius: "14px",
  backgroundColor: isStale
    ? "rgba(245, 158, 11, 0.1)"
    : hasData
      ? "rgba(6, 182, 212, 0.08)"
      : "rgba(100, 116, 139, 0.12)",
  border: `1px solid ${
    isStale
      ? "rgba(245, 158, 11, 0.45)"
      : hasData
        ? "rgba(6, 182, 212, 0.25)"
        : "rgba(100, 116, 139, 0.25)"
  }`,
  cursor: "default",
  userSelect: "none",
});

const getCacheIndicatorStyle = (
  hasData: boolean,
  isFetching: boolean,
  isStale = false,
): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "3px 10px",
  borderRadius: "14px",
  backgroundColor: isFetching
    ? "rgba(245, 158, 11, 0.1)"
    : isStale
      ? "rgba(245, 158, 11, 0.1)"
      : hasData
        ? "rgba(99, 102, 241, 0.1)"
        : "rgba(100, 116, 139, 0.12)",
  border: `1px solid ${
    isFetching
      ? "rgba(245, 158, 11, 0.3)"
      : isStale
        ? "rgba(245, 158, 11, 0.45)"
        : hasData
          ? "rgba(99, 102, 241, 0.3)"
          : "rgba(100, 116, 139, 0.25)"
  }`,
  cursor: "default",
  userSelect: "none",
});

const getDotStyle = (
  hasData: boolean,
  isStale = false,
): React.CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: "50%",
  backgroundColor: isStale
    ? "#f59e0b"
    : hasData
      ? "var(--so-accent-cyan, #06b6d4)"
      : "var(--so-text-muted)",
  boxShadow: isStale
    ? "0 0 6px rgba(245, 158, 11, 0.6)"
    : hasData
      ? "0 0 6px rgba(6, 182, 212, 0.6)"
      : "none",
  flexShrink: 0,
});
