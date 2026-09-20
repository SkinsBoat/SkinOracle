import React from 'react';
import {
  Search,
  ShieldCheck,
  RotateCcw,
  X,
  SlidersHorizontal,
  Store,
  DollarSign,
  Layers,
} from 'lucide-react';
import { DealFloorFilters, AuctionFloorFilters } from '../utils/dealFilterUtils';
import { MarketLogo } from '../../../components/MarketLogo';
import {
  getMarketDisplayName,
  isMarketMatch,
} from '../../../../shared/canonicalMarkets';
import {
  DEALMAKER_MARKET_IDS,
  normalizeDealMakerMarketId,
} from '../../../../shared/dealmakerMarkets';

export interface DealFloorFilterBarProps {
  filters: DealFloorFilters;
  onFilterChange: <K extends keyof DealFloorFilters>(
    key: K,
    value: DealFloorFilters[K],
  ) => void;
  onResetFilters: () => void;
  isFilterActive: boolean;
  totalCount: number;
  filteredCount: number;
  belowCeilingCount: number;
  availableMarkets?: string[];
}

export type AuctionFloorFilterBarProps = DealFloorFilterBarProps;

export const DealFloorFilterBar: React.FC<DealFloorFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  isFilterActive,
  totalCount,
  filteredCount,
  belowCeilingCount,
  availableMarkets = ['all', ...DEALMAKER_MARKET_IDS],
}) => {
  return (
    <div style={styles.container}>
      {/* Primary Row: Search, Market Filter Pills, & Buy Ceiling Toggle */}
      <div style={styles.topRow}>
        {/* Search Input */}
        <div style={styles.searchWrapper}>
          <Search size={15} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search deals (e.g. AWP, Doppler, Fade)..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange('searchQuery', e.target.value)}
            style={styles.searchInput}
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onFilterChange('searchQuery', '')}
              style={styles.clearSearchBtn}
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Market Filter Pills */}
        <div style={styles.marketGroup}>
          <div style={styles.groupLabel}>
            <Store size={13} style={{ color: '#64748b' }} />
            <span>Market:</span>
          </div>
          {availableMarkets.map((market) => {
            const isAll = market.toLowerCase() === 'all';
            const canonicalId = isAll ? 'all' : normalizeDealMakerMarketId(market) ?? 'all';
            const isSelected = isAll
              ? filters.marketFilter.toLowerCase() === 'all'
              : isMarketMatch(filters.marketFilter, market);
            const displayName = isAll ? 'All Markets' : getMarketDisplayName(market);

            return (
              <button
                key={market}
                type="button"
                onClick={() => onFilterChange('marketFilter', canonicalId)}
                style={getMarketPillStyle(isSelected)}
                title={isAll ? 'Show deals from all marketplaces' : `Filter by ${displayName}`}
              >
                {!isAll ? (
                  <MarketLogo
                    marketId={market}
                    marketName={displayName}
                    size={14}
                    showBackground={false}
                  />
                ) : (
                  <Layers size={13} style={{ color: isSelected ? '#ffffff' : '#94a3b8' }} />
                )}
                <span>{displayName}</span>
              </button>
            );
          })}
        </div>

        {/* <= Buy Ceiling Toggle Button */}
        <button
          type="button"
          onClick={() =>
            onFilterChange('onlyBelowCeiling', !filters.onlyBelowCeiling)
          }
          style={getCeilingToggleStyle(filters.onlyBelowCeiling)}
          title="Filter to only deals priced at or below your calculated Oracle Buy Ceiling (profitable opportunities)"
        >
          <ShieldCheck
            size={16}
            style={{
              color: filters.onlyBelowCeiling ? '#10b981' : '#38bdf8',
            }}
          />
          <span style={styles.ceilingBtnText}>≤ Buy Ceiling Only</span>
          <span style={getCeilingBadgeStyle(filters.onlyBelowCeiling)}>
            {belowCeilingCount}
          </span>
        </button>
      </div>

      {/* Secondary Row: Price Range, Count Summary & Reset Action */}
      <div style={styles.bottomRow}>
        {/* Buy Ceiling Range Inputs */}
        <div
          style={styles.priceRangeGroup}
          title="Filter deals by your calculated Oracle Buy Ceiling for the item (not the current offer price)"
        >
          <div style={styles.groupLabel}>
            <DollarSign size={13} style={{ color: '#64748b' }} />
            <span>Buy Ceiling:</span>
          </div>
          <div style={styles.priceInputWrapper}>
            <span style={styles.priceCurrency}>$</span>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => onFilterChange('minPrice', e.target.value)}
              style={styles.priceInput}
            />
          </div>
          <span style={styles.rangeDivider}>–</span>
          <div style={styles.priceInputWrapper}>
            <span style={styles.priceCurrency}>$</span>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => onFilterChange('maxPrice', e.target.value)}
              style={styles.priceInput}
            />
          </div>
          {(filters.minPrice || filters.maxPrice) && (
            <button
              type="button"
              onClick={() => {
                onFilterChange('minPrice', '');
                onFilterChange('maxPrice', '');
              }}
              style={styles.clearPriceBtn}
              title="Clear price filter"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Right side: Count & Reset Action */}
        <div style={styles.statsAndReset}>
          <div style={styles.countIndicator}>
            <SlidersHorizontal size={13} style={{ color: '#64748b' }} />
            <span>
              Showing <strong>{filteredCount}</strong> of {totalCount} deals
            </span>
            {filters.onlyBelowCeiling && (
              <span style={styles.activeFilterTag}>Profitable</span>
            )}
          </div>

          {isFilterActive && (
            <button
              type="button"
              onClick={onResetFilters}
              style={styles.resetBtn}
              title="Reset all filters"
            >
              <RotateCcw size={12} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
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
    gap: '12px',
    padding: '14px 18px',
    borderRadius: '10px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: '1 1 240px',
    minWidth: '200px',
  },
  searchIcon: {
    position: 'absolute',
    left: '11px',
    color: 'var(--so-text-muted, #64748b)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '8px 32px 8px 34px',
    borderRadius: '8px',
    backgroundColor: '#0b0e14',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-primary, #f8fafc)',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    color: 'var(--so-text-muted, #64748b)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    borderRadius: '4px',
  },
  marketGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  groupLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--so-text-muted, #64748b)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    marginRight: '2px',
  },
  ceilingBtnText: {
    letterSpacing: '-0.2px',
  },
  bottomRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px',
    flexWrap: 'wrap',
    paddingTop: '6px',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
  },
  priceRangeGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  priceInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  priceCurrency: {
    position: 'absolute',
    left: '8px',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--so-text-muted, #64748b)',
    pointerEvents: 'none',
  },
  priceInput: {
    width: '78px',
    padding: '6px 8px 6px 20px',
    borderRadius: '6px',
    backgroundColor: '#0b0e14',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-primary, #f8fafc)',
    fontSize: '12.5px',
    fontWeight: 600,
    outline: 'none',
  },
  rangeDivider: {
    color: 'var(--so-text-muted, #64748b)',
    fontSize: '12px',
    fontWeight: 600,
  },
  clearPriceBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--so-text-muted, #64748b)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3px',
    borderRadius: '4px',
  },
  statsAndReset: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  countIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    fontSize: '12px',
    color: 'var(--so-text-secondary, #94a3b8)',
  },
  activeFilterTag: {
    fontSize: '10.5px',
    fontWeight: 800,
    textTransform: 'uppercase',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    border: '1px solid rgba(16, 185, 129, 0.3)',
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 10px',
    borderRadius: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#f87171',
    fontSize: '11.5px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};

// ─────────────────────────────────────────────────────────────────
// Pure helper functions for dynamic styling
// ─────────────────────────────────────────────────────────────────
function getMarketPillStyle(isSelected: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255, 255, 255, 0.03)',
    border: isSelected
      ? '1px solid var(--so-primary, #2563eb)'
      : '1px solid var(--so-border-subtle, #1e2430)',
    color: isSelected ? '#ffffff' : 'var(--so-text-secondary, #94a3b8)',
  };
}

function getCeilingToggleStyle(isActive: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '7px 14px',
    borderRadius: '8px',
    fontSize: '12.5px',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    backgroundColor: isActive
      ? 'rgba(16, 185, 129, 0.16)'
      : 'rgba(56, 189, 248, 0.06)',
    border: isActive
      ? '1px solid #10b981'
      : '1px solid rgba(56, 189, 248, 0.25)',
    color: isActive ? '#34d399' : 'var(--so-text-primary, #f8fafc)',
    boxShadow: isActive ? '0 0 12px rgba(16, 185, 129, 0.25)' : 'none',
  };
}

function getCeilingBadgeStyle(isActive: boolean): React.CSSProperties {
  return {
    fontSize: '11px',
    fontWeight: 800,
    padding: '1px 6px',
    borderRadius: '10px',
    backgroundColor: isActive ? '#10b981' : 'rgba(56, 189, 248, 0.2)',
    color: isActive ? '#ffffff' : '#38bdf8',
    marginLeft: '2px',
  };
}

export const AuctionFloorFilterBar = DealFloorFilterBar;
