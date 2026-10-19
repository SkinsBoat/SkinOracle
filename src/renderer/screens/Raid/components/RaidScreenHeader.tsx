import React from 'react';
import { AlertTriangle, Crosshair, ShieldCheck } from 'lucide-react';
import { formatTimeAgo } from '../../../utils/timeAgo';

interface RaidScreenHeaderProps {
  ceilingCount: number;
  acceptedStoredAt: string | null;
  acceptedIsStale: boolean;
}

/** RAID title, Buy Ceiling status, and expired-ceiling warning. */
export const RaidScreenHeader: React.FC<RaidScreenHeaderProps> = ({
  ceilingCount,
  acceptedStoredAt,
  acceptedIsStale,
}) => (
  <>
    <div style={styles.header}>
      <div style={styles.titleRow}>
        <div style={styles.iconBox}>
          <Crosshair size={20} style={styles.headerIcon} />
        </div>
        <div>
          <div style={styles.titleLine}>
            <h1 style={styles.title}>RAID</h1>
            <span style={styles.subtitleBadge}>Seller Auditor</span>
          </div>
          <p style={styles.subtitle}>
            Lock onto one seller — value their entire listed stock and hunt
            every listing under your Buy Ceilings.
          </p>
        </div>
      </div>

      <div style={styles.ceilingStatus}>
        <ShieldCheck size={13} style={styles.ceilingStatusIcon} />
        <span>
          Buy Ceilings: {ceilingCount}{' '}
          {ceilingCount === 1 ? 'item' : 'items'}
          {acceptedStoredAt
            ? ` • calculated ${formatTimeAgo(acceptedStoredAt)}`
            : ' • not calculated yet'}
        </span>
      </div>
    </div>

    {acceptedIsStale && (
      <div style={styles.staleBanner}>
        <AlertTriangle size={15} style={styles.staleIcon} />
        <span style={styles.staleText}>
          Buy ceilings expired
          {acceptedStoredAt
            ? ` (calculated ${formatTimeAgo(acceptedStoredAt)})`
            : ''}{' '}
          — raid results may use stale ceilings. Recalculate accepted prices
          in Pricing Central.
        </span>
        <span style={styles.staleBadge}>EXPIRED</span>
      </div>
    )}
  </>
);

// ── EXTRACTED STYLES ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerIcon: { color: '#4ade80' },
  titleLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 900,
    letterSpacing: '2px',
    color: 'var(--so-text-primary, #f8fafc)',
    lineHeight: 1.2,
  },
  subtitleBadge: {
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '0.5px',
    padding: '2px 8px',
    borderRadius: '20px',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.28)',
    color: '#38bdf8',
    textTransform: 'uppercase',
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '12.5px',
    color: 'var(--so-text-muted, #94a3b8)',
  },
  ceilingStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    height: '34px',
    padding: '0 12px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-secondary, #94a3b8)',
    fontSize: '12px',
    fontWeight: 700,
  },
  ceilingStatusIcon: { color: '#38bdf8' },
  staleBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.45)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fbbf24',
    fontSize: '12px',
    fontWeight: 700,
  },
  staleIcon: { color: '#f59e0b', flexShrink: 0 },
  staleText: { flex: 1, lineHeight: 1.4 },
  staleBadge: {
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '0.5px',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    border: '1px solid rgba(245, 158, 11, 0.45)',
    color: '#fbbf24',
    flexShrink: 0,
  },
};
