// Type definitions for the window.electronAPI bridge (defined in preload.ts)
// Import this in any renderer component to get full TypeScript intellisense.

import {
  SkinsnipeMarketId,
  SkinsnipeFetchProgress,
  SkinsnipeFetchResult,
  SkinsnipePriceCache,
  Cs2CapFetchResult,
  Cs2CapStreamProgress,
} from "./providers.types";
import {
  AcceptedPriceInfo,
  OracleBatchStartResult,
  OracleBatchFinishResult,
  OracleStrategyProfile,
  NexusStrategyProfile,
  OracleEvaluationResponse,
} from "./oracle.types";
import {
  CsFloatInventoryItem,
  ListingPriceInfo,
} from "./csfloat.types";
import {
  DmarketUserProfile,
  DmarketBalance,
  DmarketTargetItem,
  DmarketTargetAttrs,
  DmarketCreateTargetItemRequest,
  DmarketBatchCreateTargetsResponse,
  DmarketBatchDeleteTargetsResponse,
  DmarketOfferItem,
  DmarketInventoryItem,
  DmarketLastSalesParams,
  DmarketLastSalesResponse,
  DmarketAggregatedPricesRequest,
  DmarketAggregatedPricesResponse,
  DmarketMarketplaceOffersParams,
  DmarketMarketplaceOffersResponse,
  DmarketBuyOffersRequest,
  DmarketBuyOffersResponse,
  DmarketWithdrawAssetsRequest,
  DmarketWithdrawAssetsResponse,
  DmarketCustomizedFeesResponse,
  DmarketDepositBlockedTitlesResponse,
} from "./dmarket.types";
import {
  UpdateStatusState,
  VersionGateState,
  BalanceTransactionItem,
} from "./system.types";

