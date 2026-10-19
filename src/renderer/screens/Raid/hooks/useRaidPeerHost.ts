/**
 * RAID — Live Negotiation Table host hook.
 *
 * Creates a PeerJS room on the free cloud signaling service and accepts exactly
 * one guest (the seller). Once the WebRTC DataChannel opens, all messages travel
 * browser-to-browser: no SaaS API calls, no database writes, no VPS compute.
 *
 * The host owns canonical deal state. Guest messages are parsed and validated
 * before `applyPeerMessage` can mutate it, then the canonical state is
 * rebroadcast. Ceilings/spreads never enter `NegotiationState`.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type {
  RaidAuditRow,
  RaidSeller,
} from '../../../../shared/types/raid.types';
import { SKINSBOAT_DEAL_URL } from '../../../constants/brandUrls';
import type {
  NegotiationChatMessage,
  NegotiationState,
  NegotiationTransportMode,
  PeerMessage,
  PeerWireMessage,
  RaidPeerStatus,
} from '../types/negotiation.types';
import {
  applyPeerMessage,
  clampGlobalDiscountPct,
  createNegotiationState,
  isNegotiationMarketplace,
  parsePeerMessage,
} from '../utils/negotiationState';
import { buildDealShareUrl } from '../utils/negotiationRoom';
import type {
  WebRtcIceServer,
  WebRtcSessionInitFailure,
  WebRtcSessionInitResult,
} from '../../../../shared/types/webrtc.types';

const DEFAULT_STUN_SERVERS: WebRtcIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

const HEARTBEAT_INTERVAL_MS = 3000;
const P2P_CONNECT_TIMEOUT_MS = 5000;

/**
 * Guest deal-page origin. Both dev and production Electron builds use the
 * hosted route by default; `VITE_DEAL_PAGE_URL` can override it explicitly.
 */
const DEFAULT_DEAL_PAGE_URL =
  (import.meta.env.VITE_DEAL_PAGE_URL as string | undefined)?.trim() ||
  SKINSBOAT_DEAL_URL;
const MAX_CHAT_HISTORY = 200;
const RECONNECT_DELAY_MS = 1000;

export interface UseRaidPeerHostOptions {
  seller: RaidSeller | null;
  /** Selected audit rows. Snapshotted when the table starts. */
  rows: RaidAuditRow[];
  /** When false the room is closed and cleaned up. Defaults to true. */
  enabled?: boolean;
  /** Guest web client base URL. Defaults to the centralized brand constant. */
  dealPageUrl?: string;
  /**
   * Paid backend initializer. Returns the server-generated room id, signed
   * guest token, ephemeral TURN credentials, and remaining balance.
   */
  initSession?: (itemCount: number) => Promise<WebRtcSessionInitResult>;
}

export interface UseRaidPeerHostReturn {
  roomId: string | null;
  shareUrl: string | null;
  guestToken: string | null;
  /** Balance remaining after the fixed $0.20 session charge. */
  remainingBalanceCents: number | null;
  sessionExpiresAt: string | null;
  /** Structured 402/payment failure for the Top Up prompt. */
  billingError: WebRtcSessionInitFailure | null;
  status: RaidPeerStatus;
  transportMode: NegotiationTransportMode;
  /** True once the PeerJS signaling socket has registered this room id. */
  peerRegistered: boolean;
  /** True when the hash link is safe to share (registered or offline fallback). */
  linkReady: boolean;
  error: string | null;
  guestConnected: boolean;
  /** Latest keepalive round-trip in milliseconds. */
  latencyMs: number | null;
  state: NegotiationState | null;
  chat: NegotiationChatMessage[];
  start: () => void;
  stop: () => void;
  resync: () => void;
  toggleItem: (itemId: string, selected: boolean) => void;
  setItemsSelected: (itemIds: string[], selected: boolean) => void;
  setGlobalDiscount: (discountPct: number) => void;
  setItemCounter: (itemId: string, counterPrice: number) => void;
  setItemCounters: (itemIds: string[], counterPrice: number) => void;
  acceptCounter: (itemId: string) => void;
  acceptCounters: (itemIds: string[]) => void;
  declineCounter: (itemId: string) => void;
  declineCounters: (itemIds: string[]) => void;
  setReady: (ready: boolean) => void;
  lockDeal: () => void;
  sendChat: (text: string) => void;
}

