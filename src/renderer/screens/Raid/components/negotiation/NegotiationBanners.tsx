import React from 'react';
import { FileDown, Lock, Wallet, WifiOff } from 'lucide-react';
import type {
  NegotiationTransportMode,
  RaidPeerStatus,
} from '../../types/negotiation.types';
import type { UseRaidPeerHostReturn } from '../../hooks/useRaidPeerHost';

interface NegotiationBannersProps {
  error: string | null;
  billingError: UseRaidPeerHostReturn['billingError'];
  transportMode: NegotiationTransportMode;
  peerRegistered: boolean;
  status: RaidPeerStatus;
  dealLocked: boolean;
  isExportingDeal?: boolean;
  onExportDeal?: () => void;
  onTopUp?: () => void;
  onClose: () => void;
}

/**
 * Transport, billing, and lock banners. Kept in one place so the reason a
 * session is degraded reads consistently across the whole table.
 */
export const NegotiationBanners: React.FC<NegotiationBannersProps> = ({
  error,
  billingError,
  transportMode,
  peerRegistered,
  status,
  dealLocked,
  isExportingDeal = false,
  onExportDeal,
  onTopUp,
  onClose,
}) => (
  <>
    {error && !billingError && (
      <div style={styles.errorBanner}>
        <WifiOff size={14} style={styles.bannerIcon} />
        <span style={styles.bannerText}>{error}</span>
      </div>
    )}

    {billingError && (
      <div style={styles.billingBanner}>
        <Wallet size={16} style={styles.billingIcon} />
        <div style={styles.billingBody}>
          <strong style={styles.billingTitle}>
            {billingError.code === 'INSUFFICIENT_BALANCE'
              ? 'Insufficient balance'
              : 'Live session unavailable'}
          </strong>
          <span style={styles.billingText}>
            {billingError.message}
            {billingError.code === 'INSUFFICIENT_BALANCE' &&
            typeof billingError.balanceCents === 'number'
              ? ` Available: $${(
                  billingError.balanceCents / 100
                ).toFixed(2)}, required: $0.20.`
              : ''}
          </span>
        </div>
        {billingError.code === 'INSUFFICIENT_BALANCE' && (
          <button
            type="button"
            onClick={onTopUp || onClose}
            style={styles.topUpBtn}
          >
            Top Up Balance
          </button>
        )}
      </div>
    )}

    {transportMode === 'offline' && !error && !billingError && (
      <div style={styles.offlineBanner}>
        <WifiOff size={14} style={styles.bannerIcon} />
        <span style={styles.bannerText}>
          {!peerRegistered
            ? 'Signaling did not register. The link carries only the room and guest token — use Retry to open a fresh live channel.'
            : status === 'waiting' || status === 'initializing'
              ? 'No live guest yet. The seller receives the deal over the live channel after opening the link.'
              : 'Live sync unavailable. The seller needs the live channel to receive the deal; local controls remain active.'}
        </span>
      </div>
    )}

    {dealLocked && (
      <div style={styles.lockedBanner}>
        <Lock size={14} style={styles.lockedIcon} />
        <span style={styles.lockedText}>
          Deal locked — both parties confirmed the bundle.
        </span>
        {onExportDeal && (
          <button
            type="button"
            onClick={onExportDeal}
            disabled={isExportingDeal}
            style={styles.exportDealBtn}
          >
            <FileDown size={13} />
            {isExportingDeal ? 'Exporting…' : 'Export PDF'}
          </button>
        )}
      </div>
    )}
  </>
);

// ── EXTRACTED STYLES ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '12px 20px 0 20px',
    padding: '9px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.34)',
    color: '#f87171',
    fontSize: '12px',
    fontWeight: 600,
  },
  billingBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    margin: '12px 20px 0 20px',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.34)',
    color: '#f87171',
  },
  billingIcon: { flexShrink: 0 },
  billingBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: '1 1 320px',
    minWidth: 0,
  },
  billingTitle: {
    fontSize: '12px',
    fontWeight: 900,
  },
  billingText: {
    fontSize: '11px',
    lineHeight: 1.4,
    fontWeight: 600,
    color: '#fca5a5',
  },
  topUpBtn: {
    height: '30px',
    padding: '0 12px',
    borderRadius: '7px',
    backgroundColor: '#dc2626',
    border: 'none',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 800,
    cursor: 'pointer',
    flexShrink: 0,
  },
  offlineBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '12px 20px 0 20px',
    padding: '9px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.4)',
    color: '#fbbf24',
    fontSize: '12px',
    fontWeight: 600,
  },
  bannerIcon: { flexShrink: 0 },
  bannerText: { lineHeight: 1.45 },
  lockedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '12px 20px 0 20px',
    padding: '9px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.38)',
    color: '#4ade80',
    fontSize: '12px',
    fontWeight: 700,
  },
  lockedIcon: { color: '#4ade80', flexShrink: 0 },
  lockedText: { lineHeight: 1.4, flex: 1 },
  exportDealBtn: {
    height: '28px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '0 10px',
    borderRadius: '7px',
    backgroundColor: '#16a34a',
    border: 'none',
    color: '#ffffff',
    fontSize: '10.5px',
    fontWeight: 800,
    cursor: 'pointer',
    flexShrink: 0,
  },
};
