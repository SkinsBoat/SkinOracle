import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  Edit3,
  Trash2,
  Loader2,
  Clock,
  Zap,
  Handshake,
} from "lucide-react";
import { DmarketOfferItem, ListingAnalysis } from "../../../../../../shared/types";
import {
  getWearShortcut,
  getTradeTitle,
  formatItemFloat,
  isDmarketP2POffer,
} from "../../../dmarket-utils";
import { CopyMarketHashButton } from "../../../../../components/CopyMarketHashButton";
import TrendSparkline from "../../../../../components/TrendSparkline";
import { useDealMakerStore } from "../../../../../store/useDealMakerStore";
import { extractWearFromName } from "../../../../../utils/storage";
import { SkinImage } from "../../../../../components/SkinImage";
import toast from "react-hot-toast";
import { steamLogo, dmarketLogo } from "../../../../../utils/marketLogos";

export interface ActiveOfferCardProps {
  offer: DmarketOfferItem;
  analysis?: ListingAnalysis;
  isSelected: boolean;
  isProcessing: boolean;
  cooldown?: { remainingSeconds: number; formatted: string } | null;
  onToggleSelect: (id: string) => void;
  onOpenMarket: (title: string) => void;
  onOpenLookupModal: (
    title: string,
    targetPrice?: number,
    currentPriceDollar?: number,
    imageUrl?: string,
  ) => void;
  onQuickUpdate: (offer: DmarketOfferItem, targetPrice: number) => void;
  onEdit: (offer: DmarketOfferItem) => void;
  onDelete: (offer: DmarketOfferItem) => void;
}

