import React from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Handshake,
  Layers,
  XCircle,
} from 'lucide-react';
import type { NegotiationItemGroup } from '../../utils/negotiationMath';
import { getEffectiveOfferPrice } from '../../utils/negotiationMath';
import { formatUsd } from '../../utils/raidUtils';
import { NegotiationItemRow } from './NegotiationItemRow';

interface StackedItemCardProps {
  group: NegotiationItemGroup;
  discountPct: number;
  locked: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onSelectAll: () => void;
  onAcceptAllCounters: () => void;
  onDeclineAllCounters: () => void;
  onToggleItem: (itemId: string, selected: boolean) => void;
  onAcceptCounter: (itemId: string) => void;
  onDeclineCounter: (itemId: string) => void;
}

/**
 * Identical listings collapsed into one stack. Bulk actions apply to every
 * listing in the group; expanding reveals each line for individual triage.
 */
export const StackedItemCard: React.FC<StackedItemCardProps> = ({
  group,
  discountPct,
  locked,
  expanded,
  onToggleExpand,
  onSelectAll,
  onAcceptAllCounters,
  onDeclineAllCounters,
  onToggleItem,
  onAcceptCounter,
  onDeclineCounter,
}) => {
  const first = group.items[0];
  const effectiveTotal = Math.round(
    group.items.reduce(
      (sum, item) => sum + getEffectiveOfferPrice(item, discountPct),
      0,
    ) * 100,
  ) / 100;
  const acceptedCount = group.items.filter(
    (item) => item.status === 'accepted',
  ).length;

  return (
    <div style={getStackCardStyle(group.someSelected)}>
      <div style={styles.stackHeader}>
        <input
          type="checkbox"
          checked={group.allSelected}
          ref={(element) => {
            if (element) {
              element.indeterminate = group.someSelected;
            }
          }}
          onChange={onSelectAll}
          disabled={locked}
          aria-label={`Include all ${group.name}`}
          style={styles.itemCheckbox}
        />

        <div style={styles.stackThumb}>
          {first?.imageUrl ? (
            <img
              src={first.imageUrl}
              alt=""
              style={styles.stackImage}
              loading="lazy"
            />
          ) : (
            <div style={styles.itemImageFallback}>
              <Handshake size={16} style={styles.itemImageFallbackIcon} />
            </div>
          )}
          <span style={styles.stackCount}>×{group.count}</span>
        </div>

        <div
          style={styles.stackMain}
          onClick={onSelectAll}
          role="button"
          title="Select or unselect every listing in this stack"
        >
          <div style={styles.itemNameRow}>
            <span style={styles.itemName}>{group.name}</span>
            <span style={styles.stackBadge}>
              <Layers size={9} /> STACK
            </span>
            {acceptedCount > 0 && (
              <span style={styles.itemStatusAccepted}>
                {acceptedCount === group.count
                  ? 'ACCEPTED'
                  : `${acceptedCount}/${group.count} ACCEPTED`}
              </span>
            )}
            {!group.allSelected && !group.someSelected && (
              <span style={styles.itemStatusRejected}>EXCLUDED</span>
            )}
            {group.counterCount > 0 && (
              <span style={styles.itemStatusAction}>
                <AlertTriangle size={9} />
                ACTION
              </span>
            )}
          </div>
          <div style={styles.itemMeta}>
            {group.exterior && <span>{group.exterior}</span>}
            {group.floatMin !== undefined && (
              <span>
                Float{' '}
                {group.floatMin === group.floatMax
                  ? group.floatMin.toFixed(6)
                  : `${group.floatMin.toFixed(4)}–${(
                      group.floatMax ?? group.floatMin
                    ).toFixed(4)}`}
              </span>
            )}
            <span>{group.selectedCount}/{group.count} linked</span>
          </div>
          <div style={styles.itemPrices}>
            <span style={styles.itemPriceBase}>
              Base {formatUsd(group.totalListing)}
            </span>
            <span style={styles.itemPriceOffer}>
              Offer {formatUsd(effectiveTotal)}
            </span>
            {group.counterCount > 0 && (
              <span style={styles.itemPriceCounter}>
                {group.counterCount} counter
                {group.counterCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        <div style={styles.stackActions}>
          {group.counterCount > 0 && !locked && (
            <div style={styles.counterActions}>
              <button
                type="button"
                onClick={onAcceptAllCounters}
                style={styles.counterAcceptBtn}
                title="Accept every counter in this stack"
              >
                <Check size={12} />
                <span>Accept all</span>
              </button>
              <button
                type="button"
                onClick={onDeclineAllCounters}
                style={styles.counterDeclineBtn}
                title="Decline every counter in this stack"
              >
                <XCircle size={12} />
                <span>Decline all</span>
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleExpand}
            style={styles.stackExpandBtn}
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )}
            <span>{group.count} listings</span>
          </button>
        </div>
      </div>

      {expanded && (
        <div style={styles.stackChildren}>
          {group.items.map((item) => (
            <NegotiationItemRow
              key={item.id}
              item={item}
              discountPct={discountPct}
              locked={locked}
              nested
              onToggle={() => onToggleItem(item.id, !item.selected)}
              onAcceptCounter={() => onAcceptCounter(item.id)}
              onDeclineCounter={() => onDeclineCounter(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── EXTRACTED STYLES ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  stackCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0px',
    padding: '9px',
    borderRadius: '10px',
    backgroundColor: '#131720',
    border: '1px solid #1e2430',
  },
  stackHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    minWidth: 0,
  },
  stackThumb: {
    position: 'relative',
    width: '48px',
    height: '36px',
    flexShrink: 0,
  },
  stackImage: {
    width: '48px',
    height: '36px',
    objectFit: 'contain',
    borderRadius: '6px',
    backgroundColor: '#0d1117',
  },
  stackCount: {
    position: 'absolute',
    right: '-5px',
    bottom: '-5px',
    minWidth: '19px',
    height: '17px',
    padding: '0 4px',
    borderRadius: '9px',
    backgroundColor: '#2563eb',
    border: '1px solid #0b0f14',
    color: '#ffffff',
    fontSize: '9px',
    fontWeight: 900,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '8px',
    fontWeight: 900,
    letterSpacing: '0.3px',
    padding: '2px 5px',
    borderRadius: '3px',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.32)',
    color: '#38bdf8',
  },
  stackActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '5px',
    flexShrink: 0,
  },
  stackExpandBtn: {
    height: '24px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '0 7px',
    borderRadius: '6px',
    backgroundColor: '#0d1117',
    border: '1px solid #2a3342',
    color: '#94a3b8',
    fontSize: '9.5px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  stackChildren: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '8px',
    paddingTop: '8px',
    paddingLeft: '9px',
    borderTop: '1px solid #1e2430',
    borderLeft: '1px solid #1e2430',
  },
  stackMain: {
    flex: 1,
    minWidth: 0,
    cursor: 'pointer',
  },
  itemCheckbox: {
    width: '15px',
    height: '15px',
    accentColor: '#22c55e',
    cursor: 'pointer',
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

function getStackCardStyle(partial: boolean): React.CSSProperties {
  return {
    ...styles.stackCard,
    borderColor: partial ? 'rgba(245, 158, 11, 0.4)' : '#1e2430',
  };
}
