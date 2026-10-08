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
import type {
  SkinscomListing,
  SkinscomStreamEventType,
} from "../../../../shared/types/skinscom.types";
import {
  buildSkinscomImageUrl,
  computeCloseness,
  formatUsdFromCents,
  getWearShortcutFromName,
} from "../utils/skinscomUtils";

interface SkinscomMarketCardProps {
  listing: SkinscomListing;
  /** Oracle Buy Ceiling (accepted price) in USD cents, if matched. */
  buyCeilingCents: number | null;
  /** Oracle supply stability score for this market name, if available. */
  supplyStabilityScore: number | null;
  /** Max closeness (market / ceiling) still considered "So Close". */
  maxCloseness: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpenMarket: (name: string) => void;
  onOpenLookup: (listing: SkinscomListing) => void;
  /** Live-feed origin badge (Events tab). Omit for the Market Scan tab. */
  eventType?: SkinscomStreamEventType | null;
  /** Hide the selection affordance (Events tab is read-only). */
  hideSelection?: boolean;
  /** Number of live listings collapsed into this card (Events tab grouping). */
  duplicateCount?: number;
}

/**
 * Skins.com market listing card. Visually mirrors the CSFloat/DMarket So Close
 * card (badges, image, title/wear, sparkline, pricing box, action row) but is
 * read-only — its action opens the listing on Skins.com.
 */
export const SkinscomMarketCard: React.FC<SkinscomMarketCardProps> = ({
  listing,
  buyCeilingCents,
  supplyStabilityScore,
  maxCloseness,
  isSelected,
  onToggleSelect,
  onOpenMarket,
  onOpenLookup,
  eventType = null,
  hideSelection = false,
  duplicateCount,
}) => {
  const match = listing.market_name.match(/^(.+?)\s*\(([^)]+)\)$/);
  const cleanTitle = match ? match[1] : listing.market_name;
  const wearShortcut = getWearShortcutFromName(listing.wear_name);

  const closeness = computeCloseness(listing.market_value, buyCeilingCents);
  const closenessPercent =
    closeness === null ? null : (closeness - 1) * 100;
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
      {/* Row 1: Actions & Selection Indicator */}
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMarket(listing.market_name);
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
              onOpenLookup(listing);
            }}
            className="btn btn-sm"
            style={styles.lookupBtn}
            title="Inspect item details"
          >
            <Eye size={13} />
          </button>
          <CopyMarketHashButton name={listing.market_name} />
        </div>

        <div
          style={getCheckmarkStyle(isSelected)}
          title={isSelected ? "Selected" : "Click card to select"}
        >
          {hideSelection ? null : isSelected ? (
            <CheckSquare size={14} />
          ) : (
            <Square size={14} />
          )}
        </div>
      </div>

      {/* Row 1b: Live-feed event badge (Events tab only) */}
      {eventType && (
        <div style={styles.eventRow}>
          <span style={getEventBadgeStyle(eventType)}>
            {EVENT_BADGE_LABEL[eventType] ?? eventType}
          </span>
          {duplicateCount && duplicateCount > 1 ? (
            <span
              style={styles.duplicateBadge}
              title={`${duplicateCount} separate deposit ids share this item and float (re-listings)`}
            >
              ×{duplicateCount} ids
            </span>
          ) : null}
          <span style={styles.depositIdLabel} title="Skins.com deposit id">
            #{listing.id}
          </span>
        </div>
      )}

      {/* Row 2: Badges Strip */}
      <div style={styles.badgesStrip}>
        {supplyStabilityScore !== null &&
        supplyStabilityScore !== undefined ? (
          <span
            className="badge"
            style={getSssBadgeStyle(supplyStabilityScore)}
            title="Supply Stability Score (SSS): cross-market distribution, HHI balance, and volume depth."
          >
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

      {/* Image Showcase */}
      <SkinImage
        src={buildSkinscomImageUrl(listing.icon_url)}
        alt={cleanTitle}
        fallbackItemName={listing.market_name}
      />

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
          name={listing.market_name}
          height={32}
          onClick={() => onOpenMarket(listing.market_name)}
        />
      </div>

      {/* Pricing Info Box */}
      <div style={getPricingBoxStyle(isDeal)}>
        <div style={styles.pricingBoxRow}>
          <span style={styles.labelMuted}>Market Price</span>
          <span
            className="tabular-nums"
            style={getMarketPriceStyle(isDeal)}
          >
            {formatUsdFromCents(listing.market_value)}
          </span>
        </div>

        <div style={styles.pricingBoxRowLast}>
          <span style={styles.labelMuted}>Target Buy Price</span>
          <span className="tabular-nums" style={styles.targetPriceText}>
            {formatUsdFromCents(buyCeilingCents)}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div style={styles.actionsRow} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onOpenMarket(listing.market_name)}
          className="btn btn-primary btn-sm"
          style={styles.openMarketBtn}
        >
          <ExternalLink size={12} />
          <span>Open on Skins.com</span>
        </button>
      </div>
    </div>
  );
};

// ── STYLES & STYLE GENERATORS ────────────────────────────────────────

const EVENT_BADGE_LABEL: Record<SkinscomStreamEventType, string> = {
  new_item: "NEW",
  updated_item: "UPDATED",
  auction_update: "AUCTION BID",
  deleted_item: "REMOVED",
};

const getEventBadgeStyle = (
  type: SkinscomStreamEventType,
): React.CSSProperties => {
  const palette =
    type === "new_item"
      ? { bg: "rgba(34, 197, 94, 0.18)", fg: "var(--so-success-text)", bd: "rgba(34, 197, 94, 0.4)" }
      : type === "auction_update"
        ? { bg: "rgba(245, 158, 11, 0.18)", fg: "#f59e0b", bd: "rgba(245, 158, 11, 0.4)" }
        : { bg: "rgba(56, 189, 248, 0.18)", fg: "var(--so-accent-cyan)", bd: "rgba(56, 189, 248, 0.4)" };
  return {
    fontSize: "9px",
    padding: "1px 6px",
    fontWeight: 800,
    letterSpacing: "0.4px",
    borderRadius: "4px",
    backgroundColor: palette.bg,
    color: palette.fg,
    border: `1px solid ${palette.bd}`,
    whiteSpace: "nowrap",
  };
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
  eventRow: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: "5px",
    width: "100%",
  },
  duplicateBadge: {
    fontSize: "9px",
    padding: "1px 5px",
    fontWeight: 800,
    borderRadius: "4px",
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    color: "var(--so-text-secondary)",
    border: "1px solid var(--so-border-subtle)",
    whiteSpace: "nowrap",
  },
  depositIdLabel: {
    marginLeft: "auto",
    fontSize: "9px",
    fontWeight: 700,
    color: "var(--so-text-muted)",
    fontVariantNumeric: "tabular-nums",
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
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
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
