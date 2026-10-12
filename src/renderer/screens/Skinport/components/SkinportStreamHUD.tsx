import React, { useEffect, useState } from "react";
import { BellOff, BellRing, Loader2, Pause, Play } from "lucide-react";
import {
  SORT_OPTIONS,
  type SkinportSortOption,
} from "../constants";

interface SkinportStreamHUDProps {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  /** Events per minute from the recent push ring buffer. */
  velocity: number;
  /** Epoch ms of the last socket push, or null before the first event. */
  lastEventAt: number | null;
  visibleCount: number;
  totalCount: number;
  sortMode: SkinportSortOption;
  onSortChange: (mode: SkinportSortOption) => void;
  /** Freeze controls (Phase 5); omitted when unsupported. */
  isFrozen?: boolean;
  frozenCount?: number;
  onToggleFreeze?: () => void;
  /** Deal-alert toggle for the live feed. */
  alertsEnabled?: boolean;
  onToggleAlerts?: () => void;
}

function formatAge(from: number | null, now: number): string {
  if (from === null) return "—";
  const seconds = Math.max(0, Math.floor((now - from) / 1000));
  if (seconds < 1) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export const SkinportStreamHUD: React.FC<SkinportStreamHUDProps> = ({
  connected,
  connecting,
  error,
  velocity,
  lastEventAt,
  visibleCount,
  totalCount,
  sortMode,
  onSortChange,
  isFrozen,
  frozenCount = 0,
  onToggleFreeze,
  alertsEnabled = false,
  onToggleAlerts,
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!connected) return;
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, [connected]);

  return (
    <div style={styles.hud}>
      <span style={getLiveStyle(connected, connecting)}>
        {connecting ? (
          <Loader2 size={11} className="spin" />
        ) : (
          <span
            className={connected ? "live-beacon" : undefined}
            style={getDotStyle(connected)}
          />
        )}
        {connecting ? "Connecting…" : connected ? "LIVE" : "Offline"}
      </span>

      <span style={styles.metric} title="Events per minute (recent socket pushes)">
        <strong style={styles.metricValue}>{velocity.toFixed(1)}</strong> ev/min
      </span>

      <span style={styles.metric}>
        Last: <strong style={styles.metricValue}>{formatAge(lastEventAt, now)}</strong>
      </span>

      {error && <span style={styles.errorText}>{error}</span>}

      {isFrozen && frozenCount > 0 && (
        <span style={styles.frozenBadge}>+{frozenCount} new (paused)</span>
      )}

      <span style={styles.metric}>
        Showing{" "}
        <strong style={styles.metricValue}>{visibleCount.toLocaleString()}</strong>{" "}
        of {totalCount.toLocaleString()}
      </span>

      <div style={styles.hudRight}>
        {onToggleAlerts && (
          <button
            type="button"
            role="switch"
            aria-checked={alertsEnabled}
            onClick={onToggleAlerts}
            className={`btn btn-sm ${alertsEnabled ? "btn-primary" : "btn-outline"}`}
            style={styles.freezeBtn}
            title={
              alertsEnabled
                ? "Deal alerts ON — you are alerted when a listing hits your Buy Ceiling"
                : "Deal alerts OFF — click to be alerted on target matches"
            }
          >
            {alertsEnabled ? <BellRing size={12} /> : <BellOff size={12} />}
            {alertsEnabled ? "Alerts On" : "Alerts Off"}
          </button>
        )}
        <span style={styles.sortLabel}>Sort:</span>
        <select
          value={sortMode}
          onChange={(e) => onSortChange(e.target.value as SkinportSortOption)}
          style={styles.sortSelect}
          aria-label="Sort feed"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>

        {onToggleFreeze && (
          <button
            type="button"
            onClick={onToggleFreeze}
            className={`btn btn-sm ${isFrozen ? "btn-primary" : "btn-outline"}`}
            style={styles.freezeBtn}
            title={
              isFrozen
                ? "Resume the live feed and load buffered events"
                : "Freeze the feed so the list stops shifting while you review"
            }
          >
            {isFrozen ? <Play size={12} /> : <Pause size={12} />}
            {isFrozen ? `Resume${frozenCount > 0 ? ` (+${frozenCount})` : ""}` : "Freeze Feed"}
          </button>
        )}
      </div>
    </div>
  );
};

// ── DYNAMIC STYLE HELPERS ────────────────────────────────────────────

const getDotStyle = (connected: boolean): React.CSSProperties => ({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: connected ? "var(--so-success)" : "var(--so-text-muted)",
  display: "inline-block",
});

const getLiveStyle = (
  connected: boolean,
  connecting: boolean,
): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "5px",
  fontWeight: 800,
  color: connecting
    ? "var(--so-accent-cyan)"
    : connected
      ? "var(--so-success-text)"
      : "var(--so-text-muted)",
});

// ── STATIC STYLES ────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  hud: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    fontSize: "11.5px",
    fontWeight: 700,
    color: "var(--so-text-muted)",
    padding: "6px 10px",
    flexShrink: 0,
    flexWrap: "wrap",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
  },
  metric: {
    color: "var(--so-text-muted)",
    whiteSpace: "nowrap",
  },
  metricValue: {
    color: "var(--so-text-primary)",
    fontVariantNumeric: "tabular-nums",
  },
  errorText: {
    color: "var(--so-danger-text)",
    whiteSpace: "nowrap",
  },
  frozenBadge: {
    fontSize: "10px",
    fontWeight: 800,
    padding: "1px 7px",
    borderRadius: "999px",
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    color: "#f59e0b",
    border: "1px solid rgba(245, 158, 11, 0.4)",
    whiteSpace: "nowrap",
  },
  hudRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginLeft: "auto",
  },
  sortLabel: {
    fontSize: "10px",
    fontWeight: 700,
    color: "var(--so-text-muted)",
  },
  sortSelect: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "3px 6px",
    borderRadius: "var(--so-radius-sm)",
    border: "1px solid var(--so-border-medium)",
    background: "var(--so-surface-panel)",
    color: "var(--so-text-primary)",
  },
  freezeBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11.5px",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
};
