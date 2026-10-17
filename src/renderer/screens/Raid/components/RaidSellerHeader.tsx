import React from 'react';
import { ExternalLink, FileDown, RefreshCw, Star, Store } from 'lucide-react';
import { RaidSeller } from '../../../../shared/types/raid.types';
import { MarketLogo } from '../../../components/MarketLogo';
import { formatTimeAgo } from '../../../utils/timeAgo';
import { getRaidMarketplaceName } from '../utils/raidUtils';

export interface RaidSellerHeaderProps {
  seller: RaidSeller;
  scannedAt: number | null;
  loadedCount: number;
  isBookmarked: boolean;
  isScanning: boolean;
  canExportQuote: boolean;
  isExportingQuote: boolean;
  onToggleBookmark: () => void;
  onRescan: () => void;
  onOpenStorefront: () => void;
  onExportQuote: () => void;
}

/** Seller identity strip for a resolved RAID storefront. */
export const RaidSellerHeader: React.FC<RaidSellerHeaderProps> = ({
  seller,
  scannedAt,
  loadedCount,
  isBookmarked,
  isScanning,
  canExportQuote,
  isExportingQuote,
  onToggleBookmark,
  onRescan,
  onOpenStorefront,
  onExportQuote,
}) => {
  const marketplaceName = getRaidMarketplaceName(seller.marketplace);
  const listedTotal = seller.reportedTotal;

  return (
    <div style={styles.card}>
      <div style={styles.left}>
        <MarketLogo marketId={seller.marketplace} size={34} />
        <div style={styles.identity}>
          <div style={styles.nameRow}>
            <span style={styles.name}>{seller.name}</span>
            <span style={styles.marketBadge}>{marketplaceName}</span>
          </div>
          <div style={styles.metaRow}>
            <span style={styles.metaText}>
              {loadedCount} listing{loadedCount === 1 ? '' : 's'} loaded
              {typeof listedTotal === 'number' && listedTotal !== loadedCount
                ? ` of ${listedTotal}`
                : ''}
            </span>
            {scannedAt && (
              <span style={styles.metaText}>
                • scanned {formatTimeAgo(new Date(scannedAt).toISOString())}
              </span>
            )}
            {seller.steamId && (
              <span style={styles.metaText}>
                • SteamID {seller.steamId.slice(0, 6)}…{seller.steamId.slice(-4)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={styles.actions}>
        {canExportQuote && (
          <button
            type="button"
            onClick={onExportQuote}
            disabled={isExportingQuote}
            style={getExportBtnStyle(isExportingQuote)}
            title="Export a PDF acquisition quote for every listing below your Buy Ceiling"
          >
            <FileDown size={13} />
            <span>{isExportingQuote ? 'Exporting…' : 'Export Quote'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenStorefront}
          style={styles.ghostBtn}
          title="Open the seller storefront in your browser"
        >
          <Store size={13} />
          <span>Storefront</span>
          <ExternalLink size={12} />
        </button>

        <button
          type="button"
          onClick={onRescan}
          disabled={isScanning}
          style={styles.ghostBtn}
          title="Rescan this seller's current stock"
        >
          <RefreshCw size={13} style={getSpinStyle(isScanning)} />
          <span>Rescan</span>
        </button>

        <button
          type="button"
          onClick={onToggleBookmark}
          style={getBookmarkStyle(isBookmarked)}
          title={
            isBookmarked
              ? 'Remove this seller from saved sellers'
              : 'Save this seller for quick rescanning'
          }
        >
          <Star size={13} fill={isBookmarked ? '#fbbf24' : 'none'} />
          <span>{isBookmarked ? 'Saved' : 'Save'}</span>
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '14px',
    flexWrap: 'wrap',
    padding: '12px 14px',
    borderRadius: '12px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
  },
  identity: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    minWidth: 0,
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  name: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
    letterSpacing: '-0.2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '320px',
  },
  marketBadge: {
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '0.4px',
    padding: '2px 7px',
    borderRadius: '20px',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.28)',
    color: '#38bdf8',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: '11.5px',
    color: 'var(--so-text-muted, #94a3b8)',
    fontFamily: 'monospace',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  ghostBtn: {
    height: '34px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 12px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-surface-panel, #181d27)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-secondary, #94a3b8)',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
};

function getSpinStyle(isScanning: boolean): React.CSSProperties {
  return {
    animation: isScanning ? 'spin 1s linear infinite' : 'none',
    color: 'inherit',
  };
}

function getExportBtnStyle(isExporting: boolean): React.CSSProperties {
  return {
    height: '34px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 13px',
    borderRadius: '8px',
    backgroundColor: isExporting ? 'rgba(37, 99, 235, 0.5)' : '#2563eb',
    border: 'none',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 800,
    cursor: isExporting ? 'not-allowed' : 'pointer',
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
    boxShadow: isExporting ? 'none' : '0 3px 10px rgba(37, 99, 235, 0.28)',
  };
}

function getBookmarkStyle(isBookmarked: boolean): React.CSSProperties {
  return {
    height: '34px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 12px',
    borderRadius: '8px',
    backgroundColor: isBookmarked ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
    border: isBookmarked
      ? '1px solid rgba(251, 191, 36, 0.4)'
      : '1px solid var(--so-border-subtle, #1e2430)',
    color: isBookmarked ? '#fbbf24' : 'var(--so-text-secondary, #94a3b8)',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    boxSizing: 'border-box',
  };
}
