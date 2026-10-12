import React, { useEffect, useState } from "react";
import { ExternalLink, Eye } from "lucide-react";
import { CopyMarketHashButton } from "../../../components/CopyMarketHashButton";
import type {
  SkinportFeedEventType,
  SkinportSale,
} from "../../../../shared/types/skinport.types";
import type { SkinportFeedEntry } from "../utils/skinportFilters";
import type { CeilingMap } from "../utils/skinportFilters";
import {
  computeCloseness,
  formatUsdFromCents,
  splitMarketName,
  wearShortcutFromFloat,
} from "../utils/skinportUtils";

/** Hard cap on rendered rows — keeps the dense tape snappy without a virtualizer. */
const MAX_ROWS = 150;

interface SkinportStreamTapeProps {
  entries: SkinportFeedEntry[];
  ceilings: CeilingMap;
  maxCloseness: number;
  /** Identities pushed within the arrival window — get a brief flash. */
  recentlyPushed: Set<string>;
  onOpenMarket: (name: string) => void;
  onOpenLookup: (sale: SkinportSale) => void;
}

const formatAge = (receivedAt: number, now: number): string => {
  const seconds = Math.max(0, Math.floor((now - receivedAt) / 1000));
  if (seconds < 1) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
};

export const SkinportStreamTape: React.FC<SkinportStreamTapeProps> = ({
  entries,
  ceilings,
  maxCloseness,
  recentlyPushed,
  onOpenMarket,
  onOpenLookup,
}) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  const rows = entries.slice(0, MAX_ROWS);
  const overflow = entries.length - rows.length;

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Age</th>
            <th style={styles.th}>Event</th>
            <th style={{ ...styles.th, textAlign: "left" }}>Skin</th>
            <th style={styles.thRight}>Price</th>
            <th style={styles.thRight}>Ceiling</th>
            <th style={styles.thRight}>Margin</th>
            <th style={styles.thRight}>SSS</th>
            <th style={styles.thRight}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => {
            const sale = entry.sale;
            const name = sale.marketHashName;
            const { title } = splitMarketName(name);
            const wear = wearShortcutFromFloat(sale.wear);
            const ceiling = ceilings[name]?.cents ?? null;
            const sss = ceilings[name]?.sss ?? null;
            const closeness = computeCloseness(sale.salePrice, ceiling);
            const marginPercent =
              closeness === null ? null : (closeness - 1) * 100;
            const isDeal = closeness !== null && closeness <= 1.0;

            return (
              <tr
                key={entry.identity}
                className={
                  recentlyPushed.has(entry.identity)
                    ? "stream-row-pulse"
                    : undefined
                }
                style={styles.tr}
              >
                <td style={styles.tdMuted}>{formatAge(entry.receivedAt, now)}</td>
                <td style={styles.td}>
                  <span style={getEventBadgeStyle(entry.eventType)}>
                    {entry.eventType === "sold" ? "SOLD" : "LISTED"}
                  </span>
                  {entry.count > 1 && (
                    <span style={styles.dupBadge} title={`${entry.count} events`}>
                      ×{entry.count}
                    </span>
                  )}
                </td>
                <td style={{ ...styles.td, textAlign: "left" }}>
                  <span style={styles.nameText} title={name}>
                    {title}
                  </span>
                  {wear && <span style={styles.wearText}>{wear}</span>}
                </td>
                <td style={styles.tdRight}>
                  <span className="tabular-nums" style={getPriceStyle(isDeal)}>
                    {formatUsdFromCents(sale.salePrice)}
                  </span>
                </td>
                <td style={styles.tdRight}>
                  <span className="tabular-nums" style={styles.ceilingText}>
                    {formatUsdFromCents(ceiling)}
                  </span>
                </td>
                <td style={styles.tdRight}>
                  {marginPercent === null ? (
                    <span style={styles.tdMuted}>—</span>
                  ) : (
                    <span style={getMarginStyle(closeness!, maxCloseness)}>
                      {marginPercent > 0 ? "+" : ""}
                      {marginPercent.toFixed(1)}%
                    </span>
                  )}
                </td>
                <td style={styles.tdRight}>
                  {sss === null ? (
                    <span style={styles.tdMuted}>—</span>
                  ) : (
                    <span className="tabular-nums" style={getSssStyle(sss)}>
                      {sss.toFixed(1)}
                    </span>
                  )}
                </td>
                <td style={styles.tdRight}>
                  <div style={styles.actions}>
                    <button
                      onClick={() => onOpenMarket(name)}
                      className="btn btn-sm"
                      style={styles.iconBtn}
                      title="Open on Skinport (Browser)"
                    >
                      <ExternalLink size={12} />
                    </button>
                    <button
                      onClick={() => onOpenLookup(sale)}
                      className="btn btn-sm"
                      style={styles.iconBtnCyan}
                      title="Inspect item details"
                    >
                      <Eye size={12} />
                    </button>
                    <CopyMarketHashButton name={name} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {overflow > 0 && (
        <div style={styles.overflowNote}>
          {overflow.toLocaleString()} more matched rows hidden (tape capped at{" "}
          {MAX_ROWS}). Narrow your filters to see them.
        </div>
      )}
    </div>
  );
};

