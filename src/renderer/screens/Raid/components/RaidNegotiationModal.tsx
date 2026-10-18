import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Check,
  Copy,
  Handshake,
  Lock,
  MessageSquare,
  Send,
  ShieldCheck,
  Unlock,
  Wallet,
  Wifi,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import type { RaidAuditRow, RaidSeller } from '../../../../shared/types/raid.types';
import type {
  NegotiationItem,
  NegotiationTransportMode,
  RaidPeerStatus,
} from '../types/negotiation.types';
import type { WebRtcSessionInitResult } from '../../../../shared/types/webrtc.types';
import { useRaidPeerHost } from '../hooks/useRaidPeerHost';
import {
  getEffectiveOfferPrice,
  getNegotiationTotals,
} from '../utils/negotiationState';
import { formatUsd } from '../utils/raidUtils';

interface RaidNegotiationModalProps {
  seller: RaidSeller | null;
  rows: RaidAuditRow[];
  /** Stable retry key for the paid session request. */
  sessionIdempotencyKey: string;
  onClose: () => void;
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

interface StatusMeta {
  label: string;
  tone: 'live' | 'offline' | 'pending' | 'error';
}

/**
 * Live P2P negotiation war room. The share link carries a compressed snapshot
 * of the public deal state, so the seller can still counter-offer when WebRTC
 * is blocked by their network.
 */
export const RaidNegotiationModal: React.FC<RaidNegotiationModalProps> = ({
  seller,
  rows,
  sessionIdempotencyKey,
  onClose,
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

  const session = useRaidPeerHost({
    seller,
    rows,
    initSession,
  });
  const [chatInput, setChatInput] = useState('');
  const autoCopiedRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const state = session.state;
  const totals = useMemo(
    () => (state ? getNegotiationTotals(state) : null),
    [state],
  );
  const statusMeta = getStatusMeta(
    session.status,
    session.transportMode,
    session.peerRegistered,
    session.latencyMs,
  );
  const locked = state?.dealLocked === true;
  const bothReady =
    state?.traderReady === true && state?.sellerReady === true;
  const chatEnabled =
    session.transportMode === 'p2p' && session.guestConnected;

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

  const handleRetrySignaling = useCallback(() => {
    autoCopiedRef.current = false;
    session.stop();
    session.start();
  }, [session]);

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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [session.chat.length]);

  const handleSendChat = (event: React.FormEvent) => {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text || !chatEnabled) return;
    session.sendChat(text);
    setChatInput('');
  };

  const peerLabel = session.roomId
    ? `${session.roomId.slice(0, 8)}…${session.roomId.slice(-4)}`
    : '—';

