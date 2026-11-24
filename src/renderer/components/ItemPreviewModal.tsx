import React from "react";
import { ExternalLink, Layers, Tag, X } from "lucide-react";
import { getMarketDisplayName } from "../../shared/canonicalMarkets";
import {
  buildSteamApisImageUrl,
  resolveItemImageUrl,
} from "../../shared/utils/itemImageUrl";
import { isSteamApisImage } from "../../shared/utils/urlSecurity";
import { MarketBreakdownGrid } from "../screens/Oracle/components/step4/MarketBreakdownGrid";
import type { MarketBreakdownListing } from "../screens/Oracle/components/step4/MarketBreakdownGrid";
import { MarketLogo } from "./MarketLogo";
import { Skeleton } from "./Skeleton";
import { TrendDetailedChart } from "./TrendDetailedChart";

export interface ItemPreviewData {
  name: string;
  /** Oracle Buy Ceiling (accepted price) in USD dollars. */
  acceptedPrice?: number;
  /** Live market price in USD dollars. */
  marketPrice?: number;
  /** Optional suggested sell price in USD dollars. */
  suggestedPrice?: number;
  iconUrl?: string;
  market?: string;
  cacheItem?: any;
}

export interface ItemPreviewModalProps {
  item: ItemPreviewData | null;
  onClose: () => void;
  onOpenMarket: (name: string) => void;
  getHumanMarketName?: (marketId: string) => string;
  /** Market used when the item does not declare one. */
  defaultMarket?: string;
}

const WEAR_PATTERN =
  /^(.*?)(?:\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\))?$/i;

const SKELETON_MARKET_CARDS = Array.from({ length: 6 }, (_, index) => index);

/**
 * ItemPreviewModal
 * Centralized single-item inspection modal shared by every workstation.
 * Mirrors the Step 4 lookup layout: grouped pricing and supply metrics, a
 * 14-day trend chart, a buy-ceiling summary, and live marketplace cards.
 */
