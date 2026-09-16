import {
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  ExternalLink,
  Eye,
  Zap,
  CheckSquare,
  Square,
  Lock,
  Clock,
} from "lucide-react";
import { DmarketTargetItem, TargetAnalysis } from "../../../../../../shared/types";
import TrendSparkline from "../../../../../components/TrendSparkline";
import { CopyMarketHashButton } from "../../../../../components/CopyMarketHashButton";
import { SkinImage } from "../../../../../components/SkinImage";
import { getWearShortcut } from "../../../dmarket-utils";
import { TargetDriftDetails, isAdvancedTarget, getTargetHoldInfo } from "../types";

export interface TargetCardProps {
  target: DmarketTargetItem;
  analysis?: TargetAnalysis;
  driftDetails: TargetDriftDetails | null;
  isSelected: boolean;
  isProcessing: boolean;
  onToggleSelect: (targetId: string) => void;
  onOpenMarket: (title: string) => void;
  onOpenLookupModal: (
    title: string,
    acceptedPrice?: number,
    marketPrice?: number,
    iconUrl?: string,
  ) => void;
  onOpenEditModal: (
    target: DmarketTargetItem,
    analysis?: TargetAnalysis,
  ) => void;
  onQuantityAdjust: (target: DmarketTargetItem, delta: number) => void;
  onQuickUpdateToOracle: (
    target: DmarketTargetItem,
    acceptedPrice: number,
  ) => void;
  onDeleteTarget: (targetId: string, title: string) => void;
}