  return (
    <div style={styles.overlay} onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Live Negotiation Table"
        style={styles.panel}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header style={styles.header}>
          <div style={styles.headerIdentity}>
            <div style={styles.titleIcon}>
              <Handshake size={20} style={styles.titleIconGlyph} />
            </div>
            <div style={styles.titleText}>
              <div style={styles.titleRow}>
                <h2 style={styles.title}>Live Negotiation Table</h2>
                <span style={getStatusBadgeStyle(statusMeta.tone)}>
                  {statusMeta.tone === 'live' ? (
                    <Wifi size={11} />
                  ) : statusMeta.tone === 'offline' ? (
                    <WifiOff size={11} />
                  ) : (
                    <span style={styles.statusDot} />
                  )}
                  {statusMeta.label}
                </span>
              </div>
              <p style={styles.subtitle}>
                {seller?.name || 'Seller'} ·{' '}
                {getMarketplaceLabel(seller?.marketplace)}
              </p>
            </div>
          </div>

          <div style={styles.headerActions}>
            <div style={styles.peerBox} title={session.roomId || undefined}>
              <span style={styles.peerBoxLabel}>PEER ID</span>
              <code style={styles.peerBoxValue}>{peerLabel}</code>
            </div>
            {!session.peerRegistered &&
              session.transportMode === 'offline' && (
                <button
                  type="button"
                  onClick={handleRetrySignaling}
                  style={styles.retryBtn}
                >
                  Retry
                </button>
              )}
            <button
              type="button"
              onClick={() => copyShareLink(false)}
              disabled={!session.linkReady}
              style={getCopyBtnStyle(!session.linkReady)}
            >
              <Copy size={14} />
              <span>Copy Link</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close negotiation table"
              style={styles.closeBtn}
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {session.error && !session.billingError && (
          <div style={styles.errorBanner}>
            <WifiOff size={14} style={styles.bannerIcon} />
            <span style={styles.bannerText}>{session.error}</span>
          </div>
        )}

        {session.billingError && (
          <div style={styles.billingBanner}>
            <Wallet size={16} style={styles.billingIcon} />
            <div style={styles.billingBody}>
              <strong style={styles.billingTitle}>
                {session.billingError.code === 'INSUFFICIENT_BALANCE'
                  ? 'Insufficient balance'
                  : 'Live session unavailable'}
              </strong>
              <span style={styles.billingText}>
                {session.billingError.message}
                {session.billingError.code === 'INSUFFICIENT_BALANCE' &&
                typeof session.billingError.balanceCents === 'number'
                  ? ` Available: $${(
                      session.billingError.balanceCents / 100
                    ).toFixed(2)}, required: $0.20.`
                  : ''}
              </span>
            </div>
            {session.billingError.code === 'INSUFFICIENT_BALANCE' && (
              <button
                type="button"
                onClick={onTopUp || onClose}
                style={styles.topUpBtn}
              >
                Top Up Balance
              </button>
            )}
          </div>
        )}

        {session.transportMode === 'offline' &&
          !session.error &&
          !session.billingError && (
          <div style={styles.offlineBanner}>
            <WifiOff size={14} style={styles.bannerIcon} />
            <span style={styles.bannerText}>
              {!session.peerRegistered
                ? 'Signaling did not register. The link carries only the room and guest token — use Retry to open a fresh live channel.'
                : session.status === 'waiting' || session.status === 'initializing'
                  ? 'No live guest yet. The seller receives the deal over the live channel after opening the link.'
                  : 'Live sync unavailable. The seller needs the live channel to receive the deal; local controls remain active.'}
            </span>
          </div>
        )}

        {locked && (
          <div style={styles.lockedBanner}>
            <Lock size={14} style={styles.lockedIcon} />
            <span style={styles.lockedText}>
              Deal locked — both parties confirmed the bundle.
            </span>
          </div>
        )}

        <div style={styles.body}>
          <section style={styles.leftColumn}>
            <div style={styles.sectionHeader}>
              <div>
                <h3 style={styles.sectionTitle}>Deal Bundle</h3>
                <p style={styles.sectionSubtitle}>
                  {state?.items.length ?? 0} audited listings ·{' '}
                  {totals?.itemCount ?? 0} included
                </p>
              </div>
              <span style={styles.readOnlyBadge}>PUBLIC PRICING ONLY</span>
            </div>

            <div style={styles.itemList}>
              {!state || state.items.length === 0 ? (
                <div style={styles.emptyState}>
                  <Handshake size={30} style={styles.emptyIcon} />
                  <h4 style={styles.emptyTitle}>No Bundle Items</h4>
                  <p style={styles.emptyText}>
                    Close the table and select at least one audited listing
                    before hosting a live deal.
                  </p>
                </div>
              ) : (
                state.items.map((item) => (
                  <NegotiationItemRow
                    key={item.id}
                    item={item}
                    discountPct={state.globalDiscountPct}
                    locked={locked}
                    onToggle={() =>
                      session.toggleItem(item.id, !item.selected)
                    }
                    onAcceptCounter={() => {
                      session.acceptCounter(item.id);
                      toast.success('Counter-offer accepted.');
                    }}
                    onDeclineCounter={() => {
                      session.declineCounter(item.id);
                      toast('Counter-offer declined.');
                    }}
                  />
                ))
              )}
            </div>
          </section>

          <aside style={styles.rightColumn}>
            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <ShieldCheck size={14} style={styles.cardIcon} />
                <span style={styles.cardTitle}>Bundle Economics</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Listed value</span>
                <span style={styles.summaryValue}>
                  {formatUsd(totals?.listedTotal)}
                </span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Proposed offer</span>
                <span style={styles.summaryOffer}>
                  {formatUsd(totals?.proposedTotal)}
                </span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Net savings</span>
                <span style={styles.summarySavings}>
                  {totals && totals.savings > 0
                    ? `−${formatUsd(totals.savings)}`
                    : formatUsd(0)}
                </span>
              </div>
            </section>

            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Global Discount</span>
                <span style={styles.discountValue}>
                  {state ? `${state.globalDiscountPct}%` : '0%'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={Math.abs(state?.globalDiscountPct ?? 0)}
                disabled={!state || locked}
                onChange={(event) =>
                  session.setGlobalDiscount(-Math.abs(Number(event.target.value)))
                }
                aria-label="Global bundle discount"
                style={getRangeStyle(!state || locked)}
              />
              <div style={styles.rangeLabels}>
                <span>0%</span>
                <span>−25%</span>
              </div>
            </section>

            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.cardTitle}>Agreement</span>
                {locked ? (
                  <Lock size={13} style={styles.lockedIcon} />
                ) : (
                  <Unlock size={13} style={styles.cardIcon} />
                )}
              </div>
              <div style={styles.readyGrid}>
                <ReadyPill
                  label="Trader"
                  ready={state?.traderReady === true}
                />
                <ReadyPill
                  label="Seller"
                  ready={state?.sellerReady === true}
                />
              </div>
              <button
                type="button"
                onClick={() => session.setReady(!state?.traderReady)}
                disabled={!state || locked}
                style={getSecondaryBtnStyle(!state || locked)}
              >
                {state?.traderReady ? 'Withdraw Ready' : 'Mark Ready'}
              </button>
              <button
                type="button"
                onClick={session.lockDeal}
                disabled={!bothReady || locked}
                style={getPrimaryBtnStyle(!bothReady || locked)}
              >
                <Check size={14} />
                <span>{locked ? 'Deal Locked' : 'Lock Deal'}</span>
              </button>
            </section>

            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <MessageSquare size={14} style={styles.cardIcon} />
                <span style={styles.cardTitle}>Activity Feed</span>
                {chatEnabled && (
                  <span style={styles.liveDot} title="Live P2P channel" />
                )}
              </div>
              <div style={styles.chatFeed}>
                {session.chat.length === 0 ? (
                  <p style={styles.chatEmpty}>
                    {chatEnabled
                      ? 'Channel open. Negotiation events and messages appear here.'
                      : 'Messages unlock when the seller connects to the live channel.'}
                  </p>
                ) : (
                  session.chat.map((entry) => (
                    <div key={entry.id} style={styles.chatEntry}>
                      <div style={styles.chatMeta}>
                        <span
                          style={
                            entry.role === 'trader'
                              ? styles.chatSenderTrader
                              : styles.chatSenderSeller
                          }
                        >
                          {entry.sender}
                        </span>
                        <span style={styles.chatTime}>
                          {formatChatTime(entry.timestamp)}
                        </span>
                      </div>
                      <p style={styles.chatText}>{entry.text}</p>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendChat} style={styles.chatForm}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  maxLength={500}
                  disabled={!chatEnabled}
                  placeholder={
                    chatEnabled
                      ? 'Message the seller…'
                      : 'Chat requires a live P2P channel'
                  }
                  aria-label="Negotiation message"
                  style={getChatInputStyle(!chatEnabled)}
                />
                <button
                  type="submit"
                  disabled={!chatEnabled || !chatInput.trim()}
                  aria-label="Send message"
                  style={getSendBtnStyle(
                    !chatEnabled || !chatInput.trim(),
                  )}
                >
                  <Send size={14} />
                </button>
              </form>
            </section>
          </aside>
        </div>

        <footer style={styles.footer}>
          <div style={styles.shareField}>
            <span style={styles.shareLabel}>Shareable link</span>
            <input
              type="text"
              readOnly
              value={
                session.linkReady
                  ? session.shareUrl || ''
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
              {session.shareUrl
                ? `${session.shareUrl.length.toLocaleString()} chars${
                    session.shareUrl.length > 2000
                      ? ' (long — chat apps may truncate)'
                      : ''
                  } · room + token`
                : 'Link pending'}
            </span>
            <span>
              {session.remainingBalanceCents !== null
                ? `Session $0.20 · balance $${(
                    session.remainingBalanceCents / 100
                  ).toFixed(2)}`
                : 'Session fee $0.20'}
            </span>
            <span>· zero server storage · ceilings never transmitted</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

const NegotiationItemRow: React.FC<{
  item: NegotiationItem;
  discountPct: number;
  locked: boolean;
  onToggle: () => void;
  onAcceptCounter: () => void;
  onDeclineCounter: () => void;
}> = ({
  item,
  discountPct,
  locked,
  onToggle,
  onAcceptCounter,
  onDeclineCounter,
}) => {
  const effectivePrice = getEffectiveOfferPrice(item, discountPct);
  const hasCounter = typeof item.counterPrice === 'number';

  return (
    <div style={getItemRowStyle(item.selected, locked)}>
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

const ReadyPill: React.FC<{ label: string; ready: boolean }> = ({
  label,
  ready,
}) => (
  <div style={getReadyPillStyle(ready)}>
    <span style={styles.readyPillLabel}>{label}</span>
    <span style={ready ? styles.readyPillOn : styles.readyPillOff}>
      {ready ? 'READY' : 'WAITING'}
    </span>
  </div>
);

// ─────────────────────────────────────────────────────────────────
// Styles extracted to bottom per TONE_AND_UI_STYLE_GUIDE.md
// ─────────────────────────────────────────────────────────────────
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
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
    padding: '18px 20px',
    backgroundColor: 'rgba(11, 15, 20, 0.97)',
    borderBottom: '1px solid #1e2430',
  },
  headerIdentity: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: 0,
  },
  titleIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.32)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleIconGlyph: { color: '#4ade80' },
  titleText: { minWidth: 0 },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    flexWrap: 'wrap',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 900,
    letterSpacing: '0.3px',
    color: '#f8fafc',
  },
  subtitle: {
    margin: '3px 0 0 0',
    fontSize: '12px',
    fontWeight: 600,
    color: '#94a3b8',
  },
  statusDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    backgroundColor: 'currentColor',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  peerBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    padding: '5px 9px',
    borderRadius: '7px',
    backgroundColor: '#0d1117',
    border: '1px solid #1e2430',
  },
  peerBoxLabel: {
    fontSize: '8px',
    fontWeight: 800,
    letterSpacing: '0.8px',
    color: '#64748b',
  },
  peerBoxValue: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#cbd5e1',
    fontFamily: 'var(--so-font-mono, ui-monospace, monospace)',
  },
  retryBtn: {
    height: '32px',
    padding: '0 11px',
    borderRadius: '8px',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    border: '1px solid rgba(245, 158, 11, 0.42)',
    color: '#fbbf24',
    fontSize: '11px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    border: '1px solid #1e2430',
    color: '#94a3b8',
    cursor: 'pointer',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '12px 20px 0 20px',
    padding: '9px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.34)',
    color: '#f87171',
    fontSize: '12px',
    fontWeight: 600,
  },
  billingBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    margin: '12px 20px 0 20px',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.34)',
    color: '#f87171',
  },
  billingIcon: { flexShrink: 0 },
  billingBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: '1 1 320px',
    minWidth: 0,
  },
  billingTitle: {
    fontSize: '12px',
    fontWeight: 900,
  },
  billingText: {
    fontSize: '11px',
    lineHeight: 1.4,
    fontWeight: 600,
    color: '#fca5a5',
  },
  topUpBtn: {
    height: '30px',
    padding: '0 12px',
    borderRadius: '7px',
    backgroundColor: '#dc2626',
    border: 'none',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 800,
    cursor: 'pointer',
    flexShrink: 0,
  },
  offlineBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '12px 20px 0 20px',
    padding: '9px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.4)',
    color: '#fbbf24',
    fontSize: '12px',
    fontWeight: 600,
  },
  bannerIcon: { flexShrink: 0 },
  bannerText: { lineHeight: 1.45 },
  lockedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '12px 20px 0 20px',
    padding: '9px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.38)',
    color: '#4ade80',
    fontSize: '12px',
    fontWeight: 700,
  },
  lockedIcon: { color: '#4ade80', flexShrink: 0 },
  lockedText: { lineHeight: 1.4 },
  body: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap',
    padding: '16px 20px 0 20px',
  },
  leftColumn: {
    flex: '1 1 540px',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  rightColumn: {
    flex: '1 1 320px',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
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
  readOnlyBadge: {
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '0.5px',
    padding: '3px 7px',
    borderRadius: '4px',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.28)',
    color: '#38bdf8',
    flexShrink: 0,
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
    maxHeight: '430px',
    overflowY: 'auto',
    paddingRight: '2px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    borderRadius: '10px',
    backgroundColor: '#131720',
    border: '1px solid #1e2430',
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
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    borderRadius: '10px',
    backgroundColor: '#131720',
    border: '1px solid #1e2430',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    minHeight: '17px',
  },
  cardIcon: { color: '#38bdf8' },
  cardTitle: {
    fontSize: '11.5px',
    fontWeight: 800,
    color: '#e2e8f0',
    letterSpacing: '0.2px',
    flex: 1,
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  summaryLabel: {
    fontSize: '11.5px',
    fontWeight: 600,
    color: '#94a3b8',
  },
  summaryValue: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#e2e8f0',
  },
  summaryOffer: {
    fontSize: '13px',
    fontWeight: 900,
    color: '#38bdf8',
  },
  summarySavings: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#4ade80',
  },
  discountValue: {
    fontSize: '12px',
    fontWeight: 900,
    color: '#38bdf8',
  },
  range: {
    width: '100%',
    accentColor: '#2563eb',
    cursor: 'pointer',
  },
  rangeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '9.5px',
    fontWeight: 700,
    color: '#64748b',
  },
  readyGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '7px',
  },
  readyPill: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '7px 9px',
    borderRadius: '7px',
    backgroundColor: '#0d1117',
    border: '1px solid #1e2430',
  },
  readyPillLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#94a3b8',
  },
  readyPillOn: {
    fontSize: '9px',
    fontWeight: 900,
    letterSpacing: '0.4px',
    color: '#4ade80',
  },
  readyPillOff: {
    fontSize: '9px',
    fontWeight: 900,
    letterSpacing: '0.4px',
    color: '#64748b',
  },
  chatFeed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
    height: '170px',
    overflowY: 'auto',
    padding: '2px',
  },
  chatEmpty: {
    margin: 0,
    fontSize: '11px',
    lineHeight: 1.45,
    color: '#64748b',
  },
  chatEntry: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '7px 9px',
    borderRadius: '7px',
    backgroundColor: '#0d1117',
    border: '1px solid #1e2430',
  },
  chatMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  chatSenderTrader: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#38bdf8',
  },
  chatSenderSeller: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#fbbf24',
  },
  chatTime: {
    fontSize: '9px',
    fontWeight: 600,
    color: '#475569',
  },
  chatText: {
    margin: 0,
    fontSize: '11.5px',
    lineHeight: 1.4,
    color: '#cbd5e1',
    wordBreak: 'break-word',
  },
  chatForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  chatInput: {
    flex: 1,
    minWidth: 0,
    height: '32px',
    padding: '0 9px',
    borderRadius: '7px',
    backgroundColor: '#0d1117',
    border: '1px solid #2a3342',
    color: '#f8fafc',
    fontSize: '11.5px',
    fontWeight: 600,
    outline: 'none',
  },
  sendBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '7px',
    backgroundColor: '#2563eb',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    flexShrink: 0,
  },
  liveDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.16)',
  },
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
};

