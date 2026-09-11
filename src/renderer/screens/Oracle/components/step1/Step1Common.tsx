import React, { useState } from "react";
import { Check, AlertTriangle, Filter, CheckSquare, Square } from "lucide-react";
import { MarketLogo } from "../../../../components/MarketLogo";
import {
  toCanonicalMarketId,
  isMarketMatch,
} from "../../../../../shared/canonicalMarkets";
import {
  QuantityIntegrityReport,
  MarketQuantityAudit,
} from "../../utils/oracleUtils";

// ── Shared Data Resolution Helpers ─────────────────────────────────────────

/**
 * Resolves the cached item count for a given market ID using direct, canonical, and alias matching.
 */
export function resolveMarketCount(
  marketCounts: Record<string, number> | undefined,
  marketId: string,
): number {
  if (!marketCounts || Object.keys(marketCounts).length === 0) return 0;
  // Direct key match
  if (marketCounts[marketId] !== undefined && marketCounts[marketId] > 0) {
    return marketCounts[marketId];
  }
  // Canonical market ID match (e.g. csgofloat -> csfloat, csmoney_p2p -> csmoney_market)
  const canonicalId = toCanonicalMarketId(marketId);
  if (
    canonicalId &&
    marketCounts[canonicalId] !== undefined &&
    marketCounts[canonicalId] > 0
  ) {
    return marketCounts[canonicalId];
  }
  // Fallback: search all keys in marketCounts that alias-match this market
  for (const [key, count] of Object.entries(marketCounts)) {
    if (isMarketMatch(key, marketId) && typeof count === "number" && count > 0) {
      return count;
    }
  }
  return 0;
}

/**
 * Resolves the count of missing/unverified quantity listings for a market ID.
 */
export function resolveMissingQty(
  quantityAudit: QuantityIntegrityReport | undefined,
  marketId: string,
): number {
  if (!quantityAudit?.marketsWithMissingQty) return 0;
  const direct =
    quantityAudit.marketsWithMissingQty[marketId]?.missingQtyListings;
  if (direct) return direct;
  const canonical = toCanonicalMarketId(marketId);
  if (
    canonical &&
    quantityAudit.marketsWithMissingQty[canonical]?.missingQtyListings
  ) {
    return quantityAudit.marketsWithMissingQty[canonical].missingQtyListings;
  }
  for (const [key, stats] of Object.entries(
    quantityAudit.marketsWithMissingQty,
  )) {
    if (isMarketMatch(key, marketId) && stats.missingQtyListings > 0) {
      return stats.missingQtyListings;
    }
  }
  return 0;
}

// ── Shared UI Subcomponents ────────────────────────────────────────────────

export interface TradeMarketFilterCardProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  tradeCount: number;
  accentColor?: string;
}

export const TradeMarketFilterCard: React.FC<TradeMarketFilterCardProps> = ({
  checked,
  onChange,
  tradeCount,
  accentColor = "var(--so-primary)",
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={() => onChange(!checked)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Hide trade-bot platforms from the selection grid"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        padding: "5px 10px",
        borderRadius: "var(--so-radius-sm)",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        userSelect: "none",
        transition: "all 0.15s ease",
        backgroundColor: checked
          ? "rgba(255, 255, 255, 0.08)"
          : isHovered
            ? "rgba(255, 255, 255, 0.05)"
            : "transparent",
        border: checked
          ? `1px solid ${accentColor}`
          : isHovered
            ? "1px solid var(--so-border-medium)"
            : "1px solid var(--so-border-subtle)",
        color: checked
          ? "var(--so-text-primary)"
          : "var(--so-text-secondary)",
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: "3px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: checked ? accentColor : "transparent",
          border: checked ? "none" : "1px solid var(--so-border-medium)",
          flexShrink: 0,
        }}
      >
        {checked && (
          <Check size={10} style={{ color: "#fff", strokeWidth: 3 }} />
        )}
      </div>

      <span>Hide Trade</span>

      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          padding: "1px 5px",
          borderRadius: "4px",
          backgroundColor: "rgba(255, 255, 255, 0.06)",
          color: "var(--so-text-muted)",
        }}
      >
        ({tradeCount})
      </span>
    </div>
  );
};

export interface MarketSelectionChipProps {
  id: string;
  name: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
  onSolo: (id: string) => void;
  isTrade: boolean;
  marketCount: number;
  missingQtyCount: number;
  accentColor: string;
}

