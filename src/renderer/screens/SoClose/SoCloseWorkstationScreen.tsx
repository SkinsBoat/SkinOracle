import React, { useState, useMemo, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Target,
  RefreshCw,
  Search,
  ExternalLink,
  Copy,
  Layers,
  ArrowUpDown,
  Sparkles,
  CheckCircle2,
  Eye,
  Database,
  Sliders,
  Info,
} from "lucide-react";
import { useOracleStore } from "../../store/useOracleStore";
import { SkinsnipeMarketId, SoCloseResultItem } from "../../../shared/types";
import {
  toCanonicalMarketId,
  getMarketDisplayName,
  isMarketMatch,
  isTradeMarket,
} from "../../../shared/canonicalMarkets";
import {
  MarketSelectionToolbar,
  MarketSelectionChip,
} from "../Oracle/components/step1/Step1Common";
import { MarketLogo } from "../../components/MarketLogo";
import { CopyMarketHashButton } from "../../components/CopyMarketHashButton";
import { TrendSparkline } from "../../components/TrendSparkline";
import { SkinImage } from "../../components/SkinImage";
import { getMarketItemUrl } from "../../utils/marketUrls";
import { SKINSNIPE_AVAILABLE_MARKETS } from "../Oracle/components/Step1MarketCache";
import {
  CSFloatLookupModal,
  LookupModalItemData,
} from "../CSFloat/modals/CSFloatLookupModal";
import { formatTimeAgo } from "../Oracle/utils/oracleUtils";

