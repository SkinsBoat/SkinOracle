import React from "react";
import {
  ExternalLink,
  Eye,
  Lock,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Loader2,
  PlusCircle,
  Edit3,
  Trash2,
  CheckSquare,
  Square,
  Zap,
  RotateCw,
  Handshake,
} from "lucide-react";
import {
  ListingAnalysis,
  CsFloatInventoryItem,
  CsFloatItemBuyOrder,
} from "../../../../shared/types";
import { CopyMarketHashButton } from "../../../components/CopyMarketHashButton";
import TrendSparkline from "../../../components/TrendSparkline";
import { SkinImage } from "../../../components/SkinImage";
import { useDealMakerStore } from "../../../store/useDealMakerStore";
import { extractWearFromName } from "../../../utils/storage";

export type { ListingAnalysis, CsFloatInventoryItem, CsFloatItemBuyOrder };

interface CSFloatListingCardProps {
  item: CsFloatInventoryItem;
  isSelected: boolean;
  onToggleSelect: () => void;
  analysis?: ListingAnalysis | null;
  isProcessing: boolean;
  isPrivateMode?: boolean;
  onCreateListing: (
    item: CsFloatInventoryItem,
    price?: number,
    forcePublic?: boolean,
  ) => void | Promise<void>;
  onUpdateListing: (
    item: CsFloatInventoryItem,
    price: number,
    forcePublic?: boolean,
  ) => void | Promise<void>;
  onUnlist: (item: CsFloatInventoryItem) => void | Promise<void>;
  onOpenMarket: (name: string) => void;
  onOpenLookup: (
    name: string,
    acceptedPrice?: number,
    currentListedPrice?: number,
    iconUrl?: string,
  ) => void;
  wearShortcut: string;
}

