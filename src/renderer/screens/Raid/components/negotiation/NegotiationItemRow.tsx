import React from 'react';
import {
  AlertTriangle,
  Check,
  Handshake,
  XCircle,
} from 'lucide-react';
import type { NegotiationItem } from '../../types/negotiation.types';
import { getEffectiveOfferPrice } from '../../utils/negotiationMath';
import { formatUsd } from '../../utils/raidUtils';

interface NegotiationItemRowProps {
  item: NegotiationItem;
  discountPct: number;
  locked: boolean;
  nested?: boolean;
  onToggle: () => void;
  onAcceptCounter: () => void;
  onDeclineCounter: () => void;
}

/** One listing inside the bundle, with counter-offer triage actions. */
export const NegotiationItemRow: React.FC<NegotiationItemRowProps> = ({
  item,
  discountPct,
  locked,
  nested = false,
  onToggle,
  onAcceptCounter,
  onDeclineCounter,
}) => {
  const effectivePrice = getEffectiveOfferPrice(item, discountPct);
  const hasCounter = typeof item.counterPrice === 'number';

  return (
    <div style={getItemRowStyle(item.selected, nested)}>
      <input
        type="checkbox"
        checked={item.selected}
        onChange={onToggle}
        disabled={locked}
        aria-label={`Include ${item.marketHashName}`}
        style={styles.itemCheckbox}
      />

      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          style={styles.itemImage}
          loading="lazy"
        />
      ) : (
        <div style={styles.itemImageFallback}>
          <Handshake size={16} style={styles.itemImageFallbackIcon} />
        </div>
      )}

      <div style={styles.itemMain}>
        <div style={styles.itemNameRow}>
          <span style={styles.itemName}>{item.marketHashName}</span>
          {item.status === 'accepted' && (
            <span style={styles.itemStatusAccepted}>ACCEPTED</span>
          )}
          {item.status === 'rejected' && (
            <span style={styles.itemStatusRejected}>EXCLUDED</span>
          )}
          {hasCounter && (
            <span style={styles.itemStatusAction}>
              <AlertTriangle size={9} />
              ACTION
            </span>
          )}
        </div>
        <div style={styles.itemMeta}>
          {item.exterior && <span>{item.exterior}</span>}
          {typeof item.floatValue === 'number' && (
            <span>Float {item.floatValue.toFixed(6)}</span>
          )}
        </div>
        <div style={styles.itemPrices}>
          <span style={styles.itemPriceBase}>
            Base {formatUsd(item.listingPrice)}
          </span>
          <span style={styles.itemPriceOffer}>
            Offer {formatUsd(effectivePrice)}
          </span>
          {hasCounter && (
            <span style={styles.itemPriceCounter}>
              Counter {formatUsd(item.counterPrice)}
            </span>
          )}
        </div>
      </div>

      {hasCounter && !locked && (
        <div style={styles.counterActions}>
          <button
            type="button"
            onClick={onAcceptCounter}
            style={styles.counterAcceptBtn}
            title="Accept the seller's counter-offer"
          >
            <Check size={12} />
            <span>Accept</span>
          </button>
          <button
            type="button"
            onClick={onDeclineCounter}
            style={styles.counterDeclineBtn}
            title="Decline the counter and keep the original offer"
          >
            <XCircle size={12} />
            <span>Decline</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ── EXTRACTED STYLES ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    borderRadius: '10px',
    backgroundColor: '#131720',
    border: '1px solid #1e2430',
  },
  itemRowNested: {
    padding: '7px',
    backgroundColor: '#0f141c',
    borderRadius: '8px',
  },
  itemCheckbox: {
    width: '15px',
    height: '15px',
    accentColor: '#22c55e',
    cursor: 'pointer',
    flexShrink: 0,
  },
  itemImage: {
    width: '48px',
    height: '36px',
    objectFit: 'contain',
    borderRadius: '6px',
    backgroundColor: '#0d1117',
    flexShrink: 0,
  },
  itemImageFallback: {
    width: '48px',
    height: '36px',
    borderRadius: '6px',
    backgroundColor: '#0d1117',
    border: '1px solid #1e2430',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemImageFallbackIcon: { color: '#475569' },
  itemMain: { flex: 1, minWidth: 0 },
  itemNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    flexWrap: 'wrap',
  },
  itemName: {
    fontSize: '12.5px',
    fontWeight: 700,
    color: '#e2e8f0',
    lineHeight: 1.35,
    wordBreak: 'break-word',
  },
  itemStatusAccepted: {
    fontSize: '8px',
    fontWeight: 900,
    letterSpacing: '0.4px',
    padding: '2px 5px',
    borderRadius: '3px',
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
    border: '1px solid rgba(34, 197, 94, 0.4)',
    color: '#4ade80',
  },
  itemStatusRejected: {
    fontSize: '8px',
    fontWeight: 900,
    letterSpacing: '0.4px',
    padding: '2px 5px',
    borderRadius: '3px',
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    color: '#94a3b8',
  },
  itemStatusAction: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '8px',
    fontWeight: 900,
    letterSpacing: '0.4px',
    padding: '2px 5px',
    borderRadius: '3px',
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    border: '1px solid rgba(245, 158, 11, 0.45)',
    color: '#fbbf24',
  },
  itemMeta: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '2px',
    fontSize: '10.5px',
    fontWeight: 600,
    color: '#64748b',
  },
  itemPrices: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '4px',
    fontSize: '11px',
    fontWeight: 700,
  },
  itemPriceBase: { color: '#94a3b8' },
  itemPriceOffer: { color: '#38bdf8' },
  itemPriceCounter: { color: '#fbbf24' },
  counterActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    flexShrink: 0,
  },
  counterAcceptBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    height: '25px',
    padding: '0 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    border: '1px solid rgba(34, 197, 94, 0.4)',
    color: '#4ade80',
    fontSize: '10px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  counterDeclineBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    height: '25px',
    padding: '0 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.32)',
    color: '#f87171',
    fontSize: '10px',
    fontWeight: 800,
    cursor: 'pointer',
  },
};

function getItemRowStyle(
  selected: boolean,
  nested: boolean = false,
): React.CSSProperties {
  return {
    ...styles.itemRow,
    ...(nested ? styles.itemRowNested : {}),
    opacity: selected ? 1 : 0.52,
    borderColor: selected ? '#243044' : '#1e2430',
    cursor: 'default',
  };
}
