import React, { useEffect, useState } from "react";
import { Clock, Database } from "lucide-react";
import { formatTimeAgo } from "../utils/timeAgo";
import { useDataFreshnessStore } from "../store/useDataFreshnessStore";
import { getFreshness, formatRemainingLabel } from "../utils/dataFreshness";

export interface WorkstationDataStatusCardsProps {
  /** Market price cache snapshot (shared in-memory cache). */
  cacheStatus: {
    itemCount: number;
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
    : "No market prices cached. Scan prices in Oracle Step 1 or enable Auto-Refresh.";

  return (
    <div style={{ ...styles.container, ...style }}>
      {/* Market Price Cache Card: expiry cue is the amber border only */}
      <div
        style={getCacheIndicatorStyle(cacheHasData, cacheIsStale)}
        title={cacheTooltipText}
      >
        <Database
          size={11}
          style={cacheHasData ? styles.cacheIconActive : styles.cacheIconMuted}
        />
        {cacheHasData ? (
          <span style={styles.indicatorText}>
            <span style={styles.countText}>
              {cacheStatus!.itemCount.toLocaleString()} prices
            </span>
            {cacheTimeAgoText && (
              <span style={styles.timeAgoWrapper}>
                <Clock size={11} style={styles.clockIcon} />
                <span style={styles.timeAgoText}>{cacheTimeAgoText}</span>
              </span>
            )}
          </span>
        ) : (
          <span style={styles.noDataText}>{cacheEmptyLabel}</span>
        )}
      </div>

      {/* Calculated Oracle Dataset Card: expiry cue is the amber border only */}
      <div style={getIndicatorStyle(hasData, datasetIsStale)} title={tooltipText}>
        <span style={getDotStyle(hasData)} />
        {hasData ? (
          <span style={styles.indicatorText}>
            <span style={styles.countText}>
              {oracle!.itemCount.toLocaleString()} items
            </span>
            {timeAgoText && (
              <span style={styles.timeAgoWrapper}>
                <Clock size={11} style={styles.clockIcon} />
                <span style={styles.timeAgoText}>{timeAgoText}</span>
              </span>
            )}
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
  backgroundColor: hasData
    ? "rgba(6, 182, 212, 0.08)"
    : "rgba(100, 116, 139, 0.12)",
  border: `1px solid ${
    isStale
      ? "rgba(245, 158, 11, 0.55)"
      : hasData
        ? "rgba(6, 182, 212, 0.25)"
        : "rgba(100, 116, 139, 0.25)"
  }`,
  cursor: "default",
  userSelect: "none",
});

const getCacheIndicatorStyle = (
  hasData: boolean,
  isStale = false,
): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "3px 10px",
  borderRadius: "14px",
  backgroundColor: hasData
    ? "rgba(99, 102, 241, 0.1)"
    : "rgba(100, 116, 139, 0.12)",
  border: `1px solid ${
    isStale
      ? "rgba(245, 158, 11, 0.55)"
      : hasData
        ? "rgba(99, 102, 241, 0.3)"
        : "rgba(100, 116, 139, 0.25)"
  }`,
  cursor: "default",
  userSelect: "none",
});

const getDotStyle = (hasData: boolean): React.CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: "50%",
  backgroundColor: hasData
    ? "var(--so-accent-cyan, #06b6d4)"
    : "var(--so-text-muted)",
  boxShadow: hasData ? "0 0 6px rgba(6, 182, 212, 0.6)" : "none",
  flexShrink: 0,
});
