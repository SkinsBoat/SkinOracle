import React from "react";
import {
  Check,
  ExternalLink,
  Eye,
  CheckCircle2,
  PlusCircle,
  Loader2,
} from "lucide-react";
import TrendSparkline from "../../../components/TrendSparkline";
import { CopyMarketHashButton } from "../../../components/CopyMarketHashButton";

export interface SoCloseResultItem {
  name: string;
  acceptedPrice: number;
  currentMarketPrice: number;
  closeness: number;
  closenessPercent: number;
  iconUrl?: string;
  hasExistingOrder?: boolean;
  trendMomentum14d?: number;
}

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
        gap: "8px",
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
      }}
      onClick={onToggleSelect}
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
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          {isSelected && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
                backgroundColor: "var(--so-primary)",
                color: "#ffffff",
                padding: "1px 6px",
                borderRadius: "10px",
                fontSize: "9px",
                fontWeight: 800,
                letterSpacing: "0.4px",
                lineHeight: "1.2",
              }}
            >
              <Check size={10} /> SELECTED
            </span>
          )}
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
            <ExternalLink size={14} />
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
            <Eye size={14} />
          </button>
          <CopyMarketHashButton name={item.name} />
        </div>

        {/* Distance / Closeness Badge */}
        {item.hasExistingOrder ? (
          <span
            className="badge badge-cyan"
            style={{ fontSize: "9px", padding: "1px 5px", fontWeight: 800 }}
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
              display: "flex",
              alignItems: "center",
              gap: "3px",
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
              backgroundColor: "rgba(245, 158, 11, 0.18)",
              color: "#f59e0b",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: "3px",
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
