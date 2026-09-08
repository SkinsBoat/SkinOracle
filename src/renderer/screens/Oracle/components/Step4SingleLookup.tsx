import React from 'react';
import { Search, ChevronUp, ChevronDown, Loader2, Zap, BarChart3, AlertCircle, Tag, Layers, TrendingUp } from 'lucide-react';
import { ListingPriceStrategy } from '../../../store/useOracleStore';
import { getMarketDisplayName } from '../../../../shared/canonicalMarkets';
import { calculateSuggestedListingPrice } from '../utils/oracleUtils';
import { S } from '../OracleDashboard.styles';
import { TrendDetailedChart } from '../../../components/TrendDetailedChart';
import { TrendSparkline } from '../../../components/TrendSparkline';

interface Step4SingleLookupProps {
  isOpen: boolean;
  onToggle: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  evaluating: boolean;
  results: any[];
  listingStrategy: ListingPriceStrategy;
  onLookupSingleItem: (e?: React.FormEvent) => void;
}

export const Step4SingleLookup: React.FC<Step4SingleLookupProps> = ({
  isOpen,
  onToggle,
  searchQuery,
  setSearchQuery,
  evaluating,
  results,
  listingStrategy,
  onLookupSingleItem,
}) => {
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
              <Search size={18} style={{ color: 'var(--so-warning-text)' }} /> Single Item Price Lookup & Live Analysis
            </div>
            {!isOpen && (
              <div style={{ fontSize: '12px', color: 'var(--so-text-muted)', marginTop: '2px' }}>
                Search individual skin hash names & view live marketplace price breakdown
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="badge badge-ghost" style={{ fontSize: '11px' }}>
            Quick Skin Lookup
          </span>
          {isOpen ? <ChevronUp size={18} style={{ color: 'var(--so-text-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--so-text-muted)' }} />}
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: '20px' }}>
          <p className="card-desc" style={{ marginBottom: '16px' }}>
            Enter an item market hash name below to look up its accepted price from the built accepted price engine.
          </p>

          <form onSubmit={onLookupSingleItem} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="e.g. AK-47 | Redline (Field-Tested)"
              style={{ flex: 1 }}
            />

            <button type="submit" className="btn btn-secondary" disabled={evaluating || !searchQuery.trim()} style={{ minWidth: '160px' }}>
              {evaluating ? (
                <>
                  <Loader2 size={16} className="spin" /> Looking Up...
                </>
              ) : (
                <>
                  <Zap size={16} /> Lookup Price
                </>
              )}
            </button>
          </form>

          {/* Spot Check Result Card */}
          {results.length > 0 && (
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-title">
                <BarChart3 size={18} style={{ color: 'var(--so-primary)' }} /> Price Advisor & Market Breakdown
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {results.map(r => {
                  if (!r.oracle) {
                    return (
                      <div key={r.name} style={{ padding: '16px', borderRadius: 'var(--so-radius-md)', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--so-danger-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertCircle size={16} /> "{r.name}" not found in price cache.
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--so-text-muted)', marginTop: '4px' }}>
                          Ensure you enter the full item hash name including the wear condition in parentheses (e.g. AK-47 | Redline (Field-Tested)).
                        </div>
                      </div>
                    );
                  }

                  const match = r.name.match(/^(.+?)\s*\(([^)]+)\)$/);
                  const cleanTitle = match ? match[1] : r.name;
                  const wear = match ? match[2] : '';
                  const imageUrl = `https://api.steamapis.com/image/item/730/${encodeURIComponent(r.name)}`;

                  const oracle = r.oracle;
                  const listings: { m: string; p: number; q?: number; market?: string; price?: number; quantity?: number }[] = r.listings || oracle.marketBreakdown || [];

                  // Deduplicate and format listings for market breakdown table
                  const marketListings = listings.map(l => ({
                    marketId: l.m || l.market || '',
                    price: l.p ?? l.price ?? 0,
                    quantity: l.q ?? l.quantity ?? 1,
                  })).filter(l => l.price > 0).sort((a, b) => a.price - b.price);

                  const buyTarget = oracle.finalAcceptedPrice || 0;

                  return (
                    <div
                      key={r.name}
                      style={{
                        backgroundColor: 'var(--so-surface-panel)',
                        border: '1px solid var(--so-border-medium)',
                        padding: '20px',
                        borderRadius: 'var(--so-radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                      }}
                    >
                      {/* Item Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <img
                            src={imageUrl}
                            alt={r.name}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                            style={{
                              width: 60,
                              height: 60,
                              objectFit: 'contain',
                              borderRadius: 'var(--so-radius-sm)',
                              backgroundColor: 'var(--so-surface-input)',
                              border: '1px solid var(--so-border-subtle)',
                              padding: '4px',
                              flexShrink: 0,
                            }}
                          />

                          <div>
                            <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span>{cleanTitle}</span>
                              <TrendSparkline name={r.name} width={90} height={26} />
                            </div>
                            <div style={{ fontSize: '12.5px', color: 'var(--so-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              {wear && <span style={{ color: 'var(--so-text-secondary)', fontWeight: 700 }}>({wear})</span>}
                              {r.source === 'built_cache' && <span className="badge badge-success">BUILT CACHE</span>}
                              {r.source === 'oracle_api' && <span className="badge badge-cyan">ORACLE API</span>}
                              {oracle.nexusDelta !== undefined && oracle.nexusDelta !== null && (
                                <span
                                  className="badge"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    backgroundColor: oracle.nexusDelta > 0 ? 'rgba(16, 185, 129, 0.15)' : oracle.nexusDelta < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                    color: oracle.nexusDelta > 0 ? 'var(--so-success-text)' : oracle.nexusDelta < 0 ? 'var(--so-danger-text)' : 'var(--so-primary)',
                                    border: `1px solid ${oracle.nexusDelta > 0 ? 'rgba(16, 185, 129, 0.3)' : oracle.nexusDelta < 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                                    fontWeight: 700,
                                  }}
                                >
                                  <TrendingUp size={11} />
                                  NEXUS {oracle.nexusDelta > 0 ? `+$${oracle.nexusDelta.toFixed(2)}` : oracle.nexusDelta < 0 ? `-$${Math.abs(oracle.nexusDelta).toFixed(2)}` : '$0.00'}
                                </span>
                              )}
                              {oracle.trendConfidence && (
                                <span className="badge badge-ghost" style={{ fontSize: '11px' }}>
                                  GRADE {oracle.trendConfidence}
                                </span>
                              )}
                              {oracle.isHyperLiquid && <span className="badge badge-cyan">HYPER LIQUID</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4-Stat Metric Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                        <div style={{ padding: '10px 12px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', fontWeight: 600 }}>Market Average</div>
                          <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--so-primary)', marginTop: '2px' }}>
                            ${oracle.averageMarketPrice ? oracle.averageMarketPrice.toFixed(2) : '—'}
                          </div>
                        </div>

                        <div style={{ padding: '10px 12px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', fontWeight: 600 }}>Lowest Listing</div>
                          <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--so-text-primary)', marginTop: '2px' }}>
                            ${oracle.lowestPrice ? oracle.lowestPrice.toFixed(2) : '—'}
                          </div>
                        </div>

                        <div style={{ padding: '10px 12px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', fontWeight: 600 }}>Total Market Supply</div>
                          <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--so-success-text)', marginTop: '2px' }}>
                            {marketListings.reduce((sum, m) => sum + m.quantity, 0).toLocaleString()} Qty
                          </div>
                        </div>

                        <div style={{ padding: '10px 12px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', fontWeight: 600 }}>Markets Tracked</div>
                          <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--so-cyan-text)', marginTop: '2px' }}>
                            {marketListings.length || oracle.marketCount || 1} Markets
                          </div>
                        </div>
                      </div>

                      {/* 14-Day Historical Trend Intelligence Graph */}
                      <TrendDetailedChart
                        name={r.name}
                        momentum={oracle.trendMomentum14d}
                        height={115}
                      />

                      {/* Centralized Buy & Listing Target Box */}
                      {(() => {
                        const itemPrices = marketListings.map(m => m.price).filter(p => p > 0);
                        const suggestedListing = calculateSuggestedListingPrice(
                          itemPrices.length > 0 ? itemPrices : [oracle.lowestPrice || 0],
                          oracle.averageMarketPrice || 0,
                          listingStrategy
                        );
                        return (
                          <div style={S.targetBox}>
                            {/* Left Column: Target Buy Ceiling */}
                            <div>
                              <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Workstation Buy Ceiling</div>
                              <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 900, color: 'var(--so-success-text)', marginTop: '2px' }}>
                                ${buyTarget.toFixed(2)}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--so-text-muted)', marginTop: '2px' }}>
                                {oracle.nexusDelta !== undefined && oracle.nexusDelta !== null ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <span>Base: ${oracle.v1Benchmark ? oracle.v1Benchmark.toFixed(2) : '—'}</span>
                                    <span style={{ color: oracle.nexusDelta > 0 ? 'var(--so-success-text)' : oracle.nexusDelta < 0 ? 'var(--so-danger-text)' : 'var(--so-text-muted)', fontWeight: 700 }}>
                                      {oracle.nexusDelta > 0 ? `+$${oracle.nexusDelta.toFixed(2)}` : oracle.nexusDelta < 0 ? `-$${Math.abs(oracle.nexusDelta).toFixed(2)}` : '$0.00'} Nexus
                                    </span>
                                    {oracle.trendAdjustment !== undefined && (
                                      <span style={{ opacity: 0.8 }}>({(oracle.trendAdjustment * 100).toFixed(1)}%)</span>
                                    )}
                                  </span>
                                ) : (
                                  'Maximum price to accept for buy orders'
                                )}
                              </div>
                            </div>

                            {/* Right Column: Local Suggested Listing Price */}
                            <div style={{ paddingLeft: '16px', borderLeft: '1px solid rgba(16, 185, 129, 0.2)' }}>
                              <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Tag size={13} style={{ color: 'var(--so-primary)' }} /> Suggested Selling Price ({listingStrategy.mode.toUpperCase()})
                              </div>
                              <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 900, color: 'var(--so-primary)', marginTop: '2px' }}>
                                ${suggestedListing.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Individual Market Breakdown Table */}
                      {marketListings.length > 0 && (
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--so-text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Layers size={14} style={{ color: 'var(--so-cyan-text)' }} /> Live Market Price Breakdown ({marketListings.length} Markets)
                          </div>

                          <div style={{ overflowX: 'auto', border: '1px solid var(--so-border-subtle)', borderRadius: 'var(--so-radius-sm)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                              <thead>
                                <tr style={{ backgroundColor: 'var(--so-surface-input)', borderBottom: '1px solid var(--so-border-subtle)', textAlign: 'left', color: 'var(--so-text-muted)' }}>
                                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Marketplace</th>
                                  <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Lowest Active Price</th>
                                  <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Active Quantity</th>
                                </tr>
                              </thead>
                              <tbody>
                                {marketListings.map((m, idx) => {
                                  const marketName = getMarketDisplayName(m.marketId);
                                  return (
                                    <tr
                                      key={m.marketId + idx}
                                      style={{
                                        borderBottom: idx < marketListings.length - 1 ? '1px solid var(--so-border-subtle)' : 'none',
                                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                                      }}
                                    >
                                      <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--so-text-primary)' }}>
                                        {marketName}
                                      </td>
                                      <td className="tabular-nums" style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--so-primary)' }}>
                                        ${m.price.toFixed(2)}
                                      </td>
                                      <td className="tabular-nums" style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--so-text-secondary)', fontWeight: 600 }}>
                                        {m.quantity}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
