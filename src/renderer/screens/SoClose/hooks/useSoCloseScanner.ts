import { useState, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import { useOracleStore } from "../../../store/useOracleStore";
import { SoCloseResultItem } from "../../../../shared/types";
import {
  toCanonicalMarketId,
  getMarketDisplayName,
  isMarketMatch,
  isTradeMarket,
} from "../../../../shared/canonicalMarkets";
import { makeSnoozeKey, useSnoozeStore } from "./useSnoozeStore";

export type AllowedWears = {
  fn: boolean;
  mw: boolean;
  ft: boolean;
  ww: boolean;
  bs: boolean;
  souvenir: boolean;
  sticker: boolean;
};

export type PersistedScannerParams = {
  minPrice: string;
  maxPrice: string;
  soCloseMaxCloseness: string;
  soCloseMinSssScore: string;
  allowedWears: AllowedWears;
};

export interface SoCloseCacheStatus {
  itemCount: number;
  isFetching: boolean;
  lastFetchedAt: string | null;
}

export interface SoCloseAcceptedMeta {
  itemCount: number;
  storedAt: string | null;
}

export interface SoCloseScanSummary {
  matches: number;
  checked: number;
  scannedAt: string | null;
}

export const SOCLOSE_SCANNER_PARAMS_KEY = "soclose_scanner_params";

export const DEFAULT_SCANNER_PARAMS: PersistedScannerParams = {
  minPrice: "1",
  maxPrice: "250",
  soCloseMaxCloseness: "1.08",
  soCloseMinSssScore: "1.2",
  allowedWears: {
    fn: true,
    mw: true,
    ft: true,
    ww: true,
    bs: true,
    souvenir: true,
    sticker: true,
  },
};

export function loadScannerParams(): PersistedScannerParams {
  try {
    const saved = localStorage.getItem(SOCLOSE_SCANNER_PARAMS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        return {
          ...DEFAULT_SCANNER_PARAMS,
          ...parsed,
          allowedWears: {
            ...DEFAULT_SCANNER_PARAMS.allowedWears,
            ...(parsed.allowedWears && typeof parsed.allowedWears === "object"
              ? parsed.allowedWears
              : {}),
          },
        };
      }
    }
  } catch (e) {}
  return { ...DEFAULT_SCANNER_PARAMS };
}

/**
 * Owns all SoClose scanner state: price-cache status, market discovery,
 * persisted scanner parameters, and the universal opportunity scan.
 */
