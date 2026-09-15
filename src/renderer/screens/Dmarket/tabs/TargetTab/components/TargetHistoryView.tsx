import React from "react";
import { History, RefreshCw, Loader2, ExternalLink } from "lucide-react";
import {
  getWearShortcut,
  getTradeTitle,
  getTradePrice,
  getTradeAmount,
  getTradeDate,
} from "../../../dmarket-utils";

export interface TargetHistoryViewProps {
  closedTrades: any[];
  closedLoading: boolean;
  onFetchClosedTargets: () => void;
  onOpenMarket: (title: string) => void;
}

export const TargetHistoryView: React.FC<TargetHistoryViewProps> = ({
  closedTrades,
  closedLoading,
  onFetchClosedTargets,
  onOpenMarket,
}) => {
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <History size={16} style={styles.historyIcon} />{" "}
          Completed Target Purchases
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onFetchClosedTargets}
          disabled={closedLoading}
          style={styles.refreshButton}
        >
          <RefreshCw size={12} className={closedLoading ? "spin" : ""} />
          <span>Refresh History</span>
        </button>
      </div>

      {closedLoading ? (
        <div style={styles.loadingContainer}>
          <Loader2 size={32} className="spin" style={styles.loaderIcon} />
          <div>Loading closed targets history...</div>
        </div>
      ) : closedTrades.length === 0 ? (
        <div style={styles.emptyContainer}>
          <History size={36} style={styles.emptyIcon} />
          <div style={styles.emptyTitle}>
            No completed target trades yet
          </div>
          <div style={styles.emptySubtitle}>
            When your buy targets are fulfilled by sellers, they appear here.
          </div>
        </div>
      ) : (
        <div style={styles.tableScrollWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeadRow}>
                <th style={styles.thSkin}>Skin Title & Wear</th>
                <th style={styles.thAmount}>Amount</th>
                <th style={styles.thPrice}>Purchased Price</th>
                <th style={styles.thStatus}>Status</th>
                <th style={styles.thDate}>Completed Date</th>
                <th style={styles.thMarket}>Market</th>
              </tr>
            </thead>
            <tbody>
              {closedTrades.map((trade, idx) => {
                const title = getTradeTitle(trade);
                const price = getTradePrice(trade);
                const amount = getTradeAmount(trade);
                const dateStr = getTradeDate(trade);
                const status = trade.status || trade.Status || "FULFILLED";
                const cleanStatus = String(status)
                  .replace(/^TargetClosedStatus/, "")
                  .toUpperCase();

                const match = title.match(/^(.+?)\s*\(([^)]+)\)$/);
                const cleanTitle = match ? match[1] : title;
                const wearShortcut = getWearShortcut(
                  trade.attributes?.cs2?.exterior ||
                    (match ? match[2] : ""),
                );
                const isStattrak = title.includes("StatTrak™");
                const imageUrl =
                  trade.attributes?.image ||
                  trade.image ||
                  `https://api.steamapis.com/image/item/730/${encodeURIComponent(title)}`;

                return (
                  <tr
                    key={
                      trade.tradeId ||
                      trade.OfferID ||
                      trade.TargetID ||
                      idx
                    }
                    style={styles.tableRow}
                  >
                    {/* Skin Thumbnail, Title & Wear */}
                    <td style={styles.tdItem}>
                      <div style={styles.itemWrapper}>
                        <img
                          src={imageUrl}
                          alt={cleanTitle}
                          onError={(e) => {
                            (e.target as HTMLElement).style.opacity = "0.3";
                          }}
                          style={styles.thumbnail}
                        />
                        <div>
                          <div style={styles.tradeTitleText}>
                            {cleanTitle}
                          </div>
                          <div style={styles.tagRow}>
                            {wearShortcut && (
                              <span style={styles.wearShortcutTag}>
                                {wearShortcut}
                              </span>
                            )}
                            {isStattrak && (
                              <span style={styles.stattrakTag}>
                                ST™
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td style={styles.tdAmount}>
                      {amount}
                    </td>

                    {/* Purchased Price */}
                    <td style={styles.tdPrice}>
                      {price !== "—" ? `$${price}` : "—"}
                    </td>

                    {/* Status */}
                    <td style={styles.tdStatus}>
                      <span style={styles.statusBadge}>
                        {cleanStatus}
                      </span>
                    </td>

                    {/* Completed Date */}
                    <td style={styles.tdDate}>
                      {dateStr}
                    </td>

                    {/* Action link */}
                    <td style={styles.tdMarket}>
                      <button
                        onClick={() => onOpenMarket(title)}
                        className="btn btn-secondary btn-sm"
                        style={styles.marketButton}
                        title="Open on DMarket Market"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── EXTRACTED STYLES ─────────────────────────────────────────────────

const styles = {
  container: {
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    overflow: "hidden",
  } as React.CSSProperties,

  header: {
    padding: "12px 18px",
    borderBottom: "1px solid var(--so-border-medium)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  } as React.CSSProperties,

  headerTitle: {
    fontWeight: 800,
    fontSize: "14px",
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  } as React.CSSProperties,

  historyIcon: {
    color: "var(--so-accent-cyan)",
  } as React.CSSProperties,

  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11.5px",
  } as React.CSSProperties,

  loadingContainer: {
    padding: "60px 0",
    textAlign: "center",
    color: "var(--so-text-muted)",
  } as React.CSSProperties,

  loaderIcon: {
    margin: "0 auto 12px",
  } as React.CSSProperties,

  emptyContainer: {
    padding: "60px 0",
    textAlign: "center",
    color: "var(--so-text-muted)",
  } as React.CSSProperties,

  emptyIcon: {
    margin: "0 auto 12px",
    opacity: 0.4,
  } as React.CSSProperties,

  emptyTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
  } as React.CSSProperties,

  emptySubtitle: {
    fontSize: "12px",
    marginTop: "4px",
  } as React.CSSProperties,

  tableScrollWrapper: {
    overflowX: "auto",
  } as React.CSSProperties,

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12.5px",
    textAlign: "left",
  } as React.CSSProperties,

  tableHeadRow: {
    backgroundColor: "var(--so-surface-sidebar)",
    borderBottom: "1px solid var(--so-border-medium)",
    color: "var(--so-text-muted)",
    fontSize: "11px",
    textTransform: "uppercase",
  } as React.CSSProperties,

  thSkin: {
    padding: "10px 14px",
  } as React.CSSProperties,

  thAmount: {
    padding: "10px 14px",
    textAlign: "center",
    width: "70px",
  } as React.CSSProperties,

  thPrice: {
    padding: "10px 14px",
    textAlign: "right",
    width: "130px",
  } as React.CSSProperties,

  thStatus: {
    padding: "10px 14px",
    textAlign: "center",
    width: "110px",
  } as React.CSSProperties,

  thDate: {
    padding: "10px 14px",
    textAlign: "right",
    width: "170px",
  } as React.CSSProperties,

  thMarket: {
    padding: "10px 14px",
    textAlign: "right",
    width: "60px",
  } as React.CSSProperties,

  tableRow: {
    borderBottom: "1px solid var(--so-border-subtle)",
  } as React.CSSProperties,

  tdItem: {
    padding: "10px 14px",
  } as React.CSSProperties,

  itemWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  } as React.CSSProperties,

  thumbnail: {
    width: "36px",
    height: "36px",
    objectFit: "contain",
    borderRadius: "4px",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    padding: "2px",
    border: "1px solid var(--so-border-subtle)",
  } as React.CSSProperties,

  tradeTitleText: {
    fontWeight: 700,
    color: "var(--so-text-primary)",
    fontSize: "12.5px",
  } as React.CSSProperties,

  tagRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginTop: "2px",
  } as React.CSSProperties,

  wearShortcutTag: {
    fontSize: "9.5px",
    fontWeight: 800,
    padding: "0 4px",
    borderRadius: "3px",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: "var(--so-text-secondary)",
  } as React.CSSProperties,

  stattrakTag: {
    fontSize: "9.5px",
    fontWeight: 800,
    padding: "0 4px",
    borderRadius: "3px",
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    color: "#fb923c",
  } as React.CSSProperties,

  tdAmount: {
    padding: "10px 14px",
    textAlign: "center",
    fontWeight: 700,
  } as React.CSSProperties,

  tdPrice: {
    padding: "10px 14px",
    textAlign: "right",
    fontWeight: 800,
    fontSize: "13px",
    color: "var(--so-accent-cyan)",
  } as React.CSSProperties,

  tdStatus: {
    padding: "10px 14px",
    textAlign: "center",
  } as React.CSSProperties,

  statusBadge: {
    fontSize: "10px",
    fontWeight: 800,
    padding: "2px 7px",
    borderRadius: "10px",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "var(--so-accent-cyan)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
  } as React.CSSProperties,

  tdDate: {
    padding: "10px 14px",
    textAlign: "right",
    color: "var(--so-text-muted)",
    fontSize: "11.5px",
  } as React.CSSProperties,

  tdMarket: {
    padding: "10px 14px",
    textAlign: "right",
  } as React.CSSProperties,

  marketButton: {
    padding: "3px 6px",
    borderRadius: "4px",
  } as React.CSSProperties,
};
