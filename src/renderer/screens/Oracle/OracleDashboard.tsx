import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { Sparkles } from "lucide-react";
import {
  useOracleStore,
  DEFAULT_SELECTED_MARKETS,
} from "../../store/useOracleStore";
import { SkinsnipeMarketId, AcceptedPriceInfo } from "../../../shared/types";
import { isMarketMatch } from "../../../shared/canonicalMarkets";
import {
  passesSmartPreFilters,
  calculateSuggestedListingPrice,
  mapStrategyToBackendOptions,
  mapNexusProfileToParams,
  roundToCsFloatStep,
  auditCacheQuantityIntegrity,
  QuantityIntegrityReport,
} from "./utils/oracleUtils";
import {
  Step1MarketCache,
  SKINSNIPE_AVAILABLE_MARKETS,
} from "./components/Step1MarketCache";
import { Step2AcceptedPrices } from "./components/Step2AcceptedPrices";
import { Step3ListingPrices } from "./components/Step3ListingPrices";
import { Step4SingleLookup } from "./components/Step4SingleLookup";

export default function OracleDashboard() {
  const [cacheStatus, setCacheStatus] = useState<{
    itemCount: number;
    isFetching: boolean;
    lastFetchedAt: string | null;
  }>({ itemCount: 0, isFetching: false, lastFetchedAt: null });

  const [fetchProgress, setFetchProgress] = useState<{
    currentMarket: string;
    currentMarketIndex: number;
    totalMarkets: number;
    completedMarkets: number;
    errorCount: number;
    lastError: string | null;
    criticalError: string | null;
    status: "fetching" | "waiting" | "completed" | "aborted" | "error";
    sleepRemaining?: number;
  } | null>(null);

  const [marketCounts, setMarketCounts] = useState<Record<string, number>>({});
  const [cachedItemNames, setCachedItemNames] = useState<string[]>([]);
  const [fullCache, setFullCache] = useState<any>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [hasCs2capKey, setHasCs2capKey] = useState<boolean>(false);
  const [isDemoCache, setIsDemoCache] = useState<boolean>(false);
  const [isCs2capStreaming, setIsCs2capStreaming] = useState<boolean>(false);
  const [cs2capProgress, setCs2capProgress] = useState<any>(null);

  const quantityAudit: QuantityIntegrityReport = useMemo(() => {
    return auditCacheQuantityIntegrity(fullCache);
  }, [fullCache]);

  // Accordion Step Collapsed/Expanded State
  const [openSteps, setOpenSteps] = useState<{ [key: string]: boolean }>({
    step1: true, // Step 1: Market Cache
    step2: false, // Step 2: Buy Ceiling Engine
    step3: false, // Step 3: Listing Price Engine
    step4: false, // Step 4: Single Item Search
  });

  const toggleStep = (stepKey: string) => {
    setOpenSteps((prev) => ({ ...prev, [stepKey]: !prev[stepKey] }));
  };

  // Persistent Oracle Dashboard State powered by Zustand
  const {
    pricingProvider,
    setPricingProvider,
    selectedMarkets,
    toggleMarket: storeToggleMarket,
    soloMarket: storeSoloMarket,
    selectAllMarkets: storeSelectAllMarkets,
    resetDefaultMarkets,
    selectedCs2capProviders,
    toggleCs2capProvider: storeToggleCs2capProvider,
    soloCs2capProvider: storeSoloCs2capProvider,
    selectAllCs2capProviders: storeSelectAllCs2capProviders,
    resetDefaultCs2capProviders: storeResetDefaultCs2capProviders,
    preFilters,
    setPreFilters,
    toggleWear,
    resetPreFilters: storeResetPreFilters,
    selectedEngine,
    setSelectedEngine,
    strategyProfile,
    setStrategyProfile,
    nexusProfile,
    setNexusProfile,
    listingStrategy,
    setListingStrategy,
  } = useOracleStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // Centralized accepted price evaluation summary
  const [evaluatedSummary, setEvaluatedSummary] = useState<{
    totalEvaluated: number;
    soCloseCount: number;
    highSssCount: number;
    isBatchEvaluating: boolean;
    lastBuiltAt: string | null;
    batchProgress?: {
      current: number;
      total: number;
      percent: number;
    } | null;
  }>({
    totalEvaluated: 0,
    soCloseCount: 0,
    highSssCount: 0,
    isBatchEvaluating: false,
    lastBuiltAt: null,
    batchProgress: null,
  });

  // Centralized listing price evaluation summary
  const [listingSummary, setListingSummary] = useState<{
    totalEvaluated: number;
    isBatchEvaluating: boolean;
    lastBuiltAt: string | null;
  }>({ totalEvaluated: 0, isBatchEvaluating: false, lastBuiltAt: null });

  const loadCacheKeys = async () => {
    try {
      if (!window.electronAPI?.skinsnipe) return;
      const fullCacheData: any = await window.electronAPI.skinsnipe.getCache();
      setFullCache(fullCacheData);
      const keys = Object.keys(fullCacheData || {});
      setCachedItemNames(keys);
    } catch (e) {
      console.warn("[OracleDashboard] Failed to load cache keys:", e);
    }
  };

  useEffect(() => {
    if (window.electronAPI?.skinsnipe) {
      window.electronAPI.skinsnipe
        .getCacheStatus()
        .then((status: any) => {
          if (!status) return;
          setCacheStatus(status);
          if (status.marketCounts) {
            setMarketCounts(status.marketCounts);
          }
          if (status.itemCount > 0) {
            loadCacheKeys();
          }
        })
        .catch(() => {});
    }

    if (window.electronAPI?.settings) {
      window.electronAPI.settings
        .getKeysStatus()
        .then((keys) => {
          if (keys) {
            setHasApiKey(!!keys.hasSkinsnipeKey);
            setHasCs2capKey(!!keys.hasCs2capKey);
          }
        })
        .catch(() => {});
    }

    // Restore stored accepted prices summary when returning to Oracle Dashboard tab
    if (window.electronAPI?.oracle) {
      window.electronAPI.oracle
        .getAcceptedPrices()
        .then((res: any) => {
          if (res && res.itemCount > 0) {
            const builtAt = res.storedAt
              ? new Date(res.storedAt).toLocaleTimeString()
              : null;
            setEvaluatedSummary((prev) => ({
              ...prev,
              totalEvaluated: res.itemCount,
              lastBuiltAt: builtAt,
            }));
          }
        })
        .catch(() => {});

      // Restore stored listing prices summary when returning to Oracle Dashboard tab
      window.electronAPI.oracle
        .getListingPrices()
        .then((res: any) => {
          if (res && res.itemCount > 0) {
            const builtAt = res.storedAt
              ? new Date(res.storedAt).toLocaleTimeString()
              : null;
            setListingSummary((prev) => ({
              ...prev,
              totalEvaluated: res.itemCount,
              lastBuiltAt: builtAt,
            }));
          }
        })
        .catch(() => {});
    }

    const unsubSkinsnipe = window.electronAPI?.skinsnipe?.onFetchProgress?.(
      (progress: any) => {
        setFetchProgress(progress);
        if (progress.marketCounts) {
          setMarketCounts(progress.marketCounts);
        }
        if (progress.status === "fetching" || progress.status === "waiting") {
          setCacheStatus((prev) => ({ ...prev, isFetching: true }));
        } else if (
          progress.status === "completed" ||
          progress.status === "aborted"
        ) {
          setCacheStatus((prev) => ({ ...prev, isFetching: false }));
        }
      },
    );

    const unsubCs2cap = window.electronAPI?.cs2cap?.onStreamProgress?.(
      (progress: any) => {
        setCs2capProgress(progress);
        if (progress.marketCounts) {
          setMarketCounts(progress.marketCounts);
        }
        if (
          progress.status === "streaming" ||
          progress.status === "connecting"
        ) {
          setIsCs2capStreaming(true);
          setCacheStatus((prev) => ({ ...prev, isFetching: true }));
        } else if (
          progress.status === "completed" ||
          progress.status === "aborted" ||
          progress.status === "error"
        ) {
          setIsCs2capStreaming(false);
          setCacheStatus((prev) => ({ ...prev, isFetching: false }));
        }
      },
    );

    return () => {
      unsubSkinsnipe?.();
      unsubCs2cap?.();
    };
  }, []);

  const handleCancelFetch = async () => {
    try {
      await window.electronAPI.skinsnipe.cancelFetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel fetch");
    }
  };

  const handleStreamCs2cap = async () => {
    if (isCs2capStreaming) return;
    setIsCs2capStreaming(true);
    setCs2capProgress(null);
    setCacheStatus((prev) => ({ ...prev, isFetching: true }));
    const toastId = toast.loading("Connecting to CS2Cap prices stream...");
    try {
      const res = await window.electronAPI.cs2cap.fetchPrices({
        providers: selectedCs2capProviders,
      });
      if (res.success) {
        setIsDemoCache(false);
        setCacheStatus({
          itemCount: res.itemCount,
          isFetching: false,
          lastFetchedAt: res.fetchedAt,
        });
        if (res.marketCounts) {
          setMarketCounts(res.marketCounts);
        }
        await loadCacheKeys();
        toast.success(
          `Streamed ${res.itemCount.toLocaleString()} items across ${res.providersCount} providers in ${(res.elapsedMs / 1000).toFixed(1)}s!`,
          { id: toastId },
        );
      }
    } catch (err: any) {
      toast.error(err.message || "CS2Cap stream failed", { id: toastId });
    } finally {
      setIsCs2capStreaming(false);
      setCacheStatus((prev) => ({ ...prev, isFetching: false }));
    }
  };

  const handleCancelCs2capStream = async () => {
    try {
      await window.electronAPI.cs2cap.cancelFetch();
      toast("CS2Cap stream cancellation requested.", { icon: "🛑" });
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel CS2Cap stream");
    }
  };

  const toggleCs2capProvider = (providerId: string) => {
    if (
      selectedCs2capProviders.includes(providerId) &&
      selectedCs2capProviders.length === 1
    ) {
      toast.error("At least one CS2Cap provider must remain selected");
      return;
    }
    storeToggleCs2capProvider(providerId);
  };

  const soloCs2capProvider = (providerId: string) => {
    storeSoloCs2capProvider(providerId);
    toast.success(`Solo CS2Cap provider set to ${providerId}`);
  };

  const selectAllCs2capProviders = () => {
    storeSelectAllCs2capProviders();
    toast.success("All CS2Cap providers selected");
  };

  const resetDefaultCs2capProviders = () => {
    storeResetDefaultCs2capProviders();
    toast.success("Reset CS2Cap providers to default");
  };

  // Compute live count of items passing smart pre-filters
  const passingFilterCount = useMemo(() => {
    if (cachedItemNames.length === 0) return 0;
    return cachedItemNames.filter((name) =>
      passesSmartPreFilters(name, preFilters, fullCache?.[name]),
    ).length;
  }, [cachedItemNames, preFilters, fullCache]);

  const toggleMarket = (marketId: SkinsnipeMarketId) => {
    if (selectedMarkets.includes(marketId) && selectedMarkets.length === 1) {
      toast.error("At least one Skinsnipe market must remain selected");
      return;
    }
    storeToggleMarket(marketId);
  };

  const soloMarket = (marketId: SkinsnipeMarketId) => {
    storeSoloMarket(marketId);
    const name =
      SKINSNIPE_AVAILABLE_MARKETS.find((m) => m.id === marketId)?.name ||
      marketId;
    toast.success(`Solo Skinsnipe market set to ${name}`);
  };

  const selectAllMarkets = () => {
    storeSelectAllMarkets(SKINSNIPE_AVAILABLE_MARKETS.map((m) => m.id));
  };

  const deselectAllMarkets = () => {
    resetDefaultMarkets();
    toast.success(
      `Reset selected markets to default preset (${DEFAULT_SELECTED_MARKETS.length} markets)`,
    );
  };

  const resetPreFilters = () => {
    storeResetPreFilters();
    toast.success("Reset smart pre-filters to default");
  };

  const buildAcceptedPrices = async () => {
    if (evaluatedSummary.isBatchEvaluating) return;
    setEvaluatedSummary((prev) => ({
      ...prev,
      isBatchEvaluating: true,
      batchProgress: null,
    }));

    let activeBatchId: string | null = null;
    let total = 0;
    let totalEvaluated = 0;
    let soClose = 0;
    let highLiq = 0;
    const acceptedPriceMap: Record<string, AcceptedPriceInfo> = {};

    try {
      const fullCache: any = await window.electronAPI.skinsnipe.getCache();
      const allItemNames = Object.keys(fullCache || {});

      if (allItemNames.length === 0) {
        toast.error(
          "No price cache found. Please fetch prices via Skinsnipe or load a JSON cache file first.",
        );
        setEvaluatedSummary((prev) => ({
          ...prev,
          isBatchEvaluating: false,
          batchProgress: null,
        }));
        return;
      }

      // Apply Smart Pre-Filters
      const filteredItemNames = allItemNames.filter((name) =>
        passesSmartPreFilters(name, preFilters, fullCache[name]),
      );

      if (filteredItemNames.length === 0) {
        toast.error(
          "0 items matched your smart pre-filters. Please broaden your wear or category filters.",
        );
        setEvaluatedSummary((prev) => ({
          ...prev,
          isBatchEvaluating: false,
          batchProgress: null,
        }));
        return;
      }

      // 1. Start Atomic Batch Session: Single Upfront Ledger Deduction
      setEvaluatedSummary((prev) => ({
        ...prev,
        batchProgress: {
          current: 0,
          total: filteredItemNames.length,
          percent: 0,
        },
      }));

      const isNexus = selectedEngine === "nexus";

      if (isNexus && window.electronAPI?.trendStore) {
        try {
          const stats = await window.electronAPI.trendStore.getStats();
          if (!stats || stats.daysCount < 3) {
            toast.error(
              `Cannot build with Nexus Pro: Minimum 3 days of trend history required (Recommended: 7 days). Currently have ${stats?.daysCount ?? 0} day(s).`,
            );
            setEvaluatedSummary((prev) => ({
              ...prev,
              isBatchEvaluating: false,
              batchProgress: null,
            }));
            return;
          }
        } catch (trendErr) {
          console.warn(
            "[OracleDashboard] Failed to verify trend stats:",
            trendErr,
          );
        }
      }

      const batchStartRes = isNexus
        ? await window.electronAPI.oracle.startNexusBatch(
            filteredItemNames.length,
          )
        : await window.electronAPI.oracle.startBatch(filteredItemNames.length);
      activeBatchId = batchStartRes.batchId;

      const evalOptions = mapStrategyToBackendOptions(strategyProfile);
      const nexusParams = isNexus
        ? mapNexusProfileToParams(nexusProfile)
        : undefined;
      const chunkSize = 1500;

      for (let i = 0; i < filteredItemNames.length; i += chunkSize) {
        const chunk = filteredItemNames.slice(i, i + chunkSize);
        const evalRes = isNexus
          ? await window.electronAPI.oracle.evaluateNexus(
              chunk,
              evalOptions,
              nexusParams,
              activeBatchId || undefined,
            )
          : await window.electronAPI.oracle.evaluate(
              chunk,
              evalOptions,
              activeBatchId || undefined,
            );
        totalEvaluated += chunk.length;

        if (evalRes?.results) {
          evalRes.results.forEach((r: any) => {
            if (r.oracle?.finalAcceptedPrice) {
              const acceptedPrice = roundToCsFloatStep(
                r.oracle.finalAcceptedPrice,
              );
              acceptedPriceMap[r.name] = {
                acceptedPrice,
                supplyStabilityScore: r.oracle.supplyStabilityScore || 0,
                isHyperStable: r.oracle.isHyperStable || false,
                nexusDelta: r.oracle.nexusDelta,
                trendAdjustment: r.oracle.trendAdjustment,
                trendConfidence: r.oracle.trendConfidence,
                trendMomentum14d: r.oracle.trendMomentum14d,
                nexusConfidence: r.oracle.nexusConfidence,
                v1Benchmark: r.oracle.v1Benchmark,
              };
              total++;
              if ((r.oracle.supplyStabilityScore || 0) >= 1.2) highLiq++;

              const csfloatListing = fullCache[r.name]?.l?.find((l: any) =>
                isMarketMatch(l.m, "csfloat"),
              );
              const csfloatPrice = csfloatListing?.p || 0;
              if (csfloatPrice > 0 && csfloatPrice / acceptedPrice <= 1.1) {
                soClose++;
              }
            }
          });
        }

        const current = Math.min(totalEvaluated, filteredItemNames.length);
        const percent = Math.round((current / filteredItemNames.length) * 100);

        setEvaluatedSummary((prev) => ({
          ...prev,
          totalEvaluated: total,
          soCloseCount: soClose,
          highSssCount: highLiq,
          batchProgress: { current, total: filteredItemNames.length, percent },
        }));

        // Allow UI to paint animation frames smoothly between chunks
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      toast.success(
        `Computed accepted prices for ${total.toLocaleString()} items using ${
          isNexus ? "ORACLENEXUS PRO" : strategyProfile.preset.toUpperCase()
        } strategy!`,
      );
    } catch (err: any) {
      console.error("[Oracle Dashboard] Build Accepted Price error:", err);
      if (totalEvaluated > 0) {
        toast.error(
          `Evaluation interrupted after ${totalEvaluated.toLocaleString()} items evaluated (${total.toLocaleString()} priced): ${err.message}. Prices were saved!`,
          { duration: 8000 },
        );
      } else {
        toast.error(`Build Accepted Price failed: ${err.message}`);
      }
    } finally {
      // 2. Complete Batch Session & Auto-Refund Any Unused Items
      if (activeBatchId) {
        try {
          const finishRes = await window.electronAPI.oracle.finishBatch(
            activeBatchId,
            totalEvaluated,
          );
          if (finishRes && finishRes.refundedCents > 0) {
            toast(
              `Auto-refunded $${(finishRes.refundedCents / 100).toFixed(2)} for ${finishRes.unusedItems.toLocaleString()} unused items.`,
              { icon: "💰" },
            );
          }
        } catch (finishErr) {
          console.warn(
            "[OracleDashboard] Failed to finish batch cleanly:",
            finishErr,
          );
        }
      }

      // 3. Guarantee: Always store and activate any items that were successfully processed
      if (Object.keys(acceptedPriceMap).length > 0) {
        const storeResult =
          await window.electronAPI.oracle.storeAcceptedPrices(acceptedPriceMap);
        const builtAt = storeResult?.storedAt
          ? new Date(storeResult.storedAt).toLocaleTimeString()
          : new Date().toLocaleTimeString();

        setEvaluatedSummary({
          totalEvaluated: total,
          soCloseCount: soClose,
          highSssCount: highLiq,
          isBatchEvaluating: false,
          lastBuiltAt: builtAt,
          batchProgress: null,
        });
      } else {
        setEvaluatedSummary((prev) => ({
          ...prev,
          isBatchEvaluating: false,
          batchProgress: null,
        }));
      }
    }
  };

  const buildListingPrices = async () => {
    if (cacheStatus.itemCount === 0) {
      toast.error(
        "Price cache is empty. Please fetch prices from Skinsnipe or load a JSON cache file first.",
      );
      return;
    }

    setListingSummary((prev) => ({ ...prev, isBatchEvaluating: true }));
    const toastId = toast.loading(
      `Building suggested listing prices using ${listingStrategy.mode.toUpperCase()} strategy...`,
    );

    try {
      const fullCache: any = await window.electronAPI.skinsnipe.getCache();
      const allItemNames = Object.keys(fullCache || {});

      // Apply Smart Pre-Filters
      const filteredItemNames = allItemNames.filter((name) =>
        passesSmartPreFilters(name, preFilters, fullCache[name]),
      );

      if (filteredItemNames.length === 0) {
        toast.error("0 items matched your smart pre-filters.", { id: toastId });
        setListingSummary((prev) => ({ ...prev, isBatchEvaluating: false }));
        return;
      }

      const acceptedPricesRes = await window.electronAPI.oracle.getAcceptedPrices();
      const acceptedMap = acceptedPricesRes?.map || {};

      const listingPriceMap: Record<
        string,
        {
          listingPrice: number;
          mode: string;
          offsetPercent: number;
          lowestPrice: number;
          averagePrice: number;
          trendMomentum14d?: number;
        }
      > = {};
      let total = 0;

      for (const name of filteredItemNames) {
        const itemData = fullCache[name];
        const listings: { p?: number; price?: number }[] = itemData?.l || [];
        const prices = listings
          .map((l) => l.p ?? l.price ?? 0)
          .filter((p) => p > 0);

        if (prices.length === 0) continue;

        const lowestPrice = Math.min(...prices);
        const averagePrice =
          prices.reduce((sum, p) => sum + p, 0) / prices.length;

        const listingPrice = calculateSuggestedListingPrice(
          prices,
          averagePrice,
          listingStrategy,
        );

        const acceptedEntry = acceptedMap[name];

        listingPriceMap[name] = {
          listingPrice,
          mode: listingStrategy.mode,
          offsetPercent: listingStrategy.offsetPercent,
          lowestPrice,
          averagePrice,
          trendMomentum14d: acceptedEntry?.trendMomentum14d,
        };
        total++;
      }

      const storeResult =
        await window.electronAPI.oracle.storeListingPrices(listingPriceMap);
      const builtAt = storeResult?.storedAt
        ? new Date(storeResult.storedAt).toLocaleTimeString()
        : new Date().toLocaleTimeString();

      setListingSummary({
        totalEvaluated: total,
        isBatchEvaluating: false,
        lastBuiltAt: builtAt,
      });

      toast.success(
        `Computed listing prices for ${total.toLocaleString()} items using ${listingStrategy.mode.toUpperCase()} strategy!`,
        { id: toastId },
      );
    } catch (err: any) {
      console.error("[Oracle Dashboard] Build Listing Prices error:", err);
      toast.error(`Build Listing Prices failed: ${err.message}`, {
        id: toastId,
      });
      setListingSummary((prev) => ({ ...prev, isBatchEvaluating: false }));
    }
  };

  const handleFetchPrices = async () => {
    const activeSelected = selectedMarkets.filter((id) =>
      SKINSNIPE_AVAILABLE_MARKETS.some((m) => m.id === id),
    );

    if (activeSelected.length === 0) {
      toast.error("Please select at least one Skinsnipe market to fetch");
      return;
    }

    setCacheStatus((prev) => ({ ...prev, isFetching: true }));
    setFetchProgress(null);
    const marketCount = activeSelected.length;
    const toastId = toast.loading(
      `Initiating live fetch from Skinsnipe for ${marketCount} selected market${marketCount > 1 ? "s" : ""}...`,
    );

    try {
      const result =
        await window.electronAPI.skinsnipe.fetchPrices(activeSelected);
      setIsDemoCache(false);
      setCacheStatus({
        itemCount: result.itemCount,
        isFetching: false,
        lastFetchedAt: result.fetchedAt,
      });
      if (result.marketCounts) {
        setMarketCounts(result.marketCounts);
      }
      await loadCacheKeys();

      if (result.criticalError) {
        toast.error(`Fetch Stopped: ${result.criticalError}`, {
          id: toastId,
          duration: 8000,
        });
      } else if (result.aborted) {
        toast.error("Fetch process stopped by user.", { id: toastId });
      } else if (result.errorCount && result.errorCount > 0) {
        toast.success(
          `Completed with ${result.errorCount} error(s). Cached ${result.itemCount.toLocaleString()} items!`,
          { id: toastId },
        );
      } else {
        toast.success(
          `Fetched prices for ${result.itemCount.toLocaleString()} items across ${marketCount} Skinsnipe markets!`,
          { id: toastId },
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch prices from Skinsnipe", {
        id: toastId,
        duration: 8000,
      });
      setCacheStatus((prev) => ({ ...prev, isFetching: false }));
    }
  };

  const handleUploadJsonCache = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const res = await (window.electronAPI.skinsnipe as any).loadCacheJson(
          content,
        );
        setIsDemoCache(false);
        setCacheStatus({
          itemCount: res.itemCount,
          isFetching: false,
          lastFetchedAt: res.fetchedAt,
        });
        if (res.marketCounts) {
          setMarketCounts(res.marketCounts);
        }
        await loadCacheKeys();
        toast.success(
          `Loaded ${res.itemCount.toLocaleString()} items from JSON cache into local memory!`,
        );
      } catch (err: any) {
        toast.error(err.message || "Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
  };

  const handleLoadDemoCache = async (forceRefresh?: boolean) => {
    const loadingMessage = forceRefresh
      ? "Re-downloading demo price cache from SaaS cloud..."
      : "Loading demo price cache (checking local cache & cloud)...";
    const toastId = toast.loading(loadingMessage);
    try {
      const res = await window.electronAPI.skinsnipe.loadDemoCache({
        forceRefresh,
      });
      setIsDemoCache(true);
      setCacheStatus({
        itemCount: res.itemCount,
        isFetching: false,
        lastFetchedAt: res.fetchedAt,
      });
      if (res.marketCounts) {
        setMarketCounts(res.marketCounts);
      }
      await loadCacheKeys();

      let successMessage = `Loaded ${res.itemCount.toLocaleString()} items from demo cache into memory! Simulation mode active.`;
      if (res.source === "local_cache") {
        successMessage = `Loaded ${res.itemCount.toLocaleString()} items from local disk cache! Simulation mode active.`;
      } else if (res.source === "cloud_download") {
        successMessage = `Downloaded and cached ${res.itemCount.toLocaleString()} items from cloud! Simulation mode active.`;
      } else if (res.source === "cloud_refreshed") {
        successMessage = `Refreshed ${res.itemCount.toLocaleString()} items from cloud demo dataset!`;
      }

      toast.success(successMessage, { id: toastId });
    } catch (err: any) {
      console.error("Failed to load demo cache:", err);
      toast.error(err.message || "Failed to load demo price cache", {
        id: toastId,
      });
    }
  };

  const handleLookupSingleItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const hashName = searchQuery.trim();
    if (!hashName) {
      toast.error("Please enter an item market hash name");
      return;
    }

    setEvaluating(true);
    const toastId = toast.loading(`Searching market data for "${hashName}"...`);
    try {
      let cachedItem: any = null;
      let exactName = hashName;

      if (window.electronAPI.skinsnipe.getItem) {
        cachedItem = await window.electronAPI.skinsnipe.getItem(hashName);
      }

      if (!cachedItem) {
        const fullCache: any = await window.electronAPI.skinsnipe.getCache();
        cachedItem = fullCache?.[hashName];
        if (!cachedItem) {
          const lower = hashName.toLowerCase();
          const matchKey = Object.keys(fullCache || {}).find(
            (k) => k.toLowerCase() === lower,
          );
          if (matchKey) {
            cachedItem = fullCache[matchKey];
            exactName = matchKey;
          }
        }
      }

      const acceptedData: {
        map: Record<string, any>;
        itemCount: number;
        storedAt: string | null;
      } = await window.electronAPI.oracle.getAcceptedPrices();

      let builtItem =
        acceptedData?.map?.[exactName] || acceptedData?.map?.[hashName];
      if (!builtItem) {
        const lower = exactName.toLowerCase();
        const matchKey = Object.keys(acceptedData?.map || {}).find(
          (k) => k.toLowerCase() === lower,
        );
        if (matchKey) builtItem = acceptedData.map[matchKey];
      }

      const rawListings: { m: string; p: number; q?: number }[] =
        cachedItem?.l || [];

      if (builtItem) {
        const sortedPrices = rawListings.map((l) => l.p).sort((a, b) => a - b);
        const lowestPrice = sortedPrices[0] || builtItem.acceptedPrice;
        const avgPrice =
          sortedPrices.length > 0
            ? sortedPrices.reduce((a, b) => a + b, 0) / sortedPrices.length
            : builtItem.acceptedPrice;

        setResults([
          {
            name: exactName,
            source: "built_cache",
            oracle: {
              averageMarketPrice: avgPrice,
              lowestPrice: lowestPrice,
              supplyStabilityScore: builtItem.supplyStabilityScore || 1.0,
              maxAcceptPercent: 0.84,
              finalAcceptedPrice: builtItem.acceptedPrice,
              benchmarkValue: avgPrice,
              marketCount: rawListings.length,
              isHyperStable: builtItem.isHyperStable || false,
              nexusDelta: builtItem.nexusDelta,
              trendAdjustment: builtItem.trendAdjustment,
              trendConfidence: builtItem.trendConfidence,
              trendMomentum14d: builtItem.trendMomentum14d,
              nexusConfidence: builtItem.nexusConfidence,
              v1Benchmark: builtItem.v1Benchmark,
            },
            listings: rawListings,
          },
        ]);

        toast.success(`Found in Built Accepted Price list!`, { id: toastId });
      } else {
        setResults([
          { name: hashName, source: "not_found", oracle: null, listings: [] },
        ]);
        toast.error(
          `Item "${hashName}" is not in the Built Accepted Price list.`,
          { id: toastId },
        );
      }
    } catch (err: any) {
      toast.error(`Lookup failed: ${err.message}`, { id: toastId });
    } finally {
      setEvaluating(false);
    }
  };

  const canBuild =
    cacheStatus.itemCount > 0 && !evaluatedSummary.isBatchEvaluating;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color: "var(--so-text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Sparkles size={24} style={{ color: "var(--so-primary)" }} /> Oracle
            Pricing Central
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.5px",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "rgba(6, 182, 212, 0.15)",
                color: "#06b6d4",
                border: "1px solid rgba(6, 182, 212, 0.35)",
                textTransform: "uppercase",
              }}
            >
              BETA
            </span>
          </h1>
          <p
            style={{
              fontSize: "13.5px",
              color: "var(--so-text-secondary)",
              marginTop: "4px",
            }}
          >
            Centralized pricing engine & persistent market price cache manager
            for all connected trading workstations.
          </p>
        </div>
      </div>

      {/* Step 1: Market Price Cache Engine & Data Sources */}
      <Step1MarketCache
        isOpen={openSteps.step1}
        onToggle={() => toggleStep("step1")}
        cacheStatus={cacheStatus}
        hasApiKey={hasApiKey}
        hasCs2capKey={hasCs2capKey}
        pricingProvider={pricingProvider}
        onChangePricingProvider={setPricingProvider}
        isCs2capStreaming={isCs2capStreaming}
        cs2capProgress={cs2capProgress}
        onStreamCs2cap={handleStreamCs2cap}
        onCancelCs2capStream={handleCancelCs2capStream}
        selectedCs2capProviders={selectedCs2capProviders}
        onToggleCs2capProvider={toggleCs2capProvider}
        onSoloCs2capProvider={soloCs2capProvider}
        onSelectAllCs2capProviders={selectAllCs2capProviders}
        onResetDefaultCs2capProviders={resetDefaultCs2capProviders}
        selectedMarkets={selectedMarkets}
        marketCounts={marketCounts}
        quantityAudit={quantityAudit}
        fetchProgress={fetchProgress}
        isBatchEvaluating={
          evaluatedSummary.isBatchEvaluating || listingSummary.isBatchEvaluating
        }
        isDemoCache={isDemoCache}
        onToggleMarket={toggleMarket}
        onSoloMarket={soloMarket}
        onSelectAllMarkets={selectAllMarkets}
        onDeselectAllMarkets={deselectAllMarkets}
        onFetchPrices={handleFetchPrices}
        onUploadJsonCache={handleUploadJsonCache}
        onLoadDemoCache={handleLoadDemoCache}
        onCancelFetch={handleCancelFetch}
      />

      {/* Step 2: Builder Accepted Price Engine (Buy Ceilings) */}
      <Step2AcceptedPrices
        isOpen={openSteps.step2}
        onToggle={() => toggleStep("step2")}
        evaluatedSummary={evaluatedSummary}
        cacheStatus={cacheStatus}
        passingFilterCount={passingFilterCount}
        preFilters={preFilters}
        setPreFilters={setPreFilters}
        toggleWear={toggleWear}
        resetPreFilters={storeResetPreFilters}
        selectedEngine={selectedEngine}
        setSelectedEngine={setSelectedEngine}
        strategyProfile={strategyProfile}
        setStrategyProfile={setStrategyProfile}
        nexusProfile={nexusProfile}
        setNexusProfile={setNexusProfile}
        onBuildAcceptedPrices={buildAcceptedPrices}
        canBuild={canBuild}
      />

      {/* Step 3: Inventory Selling & Listing Price Engine */}
      <Step3ListingPrices
        isOpen={openSteps.step3}
        onToggle={() => toggleStep("step3")}
        listingSummary={listingSummary}
        cacheStatus={cacheStatus}
        listingStrategy={listingStrategy}
        setListingStrategy={setListingStrategy}
        onBuildListingPrices={buildListingPrices}
      />

      {/* Step 4: Single Item Price Lookup & Live Analysis */}
      <Step4SingleLookup
        isOpen={openSteps.step4}
        onToggle={() => toggleStep("step4")}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        evaluating={evaluating}
        results={results}
        listingStrategy={listingStrategy}
        onLookupSingleItem={handleLookupSingleItem}
      />
    </div>
  );
}
