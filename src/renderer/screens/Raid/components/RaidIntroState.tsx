import React from 'react';
import { Radar } from 'lucide-react';

/** First-run guidance shown before a storefront is scanned. */
export const RaidIntroState: React.FC = () => (
  <div style={styles.introState}>
    <Radar size={40} style={styles.emptyIcon} />
    <h3 style={styles.emptyTitle}>Lock Onto A Seller</h3>
    <p style={styles.emptySubtitle}>
      Paste a seller's storefront link to value their entire stock and flag
      every listing priced below your Buy Ceilings.
    </p>
    <div style={styles.steps}>
      <Step
        index={1}
        title="Paste the storefront"
        text="Skinport shops, CSFloat stalls, DMarket stores and Steam inventories are live. CS.MONEY links are recognized next."
      />
      <Step
        index={2}
        title="We stream the stock"
        text="Every listing is fetched directly from your machine and priced in USD."
      />
      <Step
        index={3}
        title="RAID the zone"
        text="Items at or below your Oracle Buy Ceilings light up green with dollar spreads and profit percentages."
      />
    </div>
  </div>
);

const Step: React.FC<{ index: number; title: string; text: string }> = ({
  index,
  title,
  text,
}) => (
  <div style={styles.step}>
    <span style={styles.stepIndex}>{index}</span>
    <div style={styles.stepTextGroup}>
      <span style={styles.stepTitle}>{title}</span>
      <span style={styles.stepText}>{text}</span>
    </div>
  </div>
);

// ── EXTRACTED STYLES ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  introState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '44px 20px',
    borderRadius: '12px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px dashed var(--so-border-subtle, #1e2430)',
    textAlign: 'center',
    gap: '12px',
  },
  emptyIcon: { color: 'var(--so-text-muted, #475569)' },
  emptyTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
  },
  emptySubtitle: {
    margin: 0,
    maxWidth: '480px',
    fontSize: '13px',
    color: 'var(--so-text-muted, #64748b)',
    lineHeight: 1.45,
  },
  steps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: '12px',
    width: '100%',
    maxWidth: '900px',
    marginTop: '8px',
  },
  step: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px',
    borderRadius: '10px',
    backgroundColor: 'var(--so-surface-input, #0d1117)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    textAlign: 'left',
  },
  stepIndex: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    border: '1px solid rgba(34, 197, 94, 0.4)',
    color: '#4ade80',
    fontSize: '11px',
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  stepTitle: {
    fontSize: '12.5px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
  },
  stepText: {
    fontSize: '11.5px',
    color: 'var(--so-text-muted, #94a3b8)',
    lineHeight: 1.4,
  },
};
