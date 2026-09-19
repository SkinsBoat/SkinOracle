import React from "react";
import {
  ExternalLink,
  Eye,
  Edit3,
  PlusCircle,
  ArrowUpRight,
  Loader2,
  Tag,
  Clock,
  Zap,
  AlertTriangle,
  Handshake,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  DmarketInventoryItem,
  ListingPriceInfo,
} from "../../../../../../shared/types";
import {
  getWearShortcut,
  getTradeTitle,
  getItemListingPriceWithMap,
  formatItemFloat,
} from "../../../dmarket-utils";
import { CopyMarketHashButton } from "../../../../../components/CopyMarketHashButton";
import TrendSparkline from "../../../../../components/TrendSparkline";
import { useDealMakerStore } from "../../../../../store/useDealMakerStore";
import { extractWearFromName } from "../../../../../utils/storage";
import { SkinImage } from "../../../../../components/SkinImage";
import { steamLogo, dmarketLogo } from "../../../../../utils/marketLogos";

export interface InventoryItemCardProps {
  item: DmarketInventoryItem;
  listingPriceMap: Record<string, ListingPriceInfo>;
  isSelected: boolean;
  isProcessing: boolean;
  isDepositing: boolean;
  onToggleSelect: (assetId: string) => void;
  onOpenMarket: (title: string) => void;
  onOpenLookupModal: (
    title: string,
    targetPrice?: number,
    marketPrice?: number,
    iconUrl?: string,
  ) => void;
  onCreateOffer: (item: DmarketInventoryItem, price: number) => void;
  onOpenCreateModal: (item: DmarketInventoryItem) => void;
  onDepositItem: (item: DmarketInventoryItem) => void;
  cooldown?: { remainingSeconds: number; formatted: string } | null;
}

