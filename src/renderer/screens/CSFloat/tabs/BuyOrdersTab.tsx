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
    "all" | "action" | "exceeds" | "drift" | "unmatched"
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
  ]);

  const unmatchedSelectedCount = useMemo(() => {
    return orders.filter(
      (o) => selectedItems[o.id] && !getOrderDriftDetails(o)?.acceptedPrice,
    ).length;
  }, [orders, selectedItems, getOrderDriftDetails]);

  const isAllActionRequiredSelected =
    actionRequiredCount > 0 &&
    actionRequiredOrders.every((o) => !!selectedItems[o.id]);

  const isAllExceedsSelected =
    exceedsBalanceCount > 0 &&
    exceedsBalanceOrders.every((o) => !!selectedItems[o.id]);

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

  const handleUpdateQuantity = (orderId: string, newQty: number) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, qty: newQty } : o)),
    );
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
        {/* Left Stats & Extra Actions */}
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
                Orders:{" "}
                <strong style={{ color: "var(--so-text-primary)" }}>
                  {orders.length}
                </strong>
              </span>
              <span style={{ color: "var(--so-text-muted)" }}>
                Matched:{" "}
                <strong style={{ color: "var(--so-accent-cyan)" }}>
                  {matchedCount}
                </strong>
              </span>
              {actionRequiredCount > 0 && (
                <span
                  style={{
                    color: "var(--so-text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  Action Req:{" "}
                  <strong style={{ color: "#f59e0b" }}>
                    {actionRequiredCount}
                  </strong>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowExtraActions((prev) => !prev)}
              className="btn btn-sm"
              style={{
                backgroundColor: showExtraActions
                  ? "var(--so-surface-input)"
                  : "transparent",
                color: showExtraActions
                  ? "var(--so-primary)"
                  : "var(--so-text-muted)",
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
              }}
              title={
                showExtraActions
                  ? "Hide Extra Controls"
                  : "Open Extra Controls (Threshold & Delete All)"
              }
            >
              <Sliders
                size={12}
                style={{
                  color: showExtraActions
                    ? "var(--so-primary)"
                    : "var(--so-text-muted)",
                }}
              />
              <span style={{ fontSize: "10.5px" }}>
                {showExtraActions ? "Hide" : "Options"}
              </span>
              {showExtraActions ? (
                <ChevronLeft size={13} />
              ) : (
                <ChevronRight size={13} />
              )}
            </button>

            <div
              style={{
                maxWidth: showExtraActions ? "320px" : "0px",
                opacity: showExtraActions ? 1 : 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  backgroundColor: "var(--so-surface-input)",
                  border: "1px solid var(--so-border-medium)",
                  padding: "2px 6px",
                  borderRadius: "var(--so-radius-sm)",
                }}
              >
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    color: "var(--so-text-secondary)",
                  }}
                >
                  Threshold:
                </span>
                <input
                  type="number"
                  step="0.5"
                  value={driftThresholdPercent}
                  onChange={(e) =>
                    setDriftThresholdPercent(parseFloat(e.target.value) || 0)
                  }
                  style={{
                    width: "42px",
                    padding: "1px 3px",
                    fontSize: "11px",
                    borderRadius: "3px",
                    backgroundColor: "var(--so-surface-panel)",
                    color: "var(--so-text-primary)",
                    border: "1px solid var(--so-border-subtle)",
                    textAlign: "center",
                    fontWeight: 700,
                  }}
                  title="Drift tolerance percentage before flagging an order as overbid or underbid"
                />
                <span
                  style={{ fontSize: "10px", color: "var(--so-text-muted)" }}
                >
                  %
                </span>
              </div>

              {exceedsBalanceCount > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectExceeds}
                  className="btn btn-sm"
                  style={{
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
                  }}
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
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    whiteSpace: "nowrap",
                  }}
                  title="Bulk cancel all active CSFloat buy orders"
                >
                  <Trash2 size={11} /> Delete All
                </button>
              )}
            </div>
          </div>

          {/* Status Filter Chips */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              backgroundColor: "var(--so-surface-panel)",
              border: "1px solid var(--so-border-medium)",
              padding: "3px 6px",
              borderRadius: "var(--so-radius-sm)",
            }}
          >
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              style={{
                fontSize: "10.5px",
                fontWeight: statusFilter === "all" ? 800 : 600,
                padding: "2px 8px",
                borderRadius: "3px",
                border: "none",
                cursor: "pointer",
                backgroundColor:
                  statusFilter === "all"
                    ? "var(--so-primary)"
                    : "transparent",
                color:
                  statusFilter === "all"
                    ? "#ffffff"
                    : "var(--so-text-muted)",
                transition: "all 0.15s ease",
              }}
            >
              All ({orders.length})
            </button>

            {actionRequiredCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setStatusFilter(statusFilter === "action" ? "all" : "action")
                }
                style={{
                  fontSize: "10.5px",
                  fontWeight: statusFilter === "action" ? 800 : 600,
                  padding: "2px 8px",
                  borderRadius: "3px",
                  border: `1px solid ${
                    statusFilter === "action"
                      ? "rgba(245, 158, 11, 0.5)"
                      : "transparent"
                  }`,
                  cursor: "pointer",
                  backgroundColor:
                    statusFilter === "action"
                      ? "rgba(245, 158, 11, 0.22)"
                      : "transparent",
                  color:
                    statusFilter === "action"
                      ? "#fbbf24"
                      : "var(--so-text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                Action ({actionRequiredCount})
              </button>
            )}

            {exceedsBalanceCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setStatusFilter(statusFilter === "exceeds" ? "all" : "exceeds")
                }
                style={{
                  fontSize: "10.5px",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "3px",
                  border: `1px solid ${
                    statusFilter === "exceeds"
                      ? "#ef4444"
                      : "rgba(239, 68, 68, 0.35)"
                  }`,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                  backgroundColor:
                    statusFilter === "exceeds"
                      ? "rgba(239, 68, 68, 0.25)"
                      : "rgba(239, 68, 68, 0.1)",
                  color: "#f87171",
                  transition: "all 0.15s ease",
                }}
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
                style={{
                  fontSize: "10.5px",
                  fontWeight: statusFilter === "drift" ? 800 : 600,
                  padding: "2px 8px",
                  borderRadius: "3px",
                  border: `1px solid ${
                    statusFilter === "drift"
                      ? "rgba(6, 182, 212, 0.5)"
                      : "transparent"
                  }`,
                  cursor: "pointer",
                  backgroundColor:
                    statusFilter === "drift"
                      ? "rgba(6, 182, 212, 0.22)"
                      : "transparent",
                  color:
                    statusFilter === "drift"
                      ? "var(--so-accent-cyan)"
                      : "var(--so-text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                Drift ({driftOrders.length})
              </button>
            )}

            {unmatchedOrders.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setStatusFilter(statusFilter === "unmatched" ? "all" : "unmatched")
                }
                style={{
                  fontSize: "10.5px",
                  fontWeight: statusFilter === "unmatched" ? 800 : 600,
                  padding: "2px 8px",
                  borderRadius: "3px",
                  border: `1px solid ${
                    statusFilter === "unmatched"
                      ? "rgba(148, 163, 184, 0.5)"
                      : "transparent"
                  }`,
                  cursor: "pointer",
                  backgroundColor:
                    statusFilter === "unmatched"
                      ? "rgba(148, 163, 184, 0.2)"
                      : "transparent",
                  color:
                    statusFilter === "unmatched"
                      ? "#ffffff"
                      : "var(--so-text-muted)",
                  transition: "all 0.15s ease",
                }}
              >
                Unmatched ({unmatchedOrders.length})
              </button>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {actionRequiredCount > 0 && (
            <button
              type="button"
              onClick={handleToggleSelectActionRequired}
              className="btn btn-sm"
              style={{
                backgroundColor: isAllActionRequiredSelected
                  ? "rgba(245, 158, 11, 0.18)"
                  : "rgba(245, 158, 11, 0.09)",
                color: "var(--so-text-primary, #e2e8f0)",
                border: `1px solid ${
                  isAllActionRequiredSelected
                    ? "rgba(245, 158, 11, 0.45)"
                    : "rgba(245, 158, 11, 0.28)"
                }`,
                padding: "4px 10px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11.5px",
                fontWeight: 600,
                cursor: "pointer",
                borderRadius: "var(--so-radius-sm)",
                transition: "all 0.15s ease",
              }}
              title={
                isAllActionRequiredSelected
                  ? "Click to unselect all action items"
                  : "Click to select all buy orders requiring action"
              }
            >
              <AlertTriangle
                size={12}
                style={{
                  color: isAllActionRequiredSelected ? "#fbbf24" : "#f59e0b",
                }}
              />
              <span>
                {isAllActionRequiredSelected
                  ? "Unselect Action Items"
                  : "Select Action Items"}
              </span>
              <span
                style={{
                  backgroundColor: "rgba(245, 158, 11, 0.2)",
                  color: "#f59e0b",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                }}
              >
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
              <span>
                {selectedCount} Selected
                {selectedOrdersTotal > 0 && (
                  <span
                    style={{
                      color: "var(--so-accent-cyan)",
                      marginLeft: "6px",
                    }}
                  >
                    (${selectedOrdersTotal.toFixed(2)})
                  </span>
                )}
              </span>
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
              <CheckSquare size={12} /> Select All ({orders.length})
            </button>
            {actionRequiredCount > 0 && (
              <button
                onClick={handleToggleSelectActionRequired}
                className="btn btn-sm btn-ghost"
                style={{
                  fontSize: "11px",
                  padding: "3px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "#f59e0b",
                  backgroundColor: isAllActionRequiredSelected
                    ? "rgba(245, 158, 11, 0.18)"
                    : "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  borderRadius: "4px",
                }}
                title={
                  isAllActionRequiredSelected
                    ? "Click to unselect action items"
                    : "Click to select all orders requiring action"
                }
              >
                <AlertTriangle size={12} style={{ color: "#f59e0b" }} />{" "}
                {isAllActionRequiredSelected
                  ? `Unselect Action (${actionRequiredCount})`
                  : `Action Required (${actionRequiredCount})`}
              </button>
            )}
            {exceedsBalanceCount > 0 && (
              <button
                onClick={handleToggleSelectExceeds}
                className="btn btn-sm btn-ghost"
                style={{
                  fontSize: "11px",
                  padding: "3px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  color: "#f87171",
                  backgroundColor: isAllExceedsSelected
                    ? "rgba(239, 68, 68, 0.22)"
                    : "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "4px",
                }}
                title={
                  isAllExceedsSelected
                    ? "Click to unselect orders exceeding balance"
                    : "Click to select all buy orders exceeding available wallet balance"
                }
              >
                <Wallet size={12} style={{ color: "#f87171" }} />{" "}
                {isAllExceedsSelected
                  ? `Unselect Exceeding (${exceedsBalanceCount})`
                  : `Exceeds Balance (${exceedsBalanceCount})`}
              </button>
            )}
            <button
              onClick={handleDeselectAll}
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
            {unmatchedSelectedCount > 0 && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  color: deleteUnmatched
                    ? "#f87171"
                    : "var(--so-text-secondary)",
                  cursor: "pointer",
                  userSelect: "none",
                  padding: "4px 9px",
                  borderRadius: "4px",
                  backgroundColor: deleteUnmatched
                    ? "rgba(239, 68, 68, 0.12)"
                    : "rgba(255, 255, 255, 0.04)",
                  border: `1px solid ${
                    deleteUnmatched
                      ? "rgba(239, 68, 68, 0.35)"
                      : "var(--so-border-subtle)"
                  }`,
                  transition: "all 0.15s ease",
                }}
                title="When updating, also delete selected buy orders that have no matching accepted price in Oracle cache"
              >
                <input
                  type="checkbox"
                  checked={deleteUnmatched}
                  onChange={(e) => setDeleteUnmatched(e.target.checked)}
                  style={{
                    cursor: "pointer",
                    accentColor: "#ef4444",
                  }}
                />
                <span>Delete unmatched ({unmatchedSelectedCount})</span>
              </label>
            )}
            <button
              onClick={() => handleBatchUpdate({ deleteUnmatched })}
              disabled={batchProcessing}
              className="btn btn-primary btn-sm"
              style={{
                fontWeight: 800,
                fontSize: "12px",
                padding: "6px 14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#ffffff",
              }}
            >
              {batchProcessing ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <RotateCw size={13} />
              )}
              Update Selected ({selectedCount})
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={batchProcessing}
              className="btn btn-danger btn-sm"
              style={{
                fontWeight: 800,
                fontSize: "12px",
                padding: "6px 14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#ffffff",
              }}
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

      {/* Orders Grid View */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {orders.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "50px 20px",
              color: "var(--so-text-muted)",
            }}
          >
            {loading ? (
              <div>Fetching live buy orders from CSFloat...</div>
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
                  No Active Buy Orders Found
                </div>
                <div style={{ fontSize: "12px" }}>
                  Click "Sync Buy Orders" above to fetch your current active
                  orders from CSFloat.
                </div>
              </div>
            )}
          </div>
        ) : displayedOrders.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "var(--so-text-muted)",
            }}
          >
            <AlertTriangle
              size={28}
              style={{
                marginBottom: "8px",
                color: "var(--so-accent-cyan)",
                opacity: 0.8,
              }}
            />
            <div
              style={{
                fontWeight: 700,
                fontSize: "14px",
                color: "var(--so-text-primary)",
                marginBottom: "4px",
              }}
            >
              No Orders Match Filter "{statusFilter.toUpperCase()}"
            </div>
            <button
              onClick={() => setStatusFilter("all")}
              className="btn btn-sm btn-outline"
              style={{ marginTop: "8px" }}
            >
              Show All Orders ({orders.length})
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "10px",
              paddingBottom: selectedCount > 0 ? "75px" : "12px",
            }}
          >
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