// ── DYNAMIC STYLE HELPERS ────────────────────────────────────────────

const getEventBadgeStyle = (
  type: SkinportFeedEventType,
): React.CSSProperties => {
  const sold = type === "sold";
  return {
    fontSize: "9px",
    padding: "1px 5px",
    fontWeight: 800,
    letterSpacing: "0.4px",
    borderRadius: "4px",
    backgroundColor: sold
      ? "rgba(56, 189, 248, 0.18)"
      : "rgba(34, 197, 94, 0.18)",
    color: sold ? "var(--so-accent-cyan)" : "var(--so-success-text)",
    border: `1px solid ${
      sold ? "rgba(56, 189, 248, 0.4)" : "rgba(34, 197, 94, 0.4)"
    }`,
    whiteSpace: "nowrap",
  };
};

const getPriceStyle = (isDeal: boolean): React.CSSProperties => ({
  fontWeight: 800,
  color: isDeal ? "var(--so-success-text)" : "var(--so-text-primary)",
});

const getMarginStyle = (
  closeness: number,
  maxCloseness: number,
): React.CSSProperties => {
  const palette =
    closeness <= 1.0
      ? {
          bg: "rgba(34, 197, 94, 0.16)",
          fg: "var(--so-success-text)",
          bd: "rgba(34, 197, 94, 0.35)",
        }
      : closeness <= maxCloseness
        ? {
            bg: "rgba(245, 158, 11, 0.18)",
            fg: "#f59e0b",
            bd: "rgba(245, 158, 11, 0.4)",
          }
        : {
            bg: "rgba(239, 68, 68, 0.15)",
            fg: "#ef4444",
            bd: "rgba(239, 68, 68, 0.35)",
          };
  return {
    fontSize: "10px",
    fontWeight: 800,
    padding: "1px 6px",
    borderRadius: "4px",
    backgroundColor: palette.bg,
    color: palette.fg,
    border: `1px solid ${palette.bd}`,
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  };
};

const getSssStyle = (score: number): React.CSSProperties => ({
  fontWeight: 800,
  color:
    score >= 1.2
      ? "var(--so-success-text)"
      : score >= 0.8
        ? "var(--so-accent-cyan)"
        : "var(--so-warning)",
});

// ── STATIC STYLES ────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    overflow: "hidden",
    backgroundColor: "var(--so-surface-card)",
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: "11.5px",
  },
  th: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    textAlign: "center",
    padding: "6px 8px",
    fontSize: "9.5px",
    fontWeight: 800,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
    color: "var(--so-text-muted)",
    backgroundColor: "var(--so-surface-panel)",
    borderBottom: "1px solid var(--so-border-medium)",
    whiteSpace: "nowrap",
  },
  thRight: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    textAlign: "right",
    padding: "6px 8px",
    fontSize: "9.5px",
    fontWeight: 800,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
    color: "var(--so-text-muted)",
    backgroundColor: "var(--so-surface-panel)",
    borderBottom: "1px solid var(--so-border-medium)",
    whiteSpace: "nowrap",
  },
  tr: {},
  td: {
    padding: "4px 8px",
    textAlign: "center",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
    borderBottom: "1px solid var(--so-border-subtle)",
  },
  tdRight: {
    padding: "4px 8px",
    textAlign: "right",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
    borderBottom: "1px solid var(--so-border-subtle)",
  },
  tdMuted: {
    padding: "4px 8px",
    textAlign: "center",
    fontSize: "10.5px",
    color: "var(--so-text-muted)",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
    borderBottom: "1px solid var(--so-border-subtle)",
  },
  nameText: {
    fontWeight: 700,
    color: "var(--so-text-primary)",
  },
  wearText: {
    marginLeft: "6px",
    fontSize: "10px",
    fontWeight: 800,
    color: "var(--so-primary)",
  },
  dupBadge: {
    marginLeft: "4px",
    fontSize: "9px",
    fontWeight: 800,
    padding: "1px 4px",
    borderRadius: "4px",
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    color: "var(--so-text-secondary)",
  },
  ceilingText: {
    fontWeight: 700,
    color: "var(--so-text-secondary)",
  },
  actions: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  iconBtn: {
    padding: "3px 6px",
    background: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "4px",
    color: "var(--so-text-secondary)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnCyan: {
    padding: "3px 6px",
    background: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "4px",
    color: "var(--so-accent-cyan)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  overflowNote: {
    padding: "6px 10px",
    fontSize: "10.5px",
    color: "var(--so-text-muted)",
    borderTop: "1px solid var(--so-border-subtle)",
    backgroundColor: "var(--so-surface-panel)",
  },
};