export const TargetCard: React.FC<TargetCardProps> = ({
  target,
  analysis,
  driftDetails,
  isSelected,
  isProcessing,
  onToggleSelect,
  onOpenMarket,
  onOpenLookupModal,
  onOpenEditModal,
  onQuantityAdjust,
  onQuickUpdateToOracle,
  onDeleteTarget,
}) => {
  const currentPrice = parseFloat(target.priceCents) / 100;
  const isAdvanced = isAdvancedTarget(target);
  const holdInfo = getTargetHoldInfo(target);
  const isHoldActive = holdInfo.isHoldActive;

  const cardBorderColor = isSelected
    ? "var(--so-primary)"
    : driftDetails?.isOverbid
      ? "#ef4444"
      : driftDetails?.isUnderbid
        ? "#f59e0b"
        : "var(--so-border-medium)";

  const match = target.title.match(/^(.+?)\s*\(([^)]+)\)$/);
  const cleanTitle = match ? match[1] : target.title;
  const wearShortcut = getWearShortcut(
    target.attributes?.cs2?.exterior || (match ? match[2] : ""),
  );
  const isStattrak =
    target.title.includes("StatTrak™") ||
    target.attributes?.cs2?.category === "CATEGORY_STATTRACK";
  const phase = target.attributes?.cs2?.phase;

  const imageUrl =
    target.attributes?.image ||
    `https://api.steamapis.com/image/item/730/${encodeURIComponent(target.title)}`;

  return (
    <div
      style={getCardContainerStyle(isSelected, cardBorderColor, isAdvanced)}
      onClick={() => {
        if (!isAdvanced) {
          onToggleSelect(target.targetId);
        }
      }}
    >
      {/* Top Action Row */}
      <div style={styles.topActionRow}>
        <div style={styles.actionButtonGroup}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMarket(target.title);
            }}
            className="btn btn-sm"
            style={styles.openMarketButton}
            title="Open on DMarket Market (Browser)"
          >
            <ExternalLink size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenLookupModal(
                target.title,
                driftDetails?.acceptedPrice,
                currentPrice,
                target.attributes?.image,
              );
            }}
            className="btn btn-sm"
            style={styles.inspectButton}
            title="Inspect Multi-Market Prices"
          >
            <Eye size={13} />
          </button>
          <CopyMarketHashButton name={target.title} />
        </div>

        {/* Selection Checkbox Indicator / Lock for Advanced Targets */}
        <div
          style={isAdvanced ? styles.lockIndicator : getCheckboxIndicatorStyle(isSelected)}
          title={
            isAdvanced
              ? "Advanced target: custom attributes cannot be batch updated"
              : isSelected
                ? "Selected"
                : "Click card to select"
          }
        >
          {isAdvanced ? (
            <Lock size={13} />
          ) : isSelected ? (
            <CheckSquare size={14} />
          ) : (
            <Square size={14} />
          )}
        </div>
      </div>

      {/* Drift Status Badge */}
      <div style={styles.driftBadgeRow}>
        {driftDetails ? (
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
        ) : (
          <span className="badge badge-secondary" style={styles.badgeActive}>
            ACTIVE
          </span>
        )}
        {isAdvanced && (
          <span
            className="badge"
            style={styles.badgeAdvanced}
            title="Advanced target with custom attributes (paint seed, float, etc.). Updates are disabled."
          >
            ADVANCED
          </span>
        )}
        {isHoldActive && (
          <span
            className="badge"
            style={styles.badgeHold}
            title={`DMarket 11-min Hold active (${holdInfo.formattedRemaining} remaining). Target modifications are rejected until hold expires.`}
          >
            <Clock size={10} /> HOLD ({holdInfo.formattedRemaining})
          </span>
        )}
      </div>

      {/* Image Showcase */}
      <SkinImage src={imageUrl} alt={cleanTitle} />

      {/* Title & Wear Tags */}
      <div style={styles.titleWearContainer}>
        <div style={styles.cleanTitleText} title={target.title}>
          {cleanTitle}
        </div>

        <div style={styles.tagRow}>
          {wearShortcut && (
            <span style={styles.wearShortcutTag}>{wearShortcut}</span>
          )}
          {isStattrak && <span style={styles.stattrakTag}>ST™</span>}
          {phase && phase !== "PHASE_TITLE_UNSPECIFIED" && (
            <span style={styles.phaseTag}>
              {phase.replace("PHASE_TITLE_", "")}
            </span>
          )}
        </div>
      </div>

      {/* 14-Day Trend Sparkline */}
      <div onClick={(e) => e.stopPropagation()}>
        <TrendSparkline
          name={target.title}
          momentum={driftDetails?.trendMomentum14d}
          height={30}
          onClick={() =>
            onOpenLookupModal(
              target.title,
              driftDetails?.acceptedPrice,
              currentPrice,
              target.attributes?.image,
            )
          }
        />
      </div>

      {/* Pricing Block */}
      <div style={getPricingBlockStyle(driftDetails?.isOverbid, driftDetails?.isUnderbid)}>
        {/* Quantity Stepper */}
        <div style={styles.quantityRow}>
          <span style={styles.textMuted}>Quantity</span>
          <div style={styles.stepperContainer} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              disabled={isAdvanced || isHoldActive}
              onClick={() => onQuantityAdjust(target, -1)}
              style={{
                ...styles.stepperButton,
                ...(isAdvanced || isHoldActive ? styles.disabledStepperButton : {}),
              }}
              title={
                isAdvanced
                  ? "Quantity locked: Advanced target with custom attributes"
                  : isHoldActive
                    ? `Quantity locked: 11-min hold active (${holdInfo.formattedRemaining})`
                    : "Decrease Quantity"
              }
            >
              -
            </button>
            <span style={styles.stepperAmountValue}>
              {target.amount || 1}
            </span>
            <button
              type="button"
              disabled={isAdvanced || isHoldActive}
              onClick={() => onQuantityAdjust(target, 1)}
              style={{
                ...styles.stepperButton,
                ...(isAdvanced || isHoldActive ? styles.disabledStepperButton : {}),
              }}
              title={
                isAdvanced
                  ? "Quantity locked: Advanced target with custom attributes"
                  : isHoldActive
                    ? `Quantity locked: 11-min hold active (${holdInfo.formattedRemaining})`
                    : "Increase Quantity"
              }
            >
              +
            </button>
          </div>
        </div>

        {/* My Target Price */}
        <div style={styles.currentBidRow}>
          <span style={styles.textMuted}>Current Bid</span>
          <span
            className="tabular-nums"
            style={getCurrentBidPriceStyle(driftDetails?.isOverbid, driftDetails?.isUnderbid)}
          >
            ${currentPrice.toFixed(2)}
          </span>
        </div>

        {/* Oracle Accepted Price */}
        <div style={styles.acceptedPriceRow}>
          <span style={styles.textMuted}>Accepted</span>
          <span className="tabular-nums" style={styles.acceptedPriceValue}>
            {driftDetails?.acceptedPrice
              ? `$${driftDetails.acceptedPrice.toFixed(2)}`
              : "---"}
          </span>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div style={styles.footerActions} onClick={(e) => e.stopPropagation()}>
        {driftDetails?.acceptedPrice && (
          <button
            onClick={() =>
              !isAdvanced &&
              !isHoldActive &&
              onQuickUpdateToOracle(target, driftDetails.acceptedPrice)
            }
            disabled={isProcessing || isAdvanced || isHoldActive}
            className="btn btn-primary btn-sm"
            style={{
              ...styles.quickUpdateButton,
              ...(isAdvanced || isHoldActive ? styles.disabledQuickUpdateButton : {}),
            }}
            title={
              isAdvanced
                ? "Update disabled: Advanced target with custom attributes"
                : isHoldActive
                  ? `Update locked: 11-min hold active (${holdInfo.formattedRemaining} remaining)`
                  : "Update Target to Oracle Price"
            }
          >
            {isProcessing ? (
              <Loader2 size={11} className="spin" />
            ) : isAdvanced ? (
              <Lock size={11} />
            ) : isHoldActive ? (
              <Clock size={11} />
            ) : (
              <Zap size={11} />
            )}
            <span>
              {isAdvanced
                ? "Locked"
                : isHoldActive
                  ? `Hold (${holdInfo.formattedRemaining})`
                  : "Update"}
            </span>
          </button>
        )}
        <button
          onClick={() =>
            !isAdvanced && !isHoldActive && onOpenEditModal(target, analysis)
          }
          disabled={isProcessing || isAdvanced || isHoldActive}
          className="btn btn-secondary btn-sm"
          title={
            isAdvanced
              ? "Cannot edit advanced target with custom attributes"
              : isHoldActive
                ? `Cannot edit: 11-min hold active (${holdInfo.formattedRemaining})`
                : "Edit Target Price / Quantity"
          }
          style={{
            ...styles.iconActionButton,
            ...(isAdvanced || isHoldActive ? styles.disabledIconButton : {}),
          }}
        >
          {isAdvanced ? (
            <Lock size={12} />
          ) : isHoldActive ? (
            <Clock size={12} />
          ) : (
            <Edit3 size={12} />
          )}
        </button>
        <button
          onClick={() => onDeleteTarget(target.targetId, target.title)}
          disabled={isProcessing}
          className="btn btn-danger btn-sm"
          title="Delete Target"
          style={styles.iconActionButton}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC STYLE HELPERS ─────────────────────────

