import React from 'react';
import { Database, RotateCw, AlertTriangle, Check, Sparkles, Loader2, Zap } from 'lucide-react';

interface DevSimulatorPanelProps {
  trendStats: {
    daysCount: number;
    totalSnapshots: number;
    itemCoverage: number;
    latestDate: string | null;
    oldestDate: string | null;
  } | null;
  isLoadingStats: boolean;
  fetchConfigAndStats: () => Promise<void>;
  simulatedDate: string | null;
  seedDays: number;
  setSeedDays: (days: number) => void;
  isSeedingHistory: boolean;
  handleSeedMockHistory: (days?: number) => Promise<void>;
  handleSetSimulatedDate: (date: string | null) => Promise<void>;
  isClearingHistory: boolean;
  handleClearTrendHistory: () => Promise<void>;
}

export const DevSimulatorPanel: React.FC<DevSimulatorPanelProps> = ({
  trendStats,
  isLoadingStats,
  fetchConfigAndStats,
  simulatedDate,
  seedDays,
  setSeedDays,
  isSeedingHistory,
  handleSeedMockHistory,
  handleSetSimulatedDate,
  isClearingHistory,
  handleClearTrendHistory,
}) => {
  const getPastDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: 'var(--so-radius-sm)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        border: '1px solid var(--so-border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '18px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Database size={16} style={{ color: 'var(--so-cyan-text)' }} />
          <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--so-text-primary)' }}>
            Local SQLite Trend Intelligence:
          </span>
          {trendStats ? (
            <span
              className={`badge ${trendStats.daysCount >= 3 ? 'badge-primary' : trendStats.daysCount > 0 ? 'badge-warning' : 'badge-ghost'}`}
              style={{ fontSize: '11px', padding: '2px 8px' }}
            >
              {trendStats.daysCount >= 3
                ? `● Verified (${trendStats.daysCount} Snapshot Days)`
                : trendStats.daysCount > 0
                  ? `▲ Baseline Building (${trendStats.daysCount}/3 Days)`
                  : `○ No History (0 Days)`}
            </span>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--so-text-muted)' }}>
              Connecting to local analytics.sqlite...
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={fetchConfigAndStats}
          disabled={isLoadingStats}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'none',
            border: 'none',
            color: 'var(--so-text-muted)',
            fontSize: '11.5px',
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          <RotateCw size={12} className={isLoadingStats ? 'spin' : ''} />
          Refresh Status
        </button>
      </div>

      {trendStats && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '11.5px', color: 'var(--so-text-secondary)' }}>
          <span>
            Total Snapshots: <strong style={{ color: 'var(--so-text-primary)' }}>{trendStats.totalSnapshots.toLocaleString()}</strong>
          </span>
          <span>•</span>
          <span>
            Item Coverage: <strong style={{ color: 'var(--so-text-primary)' }}>{trendStats.itemCoverage.toLocaleString()} unique skins</strong>
          </span>
          <span>•</span>
          <span>
            Date Range: <strong style={{ color: 'var(--so-text-primary)' }}>{trendStats.oldestDate || 'None'} → {trendStats.latestDate || 'None'}</strong>
          </span>
        </div>
      )}

      {trendStats && trendStats.daysCount < 3 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--so-warning-text)', fontSize: '11.5px', fontWeight: 600, marginTop: '2px' }}>
          <AlertTriangle size={14} />
          <span>Baseline building: Items without 3 days of trend will lock to $0.00 for capital safety. Build price cache in Step 1 daily to accumulate history.</span>
        </div>
      )}
      {trendStats && trendStats.daysCount >= 3 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '11.5px', fontWeight: 600, marginTop: '2px' }}>
          <Check size={14} />
          <span>Ready for AI Momentum Valuation: Slope linear regression & volatility cut filters are active.</span>
        </div>
      )}

      {/* ── Dev Mode: Trend Data Simulator Toolbar ── */}
      {import.meta.env.DEV && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px 14px',
            borderRadius: 'var(--so-radius-sm)',
            backgroundColor: 'rgba(234, 179, 8, 0.05)',
            border: '1px dashed rgba(234, 179, 8, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 800, color: 'var(--so-warning-text, #f59e0b)' }}>
              <Sparkles size={14} /> Dev Simulator: Rapid Trend History Injector
            </div>
            {simulatedDate && (
              <span className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 6px' }}>
                Date Override: {simulatedDate}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Action 1: Inject Mock History with Days Selector */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <select
                value={seedDays}
                onChange={(e) => setSeedDays(Number(e.target.value))}
                disabled={isSeedingHistory}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--so-surface-input)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  color: 'var(--so-text-primary)',
                  cursor: 'pointer',
                }}
                title="Select number of days of synthetic trend data to generate"
              >
                <option value={7}>7 Days (Fast Momentum)</option>
                <option value={14}>14 Days (Standard Window)</option>
                <option value={30}>30 Days (Macro Stability)</option>
                <option value={60}>60 Days (Extended)</option>
                <option value={90}>90 Days (Deep Analysis)</option>
              </select>

              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => handleSeedMockHistory(seedDays)}
                disabled={isSeedingHistory}
                style={{
                  fontSize: '11.5px',
                  padding: '4px 10px',
                  border: '1px solid rgba(99, 102, 241, 0.5)',
                  backgroundColor: 'rgba(99, 102, 241, 0.12)',
                  color: 'var(--so-primary, #6366f1)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
                title={`Instantly populates ${seedDays} days of realistic price movements for all cached skins`}
              >
                {isSeedingHistory ? <Loader2 size={13} className="spin" /> : <Zap size={13} />}
                ⚡ Seed {seedDays}-Day Trend Data
              </button>
            </div>

            {/* Action 2: Simulate Date Override Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--so-text-muted)' }}>Simulate Date:</span>
              <select
                value={simulatedDate || ''}
                onChange={(e) => handleSetSimulatedDate(e.target.value || null)}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--so-surface-input)',
                  border: '1px solid var(--so-border-subtle)',
                  color: simulatedDate ? 'var(--so-warning-text, #f59e0b)' : 'var(--so-text-primary)',
                }}
              >
                <option value="">Live (Today)</option>
                <option value={getPastDateStr(1)}>Yesterday (-1 Day)</option>
                <option value={getPastDateStr(2)}>-2 Days</option>
                <option value={getPastDateStr(3)}>-3 Days</option>
                <option value={getPastDateStr(7)}>-7 Days (1 Week)</option>
                <option value={getPastDateStr(14)}>-14 Days (2 Weeks)</option>
              </select>
            </div>

            {/* Action 3: Wipe SQLite History */}
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={handleClearTrendHistory}
              disabled={isClearingHistory}
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                color: 'var(--so-danger-text, #ef4444)',
                marginLeft: 'auto',
              }}
              title="Wipes SQLite price_snapshots to test $0.00 cold-start safety contract"
            >
              {isClearingHistory ? <Loader2 size={12} className="spin" /> : '🗑️ Wipe Trend DB'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
