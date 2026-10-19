import React from 'react';
import { formatAdjustmentPct } from './negotiationUi';

interface BundleAdjustmentCardProps {
  discountPct: number;
  disabled: boolean;
  onChange: (discountPct: number) => void;
}

/** Sidebar card: seller discount / neutral / buyer premium slider. */
export const BundleAdjustmentCard: React.FC<
  BundleAdjustmentCardProps
> = ({ discountPct, disabled, onChange }) => (
  <section style={styles.card}>
    <div style={styles.cardHeader}>
      <span style={styles.cardTitle}>Bundle Adjustment</span>
      <span style={getAdjustmentValueStyle(discountPct)}>
        {formatAdjustmentPct(discountPct)}
      </span>
    </div>
    <input
      type="range"
      min={-25}
      max={25}
      step={1}
      value={discountPct}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
      aria-label="Bundle price adjustment"
      style={getRangeStyle(disabled)}
    />
    <div style={styles.rangeLabels}>
      <span>−25%</span>
      <span>0%</span>
      <span>+25%</span>
    </div>
    <div style={styles.rangeHint}>
      Seller discount · neutral · buyer premium
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
  cardTitle: {
    fontSize: '11.5px',
    fontWeight: 800,
    color: '#e2e8f0',
    letterSpacing: '0.2px',
    flex: 1,
  },
  discountValue: {
    fontSize: '12px',
    fontWeight: 900,
    color: '#38bdf8',
  },
  range: {
    width: '100%',
    accentColor: '#2563eb',
    cursor: 'pointer',
  },
  rangeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '9.5px',
    fontWeight: 700,
    color: '#64748b',
  },
  rangeHint: {
    textAlign: 'center',
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.2px',
    color: '#475569',
  },
};

function getAdjustmentValueStyle(value: number): React.CSSProperties {
  return {
    ...styles.discountValue,
    color: value > 0 ? '#fbbf24' : value < 0 ? '#38bdf8' : '#e2e8f0',
  };
}

function getRangeStyle(disabled: boolean): React.CSSProperties {
  return {
    ...styles.range,
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
