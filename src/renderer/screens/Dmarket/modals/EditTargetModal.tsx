import React, { useState, useEffect } from "react";
import { Edit3, X, Loader2, CheckCircle2 } from "lucide-react";
import { DmarketTargetItem } from "../../../../shared/types";
import { TargetAnalysis } from "../dmarket-utils";
import toast from "react-hot-toast";

interface EditTargetModalProps {
  target: DmarketTargetItem | null;
  targetAnalysis?: TargetAnalysis;
  onClose: () => void;
  onUpdate: (
    target: DmarketTargetItem,
    newPriceUsd: number,
    newAmount: number,
  ) => Promise<void>;
}

export const EditTargetModal: React.FC<EditTargetModalProps> = ({
  target,
  targetAnalysis,
  onClose,
  onUpdate,
}) => {
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (target) {
      setPrice((parseFloat(target.priceCents) / 100).toFixed(2));
      setAmount(target.amount || "1");
    }
  }, [target]);

  if (!target) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price);
    const numAmount = parseInt(amount, 10);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error("Please enter a valid target price in USD");
      return;
    }

    setSubmitting(true);
    try {
      await onUpdate(
        target,
        numPrice,
        isNaN(numAmount) || numAmount < 1 ? 1 : numAmount,
      );
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
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={() => !submitting && onClose()}
    >
      <div
        style={{
          backgroundColor: "var(--so-surface-card)",
          border: "1px solid var(--so-border-medium)",
          borderRadius: "var(--so-radius-md)",
          width: "460px",
          maxWidth: "90vw",
          padding: "22px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
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
          <div
            style={{
              fontWeight: 800,
              fontSize: "16px",
              color: "var(--so-text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Edit3 size={18} style={{ color: "var(--so-primary)" }} /> Edit
            Target Price
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              background: "none",
              border: "none",
              color: "var(--so-text-muted)",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--so-text-primary)",
            }}
          >
            {target.title}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--so-text-muted)",
              marginTop: "2px",
            }}
          >
            Current Target Price: $
            {(parseFloat(target.priceCents) / 100).toFixed(2)}
          </div>
        </div>

        {targetAnalysis?.acceptedPrice && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "var(--so-radius-sm)",
              backgroundColor: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span style={{ fontSize: "12px", color: "var(--so-text-muted)" }}>
                Oracle Accepted Price:{" "}
              </span>
              <strong
                style={{ color: "var(--so-accent-cyan)", fontSize: "13.5px" }}
              >
                ${targetAnalysis.acceptedPrice.toFixed(2)}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setPrice(targetAnalysis.acceptedPrice.toFixed(2))}
              style={{
                padding: "3px 8px",
                fontSize: "11px",
                fontWeight: 700,
                borderRadius: "4px",
                border: "1px solid var(--so-accent-cyan)",
                backgroundColor: "transparent",
                color: "var(--so-accent-cyan)",
                cursor: "pointer",
              }}
            >
              Use This Price
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
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
                New Target Price ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
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
                Quantity
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "6px",
            }}
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
                <CheckCircle2 size={14} />
              )}
              <span>{submitting ? "Updating..." : "Confirm Update"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
