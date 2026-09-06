// Type definitions for the window.electronAPI bridge (defined in preload.ts)
// Import this in any renderer component to get full TypeScript intellisense.

export type SkinsnipeMarketId =
  | 'avanmarket'
  | 'csgofloat'
  | 'csmoney_p2p'
  | 'csmoney_trade'
  | 'cstrade'
  | 'dmarket'
  | 'exeskins'
  | 'itradegg'
  | 'lisskins'
  | 'manncostore'
  | 'market_csgo'
  | 'merchanttf'
  | 'rustskins'
  | 'shadowpay'
  | 'skinbaron'
  | 'skinflow'
  | 'skinland'
  | 'skinport'
  | 'skinsmonkey'
  | 'skinswap'
  | 'tradeitgg'
  | 'tradeitgg_store'
  | 'waxpeer'
  | 'whitemarket';

export interface PriceListing {
  m: string;
  p: number;
  q?: number;
}

export interface CachedItemData {
  n: string;
  l: PriceListing[];
}

export type SkinsnipePriceCache = Record<string, CachedItemData>;

export interface AcceptedPriceInfo {
  acceptedPrice: number;
  liquidityScore: number;
  isHyperLiquid: boolean;
}

export interface CsFloatInventoryItem {
  asset_id: string;
  market_hash_name: string;
  item_name?: string;
  wear_name?: string;
  float_value?: number;
  icon_url?: string;
  tradable?: number;
  listing_id?: string;
  price?: number; // price in cents if listed
  private?: boolean;
  reference?: {
    predicted_price?: number;
    quantity?: number;
  };
  [key: string]: any;
}

export interface ListingAnalysis {
  targetListingPrice: number;
  mode: string;
  offsetPercent: number;
  lowestPrice: number;
  averagePrice: number;
  currentPrice: number | null;
  isListed: boolean;
  drift: number;
  driftPercent: number;
  isActionRequired: boolean;
  isOverpriced: boolean;
  isUnderpriced: boolean;
}

export interface ListingPriceInfo {
  listingPrice: number;
  mode: string;
  offsetPercent: number;
  lowestPrice: number;
  averagePrice: number;
}

export interface DmarketTargetAttributes {
  categoryPath?: string;
  image?: string;
  title?: string;
  name?: string;
  cs2?: {
    category?: string;
    exterior?: string;
    phase?: string;
    paintSeed?: number;
    floatPart?: string;
    isAdvanced?: boolean;
  };
}

export interface DmarketTargetItem {
  targetId: string;
  title: string;
  amount: string;
  status: string; // e.g. "TARGET_STATUS_ACTIVE"
  priceCents: string; // e.g. "1550"
  attributes: DmarketTargetAttributes;
  createdAt: string;
  updatedAt: string;
}

export interface DmarketBalance {
  usd: string;
  usdAvailableToWithdraw: string;
  dmc: string;
  dmcAvailableToWithdraw: string;
  usdCents: number;
  usdFormatted: string;
}

export interface DmarketUserProfile {
  id: string;
  username: string;
  imageUrl?: string;
  settings?: {
    targetsLimit: number;
    tradingApiToken?: string;
  };
  [key: string]: any;
}

export interface DmarketOfferItem {
  id: string;
  assetId: string;
  title: string;
  priceCents: number;
  priceUsd: string;
  status: string;
  attributes?: any;
  imageUrl?: string;
  createdDate?: string | number;
  [key: string]: any;
}

export interface DmarketInventoryItem {
  assetId: string;
  inGameAssetId?: string;
  steamAssetId?: string;
  title: string;
  priceCents: number;
  priceUsd: string;
  tradable: boolean;
  inMarket: boolean;
  attributes?: any;
  imageUrl?: string;
  [key: string]: any;
}


