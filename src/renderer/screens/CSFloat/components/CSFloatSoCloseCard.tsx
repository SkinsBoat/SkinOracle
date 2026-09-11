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
      style={{
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
      }}
      onClick={onToggleSelect}
    >
      {/* Row 1: Actions & Selection Indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: "22px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMarket(item.name);
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
            title="Inspect Item Details"
          >
            <Eye size={13} />
          </button>
          <CopyMarketHashButton name={item.name} />
        </div>

        {/* Selection Checkbox Indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            color: isSelected ? "var(--so-primary)" : "var(--so-text-muted)",
            opacity: isSelected ? 1 : 0.45,
            transition: "all 0.15s ease",
          }}
          title={isSelected ? "Selected" : "Click card to select"}
        >
          {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
        </div>
      </div>

      {/* Row 2: Badges Strip (Dedicated full-width row for SSS Score & Status) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "4px",
          width: "100%",
          minHeight: "18px",
        }}
      >
        {item.supplyStabilityScore !== undefined ? (
          <span
            className="badge"
            style={{
              fontSize: "9px",
              padding: "1px 5px",
              fontWeight: 800,
              borderRadius: "4px",
              backgroundColor:
                item.supplyStabilityScore >= 1.2
                  ? "rgba(16, 185, 129, 0.18)"
                  : item.supplyStabilityScore >= 0.8
                    ? "rgba(6, 182, 212, 0.18)"
                    : "rgba(245, 158, 11, 0.18)",
              color:
                item.supplyStabilityScore >= 1.2
                  ? "var(--so-success-text)"
                  : item.supplyStabilityScore >= 0.8
                    ? "var(--so-cyan-text)"
                    : "var(--so-warning)",
              border: `1px solid ${
                item.supplyStabilityScore >= 1.2
                  ? "rgba(16, 185, 129, 0.35)"
                  : item.supplyStabilityScore >= 0.8
                    ? "rgba(6, 182, 212, 0.35)"
                    : "rgba(245, 158, 11, 0.35)"
              }`,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            title="Supply Stability Score (SSS): cross-market distribution, HHI balance, and volume depth."
          >
            SSS: {item.supplyStabilityScore.toFixed(1)}
          </span>
        ) : <div />}

        {item.hasExistingOrder ? (
          <span
            className="badge badge-cyan"
            style={{
              fontSize: "9px",
              padding: "1px 5px",
              fontWeight: 800,
              borderRadius: "4px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            ORDER PLACED
          </span>
        ) : item.closeness <= 1.0 ? (
          <span
            className="badge badge-success"
            style={{
              fontSize: "9px",
              padding: "1px 5px",
              fontWeight: 800,
              borderRadius: "4px",
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={10} /> BELOW TARGET (
            {item.closenessPercent >= 0
              ? `+${item.closenessPercent.toFixed(1)}%`
              : `${item.closenessPercent.toFixed(1)}%`}
            )
          </span>
        ) : (
          <span
            className="badge"
            style={{
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
            }}
          >
            SO CLOSE (+{item.closenessPercent.toFixed(1)}%)
          </span>
        )}
      </div>

      {/* Image Showcase */}
      <div
        style={{
          height: "65px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0, 0, 0, 0.25)",
          borderRadius: "var(--so-radius-sm)",
          border: "1px solid var(--so-border-subtle)",
          padding: "4px",
          backgroundImage:
            "radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 70%)",
        }}
      >
        <img
          src={imageUrl}
          alt={cleanTitle}
          onError={(e) => {
            (e.target as HTMLElement).style.opacity = "0.3";
          }}
          style={{
            maxHeight: "55px",
            maxWidth: "100%",
            objectFit: "contain",
            filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5))",
          }}
        />
      </div>

      {/* Title & Wear */}
      <div
        style={{
          textAlign: "center",
          minHeight: "30px",
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
        >
          {cleanTitle}
        </div>
        {wearShortcut && (
          <div
            style={{
              fontSize: "10px",
              color: "var(--so-primary)",
              fontWeight: 800,
              marginTop: "2px",
            }}
          >
            {wearShortcut}
          </div>
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
      <div
        style={{
          backgroundColor:
            item.closeness <= 1.0
              ? "rgba(16, 185, 129, 0.12)"
              : "var(--so-surface-input)",
          border: `1px solid ${item.closeness <= 1.0 ? "rgba(16, 185, 129, 0.3)" : "var(--so-border-subtle)"}`,
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
          <span style={{ color: "var(--so-text-muted)" }}>
            Target Buy Price
          </span>
          <span
            className="tabular-nums"
            style={{ fontWeight: 800, color: "var(--so-success-text)" }}
          >
            ${item.acceptedPrice.toFixed(2)}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "3px",
          }}
        >
          <span style={{ color: "var(--so-text-muted)" }}>CSFloat Market</span>
          <span
            className="tabular-nums"
            style={{
              fontWeight: 800,
              color:
                item.closeness <= 1.0 ? "var(--so-success-text)" : "#f59e0b",
            }}
          >
            ${item.currentMarketPrice.toFixed(2)}
          </span>
        </div>

        {item.supplyStabilityScore !== undefined && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "9.5px",
              marginBottom: "3px",
            }}
          >
            <span style={{ color: "var(--so-text-muted)" }}>SSS Score</span>
            <span
              className="tabular-nums"
              style={{
                fontWeight: 700,
                color:
                  item.supplyStabilityScore >= 1.2
                    ? "var(--so-success-text)"
                    : item.supplyStabilityScore >= 0.8
                      ? "var(--so-cyan-text)"
                      : "var(--so-warning)",
              }}
            >
              {item.supplyStabilityScore.toFixed(2)}
            </span>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "9.5px",
          }}
        >
          <span style={{ color: "var(--so-text-muted)" }}>Distance</span>
          <span
            className="tabular-nums"
            style={{
              fontWeight: 700,
              color:
                item.closeness <= 1.0
                  ? "var(--so-success-text)"
                  : "var(--so-text-secondary)",
            }}
          >
            {item.closeness.toFixed(2)}x (+{item.closenessPercent.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div
        style={{ display: "flex", gap: "6px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {item.hasExistingOrder ? (
          <button
            disabled
            className="btn btn-secondary btn-sm"
            style={{
              flex: 1,
              fontWeight: 700,
              fontSize: "11px",
              padding: "4px 6px",
              opacity: 0.6,
            }}
          >
            Order Placed
          </button>
        ) : (
          <button
            onClick={() => onCreateBuyOrder(item)}
            disabled={isProcessing}
            className="btn btn-primary btn-sm"
            style={{
              flex: 1,
              fontWeight: 700,
              fontSize: "11px",
              padding: "4px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
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
