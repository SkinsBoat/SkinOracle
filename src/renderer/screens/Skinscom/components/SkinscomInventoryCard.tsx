import React from "react";
import {
  AlertTriangle,
  CheckSquare,
  ExternalLink,
  Eye,
  Loader2,
  PlusCircle,
  Square,
} from "lucide-react";
import TrendSparkline from "../../../components/TrendSparkline";
import { CopyMarketHashButton } from "../../../components/CopyMarketHashButton";
import { SkinImage } from "../../../components/SkinImage";
import type { SkinscomInventoryItem } from "../../../../shared/types/skinscom.types";
import {
  buildSkinscomImageUrl,
  formatUsdFromCents,
  getWearShortcutFromFloat,
  usdToCents,
} from "../utils/skinscomUtils";

interface SkinscomInventoryCardProps {
  item: SkinscomInventoryItem;
  /** Oracle listing price (Sell Target) in USD cents, if available. */
  sellTargetCents: number | null;
  isSelected: boolean;
  onToggleSelect: () => void;
  price: string;
  onPriceChange: (value: string) => void;
  isProcessing: boolean;
  onList: (item: SkinscomInventoryItem, coinValue: number) => void;
  onOpenMarket: (name: string) => void;
  onOpenLookup: (item: SkinscomInventoryItem) => void;
}

/**
 * Inventory item card for the Listings & Inventory tab. Mirrors the shared
 * workstation listing-card design (3 icon actions + trend sparkline). The only
 * action is **List** (deposit). Shows both the Skins.com suggested price and
 * the Oracle Sell Target, and warns when the entered price is below the
 * Skins.com suggested price (instant-sell bot risk).
 */
export const SkinscomInventoryCard: React.FC<SkinscomInventoryCardProps> = ({
  item,
  sellTargetCents,
  isSelected,
  onToggleSelect,
  price,
  onPriceChange,
  isProcessing,
  onList,
  onOpenMarket,
  onOpenLookup,
}) => {
  const match = item.market_name.match(/^(.+?)\s*\(([^)]+)\)$/);
  const cleanTitle = match ? match[1] : item.market_name;
  const wearShortcut = getWearShortcutFromFloat(item.wear);
  // `invalid` is the documented "cannot be deposited" reason (per API spec).
  const notDepositable = item.invalid;
  const isDisabled = Boolean(notDepositable);
  const coinValue = usdToCents(price);
  const canList = !isDisabled && coinValue !== null && !isProcessing;

  // Warn when listing below the Skins.com suggested price.
  const belowSuggested =
    coinValue !== null &&
    !!item.suggested_price &&
    item.suggested_price > 0 &&
    coinValue < item.suggested_price;

  return (
    <div
      style={getCardStyle(isSelected, isDisabled)}
      onClick={() => {
        if (!isDisabled) onToggleSelect();
      }}
    >
      {/* Row 1: Actions & Selection */}
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMarket(item.market_name);
            }}
            className="btn btn-sm"
            style={styles.actionBtn}
            title="Open on Skins.com (Browser)"
          >
            <ExternalLink size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenLookup(item);
            }}
            className="btn btn-sm"
            style={styles.lookupBtn}
            title="Inspect item details"
          >
            <Eye size={13} />
          </button>
          <CopyMarketHashButton name={item.market_name} />
        </div>

        <div
          style={getCheckmarkStyle(isSelected, isDisabled)}
          title={isDisabled ? "Not depositable" : "Click card to select"}
        >
          {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
        </div>
      </div>

      {/* Commodity tag only — the API exposes no listing status. */}
      {item.is_commodity && (
        <div style={styles.badgesStrip}>
          <span className="badge" style={styles.commodityBadge}>
            COMMODITY
          </span>
        </div>
      )}

      <SkinImage
        src={buildSkinscomImageUrl(item.icon_url)}
        alt={cleanTitle}
        fallbackItemName={item.market_name}
      />

      <div style={styles.titleWearContainer}>
        <div style={styles.cleanTitleText} title={item.market_name}>
          {cleanTitle}
        </div>
        {wearShortcut && (
          <div style={styles.wearShortcutText}>{wearShortcut}</div>
        )}
      </div>

      {/* 14-day trend sparkline */}
      <div onClick={(e) => e.stopPropagation()}>
        <TrendSparkline
          name={item.market_name}
          height={32}
          onClick={() => onOpenLookup(item)}
        />
      </div>

      {/* Pricing reference: Skins Suggested vs Oracle Sell Target */}
      <div style={styles.pricingBox}>
        <div style={styles.pricingRow}>
          <span style={styles.labelMuted}>Skins Suggested</span>
          <span className="tabular-nums" style={styles.suggestedText}>
            {formatUsdFromCents(item.suggested_price)}
          </span>
        </div>
        <div style={styles.pricingRowLast}>
          <span style={styles.labelMuted}>Oracle Sell Target</span>
          <span className="tabular-nums" style={styles.targetText}>
            {formatUsdFromCents(sellTargetCents)}
          </span>
        </div>
      </div>

      {belowSuggested && (
        <div style={styles.warningNote}>
          <AlertTriangle size={11} /> Below Skins Suggested — undercut risk
        </div>
      )}

      {/* List price + action */}
      {isDisabled ? (
        <div style={styles.disabledNote} title={notDepositable ?? undefined}>
          {notDepositable || "Not depositable"}
        </div>
      ) : (
        <div style={styles.actionsRow} onClick={(e) => e.stopPropagation()}>
          <div style={styles.priceInputWrapper}>
            <span style={styles.currency}>$</span>
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              placeholder="0.00"
              style={styles.priceInput}
            />
          </div>
          <button
            type="button"
            onClick={() =>
              onPriceChange(
                (((item.suggested_price as number) || 0) / 100).toFixed(2),
              )
            }
            disabled={!belowSuggested}
            className="btn btn-secondary btn-sm"
            style={styles.alignButton}
            title="Align to Skins Suggested"
          >
            Align
          </button>
          <button
            onClick={() => coinValue !== null && onList(item, coinValue)}
            disabled={!canList}
            className="btn btn-primary btn-sm"
            style={styles.listButton}
          >
            {isProcessing ? (
              <Loader2 size={12} className="spin" />
            ) : (
              <PlusCircle size={12} />
            )}
            <span>List</span>
          </button>
        </div>
      )}
    </div>
  );
};