export function useSoCloseScanner() {
  const { selectedMarkets: buildMarkets } = useOracleStore();
  const { snoozeItem, unsnoozeItem, isSnoozeItemActive } = useSnoozeStore();

  const [cacheStatus, setCacheStatus] = useState<SoCloseCacheStatus>({
    itemCount: 0,
    isFetching: false,
    lastFetchedAt: null,
  });

  const [acceptedMeta, setAcceptedMeta] = useState<SoCloseAcceptedMeta | null>(
    null,
  );

  const [soCloseResults, setSoCloseResults] = useState<SoCloseResultItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSummary, setScanSummary] = useState<SoCloseScanSummary>({
    matches: 0,
    checked: 0,
    scannedAt: null,
  });

  const [cachedMarkets, setCachedMarkets] = useState<string[]>([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState<boolean>(true);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  const [selectedFilterMarkets, setSelectedFilterMarkets] = useState<string[]>(
    () => {
      try {
        const saved = localStorage.getItem("soclose_selected_filter_markets");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
      return ["ALL"];
    },
  );

  const [hideTradeMarkets, setHideTradeMarkets] = useState<boolean>(() => {
    try {
      return localStorage.getItem("soclose_hide_trade_markets") === "true";
    } catch (e) {
      return false;
    }
  });

  const [minPrice, setMinPrice] = useState<string>(
    () => loadScannerParams().minPrice,
  );
  const [maxPrice, setMaxPrice] = useState<string>(
    () => loadScannerParams().maxPrice,
  );
  const [soCloseMaxCloseness, setSoCloseMaxCloseness] = useState<string>(
    () => loadScannerParams().soCloseMaxCloseness,
  );
  const [soCloseMinSssScore, setSoCloseMinSssScore] = useState<string>(
    () => loadScannerParams().soCloseMinSssScore,
  );
  const [allowedWears, setAllowedWears] = useState<AllowedWears>(
    () => loadScannerParams().allowedWears,
  );

  // Persist scanner parameter choices locally so they survive app restarts
  useEffect(() => {
    try {
      localStorage.setItem(
        SOCLOSE_SCANNER_PARAMS_KEY,
        JSON.stringify({
          minPrice,
          maxPrice,
          soCloseMaxCloseness,
          soCloseMinSssScore,
          allowedWears,
        }),
      );
    } catch (e) {
      console.error("Failed to save soclose scanner params:", e);
    }
  }, [
    minPrice,
    maxPrice,
    soCloseMaxCloseness,
    soCloseMinSssScore,
    allowedWears,
  ]);

  // Available markets extracted strictly from local cached price data
  const availableMarkets = useMemo(() => {
    if (cacheStatus.itemCount === 0) return [];
    const marketSet = new Set<string>();
    if (cachedMarkets) {
      cachedMarkets.forEach((m) => marketSet.add(m));
    }
    soCloseResults.forEach((res) => {
      if (res.market) {
        marketSet.add(toCanonicalMarketId(res.market) || res.market);
      }
    });
    return Array.from(marketSet);
  }, [cacheStatus.itemCount, cachedMarkets, soCloseResults]);

  const isAllSelected = useMemo(() => {
    if (availableMarkets.length === 0) return false;
    return (
      selectedFilterMarkets.includes("ALL") ||
      availableMarkets.every((m) =>
        selectedFilterMarkets.some((sel) => isMarketMatch(sel, m)),
      )
    );
  }, [selectedFilterMarkets, availableMarkets]);

  const tradeCount = useMemo(
    () => availableMarkets.filter((m) => isTradeMarket(m)).length,
    [availableMarkets],
  );

  const visibleMarkets = useMemo(
    () =>
      hideTradeMarkets
        ? availableMarkets.filter((m) => !isTradeMarket(m))
        : availableMarkets,
    [availableMarkets, hideTradeMarkets],
  );

  const selectedCount = useMemo(() => {
    if (visibleMarkets.length === 0) return 0;
    if (isAllSelected) return visibleMarkets.length;
    return visibleMarkets.filter((m) =>
      selectedFilterMarkets.some((sel) => isMarketMatch(sel, m)),
    ).length;
  }, [isAllSelected, visibleMarkets, selectedFilterMarkets]);

  const refreshStatuses = async () => {
    if (window.electronAPI?.marketCache) {
      try {
        const status: any = await window.electronAPI.marketCache.getStatus();
        if (status) {
          setCacheStatus((prev) => ({
            ...prev,
            ...status,
            isFetching: status.isFetching ?? false,
          }));
        }
      } catch (e) {}
    }

    if (window.electronAPI?.oracle) {
      try {
        const res: any = await window.electronAPI.oracle.getAcceptedPrices();
        if (res) {
          setAcceptedMeta({
            itemCount: res.itemCount ?? 0,
            storedAt: res.storedAt || null,
          });
        }
      } catch (e) {}
    }
  };

  const handleManualRefreshStatus = async () => {
    setIsRefreshingStatus(true);
    try {
      await refreshStatuses();
      toast.success("Refreshed price cache & accepted prices data status!", {
        id: "status-refresh",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  useEffect(() => {
    refreshStatuses();

    const interval = setInterval(() => {
      refreshStatuses();
    }, 10000);

    const unsub = window.electronAPI?.marketCache?.onStatusUpdated?.(
      (status) => {
        if (status) {
          setCacheStatus((prev) => ({
            ...prev,
            ...status,
            isFetching: status.isFetching ?? false,
          }));
        }
      },
    );

    return () => {
      clearInterval(interval);
      unsub?.();
    };
  }, []);

  // Inspect local price cache data to extract all available markets
  useEffect(() => {
    let isMounted = true;
    const extractCachedMarkets = async () => {
      if (cacheStatus.itemCount === 0) {
        if (isMounted) {
          setCachedMarkets([]);
          setIsLoadingMarkets(false);
        }
        return;
      }

      if (cachedMarkets.length === 0) {
        setIsLoadingMarkets(true);
      }
      try {
        if (!window.electronAPI?.marketCache?.get) {
          if (isMounted) {
            setCachedMarkets([]);
            setIsLoadingMarkets(false);
          }
          return;
        }
        const cache = await window.electronAPI.marketCache.get();
        if (
          !cache ||
          typeof cache !== "object" ||
          Object.keys(cache).length === 0
        ) {
          if (isMounted) {
            setCachedMarkets([]);
            setIsLoadingMarkets(false);
          }
          return;
        }

        const foundMarkets = new Set<string>();
        for (const itemKey of Object.keys(cache)) {
          const item = cache[itemKey];
          if (item && Array.isArray(item.l)) {
            for (const listing of item.l) {
              if (listing && listing.m) {
                foundMarkets.add(
                  toCanonicalMarketId(listing.m) || listing.m,
                );
              }
            }
          }
        }

        if (isMounted) {
          setCachedMarkets(
            foundMarkets.size > 0 ? Array.from(foundMarkets) : [],
          );
        }
      } catch (err) {
        console.warn(
          "[useSoCloseScanner] Failed to extract markets from price cache:",
          err,
        );
        if (isMounted) setCachedMarkets([]);
      } finally {
        if (isMounted) setIsLoadingMarkets(false);
      }
    };

    extractCachedMarkets();
    return () => {
      isMounted = false;
    };
  }, [cacheStatus?.lastFetchedAt, cacheStatus?.itemCount]);

  const handleToggleHideTrade = (hide: boolean) => {
    setHideTradeMarkets(hide);
    try {
      localStorage.setItem("soclose_hide_trade_markets", String(hide));
    } catch (e) {}
  };

  const handleSoloMarketFilter = (marketId: string) => {
    const solo = [marketId];
    setSelectedFilterMarkets(solo);
    try {
      localStorage.setItem(
        "soclose_selected_filter_markets",
        JSON.stringify(solo),
      );
    } catch (e) {}
    toast.success(`Solo isolated: ${getMarketDisplayName(marketId)}`, {
      id: "solo-market-toast",
      duration: 2000,
    });
  };

  const handleSelectAllMarkets = () => {
    setSelectedFilterMarkets(["ALL"]);
    try {
      localStorage.setItem(
        "soclose_selected_filter_markets",
        JSON.stringify(["ALL"]),
      );
    } catch (e) {}
  };

  const handleDeselectAllMarkets = () => {
    setSelectedFilterMarkets([]);
    try {
      localStorage.setItem(
        "soclose_selected_filter_markets",
        JSON.stringify([]),
      );
    } catch (e) {}
  };

  const handleToggleMarketFilter = (marketId: string) => {
    setSelectedFilterMarkets((prev) => {
      const current = prev.includes("ALL") ? [...availableMarkets] : [...prev];
      const exists = current.some((m) => isMarketMatch(m, marketId));
      let updated: string[];
      if (exists) {
        updated = current.filter((m) => !isMarketMatch(m, marketId));
      } else {
        updated = [...current, marketId];
      }
      if (updated.length === availableMarkets.length) {
        updated = ["ALL"];
      }
      try {
        localStorage.setItem(
          "soclose_selected_filter_markets",
          JSON.stringify(updated),
        );
      } catch (e) {
        console.error("Failed to save soclose filter markets:", e);
      }
      return updated;
    });
  };

  const runUniversalSoCloseScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    const toastId = toast.loading(
      "Running SoClose universal opportunity scan...",
    );

    try {
      const acceptedRes: any = await (
        window.electronAPI.oracle as any
      ).getAcceptedPrices();
      if (
        !acceptedRes ||
        !acceptedRes.map ||
        Object.keys(acceptedRes.map).length === 0
      ) {
        toast.error(
          "No accepted prices found in memory. Please calculate accepted prices in Oracle Step 2 first.",
          { id: toastId },
        );
        return;
      }

      const priceCache: Record<string, any> =
        await window.electronAPI.marketCache.get();

      if (!priceCache || Object.keys(priceCache).length === 0) {
        toast.error(
          "Market price cache is empty. Please scan or load market prices first.",
          { id: toastId },
        );
        return;
      }

      const minP = Math.max(0, parseFloat(minPrice) || 0);
      const maxP = Math.max(0, parseFloat(maxPrice) || 999999);
      const maxCloseness = Math.max(
        1.0,
        parseFloat(soCloseMaxCloseness) || 1.08,
      );
      const minSss = parseFloat(soCloseMinSssScore) || 0;

      const targetMarkets = isAllSelected
        ? availableMarkets
        : selectedFilterMarkets;

      const foundResults: SoCloseResultItem[] = [];
      let checkedItems = 0;

      for (const itemName of Object.keys(priceCache)) {
        const cacheItem = priceCache[itemName];
        if (!cacheItem || !cacheItem.l || !Array.isArray(cacheItem.l)) continue;
        checkedItems++;

        const acceptedEntry =
          acceptedRes.map[itemName] || acceptedRes.map[itemName.trim()];
        if (!acceptedEntry) continue;

        const acceptedPrice = acceptedEntry.acceptedPrice;
        if (!acceptedPrice || acceptedPrice <= 0) continue;

        const sss = acceptedEntry.supplyStabilityScore ?? 1.5;
        if (sss < minSss) continue;

        const nameLower = itemName.toLowerCase();
        if (nameLower.includes("souvenir") && !allowedWears.souvenir) continue;
        if (nameLower.includes("sticker |") && !allowedWears.sticker) continue;
        if (nameLower.includes("(factory new)") && !allowedWears.fn) continue;
        if (nameLower.includes("(minimal wear)") && !allowedWears.mw) continue;
        if (nameLower.includes("(field-tested)") && !allowedWears.ft) continue;
        if (nameLower.includes("(well-worn)") && !allowedWears.ww) continue;
        if (nameLower.includes("(battle-scarred)") && !allowedWears.bs)
          continue;

        for (const listing of cacheItem.l) {
          if (!listing || typeof listing.p !== "number" || listing.p <= 0)
            continue;
          const canonicalM = toCanonicalMarketId(listing.m);

          const matchesMarket = targetMarkets.some(
            (targetM) =>
              isMarketMatch(canonicalM, targetM) ||
              isMarketMatch(listing.m, targetM),
          );
          if (!matchesMarket) continue;

          const marketPrice = listing.p;
          if (marketPrice < minP || marketPrice > maxP) continue;

          const closeness = marketPrice / acceptedPrice;

          if (closeness <= maxCloseness) {
            foundResults.push({
              name: itemName,
              acceptedPrice,
              currentMarketPrice: marketPrice,
              closeness: parseFloat(closeness.toFixed(4)),
              closenessPercent: parseFloat(((closeness - 1) * 100).toFixed(1)),
              market: canonicalM || listing.m,
              iconUrl:
                cacheItem.icon_url ||
                cacheItem.iconUrl ||
                (acceptedEntry as any)?.icon_url ||
                (acceptedEntry as any)?.iconUrl,
              trendMomentum14d: (acceptedEntry as any)?.trendMomentum14d,
              supplyStabilityScore: sss,
            });
          }
        }
      }

      // De-duplicate if multiple listings match same name & market (keep lowest market price)
      const uniqueMap = new Map<string, SoCloseResultItem>();
      for (const item of foundResults) {
        const key = `${item.name}__${item.market}`;
        const existing = uniqueMap.get(key);
        if (
          !existing ||
          item.currentMarketPrice < existing.currentMarketPrice
        ) {
          uniqueMap.set(key, item);
        }
      }

      const deduplicated = Array.from(uniqueMap.values());
      deduplicated.sort((a, b) => a.closeness - b.closeness);

      setSoCloseResults(deduplicated);
      setScanSummary({
        matches: deduplicated.length,
        checked: checkedItems,
        scannedAt: new Date().toISOString(),
      });
      toast.success(
        `Scanned ${targetMarkets.length} market(s): Found ${deduplicated.length} SoClose deals!`,
        { id: toastId },
      );
    } catch (err: any) {
      console.error("[useSoCloseScanner] Scan error:", err);
      toast.error(`SoClose scan failed: ${err.message}`, { id: toastId });
    } finally {
      setIsScanning(false);
    }
  };

  // Filter Results for UI Rendering (fixed default ordering: closest to ceiling first)
  const processedResults = useMemo(() => {
    let list = soCloseResults.filter(
      (item) => !isSnoozeItemActive(makeSnoozeKey(item)),
    );

    if (!isAllSelected) {
      list = list.filter((item) =>
        selectedFilterMarkets.some((m) => isMarketMatch(item.market, m)),
      );
    }

    list.sort((a, b) => a.closeness - b.closeness);
    return list;
  }, [
    soCloseResults,
    selectedFilterMarkets,
    isAllSelected,
    isSnoozeItemActive,
  ]);

  const activeSnoozeCount = useMemo(
    () =>
      soCloseResults.filter((item) => isSnoozeItemActive(makeSnoozeKey(item)))
        .length,
    [soCloseResults, isSnoozeItemActive],
  );

  // Market Breakdown Counts
  const marketCountsMap = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of soCloseResults) {
      const m = item.market || "unknown";
      counts[m] = (counts[m] || 0) + 1;
    }
    return counts;
  }, [soCloseResults]);

  const getMarketCount = (marketId: string) => {
    if (marketCountsMap[marketId]) return marketCountsMap[marketId];
    const canonical = toCanonicalMarketId(marketId);
    if (canonical && marketCountsMap[canonical]) {
      return marketCountsMap[canonical];
    }
    for (const [key, count] of Object.entries(marketCountsMap)) {
      if (isMarketMatch(key, marketId)) return count;
    }
    return 0;
  };

  return {
    // data
    cacheStatus,
    acceptedMeta,
    soCloseResults,
    processedResults,
    availableMarkets,
    visibleMarkets,
    selectedFilterMarkets,
    hideTradeMarkets,
    isScanning,
    isLoadingMarkets,
    isRefreshingStatus,
    isAllSelected,
    tradeCount,
    selectedCount,
    scanSummary,
    activeSnoozeCount,
    // params
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    soCloseMaxCloseness,
    setSoCloseMaxCloseness,
    soCloseMinSssScore,
    setSoCloseMinSssScore,
    allowedWears,
    setAllowedWears,
    // actions
    refreshStatuses,
    handleManualRefreshStatus,
    handleToggleHideTrade,
    handleSoloMarketFilter,
    handleSelectAllMarkets,
    handleDeselectAllMarkets,
    handleToggleMarketFilter,
    runUniversalSoCloseScan,
    getMarketCount,
    buildMarkets,
    // snooze
    snoozeItem,
    unsnoozeItem,
    isSnoozeItemActive,
  };
}
