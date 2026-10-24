import React, { useEffect, useRef, useState } from "react";
import {
  CheckSquare,
  ExternalLink,
  Eye,
  Loader2,
  Minus,
  Plus,
  PlusCircle,
  Square,
} from "lucide-react";
import type { MarketGapCardProps } from "../../../components/MarketGap/types";
import TrendSparkline from "../../../components/TrendSparkline";
import { CopyMarketHashButton } from "../../../components/CopyMarketHashButton";
import { SkinImage } from "../../../components/SkinImage";
import { buildSteamApisImageUrl } from "../../../../shared/utils/itemImageUrl";

const MIN_TARGET_PRICE = 0.01;

export const DmarketMarketGapCard: React.FC<MarketGapCardProps> = ({
  item,
  isSelected,
  onToggleSelect,
  isProcessing,
  onCreateOrder,
  onOpenTargetMarket,
  onOpenLookup,
  wearShortcut,
  targetMarketName,
  createOrderLabel,
  orderPlacedLabel,
  targetPriceLabel,
  targetPrice,
  onTargetPriceChange,
}) => {
  const match = item.name.match(/^(.+?)\s*\(([^)]+)\)$/);
  const cleanTitle = match ? match[1] : item.name;

  const imageUrl = buildSteamApisImageUrl(item.name);

  const effectivePrice = targetPrice ?? item.acceptedPrice;
  const [priceText, setPriceText] = useState(
    effectivePrice !== undefined ? effectivePrice.toFixed(2) : "",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setPriceText(
        effectivePrice !== undefined ? effectivePrice.toFixed(2) : "",
      );
    }
  }, [effectivePrice]);

  const isHighCoverage = item.marketCount >= 5;
  const isEditorDisabled =
    !!item.hasExistingOrder || isProcessing || effectivePrice === undefined;

  const cardBorderColor = isSelected
    ? "var(--so-primary)"
    : item.hasExistingOrder
      ? "var(--so-accent-cyan)"
      : isHighCoverage
        ? "var(--so-success)"
        : "var(--so-warning)";

  const commitPrice = (value: number) => {
    if (!Number.isFinite(value)) return;
    const next = Math.max(MIN_TARGET_PRICE, Math.round(value * 100) / 100);
    setPriceText(next.toFixed(2));
    onTargetPriceChange?.(next);
  };

  const stepPricePercent = (percent: number) => {
    const parsed = parseFloat(priceText);
    const base =
      Number.isFinite(parsed) && parsed > 0 ? parsed : (effectivePrice ?? 0);
    if (base <= 0) return;
    commitPrice(base * (1 + percent / 100));
  };

  const handlePriceInputChange = (raw: string) => {
    if (!/^\d*\.?\d{0,2}$/.test(raw)) return;
    setPriceText(raw);
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      onTargetPriceChange?.(Math.round(parsed * 100) / 100);
    }
  };

  const handlePriceBlur = () => {
    const parsed = parseFloat(priceText);
    commitPrice(
      Number.isFinite(parsed) ? parsed : (effectivePrice ?? MIN_TARGET_PRICE),
    );
  };

  const parsedActionPrice = parseFloat(priceText);
  const actionPrice =
    Number.isFinite(parsedActionPrice) && parsedActionPrice > 0
      ? parsedActionPrice
      : effectivePrice;

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
              onOpenTargetMarket(item.name);
            }}
            className="btn btn-sm"
            style={styles.actionBtn}
            title={`Open on ${targetMarketName} Market (Browser)`}
          >
            <ExternalLink size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenLookup(
                item.name,
                actionPrice ?? item.acceptedPrice,
                item.lowestPrice,
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

        <div
          style={getCheckmarkStyle(isSelected)}
          title={isSelected ? "Selected" : "Click card to select"}
        >
          {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
        </div>
      </div>

      {/* Row 2: Badges Strip */}
      <div style={styles.badgesStrip}>
        <span className="badge" style={styles.marketCountBadge}>
          {item.marketCount} MARKETS
        </span>
        <div style={styles.badgesRight}>
          {item.acceptedPrice !== undefined &&
            item.supplyStabilityScore !== undefined && (
              <span
                className="badge"
                style={getSssBadgeStyle(item.supplyStabilityScore)}
                title="Supply Stability Score (SSS): cross-market distribution, HHI balance, and volume depth."
              >
                SSS: {item.supplyStabilityScore.toFixed(1)}
              </span>
            )}
          {item.hasExistingOrder && (
            <span className="badge badge-cyan" style={styles.orderPlacedBadge}>
              {orderPlacedLabel}
            </span>
          )}
        </div>
      </div>

      <SkinImage src={imageUrl} alt={cleanTitle} fallbackItemName={item.name} />

      <div style={styles.titleWearContainer}>
        <div style={styles.cleanTitleText}>{cleanTitle}</div>
        {wearShortcut && (
          <div style={styles.wearShortcutText}>{wearShortcut}</div>
        )}
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <TrendSparkline
          name={item.name}
          momentum={item.trendMomentum14d}
          height={32}
          onClick={() =>
            onOpenLookup(
              item.name,
              actionPrice ?? item.acceptedPrice,
              item.lowestPrice,
              item.iconUrl,
            )
          }
        />
      </div>

      {/* Target Price Editor */}
      <div
        style={getPricingBoxStyle(isHighCoverage)}
        onClick={(e) => e.stopPropagation()}
      >
        <span style={styles.labelMuted}>{targetPriceLabel}</span>
        {effectivePrice !== undefined ? (
          <div style={styles.priceEditor}>
            <button
              type="button"
              onClick={() => stepPricePercent(-1)}
              disabled={isEditorDisabled}
              style={getStepButtonStyle(isEditorDisabled)}
              title="Decrease target by 1%"
            >
              <Minus size={11} />
            </button>
            <div style={styles.priceInputWrapper}>
              <span style={styles.currencyPrefix}>$</span>
              <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={priceText}
                onChange={(e) => handlePriceInputChange(e.target.value)}
                onBlur={handlePriceBlur}
                onClick={(e) => e.stopPropagation()}
                disabled={isEditorDisabled}
                style={styles.priceInput}
                aria-label="Target price"
              />
            </div>
            <button
              type="button"
              onClick={() => stepPricePercent(1)}
              disabled={isEditorDisabled}
              style={getStepButtonStyle(isEditorDisabled)}
              title="Increase target by 1%"
            >
              <Plus size={11} />
            </button>
          </div>
        ) : (
          <span className="tabular-nums" style={styles.targetPriceText}>
            —
          </span>
        )}
      </div>

      {/* Action Button */}
      <div style={styles.actionsRow} onClick={(e) => e.stopPropagation()}>
        {item.hasExistingOrder ? (
          <button
            disabled
            className="btn btn-secondary btn-sm"
            style={styles.orderPlacedBtn}
          >
            {orderPlacedLabel}
          </button>
        ) : actionPrice ? (
          <button
            onClick={() => onCreateOrder(item, actionPrice)}
            disabled={isProcessing}
            className="btn btn-primary btn-sm"
            style={styles.createOrderBtn}
          >
            {isProcessing ? (
              <Loader2 size={11} className="spin" />
            ) : (
              <PlusCircle size={12} />
            )}
            <span>
              {createOrderLabel} (${actionPrice.toFixed(2)})
            </span>
          </button>
        ) : (
          <button
            disabled
            className="btn btn-secondary btn-sm"
            style={styles.orderPlacedBtn}
            title="Calculate Accepted Prices (Buy Ceilings) in Oracle Dashboard Step 2 to enable target creation"
          >
            No Buy Ceiling
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
  minHeight: "240px",
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
      ? "rgba(56, 189, 248, 0.18)"
      : score >= 0.8
        ? "rgba(6, 182, 212, 0.18)"
        : "rgba(245, 158, 11, 0.18)",
  color:
    score >= 1.2
      ? "var(--so-success-text)"
      : score >= 0.8
        ? "var(--so-success-text)"
        : "var(--so-warning)",
  border: `1px solid ${
    score >= 1.2
      ? "rgba(56, 189, 248, 0.35)"
      : score >= 0.8
        ? "rgba(6, 182, 212, 0.35)"
        : "rgba(245, 158, 11, 0.35)"
  }`,
  whiteSpace: "nowrap",
  flexShrink: 0,
});

const getPricingBoxStyle = (isHighCoverage: boolean): React.CSSProperties => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: isHighCoverage
    ? "rgba(56, 189, 248, 0.12)"
    : "var(--so-surface-input)",
  border: `1px solid ${
    isHighCoverage ? "rgba(56, 189, 248, 0.3)" : "var(--so-border-subtle)"
  }`,
  padding: "6px 8px",
  borderRadius: "var(--so-radius-sm)",
  fontSize: "11px",
});

