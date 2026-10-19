import React from 'react';
import {
  AlertTriangle,
  CheckSquare,
  Crosshair,
  Gavel,
  MinusCircle,
  ShieldCheck,
  Square,
  TrendingUp,
} from 'lucide-react';
import { RaidAuditRow } from '../../../../shared/types/raid.types';
import { SkinImage } from '../../../components/SkinImage';
import { CopyMarketHashButton } from '../../../components/CopyMarketHashButton';
import TrendSparkline from '../../../components/TrendSparkline';
import {
  formatPercent,
  formatSignedUsd,
  formatUsd,
} from '../utils/raidUtils';
import {
  getWearColors,
  parseSkinHashName,
} from '../../DealMaker/utils/skinCardUtils';

export interface RaidItemCardProps {
  row: RaidAuditRow;
  isSelected: boolean;
  onToggleSelected: (row: RaidAuditRow) => void;
}

/** One audited seller listing, scored against the trader's Buy Ceiling. */
export const RaidItemCard: React.FC<RaidItemCardProps> = ({
  row,
  isSelected,
  onToggleSelected,
}) => {
  const { item, ceiling, spread, profitPercent, status } = row;
  const parsed = parseSkinHashName(item.marketHashName, item.exterior);
  const wearColors = getWearColors(parsed.shortWear);
  const isRaid = status === 'raid';
  const hasCeiling = typeof ceiling === 'number';
  const isExcluded = hasCeiling && !isSelected;

  const handleCardClick = () => {
    if (hasCeiling) onToggleSelected(row);
  };

  return (
    <div
      style={getCardStyle(isRaid, isExcluded, hasCeiling)}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (!hasCeiling) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleSelected(row);
        }
      }}
      role={hasCeiling ? 'button' : undefined}
      tabIndex={hasCeiling ? 0 : -1}
      aria-pressed={hasCeiling ? isSelected : undefined}
      title={
        hasCeiling
          ? isSelected
            ? 'Selected for the offer — click to exclude'
            : 'Excluded from the offer — click to include'
          : undefined
      }
    >
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          {hasCeiling && (
            <span style={getSelectBtnStyle(isSelected)} aria-hidden="true">
              {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            </span>
          )}
          <div style={getStatusBadgeStyle(status)}>
            {status === 'raid' && <Crosshair size={11} />}
            {status === 'over-ceiling' && <AlertTriangle size={11} />}
            {status === 'no-ceiling' && <MinusCircle size={11} />}
            <span>{isRaid ? 'RAID' : status === 'over-ceiling' ? 'OVER' : 'NO CEILING'}</span>
          </div>

          {row.offerEligible && (
            <span
              style={styles.offerBadge}
              title={`Seller's accepted offer ${formatUsd(item.minOfferPrice)} is at or below your Buy Ceiling`}
            >
              <Gavel size={10} />
              <span>OFFER</span>
            </span>
          )}
        </div>

        <div style={styles.headerRight}>
          {parsed.shortWear && (
            <span style={getWearBadgeStyle(wearColors)}>{parsed.shortWear}</span>
          )}
          <span
            style={styles.noPropagation}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <CopyMarketHashButton name={item.marketHashName} />
          </span>
        </div>
      </div>

      <div style={styles.heroShowcase}>
        {parsed.isStatTrak && <span style={styles.statTrakBadge}>ST™</span>}
        {parsed.isSouvenir && <span style={styles.souvenirBadge}>SV</span>}
        {item.rarityColor && (
          <span
            style={getRarityBarStyle(item.rarityColor)}
            title={item.rarity}
          />
        )}
        <SkinImage
          src={item.imageUrl}
          alt={item.marketHashName}
          fallbackItemName={item.marketHashName}
          height={104}
          maxImageHeight={94}
        />
        {typeof item.floatValue === 'number' && (
          <span style={styles.floatPill}>
            Float: {item.floatValue.toFixed(4)}
          </span>
        )}
      </div>

      <div style={styles.titleSection} title={item.marketHashName}>
        <span style={styles.weaponName}>{parsed.weapon}</span>
        {parsed.pattern ? (
          <span style={styles.patternName}>{parsed.pattern}</span>
        ) : (
          <span style={styles.patternPlaceholder}>&nbsp;</span>
        )}
        {item.collection && (
          <div style={styles.marketRow}>
            <span style={styles.collectionText} title={item.collection}>
              {item.collection}
            </span>
          </div>
        )}
      </div>

      <div style={styles.trendRow}>
        <TrendSparkline name={item.marketHashName} height={32} width="100%" />
      </div>

      <div style={styles.pricingContainer}>
        <div style={styles.priceCol}>
          <span style={styles.colLabel}>Seller Price</span>
          <span style={styles.priceAmount}>{formatUsd(item.price)}</span>
        </div>
        <div style={styles.ceilingCol}>
          <span style={styles.ceilingLabel}>
            <ShieldCheck size={11} style={{ color: '#38bdf8' }} />
            Buy Ceiling
          </span>
          <span style={styles.ceilingAmount}>
            {hasCeiling ? formatUsd(ceiling) : 'Not calculated'}
          </span>
        </div>
      </div>

      <div style={styles.actionZone}>
        {hasCeiling ? (
          <div style={getSpreadRowStyle(isRaid)}>
            <span style={styles.spreadLabel}>
              {isRaid ? 'Below Ceiling' : 'Above Ceiling'}
            </span>
            <span style={styles.spreadValue}>
              <TrendingUp size={12} />
              {formatSignedUsd(spread)} ({formatPercent(profitPercent)})
            </span>
          </div>
        ) : (
          <div style={styles.spreadRowMuted}>
            No local Buy Ceiling — calculate accepted prices to score this item.
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    minWidth: 0,
  },
  offerBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '9.5px',
    fontWeight: 900,
    letterSpacing: '0.4px',
    padding: '3px 7px',
    borderRadius: '5px',
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    border: '1px solid rgba(56, 189, 248, 0.45)',
    color: '#38bdf8',
    whiteSpace: 'nowrap',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  noPropagation: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  heroShowcase: {
    position: 'relative',
    height: '112px',
    width: '100%',
    borderRadius: '8px',
    background:
      'radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.08) 0%, rgba(13, 17, 23, 0.85) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  statTrakBadge: {
    position: 'absolute',
    top: '6px',
    left: '7px',
    zIndex: 2,
    fontSize: '9.5px',
    fontWeight: 900,
    padding: '1px 5px',
    borderRadius: '3px',
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    color: '#f97316',
    border: '1px solid rgba(249, 115, 22, 0.45)',
  },
  souvenirBadge: {
    position: 'absolute',
    top: '6px',
    left: '36px',
    zIndex: 2,
    fontSize: '9.5px',
    fontWeight: 900,
    padding: '1px 5px',
    borderRadius: '3px',
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    color: '#eab308',
    border: '1px solid rgba(234, 179, 8, 0.45)',
  },
  floatPill: {
    position: 'absolute',
    bottom: '6px',
    left: '7px',
    zIndex: 2,
    fontSize: '9.5px',
    fontWeight: 700,
    fontFamily: 'monospace',
    padding: '1px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(9, 13, 20, 0.85)',
    color: '#94a3b8',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    minHeight: '52px',
  },
  weaponName: {
    fontSize: '13.5px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
    letterSpacing: '-0.2px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  patternName: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--so-text-secondary, #94a3b8)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  patternPlaceholder: { fontSize: '12px', lineHeight: '15px' },
  marketRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginTop: '2px',
  },
  collectionText: {
    fontSize: '10.5px',
    color: 'var(--so-text-muted, #64748b)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  trendRow: {
    width: '100%',
  },
  pricingContainer: {
    display: 'flex',
    gap: '8px',
    padding: '9px 10px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-surface-input, #0d1117)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    boxSizing: 'border-box',
  },
  priceCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  ceilingCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    paddingLeft: '10px',
  },
  colLabel: {
    fontSize: '9.5px',
    fontWeight: 800,
    color: 'var(--so-text-muted, #64748b)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  ceilingLabel: {
    fontSize: '9.5px',
    fontWeight: 800,
    color: '#38bdf8',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  priceAmount: {
    fontSize: '16px',
    fontWeight: 900,
    color: 'var(--so-text-primary, #f8fafc)',
    letterSpacing: '-0.3px',
  },
  ceilingAmount: {
    fontSize: '16px',
    fontWeight: 900,
    color: 'var(--so-text-primary, #f8fafc)',
    letterSpacing: '-0.3px',
  },
  actionZone: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: 'auto',
  },
  spreadRowMuted: {
    fontSize: '10.5px',
    color: 'var(--so-text-muted, #64748b)',
    padding: '6px 8px',
    borderRadius: '6px',
    backgroundColor: 'rgba(148, 163, 184, 0.06)',
    border: '1px solid rgba(148, 163, 184, 0.15)',
    lineHeight: 1.35,
  },
  spreadLabel: {
    fontSize: '10px',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    opacity: 0.85,
  },
  spreadValue: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12.5px',
    fontWeight: 800,
  },
};