export interface SkinsnipeFetchProgress {
  currentMarket: string;
  currentMarketIndex: number;
  totalMarkets: number;
  completedMarkets: number;
  errorCount: number;
  lastError: string | null;
  criticalError: string | null;
  status: 'fetching' | 'waiting' | 'completed' | 'aborted' | 'error';
  sleepRemaining?: number;
  marketCounts?: Record<string, number>;
}

export interface SkinsnipeFailedMarket {
  market: string;
  error: string;
  statusCode: number | null;
}

export interface SkinsnipeFetchResult {
  success: boolean;
  itemCount: number;
  fetchedAt: string;
  totalMarkets?: number;
  errorCount?: number;
  failedMarkets?: SkinsnipeFailedMarket[];
  aborted?: boolean;
  criticalError?: string | null;
  marketCounts?: Record<string, number>;
  source?: 'local_cache' | 'cloud_download' | 'cloud_refreshed';
}

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string | Array<{ version: string; note: string }>;
}

export interface UpdateProgressInfo {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export type UpdateStateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdateStatusState {
  status: UpdateStateStatus;
  info?: UpdateInfo | null;
  progress?: UpdateProgressInfo | null;
  error?: string | null;
}

export interface OracleBatchStartResult {
  batchId: string;
  totalItems: number;
  totalCostCents: number;
  freeCoveredCents: number;
  billableCents: number;
  expiresAt?: string;
}

export interface OracleBatchFinishResult {
  batchId: string;
  totalItems: number;
  completedItems: number;
  unusedItems: number;
  refundedCents: number;
}

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
    setCsfloatKey: (key: string) => Promise<{ success: boolean }>;
    setSkinscomToken: (token: string) => Promise<{ success: boolean }>;
    setDmarketKeys: (publicKey: string, secretKey: string) => Promise<{ success: boolean }>;
    revokeSkinsnipeKey: () => Promise<{ success: boolean }>;
    revokeCsfloatKey: () => Promise<{ success: boolean }>;
    revokeSkinscomToken: () => Promise<{ success: boolean }>;
    revokeDmarketKeys: () => Promise<{ success: boolean }>;
    getKeysStatus: () => Promise<{
      hasSkinsnipeKey: boolean;
      hasCsfloatKey: boolean;
      hasSkinscomToken: boolean;
      hasDmarketKeys: boolean;
      hasJwt: boolean;
    }>;
    getEncryptionStatus: () => Promise<{ isEncrypted: boolean }>;
  };
  skinsnipe: {
    fetchPrices: (targetMarkets?: SkinsnipeMarketId[]) => Promise<SkinsnipeFetchResult>;
    cancelFetch: () => Promise<{ success: boolean; message: string }>;
    onFetchProgress: (callback: (progress: SkinsnipeFetchProgress) => void) => () => void;
    getCache: () => Promise<SkinsnipePriceCache>;
    getCacheStatus: () => Promise<{ itemCount: number; isFetching: boolean; lastFetchedAt: string | null; marketCounts?: Record<string, number> }>;
    loadCacheJson: (jsonContent: string) => Promise<SkinsnipeFetchResult>;
    loadDemoCache: (options?: { forceRefresh?: boolean }) => Promise<SkinsnipeFetchResult>;
  };
  oracle: {
    startBatch: (totalItems: number) => Promise<OracleBatchStartResult>;
    finishBatch: (batchId: string, completedItems: number) => Promise<OracleBatchFinishResult>;
    evaluate: (items: string[], options?: object, batchId?: string) => Promise<{
      results: Array<{ name: string; oracle: any | null }>;
      usageCount: number;
      dailyRemaining: number;
    }>;
    storeAcceptedPrices: (map: Record<string, AcceptedPriceInfo>) => Promise<{ stored: number; storedAt: string }>;
    getAcceptedPrices: () => Promise<{ map: Record<string, AcceptedPriceInfo>; itemCount: number; storedAt: string | null }>;
    storeListingPrices: (map: Record<string, ListingPriceInfo>) => Promise<{ stored: number; storedAt: string }>;
    getListingPrices: () => Promise<{ map: Record<string, ListingPriceInfo>; itemCount: number; storedAt: string | null }>;
  };
  csfloat: {
    getMe: () => Promise<any>;
    getOrders: () => Promise<any>;
    createBuyOrder: (marketHashName: string, maxPriceCents: number, quantity: number) => Promise<any>;
    updateOrder: (orderId: string, marketHashName: string, maxPriceCents: number) => Promise<any>;
    deleteOrder: (orderId: string) => Promise<{ success: boolean }>;
    getInventory: () => Promise<CsFloatInventoryItem[]>;
    createListing: (assetId: string, priceCents: number, privateMode: boolean) => Promise<any>;
    deleteListing: (listingId: string) => Promise<{ success: boolean }>;
    updateListing: (listingId: string, priceCents: number, privateMode?: boolean) => Promise<any>;
  };

  app: {
    openExternal: (url: string) => Promise<void>;
  };
  system: {
    getConfig: () => Promise<any>;
    onForceMaintenance: (callback: () => void) => () => void;
  };
  updater: {
    checkForUpdates: () => Promise<{ success: boolean; message?: string }>;
    downloadUpdate: () => Promise<{ success: boolean; message?: string }>;
    quitAndInstall: () => Promise<void>;
    onUpdateStatus: (callback: (state: UpdateStatusState) => void) => () => void;
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
      priceFrom?: number;
      priceTo?: number;
      orderBy?: string;
      orderDir?: string;
    }) => Promise<{ items: DmarketTargetItem[]; total: string; cursor: string }>;
    createTarget: (title: string, priceInUsd: number, amount?: number, attrs?: any) => Promise<any>;
    deleteTarget: (targetId: string) => Promise<{ success: boolean; result: any }>;
    updateTarget: (oldTargetId: string, title: string, newPriceInUsd: number, amount?: number, attrs?: any) => Promise<{
      success: boolean;
      newTargetId?: string;
      oldTargetId: string;
    }>;
    getClosedTargets: (limit?: number, cursor?: string) => Promise<{ trades: any[]; total: string; cursor: string }>;
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
    }) => Promise<{ items: DmarketInventoryItem[]; total: string; cursor: string }>;
    createOffers: (requests: Array<{ assetId: string; priceCents?: number | string; priceUsd?: number | string }>) => Promise<{
      offers: any[];
      failed: any[];
      success: boolean;
    }>;
    updateOffers: (requests: Array<{ id: string; priceCents?: number | string; priceUsd?: number | string }>) => Promise<{
      offers: any[];
      failed: any[];
      success: boolean;
    }>;
    deleteOffers: (requests: Array<{ id: string; assetId?: string }>) => Promise<{
      offers: any[];
      failed: any[];
      success: boolean;
    }>;
    getClosedOffers: (limit?: number, cursor?: string) => Promise<{ trades: any[]; total: string; cursor: string }>;
    depositAssets: (assetIds: string[]) => Promise<{ DepositID: string }>;
    getDepositStatus: (depositId: string) => Promise<{
      DepositID: string;
      Status: string;
      Error?: string;
      Assets?: Array<{ InGameAssetID: string; DmarketAssetID: string }>;
      SteamDepositInfo?: { TradeOfferID: string; Message?: string };
    }>;
    syncUserInventory: () => Promise<any>;
  };
  balance: {
    getBalance: () => Promise<{
      balanceCents: number;
      formattedBalance: string;
      dailyFreeAllowanceCents: number;
      dailyFreeRemainingCents: number;
    }>;
    getHistory: (page?: number, limit?: number, filters?: any) => Promise<{
      transactions: Array<{
        id: string;
        type: 'credit' | 'debit';
        category: string;
        amountCents: number;
        balanceAfterCents: number;
        description: string;
        referenceId: string | null;
        createdAt: string;
      }>;
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
