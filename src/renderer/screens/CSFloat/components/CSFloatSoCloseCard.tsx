import React from "react";
import {
  ExternalLink,
  Eye,
  CheckCircle2,
  PlusCircle,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";
import TrendSparkline from "../../../components/TrendSparkline";
import { CopyMarketHashButton } from "../../../components/CopyMarketHashButton";
import { SkinImage } from "../../../components/SkinImage";

import { SoCloseResultItem } from "../../../../shared/types";
export type { SoCloseResultItem };

interface CSFloatSoCloseCardProps {
  item: SoCloseResultItem;
  isSelected: boolean;
  onToggleSelect: () => void;
  isProcessing: boolean;
  onCreateBuyOrder: (item: SoCloseResultItem) => void;
  onOpenMarket: (name: string) => void;
  onOpenLookup: (
    name: string,
    acceptedPrice?: number,
    currentMarketPrice?: number,
    iconUrl?: string,
  ) => void;
  wearShortcut: string;
}

export const CSFloatSoCloseCard: React.FC<CSFloatSoCloseCardProps> = ({
  item,
  isSelected,
  onToggleSelect,
  isProcessing,
  onCreateBuyOrder,
  onOpenMarket,
  onOpenLookup,
  wearShortcut,
}) => {
  const match = item.name.match(/^(.+?)\s*\(([^)]+)\)$/);
  const cleanTitle = match ? match[1] : item.name;

  const imageUrl = item.iconUrl
    ? `https://community.cloudflare.steamstatic.com/economy/image/${item.iconUrl}`
    : `https://api.steamapis.com/image/item/730/${encodeURIComponent(item.name)}`;

  const cardBorderColor = isSelected
    ? "var(--so-primary)"
    : item.hasExistingOrder
      ? "var(--so-accent-cyan)"
      : item.closeness <= 1.0
        ? "var(--so-success)"
        : "var(--so-warning)";

  return (
    <div
      style={getCardContainerStyle(isSelected, cardBorderColor)}
      onClick={onToggleSelect}
    >
      {/* Row 1: Actions & Selection Indicator */}
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMarket(item.name);
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
                item.name,
                item.acceptedPrice,
                item.currentMarketPrice,
                item.iconUrl,
              );
            }}
            className="btn btn-sm"
            style={styles.lookupBtn}
            title="Inspect Item Details"
          >
            <Eye size={13} />
          </button>
          <CopyMarketHashButton name={item.name} />
        </div>

        {/* Selection Checkbox Indicator */}
        <div
          style={getCheckmarkStyle(isSelected)}
          title={isSelected ? "Selected" : "Click card to select"}
        >
          {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
        </div>
      </div>

      {/* Row 2: Badges Strip (Dedicated full-width row for SSS Score & Status) */}
      <div style={styles.badgesStrip}>
        {item.supplyStabilityScore !== undefined ? (
          <span
            className="badge"
            style={getSssBadgeStyle(item.supplyStabilityScore)}
            title="Supply Stability Score (SSS): cross-market distribution, HHI balance, and volume depth."
          >
            SSS: {item.supplyStabilityScore.toFixed(1)}
          </span>
        ) : (
          <div />
        )}

        {item.hasExistingOrder ? (
          <span className="badge badge-cyan" style={styles.orderPlacedBadge}>
            ORDER PLACED
          </span>
        ) : item.closeness <= 1.0 ? (
          <span className="badge badge-success" style={styles.dealBadge}>
            <CheckCircle2 size={10} /> DEAL (
            {item.closenessPercent > 0
              ? `+${item.closenessPercent.toFixed(1)}%`
              : `${item.closenessPercent.toFixed(1)}%`}
            )
          </span>
        ) : (
          <span className="badge" style={styles.soCloseBadge}>
            SO CLOSE (+{item.closenessPercent.toFixed(1)}%)
          </span>
        )}
      </div>

      {/* Image Showcase */}
      <SkinImage src={imageUrl} alt={cleanTitle} />

      {/* Title & Wear */}
      <div style={styles.titleWearContainer}>
        <div style={styles.cleanTitleText}>{cleanTitle}</div>
        {wearShortcut && (
          <div style={styles.wearShortcutText}>{wearShortcut}</div>
        )}
      </div>

      {/* 14-Day Trend Sparkline */}
      <div onClick={(e) => e.stopPropagation()}>
        <TrendSparkline
          name={item.name}
          momentum={item.trendMomentum14d}
          height={32}
          onClick={() =>
            onOpenLookup(
              item.name,
              item.acceptedPrice,
              item.currentMarketPrice,
              item.iconUrl,
            )
          }
        />
      </div>

      {/* Pricing Info Box */}
      <div style={getPricingBoxStyle(item.closeness <= 1.0)}>
        <div style={styles.pricingBoxRow}>
          <span style={styles.labelMuted}>CSFloat Market</span>
          <span
            className="tabular-nums"
            style={getMarketPriceStyle(item.closeness <= 1.0)}
          >
            ${item.currentMarketPrice.toFixed(2)}
          </span>
        </div>

        <div style={styles.pricingBoxRowLast}>
          <span style={styles.labelMuted}>Target Buy Price</span>
          <span className="tabular-nums" style={styles.targetPriceText}>
            ${item.acceptedPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div style={styles.actionsRow} onClick={(e) => e.stopPropagation()}>
        {item.hasExistingOrder ? (
          <button
            disabled
            className="btn btn-secondary btn-sm"
            style={styles.orderPlacedBtn}
          >
            Order Placed
          </button>
        ) : (
          <button
            onClick={() => onCreateBuyOrder(item)}
            disabled={isProcessing}
            className="btn btn-primary btn-sm"
            style={styles.createBuyOrderBtn}
          >
            {isProcessing ? (
              <Loader2 size={11} className="spin" />
            ) : (
              <PlusCircle size={12} />
            )}
            <span>Create Buy Order (${item.acceptedPrice.toFixed(2)})</span>
          </button>
        )}
      </div>
    </div>
  );
};

