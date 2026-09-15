import React, { useState, useCallback } from "react";
import {
  DmarketOfferItem,
  DmarketInventoryItem,
} from "../../../../../shared/types";
import { EditOfferModal } from "../../modals/EditOfferModal";
import { CreateListingModal } from "../../modals/CreateListingModal";

import { useListingsData } from "./hooks/useListingsData";
import { useListingsFilter } from "./hooks/useListingsFilter";

import { ListingsToolbar } from "./components/ListingsToolbar";
import { ActiveListingsView } from "./components/ActiveListingsView";
import { InventoryView } from "./components/InventoryView";
import { SalesHistoryView } from "./components/SalesHistoryView";
import { ActiveBatchBar } from "./components/ActiveBatchBar";
import { InventoryBatchBar } from "./components/InventoryBatchBar";

export interface ListingsTabProps {
  hasKey: boolean;
  isSidebarExpanded: boolean;
  checkApiKey: () => Promise<boolean>;
  onOpenLookupModal: (
    name: string,
    targetPrice?: number,
    marketPrice?: number,
    iconUrl?: string,
  ) => void;
  onOpenMarket: (title: string) => void;
  driftThresholdPercent?: number;
}

export const ListingsTab: React.FC<ListingsTabProps> = ({
  hasKey,
  isSidebarExpanded,
  checkApiKey,
  onOpenLookupModal,
  onOpenMarket,
  driftThresholdPercent = 2,
}) => {
  // 1. Data management hook
  const {
    offers,
    offersLoading,
    inventory,
    inventoryLoading,
    steamSyncing,
    closedOffers,
    closedOffersLoading,
    listingAnalysis,
    listingPriceMap,
    loadingListingPrices,
    listingPricesLoaded,
    selectedOffers,
    setSelectedOffers,
    selectedInventory,
    setSelectedInventory,
    listingProcessingId,
    batchListingProcessing,
    depositingAssetId,
    batchDepositing,
    selectedOfferCount,
    selectedInventoryCount,
    dmarketInventoryCount,
    steamInventoryCount,
    selectedSteamCount,
    selectedDmarketCount,
    fetchOffers,
    fetchInventory,
    handleSteamResync,
    handleDepositItem,
    handleBatchDepositSteamItems,
    fetchClosedOffers,
    loadListingPrices,
    handleQuickUpdateOffer,
    handleDeleteOffer,
    handleCreateOffer,
    handleBatchUpdateOffersToOracle,
    handleBatchDelistOffers,
    handleBatchListInventoryAtOracle,
    isItemLocked,
    getItemCooldown,
  } = useListingsData({
    hasKey,
    checkApiKey,
    driftThresholdPercent,
  });

  const lockedSelectedOfferCount = Object.keys(selectedOffers).filter(
    (id) => selectedOffers[id] && isItemLocked(id),
  ).length;

  // 2. Filter & Navigation hook
  const {
    listingSubTab,
    setListingSubTab,
    listingSearch,
    setListingSearch,
    listingFilterAction,
    setListingFilterAction,
    listingModeFilter,
    setListingModeFilter,
    inventoryMarketFilter,
    setInventoryMarketFilter,
    matchedListingCount,
    actionReqListingCount,
    overpricedListingCount,
    underpricedListingCount,
    safeListingCount,
    p2pCount,
    botCount,
    filteredOffers,
    filteredInventory,
  } = useListingsFilter({
    offers,
    inventory,
    listingAnalysis,
  });

  // 3. Modals state
  const [editingOffer, setEditingOffer] = useState<DmarketOfferItem | null>(
    null,
  );
  const [creatingOfferItem, setCreatingOfferItem] =
    useState<DmarketInventoryItem | null>(null);

  // Selection toggle callbacks
  const handleToggleSelectOffer = useCallback((id: string) => {
    setSelectedOffers((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, [setSelectedOffers]);

  const handleToggleSelectInventory = useCallback((assetId: string) => {
    setSelectedInventory((prev) => ({
      ...prev,
      [assetId]: !prev[assetId],
    }));
  }, [setSelectedInventory]);

  const handleResetFilters = useCallback(() => {
    setListingSearch("");
    setListingFilterAction("all");
    setListingModeFilter("all");
    setInventoryMarketFilter("all");
  }, [setListingSearch, setListingFilterAction, setListingModeFilter, setInventoryMarketFilter]);

  return (
    <>
      {/* ── TOOLBAR ────────────────────────────────────────────── */}
      <ListingsToolbar
        listingSubTab={listingSubTab}
        setListingSubTab={setListingSubTab}
        offers={offers}
        inventory={inventory}
        closedOffers={closedOffers}
        offersLoading={offersLoading}
        inventoryLoading={inventoryLoading}
        closedOffersLoading={closedOffersLoading}
        loadingListingPrices={loadingListingPrices}
        listingPricesLoaded={listingPricesLoaded}
        steamSyncing={steamSyncing}
        listingModeFilter={listingModeFilter}
        setListingModeFilter={setListingModeFilter}
        p2pCount={p2pCount}
        botCount={botCount}
        inventoryMarketFilter={inventoryMarketFilter}
        setInventoryMarketFilter={setInventoryMarketFilter}
        dmarketInventoryCount={dmarketInventoryCount}
        steamInventoryCount={steamInventoryCount}
        listingFilterAction={listingFilterAction}
        setListingFilterAction={setListingFilterAction}
        matchedListingCount={matchedListingCount}
        actionReqListingCount={actionReqListingCount}
        overpricedListingCount={overpricedListingCount}
        underpricedListingCount={underpricedListingCount}
        safeListingCount={safeListingCount}
        selectedOfferCount={selectedOfferCount}
        onClearSelectedOffers={() => setSelectedOffers({})}
        selectedInventoryCount={selectedInventoryCount}
        onClearSelectedInventory={() => setSelectedInventory({})}
        listingSearch={listingSearch}
        setListingSearch={setListingSearch}
        onLoadListingPrices={() => loadListingPrices(listingSubTab)}
        onFetchOffers={fetchOffers}
        onFetchInventory={fetchInventory}
        onSteamResync={handleSteamResync}
        onFetchClosedOffers={fetchClosedOffers}
      />

      {/* ── SUB-VIEW: ACTIVE LISTINGS ─────────────────────────── */}
      {listingSubTab === "active" && (
        <ActiveListingsView
          offers={offers}
          filteredOffers={filteredOffers}
          offersLoading={offersLoading}
          listingAnalysis={listingAnalysis}
          selectedOffers={selectedOffers}
          selectedOfferCount={selectedOfferCount}
          listingProcessingId={listingProcessingId}
          getItemCooldown={getItemCooldown}
          onToggleSelect={handleToggleSelectOffer}
          onFetchOffers={fetchOffers}
          onResetFilters={handleResetFilters}
          onOpenMarket={onOpenMarket}
          onOpenLookupModal={onOpenLookupModal}
          onQuickUpdate={handleQuickUpdateOffer}
          onEdit={setEditingOffer}
          onDelete={handleDeleteOffer}
        />
      )}

      {/* ── SUB-VIEW: INVENTORY (UNLISTED) ────────────────────── */}
      {listingSubTab === "inventory" && (
        <InventoryView
          inventory={inventory}
          filteredInventory={filteredInventory}
          inventoryLoading={inventoryLoading}
          listingPriceMap={listingPriceMap}
          selectedInventory={selectedInventory}
          selectedInventoryCount={selectedInventoryCount}
          listingProcessingId={listingProcessingId}
          depositingAssetId={depositingAssetId}
          steamSyncing={steamSyncing}
          getItemCooldown={getItemCooldown}
          onToggleSelect={handleToggleSelectInventory}
          onFetchInventory={fetchInventory}
          onSteamResync={handleSteamResync}
          onResetFilters={handleResetFilters}
          onOpenMarket={onOpenMarket}
          onOpenLookupModal={onOpenLookupModal}
          onCreateOffer={handleCreateOffer}
          onOpenCreateModal={setCreatingOfferItem}
          onDepositItem={handleDepositItem}
        />
      )}

      {/* ── SUB-VIEW: SALES HISTORY ───────────────────────────── */}
      {listingSubTab === "history" && (
        <SalesHistoryView
          closedOffers={closedOffers}
          closedOffersLoading={closedOffersLoading}
          onFetchClosedOffers={fetchClosedOffers}
        />
      )}

      {/* ── FLOATING BATCH ACTIONS PANEL FOR ACTIVE OFFERS ────── */}
      {listingSubTab === "active" && (
        <ActiveBatchBar
          selectedOfferCount={selectedOfferCount}
          lockedOfferCount={lockedSelectedOfferCount}
          isSidebarExpanded={isSidebarExpanded}
          batchListingProcessing={batchListingProcessing}
          onClearSelection={() => setSelectedOffers({})}
          onBatchDelist={handleBatchDelistOffers}
          onBatchUpdateToOracle={handleBatchUpdateOffersToOracle}
        />
      )}

      {/* ── FLOATING BATCH ACTIONS PANEL FOR INVENTORY ────────── */}
      {listingSubTab === "inventory" && (
        <InventoryBatchBar
          selectedInventoryCount={selectedInventoryCount}
          selectedSteamCount={selectedSteamCount}
          selectedDmarketCount={selectedDmarketCount}
          isSidebarExpanded={isSidebarExpanded}
          batchListingProcessing={batchListingProcessing}
          batchDepositing={batchDepositing}
          onClearSelection={() => setSelectedInventory({})}
          onBatchList={handleBatchListInventoryAtOracle}
          onBatchDeposit={handleBatchDepositSteamItems}
        />
      )}

      {/* ── MODALS ────────────────────────────────────────────── */}
      <EditOfferModal
        offer={editingOffer}
        targetListingPrice={
          editingOffer
            ? listingAnalysis[editingOffer.id]?.targetListingPrice
            : undefined
        }
        onClose={() => setEditingOffer(null)}
        onUpdate={handleQuickUpdateOffer}
      />

      <CreateListingModal
        item={creatingOfferItem}
        listingPriceMap={listingPriceMap}
        onClose={() => setCreatingOfferItem(null)}
        onSubmit={handleCreateOffer}
        onDeposit={handleDepositItem}
      />
    </>
  );
};
