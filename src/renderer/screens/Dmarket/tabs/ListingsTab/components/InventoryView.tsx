import React from "react";
import { Package, Loader2, RefreshCw } from "lucide-react";
import {
  DmarketInventoryItem,
  ListingPriceInfo,
} from "../../../../../../shared/types";
import { InventoryItemCard } from "./InventoryItemCard";

export interface InventoryViewProps {
  inventory: DmarketInventoryItem[];
  filteredInventory: DmarketInventoryItem[];
  inventoryLoading: boolean;
  listingPriceMap: Record<string, ListingPriceInfo>;
  selectedInventory: Record<string, boolean>;
  selectedInventoryCount: number;
  listingProcessingId: string | null;
  depositingAssetId: string | null;
  steamSyncing: boolean;
  onToggleSelect: (assetId: string) => void;
  onFetchInventory: () => void;
  onSteamResync: () => void;
  onResetFilters: () => void;
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
  getItemCooldown?: (
    target: string | { id?: string; offerId?: string; assetId?: string },
  ) => { remainingSeconds: number; formatted: string } | null;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  filteredInventory,
  inventoryLoading,
  listingPriceMap,
  selectedInventory,
  selectedInventoryCount,
  listingProcessingId,
  depositingAssetId,
  steamSyncing,
  getItemCooldown,
  onToggleSelect,
  onFetchInventory,
  onSteamResync,
  onResetFilters,
  onOpenMarket,
  onOpenLookupModal,
  onCreateOffer,
  onOpenCreateModal,
  onDepositItem,
}) => {
  return (
    <div style={{ flex: 1, minHeight: 0 }}>
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
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Loader2
                size={32}
                className="spin"
                style={{ color: "var(--so-primary)" }}
              />
              <div>Fetching inventory from DMarket...</div>
            </div>
          ) : (
            <div>
              <Package
                size={32}
                style={{ marginBottom: "10px", opacity: 0.5 }}
              />
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "15px",
                  color: "var(--so-text-primary)",
                  marginBottom: "4px",
                }}
              >
                No unlisted inventory items found
              </div>
              <div
                style={{
                  fontSize: "12px",
                  marginBottom: "16px",
                  maxWidth: "420px",
                  margin: "0 auto 16px",
                  lineHeight: "1.4",
                }}
              >
                No unlisted items currently cached by DMarket. If you
                recently traded or bought items on Steam, trigger a Steam
                Re-sync so DMarket can index them.
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={onFetchInventory}
                  className="btn btn-primary btn-sm"
                  style={{ padding: "6px 16px" }}
                >
                  <RefreshCw size={13} /> Refresh Inventory
                </button>
                <button
                  onClick={onSteamResync}
                  disabled={steamSyncing}
                  className="btn btn-outline btn-sm"
                  style={{ padding: "6px 14px" }}
                >
                  {steamSyncing ? (
                    <Loader2 size={13} className="spin" />
                  ) : (
                    <RefreshCw size={13} />
                  )}
                  <span>Steam Re-sync</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : filteredInventory.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "var(--so-text-muted)",
          }}
        >
          <div>No inventory items match the current filter.</div>
          <button
            onClick={onResetFilters}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: "10px" }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))",
            gap: "10px",
            paddingBottom: selectedInventoryCount > 0 ? "75px" : "12px",
          }}
        >
          {filteredInventory.map((item) => (
            <InventoryItemCard
              key={item.assetId}
              item={item}
              listingPriceMap={listingPriceMap}
              isSelected={!!selectedInventory[item.assetId]}
              isProcessing={listingProcessingId === item.assetId}
              isDepositing={depositingAssetId === item.assetId}
              cooldown={getItemCooldown ? getItemCooldown(item.assetId || item.id) : null}
              onToggleSelect={onToggleSelect}
              onOpenMarket={onOpenMarket}
              onOpenLookupModal={onOpenLookupModal}
              onCreateOffer={onCreateOffer}
              onOpenCreateModal={onOpenCreateModal}
              onDepositItem={onDepositItem}
            />
          ))}
        </div>
      )}
    </div>
  );
};
