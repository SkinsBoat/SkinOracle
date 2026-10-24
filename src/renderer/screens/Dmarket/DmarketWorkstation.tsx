import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Globe, Target, Zap, Tag } from "lucide-react";
import {
  DmarketTargetItem,
  MarketGapResultItem,
} from "../../../shared/types";
import { scanMarketGaps } from "../../../shared/engines/marketGapScanner";
import {
  getPersistedThreshold,
  setPersistedThreshold,
} from "../../utils/storage";

import { useLayoutStore } from "../../store/useLayoutStore";
import { useTrendStore } from "../../store/useTrendStore";
import {
  TargetAnalysis,
  MARKET_NAME_MAP,
  getHumanMarketName,
  getWearShortcut,
  getTradeTitle,
  getItemListingPriceWithMap,
  getTradePrice,
  getTradeAmount,
  getTradeDate,
} from "./dmarket-utils";

import { DmarketHeader } from "./components/DmarketHeader";
import { TargetTab } from "./tabs/TargetTab/TargetTab";
import { SoCloseTab } from "./tabs/SoCloseTab/SoCloseTab";
import { ListingsTab } from "./tabs/ListingsTab/ListingsTab";
import { ItemLookupModal } from "./modals/ItemLookupModal";
import { EditTargetModal } from "./modals/EditTargetModal";
import { handleDmarketReferenceLink } from "../../utils/marketUrls";
import { WorkstationOracleAction } from "../../components/WorkstationOracleAction";
import { MarketGapTab } from "../../components/MarketGap/MarketGapTab";
import { DmarketMarketGapCard } from "./components/DmarketMarketGapCard";

