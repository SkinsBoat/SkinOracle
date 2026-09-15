import React from "react";
import { Loader2, PlusCircle, ArrowUpRight, Zap } from "lucide-react";
import { steamLogo } from "../../../../../utils/marketLogos";

export interface InventoryBatchBarProps {
  selectedInventoryCount: number;
  selectedSteamCount: number;
  selectedDmarketCount: number;
  isSidebarExpanded: boolean;
  batchListingProcessing: boolean;
  batchDepositing: boolean;
  onClearSelection: () => void;
  onBatchList: (mode: "all" | "p2p" | "bot") => void;
  onBatchDeposit: () => void;
}

export const InventoryBatchBar: React.FC<InventoryBatchBarProps> = ({
  selectedInventoryCount,
  selectedSteamCount,
  selectedDmarketCount,
  isSidebarExpanded,
  batchListingProcessing,
  batchDepositing,
  onClearSelection,
  onBatchList,
  onBatchDeposit,
}) => {
  if (selectedInventoryCount <= 0) return null;

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
          {selectedInventoryCount}
        </span>
        <span>
          ITEMS SELECTED
          {selectedSteamCount > 0 && selectedDmarketCount > 0
            ? ` (${selectedSteamCount} in Steam, ${selectedDmarketCount} on DMarket)`
            : selectedSteamCount > 0
              ? ` (${selectedSteamCount} in Steam — Ready for P2P)`
              : ` (${selectedDmarketCount} on DMarket — Ready for Bot)`}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={onClearSelection}
          className="btn btn-sm btn-ghost"
          style={{
            fontWeight: 700,
            padding: "6px 12px",
            fontSize: "12px",
            color: "#ffffff",
          }}
        >
          Clear Selection
        </button>

        {/* List P2P for Steam items */}
        {selectedSteamCount > 0 && (
          <button
            onClick={() => onBatchList("p2p")}
            disabled={batchListingProcessing}
            className="btn btn-primary btn-sm"
            style={{
              fontWeight: 800,
              padding: "6px 14px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#2563eb",
              borderColor: "#1d4ed8",
              color: "#ffffff",
            }}
            title="List selected Steam items directly via P2P at Oracle prices"
          >
            {batchListingProcessing ? (
              <Loader2 size={13} className="spin" />
            ) : (
              <img
                src={steamLogo}
                alt="Steam"
                style={{ width: "12px", height: "12px", objectFit: "contain" }}
              />
            )}
            <span>List {selectedSteamCount} via P2P</span>
          </button>
        )}

        {/* List Bot for DMarket items */}
        {selectedDmarketCount > 0 && (
          <button
            onClick={() => onBatchList("bot")}
            disabled={batchListingProcessing}
            className="btn btn-cyan btn-sm"
            style={{
              fontWeight: 800,
              padding: "6px 14px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#ffffff",
            }}
            title="List selected DMarket items at Oracle prices"
          >
            {batchListingProcessing ? (
              <Loader2 size={13} className="spin" />
            ) : (
              <PlusCircle size={13} />
            )}
            <span>List {selectedDmarketCount} via Bot</span>
          </button>
        )}

        {/* List All Button if mixed selection */}
        {selectedSteamCount > 0 && selectedDmarketCount > 0 && (
          <button
            onClick={() => onBatchList("all")}
            disabled={batchListingProcessing}
            className="btn btn-success btn-sm"
            style={{
              fontWeight: 800,
              padding: "6px 16px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#ffffff",
            }}
            title="List all selected items at Oracle prices (automatic P2P + Bot routing)"
          >
            {batchListingProcessing ? (
              <Loader2 size={13} className="spin" />
            ) : (
              <Zap size={13} />
            )}
            <span>List All ({selectedInventoryCount}) at Oracle</span>
          </button>
        )}

        {/* Optional Deposit Button for Steam items */}
        {selectedSteamCount > 0 && (
          <button
            onClick={onBatchDeposit}
            disabled={batchDepositing}
            className="btn btn-outline btn-sm"
            style={{
              fontWeight: 700,
              padding: "6px 12px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              color: "var(--so-text-secondary)",
            }}
            title="Deposit Steam items to DMarket bot storage"
          >
            {batchDepositing ? (
              <Loader2 size={13} className="spin" />
            ) : (
              <ArrowUpRight size={13} />
            )}
            <span>Deposit to Bot</span>
          </button>
        )}
      </div>
    </div>
  );
};
