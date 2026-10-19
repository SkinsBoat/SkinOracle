import React from 'react';
import { Handshake, Layers } from 'lucide-react';
import type {
  NegotiationItem,
  NegotiationState,
} from '../../types/negotiation.types';
import type {
  NegotiationItemGroup,
  NegotiationTotals,
} from '../../utils/negotiationMath';
import { NegotiationItemRow } from './NegotiationItemRow';
import { StackedItemCard } from './StackedItemCard';

interface NegotiationBundleSectionProps {
  state: NegotiationState | null;
  totals: NegotiationTotals | null;
  actionableCount: number;
  stacked: boolean;
  stackDuplicates: boolean;
  groups: NegotiationItemGroup[];
  orderedItems: NegotiationItem[];
  expandedGroups: Set<string>;
  locked: boolean;
  onToggleStack: () => void;
  onToggleGroupExpanded: (key: string) => void;
  onSelectGroup: (group: NegotiationItemGroup) => void;
  onAcceptGroupCounters: (group: NegotiationItemGroup) => void;
  onDeclineGroupCounters: (group: NegotiationItemGroup) => void;
  onToggleItem: (itemId: string, selected: boolean) => void;
  onAcceptCounter: (itemId: string) => void;
  onDeclineCounter: (itemId: string) => void;
}

/** Left column: every audited listing, stacked when names repeat. */
export const NegotiationBundleSection: React.FC<
  NegotiationBundleSectionProps
> = ({
  state,
  totals,
  actionableCount,
  stacked,
  stackDuplicates,
  groups,
  orderedItems,
  expandedGroups,
  locked,
  onToggleStack,
  onToggleGroupExpanded,
  onSelectGroup,
  onAcceptGroupCounters,
  onDeclineGroupCounters,
  onToggleItem,
  onAcceptCounter,
  onDeclineCounter,
}) => (
  <section style={styles.leftColumn}>
    <div style={styles.sectionHeader}>
      <div>
        <h3 style={styles.sectionTitle}>Deal Bundle</h3>
        <p style={styles.sectionSubtitle}>
          {state?.items.length ?? 0} audited listings ·{' '}
          {totals?.itemCount ?? 0} included
          {actionableCount > 0 && (
            <span style={styles.actionCount}>
              {' '}· {actionableCount} awaiting action
            </span>
          )}
        </p>
      </div>
      <div style={styles.sectionHeaderActions}>
        {groups.some((group) => group.count > 1) && (
          <button
            type="button"
            onClick={onToggleStack}
            style={getStackToggleStyle(stackDuplicates)}
            title="Link identical listings so one action applies to the whole stack"
          >
            <Layers size={12} />
            <span>{stackDuplicates ? 'Stacked' : 'Stack'}</span>
          </button>
        )}
      </div>
    </div>

    <div style={styles.itemList}>
      {!state || state.items.length === 0 ? (
        <div style={styles.emptyState}>
          <Handshake size={30} style={styles.emptyIcon} />
          <h4 style={styles.emptyTitle}>No Bundle Items</h4>
          <p style={styles.emptyText}>
            Close the table and select at least one audited listing before
            hosting a live deal.
          </p>
        </div>
      ) : stacked ? (
        groups.map((group) => (
          <StackedItemCard
            key={group.key}
            group={group}
            discountPct={state.globalDiscountPct}
            locked={locked}
            expanded={expandedGroups.has(group.key)}
            onToggleExpand={() => onToggleGroupExpanded(group.key)}
            onSelectAll={() => onSelectGroup(group)}
            onAcceptAllCounters={() => onAcceptGroupCounters(group)}
            onDeclineAllCounters={() => onDeclineGroupCounters(group)}
            onToggleItem={onToggleItem}
            onAcceptCounter={onAcceptCounter}
            onDeclineCounter={onDeclineCounter}
          />
        ))
      ) : (
        orderedItems.map((item) => (
          <NegotiationItemRow
            key={item.id}
            item={item}
            discountPct={state.globalDiscountPct}
            locked={locked}
            onToggle={() => onToggleItem(item.id, !item.selected)}
            onAcceptCounter={() => onAcceptCounter(item.id)}
            onDeclineCounter={() => onDeclineCounter(item.id)}
          />
        ))
      )}
    </div>
  </section>
);

// ── EXTRACTED STYLES ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  leftColumn: {
    flex: '1 1 540px',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '10px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 800,
    color: '#f8fafc',
  },
  sectionSubtitle: {
    margin: '2px 0 0 0',
    fontSize: '11.5px',
    color: '#64748b',
    fontWeight: 600,
  },
  actionCount: {
    color: '#fbbf24',
    fontWeight: 800,
  },
  sectionHeaderActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    flexWrap: 'wrap',
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
    maxHeight: '430px',
    overflowY: 'auto',
    paddingRight: '2px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    padding: '36px 20px',
    borderRadius: '10px',
    border: '1px dashed #1e2430',
    backgroundColor: '#131720',
    textAlign: 'center',
  },
  emptyIcon: { color: '#475569' },
  emptyTitle: {
    margin: 0,
    fontSize: '13px',
    fontWeight: 800,
    color: '#e2e8f0',
  },
  emptyText: {
    margin: 0,
    maxWidth: '360px',
    fontSize: '11.5px',
    lineHeight: 1.45,
    color: '#64748b',
  },
};

function getStackToggleStyle(active: boolean): React.CSSProperties {
  return {
    height: '24px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '0 8px',
    borderRadius: '6px',
    backgroundColor: active
      ? 'rgba(56, 189, 248, 0.14)'
      : 'transparent',
    border: active
      ? '1px solid rgba(56, 189, 248, 0.4)'
      : '1px solid #2a3342',
    color: active ? '#38bdf8' : '#94a3b8',
    fontSize: '9.5px',
    fontWeight: 800,
    cursor: 'pointer',
  };
}
