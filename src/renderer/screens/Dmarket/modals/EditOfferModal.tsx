import React, { useState, useEffect } from "react";
import { Edit3, X, Loader2, CheckCircle2, Zap, AlertTriangle } from "lucide-react";
import { DmarketOfferItem } from "../../../../shared/types";
import { resolveInstantPrice } from "../dmarket-utils";
import toast from "react-hot-toast";

interface EditOfferModalProps {
  offer: DmarketOfferItem | null;
  targetListingPrice?: number;
  onClose: () => void;
  onUpdate: (offer: DmarketOfferItem, priceUsd: number) => Promise<void>;
}

export const EditOfferModal: React.FC<EditOfferModalProps> = ({
  offer,
  targetListingPrice,
  onClose,
  onUpdate,
}) => {
  const [price, setPrice] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (offer) {
      const currentPriceDollar = offer.priceCents
        ? offer.priceCents / 100
        : parseFloat(offer.priceUsd) || 0;
      setPrice(currentPriceDollar.toFixed(2));
    }
  }, [offer]);

  if (!offer) return null;

  const currentPriceDollar = offer.priceCents
    ? offer.priceCents / 100
    : parseFloat(offer.priceUsd) || 0;

  const instantPrice = resolveInstantPrice(offer);
  const numPrice = parseFloat(price);
  const isInputBelowInstant = Boolean(
    !isNaN(numPrice) && numPrice > 0 && instantPrice && numPrice < instantPrice
  );
  const isOracleBelowInstant = Boolean(
    targetListingPrice &&
      targetListingPrice > 0 &&
      instantPrice &&
      targetListingPrice < instantPrice
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error("Please enter a valid price");
      return;
    }
    setUpdating(true);
    try {
      await onUpdate(offer, numPrice);
      onClose();
    } catch {
      // Toast handled by caller
    } finally {
      setUpdating(false);
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
      onClick={() => !updating && onClose()}
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
            <Edit3 size={16} style={{ color: "var(--so-primary)" }} /> Edit
            Listing Price
          </h2>
          <button
            onClick={onClose}
            disabled={updating}
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
            src={offer.imageUrl}
            alt={offer.title}
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
              {offer.title}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--so-text-muted)",
                marginTop: "2px",
              }}
            >
              Current Listed:{" "}
              <strong style={{ color: "var(--so-text-primary)" }}>
                ${currentPriceDollar.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>

        {targetListingPrice && targetListingPrice > 0 && (
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
                ${targetListingPrice.toFixed(2)}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setPrice(targetListingPrice.toFixed(2))}
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
              Warning: New price (${numPrice.toFixed(2)}) is BELOW Instant Buy Order (${instantPrice?.toFixed(2)})!
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
              Notice: Oracle target (${targetListingPrice?.toFixed(2)}) is BELOW Instant Buy Order (${instantPrice?.toFixed(2)}).
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
              New Price ($ USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              autoFocus
              required
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
              disabled={updating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={updating}
            >
              {updating ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              <span>{updating ? "Updating..." : "Confirm Price"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
