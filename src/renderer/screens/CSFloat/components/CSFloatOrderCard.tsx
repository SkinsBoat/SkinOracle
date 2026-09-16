import React from "react";
import {
  ExternalLink,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Loader2,
  CheckSquare,
  Square,
  Wallet,
  HelpCircle,
  SlidersHorizontal,
} from "lucide-react";
import TrendSparkline from "../../../components/TrendSparkline";
import { CopyMarketHashButton } from "../../../components/CopyMarketHashButton";
import { SkinImage } from "../../../components/SkinImage";

export interface OrderDriftDetails {
  acceptedPrice: number;
  driftPercent: number;
  isOverbid: boolean;
  isUnderbid: boolean;
  trendMomentum14d?: number;
}

interface CSFloatOrderCardProps {
  order: any;
  isSelected: boolean;
  onToggleSelect: () => void;
  driftDetails?: OrderDriftDetails | null;
  isProcessing: boolean;
  userBalance?: number;
  isUnmatched?: boolean;
  onManualUpdate: (
    id: string,
    name: string,
    price: number,
    qty: number,
  ) => void;
  onDelete: (id: string) => void;
  onOpenMarket: (name: string) => void;
  onOpenLookup: (
    name: string,
    acceptedPrice?: number,
    currentPrice?: number,
  ) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
}

