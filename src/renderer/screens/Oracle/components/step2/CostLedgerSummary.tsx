import React from 'react';
import { Zap, RotateCw, Loader2 } from 'lucide-react';

interface CostLedgerSummaryProps {
  passingFilterCount: number;
  activeUnitCost: number;
  selectedEngine: 'standard' | 'nexus';
  cacheStatus: { itemCount: number; isFetching: boolean; lastFetchedAt: string | null };
  evaluatedSummary: {
    totalEvaluated: number;
    soCloseCount: number;
    highLiquidityCount: number;
    isBatchEvaluating: boolean;
    lastBuiltAt: string | null;
    batchProgress?: {
      current: number;
      total: number;
      percent: number;
    } | null;
  };
  strategyProfilePreset: string;
  canBuild: boolean;
  onBuildAcceptedPrices: () => void;
}

export const CostLedgerSummary: React.FC<CostLedgerSummaryProps> = ({
  passingFilterCount,
  activeUnitCost,
  selectedEngine,
  cacheStatus,
  evaluatedSummary,
  strategyProfilePreset,
  canBuild,
  onBuildAcceptedPrices,
}) => {
  const estimatedCostCents = passingFilterCount * activeUnitCost;
  const formattedCost = `$${(estimatedCostCents / 100).toFixed(2)}`;
  const isNexus = selectedEngine === 'nexus';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '16px 20px',
        backgroundColor: 'var(--so-surface-panel)',
        border: isNexus ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--so-border-medium)',
        borderRadius: 'var(--so-radius-md)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1, minWidth: '260px' }}>
        <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--so-text-primary)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={16} style={{ color: isNexus ? 'var(--so-primary)' : 'var(--so-cyan-text)' }} />
          Compute Target Workstation Accepted Prices ({isNexus ? 'Nexus Pro Dynamic' : 'Standard Baseline'})
        </div>
        <div style={{ fontSize: '12.5px', color: 'var(--so-text-muted)' }}>
          {cacheStatus.itemCount === 0
            ? 'Fetch or load price cache above to activate pricing generation'
            : evaluatedSummary.lastBuiltAt
              ? `Last built at ${evaluatedSummary.lastBuiltAt} — ${evaluatedSummary.totalEvaluated.toLocaleString()} items generated using ${isNexus ? 'NEXUS PRO' : strategyProfilePreset.toUpperCase()} strategy`
              : `Send merged price cache to SaaS Backend (${isNexus ? 'OracleNexus v2' : 'SkinOracle v20'}) → stores accepted prices in local memory`}
        </div>
      </div>

      {/* Estimated Cost Breakdown Pill */}
      {passingFilterCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '8px 20px',
            borderRadius: '30px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            border: isNexus ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(14, 165, 233, 0.25)',
            boxShadow: isNexus ? '0 0 16px rgba(99, 102, 241, 0.15)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isNexus ? '#818cf8' : '#38bdf8',
                boxShadow: isNexus ? '0 0 8px #818cf8' : '0 0 8px #38bdf8',
              }}
            />
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--so-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isNexus ? 'Nexus Cost' : 'Est. Cost'}
            </span>
          </div>
          <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--so-border-subtle)' }} />
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#f3f4f6', letterSpacing: '0.5px' }}>
            {formattedCost}
            <span style={{ fontSize: '11px', color: 'var(--so-text-muted)', fontWeight: 500, marginLeft: '6px' }}>
              ({activeUnitCost}¢ / item)
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onBuildAcceptedPrices}
        disabled={!canBuild || evaluatedSummary.isBatchEvaluating}
        className={`btn ${isNexus ? 'btn-primary' : 'btn-primary'} btn-lg ${evaluatedSummary.isBatchEvaluating ? 'btn-evaluating' : ''}`}
        style={{
          minWidth: '240px',
          position: 'relative',
          overflow: 'hidden',
        }}
        aria-busy={evaluatedSummary.isBatchEvaluating}
      >
        {/* Real-time Progress Bar fill inside button */}
        {evaluatedSummary.isBatchEvaluating && evaluatedSummary.batchProgress && (
          <>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${evaluatedSummary.batchProgress.percent}%`,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                transition: 'width 0.25s ease-out',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                bottom: 0,
                height: '3px',
                width: `${evaluatedSummary.batchProgress.percent}%`,
                backgroundColor: isNexus ? 'var(--so-primary)' : 'var(--so-accent-cyan, #0284c7)',
                transition: 'width 0.25s ease-out',
                pointerEvents: 'none',
              }}
            />
          </>
        )}

        {evaluatedSummary.isBatchEvaluating ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
            <Loader2 size={18} className="spin" style={{ flexShrink: 0 }} />
            <span>
              {evaluatedSummary.batchProgress
                ? `Building… ${evaluatedSummary.batchProgress.percent}% (${evaluatedSummary.batchProgress.current.toLocaleString()}/${evaluatedSummary.batchProgress.total.toLocaleString()})`
                : `Building… (${evaluatedSummary.totalEvaluated.toLocaleString()})`}
            </span>
          </span>
        ) : evaluatedSummary.lastBuiltAt ? (
          <>
            <RotateCw size={18} /> Rebuild Accepted Prices ({isNexus ? 'Nexus Pro' : 'Standard'})
          </>
        ) : (
          <>
            <Zap size={18} /> Build Accepted Price ({isNexus ? 'Nexus Pro' : 'Standard'})
          </>
        )}
      </button>
    </div>
  );
};
