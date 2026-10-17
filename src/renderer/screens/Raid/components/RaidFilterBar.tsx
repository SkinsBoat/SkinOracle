import React from 'react';
import { ArrowUpDown, ChevronDown, RotateCcw, Search, ShieldCheck, Sliders } from 'lucide-react';
import { RaidFilters } from '../../../../shared/types/raid.types';
import { RaidSortKey } from '../utils/raidUtils';

export interface RaidFilterBarProps {
  filters: RaidFilters;
  onFilterChange: <K extends keyof RaidFilters>(
    key: K,
    value: RaidFilters[K],
  ) => void;
  onResetFilters: () => void;
  isFilterActive: boolean;
  sortKey: RaidSortKey;
  onSortChange: (key: RaidSortKey) => void;
  visibleCount: number;
  totalCount: number;
}

/** Trader-configured raid criteria: ceiling-only, search, spread/profit floors. */
export const RaidFilterBar: React.FC<RaidFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  isFilterActive,
  sortKey,
  onSortChange,
  visibleCount,
  totalCount,
}) => {
  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <button
          type="button"
          onClick={() => onFilterChange('onlyRaids', !filters.onlyRaids)}
          style={getToggleStyle(filters.onlyRaids)}
          title="Show only listings at or below your Buy Ceiling"
        >
          <Sliders size={13} />
          <span>RAID Zone Only</span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('onlyCeiling', !filters.onlyCeiling)}
          style={getToggleStyle(filters.onlyCeiling)}
          title="Hide stock that has no local Buy Ceiling. Note: this still includes items priced ABOVE the ceiling — use RAID Zone Only to hide those."
        >
          <ShieldCheck size={13} />
          <span>Has Ceiling</span>
        </button>

        <div style={styles.searchBox}>
          <Search size={13} style={styles.searchIcon} />
          <input
            value={filters.searchQuery}
            onChange={(e) => onFilterChange('searchQuery', e.target.value)}
            placeholder="Filter by skin name…"
            style={styles.searchInput}
          />
        </div>

        <div style={styles.numBox}>
          <span style={styles.numLabel}>Min $</span>
          <input
            value={filters.minSpread}
            onChange={(e) => onFilterChange('minSpread', e.target.value)}
            inputMode="decimal"
            placeholder="0"
            style={styles.numInput}
          />
        </div>

        <div style={styles.numBox}>
          <span style={styles.numLabel}>Min %</span>
          <input
            value={filters.minProfitPercent}
            onChange={(e) => onFilterChange('minProfitPercent', e.target.value)}
            inputMode="decimal"
            placeholder="0"
            style={styles.numInput}
          />
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.sortBox}>
          <ArrowUpDown size={12} style={styles.sortIcon} />
          <select
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as RaidSortKey)}
            style={styles.sortSelect}
            title="Sort the raid list"
          >
            <option style={styles.sortOption} value="spread">Best $ Spread</option>
            <option style={styles.sortOption} value="profitPercent">Best % Margin</option>
            <option style={styles.sortOption} value="price">Lowest Price</option>
            <option style={styles.sortOption} value="ceiling">Highest Ceiling</option>
          </select>
          <ChevronDown size={12} style={styles.sortChevron} />
        </div>

        <span style={styles.countText}>
          {visibleCount}
          {visibleCount !== totalCount ? ` / ${totalCount}` : ''} shown
        </span>

        {isFilterActive && (
          <button
            type="button"
            onClick={onResetFilters}
            style={styles.resetBtn}
            title="Reset raid filters"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    padding: '10px 12px',
    borderRadius: '10px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    height: '32px',
    padding: '0 10px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-surface-input, #0d1117)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    boxSizing: 'border-box',
  },
  searchIcon: { color: 'var(--so-text-muted, #64748b)' },
  searchInput: {
    width: '170px',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--so-text-primary, #f8fafc)',
    fontSize: '12.5px',
  },
  numBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    height: '32px',
    padding: '0 9px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-surface-input, #0d1117)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    boxSizing: 'border-box',
  },
  numLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--so-text-muted, #64748b)',
  },
  numInput: {
    width: '48px',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--so-text-primary, #f8fafc)',
    fontSize: '12.5px',
    fontWeight: 700,
  },
  sortBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    height: '32px',
    padding: '0 8px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-surface-input, #0d1117)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
  },
  sortIcon: { color: 'var(--so-text-muted, #64748b)', flexShrink: 0 },
  sortChevron: {
    color: 'var(--so-text-muted, #64748b)',
    flexShrink: 0,
    pointerEvents: 'none',
  },
  sortSelect: {
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    flex: 1,
    minWidth: 0,
    width: '100%',
    height: '100%',
    background: 'transparent',
    color: 'var(--so-text-secondary, #94a3b8)',
    border: 'none',
    outline: 'none',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
  },
  sortOption: {
    backgroundColor: '#0d1117',
    color: '#f8fafc',
  },
  countText: {
    fontSize: '11.5px',
    fontWeight: 700,
    color: 'var(--so-text-muted, #94a3b8)',
    whiteSpace: 'nowrap',
  },
  resetBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    cursor: 'pointer',
  },
};

function getToggleStyle(active: boolean): React.CSSProperties {
  return {
    height: '32px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 12px',
    borderRadius: '8px',
    backgroundColor: active ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
    border: active
      ? '1px solid rgba(34, 197, 94, 0.4)'
      : '1px solid var(--so-border-subtle, #1e2430)',
    color: active ? '#4ade80' : 'var(--so-text-secondary, #94a3b8)',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
  };
}