export const CSFloatOrderCard: React.FC<CSFloatOrderCardProps> = ({
  order,
  isSelected,
  onToggleSelect,
  driftDetails,
  isProcessing,
  userBalance,
  isUnmatched = false,
  onManualUpdate,
  onDelete,
  onOpenMarket,
  onOpenLookup,
  onUpdateQuantity,
}) => {
  const currentPrice = order.price / 100;
  const isExceedsBalance =
    typeof userBalance === "number" &&
    userBalance >= 0 &&
    currentPrice > userBalance;

  const isAdvanced = Boolean(
    order?.hybrid_properties &&
      typeof order.hybrid_properties === "object" &&
      Object.keys(order.hybrid_properties).length > 0,
  );

  const hybridDetailsText = React.useMemo(() => {
    if (!isAdvanced || !order?.hybrid_properties) return "";
    const props = order.hybrid_properties;
    const parts: string[] = [];
    if (props.min_float !== undefined && props.max_float !== undefined) {
      parts.push(`Float: ${props.min_float} - ${props.max_float}`);
    } else if (props.min_float !== undefined) {
      parts.push(`Min Float: ${props.min_float}`);
    } else if (props.max_float !== undefined) {
      parts.push(`Max Float: ${props.max_float}`);
    }
    if (props.paint_seed !== undefined) {
      parts.push(`Seed: ${props.paint_seed}`);
    }
    if (props.expression) {
      parts.push(`Expr: ${props.expression}`);
    }
    Object.entries(props).forEach(([k, v]) => {
      if (
        !["min_float", "max_float", "paint_seed", "expression"].includes(k) &&
        v !== undefined &&
        v !== null
      ) {
        parts.push(`${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
      }
    });
    return parts.join(" | ");
  }, [isAdvanced, order?.hybrid_properties]);

  const cardBorderColor = isSelected
    ? "var(--so-primary)"
    : isExceedsBalance
      ? "#ef4444"
      : driftDetails?.isOverbid
        ? "#ef4444"
        : driftDetails?.isUnderbid
          ? "#f59e0b"
          : isUnmatched
            ? "rgba(148, 163, 184, 0.45)"
            : "var(--so-border-medium)";

  const match = order.market_hash_name.match(/^(.+?)\s*\(([^)]+)\)$/);
  const cleanTitle = match ? match[1] : order.market_hash_name;
  const wear = match ? match[2] : "";
  const imageUrl = `https://api.steamapis.com/image/item/730/${encodeURIComponent(order.market_hash_name)}`;

  const isFullDeleteBtn =
    !driftDetails?.acceptedPrice ||
    (isExceedsBalance && driftDetails.acceptedPrice > (userBalance || 0));

  return (
    <div
      style={getCardContainerStyle(isSelected, isUnmatched, cardBorderColor)}
      onClick={onToggleSelect}
    >
      {/* Top Action Row */}
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMarket(order.market_hash_name);
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
                order.market_hash_name,
                driftDetails?.acceptedPrice,
                currentPrice,
              );
            }}
            className="btn btn-sm"
            style={styles.lookupBtn}
            title="Inspect Item Details"
          >
            <Eye size={13} />
          </button>
          <CopyMarketHashButton name={order.market_hash_name} />
        </div>

        {/* Selection Checkbox Indicator */}
        <div
          style={getCheckmarkStyle(isSelected)}
          title={isSelected ? "Selected" : "Click card to select"}
        >
          {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
        </div>
      </div>

      {/* Drift / Balance Status Badge */}
      <div style={styles.badgesRow}>
        {isExceedsBalance ? (
          <span
            className="badge"
            style={styles.badgeExceeds}
            title={`Current bid ($${currentPrice.toFixed(2)}) exceeds wallet balance ($${userBalance?.toFixed(2)})`}
          >
            <Wallet size={10} /> EXCEEDS BALANCE
          </span>
        ) : driftDetails ? (
          driftDetails.isOverbid ? (
            <span className="badge" style={styles.badgeOverbid}>
              <AlertTriangle size={10} /> OVERBID (
              {driftDetails.driftPercent > 0
                ? `+${driftDetails.driftPercent.toFixed(0)}%`
                : `${driftDetails.driftPercent.toFixed(0)}%`}
              )
            </span>
          ) : driftDetails.isUnderbid ? (
            <span className="badge" style={styles.badgeUnderbid}>
              <AlertTriangle size={10} /> UNDERBID (
              {driftDetails.driftPercent.toFixed(0)}%)
            </span>
          ) : (
            <span className="badge badge-success" style={styles.badgeSafe}>
              <CheckCircle2 size={10} /> SAFE (
              {driftDetails.driftPercent >= 0
                ? `+${driftDetails.driftPercent.toFixed(0)}%`
                : `${driftDetails.driftPercent.toFixed(0)}%`}
              )
            </span>
          )
        ) : isUnmatched ? (
          <span
            className="badge"
            style={styles.badgeUnmatched}
            title="No accepted price found in Oracle cache for this skin"
          >
            <HelpCircle size={10} style={styles.unmatchedIcon} /> UNMATCHED
          </span>
        ) : (
          <span className="badge badge-secondary" style={styles.badgeActive}>
            ACTIVE
          </span>
        )}
        {isAdvanced && (
          <span
            className="badge"
            style={styles.badgeAdvanced}
            title={
              hybridDetailsText
                ? `Advanced buy order with custom parameters (${hybridDetailsText})`
                : "Advanced buy order with custom parameters (float, paint seed, etc.)"
            }
          >
            <SlidersHorizontal size={9} /> ADVANCED
          </span>
        )}
      </div>

      {/* Skin Image Showcase */}
      <SkinImage src={imageUrl} alt={cleanTitle} />

      {/* Title & Wear */}
      <div style={styles.titleWearContainer}>
        <div style={styles.cleanTitleText}>{cleanTitle}</div>
        {wear && <div style={styles.wearText}>{wear}</div>}
      </div>

      {/* 14-Day Trend Sparkline */}
      <div onClick={(e) => e.stopPropagation()}>
        <TrendSparkline
          name={order.market_hash_name}
          momentum={driftDetails?.trendMomentum14d}
          height={32}
          onClick={() =>
            onOpenLookup(
              order.market_hash_name,
              driftDetails?.acceptedPrice,
              currentPrice,
            )
          }
        />
      </div>

      {/* Pricing */}
      <div
        style={getPricingBoxStyle(
          driftDetails?.isOverbid,
          driftDetails?.isUnderbid,
        )}
      >
        <div style={styles.pricingRow}>
          <span style={styles.labelMuted}>Quantity</span>
          <div style={styles.quantityControl}>
            <button
              type="button"
              onClick={() =>
                onUpdateQuantity(order.id, Math.max(1, (order.qty || 1) - 1))
              }
              style={styles.qtyBtn}
              title="Decrease Quantity"
            >
              -
            </button>
            <span style={styles.qtyText}>{order.qty || 1}</span>
            <button
              type="button"
              onClick={() => onUpdateQuantity(order.id, (order.qty || 1) + 1)}
              style={styles.qtyBtn}
              title="Increase Quantity"
            >
              +
            </button>
          </div>
        </div>

        <div style={styles.pricingRow}>
          <span style={styles.labelMuted}>Current Bid</span>
          <span
            className="tabular-nums"
            style={getCurrentBidPriceStyle(
              isExceedsBalance,
              driftDetails?.isOverbid,
              driftDetails?.isUnderbid,
            )}
            title={
              isExceedsBalance
                ? `Current bid ($${currentPrice.toFixed(2)}) exceeds wallet balance ($${userBalance?.toFixed(2)})`
                : undefined
            }
          >
            ${currentPrice.toFixed(2)}
          </span>
        </div>

        <div style={styles.pricingRowLast}>
          <span style={styles.labelMuted}>Accepted</span>
          <span
            className="tabular-nums"
            style={getAcceptedPriceStyle(Boolean(driftDetails?.acceptedPrice))}
          >
            {driftDetails?.acceptedPrice
              ? `$${driftDetails.acceptedPrice.toFixed(2)}`
              : isUnmatched
                ? "Not in Cache"
                : "---"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={styles.actionsRow} onClick={(e) => e.stopPropagation()}>
        {driftDetails?.acceptedPrice &&
          (!isExceedsBalance ||
            driftDetails.acceptedPrice <= (userBalance || 0)) && (
            <button
              onClick={() =>
                onManualUpdate(
                  order.id,
                  order.market_hash_name,
                  driftDetails.acceptedPrice,
                  order.qty || 1,
                )
              }
              disabled={isProcessing}
              className="btn btn-primary btn-sm"
              style={styles.manualUpdateBtn}
              title={
                isExceedsBalance
                  ? `Update order to $${driftDetails.acceptedPrice.toFixed(2)} (within balance)`
                  : "Update order to accepted price"
              }
            >
              {isProcessing ? (
                <Loader2 size={11} className="spin" />
              ) : (
                "Update Order"
              )}
            </button>
          )}
        <button
          onClick={() => onDelete(order.id)}
          disabled={isProcessing}
          className="btn btn-danger btn-sm"
          title={
            isExceedsBalance
              ? `Cancel Order (Exceeds Balance $${userBalance?.toFixed(2)})`
              : "Delete Order"
          }
          style={getDeleteBtnStyle(isFullDeleteBtn)}
        >
          <Trash2 size={12} />
          {isFullDeleteBtn && (
            <span style={styles.cancelBtnText}>Cancel Order</span>
          )}
        </button>
      </div>
    </div>
  );
};

// ==========================================
// Styles & Style Generators
// ==========================================

const getCardContainerStyle = (
  isSelected: boolean,
  isUnmatched: boolean,
  cardBorderColor: string,
): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "8px",
  margin: 0,
  padding: "10px",
  minHeight: "240px",
  height: "auto",
  boxSizing: "border-box",
  borderRadius: "var(--so-radius-md)",
  backgroundColor:
    isUnmatched && !isSelected
      ? "rgba(15, 23, 42, 0.65)"
      : "var(--so-surface-card)",
  border: `${isUnmatched && !isSelected ? "1px dashed" : "1px solid"} ${
    isSelected ? "var(--so-primary)" : cardBorderColor
  }`,
  boxShadow: isSelected ? "inset 0 0 0 1px var(--so-primary)" : "none",
  cursor: "pointer",
  userSelect: "none",
});

const getCheckmarkStyle = (isSelected: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  color: isSelected ? "var(--so-primary)" : "var(--so-text-muted)",
  opacity: isSelected ? 1 : 0.45,
  transition: "all 0.15s ease",
});

const getPricingBoxStyle = (
  isOverbid?: boolean,
  isUnderbid?: boolean,
): React.CSSProperties => ({
  backgroundColor: isOverbid
    ? "rgba(239, 68, 68, 0.12)"
    : isUnderbid
      ? "rgba(245, 158, 11, 0.12)"
      : "var(--so-surface-input)",
  border: `1px solid ${
    isOverbid
      ? "rgba(239, 68, 68, 0.3)"
      : isUnderbid
        ? "rgba(245, 158, 11, 0.3)"
        : "var(--so-border-subtle)"
  }`,
  padding: "6px 8px",
  borderRadius: "var(--so-radius-sm)",
  fontSize: "11px",
});

const getCurrentBidPriceStyle = (
  isExceedsBalance: boolean,
  isOverbid?: boolean,
  isUnderbid?: boolean,
): React.CSSProperties => ({
  fontWeight: 800,
  color: isExceedsBalance
    ? "#f87171"
    : isOverbid
      ? "#ef4444"
      : isUnderbid
        ? "#f59e0b"
        : "var(--so-text-primary)",
});

const getAcceptedPriceStyle = (
  hasAcceptedPrice: boolean,
): React.CSSProperties => ({
  fontWeight: 800,
  color: hasAcceptedPrice ? "var(--so-success-text)" : "var(--so-text-muted)",
  fontSize: hasAcceptedPrice ? "11.5px" : "10.5px",
  fontStyle: hasAcceptedPrice ? "normal" : "italic",
});

const getDeleteBtnStyle = (isFullWidth: boolean): React.CSSProperties => ({
  flex: isFullWidth ? 1 : "initial",
  padding: "4px 8px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "4px",
});

const styles = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: "22px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    flexShrink: 0,
  },
  actionBtn: {
    padding: "3px 6px",
    background: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "4px",
    color: "var(--so-text-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  lookupBtn: {
    padding: "3px 6px",
    background: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "4px",
    color: "var(--so-accent-cyan)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  badgesRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: "18px",
    gap: "4px",
    flexWrap: "wrap",
  },
  badgeExceeds: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    backgroundColor: "rgba(239, 68, 68, 0.16)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    fontWeight: 800,
    fontSize: "9px",
    padding: "1px 6px",
    borderRadius: "4px",
    whiteSpace: "nowrap",
  },
  badgeOverbid: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    fontWeight: 700,
    fontSize: "9px",
    padding: "1px 6px",
    borderRadius: "4px",
    whiteSpace: "nowrap",
  },
  badgeUnderbid: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    color: "#fbbf24",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    fontWeight: 700,
    fontSize: "9px",
    padding: "1px 6px",
    borderRadius: "4px",
    whiteSpace: "nowrap",
  },
  badgeSafe: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    color: "#34d399",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    fontWeight: 700,
    fontSize: "9px",
    padding: "1px 6px",
    borderRadius: "4px",
    whiteSpace: "nowrap",
  },
  badgeUnmatched: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    backgroundColor: "rgba(148, 163, 184, 0.16)",
    color: "#cbd5e1",
    border: "1px solid rgba(148, 163, 184, 0.35)",
    fontWeight: 700,
    fontSize: "9px",
    padding: "1px 6px",
    borderRadius: "4px",
    whiteSpace: "nowrap",
  },
  badgeActive: {
    fontSize: "9px",
    padding: "1px 6px",
    borderRadius: "4px",
    color: "var(--so-text-muted)",
    border: "1px solid var(--so-border-subtle)",
    whiteSpace: "nowrap",
  },
  badgeAdvanced: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    color: "#c084fc",
    border: "1px solid rgba(168, 85, 247, 0.35)",
    fontWeight: 800,
    fontSize: "9px",
    padding: "1px 6px",
    borderRadius: "4px",
    textTransform: "uppercase" as const,
    whiteSpace: "nowrap",
  },
  titleWearContainer: {
    textAlign: "center" as const,
    minHeight: "30px",
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
  },
  cleanTitleText: {
    fontWeight: 800,
    fontSize: "11.5px",
    color: "var(--so-text-primary)",
    lineHeight: "1.2",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  wearText: {
    fontSize: "10px",
    color: "var(--so-text-muted)",
    fontWeight: 700,
    marginTop: "2px",
  },
  pricingRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "4px",
    alignItems: "center",
  },
  pricingRowLast: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityControl: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  qtyBtn: {
    width: "18px",
    height: "18px",
    borderRadius: "3px",
    border: "1px solid var(--so-border-subtle)",
    background: "var(--so-surface-panel)",
    color: "var(--so-text-primary)",
    fontSize: "11px",
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  qtyText: {
    fontWeight: 800,
    color: "var(--so-primary)",
    minWidth: "16px",
    textAlign: "center" as const,
    fontSize: "11.5px",
  },
  labelMuted: {
    color: "var(--so-text-muted)",
  },
  actionsRow: {
    display: "flex",
    gap: "6px",
  },
  manualUpdateBtn: {
    flex: 1,
    fontWeight: 700,
    fontSize: "11px",
    padding: "4px 6px",
  },
  cancelBtnText: {
    fontSize: "11px",
    fontWeight: 700,
  },
  unmatchedIcon: {
    color: "#94a3b8",
  },
} as const;
