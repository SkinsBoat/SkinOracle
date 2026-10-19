import type {
  NegotiationTransportMode,
  RaidPeerStatus,
} from '../../types/negotiation.types';

export type NegotiationStatusTone = 'live' | 'offline' | 'pending' | 'error';

export interface NegotiationStatusMeta {
  label: string;
  tone: NegotiationStatusTone;
}

export function getStatusMeta(
  status: RaidPeerStatus,
  transport: NegotiationTransportMode,
  peerRegistered: boolean,
  latencyMs: number | null,
): NegotiationStatusMeta {
  if (transport === 'p2p') {
    return {
      label:
        latencyMs !== null
          ? `Live P2P Connected · ${latencyMs}ms`
          : 'Live P2P Connected',
      tone: 'live',
    };
  }
  if (transport === 'offline') {
    return { label: 'Offline Interactive', tone: 'offline' };
  }
  if (status === 'error') {
    return { label: 'Session Error', tone: 'error' };
  }
  if (peerRegistered) {
    return { label: 'Waiting for Seller', tone: 'pending' };
  }
  return { label: 'Registering Signaling…', tone: 'pending' };
}

export function formatAdjustmentPct(value: number): string {
  if (value === 0) return '0%';
  return `${value > 0 ? '+' : '−'}${Math.abs(value)}%`;
}

export function formatChatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMarketplaceLabel(
  marketplace: string | undefined,
): string {
  switch (marketplace) {
    case 'skinport':
      return 'Skinport';
    case 'csfloat':
      return 'CSFloat';
    case 'dmarket':
      return 'DMarket';
    case 'csmoney':
      return 'CS.MONEY';
    case 'steam':
      return 'Steam';
    default:
      return 'Marketplace';
  }
}
