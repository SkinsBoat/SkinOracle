import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { NegotiationTotals } from '../../utils/negotiationMath';
import { formatUsd } from '../../utils/raidUtils';

interface BundleEconomicsCardProps {
  totals: NegotiationTotals | null;
}

/** Sidebar card: selected bundle value before and after the counter-offer. */
export const BundleEconomicsCard: React.FC<
  BundleEconomicsCardProps
> = ({ totals }) => (
  <section style={styles.card}>
    <div style={styles.cardHeader}>
      <ShieldCheck size={14} style={styles.cardIcon} />
      <span style={styles.cardTitle}>Bundle Economics</span>
    </div>
    <div style={styles.summaryRow}>
      <span style={styles.summaryLabel}>Listed value</span>
      <span style={styles.summaryValue}>
        {formatUsd(totals?.listedTotal)}
      </span>
    </div>
    <div style={styles.summaryRow}>
      <span style={styles.summaryLabel}>Proposed offer</span>
      <span style={styles.summaryOffer}>
        {formatUsd(totals?.proposedTotal)}
      </span>
    </div>
    <div style={styles.summaryRow}>
      <span style={styles.summaryLabel}>Net savings</span>
      <span style={styles.summarySavings}>
        {totals && totals.savings > 0
          ? `−${formatUsd(totals.savings)}`
          : formatUsd(0)}
      </span>
    </div>
  </section>
);

// ── EXTRACTED STYLES ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    borderRadius: '10px',
    backgroundColor: '#131720',
    border: '1px solid #1e2430',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    minHeight: '17px',
  },
  cardIcon: { color: '#38bdf8' },
  cardTitle: {
    fontSize: '11.5px',
    fontWeight: 800,
    color: '#e2e8f0',
    letterSpacing: '0.2px',
    flex: 1,
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  summaryLabel: {
    fontSize: '11.5px',
    fontWeight: 600,
    color: '#94a3b8',
  },
  summaryValue: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#e2e8f0',
  },
  summaryOffer: {
    fontSize: '13px',
    fontWeight: 900,
    color: '#38bdf8',
  },
  summarySavings: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#4ade80',
  },
};
