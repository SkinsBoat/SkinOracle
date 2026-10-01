// CS2Cap integration — see src/main/services/CS2CAP_API.md before changing it.
import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from "electron";
import axios from "axios";
import * as readline from "readline";
import { Readable } from "stream";
import { secureGet, STORAGE_KEYS } from "../../storage/secure-store";
import { setLocalPriceCache } from "./skinsnipe.ipc";
import { trendStore } from "../services/trendStore";
import { Cs2CapStreamProgress, Cs2CapFetchResult } from "../../shared/types";
import { MarketScanScope } from "../../shared/types/autoRefresh.types";
import {
  parseCs2CapLine,
  getMarketCounts,
  buildCs2CapStreamUrl,
  PriceCache,
} from "../services/cs2capParser";
import { getAppUserAgent } from "../constants/userAgent";

let isFetching = false;
let cancelRequested = false;
let activeAbortController: AbortController | null = null;

/**
 * Parses user-friendly error messages from CS2Cap HTTP responses.
 */
function parseCs2CapError(err: any): {
  message: string;
  statusCode: number | null;
} {
  const status = err.response?.status;
  if (!status) {
    return {
      statusCode: null,
      message: err.message || "Network error connecting to CS2Cap API",
    };
  }

  switch (status) {
    case 401:
      return {
        statusCode: 401,
        message:
          "❌ 401 Unauthorized: Invalid or missing CS2Cap API Key. Please verify in Settings.",
      };
    case 403:
      return {
        statusCode: 403,
        message:
          "❌ 403 Forbidden: Pro or Quant tier subscription required for live full prices streaming snapshot.",
      };
    case 409: {
      const retryAfter = err.response?.headers?.["retry-after"];
      const retryMsg = retryAfter
        ? ` Wait ${retryAfter}s before starting a new stream.`
        : " Wait for it to complete.";
      return {
        statusCode: 409,
        message: `❌ 409 Conflict: Another active stream is already in progress for this API key.${retryMsg}`,
      };
    }
    case 422: {
      const detail = err.response?.data?.detail;
      let detailMsg =
        "Invalid request parameters or unsupported provider identifier.";
      if (Array.isArray(detail)) {
        detailMsg = detail
          .map((d: any) => d.msg || d.message || JSON.stringify(d))
          .join("; ");
      } else if (typeof detail === "string") {
        detailMsg = detail;
      } else if (err.response?.data?.message) {
        detailMsg = err.response.data.message;
      }
      return {
        statusCode: 422,
        message: `❌ 422 Validation Error: ${detailMsg}`,
      };
    }
    case 429:
      return {
        statusCode: 429,
        message:
          "❌ 429 Too Many Requests: CS2Cap 24h streaming quota exceeded (50/day on Pro, 300/day on Quant).",
      };
    case 500:
    case 502:
    case 503:
      return {
        statusCode: status,
        message: `❌ HTTP ${status} Server Error: CS2Cap pricing servers are temporarily unavailable.`,
      };
    default:
      return {
        statusCode: status,
        message: `❌ HTTP ${status} Error: ${err.response?.data?.message || err.message}`,
      };
  }
}

/**
 * Broadcasts CS2Cap stream progress to every renderer window.
 * Used when a cycle is driven by the background auto-refresh scheduler.
 */
function broadcastCs2CapProgress(payload: Cs2CapStreamProgress) {
  try {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send("cs2cap:fetch-progress", payload);
      }
    });
  } catch (err) {
    console.warn("[CS2Cap] Failed to broadcast stream progress:", err);
  }
}

export function getCs2CapIsFetching(): boolean {
  return isFetching;
}

export function cancelCs2CapStream(): boolean {
  if (isFetching) {
    cancelRequested = true;
    if (activeAbortController) {
      activeAbortController.abort();
    }
    return true;
  }
  return false;
}

/**
 * Streams the full price catalog from CS2Cap and parses NDJSON line-by-line.
 */
