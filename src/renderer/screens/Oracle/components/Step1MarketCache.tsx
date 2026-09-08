import { Radio, ChevronUp, ChevronDown, ShieldCheck, Key, Info, Filter, CheckSquare, Square, Layers, Loader2, FileUp, Check, AlertCircle, RotateCw, Sparkles, AlertTriangle, Zap, Database } from 'lucide-react';
import { skinSnipeLogo, cs2capLogo } from '../../../../../assets/images';
import { SkinsnipeMarketId } from '../../../../shared/types';
import { CS2CAP_PROVIDERS } from '../../../../shared/cs2capProviders';

export const SKINSNIPE_AVAILABLE_MARKETS: { id: SkinsnipeMarketId; name: string }[] = [
  { id: 'avanmarket', name: 'AvanMarket' },
  { id: 'csgofloat', name: 'CSFloat' },
  { id: 'csmoney_p2p', name: 'CS.MONEY P2P' },
  { id: 'csmoney_trade', name: 'CS.MONEY Trade' },
  { id: 'cstrade', name: 'CSTrade' },
  { id: 'dmarket', name: 'DMarket' },
  { id: 'exeskins', name: 'ExeSkins' },
  { id: 'itradegg', name: 'iTradeGG' },
  { id: 'lisskins', name: 'LisSkins' },
  { id: 'manncostore', name: 'ManncoStore' },
  { id: 'market_csgo', name: 'Market CSGO' },
  { id: 'merchanttf', name: 'Merchant TF' },
  { id: 'shadowpay', name: 'ShadowPay' },
  { id: 'skinbaron', name: 'SkinBaron' },
  { id: 'skinflow', name: 'SkinFlow' },
  { id: 'skinland', name: 'SkinLand' },
  { id: 'skinport', name: 'Skinport' },
  { id: 'skinsmonkey', name: 'SkinsMonkey' },
  { id: 'skinswap', name: 'SkinSwap' },
  { id: 'tradeitgg', name: 'Tradeit.GG' },
  { id: 'tradeitgg_store', name: 'Tradeit.GG Store' },
  { id: 'waxpeer', name: 'Waxpeer' },
  { id: 'whitemarket', name: 'WhiteMarket' },
];

interface Step1MarketCacheProps {
  isOpen: boolean;
  onToggle: () => void;
  cacheStatus: { itemCount: number; isFetching: boolean; lastFetchedAt: string | null };
  hasApiKey: boolean;
  hasCs2capKey?: boolean;
  pricingProvider?: 'skinsnipe' | 'cs2cap';
  onChangePricingProvider?: (provider: 'skinsnipe' | 'cs2cap') => void;
  isCs2capStreaming?: boolean;
  cs2capProgress?: any;
  onStreamCs2cap?: () => void;
  onCancelCs2capStream?: () => void;
  selectedCs2capProviders?: string[];
  onToggleCs2capProvider?: (providerId: string) => void;
  onSoloCs2capProvider?: (providerId: string) => void;
  onSelectAllCs2capProviders?: () => void;
  onResetDefaultCs2capProviders?: () => void;
  selectedMarkets: SkinsnipeMarketId[];
  marketCounts: Record<string, number>;
  fetchProgress: any;
  isBatchEvaluating: boolean;
  isDemoCache?: boolean;
  onToggleMarket: (marketId: SkinsnipeMarketId) => void;
  onSoloMarket: (marketId: SkinsnipeMarketId) => void;
  onSelectAllMarkets: () => void;
  onDeselectAllMarkets: () => void;
  onFetchPrices: () => void;
  onUploadJsonCache: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadDemoCache: (forceRefresh?: boolean) => void;
  onCancelFetch: () => void;
}

