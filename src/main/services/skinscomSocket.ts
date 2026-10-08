import { BrowserWindow } from "electron";
import axios from "axios";
import { io, type Socket } from "socket.io-client";
import { secureGet, STORAGE_KEYS } from "../../storage/secure-store";
import { SKINSCOM_METADATA, SKINSCOM_TRADING_WS } from "../constants/apiUrls";
import { getAppUserAgent } from "../constants/userAgent";
import type {
  SkinscomMetadataResponse,
  SkinscomStreamEvent,
  SkinscomStreamFilters,
  SkinscomStreamStatus,
} from "../../shared/types/skinscom.types";

// ─────────────────────────────────────────────────────────────────
// Skins.com live item feed (socket.io v4)
//
// The socket is owned by the Node.js main process so the short-lived
// `socket_token` / `socket_signature` (from GET /metadata/socket) never reach
// the renderer. Events are broadcast to every renderer window on the
// `skinscom:stream-event` / `skinscom:stream-status` channels.
//
// Reference: src/renderer/screens/Skinscom/SKINSCOM_TRADING_API.md
// ─────────────────────────────────────────────────────────────────

/** Item events we subscribe to; account-only events (trade_status, …) are left out. */
const STREAM_EVENTS = [
  "new_item",
  "updated_item",
  "auction_update",
  "deleted_item",
] as const;

let socket: Socket | null = null;
let lastFilters: SkinscomStreamFilters = {};
let status: SkinscomStreamStatus = emptyStatus();
/** In-flight start, so concurrent calls never open a second socket. */
let startPromise: Promise<SkinscomStreamStatus> | null = null;
/** Incremented on stop to cancel a start whose credentials are still loading. */
let startToken = 0;

function emptyStatus(): SkinscomStreamStatus {
  return {
    connected: false,
    connecting: false,
    authenticated: false,
    eventCount: 0,
    lastEventAt: null,
    error: null,
  };
}

function broadcastStatus(): void {
  try {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send("skinscom:stream-status", status);
      }
    });
  } catch (err) {
    console.warn("[Skins.com Socket] Failed to broadcast status:", err);
  }
}

function broadcastEvent(event: SkinscomStreamEvent): void {
  status.eventCount += 1;
  status.lastEventAt = event.receivedAt;
  try {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send("skinscom:stream-event", event);
      }
    });
  } catch (err) {
    console.warn("[Skins.com Socket] Failed to broadcast event:", err);
  }
}

function dispatch(
  type: SkinscomStreamEvent["type"],
  payload: unknown,
): void {
  const receivedAt = Date.now();
  const arr = Array.isArray(payload) ? payload : [];
  if (type === "deleted_item") {
    broadcastEvent({ type, receivedAt, deletedIds: arr as number[] });
  } else if (type === "auction_update") {
    broadcastEvent({ type, receivedAt, auctions: arr as any });
  } else {
    broadcastEvent({ type, receivedAt, items: arr as any });
  }
}

/** Re-send the server-side narrowing once the socket is connected. */
function applyFilters(): void {
  if (!socket?.connected) return;
  socket.emit("allowedEvents", { events: [...STREAM_EVENTS] });

  const filters: Record<string, unknown> = {};
  if (lastFilters.priceMinCents != null) filters.price_min = lastFilters.priceMinCents;
  if (lastFilters.priceMaxCents != null) filters.price_max = lastFilters.priceMaxCents;
  if (lastFilters.auction) filters.auction = lastFilters.auction;
  socket.emit("filters", filters);
}

async function fetchMetadata(apiKey: string): Promise<SkinscomMetadataResponse> {
  const res = await axios.get(SKINSCOM_METADATA, {
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      Accept: "application/json",
      "User-Agent": getAppUserAgent(),
    },
  });
  return res.data;
}

/**
 * Open (or re-filter) the live Skins.com stream. Idempotent: calling it while
 * already connected just updates the server-side filters, and a concurrent
 * call while the socket credentials are still being fetched reuses the same
 * promise instead of opening a second socket.
 */
export function startSkinscomStream(
  filters: SkinscomStreamFilters = {},
): Promise<SkinscomStreamStatus> {
  lastFilters = filters ?? {};

  if (socket) {
    applyFilters();
    return Promise.resolve(status);
  }

  if (startPromise) {
    // A start is already in flight; reuse it, then re-apply the new filters.
    return startPromise.then(() => {
      applyFilters();
      return status;
    });
  }

  const token = ++startToken;
  startPromise = connectStream(token).finally(() => {
    if (token === startToken) startPromise = null;
  });
  return startPromise;
}

async function connectStream(token: number): Promise<SkinscomStreamStatus> {
  // Preserve a healthy status if we are already connected (defensive).
  status = { ...emptyStatus(), connecting: true };
  broadcastStatus();

  const apiKey = secureGet(STORAGE_KEYS.SKINSCOM);
  if (!apiKey) throw new Error("Skins.com API key not set");

  const meta = await fetchMetadata(apiKey);

  // A stop() while the credentials were in flight supersedes this start.
  if (token !== startToken) return status;

  const s = io(`${SKINSCOM_TRADING_WS}/trade`, {
    path: "/s/",
    transports: ["websocket", "polling"],
    query: { uid: String(meta.user.id), token: meta.socket_token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    timeout: 15000,
  });
  socket = s;

  s.on("connect", () => {
    status.connecting = false;
    status.connected = true;
    status.error = null;
    broadcastStatus();
  });

  // `init` is sent on connect and again after `identify`; authenticate with the
  // metadata credentials when the query token was not accepted.
  s.on("init", (init: { authenticated?: boolean } | undefined) => {
    const authenticated = Boolean(init?.authenticated);
    status.authenticated = authenticated;
    if (!authenticated) {
      s.emit("identify", {
        uid: meta.user.id,
        model: {},
        authorizationToken: meta.socket_token,
        signature: meta.socket_signature,
      });
    }
    broadcastStatus();
    applyFilters();
  });

  s.on("new_item", (items) => dispatch("new_item", items));
  s.on("updated_item", (items) => dispatch("updated_item", items));
  s.on("auction_update", (items) => dispatch("auction_update", items));
  s.on("deleted_item", (items) => dispatch("deleted_item", items));

  s.on("connect_error", (err: Error) => {
    status.connecting = false;
    status.error = err?.message || "Connection error";
    broadcastStatus();
  });

  s.on("disconnect", () => {
    status.connected = false;
    status.authenticated = false;
    status.connecting = false;
    broadcastStatus();
  });

  return status;
}

/** Close the stream and reset state. Also cancels an in-flight start. */
export function stopSkinscomStream(): SkinscomStreamStatus {
  startToken += 1;
  startPromise = null;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  status = emptyStatus();
  broadcastStatus();
  return status;
}

export function getSkinscomStreamStatus(): SkinscomStreamStatus {
  return status;
}
