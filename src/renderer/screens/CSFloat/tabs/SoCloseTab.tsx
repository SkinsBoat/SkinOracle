import React from 'react';
import {
  Zap,
  Wallet,
  Loader2,
  CheckSquare,
  Square,
  RefreshCw,
  X,
  PlusCircle,
} from 'lucide-react';
import { CSFloatSoCloseCard, SoCloseResultItem } from '../components/CSFloatSoCloseCard';

interface SoCloseTabProps {
  soCloseResults: SoCloseResultItem[];
  isSoCloseRunning: boolean;
  runSoCloseScan: () => Promise<void>;
  soCloseMinPrice: string;
  setSoCloseMinPrice: (val: string) => void;
  soCloseMaxPrice: string;
  setSoCloseMaxPrice: (val: string) => void;
  handleSetBalanceAsMax: () => void;
  userData: { balance?: number; username?: string; avatar?: string } | null;
  soCloseMaxCloseness: number;
  setSoCloseMaxCloseness: (val: number) => void;
  soCloseAllowedWears: {
    fn: boolean;
    mw: boolean;
    ft: boolean;
    ww: boolean;
    bs: boolean;
    souvenir: boolean;
    sticker: boolean;
  };
  setSoCloseAllowedWears: React.Dispatch<React.SetStateAction<any>>;
  selectedSoCloseItems: Record<string, boolean>;
  setSelectedSoCloseItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  soCloseProcessingName: string | null;
  batchSoCloseProcessing: boolean;
  handleCreateSoCloseBuyOrder: (item: SoCloseResultItem) => Promise<void>;
  handleBatchCreateSoCloseOrders: () => Promise<void>;
  handleOpenCsfloatMarket: (name: string) => void;
  handleOpenLookupModal: (name: string, acceptedPrice?: number, currentMarketPrice?: number, iconUrl?: string) => void;
  getWearShortcut: (wearText?: string) => string;
  isSidebarExpanded: boolean;
}

