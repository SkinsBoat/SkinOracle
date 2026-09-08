import React from "react";
import {
  ExternalLink,
  Eye,
  Lock,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Loader2,
  PlusCircle,
  Edit3,
  Trash2,
} from "lucide-react";
import { ListingAnalysis } from "../../../../shared/types";
import { CopyMarketHashButton } from "../../../components/CopyMarketHashButton";

export type { ListingAnalysis };

interface CSFloatListingCardProps {
  item: any;
  isSelected: boolean;
  onToggleSelect: () => void;
  analysis?: ListingAnalysis | null;
  isProcessing: boolean;
  isPrivateMode?: boolean;
  onCreateListing: (item: any, price?: number) => void;
  onUpdateListing: (item: any, price: number) => void;
  onUnlist: (item: any) => void;
  onOpenMarket: (name: string) => void;
  onOpenLookup: (
    name: string,
    acceptedPrice?: number,
    currentListedPrice?: number,
    iconUrl?: string,
  ) => void;
  wearShortcut: string;
}

export const CSFloatListingCard: React.FC<CSFloatListingCardProps> = ({
  item,
  isSelected,
  onToggleSelect,
  analysis,
  isProcessing,
  isPrivateMode,
  onCreateListing,
  onUpdateListing,
  onUnlist,
  onOpenMarket,
  onOpenLookup,
  wearShortcut,
}) => {
  const isListed = !!item.listing_id;
  const name = item.market_hash_name || item.item_name || "CS:GO Item";
  const match = name.match(/^(.+?)\s*\(([^)]+)\)$/);
  const cleanTitle = match ? match[1] : name;

  const imageUrl = item.icon_url
    ? `https://community.cloudflare.steamstatic.com/economy/image/${item.icon_url}`
    : `https://api.steamapis.com/image/item/730/${encodeURIComponent(name)}`;

  const floatVal =
    item.float_value !== undefined && item.float_value !== null
      ? item.float_value.toFixed(4)
      : null;

  const currentListedPriceDollar =
    isListed && item.price ? item.price / 100 : null;

  const cardBorderColor = isSelected
    ? "var(--so-primary)"
    : analysis?.isOverpriced
      ? "#ef4444"
      : analysis?.isUnderpriced
        ? "#f59e0b"
        : isListed
          ? "var(--so-success)"
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
        minHeight: "260px",
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
        <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMarket(name);
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
                name,
                undefined,
                currentListedPriceDollar || undefined,
                item.icon_url,
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
          <CopyMarketHashButton name={name} />
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "1px 5px",
              fontSize: "8.5px",
              color: isListed
                ? "var(--so-success-text)"
                : "var(--so-text-muted)",
              backgroundColor: isListed
                ? "rgba(16, 185, 129, 0.15)"
                : "var(--so-surface-panel)",
              borderRadius: "3px",
              fontWeight: 800,
            }}
          >
            {isListed ? (
              item.private ? (
                <Lock size={9} style={{ marginRight: 2 }} />
              ) : (
                <Globe size={9} style={{ marginRight: 2 }} />
              )
            ) : null}
            {isListed ? "STALL" : "UNLISTED"}
          </span>
        </div>

        {/* Analysis Badge */}
        {!isListed ? (
          <span
            className="badge badge-secondary"
            style={{ fontSize: "9px", padding: "1px 5px" }}
          >
            READY TO LIST
          </span>
        ) : analysis ? (
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

      {/* Image */}
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

      {/* Title & Float */}
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
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "6px",
            alignItems: "center",
            marginTop: "2px",
          }}
        >
          {wearShortcut && (
            <span
              style={{
                fontSize: "10px",
                color: "var(--so-text-muted)",
                fontWeight: 700,
              }}
            >
              {wearShortcut}
            </span>
          )}
          {floatVal && (
            <span
              style={{
                fontSize: "9.5px",
                color: "var(--so-cyan-text)",
                fontFamily: "monospace",
              }}
            >
              f: {floatVal}
            </span>
          )}
        </div>
      </div>

      {/* Pricing Info */}
      <div
        style={{
          backgroundColor: "var(--so-surface-input)",
          border: "1px solid var(--so-border-subtle)",
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
          <span style={{ color: "var(--so-text-muted)" }}>Listed Price</span>
          <span
            className="tabular-nums"
            style={{
              fontWeight: 800,
              color: currentListedPriceDollar
                ? "var(--so-text-primary)"
                : "var(--so-text-muted)",
            }}
          >
            {currentListedPriceDollar
              ? `$${currentListedPriceDollar.toFixed(2)}`
              : "Not Listed"}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--so-text-muted)" }}>Target Listing</span>
          <span
            className="tabular-nums"
            style={{
              fontWeight: 800,
              color: analysis?.targetListingPrice
                ? "var(--so-success-text)"
                : "var(--so-text-muted)",
            }}
          >
            {analysis?.targetListingPrice
              ? `$${analysis.targetListingPrice.toFixed(2)}`
              : "---"}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div
        style={{ display: "flex", gap: "6px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {!isListed ? (
          <button
            onClick={() => onCreateListing(item, analysis?.targetListingPrice)}
            disabled={isProcessing || !analysis?.targetListingPrice}
            className="btn btn-primary btn-sm"
            style={{
              flex: 1,
              fontWeight: 700,
              fontSize: "10.5px",
              padding: "4px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
            title={
              analysis?.targetListingPrice
                ? `List at $${analysis.targetListingPrice.toFixed(2)} (${isPrivateMode ? "Private" : "Public"})`
                : "No recommended listing price"
            }
          >
            {isProcessing ? (
              <Loader2 size={11} className="spin" />
            ) : (
              <PlusCircle size={12} />
            )}
            <span>List {isPrivateMode ? "(Priv)" : "(Pub)"}</span>
          </button>
        ) : (
          <>
            <button
              onClick={() =>
                onUpdateListing(
                  item,
                  analysis?.targetListingPrice || currentListedPriceDollar || 0,
                )
              }
              disabled={isProcessing || !analysis?.targetListingPrice}
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
              }}
              title="Update listing to Target Listing Price"
            >
              {isProcessing ? (
                <Loader2 size={11} className="spin" />
              ) : (
                <Edit3 size={11} />
              )}
              <span>Update</span>
            </button>
            <button
              onClick={() => onUnlist(item)}
              disabled={isProcessing}
              className="btn btn-danger btn-sm"
              style={{ padding: "4px 6px" }}
              title="Remove listing (Unlist)"
            >
              {isProcessing ? (
                <Loader2 size={11} className="spin" />
              ) : (
                <Trash2 size={12} />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
