import React, { useState } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import { CSFloatOrderCard, OrderDriftDetails } from '../components/CSFloatOrderCard';

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
  setSelectedItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  processingId: string | null;
  batchProcessing: boolean;
  handleManualUpdate: (orderId: string, marketHashName: string, targetPrice: number, quantity: number) => Promise<void>;
  handleDeleteOrder: (orderId: string) => Promise<void>;
  handleBatchUpdate: () => Promise<void>;
  handleBatchDelete: () => Promise<void>;
  handleDeleteAllOrders: () => Promise<void>;
  handleOpenCsfloatMarket: (name: string) => void;
  handleOpenLookupModal: (name: string, acceptedPrice?: number, currentPrice?: number) => void;
  isSidebarExpanded: boolean;
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
}) => {
  const [showExtraActions, setShowExtraActions] = useState(false);

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const matchedCount = orders.filter((o) => getOrderDriftDetails(o) !== null).length;
  const actionRequiredCount = orders.filter((o) => {
    const d = getOrderDriftDetails(o);
    return d?.isOverbid || d?.isUnderbid;
  }).length;

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    orders.forEach((o) => {
      next[o.id] = true;
    });
    setSelectedItems(next);
  };

  const handleDeselectAll = () => {
    setSelectedItems({});
  };

  const handleInvertSelection = () => {
    const next: Record<string, boolean> = {};
    orders.forEach((o) => {
      next[o.id] = !selectedItems[o.id];
    });
    setSelectedItems(next);
  };

  const handleUpdateQuantity = (orderId: string, newQty: number) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, qty: newQty } : o)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px', minHeight: 0 }}>
      {/* Control Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--so-surface-card)',
          border: '1px solid var(--so-border-medium)',
          borderRadius: 'var(--so-radius-md)',
          padding: '8px 14px',
          flexWrap: 'wrap',
          gap: '10px',
          flexShrink: 0,
        }}
      >
        {/* Left Stats & Extra Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'var(--so-surface-panel)',
              border: '1px solid var(--so-border-medium)',
              padding: '4px 10px',
              borderRadius: 'var(--so-radius-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', fontWeight: 700 }}>
              <span style={{ color: 'var(--so-text-muted)' }}>
                Orders: <strong style={{ color: 'var(--so-text-primary)' }}>{orders.length}</strong>
              </span>
              <span style={{ color: 'var(--so-text-muted)' }}>
                Matched: <strong style={{ color: 'var(--so-accent-cyan)' }}>{matchedCount}</strong>
              </span>
              {actionRequiredCount > 0 && (
                <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <AlertTriangle size={12} /> Action Req: <strong>{actionRequiredCount}</strong>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowExtraActions((prev) => !prev)}
              className="btn btn-sm"
              style={{
                backgroundColor: showExtraActions ? 'var(--so-surface-input)' : 'transparent',
                color: showExtraActions ? 'var(--so-primary)' : 'var(--so-text-muted)',
                border: '1px solid var(--so-border-subtle)',
                padding: '3px 7px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '4px',
                transition: 'all 0.2s ease',
              }}
              title={showExtraActions ? 'Hide Extra Controls' : 'Open Extra Controls (Threshold & Delete All)'}
            >
              <Sliders size={12} style={{ color: showExtraActions ? 'var(--so-primary)' : 'var(--so-text-muted)' }} />
              <span style={{ fontSize: '10.5px' }}>{showExtraActions ? 'Hide' : 'Options'}</span>
              {showExtraActions ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
            </button>

            <div
              style={{
                maxWidth: showExtraActions ? '320px' : '0px',
                opacity: showExtraActions ? 1 : 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'var(--so-surface-input)',
                  border: '1px solid var(--so-border-medium)',
                  padding: '2px 6px',
                  borderRadius: 'var(--so-radius-sm)',
                }}
              >
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--so-text-secondary)' }}>
                  Threshold:
                </span>
                <input
                  type="number"
                  step="0.5"
                  value={driftThresholdPercent}
                  onChange={(e) => setDriftThresholdPercent(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '42px',
                    padding: '1px 3px',
                    fontSize: '11px',
                    borderRadius: '3px',
                    backgroundColor: 'var(--so-surface-panel)',
                    color: 'var(--so-text-primary)',
                    border: '1px solid var(--so-border-subtle)',
                    textAlign: 'center',
                    fontWeight: 700,
                  }}
                  title="Drift tolerance % before flagging order as overbid or underbid"
                />
                <span style={{ fontSize: '10px', color: 'var(--so-text-muted)' }}>%</span>
              </div>

              {orders.length > 0 && (
                <button
                  onClick={handleDeleteAllOrders}
                  disabled={batchProcessing}
                  className="btn btn-danger btn-sm"
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                  }}
                  title="Bulk Delete All Active CSFloat Buy Orders"
                >
                  <Trash2 size={11} /> Delete All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={fetchOrders} disabled={loading} className="btn btn-primary btn-sm">
            {loading ? <Loader2 size={14} className="spin" /> : <RotateCw size={14} />} Sync Buy Orders
          </button>
          <button
            onClick={loadAcceptedPrices}
            disabled={loadingPrices}
            className={`btn ${pricesLoaded ? 'btn-secondary' : 'btn-outline'} btn-sm`}
          >
            {loadingPrices ? <Loader2 size={14} className="spin" /> : <LinkIcon size={14} />}
            {pricesLoaded ? 'Reload Accepted Prices' : 'Load Accepted Prices'}
          </button>
        </div>
      </div>

      {/* Floating Selection Toolbar */}
      {selectedCount > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: isSidebarExpanded ? '246px' : '84px',
            right: '24px',
            zIndex: 1000,
            backgroundColor: 'rgba(23, 23, 33, 0.94)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--so-primary)',
            borderRadius: 'var(--so-radius-md)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(99, 102, 241, 0.25)',
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            animation: 'slideUp 0.2s ease-out',
            transition: 'left 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckSquare size={16} style={{ color: 'var(--so-primary)' }} />
              <span>{selectedCount} Selected</span>
            </span>
            <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--so-border-subtle)' }} />
            <button
              onClick={handleSelectAll}
              className="btn btn-sm btn-ghost"
              style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <CheckSquare size={12} /> Select All ({orders.length})
            </button>
            <button
              onClick={handleInvertSelection}
              className="btn btn-sm btn-ghost"
              style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={12} /> Invert
            </button>
            <button
              onClick={handleDeselectAll}
              className="btn btn-sm btn-ghost"
              style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--so-text-muted)' }}
            >
              <Square size={12} /> Deselect
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleBatchUpdate}
              disabled={batchProcessing}
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 800, fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {batchProcessing ? <Loader2 size={13} className="spin" /> : <RotateCw size={13} />}
              Update Selected ({selectedCount})
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={batchProcessing}
              className="btn btn-danger btn-sm"
              style={{ fontWeight: 800, fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {batchProcessing ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
              Cancel Selected ({selectedCount})
            </button>
            <button
              onClick={handleDeselectAll}
              className="btn btn-sm btn-ghost"
              style={{ padding: '6px', borderRadius: '50%', color: 'var(--so-text-muted)' }}
              title="Clear selection"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Orders Grid View */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {orders.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '50px 20px',
              color: 'var(--so-text-muted)',
            }}
          >
            {loading ? (
              <div>Fetching live buy orders from CSFloat...</div>
            ) : (
              <div>
                <Package size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--so-text-primary)', marginBottom: '4px' }}>
                  No active buy orders loaded
                </div>
                <div style={{ fontSize: '12px' }}>Click "Sync Buy Orders" above to sync your active buy orders from CSFloat</div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '10px',
              paddingBottom: selectedCount > 0 ? '75px' : '12px',
            }}
          >
            {orders.map((order) => {
              const driftDetails = getOrderDriftDetails(order);
              const isSelected = !!selectedItems[order.id];
              const isProcessing = processingId === order.id;

              return (
                <CSFloatOrderCard
                  key={order.id}
                  order={order}
                  isSelected={isSelected}
                  onToggleSelect={() => setSelectedItems((prev) => ({ ...prev, [order.id]: !prev[order.id] }))}
                  driftDetails={driftDetails}
                  isProcessing={isProcessing}
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
