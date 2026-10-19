import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import type {
  NegotiationTransportMode,
  RaidPeerStatus,
} from '../../types/negotiation.types';
import {
  getStatusMeta,
  NegotiationStatusTone,
} from './negotiationUi';

interface NegotiationStatusBadgeProps {
  status: RaidPeerStatus;
  transportMode: NegotiationTransportMode;
  peerRegistered: boolean;
  latencyMs: number | null;
}

/** Transport badge: live P2P, offline interactive, or signaling progress. */
export const NegotiationStatusBadge: React.FC<
  NegotiationStatusBadgeProps
> = ({ status, transportMode, peerRegistered, latencyMs }) => {
  const meta = getStatusMeta(
    status,
    transportMode,
    peerRegistered,
    latencyMs,
  );

  return (
    <span style={getStatusBadgeStyle(meta.tone)}>
      {meta.tone === 'live' ? (
        <Wifi size={11} />
      ) : meta.tone === 'offline' ? (
        <WifiOff size={11} />
      ) : (
        <span style={styles.statusDot} />
      )}
      {meta.label}
    </span>
  );
};

// ── EXTRACTED STYLES ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  statusDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    backgroundColor: 'currentColor',
  },
};

function getStatusBadgeStyle(
  tone: NegotiationStatusTone,
): React.CSSProperties {
  const palette = {
    live: {
      backgroundColor: 'rgba(34, 197, 94, 0.12)',
      border: '1px solid rgba(34, 197, 94, 0.38)',
      color: '#4ade80',
    },
    offline: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      border: '1px solid rgba(245, 158, 11, 0.4)',
      color: '#fbbf24',
    },
    pending: {
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      border: '1px solid rgba(56, 189, 248, 0.32)',
      color: '#38bdf8',
    },
    error: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.36)',
      color: '#f87171',
    },
  }[tone];

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    borderRadius: '20px',
    fontSize: '9.5px',
    fontWeight: 800,
    letterSpacing: '0.25px',
    ...palette,
  };
}
