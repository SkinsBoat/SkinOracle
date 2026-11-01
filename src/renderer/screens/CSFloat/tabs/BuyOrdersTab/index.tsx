import React, { useMemo, useState } from "react";
import { OrderDriftDetails } from "../../components/CSFloatOrderCard";
import {
  BuyOrderSortDir,
  BuyOrderSortKey,
  BuyOrderStatusFilter,
  BuyOrdersToolbar,
} from "./BuyOrdersToolbar";
import { BuyOrdersSelectionBar } from "./BuyOrdersSelectionBar";
import { BuyOrdersGrid } from "./BuyOrdersGrid";

export interface BuyOrdersTabProps {
  orders: any[];
  setOrders: React.Dispatch<React.SetStateAction<any[]>>;
  loading: boolean;
  fetchOrders: () => Promise<void>;
  loadingPrices: boolean;
  pricesLoaded: boolean;
  loadAcceptedPrices: () => Promise<void>;
  driftThresholdPercent: number;
  setDriftThresholdPercent: React.Dispatch<React.SetStateAction<number>>;
  getOrderDriftDetails: (order: any) => OrderDriftDetails | null;
  selectedItems: Record<string, boolean>;
  setSelectedItems: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  processingId: string | null;
  batchProcessing: boolean;
  handleManualUpdate: (
    orderId: string,
    marketHashName: string,
    targetPrice: number,
    quantity: number,
  ) => Promise<void>;
  handleDeleteOrder: (orderId: string) => Promise<void>;
  handleBatchUpdate: (options?: { deleteUnmatched?: boolean }) => Promise<void>;
  handleBatchDelete: () => Promise<void>;
  handleDeleteAllOrders: () => Promise<void>;
  handleOpenCsfloatMarket: (name: string) => void;
  handleOpenLookupModal: (
    name: string,
    acceptedPrice?: number,
    currentPrice?: number,
  ) => void;
  isSidebarExpanded: boolean;
  selectedOrdersTotal?: number;
  maxLimitValue?: number;
  userBalance?: number;
}

/**
 * CSFloat buy-order book shell. Keeps business/selection logic here and
 * delegates rendering to summary, toolbar, selection bar, and grid components.
 */
