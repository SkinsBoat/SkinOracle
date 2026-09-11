import { app, ipcMain, IpcMainInvokeEvent } from "electron";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import * as https from "https";
import { secureGet, STORAGE_KEYS } from "../../storage/secure-store";
import { setPriceCache, priceCache } from "./oracle.ipc";
import { SKINSNIPE_LOWEST_PRICES } from "../constants/apiUrls";
import { saasAxios } from "../services/saasAxios";
import { trendStore } from "../services/trendStore";
import { toCanonicalMarketId } from "../../shared/canonicalMarkets";

// ─────────────────────────────────────────────────────────────────
// Skinsnipe price fetching — runs on the trader's device using the
// trader's own Skinsnipe API key.
// Handles rate-limiting, error reporting, live countdown, & market counts.
// ─────────────────────────────────────────────────────────────────

const DEFAULT_MARKETS = [
  "avanmarket",
  "csmoney_p2p",
  "csgofloat",
  "cstrade",
  "dmarket",
  "exeskins",
  "tradeitgg_store",
  "shadowpay",
  "skinland",
  "skinswap",
  "waxpeer",
  "skinflow",
  "market_csgo",
  "lisskins",
];

type PriceCache = Record<
  string,
  { n: string; l: { m: string; p: number; q?: number }[] }
>;

let localPriceCache: PriceCache = {};
let isFetching = false;
let cancelRequested = false;
let lastFetchedAt: Date | null = null;

export function setLocalPriceCache(cache: PriceCache, fetchedAt?: Date) {
  localPriceCache = cache;
  lastFetchedAt = fetchedAt || new Date();
  setPriceCache(cache);
}

