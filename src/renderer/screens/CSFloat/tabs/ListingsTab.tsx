import React from "react";
import {
  Tag,
  RotateCw,
  Link as LinkIcon,
  Lock,
  Globe,
  Loader2,
  CheckSquare,
  Square,
  RefreshCw,
  X,
  PlusCircle,
  Edit3,
  Trash2,
} from "lucide-react";
import {
  CSFloatListingCard,
  ListingAnalysis,
} from "../components/CSFloatListingCard";

interface ListingsTabProps {
  inventory: any[];
  inventoryLoading: boolean;
  fetchInventory: () => Promise<void>;
  loadingListingPrices: boolean;
  listingPricesLoaded: boolean;
  loadListingPrices: () => Promise<void>;
  isPrivateMode: boolean;
  setIsPrivateMode: React.Dispatch<React.SetStateAction<boolean>>;
  listingAnalysis: Record<string, ListingAnalysis>;
  selectedListingItems: Record<string, boolean>;
  setSelectedListingItems: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  listingProcessingId: string | null;
  batchListingProcessing: boolean;
  handleCreateListing: (item: any, price?: number) => Promise<void>;
  handleUpdateListing: (item: any, price: number) => Promise<void>;
  handleUnlist: (item: any) => Promise<void>;
  handleBatchCreateListings: () => Promise<void>;
  handleBatchUpdateListings: () => Promise<void>;
  handleBatchUnlist: () => Promise<void>;
  handleOpenCsfloatMarket: (name: string) => void;
  handleOpenLookupModal: (
    name: string,
    acceptedPrice?: number,
    currentMarketPrice?: number,
    iconUrl?: string,
  ) => void;
  getWearShortcut: (wearText?: string) => string;
  isSidebarExpanded: boolean;
}

