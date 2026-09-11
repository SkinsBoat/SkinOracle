import { app, ipcMain } from "electron";
import * as fs from "fs";
import * as path from "path";
import { saasAxios } from "../services/saasAxios";

import { trendStore } from "../services/trendStore";

// In-memory merged price cache (from Skinsnipe fetch)
// This is the same shape as SkinOracle priceCache: Record<name, { n, l[] }>
let priceCache: Record<
  string,
  { n: string; l: { m: string; p: number; q?: number }[] }
> = {};

// In-memory accepted price map — populated by OracleDashboard "Build Accepted Price" action
// Consumed by all market workstations (CSFloat, Skins.com) without re-hitting the saas-api
let acceptedPriceMap: Record<
  string,
  {
    acceptedPrice: number;
    supplyStabilityScore: number;
    isHyperStable: boolean;
    nexusDelta?: number;
    trendAdjustment?: number;
  }
> = {};
let cacheTimestamp: Date | null = null;
let acceptedPriceTimestamp: Date | null = null;

// In-memory listing price map — populated by OracleDashboard "Build Listing Prices" action
let listingPriceMap: Record<
  string,
  {
    listingPrice: number;
    mode: string;
    offsetPercent: number;
    lowestPrice: number;
    averagePrice: number;
  }
> = {};
let listingPriceTimestamp: Date | null = null;

function getStorePath(filename: string): string {
  const baseDir = app?.getPath
    ? app.getPath("userData")
    : process.env.USER_DATA_PATH || process.cwd();
  return path.join(baseDir, filename);
}

function loadPersistedPrices() {
  try {
    const acceptedFile = getStorePath("accepted-prices.json");
    if (fs.existsSync(acceptedFile)) {
      const raw = fs.readFileSync(acceptedFile, "utf8");
      const data = JSON.parse(raw);
      if (data?.map && typeof data.map === "object") {
        acceptedPriceMap = data.map;
        acceptedPriceTimestamp = data.timestamp
          ? new Date(data.timestamp)
          : new Date();
      }
    }
  } catch (e) {
    console.warn("[OracleIPC] Could not load persisted accepted prices:", e);
  }

  try {
    const listingFile = getStorePath("listing-prices.json");
    if (fs.existsSync(listingFile)) {
      const raw = fs.readFileSync(listingFile, "utf8");
      const data = JSON.parse(raw);
      if (data?.map && typeof data.map === "object") {
        listingPriceMap = data.map;
        listingPriceTimestamp = data.timestamp
          ? new Date(data.timestamp)
          : new Date();
      }
    }
  } catch (e) {
    console.warn("[OracleIPC] Could not load persisted listing prices:", e);
  }
}

loadPersistedPrices();

// ── Oracle: evaluate prices via our SaaS backend ──────────────────
//
// Flow:
//   1. Electron already has priceCache (filled by skinsnipe.ipc.ts)
//   2. For the requested items, extract their listings from priceCache
//   3. Send to our backend with optional SkinOracleOptions overrides
//   4. Return SkinOracleResult[] to renderer
//
ipcMain.handle("oracle:batch-start", async (_, totalItems: number) => {
  const res = await saasAxios.post("/oracle/batch/start", { totalItems });
  return res.data;
});

ipcMain.handle("oracle:nexus-batch-start", async (_, totalItems: number) => {
  const res = await saasAxios.post("/oracle/nexus/batch/start", { totalItems });
  return res.data;
});

ipcMain.handle(
  "oracle:batch-finish",
  async (_, batchId: string, completedItems: number) => {
    const res = await saasAxios.post("/oracle/batch/finish", {
      batchId,
      completedItems,
    });
    return res.data;
  },
);

ipcMain.handle(
  "oracle:evaluate",
  async (_, items: string[], options?: any, batchId?: string) => {
    // Build request items from local price cache (strip redundant metadata & enforce max 100 listings)
    const requestItems = items.map((name) => {
      const cached = priceCache[name];
      const rawListings = cached?.l || [];
      const cappedListings =
        rawListings.length > 100
          ? [...rawListings]
              .sort((a, b) => (a.p || 0) - (b.p || 0))
              .slice(0, 100)
          : rawListings;

      const listings = cappedListings
        .filter(
          (l) =>
            l &&
            l.m &&
            typeof l.p === "number" &&
            Number.isFinite(l.p) &&
            l.p >= 0.01 &&
            l.p <= 250000,
        )
        .map((l) => ({
          m: l.m,
          p: l.p,
          ...(l.q !== undefined &&
          typeof l.q === "number" &&
          Number.isFinite(l.q) &&
          l.q >= 0
            ? { q: l.q }
            : {}),
        }));
      return {
        name,
        listings,
      };
    });

    const res = await saasAxios.post("/oracle/evaluate", {
      items: requestItems,
      options,
      batchId,
    });
    return res.data; // OracleEvaluateResponse
  },
);

