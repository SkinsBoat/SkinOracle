import React from 'react';
import { Star, X } from 'lucide-react';
import { RaidBookmark } from '../../../../shared/types/raid.types';
import { MarketLogo } from '../../../components/MarketLogo';
import { bookmarkKey, getRaidMarketplaceName } from '../utils/raidUtils';

export interface RaidBookmarksProps {
  bookmarks: RaidBookmark[];
  activeKey: string | null;
  onSelect: (bookmark: RaidBookmark) => void;
  onRemove: (bookmark: RaidBookmark) => void;
}

/** Saved-seller rail for one-click rescanning. Renders nothing when empty. */
export const RaidBookmarks: React.FC<RaidBookmarksProps> = ({
  bookmarks,
  activeKey,
  onSelect,
  onRemove,
}) => {
  if (bookmarks.length === 0) return null;

  return (
    <div style={styles.rail}>
      <span style={styles.railLabel}>
        <Star size={12} style={styles.railIcon} />
        Saved Sellers
      </span>
      <div style={styles.chips}>
        {bookmarks.map((bookmark) => {
          const key = bookmarkKey(bookmark);
          const isActive = key === activeKey;
          return (
            <div
              key={key}
              style={getChipStyle(isActive)}
              title={`${bookmark.name} • ${getRaidMarketplaceName(bookmark.marketplace)}`}
            >
              <button
                type="button"
                onClick={() => onSelect(bookmark)}
                style={styles.chipMain}
              >
                <MarketLogo marketId={bookmark.marketplace} size={14} />
                <span style={styles.chipName}>{bookmark.name}</span>
              </button>
              <button
                type="button"
                onClick={() => onRemove(bookmark)}
                style={styles.chipRemove}
                title="Remove saved seller"
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  rail: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  railLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: 800,
    color: 'var(--so-text-muted, #94a3b8)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    whiteSpace: 'nowrap',
  },
  railIcon: { color: '#fbbf24' },
  chips: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    flexWrap: 'wrap',
  },
  chipMain: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 6px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    minWidth: 0,
  },
  chipName: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'inherit',
    maxWidth: '140px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  chipRemove: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--so-text-muted, #64748b)',
  },
};

function getChipStyle(isActive: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    borderRadius: '20px',
    paddingRight: '6px',
    backgroundColor: isActive
      ? 'rgba(56, 189, 248, 0.1)'
      : 'var(--so-surface-card, #131720)',
    border: isActive
      ? '1px solid rgba(56, 189, 248, 0.4)'
      : '1px solid var(--so-border-subtle, #1e2430)',
    color: isActive ? '#38bdf8' : 'var(--so-text-secondary, #94a3b8)',
    boxSizing: 'border-box',
  };
}