export const MarketSelectionChip: React.FC<MarketSelectionChipProps> = ({
  id,
  name,
  isSelected,
  onToggle,
  onSolo,
  isTrade,
  marketCount,
  missingQtyCount,
  accentColor,
}) => {
  return (
    <div
      onClick={() => onToggle(id)}
      onContextMenu={(e) => {
        e.preventDefault();
        onSolo(id);
      }}
      title={
        isTrade
          ? "Trade-bot platform (prices may reflect marked-up virtual site credit) | Click to toggle | Right-click to solo"
          : "Click to toggle | Right-click to solo"
      }
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 10px",
        borderRadius: "var(--so-radius-sm)",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        userSelect: "none",
        transition: "all 0.15s ease",
        backgroundColor: isSelected
          ? isTrade
            ? "rgba(245, 158, 11, 0.12)"
            : accentColor === "#06b6d4"
              ? "rgba(6, 182, 212, 0.16)"
              : "rgba(99, 102, 241, 0.15)"
          : "var(--so-surface-input)",
        border: isSelected
          ? isTrade
            ? "1px solid rgba(245, 158, 11, 0.55)"
            : `1px solid ${accentColor}`
          : isTrade
            ? "1px solid rgba(245, 158, 11, 0.25)"
            : "1px solid var(--so-border-subtle)",
        color: isSelected
          ? "var(--so-text-primary)"
          : "var(--so-text-muted)",
        boxShadow: isSelected
          ? isTrade
            ? "0 0 10px rgba(245, 158, 11, 0.2)"
            : `0 0 10px ${accentColor === "#06b6d4" ? "rgba(6, 182, 212, 0.2)" : "rgba(99, 102, 241, 0.2)"}`
          : "none",
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: "3px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isSelected
            ? isTrade
              ? "#f59e0b"
              : accentColor
            : "transparent",
          border: isSelected
            ? "none"
            : isTrade
              ? "1px solid rgba(245, 158, 11, 0.4)"
              : "1px solid var(--so-border-medium)",
          flexShrink: 0,
        }}
      >
        {isSelected && <Check size={10} style={{ color: "#fff" }} />}
      </div>

      <MarketLogo marketId={id} marketName={name} size={15} />

      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flexShrink: 1,
        }}
      >
        {name}
      </span>

      {isTrade && (
        <span
          className="badge"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            fontSize: "9px",
            fontWeight: 800,
            padding: "1px 5px",
            borderRadius: "3px",
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            color: "#f59e0b",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            flexShrink: 0,
          }}
          title="Trade-bot platform: prices may reflect marked-up virtual credit"
        >
          <AlertTriangle size={10} style={{ color: "#f59e0b" }} />
          TRADE
        </span>
      )}

      {missingQtyCount > 0 && (
        <span
          title={`${missingQtyCount.toLocaleString()} listings have missing/unverified quantities`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            color: "#f59e0b",
            marginLeft: "auto",
            marginRight: "4px",
          }}
        >
          <AlertTriangle size={11} />
        </span>
      )}

      {marketCount > 0 && (
        <span
          style={{
            fontSize: "10.5px",
            fontWeight: 800,
            padding: "1px 6px",
            borderRadius: "4px",
            backgroundColor: isSelected
              ? accentColor
              : "var(--so-surface-card)",
            color: isSelected
              ? "#fff"
              : "var(--so-text-secondary)",
            marginLeft: missingQtyCount > 0 ? "0" : "auto",
            fontFamily: "monospace",
            flexShrink: 0,
          }}
        >
          {marketCount.toLocaleString()}
        </span>
      )}
    </div>
  );
};

export interface MarketSelectionToolbarProps {
  title: string;
  selectedCount: number;
  totalCount: number;
  itemTypeLabel: string; // e.g. "Providers" or "Markets"
  tradeCount: number;
  hideTradeMarkets: boolean;
  onToggleHideTrade: (checked: boolean) => void;
  onSelectAll: () => void;
  onResetOrDeselect: () => void;
  resetLabel?: string;
  accentColor: string;
  badgeClassName?: string;
  badgeTextColor?: string;
  badgeBorderColor?: string;
}

export const MarketSelectionToolbar: React.FC<MarketSelectionToolbarProps> = ({
  title,
  selectedCount,
  totalCount,
  itemTypeLabel,
  tradeCount,
  hideTradeMarkets,
  onToggleHideTrade,
  onSelectAll,
  onResetOrDeselect,
  resetLabel = "Reset Defaults",
  accentColor,
  badgeClassName = "badge-cyan",
  badgeTextColor,
  badgeBorderColor,
}) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
        flexWrap: "wrap",
        gap: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: "14px",
            color: "var(--so-text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Filter size={16} style={{ color: accentColor }} /> {title}
        </div>
        <span
          className={`badge ${badgeClassName}`}
          style={{
            fontSize: "11px",
            ...(badgeBorderColor
              ? { borderColor: badgeBorderColor }
              : badgeClassName
                ? {}
                : { borderColor: accentColor }),
            color: badgeTextColor ?? (badgeClassName === "badge-cyan" ? "#38bdf8" : undefined),
          }}
        >
          {selectedCount} of {totalCount} {itemTypeLabel} Selected
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <TradeMarketFilterCard
          checked={hideTradeMarkets}
          onChange={onToggleHideTrade}
          tradeCount={tradeCount}
          accentColor={accentColor}
        />
        <button
          className="btn btn-sm btn-ghost"
          onClick={onSelectAll}
          style={{
            fontSize: "12px",
            padding: "5px 10px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <CheckSquare size={14} /> Select All ({totalCount})
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={onResetOrDeselect}
          style={{
            fontSize: "12px",
            padding: "5px 10px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <Square size={14} /> {resetLabel}
        </button>
      </div>
    </div>
  );
};

export const CacheStatusInfo: React.FC<{
  itemCount: number;
  lastFetchedAt: string | null;
  style?: React.CSSProperties;
}> = ({ itemCount, lastFetchedAt, style }) => {
  if (itemCount <= 0) return null;
  return (
    <div
      style={{
        fontSize: "12.5px",
        color: "var(--so-text-secondary)",
        marginTop: "14px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        ...style,
      }}
    >
      <span
        className="tabular-nums"
        style={{
          color: "var(--so-text-primary)",
          fontWeight: 800,
        }}
      >
        {itemCount.toLocaleString()}
      </span>{" "}
      items cached in memory
      {lastFetchedAt &&
        ` — updated ${new Date(lastFetchedAt).toLocaleTimeString()}`}
    </div>
  );
};
