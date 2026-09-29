import React, { useEffect, useState } from "react";
import { Loader2, RotateCw, Zap, Clock, Database } from "lucide-react";
import { formatTimeAgo } from "../utils/timeAgo";

export interface WorkstationOracleActionProps {
  meta: {
    itemCount: number;
    storedAt: string | null;
  } | null;
  loading: boolean;
  onLoad: () => void | Promise<void>;
  disabled?: boolean;
}

export const WorkstationOracleAction: React.FC<
  WorkstationOracleActionProps
> = ({ meta, loading, onLoad, disabled = false }) => {
  // Ticking state to update relative time-ago every 30 seconds
  const [, setTick] = useState(0);

  // Live market price cache status (shared in-memory cache, refreshed by scans/auto-refresh)
  const [cacheStatus, setCacheStatus] = useState<{
    itemCount: number;
    isFetching: boolean;
    lastFetchedAt: string | null;
  } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    window.electronAPI?.skinsnipe
      ?.getCacheStatus()
      .then((status) => {
        if (!mounted || !status) return;
        setCacheStatus({
          itemCount: status.itemCount,
          isFetching: status.isFetching,
          lastFetchedAt: status.lastFetchedAt,
        });
      })
      .catch(() => {});

    const unsubscribe = window.electronAPI?.skinsnipe?.onCacheStatusUpdated?.(
      (status) => {
        if (!mounted || !status) return;
        setCacheStatus({
          itemCount: status.itemCount,
          isFetching: status.isFetching,
          lastFetchedAt: status.lastFetchedAt,
        });
      },
    );

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const hasData = meta !== null && meta.itemCount > 0;
  const timeAgoText = meta?.storedAt ? formatTimeAgo(meta.storedAt) : "";

  const cacheHasData = !!cacheStatus && cacheStatus.itemCount > 0;
  const cacheTimeAgoText = cacheStatus?.lastFetchedAt
    ? formatTimeAgo(cacheStatus.lastFetchedAt)
    : "";

  const tooltipText = hasData
    ? `Oracle dataset: ${meta!.itemCount.toLocaleString()} items in memory. Calculated ${
        meta!.storedAt ? new Date(meta!.storedAt).toLocaleString() : "recently"
      }`
    : "No calculated prices in local Oracle memory. Click Load Oracle or calculate in Oracle Dashboard.";

  const cacheTooltipText = cacheHasData
    ? `Market price cache: ${cacheStatus!.itemCount.toLocaleString()} items in memory. Last scanned ${
        cacheStatus!.lastFetchedAt
          ? new Date(cacheStatus!.lastFetchedAt).toLocaleString()
          : "recently"
      }`
    : cacheStatus?.isFetching
      ? "Market price scan in progress…"
      : "No market prices cached. Scan prices in Oracle Step 1 or enable Auto-Refresh.";

  return (
    <div style={styles.container}>
      {/* Market Price Cache Indicator: how many prices are cached & how fresh */}
      <div
        style={getCacheIndicatorStyle(cacheHasData, !!cacheStatus?.isFetching)}
        title={cacheTooltipText}
      >
        {cacheStatus?.isFetching ? (
          <Loader2 size={11} className="spin" style={styles.cacheSpinnerIcon} />
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
                <span style={styles.timeAgoText}>{cacheTimeAgoText}</span>
              </span>
            )}
          </span>
        ) : cacheStatus?.isFetching ? (
          <span style={styles.timeAgoText}>Scanning…</span>
        ) : (
          <span style={styles.noDataText}>No prices cached</span>
        )}
      </div>

      {/* Small Indicator: Item Count & Time Ago */}
      <div style={getIndicatorStyle(hasData)} title={tooltipText}>
        <span style={getDotStyle(hasData)} />
        {hasData ? (
          <span style={styles.indicatorText}>
            <span style={styles.countText}>
              {meta!.itemCount.toLocaleString()} items
            </span>
            {timeAgoText && (
              <span style={styles.timeAgoWrapper}>
                <Clock size={11} style={styles.clockIcon} />
                <span style={styles.timeAgoText}>{timeAgoText}</span>
              </span>
            )}
          </span>
        ) : (
          <span style={styles.noDataText}>Not in memory</span>
        )}
      </div>

      {/* Unified Action Button */}
      <button
        type="button"
        onClick={() => {
          if (!loading && !disabled) {
            onLoad();
          }
        }}
        disabled={loading || disabled}
        className={`btn btn-sm ${hasData ? "btn-secondary" : "btn-primary"}`}
        style={styles.actionButton}
        title={
          hasData
            ? "Reload Oracle prices from local memory and rematch active items"
            : "Load calculated Oracle prices from local memory"
        }
      >
        {loading ? (
          <Loader2 size={13} className="spin" />
        ) : hasData ? (
          <RotateCw size={13} />
        ) : (
          <Zap size={13} />
        )}
        <span>{hasData ? "Reload Oracle" : "Load Oracle"}</span>
      </button>
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC HELPERS ─────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    marginLeft: "auto",
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
  actionButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    height: "28px",
    fontSize: "12px",
    fontWeight: 700,
    padding: "0 12px",
    whiteSpace: "nowrap",
  },
};

const getIndicatorStyle = (hasData: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "3px 10px",
  borderRadius: "14px",
  backgroundColor: hasData
    ? "rgba(6, 182, 212, 0.08)"
    : "rgba(100, 116, 139, 0.12)",
  border: `1px solid ${
    hasData ? "rgba(6, 182, 212, 0.25)" : "rgba(100, 116, 139, 0.25)"
  }`,
  cursor: "default",
  userSelect: "none",
});

const getCacheIndicatorStyle = (
  hasData: boolean,
  isFetching: boolean,
): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "3px 10px",
  borderRadius: "14px",
  backgroundColor: isFetching
    ? "rgba(245, 158, 11, 0.1)"
    : hasData
      ? "rgba(99, 102, 241, 0.1)"
      : "rgba(100, 116, 139, 0.12)",
  border: `1px solid ${
    isFetching
      ? "rgba(245, 158, 11, 0.3)"
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