async function streamCs2CapCatalog(
  emit: (payload: Cs2CapStreamProgress) => void,
  apiKey: string,
  options?: { providers?: string[] },
): Promise<{ cache: PriceCache; linesRead: number; elapsedMs: number }> {
  cancelRequested = false;
  activeAbortController = new AbortController();

  const tempCache: PriceCache = {};
  let linesRead = 0;
  let bytesReceived = 0;
  const startTime = Date.now();
  let lastProgressSend = 0;

  const sendProgress = (
    status: Cs2CapStreamProgress["status"],
    lastError: string | null = null,
  ) => {
    const itemsCount = Object.keys(tempCache).length;
    const counts = getMarketCounts(tempCache);
    const progress: Cs2CapStreamProgress = {
      linesRead,
      itemsCount,
      providersCount: Object.keys(counts).length,
      bytesReceived,
      elapsedMs: Date.now() - startTime,
      status,
      lastError,
      marketCounts: counts,
    };
    emit(progress);
  };

  sendProgress("connecting");

  // Always send the explicit provider list so the server cannot stream markets
  // we did not request (e.g. blocked gambling platforms).
  const streamUrl = buildCs2CapStreamUrl(options);

  const response = await axios.post(streamUrl, null, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/x-ndjson, */*",
      "User-Agent": getAppUserAgent(),
    },
    responseType: "stream",
    signal: activeAbortController.signal,
    timeout: 120000,
  });

  const stream: Readable = response.data;
  sendProgress("streaming");

  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer | string) => {
      bytesReceived +=
        typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
    });

    rl.on("line", (line: string) => {
      if (cancelRequested) {
        rl.close();
        if (activeAbortController) activeAbortController.abort();
        return;
      }

      linesRead++;
      parseCs2CapLine(line, tempCache);

      const now = Date.now();
      if (now - lastProgressSend > 250) {
        lastProgressSend = now;
        sendProgress("streaming");
      }
    });

    rl.on("close", () => {
      const elapsedMs = Date.now() - startTime;
      if (cancelRequested) {
        sendProgress("aborted", "Stream cancelled by user.");
        reject(new Error("Stream cancelled by user."));
      } else {
        sendProgress("completed");
        resolve({ cache: tempCache, linesRead, elapsedMs });
      }
    });

    rl.on("error", (err: any) => {
      sendProgress("error", err.message);
      reject(err);
    });

    stream.on("error", (err: any) => {
      sendProgress("error", err.message);
      reject(err);
    });
  });
}

// ── Runnable cycle: shared by the renderer IPC call and the auto-refresh scheduler ──
export async function runCs2CapStreamCycle(
  options?: { providers?: string[]; scope?: MarketScanScope },
  emit?: (payload: Cs2CapStreamProgress) => void,
): Promise<Cs2CapFetchResult> {
  const apiKey = secureGet(STORAGE_KEYS.CS2CAP);
  if (!apiKey) {
    throw new Error("CS2Cap API key not set. Please add it in Settings.");
  }

  if (isFetching) {
    throw new Error("A CS2Cap price stream is already in progress.");
  }

  isFetching = true;
  const progressEmitter = emit || broadcastCs2CapProgress;

  try {
    const { cache, elapsedMs } = await streamCs2CapCatalog(
      progressEmitter,
      apiKey,
      options,
    );
    const itemCount = Object.keys(cache).length;
    const marketCounts = getMarketCounts(cache);
    const providersCount = Object.keys(marketCounts).length;

    if (itemCount > 0) {
      // Commit directly to local price cache and trend store
      setLocalPriceCache(cache);
      // Snipe-scope streams are ephemeral execution refreshes; only wide
      // baseline streams should feed historical trend snapshots.
      if (options?.scope !== "snipe") {
        trendStore.saveDailySnapshots(cache).catch((err) => {
          console.warn("[TrendStore] CS2Cap Auto-snapshot error:", err);
        });
      }
    }

    return {
      success: true,
      itemCount,
      providersCount,
      fetchedAt: new Date().toISOString(),
      elapsedMs,
      marketCounts,
    };
  } catch (err: any) {
    if (cancelRequested) {
      return {
        success: false,
        itemCount: 0,
        providersCount: 0,
        fetchedAt: new Date().toISOString(),
        elapsedMs: 0,
        aborted: true,
        error: "Stream cancelled by user.",
      };
    }

    const parsed = parseCs2CapError(err);
    console.error(
      `[CS2Cap] Stream failed (HTTP ${parsed.statusCode}): ${parsed.message}`,
    );
    throw new Error(parsed.message);
  } finally {
    isFetching = false;
    cancelRequested = false;
    activeAbortController = null;
  }
}

// ── IPC: Stream full prices from CS2Cap ────────────────────────────
ipcMain.handle(
  "cs2cap:fetch-prices",
  async (
    event: IpcMainInvokeEvent,
    options?: { providers?: string[] },
  ): Promise<Cs2CapFetchResult> => {
    const emit = (payload: Cs2CapStreamProgress) => {
      if (event?.sender && !event.sender.isDestroyed()) {
        event.sender.send("cs2cap:fetch-progress", payload);
      }
    };
    return runCs2CapStreamCycle(options, emit);
  },
);

// ── IPC: Cancel active stream ─────────────────────────────────────
ipcMain.handle("cs2cap:cancel-fetch", () => {
  if (cancelCs2CapStream()) {
    return { success: true, message: "CS2Cap stream cancellation requested." };
  }
  return { success: false, message: "No active CS2Cap stream running." };
});

// ── IPC: Get fetch status ─────────────────────────────────────────
ipcMain.handle("cs2cap:get-status", () => ({
  isFetching,
}));
