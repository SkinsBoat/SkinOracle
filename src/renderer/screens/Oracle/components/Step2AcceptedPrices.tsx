import React from 'react';
import toast from 'react-hot-toast';
import {
  Zap,
  ChevronUp,
  ChevronDown,
  Sliders,
  RefreshCw,
  Check,
  Tag,
  Compass,
  Shield,
  Scale,
  Rocket,
  Activity,
  Cpu,
  ShieldAlert,
  Loader2,
  RotateCw,
  TrendingUp,
  Database,
  Sparkles,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import {
  BuildPreFilters,
  OracleStrategyProfile,
  NexusStrategyProfile,
} from '../../../store/useOracleStore';
import { NEXUS_PRESETS } from '../utils/oracleUtils';

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
  selectedEngine: 'standard' | 'nexus';
  setSelectedEngine: (engine: 'standard' | 'nexus') => void;
  strategyProfile: OracleStrategyProfile;
  setStrategyProfile: React.Dispatch<React.SetStateAction<OracleStrategyProfile>>;
  nexusProfile: NexusStrategyProfile;
  setNexusProfile: React.Dispatch<React.SetStateAction<NexusStrategyProfile>>;
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
  selectedEngine,
  setSelectedEngine,
  strategyProfile,
  setStrategyProfile,
  nexusProfile,
  setNexusProfile,
  onBuildAcceptedPrices,
  canBuild,
}) => {
  const [unitCostCents, setUnitCostCents] = React.useState(0.001);
  const [nexusUnitCostCents, setNexusUnitCostCents] = React.useState(0.002);
  const [trendStats, setTrendStats] = React.useState<{
    daysCount: number;
    totalSnapshots: number;
    itemCoverage: number;
    latestDate: string | null;
    oldestDate: string | null;
  } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = React.useState(false);
  const [simulatedDate, setSimulatedDate] = React.useState<string | null>(null);
  const [isSeedingHistory, setIsSeedingHistory] = React.useState(false);
  const [isClearingHistory, setIsClearingHistory] = React.useState(false);
  const [seedDays, setSeedDays] = React.useState<number>(nexusProfile.trendWindow || 14);

  React.useEffect(() => {
    if (nexusProfile.trendWindow) {
      setSeedDays(nexusProfile.trendWindow);
    }
  }, [nexusProfile.trendWindow]);

  const getPastDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  const fetchConfigAndStats = React.useCallback(async () => {
    if (window.electronAPI?.system) {
      try {
        const config = await window.electronAPI.system.getConfig();
        if (config?.oracleUnitCostCents !== undefined) {
          setUnitCostCents(Number(config.oracleUnitCostCents));
        }
        if (config?.nexusUnitCostCents !== undefined) {
          setNexusUnitCostCents(Number(config.nexusUnitCostCents));
        }
      } catch (err) {
        console.warn('[Step2AcceptedPrices] Failed to fetch system config:', err);
      }
    }

    if (window.electronAPI?.trendStore) {
      try {
        setIsLoadingStats(true);
        const stats = await window.electronAPI.trendStore.getStats();
        setTrendStats(stats);
      } catch (err) {
        console.warn('[Step2AcceptedPrices] Failed to fetch trend stats:', err);
      } finally {
        setIsLoadingStats(false);
      }

      if (window.electronAPI.trendStore.getSimulatedDate) {
        try {
          const simDate = await window.electronAPI.trendStore.getSimulatedDate();
          setSimulatedDate(simDate);
        } catch {}
      }
    }
  }, []);

  React.useEffect(() => {
    fetchConfigAndStats();
  }, [fetchConfigAndStats, isOpen]);

  const handleSeedMockHistory = async (customDays?: number) => {
    if (!window.electronAPI?.trendStore?.seedMockHistory) return;
    const daysToSeed = customDays || seedDays || nexusProfile.trendWindow || 14;
    try {
      setIsSeedingHistory(true);
      const res = await window.electronAPI.trendStore.seedMockHistory(daysToSeed);
      toast.success(`Seeded ${res.seededDays} days of realistic trend data (${res.totalSnapshots.toLocaleString()} snapshots)!`);
      await fetchConfigAndStats();
    } catch (err: any) {
      toast.error(err.message || 'Failed to seed mock trend history. Make sure price cache is loaded.');
    } finally {
      setIsSeedingHistory(false);
    }
  };

  const handleClearTrendHistory = async () => {
    if (!window.electronAPI?.trendStore?.clear) return;
    if (!confirm('Wipe all SQLite price snapshot history to test $0.00 cold-start safety?')) return;
    try {
      setIsClearingHistory(true);
      const rows = await window.electronAPI.trendStore.clear();
      toast.success(`Wiped ${rows} snapshots. Cache is now empty (0 days).`);
      await fetchConfigAndStats();
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear trend history');
    } finally {
      setIsClearingHistory(false);
    }
  };

  const handleSetSimulatedDate = async (date: string | null) => {
    if (!window.electronAPI?.trendStore?.setSimulatedDate) return;
    try {
      const active = await window.electronAPI.trendStore.setSimulatedDate(date);
      setSimulatedDate(active);
      if (active) {
        toast(`Simulating date: ${active}. Any refetched prices will be recorded as this date.`);
      } else {
        toast('Reset to live today date.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to set simulated date');
    }
  };

  const applyBasePreset = (presetName: 'conservative' | 'balanced' | 'aggressive') => {
    setStrategyProfile(STRATEGY_PRESETS[presetName]);
  };

  const applyNexusPreset = (presetName: 'capital_shield' | 'balanced' | 'aggressive') => {
    setNexusProfile(NEXUS_PRESETS[presetName]);
  };

  const activeUnitCost = selectedEngine === 'nexus' ? nexusUnitCostCents : unitCostCents;

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
              <Zap size={18} style={{ color: selectedEngine === 'nexus' ? 'var(--so-primary)' : 'var(--so-cyan-text)' }} />
              Builder Accepted Price for Purchasing Decisions and Buy Orders
            </div>
            {!isOpen && (
              <div style={{ fontSize: '12px', color: 'var(--so-text-muted)', marginTop: '2px' }}>
                Engine: {selectedEngine === 'nexus' ? 'OracleNexus v2 PRO (Trend-Shield)' : 'SkinOracle v20 STANDARD'} • Configure buy ceilings & risk filters
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className={`badge ${selectedEngine === 'nexus' ? 'badge-primary' : 'badge-cyan'}`} style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {selectedEngine === 'nexus' ? <TrendingUp size={12} /> : <Cpu size={12} />}
            {selectedEngine === 'nexus' ? 'Nexus Pro' : 'Standard'}
          </span>
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

              {/* Exclude Stickers */}
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

              {/* Forced Group Exclusions: Charms, Cases, Keys, Music Kits, Agents */}
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

          {/* ── Section 3: Nexus Trend & Capital Shield Protection (Nexus Mode Only) ── */}
          {selectedEngine === 'nexus' && (
            <div style={{
              padding: '18px 20px',
              borderRadius: 'var(--so-radius-md)',
              backgroundColor: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              marginBottom: '18px',
              animation: 'fadeIn 0.2s ease-in-out',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} style={{ color: 'var(--so-primary)' }} /> Section 3: Nexus Trend Intelligence & Capital Shield
                </div>

                {/* Quick Nexus Presets */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${nexusProfile.preset === 'capital_shield' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => applyNexusPreset('capital_shield')}
                    style={{ fontSize: '11.5px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Shield size={13} /> Capital Shield
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${nexusProfile.preset === 'balanced' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => applyNexusPreset('balanced')}
                    style={{ fontSize: '11.5px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Scale size={13} /> Balanced Momentum
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${nexusProfile.preset === 'aggressive' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => applyNexusPreset('aggressive')}
                    style={{ fontSize: '11.5px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Rocket size={13} /> Aggressive
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '12.5px', color: 'var(--so-text-muted)', marginBottom: '14px' }}>
                Dynamically penalizes crashing items to shield capital, while awarding cautious upside bonus for verified rising trends.
              </p>

              {/* Nexus Modular Card Selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                {/* 1. Trend Horizon Window */}
                <div style={{ padding: '12px 14px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--so-text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} style={{ color: 'var(--so-cyan-text)' }} /> Trend Time Horizon
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', marginBottom: '8px' }}>
                    Window of historical data for linear regression slope
                  </div>

                  <select
                    value={nexusProfile.trendWindow}
                    onChange={(e) => setNexusProfile(p => ({ ...p, preset: 'custom', trendWindow: Number(e.target.value) as any }))}
                    style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: 'var(--so-radius-sm)' }}
                  >
                    <option value={14}>14 Days (Optimal Balance)</option>
                    <option value={7}>7 Days (Fast Momentum / Breakout)</option>
                    <option value={30}>30 Days (Macro Stability)</option>
                  </select>
                </div>

                {/* 2. Downside Crash Protection */}
                <div style={{ padding: '12px 14px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--so-text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={14} style={{ color: 'var(--so-danger-text, #ef4444)' }} /> Downside Crash Cut
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', marginBottom: '8px' }}>
                    Maximum haircut applied to declining skin prices
                  </div>

                  <select
                    value={nexusProfile.downsideCut}
                    onChange={(e) => setNexusProfile(p => ({ ...p, preset: 'custom', downsideCut: e.target.value as any }))}
                    style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: 'var(--so-radius-sm)' }}
                  >
                    <option value="strict">Strict (-10% Safety Cut — Capital Shield)</option>
                    <option value="standard">Standard (-8% Safety Cut — Balanced)</option>
                    <option value="light">Light (-5% Cut — Permissive)</option>
                  </select>
                </div>

                {/* 3. Volatility Filter Shield */}
                <div style={{ padding: '12px 14px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--so-text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Activity size={14} style={{ color: 'var(--so-warning-text, #f59e0b)' }} /> Volatility Noise Shield
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', marginBottom: '8px' }}>
                    Dampens trend bonus on erratic price spikes
                  </div>

                  <select
                    value={nexusProfile.volatilityFilter}
                    onChange={(e) => setNexusProfile(p => ({ ...p, preset: 'custom', volatilityFilter: e.target.value as any }))}
                    style={{ width: '100%', fontSize: '12px', padding: '6px 8px', borderRadius: 'var(--so-radius-sm)' }}
                  >
                    <option value="strict">Strict Shield (High Noise Dampening)</option>
                    <option value="standard">Standard Adaptive Shield</option>
                    <option value="permissive">Permissive (Tolerate Volatility)</option>
                  </select>
                </div>
              </div>

              {/* Local SQLite Trend Data Health Indicator Bar */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--so-radius-sm)',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--so-border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
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
              </div>
            </div>
          )}

          {/* Action Trigger Box: Build Accepted Prices */}
          {(() => {
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
                        ? `Last built at ${evaluatedSummary.lastBuiltAt} — ${evaluatedSummary.totalEvaluated.toLocaleString()} items generated using ${isNexus ? 'NEXUS PRO' : strategyProfile.preset.toUpperCase()} strategy`
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
                  disabled={!canBuild && !evaluatedSummary.isBatchEvaluating}
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
          })()}
        </div>
      )}
    </div>
  );
};
