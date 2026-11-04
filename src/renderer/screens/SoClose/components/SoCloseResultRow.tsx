import React from "react";
import { CheckCircle2, Eye } from "lucide-react";
import { SoCloseResultItem } from "../../../../shared/types";
import { getMarketDisplayName } from "../../../../shared/canonicalMarkets";
import { MarketLogo } from "../../../components/MarketLogo";
import { CopyMarketHashButton } from "../../../components/CopyMarketHashButton";
import { ExternalLinkButton } from "../../../components/ExternalLinkButton";
import { TrendSparkline } from "../../../components/TrendSparkline";
import { SkinImage } from "../../../components/SkinImage";
import { getMarketItemUrl } from "../../../utils/marketUrls";
import { resolveItemImageUrl } from "../../../../shared/utils/itemImageUrl";

export interface SoCloseResultRowProps {
  item: SoCloseResultItem;
  index: number;
  onInspect: (item: SoCloseResultItem) => void;
  onOpenMarket: (item: SoCloseResultItem) => void;
  onContextMenu: (
    event: React.MouseEvent<HTMLDivElement>,
    item: SoCloseResultItem,
  ) => void;
}

/**
 * Single SoClose opportunity card. Keeps profit context in one glance:
 * listed price, Oracle buy ceiling, and the dollar/percent delta.
 */