export const BuyOrdersTab: React.FC<BuyOrdersTabProps> = ({
  orders,
  setOrders,
  loading,
  fetchOrders,
  loadingPrices,
  pricesLoaded,
  loadAcceptedPrices,
  driftThresholdPercent,
  setDriftThresholdPercent,
  getOrderDriftDetails,
  selectedItems,
  setSelectedItems,
  processingId,
  batchProcessing,
  handleManualUpdate,
  handleDeleteOrder,
  handleBatchUpdate,
  handleBatchDelete,
  handleDeleteAllOrders,
  handleOpenCsfloatMarket,
  handleOpenLookupModal,
  isSidebarExpanded,
  selectedOrdersTotal = 0,
  userBalance,
}) => {
  const [deleteUnmatched, setDeleteUnmatched] = useState(false);
  const [statusFilter, setStatusFilter] =
    useState<BuyOrderStatusFilter>("all");
  const [sortKey, setSortKey] = useState<BuyOrderSortKey>("price");
  const [sortDir, setSortDir] = useState<BuyOrderSortDir>("desc");

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;

  const exceedsBalanceOrders = useMemo(() => {
    if (typeof userBalance !== "number" || userBalance < 0) return [];
    return orders.filter((o) => o.price / 100 > userBalance);
  }, [orders, userBalance]);

  const isOrderAdvanced = (o: any) =>
    Boolean(
      o?.hybrid_properties &&
        typeof o.hybrid_properties === "object" &&
        Object.keys(o.hybrid_properties).length > 0,
    );

  const advancedOrders = useMemo(
    () => orders.filter(isOrderAdvanced),
    [orders],
  );

  const driftOrders = useMemo(
    () =>
      orders.filter((o) => {
        const d = getOrderDriftDetails(o);
        return d?.isOverbid || d?.isUnderbid;
      }),
    [orders, getOrderDriftDetails],
  );

  const unmatchedOrders = useMemo(
    () =>
      orders.filter(
        (o) => pricesLoaded && !getOrderDriftDetails(o)?.acceptedPrice,
      ),
    [orders, pricesLoaded, getOrderDriftDetails],
  );

  const actionRequiredOrders = useMemo(
    () =>
      orders.filter((o) => {
        const d = getOrderDriftDetails(o);
        const isUnmatched = pricesLoaded && !d?.acceptedPrice;
        const currentPrice = o.price / 100;
        const isExceeds =
          typeof userBalance === "number" &&
          userBalance >= 0 &&
          currentPrice > userBalance;
        return d?.isOverbid || d?.isUnderbid || isUnmatched || isExceeds;
      }),
    [orders, getOrderDriftDetails, pricesLoaded, userBalance],
  );

  const filteredOrders = useMemo(() => {
    switch (statusFilter) {
      case "action":
        return actionRequiredOrders;
      case "exceeds":
        return exceedsBalanceOrders;
      case "drift":
        return driftOrders;
      case "unmatched":
        return unmatchedOrders;
      case "advanced":
        return advancedOrders;
      case "all":
      default:
        return orders;
    }
  }, [
    statusFilter,
    orders,
    actionRequiredOrders,
    exceedsBalanceOrders,
    driftOrders,
    unmatchedOrders,
    advancedOrders,
  ]);

  const displayedOrders = useMemo(() => {
    const sorted = [...filteredOrders];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "price":
          comparison = (Number(a.price) || 0) - (Number(b.price) || 0);
          break;
        case "quantity":
          comparison =
            (Number(a.qty) || Number(a.quantity) || 0) -
            (Number(b.qty) || Number(b.quantity) || 0);
          break;
        case "drift": {
          const aDrift = Math.abs(
            getOrderDriftDetails(a)?.driftPercent ?? 0,
          );
          const bDrift = Math.abs(
            getOrderDriftDetails(b)?.driftPercent ?? 0,
          );
          comparison = aDrift - bDrift;
          break;
        }
        case "name":
          comparison = String(a.market_hash_name || "").localeCompare(
            String(b.market_hash_name || ""),
          );
          break;
        default:
          comparison = 0;
      }
      return sortDir === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [filteredOrders, sortKey, sortDir, getOrderDriftDetails]);

  const unmatchedSelectedCount = useMemo(
    () =>
      orders.filter(
        (o) => selectedItems[o.id] && !getOrderDriftDetails(o)?.acceptedPrice,
      ).length,
    [orders, selectedItems, getOrderDriftDetails],
  );

  const matchedSelectedCount = selectedCount - unmatchedSelectedCount;
  const isOnlyUnmatchedSelected =
    selectedCount > 0 && matchedSelectedCount === 0;

  const isAllActionRequiredSelected =
    actionRequiredOrders.length > 0 &&
    actionRequiredOrders.every((o) => !!selectedItems[o.id]);

  const isAllExceedsSelected =
    exceedsBalanceOrders.length > 0 &&
    exceedsBalanceOrders.every((o) => !!selectedItems[o.id]);

  const isAllUnmatchedSelected =
    unmatchedOrders.length > 0 &&
    unmatchedOrders.every((o) => !!selectedItems[o.id]);

  const isAllFilteredSelected =
    displayedOrders.length > 0 &&
    displayedOrders.every((o) => !!selectedItems[o.id]);

  const handleToggleSelectFiltered = () => {
    const next = { ...selectedItems };
    if (isAllFilteredSelected) {
      displayedOrders.forEach((o) => delete next[o.id]);
    } else {
      displayedOrders.forEach((o) => {
        next[o.id] = true;
      });
    }
    setSelectedItems(next);
  };

  const handleSetStatusFilter = (newFilter: BuyOrderStatusFilter) => {
    if (newFilter !== statusFilter) {
      setSelectedItems({});
      setStatusFilter(newFilter);
    }
  };

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    (statusFilter === "all" ? orders : displayedOrders).forEach((o) => {
      next[o.id] = true;
    });
    setSelectedItems(next);
  };

  const handleDeselectAll = () => setSelectedItems({});

  const toggleSelectionSet = (
    targets: any[],
    allSelected: boolean,
  ) => {
    const next = { ...selectedItems };
    if (allSelected) {
      targets.forEach((o) => delete next[o.id]);
    } else {
      targets.forEach((o) => {
        next[o.id] = true;
      });
    }
    setSelectedItems(next);
  };

  const handleUpdateQuantity = (orderId: string, newQty: number) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, qty: newQty } : o)),
    );
  };

  return (
    <div style={styles.container}>
      <BuyOrdersToolbar
        totalOrders={orders.length}
        actionRequiredCount={actionRequiredOrders.length}
        exceedsBalanceCount={exceedsBalanceOrders.length}
        driftCount={driftOrders.length}
        unmatchedCount={unmatchedOrders.length}
        advancedCount={advancedOrders.length}
        displayedCount={displayedOrders.length}
        statusFilter={statusFilter}
        onSetStatusFilter={handleSetStatusFilter}
        isAllFilteredSelected={isAllFilteredSelected}
        onToggleSelectFiltered={handleToggleSelectFiltered}
        driftThresholdPercent={driftThresholdPercent}
        onDriftThresholdChange={setDriftThresholdPercent}
        batchProcessing={batchProcessing}
        onDeleteAllOrders={handleDeleteAllOrders}
        loading={loading}
        onSync={fetchOrders}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={(nextKey, nextDir) => {
          setSortKey(nextKey);
          setSortDir(nextDir);
        }}
        userBalance={userBalance}
      />

      <BuyOrdersSelectionBar
        selectedCount={selectedCount}
        selectedOrdersTotal={selectedOrdersTotal}
        totalOrders={orders.length}
        actionRequiredCount={actionRequiredOrders.length}
        exceedsBalanceCount={exceedsBalanceOrders.length}
        unmatchedCount={unmatchedOrders.length}
        unmatchedSelectedCount={unmatchedSelectedCount}
        isAllActionRequiredSelected={isAllActionRequiredSelected}
        isAllExceedsSelected={isAllExceedsSelected}
        isAllUnmatchedSelected={isAllUnmatchedSelected}
        deleteUnmatched={deleteUnmatched}
        onToggleDeleteUnmatched={() =>
          setDeleteUnmatched((previous) => !previous)
        }
        batchProcessing={batchProcessing}
        isOnlyUnmatchedSelected={isOnlyUnmatchedSelected}
        isSidebarExpanded={isSidebarExpanded}
        onSelectAll={handleSelectAll}
        onToggleSelectActionRequired={() =>
          toggleSelectionSet(actionRequiredOrders, isAllActionRequiredSelected)
        }
        onToggleSelectExceeds={() =>
          toggleSelectionSet(exceedsBalanceOrders, isAllExceedsSelected)
        }
        onToggleSelectUnmatched={() =>
          toggleSelectionSet(unmatchedOrders, isAllUnmatchedSelected)
        }
        onDeselectAll={handleDeselectAll}
        onBatchUpdate={() => handleBatchUpdate({ deleteUnmatched })}
        onBatchDelete={handleBatchDelete}
      />

      <BuyOrdersGrid
        orders={orders}
        displayedOrders={displayedOrders}
        loading={loading}
        statusFilter={statusFilter}
        selectedItems={selectedItems}
        processingId={processingId}
        pricesLoaded={pricesLoaded}
        userBalance={userBalance}
        hasSelection={selectedCount > 0}
        onToggleSelect={(orderId) =>
          setSelectedItems((prev) => ({
            ...prev,
            [orderId]: !prev[orderId],
          }))
        }
        getOrderDriftDetails={getOrderDriftDetails}
        onManualUpdate={handleManualUpdate}
        onDeleteOrder={handleDeleteOrder}
        onOpenMarket={handleOpenCsfloatMarket}
        onOpenLookup={handleOpenLookupModal}
        onUpdateQuantity={handleUpdateQuantity}
        onResetFilter={() => setStatusFilter("all")}
        onSync={fetchOrders}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    gap: "10px",
    minHeight: 0,
  },
};
