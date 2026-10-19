import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { RaidAuditRow, RaidSeller } from '../../../../shared/types/raid.types';
import type { WebRtcSessionInitResult } from '../../../../shared/types/webrtc.types';
import type { DealExportPayload } from '../../../../shared/types/dealExport.types';
import { useRaidPeerHost } from '../hooks/useRaidPeerHost';
import type { NegotiationItemGroup } from '../utils/negotiationMath';
import {
  getNegotiationTotals,
  groupNegotiationItems,
  sortNegotiationItemsByAction,
} from '../utils/negotiationMath';
import { NegotiationBanners } from './negotiation/NegotiationBanners';
import { NegotiationBundleSection } from './negotiation/NegotiationBundleSection';
import { BundleEconomicsCard } from './negotiation/BundleEconomicsCard';
import { BundleAdjustmentCard } from './negotiation/BundleAdjustmentCard';
import { AgreementCard } from './negotiation/AgreementCard';
import { ActivityFeedCard } from './negotiation/ActivityFeedCard';
import { NegotiationFooter } from './negotiation/NegotiationFooter';
import { NegotiationModalHeader } from './negotiation/NegotiationModalHeader';

interface RaidNegotiationModalProps {
  seller: RaidSeller | null;
  rows: RaidAuditRow[];
  /** Stable retry key for the paid session request. */
  sessionIdempotencyKey: string;
  isOpen: boolean;
  onClose: () => void;
  onEndSession: () => void;
  onTopUp?: () => void;
}

/**
 * StrictMode remounts the modal effect in dev. Reuse the in-flight paid
 * session promise for the same idempotency key so the backend never sees two
 * concurrent session-init calls from one click.
 */
const inFlightSessionInits = new Map<
  string,
  Promise<WebRtcSessionInitResult>
>();
const SESSION_INIT_MEMORY_MS = 15_000;

/**
 * Live P2P negotiation war room. The desktop app is the state authority; the
 * share link carries only the room id and the short-lived guest token.
 *
 * This component owns session orchestration and transient UI state. Rendering
 * is delegated to focused subcomponents under `./negotiation/`.
 */