// ==========================================
// Styles & Style Generators
// ==========================================

const getCardContainerStyle = (
  isSelected: boolean,
  cardBorderColor: string,
): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "6px",
  margin: 0,
  padding: "10px",
  minHeight: "250px",
  height: "auto",
  boxSizing: "border-box",
  borderRadius: "var(--so-radius-md)",
  backgroundColor: "var(--so-surface-card)",
  border: `1px solid ${isSelected ? "var(--so-primary)" : cardBorderColor}`,
  boxShadow: isSelected ? "inset 0 0 0 1px var(--so-primary)" : "none",
  cursor: "pointer",
  userSelect: "none",
  overflow: "hidden",
});

const getCheckmarkStyle = (isSelected: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  color: isSelected ? "var(--so-primary)" : "var(--so-text-muted)",
  opacity: isSelected ? 1 : 0.45,
  transition: "all 0.15s ease",
});

const getSssBadgeStyle = (score: number): React.CSSProperties => ({
  fontSize: "9px",
  padding: "1px 5px",
  fontWeight: 800,
  borderRadius: "4px",
  backgroundColor:
    score >= 1.2
      ? "rgba(16, 185, 129, 0.18)"
      : score >= 0.8
        ? "rgba(6, 182, 212, 0.18)"
        : "rgba(245, 158, 11, 0.18)",
  color:
    score >= 1.2
      ? "var(--so-success-text)"
      : score >= 0.8
        ? "var(--so-cyan-text)"
        : "var(--so-warning)",
  border: `1px solid ${
    score >= 1.2
      ? "rgba(16, 185, 129, 0.35)"
      : score >= 0.8
        ? "rgba(6, 182, 212, 0.35)"
        : "rgba(245, 158, 11, 0.35)"
  }`,
  whiteSpace: "nowrap",
  flexShrink: 0,
});

const getPricingBoxStyle = (
  isClosenessUnder1: boolean,
): React.CSSProperties => ({
  backgroundColor: isClosenessUnder1
    ? "rgba(16, 185, 129, 0.12)"
    : "var(--so-surface-input)",
  border: `1px solid ${
    isClosenessUnder1 ? "rgba(16, 185, 129, 0.3)" : "var(--so-border-subtle)"
  }`,
  padding: "6px 8px",
  borderRadius: "var(--so-radius-sm)",
  fontSize: "11px",
});

const getMarketPriceStyle = (
  isClosenessUnder1: boolean,
): React.CSSProperties => ({
  fontWeight: 800,
  color: isClosenessUnder1 ? "var(--so-success-text)" : "#f59e0b",
});

const styles = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: "22px",
    width: "100%",
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
  badgesStrip: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "4px",
    width: "100%",
    minHeight: "18px",
  },
  orderPlacedBadge: {
    fontSize: "9px",
    padding: "1px 5px",
    fontWeight: 800,
    borderRadius: "4px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  dealBadge: {
    fontSize: "9px",
    padding: "1px 5px",
    fontWeight: 800,
    borderRadius: "4px",
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  soCloseBadge: {
    fontSize: "9px",
    padding: "1px 5px",
    fontWeight: 800,
    borderRadius: "4px",
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    color: "#f59e0b",
    border: "1px solid rgba(245, 158, 11, 0.4)",
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    whiteSpace: "nowrap",
    flexShrink: 0,
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
  wearShortcutText: {
    fontSize: "10px",
    color: "var(--so-primary)",
    fontWeight: 800,
    marginTop: "2px",
  },
  pricingBoxRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "3px",
  },
  pricingBoxRowLast: {
    display: "flex",
    justifyContent: "space-between",
  },
  labelMuted: {
    color: "var(--so-text-muted)",
  },
  targetPriceText: {
    fontWeight: 800,
    color: "var(--so-success-text)",
  },
  actionsRow: {
    display: "flex",
    gap: "6px",
  },
  orderPlacedBtn: {
    flex: 1,
    fontWeight: 700,
    fontSize: "11px",
    padding: "4px 6px",
    opacity: 0.6,
  },
  createBuyOrderBtn: {
    flex: 1,
    fontWeight: 700,
    fontSize: "11px",
    padding: "4px 6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
  },
} as const;
