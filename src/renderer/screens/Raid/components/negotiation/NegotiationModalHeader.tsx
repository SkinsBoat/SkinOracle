import React from 'react';
import { Copy, Handshake, X } from 'lucide-react';
import type { RaidSeller } from '../../../../../shared/types/raid.types';
import type {
  NegotiationTransportMode,
  RaidPeerStatus,
} from '../../types/negotiation.types';
import { NegotiationStatusBadge } from './NegotiationStatusBadge';
import { getMarketplaceLabel } from './negotiationUi';

interface NegotiationModalHeaderProps {
  seller: RaidSeller | null;
  roomId: string | null;
  status: RaidPeerStatus;
  transportMode: NegotiationTransportMode;
  peerRegistered: boolean;
  latencyMs: number | null;
  linkReady: boolean;
  onRetry: () => void;
  onCopy: () => void;
  onClose: () => void;
}

export const NegotiationModalHeader: React.FC<
  NegotiationModalHeaderProps
> = ({
  seller,
  roomId,
  status,
  transportMode,
  peerRegistered,
  latencyMs,
  linkReady,
  onRetry,
  onCopy,
  onClose,
}) => {
  const peerLabel = roomId
    ? `${roomId.slice(0, 8)}…${roomId.slice(-4)}`
    : '—';

  return (
    <header style={styles.header}>
      <div style={styles.identity}>
        <div style={styles.titleIcon}>
          <Handshake size={20} style={styles.titleIconGlyph} />
        </div>
        <div style={styles.titleText}>
          <div style={styles.titleRow}>
            <h2 style={styles.title}>Live Negotiation Table</h2>
            <NegotiationStatusBadge
              status={status}
              transportMode={transportMode}
              peerRegistered={peerRegistered}
              latencyMs={latencyMs}
            />
          </div>
          <p style={styles.subtitle}>
            {seller?.name || 'Seller'} ·{' '}
            {getMarketplaceLabel(seller?.marketplace)}
          </p>
        </div>
      </div>

      <div style={styles.actions}>
        <div style={styles.peerBox} title={roomId || undefined}>
          <span style={styles.peerBoxLabel}>PEER ID</span>
          <code style={styles.peerBoxValue}>{peerLabel}</code>
        </div>
        {!peerRegistered && transportMode === 'offline' && (
          <button type="button" onClick={onRetry} style={styles.retryBtn}>
            Retry
          </button>
        )}
        <button
          type="button"
          onClick={onCopy}
          disabled={!linkReady}
          style={getCopyBtnStyle(!linkReady)}
        >
          <Copy size={14} />
          <span>Copy Link</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide live negotiation table"
          title="Hide the room. The paid session stays active until you end it."
          style={styles.closeBtn}
        >
          <X size={16} />
        </button>
      </div>
    </header>
  );
};

// ── EXTRACTED STYLES ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
    padding: '18px 20px',
    backgroundColor: 'rgba(11, 15, 20, 0.97)',
    borderBottom: '1px solid #1e2430',
  },
  identity: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
  },
  titleIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.32)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleIconGlyph: { color: '#4ade80' },
  titleText: { minWidth: 0 },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 900,
    letterSpacing: '0.3px',
    color: '#f8fafc',
  },
  subtitle: {
    margin: '3px 0 0 0',
    fontSize: '12px',
    fontWeight: 600,
    color: '#94a3b8',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  peerBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    padding: '5px 9px',
    borderRadius: '7px',
    backgroundColor: '#0d1117',
    border: '1px solid #1e2430',
  },
  peerBoxLabel: {
    fontSize: '8px',
    fontWeight: 800,
    letterSpacing: '0.8px',
    color: '#64748b',
  },
  peerBoxValue: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#cbd5e1',
    fontFamily: 'var(--so-font-mono, ui-monospace, monospace)',
  },
  retryBtn: {
    height: '32px',
    padding: '0 11px',
    borderRadius: '8px',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.42)',
    color: '#fbbf24',
    fontSize: '11px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    border: '1px solid #1e2430',
    color: '#94a3b8',
    cursor: 'pointer',
  },
};

function getCopyBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    height: '32px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 11px',
    borderRadius: '8px',
    backgroundColor: disabled ? 'rgba(37, 99, 235, 0.3)' : '#2563eb',
    border: 'none',
    color: disabled ? 'rgba(255, 255, 255, 0.55)' : '#ffffff',
    fontSize: '11px',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