export const ActiveOfferCard: React.FC<ActiveOfferCardProps> = ({
  offer,
  analysis,
  isSelected,
  isProcessing,
  cooldown,
  onToggleSelect,
  onOpenMarket,
  onOpenLookupModal,
  onQuickUpdate,
  onEdit,
  onDelete,
}) => {
  const fullTitle = getTradeTitle(offer);
  const match = fullTitle.match(/^(.+?)\s*\(([^)]+)\)$/);
  const cleanTitle = match ? match[1] : fullTitle;
  const wearText = match
    ? match[2]
    : offer.attributes?.exterior ||
      offer.attributes?.cs2?.exterior ||
      "";
  const wearShortcut = getWearShortcut(wearText);
  const floatVal = formatItemFloat(offer);

  const currentPriceDollar = offer.priceCents
    ? offer.priceCents / 100
    : parseFloat(offer.priceUsd) || 0;

  const isLocked = Boolean(cooldown && cooldown.remainingSeconds > 0);

  // NOTE (DMarket Instant Target / Insta-Sell):
  // Instant-sell UI and logic are deferred pending clarification from DMarket API support
  // regarding target-matching endpoints and instantTargetId requirements.

  const cardBorderColor = isSelected
    ? "var(--so-primary)"
    : isLocked
      ? "rgba(245, 158, 11, 0.85)"
      : analysis?.isOverpriced
        ? "#ef4444"
        : analysis?.isUnderpriced
          ? "#f59e0b"
          : "var(--so-border-medium)";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "8px",
        margin: 0,
        padding: "10px",
        minHeight: "265px",
        boxSizing: "border-box",
        borderRadius: "var(--so-radius-md)",
        backgroundColor: "var(--so-surface-card)",
        border: `1px solid ${isSelected ? "var(--so-primary)" : cardBorderColor}`,
        boxShadow: isSelected ? "inset 0 0 0 1px var(--so-primary)" : "none",
        cursor: "pointer",
        userSelect: "none",
        transition: "all 0.15s ease",
        overflow: "hidden",
      }}
      onClick={() => onToggleSelect(offer.id)}
    >
      {/* Top Header Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            flexShrink: 0,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMarket(offer.title);
            }}
            className="btn btn-sm"
            style={{
              padding: "3px 6px",
              background: "var(--so-surface-panel)",
              border: "1px solid var(--so-border-subtle)",
              borderRadius: "4px",
              color: "var(--so-text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Open on DMarket Market (Browser)"
          >
            <ExternalLink size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenLookupModal(
                offer.title,
                analysis?.targetListingPrice,
                currentPriceDollar,
              );
            }}
            className="btn btn-sm"
            style={{
              padding: "3px 6px",
              background: "var(--so-surface-panel)",
              border: "1px solid var(--so-border-subtle)",
              borderRadius: "4px",
              color: "var(--so-accent-cyan)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Inspect Market Price & Details"
          >
            <Eye size={13} />
          </button>
          <CopyMarketHashButton name={offer.title} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isLocked) {
                toast.error(`Cannot broadcast "${cleanTitle}": Offer is currently on cooldown / locked.`);
                return;
              }
              useDealMakerStore.getState().openCreateModal({
                marketHashName: offer.title,
                wear: wearShortcut || extractWearFromName(offer.title),
                floatValue: floatVal || undefined,
                imageUrl: offer.imageUrl,
                marketplace: 'dmarket',
                startingPrice: currentPriceDollar || analysis?.targetListingPrice || undefined,
                tradable: !isLocked,
                isLocked,
              });
            }}
            disabled={isLocked}
            className="btn btn-sm"
            style={{
              padding: "3px 6px",
              background: isLocked ? "rgba(100, 116, 139, 0.12)" : "rgba(56, 189, 248, 0.12)",
              border: isLocked ? "1px solid rgba(100, 116, 139, 0.25)" : "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "4px",
              color: isLocked ? "#64748b" : "#38bdf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isLocked ? "not-allowed" : "pointer",
              opacity: isLocked ? 0.5 : 1,
            }}
            title={
              isLocked
                ? "Cannot broadcast: Offer is locked / on cooldown"
                : "Broadcast to DealMaker ($0.40 fee)"
            }
          >
            <Handshake size={12} />
          </button>
        </div>

        {/* Analysis Drift Badge */}
        {analysis ? (
          analysis.isOverpriced ? (
            <span
              className="badge"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "3px",
                backgroundColor: "rgba(239, 68, 68, 0.18)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                fontWeight: 800,
                fontSize: "9px",
                padding: "1px 5px",
              }}
            >
              <AlertTriangle size={10} /> OVERPRICED (
              {analysis.driftPercent > 0
                ? `+${analysis.driftPercent.toFixed(0)}%`
                : `${analysis.driftPercent.toFixed(0)}%`}
              )
            </span>
          ) : analysis.isUnderpriced ? (
            <span
              className="badge"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "3px",
                backgroundColor: "rgba(245, 158, 11, 0.18)",
                color: "#f59e0b",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                fontWeight: 800,
                fontSize: "9px",
                padding: "1px 5px",
              }}
            >
              <AlertTriangle size={10} /> UNDERPRICED (
              {analysis.driftPercent.toFixed(0)}%)
            </span>
          ) : (
            <span
              className="badge badge-success"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "3px",
                fontWeight: 800,
                fontSize: "9px",
                padding: "1px 5px",
              }}
            >
              <CheckCircle2 size={10} /> SAFE (
              {analysis.driftPercent >= 0
                ? `+${analysis.driftPercent.toFixed(0)}%`
                : `${analysis.driftPercent.toFixed(0)}%`}
              )
            </span>
          )
        ) : (
          <span
            className="badge badge-secondary"
            style={{ fontSize: "9px", padding: "1px 5px" }}
          >
            LISTED
          </span>
        )}
      </div>

      {/* Image Showcase */}
      <div style={{ position: "relative" }}>
        <SkinImage src={offer.imageUrl} alt={cleanTitle} />

        {/* Active Cooldown Timer Badge */}
        {isLocked && (
          <div
            style={{
              position: "absolute",
              top: "4px",
              right: "4px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 7px",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: 800,
              backgroundColor: "rgba(220, 38, 38, 0.92)",
              backdropFilter: "blur(4px)",
              color: "#ffffff",
              boxShadow: "0 2px 5px rgba(0,0,0,0.45)",
              border: "1px solid rgba(254, 202, 202, 0.4)",
              zIndex: 2,
              letterSpacing: "0.2px",
            }}
            title={`DMarket Rate-Limit Cooldown: ${cooldown?.formatted} remaining before new changes are permitted.`}
          >
            <Clock size={11} />
            <span>{cooldown?.formatted}</span>
          </div>
        )}

        {/* P2P vs Bot Mode Badge on image */}
        <div
          style={{
            position: "absolute",
            bottom: "4px",
            left: "4px",
            display: "flex",
            alignItems: "center",
            gap: "3px",
            padding: "1px 5px",
            borderRadius: "4px",
            fontSize: "10px",
            fontWeight: 700,
            backgroundColor: isDmarketP2POffer(offer)
              ? "rgba(37, 99, 235, 0.88)"
              : "rgba(109, 40, 217, 0.88)",
            backdropFilter: "blur(3px)",
            color: "#ffffff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.35)",
            border: isDmarketP2POffer(offer)
              ? "1px solid rgba(147, 197, 253, 0.4)"
              : "1px solid rgba(216, 180, 254, 0.4)",
          }}
          title={
            isDmarketP2POffer(offer)
              ? "Listed directly in Steam inventory via P2P mode"
              : "Deposited into DMarket Bot custody"
          }
        >
          {isDmarketP2POffer(offer) ? (
            <>
              <img
                src={steamLogo}
                alt="Steam"
                style={{
                  width: "11px",
                  height: "11px",
                  objectFit: "contain",
                }}
              />
              <span>P2P</span>
            </>
          ) : (
            <>
              <img
                src={dmarketLogo}
                alt="DMarket"
                style={{
                  width: "11px",
                  height: "11px",
                  objectFit: "contain",
                  borderRadius: "2px",
                }}
              />
              <span>Bot</span>
            </>
          )}
        </div>
      </div>

      {/* Title & Wear & Float */}
      <div
        style={{
          textAlign: "center",
          minHeight: "34px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: "11.5px",
            color: "var(--so-text-primary)",
            lineHeight: "1.2",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={offer.title}
        >
          {cleanTitle}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "6px",
            marginTop: "2px",
            fontSize: "10px",
          }}
        >
          {wearShortcut && (
            <span
              style={{
                color: "var(--so-primary)",
                fontWeight: 800,
              }}
            >
              {wearShortcut}
            </span>
          )}
          {floatVal && (
            <span
              style={{
                color: "var(--so-text-muted)",
                fontWeight: 700,
              }}
            >
              F: {floatVal}
            </span>
          )}
        </div>
      </div>

      {/* 14-Day Trend Sparkline */}
      <div onClick={(e) => e.stopPropagation()}>
        <TrendSparkline
          name={fullTitle}
          momentum={analysis?.trendMomentum14d}
          height={30}
          onClick={() =>
            onOpenLookupModal(
              fullTitle,
              analysis?.targetListingPrice,
              currentPriceDollar,
              offer.imageUrl,
            )
          }
        />
      </div>

      {/* Pricing Info Box */}
      <div
        style={{
          backgroundColor: analysis?.isOverpriced
            ? "rgba(239, 68, 68, 0.12)"
            : analysis?.isUnderpriced
              ? "rgba(245, 158, 11, 0.12)"
              : "var(--so-surface-input)",
          border: `1px solid ${
            analysis?.isOverpriced
              ? "rgba(239, 68, 68, 0.3)"
              : analysis?.isUnderpriced
                ? "rgba(245, 158, 11, 0.3)"
                : "var(--so-border-subtle)"
          }`,
          padding: "6px 8px",
          borderRadius: "var(--so-radius-sm)",
          fontSize: "11px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "3px",
          }}
        >
          <span style={{ color: "var(--so-text-muted)" }}>My Listed</span>
          <span
            className="tabular-nums"
            style={{
              fontWeight: 800,
              color: analysis?.isOverpriced
                ? "#ef4444"
                : analysis?.isUnderpriced
                  ? "#f59e0b"
                  : "var(--so-text-primary)",
            }}
          >
            ${currentPriceDollar.toFixed(2)}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "3px",
          }}
        >
          <span style={{ color: "var(--so-text-muted)" }}>
            Target List Price
          </span>
          <span
            className="tabular-nums"
            style={{
              fontWeight: 800,
              color: "var(--so-success-text)",
            }}
          >
            {analysis?.targetListingPrice
              ? `$${analysis.targetListingPrice.toFixed(2)}`
              : "—"}
          </span>
        </div>

        {analysis?.lowestPrice ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "9.5px",
            }}
          >
            <span style={{ color: "var(--so-text-muted)" }}>Lowest / Avg</span>
            <span
              className="tabular-nums"
              style={{
                color: "var(--so-text-secondary)",
                fontWeight: 600,
              }}
            >
              ${analysis.lowestPrice.toFixed(2)} / $
              {analysis.averagePrice.toFixed(2)}
            </span>
          </div>
        ) : null}
      </div>

      {/* Actions Container */}
      <div
        style={styles.actionContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.actionRow}>
        {analysis?.targetListingPrice && analysis.targetListingPrice > 0 ? (
          <button
            onClick={() =>
              !isLocked && onQuickUpdate(offer, analysis.targetListingPrice!)
            }
            disabled={isProcessing || isLocked}
            className="btn btn-warning btn-sm"
            style={{
              flex: 1,
              fontWeight: 700,
              fontSize: "10.5px",
              padding: "4px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
              opacity: isLocked ? 0.65 : 1,
              cursor: isLocked ? "not-allowed" : "pointer",
            }}
            title={
              isLocked
                ? `Locked on DMarket cooldown: ${cooldown?.formatted} remaining`
                : `Update to Oracle price ($${analysis.targetListingPrice.toFixed(2)})`
            }
          >
            {isProcessing ? (
              <Loader2 size={11} className="spin" />
            ) : isLocked ? (
              <Clock size={11} />
            ) : (
              <Edit3 size={11} />
            )}
            <span>{isLocked ? cooldown?.formatted : "Quick Match"}</span>
          </button>
        ) : null}

        <button
          onClick={() => !isLocked && onEdit(offer)}
          disabled={isProcessing || isLocked}
          className="btn btn-secondary btn-sm"
          style={{
            flex: analysis?.targetListingPrice ? 0.8 : 1,
            fontWeight: 700,
            fontSize: "10.5px",
            padding: "4px 6px",
            opacity: isLocked ? 0.65 : 1,
            cursor: isLocked ? "not-allowed" : "pointer",
          }}
          title={
            isLocked
              ? `Locked on DMarket cooldown: ${cooldown?.formatted} remaining`
              : "Edit Price Manually"
          }
        >
          {isLocked ? <Clock size={11} /> : "Edit"}
        </button>

        <button
          onClick={() => onDelete(offer)}
          disabled={isProcessing}
          className="btn btn-danger btn-sm"
          style={{ padding: "4px 6px" }}
          title="Delist from sale"
        >
          {isProcessing ? (
            <Loader2 size={11} className="spin" />
          ) : (
            <Trash2 size={12} />
          )}
        </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  actionContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  } as React.CSSProperties,

  actionRow: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
  } as React.CSSProperties,
};