export const CSFloatListingCard: React.FC<CSFloatListingCardProps> = ({
  item,
  isSelected,
  onToggleSelect,
  analysis,
  isProcessing,
  isPrivateMode,
  onCreateListing,
  onUpdateListing,
  onUnlist,
  onOpenMarket,
  onOpenLookup,
  wearShortcut,
}) => {
  const isListed = !!item.listing_id;
  const name = item.market_hash_name || item.item_name || "CS:GO Item";
  const match = name.match(/^(.+?)\s*\(([^)]+)\)$/);
  const cleanTitle = match ? match[1] : name;

  const imageUrl = item.icon_url
    ? `https://community.cloudflare.steamstatic.com/economy/image/${item.icon_url}`
    : `https://api.steamapis.com/image/item/730/${encodeURIComponent(name)}`;

  const floatVal =
    item.float_value !== undefined && item.float_value !== null
      ? item.float_value.toFixed(4)
      : null;

  const currentListedPriceDollar =
    isListed && typeof item.price === "number" && item.price > 0
      ? item.price / 100
      : null;

  // Matching buy order state
  const [matchingBuyOrders, setMatchingBuyOrders] = React.useState<
    CsFloatItemBuyOrder[] | null
  >(null);
  const [loadingBuyOrders, setLoadingBuyOrders] = React.useState(false);
  const [checkedBuyOrders, setCheckedBuyOrders] = React.useState(false);

  const bestBuyOrder =
    matchingBuyOrders && matchingBuyOrders.length > 0
      ? matchingBuyOrders[0]
      : null;
  const bestBuyOrderDollar = bestBuyOrder ? bestBuyOrder.price / 100 : null;

  const handleScanBuyOrders = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const inspectUrl = item.serialized_inspect || item.inspect_link;
    const sig = item.gs_sig;
    const mhn = item.market_hash_name || item.item_name;

    if (!inspectUrl || !sig || !mhn) {
      return;
    }

    setLoadingBuyOrders(true);
    try {
      const orders = await window.electronAPI.csfloat.getItemBuyOrders(
        inspectUrl,
        mhn,
        sig,
        3,
      );
      setMatchingBuyOrders(orders || []);
      setCheckedBuyOrders(true);
    } catch (err: any) {
      console.warn("[CSFloat Card] Error scanning buy orders:", err.message);
      setMatchingBuyOrders([]);
      setCheckedBuyOrders(true);
    } finally {
      setLoadingBuyOrders(false);
    }
  };

  const handleInstaSell = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!bestBuyOrderDollar || bestBuyOrderDollar <= 0) return;
    if (!isListed) {
      onCreateListing(item, bestBuyOrderDollar, true);
    } else {
      onUpdateListing(item, bestBuyOrderDollar, true);
    }
  };

  const cardBorderColor = isSelected
    ? "var(--so-primary)"
    : item.is_sold
      ? "#8b5cf6"
      : analysis?.isOverpriced
        ? "#ef4444"
        : analysis?.isUnderpriced
          ? "#f59e0b"
          : isListed
            ? "var(--so-success)"
            : "var(--so-border-medium)";

  return (
    <div
      style={getCardContainerStyle(isSelected, cardBorderColor, item.is_sold)}
      onClick={item.is_sold ? undefined : onToggleSelect}
    >
      {/* Top Action Row */}
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMarket(name);
            }}
            className="btn btn-sm"
            style={styles.actionBtn}
            title="Open on CSFloat Market (Browser)"
          >
            <ExternalLink size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenLookup(
                name,
                undefined,
                currentListedPriceDollar || undefined,
                item.icon_url,
              );
            }}
            className="btn btn-sm"
            style={styles.lookupBtn}
            title="Inspect Item Details"
          >
            <Eye size={13} />
          </button>
          <CopyMarketHashButton name={name} />
          {!item.is_sold && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                useDealMakerStore.getState().openCreateModal({
                  marketHashName: name,
                  wear: wearShortcut || extractWearFromName(name),
                  floatValue: floatVal || undefined,
                  inspectUrl: item.serialized_inspect || item.inspect_link || undefined,
                  imageUrl: imageUrl,
                  marketplace: 'csfloat',
                  startingPrice: currentListedPriceDollar || analysis?.targetListingPrice || undefined,
                });
              }}
              className="btn btn-sm"
              style={styles.dealBtn || styles.auctionBtn}
              title="Broadcast to DealMaker ($0.40 fee)"
            >
              <Handshake size={12} />
            </button>
          )}
        </div>

        {/* Selection Checkbox Indicator (Hidden for sold items) */}
        {!item.is_sold && (
          <div
            style={getCheckmarkStyle(isSelected)}
            title={isSelected ? "Selected" : "Click card to select"}
          >
            {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
          </div>
        )}
      </div>

      {/* Badges Row (Next Line to Prevent Overlapping) */}
      <div style={styles.badgesRow}>
        {item.is_sold ? (
          <span style={styles.badgeSold}>
            <CheckCircle2 size={10} />
            <span>SOLD ({item.trade_state?.toUpperCase() || "QUEUED"})</span>
          </span>
        ) : (
          <>
            <span style={getStallBadgeStyle(isListed)}>
              {isListed ? (
                item.private ? (
                  <Lock size={9} />
                ) : (
                  <Globe size={9} />
                )
              ) : null}
              {isListed ? "STALL" : "UNLISTED"}
            </span>

            {/* Analysis Badge */}
            {!isListed ? (
              <span className="badge badge-secondary" style={styles.badgeReadyToList}>
                READY TO LIST
              </span>
            ) : analysis ? (
              analysis.isOverpriced ? (
                <span className="badge" style={styles.badgeOverpriced}>
                  <AlertTriangle size={10} /> OVERPRICED (
                  {analysis.driftPercent > 0
                    ? `+${analysis.driftPercent.toFixed(0)}%`
                    : `${analysis.driftPercent.toFixed(0)}%`}
                  )
                </span>
              ) : analysis.isUnderpriced ? (
                <span className="badge" style={styles.badgeUnderpriced}>
                  <AlertTriangle size={10} /> UNDERPRICED (
                  {analysis.driftPercent.toFixed(0)}%)
                </span>
              ) : (
                <span className="badge badge-success" style={styles.badgeSafe}>
                  <CheckCircle2 size={10} /> SAFE (
                  {analysis.driftPercent >= 0
                    ? `+${analysis.driftPercent.toFixed(0)}%`
                    : `${analysis.driftPercent.toFixed(0)}%`}
                  )
                </span>
              )
            ) : (
              <span className="badge badge-secondary" style={styles.badgeListed}>
                LISTED
              </span>
            )}
          </>
        )}
      </div>

      {/* Skin Image Showcase */}
      <SkinImage src={imageUrl} alt={cleanTitle} />

      {/* Title & Float */}
      <div style={styles.titleWearContainer}>
        <div style={styles.cleanTitleText}>
          {cleanTitle}
        </div>
        <div style={styles.wearFloatRow}>
          {wearShortcut && (
            <span style={styles.wearText}>
              {wearShortcut}
            </span>
          )}
          {floatVal && (
            <span style={styles.floatText}>
              f: {floatVal}
            </span>
          )}
        </div>
      </div>

      {/* 14-Day Trend Sparkline */}
      <div onClick={(e) => e.stopPropagation()}>
        <TrendSparkline
          name={name}
          momentum={analysis?.trendMomentum14d}
          height={32}
          onClick={() =>
            onOpenLookup(
              name,
              analysis?.targetListingPrice,
              currentListedPriceDollar || undefined,
              item.icon_url,
            )
          }
        />
      </div>

      {/* Pricing Info */}
      <div style={styles.pricingBox}>
        <div style={styles.pricingRow}>
          <span style={styles.labelMuted}>
            {item.is_sold ? "Sold Price" : "Listed Price"}
          </span>
          <span
            className="tabular-nums"
            style={
              item.is_sold
                ? styles.soldPriceText
                : getListedPriceStyle(!!currentListedPriceDollar)
            }
          >
            {currentListedPriceDollar
              ? `$${currentListedPriceDollar.toFixed(2)}`
              : item.is_sold
                ? "Sold"
                : "Not Listed"}
          </span>
        </div>

        <div style={styles.pricingRow}>
          <span style={styles.labelMuted}>Target Listing</span>
          <span
            className="tabular-nums"
            style={getTargetListingPriceStyle(!!analysis?.targetListingPrice)}
          >
            {analysis?.targetListingPrice
              ? `$${analysis.targetListingPrice.toFixed(2)}`
              : "---"}
          </span>
        </div>

        {/* Lowest / Avg (Displayed directly under Target Listing) */}
        {analysis?.lowestPrice && analysis?.averagePrice ? (
          <div style={styles.pricingSubRow}>
            <span style={styles.labelSubMuted}>Lowest / Avg</span>
            <span className="tabular-nums" style={styles.subPriceText}>
              ${analysis.lowestPrice.toFixed(2)} / $
              {analysis.averagePrice.toFixed(2)}
            </span>
          </div>
        ) : null}

        <div style={styles.pricingRowBottom}>
          <span style={styles.labelMuted}>Top Buy Order</span>
          {loadingBuyOrders && !checkedBuyOrders ? (
            <span style={styles.buyOrderLoading}>
              <Loader2 size={11} className="spin" />
            </span>
          ) : checkedBuyOrders ? (
            <div style={styles.buyOrderValueContainer}>
              <button
                type="button"
                onClick={handleScanBuyOrders}
                disabled={loadingBuyOrders}
                style={styles.refreshBuyOrderBtn}
                title="Refresh matching buy orders"
              >
                <RotateCw
                  size={10}
                  className={loadingBuyOrders ? "spin" : ""}
                />
              </button>
              {bestBuyOrderDollar ? (
                <span
                  className="tabular-nums"
                  style={styles.buyOrderPriceHighlight}
                  title={
                    matchingBuyOrders && matchingBuyOrders.length > 1
                      ? `Top Buy Orders: ${matchingBuyOrders.map((o) => `$${(o.price / 100).toFixed(2)} (x${o.qty || 1})`).join(", ")}`
                      : `Top matching buy order: $${bestBuyOrderDollar.toFixed(2)}`
                  }
                >
                  <Zap size={10} style={styles.zapIcon} />
                  <span>${bestBuyOrderDollar.toFixed(2)}</span>
                  {matchingBuyOrders && matchingBuyOrders.length > 1 && (
                    <span style={styles.buyOrderCountBadge}>
                      ({matchingBuyOrders.length})
                    </span>
                  )}
                </span>
              ) : (
                <span style={styles.buyOrderNone}>None</span>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleScanBuyOrders}
              disabled={
                loadingBuyOrders ||
                (!item.serialized_inspect && !item.inspect_link) ||
                !item.gs_sig
              }
              className="btn btn-xs"
              style={styles.scanBuyOrderBtn}
              title="Scan matching buy orders for this item"
            >
              <Zap size={10} />
              <span>Check</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div
        style={styles.actionsRow}
        onClick={(e) => e.stopPropagation()}
      >
        {item.is_sold ? (
          <div style={styles.soldBanner}>
            <CheckCircle2 size={12} style={styles.soldBannerIcon} />
            <span>SOLD — Awaiting Steam Trade</span>
          </div>
        ) : !isListed ? (
          <>
            <button
              onClick={() => onCreateListing(item, analysis?.targetListingPrice)}
              disabled={isProcessing || !analysis?.targetListingPrice}
              className="btn btn-primary btn-sm"
              style={styles.listBtn}
              title={
                analysis?.targetListingPrice
                  ? `List at $${analysis.targetListingPrice.toFixed(2)} (${isPrivateMode ? "Private" : "Public"})`
                  : "No recommended listing price"
              }
            >
              {isProcessing ? (
                <Loader2 size={11} className="spin" />
              ) : (
                <PlusCircle size={12} />
              )}
              <span>List {isPrivateMode ? "(Priv)" : "(Pub)"}</span>
            </button>

            {bestBuyOrderDollar && (
              <button
                onClick={handleInstaSell}
                disabled={isProcessing}
                className="btn btn-sm"
                style={styles.instaSellBtn}
                title={`Instantly sell to highest buy order at $${bestBuyOrderDollar.toFixed(2)} (Public)`}
              >
                <Zap size={11} style={styles.zapIcon} />
                <span>Insta-Sell ${bestBuyOrderDollar.toFixed(2)}</span>
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={() =>
                onUpdateListing(
                  item,
                  analysis?.targetListingPrice || currentListedPriceDollar || 0,
                )
              }
              disabled={isProcessing || !analysis?.targetListingPrice}
              className="btn btn-warning btn-sm"
              style={styles.updateBtn}
              title="Update listing to Target Listing Price"
            >
              {isProcessing ? (
                <Loader2 size={11} className="spin" />
              ) : (
                <Edit3 size={11} />
              )}
              <span>Update</span>
            </button>

            {bestBuyOrderDollar && (
              <button
                onClick={handleInstaSell}
                disabled={isProcessing}
                className="btn btn-sm"
                style={styles.instaSellBtn}
                title={`Reprice listing to $${bestBuyOrderDollar.toFixed(2)} to immediately fill buy order`}
              >
                <Zap size={11} style={styles.zapIcon} />
                <span>Insta-Sell ${bestBuyOrderDollar.toFixed(2)}</span>
              </button>
            )}

            <button
              onClick={() => onUnlist(item)}
              disabled={isProcessing}
              className="btn btn-danger btn-sm"
              style={styles.unlistBtn}
              title="Remove listing (Unlist)"
            >
              {isProcessing ? (
                <Loader2 size={11} className="spin" />
              ) : (
                <Trash2 size={12} />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC STYLE HELPERS ─────────────────────────

const getCardContainerStyle = (
  isSelected: boolean,
  cardBorderColor: string,
  isSold?: boolean,
): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "8px",
  margin: 0,
  padding: "10px",
  minHeight: "260px",
  height: "auto",
  boxSizing: "border-box",
  borderRadius: "var(--so-radius-md)",
  backgroundColor: "var(--so-surface-card)",
  border: `1px solid ${isSelected ? "var(--so-primary)" : cardBorderColor}`,
  boxShadow: isSelected ? "inset 0 0 0 1px var(--so-primary)" : "none",
  cursor: isSold ? "default" : "pointer",
  userSelect: "none",
});

const getCheckmarkStyle = (isSelected: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  color: isSelected ? "var(--so-primary)" : "var(--so-text-muted)",
  opacity: isSelected ? 1 : 0.45,
  transition: "all 0.15s ease",
});

const getStallBadgeStyle = (isListed: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "3px",
  padding: "1px 5px",
  fontSize: "8.5px",
  color: isListed ? "var(--so-success-text)" : "var(--so-text-muted)",
  backgroundColor: isListed
    ? "rgba(16, 185, 129, 0.15)"
    : "var(--so-surface-panel)",
  border: `1px solid ${
    isListed ? "rgba(16, 185, 129, 0.3)" : "var(--so-border-subtle)"
  }`,
  borderRadius: "3px",
  fontWeight: 800,
  whiteSpace: "nowrap",
});

const getListedPriceStyle = (hasPrice: boolean): React.CSSProperties => ({
  fontWeight: 800,
  color: hasPrice ? "var(--so-text-primary)" : "var(--so-text-muted)",
});

const getTargetListingPriceStyle = (hasTarget: boolean): React.CSSProperties => ({
  fontWeight: 800,
  color: hasTarget ? "var(--so-success-text)" : "var(--so-text-muted)",
});

const styles = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: "22px",
  } as React.CSSProperties,

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    flexShrink: 0,
  } as React.CSSProperties,

  actionBtn: {
    padding: "3px 6px",
    background: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "4px",
    color: "var(--so-text-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,

  lookupBtn: {
    padding: "3px 6px",
    background: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "4px",
    color: "var(--so-accent-cyan)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,

  dealBtn: {
    padding: "3px 6px",
    background: "rgba(56, 189, 248, 0.12)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    borderRadius: "4px",
    color: "#38bdf8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,

  auctionBtn: {
    padding: "3px 6px",
    background: "rgba(56, 189, 248, 0.12)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    borderRadius: "4px",
    color: "#38bdf8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,

  badgesRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: "18px",
    gap: "4px",
    flexWrap: "nowrap",
    overflow: "hidden",
  } as React.CSSProperties,

  badgeReadyToList: {
    fontSize: "9px",
    padding: "1px 5px",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  badgeOverpriced: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    backgroundColor: "rgba(239, 68, 68, 0.16)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    fontWeight: 800,
    fontSize: "9px",
    padding: "1px 5px",
    borderRadius: "4px",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  badgeUnderpriced: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    backgroundColor: "rgba(245, 158, 11, 0.14)",
    color: "#fbbf24",
    border: "1px solid rgba(245, 158, 11, 0.35)",
    fontWeight: 800,
    fontSize: "9px",
    padding: "1px 5px",
    borderRadius: "4px",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  badgeSafe: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    color: "#34d399",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    fontWeight: 800,
    fontSize: "9px",
    padding: "1px 5px",
    borderRadius: "4px",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  badgeListed: {
    fontSize: "9px",
    padding: "1px 5px",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  titleWearContainer: {
    textAlign: "center",
    minHeight: "30px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  } as React.CSSProperties,

  cleanTitleText: {
    fontWeight: 800,
    fontSize: "11.5px",
    color: "var(--so-text-primary)",
    lineHeight: "1.2",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  wearFloatRow: {
    display: "flex",
    justifyContent: "center",
    gap: "6px",
    alignItems: "center",
    marginTop: "2px",
  } as React.CSSProperties,

  wearText: {
    fontSize: "10px",
    color: "var(--so-text-muted)",
    fontWeight: 700,
  } as React.CSSProperties,

  floatText: {
    fontSize: "9.5px",
    color: "var(--so-cyan-text)",
    fontFamily: "monospace",
  } as React.CSSProperties,

  pricingBox: {
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-subtle)",
    padding: "6px 8px",
    borderRadius: "var(--so-radius-sm)",
    fontSize: "11px",
  } as React.CSSProperties,

  pricingRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "3px",
  } as React.CSSProperties,

  pricingRowBottom: {
    display: "flex",
    justifyContent: "space-between",
  } as React.CSSProperties,

  labelMuted: {
    color: "var(--so-text-muted)",
  } as React.CSSProperties,

  actionsRow: {
    display: "flex",
    gap: "6px",
  } as React.CSSProperties,

  listBtn: {
    flex: 1,
    fontWeight: 700,
    fontSize: "10.5px",
    padding: "4px 6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
  } as React.CSSProperties,

  updateBtn: {
    flex: 1,
    fontWeight: 700,
    fontSize: "10.5px",
    padding: "4px 6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "3px",
  } as React.CSSProperties,

  pricingSubRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "3px",
    fontSize: "9.5px",
  } as React.CSSProperties,

  labelSubMuted: {
    color: "var(--so-text-muted)",
    fontSize: "9.5px",
  } as React.CSSProperties,

  subPriceText: {
    color: "var(--so-text-secondary)",
    fontWeight: 600,
    fontSize: "9.5px",
  } as React.CSSProperties,

  unlistBtn: {
    padding: "4px 6px",
  } as React.CSSProperties,

  scanBuyOrderBtn: {
    padding: "2px 8px",
    fontSize: "10px",
    fontWeight: 800,
    height: "20px",
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    color: "#ffffff",
    backgroundColor: "rgba(99, 102, 241, 0.42)",
    border: "1px solid #818cf8",
    borderRadius: "4px",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.25)",
    transition: "all 0.15s ease",
  } as React.CSSProperties,

  buyOrderValueContainer: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
  } as React.CSSProperties,

  refreshBuyOrderBtn: {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid var(--so-border-subtle)",
    padding: "2px 4px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--so-text-secondary)",
    borderRadius: "3px",
    transition: "all 0.15s ease",
  } as React.CSSProperties,

  buyOrderPriceHighlight: {
    fontSize: "11px",
    fontWeight: 800,
    color: "var(--so-success-text)",
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
  } as React.CSSProperties,

  zapIcon: {
    fill: "currentColor",
  } as React.CSSProperties,

  buyOrderCountBadge: {
    fontSize: "9.5px",
    color: "var(--so-text-muted)",
    fontWeight: 600,
    marginLeft: "2px",
  } as React.CSSProperties,

  buyOrderNone: {
    fontSize: "10.5px",
    color: "var(--so-text-muted)",
  } as React.CSSProperties,

  buyOrderLoading: {
    display: "inline-flex",
    alignItems: "center",
    color: "var(--so-primary)",
  } as React.CSSProperties,

  instaSellBtn: {
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    border: "1px solid #f59e0b",
    color: "#fbbf24",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    padding: "4px 8px",
    fontSize: "10.5px",
    fontWeight: 700,
    borderRadius: "4px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  badgeSold: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    color: "#a78bfa",
    border: "1px solid rgba(139, 92, 246, 0.45)",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "9.5px",
    fontWeight: 800,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  soldPriceText: {
    color: "#a78bfa",
    fontWeight: 800,
    fontSize: "12px",
  } as React.CSSProperties,

  soldBanner: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    border: "1px solid rgba(139, 92, 246, 0.35)",
    borderRadius: "var(--so-radius-sm)",
    padding: "6px 8px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#c4b5fd",
    textAlign: "center",
  } as React.CSSProperties,

  soldBannerIcon: {
    color: "#a78bfa",
    flexShrink: 0,
  } as React.CSSProperties,
};
