import React from "react";
import { ExternalLink, X } from "lucide-react";
import {
  getMarketDisplayName,
  isMarketMatch,
} from "../../../../shared/canonicalMarkets";
import { isSteamApisImage } from "../../../../shared/utils/urlSecurity";
import TrendDetailedChart from "../../../components/TrendDetailedChart";

export interface SkinportLookupItem {
  name: string;
  /** Oracle Buy Ceiling (accepted price) in USD dollars. */
  acceptedPrice?: number;
  /** Skinport suggested price in USD dollars. */
  suggestedPrice?: number;
  /** Live sale market price in USD dollars. */
  marketPrice?: number;
  iconUrl?: string;
  market?: string;
}

interface SkinportLookupModalProps {
  item: SkinportLookupItem | null;
  onClose: () => void;
  onOpenMarket: (name: string) => void;
  getHumanMarketName?: (marketId: string) => string;
}

export const SkinportLookupModal: React.FC<SkinportLookupModalProps> = ({
  item,
  onClose,
  onOpenMarket,
  getHumanMarketName = getMarketDisplayName,
}) => {
  const [cacheItem, setCacheItem] = React.useState<any>(null);

  React.useEffect(() => {
    if (!item) return;
    let isMounted = true;
    const fetchCache = async () => {
      try {
        const cache = await window.electronAPI?.skinsnipe?.getCache?.();
        if (isMounted && cache) {
          setCacheItem(cache[item.name] || cache[item.name.trim()] || null);
        }
      } catch (err) {
        console.error("SkinportLookupModal: failed to fetch item cache:", err);
      }
    };
    fetchCache();
    return () => {
      isMounted = false;
    };
  }, [item?.name]);

  if (!item) return null;

  const cacheListings: any[] =
    cacheItem?.l && Array.isArray(cacheItem.l) ? cacheItem.l : [];

  const validPrices = cacheListings
    .map((m: any) => (typeof m.p === "number" ? m.p : parseFloat(m.p)))
    .filter((p: number) => !isNaN(p) && p > 0);
  const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

  const targetEntry = cacheListings.find((m: any) =>
    isMarketMatch(m.m, item.market || "skinport"),
  );
  const resolvedMarketPrice =
    item.marketPrice || (targetEntry?.p ? Number(targetEntry.p) : null);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <img
              src={
                item.iconUrl
                  ? item.iconUrl.startsWith("http")
                    ? item.iconUrl
                    : `https://community.cloudflare.steamstatic.com/economy/image/${item.iconUrl}`
                  : `https://api.steamapis.com/image/item/730/${encodeURIComponent(item.name)}`
              }
              alt={item.name}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!isSteamApisImage(target.src)) {
                  target.src = `https://api.steamapis.com/image/item/730/${encodeURIComponent(item.name)}`;
                }
              }}
              style={styles.headerImage}
            />
            <div>
              <div style={styles.title}>{item.name}</div>
              <div style={styles.subtitle}>
                <span style={styles.subtitleAccent}>
                  Single Item Inspection
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={styles.closeButton}
          >
            <X size={16} />
          </button>
        </div>

        <div style={styles.statGrid}>
          <StatCard
            label="Oracle Buy Ceiling"
            value={
              item.acceptedPrice ? `$${item.acceptedPrice.toFixed(2)}` : "—"
            }
            color="var(--so-success-text)"
          />
          <StatCard
            label="Skinport Suggested"
            value={
              item.suggestedPrice ? `$${item.suggestedPrice.toFixed(2)}` : "—"
            }
            color="var(--so-accent-cyan)"
          />
          <StatCard
            label="Skinport Market Price"
            value={
              resolvedMarketPrice ? `$${resolvedMarketPrice.toFixed(2)}` : "—"
            }
            color="#f59e0b"
          />
          <StatCard
            label="Lowest Listing"
            value={lowestPrice !== null ? `$${lowestPrice.toFixed(2)}` : "—"}
            color="var(--so-text-primary)"
          />
        </div>

        <TrendDetailedChart name={item.name} />

        {cacheListings.length > 0 && (
          <div>
            <div style={styles.tableTitle}>
              Live Marketplace Price Breakdown ({cacheListings.length} Markets)
            </div>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={styles.thLeft}>Marketplace</th>
                    <th style={styles.thRight}>Lowest Active Price</th>
                  </tr>
                </thead>
                <tbody>
                  {cacheListings.map((m: any, idx: number) => (
                    <tr key={m.m + idx} style={styles.tbodyRow}>
                      <td style={styles.tdMarket}>
                        {getHumanMarketName(m.m)}
                      </td>
                      <td className="tabular-nums" style={styles.tdPrice}>
                        {m.p ? `$${Number(m.p).toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={styles.actions}>
          <button
            onClick={() => onOpenMarket(item.name)}
            className="btn btn-secondary btn-sm"
            style={styles.openButton}
          >
            <ExternalLink size={13} /> View on Skinport Market
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  color: string;
}> = ({ label, value, color }) => (
  <div style={styles.statCard}>
    <div style={styles.statLabel}>{label}</div>
    <div className="tabular-nums" style={{ ...styles.statValue, color }}>
      {value}
    </div>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(4px)",
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  panel: {
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    maxWidth: "620px",
    width: "100%",
    maxHeight: "85vh",
    overflowY: "auto",
    padding: "22px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  headerImage: {
    width: 56,
    height: 56,
    objectFit: "contain",
    borderRadius: "6px",
    background: "rgba(0,0,0,0.3)",
    padding: "4px",
  },
  title: {
    fontWeight: 800,
    fontSize: "15.5px",
    color: "var(--so-text-primary)",
  },
  subtitle: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
    marginTop: "2px",
    display: "flex",
    gap: "8px",
  },
  subtitleAccent: {
    color: "var(--so-accent-cyan)",
    fontWeight: 700,
  },
  closeButton: {
    padding: "4px 8px",
    borderRadius: "50%",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "10px",
  },
  statCard: {
    padding: "10px 12px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-subtle)",
  },
  statLabel: {
    fontSize: "10.5px",
    color: "var(--so-text-muted)",
    fontWeight: 600,
  },
  statValue: {
    fontSize: "16px",
    fontWeight: 900,
    marginTop: "2px",
  },
  tableTitle: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
    marginBottom: "8px",
  },
  tableWrapper: {
    overflowX: "auto",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "var(--so-radius-sm)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
  },
  theadRow: {
    backgroundColor: "var(--so-surface-input)",
    borderBottom: "1px solid var(--so-border-subtle)",
    textAlign: "left",
    color: "var(--so-text-muted)",
  },
  thLeft: {
    padding: "6px 10px",
    fontWeight: 700,
  },
  thRight: {
    padding: "6px 10px",
    fontWeight: 700,
    textAlign: "right",
  },
  tbodyRow: {
    borderBottom: "1px solid var(--so-border-subtle)",
  },
  tdMarket: {
    padding: "6px 10px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
  },
  tdPrice: {
    padding: "6px 10px",
    textAlign: "right",
    fontWeight: 800,
    color: "var(--so-primary)",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "6px",
  },
  openButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: 700,
    fontSize: "12px",
  },
};