export const InventoryItemCard: React.FC<InventoryItemCardProps> = ({
  item,
  listingPriceMap,
  isSelected,
  isProcessing,
  isDepositing,
  onToggleSelect,
  onOpenMarket,
  onOpenLookupModal,
  onCreateOffer,
  onOpenCreateModal,
  onDepositItem,
  cooldown,
}) => {
  const isLocked = Boolean(cooldown && cooldown.remainingSeconds > 0);
  const isTradable = Boolean(item.tradable);
  const isTradeLockedOrBotLocked = !isTradable || isLocked;
  const priceEntry = getItemListingPriceWithMap(item, listingPriceMap);
  const targetPrice =
    priceEntry && priceEntry.listingPrice > 0
      ? Number(priceEntry.listingPrice.toFixed(2))
      : null;

  // NOTE (DMarket Instant Target / Insta-Sell):
  // DMarket public Trading API (GET /marketplace-api/v2/user/inventory) does not return
  // instantPrice or instantTargetId (only suggestedPrice & offerRecommendedPrice).
  // Instant-sell UI and logic are deferred pending clarification from DMarket API support.

  const title = getTradeTitle(item);
  const match = title.match(/^(.+?)\s*\(([^)]+)\)$/);
  const cleanTitle = match ? match[1] : title;
  const wearText = match
    ? match[2]
    : item.attributes?.exterior ||
      item.attributes?.cs2?.exterior ||
      item.extra?.exterior ||
      "";
  const wearShortcut = getWearShortcut(wearText);
  const floatVal = formatItemFloat(item);

  const itemImageUrl =
    item.imageUrl ||
    (title && title !== "CS2 Item"
      ? `https://api.steamapis.com/image/item/730/${encodeURIComponent(title)}`
      : "");

  const cardBorderColor = isSelected
    ? "var(--so-primary)"
    : isLocked
      ? "rgba(245, 158, 11, 0.85)"
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
        border: `1px solid ${cardBorderColor}`,
        boxShadow: isSelected ? "inset 0 0 0 1px var(--so-primary)" : "none",
        cursor: "pointer",
        userSelect: "none",
        transition: "all 0.15s ease",
        overflow: "hidden",
      }}
      onClick={() => onToggleSelect(item.assetId)}
    >
      {/* Header Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: "22px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            flexShrink: 0,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMarket(title);
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
                title,
                targetPrice || undefined,
                undefined,
                itemImageUrl,
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
            title="Inspect Item Details & Trends"
          >
            <Eye size={13} />
          </button>
          <CopyMarketHashButton name={title} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isTradeLockedOrBotLocked) {
                toast.error(
                  !isTradable
                    ? `Cannot broadcast "${cleanTitle}": Item is trade-locked and non-tradable.`
                    : `Cannot broadcast "${cleanTitle}": Item is currently under cooldown.`
                );
                return;
              }
              useDealMakerStore.getState().openCreateModal({
                marketHashName: title,
                wear: wearShortcut || extractWearFromName(title),
                floatValue: floatVal || undefined,
                inspectUrl: (item.attributes?.inspectUrl || item.extra?.inspectUrl) || undefined,
                imageUrl: itemImageUrl,
                marketplace: 'dmarket',
                startingPrice: targetPrice || undefined,
                tradable: isTradable,
                isLocked,
              });
            }}
            disabled={isTradeLockedOrBotLocked}
            className="btn btn-sm"
            style={{
              padding: "3px 6px",
              background: isTradeLockedOrBotLocked
                ? "rgba(100, 116, 139, 0.12)"
                : "rgba(56, 189, 248, 0.12)",
              border: isTradeLockedOrBotLocked
                ? "1px solid rgba(100, 116, 139, 0.25)"
                : "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "4px",
              color: isTradeLockedOrBotLocked ? "#64748b" : "#38bdf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isTradeLockedOrBotLocked ? "not-allowed" : "pointer",
              opacity: isTradeLockedOrBotLocked ? 0.5 : 1,
            }}
            title={
              isTradeLockedOrBotLocked
                ? !isTradable
                  ? "Cannot broadcast: Item is trade-locked / locked non-tradable"
                  : "Cannot broadcast: Item is under cooldown"
                : "Broadcast to DealMaker ($0.40 fee)"
            }
          >
            <Handshake size={12} />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            flexShrink: 0,
          }}
        >
          <span
            className={`badge ${item.tradable ? "badge-success" : "badge-warning"}`}
            style={{
              fontSize: "8.5px",
              padding: "1px 6px",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {item.tradable ? "TRADABLE" : "LOCKED"}
          </span>
        </div>
      </div>

      {/* Image Showcase */}
      <div style={{ position: "relative" }}>
        <SkinImage
          src={itemImageUrl}
          alt={cleanTitle}
          fallbackItemName={title && title !== "CS2 Item" ? title : undefined}
        />

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
            title={`DMarket Rate-Limit Cooldown: ${cooldown?.formatted} remaining before listing is permitted.`}
          >
            <Clock size={11} />
            <span>{cooldown?.formatted}</span>
          </div>
        )}

        {/* Location / Listing Mode Badge on image */}
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
            backgroundColor: item.inMarket
              ? "rgba(109, 40, 217, 0.88)"
              : "rgba(37, 99, 235, 0.88)",
            backdropFilter: "blur(3px)",
            color: "#ffffff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.35)",
            border: item.inMarket
              ? "1px solid rgba(216, 180, 254, 0.4)"
              : "1px solid rgba(147, 197, 253, 0.4)",
          }}
          title={
            item.inMarket
              ? "Deposited into DMarket Bot custody"
              : "In Steam inventory (Ready for P2P listing)"
          }
        >
          {item.inMarket ? (
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
          ) : (
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
              <span>Steam</span>
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
          title={title}
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
          name={title}
          height={30}
          onClick={() =>
            onOpenLookupModal(title, undefined, undefined, itemImageUrl)
          }
        />
      </div>

      {/* Pricing Info Box */}
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
          <span style={{ color: "var(--so-text-muted)" }}>Status</span>
          <span
            style={{
              fontWeight: 700,
              color: item.tradable
                ? "var(--so-success-text)"
                : "#f59e0b",
            }}
          >
            {item.tradable ? "Tradable" : "Trade Locked"}
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
            {targetPrice ? `$${targetPrice.toFixed(2)}` : "—"}
          </span>
        </div>

        {priceEntry?.lowestPrice ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "9.5px",
            }}
          >
            <span style={{ color: "var(--so-text-muted)" }}>
              Lowest / Avg
            </span>
            <span
              className="tabular-nums"
              style={{
                color: "var(--so-text-secondary)",
                fontWeight: 600,
              }}
            >
              ${priceEntry.lowestPrice.toFixed(2)} / $
              {priceEntry.averagePrice.toFixed(2)}
            </span>
          </div>
        ) : null}
      </div>

      {/* Action Container */}
      <div
        style={styles.actionContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.actionRow}>
        {!item.inMarket ? (
          <>
            {/* List P2P Primary Button */}
            <button
              onClick={() => !isLocked && (targetPrice ? onCreateOffer(item, targetPrice) : onOpenCreateModal(item))}
              disabled={isProcessing || isLocked}
              className="btn btn-primary btn-sm"
              style={{
                flex: 1,
                fontWeight: 700,
                fontSize: "10.5px",
                padding: "5px 6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                backgroundColor: isLocked ? "rgba(220, 38, 38, 0.6)" : "#2563eb",
                borderColor: isLocked ? "rgba(220, 38, 38, 0.6)" : "#1d4ed8",
                color: "#ffffff",
                opacity: isLocked ? 0.65 : 1,
                cursor: isLocked ? "not-allowed" : "pointer",
              }}
              title={
                isLocked
                  ? `Locked on DMarket cooldown: ${cooldown?.formatted} remaining`
                  : targetPrice
                    ? `List directly via Steam P2P at Oracle price ($${targetPrice.toFixed(2)})`
                    : "List directly via Steam P2P mode (no deposit required)"
              }
            >
              {isProcessing ? (
                <Loader2 size={11} className="spin" />
              ) : isLocked ? (
                <Clock size={11} />
              ) : (
                <img
                  src={steamLogo}
                  alt="Steam"
                  style={{
                    width: "11px",
                    height: "11px",
                    objectFit: "contain",
                  }}
                />
              )}
              <span>
                {isLocked
                  ? cooldown?.formatted
                  : targetPrice
                    ? `List P2P $${targetPrice.toFixed(2)}`
                    : "List via P2P"}
              </span>
            </button>

            {/* Custom manual price modal trigger */}
            {targetPrice ? (
              <button
                onClick={() => !isLocked && onOpenCreateModal(item)}
                disabled={isProcessing || isLocked}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: "5px 6px",
                  fontSize: "11px",
                  fontWeight: 700,
                  opacity: isLocked ? 0.65 : 1,
                  cursor: isLocked ? "not-allowed" : "pointer",
                }}
                title={
                  isLocked
                    ? `Locked on DMarket cooldown: ${cooldown?.formatted} remaining`
                    : "Set custom P2P listing price manually"
                }
              >
                <Edit3 size={11} />
              </button>
            ) : null}

            {/* Optional deposit to DMarket bot storage */}
            <button
              onClick={() => onDepositItem(item)}
              disabled={isProcessing || isDepositing}
              className="btn btn-secondary btn-sm"
              style={{
                padding: "5px 6px",
                fontSize: "11px",
                fontWeight: 700,
                backgroundColor: "var(--so-surface-panel)",
                borderColor: "var(--so-border-subtle)",
                color: "var(--so-text-muted)",
              }}
              title="Deposit to DMarket bot custody (instead of P2P)"
            >
              {isDepositing ? (
                <Loader2 size={11} className="spin" />
              ) : (
                <ArrowUpRight size={12} />
              )}
            </button>
          </>
        ) : targetPrice ? (
          <>
            <button
              onClick={() => !isLocked && onCreateOffer(item, targetPrice)}
              disabled={isProcessing || isLocked}
              className="btn btn-primary btn-sm"
              style={{
                flex: 1,
                fontWeight: 700,
                fontSize: "10.5px",
                padding: "5px 6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                opacity: isLocked ? 0.65 : 1,
                cursor: isLocked ? "not-allowed" : "pointer",
              }}
              title={
                isLocked
                  ? `Locked on DMarket cooldown: ${cooldown?.formatted} remaining`
                  : `List on DMarket at Oracle price ($${targetPrice.toFixed(2)})`
              }
            >
              {isProcessing ? (
                <Loader2 size={11} className="spin" />
              ) : isLocked ? (
                <Clock size={11} />
              ) : (
                <PlusCircle size={12} />
              )}
              <span>
                {isLocked ? cooldown?.formatted : `List for $${targetPrice.toFixed(2)}`}
              </span>
            </button>

            <button
              onClick={() => !isLocked && onOpenCreateModal(item)}
              disabled={isProcessing || isLocked}
              className="btn btn-secondary btn-sm"
              style={{
                padding: "5px 6px",
                fontSize: "11px",
                fontWeight: 700,
                opacity: isLocked ? 0.65 : 1,
                cursor: isLocked ? "not-allowed" : "pointer",
              }}
              title={
                isLocked
                  ? `Locked on DMarket cooldown: ${cooldown?.formatted} remaining`
                  : "Set custom listing price manually"
              }
            >
              <Edit3 size={11} />
            </button>
          </>
        ) : (
          <button
            onClick={() => !isLocked && onOpenCreateModal(item)}
            disabled={isProcessing || isLocked}
            className="btn btn-secondary btn-sm"
            style={{
              flex: 1,
              fontWeight: 700,
              fontSize: "11px",
              padding: "4px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              opacity: isLocked ? 0.65 : 1,
              cursor: isLocked ? "not-allowed" : "pointer",
            }}
            title={
              isLocked
                ? `Locked on DMarket cooldown: ${cooldown?.formatted} remaining`
                : undefined
            }
          >
            {isLocked ? <Clock size={12} /> : <Tag size={12} />}
            <span>{isLocked ? cooldown?.formatted : "Set Price & List"}</span>
          </button>
        )}
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
    gap: "5px",
    alignItems: "center",
  } as React.CSSProperties,
};
