import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface NegotiationFooterProps {
  shareUrl: string | null;
  linkReady: boolean;
  remainingBalanceCents: number | null;
  onEndSession: () => void;
}

/** Footer: share link, session spend, and explicit session end. */
export const NegotiationFooter: React.FC<NegotiationFooterProps> = ({
  shareUrl,
  linkReady,
  remainingBalanceCents,
  onEndSession,
}) => (
  <footer style={styles.footer}>
    <div style={styles.shareField}>
      <span style={styles.shareLabel}>Shareable link</span>
      <input
        type="text"
        readOnly
        value={
          linkReady
            ? shareUrl || ''
            : 'Registering secure signaling channel…'
        }
        onFocus={(event) => event.currentTarget.select()}
        onClick={(event) => event.currentTarget.select()}
        aria-label="Shareable deal link"
        style={styles.shareInput}
      />
    </div>
    <div style={styles.footerMeta}>
      <ShieldCheck size={12} style={styles.footerIcon} />
      <span>
        {shareUrl
          ? `${shareUrl.length.toLocaleString()} chars${
              shareUrl.length > 2000
                ? ' (long — chat apps may truncate)'
                : ''
            } · room + token`
          : 'Link pending'}
      </span>
      <span>
        {remainingBalanceCents !== null
          ? `Session $0.20 · balance $${(
              remainingBalanceCents / 100
            ).toFixed(2)}`
          : 'Session fee $0.20'}
      </span>
      <span>· zero server storage · ceilings never transmitted</span>
    </div>
    <button
      type="button"
      onClick={onEndSession}
      style={styles.endSessionBtn}
      title="End the paid session and disconnect the seller"
    >
      End Session
    </button>
  </footer>
);

// ── EXTRACTED STYLES ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '16px',
    padding: '13px 20px',
    borderTop: '1px solid #1e2430',
  },
  shareField: {
    flex: '1 1 420px',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  shareLabel: {
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '0.5px',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  shareInput: {
    height: '30px',
    padding: '0 9px',
    borderRadius: '7px',
    backgroundColor: '#0d1117',
    border: '1px solid #1e2430',
    color: '#94a3b8',
    fontSize: '10.5px',
    fontWeight: 600,
    outline: 'none',
    fontFamily: 'var(--so-font-mono, ui-monospace, monospace)',
  },
  footerMeta: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    color: '#64748b',
    fontSize: '10px',
    fontWeight: 600,
  },
  footerIcon: { color: '#38bdf8', flexShrink: 0 },
  endSessionBtn: {
    height: '30px',
    padding: '0 11px',
    borderRadius: '7px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.34)',
    color: '#f87171',
    fontSize: '10px',
    fontWeight: 800,
    cursor: 'pointer',
    flexShrink: 0,
  },
};
