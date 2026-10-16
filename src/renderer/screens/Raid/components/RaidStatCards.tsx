import React from 'react';
import { Crosshair, Gavel, Layers, Package, TrendingUp } from 'lucide-react';
import { RaidAuditSummary } from '../../../../shared/types/raid.types';
import { formatUsd } from '../utils/raidUtils';

export interface RaidStatCardsProps {
  summary: RaidAuditSummary;
}

/**
 * Institutional metric strip for the RAID seller audit:
 * Raid Zone size, potential profit, total stock value, ceiling coverage,
 * and (when the seller accepts offers) how many listings accept an offer.
 */
export const RaidStatCards: React.FC<RaidStatCardsProps> = ({
  summary,
}) => {
  const coverage =
    summary.totalItems > 0
      ? `${summary.valuedItems}/${summary.totalItems}`
      : '0/0';

  return (
    <div style={styles.row}>
      <StatTile
        icon={<Crosshair size={14} style={styles.raidIcon} />}
        value={String(summary.raidCount)}
        label="In RAID Zone"
        accent={summary.raidCount > 0}
      />
      <StatTile
        icon={<TrendingUp size={14} style={styles.profitIcon} />}
        value={formatUsd(summary.potentialProfit)}
        label="Potential Profit"
        accent={summary.potentialProfit > 0}
      />
      <StatTile
        icon={<Package size={14} style={styles.valueIcon} />}
        value={formatUsd(summary.totalStockValue)}
        label="Stock Value"
      />
      {summary.offerCount > 0 && (
        <StatTile
          icon={<Gavel size={14} style={styles.offerIcon} />}
          value={String(summary.offerCount)}
          label="Offers ≤ Ceiling"
        />
      )}
      <StatTile
        icon={<Layers size={14} style={styles.coverageIcon} />}
        value={coverage}
        label="Ceiling Coverage"
      />
    </div>
  );
};

interface StatTileProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent?: boolean;
}

const StatTile: React.FC<StatTileProps> = ({
  icon,
  value,
  label,
  accent = false,
}) => (
  <div style={getTileStyle(accent)}>
    <div style={styles.tileIconWrapper}>{icon}</div>
    <div style={styles.tileTextGroup}>
      <span style={getTileValueStyle(accent)}>{value}</span>
      <span style={styles.tileLabel}>{label}</span>
    </div>
  </div>
);

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '10px',
  },
  tileIconWrapper: {
    width: '26px',
    height: '26px',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  raidIcon: { color: '#4ade80' },
  profitIcon: { color: '#22c55e' },
  valueIcon: { color: '#38bdf8' },
  offerIcon: { color: '#38bdf8' },
  coverageIcon: { color: '#a855f7' },
  tileTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    minWidth: 0,
  },
  tileValue: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
    letterSpacing: '-0.2px',
    lineHeight: 1.1,
  },
  tileLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--so-text-muted, #94a3b8)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    whiteSpace: 'nowrap',
  },
};

function getTileStyle(accent: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '10px',
    backgroundColor: accent
      ? 'rgba(34, 197, 94, 0.08)'
      : 'var(--so-surface-card, #131720)',
    border: accent
      ? '1px solid rgba(34, 197, 94, 0.35)'
      : '1px solid var(--so-border-subtle, #1e2430)',
    boxSizing: 'border-box',
  };
}

function getTileValueStyle(accent: boolean): React.CSSProperties {
  return {
    ...styles.tileValue,
    color: accent ? '#4ade80' : 'var(--so-text-primary, #f8fafc)',
  };
}
