import React from 'react';
import { Zap, ChevronUp, ChevronDown, Sliders, RefreshCw, Check, Tag, Compass, Shield, Scale, Rocket, Activity, Cpu, ShieldAlert, Loader2, RotateCw, } from 'lucide-react';
import { BuildPreFilters, OracleStrategyProfile } from '../../../store/useOracleStore';

const STRATEGY_PRESETS: Record<string, OracleStrategyProfile> = {
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

interface Step2AcceptedPricesProps {
  isOpen: boolean;
  onToggle: () => void;
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
  cacheStatus: { itemCount: number; isFetching: boolean; lastFetchedAt: string | null };
  passingFilterCount: number;
  preFilters: BuildPreFilters;
  setPreFilters: React.Dispatch<React.SetStateAction<BuildPreFilters>>;
  toggleWear: (wearKey: keyof BuildPreFilters['allowedWears']) => void;
  resetPreFilters: () => void;
  strategyProfile: OracleStrategyProfile;
  setStrategyProfile: React.Dispatch<React.SetStateAction<OracleStrategyProfile>>;
  onBuildAcceptedPrices: () => void;
  canBuild: boolean;
}

export const Step2AcceptedPrices: React.FC<Step2AcceptedPricesProps> = ({
  isOpen,
  onToggle,
  evaluatedSummary,
  cacheStatus,
  passingFilterCount,
  preFilters,
  setPreFilters,
  toggleWear,
  resetPreFilters,
  strategyProfile,
  setStrategyProfile,
  onBuildAcceptedPrices,
  canBuild,
}) => {
  const [unitCostCents, setUnitCostCents] = React.useState(0.001);

  React.useEffect(() => {
    if (window.electronAPI?.system) {
      window.electronAPI.system.getConfig().then(config => {
        if (config?.oracleUnitCostCents !== undefined) {
          setUnitCostCents(config.oracleUnitCostCents);
        }
      }).catch(() => {});
    }
  }, []);

  const applyPreset = (presetName: 'conservative' | 'balanced' | 'aggressive') => {
    setStrategyProfile(STRATEGY_PRESETS[presetName]);
  };

  return (
    <div className="card" style={{ border: '1px solid var(--so-border-medium)', padding: 0, overflow: 'hidden' }}>
      {/* Accordion Header Bar */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          backgroundColor: isOpen ? 'var(--so-surface-panel)' : 'var(--so-surface-card)',
          borderBottom: isOpen ? '1px solid var(--so-border-subtle)' : 'none',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'background-color 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} style={{ color: 'var(--so-cyan-text)' }} /> Builder Accepted Price for Purchasing Decisions and Buy Orders
            </div>
            {!isOpen && (
              <div style={{ fontSize: '12px', color: 'var(--so-text-muted)', marginTop: '2px' }}>
                Configure buy ceilings, risk filters, & calculate max purchase targets
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className={`badge ${evaluatedSummary.lastBuiltAt ? 'badge-cyan' : 'badge-ghost'}`} style={{ fontSize: '11px' }}>
            {evaluatedSummary.lastBuiltAt ? `✓ Built (${evaluatedSummary.totalEvaluated.toLocaleString()} Items)` : 'Not Built Yet'}
          </span>
          {isOpen ? <ChevronUp size={18} style={{ color: 'var(--so-text-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--so-text-muted)' }} />}
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: '20px' }}>
          <p className="card-desc" style={{ marginBottom: '16px' }}>
            Takes cached pricing data from active price providers (Skinsnipe) and evaluates target accepted prices across CSFloat and Skins.com workstations.
          </p>

          {/* ── Section 1: Smart Pre-Evaluation Filters ── */}
          <div style={{
            padding: '18px 20px',
            borderRadius: 'var(--so-radius-md)',
            backgroundColor: 'var(--so-surface-panel)',
            border: '1px solid var(--so-border-medium)',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={16} style={{ color: 'var(--so-primary)' }} /> Section 1: Pre-Evaluation Filters
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {cacheStatus.itemCount > 0 && (
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--so-cyan-text)' }}>
                    Passing Filters: {passingFilterCount.toLocaleString()} / {cacheStatus.itemCount.toLocaleString()} items
                  </div>
                )}
                <button className="btn btn-sm btn-ghost" onClick={resetPreFilters} style={{ fontSize: '11.5px', padding: '3px 8px' }}>
                  <RefreshCw size={12} /> Reset Pre-Filters
                </button>
              </div>
            </div>

            {/* Quick Category & Special Exclusions Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              {/* Exclude Souvenir */}
              <div
                onClick={() => setPreFilters(p => ({ ...p, excludeSouvenir: !p.excludeSouvenir }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--so-radius-sm)',
                  backgroundColor: preFilters.excludeSouvenir ? 'rgba(239, 68, 68, 0.12)' : 'var(--so-surface-input)',
                  border: preFilters.excludeSouvenir ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--so-border-subtle)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: preFilters.excludeSouvenir ? 'var(--so-danger)' : 'transparent',
                    border: preFilters.excludeSouvenir ? 'none' : '1px solid var(--so-border-medium)',
                  }}
                >
                  {preFilters.excludeSouvenir && <Check size={12} style={{ color: '#fff' }} />}
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: preFilters.excludeSouvenir ? 'var(--so-danger-text)' : 'var(--so-text-primary)' }}>
                    Exclude Souvenir Items
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--so-text-muted)' }}>
                    Removes Souvenir package drops
                  </div>
                </div>
              </div>

              {/* Exclude StatTrak */}
              <div
                onClick={() => setPreFilters(p => ({ ...p, excludeStatTrak: !p.excludeStatTrak }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--so-radius-sm)',
                  backgroundColor: preFilters.excludeStatTrak ? 'rgba(239, 68, 68, 0.12)' : 'var(--so-surface-input)',
                  border: preFilters.excludeStatTrak ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--so-border-subtle)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: preFilters.excludeStatTrak ? 'var(--so-danger)' : 'transparent',
                    border: preFilters.excludeStatTrak ? 'none' : '1px solid var(--so-border-medium)',
                  }}
                >
                  {preFilters.excludeStatTrak && <Check size={12} style={{ color: '#fff' }} />}
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: preFilters.excludeStatTrak ? 'var(--so-danger-text)' : 'var(--so-text-primary)' }}>
                    Exclude StatTrak™ Items
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--so-text-muted)' }}>
                    Removes kill-tracker weapons
                  </div>
                </div>
              </div>

              {/* Exclude Stickers (Single Button Action) */}
              <div
                onClick={() => setPreFilters(p => ({ ...p, excludeStickers: !p.excludeStickers }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--so-radius-sm)',
                  backgroundColor: preFilters.excludeStickers ? 'rgba(239, 68, 68, 0.12)' : 'var(--so-surface-input)',
                  border: preFilters.excludeStickers ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--so-border-subtle)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: preFilters.excludeStickers ? 'var(--so-danger)' : 'transparent',
                    border: preFilters.excludeStickers ? 'none' : '1px solid var(--so-border-medium)',
                  }}
                >
                  {preFilters.excludeStickers && <Check size={12} style={{ color: '#fff' }} />}
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: preFilters.excludeStickers ? 'var(--so-danger-text)' : 'var(--so-text-primary)' }}>
                    Exclude Stickers
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--so-text-muted)' }}>
                    Removes standalone stickers & patches
                  </div>
                </div>
              </div>

              {/* Forced Group Exclusions: Charms, Cases, Keys, Music Kits, Agents (Disabled from unchecking) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--so-radius-sm)',
                  backgroundColor: 'var(--so-surface-input)',
                  border: '1px solid var(--so-border-subtle)',
                  cursor: 'not-allowed',
                  userSelect: 'none',
                  opacity: 0.75,
                }}
                title="Forced Excluded Category Group (Locked)"
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--so-border-medium)',
                    border: 'none',
                  }}
                >
                  <Check size={12} style={{ color: 'var(--so-text-primary)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--so-text-muted)' }}>
                    Exclude Charms, Cases, Keys, Music Kits & Agents
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', opacity: 0.8 }}>
                    Forced Filtered Out (Locked)
                  </div>
                </div>
              </div>
            </div>

            {/* Wear Condition Selector */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--so-text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={14} /> Allowed Wear Conditions:
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { key: 'fn', label: 'Factory New (FN)' },
                  { key: 'mw', label: 'Minimal Wear (MW)' },
                  { key: 'ft', label: 'Field-Tested (FT)' },
                  { key: 'ww', label: 'Well-Worn (WW)' },
                  { key: 'bs', label: 'Battle-Scarred (BS)' },
                ].map(wear => {
                  const isSelected = preFilters.allowedWears[wear.key as keyof BuildPreFilters['allowedWears']];
                  return (
                    <button
                      key={wear.key}
                      type="button"
                      onClick={() => toggleWear(wear.key as keyof BuildPreFilters['allowedWears'])}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 'var(--so-radius-sm)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'var(--so-surface-input)',
                        border: isSelected ? '1px solid var(--so-primary)' : '1px solid var(--so-border-subtle)',
                        color: isSelected ? 'var(--so-text-primary)' : 'var(--so-text-muted)',
                      }}
                    >
                      {isSelected ? '✓ ' : '✕ '} {wear.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Section 2: Oracle Strategy & Risk Parameters ── */}
          <div style={{
            padding: '18px 20px',
            borderRadius: 'var(--so-radius-md)',
            backgroundColor: 'var(--so-surface-panel)',
            border: '1px solid var(--so-border-medium)',
            marginBottom: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={16} style={{ color: 'var(--so-cyan-text)' }} /> Section 2: Valuation Strategy & Risk Profile
              </div>

              {/* Quick Strategy Presets */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${strategyProfile.preset === 'conservative' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => applyPreset('conservative')}
                  style={{ fontSize: '11.5px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Shield size={13} /> Conservative
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${strategyProfile.preset === 'balanced' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => applyPreset('balanced')}
                  style={{ fontSize: '11.5px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Scale size={13} /> Balanced
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${strategyProfile.preset === 'aggressive' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => applyPreset('aggressive')}
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
                  onChange={(e) => setStrategyProfile(s => ({ ...s, preset: 'custom', liquidityDepth: e.target.value as any }))}
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
                  onChange={(e) => setStrategyProfile(s => ({ ...s, preset: 'custom', valuationMargin: e.target.value as any }))}
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
                  onChange={(e) => setStrategyProfile(s => ({ ...s, preset: 'custom', outlierProtection: e.target.value as any }))}
                  style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: 'var(--so-radius-sm)' }}
                >
                  <option value="strict">Strict Spike Shield (Filter Volatile Spikes)</option>
                  <option value="standard">Standard Spike Filter</option>
                  <option value="permissive">Permissive (Include High Listings)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Trigger Box: Build Accepted Prices */}
          {(() => {
            const estimatedCostCents = passingFilterCount * unitCostCents;
            const formattedCost = `$${(estimatedCostCents / 100).toFixed(2)}`;
            return (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 20px',
                  backgroundColor: 'var(--so-surface-panel)',
                  border: '1px solid var(--so-border-medium)',
                  borderRadius: 'var(--so-radius-md)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--so-text-primary)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={16} style={{ color: 'var(--so-primary)' }} /> Compute Target Workstation Accepted Prices (Buy Ceiling)
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--so-text-muted)' }}>
                    {cacheStatus.itemCount === 0
                      ? 'Fetch or load price cache above to activate pricing generation'
                      : evaluatedSummary.lastBuiltAt
                        ? `Last built at ${evaluatedSummary.lastBuiltAt} — ${evaluatedSummary.totalEvaluated.toLocaleString()} items generated using ${strategyProfile.preset.toUpperCase()} strategy`
                        : 'Send merged price cache to Oracle backend → stores accepted prices in local memory for all workstations'}
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
                      border: '1px solid rgba(14, 165, 233, 0.25)',
                      boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.4), 0 0 20px rgba(14, 165, 233, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--so-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Est. Cost
                      </span>
                    </div>
                    <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--so-border-subtle)' }} />
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#f3f4f6', letterSpacing: '0.5px' }}>
                      {formattedCost}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onBuildAcceptedPrices}
                  disabled={!canBuild && !evaluatedSummary.isBatchEvaluating}
                  className={`btn btn-primary btn-lg ${evaluatedSummary.isBatchEvaluating ? 'btn-evaluating' : ''}`}
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
                          backgroundColor: 'var(--so-accent-cyan, #0284c7)',
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
                      <RotateCw size={18} /> Rebuild Accepted Prices
                    </>
                  ) : (
                    <>
                      <Zap size={18} /> Build Accepted Price
                    </>
                  )}
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
