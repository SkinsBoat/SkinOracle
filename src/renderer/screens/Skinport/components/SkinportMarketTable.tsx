import React from "react";
import { CheckSquare, ExternalLink, Eye, Square } from "lucide-react";
import { CopyMarketHashButton } from "../../../components/CopyMarketHashButton";
import type { SkinportMarketItem } from "../../../../shared/types/skinport.types";
import type { CeilingMap } from "../utils/skinportFilters";
import {
  computeCloseness,
  formatUsdFromCents,
  itemPriceCents,
  splitMarketName,
} from "../utils/skinportUtils";

/** Hard cap on rendered rows to keep bulk views snappy without a virtualizer. */
const MAX_ROWS = 300;

interface SkinportMarketTableProps {
  items: SkinportMarketItem[];
  ceilings: CeilingMap;
  maxCloseness: number;
  selected: Record<string, boolean>;
  onToggleSelect: (name: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onOpenMarket: (name: string) => void;
  onOpenLookup: (item: SkinportMarketItem) => void;
}

export const SkinportMarketTable: React.FC<SkinportMarketTableProps> = ({
  items,
  ceilings,
  maxCloseness,
  selected,
  onToggleSelect,
  onToggleSelectAll,
  onOpenMarket,
  onOpenLookup,
}) => {
  const rows = items.slice(0, MAX_ROWS);
  const overflow = items.length - rows.length;
  const allSelected = rows.length > 0 && rows.every((i) => selected[i.market_hash_name]);

  return (
    <div style={styles.wrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.thCheck}>
              <button
                type="button"
                onClick={() => onToggleSelectAll(!allSelected)}
                style={styles.checkBtn}
                title={allSelected ? "Deselect all visible" : "Select all visible"}
              >
                {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
              </button>
            </th>
            <th style={{ ...styles.th, textAlign: "left" }}>Skin</th>
            <th style={styles.thRight}>Qty</th>
            <th style={styles.thRight}>Market Price</th>
            <th style={styles.thRight}>Buy Ceiling</th>
            <th style={styles.thRight}>Closeness</th>
            <th style={styles.thRight}>SSS</th>
            <th style={styles.thRight}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => {
            const name = item.market_hash_name;
            const { title, wear } = splitMarketName(name);
            const priceCents = itemPriceCents(item);
            const ceiling = ceilings[name]?.cents ?? null;
            const sss = ceilings[name]?.sss ?? null;
            const closeness =
              priceCents === null
                ? null
                : computeCloseness(priceCents, ceiling);
            const marginPercent =
              closeness === null ? null : (closeness - 1) * 100;
            const isDeal = closeness !== null && closeness <= 1.0;
            const isSelected = !!selected[name];

            return (
              <tr
                key={name}
                onClick={() => onToggleSelect(name)}
                style={getRowStyle(isSelected)}
              >
                <td style={styles.tdCheck}>
                  {isSelected ? (
                    <CheckSquare size={14} style={styles.checkOnColor} />
                  ) : (
                    <Square size={14} style={styles.checkOffColor} />
                  )}
                </td>
                <td style={{ ...styles.td, textAlign: "left" }}>
                  <span style={styles.nameText} title={name}>
                    {title}
                  </span>
                  {wear && <span style={styles.wearText}>{wear}</span>}
                </td>
                <td style={styles.tdRight}>
                  <span style={styles.tdMuted}>{item.quantity ?? "—"}</span>
                </td>
                <td style={styles.tdRight}>
                  <span className="tabular-nums" style={getPriceStyle(isDeal)}>
                    {formatUsdFromCents(priceCents)}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenMarket(name);
                      }}
                      className="btn btn-sm"
                      style={styles.iconBtn}
                      title="Open on Skinport (Browser)"
                    >
                      <ExternalLink size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenLookup(item);
                      }}
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
          {overflow.toLocaleString()} more matched rows hidden (table capped at{" "}
          {MAX_ROWS}). Narrow your filters to see them.
        </div>
      )}
    </div>
  );
};

// ── DYNAMIC STYLE HELPERS ────────────────────────────────────────────

const getRowStyle = (isSelected: boolean): React.CSSProperties => ({
  borderBottom: "1px solid var(--so-border-subtle)",
  cursor: "pointer",
  backgroundColor: isSelected ? "rgba(56, 189, 248, 0.1)" : "transparent",
});

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
    borderCollapse: "collapse",
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
  thCheck: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    width: "36px",
    padding: "4px 8px",
    backgroundColor: "var(--so-surface-panel)",
    borderBottom: "1px solid var(--so-border-medium)",
  },
  checkBtn: {
    display: "inline-flex",
    alignItems: "center",
    border: "none",
    background: "transparent",
    color: "var(--so-text-secondary)",
    cursor: "pointer",
    padding: 0,
  },
  checkOnColor: {
    color: "var(--so-accent-cyan)",
  },
  checkOffColor: {
    color: "var(--so-text-muted)",
  },
  td: {
    padding: "4px 8px",
    textAlign: "center",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  },
  tdRight: {
    padding: "4px 8px",
    textAlign: "right",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  },
  tdCheck: {
    width: "36px",
    padding: "4px 8px",
    textAlign: "center",
    verticalAlign: "middle",
  },
  tdMuted: {
    color: "var(--so-text-muted)",
    fontVariantNumeric: "tabular-nums",
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