export const SoCloseResultRow: React.FC<SoCloseResultRowProps> = ({
  item,
  index,
  onInspect,
  onOpenMarket,
  onContextMenu,
}) => {
  const isInstantProfit = item.closeness <= 1.0;
  const marketUrl = getMarketItemUrl(item.market || "csfloat", item.name);

  const match = item.name.match(
    /^(.*?)(?:\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\))?$/i,
  );
  const cleanTitle = match ? match[1] : item.name;
  const wearShortcut = match && match[2] ? match[2] : "";

  const imageUrl = resolveItemImageUrl(item.name, item.iconUrl);

  return (
    <div
      className={`card ${isInstantProfit ? "stream-row-pulse" : ""}`}
      style={getOpportunityCardStyle(isInstantProfit, !!marketUrl)}
      onClick={marketUrl ? () => onOpenMarket(item) : undefined}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, item);
      }}
      title="Click to open in market • Right-click for card actions"
    >
      {/* Row 1: Actions (left) & Market (right) */}
      <div style={styles.cardTopRow}>
        <div
          style={styles.cardActionIcons}
          data-export-ignore="true"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInspect(item);
            }}
            title="Inspect item details & all marketplace price breakdown"
            className="btn btn-sm"
            style={styles.cardInspectBtn}
          >
            <Eye size={13} />
          </button>

          <div onClick={(e) => e.stopPropagation()}>
            <CopyMarketHashButton name={item.name} size={13} />
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.stopPropagation()}
          >
            <ExternalLinkButton
              url={marketUrl}
              label={
                marketUrl
                  ? `Open on ${getMarketDisplayName(item.market)}`
                  : "Market link unavailable"
              }
              onOpen={() => onOpenMarket(item)}
              size={13}
            />
          </div>
        </div>

        <div style={styles.cardMarketInfo} onClick={(e) => e.stopPropagation()}>
          <MarketLogo marketId={item.market || "csfloat"} size={14} />
          <span style={styles.cardMarketName}>
            {getMarketDisplayName(item.market)}
          </span>
        </div>
      </div>

      {/* Row 2: SSS & opportunity badge */}
      <div style={styles.cardBadgesRow}>
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

        {isInstantProfit ? (
          <span className="badge badge-profit" style={styles.dealBadge}>
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

      <SkinImage
        src={imageUrl}
        alt={cleanTitle}
        fallbackItemName={item.name}
        title={
          marketUrl
            ? `Click card to open on ${getMarketDisplayName(item.market)}`
            : undefined
        }
      />

      <div style={styles.titleWearRow}>
        <div style={styles.cardTitle} title={item.name}>
          {cleanTitle}
        </div>
        {wearShortcut && <span style={styles.wearTag}>{wearShortcut}</span>}
      </div>

      <div style={styles.sparklineWrapper} onClick={(e) => e.stopPropagation()}>
        <TrendSparkline
          name={item.name}
          momentum={item.trendMomentum14d}
          height={32}
          onClick={() => onInspect(item)}
        />
      </div>

      {/* Price metrics with explicit profit context */}
      <div style={getPriceMetricsBlockStyle(item.closeness <= 1.0)}>
        <div style={styles.metricsRow}>
          <span style={styles.metricsLabel}>
            {getMarketDisplayName(item.market)} Price
          </span>
          <span
            className="tabular-nums"
            style={getMarketPriceValueStyle(item.closeness <= 1.0)}
          >
            ${item.currentMarketPrice.toFixed(2)}
          </span>
        </div>

        <div style={styles.metricsRow}>
          <span style={styles.metricsLabel}>Oracle Buy Ceiling</span>
          <span className="tabular-nums" style={styles.targetPriceValue}>
            ${item.acceptedPrice.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Helpers & Styles ────────────────────────────────────────────────

function getOpportunityCardStyle(isInstantProfit: boolean, hasUrl: boolean): React.CSSProperties {
  return {
    backgroundColor: "var(--so-surface-card)",
    border: `1px solid ${
      isInstantProfit ? "rgba(16, 185, 129, 0.4)" : "var(--so-border-subtle)"
    }`,
    boxShadow: isInstantProfit ? "0 0 12px rgba(16, 185, 129, 0.15)" : "none",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    position: "relative",
    cursor: hasUrl ? "pointer" : "default",
    transition: "border-color var(--so-duration-fast) var(--so-ease-out)",
  };
}

function getSssBadgeStyle(score?: number): React.CSSProperties {
  const s = score ?? 0;
  const isHigh = s >= 1.2;
  const isMed = s >= 0.8;
  return {
    fontSize: "9px",
    padding: "1px 5px",
    fontWeight: 800,
    borderRadius: "4px",
    backgroundColor: isHigh
      ? "rgba(16, 185, 129, 0.18)"
      : isMed
        ? "rgba(6, 182, 212, 0.18)"
        : "rgba(245, 158, 11, 0.18)",
    color: isHigh
      ? "var(--so-success-text)"
      : isMed
        ? "var(--so-cyan-text)"
        : "var(--so-warning)",
    border: `1px solid ${
      isHigh
        ? "rgba(16, 185, 129, 0.35)"
        : isMed
          ? "rgba(6, 182, 212, 0.35)"
          : "rgba(245, 158, 11, 0.35)"
    }`,
    whiteSpace: "nowrap",
    flexShrink: 0,
  };
}

function getPriceMetricsBlockStyle(isInstantProfit: boolean): React.CSSProperties {
  return {
    padding: "8px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: isInstantProfit
      ? "rgba(16, 185, 129, 0.12)"
      : "var(--so-surface-panel)",
    border: `1px solid ${
      isInstantProfit ? "rgba(16, 185, 129, 0.3)" : "var(--so-border-subtle)"
    }`,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "11px",
  };
}

function getMarketPriceValueStyle(isInstantProfit: boolean): React.CSSProperties {
  return {
    fontWeight: 800,
    color: isInstantProfit ? "var(--so-profit-text)" : "var(--so-warning)",
  };
}

const styles: Record<string, React.CSSProperties> = {
  cardTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  cardActionIcons: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  cardInspectBtn: {
    padding: "3px 6px",
    background: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "4px",
    color: "var(--so-text-secondary)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  cardMarketInfo: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  cardMarketName: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--so-text-secondary)",
  },
  cardBadgesRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "6px",
  },
  dealBadge: {
    fontSize: "9px",
    fontWeight: 800,
    padding: "1px 6px",
  },
  soCloseBadge: {
    fontSize: "9px",
    fontWeight: 800,
    padding: "1px 6px",
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    color: "var(--so-warning)",
    border: "1px solid rgba(245, 158, 11, 0.35)",
  },
  titleWearRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    minWidth: 0,
  },
  cardTitle: {
    fontSize: "12.5px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flex: 1,
    minWidth: 0,
  },
  wearTag: {
    fontSize: "9px",
    fontWeight: 800,
    padding: "1px 4px",
    borderRadius: "3px",
    backgroundColor: "var(--so-surface-3)",
    color: "var(--so-text-secondary)",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  sparklineWrapper: {
    minHeight: "32px",
  },
  metricsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  metricsLabel: {
    color: "var(--so-text-muted)",
    fontSize: "10.5px",
  },
  targetPriceValue: {
    fontWeight: 800,
    color: "var(--so-text-primary)",
  },
};