export const RaidNegotiationModal: React.FC<RaidNegotiationModalProps> = ({
  seller,
  rows,
  sessionIdempotencyKey,
  isOpen,
  onClose,
  onEndSession,
  onTopUp,
}) => {
  const initSession = useCallback(
    (itemCount: number): Promise<WebRtcSessionInitResult> => {
      const api = (window as any).electronAPI?.webrtc?.createSession;
      if (typeof api !== 'function') {
        return Promise.resolve({
          success: false,
          code: 'IPC_UNAVAILABLE',
          message:
            'Live billing bridge is not loaded. Restart the desktop app and try again.',
        });
      }

      const existing = inFlightSessionInits.get(sessionIdempotencyKey);
      if (existing) return existing;

      const request = Promise.resolve(
        api(sessionIdempotencyKey, itemCount),
      ).finally(() => {
        window.setTimeout(() => {
          if (inFlightSessionInits.get(sessionIdempotencyKey) === request) {
            inFlightSessionInits.delete(sessionIdempotencyKey);
          }
        }, SESSION_INIT_MEMORY_MS);
      });
      inFlightSessionInits.set(sessionIdempotencyKey, request);
      return request;
    },
    [sessionIdempotencyKey],
  );

  const session = useRaidPeerHost({ seller, rows, initSession });

  const [isExportingDeal, setIsExportingDeal] = useState(false);
  const [stackDuplicates, setStackDuplicates] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(),
  );
  const autoCopiedRef = useRef(false);

  const state = session.state;
  const totals = useMemo(
    () => (state ? getNegotiationTotals(state) : null),
    [state],
  );
  const orderedItems = useMemo(
    () => (state ? sortNegotiationItemsByAction(state.items) : []),
    [state?.items],
  );
  const groups = useMemo(
    () => groupNegotiationItems(orderedItems),
    [orderedItems],
  );

  const actionableCount = state
    ? state.items.filter(
        (item) => typeof item.counterPrice === 'number',
      ).length
    : 0;
  const hasDuplicates = groups.some((group) => group.count > 1);
  const stacked = stackDuplicates && hasDuplicates;
  const locked = state?.dealLocked === true;
  const chatEnabled =
    session.transportMode === 'p2p' && session.guestConnected;

  const toggleGroupExpanded = (key: string) => {
    setExpandedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const copyShareLink = useCallback(
    async (silent = false) => {
      if (!session.shareUrl) {
        if (!silent) toast.error('Deal link is not ready yet.');
        return;
      }
      try {
        await navigator.clipboard.writeText(session.shareUrl);
        toast.success('Live deal link copied to clipboard.');
      } catch {
        toast.error(
          'Clipboard unavailable — select the link field below to copy it.',
        );
      }
    },
    [session.shareUrl],
  );

  const handleExportDeal = async () => {
    if (!state?.dealLocked || isExportingDeal) return;
    setIsExportingDeal(true);
    try {
      const payload: DealExportPayload = {
        roomId: state.roomId,
        marketplace: state.marketplace,
        sellerHandle: state.sellerHandle,
        items: state.items.map((item) => ({
          marketHashName: item.marketHashName,
          exterior: item.exterior,
          floatValue: item.floatValue,
          listingPrice: item.listingPrice,
          proposedPrice: item.proposedPrice,
          counterPrice: item.counterPrice,
          selected: item.selected,
          status: item.status,
        })),
        globalDiscountPct: state.globalDiscountPct,
        traderReady: state.traderReady,
        sellerReady: state.sellerReady,
        dealLocked: state.dealLocked,
        exportedAt: new Date().toISOString(),
      };
      const result =
        await window.electronAPI.raid.exportNegotiationDeal(payload);
      if (result?.canceled) return;
      toast.success(
        result?.filePath
          ? `Deal exported to ${result.filePath}`
          : 'Deal PDF exported.',
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Deal PDF export failed.',
      );
    } finally {
      setIsExportingDeal(false);
    }
  };

  const handleRetrySignaling = useCallback(() => {
    autoCopiedRef.current = false;
    session.stop();
    session.start();
  }, [session]);

  const handleToggleItem = useCallback(
    (itemId: string, selected: boolean) => {
      session.toggleItem(itemId, selected);
    },
    [session],
  );

  const handleAcceptCounter = useCallback(
    (itemId: string) => {
      session.acceptCounter(itemId);
      toast.success('Counter-offer accepted.');
    },
    [session],
  );

  const handleDeclineCounter = useCallback(
    (itemId: string) => {
      session.declineCounter(itemId);
      toast('Counter-offer declined.');
    },
    [session],
  );

  const handleSelectGroup = useCallback(
    (group: NegotiationItemGroup) => {
      session.setItemsSelected(
        group.items.map((item) => item.id),
        !group.allSelected,
      );
    },
    [session],
  );

  const handleAcceptGroupCounters = useCallback(
    (group: NegotiationItemGroup) => {
      session.acceptCounters(group.items.map((item) => item.id));
      toast.success('Stack counter-offers accepted.');
    },
    [session],
  );

  const handleDeclineGroupCounters = useCallback(
    (group: NegotiationItemGroup) => {
      session.declineCounters(group.items.map((item) => item.id));
      toast('Stack counter-offers declined.');
    },
    [session],
  );

  useEffect(() => {
    if (!session.shareUrl || !session.linkReady) {
      if (!session.shareUrl) autoCopiedRef.current = false;
      return;
    }
    if (autoCopiedRef.current) return;
    autoCopiedRef.current = true;
    void copyShareLink(true);
  }, [copyShareLink, session.linkReady, session.shareUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Live Negotiation Table"
        style={styles.panel}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <NegotiationModalHeader
          seller={seller}
          roomId={session.roomId}
          status={session.status}
          transportMode={session.transportMode}
          peerRegistered={session.peerRegistered}
          latencyMs={session.latencyMs}
          linkReady={session.linkReady}
          onRetry={handleRetrySignaling}
          onCopy={() => copyShareLink(false)}
          onClose={onClose}
        />

        <NegotiationBanners
          error={session.error}
          billingError={session.billingError}
          transportMode={session.transportMode}
          peerRegistered={session.peerRegistered}
          status={session.status}
          dealLocked={locked}
          isExportingDeal={isExportingDeal}
          onExportDeal={handleExportDeal}
          onTopUp={onTopUp}
          onClose={onClose}
        />

        <div style={styles.body}>
          <NegotiationBundleSection
            state={state}
            totals={totals}
            actionableCount={actionableCount}
            stacked={stacked}
            stackDuplicates={stackDuplicates}
            groups={groups}
            orderedItems={orderedItems}
            expandedGroups={expandedGroups}
            locked={locked}
            onToggleStack={() => setStackDuplicates((value) => !value)}
            onToggleGroupExpanded={toggleGroupExpanded}
            onSelectGroup={handleSelectGroup}
            onAcceptGroupCounters={handleAcceptGroupCounters}
            onDeclineGroupCounters={handleDeclineGroupCounters}
            onToggleItem={handleToggleItem}
            onAcceptCounter={handleAcceptCounter}
            onDeclineCounter={handleDeclineCounter}
          />

          <aside style={styles.rightColumn}>
            <BundleEconomicsCard totals={totals} />
            <BundleAdjustmentCard
              discountPct={state?.globalDiscountPct ?? 0}
              disabled={!state || locked}
              onChange={session.setGlobalDiscount}
            />
            <AgreementCard
              traderReady={state?.traderReady === true}
              sellerReady={state?.sellerReady === true}
              locked={locked}
              onToggleReady={() => session.setReady(!state?.traderReady)}
              onLockDeal={session.lockDeal}
            />
            <ActivityFeedCard
              chat={session.chat}
              chatEnabled={chatEnabled}
              onSendChat={session.sendChat}
            />
          </aside>
        </div>

        <NegotiationFooter
          shareUrl={session.shareUrl}
          linkReady={session.linkReady}
          remainingBalanceCents={session.remainingBalanceCents}
          onEndSession={onEndSession}
        />
      </div>
    </div>
  );
};

// ── EXTRACTED STYLES ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  panel: {
    width: 'min(1120px, 100%)',
    maxHeight: '92vh',
    overflowY: 'auto',
    backgroundColor: '#0b0f14',
    border: '1px solid #1e2430',
    borderRadius: '16px',
    boxShadow: '0 30px 80px rgba(0, 0, 0, 0.55)',
    display: 'flex',
    flexDirection: 'column',
  },
  body: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap',
    padding: '16px 20px 0 20px',
  },
  rightColumn: {
    flex: '1 1 320px',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
};

export default RaidNegotiationModal;
