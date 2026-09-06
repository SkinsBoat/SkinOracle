import { ipcMain } from 'electron';
import { saasAxios } from '../services/saasAxios';

// In-memory merged price cache (from Skinsnipe fetch)
// This is the same shape as SkinOracle priceCache: Record<name, { n, l[] }>
let priceCache: Record<string, { n: string; l: { m: string; p: number; q?: number }[] }> = {};

// In-memory accepted price map — populated by OracleDashboard "Build Accepted Price" action
// Consumed by all market workstations (CSFloat, Skins.com) without re-hitting the saas-api
let acceptedPriceMap: Record<string, { acceptedPrice: number; liquidityScore: number; isHyperLiquid: boolean }> = {};
let cacheTimestamp: Date | null = null;
let acceptedPriceTimestamp: Date | null = null;

// In-memory listing price map — populated by OracleDashboard "Build Listing Prices" action
let listingPriceMap: Record<string, { listingPrice: number; mode: string; offsetPercent: number; lowestPrice: number; averagePrice: number }> = {};
let listingPriceTimestamp: Date | null = null;

// ── Oracle: evaluate prices via our SaaS backend ──────────────────
//
// Flow:
//   1. Electron already has priceCache (filled by skinsnipe.ipc.ts)
//   2. For the requested items, extract their listings from priceCache
//   3. Send to our backend with optional SkinOracleOptions overrides
//   4. Return SkinOracleResult[] to renderer
//
ipcMain.handle('oracle:batch-start', async (_, totalItems: number) => {
  const res = await saasAxios.post('/oracle/batch/start', { totalItems });
  return res.data;
});

ipcMain.handle('oracle:batch-finish', async (_, batchId: string, completedItems: number) => {
  const res = await saasAxios.post('/oracle/batch/finish', { batchId, completedItems });
  return res.data;
});

ipcMain.handle('oracle:evaluate', async (_, items: string[], options?: any, batchId?: string) => {
  // Build request items from local price cache (strip any redundant/raw listing metadata)
  const requestItems = items.map(name => {
    const cached = priceCache[name];
    const listings = (cached?.l || []).map(l => ({
      m: l.m,
      p: l.p,
      ...(l.q !== undefined ? { q: l.q } : {}),
    }));
    return {
      name,
      listings,
    };
  });

  const res = await saasAxios.post('/oracle/evaluate', { items: requestItems, options, batchId });
  return res.data; // OracleEvaluateResponse
});

// ── Oracle: store accepted prices (called by OracleDashboard after "Build Accepted Price") ──
ipcMain.handle('oracle:store-accepted-prices', (_, map: typeof acceptedPriceMap) => {
  acceptedPriceMap = map;
  acceptedPriceTimestamp = new Date();
  return { stored: Object.keys(map).length, storedAt: acceptedPriceTimestamp.toISOString() };
});

// ── Oracle: get accepted prices (called by market workstations) ──
ipcMain.handle('oracle:get-accepted-prices', () => ({
  map: acceptedPriceMap,
  itemCount: Object.keys(acceptedPriceMap).length,
  storedAt: acceptedPriceTimestamp?.toISOString() || null,
}));

// ── Oracle: store listing prices (called by OracleDashboard after "Build Listing Prices") ──
ipcMain.handle('oracle:store-listing-prices', (_, map: typeof listingPriceMap) => {
  listingPriceMap = map;
  listingPriceTimestamp = new Date();
  return { stored: Object.keys(map).length, storedAt: listingPriceTimestamp.toISOString() };
});

// ── Oracle: get listing prices (called by market workstations) ──
ipcMain.handle('oracle:get-listing-prices', () => ({
  map: listingPriceMap,
  itemCount: Object.keys(listingPriceMap).length,
  storedAt: listingPriceTimestamp?.toISOString() || null,
}));

// Export so skinsnipe.ipc can populate the cache
export { priceCache, cacheTimestamp, acceptedPriceMap, acceptedPriceTimestamp, listingPriceMap, listingPriceTimestamp };
export function setPriceCache(cache: typeof priceCache) {
  priceCache = cache;
  cacheTimestamp = new Date();
}