export function getActivePriceCache(): PriceCache {
  if (localPriceCache && Object.keys(localPriceCache).length > 0) {
    return localPriceCache;
  }
  return priceCache || {};
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractGenuineQuantity(raw: any): number | undefined {
  if (typeof raw?.q === "number" && Number.isFinite(raw.q) && raw.q > 0) {
    return raw.q;
  }
  if (
    typeof raw?.quantity === "number" &&
    Number.isFinite(raw.quantity) &&
    raw.quantity > 0
  ) {
    return raw.quantity;
  }
  return undefined;
}

function getMarketCounts(cache: PriceCache): Record<string, number> {
  const marketCounts: Record<string, number> = {};
  for (const item of Object.values(cache)) {
    if (item?.l && Array.isArray(item.l)) {
      const marketsSeen = new Set<string>();
      for (const listing of item.l) {
        if (listing.m) {
          const raw = listing.m;
          const canonical = toCanonicalMarketId(raw);
          if (!marketsSeen.has(canonical)) {
            marketsSeen.add(canonical);
            marketCounts[canonical] = (marketCounts[canonical] || 0) + 1;
            if (raw && raw !== canonical) {
              marketCounts[raw] = (marketCounts[raw] || 0) + 1;
            }
          }
        }
      }
    }
  }
  return marketCounts;
}

function parseSkinsnipeError(err: any): {
  statusCode: number | null;
  message: string;
  isCritical: boolean;
} {
  const status = err.response?.status;
  if (!status) {
    return {
      statusCode: null,
      message: err.message || "Network connectivity issue / Request failed",
      isCritical: false,
    };
  }

  switch (status) {
    case 400:
      return {
        statusCode: 400,
        message: "❌ 400 Bad Request: Invalid or missing query parameters.",
        isCritical: true,
      };
    case 401:
      return {
        statusCode: 401,
        message: "❌ 401 Unauthorized: API Key not provided or wrong format.",
        isCritical: true,
      };
    case 403:
      return {
        statusCode: 403,
        message:
          "❌ 403 Forbidden: User does not have access to this specific endpoint.",
        isCritical: true,
      };
    case 404:
      return {
        statusCode: 404,
        message: "❌ 404 Not Found: Endpoint does not exist.",
        isCritical: true,
      };
    case 406:
      return {
        statusCode: 406,
        message:
          '❌ 406 Not Acceptable: Missing "Accept" and/or "Accept-Encoding" headers.',
        isCritical: true,
      };
    case 429:
      return {
        statusCode: 429,
        message:
          "❌ 429 Too Many Requests: Rate limit exceeded (calls per minute limit reached).",
        isCritical: true,
      };
    case 500:
      return {
        statusCode: 500,
        message:
          "❌ 500 Internal Server Error: Skinsnipe servers down or under maintenance.",
        isCritical: true,
      };
    default:
      return {
        statusCode: status,
        message: `❌ HTTP ${status} Error: ${err.response?.data?.message || err.message}`,
        isCritical: status >= 400 && status < 500,
      };
  }
}

async function fetchMarket(apiKey: string, market: string): Promise<any[]> {
  const res = await axios.get(SKINSNIPE_LOWEST_PRICES, {
    params: { game: 730, markets: market, currency: "USD" },
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "br",
      Authorization: `Key ${apiKey}`,
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  });

  const data = res.data;
  if (Array.isArray(data)) return data;
  if (data?.d && Array.isArray(data.d)) return data.d;
  if (typeof data === "object") return Object.values(data);
  return [];
}

async function mergeAndBuild(
  event: IpcMainInvokeEvent,
  apiKey: string,
  targetMarkets?: string[],
) {
  cancelRequested = false;
  const tempCache: PriceCache = {};
  const activeMarkets =
    targetMarkets && targetMarkets.length > 0 ? targetMarkets : DEFAULT_MARKETS;
  const failedMarkets: Array<{
    market: string;
    error: string;
    statusCode: number | null;
  }> = [];
  let criticalError: string | null = null;
  let completedMarkets = 0;

  const sendProgress = (
    currentMarket: string,
    currentMarketIndex: number,
    status: "fetching" | "waiting" | "completed" | "aborted" | "error",
    lastError: string | null = null,
    sleepRemaining?: number,
  ) => {
    if (event?.sender && !event.sender.isDestroyed()) {
      const mergedCache = { ...localPriceCache, ...tempCache };
      event.sender.send("skinsnipe:fetch-progress", {
        currentMarket,
        currentMarketIndex,
        totalMarkets: activeMarkets.length,
        completedMarkets,
        errorCount: failedMarkets.length,
        lastError,
        criticalError,
        status,
        sleepRemaining,
        marketCounts: getMarketCounts(mergedCache),
      });
    }
  };

  for (let i = 0; i < activeMarkets.length; i++) {
    if (cancelRequested) {
      criticalError = "Fetch process manually stopped by user.";
      sendProgress(activeMarkets[i], i + 1, "aborted", criticalError);
      break;
    }

    const market = activeMarkets[i];
    sendProgress(market, i + 1, "fetching");

    try {
      const items = await fetchMarket(apiKey, market);
      for (const item of items) {
        const name = item.n || item.market_hash_name || item.name;
        if (!name) continue;

        if (!tempCache[name]) tempCache[name] = { n: name, l: [] };

        if (item.l && Array.isArray(item.l)) {
          const valid = item.l
            .filter((l: any) => l && typeof l.p === "number" && l.p > 0.2)
            .map((l: any) => {
              const q = extractGenuineQuantity(l);
              const listing: any = {
                m: toCanonicalMarketId(l.m || market),
                p: l.p,
              };
              if (q !== undefined) {
                listing.q = q;
              }
              return listing;
            });
          tempCache[name].l.push(...valid);
        }
      }
      completedMarkets++;
    } catch (e: any) {
      const parsedErr = parseSkinsnipeError(e);
      console.error(
        `[Skinsnipe] Failed to fetch ${market} (HTTP ${parsedErr.statusCode}): ${parsedErr.message}`,
      );
      failedMarkets.push({
        market,
        error: parsedErr.message,
        statusCode: parsedErr.statusCode,
      });

      if (parsedErr.isCritical) {
        criticalError = `[Critical Failure on ${market}] ${parsedErr.message}`;
        sendProgress(market, i + 1, "aborted", criticalError);
        break; // IMMEDIATELY STOP FETCHING LOOP ON CRITICAL ERROR (e.g. 429, 401, 403, 500)
      } else {
        sendProgress(market, i + 1, "error", parsedErr.message);
      }
    }

    if (cancelRequested) {
      criticalError = "Fetch process manually stopped by user.";
      sendProgress(market, i + 1, "aborted", criticalError);
      break;
    }

    // Respect rate limits between markets (32 seconds)
    // Ticking countdown updates sent every second to keep UI animated & responsive
    if (i < activeMarkets.length - 1) {
      const nextMarket = activeMarkets[i + 1];
      for (let s = 0; s < 32; s++) {
        if (cancelRequested) break;
        sendProgress(nextMarket, i + 2, "waiting", null, 32 - s);
        await sleep(1000);
      }
    }
  }

  if (!criticalError && !cancelRequested) {
    sendProgress(
      activeMarkets[activeMarkets.length - 1],
      activeMarkets.length,
      "completed",
    );
  }

  return {
    cache: tempCache,
    failedMarkets,
    criticalError,
    aborted: cancelRequested || !!criticalError,
  };
}

// ── IPC: Fetch all market prices using trader's Skinsnipe key ──────
ipcMain.handle(
  "skinsnipe:fetch-prices",
  async (event, targetMarkets?: string[]) => {
    const apiKey = secureGet(STORAGE_KEYS.SKINSNIPE);
    if (!apiKey)
      throw new Error("Skinsnipe API key not set. Go to Settings to add it.");
    if (isFetching) throw new Error("Fetch already in progress");

    isFetching = true;
    const hasPriorCache = Object.keys(localPriceCache).length > 0;

    try {
      const result = await mergeAndBuild(event, apiKey, targetMarkets);

      // Atomic Swap: If fetch finished successfully without critical error or manual abort,
      // replace localPriceCache with the newly fetched cache (dropping the old one).
      if (Object.keys(result.cache).length > 0) {
        if (!result.aborted && !result.criticalError) {
          localPriceCache = result.cache; // Swap atomically to the fresh fetch result
          lastFetchedAt = new Date();
          setPriceCache(localPriceCache); // Share updated cache with oracle.ipc.ts
          trendStore
            .saveDailySnapshots(localPriceCache)
            .catch((err) =>
              console.warn("[TrendStore] Auto-snapshot error:", err),
            );
        } else if (!hasPriorCache) {
          // If no prior cache existed and fetch was stopped mid-way, keep partial results
          localPriceCache = result.cache;
          lastFetchedAt = new Date();
          setPriceCache(localPriceCache);
          trendStore
            .saveDailySnapshots(localPriceCache)
            .catch((err) =>
              console.warn("[TrendStore] Auto-snapshot error:", err),
            );
        } else {
          console.log(
            "[Skinsnipe] Fetch was aborted or failed critically. Retaining existing active price cache for safety.",
          );
        }
      }

      return {
        success: !result.criticalError && !result.aborted,
        itemCount: Object.keys(localPriceCache).length,
        fetchedAt: lastFetchedAt?.toISOString() || new Date().toISOString(),
        totalMarkets: targetMarkets?.length || DEFAULT_MARKETS.length,
        errorCount: result.failedMarkets.length,
        failedMarkets: result.failedMarkets,
        aborted: result.aborted,
        criticalError: result.criticalError,
        marketCounts: getMarketCounts(localPriceCache),
      };
    } finally {
      isFetching = false;
    }
  },
);

// ── IPC: Cancel active fetch cycle ───────────────────────────────
ipcMain.handle("skinsnipe:cancel-fetch", () => {
  if (isFetching) {
    cancelRequested = true;
    return { success: true, message: "Cancel request sent." };
  }
  return { success: false, message: "No fetch currently in progress." };
});

// ── IPC: Get cached prices (already fetched) ───────────────────────
ipcMain.handle("skinsnipe:get-cache", () => getActivePriceCache());

ipcMain.handle("skinsnipe:get-item", (_, itemName: string) => {
  const active = getActivePriceCache();
  if (!itemName || !active) return null;
  return active[itemName] || active[itemName.trim()] || null;
});

ipcMain.handle("skinsnipe:get-cache-status", () => {
  const active = getActivePriceCache();
  return {
    itemCount: Object.keys(active).length,
    isFetching,
    lastFetchedAt: lastFetchedAt?.toISOString() || null,
    marketCounts: getMarketCounts(active),
  };
});

// ── IPC: Load pricing JSON file directly into local priceCache ─────
ipcMain.handle("skinsnipe:load-cache-json", async (_, jsonContent: string) => {
  try {
    const parsed = JSON.parse(jsonContent);
    let cacheData =
      parsed.data?.priceCache ||
      parsed.priceCache ||
      (parsed.data &&
      typeof parsed.data === "object" &&
      !Array.isArray(parsed.data)
        ? parsed.data
        : parsed);

    if (
      cacheData &&
      typeof cacheData === "object" &&
      !Array.isArray(cacheData)
    ) {
      const cleanCache: PriceCache = {};
      for (const [key, val] of Object.entries(cacheData)) {
        if (
          val &&
          typeof val === "object" &&
          ("l" in (val as any) || "n" in (val as any))
        ) {
          const rawItem = val as any;
          cleanCache[key] = {
            n: rawItem.n || key,
            l: (rawItem.l || [])
              .filter((l: any) => l && typeof l.p === "number" && l.p > 0.2)
              .map((l: any) => {
                const q = extractGenuineQuantity(l);
                const listing: any = {
                  m: toCanonicalMarketId(l.m),
                  p: l.p,
                };
                if (q !== undefined) {
                  listing.q = q;
                }
                return listing;
              }),
          };
        }
      }

      localPriceCache =
        Object.keys(cleanCache).length > 0
          ? cleanCache
          : (cacheData as PriceCache);
      lastFetchedAt = new Date();
      setPriceCache(localPriceCache);
      trendStore
        .saveDailySnapshots(localPriceCache)
        .catch((err) => console.warn("[TrendStore] Auto-snapshot error:", err));
      return {
        success: true,
        itemCount: Object.keys(localPriceCache).length,
        fetchedAt: lastFetchedAt.toISOString(),
        marketCounts: getMarketCounts(localPriceCache),
      };
    } else {
      throw new Error("Invalid JSON cache format");
    }
  } catch (err: any) {
    throw new Error(`Failed to load JSON cache: ${err.message}`);
  }
});

// ── IPC: Load demo price cache (offline persistent disk cache with cloud delivery) ──
ipcMain.handle(
  "skinsnipe:load-demo-cache",
  async (_event: IpcMainInvokeEvent, options?: { forceRefresh?: boolean }) => {
    try {
      const localCachePath = path.join(
        app.getPath("userData"),
        "demo-prices-cache.json",
      );
      let cacheData: any = null;
      let source: "local_cache" | "cloud_download" | "cloud_refreshed" =
        "local_cache";

      // 1. Check if local userData cache already exists and forceRefresh is not requested
      if (!options?.forceRefresh && fs.existsSync(localCachePath)) {
        try {
          const jsonContent = fs.readFileSync(localCachePath, "utf-8");
          const parsed = JSON.parse(jsonContent);
          cacheData = parsed.data?.priceCache || parsed.priceCache || parsed;
          console.log(
            `[Skinsnipe] Loaded demo price cache from local disk: ${localCachePath}`,
          );
        } catch (readErr: any) {
          console.warn(
            "[Skinsnipe] Failed reading local demo cache, will re-fetch from cloud:",
            readErr.message,
          );
          cacheData = null;
        }
      }

      // 2. If no local cache found or forceRefresh requested, download from SaaS API
      if (!cacheData) {
        console.log(
          "[Skinsnipe] Downloading demo price dataset from SaaS API (/oracle/demo-cache)...",
        );
        try {
          const res = await saasAxios.get("/oracle/demo-cache", {
            timeout: 60000,
          });
          const parsed = res.data;
          cacheData = parsed?.data?.priceCache || parsed?.priceCache || parsed;
          source = options?.forceRefresh ? "cloud_refreshed" : "cloud_download";

          // Persist to userData directory asynchronously so future loads are instant
          try {
            fs.writeFileSync(
              localCachePath,
              JSON.stringify(cacheData),
              "utf-8",
            );
            console.log(
              `[Skinsnipe] Successfully cached demo price dataset to: ${localCachePath}`,
            );
          } catch (saveErr: any) {
            console.warn(
              "[Skinsnipe] Could not persist demo cache to disk:",
              saveErr.message,
            );
          }
        } catch (networkErr: any) {
          // Fallback: If network failed but an existing local cache is on disk
          if (fs.existsSync(localCachePath)) {
            console.warn(
              "[Skinsnipe] Network fetch failed, falling back to local cache file on disk:",
              networkErr.message,
            );
            const jsonContent = fs.readFileSync(localCachePath, "utf-8");
            const parsed = JSON.parse(jsonContent);
            cacheData = parsed.data?.priceCache || parsed.priceCache || parsed;
            source = "local_cache";
          } else {
            throw new Error(
              `Failed to download demo price cache from server: ${networkErr.message}. Check your internet connection or use "Load Cache JSON File" to upload an offline JSON dataset.`,
            );
          }
        }
      }

      if (
        cacheData &&
        typeof cacheData === "object" &&
        !Array.isArray(cacheData)
      ) {
        const cleanCache: PriceCache = {};
        for (const [key, val] of Object.entries(cacheData)) {
          if (
            val &&
            typeof val === "object" &&
            ("l" in (val as any) || "n" in (val as any))
          ) {
            const rawItem = val as any;
            cleanCache[key] = {
              n: rawItem.n || key,
              l: (rawItem.l || [])
                .filter((l: any) => l && typeof l.p === "number" && l.p > 0.2)
                .map((l: any) => {
                  const q = extractGenuineQuantity(l);
                  const listing: any = {
                    m: toCanonicalMarketId(l.m),
                    p: l.p,
                  };
                  if (q !== undefined) {
                    listing.q = q;
                  }
                  return listing;
                }),
            };
          }
        }

        localPriceCache =
          Object.keys(cleanCache).length > 0
            ? cleanCache
            : (cacheData as PriceCache);
        lastFetchedAt = new Date();
        setPriceCache(localPriceCache);
        trendStore
          .saveDailySnapshots(localPriceCache)
          .catch((err) =>
            console.warn("[TrendStore] Auto-snapshot error:", err),
          );
        console.log(
          `[Skinsnipe] Loaded demo price cache (${Object.keys(localPriceCache).length} items, source: ${source})`,
        );
        return {
          success: true,
          itemCount: Object.keys(localPriceCache).length,
          fetchedAt: lastFetchedAt.toISOString(),
          marketCounts: getMarketCounts(localPriceCache),
          source,
        };
      } else {
        throw new Error("Invalid demo JSON cache format received");
      }
    } catch (err: any) {
      console.error("[Skinsnipe] Error loading demo price cache:", err);
      throw new Error(`Failed to load demo price cache: ${err.message}`);
    }
  },
);
