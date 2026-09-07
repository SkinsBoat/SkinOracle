import React from 'react';
import { Cpu, TrendingUp, Check, Compass, Shield, Scale, Rocket, Activity, ShieldAlert } from 'lucide-react';
import { OracleStrategyProfile } from '../../../../store/useOracleStore';

export const STRATEGY_PRESETS: Record<string, OracleStrategyProfile> = {
  conservative: {
    preset: 'conservative',
    liquidityDepth: 'strict',
    valuationMargin: 'conservative',
    outlierProtection: 'strict',
  },
  balanced: {
    preset: 'balanced',
    liquidityDepth: 'moderate',
    valuationMargin: 'standard',
    outlierProtection: 'standard',
  },
  aggressive: {
    preset: 'aggressive',
    liquidityDepth: 'broad',
    valuationMargin: 'competitive',
    outlierProtection: 'permissive',
  },
};

interface EngineStrategyPanelProps {
  selectedEngine: 'standard' | 'nexus';
  setSelectedEngine: (engine: 'standard' | 'nexus') => void;
  unitCostCents: number;
  nexusUnitCostCents: number;
  strategyProfile: OracleStrategyProfile;
  setStrategyProfile: React.Dispatch<React.SetStateAction<OracleStrategyProfile>>;
}

export const EngineStrategyPanel: React.FC<EngineStrategyPanelProps> = ({
  selectedEngine,
  setSelectedEngine,
  unitCostCents,
  nexusUnitCostCents,
  strategyProfile,
  setStrategyProfile,
}) => {
  const applyBasePreset = (presetName: 'conservative' | 'balanced' | 'aggressive') => {
    setStrategyProfile(STRATEGY_PRESETS[presetName]);
  };

  return (
    <>
      {/* ── Engine / AI Model Selector Cards ── */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--so-text-muted)', marginBottom: '8px' }}>
          Select Valuation Engine Model
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {/* Option 1: SkinOracle v20 Standard */}
          <div
            onClick={() => setSelectedEngine('standard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: 'var(--so-radius-md)',
              backgroundColor: selectedEngine === 'standard' ? 'rgba(14, 165, 233, 0.10)' : 'var(--so-surface-panel)',
              border: selectedEngine === 'standard' ? '2px solid var(--so-cyan-text, #0ea5e9)' : '1px solid var(--so-border-medium)',
              boxShadow: selectedEngine === 'standard' ? '0 0 16px rgba(14, 165, 233, 0.15)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selectedEngine === 'standard' ? 'rgba(14, 165, 233, 0.25)' : 'var(--so-surface-input)',
                color: selectedEngine === 'standard' ? 'var(--so-cyan-text)' : 'var(--so-text-muted)',
              }}
            >
              <Cpu size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: selectedEngine === 'standard' ? '#fff' : 'var(--so-text-primary)' }}>
                  🔮 SkinOracle v20 Standard
                </span>
                <span className="badge badge-ghost" style={{ fontSize: '10.5px', padding: '2px 8px' }}>
                  {unitCostCents}¢ / item (${((unitCostCents * 10000) / 100).toFixed(2)} / 10k)
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--so-text-muted)', marginTop: '2px' }}>
                Multi-market weighted cross-sectional evaluation & outlier cap shield.
              </div>
            </div>
            {selectedEngine === 'standard' && <Check size={18} style={{ color: 'var(--so-cyan-text)' }} />}
          </div>

          {/* Option 2: OracleNexus v2 Pro */}
          <div
            onClick={() => setSelectedEngine('nexus')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: 'var(--so-radius-md)',
              backgroundColor: selectedEngine === 'nexus' ? 'rgba(99, 102, 241, 0.12)' : 'var(--so-surface-panel)',
              border: selectedEngine === 'nexus' ? '2px solid var(--so-primary, #6366f1)' : '1px solid var(--so-border-medium)',
              boxShadow: selectedEngine === 'nexus' ? '0 0 16px rgba(99, 102, 241, 0.22)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selectedEngine === 'nexus' ? 'rgba(99, 102, 241, 0.25)' : 'var(--so-surface-input)',
                color: selectedEngine === 'nexus' ? 'var(--so-primary)' : 'var(--so-text-muted)',
              }}
            >
              <TrendingUp size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: selectedEngine === 'nexus' ? '#fff' : 'var(--so-text-primary)' }}>
                  🧬 OracleNexus v2 Pro
                </span>
                <span className="badge badge-primary" style={{ fontSize: '10.5px', padding: '2px 8px' }}>
                  {nexusUnitCostCents}¢ / item (${((nexusUnitCostCents * 10000) / 100).toFixed(2)} / 10k)
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--so-text-muted)', marginTop: '2px' }}>
                Dynamic trend intelligence: momentum, crash detection & volatility haircut.
              </div>
            </div>
            {selectedEngine === 'nexus' && <Check size={18} style={{ color: 'var(--so-primary)' }} />}
          </div>
        </div>
      </div>

      {/* ── Section 2: Oracle Strategy & Risk Parameters ── */}
      <div
        style={{
          padding: '18px 20px',
          borderRadius: 'var(--so-radius-md)',
          backgroundColor: 'var(--so-surface-panel)',
          border: '1px solid var(--so-border-medium)',
          marginBottom: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={16} style={{ color: 'var(--so-cyan-text)' }} /> Section 2: Valuation Strategy & Risk Profile
          </div>

          {/* Quick Strategy Presets */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`btn btn-sm ${strategyProfile.preset === 'conservative' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => applyBasePreset('conservative')}
              style={{ fontSize: '11.5px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Shield size={13} /> Conservative
            </button>
            <button
              type="button"
              className={`btn btn-sm ${strategyProfile.preset === 'balanced' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => applyBasePreset('balanced')}
              style={{ fontSize: '11.5px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Scale size={13} /> Balanced
            </button>
            <button
              type="button"
              className={`btn btn-sm ${strategyProfile.preset === 'aggressive' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => applyBasePreset('aggressive')}
              style={{ fontSize: '11.5px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Rocket size={13} /> Aggressive
            </button>
          </div>
        </div>

        <p style={{ fontSize: '12.5px', color: 'var(--so-text-muted)', marginBottom: '14px' }}>
          Configure your trading aggressiveness, market depth preference, and spike protection without revealing core internal valuation formulas.
        </p>

        {/* Strategy Control Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {/* 1. Market Liquidity Depth */}
          <div style={{ padding: '12px 14px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--so-text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={14} style={{ color: 'var(--so-cyan-text)' }} /> Market Volume Threshold
            </div>
            <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', marginBottom: '8px' }}>
              Controls minimum market activity required for pricing
            </div>

            <select
              value={strategyProfile.liquidityDepth}
              onChange={(e) => setStrategyProfile((s) => ({ ...s, preset: 'custom', liquidityDepth: e.target.value as any }))}
              style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: 'var(--so-radius-sm)' }}
            >
              <option value="strict">High Volume Only (Ultra Safe)</option>
              <option value="moderate">Moderate Volume (Standard)</option>
              <option value="broad">Broad Coverage (Include Niche Items)</option>
            </select>
          </div>

          {/* 2. Valuation Margin Profile */}
          <div style={{ padding: '12px 14px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--so-text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={14} style={{ color: 'var(--so-primary)' }} /> Pricing Target Profile
            </div>
            <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', marginBottom: '8px' }}>
              Controls valuation aggressiveness for buy orders
            </div>

            <select
              value={strategyProfile.valuationMargin}
              onChange={(e) => setStrategyProfile((s) => ({ ...s, preset: 'custom', valuationMargin: e.target.value as any }))}
              style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: 'var(--so-radius-sm)' }}
            >
              <option value="conservative">Conservative (-5% Risk Buffer)</option>
              <option value="standard">Standard (Optimal Yield)</option>
              <option value="competitive">Competitive (+3% Aggressive Execution)</option>
            </select>
          </div>

          {/* 3. Outlier & Spike Protection */}
          <div style={{ padding: '12px 14px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--so-text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={14} style={{ color: 'var(--so-warning-text)' }} /> Spike Protection Filter
            </div>
            <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', marginBottom: '8px' }}>
              Filters temporary price spikes across market listings
            </div>

            <select
              value={strategyProfile.outlierProtection}
              onChange={(e) => setStrategyProfile((s) => ({ ...s, preset: 'custom', outlierProtection: e.target.value as any }))}
              style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: 'var(--so-radius-sm)' }}
            >
              <option value="strict">Strict Spike Shield (Filter Volatile Spikes)</option>
              <option value="standard">Standard Spike Filter</option>
              <option value="permissive">Permissive (Include High Listings)</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
};
