import React, { useState } from "react";
import {
  Tag,
  X,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  PlusCircle,
  Zap,
} from "lucide-react";
import {
  DmarketInventoryItem,
  ListingPriceInfo,
} from "../../../../shared/types";
import {
  getTradeTitle,
  getItemListingPriceWithMap,
  resolveInstantPrice,
} from "../dmarket-utils";
import { steamLogo } from "../../../utils/marketLogos";
import toast from "react-hot-toast";

interface CreateListingModalProps {
  item: DmarketInventoryItem | null;
  listingPriceMap: Record<string, ListingPriceInfo>;
  onClose: () => void;
  onSubmit: (item: DmarketInventoryItem, priceUsd: number) => Promise<void>;
  onDeposit: (item: DmarketInventoryItem) => Promise<void>;
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
  item,
  listingPriceMap,
  onClose,
  onSubmit,
  onDeposit,
}) => {
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!item) return null;

  const oracleEntry = getItemListingPriceWithMap(item, listingPriceMap);
  const tradeTitle = getTradeTitle(item);
  const instantPrice = resolveInstantPrice(item);
  const numPrice = parseFloat(price);
  const isInputBelowInstant = Boolean(
    !isNaN(numPrice) && numPrice > 0 && instantPrice && numPrice < instantPrice
  );
  const isOracleBelowInstant = Boolean(
    oracleEntry?.listingPrice &&
      instantPrice &&
      oracleEntry.listingPrice < instantPrice
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error("Please enter a valid listing price");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(item, numPrice);
      onClose();
    } catch {
      // Toast handled by caller
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={() => !submitting && onClose()}
    >
      <div
        style={{
          backgroundColor: "var(--so-surface-card)",
          border: "1px solid var(--so-border-medium)",
          borderRadius: "var(--so-radius-md)",
          maxWidth: "460px",
          width: "100%",
          padding: "22px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              fontSize: "16px",
              fontWeight: 800,
              color: "var(--so-text-primary)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Tag size={16} style={{ color: "var(--so-primary)" }} /> List Item
            on DMarket
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="btn btn-secondary btn-sm"
            style={{ padding: "4px", borderRadius: "50%" }}
          >
            <X size={14} />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px",
            backgroundColor: "var(--so-surface-panel)",
            borderRadius: "var(--so-radius-sm)",
            border: "1px solid var(--so-border-subtle)",
          }}
        >
          <img
            src={
              item.imageUrl ||
              (item.title
                ? `https://api.steamapis.com/image/item/730/${encodeURIComponent(tradeTitle)}`
                : "")
            }
            alt={item.title}
            onError={(e) => {
              const imgEl = e.target as HTMLImageElement;
              const fallback = `https://api.steamapis.com/image/item/730/${encodeURIComponent(tradeTitle)}`;
              if (imgEl.src !== fallback) {
                imgEl.src = fallback;
              } else {
                imgEl.style.opacity = "0.3";
              }
            }}
            style={{ width: "45px", height: "45px", objectFit: "contain" }}
          />
          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: "13px",
                color: "var(--so-text-primary)",
              }}
            >
              {tradeTitle}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--so-text-muted)",
                marginTop: "2px",
              }}
            >
              Location:{" "}
              <strong
                style={{
                  color: item.inMarket ? "var(--so-success-text)" : "#60a5fa",
                }}
              >
                {item.inMarket ? "On DMarket (Ready)" : "In Steam Inventory"}
              </strong>{" "}
              • Status:{" "}
              <strong
                style={{
                  color: item.tradable ? "var(--so-success-text)" : "#f59e0b",
                }}
              >
                {item.tradable ? "Tradable" : "Trade Locked"}
              </strong>
            </div>
          </div>
        </div>

        {!item.inMarket && (
          <div
            style={{
              backgroundColor: "rgba(37, 99, 235, 0.1)",
              border: "1px solid rgba(37, 99, 235, 0.3)",
              borderRadius: "var(--so-radius-sm)",
              padding: "11px 14px",
              fontSize: "12px",
              color: "#93c5fd",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 700,
                color: "#60a5fa",
              }}
            >
              <img
                src={steamLogo}
                alt="Steam"
                style={{ width: "13px", height: "13px", objectFit: "contain" }}
              />
              <span>Listing via Steam P2P Mode</span>
            </div>
            <div
              style={{
                color: "var(--so-text-secondary)",
                fontSize: "11.5px",
                lineHeight: 1.4,
              }}
            >
              This skin is in your Steam inventory and will be listed directly via P2P mode (no deposit required). Or if you prefer DMarket bot custody, you can deposit it first.
            </div>
            <button
              type="button"
              onClick={async () => {
                onClose();
                await onDeposit(item);
              }}
              className="btn btn-secondary btn-sm"
              style={{
                alignSelf: "flex-start",
                marginTop: "2px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
              }}
            >
              <ArrowUpRight size={12} />
              <span>Or Deposit to DMarket Bot</span>
            </button>
          </div>
        )}

        {oracleEntry?.listingPrice && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "rgba(14, 165, 233, 0.08)",
              border: "1px solid rgba(14, 165, 233, 0.25)",
              padding: "8px 12px",
              borderRadius: "var(--so-radius-sm)",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--so-text-muted)" }}>
              Oracle Target Price:{" "}
              <strong style={{ color: "var(--so-success-text)" }}>
                ${oracleEntry.listingPrice.toFixed(2)}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setPrice(oracleEntry.listingPrice.toFixed(2))}
              className="btn btn-primary btn-sm"
              style={{ fontSize: "10.5px", padding: "2px 8px" }}
            >
              Use Oracle Price
            </button>
          </div>
        )}

        {instantPrice && instantPrice > 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: isInputBelowInstant
                ? "rgba(239, 68, 68, 0.12)"
                : "rgba(245, 158, 11, 0.1)",
              border: `1px solid ${
                isInputBelowInstant
                  ? "rgba(239, 68, 68, 0.35)"
                  : "rgba(245, 158, 11, 0.3)"
              }`,
              padding: "8px 12px",
              borderRadius: "var(--so-radius-sm)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Zap
                size={13}
                style={{
                  color: isInputBelowInstant ? "#f87171" : "#f59e0b",
                  fill: isInputBelowInstant ? "#f87171" : "#f59e0b",
                }}
              />
              <span style={{ fontSize: "12px", color: "var(--so-text-secondary)" }}>
                Instant Buy Order:{" "}
                <strong
                  style={{
                    color: isInputBelowInstant ? "#f87171" : "#f59e0b",
                  }}
                >
                  ${instantPrice.toFixed(2)}
                </strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPrice(instantPrice.toFixed(2))}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: "10.5px",
                padding: "2px 8px",
                borderColor: "rgba(245, 158, 11, 0.4)",
              }}
              title="Match highest active buy order"
            >
              Use Instant Price
            </button>
          </div>
        ) : null}

        {isInputBelowInstant && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(239, 68, 68, 0.14)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: "var(--so-radius-sm)",
              padding: "8px 12px",
              fontSize: "11.5px",
              color: "#f87171",
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0, color: "#f87171" }} />
            <span>
              Warning: Listing price (${numPrice.toFixed(2)}) is BELOW Instant Buy Order (${instantPrice?.toFixed(2)})!
            </span>
          </div>
        )}

        {!isInputBelowInstant && isOracleBelowInstant && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              borderRadius: "var(--so-radius-sm)",
              padding: "8px 12px",
              fontSize: "11.5px",
              color: "#f59e0b",
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0, color: "#f59e0b" }} />
            <span>
              Notice: Oracle target (${oracleEntry?.listingPrice?.toFixed(2)}) is BELOW Instant Buy Order (${instantPrice?.toFixed(2)}).
            </span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--so-text-secondary)",
                marginBottom: "5px",
              }}
            >
              Listing Price ($ USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              autoFocus
              required
              placeholder="e.g. 15.50"
              style={{
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "var(--so-surface-input)",
                color: "var(--so-text-primary)",
                border: "1px solid var(--so-border-medium)",
                borderRadius: "var(--so-radius-sm)",
                padding: "10px 14px",
                fontSize: "14px",
                fontWeight: 700,
              }}
            />
          </div>

          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <PlusCircle size={14} />
              )}
              <span>
                {submitting
                  ? "Listing..."
                  : !item.inMarket
                    ? "List via P2P"
                    : "Confirm & List"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