export default function SoCloseWorkstationScreen() {
  const { selectedMarkets } = useOracleStore();

  const [cacheStatus, setCacheStatus] = useState<{
    itemCount: number;
    isFetching: boolean;
    lastFetchedAt: string | null;
  }>({ itemCount: 0, isFetching: false, lastFetchedAt: null });

  const [evaluatedSummary, setEvaluatedSummary] = useState<{
    totalEvaluated: number;
    soCloseCount: number;
    highSssCount: number;
    isBatchEvaluating: boolean;
    lastBuiltAt: string | null;
  }>({
    totalEvaluated: 0,
    soCloseCount: 0,
    highSssCount: 0,
    isBatchEvaluating: false,
    lastBuiltAt: null,
  });

  const [soCloseResults, setSoCloseResults] = useState<SoCloseResultItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lookupModalItem, setLookupModalItem] =
    useState<LookupModalItemData | null>(null);

  const handleOpenLookupModal = async (
    name: string,
    acceptedPrice?: number,
    marketPrice?: number,
    iconUrl?: string,
    market?: string,
  ) => {
    setLookupModalItem({ name, acceptedPrice, marketPrice, iconUrl, market });
    try {
      if (window.electronAPI?.skinsnipe?.getCache) {
        const cache = await window.electronAPI.skinsnipe.getCache();
        const cacheItem = cache ? cache[name] || cache[name.trim()] : null;
        if (cacheItem) {
          setLookupModalItem((prev) =>
            prev && prev.name === name ? { ...prev, cacheItem } : prev,
          );
        }
      }
    } catch (err) {
      console.error(
        "[SoCloseWorkstationScreen] Failed to load cache for lookup modal:",
        err,
      );
    }
  };
  const [cachedMarkets, setCachedMarkets] = useState<string[]>([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState<boolean>(true);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);

  // Live 15-second tick to keep relative timestamps ("just now", "2m ago") dynamically advancing
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  // Available markets extracted directly from local cached price data
  const availableMarkets = useMemo(() => {
    const marketSet = new Set<string>();

    if (
      cachedMarkets &&
      Array.isArray(cachedMarkets) &&
      cachedMarkets.length > 0
    ) {
      cachedMarkets.forEach((m) => marketSet.add(m));
    }

    if (soCloseResults && Array.isArray(soCloseResults)) {
      soCloseResults.forEach((res) => {
        if (res.market) {
          const canonical = toCanonicalMarketId(res.market) || res.market;
          marketSet.add(canonical);
        }
      });
    }

    if (marketSet.size === 0) {
      if (selectedMarkets && selectedMarkets.length > 0) {
        selectedMarkets.forEach((m) => marketSet.add(m));
      } else {
        SKINSNIPE_AVAILABLE_MARKETS.forEach((m) => marketSet.add(m.id));
      }
    }

    return Array.from(marketSet);
  }, [cachedMarkets, selectedMarkets, soCloseResults]);

  // Filter & Scanner Config States
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

  const handleToggleHideTrade = (hide: boolean) => {
    setHideTradeMarkets(hide);
    try {
      localStorage.setItem("soclose_hide_trade_markets", String(hide));
    } catch (e) {}
  };

  const isAllSelected = useMemo(() => {
    return (
      selectedFilterMarkets.includes("ALL") ||
      (availableMarkets.length > 0 &&
        availableMarkets.every((m) =>
          selectedFilterMarkets.some((sel) => isMarketMatch(sel, m)),
        ))
    );
  }, [selectedFilterMarkets, availableMarkets]);

  const tradeCount = useMemo(() => {
    return availableMarkets.filter((m) => isTradeMarket(m)).length;
  }, [availableMarkets]);

  const visibleMarkets = useMemo(() => {
    return hideTradeMarkets
      ? availableMarkets.filter((m) => !isTradeMarket(m))
      : availableMarkets;
  }, [availableMarkets, hideTradeMarkets]);

  const selectedCount = useMemo(() => {
    if (isAllSelected) return visibleMarkets.length;
    return visibleMarkets.filter((m) =>
      selectedFilterMarkets.some((sel) => isMarketMatch(sel, m)),
    ).length;
  }, [isAllSelected, visibleMarkets, selectedFilterMarkets]);

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

  const [minPrice, setMinPrice] = useState<string>("1");
  const [maxPrice, setMaxPrice] = useState<string>("250");
  const [soCloseMaxCloseness, setSoCloseMaxCloseness] =
    useState<string>("1.08"); // 8% distance ceiling
  const [soCloseMinSssScore, setSoCloseMinSssScore] = useState<string>("1.2"); // Supply stability threshold
  const [resultSearchQuery, setResultSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<
    "closeness" | "profit" | "price" | "sss"
  >("closeness");

  const [allowedWears, setAllowedWears] = useState({
    fn: true,
    mw: true,
    ft: true,
    ww: true,
    bs: true,
    souvenir: true,
    sticker: true,
  });

  // Refresh status from main process
  const refreshStatuses = async () => {
    if (window.electronAPI?.skinsnipe) {
      try {
        const status: any = await window.electronAPI.skinsnipe.getCacheStatus();
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
        if (res && res.itemCount > 0) {
          setEvaluatedSummary((prev) => ({
            ...prev,
            totalEvaluated: res.itemCount,
            lastBuiltAt: res.storedAt || null,
          }));
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

    // Auto-refresh periodically every 10 seconds to keep status strip and cache data synced
    const interval = setInterval(() => {
      refreshStatuses();
    }, 10000);

    // Live subscription to cache status broadcast updates
    const unsub = window.electronAPI?.skinsnipe?.onCacheStatusUpdated?.(
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
      if (cachedMarkets.length === 0) {
        setIsLoadingMarkets(true);
      }
      try {
        if (!window.electronAPI?.skinsnipe?.getCache) return;
        const cache = await window.electronAPI.skinsnipe.getCache();
        if (!cache || typeof cache !== "object") return;

        const foundMarkets = new Set<string>();
        for (const itemKey of Object.keys(cache)) {
          const item = cache[itemKey];
          if (item && Array.isArray(item.l)) {
            for (const listing of item.l) {
              if (listing && listing.m) {
                const canonical = toCanonicalMarketId(listing.m) || listing.m;
                foundMarkets.add(canonical);
              }
            }
          }
        }

        if (isMounted && foundMarkets.size > 0) {
          setCachedMarkets(Array.from(foundMarkets));
        }
      } catch (err) {
        console.warn(
          "[SoCloseWorkstationScreen] Failed to extract markets from price cache:",
          err,
        );
      } finally {
        if (isMounted) {
          setIsLoadingMarkets(false);
        }
      }
    };

    extractCachedMarkets();
    return () => {
      isMounted = false;
    };
  }, [cacheStatus?.lastFetchedAt, cacheStatus?.itemCount]);

  // Execute scan across cached prices for all active build markets
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
          "No accepted prices found in memory. Please build accepted buy prices first.",
          { id: toastId },
        );
        setIsScanning(false);
        return;
      }

      const priceCache: Record<string, any> =
        await window.electronAPI.skinsnipe.getCache();

      if (!priceCache || Object.keys(priceCache).length === 0) {
        toast.error(
          "Market price cache is empty. Please fetch or load market prices first.",
          {
            id: toastId,
          },
        );
        setIsScanning(false);
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

      for (const itemName of Object.keys(priceCache)) {
        const cacheItem = priceCache[itemName];
        if (!cacheItem || !cacheItem.l || !Array.isArray(cacheItem.l)) continue;

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
      toast.success(
        `Scanned ${targetMarkets.length} market(s): Found ${deduplicated.length} SoClose deals!`,
        { id: toastId },
      );
    } catch (err: any) {
      console.error("[SoCloseWorkstationScreen] Scan error:", err);
      toast.error(`SoClose scan failed: ${err.message}`, { id: toastId });
    } finally {
      setIsScanning(false);
    }
  };

  // Filter & Sort Results for UI Rendering
  const processedResults = useMemo(() => {
    let list = [...soCloseResults];

    if (!isAllSelected) {
      list = list.filter((item) =>
        selectedFilterMarkets.some((m) => isMarketMatch(item.market, m)),
      );
    }

    if (resultSearchQuery.trim()) {
      const q = resultSearchQuery.trim().toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (sortBy === "closeness") return a.closeness - b.closeness;
      if (sortBy === "profit")
        return (
          b.acceptedPrice -
          b.currentMarketPrice -
          (a.acceptedPrice - a.currentMarketPrice)
        );
      if (sortBy === "price")
        return a.currentMarketPrice - b.currentMarketPrice;
      if (sortBy === "sss")
        return (b.supplyStabilityScore || 0) - (a.supplyStabilityScore || 0);
      return 0;
    });

    return list;
  }, [
    soCloseResults,
    selectedFilterMarkets,
    isAllSelected,
    resultSearchQuery,
    sortBy,
  ]);

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
    if (canonical && marketCountsMap[canonical])
      return marketCountsMap[canonical];
    for (const [key, count] of Object.entries(marketCountsMap)) {
      if (isMarketMatch(key, marketId)) return count;
    }
    return 0;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        paddingBottom: "40px",
      }}
    >
      {/* Top Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          paddingBottom: "16px",
          borderBottom: "1px solid var(--so-border-subtle)",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 900,
              color: "var(--so-text-primary)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Target size={26} style={{ color: "var(--so-primary)" }} />
            SoClose Opportunity Workstation
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.5px",
                padding: "2px 7px",
                borderRadius: "10px",
                backgroundColor: "rgba(16, 185, 129, 0.2)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.4)",
              }}
            >
              MULTI-MARKET RADAR
            </span>
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--so-text-muted)",
              marginTop: "4px",
              marginBottom: 0,
            }}
          >
            Universal scan engine across all active markets to surface instant
            arbitrage & near-miss deals.
          </p>
        </div>
      </div>

      {/* Main Workstation Container */}
      <div
        className="card"
        style={{
          border: "1px solid var(--so-border-medium)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* Data Freshness & System Status Strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            border: "1px solid var(--so-border-subtle)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            {/* Box 1: Market Price Cache Status */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(56, 189, 248, 0.12)",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Database size={16} style={{ color: "#38bdf8" }} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--so-text-muted)",
                    fontWeight: 700,
                  }}
                >
                  Market Price Cache
                </div>
                <div
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 800,
                    color: "var(--so-text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {cacheStatus.itemCount > 0 ? (
                    <span>
                      {cacheStatus.itemCount.toLocaleString()} listings
                    </span>
                  ) : (
                    <span style={{ color: "#f59e0b" }}>No Cache Data</span>
                  )}
                  {cacheStatus.lastFetchedAt && (
                    <span
                      title={`Updated at: ${new Date(cacheStatus.lastFetchedAt).toLocaleString()}`}
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 600,
                        color: "#10b981",
                        backgroundColor: "rgba(16, 185, 129, 0.15)",
                        padding: "1px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      Updated {formatTimeAgo(cacheStatus.lastFetchedAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div
              style={{
                width: "1px",
                height: "28px",
                backgroundColor: "var(--so-border-subtle)",
              }}
            />

            {/* Box 2: Accepted Buy Ceilings Status */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckCircle2 size={16} style={{ color: "#10b981" }} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--so-text-muted)",
                    fontWeight: 700,
                  }}
                >
                  Accepted Buy Ceilings
                </div>
                <div
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 800,
                    color: "var(--so-text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {evaluatedSummary.totalEvaluated > 0 ? (
                    <span>
                      {evaluatedSummary.totalEvaluated.toLocaleString()} priced
                      items
                    </span>
                  ) : (
                    <span style={{ color: "#f59e0b" }}>Not Built Yet</span>
                  )}
                  {evaluatedSummary.lastBuiltAt && (
                    <span
                      title={`Built at: ${new Date(evaluatedSummary.lastBuiltAt).toLocaleString()}`}
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 600,
                        color: "#10b981",
                        backgroundColor: "rgba(16, 185, 129, 0.15)",
                        padding: "1px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      Built {formatTimeAgo(evaluatedSummary.lastBuiltAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          {/* <button
            type="button"
            className="btn btn-sm"
            onClick={handleManualRefreshStatus}
            disabled={isRefreshingStatus}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--so-border-subtle)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              cursor: isRefreshingStatus ? "not-allowed" : "pointer",
            }}
          >
            <RefreshCw
              size={13}
              style={{
                animation: isRefreshingStatus ? "spin 1s linear infinite" : "none",
                color: "var(--so-text-muted)",
              }}
            />
            {isRefreshingStatus ? "Refreshing..." : "Refresh Status"}
          </button> */}
        </div>

        {/* Section 1: Target Market Filter (Skinsnipe Standard Props & Toolbar) */}
        <div
          style={{
            padding: "18px 20px",
            borderRadius: "var(--so-radius-md)",
            backgroundColor: "var(--so-surface-panel)",
            border: "1px solid var(--so-border-subtle)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
          }}
        >
          <MarketSelectionToolbar
            title="Target Markets Filter"
            selectedCount={selectedCount}
            totalCount={availableMarkets.length}
            itemTypeLabel="Markets"
            tradeCount={tradeCount}
            hideTradeMarkets={hideTradeMarkets}
            onToggleHideTrade={handleToggleHideTrade}
            onSelectAll={handleSelectAllMarkets}
            onResetOrDeselect={handleDeselectAllMarkets}
            resetLabel="Deselect All"
            accentColor="var(--so-primary)"
            badgeClassName="badge-cyan"
            badgeTextColor="#38bdf8"
            badgeBorderColor="rgba(56, 189, 248, 0.4)"
          />

          {/* Interactive Market Chips Grid or Loading State */}
          {isLoadingMarkets ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "28px 16px",
                color: "var(--so-text-muted)",
                fontSize: "12.5px",
                fontWeight: 600,
                backgroundColor: "rgba(0, 0, 0, 0.15)",
                borderRadius: "var(--so-radius-sm)",
                border: "1px dashed var(--so-border-subtle)",
                marginBottom: "12px",
              }}
            >
              <RefreshCw
                size={15}
                style={{
                  animation: "spin 1s linear infinite",
                  color: "var(--so-primary)",
                }}
              />
              Loading & indexing available markets from price cache...
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))",
                gap: "8px",
                marginBottom: "12px",
              }}
            >
              {visibleMarkets.map((marketId) => {
                const displayName = getMarketDisplayName(marketId);
                const isSelected =
                  isAllSelected ||
                  selectedFilterMarkets.some((m) => isMarketMatch(m, marketId));
                const count = getMarketCount(marketId);

                return (
                  <MarketSelectionChip
                    key={marketId}
                    id={marketId}
                    name={displayName}
                    isSelected={isSelected}
                    onToggle={handleToggleMarketFilter}
                    onSolo={handleSoloMarketFilter}
                    isTrade={isTradeMarket(marketId)}
                    marketCount={count}
                    missingQtyCount={0}
                    accentColor="var(--so-primary)"
                  />
                );
              })}
            </div>
          )}

          <div
            style={{
              fontSize: "11.5px",
              color: "var(--so-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Layers size={14} /> Right-click any market chip to solo it.
          </div>
        </div>

        {/* Section 2: Scanner Configuration & Controls */}
        <div
          style={{
            padding: "16px",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            borderRadius: "var(--so-radius-md)",
            border: "1px solid var(--so-border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sliders size={16} style={{ color: "var(--so-primary)" }} />
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "var(--so-text-primary)",
                }}
              >
                Scanner Parameters
              </span>
            </div>

            {/* Wear Filter Checkboxes */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              {(
                [
                  ["fn", "FN"],
                  ["mw", "MW"],
                  ["ft", "FT"],
                  ["ww", "WW"],
                  ["bs", "BS"],
                  ["souvenir", "Souvenir"],
                  ["sticker", "Stickers"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11.5px",
                    fontWeight: (allowedWears as any)[key] ? 700 : 500,
                    color: (allowedWears as any)[key]
                      ? "var(--so-text-primary)"
                      : "var(--so-text-muted)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={(allowedWears as any)[key]}
                    onChange={(e) =>
                      setAllowedWears((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    style={{
                      accentColor: "var(--so-primary)",
                      cursor: "pointer",
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            {/* Group 1: Min-Max Price Range */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "var(--so-surface-panel)",
                border: "1px solid var(--so-border-medium)",
                padding: "4px 8px",
                borderRadius: "var(--so-radius-sm)",
                fontSize: "11px",
              }}
            >
              <span
                style={{ fontWeight: 700, color: "var(--so-text-secondary)" }}
              >
                Price Range ($):
              </span>
              <input
                type="number"
                min="0"
                step="any"
                className="input"
                style={{
                  width: "60px",
                  height: "26px",
                  padding: "2px 6px",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  textAlign: "center",
                  borderRadius: "3px",
                  border: "1px solid var(--so-border-subtle)",
                  background: "var(--so-surface-card)",
                  color: "var(--so-text-primary)",
                }}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min"
              />
              <span style={{ color: "var(--so-text-muted)" }}>-</span>
              <input
                type="number"
                min="0"
                step="any"
                className="input"
                style={{
                  width: "60px",
                  height: "26px",
                  padding: "2px 6px",
                  fontSize: "11.5px",
                  fontWeight: 800,
                  textAlign: "center",
                  borderRadius: "3px",
                  border: "1px solid var(--so-border-subtle)",
                  background: "var(--so-surface-card)",
                  color: "var(--so-text-primary)",
                }}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max"
              />
            </div>

            {/* Group 2: Percent (Closeness) & SSS */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: "var(--so-surface-panel)",
                border: "1px solid var(--so-border-medium)",
                padding: "4px 10px",
                borderRadius: "var(--so-radius-sm)",
                fontSize: "11px",
              }}
            >
              {/* Closeness Distance & Percent */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span
                  title="Distance ceiling relative to accepted buy ceiling (1.08 = within 8%)"
                  style={{ fontWeight: 700, color: "var(--so-text-secondary)" }}
                >
                  Max Distance:
                </span>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  style={{
                    width: "52px",
                    height: "26px",
                    padding: "2px 4px",
                    fontSize: "11.5px",
                    fontWeight: 800,
                    textAlign: "center",
                    borderRadius: "3px",
                    border: "1px solid var(--so-border-subtle)",
                    background: "var(--so-surface-card)",
                    color: "var(--so-text-primary)",
                  }}
                  value={soCloseMaxCloseness}
                  onChange={(e) => setSoCloseMaxCloseness(e.target.value)}
                  placeholder="1.08"
                />
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 800,
                    color: "var(--so-accent-cyan)",
                  }}
                >
                  (+
                  {(
                    (Math.max(1.0, parseFloat(soCloseMaxCloseness) || 1.0) -
                      1) *
                    100
                  ).toFixed(0)}
                  %)
                </span>
              </div>

              {/* Subtle separator */}
              <div
                style={{
                  width: "1px",
                  height: "16px",
                  backgroundColor: "var(--so-border-subtle)",
                }}
              />

              {/* SSS */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span
                  title="Supply Stability Score (SSS) measures cross-market availability, liquidity distribution, and listed stock depth relative to price bracket."
                  style={{
                    fontWeight: 700,
                    color: "var(--so-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "help",
                  }}
                >
                  SSS:
                  <Info
                    size={12}
                    style={{ color: "var(--so-accent-cyan)", opacity: 0.85 }}
                  />
                </span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="1.5"
                  className="input"
                  style={{
                    width: "44px",
                    height: "26px",
                    padding: "2px 4px",
                    fontSize: "11.5px",
                    fontWeight: 800,
                    textAlign: "center",
                    borderRadius: "3px",
                    border: "1px solid var(--so-border-subtle)",
                    background: "var(--so-surface-card)",
                    color: "var(--so-text-primary)",
                  }}
                  value={soCloseMinSssScore}
                  onChange={(e) => setSoCloseMinSssScore(e.target.value)}
                  placeholder="1.2"
                />
              </div>
            </div>

            {/* Run Scan Button */}
            <button
              type="button"
              className="btn btn-primary"
              onClick={runUniversalSoCloseScan}
              disabled={isScanning}
              style={{
                height: "32px",
                padding: "0 16px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                fontWeight: 800,
                fontSize: "12px",
                whiteSpace: "nowrap",
                marginLeft: "auto",
              }}
            >
              <Target size={14} />
              {isScanning ? "Scanning..." : "Run SoClose Market Scan"}
            </button>
          </div>
        </div>

        {/* Section 3: Results Header & Quick Search */}
        {soCloseResults.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              paddingBottom: "12px",
              borderBottom: "1px solid var(--so-border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "var(--so-text-primary)",
                }}
              >
                Found Opportunities ({processedResults.length})
              </div>

              {/* Quick Search */}
              <div style={{ position: "relative", width: "200px" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--so-text-muted)",
                  }}
                />
                <input
                  type="text"
                  className="input"
                  value={resultSearchQuery}
                  onChange={(e) => setResultSearchQuery(e.target.value)}
                  placeholder="Filter results..."
                  style={{
                    width: "100%",
                    height: "30px",
                    paddingLeft: "28px",
                    fontSize: "11px",
                  }}
                />
              </div>

              {/* Sort By Dropdown */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <ArrowUpDown
                  size={13}
                  style={{ color: "var(--so-text-muted)" }}
                />
                <select
                  className="input"
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  style={{
                    height: "30px",
                    fontSize: "11px",
                    padding: "0 8px",
                    cursor: "pointer",
                  }}
                >
                  <option value="closeness">Sort: Closeness (Lowest %)</option>
                  <option value="profit">Sort: Potential Profit ($)</option>
                  <option value="price">Sort: Price (Lowest $)</option>
                  <option value="sss">Sort: SSS Score (Highest)</option>
                </select>
              </div>
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "var(--so-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Showing {processedResults.length} of {soCloseResults.length}{" "}
              deal(s)
            </div>
          </div>
        )}

        {/* Section 4: Workstation-Style SoClose Opportunity Cards */}
        {processedResults.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "14px",
            }}
          >
            {processedResults.map((item, index) => {
              const diffDollars = item.acceptedPrice - item.currentMarketPrice;
              const isInstantProfit = item.closeness <= 1.0;
              const marketUrl = getMarketItemUrl(
                item.market || "csfloat",
                item.name,
              );

              const match = item.name.match(
                /^(.*?)(?:\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\))?$/i,
              );
              const cleanTitle = match ? match[1] : item.name;
              const wearShortcut = match ? match[2] : "";

              const imageUrl = item.iconUrl
                ? item.iconUrl.startsWith("http://") ||
                  item.iconUrl.startsWith("https://")
                  ? item.iconUrl
                  : `https://community.cloudflare.steamstatic.com/economy/image/${item.iconUrl}`
                : `https://api.steamapis.com/image/item/730/${encodeURIComponent(item.name)}`;

              return (
                <div
                  key={`${item.name}-${item.market}-${index}`}
                  className="card"
                  style={{
                    backgroundColor: "var(--so-surface-card)",
                    border: `1px solid ${
                      isInstantProfit
                        ? "rgba(16, 185, 129, 0.4)"
                        : "var(--so-border-subtle)"
                    }`,
                    boxShadow: isInstantProfit
                      ? "0 0 12px rgba(16, 185, 129, 0.15)"
                      : "none",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    position: "relative",
                    cursor: "default",
                    transition: "border-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      isInstantProfit
                        ? "rgba(16, 185, 129, 0.8)"
                        : "var(--so-primary)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      isInstantProfit
                        ? "rgba(16, 185, 129, 0.4)"
                        : "var(--so-border-subtle)";
                  }}
                >
                  {/* Row 1: Actions (Top Left: View, Copy, Link) & Market Info (Top Right: Logo + Name) */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                      minHeight: "22px",
                      width: "100%",
                    }}
                  >
                    {/* Top Left: 3 Action Icons (View, Copy, Link) */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* View icon: Quick preview item details & all-market price breakdown */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLookupModal(
                            item.name,
                            item.acceptedPrice,
                            item.currentMarketPrice,
                            item.iconUrl,
                            item.market,
                          );
                        }}
                        title="Inspect item details & all marketplace price breakdown"
                        className="btn btn-sm"
                        style={{
                          padding: "3px 6px",
                          background: "var(--so-surface-panel)",
                          border: "1px solid var(--so-border-subtle)",
                          borderRadius: "4px",
                          color: "var(--so-accent-cyan)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Eye size={13} />
                      </button>

                      {/* Copy Market Hash Name Button */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <CopyMarketHashButton name={item.name} size={13} />
                      </div>

                      {/* External Link: Open on marketplace */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (marketUrl) {
                            if (window.electronAPI?.app?.openExternal) {
                              window.electronAPI.app.openExternal(marketUrl);
                            } else {
                              window.open(marketUrl, "_blank");
                            }
                          } else {
                            toast.error(
                              `Market link not available for ${getMarketDisplayName(item.market)}`,
                            );
                          }
                        }}
                        title={
                          marketUrl
                            ? `Open on ${getMarketDisplayName(item.market)}`
                            : "Market link unavailable"
                        }
                        className="btn btn-sm"
                        style={{
                          padding: "3px 6px",
                          background: "var(--so-surface-panel)",
                          border: "1px solid var(--so-border-subtle)",
                          borderRadius: "4px",
                          color: "var(--so-text-secondary)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: marketUrl ? "pointer" : "not-allowed",
                          opacity: marketUrl ? 1 : 0.45,
                        }}
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>

                    {/* Top Right: Market Logo & Name */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        flexShrink: 0,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MarketLogo
                        marketId={item.market || "csfloat"}
                        size={14}
                      />
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          color: "var(--so-text-primary)",
                          textTransform: "uppercase",
                        }}
                      >
                        {getMarketDisplayName(item.market)}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: SSS Badge (Left) & SO CLOSE / DISCOUNT Badge (Right) */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "6px",
                      width: "100%",
                      minHeight: "18px",
                    }}
                  >
                    {item.supplyStabilityScore !== undefined ? (
                      <span
                        className="badge"
                        style={{
                          fontSize: "9px",
                          padding: "1px 5px",
                          fontWeight: 800,
                          borderRadius: "4px",
                          backgroundColor:
                            item.supplyStabilityScore >= 1.2
                              ? "rgba(16, 185, 129, 0.18)"
                              : item.supplyStabilityScore >= 0.8
                                ? "rgba(6, 182, 212, 0.18)"
                                : "rgba(245, 158, 11, 0.18)",
                          color:
                            item.supplyStabilityScore >= 1.2
                              ? "var(--so-success-text)"
                              : item.supplyStabilityScore >= 0.8
                                ? "var(--so-cyan-text)"
                                : "var(--so-warning)",
                          border: `1px solid ${
                            item.supplyStabilityScore >= 1.2
                              ? "rgba(16, 185, 129, 0.35)"
                              : item.supplyStabilityScore >= 0.8
                                ? "rgba(6, 182, 212, 0.35)"
                                : "rgba(245, 158, 11, 0.35)"
                          }`,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                        title="Supply Stability Score (SSS): cross-market distribution, HHI balance, and volume depth."
                      >
                        SSS: {item.supplyStabilityScore.toFixed(1)}
                      </span>
                    ) : (
                      <div />
                    )}

                    {isInstantProfit ? (
                      <span
                        className="badge badge-success"
                        style={{
                          fontSize: "9px",
                          padding: "1px 5px",
                          fontWeight: 800,
                          borderRadius: "4px",
                          backgroundColor: "rgba(16, 185, 129, 0.2)",
                          color: "#10b981",
                          border: "1px solid rgba(16, 185, 129, 0.4)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        <CheckCircle2 size={10} /> DEAL (
                        {item.closenessPercent > 0
                          ? `+${item.closenessPercent.toFixed(1)}%`
                          : `${item.closenessPercent.toFixed(1)}%`}
                        )
                      </span>
                    ) : (
                      <span
                        className="badge"
                        style={{
                          fontSize: "9px",
                          padding: "1px 5px",
                          fontWeight: 800,
                          borderRadius: "4px",
                          backgroundColor: "rgba(245, 158, 11, 0.18)",
                          color: "#f59e0b",
                          border: "1px solid rgba(245, 158, 11, 0.4)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        SO CLOSE (+{item.closenessPercent.toFixed(1)}%)
                      </span>
                    )}
                  </div>

                  {/* Image Showcase Box - Click to open external marketplace */}
                  <SkinImage
                    src={imageUrl}
                    alt={cleanTitle}
                    fallbackItemName={item.name}
                    title={
                      marketUrl
                        ? `Click to open on ${getMarketDisplayName(item.market)}`
                        : undefined
                    }
                    onClick={
                      marketUrl
                        ? (e) => {
                            e.stopPropagation();
                            if (window.electronAPI?.app?.openExternal) {
                              window.electronAPI.app.openExternal(marketUrl);
                            } else {
                              window.open(marketUrl, "_blank");
                            }
                          }
                        : undefined
                    }
                  />

                  {/* Title & Wear Row */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 800,
                          color: "#ffffff",
                          lineHeight: 1.25,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                        title={item.name}
                      >
                        {cleanTitle}
                      </div>
                      {wearShortcut && (
                        <span
                          style={{
                            fontSize: "9.5px",
                            fontWeight: 800,
                            padding: "1px 6px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(255, 255, 255, 0.09)",
                            color: "#f1f5f9",
                            border: "1px solid rgba(255, 255, 255, 0.22)",
                            letterSpacing: "0.3px",
                            flexShrink: 0,
                          }}
                        >
                          {wearShortcut}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 14-Day Trend Sparkline Graph - Click opens detailed trend chart & all-market breakdown */}
                  <div
                    style={{ margin: "2px 0" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TrendSparkline
                      name={item.name}
                      momentum={item.trendMomentum14d}
                      height={32}
                      onClick={() =>
                        handleOpenLookupModal(
                          item.name,
                          item.acceptedPrice,
                          item.currentMarketPrice,
                          item.iconUrl,
                          item.market,
                        )
                      }
                    />
                  </div>

                  {/* Workstation-Style Price Metrics Block */}
                  <div
                    style={{
                      padding: "8px",
                      borderRadius: "var(--so-radius-sm)",
                      backgroundColor:
                        item.closeness <= 1.0
                          ? "rgba(16, 185, 129, 0.12)"
                          : "var(--so-surface-panel)",
                      border: `1px solid ${
                        item.closeness <= 1.0
                          ? "rgba(16, 185, 129, 0.3)"
                          : "var(--so-border-subtle)"
                      }`,
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      fontSize: "11px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--so-text-muted)",
                          fontWeight: 700,
                        }}
                      >
                        {getMarketDisplayName(item.market)} Market
                      </span>
                      <span
                        className="tabular-nums"
                        style={{
                          fontWeight: 800,
                          color:
                            item.closeness <= 1.0
                              ? "var(--so-success-text)"
                              : "#f59e0b",
                        }}
                      >
                        ${item.currentMarketPrice.toFixed(2)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--so-text-muted)",
                          fontWeight: 700,
                        }}
                      >
                        Target Buy Price
                      </span>
                      <span
                        className="tabular-nums"
                        style={{
                          fontWeight: 800,
                          color: "var(--so-success-text)",
                        }}
                      >
                        ${item.acceptedPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              borderRadius: "8px",
              backgroundColor: "var(--so-surface-panel)",
              border: "1px dashed var(--so-border-subtle)",
            }}
          >
            <Target
              size={36}
              style={{ color: "var(--so-text-muted)", marginBottom: "12px" }}
            />
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--so-text-primary)",
                marginBottom: "4px",
              }}
            >
              No SoClose Opportunities Found
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--so-text-muted)",
                maxWidth: "420px",
                margin: "0 auto 16px auto",
              }}
            >
              Click "Run SoClose Market Scan" above to analyze live market
              listings against your calculated accepted buy ceilings across all
              active markets.
            </p>
            <button
              className="btn btn-primary"
              onClick={runUniversalSoCloseScan}
              disabled={isScanning}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 800,
                fontSize: "12.5px",
              }}
            >
              <Target size={15} />
              {isScanning ? "Scanning..." : "Run SoClose Market Scan"}
            </button>
          </div>
        )}
      </div>

      {/* Lookup Modal */}
      {lookupModalItem && (
        <CSFloatLookupModal
          item={lookupModalItem}
          onClose={() => setLookupModalItem(null)}
          onOpenMarket={(name) => {
            const url = getMarketItemUrl(
              lookupModalItem.market || "csfloat",
              name,
            );
            if (url) {
              if (window.electronAPI?.app?.openExternal) {
                window.electronAPI.app.openExternal(url);
              } else {
                window.open(url, "_blank");
              }
            }
          }}
        />
      )}
    </div>
  );
}
