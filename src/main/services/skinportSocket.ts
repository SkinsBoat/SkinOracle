import { BrowserWindow } from "electron";
import { io, type Socket } from "socket.io-client";
import * as msgpackParser from "socket.io-msgpack-parser";
import { SKINPORT_WS } from "../constants/apiUrls";
import type {
  SkinportSaleFeedPayload,
  SkinportStreamEvent,
  SkinportStreamStatus,
} from "../../shared/types/skinport.types";

// ─────────────────────────────────────────────────────────────────
// Skinport live sale feed (socket.io + msgpack parser)
//
// The socket is owned by the Node.js main process and broadcast to every
// renderer window on `skinport:stream-event` / `skinport:stream-status`.
// Skinport's WS uses a custom msgpack parser, so `socket.io-msgpack-parser`
// MUST be passed as the `parser` option (default JSON will not decode).
//
// The feed is public (no key). Currency is fixed to USD and locale to `en`.
// ─────────────────────────────────────────────────────────────────

/** Skinport requires USD per the workstation spec. */
const JOIN_PARAMS = { currency: "USD", locale: "en", appid: 730 } as const;

/** Event types we surface. `price_changed` / `canceled` are unsupported. */
const SUPPORTED_EVENTS = new Set(["listed", "sold"]);

let socket: Socket | null = null;
let status: SkinportStreamStatus = emptyStatus();
let startPromise: Promise<SkinportStreamStatus> | null = null;
let startToken = 0;

function emptyStatus(): SkinportStreamStatus {
  return {
    connected: false,
    connecting: false,
    eventCount: 0,
    lastEventAt: null,
    error: null,
  };
}

function broadcastStatus(): void {
  try {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send("skinport:stream-status", status);
      }
    });
  } catch (err) {
    console.warn("[Skinport Socket] Failed to broadcast status:", err);
  }
}

function broadcastEvent(event: SkinportStreamEvent): void {
  status.eventCount += 1;
  status.lastEventAt = event.receivedAt;
  try {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send("skinport:stream-event", event);
      }
    });
  } catch (err) {
    console.warn("[Skinport Socket] Failed to broadcast event:", err);
  }
}

function dispatch(result: SkinportSaleFeedPayload): void {
  const eventType = result?.eventType;
  if (!eventType || !SUPPORTED_EVENTS.has(eventType)) return;
  const sales = Array.isArray(result?.sales) ? result.sales : [];
  if (sales.length === 0) return;
  broadcastEvent({ eventType, receivedAt: Date.now(), sales });
}

function joinFeed(s: Socket): void {
  s.emit("saleFeedJoin", { ...JOIN_PARAMS });
}

export function startSkinportStream(): Promise<SkinportStreamStatus> {
  if (socket) return Promise.resolve(status);
  if (startPromise) return startPromise;

  const token = ++startToken;
  startPromise = connectStream(token).finally(() => {
    if (token === startToken) startPromise = null;
  });
  return startPromise;
}

async function connectStream(token: number): Promise<SkinportStreamStatus> {
  status = { ...emptyStatus(), connecting: true };
  broadcastStatus();

  const s = io(SKINPORT_WS, {
    transports: ["websocket"],
    parser: msgpackParser as any,
    reconnection: true,
    reconnectionAttempts: Infinity,
    timeout: 15000,
  });
  socket = s;

  if (token !== startToken) return status;

  s.on("connect", () => {
    status.connecting = false;
    status.connected = true;
    status.error = null;
    broadcastStatus();
    joinFeed(s);
  });

  s.on("saleFeed", (result: SkinportSaleFeedPayload) => dispatch(result));

  s.on("connect_error", (err: Error) => {
    status.connecting = false;
    status.error = err?.message || "Connection error";
    broadcastStatus();
  });

  s.on("disconnect", () => {
    status.connected = false;
    status.connecting = false;
    broadcastStatus();
  });

  return status;
}

export function stopSkinportStream(): SkinportStreamStatus {
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

export function getSkinportStreamStatus(): SkinportStreamStatus {
  return status;
}
