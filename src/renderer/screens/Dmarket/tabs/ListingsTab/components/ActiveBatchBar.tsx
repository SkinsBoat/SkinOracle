import React from "react";
import { Loader2, Trash2, Zap, Clock } from "lucide-react";

export interface ActiveBatchBarProps {
  selectedOfferCount: number;
  lockedOfferCount?: number;
  isSidebarExpanded: boolean;
  batchListingProcessing: boolean;
  onClearSelection: () => void;
  onBatchDelist: () => void;
  onBatchUpdateToOracle: () => void;
}

export const ActiveBatchBar: React.FC<ActiveBatchBarProps> = ({
  selectedOfferCount,
  lockedOfferCount = 0,
  isSidebarExpanded,
  batchListingProcessing,
  onClearSelection,
  onBatchDelist,
  onBatchUpdateToOracle,
}) => {
  if (selectedOfferCount <= 0) return null;

  const isAllLocked =
    lockedOfferCount > 0 && lockedOfferCount >= selectedOfferCount;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: isSidebarExpanded ? "258px" : "96px",
        right: "28px",
        zIndex: 1000,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
        backgroundColor: "rgba(17, 24, 39, 0.96)",
        backdropFilter: "blur(12px)",
        color: "#ffffff",
        padding: "12px 20px",
        borderRadius: "var(--so-radius-md)",
        border: "1px solid var(--so-border-medium)",
        boxShadow:
          "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(37, 99, 235, 0.25)",
        boxSizing: "border-box",
        transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontWeight: 700,
          fontSize: "13px",
        }}
      >
        <span
          style={{
            backgroundColor: "rgba(37, 99, 235, 0.2)",
            color: "var(--so-accent-cyan)",
            border: "1px solid var(--so-primary)",
            padding: "2px 9px",
            borderRadius: "4px",
            fontWeight: 900,
            fontSize: "14px",
          }}
        >
          {selectedOfferCount}
        </span>
        <span>OFFERS SELECTED</span>
        {lockedOfferCount > 0 && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 800,
              backgroundColor: "rgba(239, 68, 68, 0.22)",
              color: "#f87171",
              border: "1px solid rgba(239, 68, 68, 0.45)",
            }}
            title="These offers are on DMarket rate-limit cooldown and will be skipped in batch price updates"
          >
            <Clock size={11} />
            <span>{lockedOfferCount} on cooldown</span>
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          onClick={onClearSelection}
          className="btn btn-sm btn-ghost"
          style={{
            fontWeight: 700,
            padding: "6px 14px",
            fontSize: "12px",
            color: "#ffffff",
          }}
        >
          Clear Selection
        </button>


        <button
          onClick={onBatchDelist}
          disabled={batchListingProcessing}
          className="btn btn-danger btn-sm"
          style={{
            fontWeight: 800,
            padding: "6px 14px",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#ffffff",
          }}
        >
          {batchListingProcessing ? (
            <Loader2 size={13} className="spin" />
          ) : (
            <Trash2 size={13} />
          )}
          <span>Delist Selected ({selectedOfferCount})</span>
        </button>

        <button
          onClick={onBatchUpdateToOracle}
          disabled={batchListingProcessing || isAllLocked}
          className="btn btn-primary btn-sm"
          style={{
            fontWeight: 800,
            padding: "6px 18px",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#ffffff",
            opacity: isAllLocked ? 0.6 : 1,
            cursor: isAllLocked ? "not-allowed" : "pointer",
          }}
          title={
            isAllLocked
              ? "All selected offers are on DMarket cooldown"
              : lockedOfferCount > 0
                ? `${selectedOfferCount - lockedOfferCount} offers will be updated (${lockedOfferCount} locked on cooldown will be skipped)`
                : undefined
          }
        >
          {batchListingProcessing ? (
            <Loader2 size={13} className="spin" />
          ) : isAllLocked ? (
            <Clock size={13} />
          ) : (
            <Zap size={13} />
          )}
          <span>
            {isAllLocked
              ? "Locked on Cooldown"
              : lockedOfferCount > 0
                ? `Update ${selectedOfferCount - lockedOfferCount} Offers`
                : "Update to Oracle Price"}
          </span>
        </button>
      </div>
    </div>
  );
};