export const ListingsTab: React.FC<ListingsTabProps> = ({
  inventory,
  inventoryLoading,
  fetchInventory,
  loadingListingPrices,
  listingPricesLoaded,
  loadListingPrices,
  isPrivateMode,
  setIsPrivateMode,
  listingAnalysis,
  selectedListingItems,
  setSelectedListingItems,
  listingProcessingId,
  batchListingProcessing,
  handleCreateListing,
  handleUpdateListing,
  handleUnlist,
  handleBatchCreateListings,
  handleBatchUpdateListings,
  handleBatchUnlist,
  handleOpenCsfloatMarket,
  handleOpenLookupModal,
  getWearShortcut,
  isSidebarExpanded,
}) => {
  const selectedListingCount =
    Object.values(selectedListingItems).filter(Boolean).length;
  const listedCount = inventory.filter((i) => !!i.listing_id).length;
  const unlistedCount = inventory.filter((i) => !i.listing_id).length;
  const overpricedCount = inventory.filter(
    (i) => listingAnalysis[i.asset_id]?.isOverpriced,
  ).length;
  const underpricedCount = inventory.filter(
    (i) => listingAnalysis[i.asset_id]?.isUnderpriced,
  ).length;
  const actionReqListingCount = overpricedCount + underpricedCount;
  const matchedListingCount = inventory.filter(
    (i) => !!listingAnalysis[i.asset_id]?.targetListingPrice,
  ).length;

  const selectUnlistedListings = () => {
    const next: Record<string, boolean> = {};
    inventory.forEach((i) => {
      if (!i.listing_id) next[i.asset_id] = true;
    });
    setSelectedListingItems(next);
  };

  const selectActionRequiredListings = () => {
    const next: Record<string, boolean> = {};
    inventory.forEach((i) => {
      const a = listingAnalysis[i.asset_id];
      if (a?.isOverpriced || a?.isUnderpriced) next[i.asset_id] = true;
    });
    setSelectedListingItems(next);
  };

  const selectOverpricedListings = () => {
    const next: Record<string, boolean> = {};
    inventory.forEach((i) => {
      if (listingAnalysis[i.asset_id]?.isOverpriced) next[i.asset_id] = true;
    });
    setSelectedListingItems(next);
  };

  const selectUnderpricedListings = () => {
    const next: Record<string, boolean> = {};
    inventory.forEach((i) => {
      if (listingAnalysis[i.asset_id]?.isUnderpriced) next[i.asset_id] = true;
    });
    setSelectedListingItems(next);
  };

  const selectAllMatchedListings = () => {
    const next: Record<string, boolean> = {};
    inventory.forEach((i) => {
      if (listingAnalysis[i.asset_id]?.targetListingPrice)
        next[i.asset_id] = true;
    });
    setSelectedListingItems(next);
  };

  const clearListingSelection = () => {
    setSelectedListingItems({});
  };

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    inventory.forEach((i) => {
      next[i.asset_id] = true;
    });
    setSelectedListingItems(next);
  };

  const handleInvertSelection = () => {
    const next: Record<string, boolean> = {};
    inventory.forEach((i) => {
      next[i.asset_id] = !selectedListingItems[i.asset_id];
    });
    setSelectedListingItems(next);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        gap: "10px",
        minHeight: 0,
      }}
    >
      {/* Control Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "var(--so-surface-card)",
          border: "1px solid var(--so-border-medium)",
          borderRadius: "var(--so-radius-md)",
          padding: "8px 14px",
          flexWrap: "wrap",
          gap: "10px",
          flexShrink: 0,
        }}
      >
        {/* Left Stats & Private Mode Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: "var(--so-surface-panel)",
              border: "1px solid var(--so-border-medium)",
              padding: "4px 10px",
              borderRadius: "var(--so-radius-sm)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "11.5px",
                fontWeight: 700,
              }}
            >
              <span style={{ color: "var(--so-text-muted)" }}>
                Items:{" "}
                <strong style={{ color: "var(--so-text-primary)" }}>
                  {inventory.length}
                </strong>
              </span>
              <span style={{ color: "var(--so-text-muted)" }}>
                Listed:{" "}
                <strong style={{ color: "var(--so-success-text)" }}>
                  {listedCount}
                </strong>
              </span>
              <span style={{ color: "var(--so-text-muted)" }}>
                Unlisted:{" "}
                <strong style={{ color: "var(--so-accent-cyan)" }}>
                  {unlistedCount}
                </strong>
              </span>
              {overpricedCount > 0 && (
                <span style={{ color: "#ef4444" }}>
                  Overpriced: <strong>{overpricedCount}</strong>
                </span>
              )}
              {underpricedCount > 0 && (
                <span style={{ color: "#f59e0b" }}>
                  Underpriced: <strong>{underpricedCount}</strong>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsPrivateMode((prev) => !prev)}
              className="btn btn-sm"
              style={{
                backgroundColor: isPrivateMode
                  ? "rgba(59, 130, 246, 0.15)"
                  : "rgba(16, 185, 129, 0.15)",
                color: isPrivateMode
                  ? "var(--so-primary)"
                  : "var(--so-success-text)",
                border: `1px solid ${isPrivateMode ? "var(--so-primary)" : "var(--so-success)"}`,
                padding: "3px 8px",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: 800,
                borderRadius: "4px",
              }}
              title="Toggle Private vs Public Mode when creating/updating listings"
            >
              {isPrivateMode ? <Lock size={12} /> : <Globe size={12} />}
              <span>Mode: {isPrivateMode ? "PRIVATE" : "PUBLIC"}</span>
            </button>
          </div>

          {inventory.length > 0 && (
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              {unlistedCount > 0 && (
                <button
                  onClick={selectUnlistedListings}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: "10.5px", padding: "3px 8px" }}
                >
                  Unlisted ({unlistedCount})
                </button>
              )}
              {actionReqListingCount > 0 && (
                <button
                  onClick={selectActionRequiredListings}
                  className="btn btn-warning btn-sm"
                  style={{ fontSize: "10.5px", padding: "3px 8px" }}
                >
                  Action Req ({actionReqListingCount})
                </button>
              )}
              {overpricedCount > 0 && (
                <button
                  onClick={selectOverpricedListings}
                  className="btn btn-danger btn-sm"
                  style={{ fontSize: "10.5px", padding: "3px 8px" }}
                >
                  Overpriced ({overpricedCount})
                </button>
              )}
              {underpricedCount > 0 && (
                <button
                  onClick={selectUnderpricedListings}
                  className="btn btn-warning btn-sm"
                  style={{ fontSize: "10.5px", padding: "3px 8px" }}
                >
                  Underpriced ({underpricedCount})
                </button>
              )}
              {matchedListingCount > 0 && (
                <button
                  onClick={selectAllMatchedListings}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: "10.5px", padding: "3px 8px" }}
                >
                  All Matched ({matchedListingCount})
                </button>
              )}
              {selectedListingCount > 0 && (
                <button
                  onClick={clearListingSelection}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: "10.5px", padding: "3px 8px" }}
                >
                  Clear ({selectedListingCount})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Action Buttons */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            onClick={fetchInventory}
            disabled={inventoryLoading}
            className="btn btn-primary btn-sm"
            style={{ fontSize: "12px", padding: "5px 12px" }}
          >
            {inventoryLoading ? (
              <Loader2 size={13} className="spin" />
            ) : (
              <RotateCw size={13} />
            )}{" "}
            Sync Inventory
          </button>
          <button
            onClick={loadListingPrices}
            disabled={loadingListingPrices || inventory.length === 0}
            className={`btn ${listingPricesLoaded ? "btn-secondary" : "btn-outline"} btn-sm`}
            style={{ fontSize: "12px", padding: "5px 12px" }}
          >
            {loadingListingPrices ? (
              <Loader2 size={13} className="spin" />
            ) : (
              <LinkIcon size={13} />
            )}
            {listingPricesLoaded
              ? "Reload Listing Prices"
              : "Load Listing Prices"}
          </button>
        </div>
      </div>

      {/* Floating Selection Toolbar */}
      {selectedListingCount > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: isSidebarExpanded ? "246px" : "84px",
            right: "24px",
            zIndex: 1000,
            backgroundColor: "rgba(23, 23, 33, 0.94)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--so-primary)",
            borderRadius: "var(--so-radius-md)",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(99, 102, 241, 0.25)",
            padding: "12px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            animation: "slideUp 0.2s ease-out",
            transition: "left 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <CheckSquare size={16} style={{ color: "var(--so-primary)" }} />
              <span>{selectedListingCount} Selected Items</span>
            </span>
            <div
              style={{
                width: "1px",
                height: "16px",
                backgroundColor: "var(--so-border-subtle)",
              }}
            />
            <button
              onClick={handleSelectAll}
              className="btn btn-sm btn-ghost"
              style={{
                fontSize: "11px",
                padding: "3px 8px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <CheckSquare size={12} /> Select All
            </button>
            <button
              onClick={handleInvertSelection}
              className="btn btn-sm btn-ghost"
              style={{
                fontSize: "11px",
                padding: "3px 8px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <RefreshCw size={12} /> Invert
            </button>
            <button
              onClick={clearListingSelection}
              className="btn btn-sm btn-ghost"
              style={{
                fontSize: "11px",
                padding: "3px 8px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                color: "var(--so-text-primary)",
              }}
            >
              <Square size={12} /> Clear Selection
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={handleBatchCreateListings}
              disabled={batchListingProcessing}
              className="btn btn-primary btn-sm"
              style={{
                fontWeight: 800,
                fontSize: "12px",
                padding: "6px 14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {batchListingProcessing ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <PlusCircle size={13} />
              )}
              List Selected ({selectedListingCount})
            </button>
            <button
              onClick={handleBatchUpdateListings}
              disabled={batchListingProcessing}
              className="btn btn-warning btn-sm"
              style={{
                fontWeight: 800,
                fontSize: "12px",
                padding: "6px 14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {batchListingProcessing ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <Edit3 size={13} />
              )}
              Reprice Selected ({selectedListingCount})
            </button>
            <button
              onClick={handleBatchUnlist}
              disabled={batchListingProcessing}
              className="btn btn-danger btn-sm"
              style={{
                fontWeight: 800,
                fontSize: "12px",
                padding: "6px 14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {batchListingProcessing ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <Trash2 size={13} />
              )}
              Unlist Selected ({selectedListingCount})
            </button>
            <button
              onClick={clearListingSelection}
              className="btn btn-sm btn-ghost"
              style={{
                padding: "6px",
                borderRadius: "50%",
                color: "var(--so-text-primary)",
              }}
              title="Clear selection"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Inventory Grid View */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {inventory.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "50px 20px",
              color: "var(--so-text-muted)",
            }}
          >
            {inventoryLoading ? (
              <div>Fetching CSFloat user inventory...</div>
            ) : (
              <div>
                <Tag size={32} style={{ marginBottom: "10px", opacity: 0.5 }} />
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "15px",
                    color: "var(--so-text-primary)",
                    marginBottom: "4px",
                  }}
                >
                  No inventory items loaded
                </div>
                <div style={{ fontSize: "12px" }}>
                  Click "Sync Inventory" above to sync your items from CSFloat
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
              gap: "10px",
              paddingBottom: selectedListingCount > 0 ? "75px" : "12px",
            }}
          >
            {inventory.map((item) => {
              const analysis = listingAnalysis[item.asset_id];
              const isSelected = !!selectedListingItems[item.asset_id];
              const isProcessing = listingProcessingId === item.asset_id;
              const name =
                item.market_hash_name || item.item_name || "CS:GO Item";
              const match = name.match(/^(.+?)\s*\(([^)]+)\)$/);
              const wearText = match ? match[2] : item.wear_name || "";
              const wearShortcut = getWearShortcut(wearText);

              return (
                <CSFloatListingCard
                  key={item.asset_id}
                  item={item}
                  isSelected={isSelected}
                  onToggleSelect={() =>
                    setSelectedListingItems((prev) => ({
                      ...prev,
                      [item.asset_id]: !prev[item.asset_id],
                    }))
                  }
                  analysis={analysis}
                  isProcessing={isProcessing}
                  isPrivateMode={isPrivateMode}
                  onCreateListing={handleCreateListing}
                  onUpdateListing={handleUpdateListing}
                  onUnlist={handleUnlist}
                  onOpenMarket={handleOpenCsfloatMarket}
                  onOpenLookup={handleOpenLookupModal}
                  wearShortcut={wearShortcut}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