export const SoCloseTab: React.FC<SoCloseTabProps> = ({
  soCloseResults,
  isSoCloseRunning,
  runSoCloseScan,
  soCloseMinPrice,
  setSoCloseMinPrice,
  soCloseMaxPrice,
  setSoCloseMaxPrice,
  handleSetBalanceAsMax,
  userData,
  soCloseMaxCloseness,
  setSoCloseMaxCloseness,
  soCloseAllowedWears,
  setSoCloseAllowedWears,
  selectedSoCloseItems,
  setSelectedSoCloseItems,
  soCloseProcessingName,
  batchSoCloseProcessing,
  handleCreateSoCloseBuyOrder,
  handleBatchCreateSoCloseOrders,
  handleOpenCsfloatMarket,
  handleOpenLookupModal,
  getWearShortcut,
  isSidebarExpanded,
}) => {
  const selectedSoCloseCount = Object.values(selectedSoCloseItems).filter(Boolean).length;

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    soCloseResults.forEach((item) => {
      if (!item.hasExistingOrder) {
        next[item.name] = true;
      }
    });
    setSelectedSoCloseItems(next);
  };

  const handleDeselectAll = () => {
    setSelectedSoCloseItems({});
  };

  const handleInvertSelection = () => {
    const next: Record<string, boolean> = {};
    soCloseResults.forEach((item) => {
      if (!item.hasExistingOrder) {
        next[item.name] = !selectedSoCloseItems[item.name];
      }
    });
    setSelectedSoCloseItems(next);
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
        {/* Left Scanner Inputs & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Price Range Filter Inputs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--so-surface-panel)',
              border: '1px solid var(--so-border-medium)',
              padding: '4px 8px',
              borderRadius: 'var(--so-radius-sm)',
              fontSize: '11px',
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--so-text-secondary)' }}>Price Range ($):</span>
            <input
              type="number"
              value={soCloseMinPrice}
              onChange={(e) => setSoCloseMinPrice(e.target.value)}
              placeholder="Min"
              style={{
                width: '42px',
                padding: '1px 4px',
                fontSize: '11px',
                fontWeight: 800,
                textAlign: 'center',
                borderRadius: '3px',
                border: '1px solid var(--so-border-subtle)',
                background: 'var(--so-surface-card)',
                color: 'var(--so-text-primary)',
              }}
            />
            <span style={{ color: 'var(--so-text-muted)' }}>-</span>
            <input
              type="number"
              value={soCloseMaxPrice}
              onChange={(e) => setSoCloseMaxPrice(e.target.value)}
              placeholder="Max"
              style={{
                width: '48px',
                padding: '1px 4px',
                fontSize: '11px',
                fontWeight: 800,
                textAlign: 'center',
                borderRadius: '3px',
                border: '1px solid var(--so-border-subtle)',
                background: 'var(--so-surface-card)',
                color: 'var(--so-text-primary)',
              }}
            />
            <button
              type="button"
              onClick={handleSetBalanceAsMax}
              title={`Set Max Price to Available Balance (${userData?.balance !== undefined ? `$${userData.balance.toFixed(2)}` : '$0.00'})`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px 4px',
                borderRadius: '3px',
                background: 'var(--so-surface-card)',
                border: '1px solid var(--so-border-subtle)',
                color: 'var(--so-accent-cyan)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Wallet size={12} />
            </button>
          </div>

          {/* Max Closeness Distance Input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--so-surface-panel)',
              border: '1px solid var(--so-border-medium)',
              padding: '4px 8px',
              borderRadius: 'var(--so-radius-sm)',
              fontSize: '11px',
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--so-text-secondary)' }}>Max Distance:</span>
            <input
              type="number"
              step="0.01"
              value={soCloseMaxCloseness}
              onChange={(e) => setSoCloseMaxCloseness(parseFloat(e.target.value) || 1.0)}
              style={{
                width: '48px',
                padding: '1px 4px',
                fontSize: '11px',
                fontWeight: 800,
                textAlign: 'center',
                borderRadius: '3px',
                border: '1px solid var(--so-border-subtle)',
                background: 'var(--so-surface-card)',
                color: 'var(--so-text-primary)',
              }}
            />
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--so-accent-cyan)' }}>
              (+{((soCloseMaxCloseness - 1) * 100).toFixed(0)}%)
            </span>
          </div>

          {/* Wear Condition Selector Badges */}
          <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--so-text-muted)', marginRight: '2px' }}>
              Wears:
            </span>
            {[
              { key: 'fn', label: 'FN' },
              { key: 'mw', label: 'MW' },
              { key: 'ft', label: 'FT' },
              { key: 'ww', label: 'WW' },
              { key: 'bs', label: 'BS' },
              { key: 'souvenir', label: 'Souvenir' },
              { key: 'sticker', label: 'Sticker' },
            ].map((w) => {
              const active = soCloseAllowedWears[w.key as keyof typeof soCloseAllowedWears];
              return (
                <button
                  key={w.key}
                  type="button"
                  onClick={() =>
                    setSoCloseAllowedWears((prev: any) => ({ ...prev, [w.key]: !prev[w.key] }))
                  }
                  style={{
                    padding: '2px 6px',
                    fontSize: '9.5px',
                    fontWeight: 800,
                    borderRadius: '3px',
                    cursor: 'pointer',
                    backgroundColor: active ? 'var(--so-primary)' : 'var(--so-surface-panel)',
                    color: active ? '#ffffff' : 'var(--so-text-muted)',
                    border: active ? 'none' : '1px solid var(--so-border-subtle)',
                  }}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Scan Button */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={runSoCloseScan}
            disabled={isSoCloseRunning}
            className="btn btn-primary btn-sm"
            style={{ fontWeight: 800 }}
          >
            {isSoCloseRunning ? <Loader2 size={14} className="spin" /> : <Zap size={14} />} Run SoClose Scan
          </button>
        </div>
      </div>

      {/* Floating Selection Toolbar */}
      {selectedSoCloseCount > 0 && (
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
              <span>{selectedSoCloseCount} Selected Opportunities</span>
            </span>
            <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--so-border-subtle)' }} />
            <button
              onClick={handleSelectAll}
              className="btn btn-sm btn-ghost"
              style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <CheckSquare size={12} /> Select All
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
              onClick={handleBatchCreateSoCloseOrders}
              disabled={batchSoCloseProcessing}
              className="btn btn-primary btn-sm"
              style={{ fontWeight: 800, fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {batchSoCloseProcessing ? <Loader2 size={13} className="spin" /> : <PlusCircle size={13} />}
              Place Orders for Selected ({selectedSoCloseCount})
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

      {/* So Close Grid View */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {soCloseResults.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '50px 20px',
              color: 'var(--so-text-muted)',
            }}
          >
            {isSoCloseRunning ? (
              <div>Scanning CSFloat market prices against Step 2 Accepted Prices...</div>
            ) : (
              <div>
                <Zap size={32} style={{ marginBottom: '10px', opacity: 0.5, color: 'var(--so-accent-cyan)' }} />
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--so-text-primary)', marginBottom: '4px' }}>
                  No So Close opportunities loaded
                </div>
                <div style={{ fontSize: '12px' }}>
                  Click "Run SoClose Scan" above to evaluate Step 1 CSFloat market prices against Oracle Accepted Prices
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: '10px',
              paddingBottom: selectedSoCloseCount > 0 ? '75px' : '12px',
            }}
          >
            {soCloseResults.map((item) => {
              const isSelected = !!selectedSoCloseItems[item.name];
              const isProcessing = soCloseProcessingName === item.name;
              const match = item.name.match(/^(.+?)\s*\(([^)]+)\)$/);
              const wearText = match ? match[2] : '';
              const wearShortcut = getWearShortcut(wearText);

              return (
                <CSFloatSoCloseCard
                  key={item.name}
                  item={item}
                  isSelected={isSelected}
                  onToggleSelect={() =>
                    setSelectedSoCloseItems((prev) => ({ ...prev, [item.name]: !prev[item.name] }))
                  }
                  isProcessing={isProcessing}
                  onCreateBuyOrder={handleCreateSoCloseBuyOrder}
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