function createLocalId(): string {
  return `chat-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function describePeerError(type: string | undefined): string {
  switch (type) {
    case 'browser-incompatible':
      return 'This environment does not support WebRTC peer connections.';
    case 'unavailable-id':
      return 'Room code collision — start a new negotiation table.';
    case 'network':
    case 'socket-error':
    case 'socket-closed':
      return 'Signaling network unavailable. Check your connection and retry.';
    case 'server-error':
      return 'Signaling server unavailable. Retry in a moment.';
    case 'peer-unavailable':
      return 'Seller room is no longer available.';
    default:
      return 'Live connection failed. Retry the table.';
  }
}

export function useRaidPeerHost({
  seller,
  rows,
  enabled = true,
  dealPageUrl = DEFAULT_DEAL_PAGE_URL,
  initSession,
}: UseRaidPeerHostOptions): UseRaidPeerHostReturn {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [remainingBalanceCents, setRemainingBalanceCents] = useState<
    number | null
  >(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(
    null,
  );
  const [billingError, setBillingError] =
    useState<WebRtcSessionInitFailure | null>(null);
  const [status, setStatus] = useState<RaidPeerStatus>('idle');
  const [transportMode, setTransportMode] =
    useState<NegotiationTransportMode>('connecting');
  const [peerRegistered, setPeerRegistered] = useState(false);
  const peerRegisteredRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [guestConnected, setGuestConnected] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [state, setState] = useState<NegotiationState | null>(null);
  const [chat, setChat] = useState<NegotiationChatMessage[]>([]);

  const sellerRef = useRef<RaidSeller | null>(seller);
  const rowsRef = useRef<RaidAuditRow[]>(rows);
  const initSessionRef = useRef(initSession);
  sellerRef.current = seller;
  rowsRef.current = rows;
  initSessionRef.current = initSession;

  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const stateRef = useRef<NegotiationState | null>(null);
  const chatRef = useRef<NegotiationChatMessage[]>([]);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(true);
  const startingRef = useRef(false);
  const generationRef = useRef(0);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current !== null) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current !== null) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const startWatchdog = useCallback(() => {
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      watchdogRef.current = null;
      if (stoppedRef.current) return;
      if (!connRef.current?.open && !peerRegisteredRef.current) {
        setTransportMode('offline');
      }
    }, P2P_CONNECT_TIMEOUT_MS);
  }, [clearWatchdog]);

  const send = useCallback((message: PeerWireMessage): boolean => {
    const conn = connRef.current;
    if (!conn || !conn.open) return false;
    try {
      conn.send(message);
      return true;
    } catch {
      return false;
    }
  }, []);

  const appendChat = useCallback((entry: NegotiationChatMessage) => {
    const next = [...chatRef.current, entry].slice(-MAX_CHAT_HISTORY);
    chatRef.current = next;
    setChat(next);
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    startingRef.current = false;
    generationRef.current += 1;
    clearHeartbeat();
    clearReconnectTimer();
    clearWatchdog();

    const conn = connRef.current;
    connRef.current = null;
    if (conn) {
      try {
        conn.close();
      } catch {
        // Already closed.
      }
    }

    const peer = peerRef.current;
    peerRef.current = null;
    if (peer) {
      try {
        peer.destroy();
      } catch {
        // Already destroyed.
      }
    }

    stateRef.current = null;
    chatRef.current = [];
    setState(null);
    setChat([]);
    setRoomId(null);
    setGuestToken(null);
    setRemainingBalanceCents(null);
    setSessionExpiresAt(null);
    setBillingError(null);
    setGuestConnected(false);
    setLatencyMs(null);
    setStatus('idle');
    setTransportMode('connecting');
    peerRegisteredRef.current = false;
    setPeerRegistered(false);
    setError(null);
  }, [clearHeartbeat, clearReconnectTimer, clearWatchdog]);

  const start = useCallback(() => {
    if (peerRef.current || startingRef.current) return;

    const currentSeller = sellerRef.current;
    const initializeSession = initSessionRef.current;

    if (!currentSeller) {
      setError('Scan a seller storefront before starting a live table.');
      setStatus('error');
      setTransportMode('offline');
      return;
    }
    const marketplace = currentSeller.marketplace;
    if (!isNegotiationMarketplace(marketplace)) {
      setError(
        'Live negotiation is available for Skinport, CSFloat, and DMarket storefronts.',
      );
      setStatus('error');
      setTransportMode('offline');
      return;
    }
    if (typeof RTCPeerConnection === 'undefined') {
      setError('This environment does not support WebRTC peer connections.');
      setStatus('error');
      setTransportMode('offline');
      return;
    }
    if (!initializeSession) {
      setError('Live session billing is unavailable. Restart the desktop app.');
      setStatus('error');
      setTransportMode('offline');
      return;
    }

    stoppedRef.current = false;
    startingRef.current = true;
    const runId = generationRef.current + 1;
    generationRef.current = runId;
    clearHeartbeat();
    clearReconnectTimer();
    clearWatchdog();

    setStatus('initializing');
    setTransportMode('connecting');
    peerRegisteredRef.current = false;
    setPeerRegistered(false);
    setError(null);
    setBillingError(null);
    setGuestConnected(false);
    setLatencyMs(null);
    setRoomId(null);
    setGuestToken(null);
    setRemainingBalanceCents(null);
    setSessionExpiresAt(null);
    setState(null);
    chatRef.current = [];
    setChat([]);

    if (import.meta.env.DEV) {
      console.info('[negotiation] deal page base', dealPageUrl);
    }

    const startHeartbeat = () => {
      clearHeartbeat();
      heartbeatRef.current = setInterval(() => {
        const conn = connRef.current;
        if (!conn || !conn.open) return;
        send({ type: 'PEER_PING', sentAt: Date.now() });
      }, HEARTBEAT_INTERVAL_MS);
    };

    const launchPeer = (
      nextRoomId: string,
      iceServers: WebRtcIceServer[],
    ) => {
      if (stoppedRef.current || generationRef.current !== runId) return;

      const initial = createNegotiationState({
        roomId: nextRoomId,
        marketplace,
        sellerHandle: currentSeller.name || currentSeller.id,
        rows: rowsRef.current,
      });

      stateRef.current = initial;
      chatRef.current = [];
      setState(initial);
      setChat([]);
      setRoomId(nextRoomId);
      setStatus('initializing');
      setTransportMode('connecting');
      peerRegisteredRef.current = false;
      setPeerRegistered(false);
      setError(null);
      setGuestConnected(false);
      setLatencyMs(null);
      startWatchdog();

      let peer: Peer;
      try {
        peer = new Peer(nextRoomId, {
          debug: import.meta.env.DEV ? 2 : 0,
          config: {
            iceServers:
              iceServers.length > 0 ? iceServers : DEFAULT_STUN_SERVERS,
          },
        });
      } catch {
        stoppedRef.current = true;
        startingRef.current = false;
        clearWatchdog();
        setError('Could not initialize the live connection.');
        setStatus('error');
        setTransportMode('offline');
        return;
      }
      peerRef.current = peer;

      const syncToGuest = () => {
        const current = stateRef.current;
        if (!current) return;
        send({ type: 'INIT_DEAL_STATE', state: current });
        for (const entry of chatRef.current) {
          send({
            type: 'CHAT_MESSAGE',
            sender: entry.sender,
            text: entry.text,
            timestamp: entry.timestamp,
          });
        }
      };

      const handleConnection = (conn: DataConnection) => {
        if (peerRef.current !== peer) return;

        const existing = connRef.current;
        if (existing && existing !== conn) {
          if (existing.open) {
            // One seller per table: reject additional guests.
            try {
              conn.close();
            } catch {
              // Ignore.
            }
            return;
          }
          try {
            existing.close();
          } catch {
            // Already closed.
          }
        }

        connRef.current = conn;
        setStatus('initializing');

        conn.on('open', () => {
          if (connRef.current !== conn) return;
          if (import.meta.env.DEV) {
            console.info('[negotiation] guest connected', nextRoomId);
          }
          setStatus('connected');
          setTransportMode('p2p');
          setGuestConnected(true);
          setError(null);
          setLatencyMs(null);
          clearWatchdog();
          syncToGuest();
          send({ type: 'PEER_PING', sentAt: Date.now() });
          startHeartbeat();
        });

        conn.on('data', (raw: unknown) => {
          if (connRef.current !== conn) return;
          const message = parsePeerMessage(raw);
          if (!message) return;

          if (message.type === 'PEER_PING') {
            send({ type: 'PEER_PONG', sentAt: message.sentAt });
            return;
          }
          if (message.type === 'PEER_PONG') {
            setLatencyMs(Math.max(0, Date.now() - message.sentAt));
            return;
          }
          if (message.type === 'CHAT_MESSAGE') {
            appendChat({
              id: createLocalId(),
              role: 'seller',
              sender: message.sender,
              text: message.text,
              timestamp: message.timestamp,
            });
            return;
          }
          if (message.type === 'SYNC_STATE') {
            // The host is the state authority; guest snapshots are never applied.
            return;
          }

          const current = stateRef.current;
          if (!current) return;
          const next = applyPeerMessage(current, message, 'seller');
          if (next === current) return;

          stateRef.current = next;
          setState(next);
          send({ type: 'SYNC_STATE', state: next });
        });

        conn.on('close', () => {
          if (connRef.current !== conn) return;
          connRef.current = null;
          clearHeartbeat();
          setGuestConnected(false);
          setLatencyMs(null);
          if (!stoppedRef.current && peerRef.current === peer) {
            setStatus('waiting');
            setTransportMode('offline');
          }
        });

        conn.on('error', () => {
          // `close` follows; the table simply returns to the waiting state.
        });
      };

      peer.on('open', () => {
        if (peerRef.current !== peer) return;
        peerRegisteredRef.current = true;
        setPeerRegistered(true);
        setStatus(connRef.current?.open ? 'connected' : 'waiting');
        if (import.meta.env.DEV) {
          console.info('[negotiation] signaling registered', nextRoomId);
        }
      });

      peer.on('connection', handleConnection);

      peer.on('disconnected', () => {
        if (peerRef.current !== peer || stoppedRef.current) return;
        peerRegisteredRef.current = false;
        setPeerRegistered(false);
        setStatus(connRef.current?.open ? 'connected' : 'waiting');
        clearReconnectTimer();
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          if (peerRef.current !== peer || stoppedRef.current) return;
          try {
            peer.reconnect();
          } catch {
            setError(describePeerError('network'));
            setStatus('error');
            setTransportMode('offline');
          }
        }, RECONNECT_DELAY_MS);
      });

      peer.on('error', (err: { type?: string }) => {
        if (peerRef.current !== peer || stoppedRef.current) return;
        if (import.meta.env.DEV) {
          console.warn('[negotiation] peer error', err?.type);
        }
        peerRegisteredRef.current = false;
        setPeerRegistered(false);
        setError(describePeerError(err?.type));
        setStatus('error');
        if (!connRef.current?.open) setTransportMode('offline');
      });

      peer.on('close', () => {
        if (peerRef.current !== peer) return;
        peerRef.current = null;
        connRef.current = null;
        clearHeartbeat();
        clearReconnectTimer();
        clearWatchdog();
        peerRegisteredRef.current = false;
        setPeerRegistered(false);
        setGuestConnected(false);
        setLatencyMs(null);
        if (!stoppedRef.current) {
          setError('Live session closed. Start a new table.');
          setStatus('error');
          setTransportMode('offline');
        }
      });
    };

    const begin = async () => {
      try {
        const init = await initializeSession(rowsRef.current.length);
        if (stoppedRef.current || generationRef.current !== runId) return;

        if (init.success !== true) {
          startingRef.current = false;
          setBillingError(init);
          setError(init.message);
          setStatus('error');
          setTransportMode('offline');
          return;
        }

        startingRef.current = false;
        setGuestToken(init.guestToken);
        setRemainingBalanceCents(init.remainingBalanceCents);
        setSessionExpiresAt(init.expiresAt);
        launchPeer(
          init.roomId,
          Array.isArray(init.iceServers) && init.iceServers.length > 0
            ? init.iceServers
            : DEFAULT_STUN_SERVERS,
        );
      } catch (error) {
        if (stoppedRef.current || generationRef.current !== runId) return;
        startingRef.current = false;
        setError(
          error instanceof Error && error.message
            ? error.message
            : 'Could not initialize the paid live session.',
        );
        setStatus('error');
        setTransportMode('offline');
      }
    };

    void begin();
  }, [
    appendChat,
    clearHeartbeat,
    clearReconnectTimer,
    clearWatchdog,
    dealPageUrl,
    send,
    startWatchdog,
  ]);

  const applyLocal = useCallback(
    (message: PeerMessage) => {
      const current = stateRef.current;
      if (!current) return;
      const next = applyPeerMessage(current, message, 'trader');
      if (next === current) return;
      stateRef.current = next;
      setState(next);
      send({ type: 'SYNC_STATE', state: next });
    },
    [send],
  );

  const resync = useCallback(() => {
    const current = stateRef.current;
    if (!current) return;
    send({ type: 'SYNC_STATE', state: current });
  }, [send]);

  const toggleItem = useCallback(
    (itemId: string, selected: boolean) => {
      applyLocal({ type: 'TOGGLE_ITEM', itemId, selected });
    },
    [applyLocal],
  );

  const setItemsSelected = useCallback(
    (itemIds: string[], selected: boolean) => {
      if (itemIds.length === 0) return;
      applyLocal({ type: 'TOGGLE_ITEMS', itemIds, selected });
    },
    [applyLocal],
  );

  const setGlobalDiscount = useCallback(
    (discountPct: number) => {
      applyLocal({
        type: 'SET_GLOBAL_DISCOUNT',
        discountPct: clampGlobalDiscountPct(discountPct),
      });
    },
    [applyLocal],
  );

  const setItemCounter = useCallback(
    (itemId: string, counterPrice: number) => {
      applyLocal({ type: 'SET_ITEM_COUNTER', itemId, counterPrice });
    },
    [applyLocal],
  );

  const setItemCounters = useCallback(
    (itemIds: string[], counterPrice: number) => {
      if (itemIds.length === 0) return;
      applyLocal({ type: 'SET_ITEM_COUNTERS', itemIds, counterPrice });
    },
    [applyLocal],
  );

  const acceptCounter = useCallback(
    (itemId: string) => {
      applyLocal({ type: 'ACCEPT_COUNTER', itemId });
    },
    [applyLocal],
  );

  const acceptCounters = useCallback(
    (itemIds: string[]) => {
      if (itemIds.length === 0) return;
      applyLocal({ type: 'ACCEPT_COUNTERS', itemIds });
    },
    [applyLocal],
  );

  const declineCounter = useCallback(
    (itemId: string) => {
      applyLocal({ type: 'DECLINE_COUNTER', itemId });
    },
    [applyLocal],
  );

  const declineCounters = useCallback(
    (itemIds: string[]) => {
      if (itemIds.length === 0) return;
      applyLocal({ type: 'DECLINE_COUNTERS', itemIds });
    },
    [applyLocal],
  );

  const setReady = useCallback(
    (ready: boolean) => {
      applyLocal({ type: 'SET_READY', role: 'trader', ready });
    },
    [applyLocal],
  );

  const lockDeal = useCallback(() => {
    applyLocal({ type: 'LOCK_DEAL' });
  }, [applyLocal]);

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = String(text || '').trim();
      if (!trimmed) return;
      const entry: NegotiationChatMessage = {
        id: createLocalId(),
        role: 'trader',
        sender: 'Trader',
        text: trimmed.slice(0, 500),
        timestamp: Date.now(),
      };
      appendChat(entry);
      send({
        type: 'CHAT_MESSAGE',
        sender: entry.sender,
        text: entry.text,
        timestamp: entry.timestamp,
      });
    },
    [appendChat, send],
  );

  const shareUrl = useMemo(() => {
    if (!roomId) return null;
    return buildDealShareUrl(dealPageUrl, roomId, guestToken || undefined);
  }, [dealPageUrl, guestToken, roomId]);

  const linkReady = Boolean(
    shareUrl &&
      guestToken &&
      (peerRegistered || transportMode !== 'connecting'),
  );

  const sellerKey = seller ? `${seller.marketplace}:${seller.id}` : null;

  useEffect(() => {
    if (!enabled || !sellerKey) return;
    start();
    return () => stop();
    // `start` snapshots rows from a ref: changing selection must not restart
    // the room or rotate the share link.
  }, [enabled, sellerKey, start, stop]);

  return {
    roomId,
    shareUrl,
    guestToken,
    remainingBalanceCents,
    sessionExpiresAt,
    billingError,
    status,
    transportMode,
    peerRegistered,
    linkReady,
    error,
    guestConnected,
    latencyMs,
    state,
    chat,
    start,
    stop,
    resync,
    toggleItem,
    setItemsSelected,
    setGlobalDiscount,
    setItemCounter,
    setItemCounters,
    acceptCounter,
    acceptCounters,
    declineCounter,
    declineCounters,
    setReady,
    lockDeal,
    sendChat,
  };
}