// Normalize skin names so DMarket target titles and cache keys match even when
// they differ by trademark glyphs, star prefixes, or whitespace.
const normalizeSkinName = (value: string): string =>
  (value || "")
    .replace(/\u2122/g, "")
    .replace(/★/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// Re-export utility functions for unit tests & backward compatibility
export {
  MARKET_NAME_MAP,
  getHumanMarketName,
  getWearShortcut,
  getTradeTitle,
  getItemListingPriceWithMap,
  getTradePrice,
  getTradeAmount,
  getTradeDate,
};
export type { TargetAnalysis };

export default function DmarketWorkstation() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [targets, setTargets] = useState<DmarketTargetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [balanceData, setBalanceData] = useState<{
    usdFormatted?: string;
    usdCents?: number;
    balance?: number;
  } | null>(null);
  const [profileData, setProfileData] = useState<{
    username?: string;
    targetsLimit?: number;
    imageUrl?: string;
  } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Oracle Pricing Metadata & Loading State
  const [acceptedPricesMeta, setAcceptedPricesMeta] = useState<{
    itemCount: number;
    storedAt: string | null;
  } | null>(null);
  const [listingPricesMeta, setListingPricesMeta] = useState<{
    itemCount: number;
    storedAt: string | null;
  } | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [loadingListingPrices, setLoadingListingPrices] = useState(false);

  const targetLoadOracleRef = useRef<(() => Promise<void>) | null>(null);
  const listingsLoadOracleRef = useRef<(() => Promise<void>) | null>(null);

  // Main Tab Navigation ('target' | 'soclose' | 'gap' | 'listings')
  const [mainTab, setMainTab] = useState<
    "target" | "soclose" | "gap" | "listings"
  >("target");

  // Drift Action Threshold (default 2% difference, persisted across app restarts)
  const [driftThresholdPercent, setDriftThresholdPercent] = useState<number>(
    () =>
      getPersistedThreshold(
        "dmarket_drift_threshold_percent",
        "workstation_buyorders_drift_threshold",
        2,
      ),
  );

  useEffect(() => {
    setPersistedThreshold(
      "dmarket_drift_threshold_percent",
      driftThresholdPercent,
      "workstation_buyorders_drift_threshold",
    );
  }, [driftThresholdPercent]);

  // ── CROSS-MARKET GAP SCANNER STATE ────────────────────────────────
  const [marketGapResults, setMarketGapResults] = useState<
    MarketGapResultItem[]
  >([]);
  const [isMarketGapRunning, setIsMarketGapRunning] = useState(false);
  const [marketGapMinMarkets, setMarketGapMinMarkets] = useState<number>(() =>
    Math.min(
      10,
      Math.max(
        2,
        Math.round(
          getPersistedThreshold(
            "dmarket_market_gap_min_markets",
            undefined,
            3,
          ),
        ),
      ),
    ),
  );
  const [marketGapMinPrice, setMarketGapMinPrice] = useState<string>("2");
  const [marketGapMaxPrice, setMarketGapMaxPrice] = useState<string>("100");
  const [marketGapBuyCeilingOnly, setMarketGapBuyCeilingOnly] =
    useState<boolean>(true);
  const [marketGapMinSssScore, setMarketGapMinSssScore] =
    useState<number>(1.2);
  const [marketGapTargetPrices, setMarketGapTargetPrices] = useState<
    Record<string, number>
  >({});
  const [marketGapAllowedWears, setMarketGapAllowedWears] = useState({
    fn: true,
    mw: true,
    ft: true,
    ww: true,
    bs: true,
    souvenir: true,
    sticker: true,
  });
  const [marketGapProcessingName, setMarketGapProcessingName] = useState<
    string | null
  >(null);
  const [selectedMarketGapItems, setSelectedMarketGapItems] = useState<
    Record<string, boolean>
  >({});
  const [batchMarketGapProcessing, setBatchMarketGapProcessing] =
    useState(false);

  useEffect(() => {
    setPersistedThreshold(
      "dmarket_market_gap_min_markets",
      marketGapMinMarkets,
    );
  }, [marketGapMinMarkets]);

  // Sidebar expand/collapse tracking for full-width floating panel positioning
  const isSidebarExpanded = useLayoutStore((state) => state.isSidebarExpanded);

  // Single Item Lookup Modal State
  const [lookupModalItem, setLookupModalItem] = useState<{
    name: string;
    acceptedPrice?: number;
    marketPrice?: number;
    iconUrl?: string;
    cacheItem?: any;
  } | null>(null);

  // Edit Target Modal State
  const [editingTarget, setEditingTarget] = useState<DmarketTargetItem | null>(
    null,
  );
  const [editingTargetAnalysis, setEditingTargetAnalysis] = useState<
    TargetAnalysis | undefined
  >(undefined);

  // Prevent duplicate concurrent / double-invoked fetches on mount
  const isFetchingTargetsRef = useRef(false);
  const initialFetchDoneRef = useRef(false);

  const checkApiKey = async (): Promise<boolean> => {
    try {
      const status = await window.electronAPI.settings.getKeysStatus();
      setHasKey(status.hasDmarketKeys);
      return status.hasDmarketKeys;
    } catch {
      setHasKey(false);
      return false;
    }
  };

  const fetchUserData = async () => {
    setBalanceLoading(true);
    try {
      const [balanceRes, profileRes] = await Promise.allSettled([
        window.electronAPI.dmarket.getBalance(),
        window.electronAPI.dmarket.getProfile(),
      ]);

      if (balanceRes.status === "fulfilled") {
        setBalanceData(balanceRes.value);
      }
      if (profileRes.status === "fulfilled") {
        const prof = profileRes.value;
        setProfileData({
          username: prof?.username || "Trader",
          targetsLimit: prof?.settings?.targetsLimit,
          imageUrl: prof?.imageUrl,
        });
      }
    } catch (err: any) {
      console.warn("[DMarket Workstation] Balance/Profile error:", err.message);
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchTargets = async () => {
    if (isFetchingTargetsRef.current) return;
    isFetchingTargetsRef.current = true;

    const keyOk = await checkApiKey();
    if (!keyOk) {
      toast.error(
        "DMarket API keys not configured. Please add your keys in Settings.",
      );
      isFetchingTargetsRef.current = false;
      return;
    }

    setLoading(true);
    const toastId = "dmarket-sync-targets";
    toast.loading("Syncing DMarket targets...", { id: toastId });
    try {
      const res = await window.electronAPI.dmarket.getTargets({
        fetchAll: true,
      });
      const list: DmarketTargetItem[] = Array.isArray(res?.items)
        ? res.items
        : [];

      setTargets(list);
      toast.success(`Loaded ${list.length} active DMarket targets`, {
        id: toastId,
      });
      fetchUserData();
    } catch (err: any) {
      console.error("[DMarket Workstation] Error fetching targets:", err);
      toast.error(`DMarket error: ${err.message}`, { id: toastId });
    } finally {
      setLoading(false);
      isFetchingTargetsRef.current = false;
    }
  };

  useEffect(() => {
    if (initialFetchDoneRef.current) return;
    initialFetchDoneRef.current = true;

    // Fast initial check for in-memory Oracle prices (zero network fetch)
    const checkInitialOracleMeta = async () => {
      try {
        const acceptedRes: any =
          await (window.electronAPI.oracle as any).getAcceptedPrices();
        if (acceptedRes && acceptedRes.itemCount > 0) {
          setAcceptedPricesMeta({
            itemCount: acceptedRes.itemCount,
            storedAt: acceptedRes.storedAt,
          });
        }
      } catch (err) {
        console.warn("[DMarket Workstation] Initial accepted prices check:", err);
      }
      try {
        const listingRes = await window.electronAPI.oracle.getListingPrices();
        if (listingRes && listingRes.itemCount > 0) {
          setListingPricesMeta({
            itemCount: listingRes.itemCount,
            storedAt: listingRes.storedAt,
          });
        }
      } catch (err) {
        console.warn("[DMarket Workstation] Initial listing prices check:", err);
      }
    };
    checkInitialOracleMeta();

    checkApiKey().then((ok) => {
      if (ok) {
        fetchUserData();
      }
    });
  }, []);

  const handleLoadOracle = async () => {
    if (mainTab === "listings") {
      setLoadingListingPrices(true);
      try {
        if (listingsLoadOracleRef.current) {
          await listingsLoadOracleRef.current();
        }
        const listingRes = await window.electronAPI.oracle.getListingPrices();
        if (listingRes && listingRes.itemCount > 0) {
          setListingPricesMeta({
            itemCount: listingRes.itemCount,
            storedAt: listingRes.storedAt,
          });
        }
      } finally {
        setLoadingListingPrices(false);
      }
    } else {
      setLoadingPrices(true);
      try {
        if (targetLoadOracleRef.current) {
          await targetLoadOracleRef.current();
        } else {
          const toastId = toast.loading("Matching Oracle accepted prices...");
          const result: any =
            await (window.electronAPI.oracle as any).getAcceptedPrices();
          if (!result || result.itemCount === 0) {
            toast.error(
              "No accepted prices found in memory. Please calculate accepted prices in Oracle Dashboard first.",
              { id: toastId },
            );
          } else {
            toast.success(
              `Matched ${result.itemCount} accepted prices from memory`,
              { id: toastId },
            );
          }
        }
        const acceptedRes: any =
          await (window.electronAPI.oracle as any).getAcceptedPrices();
        if (acceptedRes && acceptedRes.itemCount > 0) {
          setAcceptedPricesMeta({
            itemCount: acceptedRes.itemCount,
            storedAt: acceptedRes.storedAt,
          });
        }
      } finally {
        setLoadingPrices(false);
      }
    }
  };

  useEffect(() => {
    if (targets.length > 0) {
      useTrendStore.getState().fetchHistoryBatch(targets.map((t) => t.title));
    }
  }, [targets]);

  // Open item inspection modal with fast single-item lookup
  const handleOpenLookupModal = async (
    title: string,
    acceptedPrice?: number,
    marketPrice?: number,
    iconUrl?: string,
  ) => {
    setLookupModalItem({ name: title, acceptedPrice, marketPrice, iconUrl });
    try {
      const singleItem = await window.electronAPI.marketCache.getItem(title);
      if (singleItem) {
        setLookupModalItem((prev) =>
          prev ? { ...prev, cacheItem: singleItem } : null,
        );
      } else {
        const cache = await window.electronAPI.marketCache.get();
        const cacheItem = cache ? cache[title] : null;
        setLookupModalItem((prev) => (prev ? { ...prev, cacheItem } : null));
      }
    } catch (err) {
      console.error("Failed to load item cache for lookup:", err);
    }
  };

  // Open item in external DMarket marketplace
  const handleOpenDmarketMarket = (title: string) => {
    const url = handleDmarketReferenceLink(title);
    if (window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  };

  // ── CROSS-MARKET GAP SCANNER METHODS ─────────────────────────────
  const handleSetMarketGapBalanceAsMax = () => {
    if (
      balanceData &&
      typeof balanceData.usdCents === "number" &&
      balanceData.usdCents > 0
    ) {
      const dollarVal = (balanceData.usdCents / 100).toFixed(2);
      setMarketGapMaxPrice(dollarVal);
      toast.success(`Max price set to DMarket balance ($${dollarVal})`);
    } else {
      toast.error("DMarket balance is unavailable or $0.00");
    }
  };

  const runMarketGapScan = async () => {
    if (isMarketGapRunning) return;

    setIsMarketGapRunning(true);
    setSelectedMarketGapItems({});
    setMarketGapTargetPrices({});
    const toastId = toast.loading(
      "Scanning cached markets for DMarket listing gaps...",
    );

    try {
      const priceCache: Record<string, any> =
        await window.electronAPI.marketCache.get();

      if (!priceCache || Object.keys(priceCache).length === 0) {
        toast.error(
          "Market price cache is empty. Scan or load market prices in Oracle Dashboard Step 1 first.",
          { id: toastId },
        );
        return;
      }

      let acceptedMap: Record<string, any> = {};
      try {
        const acceptedRes: any = await (
          window.electronAPI.oracle as any
        ).getAcceptedPrices();
        acceptedMap = acceptedRes?.map || {};
      } catch (err) {
        console.warn("[DMarket Market Gap] Accepted prices unavailable:", err);
      }

      const parsedMinPrice = parseFloat(marketGapMinPrice);
      const parsedMaxPrice = parseFloat(marketGapMaxPrice);
      const minPrice = Number.isFinite(parsedMinPrice)
        ? Math.max(0, parsedMinPrice)
        : 0;
      const maxPrice = Number.isFinite(parsedMaxPrice)
        ? Math.max(0, parsedMaxPrice)
        : Number.POSITIVE_INFINITY;

      const activeTargetNames = new Set(
        targets
          .map((target) =>
            normalizeSkinName(target?.title || (target as any)?.Title || ""),
          )
          .filter(Boolean),
      );
      const minMarkets = Math.max(
        2,
        Math.min(10, Math.round(marketGapMinMarkets)),
      );

      const summary = scanMarketGaps({
        priceCache,
        targetMarket: "dmarket",
        minOtherMarkets: minMarkets,
        minPrice,
        maxPrice,
        allowedWears: marketGapAllowedWears,
        acceptedPrices: acceptedMap,
        buyCeilingOnly: marketGapBuyCeilingOnly,
        minSssScore: marketGapMinSssScore,
        isActiveOrder: (name) =>
          activeTargetNames.has(normalizeSkinName(name)),
        roundPrice: (price) => parseFloat(price.toFixed(2)),
        maxResults: 200,
      });

      if (summary.targetMarketCoverage <= 0) {
        toast.error(
          "The cache contains no DMarket listings. Run a market scan that includes DMarket before scanning for gaps.",
          { id: toastId },
        );
        return;
      }

      if (marketGapBuyCeilingOnly && Object.keys(acceptedMap).length === 0) {
        toast.error(
          "Buy Ceiling Only is active, but no accepted prices are loaded. Calculate Accepted Prices (Buy Ceilings) in Oracle Dashboard Step 2 or disable the filter.",
          { id: toastId },
        );
        return;
      }

      setMarketGapResults(summary.results);
      useTrendStore
        .getState()
        .fetchHistoryBatch(summary.results.map((item) => item.name));

      const truncatedNote =
        summary.totalCandidates > summary.results.length
          ? ` (showing first ${summary.results.length})`
          : "";
      toast.success(
        `Found ${summary.totalCandidates} DMarket listing gaps across ${minMarkets}+ markets${truncatedNote} (DMarket coverage: ${summary.targetMarketCoverage.toLocaleString()} items)`,
        { id: toastId },
      );
    } catch (err: any) {
      toast.error(`DMarket market gap scan error: ${err.message}`, {
        id: toastId,
      });
    } finally {
      setIsMarketGapRunning(false);
    }
  };

  const handleCreateMarketGapTarget = async (
    item: MarketGapResultItem,
    targetPriceOverride?: number,
  ) => {
    const resolvedTargetPrice =
      targetPriceOverride ??
      marketGapTargetPrices[item.name] ??
      item.acceptedPrice;

    if (!resolvedTargetPrice || resolvedTargetPrice <= 0) {
      toast.error(
        "No Oracle Buy Ceiling is available for this item. Calculate Accepted Prices in Oracle Dashboard Step 2 first.",
      );
      return;
    }

    const keyOk = await checkApiKey();
    if (!keyOk) {
      toast.error(
        "DMarket API keys are not configured. Please set your keys in Settings first.",
      );
      return;
    }

    setMarketGapProcessingName(item.name);
    const targetPriceDollar = parseFloat(resolvedTargetPrice.toFixed(2));
    const toastId = toast.loading(
      `Creating target for ${item.name} at $${targetPriceDollar.toFixed(2)}...`,
    );

    try {
      await window.electronAPI.dmarket.createTarget(
        item.name,
        targetPriceDollar,
        1,
      );

      setMarketGapResults((prev) =>
        prev.map((result) =>
          result.name === item.name
            ? { ...result, hasExistingOrder: true }
            : result,
        ),
      );
      toast.success(
        `Target created for ${item.name} at $${targetPriceDollar.toFixed(2)}`,
        { id: toastId },
      );
      fetchTargets();
    } catch (err: any) {
      toast.error(`Failed to create target: ${err.message}`, { id: toastId });
    } finally {
      setMarketGapProcessingName(null);
    }
  };

  const executeBatchMarketGapCreate = async () => {
    const selectedNames = Object.keys(selectedMarketGapItems).filter(
      (name) => selectedMarketGapItems[name],
    );
    if (!selectedNames.length) return;

    const keyOk = await checkApiKey();
    if (!keyOk) {
      toast.error(
        "DMarket API keys are not configured. Please set your keys in Settings first.",
      );
      return;
    }

    const itemsToCreate = selectedNames
      .map((name) => marketGapResults.find((result) => result.name === name))
      .filter(
        (
          item,
        ): item is MarketGapResultItem & { acceptedPrice: number } =>
          !!item &&
          !item.hasExistingOrder &&
          typeof item.acceptedPrice === "number" &&
          item.acceptedPrice > 0,
      );

    if (!itemsToCreate.length) {
      toast.error("No eligible gap opportunities selected for target creation");
      return;
    }

    setBatchMarketGapProcessing(true);
    const toastId = toast.loading(
      `Creating ${itemsToCreate.length} targets in batch...`,
    );

    const BATCH_SIZE = 100;
    let createdCount = 0;
    const createdNames: string[] = [];
    const failed: { name: string; message: string }[] = [];

    try {
      for (let i = 0; i < itemsToCreate.length; i += BATCH_SIZE) {
        const chunk = itemsToCreate.slice(i, i + BATCH_SIZE);
        const requests = chunk.map((item) => {
          const targetPrice =
            marketGapTargetPrices[item.name] ?? item.acceptedPrice;
          return {
            Title: item.name,
            Amount: "1",
            Price: {
              Currency: "USD",
              Amount: parseFloat(targetPrice.toFixed(2)),
            },
          };
        });

        try {
          const res =
            await window.electronAPI.dmarket.batchCreateTargets(requests);
          const results = Array.isArray(res?.Result) ? res.Result : [];
          if (results.length === 0) {
            throw new Error("DMarket returned no results for batch create");
          }

          chunk.forEach((item, idx) => {
            const resultItem = results[idx];
            if (resultItem && resultItem.Successful === false) {
              failed.push({
                name: item.name,
                message: resultItem.Error?.Message || "Rejected by DMarket",
              });
            } else {
              createdCount++;
              createdNames.push(item.name);
            }
          });
        } catch (err: any) {
          chunk.forEach((item) =>
            failed.push({
              name: item.name,
              message: err?.message || "Unknown error",
            }),
          );
        }
      }

      if (createdNames.length) {
        const createdSet = new Set(createdNames);
        setMarketGapResults((prev) =>
          prev.map((result) =>
            createdSet.has(result.name)
              ? { ...result, hasExistingOrder: true }
              : result,
          ),
        );
        setSelectedMarketGapItems((prev) => {
          const next = { ...prev };
          createdNames.forEach((name) => {
            next[name] = false;
          });
          return next;
        });
      }

      if (createdCount > 0 && failed.length === 0) {
        toast.success(`Created ${createdCount} targets in a single batch`, {
          id: toastId,
        });
      } else if (createdCount > 0) {
        toast.success(
          `Created ${createdCount} targets · ${failed.length} failed`,
          { id: toastId },
        );
      } else {
        toast.error(
          `Batch target creation failed: ${failed[0]?.message || "Unknown error"}`,
          { id: toastId },
        );
      }

      fetchTargets();
    } finally {
      setBatchMarketGapProcessing(false);
    }
  };

  const handleUpdateTarget = async (
    target: DmarketTargetItem,
    newPriceUsd: number,
    newAmount: number,
  ) => {
    const toastId = toast.loading(
      `Updating target for ${target.title} to $${newPriceUsd.toFixed(2)}...`,
    );
    try {
      const res = await window.electronAPI.dmarket.updateTarget(
        target.targetId,
        target.title,
        newPriceUsd,
        newAmount,
      );
      const newTargetId = res?.newTargetId || target.targetId;
      const updatedPriceCents = String(Math.round(newPriceUsd * 100));
      const nowIso = res?.updatedAt || new Date().toISOString();
      const nowMs = Date.now();

      setTargets((prev) =>
        prev.map((t) =>
          t.targetId === target.targetId
            ? {
              ...t,
              targetId: newTargetId,
              amount: String(newAmount || 1),
              priceCents: updatedPriceCents,
              updatedAt: nowIso,
              updatedAtMs: nowMs,
              isHoldActive: true,
              holdExpiresAt: nowMs + 660 * 1000,
              holdRemainingSeconds: 660,
            }
            : t,
        ),
      );
      toast.success(`Target updated to $${newPriceUsd.toFixed(2)}`, {
        id: toastId,
      });
      fetchUserData();
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`, { id: toastId });
      throw err;
    }
  };

  const selectedMarketGapTotal = marketGapResults
    .filter((item) => selectedMarketGapItems[item.name])
    .reduce(
      (sum, item) =>
        sum + (marketGapTargetPrices[item.name] ?? item.acceptedPrice ?? 0),
      0,
    );
  const dmarketBalance =
    typeof balanceData?.usdCents === "number" ? balanceData.usdCents / 100 : 0;

  return (
    <div style={styles.container}>
      {/* ── WORKSTATION HEADER ────────────────────────────────────────── */}
      <DmarketHeader
        profileData={profileData}
        balanceData={balanceData}
        balanceLoading={balanceLoading}
        hasKey={hasKey}
        targetCount={targets.length}
        onRefreshBalance={fetchUserData}
      />

      {/* ── MAIN WORKSTATION TABS & UNIFIED ORACLE ACTION ─────────────── */}
      <div style={styles.tabsNav}>
        <div style={styles.tabsLeftGroup}>
          <button
            onClick={() => setMainTab("target")}
            className={`btn ${mainTab === "target" ? "btn-primary" : "btn-outline"} btn-sm`}
            style={styles.tabButton}
          >
            <Target size={13} /> Targets
          </button>
          <button
            onClick={() => setMainTab("soclose")}
            className={`btn ${mainTab === "soclose" ? "btn-primary" : "btn-outline"} btn-sm`}
            style={styles.tabButton}
          >
            <Zap
              size={13}
              style={{
                color:
                  mainTab === "soclose" ? "#ffffff" : "var(--so-accent-cyan)",
              }}
            />{" "}
            So Close
          </button>
          <button
            onClick={() => setMainTab("gap")}
            className={`btn ${mainTab === "gap" ? "btn-primary" : "btn-outline"} btn-sm`}
            style={styles.tabButton}
            title="Items tradable on other markets with no active DMarket listing"
          >
            <Globe size={13} /> Market Gap
          </button>
          <button
            onClick={() => setMainTab("listings")}
            className={`btn ${mainTab === "listings" ? "btn-primary" : "btn-outline"} btn-sm`}
            style={styles.tabButton}
          >
            <Tag size={13} /> Listings & Inventory
          </button>
        </div>

        <div style={styles.tabsRightGroup}>
          <WorkstationOracleAction
            meta={mainTab === "listings" ? listingPricesMeta : acceptedPricesMeta}
            datasetKind={mainTab === "listings" ? "listing" : "accepted"}
            loading={mainTab === "listings" ? loadingListingPrices : loadingPrices}
            onLoad={handleLoadOracle}
          />
        </div>
      </div>

      {/* ── TAB VIEWS ─────────────────────────────────────────────────── */}
      {mainTab === "target" && (
        <TargetTab
          hasKey={hasKey}
          targets={targets}
          setTargets={setTargets}
          loading={loading}
          fetchTargets={fetchTargets}
          isSidebarExpanded={isSidebarExpanded}
          userBalance={
            typeof balanceData?.usdCents === "number"
              ? balanceData.usdCents / 100
              : undefined
          }
          onUserDataUpdated={fetchUserData}
          onOpenLookupModal={handleOpenLookupModal}
          onOpenEditModal={(target, analysis) => {
            setEditingTarget(target);
            setEditingTargetAnalysis(analysis);
          }}
          onOpenMarket={handleOpenDmarketMarket}
          driftThresholdPercent={driftThresholdPercent}
          setDriftThresholdPercent={setDriftThresholdPercent}
          onRegisterLoadOracle={(fn) => {
            targetLoadOracleRef.current = fn;
          }}
          onAcceptedPricesLoaded={(meta) => {
            setAcceptedPricesMeta(meta);
          }}
        />
      )}

      {mainTab === "soclose" && (
        <SoCloseTab
          hasKey={!!hasKey}
          targets={targets}
          balanceData={balanceData}
          isSidebarExpanded={isSidebarExpanded}
          onTargetsUpdated={fetchTargets}
          onOpenLookupModal={handleOpenLookupModal}
          onOpenMarket={handleOpenDmarketMarket}
        />
      )}

      {mainTab === "gap" && (
        <MarketGapTab
          results={marketGapResults}
          isRunning={isMarketGapRunning}
          runScan={runMarketGapScan}
          minOtherMarkets={marketGapMinMarkets}
          setMinOtherMarkets={setMarketGapMinMarkets}
          minPrice={marketGapMinPrice}
          setMinPrice={setMarketGapMinPrice}
          maxPrice={marketGapMaxPrice}
          setMaxPrice={setMarketGapMaxPrice}
          handleSetBalanceAsMax={handleSetMarketGapBalanceAsMax}
          userBalance={dmarketBalance > 0 ? dmarketBalance : undefined}
          buyCeilingOnly={marketGapBuyCeilingOnly}
          setBuyCeilingOnly={setMarketGapBuyCeilingOnly}
          minSssScore={marketGapMinSssScore}
          setMinSssScore={setMarketGapMinSssScore}
          allowedWears={marketGapAllowedWears}
          setAllowedWears={setMarketGapAllowedWears}
          selectedItems={selectedMarketGapItems}
          setSelectedItems={setSelectedMarketGapItems}
          processingName={marketGapProcessingName}
          batchProcessing={batchMarketGapProcessing}
          handleCreateOrder={handleCreateMarketGapTarget}
          handleBatchCreateOrders={executeBatchMarketGapCreate}
          handleOpenTargetMarket={handleOpenDmarketMarket}
          handleOpenLookupModal={handleOpenLookupModal}
          getWearShortcut={getWearShortcut}
          isSidebarExpanded={isSidebarExpanded}
          selectedTotal={selectedMarketGapTotal}
          activeOrdersTotal={0}
          maxLimitValue={dmarketBalance}
          targetMarketName="DMarket"
          createOrderLabel="Create Target"
          batchActionLabel="Create Targets for Selected"
          orderPlacedLabel="TARGET PLACED"
          targetPriceLabel="Target Price"
          limitCaption="available balance"
          CardComponent={DmarketMarketGapCard}
          targetPrices={marketGapTargetPrices}
          onTargetPriceChange={(name, price) =>
            setMarketGapTargetPrices((prev) => ({ ...prev, [name]: price }))
          }
        />
      )}

      {mainTab === "listings" && (
        <ListingsTab
          hasKey={!!hasKey}
          isSidebarExpanded={isSidebarExpanded}
          checkApiKey={checkApiKey}
          onOpenLookupModal={handleOpenLookupModal}
          onOpenMarket={handleOpenDmarketMarket}
          driftThresholdPercent={driftThresholdPercent}
          onRegisterLoadOracle={(fn) => {
            listingsLoadOracleRef.current = fn;
          }}
          onListingPricesLoaded={(meta) => {
            setListingPricesMeta(meta);
          }}
        />
      )}

      {/* ── SHARED MODALS ─────────────────────────────────────────────── */}
      <ItemLookupModal
        item={lookupModalItem}
        onClose={() => setLookupModalItem(null)}
        onOpenMarket={handleOpenDmarketMarket}
      />

      <EditTargetModal
        target={editingTarget}
        targetAnalysis={editingTargetAnalysis}
        onClose={() => {
          setEditingTarget(null);
          setEditingTargetAnalysis(undefined);
        }}
        onUpdate={handleUpdateTarget}
      />
    </div>
  );
}

// ── EXTRACTED STYLES & DYNAMIC STYLE HELPERS ─────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    paddingBottom: "70px",
  },
  tabsNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--so-border-medium)",
    gap: "6px",
    paddingBottom: "2px",
  },
  tabsLeftGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  tabsRightGroup: {
    display: "flex",
    alignItems: "center",
  },
  tabButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    padding: "5px 14px",
  },
};
