import React, { useEffect, useState } from "react";
import { Loader2, RotateCw, Zap, Clock } from "lucide-react";
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

export const WorkstationOracleAction: React.FC<WorkstationOracleActionProps> = ({
  meta,
  loading,
  onLoad,
  disabled = false,
}) => {
  // Ticking state to update relative time-ago every 30 seconds
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const hasData = meta !== null && meta.itemCount > 0;
  const timeAgoText = meta?.storedAt ? formatTimeAgo(meta.storedAt) : "";

  const tooltipText = hasData
    ? `Oracle dataset: ${meta!.itemCount.toLocaleString()} items in memory. Calculated ${
        meta!.storedAt ? new Date(meta!.storedAt).toLocaleString() : "recently"
      }`
    : "No calculated prices in local Oracle memory. Click Load Oracle or calculate in Oracle Dashboard.";

  return (
    <div style={styles.container}>
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
