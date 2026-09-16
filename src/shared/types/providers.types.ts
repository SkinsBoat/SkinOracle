// Market Data Provider & Aggregator Types (Skinsnipe, CS2Cap)

export type SkinsnipeMarketId =
  | "avanmarket"
  | "buffmarket"
  | "csgofloat"
  | "csmoney_p2p"
  | "csmoney_trade"
  | "cstrade"
  | "dmarket"
  | "exeskins"
  | "itradegg"
  | "lisskins"
  | "manncostore"
  | "market_csgo"
  | "merchanttf"
  | "rustskins"
  | "shadowpay"
  | "skinbaron"
  | "skinflow"
  | "skinland"
  | "skinport"
  | "skinsmonkey"
  | "skinswap"
  | "tradeitgg"
  | "tradeitgg_store"
  | "waxpeer"
  | "whitemarket";

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

export interface SkinsnipeFetchProgress {
  currentMarket: string;
  currentMarketIndex: number;
  totalMarkets: number;
  completedMarkets: number;
  errorCount: number;
  lastError: string | null;
  criticalError: string | null;
  status: "fetching" | "waiting" | "completed" | "aborted" | "error";
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
  source?: "local_cache" | "cloud_download" | "cloud_refreshed";
}

export interface Cs2CapStreamProgress {
  linesRead: number;
  itemsCount: number;
  providersCount: number;
  bytesReceived: number;
  elapsedMs: number;
  status: "connecting" | "streaming" | "completed" | "aborted" | "error";
  lastError: string | null;
  marketCounts?: Record<string, number>;
}

export interface Cs2CapFetchResult {
  success: boolean;
  itemCount: number;
  providersCount: number;
  fetchedAt: string;
  elapsedMs: number;
  aborted?: boolean;
  error?: string | null;
  marketCounts?: Record<string, number>;
}