export interface ElectronAPI {
  auth: {
    register: (email: string) => Promise<{ message: string }>;
    verify: (email: string, code: string) => Promise<{ accessToken: string }>;
    logout: () => Promise<{ success: boolean }>;
    getStatus: () => Promise<{ isLoggedIn: boolean }>;
    onSessionExpired?: (callback: () => void) => () => void;
  };
  settings: {
    setSkinsnipeKey: (key: string) => Promise<{ success: boolean }>;
    setCs2capKey: (key: string) => Promise<{ success: boolean }>;
    setCsfloatKey: (key: string) => Promise<{ success: boolean }>;
    setSkinscomToken: (token: string) => Promise<{ success: boolean }>;
    setDmarketKeys: (
      publicKey: string,
      secretKey: string,
    ) => Promise<{ success: boolean }>;
    revokeSkinsnipeKey: () => Promise<{ success: boolean }>;
    revokeCs2capKey: () => Promise<{ success: boolean }>;
    revokeCsfloatKey: () => Promise<{ success: boolean }>;
    revokeSkinscomToken: () => Promise<{ success: boolean }>;
    revokeDmarketKeys: () => Promise<{ success: boolean }>;
    getKeysStatus: () => Promise<{
      hasSkinsnipeKey: boolean;
      hasCs2capKey: boolean;
      hasCsfloatKey: boolean;
      hasSkinscomToken: boolean;
      hasDmarketKeys: boolean;
      hasJwt: boolean;
    }>;
    getEncryptionStatus: () => Promise<{ isEncrypted: boolean }>;
  };
  skinsnipe: {
    fetchPrices: (
      targetMarkets?: SkinsnipeMarketId[],
    ) => Promise<SkinsnipeFetchResult>;
    cancelFetch: () => Promise<{ success: boolean; message: string }>;
    onFetchProgress: (
      callback: (progress: SkinsnipeFetchProgress) => void,
    ) => () => void;
    getCache: () => Promise<SkinsnipePriceCache>;
    getItem: (itemName: string) => Promise<{
      n: string;
      l: { m: string; p: number; q?: number }[];
    } | null>;
    getCacheStatus: () => Promise<{
      itemCount: number;
      isFetching: boolean;
      lastFetchedAt: string | null;
      marketCounts?: Record<string, number>;
    }>;
    loadCacheJson: (jsonContent: string) => Promise<SkinsnipeFetchResult>;
    loadDemoCache: (options?: {
      forceRefresh?: boolean;
    }) => Promise<SkinsnipeFetchResult>;
    onCacheStatusUpdated?: (
      callback: (status: {
        itemCount: number;
        isFetching: boolean;
        lastFetchedAt: string | null;
        marketCounts?: Record<string, number>;
      }) => void,
    ) => () => void;
  };
  cs2cap: {
    fetchPrices: (options?: {
      providers?: string[];
    }) => Promise<Cs2CapFetchResult>;
    cancelFetch: () => Promise<{ success: boolean; message: string }>;
    onStreamProgress: (
      callback: (progress: Cs2CapStreamProgress) => void,
    ) => () => void;
    getStatus: () => Promise<{ isFetching: boolean }>;
  };
  oracle: {
    startBatch: (totalItems: number) => Promise<OracleBatchStartResult>;
    startNexusBatch: (totalItems: number) => Promise<OracleBatchStartResult>;
    finishBatch: (
      batchId: string,
      completedItems: number,
    ) => Promise<OracleBatchFinishResult>;
    evaluate: (
      items: string[],
      strategyProfile?: OracleStrategyProfile,
      batchId?: string,
    ) => Promise<OracleEvaluationResponse>;
    evaluateNexus: (
      items: string[],
      strategyProfile?: OracleStrategyProfile,
      nexusProfile?: NexusStrategyProfile,
      batchId?: string,
    ) => Promise<OracleEvaluationResponse>;
    storeAcceptedPrices: (
      map: Record<string, AcceptedPriceInfo>,
    ) => Promise<{ stored: number; storedAt: string }>;
    getAcceptedPrices: () => Promise<{
      map: Record<string, AcceptedPriceInfo>;
      itemCount: number;
      storedAt: string | null;
    }>;
    storeListingPrices: (
      map: Record<string, ListingPriceInfo>,
    ) => Promise<{ stored: number; storedAt: string }>;
    getListingPrices: () => Promise<{
      map: Record<string, ListingPriceInfo>;
      itemCount: number;
      storedAt: string | null;
    }>;
  };
  trendStore: {
    getStats: () => Promise<{
      daysCount: number;
      totalSnapshots: number;
      itemCoverage: number;
      latestDate: string | null;
      oldestDate: string | null;
    }>;
    getHistoryBatch: (
      itemNames: string[],
      days?: number,
    ) => Promise<
      Record<string, { labels: string[]; overallAverages: number[] }>
    >;
    prune: (retentionDays?: number) => Promise<number>;
    seedMockHistory: (
      days?: number,
    ) => Promise<{ seededDays: number; totalSnapshots: number }>;
    clear: () => Promise<number>;
    setSimulatedDate: (date: string | null) => Promise<string | null>;
    getSimulatedDate: () => Promise<string | null>;
    getDbPath: () => Promise<string>;
    revealInFolder: () => Promise<boolean>;
  };
  csfloat: {
    getMe: () => Promise<any>;
    getOrders: () => Promise<any>;
    createBuyOrder: (
      marketHashName: string,
      maxPriceCents: number,
      quantity: number,
    ) => Promise<any>;
    updateOrder: (
      orderId: string,
      marketHashName: string,
      maxPriceCents: number,
    ) => Promise<any>;
    deleteOrder: (orderId: string) => Promise<{ success: boolean }>;
    getInventory: () => Promise<CsFloatInventoryItem[]>;
    createListing: (
      assetId: string,
      priceCents: number,
      privateMode: boolean,
    ) => Promise<any>;
    deleteListing: (listingId: string) => Promise<{ success: boolean }>;
    updateListing: (
      listingId: string,
      priceCents: number,
      privateMode?: boolean,
    ) => Promise<any>;
  };
  app: {
    openExternal: (url: string) => Promise<void>;
    getVersion: () => Promise<string>;
  };
  system: {
    getConfig: () => Promise<any>;
    onForceMaintenance: (callback: () => void) => () => void;
    getVersionGateStatus: () => Promise<VersionGateState>;
    onForceVersionBlock: (
      callback: (state: VersionGateState) => void,
    ) => () => void;
    openReleases: () => Promise<void>;
  };
  updater: {
    checkForUpdates: () => Promise<{ success: boolean; message?: string }>;
    downloadUpdate: () => Promise<{ success: boolean; message?: string }>;
    quitAndInstall: () => Promise<void>;
    onUpdateStatus: (
      callback: (state: UpdateStatusState) => void,
    ) => () => void;
  };
  skinscom: {
    getOrders: () => Promise<any>;
    createBuyOrder: (marketHashName: string, price: number) => Promise<any>;
    deleteOrder: (orderId: string) => Promise<{ success: boolean }>;
  };
  dmarket: {
    getProfile: () => Promise<DmarketUserProfile>;
    getBalance: () => Promise<DmarketBalance>;
    getTargets: (params?: {
      fetchAll?: boolean;
      cursor?: string;
      limit?: number;
      title?: string;
      treeFilters?: string;
      priceFrom?: number;
      priceTo?: number;
      orderBy?: string;
      orderDir?: string;
    }) => Promise<{
      items: DmarketTargetItem[];
      total: string;
      cursor: string;
    }>;
    createTarget: (
      title: string,
      priceInUsd: number,
      amount?: number,
      attrs?: DmarketTargetAttrs,
    ) => Promise<any>;
    batchCreateTargets: (
      requests: DmarketCreateTargetItemRequest[],
    ) => Promise<DmarketBatchCreateTargetsResponse>;
    deleteTarget: (
      targetId: string,
    ) => Promise<{ success: boolean; result: any }>;
    batchDeleteTargets: (
      targetIds: string[],
    ) => Promise<DmarketBatchDeleteTargetsResponse>;
    updateTarget: (
      oldTargetId: string,
      title: string,
      newPriceInUsd: number,
      amount?: number,
      attrs?: DmarketTargetAttrs,
    ) => Promise<{
      success: boolean;
      newTargetId?: string;
      oldTargetId: string;
      updatedAt?: string;
      result?: any;
    }>;
    getClosedTargets: (
      limit?: number,
      cursor?: string,
    ) => Promise<{ trades: any[]; total: string; cursor: string }>;
    getTargetsByTitle: (title: string) => Promise<any[]>;
    getOffers: (params?: {
      fetchAll?: boolean;
      cursor?: string;
      limit?: number;
      title?: string;
      treeFilters?: string;
    }) => Promise<{ items: DmarketOfferItem[]; total: string; cursor: string }>;
    getInventory: (params?: {
      fetchAll?: boolean;
      cursor?: string;
      limit?: number;
      title?: string;
      treeFilters?: string;
    }) => Promise<{
      items: DmarketInventoryItem[];
      total: string;
      cursor: string;
    }>;
    createOffers: (
      requests: Array<{
        id?: string;
        assetId?: string;
        itemId?: string;
        isP2P?: boolean;
        listingMode?: "p2p" | "bot";
        priceCents?: number | string;
        priceUsd?: number | string;
      }>,
    ) => Promise<{
      offers: any[];
      failed: any[];
      success: boolean;
    }>;
    updateOffers: (
      requests: Array<{
        id: string;
        offerId?: string;
        isP2P?: boolean;
        listingMode?: "p2p" | "bot";
        priceCents?: number | string;
        priceUsd?: number | string;
      }>,
    ) => Promise<{
      offers: any[];
      failed: any[];
      success: boolean;
    }>;
    deleteOffers: (
      requests: Array<{
        id: string;
        offerId?: string;
        assetId?: string;
        isP2P?: boolean;
        listingMode?: "p2p" | "bot";
      }>,
    ) => Promise<{
      offers: any[];
      failed: any[];
      success: boolean;
    }>;
    getClosedOffers: (
      limit?: number,
      cursor?: string,
    ) => Promise<{ trades: any[]; total: string; cursor: string }>;
    depositAssets: (
      assetIds: Array<string | { inGameAssetId?: string; assetId?: string; id?: string }>,
    ) => Promise<{ DepositID: string }>;
    getDepositStatus: (depositId: string) => Promise<{
      DepositID: string;
      Status: string;
      Error?: string;
      Assets?: Array<{ InGameAssetID: string; DmarketAssetID: string }>;
      SteamDepositInfo?: { TradeOfferID: string; Message?: string };
    }>;
    syncUserInventory: () => Promise<any>;
    getLastSales: (params: DmarketLastSalesParams) => Promise<DmarketLastSalesResponse>;
    getAggregatedPrices: (
      request: DmarketAggregatedPricesRequest,
    ) => Promise<DmarketAggregatedPricesResponse>;
    getMarketplaceOffers: (
      params?: DmarketMarketplaceOffersParams,
    ) => Promise<DmarketMarketplaceOffersResponse>;
    buyOffers: (request: DmarketBuyOffersRequest) => Promise<DmarketBuyOffersResponse>;
    withdrawAssets: (
      request: DmarketWithdrawAssetsRequest,
    ) => Promise<DmarketWithdrawAssetsResponse>;
    getCustomizedFees: (
      gameId?: string,
      offerType?: "dmarket" | "p2p",
      limit?: number,
      offset?: number,
    ) => Promise<DmarketCustomizedFeesResponse>;
    getDepositBlockedTitles: (
      gameId?: string,
      limit?: number,
      cursor?: string,
    ) => Promise<DmarketDepositBlockedTitlesResponse>;
  };
  balance: {
    getBalance: () => Promise<{
      balanceCents: number;
      formattedBalance: string;
      dailyFreeAllowanceCents: number;
      dailyFreeRemainingCents: number;
    }>;
    getHistory: (
      page?: number,
      limit?: number,
      filters?: any,
    ) => Promise<{
      transactions: BalanceTransactionItem[];
      total: number;
      page: number;
      totalPages: number;
    }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