// ── Oracle Nexus v2: evaluate prices with local trend intelligence ──
ipcMain.handle(
  "oracle:evaluate-nexus",
  async (
    _,
    items: string[],
    options?: any,
    nexusParams?: any,
    batchId?: string,
  ) => {
    const windowDays = nexusParams?.trendWindow || 14;
    const trendHistoryMap = await trendStore.getTrendHistoryBatch(
      items,
      windowDays,
    );

    const requestItems = items.map((name) => {
      const cached = priceCache[name];
      const rawListings = cached?.l || [];
      const cappedListings =
        rawListings.length > 100
          ? [...rawListings]
              .sort((a, b) => (a.p || 0) - (b.p || 0))
              .slice(0, 100)
          : rawListings;

      const listings = cappedListings
        .filter(
          (l) =>
            l &&
            l.m &&
            typeof l.p === "number" &&
            Number.isFinite(l.p) &&
            l.p >= 0.01 &&
            l.p <= 250000,
        )
        .map((l) => ({
          m: l.m,
          p: l.p,
          ...(l.q !== undefined &&
          typeof l.q === "number" &&
          Number.isFinite(l.q) &&
          l.q >= 0
            ? { q: l.q }
            : {}),
        }));
      const trend = trendHistoryMap[name];
      const hasSufficientTrend =
        trend &&
        Array.isArray(trend.overallAverages) &&
        trend.overallAverages.length >= 3 &&
        Array.isArray(trend.labels) &&
        trend.labels.length === trend.overallAverages.length;

      return {
        name,
        listings,
        trendHistory: hasSufficientTrend ? trend.overallAverages : [],
        trendLabels: hasSufficientTrend ? trend.labels : [],
      };
    });

    const res = await saasAxios.post("/oracle/nexus/evaluate", {
      items: requestItems,
      options,
      nexusParams,
      batchId,
    });
    return res.data;
  },
);

// ── Trend Store IPCs ──────────────────────────────────────────────
ipcMain.handle("trend-store:get-stats", async () => {
  return trendStore.getStats();
});

ipcMain.handle("trend-store:prune", async (_, retentionDays?: number) => {
  return trendStore.pruneOldSnapshots(retentionDays || 30);
});

ipcMain.handle("trend-store:seed-mock-history", async (_, days?: number) => {
  return trendStore.seedMockHistory(priceCache, days || 14);
});

ipcMain.handle("trend-store:clear", async () => {
  return trendStore.clearAllSnapshots();
});

ipcMain.handle(
  "trend-store:set-simulated-date",
  async (_, date: string | null) => {
    trendStore.setSimulatedDate(date);
    return trendStore.getSimulatedDate();
  },
);

ipcMain.handle("trend-store:get-simulated-date", async () => {
  return trendStore.getSimulatedDate();
});

ipcMain.handle(
  "trend-store:get-history-batch",
  async (_, itemNames: string[], days?: number) => {
    return trendStore.getTrendHistoryBatch(itemNames, days || 14);
  },
);

// ── Oracle: store accepted prices (called by OracleDashboard after "Build Accepted Price") ──
ipcMain.handle(
  "oracle:store-accepted-prices",
  (_, map: typeof acceptedPriceMap) => {
    acceptedPriceMap = map;
    acceptedPriceTimestamp = new Date();
    try {
      const file = getStorePath("accepted-prices.json");
      fs.promises
        .writeFile(
          file,
          JSON.stringify({
            timestamp: acceptedPriceTimestamp.toISOString(),
            map,
          }),
        )
        .catch((e) => {
          console.warn(
            "[OracleIPC] Failed to save accepted prices to disk:",
            e,
          );
        });
    } catch (e) {
      console.warn(
        "[OracleIPC] Failed to schedule accepted prices disk write:",
        e,
      );
    }
    return {
      stored: Object.keys(map).length,
      storedAt: acceptedPriceTimestamp.toISOString(),
    };
  },
);

// ── Oracle: get accepted prices (called by market workstations) ──
ipcMain.handle("oracle:get-accepted-prices", () => ({
  map: acceptedPriceMap,
  itemCount: Object.keys(acceptedPriceMap).length,
  storedAt: acceptedPriceTimestamp?.toISOString() || null,
  isRestoredFromDisk: true,
}));

// ── Oracle: store listing prices (called by OracleDashboard after "Build Listing Prices") ──
ipcMain.handle(
  "oracle:store-listing-prices",
  (_, map: typeof listingPriceMap) => {
    listingPriceMap = map;
    listingPriceTimestamp = new Date();
    try {
      const file = getStorePath("listing-prices.json");
      fs.promises
        .writeFile(
          file,
          JSON.stringify({
            timestamp: listingPriceTimestamp.toISOString(),
            map,
          }),
        )
        .catch((e) => {
          console.warn("[OracleIPC] Failed to save listing prices to disk:", e);
        });
    } catch (e) {
      console.warn(
        "[OracleIPC] Failed to schedule listing prices disk write:",
        e,
      );
    }
    return {
      stored: Object.keys(map).length,
      storedAt: listingPriceTimestamp.toISOString(),
    };
  },
);

// ── Oracle: get listing prices (called by market workstations) ──
ipcMain.handle("oracle:get-listing-prices", () => ({
  map: listingPriceMap,
  itemCount: Object.keys(listingPriceMap).length,
  storedAt: listingPriceTimestamp?.toISOString() || null,
}));

// Export so skinsnipe.ipc can populate the cache
export {
  priceCache,
  cacheTimestamp,
  acceptedPriceMap,
  acceptedPriceTimestamp,
  listingPriceMap,
  listingPriceTimestamp,
};
export function setPriceCache(cache: typeof priceCache) {
  priceCache = cache;
  cacheTimestamp = new Date();
}