export const Step1MarketCache: React.FC<Step1MarketCacheProps> = ({
  isOpen,
  onToggle,
  cacheStatus,
  hasApiKey,
  hasCs2capKey,
  pricingProvider = 'skinsnipe',
  onChangePricingProvider,
  isCs2capStreaming,
  cs2capProgress,
  onStreamCs2cap,
  onCancelCs2capStream,
  selectedCs2capProviders = [],
  onToggleCs2capProvider,
  onSoloCs2capProvider,
  onSelectAllCs2capProviders,
  onResetDefaultCs2capProviders,
  selectedMarkets,
  marketCounts,
  fetchProgress,
  isBatchEvaluating,
  isDemoCache,
  onToggleMarket,
  onSoloMarket,
  onSelectAllMarkets,
  onDeselectAllMarkets,
  onFetchPrices,
  onUploadJsonCache,
  onLoadDemoCache,
  onCancelFetch,
}) => {
  const estimatedFetchSeconds = Math.max(0, (selectedMarkets.length - 1) * 32);

  return (
    <div className="card" style={{ border: '1px solid var(--so-border-medium)', padding: 0, overflow: 'hidden', background: 'linear-gradient(180deg, var(--so-surface-card) 0%, rgba(15, 23, 42, 0.6) 100%)' }}>
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
              <Radio size={18} style={{ color: 'var(--so-primary)' }} /> Market Price Cache Engine & Data Sources
            </div>
            {!isOpen && (
              <div style={{ fontSize: '12px', color: 'var(--so-text-muted)', marginTop: '2px' }}>
                {import.meta.env.DEV
                  ? 'Select target markets, fetch live Skinsnipe API data, or load offline JSON price cache'
                  : 'Select target markets and fetch live Skinsnipe API data'}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className={`badge ${cacheStatus.itemCount > 0 ? 'badge-success' : 'badge-cyan'}`} style={{ fontSize: '11px' }}>
            {cacheStatus.itemCount > 0 ? `✓ ${cacheStatus.itemCount.toLocaleString()} Items Cached` : 'Cache Empty'}
          </span>
          {isOpen ? <ChevronUp size={18} style={{ color: 'var(--so-text-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--so-text-muted)' }} />}
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: '20px' }}>
          {/* Pricing Provider Switcher Tab */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--so-border-subtle)', paddingBottom: '14px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onChangePricingProvider?.('skinsnipe')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--so-radius-sm)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: pricingProvider === 'skinsnipe' ? 'var(--so-surface-card)' : 'transparent',
                border: pricingProvider === 'skinsnipe' ? '1px solid var(--so-primary)' : '1px solid transparent',
                color: pricingProvider === 'skinsnipe' ? 'var(--so-text-primary)' : 'var(--so-text-muted)',
                boxShadow: pricingProvider === 'skinsnipe' ? '0 2px 10px rgba(99, 102, 241, 0.2)' : 'none',
              }}
            >
              <img src={skinSnipeLogo} alt="Skinsnipe" style={{ height: 16, width: 'auto', objectFit: 'contain' }} />
              Skinsnipe Standard Plan
            </button>

            <button
              type="button"
              onClick={() => onChangePricingProvider?.('cs2cap')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--so-radius-sm)',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                backgroundColor: pricingProvider === 'cs2cap' ? 'var(--so-surface-card)' : 'transparent',
                border: pricingProvider === 'cs2cap' ? '1px solid #06b6d4' : '1px solid transparent',
                color: pricingProvider === 'cs2cap' ? 'var(--so-text-primary)' : 'var(--so-text-muted)',
                boxShadow: pricingProvider === 'cs2cap' ? '0 2px 10px rgba(6, 182, 212, 0.2)' : 'none',
              }}
            >
              <img src={cs2capLogo} alt="CS2Cap" style={{ height: 16, width: 'auto', objectFit: 'contain' }} />
              CS2Cap
              <span className="badge badge-cyan" style={{ fontSize: '9.5px', padding: '2px 6px', textTransform: 'uppercase' }}>PRO / QUANT</span>
            </button>
          </div>

          {pricingProvider === 'cs2cap' ? (
            /* ─────────────────────────────────────────────────────────────
               CS2Cap Streaming Panel
            ───────────────────────────────────────────────────────────── */
            <div>
              {/* CS2Cap Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={cs2capLogo} alt="CS2Cap" style={{ height: 26, width: 'auto', objectFit: 'contain' }} />
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--so-text-primary)', margin: 0 }}>
                      Pricing Source: CS2Cap
                    </h2>
                    <span className="badge badge-cyan" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Live Stream
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--so-text-secondary)', marginTop: '6px', maxWidth: '720px', lineHeight: 1.5 }}>
                    Streams live price snapshots across 40+ global marketplaces (Buff163, C5, CSFloat, AvanMarket, etc.) directly to your local workstation.
                  </p>
                </div>
              </div>

              {/* Dedicated CS2Cap Provider Selection Section */}
              <div style={{
                padding: '16px 18px',
                borderRadius: 'var(--so-radius-md)',
                backgroundColor: 'var(--so-surface-panel)',
                border: '1px solid var(--so-border-subtle)',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={16} style={{ color: '#06b6d4' }} /> CS2Cap Target Providers Config
                    <span className="badge badge-cyan" style={{ fontSize: '11px', borderColor: '#06b6d4', color: '#06b6d4' }}>
                      {selectedCs2capProviders.length} of {CS2CAP_PROVIDERS.length} Providers Selected
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sm btn-ghost" onClick={onSelectAllCs2capProviders} style={{ fontSize: '12px', padding: '4px 10px' }}>
                      <CheckSquare size={14} /> Select All ({CS2CAP_PROVIDERS.length})
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={onResetDefaultCs2capProviders} style={{ fontSize: '12px', padding: '4px 10px' }}>
                      <Square size={14} /> Reset Defaults
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '12.5px', color: 'var(--so-text-muted)', marginBottom: '12px' }}>
                  Choose which of CS2Cap's {CS2CAP_PROVIDERS.length} supported marketplaces to query during live NDJSON streaming. Preferences are saved automatically.
                </p>

                {/* Interactive Provider Chips Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '8px', marginBottom: '8px' }}>
                  {CS2CAP_PROVIDERS.map(provider => {
                    const isSelected = selectedCs2capProviders.includes(provider.id);
                    return (
                      <div
                        key={provider.id}
                        onClick={() => onToggleCs2capProvider?.(provider.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          onSoloCs2capProvider?.(provider.id);
                        }}
                        title="Click to toggle | Right-click to solo"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          borderRadius: 'var(--so-radius-sm)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'all 0.15s ease',
                          backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.16)' : 'var(--so-surface-input)',
                          border: isSelected ? '1px solid #06b6d4' : '1px solid var(--so-border-subtle)',
                          color: isSelected ? 'var(--so-text-primary)' : 'var(--so-text-muted)',
                          boxShadow: isSelected ? '0 0 10px rgba(6, 182, 212, 0.2)' : 'none',
                        }}
                      >
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '3px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isSelected ? '#06b6d4' : 'transparent',
                            border: isSelected ? 'none' : '1px solid var(--so-border-medium)',
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && <Check size={10} style={{ color: '#fff' }} />}
                        </div>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
                          {provider.name}
                        </span>
                        {marketCounts[provider.id] > 0 && (
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: isSelected ? '#06b6d4' : 'var(--so-surface-card)',
                            color: isSelected ? '#fff' : 'var(--so-text-secondary)',
                            marginLeft: 'auto',
                            fontFamily: 'monospace',
                            flexShrink: 0,
                          }}>
                            {marketCounts[provider.id].toLocaleString()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CS2Cap Status & Streaming Section */}
              <div style={{
                padding: '18px 20px',
                borderRadius: 'var(--so-radius-md)',
                backgroundColor: 'var(--so-surface-panel)',
                border: '1px solid var(--so-border-subtle)',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Database size={16} style={{ color: '#06b6d4' }} /> CS2Cap Streaming Pipeline
                    {hasCs2capKey ? (
                      <span className="badge badge-success" style={{ fontSize: '11px' }}>PRO / QUANT ACTIVE</span>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '11px' }}>API KEY REQUIRED</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {isCs2capStreaming ? (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={onCancelCs2capStream}
                        style={{
                          backgroundColor: '#dc2626',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '12px',
                          padding: '7px 14px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <Square size={12} fill="#ffffff" /> Cancel Stream
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={onStreamCs2cap}
                        disabled={!hasCs2capKey || cacheStatus.isFetching || isBatchEvaluating}
                        style={{
                          background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                          border: 'none',
                          fontWeight: 800,
                          fontSize: '13px',
                          padding: '8px 18px',
                          boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)',
                          cursor: (!hasCs2capKey || cacheStatus.isFetching || isBatchEvaluating) ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Zap size={15} /> Stream Live Prices Snapshot
                      </button>
                    )}
                  </div>
                </div>

                {!hasCs2capKey && (
                  <div style={{ fontSize: '12.5px', color: 'var(--so-text-secondary)', padding: '12px 14px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.25)', marginBottom: '10px' }}>
                    ⚠️ CS2Cap API Key not configured. Go to <strong>Settings → API Keys</strong> to add your CS2Cap Pro or Quant API Key.
                  </div>
                )}

                {/* Active Streaming Meter */}
                {cs2capProgress && (
                  <div style={{
                    marginTop: '14px',
                    padding: '14px',
                    backgroundColor: cs2capProgress.status === 'error'
                      ? 'rgba(239, 68, 68, 0.08)'
                      : 'rgba(6, 182, 212, 0.08)',
                    borderRadius: '8px',
                    border: cs2capProgress.status === 'error'
                      ? '1px solid rgba(239, 68, 68, 0.3)'
                      : '1px solid rgba(6, 182, 212, 0.25)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: cs2capProgress.status === 'error' ? 'var(--so-danger-text)' : '#06b6d4' }}>
                        {cs2capProgress.status === 'streaming' ? (
                          <>
                            <Loader2 size={16} className="spin" /> Streaming NDJSON Catalog...
                          </>
                        ) : cs2capProgress.status === 'completed' ? (
                          <>
                            <Check size={16} style={{ color: 'var(--so-success-text)' }} /> Stream Completed Successfully
                          </>
                        ) : cs2capProgress.status === 'aborted' ? (
                          <>
                            <AlertCircle size={16} /> Stream Cancelled
                          </>
                        ) : cs2capProgress.status === 'error' ? (
                          <>
                            <AlertCircle size={16} /> Stream Error
                          </>
                        ) : (
                          <>
                            <Loader2 size={16} className="spin" /> Connecting...
                          </>
                        )}
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--so-text-secondary)', fontFamily: 'monospace' }}>
                        {(cs2capProgress.elapsedMs / 1000).toFixed(1)}s elapsed
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginTop: '10px' }}>
                      <div style={{ backgroundColor: 'var(--so-surface-card)', padding: '8px 12px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--so-text-muted)' }}>Lines Parsed</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--so-text-primary)' }}>{cs2capProgress.linesRead.toLocaleString()}</div>
                      </div>
                      <div style={{ backgroundColor: 'var(--so-surface-card)', padding: '8px 12px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--so-text-muted)' }}>Unique Skins</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#06b6d4' }}>{cs2capProgress.itemsCount.toLocaleString()}</div>
                      </div>
                      <div style={{ backgroundColor: 'var(--so-surface-card)', padding: '8px 12px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--so-text-muted)' }}>Providers Seen</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--so-text-primary)' }}>{cs2capProgress.providersCount}</div>
                      </div>
                      <div style={{ backgroundColor: 'var(--so-surface-card)', padding: '8px 12px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--so-text-muted)' }}>Transferred</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--so-text-primary)' }}>{(cs2capProgress.bytesReceived / (1024 * 1024)).toFixed(2)} MB</div>
                      </div>
                    </div>

                    {cs2capProgress.lastError && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--so-danger-text)' }}>
                        {cs2capProgress.lastError}
                      </div>
                    )}
                  </div>
                )}

                {cacheStatus.itemCount > 0 && (
                  <div style={{ fontSize: '12.5px', color: 'var(--so-text-secondary)', marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="tabular-nums" style={{ color: 'var(--so-text-primary)', fontWeight: 800 }}>
                      {cacheStatus.itemCount.toLocaleString()}
                    </span>{' '}
                    items cached in memory
                    {cacheStatus.lastFetchedAt && ` — updated ${new Date(cacheStatus.lastFetchedAt).toLocaleTimeString()}`}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               Skinsnipe Multi-Call REST Panel (Default)
            ───────────────────────────────────────────────────────────── */
            <div>
              {/* Provider Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={skinSnipeLogo} alt="Skinsnipe" style={{ height: 26, width: 'auto', objectFit: 'contain' }} />
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--so-text-primary)', margin: 0 }}>
                      Pricing Source: Skinsnipe Standard Plan
                    </h2>
                    <span className="badge badge-cyan" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Primary Price Source
                    </span>
                  </div>
                  {!hasApiKey && (
                    <p style={{ fontSize: '13px', color: 'var(--so-text-secondary)', marginTop: '6px', maxWidth: '680px', lineHeight: 1.5 }}>
                      Skinsnipe acts as a multi-market price aggregator for CS2 items. To fetch live market data directly from your device, <span style={{ whiteSpace: 'nowrap' }}>a <strong>Skinsnipe Standard Plan</strong></span> API key is required.
                    </p>
                  )}
                </div>
              </div>

              {/* Dedicated Skinsnipe Market Selection Section */}
              <div style={{
                padding: '16px 18px',
                borderRadius: 'var(--so-radius-md)',
                backgroundColor: 'var(--so-surface-panel)',
                border: '1px solid var(--so-border-subtle)',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={16} style={{ color: 'var(--so-primary)' }} /> Skinsnipe Target Markets Config
                    <span className="badge badge-cyan" style={{ fontSize: '11px' }}>
                      {selectedMarkets.length} of {SKINSNIPE_AVAILABLE_MARKETS.length} Markets Selected
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-sm btn-ghost" onClick={onSelectAllMarkets} style={{ fontSize: '12px', padding: '4px 10px' }}>
                      <CheckSquare size={14} /> Select All ({SKINSNIPE_AVAILABLE_MARKETS.length})
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={onDeselectAllMarkets} style={{ fontSize: '12px', padding: '4px 10px' }}>
                      <Square size={14} /> Reset Defaults
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '12.5px', color: 'var(--so-text-muted)', marginBottom: '12px' }}>
                  Choose which of Skinsnipe's {SKINSNIPE_AVAILABLE_MARKETS.length} markets to query during live fetches. Preferences are saved automatically.
                </p>

                {/* Interactive Market Chips Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                  {SKINSNIPE_AVAILABLE_MARKETS.map(market => {
                    const isSelected = selectedMarkets.includes(market.id);
                    return (
                      <div
                        key={market.id}
                        onClick={() => onToggleMarket(market.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          onSoloMarket(market.id);
                        }}
                        title="Click to toggle | Right-click to solo"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          borderRadius: 'var(--so-radius-sm)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'all 0.15s ease',
                          backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'var(--so-surface-input)',
                          border: isSelected ? '1px solid var(--so-primary)' : '1px solid var(--so-border-subtle)',
                          color: isSelected ? 'var(--so-text-primary)' : 'var(--so-text-muted)',
                          boxShadow: isSelected ? '0 0 10px rgba(99, 102, 241, 0.2)' : 'none',
                        }}
                      >
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: '3px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isSelected ? 'var(--so-primary)' : 'transparent',
                            border: isSelected ? 'none' : '1px solid var(--so-border-medium)',
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && <Check size={10} style={{ color: '#fff' }} />}
                        </div>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>{market.name}</span>
                        {marketCounts[market.id] > 0 && (
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: isSelected ? 'var(--so-primary)' : 'var(--so-surface-card)',
                            color: isSelected ? '#fff' : 'var(--so-text-secondary)',
                            marginLeft: 'auto',
                            flexShrink: 0,
                          }}>
                            {marketCounts[market.id].toLocaleString()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: '11.5px', color: 'var(--so-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} /> Right-click any market chip to solo it. Estimated fetch cycle: ~{Math.floor(estimatedFetchSeconds / 60)}m {estimatedFetchSeconds % 60}s
                </div>
              </div>

              {/* Skinsnipe Fetch & Local Cache Loading Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {hasApiKey && (
                  <button className="btn btn-primary" onClick={onFetchPrices} disabled={cacheStatus.isFetching || isBatchEvaluating}>
                    {cacheStatus.isFetching ? (
                      <>
                        <Loader2 size={16} className="spin" /> Fetching Skinsnipe Prices...
                      </>
                    ) : (
                      <>
                        <Radio size={16} /> Fetch {selectedMarkets.length} Skinsnipe Markets
                      </>
                    )}
                  </button>
                )}

                {import.meta.env.DEV && (
                  <label className="btn btn-cyan" style={{ cursor: 'pointer', margin: 0 }} title="Import an offline JSON price cache file">
                    <FileUp size={16} /> Load Cache JSON File
                    <input type="file" accept=".json" onChange={onUploadJsonCache} style={{ display: 'none' }} />
                  </label>
                )}

                {!hasApiKey && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => onLoadDemoCache(false)}
                      disabled={cacheStatus.isFetching || isBatchEvaluating}
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '13px',
                        padding: '8px 14px',
                        border: 'none',
                        borderRadius: 'var(--so-radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                      }}
                      title="Load demo historical dataset for offline simulation"
                    >
                      <Sparkles size={15} /> Load Demo Cache (Offline Simulation)
                    </button>

                    {isDemoCache && cacheStatus.itemCount > 0 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onLoadDemoCache(true)}
                        disabled={cacheStatus.isFetching || isBatchEvaluating}
                        style={{
                          fontSize: '11.5px',
                          padding: '6px 10px',
                          color: 'var(--so-text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title="Re-download latest demo price dataset from SaaS cloud"
                      >
                        <RotateCw size={13} /> Re-download from Cloud
                      </button>
                    )}
                  </div>
                )}

                {cacheStatus.itemCount > 0 && (
                  <div style={{ fontSize: '13px', color: 'var(--so-text-secondary)', marginLeft: 'auto' }}>
                    <span className="tabular-nums" style={{ color: 'var(--so-text-primary)', fontWeight: 800 }}>
                      {cacheStatus.itemCount.toLocaleString()}
                    </span>{' '}
                    items cached in memory
                    {cacheStatus.lastFetchedAt && ` — updated ${new Date(cacheStatus.lastFetchedAt).toLocaleTimeString()}`}
                  </div>
                )}
              </div>

              {/* Demo Cache Warning Alert Box */}
              {isDemoCache && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '14px 18px',
                    borderRadius: 'var(--so-radius-md)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                  }}
                >
                  <AlertTriangle size={24} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      ⚠️ DEMO PRICE CACHE ACTIVE (HISTORICAL DATA — TESTING ONLY)
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--so-text-secondary)', marginTop: '3px', lineHeight: 1.4 }}>
                      ⚠️ Price Cache Loaded (Offline Mode)
                      This cache contains sample historical price data intended for offline testing and workflow simulation only.
                      🔴 WARNING: Do NOT use this data for live trading, automated strategies, or real order execution.
                    </div>
                  </div>
                </div>
              )}

              {/* Live Fetching Progress & Error Tracking Panel */}
              {fetchProgress && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  borderRadius: 'var(--so-radius-md)',
                  backgroundColor: fetchProgress.criticalError || fetchProgress.status === 'aborted'
                    ? 'rgba(239, 68, 68, 0.08)'
                    : 'rgba(59, 130, 246, 0.08)',
                  border: fetchProgress.criticalError || fetchProgress.status === 'aborted'
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : '1px solid rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13.5px' }}>
                      {fetchProgress.status === 'fetching' ? (
                        <>
                          <Loader2 size={16} className="spin" style={{ color: 'var(--so-primary)' }} />
                          Fetching Market {fetchProgress.currentMarketIndex} of {fetchProgress.totalMarkets}:
                          <span style={{ color: 'var(--so-primary)', fontWeight: 800 }}>
                            {SKINSNIPE_AVAILABLE_MARKETS.find(m => m.id === fetchProgress.currentMarket)?.name || fetchProgress.currentMarket}
                          </span>
                        </>
                      ) : fetchProgress.status === 'waiting' ? (
                        <>
                          <RotateCw size={16} className="spin" style={{ color: 'var(--so-cyan-text)' }} />
                          Rate-Limit Cooldown: Fetching <span style={{ color: 'var(--so-cyan-text)', fontWeight: 800 }}>
                            {SKINSNIPE_AVAILABLE_MARKETS.find(m => m.id === fetchProgress.currentMarket)?.name || fetchProgress.currentMarket}
                          </span> in <span style={{ color: '#fff', fontWeight: 900, fontSize: '13.5px' }}>{fetchProgress.sleepRemaining ?? 0}s</span>...
                        </>
                      ) : fetchProgress.criticalError || fetchProgress.status === 'aborted' ? (
                        <span style={{ color: 'var(--so-danger-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertCircle size={16} /> Fetch Process Aborted
                        </span>
                      ) : (
                        <span style={{ color: 'var(--so-success-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Check size={16} /> Fetch Cycle Completed
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {fetchProgress.errorCount > 0 && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          color: 'var(--so-danger-text)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                        }}>
                          ❌ {fetchProgress.errorCount} Error{fetchProgress.errorCount > 1 ? 's' : ''}
                        </span>
                      )}

                      {(fetchProgress.status === 'fetching' || fetchProgress.status === 'waiting') && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={onCancelFetch}
                          style={{
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '11.5px',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                          }}
                        >
                          <Square size={11} fill="#ffffff" /> Stop Fetching
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--so-surface-card)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.round(((fetchProgress.completedMarkets || (fetchProgress.currentMarketIndex - 1)) / fetchProgress.totalMarkets) * 100))}%`,
                        backgroundColor: fetchProgress.criticalError || fetchProgress.status === 'aborted'
                          ? 'var(--so-danger-text)'
                          : 'var(--so-primary)',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  {fetchProgress.criticalError && (
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--so-danger-text)',
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      lineHeight: 1.5,
                    }}>
                      {fetchProgress.criticalError}
                    </div>
                  )}

                  {!fetchProgress.criticalError && fetchProgress.lastError && (
                    <div style={{ fontSize: '11.5px', color: 'var(--so-text-muted)' }}>
                      Latest event: {fetchProgress.lastError}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
