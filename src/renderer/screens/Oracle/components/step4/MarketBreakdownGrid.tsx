import React from "react";
import { Layers, ExternalLink, AlertTriangle, AlertCircle } from "lucide-react";
import { MarketLogo } from "../../../../components/MarketLogo";
import {
  getMarketDisplayName,
  isTradeMarket,
} from "../../../../../shared/canonicalMarkets";
import { getMarketItemUrl } from "../../../../utils/marketUrls";

export interface MarketBreakdownListing {
  marketId: string;
  price: number;
  quantity?: number;
}

interface MarketBreakdownGridProps {
  /** Full market hash name used to build per-market deep links. */
  itemName: string;
  listings: MarketBreakdownListing[];
  /** Largest quantity across listings, used to scale the quantity bars. */
  maxQuantity: number;
  /** Reference average used to grade each market price. */
  averagePrice: number;
}

/**
 * MarketBreakdownGrid
 * Space-efficient card grid replacing the old market breakdown table. Each
 * card merges the marketplace identity, lowest active price, and a proportional
 * quantity indicator into a single scannable unit. Prices are graded by their
 * distance from the market average using high-contrast tones that stay legible
 * on the dark surface (sky = below average, white = on average, amber/red =
 * above average).
 */
export const MarketBreakdownGrid: React.FC<MarketBreakdownGridProps> = ({
  itemName,
  listings,
  maxQuantity,
  averagePrice,
}) => {
  if (listings.length === 0) {
    return (
      <div style={styles.noListingsNotice}>
        <AlertCircle size={15} style={styles.noListingsIcon} />
        <span>
          No live market listings found in cache. Scan or stream market data in
          Step 1 to populate marketplace listings.
        </span>
      </div>
    );
  }

  const pricedListings = listings.filter((listing) => listing.price > 0);
  const effectiveAverage =
    averagePrice > 0
      ? averagePrice
      : pricedListings.length > 0
        ? pricedListings.reduce((sum, listing) => sum + listing.price, 0) /
          pricedListings.length
        : 0;

  return (
    <div>
      <div style={styles.titleRow}>
        <Layers size={14} style={styles.titleIcon} /> Live Market Price
        Breakdown ({listings.length} Markets)
      </div>

      <div style={styles.grid}>
        {listings.map((listing, idx) => {
          const marketName = getMarketDisplayName(listing.marketId);
          const marketUrl = getMarketItemUrl(listing.marketId, itemName);
          const isTrade = isTradeMarket(listing.marketId);
          const hasQuantity = listing.quantity !== undefined;
          const tone = getPriceTone(listing.price, effectiveAverage);

          return (
            <div key={listing.marketId + idx} style={styles.card}>
              <div style={styles.cardTop}>
                <MarketLogo
                  marketId={listing.marketId}
                  marketName={marketName}
                  size={16}
                />
                <span style={styles.cardName} title={marketName}>
                  {marketName}
                </span>
                {isTrade && (
                  <span
                    style={styles.tradeBadge}
                    title="Trade bot / swap platform: prices may reflect marked-up virtual credit"
                  >
                    <AlertTriangle size={9} style={styles.tradeIcon} />
                    TRADE
                  </span>
                )}
              </div>

              <div style={styles.cardPriceRow}>
                <span style={{ ...styles.cardPrice, color: tone.color }}>
                  ${listing.price.toFixed(2)}
                </span>
                {tone.label && (
                  <span
                    style={{
                      ...styles.deltaPill,
                      color: tone.color,
                      backgroundColor: tone.bg,
                      borderColor: tone.border,
                    }}
                    title={tone.title}
                  >
                    {tone.label}
                  </span>
                )}
                {marketUrl && (
                  <button
                    type="button"
                    style={styles.linkBtn}
                    data-export-ignore="true"
                    title={`Open ${itemName} on ${marketName}`}
                    onClick={() =>
                      window.electronAPI.app.openExternal(marketUrl)
                    }
                  >
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>

              <div style={styles.qtyRow}>
                <div style={styles.qtyTrack}>
                  {hasQuantity && (
                    <div
                      style={getQtyBarFillStyle(listing.quantity!, maxQuantity)}
                    />
                  )}
                </div>
                <span
                  className="tabular-nums"
                  style={hasQuantity ? styles.qtyValue : styles.qtyUnverified}
                >
                  {hasQuantity ? listing.quantity!.toLocaleString() : "—"}
                </span>
              </div>
              <div style={styles.qtyLabel}>
                {hasQuantity ? "Active qty" : "Qty unverified"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function getQtyBarFillStyle(
  quantity: number,
  maxQuantity: number,
): React.CSSProperties {
  const ratio = maxQuantity > 0 ? quantity / maxQuantity : 0;
  const pct = Math.max(6, Math.min(100, Math.round(ratio * 100)));
  return { ...styles.qtyBarFill, width: `${pct}%` };
}

interface PriceTone {
  color: string;
  bg: string;
  border: string;
  label: string;
  title: string;
}

/**
 * Grades a market price by its distance from the average, returning only
 * bright tones that keep AA contrast on the dark surface:
 *   ≤ -10% sky · ≤ -3% light sky · ±3% white · ≥ +3% amber · ≥ +10% red
 */
function getPriceTone(price: number, average: number): PriceTone {
  const neutral: PriceTone = {
    color: "var(--so-text-primary, #f8fafc)",
    bg: "rgba(248, 250, 252, 0.08)",
    border: "rgba(248, 250, 252, 0.18)",
    label: "",
    title: "",
  };
  if (!average || average <= 0 || price <= 0) return neutral;

  const delta = (price - average) / average;
  const pct = delta * 100;
  const label = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  const title = `${Math.abs(pct).toFixed(1)}% ${
    pct < 0 ? "below" : "above"
  } market average`;

  if (delta <= -0.1) {
    return {
      color: "var(--so-success-text, #38bdf8)",
      bg: "rgba(56, 189, 248, 0.16)",
      border: "rgba(56, 189, 248, 0.4)",
      label,
      title,
    };
  }
  if (delta <= -0.03) {
    return {
      color: "#7dd3fc",
      bg: "rgba(125, 211, 252, 0.14)",
      border: "rgba(125, 211, 252, 0.34)",
      label,
      title,
    };
  }
  if (delta < 0.03) {
    return { ...neutral, label, title };
  }
  if (delta < 0.1) {
    return {
      color: "var(--so-warning, #f59e0b)",
      bg: "rgba(245, 158, 11, 0.15)",
      border: "rgba(245, 158, 11, 0.36)",
      label,
      title,
    };
  }
  return {
    color: "var(--so-danger-text, #f87171)",
    bg: "rgba(248, 113, 113, 0.15)",
    border: "rgba(248, 113, 113, 0.36)",
    label,
    title,
  };
}

const styles: Record<string, React.CSSProperties> = {
  titleRow: {
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  titleIcon: {
    color: "var(--so-cyan-text, #38bdf8)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
    gap: "10px",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    padding: "11px 12px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-subtle)",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    minWidth: 0,
  },
  cardName: {
    flex: 1,
    minWidth: 0,
    fontWeight: 700,
    fontSize: "12px",
    color: "var(--so-text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  tradeBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    fontSize: "8.5px",
    fontWeight: 800,
    padding: "1px 5px",
    borderRadius: "3px",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    color: "var(--so-warning-text, #f59e0b)",
    border: "1px solid rgba(245, 158, 11, 0.35)",
    flexShrink: 0,
  },
  tradeIcon: {
    color: "var(--so-warning-text, #f59e0b)",
  },
  cardPriceRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "8px",
    marginTop: "8px",
  },
  cardPrice: {
    fontSize: "19px",
    fontWeight: 900,
    lineHeight: 1.1,
    color: "var(--so-success-text, #38bdf8)",
  },
  deltaPill: {
    fontSize: "10px",
    fontWeight: 800,
    padding: "1px 6px",
    borderRadius: "4px",
    border: "1px solid",
    lineHeight: 1.5,
    flexShrink: 0,
  },
  linkBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
    padding: "2px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--so-text-muted, #94a3b8)",
    flexShrink: 0,
  },
  qtyRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "7px",
  },
  qtyTrack: {
    flex: 1,
    minWidth: 0,
    height: "5px",
    borderRadius: "3px",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    overflow: "hidden",
  },
  qtyBarFill: {
    height: "100%",
    borderRadius: "3px",
    backgroundColor: "var(--so-success-text, #38bdf8)",
  },
  qtyValue: {
    fontSize: "11.5px",
    fontWeight: 700,
    color: "var(--so-text-secondary)",
    minWidth: "30px",
    textAlign: "right",
  },
  qtyUnverified: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--so-warning-text, #f59e0b)",
    minWidth: "30px",
    textAlign: "right",
  },
  qtyLabel: {
    marginTop: "4px",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--so-text-muted)",
  },
  noListingsNotice: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    border: "1px solid rgba(245, 158, 11, 0.25)",
    color: "var(--so-warning-text, #f59e0b)",
    fontSize: "12.5px",
    fontWeight: 500,
  },
  noListingsIcon: {
    flexShrink: 0,
    color: "var(--so-warning-text, #f59e0b)",
  },
};

export default MarketBreakdownGrid;