const getCardContainerStyle = (
  isSelected: boolean,
  borderColor: string,
  isAdvanced?: boolean,
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
  backgroundColor: "var(--so-surface-card)",
  border: `1px solid ${!isAdvanced && isSelected ? "var(--so-primary)" : borderColor}`,
  boxShadow: !isAdvanced && isSelected ? "inset 0 0 0 1px var(--so-primary)" : "none",
  cursor: isAdvanced ? "default" : "pointer",
  userSelect: "none",
  transition: "border-color 0.15s ease",
});

const getCheckboxIndicatorStyle = (isSelected: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  color: isSelected ? "var(--so-primary)" : "var(--so-text-muted)",
  opacity: isSelected ? 1 : 0.45,
  transition: "all 0.15s ease",
});

const getPricingBlockStyle = (
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
  isOverbid?: boolean,
  isUnderbid?: boolean,
): React.CSSProperties => ({
  fontWeight: 800,
  color: isOverbid ? "#ef4444" : isUnderbid ? "#f59e0b" : "#ffffff",
});

const styles = {
  topActionRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: "22px",
  } as React.CSSProperties,

  actionButtonGroup: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    flexShrink: 0,
  } as React.CSSProperties,

  openMarketButton: {
    padding: "3px 6px",
    background: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "4px",
    color: "var(--so-text-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,

  inspectButton: {
    padding: "3px 6px",
    background: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "4px",
    color: "var(--so-accent-cyan)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,

  lockIndicator: {
    display: "flex",
    alignItems: "center",
    color: "var(--so-text-muted)",
    opacity: 0.5,
  } as React.CSSProperties,

  driftBadgeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "5px",
    minHeight: "18px",
    flexWrap: "wrap",
  } as React.CSSProperties,

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
    textTransform: "uppercase",
  } as React.CSSProperties,

  badgeHold: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    color: "#f59e0b",
    border: "1px solid rgba(245, 158, 11, 0.35)",
    fontWeight: 700,
    fontSize: "9px",
    padding: "1px 6px",
    borderRadius: "4px",
  } as React.CSSProperties,

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
  } as React.CSSProperties,

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
  } as React.CSSProperties,

  badgeSafe: {
    display: "inline-flex",
    alignItems: "center",
    gap: "3px",
    backgroundColor: "rgba(160, 185, 129, 0.12)",
    color: "#34d399",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    fontWeight: 700,
    fontSize: "9px",
    padding: "1px 6px",
    borderRadius: "4px",
  } as React.CSSProperties,

  badgeActive: {
    fontSize: "9px",
    padding: "1px 6px",
    borderRadius: "4px",
    color: "var(--so-text-muted)",
    border: "1px solid var(--so-border-subtle)",
  } as React.CSSProperties,

  titleWearContainer: {
    textAlign: "center",
    minHeight: "32px",
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

  tagRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    marginTop: "3px",
    flexWrap: "wrap",
  } as React.CSSProperties,

  wearShortcutTag: {
    fontSize: "9.5px",
    fontWeight: 800,
    padding: "0 4px",
    borderRadius: "3px",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    color: "var(--so-text-secondary)",
  } as React.CSSProperties,

  stattrakTag: {
    fontSize: "9.5px",
    fontWeight: 800,
    padding: "0 4px",
    borderRadius: "3px",
    backgroundColor: "rgba(249, 115, 22, 0.15)",
    color: "#fb923c",
  } as React.CSSProperties,

  phaseTag: {
    fontSize: "9px",
    fontWeight: 700,
    padding: "0 4px",
    borderRadius: "3px",
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    color: "#c084fc",
  } as React.CSSProperties,

  quantityRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "4px",
    alignItems: "center",
  } as React.CSSProperties,

  stepperContainer: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  } as React.CSSProperties,

  stepperButton: {
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
  } as React.CSSProperties,

  stepperAmountValue: {
    fontWeight: 800,
    color: "var(--so-primary)",
    minWidth: "16px",
    textAlign: "center",
    fontSize: "11.5px",
  } as React.CSSProperties,

  currentBidRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "4px",
  } as React.CSSProperties,

  acceptedPriceRow: {
    display: "flex",
    justifyContent: "space-between",
  } as React.CSSProperties,

  acceptedPriceValue: {
    fontWeight: 800,
    color: "var(--so-accent-cyan)",
  } as React.CSSProperties,

  footerActions: {
    display: "flex",
    gap: "5px",
  } as React.CSSProperties,

  quickUpdateButton: {
    flex: 1,
    fontWeight: 700,
    fontSize: "11px",
    padding: "4px 6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
  } as React.CSSProperties,

  disabledQuickUpdateButton: {
    opacity: 0.5,
    cursor: "not-allowed",
    backgroundColor: "var(--so-surface-panel)",
    color: "var(--so-text-muted)",
    border: "1px solid var(--so-border-subtle)",
  } as React.CSSProperties,

  disabledStepperButton: {
    opacity: 0.35,
    cursor: "not-allowed",
  } as React.CSSProperties,

  disabledIconButton: {
    opacity: 0.4,
    cursor: "not-allowed",
  } as React.CSSProperties,

  iconActionButton: {
    padding: "4px 6px",
  } as React.CSSProperties,

  textMuted: {
    color: "var(--so-text-muted)",
  } as React.CSSProperties,
};
