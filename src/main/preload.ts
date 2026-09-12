import { contextBridge, ipcRenderer } from "electron";

/**
 * Clean helper function to invoke IPC channels and strip Electron's wrapper noise.
 * Converts: "Error occurred in handler for 'channel': Error: actual message"
 * into a clean: "actual message"
 */
async function safeInvoke<T>(channel: string, ...args: any[]): Promise<T> {
  try {
    return await ipcRenderer.invoke(channel, ...args);
  } catch (err: any) {
    let msg = err?.message || "An unexpected error occurred";

    // Strip Electron internal IPC handler prefix
    msg = msg.replace(/^Error occurred in handler for '[^']+':\s*/i, "");
    msg = msg.replace(/^Error:\s*/i, "");
    msg = msg.replace(/^Error:\s*/i, "");

    throw new Error(msg.trim());
  }
}

/**
 * This preload script is the ONLY bridge between the renderer (React)
 * and the main process (Node.js / Electron APIs).
 *
 * contextIsolation is enabled, so the renderer cannot access ipcRenderer directly.
 * All IPC calls go through this typed API exposed on window.electronAPI.
 */
contextBridge.exposeInMainWorld("electronAPI", {
  // ── Auth ──────────────────────────────────────────────────────
  auth: {
    register: (email: string) => safeInvoke("auth:register", email),
    verify: (email: string, code: string) =>
      safeInvoke("auth:verify", email, code),
    logout: () => safeInvoke("auth:logout"),
    getStatus: () => safeInvoke("auth:get-status"),
    onSessionExpired: (callback: () => void) => {
      const subscription = () => callback();
      ipcRenderer.on("auth:session-expired", subscription);
      return () => {
        ipcRenderer.removeListener("auth:session-expired", subscription);
      };
    },
  },

  // ── Settings / API Keys (stored on device, never sent to our server) ──
  settings: {
    setSkinsnipeKey: (key: string) =>
      safeInvoke("settings:set-skinsnipe-key", key),
    setCs2capKey: (key: string) => safeInvoke("settings:set-cs2cap-key", key),
    setCsfloatKey: (key: string) => safeInvoke("settings:set-csfloat-key", key),
    setSkinscomToken: (token: string) =>
      safeInvoke("settings:set-skinscom-token", token),
    setDmarketKeys: (publicKey: string, secretKey: string) =>
      safeInvoke("settings:set-dmarket-keys", publicKey, secretKey),
    revokeSkinsnipeKey: () => safeInvoke("settings:revoke-skinsnipe-key"),
    revokeCs2capKey: () => safeInvoke("settings:revoke-cs2cap-key"),
    revokeCsfloatKey: () => safeInvoke("settings:revoke-csfloat-key"),
    revokeSkinscomToken: () => safeInvoke("settings:revoke-skinscom-token"),
    revokeDmarketKeys: () => safeInvoke("settings:revoke-dmarket-keys"),
    getKeysStatus: () => safeInvoke("settings:get-keys-status"),
    // Returns { isEncrypted: boolean } — false means keys are stored as base64 (OS fallback)
    getEncryptionStatus: () =>
      safeInvoke<{ isEncrypted: boolean }>("settings:get-encryption-status"),
  },

  // ── Skinsnipe (fetch prices using trader's own key, from trader's device) ──
  skinsnipe: {
    fetchPrices: (targetMarkets?: string[]) =>
      safeInvoke("skinsnipe:fetch-prices", targetMarkets),
    cancelFetch: () => safeInvoke("skinsnipe:cancel-fetch"),
    onFetchProgress: (callback: (progress: any) => void) => {
      const subscription = (_: any, data: any) => callback(data);
      ipcRenderer.on("skinsnipe:fetch-progress", subscription);
      return () => {
        ipcRenderer.removeListener("skinsnipe:fetch-progress", subscription);
      };
    },
    getCache: () => safeInvoke("skinsnipe:get-cache"),
    getItem: (itemName: string) => safeInvoke("skinsnipe:get-item", itemName),
    getCacheStatus: () => safeInvoke("skinsnipe:get-cache-status"),
    loadCacheJson: (jsonContent: string) =>
      safeInvoke("skinsnipe:load-cache-json", jsonContent),
    loadDemoCache: (options?: { forceRefresh?: boolean }) =>
      safeInvoke("skinsnipe:load-demo-cache", options),
    onCacheStatusUpdated: (callback: any) => {
      const subscription = (_event: any, data: any) => callback(data);
      ipcRenderer.on("skinsnipe:cache-status-updated", subscription);
      return () => {
        ipcRenderer.removeListener(
          "skinsnipe:cache-status-updated",
          subscription,
        );
      };
    },
  },

  // ── CS2Cap (stream prices snapshot using trader's own key, from trader's device) ──
  cs2cap: {
    fetchPrices: (options?: { providers?: string[] }) =>
      safeInvoke("cs2cap:fetch-prices", options),
    cancelFetch: () => safeInvoke("cs2cap:cancel-fetch"),
    onStreamProgress: (callback: (progress: any) => void) => {
      const subscription = (_: any, data: any) => callback(data);
      ipcRenderer.on("cs2cap:fetch-progress", subscription);
      return () => {
        ipcRenderer.removeListener("cs2cap:fetch-progress", subscription);
      };
    },
    getStatus: () => safeInvoke("cs2cap:get-status"),
  },

  // ── Oracle (send price data to SaaS backend, store accepted & listing prices) ──
  oracle: {
    startBatch: (totalItems: number) =>
      safeInvoke<{
        batchId: string;
        totalItems: number;
        totalCostCents: number;
        freeCoveredCents: number;
        billableCents: number;
      }>("oracle:batch-start", totalItems),
    startNexusBatch: (totalItems: number) =>
      safeInvoke<{
        batchId: string;
        totalItems: number;
        totalCostCents: number;
        freeCoveredCents: number;
        billableCents: number;
      }>("oracle:nexus-batch-start", totalItems),
    finishBatch: (batchId: string, completedItems: number) =>
      safeInvoke<{
        batchId: string;
        totalItems: number;
        completedItems: number;
        unusedItems: number;
        refundedCents: number;
      }>("oracle:batch-finish", batchId, completedItems),
    evaluate: (items: any[], options?: any, batchId?: string) =>
      safeInvoke("oracle:evaluate", items, options, batchId),
    evaluateNexus: (
      items: any[],
      options?: any,
      nexusParams?: any,
      batchId?: string,
    ) =>
      safeInvoke("oracle:evaluate-nexus", items, options, nexusParams, batchId),
    // Store the accepted price map (called by OracleDashboard after "Build Accepted Price")
    storeAcceptedPrices: (
      map: Record<
        string,
        {
          acceptedPrice: number;
          supplyStabilityScore: number;
          isHyperStable: boolean;
          nexusDelta?: number;
          trendAdjustment?: number;
        }
      >,
    ) => safeInvoke("oracle:store-accepted-prices", map),
    // Get the accepted price map (called by market workstations like CSFloat, Skins.com)
    getAcceptedPrices: () => safeInvoke("oracle:get-accepted-prices"),
    // Store the listing price map (called by OracleDashboard after "Build Listing Prices")
    storeListingPrices: (
      map: Record<
        string,
        {
          listingPrice: number;
          mode: string;
          offsetPercent: number;
          lowestPrice: number;
          averagePrice: number;
        }
      >,
    ) => safeInvoke("oracle:store-listing-prices", map),
    // Get the listing price map (called when listing items)
    getListingPrices: () => safeInvoke("oracle:get-listing-prices"),
  },

  // ── Trend Store (Local SQLite Price Snapshots) ───────────────────
  trendStore: {
    getStats: () =>
      safeInvoke<{
        daysCount: number;
        totalSnapshots: number;
        itemCoverage: number;
        latestDate: string | null;
        oldestDate: string | null;
      }>("trend-store:get-stats"),
    getHistoryBatch: (itemNames: string[], days?: number) =>
      safeInvoke<
        Record<string, { labels: string[]; overallAverages: number[] }>
      >("trend-store:get-history-batch", itemNames, days),
    prune: (retentionDays?: number) =>
      safeInvoke<number>("trend-store:prune", retentionDays),
    seedMockHistory: (days?: number) =>
      safeInvoke<{ seededDays: number; totalSnapshots: number }>(
        "trend-store:seed-mock-history",
        days,
      ),
    clear: () => safeInvoke<number>("trend-store:clear"),
    setSimulatedDate: (date: string | null) =>
      safeInvoke<string | null>("trend-store:set-simulated-date", date),
    getSimulatedDate: () =>
      safeInvoke<string | null>("trend-store:get-simulated-date"),
  },

  // ── CSFloat (buy orders & listings fired directly from user's device) ──
  csfloat: {
    getMe: () => safeInvoke("csfloat:get-me"),
    getOrders: (page?: number, limit?: number) =>
      safeInvoke("csfloat:get-orders", page, limit),
    createBuyOrder: (
      marketHashName: string,
      maxPrice: number,
      quantity: number,
    ) =>
      safeInvoke(
        "csfloat:create-buy-order",
        marketHashName,
        maxPrice,
        quantity,
      ),
    updateOrder: (orderId: string, ...args: any[]) =>
      safeInvoke("csfloat:update-order", orderId, ...args),
    deleteOrder: (orderId: string) =>
      safeInvoke("csfloat:delete-order", orderId),
    getInventory: () => safeInvoke("csfloat:get-inventory"),
    createListing: (
      assetId: string,
      priceCents: number,
      privateMode: boolean,
    ) => safeInvoke("csfloat:create-listing", assetId, priceCents, privateMode),
    deleteListing: (listingId: string) =>
      safeInvoke("csfloat:delete-listing", listingId),
    updateListing: (
      listingId: string,
      priceCents: number,
      privateMode?: boolean,
    ) =>
      safeInvoke("csfloat:update-listing", listingId, priceCents, privateMode),
  },

  // ── App Helpers ────────────────────────────────────────────────
  app: {
    openExternal: (url: string) => safeInvoke("app:open-external", url),
  },

  // ── System Configuration ───────────────────────────────────────
  system: {
    getConfig: () => safeInvoke("system:get-config"),
    onForceMaintenance: (callback: () => void) => {
      const subscription = () => callback();
      ipcRenderer.on("app:force-maintenance", subscription);
      return () => {
        ipcRenderer.removeListener("app:force-maintenance", subscription);
      };
    },
    getVersionGateStatus: () => safeInvoke("system:get-version-gate"),
    onForceVersionBlock: (callback: (state: any) => void) => {
      const subscription = (_: any, data: any) => callback(data);
      ipcRenderer.on("app:force-version-block", subscription);
      return () => {
        ipcRenderer.removeListener("app:force-version-block", subscription);
      };
    },
    openReleases: () => safeInvoke("app:open-releases"),
  },

  // ── Auto Updater ──────────────────────────────────────────────
  updater: {
    checkForUpdates: () => safeInvoke("updater:check"),
    downloadUpdate: () => safeInvoke("updater:download"),
    quitAndInstall: () => safeInvoke("updater:quit-and-install"),
    onUpdateStatus: (callback: (state: any) => void) => {
      const subscription = (_: any, data: any) => callback(data);
      ipcRenderer.on("auto-updater:status", subscription);
      return () => {
        ipcRenderer.removeListener("auto-updater:status", subscription);
      };
    },
  },

  // ── Skins.com (buy orders fired directly from user's device) ──
  skinscom: {
    getOrders: () => safeInvoke("skinscom:get-orders"),
    createBuyOrder: (marketHashName: string, price: number) =>
      safeInvoke("skinscom:create-buy-order", marketHashName, price),
    deleteOrder: (orderId: string) =>
      safeInvoke("skinscom:delete-order", orderId),
  },

  // ── DMarket (targets & profile fired directly from user's device) ──
  dmarket: {
    getProfile: () => safeInvoke("dmarket:get-profile"),
    getBalance: () => safeInvoke("dmarket:get-balance"),
    getTargets: (params?: any) => safeInvoke("dmarket:get-targets", params),
    createTarget: (
      title: string,
      priceInUsd: number,
      amount?: number,
      attrs?: any,
    ) => safeInvoke("dmarket:create-target", title, priceInUsd, amount, attrs),
    deleteTarget: (targetId: string) =>
      safeInvoke("dmarket:delete-target", targetId),
    updateTarget: (
      oldTargetId: string,
      title: string,
      newPriceInUsd: number,
      amount?: number,
      attrs?: any,
    ) =>
      safeInvoke(
        "dmarket:update-target",
        oldTargetId,
        title,
        newPriceInUsd,
        amount,
        attrs,
      ),
    getClosedTargets: (limit?: number, cursor?: string) =>
      safeInvoke("dmarket:get-closed-targets", limit, cursor),
    getTargetsByTitle: (title: string) =>
      safeInvoke("dmarket:get-targets-by-title", title),
    getOffers: (params?: any) => safeInvoke("dmarket:get-offers", params),
    getInventory: (params?: any) => safeInvoke("dmarket:get-inventory", params),
    createOffers: (requests: any[]) =>
      safeInvoke("dmarket:create-offers", requests),
    updateOffers: (requests: any[]) =>
      safeInvoke("dmarket:update-offers", requests),
    deleteOffers: (requests: any[]) =>
      safeInvoke("dmarket:delete-offers", requests),
    getClosedOffers: (limit?: number, cursor?: string) =>
      safeInvoke("dmarket:get-closed-offers", limit, cursor),
    depositAssets: (assetIds: string[]) =>
      safeInvoke("dmarket:deposit-assets", assetIds),
    getDepositStatus: (depositId: string) =>
      safeInvoke("dmarket:get-deposit-status", depositId),
    syncUserInventory: () => safeInvoke("dmarket:sync-user-inventory"),
  },

  // ── Balance (user balance & transaction ledger) ──
  balance: {
    getBalance: () => safeInvoke("balance:get-balance"),
    getHistory: (page?: number, limit?: number, filters?: any) =>
      safeInvoke("balance:get-history", page, limit, filters),
  },
});
