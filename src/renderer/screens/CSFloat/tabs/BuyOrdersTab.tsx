import React, { useState, useMemo } from "react";
import {
  Package,
  RotateCw,
  Link as LinkIcon,
  Sliders,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Trash2,
  CheckSquare,
  Square,
  X,
  Wallet,
  HelpCircle,
} from "lucide-react";
import {
  CSFloatOrderCard,
  OrderDriftDetails,
} from "../components/CSFloatOrderCard";

interface BuyOrdersTabProps {
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
  maxLimitValue = 0,
  userBalance,
}) => {
  const [showExtraActions, setShowExtraActions] = useState(false);
  const [deleteUnmatched, setDeleteUnmatched] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "action" | "exceeds" | "drift" | "unmatched" | "advanced"
  >("all");

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const matchedCount = orders.filter(
    (o) => getOrderDriftDetails(o) !== null,
  ).length;

  const exceedsBalanceOrders = useMemo(() => {
    if (typeof userBalance !== "number" || userBalance < 0) return [];
    return orders.filter((o) => o.price / 100 > userBalance);
  }, [orders, userBalance]);

  const exceedsBalanceCount = exceedsBalanceOrders.length;

  const isOrderAdvanced = (o: any) =>
    Boolean(
      o?.hybrid_properties &&
        typeof o.hybrid_properties === "object" &&
        Object.keys(o.hybrid_properties).length > 0,
    );

  const advancedOrders = useMemo(() => {
    return orders.filter(isOrderAdvanced);
  }, [orders]);

  const advancedCount = advancedOrders.length;

  const driftOrders = useMemo(() => {
    return orders.filter((o) => {
      const d = getOrderDriftDetails(o);
      return d?.isOverbid || d?.isUnderbid;
    });
  }, [orders, getOrderDriftDetails]);

  const unmatchedOrders = useMemo(() => {
    return orders.filter(
      (o) => pricesLoaded && !getOrderDriftDetails(o)?.acceptedPrice,
    );
  }, [orders, pricesLoaded, getOrderDriftDetails]);

  const actionRequiredOrders = useMemo(() => {
    return orders.filter((o) => {
      const d = getOrderDriftDetails(o);
      const isUnmatched = pricesLoaded && !d?.acceptedPrice;
      const currentPrice = o.price / 100;
      const isExceeds =
        typeof userBalance === "number" &&
        userBalance >= 0 &&
        currentPrice > userBalance;
      return d?.isOverbid || d?.isUnderbid || isUnmatched || isExceeds;
    });
  }, [orders, getOrderDriftDetails, pricesLoaded, userBalance]);

  const actionRequiredCount = actionRequiredOrders.length;

  const displayedOrders = useMemo(() => {
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

  const unmatchedSelectedCount = useMemo(() => {
    return orders.filter(
      (o) => selectedItems[o.id] && !getOrderDriftDetails(o)?.acceptedPrice,
    ).length;
  }, [orders, selectedItems, getOrderDriftDetails]);

  const matchedSelectedCount = selectedCount - unmatchedSelectedCount;
  const isOnlyUnmatchedSelected =
    selectedCount > 0 && matchedSelectedCount === 0;

  const isAllActionRequiredSelected =
    actionRequiredCount > 0 &&
    actionRequiredOrders.every((o) => !!selectedItems[o.id]);

  const isAllExceedsSelected =
    exceedsBalanceCount > 0 &&
    exceedsBalanceOrders.every((o) => !!selectedItems[o.id]);

  const isAllUnmatchedSelected =
    unmatchedOrders.length > 0 &&
    unmatchedOrders.every((o) => !!selectedItems[o.id]);

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    (statusFilter === "all" ? orders : displayedOrders).forEach((o) => {
      next[o.id] = true;
    });
    setSelectedItems(next);
  };

  const handleDeselectAll = () => {
    setSelectedItems({});
  };

  const handleToggleSelectActionRequired = () => {
    const next = { ...selectedItems };
    if (isAllActionRequiredSelected) {
      actionRequiredOrders.forEach((o) => {
        delete next[o.id];
      });
    } else {
      actionRequiredOrders.forEach((o) => {
        next[o.id] = true;
      });
    }
    setSelectedItems(next);
  };

  const handleToggleSelectExceeds = () => {
    const next = { ...selectedItems };
    if (isAllExceedsSelected) {
      exceedsBalanceOrders.forEach((o) => {
        delete next[o.id];
      });
    } else {
      exceedsBalanceOrders.forEach((o) => {
        next[o.id] = true;
      });
    }
    setSelectedItems(next);
  };

  const handleToggleSelectUnmatched = () => {
    const next = { ...selectedItems };
    if (isAllUnmatchedSelected) {
      unmatchedOrders.forEach((o) => {
        delete next[o.id];
      });
    } else {
      unmatchedOrders.forEach((o) => {
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
      {/* Control Bar */}
      <div style={styles.controlBar}>
        {/* Left Stats & Extra Actions */}
        <div style={styles.leftStatsWrapper}>
          <div style={styles.statsPill}>
            <div style={styles.statsRow}>
              <span style={styles.statLabelMuted}>
                Orders:{" "}
                <strong style={styles.statPrimary}>
                  {orders.length}
                </strong>
              </span>
              <span style={styles.statLabelMuted}>
                Matched:{" "}
                <strong style={styles.statCyan}>
                  {matchedCount}
                </strong>
              </span>
              {actionRequiredCount > 0 && (
                <span style={styles.actionReqRow}>
                  Action Req:{" "}
                  <strong style={styles.actionReqCount}>
                    {actionRequiredCount}
                  </strong>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowExtraActions((prev) => !prev)}
              className="btn btn-sm"
              style={getOptionsToggleButtonStyle(showExtraActions)}
              title={
                showExtraActions
                  ? "Hide Extra Controls"
                  : "Open Extra Controls (Threshold & Delete All)"
              }
            >
              <Sliders
                size={12}
                style={getSlidersIconStyle(showExtraActions)}
              />
              <span style={styles.optionsToggleText}>
                {showExtraActions ? "Hide" : "Options"}
              </span>
              {showExtraActions ? (
                <ChevronLeft size={13} />
              ) : (
                <ChevronRight size={13} />
              )}
            </button>

            <div style={getExtraOptionsSliderStyle(showExtraActions)}>
              <div style={styles.thresholdPill}>
                <span style={styles.thresholdLabel}>
                  Threshold:
                </span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={driftThresholdPercent}
                  onChange={(e) => {
                    const parsed = parseFloat(e.target.value);
                    setDriftThresholdPercent(
                      isNaN(parsed) ? 0 : Math.max(0, parsed),
                    );
                  }}
                  style={styles.thresholdInput}
                  title="Drift tolerance percentage before flagging an order as overbid or underbid"
                />
                <span style={styles.percentText}>
                  %
                </span>
              </div>

              {exceedsBalanceCount > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectExceeds}
                  className="btn btn-sm"
                  style={styles.selectExceedingBtn}
                  title="Select all buy orders exceeding available wallet balance"
                >
                  <Wallet size={11} />
                  {isAllExceedsSelected
                    ? `Unselect Exceeding (${exceedsBalanceCount})`
                    : `Select Exceeding (${exceedsBalanceCount})`}
                </button>
              )}

              {orders.length > 0 && (
                <button
                  onClick={handleDeleteAllOrders}
                  disabled={batchProcessing}
                  className="btn btn-danger btn-sm"
                  style={styles.deleteAllBtn}
                  title="Bulk cancel all active CSFloat buy orders"
                >
                  <Trash2 size={11} /> Delete All
                </button>
              )}
            </div>
          </div>

          {/* Status Filter Chips */}
          <div style={styles.statusChipsWrapper}>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              style={getStatusChipStyle(statusFilter === "all", "all")}
            >
              All ({orders.length})
            </button>

            {actionRequiredCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setStatusFilter(statusFilter === "action" ? "all" : "action")
                }
                style={getStatusChipStyle(statusFilter === "action", "action")}
              >
                Action ({actionRequiredCount})
              </button>
            )}

            {exceedsBalanceCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "exceeds" ? "all" : "exceeds",
                  )
                }
                style={getStatusChipStyle(statusFilter === "exceeds", "exceeds")}
                title={`Filter orders whose bid exceeds wallet balance ($${userBalance?.toFixed(2)})`}
              >
                <Wallet size={10} /> Exceeds Bal ({exceedsBalanceCount})
              </button>
            )}

            {driftOrders.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setStatusFilter(statusFilter === "drift" ? "all" : "drift")
                }
                style={getStatusChipStyle(statusFilter === "drift", "drift")}
              >
                Drift ({driftOrders.length})
              </button>
            )}

            {unmatchedOrders.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "unmatched" ? "all" : "unmatched",
                  )
                }
                style={getStatusChipStyle(statusFilter === "unmatched", "unmatched")}
              >
                Unmatched ({unmatchedOrders.length})
              </button>
            )}

            {advancedCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "advanced" ? "all" : "advanced",
                  )
                }
                style={getStatusChipStyle(statusFilter === "advanced", "advanced")}
                title={`Filter ${advancedCount} advanced buy orders with custom hybrid parameters`}
              >
                Advanced ({advancedCount})
              </button>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div style={styles.rightActionsGroup}>
          {actionRequiredCount > 0 && (
            <button
              type="button"
              onClick={handleToggleSelectActionRequired}
              className="btn btn-sm"
              style={getActionRequiredButtonStyle(isAllActionRequiredSelected)}
              title={
                isAllActionRequiredSelected
                  ? "Click to unselect all action items"
                  : "Click to select all buy orders requiring action"
              }
            >
              <AlertTriangle
                size={12}
                style={getActionRequiredAlertIconStyle(isAllActionRequiredSelected)}
              />
              <span>
                {isAllActionRequiredSelected
                  ? "Unselect Action Items"
                  : "Select Action Items"}
              </span>
              <span style={styles.actionRequiredBadge}>
                {actionRequiredCount}
              </span>
            </button>
          )}
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="btn btn-primary btn-sm"
          >
            {loading ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <RotateCw size={14} />
            )}{" "}
            Sync Buy Orders
          </button>
          <button
            onClick={loadAcceptedPrices}
            disabled={loadingPrices}
            className={`btn ${pricesLoaded ? "btn-secondary" : "btn-outline"} btn-sm`}
          >
            {loadingPrices ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <LinkIcon size={14} />
            )}
            {pricesLoaded ? "Reload Accepted Prices" : "Load Accepted Prices"}
          </button>
        </div>
      </div>

      {/* Floating Selection Toolbar */}
      {selectedCount > 0 && (
        <div style={getFloatingToolbarStyle(isSidebarExpanded)}>
          <div style={styles.floatingToolbarLeft}>
            <span style={styles.floatingToolbarSelectedText}>
              <CheckSquare size={16} style={styles.checkSquareIcon} />
              <span>
                {selectedCount} Selected
                {selectedOrdersTotal > 0 && (
                  <span style={styles.selectedOrdersTotalText}>
                    (${selectedOrdersTotal.toFixed(2)})
                  </span>
                )}
              </span>
            </span>
            <div style={styles.floatingToolbarDivider} />
            <button
              onClick={handleSelectAll}
              className="btn btn-sm btn-ghost"
              style={styles.ghostToolbarButton}
            >
              <CheckSquare size={12} /> Select All ({orders.length})
            </button>
            {actionRequiredCount > 0 && (
              <button
                onClick={handleToggleSelectActionRequired}
                className="btn btn-sm btn-ghost"
                style={getFloatingActionRequiredButtonStyle(isAllActionRequiredSelected)}
                title={
                  isAllActionRequiredSelected
                    ? "Click to unselect action items"
                    : "Click to select all orders requiring action"
                }
              >
                <AlertTriangle size={12} style={styles.actionReqAlertIcon} />{" "}
                {isAllActionRequiredSelected
                  ? `Unselect Action (${actionRequiredCount})`
                  : `Action Required (${actionRequiredCount})`}
              </button>
            )}
            {exceedsBalanceCount > 0 && (
              <button
                onClick={handleToggleSelectExceeds}
                className="btn btn-sm btn-ghost"
                style={getFloatingExceedsButtonStyle(isAllExceedsSelected)}
                title={
                  isAllExceedsSelected
                    ? "Click to unselect orders exceeding balance"
                    : "Click to select all buy orders exceeding available wallet balance"
                }
              >
                <Wallet size={12} style={styles.exceedsWalletIcon} />{" "}
                {isAllExceedsSelected
                  ? `Unselect Exceeding (${exceedsBalanceCount})`
                  : `Exceeds Balance (${exceedsBalanceCount})`}
              </button>
            )}
            {unmatchedOrders.length > 0 && (
              <button
                onClick={handleToggleSelectUnmatched}
                className="btn btn-sm btn-ghost"
                style={getFloatingUnmatchedButtonStyle(isAllUnmatchedSelected)}
                title={
                  isAllUnmatchedSelected
                    ? "Click to unselect orders not matched in Oracle cache"
                    : "Click to select all buy orders not matched in Oracle cache"
                }
              >
                <HelpCircle size={12} style={styles.unmatchedHelpIcon} />{" "}
                {isAllUnmatchedSelected
                  ? `Unselect Unmatched (${unmatchedOrders.length})`
                  : `Unmatched (${unmatchedOrders.length})`}
              </button>
            )}
            <button
              onClick={handleDeselectAll}
              className="btn btn-sm btn-ghost"
              style={styles.ghostClearButton}
            >
              <Square size={12} /> Clear Selection
            </button>
          </div>

          <div style={styles.floatingToolbarRight}>
            {unmatchedSelectedCount > 0 && (
              <button
                type="button"
                onClick={() => setDeleteUnmatched(!deleteUnmatched)}
                style={getDeleteUnmatchedToggleStyle(deleteUnmatched)}
                title="Toggle whether updating also deletes selected orders that have no matching accepted price in Oracle cache"
              >
                {deleteUnmatched ? (
                  <CheckSquare size={13} style={styles.deleteCheckIcon} />
                ) : (
                  <Square size={13} style={styles.deleteSquareIcon} />
                )}
                <span>Delete unmatched ({unmatchedSelectedCount})</span>
              </button>
            )}
            <button
              onClick={() => handleBatchUpdate({ deleteUnmatched })}
              disabled={
                batchProcessing || (isOnlyUnmatchedSelected && !deleteUnmatched)
              }
              className={`btn btn-sm ${
                isOnlyUnmatchedSelected && deleteUnmatched
                  ? "btn-danger"
                  : "btn-primary"
              }`}
              style={getBatchUpdateButtonStyle(isOnlyUnmatchedSelected, deleteUnmatched)}
              title={
                isOnlyUnmatchedSelected && !deleteUnmatched
                  ? "Selected orders have no price in Oracle cache. Enable 'Delete unmatched' or use Delete Selected."
                  : undefined
              }
            >
              {batchProcessing ? (
                <Loader2 size={13} className="spin" />
              ) : isOnlyUnmatchedSelected && deleteUnmatched ? (
                <Trash2 size={13} />
              ) : (
                <RotateCw size={13} />
              )}
              {isOnlyUnmatchedSelected
                ? deleteUnmatched
                  ? `Delete Unmatched (${unmatchedSelectedCount})`
                  : `Cannot Update Unmatched (${unmatchedSelectedCount})`
                : deleteUnmatched && unmatchedSelectedCount > 0
                  ? `Update & Prune (${selectedCount})`
                  : `Update Selected (${selectedCount})`}
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={batchProcessing}
              className="btn btn-danger btn-sm"
              style={styles.batchDeleteBtn}
              title="Permanently delete the selected active buy orders from CSFloat"
            >
              {batchProcessing ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <Trash2 size={13} />
              )}
              Delete Selected ({selectedCount})
            </button>
            <button
              onClick={handleDeselectAll}
              className="btn btn-sm btn-ghost"
              style={styles.clearCircleButton}
              title="Clear selection"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Orders Grid View */}
      <div style={styles.gridScrollView}>
        {orders.length === 0 ? (
          <div className="card" style={styles.emptyCard}>
            {loading ? (
              <div>Loading live buy orders from CSFloat...</div>
            ) : (
              <div>
                <Package
                  size={32}
                  style={styles.emptyIcon}
                />
                <div style={styles.emptyTitle}>
                  No Active Buy Orders Found
                </div>
                <div style={styles.emptySubtitle}>
                  Click "Sync Buy Orders" above to sync your current active
                  orders from CSFloat.
                </div>
              </div>
            )}
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="card" style={styles.filterNoMatchCard}>
            <AlertTriangle
              size={28}
              style={styles.filterNoMatchIcon}
            />
            <div style={styles.filterNoMatchTitle}>
              No Orders Match Filter "{statusFilter.toUpperCase()}"
            </div>
            <button
              onClick={() => setStatusFilter("all")}
              className="btn btn-sm btn-outline"
              style={styles.showAllOrdersBtn}
            >
              Show All Orders ({orders.length})
            </button>
          </div>
        ) : (
          <div style={getCardsGridStyle(selectedCount > 0)}>
            {displayedOrders.map((order) => {
              const driftDetails = getOrderDriftDetails(order);
              const isSelected = !!selectedItems[order.id];
              const isProcessing = processingId === order.id;

              return (
                <CSFloatOrderCard
                  key={order.id}
                  order={order}
                  isSelected={isSelected}
                  onToggleSelect={() =>
                    setSelectedItems((prev) => ({
                      ...prev,
                      [order.id]: !prev[order.id],
                    }))
                  }
                  driftDetails={driftDetails}
                  isProcessing={isProcessing}
                  userBalance={userBalance}
                  isUnmatched={pricesLoaded && !driftDetails?.acceptedPrice}
                  onManualUpdate={handleManualUpdate}
                  onDelete={handleDeleteOrder}
                  onOpenMarket={handleOpenCsfloatMarket}
                  onOpenLookup={handleOpenLookupModal}
                  onUpdateQuantity={handleUpdateQuantity}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC STYLE HELPERS ─────────────────────────

const getOptionsToggleButtonStyle = (showExtraActions: boolean): React.CSSProperties => ({
  backgroundColor: showExtraActions ? "var(--so-surface-input)" : "transparent",
  color: showExtraActions ? "var(--so-primary)" : "var(--so-text-muted)",
  border: "1px solid var(--so-border-subtle)",
  padding: "3px 7px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: 700,
  borderRadius: "4px",
  transition: "all 0.2s ease",
});

const getSlidersIconStyle = (showExtraActions: boolean): React.CSSProperties => ({
  color: showExtraActions ? "var(--so-primary)" : "var(--so-text-muted)",
});

const getExtraOptionsSliderStyle = (showExtraActions: boolean): React.CSSProperties => ({
  maxWidth: showExtraActions ? "320px" : "0px",
  opacity: showExtraActions ? 1 : 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  display: "flex",
  alignItems: "center",
  gap: "8px",
});

const getStatusChipStyle = (
  active: boolean,
  type: "all" | "action" | "exceeds" | "drift" | "unmatched" | "advanced",
): React.CSSProperties => {
  if (type === "all") {
    return {
      fontSize: "10.5px",
      fontWeight: active ? 800 : 600,
      padding: "2px 8px",
      borderRadius: "3px",
      border: "none",
      cursor: "pointer",
      backgroundColor: active ? "var(--so-primary)" : "transparent",
      color: active ? "#ffffff" : "var(--so-text-muted)",
      transition: "all 0.15s ease",
    };
  }
  if (type === "action") {
    return {
      fontSize: "10.5px",
      fontWeight: active ? 800 : 600,
      padding: "2px 8px",
      borderRadius: "3px",
      border: `1px solid ${active ? "rgba(245, 158, 11, 0.5)" : "transparent"}`,
      cursor: "pointer",
      backgroundColor: active ? "rgba(245, 158, 11, 0.22)" : "transparent",
      color: active ? "#fbbf24" : "var(--so-text-secondary)",
      transition: "all 0.15s ease",
    };
  }
  if (type === "exceeds") {
    return {
      fontSize: "10.5px",
      fontWeight: 800,
      padding: "2px 8px",
      borderRadius: "3px",
      border: `1px solid ${active ? "#ef4444" : "rgba(239, 68, 68, 0.35)"}`,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "3px",
      backgroundColor: active ? "rgba(239, 68, 68, 0.25)" : "rgba(239, 68, 68, 0.1)",
      color: "#f87171",
      transition: "all 0.15s ease",
    };
  }
  if (type === "drift") {
    return {
      fontSize: "10.5px",
      fontWeight: active ? 800 : 600,
      padding: "2px 8px",
      borderRadius: "3px",
      border: `1px solid ${active ? "rgba(6, 182, 212, 0.5)" : "transparent"}`,
      cursor: "pointer",
      backgroundColor: active ? "rgba(6, 182, 212, 0.22)" : "transparent",
      color: active ? "var(--so-accent-cyan)" : "var(--so-text-secondary)",
      transition: "all 0.15s ease",
    };
  }
  if (type === "advanced") {
    return {
      fontSize: "10.5px",
      fontWeight: active ? 800 : 600,
      padding: "2px 8px",
      borderRadius: "3px",
      border: `1px solid ${active ? "rgba(168, 85, 247, 0.5)" : "transparent"}`,
      cursor: "pointer",
      backgroundColor: active ? "rgba(168, 85, 247, 0.22)" : "transparent",
      color: active ? "#c084fc" : "var(--so-text-secondary)",
      transition: "all 0.15s ease",
    };
  }
  return {
    fontSize: "10.5px",
    fontWeight: active ? 800 : 600,
    padding: "2px 8px",
    borderRadius: "3px",
    border: `1px solid ${active ? "rgba(148, 163, 184, 0.5)" : "transparent"}`,
    cursor: "pointer",
    backgroundColor: active ? "rgba(148, 163, 184, 0.2)" : "transparent",
    color: active ? "#ffffff" : "var(--so-text-muted)",
    transition: "all 0.15s ease",
  };
};

const getActionRequiredButtonStyle = (isSelected: boolean): React.CSSProperties => ({
  backgroundColor: isSelected
    ? "rgba(245, 158, 11, 0.18)"
    : "rgba(245, 158, 11, 0.09)",
  color: "var(--so-text-primary, #e2e8f0)",
  border: `1px solid ${isSelected ? "rgba(245, 158, 11, 0.45)" : "rgba(245, 158, 11, 0.28)"}`,
  padding: "4px 10px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "11.5px",
  fontWeight: 600,
  cursor: "pointer",
  borderRadius: "var(--so-radius-sm)",
  transition: "all 0.15s ease",
});

const getActionRequiredAlertIconStyle = (isSelected: boolean): React.CSSProperties => ({
  color: isSelected ? "#fbbf24" : "#f59e0b",
});

const getFloatingActionRequiredButtonStyle = (isSelected: boolean): React.CSSProperties => ({
  fontSize: "11px",
  padding: "3px 8px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  color: "#f59e0b",
  backgroundColor: isSelected
    ? "rgba(245, 158, 11, 0.18)"
    : "rgba(245, 158, 11, 0.08)",
  border: "1px solid rgba(245, 158, 11, 0.25)",
  borderRadius: "4px",
});

const getFloatingExceedsButtonStyle = (isSelected: boolean): React.CSSProperties => ({
  fontSize: "11px",
  padding: "3px 8px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  color: "#f87171",
  backgroundColor: isSelected
    ? "rgba(239, 68, 68, 0.22)"
    : "rgba(239, 68, 68, 0.08)",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  borderRadius: "4px",
});

const getFloatingUnmatchedButtonStyle = (isSelected: boolean): React.CSSProperties => ({
  fontSize: "11px",
  padding: "3px 8px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
  color: isSelected ? "#f1f5f9" : "#94a3b8",
  backgroundColor: isSelected
    ? "rgba(148, 163, 184, 0.25)"
    : "rgba(148, 163, 184, 0.08)",
  border: "1px solid rgba(148, 163, 184, 0.3)",
  borderRadius: "4px",
});

const getDeleteUnmatchedToggleStyle = (deleteUnmatched: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "11.5px",
  fontWeight: 600,
  color: deleteUnmatched ? "#f87171" : "var(--so-text-secondary)",
  cursor: "pointer",
  userSelect: "none",
  padding: "4px 9px",
  borderRadius: "4px",
  backgroundColor: deleteUnmatched
    ? "rgba(239, 68, 68, 0.16)"
    : "rgba(255, 255, 255, 0.04)",
  border: `1px solid ${deleteUnmatched ? "rgba(239, 68, 68, 0.45)" : "var(--so-border-subtle)"}`,
  transition: "all 0.15s ease",
});

const getBatchUpdateButtonStyle = (
  isOnlyUnmatchedSelected: boolean,
  deleteUnmatched: boolean,
): React.CSSProperties => ({
  fontWeight: 800,
  fontSize: "12px",
  padding: "6px 14px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  color: "#ffffff",
  opacity: isOnlyUnmatchedSelected && !deleteUnmatched ? 0.6 : 1,
});

const getFloatingToolbarStyle = (isSidebarExpanded: boolean): React.CSSProperties => ({
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
});

const getCardsGridStyle = (hasSelection: boolean): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "10px",
  paddingBottom: hasSelection ? "75px" : "12px",
});

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    gap: "10px",
    minHeight: 0,
  } as React.CSSProperties,

  controlBar: {
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
  } as React.CSSProperties,

  leftStatsWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  } as React.CSSProperties,

  statsPill: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    padding: "4px 10px",
    borderRadius: "var(--so-radius-sm)",
  } as React.CSSProperties,

  statsRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "11.5px",
    fontWeight: 700,
  } as React.CSSProperties,

  statLabelMuted: {
    color: "var(--so-text-muted)",
  } as React.CSSProperties,

  statPrimary: {
    color: "var(--so-text-primary)",
  } as React.CSSProperties,

  statCyan: {
    color: "var(--so-accent-cyan)",
  } as React.CSSProperties,

  actionReqRow: {
    color: "var(--so-text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  } as React.CSSProperties,

  actionReqCount: {
    color: "#f59e0b",
  } as React.CSSProperties,

  optionsToggleText: {
    fontSize: "10.5px",
  } as React.CSSProperties,

  thresholdPill: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-medium)",
    padding: "2px 6px",
    borderRadius: "var(--so-radius-sm)",
  } as React.CSSProperties,

  thresholdLabel: {
    fontSize: "10.5px",
    fontWeight: 700,
    color: "var(--so-text-secondary)",
  } as React.CSSProperties,

  thresholdInput: {
    width: "42px",
    padding: "1px 3px",
    fontSize: "11px",
    borderRadius: "3px",
    backgroundColor: "var(--so-surface-panel)",
    color: "var(--so-text-primary)",
    border: "1px solid var(--so-border-subtle)",
    textAlign: "center",
    fontWeight: 700,
  } as React.CSSProperties,

  percentText: {
    fontSize: "10px",
    color: "var(--so-text-muted)",
  } as React.CSSProperties,

  selectExceedingBtn: {
    fontSize: "10.5px",
    fontWeight: 700,
    padding: "3px 8px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    whiteSpace: "nowrap",
    backgroundColor: "rgba(239, 68, 68, 0.14)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.35)",
  } as React.CSSProperties,

  deleteAllBtn: {
    fontSize: "10.5px",
    fontWeight: 700,
    padding: "3px 8px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  statusChipsWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    padding: "3px 6px",
    borderRadius: "var(--so-radius-sm)",
  } as React.CSSProperties,

  rightActionsGroup: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  } as React.CSSProperties,

  actionRequiredBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    color: "#f59e0b",
    padding: "1px 6px",
    borderRadius: "10px",
    fontSize: "10.5px",
    fontWeight: 700,
  } as React.CSSProperties,

  floatingToolbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  } as React.CSSProperties,

  floatingToolbarSelectedText: {
    fontSize: "13px",
    fontWeight: 800,
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  } as React.CSSProperties,

  checkSquareIcon: {
    color: "var(--so-primary)",
  } as React.CSSProperties,

  selectedOrdersTotalText: {
    color: "var(--so-accent-cyan)",
    marginLeft: "6px",
  } as React.CSSProperties,

  floatingToolbarDivider: {
    width: "1px",
    height: "16px",
    backgroundColor: "var(--so-border-subtle)",
  } as React.CSSProperties,

  ghostToolbarButton: {
    fontSize: "11px",
    padding: "3px 8px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  } as React.CSSProperties,

  actionReqAlertIcon: {
    color: "#f59e0b",
  } as React.CSSProperties,

  exceedsWalletIcon: {
    color: "#f87171",
  } as React.CSSProperties,

  unmatchedHelpIcon: {
    color: "#94a3b8",
  } as React.CSSProperties,

  ghostClearButton: {
    fontSize: "11px",
    padding: "3px 8px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--so-text-primary)",
  } as React.CSSProperties,

  floatingToolbarRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  } as React.CSSProperties,

  deleteCheckIcon: {
    color: "#ef4444",
  } as React.CSSProperties,

  deleteSquareIcon: {
    color: "var(--so-text-muted)",
  } as React.CSSProperties,

  batchDeleteBtn: {
    fontWeight: 800,
    fontSize: "12px",
    padding: "6px 14px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#ffffff",
  } as React.CSSProperties,

  clearCircleButton: {
    padding: "6px",
    borderRadius: "50%",
    color: "var(--so-text-primary)",
  } as React.CSSProperties,

  gridScrollView: {
    flex: 1,
    overflowY: "auto",
    minHeight: 0,
  } as React.CSSProperties,

  emptyCard: {
    textAlign: "center",
    padding: "50px 20px",
    color: "var(--so-text-muted)",
  } as React.CSSProperties,

  emptyIcon: {
    marginBottom: "10px",
    opacity: 0.5,
  } as React.CSSProperties,

  emptyTitle: {
    fontWeight: 700,
    fontSize: "15px",
    color: "var(--so-text-primary)",
    marginBottom: "4px",
  } as React.CSSProperties,

  emptySubtitle: {
    fontSize: "12px",
  } as React.CSSProperties,

  filterNoMatchCard: {
    textAlign: "center",
    padding: "40px 20px",
    color: "var(--so-text-muted)",
  } as React.CSSProperties,

  filterNoMatchIcon: {
    marginBottom: "8px",
    color: "var(--so-accent-cyan)",
    opacity: 0.8,
  } as React.CSSProperties,

  filterNoMatchTitle: {
    fontWeight: 700,
    fontSize: "14px",
    color: "var(--so-text-primary)",
    marginBottom: "4px",
  } as React.CSSProperties,

  showAllOrdersBtn: {
    marginTop: "8px",
  } as React.CSSProperties,
};