function getCardStyle(
  isRaid: boolean,
  isExcluded: boolean,
  selectable: boolean,
): React.CSSProperties {
  return {
    backgroundColor: 'var(--so-surface-card, #131720)',
    borderRadius: '12px',
    border: isExcluded
      ? '1px dashed var(--so-border-subtle, #1e2430)'
      : isRaid
        ? '1px solid rgba(34, 197, 94, 0.4)'
        : '1px solid var(--so-border-subtle, #1e2430)',
    boxShadow: !isExcluded && isRaid ? '0 2px 14px rgba(34, 197, 94, 0.12)' : 'none',
    opacity: isExcluded ? 0.55 : 1,
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    height: '100%',
    boxSizing: 'border-box',
    cursor: selectable ? 'pointer' : 'default',
    transition: 'opacity 0.15s ease, border-color 0.15s ease',
  };
}

function getSelectBtnStyle(isSelected: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    padding: 0,
    background: 'transparent',
    border: 'none',
    flexShrink: 0,
    cursor: 'inherit',
    color: isSelected ? '#4ade80' : 'var(--so-text-muted, #64748b)',
  };
}

function getStatusBadgeStyle(
  status: RaidAuditRow['status'],
): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '10px',
    fontWeight: 900,
    letterSpacing: '0.4px',
    padding: '3px 8px',
    borderRadius: '5px',
    textTransform: 'uppercase',
  };
  if (status === 'raid') {
    return {
      ...base,
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      border: '1px solid rgba(34, 197, 94, 0.45)',
      color: '#4ade80',
    };
  }
  if (status === 'over-ceiling') {
    return {
      ...base,
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      border: '1px solid rgba(239, 68, 68, 0.35)',
      color: '#f87171',
    };
  }
  return {
    ...base,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    border: '1px solid rgba(148, 163, 184, 0.25)',
    color: '#94a3b8',
  };
}

function getWearBadgeStyle(colors: {
  bg: string;
  text: string;
  border: string;
}): React.CSSProperties {
  return {
    fontSize: '9.5px',
    fontWeight: 900,
    padding: '1px 5px',
    borderRadius: '3px',
    backgroundColor: colors.bg,
    color: colors.text,
    border: `1px solid ${colors.border}`,
  };
}

function getRarityBarStyle(color: string): React.CSSProperties {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    backgroundColor: color,
    zIndex: 2,
  };
}

function getSpreadRowStyle(isRaid: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '6px 9px',
    borderRadius: '6px',
    backgroundColor: isRaid
      ? 'rgba(34, 197, 94, 0.08)'
      : 'rgba(239, 68, 68, 0.08)',
    border: isRaid
      ? '1px solid rgba(34, 197, 94, 0.25)'
      : '1px solid rgba(239, 68, 68, 0.22)',
    color: isRaid ? '#4ade80' : '#f87171',
  };
}