const getStepButtonStyle = (disabled: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "20px",
  padding: 0,
  borderRadius: "3px",
  border: "1px solid var(--so-border-subtle)",
  background: "var(--so-surface-panel)",
  color: "var(--so-text-secondary)",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.45 : 1,
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
  badgesRight: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
    minWidth: 0,
  },
  marketCountBadge: {
    fontSize: "9px",
    padding: "1px 5px",
    fontWeight: 800,
    borderRadius: "4px",
    backgroundColor: "rgba(56, 189, 248, 0.18)",
    color: "var(--so-success-text)",
    border: "1px solid rgba(56, 189, 248, 0.35)",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  orderPlacedBadge: {
    fontSize: "9px",
    padding: "1px 5px",
    fontWeight: 800,
    borderRadius: "4px",
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
  labelMuted: {
    color: "var(--so-text-muted)",
    fontWeight: 700,
  },
  targetPriceText: {
    fontWeight: 800,
    color: "var(--so-success-text)",
  },
  priceEditor: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
  },
  priceInputWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "1px",
    padding: "1px 4px",
    borderRadius: "3px",
    border: "1px solid var(--so-border-subtle)",
    background: "var(--so-surface-card)",
  },
  currencyPrefix: {
    color: "var(--so-text-muted)",
    fontSize: "10px",
    fontWeight: 700,
  },
  priceInput: {
    width: "52px",
    padding: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "var(--so-text-primary)",
    fontSize: "11.5px",
    fontWeight: 800,
    textAlign: "right" as const,
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
  createOrderBtn: {
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