function getStatusMeta(
  status: RaidPeerStatus,
  transport: NegotiationTransportMode,
  peerRegistered: boolean,
  latencyMs: number | null,
): StatusMeta {
  if (transport === 'p2p') {
    return {
      label:
        latencyMs !== null
          ? `Live P2P Connected · ${latencyMs}ms`
          : 'Live P2P Connected',
      tone: 'live',
    };
  }
  if (transport === 'offline') {
    return { label: 'Offline Interactive', tone: 'offline' };
  }
  if (status === 'error') {
    return { label: 'Session Error', tone: 'error' };
  }
  if (peerRegistered) {
    return { label: 'Waiting for Seller', tone: 'pending' };
  }
  return { label: 'Registering Signaling…', tone: 'pending' };
}

function getStatusBadgeStyle(tone: StatusMeta['tone']): React.CSSProperties {
  const palette = {
    live: {
      backgroundColor: 'rgba(34, 197, 94, 0.12)',
      border: '1px solid rgba(34, 197, 94, 0.38)',
      color: '#4ade80',
    },
    offline: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      border: '1px solid rgba(245, 158, 11, 0.4)',
      color: '#fbbf24',
    },
    pending: {
      backgroundColor: 'rgba(56, 189, 248, 0.1)',
      border: '1px solid rgba(56, 189, 248, 0.32)',
      color: '#38bdf8',
    },
    error: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.36)',
      color: '#f87171',
    },
  }[tone];

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    borderRadius: '20px',
    fontSize: '9.5px',
    fontWeight: 800,
    letterSpacing: '0.25px',
    ...palette,
  };
}

function getCopyBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    height: '32px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 11px',
    borderRadius: '8px',
    backgroundColor: disabled ? 'rgba(37, 99, 235, 0.3)' : '#2563eb',
    border: 'none',
    color: disabled ? 'rgba(255, 255, 255, 0.55)' : '#ffffff',
    fontSize: '11px',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function getItemRowStyle(
  selected: boolean,
  locked: boolean,
): React.CSSProperties {
  return {
    ...styles.itemRow,
    opacity: selected ? 1 : 0.52,
    borderColor: selected ? '#243044' : '#1e2430',
    cursor: 'default',
  };
}

function getRangeStyle(disabled: boolean): React.CSSProperties {
  return {
    ...styles.range,
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function getReadyPillStyle(ready: boolean): React.CSSProperties {
  return {
    ...styles.readyPill,
    borderColor: ready ? 'rgba(34, 197, 94, 0.4)' : '#1e2430',
    backgroundColor: ready ? 'rgba(34, 197, 94, 0.08)' : '#0d1117',
  };
}

function getSecondaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    height: '31px',
    borderRadius: '7px',
    backgroundColor: 'transparent',
    border: '1px solid #2a3342',
    color: disabled ? '#475569' : '#cbd5e1',
    fontSize: '11px',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function getPrimaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    height: '33px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderRadius: '7px',
    backgroundColor: disabled ? 'rgba(22, 163, 74, 0.35)' : '#16a34a',
    border: 'none',
    color: disabled ? 'rgba(255, 255, 255, 0.55)' : '#ffffff',
    fontSize: '11.5px',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function getChatInputStyle(disabled: boolean): React.CSSProperties {
  return {
    ...styles.chatInput,
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
  };
}

function getSendBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    ...styles.sendBtn,
    backgroundColor: disabled ? 'rgba(37, 99, 235, 0.35)' : '#2563eb',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function getMarketplaceLabel(
  marketplace: RaidSeller['marketplace'] | undefined,
): string {
  switch (marketplace) {
    case 'skinport':
      return 'Skinport';
    case 'csfloat':
      return 'CSFloat';
    case 'dmarket':
      return 'DMarket';
    case 'csmoney':
      return 'CS.MONEY';
    case 'steam':
      return 'Steam';
    default:
      return 'Marketplace';
  }
}

function formatChatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default RaidNegotiationModal;