export const ItemPreviewModal: React.FC<ItemPreviewModalProps> = ({
  item,
  onClose,
  onOpenMarket,
  getHumanMarketName = getMarketDisplayName,
  defaultMarket = "csfloat",
}) => {
  const [cacheItem, setCacheItem] = React.useState<any>(
    item?.cacheItem ?? null,
  );
  const [isLoading, setIsLoading] = React.useState<boolean>(
    Boolean(item) && !item?.cacheItem,
  );

  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    setCacheItem(item?.cacheItem ?? null);
    setIsLoading(Boolean(item) && !item?.cacheItem);
  }, [item?.name, item?.cacheItem]);

  React.useEffect(() => {
    if (!item || item.cacheItem) return;
    let cancelled = false;

    const loadCache = async () => {
      setIsLoading(true);
      try {
        let found: any = null;
        if (window.electronAPI?.marketCache?.getItem) {
          found = await window.electronAPI.marketCache.getItem(item.name);
        }
        if (!found && window.electronAPI?.marketCache?.get) {
          const cache = await window.electronAPI.marketCache.get();
          found = cache?.[item.name] ?? cache?.[item.name.trim()] ?? null;
        }
        if (!cancelled && found) setCacheItem(found);
      } catch (err) {
        console.error("ItemPreviewModal: failed to load market cache:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadCache();
    return () => {
      cancelled = true;
    };
  }, [item?.name, item?.cacheItem]);

  React.useEffect(() => {
    if (!item) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [item?.name]);

  if (!item) return null;

  const marketId = item.market || defaultMarket;
  const marketName = getHumanMarketName(marketId);

  const nameMatch = item.name.match(WEAR_PATTERN);
  const cleanTitle = nameMatch?.[1] || item.name;
  const wear = nameMatch?.[2] || "";

  const rawListings: any[] = Array.isArray(cacheItem?.l)
    ? cacheItem.l
    : [];

  const marketListings: MarketBreakdownListing[] = rawListings
    .map((listing: any) => ({
      marketId: listing.m || listing.market || "",
      price: Number(listing.p ?? listing.price ?? 0),
      quantity:
        typeof listing.q === "number" && listing.q > 0
          ? listing.q
          : typeof listing.quantity === "number" && listing.quantity > 0
            ? listing.quantity
            : undefined,
    }))
    .filter((listing) => listing.price > 0)
    .sort((a, b) => a.price - b.price);

  const validPrices = marketListings.map((listing) => listing.price);
  const lowestPrice =
    validPrices.length > 0 ? Math.min(...validPrices) : null;
  const averagePrice =
    validPrices.length > 0
      ? validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length
      : 0;
  const maxQuantity = marketListings.reduce(
    (max, listing) => Math.max(max, listing.quantity || 0),
    0,
  );
  const totalQuantity = marketListings.reduce(
    (sum, listing) => sum + (listing.quantity || 0),
    0,
  );
  const hasUnverifiedQuantity = marketListings.some(
    (listing) => listing.quantity === undefined,
  );

  const acceptedPrice =
    item.acceptedPrice && item.acceptedPrice > 0
      ? item.acceptedPrice
      : null;
  const ceilingHeadroom =
    acceptedPrice !== null && lowestPrice !== null
      ? acceptedPrice - lowestPrice
      : null;
  const ceilingHeadroomPercent =
    ceilingHeadroom !== null && lowestPrice && lowestPrice > 0
      ? (ceilingHeadroom / lowestPrice) * 100
      : null;

  const pricingCardCount = item.suggestedPrice !== undefined ? 4 : 3;
  const supplyCardCount = 2;
  const metricColumnCount = pricingCardCount + supplyCardCount;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={styles.panel}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${item.name} preview`}
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <img
              src={resolveItemImageUrl(
                item.name,
                item.iconUrl || cacheItem?.icon_url,
              )}
              alt={item.name}
              onError={(event) => {
                const target = event.target as HTMLImageElement;
                if (!isSteamApisImage(target.src)) {
                  target.src = buildSteamApisImageUrl(item.name);
                }
              }}
              style={styles.itemImage}
            />
            <div style={styles.titleBlock}>
              <div style={styles.titleRow}>
                <span style={styles.itemTitle} title={item.name}>
                  {cleanTitle}
                </span>
                {wear && <span style={styles.wearTag}>{wear}</span>}
              </div>
              <div style={styles.metaRow}>
                <span style={styles.metaAccent}>Single Item Inspection</span>
                <span style={styles.metaDot} />
                <span style={styles.metaMarket}>
                  <MarketLogo marketId={marketId} size={13} />
                  {marketName}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close item preview"
            title="Close"
            style={styles.closeButton}
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        {/* Metric row — every card shares one line */}
        <div
          style={{
            ...styles.metricRow,
            gridTemplateColumns: `repeat(${metricColumnCount}, minmax(0, 1fr))`,
          }}
        >
          {isLoading ? (
            <>
              <div
                style={{
                  gridColumn: `span ${pricingCardCount}`,
                }}
              >
                <Skeleton width={90} height={11} />
              </div>
              <div
                style={{
                  gridColumn: `span ${supplyCardCount}`,
                }}
              >
                <Skeleton width={120} height={11} />
              </div>
              {Array.from({ length: metricColumnCount }, (_, index) => (
                <Skeleton key={index} height={62} borderRadius={6} />
              ))}
            </>
          ) : (
            <>
              <div
                style={{
                  ...styles.groupLabel,
                  gridColumn: `span ${pricingCardCount}`,
                }}
              >
                <Tag size={12} style={styles.pricingIcon} />
                Pricing
              </div>
              <div
                style={{
                  ...styles.groupLabel,
                  gridColumn: `span ${supplyCardCount}`,
                }}
              >
                <Layers size={12} style={styles.supplyIcon} />
                Supply &amp; Coverage
              </div>
              <MetricCard
                label="Workstation Buy Ceiling"
                value={formatUsd(acceptedPrice)}
                color="var(--so-success-text)"
              />
              <MetricCard
                label="Lowest Live Listing"
                value={formatUsd(lowestPrice)}
                color="var(--so-text-primary)"
              />
              <MetricCard
                label="Market Average"
                value={formatUsd(averagePrice > 0 ? averagePrice : null)}
                color="var(--so-text-primary)"
              />
              {item.suggestedPrice !== undefined && (
                <MetricCard
                  label="Suggested Price"
                  value={formatUsd(item.suggestedPrice)}
                  color="var(--so-accent-cyan)"
                />
              )}
              <MetricCard
                label="Total Market Supply"
                value={
                  marketListings.length === 0
                    ? "—"
                    : totalQuantity === 0 && hasUnverifiedQuantity
                      ? "Unverified"
                      : `${totalQuantity.toLocaleString()} Qty${hasUnverifiedQuantity ? "*" : ""}`
                }
                color={
                  totalQuantity === 0 && hasUnverifiedQuantity
                    ? "var(--so-warning)"
                    : "var(--so-success-text)"
                }
              />
              <MetricCard
                label="Markets Tracked"
                value={`${marketListings.length} ${
                  marketListings.length === 1 ? "Market" : "Markets"
                }`}
                color="var(--so-accent-cyan)"
              />
            </>
          )}
        </div>

        {/* 14-day trend */}
        <div style={styles.chartSlot}>
          <TrendDetailedChart name={item.name} height={125} />
        </div>

        {/* Buy ceiling summary */}
        <div style={styles.targetBox}>
          <div>
            <div style={styles.targetLabel}>Workstation Buy Ceiling</div>
            <div className="tabular-nums" style={styles.targetValue}>
              {formatUsd(acceptedPrice)}
            </div>
            <div style={styles.targetDesc}>
              Maximum price to accept for buy orders
            </div>
          </div>
          <div style={styles.targetDividerCol}>
            <div style={styles.targetLabel}>Ceiling vs Lowest Listing</div>
            <div
              className="tabular-nums"
              style={getHeadroomValueStyle(ceilingHeadroom)}
            >
              {ceilingHeadroom === null
                ? "—"
                : `${ceilingHeadroom >= 0 ? "+" : "-"}$${Math.abs(
                    ceilingHeadroom,
                  ).toFixed(2)}`}
            </div>
            <div style={styles.targetDesc}>
              {ceilingHeadroomPercent === null
                ? "Awaiting live marketplace listings"
                : ceilingHeadroom >= 0
                  ? `Ceiling sits ${Math.abs(ceilingHeadroomPercent).toFixed(
                      1,
                    )}% above the cheapest listing`
                  : `Cheapest listing is ${Math.abs(
                      ceilingHeadroomPercent,
                    ).toFixed(1)}% above your ceiling`}
            </div>
          </div>
        </div>

        {/* Market breakdown cards */}
        <div style={styles.marketSection}>
          {isLoading ? (
            <>
              <div style={styles.groupLabel}>
                <Layers size={12} style={styles.supplyIcon} />
                Loading live market prices…
              </div>
              <div style={styles.marketSkeletonGrid}>
                {SKELETON_MARKET_CARDS.map((index) => (
                  <Skeleton key={index} height={88} borderRadius={6} />
                ))}
              </div>
            </>
          ) : (
            <MarketBreakdownGrid
              itemName={item.name}
              listings={marketListings}
              maxQuantity={maxQuantity}
              averagePrice={averagePrice}
            />
          )}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <span style={styles.marketNote}>
            {isLoading
              ? "Streaming live marketplace prices…"
              : marketListings.length > 0
                ? `${marketListings.length} live marketplace ${
                    marketListings.length === 1 ? "listing" : "listings"
                  }`
                : "No live listings cached for this item"}
          </span>
          <div style={styles.actionsRight}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={styles.actionButton}
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onOpenMarket(item.name)}
              className="btn btn-primary btn-sm"
              style={styles.actionButton}
            >
              <ExternalLink size={13} /> View on {marketName}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  color: string;
}> = ({ label, value, color }) => (
  <div style={styles.metricCard}>
    <div style={styles.metricLabel}>{label}</div>
    <div
      className="tabular-nums"
      style={{ ...styles.metricValue, color }}
      title={value}
    >
      {value}
    </div>
  </div>
);

function formatUsd(value: number | null | undefined): string {
  return typeof value === "number" && value > 0 ? `$${value.toFixed(2)}` : "—";
}

function getHeadroomValueStyle(headroom: number | null): React.CSSProperties {
  return {
    ...styles.targetValue,
    color:
      headroom === null
        ? "var(--so-text-primary)"
        : headroom >= 0
          ? "var(--so-success-text)"
          : "var(--so-warning)",
  };
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    backgroundColor: "rgba(2, 6, 23, 0.82)",
    backdropFilter: "blur(6px)",
  },
  panel: {
    width: "min(960px, 100%)",
    maxHeight: "90vh",
    overflowY: "auto",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    padding: "22px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "0 30px 80px rgba(0, 0, 0, 0.7)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "14px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    minWidth: 0,
  },
  itemImage: {
    width: 64,
    height: 64,
    objectFit: "contain",
    flexShrink: 0,
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-subtle)",
    padding: "4px",
  },
  titleBlock: {
    minWidth: 0,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
  },
  itemTitle: {
    fontSize: "17px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  wearTag: {
    fontSize: "10px",
    fontWeight: 800,
    padding: "1px 6px",
    borderRadius: "4px",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-subtle)",
    color: "var(--so-text-secondary)",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "5px",
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  metaAccent: {
    color: "var(--so-accent-cyan)",
    fontWeight: 700,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: "50%",
    backgroundColor: "var(--so-text-muted)",
    opacity: 0.6,
  },
  metaMarket: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontWeight: 700,
    color: "var(--so-text-secondary)",
  },
  closeButton: {
    width: 32,
    height: 32,
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "8px",
    color: "var(--so-text-secondary)",
    cursor: "pointer",
    transition: "background-color 120ms ease, border-color 120ms ease",
  },
  metricRow: {
    display: "grid",
    gap: "6px 10px",
    alignItems: "stretch",
    minHeight: 82,
  },
  groupLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "10.5px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--so-text-muted)",
    paddingLeft: "2px",
    minWidth: 0,
  },
  pricingIcon: {
    color: "var(--so-success-text)",
  },
  supplyIcon: {
    color: "var(--so-accent-cyan)",
  },
  metricCard: {
    minWidth: 0,
    padding: "10px 12px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-subtle)",
  },
  metricLabel: {
    fontSize: "10.5px",
    color: "var(--so-text-muted)",
    fontWeight: 600,
  },
  metricValue: {
    fontSize: "16px",
    fontWeight: 900,
    marginTop: "3px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  chartSlot: {
    minHeight: 196,
    display: "flex",
    flexDirection: "column",
  },
  targetBox: {
    padding: "16px 18px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-balance-bg)",
    border: "1px solid var(--so-balance-border)",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    alignItems: "center",
  },
  targetLabel: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
    textTransform: "uppercase",
    fontWeight: 700,
  },
  targetValue: {
    fontSize: "24px",
    fontWeight: 900,
    color: "var(--so-success-text)",
    marginTop: "2px",
  },
  targetDesc: {
    fontSize: "11.5px",
    color: "var(--so-text-muted)",
    marginTop: "3px",
  },
  targetDividerCol: {
    paddingLeft: "16px",
    borderLeft: "1px solid var(--so-balance-border)",
  },
  marketSection: {
    minHeight: 150,
  },
  marketSkeletonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
    gap: "10px",
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "2px",
  },
  marketNote: {
    fontSize: "11.5px",
    color: "var(--so-text-muted)",
  },
  actionsRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  actionButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: 700,
    fontSize: "12px",
    padding: "5px 14px",
  },
};
