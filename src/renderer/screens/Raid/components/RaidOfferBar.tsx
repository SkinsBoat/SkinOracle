import React from 'react';
import { FileDown, Handshake } from 'lucide-react';
import type { RaidOfferPayload } from '../../../../shared/types/raid.types';
import { formatUsd } from '../utils/raidUtils';

interface RaidOfferBarProps {
  offer: RaidOfferPayload | null;
  valuedItems: number;
  itemCount: number;
  selectedCount: number;
  hasSession: boolean;
  isExporting: boolean;
  onSelectAll: () => void;
  onClearAll: () => void;
  onStartLiveRoom: () => void;
  onExportOffer: () => void;
}

/**
 * Purchase offer summary and actions. Always visible so the export and live
 * room paths stay discoverable; disabled with a reason when nothing is eligible.
 */
export const RaidOfferBar: React.FC<RaidOfferBarProps> = ({
  offer,
  valuedItems,
  itemCount,
  selectedCount,
  hasSession,
  isExporting,
  onSelectAll,
  onClearAll,
  onStartLiveRoom,
  onExportOffer,
}) => {
  const offerItemCount = offer?.summary.itemCount ?? 0;
  const liveRoomDisabled = !hasSession && offerItemCount === 0;
  const exportDisabled = isExporting || offerItemCount === 0;

  return (
    <div style={styles.offerBar}>
      <span style={styles.offerInfo}>
        {offerItemCount > 0
          ? `${offerItemCount} of ${valuedItems} matched selected · ${formatUsd(
              offer?.summary.ceilingTotal,
            )} total offer.`
          : valuedItems > 0
            ? 'All matched listings are excluded from the offer — re-select any you want to include.'
            : itemCount === 0
              ? 'No auditable listings to offer on.'
              : 'No seller listings matched a local Buy Ceiling — recalculate accepted prices.'}
      </span>
      <div style={styles.offerActions}>
        {valuedItems > 0 && (
          <>
            <button
              type="button"
              onClick={onSelectAll}
              disabled={selectedCount >= valuedItems}
              style={getBulkBtnStyle(selectedCount >= valuedItems)}
              title="Include every matched listing in the offer"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={onClearAll}
              disabled={selectedCount === 0}
              style={getBulkBtnStyle(selectedCount === 0)}
              title="Unselect every matched listing, then click only the items you need"
            >
              Unselect All
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onStartLiveRoom}
          disabled={liveRoomDisabled}
          style={getLiveRoomBtnStyle(liveRoomDisabled)}
          title={
            hasSession
              ? 'Reopen the active live room without another charge'
              : 'Host a live P2P negotiation table ($0.20 per session)'
          }
        >
          <Handshake size={14} />
          <span>
            {hasSession ? 'Resume Live Room' : 'Start Live Room · $0.20'}
          </span>
        </button>
        <button
          type="button"
          onClick={onExportOffer}
          disabled={exportDisabled}
          style={getOfferBtnStyle(exportDisabled)}
          title="Export a PDF purchase offer for the selected listings"
        >
          <FileDown size={14} />
          <span>
            {isExporting
              ? 'Exporting…'
              : `Export Purchase Offer${
                  offerItemCount > 0 ? ` (${offerItemCount})` : ''
                }`}
          </span>
        </button>
      </div>
    </div>
  );
};

// ── EXTRACTED STYLES ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  offerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    padding: '10px 12px',
    borderRadius: '10px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
  },
  offerInfo: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--so-text-muted, #94a3b8)',
    lineHeight: 1.4,
    flex: 1,
    minWidth: '220px',
  },
  offerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  selectAllBtn: {
    height: '30px',
    padding: '0 10px',
    borderRadius: '7px',
    backgroundColor: 'transparent',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-secondary, #94a3b8)',
    fontSize: '11.5px',
    fontWeight: 700,
    cursor: 'pointer',
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
  },
};

function getBulkBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    ...styles.selectAllBtn,
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function getLiveRoomBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    height: '34px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '0 14px',
    borderRadius: '8px',
    backgroundColor: disabled ? 'rgba(22, 163, 74, 0.35)' : '#16a34a',
    border: 'none',
    color: disabled ? 'rgba(255, 255, 255, 0.6)' : '#ffffff',
    fontSize: '12.5px',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    boxShadow: disabled ? 'none' : '0 3px 10px rgba(22, 163, 74, 0.28)',
  };
}

function getOfferBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    height: '34px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '0 14px',
    borderRadius: '8px',
    backgroundColor: disabled ? 'rgba(37, 99, 235, 0.35)' : '#2563eb',
    border: 'none',
    color: disabled ? 'rgba(255, 255, 255, 0.6)' : '#ffffff',
    fontSize: '12.5px',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    boxShadow: disabled ? 'none' : '0 3px 10px rgba(37, 99, 235, 0.28)',
  };
}
