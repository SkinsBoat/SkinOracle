import React, { useEffect, useState, useMemo } from 'react';
import {
  Handshake,
  Plus,
  RefreshCw,
  Trophy,
  Package,
  Layers,
  RotateCcw,
  Sliders,
  Users,
  Settings2,
} from 'lucide-react';
import { useDealMakerStore } from '../../store/useDealMakerStore';
import { DEALMAKER_CONSTANTS } from '../../../shared/types/dealmaker.types';
import { DealItemCard } from './components/DealItemCard';
import { SellerActiveDealCard } from './components/SellerActiveDealCard';
import { DealFloorFilterBar } from './components/DealFloorFilterBar';
import { DealMakerConfigTab } from './components/DealMakerConfigTab';
import {
  DEFAULT_DEAL_FILTERS,
  DealFloorFilters,
  filterDeals,
  countDealsWithinCeiling,
  isAnyFilterActive,
} from './utils/dealFilterUtils';
import {
  DEALMAKER_MARKET_IDS,
  normalizeDealMakerMarketId,
} from '../../../shared/dealmakerMarkets';

export const DealMakerFloorScreen: React.FC = () => {
  const {
    activeAuctions,
    myAuctions,
    wonAuctions,
    activeBidAuctions,
    isLoading,
    activeFilter,
    setActiveFilter,
    activeTradersCount,
    refreshAll,
    openCreateModal,
  } = useDealMakerStore();

  const [acceptedCeilingsMap, setAcceptedCeilingsMap] = useState<
    Record<string, number>
  >({});

  const [acceptedSssMap, setAcceptedSssMap] = useState<Record<string, number>>(
    {},
  );

  const [filters, setFilters] =
    useState<DealFloorFilters>(DEFAULT_DEAL_FILTERS);

  const handleFilterChange = <K extends keyof DealFloorFilters>(
    key: K,
    value: DealFloorFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_DEAL_FILTERS);
  };

  const availableMarkets = useMemo(() => {
    const set = new Set<string>(['all', ...DEALMAKER_MARKET_IDS]);
    activeAuctions.forEach((a) => {
      if (a.marketplace) {
        const canonical = normalizeDealMakerMarketId(a.marketplace);
        // Only add if this marketplace is a known DealMaker platform
        if (canonical) set.add(canonical);
      }
    });
    return Array.from(set);
  }, [activeAuctions]);

  const belowCeilingCount = useMemo(() => {
    return countDealsWithinCeiling(activeAuctions, acceptedCeilingsMap);
  }, [activeAuctions, acceptedCeilingsMap]);

  const filteredActiveAuctions = useMemo(() => {
    return filterDeals(activeAuctions, acceptedCeilingsMap, filters);
  }, [activeAuctions, acceptedCeilingsMap, filters]);

  const isFilterActive = isAnyFilterActive(filters);

  // Fetch active buy ceilings snapshot from local Oracle cache
  useEffect(() => {
    if (window.electronAPI?.oracle) {
      window.electronAPI.oracle
        .getAcceptedPrices()
        .then((res) => {
          if (res?.map) {
            const ceilingNumbers: Record<string, number> = {};
            const sssNumbers: Record<string, number> = {};
            Object.entries(res.map).forEach(([name, info]) => {
              if (info?.acceptedPrice) {
                ceilingNumbers[name] = info.acceptedPrice;
              }
              if (typeof info?.supplyStabilityScore === 'number') {
                sssNumbers[name] = info.supplyStabilityScore;
              }
            });
            setAcceptedCeilingsMap(ceilingNumbers);
            setAcceptedSssMap(sssNumbers);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Poll / Refresh data every 10 seconds
  useEffect(() => {
    refreshAll();
    const timer = setInterval(() => {
      refreshAll();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={styles.container}>
      {/* Screen Header with In-Line Metrics & Action Controls */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.titleRow}>
            <div style={styles.iconBox}>
              <Handshake size={20} style={styles.headerHandshakeIcon} />
            </div>
            <div>
              <div style={styles.titleLine}>
                <h1 style={styles.title}>10-Min Flash DealMaker</h1>
                <span style={styles.liveBadge}>
                  <span style={styles.liveDot} />
                  LIVE
                </span>
                <span style={styles.tradersBadge} title="Active traders online on the DealMaker floor">
                  <Users size={12} style={styles.tradersIcon} />
                  <span>{activeTradersCount} {activeTradersCount === 1 ? 'Trader' : 'Traders'} Online</span>
                </span>
              </div>
              <p style={styles.subtitle}>
                Real-time P2P deal matchmaking across CSFloat & DMarket
              </p>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards & Actions Aligned with Same Height/Dimensions to Maximize Vertical Space */}
        <div style={styles.topControlRow}>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            style={getStatCardStyle(activeFilter === 'all')}
            title="View Active Live Deals"
          >
            <div style={styles.statIconWrapper}>
              <Layers size={14} style={styles.activeIconColor} />
            </div>
            <span style={styles.statNumber}>{activeAuctions.length}</span>
            <span style={styles.statLabel}>Active</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('my-bids')}
            style={getStatCardStyle(activeFilter === 'my-bids')}
            title="View Matched Deals Ready to Purchase"
          >
            <div style={styles.statIconWrapper}>
              <Trophy size={14} style={styles.matchedIconColor} />
            </div>
            <span style={styles.statNumber}>{wonAuctions.length}</span>
            <span style={styles.statLabel}>Matched</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('my-auctions')}
            style={getStatCardStyle(activeFilter === 'my-auctions')}
            title="View My Broadcasted Deals"
          >
            <div style={styles.statIconWrapper}>
              <Package size={14} style={styles.myDealsIconColor} />
            </div>
            <span style={styles.statNumber}>{myAuctions.length}</span>
            <span style={styles.statLabel}>My Deals</span>
          </button>

          <div style={styles.topDivider} />

          <button
            onClick={() => refreshAll()}
            disabled={isLoading}
            style={styles.refreshBtn}
            title="Refresh live deals floor"
          >
            <RefreshCw
              size={14}
              style={getRefreshIconStyle(isLoading)}
            />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => openCreateModal()}
            style={styles.createBtn}
            title="Broadcast a new skin for 10-minute flash buyer offers ($0.40 fee)"
          >
            <Plus size={15} />
            <span>Broadcast Deal (${(DEALMAKER_CONSTANTS.SELLER_BROADCAST_FEE_CENTS / 100).toFixed(2)})</span>
          </button>
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div style={styles.tabsContainer}>
        <button
          onClick={() => setActiveFilter('all')}
          style={getTabButtonStyle(activeFilter === 'all')}
        >
          <span>Live Deals Floor</span>
          <span style={styles.countBadge}>{activeAuctions.length}</span>
        </button>

        <button
          onClick={() => setActiveFilter('my-bids')}
          style={getTabButtonStyle(activeFilter === 'my-bids')}
        >
          <span>My Matched & Active Offers</span>
          <span style={styles.countBadge}>
            {wonAuctions.length + activeBidAuctions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('my-auctions')}
          style={getTabButtonStyle(activeFilter === 'my-auctions')}
        >
          <span>My Broadcasts</span>
          <span style={styles.countBadge}>{myAuctions.length}</span>
        </button>

        <button
          onClick={() => setActiveFilter('config')}
          style={getTabButtonStyle(activeFilter === 'config')}
          title="Configure your marketplace store links"
        >
          <Settings2 size={14} />
          <span>Configs</span>
        </button>
      </div>

      {/* Grid Content Area */}
      <div style={styles.contentArea}>
        {activeFilter === 'all' && (
          <div style={styles.sectionStack}>
            <DealFloorFilterBar
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              isFilterActive={isFilterActive}
              totalCount={activeAuctions.length}
              filteredCount={filteredActiveAuctions.length}
              belowCeilingCount={belowCeilingCount}
              availableMarkets={availableMarkets}
            />

            {activeAuctions.length === 0 ? (
              <div style={styles.emptyState}>
                <Handshake size={42} style={styles.emptyIcon} />
                <h3 style={styles.emptyTitle}>No Active Flash Deals Right Now</h3>
                <p style={styles.emptySubtitle}>
                  When sellers broadcast skins for quick sale, they will appear here in real-time with 10-minute matchmaking windows.
                </p>
                <button
                  onClick={() => openCreateModal()}
                  style={styles.emptyActionBtn}
                >
                  <Plus size={15} />
                  <span>Broadcast a Deal First (${(DEALMAKER_CONSTANTS.SELLER_BROADCAST_FEE_CENTS / 100).toFixed(2)})</span>
                </button>
              </div>
            ) : filteredActiveAuctions.length === 0 ? (
              <div style={styles.emptyFilterState}>
                <Sliders size={38} style={styles.emptyIcon} />
                <h3 style={styles.emptyTitle}>No Deals Match Current Filters</h3>
                <p style={styles.emptySubtitle}>
                  No live deals match your filter criteria. Try expanding your price range, switching market, or toggling off the Buy Ceiling filter.
                </p>
                <button
                  onClick={handleResetFilters}
                  style={styles.emptyResetBtn}
                >
                  <RotateCcw size={14} />
                  <span>Reset Filters</span>
                </button>
              </div>
            ) : (
              <div style={styles.grid}>
                {filteredActiveAuctions.map((auction) => (
                  <DealItemCard
                    key={auction.id}
                    auction={auction}
                    myCeiling={acceptedCeilingsMap[auction.marketHashName]}
                    mySss={acceptedSssMap[auction.marketHashName]}
                  />
                ))}
              </div>
            )}
            
          </div>
        )}

        {activeFilter === 'my-bids' && (
          <div style={styles.sectionStack}>
            {/* Won Auctions Ready To Buy */}
            {wonAuctions.length > 0 && (
              <div style={styles.subSection}>
              
                <div style={styles.grid}>
                  {wonAuctions.map((auction) => (
                    <DealItemCard
                      key={auction.id}
                      auction={auction}
                      myCeiling={acceptedCeilingsMap[auction.marketHashName]}
                    mySss={acceptedSssMap[auction.marketHashName]}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Currently Active Bids */}
            <div style={styles.subSection}>
              <h3 style={styles.subSectionTitle}>Active Matchmaking Offers</h3>
              {activeBidAuctions.length === 0 ? (
                <div style={styles.emptyStateSmall}>
                  You have not submitted offers on any currently active deals.
                </div>
              ) : (
                <div style={styles.grid}>
                  {activeBidAuctions.map((auction) => (
                    <DealItemCard
                      key={auction.id}
                      auction={auction}
                      myCeiling={acceptedCeilingsMap[auction.marketHashName]}
                    mySss={acceptedSssMap[auction.marketHashName]}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeFilter === 'my-auctions' && (
          <>
            {myAuctions.length === 0 ? (
              <div style={styles.emptyState}>
                <Package size={42} style={styles.emptyIcon} />
                <h3 style={styles.emptyTitle}>You Haven't Broadcasted Any Deals Yet</h3>
                <p style={styles.emptySubtitle}>
                  Broadcast skins with float/inspect data to all active traders for 10-minute competitive buyer offers.
                </p>
                <button
                  onClick={() => openCreateModal()}
                  style={styles.emptyActionBtn}
                >
                  <Plus size={15} />
                  <span>Broadcast a Deal (${(DEALMAKER_CONSTANTS.SELLER_BROADCAST_FEE_CENTS / 100).toFixed(2)})</span>
                </button>
              </div>
            ) : (
              <div style={styles.grid}>
                {myAuctions.map((auction) => (
                  <SellerActiveDealCard key={auction.id} auction={auction} />
                ))}
              </div>
            )}
          </>
        )}

        {activeFilter === 'config' && <DealMakerConfigTab />}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Styles extracted to bottom per TONE_AND_UI_STYLE_GUIDE.md
// ─────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '1380px',
    margin: '0 auto',
    paddingBottom: '40px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.28)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerHandshakeIcon: {
    color: '#38bdf8',
  },
  titleLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
    letterSpacing: '-0.3px',
    lineHeight: 1.2,
  },
  liveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '0.6px',
    padding: '2px 7px',
    borderRadius: '20px',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    color: '#4ade80',
  },
  liveDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    boxShadow: '0 0 8px rgba(34, 197, 94, 0.8)',
  },
  tradersBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '20px',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    color: '#38bdf8',
  },
  tradersIcon: {
    color: '#38bdf8',
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '12.5px',
    color: 'var(--so-text-muted, #94a3b8)',
  },
  topControlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  statCard: {
    height: '38px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0 12px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    boxSizing: 'border-box' as const,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    userSelect: 'none' as const,
  },
  statIconWrapper: {
    width: '22px',
    height: '22px',
    borderRadius: '5px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  activeIconColor: {
    color: '#38bdf8',
  },
  matchedIconColor: {
    color: '#eab308',
  },
  myDealsIconColor: {
    color: '#a855f7',
  },
  statNumber: {
    fontSize: '13.5px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--so-text-muted, #94a3b8)',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  },
  topDivider: {
    width: '1px',
    height: '22px',
    backgroundColor: 'var(--so-border-subtle, #1e2430)',
    margin: '0 2px',
  },
  refreshBtn: {
    height: '38px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 14px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-secondary, #94a3b8)',
    fontSize: '12.5px',
    fontWeight: 700,
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
    transition: 'all 0.15s ease',
  },
  createBtn: {
    height: '38px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 14px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-primary, #2563eb)',
    border: 'none',
    color: '#ffffff',
    fontSize: '12.5px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
    boxSizing: 'border-box' as const,
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap' as const,
  },
  tabsContainer: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid var(--so-border-subtle, #1e2430)',
    paddingBottom: '8px',
  },
  countBadge: {
    fontSize: '11px',
    fontWeight: 800,
    padding: '1px 6px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  contentArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '16px',
  },
  sectionStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  subSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  subSectionTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    borderRadius: '12px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px dashed var(--so-border-subtle, #1e2430)',
    textAlign: 'center',
    gap: '10px',
  },
  emptyIcon: {
    color: 'var(--so-text-muted, #475569)',
  },
  emptyTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
  },
  emptySubtitle: {
    margin: 0,
    maxWidth: '440px',
    fontSize: '13px',
    color: 'var(--so-text-muted, #64748b)',
    lineHeight: 1.4,
  },
  emptyActionBtn: {
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 16px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-primary, #2563eb)',
    border: 'none',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  emptyStateSmall: {
    padding: '30px 20px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px dashed var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-muted, #64748b)',
    fontSize: '13px',
    textAlign: 'center',
  },
  emptyFilterState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '50px 20px',
    borderRadius: '12px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px dashed var(--so-border-subtle, #1e2430)',
    textAlign: 'center',
    gap: '10px',
  },
  emptyResetBtn: {
    marginTop: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};

function getStatCardStyle(isActive: boolean): React.CSSProperties {
  return {
    ...styles.statCard,
    backgroundColor: isActive ? 'rgba(56, 189, 248, 0.08)' : 'var(--so-surface-card, #131720)',
    borderColor: isActive ? 'rgba(56, 189, 248, 0.4)' : 'var(--so-border-subtle, #1e2430)',
  };
}

function getRefreshIconStyle(isLoading: boolean): React.CSSProperties {
  return {
    animation: isLoading ? 'spin 1s linear infinite' : 'none',
    color: 'inherit',
  };
}

function getTabButtonStyle(isActive: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '8px',
    backgroundColor: isActive ? 'rgba(37, 99, 235, 0.16)' : 'transparent',
    border: isActive
      ? '1px solid var(--so-primary, #2563eb)'
      : '1px solid transparent',
    color: isActive ? '#ffffff' : 'var(--so-text-secondary, #94a3b8)',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };
}

export const AuctionFloorScreen = DealMakerFloorScreen;