const getCardStyle = (
  isSelected: boolean,
  isDisabled: boolean,
): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "6px",
  padding: "10px",
  minHeight: "265px",
  boxSizing: "border-box",
  borderRadius: "var(--so-radius-md)",
  backgroundColor: "var(--so-surface-card)",
  border: `1px solid ${
    isSelected
      ? "var(--so-primary)"
      : isDisabled
        ? "var(--so-border-subtle)"
        : "var(--so-border-medium)"
  }`,
  boxShadow: isSelected ? "inset 0 0 0 1px var(--so-primary)" : "none",
  cursor: isDisabled ? "not-allowed" : "pointer",
  userSelect: "none",
  overflow: "hidden",
  opacity: isDisabled ? 0.6 : 1,
});

const getCheckmarkStyle = (
  isSelected: boolean,
  isDisabled: boolean,
): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  color: isSelected ? "var(--so-primary)" : "var(--so-text-muted)",
  opacity: isDisabled ? 0.3 : isSelected ? 1 : 0.45,
  transition: "all 0.15s ease",
});

const styles: Record<string, React.CSSProperties> = {
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
  badgesStrip: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    minHeight: "16px",
  },
  commodityBadge: {
    fontSize: "9px",
    padding: "1px 6px",
    fontWeight: 800,
    borderRadius: "4px",
    backgroundColor: "rgba(6, 182, 212, 0.15)",
    color: "var(--so-accent-cyan)",
    border: "1px solid rgba(6, 182, 212, 0.35)",
    whiteSpace: "nowrap",
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
  titleWearContainer: {
    textAlign: "center",
    minHeight: "30px",
    display: "flex",
    flexDirection: "column",
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
  pricingBox: {
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-subtle)",
    padding: "6px 8px",
    borderRadius: "var(--so-radius-sm)",
    fontSize: "11px",
  },
  pricingRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "3px",
  },
  pricingRowLast: {
    display: "flex",
    justifyContent: "space-between",
  },
  labelMuted: {
    color: "var(--so-text-muted)",
  },
  suggestedText: {
    fontWeight: 800,
    color: "var(--so-text-secondary)",
  },
  targetText: {
    fontWeight: 800,
    color: "var(--so-success-text)",
  },
  warningNote: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "9.5px",
    fontWeight: 800,
    color: "#f59e0b",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    border: "1px solid rgba(245, 158, 11, 0.35)",
    borderRadius: "var(--so-radius-sm)",
    padding: "3px 6px",
  },
  actionsRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  alignButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px 8px",
    flexShrink: 0,
  },
  priceInputWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    width: "84px",
    height: "28px",
    padding: "0 8px",
    borderRadius: "var(--so-radius-sm)",
    border: "1px solid var(--so-border-medium)",
    background: "var(--so-surface-panel)",
    flexShrink: 0,
    overflow: "hidden",
  },
  currency: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
    fontWeight: 800,
  },
  priceInput: {
    flex: 1,
    minWidth: 0,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "var(--so-text-primary)",
    fontSize: "12px",
    fontWeight: 800,
  },
  listButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    flex: 1,
    fontSize: "11px",
    fontWeight: 700,
    padding: "5px 10px",
  },
  disabledNote: {
    fontSize: "10.5px",
    fontWeight: 700,
    color: "var(--so-warning-text)",
    textAlign: "center",
    padding: "6px",
    backgroundColor: "var(--so-warning-bg)",
    border: "1px solid var(--so-warning-border)",
    borderRadius: "var(--so-radius-sm)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
