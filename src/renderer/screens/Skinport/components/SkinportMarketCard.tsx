import React from "react";
import {
  CheckCircle2,
  CheckSquare,
  ExternalLink,
  Eye,
  Square,
} from "lucide-react";
import TrendSparkline from "../../../components/TrendSparkline";
import { CopyMarketHashButton } from "../../../components/CopyMarketHashButton";
import { SkinImage } from "../../../components/SkinImage";
import type { SkinportMarketItem } from "../../../../shared/types/skinport.types";
import {
  buildSkinportItemImageUrl,
  computeCloseness,
  formatUsdFromCents,
  itemPriceCents,
  splitMarketName,
} from "../utils/skinportUtils";

interface SkinportMarketCardProps {
  item: SkinportMarketItem;
  buyCeilingCents: number | null;
  supplyStabilityScore: number | null;
  maxCloseness: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpenMarket: (name: string) => void;
  onOpenLookup: (item: SkinportMarketItem) => void;
}

export const SkinportMarketCard: React.FC<SkinportMarketCardProps> = ({
  item,
  buyCeilingCents,
  supplyStabilityScore,
  maxCloseness,
  isSelected,
  onToggleSelect,
  onOpenMarket,
  onOpenLookup,
}) => {
  const name = item.market_hash_name;
  const { title, wear } = splitMarketName(name);
  const priceCents = itemPriceCents(item);

  const closeness = computeCloseness(priceCents ?? 0, buyCeilingCents);
  const closenessPercent = closeness === null ? null : (closeness - 1) * 100;
  const isDeal = closeness !== null && closeness <= 1.0;
  const isSoClose = closeness !== null && closeness <= maxCloseness;
  const hasCeiling = buyCeilingCents !== null && buyCeilingCents > 0;

  const cardBorderColor = !hasCeiling
    ? "var(--so-border-subtle)"
    : isDeal
      ? "var(--so-success)"
      : "var(--so-warning)";

  return (
    <div
      style={getCardContainerStyle(isSelected, cardBorderColor)}
      onClick={onToggleSelect}
    >
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMarket(name);
            }}
            className="btn btn-sm"
            style={styles.actionBtn}
            title="Open on Skinport (Browser)"
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
          <CopyMarketHashButton name={name} />
        </div>
        <div style={getCheckmarkStyle(isSelected)} title="Click card to select">
          {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
        </div>
      </div>

      <div style={styles.badgesStrip}>
        {supplyStabilityScore !== null &&
        supplyStabilityScore !== undefined ? (
          <span className="badge" style={getSssBadgeStyle(supplyStabilityScore)}>
            SSS: {supplyStabilityScore.toFixed(1)}
          </span>
        ) : (
          <div />
        )}

        {!hasCeiling ? (
          <span className="badge" style={styles.noCeilingBadge}>
            NO CEILING
          </span>
        ) : isDeal ? (
          <span className="badge badge-success" style={styles.dealBadge}>
            <CheckCircle2 size={10} /> DEAL (
            {closenessPercent !== null && closenessPercent > 0
              ? `+${closenessPercent.toFixed(1)}%`
              : `${(closenessPercent ?? 0).toFixed(1)}%`}
            )
          </span>
        ) : isSoClose ? (
          <span className="badge" style={styles.soCloseBadge}>
            SO CLOSE (+{(closenessPercent ?? 0).toFixed(1)}%)
          </span>
        ) : (
          <span className="badge" style={styles.aboveCeilingBadge}>
            ABOVE CEILING (+{(closenessPercent ?? 0).toFixed(1)}%)
          </span>
        )}
      </div>

      <SkinImage
        src={buildSkinportItemImageUrl(name)}
        alt={title}
        fallbackItemName={name}
      />

      <div style={styles.titleWearContainer}>
        <div style={styles.cleanTitleText} title={name}>
          {title}
        </div>
        {wear && <div style={styles.wearShortcutText}>{wear}</div>}
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <TrendSparkline
          name={name}
          height={32}
          onClick={() => onOpenMarket(name)}
        />
      </div>

      <div style={getPricingBoxStyle(isDeal)}>
        <div style={styles.pricingBoxRowLast}>
          <span style={styles.labelMuted}>Market Price</span>
          <span className="tabular-nums" style={getMarketPriceStyle(isDeal)}>
            {formatUsdFromCents(priceCents)}
          </span>
        </div>
        <div style={styles.pricingBoxRowLast}>
          <span style={styles.labelMuted}>Target Buy Price</span>
          <span className="tabular-nums" style={styles.targetPriceText}>
            {formatUsdFromCents(buyCeilingCents)}
          </span>
        </div>
      </div>

      <div style={styles.actionsRow} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onOpenMarket(name)}
          className="btn btn-primary btn-sm"
          style={styles.openMarketBtn}
        >
          <ExternalLink size={12} />
          <span>Open on Skinport</span>
        </button>
      </div>
    </div>
  );
};

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
      ? "rgba(56, 189, 248, 0.18)"
      : score >= 0.8
        ? "rgba(6, 182, 212, 0.18)"
        : "rgba(245, 158, 11, 0.18)",
  color: score >= 0.8 ? "var(--so-success-text)" : "var(--so-warning)",
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

const getPricingBoxStyle = (
  isClosenessUnder1: boolean,
): React.CSSProperties => ({
  backgroundColor: isClosenessUnder1
    ? "rgba(56, 189, 248, 0.12)"
    : "var(--so-surface-input)",
  border: `1px solid ${
    isClosenessUnder1 ? "rgba(56, 189, 248, 0.3)" : "var(--so-border-subtle)"
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

const styles: Record<string, React.CSSProperties> = {
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
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  noCeilingBadge: {
    fontSize: "9px",
    padding: "1px 5px",
    fontWeight: 800,
    borderRadius: "4px",
    backgroundColor: "rgba(100, 116, 139, 0.18)",
    color: "var(--so-text-muted)",
    border: "1px solid var(--so-border-subtle)",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  aboveCeilingBadge: {
    fontSize: "9px",
    padding: "1px 5px",
    fontWeight: 800,
    borderRadius: "4px",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#ef4444",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    whiteSpace: "nowrap",
    flexShrink: 0,
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
  pricingBoxRowLast: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "3px",
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
  openMarketBtn: {
    flex: 1,
    fontWeight: 700,
    fontSize: "11px",
    padding: "4px 6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
  },
};
