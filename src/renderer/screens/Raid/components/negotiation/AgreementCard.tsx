import React from 'react';
import { Check, Lock, Unlock } from 'lucide-react';

interface AgreementCardProps {
  traderReady: boolean;
  sellerReady: boolean;
  locked: boolean;
  onToggleReady: () => void;
  onLockDeal: () => void;
}

/** Sidebar card: readiness handshake and final lock. */
export const AgreementCard: React.FC<AgreementCardProps> = ({
  traderReady,
  sellerReady,
  locked,
  onToggleReady,
  onLockDeal,
}) => {
  const bothReady = traderReady && sellerReady;

  return (
    <section style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>Agreement</span>
        {locked ? (
          <Lock size={13} style={styles.lockedIcon} />
        ) : (
          <Unlock size={13} style={styles.cardIcon} />
        )}
      </div>
      <div style={styles.readyGrid}>
        <ReadyPill label="Trader" ready={traderReady} />
        <ReadyPill label="Seller" ready={sellerReady} />
      </div>
      <button
        type="button"
        onClick={onToggleReady}
        disabled={locked}
        style={getSecondaryBtnStyle(locked)}
      >
        {traderReady ? 'Withdraw Ready' : 'Mark Ready'}
      </button>
      <button
        type="button"
        onClick={onLockDeal}
        disabled={!bothReady || locked}
        style={getPrimaryBtnStyle(!bothReady || locked)}
      >
        <Check size={14} />
        <span>{locked ? 'Deal Locked' : 'Lock Deal'}</span>
      </button>
    </section>
  );
};

const ReadyPill: React.FC<{ label: string; ready: boolean }> = ({
  label,
  ready,
}) => (
  <div style={getReadyPillStyle(ready)}>
    <span style={styles.readyPillLabel}>{label}</span>
    <span style={ready ? styles.readyPillOn : styles.readyPillOff}>
      {ready ? 'READY' : 'WAITING'}
    </span>
  </div>
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
  lockedIcon: { color: '#4ade80', flexShrink: 0 },
  cardTitle: {
    fontSize: '11.5px',
    fontWeight: 800,
    color: '#e2e8f0',
    letterSpacing: '0.2px',
    flex: 1,
  },
  readyGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '7px',
  },
  readyPill: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '7px 9px',
    borderRadius: '7px',
    backgroundColor: '#0d1117',
    border: '1px solid #1e2430',
  },
  readyPillLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#94a3b8',
  },
  readyPillOn: {
    fontSize: '9px',
    fontWeight: 900,
    letterSpacing: '0.4px',
    color: '#4ade80',
  },
  readyPillOff: {
    fontSize: '9px',
    fontWeight: 900,
    letterSpacing: '0.4px',
    color: '#64748b',
  },
};

function getReadyPillStyle(ready: boolean): React.CSSProperties {
  return {
    ...styles.readyPill,
    borderColor: ready ? 'rgba(34, 197, 94, 0.4)' : '#1e2430',
    backgroundColor: ready ? 'rgba(34, 197, 94, 0.08)' : '#0d1117',
  };
}

function getSecondaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    height: '31px',
    borderRadius: '7px',
    backgroundColor: 'transparent',
    border: '1px solid #2a3342',
    color: disabled ? '#475569' : '#cbd5e1',
    fontSize: '11px',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function getPrimaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    height: '33px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderRadius: '7px',
    backgroundColor: disabled ? 'rgba(22, 163, 74, 0.35)' : '#16a34a',
    border: 'none',
    color: disabled ? 'rgba(255, 255, 255, 0.55)' : '#ffffff',
    fontSize: '11.5px',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
