import { KeyRound, Loader2, Package, RefreshCw, Tag, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { csfloatLogo } from "../../../../assets/images";
import {
  CsFloatInventoryItem,
  ListingAnalysis,
  ListingPriceInfo,
} from "../../../shared/types";
import { useLayoutStore } from "../../store/useLayoutStore";
import { useTrendStore } from "../../store/useTrendStore";
import { CSFloatBuyLimitIndicator } from "./components/CSFloatBuyLimitIndicator";
import { CSFloatLookupModal } from "./modals/CSFloatLookupModal";
import { BuyOrdersTab } from "./tabs/BuyOrdersTab";
import { ListingsTab } from "./tabs/ListingsTab";
import { SoCloseTab } from "./tabs/SoCloseTab";

import {
  getMarketDisplayName,
  isMarketMatch,
} from "../../../shared/canonicalMarkets";
import { getCsfloatSearchUrl } from "../../utils/csfloatUrls";
import {
  roundToCsFloatStep,
  snapCsFloatBuyOrderPriceCents,
} from "../Oracle/utils/oracleUtils";

const getWearShortcut = (wear?: string) => {
  if (!wear) return "";
  const w = wear.toLowerCase();
  if (w.includes("factory new")) return "FN";
  if (w.includes("minimal wear")) return "MW";
  if (w.includes("field-tested")) return "FT";
  if (w.includes("well-worn")) return "WW";
  if (w.includes("battle-scarred")) return "BS";
  return wear;
};

interface AcceptedPriceEntry {
  acceptedPrice: number;
  liquidityScore: number;
  isHyperLiquid: boolean;
  trendMomentum14d?: number;
}

interface OrderAnalysis {
  acceptedPrice: number;
  liquidityScore: number;
  isHyperLiquid: boolean;
  currentPrice: number;
  trendMomentum14d?: number;
}

interface SoCloseResultItem {
  name: string;
  acceptedPrice: number;
  currentMarketPrice: number;
  closeness: number;
  closenessPercent: number;
  hasExistingOrder: boolean;
  iconUrl?: string;
  trendMomentum14d?: number;
}

const getHumanMarketName = (marketId: string): string => {
  return getMarketDisplayName(marketId);
};

export default function CSFloatWorkstation() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<{
    balance?: number;
    username?: string;
    avatar?: string;
  } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Active Workstation Sub-Tab ('buy_orders' | 'soclose' | 'listings')
  const [activeTab, setActiveTab] = useState<
    "buy_orders" | "soclose" | "listings"
  >("buy_orders");

  // Drift Action Threshold (default 2% difference)
  const [driftThresholdPercent, setDriftThresholdPercent] = useState<number>(2);

  // ── BUY ORDERS STATE ──────────────────────────────────────────────
  const [itemAnalysis, setItemAnalysis] = useState<
    Record<string, OrderAnalysis>
  >({});
  const [acceptedPricesMeta, setAcceptedPricesMeta] = useState<{
    itemCount: number;
    storedAt: string | null;
  } | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(
    {},
  );
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [showExtraActions, setShowExtraActions] = useState(false);

  // ── SO CLOSE SCANNER STATE ─────────────────────────────────────────
  const [soCloseResults, setSoCloseResults] = useState<SoCloseResultItem[]>([]);
  const [isSoCloseRunning, setIsSoCloseRunning] = useState(false);
  const [soCloseMinPrice, setSoCloseMinPrice] = useState<string>("2");
  const [soCloseMaxPrice, setSoCloseMaxPrice] = useState<string>("100");
  const [soCloseMaxCloseness, setSoCloseMaxCloseness] = useState<number>(1.08); // 8% distance ceiling
  const [soCloseAllowedWears, setSoCloseAllowedWears] = useState({
    fn: true,
    mw: true,
    ft: true,
    ww: true,
    bs: true,
    souvenir: true,
    sticker: true,
  });
  const [selectedSoCloseItems, setSelectedSoCloseItems] = useState<
    Record<string, boolean>
  >({});
  const [soCloseProcessingName, setSoCloseProcessingName] = useState<
    string | null
  >(null);
  const [batchSoCloseProcessing, setBatchSoCloseProcessing] = useState(false);

  // ── SINGLE ITEM LOOKUP MODAL STATE ────────────────────────────────
  const [lookupModalItem, setLookupModalItem] = useState<{
    name: string;
    acceptedPrice?: number;
    marketPrice?: number;
    iconUrl?: string;
    cacheItem?: any;
  } | null>(null);

  // ── LISTINGS & INVENTORY STATE ────────────────────────────────────
  const [inventory, setInventory] = useState<CsFloatInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [listingAnalysis, setListingAnalysis] = useState<
    Record<string, ListingAnalysis>
  >({});
  const [listingPricesMeta, setListingPricesMeta] = useState<{
    itemCount: number;
    storedAt: string | null;
  } | null>(null);
  const [loadingListingPrices, setLoadingListingPrices] = useState(false);
  const [isPrivateMode, setIsPrivateMode] = useState<boolean>(false);
  const [selectedListingItems, setSelectedListingItems] = useState<
    Record<string, boolean>
  >({});
  const [listingProcessingId, setListingProcessingId] = useState<string | null>(
    null,
  );
  const [batchListingProcessing, setBatchListingProcessing] = useState(false);

  // ── TREND HISTORY DELEGATION (Global useTrendStore) ───────────────
  const fetchTrendHistoryForItems = (itemNames: string[]) => {
    useTrendStore.getState().fetchHistoryBatch(itemNames, 14);
  };

  // Sidebar expand/collapse state tracking for full-width floating panel positioning
  const isSidebarExpanded = useLayoutStore((state) => state.isSidebarExpanded);

  const checkApiKey = async (): Promise<boolean> => {
    const status = await window.electronAPI.settings.getKeysStatus();
    setHasKey(status.hasCsfloatKey);
    return status.hasCsfloatKey;
  };

  const fetchUserData = async () => {
    setBalanceLoading(true);
    try {
      const data: any = await (window.electronAPI.csfloat as any).getMe();
      const user = data?.user || data;
      setUserData({
        balance: user?.balance ? user.balance / 100 : 0,
        username: user?.username || user?.steam_id || "User",
        avatar: user?.avatar,
      });
    } catch (err: any) {
      console.error("[CSFloat /me] Error:", err);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleOpenCsfloatMarket = (name: string) => {
    const url = getCsfloatSearchUrl(name);
    if (window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const handleOpenLookupModal = async (
    name: string,
    acceptedPrice?: number,
    marketPrice?: number,
    iconUrl?: string,
  ) => {
    setLookupModalItem({ name, acceptedPrice, marketPrice, iconUrl });
    try {
      const cache = await window.electronAPI.skinsnipe.getCache();
      const cacheItem = cache ? cache[name] : null;
      setLookupModalItem((prev) => (prev ? { ...prev, cacheItem } : null));
    } catch (err) {
      console.error("Failed to load item cache for lookup:", err);
    }
    fetchTrendHistoryForItems([name]);
  };

  // ── BUY ORDERS METHODS ───────────────────────────────────────────
  const fetchOrders = async () => {
    const keyOk = await checkApiKey();
    if (!keyOk) {
      toast.error(
        "CSFloat API key is not configured. Please set your key in Settings first.",
      );
      return;
    }

    setLoading(true);
    setSelectedItems({});
    const toastId = toast.loading("Syncing CSFloat buy orders...");
    try {
      const data: any = await window.electronAPI.csfloat.getOrders();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.orders)
          ? data.orders
          : Array.isArray(data?.buy_orders)
            ? data.buy_orders
            : Array.isArray(data?.data)
              ? data.data
              : [];
      setOrders(list);
      fetchTrendHistoryForItems(list.map((o: any) => o.market_hash_name));
      toast.success(`Loaded ${list.length} active buy orders`, { id: toastId });
    } catch (err: any) {
      console.error("[CSFloat Workstation] Error fetching orders:", err);
      toast.error(`CSFloat error: ${err.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const loadAcceptedPrices = async () => {
    setLoadingPrices(true);
    const toastId = toast.loading(
      "Loading accepted prices from local memory...",
    );
    try {
      const result: {
        map: Record<string, AcceptedPriceEntry>;
        itemCount: number;
        storedAt: string | null;
      } = await (window.electronAPI.oracle as any).getAcceptedPrices();

      if (!result || result.itemCount === 0) {
        toast.error(
          "No accepted prices found in memory. Calculate accepted prices in Oracle Dashboard Step 2 first.",
          { id: toastId },
        );
        setLoadingPrices(false);
        return;
      }

      setAcceptedPricesMeta({
        itemCount: result.itemCount,
        storedAt: result.storedAt,
      });

      const newAnalysis: Record<string, OrderAnalysis> = {};
      orders.forEach((order) => {
        const name = order.market_hash_name;
        const priceEntry = result.map[name];
        if (!priceEntry) return;

        const currentPriceDollar = order.price / 100;
        const roundedAcceptedPrice = roundToCsFloatStep(
          priceEntry.acceptedPrice,
        );

        newAnalysis[order.id] = {
          acceptedPrice: roundedAcceptedPrice,
          liquidityScore: priceEntry.liquidityScore,
          isHyperLiquid: priceEntry.isHyperLiquid,
          currentPrice: currentPriceDollar,
          trendMomentum14d: priceEntry.trendMomentum14d,
        };
      });

      setItemAnalysis(newAnalysis);
      fetchTrendHistoryForItems(orders.map((o) => o.market_hash_name));
      toast.success(
        `Matched accepted prices for ${Object.keys(newAnalysis).length} orders`,
        { id: toastId },
      );
    } catch (err: any) {
      toast.error(`Failed to load accepted prices: ${err.message}`, {
        id: toastId,
      });
    } finally {
      setLoadingPrices(false);
    }
  };

  const getOrderDriftDetails = (order: any) => {
    const analysis = itemAnalysis[order.id];
    if (!analysis?.acceptedPrice) return null;

    const currentPrice = order.price / 100;
    const oraclePrice = analysis.acceptedPrice;

    const drift =
      oraclePrice > 0 ? (currentPrice - oraclePrice) / oraclePrice : 0;
    const thresholdFraction = (driftThresholdPercent || 2) / 100;

    const isOverbid = drift > thresholdFraction;
    const isUnderbid = drift < -thresholdFraction;
    const isActionRequired = isOverbid || isUnderbid;

    return {
      acceptedPrice: oraclePrice,
      currentPrice,
      drift,
      driftPercent: drift * 100,
      isActionRequired,
      isOverbid,
      isUnderbid,
      trendMomentum14d: analysis.trendMomentum14d,
    };
  };

  const handleManualUpdate = async (
    id: string,
    marketHashName: string,
    targetAcceptedPrice: number,
    customQty?: number,
  ) => {
    setProcessingId(id);
    const order = orders.find((o) => o.id === id);
    const finalQty = customQty !== undefined ? customQty : order?.qty || 1;
    const maxPriceCents = snapCsFloatBuyOrderPriceCents(
      Math.round(targetAcceptedPrice * 100),
    );
    const targetPriceDollar = (maxPriceCents / 100).toFixed(2);
    const toastId = toast.loading(
      `Updating order (Qty: ${finalQty}) to $${targetPriceDollar}...`,
    );
    try {
      const extraProps =
        order?.hybrid_properties &&
        Object.keys(order.hybrid_properties).length > 0
          ? { hybrid_properties: order.hybrid_properties }
          : undefined;

      await (window.electronAPI.csfloat as any).updateOrder(
        id,
        maxPriceCents,
        finalQty,
        extraProps,
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, qty: finalQty, price: maxPriceCents } : o,
        ),
      );
      toast.success(
        `Order updated (Qty: ${finalQty}) to $${targetPriceDollar}`,
        { id: toastId },
      );
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || err.message || "Unknown error";
      toast.error(`Update failed: ${errorMsg}`, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    setProcessingId(id);
    const toastId = toast.loading("Deleting buy order...");
    try {
      await window.electronAPI.csfloat.deleteOrder(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
      toast.success("Buy order removed", { id: toastId });
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteAllOrders = async () => {
    if (!orders.length) return;

    const confirmed = window.confirm(
      `⚠️ DANGER: Are you sure you want to CANCEL & DELETE ALL ${orders.length} active CSFloat buy orders?\n\nThis action cannot be undone.`,
    );
    if (!confirmed) return;

    setBatchProcessing(true);
    const toastId = toast.loading(
      `Deleting all ${orders.length} active buy orders...`,
    );
    let deletedCount = 0;

    for (const order of orders) {
      setProcessingId(order.id);
      try {
        await window.electronAPI.csfloat.deleteOrder(order.id);
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        deletedCount++;
      } catch (err) {
        console.error(
          `[CSFloat Workstation] 🔴 Error deleting order ${order.id}:`,
          err,
        );
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    setProcessingId(null);
    setBatchProcessing(false);
    toast.success(`Successfully deleted ${deletedCount} buy orders`, {
      id: toastId,
    });
  };

  const executeBatchUpdate = async () => {
    const selectedIds = Object.keys(selectedItems).filter(
      (id) => selectedItems[id],
    );
    if (!selectedIds.length) return;

    setBatchProcessing(true);
    const toastId = toast.loading(
      `Executing batch update on ${selectedIds.length} orders...`,
    );
    let updatedCount = 0;

    for (const id of selectedIds) {
      const order = orders.find((o) => o.id === id);
      const analysis = itemAnalysis[id];
      if (!analysis?.acceptedPrice || !order) continue;

      try {
        await handleManualUpdate(
          id,
          order.market_hash_name,
          analysis.acceptedPrice,
          order.qty || 1,
        );
        setSelectedItems((prev) => ({ ...prev, [id]: false }));
        updatedCount++;
      } catch (err) {
        console.error(
          `[CSFloat Workstation] 🔴 Batch Item Error for ${id}:`,
          err,
        );
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    setBatchProcessing(false);
    toast.success(`Completed batch update for ${updatedCount} orders`, {
      id: toastId,
    });
  };

  const executeBatchDelete = async () => {
    const selectedIds = Object.keys(selectedItems).filter(
      (id) => selectedItems[id],
    );
    if (!selectedIds.length) return;

    const confirmed = window.confirm(
      `Are you sure you want to cancel and delete ${selectedIds.length} selected CSFloat buy orders?`,
    );
    if (!confirmed) return;

    setBatchProcessing(true);
    const toastId = toast.loading(
      `Deleting ${selectedIds.length} buy orders...`,
    );
    let deletedCount = 0;

    for (const id of selectedIds) {
      setProcessingId(id);
      try {
        await window.electronAPI.csfloat.deleteOrder(id);
        setOrders((prev) => prev.filter((o) => o.id !== id));
        setSelectedItems((prev) => ({ ...prev, [id]: false }));
        deletedCount++;
      } catch (err) {
        console.error(
          `[CSFloat Workstation] 🔴 Error deleting order ${id}:`,
          err,
        );
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    setProcessingId(null);
    setBatchProcessing(false);
    toast.success(`Successfully deleted ${deletedCount} buy orders`, {
      id: toastId,
    });
  };

  const selectActionRequiredItems = () => {
    const newSelect: Record<string, boolean> = {};
    orders.forEach((o) => {
      const driftDetails = getOrderDriftDetails(o);
      if (driftDetails?.isActionRequired) {
        newSelect[o.id] = true;
      }
    });
    setSelectedItems(newSelect);
  };

  const selectAllMatched = () => {
    const newSelect: Record<string, boolean> = {};
    orders.forEach((o) => {
      if (itemAnalysis[o.id]?.acceptedPrice) {
        newSelect[o.id] = true;
      }
    });
    setSelectedItems(newSelect);
  };

  const clearSelection = () => setSelectedItems({});

  // ── SO CLOSE SCANNER METHODS ──────────────────────────────────────
  const runSoCloseScan = async () => {
    setIsSoCloseRunning(true);
    setSelectedSoCloseItems({});
    const toastId = toast.loading("Running So Close market scan...");

    try {
      const acceptedRes: {
        map: Record<string, { acceptedPrice: number }>;
        itemCount: number;
      } = await (window.electronAPI.oracle as any).getAcceptedPrices();

      if (
        !acceptedRes ||
        !acceptedRes.map ||
        Object.keys(acceptedRes.map).length === 0
      ) {
        toast.error(
          "No accepted prices found in memory. Calculate Step 2 Accepted Prices in Oracle Dashboard first.",
          { id: toastId },
        );
        setIsSoCloseRunning(false);
        return;
      }

      const priceCache: Record<string, any> =
        await window.electronAPI.skinsnipe.getCache();

      const minP = Math.max(0, parseFloat(soCloseMinPrice) || 0);
      const maxP = Math.max(0, parseFloat(soCloseMaxPrice) || 9999);
      const results: SoCloseResultItem[] = [];

      const activeOrderNamesSet = new Set(
        orders.map((o) => o.market_hash_name),
      );
      const namesToScan = Object.keys(acceptedRes.map);

      for (const name of namesToScan) {
        const acceptedEntry = acceptedRes.map[name];
        if (!acceptedEntry || acceptedEntry.acceptedPrice <= 0) continue;

        const acceptedPrice = roundToCsFloatStep(acceptedEntry.acceptedPrice);
        if (acceptedPrice <= 0) continue;

        const nameLower = name.toLowerCase();

        if (nameLower.includes("souvenir") && !soCloseAllowedWears.souvenir)
          continue;
        if (nameLower.includes("sticker |") && !soCloseAllowedWears.sticker)
          continue;
        if (nameLower.includes("(factory new)") && !soCloseAllowedWears.fn)
          continue;
        if (nameLower.includes("(minimal wear)") && !soCloseAllowedWears.mw)
          continue;
        if (nameLower.includes("(field-tested)") && !soCloseAllowedWears.ft)
          continue;
        if (nameLower.includes("(well-worn)") && !soCloseAllowedWears.ww)
          continue;
        if (nameLower.includes("(battle-scarred)") && !soCloseAllowedWears.bs)
          continue;

        const cacheItem = priceCache ? priceCache[name] : null;
        let csfloatPrice = 0;
        if (cacheItem?.l && Array.isArray(cacheItem.l)) {
          const csfloatEntry = cacheItem.l.find((m: any) =>
            isMarketMatch(m.m, "csfloat"),
          );
          if (csfloatEntry) csfloatPrice = csfloatEntry.p;
        }

        if (csfloatPrice <= 0 && cacheItem?.lowestPrice) {
          csfloatPrice = cacheItem.lowestPrice;
        }

        if (csfloatPrice <= 0) continue;
        if (csfloatPrice < minP || csfloatPrice > maxP) continue;

        const closeness = csfloatPrice / acceptedPrice;
        if (closeness <= soCloseMaxCloseness) {
          const hasExisting = activeOrderNamesSet.has(name);
          results.push({
            name,
            acceptedPrice,
            currentMarketPrice: csfloatPrice,
            closeness: parseFloat(closeness.toFixed(4)),
            closenessPercent: parseFloat(((closeness - 1) * 100).toFixed(1)),
            hasExistingOrder: hasExisting,
            iconUrl: cacheItem?.icon_url,
            trendMomentum14d: (acceptedEntry as any)?.trendMomentum14d,
          });
        }
      }

      results.sort((a, b) => a.closeness - b.closeness);

      // Safety limit: Never render more than 200 items
      const sliced = results.slice(0, 200);
      setSoCloseResults(sliced);
      fetchTrendHistoryForItems(sliced.map((s) => s.name));
      toast.success(
        `Found ${Math.min(results.length, 200)} So Close opportunities matching your criteria!`,
        { id: toastId },
      );
    } catch (err: any) {
      toast.error(`So Close scan error: ${err.message}`, { id: toastId });
    } finally {
      setIsSoCloseRunning(false);
    }
  };

  const handleCreateSoCloseBuyOrder = async (item: SoCloseResultItem) => {
    const keyOk = await checkApiKey();
    if (!keyOk) {
      toast.error(
        "CSFloat API key is not configured. Please set your key in Settings first.",
      );
      return;
    }

    setSoCloseProcessingName(item.name);
    const targetCents = snapCsFloatBuyOrderPriceCents(
      Math.round(item.acceptedPrice * 100),
    );
    const targetPriceDollar = (targetCents / 100).toFixed(2);
    const toastId = toast.loading(
      `Creating buy order for ${item.name} at $${targetPriceDollar}...`,
    );

    try {
      await window.electronAPI.csfloat.createBuyOrder(
        item.name,
        targetCents,
        1,
      );

      setSoCloseResults((prev) =>
        prev.map((r) =>
          r.name === item.name ? { ...r, hasExistingOrder: true } : r,
        ),
      );
      toast.success(
        `Buy order created for ${item.name} at $${targetPriceDollar}`,
        { id: toastId },
      );
    } catch (err: any) {
      toast.error(`Failed to create buy order: ${err.message}`, {
        id: toastId,
      });
    } finally {
      setSoCloseProcessingName(null);
    }
  };

  const executeBatchSoCloseCreate = async () => {
    const selectedNames = Object.keys(selectedSoCloseItems).filter(
      (name) => selectedSoCloseItems[name],
    );
    if (!selectedNames.length) return;

    setBatchSoCloseProcessing(true);
    const toastId = toast.loading(
      `Executing batch buy order creation for ${selectedNames.length} items...`,
    );
    let createdCount = 0;

    for (const name of selectedNames) {
      const item = soCloseResults.find((r) => r.name === name);
      if (!item || item.hasExistingOrder) continue;

      try {
        await handleCreateSoCloseBuyOrder(item);
        setSelectedSoCloseItems((prev) => ({ ...prev, [name]: false }));
        createdCount++;
      } catch (err) {
        console.error(`[So Close Batch Error for ${name}]:`, err);
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    setBatchSoCloseProcessing(false);
    toast.success(`Successfully created ${createdCount} buy orders`, {
      id: toastId,
    });
  };

  const selectAllSoCloseAvailable = () => {
    const newSelect: Record<string, boolean> = {};
    soCloseResults.forEach((r) => {
      if (!r.hasExistingOrder) {
        newSelect[r.name] = true;
      }
    });
    setSelectedSoCloseItems(newSelect);
  };

  const selectBestSoClose = () => {
    const newSelect: Record<string, boolean> = {};
    soCloseResults.forEach((r) => {
      if (!r.hasExistingOrder && r.closeness <= 1.05) {
        newSelect[r.name] = true;
      }
    });
    setSelectedSoCloseItems(newSelect);
  };

  const clearSoCloseSelection = () => setSelectedSoCloseItems({});

  const handleSetBalanceAsMax = () => {
    if (
      userData &&
      typeof userData.balance === "number" &&
      userData.balance > 0
    ) {
      const dollarVal = userData.balance.toFixed(2);
      setSoCloseMaxPrice(dollarVal);
      toast.success(`Max price set to CSFloat balance ($${dollarVal})`);
    } else {
      toast.error("CSFloat balance is $0.00 or unavailable");
    }
  };

  // ── LISTINGS & INVENTORY METHODS ─────────────────────────────────
  const fetchInventory = async () => {
    const keyOk = await checkApiKey();
    if (!keyOk) {
      toast.error(
        "CSFloat API key is not configured. Please set your key in Settings first.",
      );
      return;
    }

    setInventoryLoading(true);
    setSelectedListingItems({});
    const toastId = toast.loading("Syncing CSFloat user inventory...");
    try {
      const list = await window.electronAPI.csfloat.getInventory();
      setInventory(list);
      fetchTrendHistoryForItems(
        list.map((i) => i.market_hash_name || i.item_name || ""),
      );
      toast.success(`Loaded ${list.length} inventory items`, { id: toastId });
    } catch (err: any) {
      console.error("[CSFloat Workstation] Error fetching inventory:", err);
      toast.error(`CSFloat Inventory error: ${err.message}`, { id: toastId });
    } finally {
      setInventoryLoading(false);
    }
  };

  const loadListingPrices = async () => {
    setLoadingListingPrices(true);
    const toastId = toast.loading(
      "Loading listing prices from local Oracle memory...",
    );
    try {
      const result: {
        map: Record<string, ListingPriceInfo>;
        itemCount: number;
        storedAt: string | null;
      } = await window.electronAPI.oracle.getListingPrices();

      if (!result || result.itemCount === 0) {
        toast.error(
          "No listing prices found in memory. Generate listing prices in Oracle Dashboard Step 3 first.",
          { id: toastId },
        );
        setLoadingListingPrices(false);
        return;
      }

      setListingPricesMeta({
        itemCount: result.itemCount,
        storedAt: result.storedAt,
      });

      const newAnalysis: Record<string, ListingAnalysis> = {};
      inventory.forEach((item) => {
        const name = item.market_hash_name || item.item_name;
        if (!name) return;

        const priceEntry = result.map[name];
        if (!priceEntry) return;

        const targetPrice = roundToCsFloatStep(priceEntry.listingPrice);
        const isListed = !!item.listing_id;
        const currentPriceDollar =
          isListed && item.price ? item.price / 100 : null;

        let drift = 0;
        let driftPercent = 0;
        let isOverpriced = false;
        let isUnderpriced = false;

        if (isListed && currentPriceDollar !== null && targetPrice > 0) {
          drift = (currentPriceDollar - targetPrice) / targetPrice;
          driftPercent = drift * 100;
          const thresholdFraction = (driftThresholdPercent || 2) / 100;
          isOverpriced = drift > thresholdFraction;
          isUnderpriced = drift < -thresholdFraction;
        }

        const isActionRequired = !isListed || isOverpriced || isUnderpriced;

        newAnalysis[item.asset_id] = {
          targetListingPrice: targetPrice,
          mode: priceEntry.mode,
          offsetPercent: priceEntry.offsetPercent,
          lowestPrice: priceEntry.lowestPrice,
          averagePrice: priceEntry.averagePrice,
          currentPrice: currentPriceDollar,
          isListed,
          drift,
          driftPercent,
          isActionRequired,
          isOverpriced,
          isUnderpriced,
        };
      });

      setListingAnalysis(newAnalysis);
      toast.success(
        `Matched listing prices for ${Object.keys(newAnalysis).length} items`,
        { id: toastId },
      );
    } catch (err: any) {
      toast.error(`Failed to load listing prices: ${err.message}`, {
        id: toastId,
      });
    } finally {
      setLoadingListingPrices(false);
    }
  };

  const handleCreateListing = async (
    item: CsFloatInventoryItem,
    customPrice?: number,
  ) => {
    const analysis = listingAnalysis[item.asset_id];
    const targetPrice =
      customPrice ??
      analysis?.targetListingPrice ??
      (item.reference?.predicted_price
        ? item.reference.predicted_price / 100
        : null);

    if (!targetPrice || targetPrice <= 0) {
      toast.error("No valid target listing price available for this item");
      return;
    }

    setListingProcessingId(item.asset_id);
    const priceCents = Math.round(targetPrice * 100);
    const modeLabel = isPrivateMode ? "Private" : "Public";
    const toastId = toast.loading(
      `Creating ${modeLabel} listing at $${targetPrice.toFixed(2)}...`,
    );

    try {
      const res = await window.electronAPI.csfloat.createListing(
        item.asset_id,
        priceCents,
        isPrivateMode,
      );
      const createdListingId = res?.id || res?.listing?.id || "listed";

      setInventory((prev) =>
        prev.map((invItem) =>
          invItem.asset_id === item.asset_id
            ? {
                ...invItem,
                listing_id: createdListingId,
                price: priceCents,
                private: isPrivateMode,
              }
            : invItem,
        ),
      );

      setListingAnalysis((prev) => ({
        ...prev,
        [item.asset_id]: {
          ...(prev[item.asset_id] || {
            targetListingPrice: targetPrice,
            mode: "manual",
            offsetPercent: 0,
            lowestPrice: targetPrice,
            averagePrice: targetPrice,
          }),
          currentPrice: targetPrice,
          isListed: true,
          drift: 0,
          driftPercent: 0,
          isActionRequired: false,
          isOverpriced: false,
          isUnderpriced: false,
        },
      }));

      toast.success(
        `Listing created successfully ($${targetPrice.toFixed(2)} - ${modeLabel})`,
        { id: toastId },
      );
    } catch (err: any) {
      toast.error(`Failed to create listing: ${err.message}`, { id: toastId });
    } finally {
      setListingProcessingId(null);
    }
  };

  const handleUpdateListing = async (
    item: CsFloatInventoryItem,
    targetPrice: number,
  ) => {
    if (!item.listing_id) return;

    setListingProcessingId(item.asset_id);
    const priceCents = Math.round(targetPrice * 100);
    const toastId = toast.loading(
      `Updating listing price to $${targetPrice.toFixed(2)}...`,
    );

    try {
      await window.electronAPI.csfloat.updateListing(
        item.listing_id,
        priceCents,
        isPrivateMode,
      );

      setInventory((prev) =>
        prev.map((invItem) =>
          invItem.asset_id === item.asset_id
            ? {
                ...invItem,
                price: priceCents,
                private: isPrivateMode,
              }
            : invItem,
        ),
      );

      setListingAnalysis((prev) => ({
        ...prev,
        [item.asset_id]: {
          ...(prev[item.asset_id] || {
            targetListingPrice: targetPrice,
            mode: "manual",
            offsetPercent: 0,
            lowestPrice: targetPrice,
            averagePrice: targetPrice,
          }),
          currentPrice: targetPrice,
          isListed: true,
          drift: 0,
          driftPercent: 0,
          isActionRequired: false,
          isOverpriced: false,
          isUnderpriced: false,
        },
      }));

      toast.success(`Listing updated to $${targetPrice.toFixed(2)}`, {
        id: toastId,
      });
    } catch (err: any) {
      toast.error(`Failed to update listing: ${err.message}`, { id: toastId });
    } finally {
      setListingProcessingId(null);
    }
  };

  const handleUnlist = async (item: CsFloatInventoryItem) => {
    if (!item.listing_id) return;

    setListingProcessingId(item.asset_id);
    const toastId = toast.loading("Removing CSFloat listing (unlisting)...");

    try {
      await window.electronAPI.csfloat.deleteListing(item.listing_id);

      setInventory((prev) =>
        prev.map((invItem) =>
          invItem.asset_id === item.asset_id
            ? {
                ...invItem,
                listing_id: undefined,
                price: undefined,
              }
            : invItem,
        ),
      );

      setListingAnalysis((prev) => {
        const copy = { ...prev };
        if (copy[item.asset_id]) {
          copy[item.asset_id] = {
            ...copy[item.asset_id],
            currentPrice: null,
            isListed: false,
            drift: 0,
            driftPercent: 0,
            isActionRequired: true,
            isOverpriced: false,
            isUnderpriced: false,
          };
        }
        return copy;
      });

      toast.success("Listing removed (Item unlisted)", { id: toastId });
    } catch (err: any) {
      toast.error(`Failed to unlist item: ${err.message}`, { id: toastId });
    } finally {
      setListingProcessingId(null);
    }
  };

  const executeBatchList = async () => {
    const selectedIds = Object.keys(selectedListingItems).filter(
      (id) => selectedListingItems[id],
    );
    const unlistedToCreate = inventory.filter(
      (i) => selectedIds.includes(i.asset_id) && !i.listing_id,
    );

    if (!unlistedToCreate.length) {
      toast.error("No unlisted items selected for listing creation");
      return;
    }

    setBatchListingProcessing(true);
    const toastId = toast.loading(
      `Creating ${unlistedToCreate.length} listings (${isPrivateMode ? "Private" : "Public"})...`,
    );
    let count = 0;

    for (const item of unlistedToCreate) {
      const analysis = listingAnalysis[item.asset_id];
      const targetPrice = analysis?.targetListingPrice;
      if (!targetPrice) continue;

      try {
        await handleCreateListing(item, targetPrice);
        setSelectedListingItems((prev) => ({
          ...prev,
          [item.asset_id]: false,
        }));
        count++;
      } catch (err) {
        console.error(
          `[Batch Create Listing Error for ${item.asset_id}]:`,
          err,
        );
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    setBatchListingProcessing(false);
    toast.success(`Batch listed ${count} items successfully`, { id: toastId });
  };

  const executeBatchUpdateListings = async () => {
    const selectedIds = Object.keys(selectedListingItems).filter(
      (id) => selectedListingItems[id],
    );
    const listedToUpdate = inventory.filter(
      (i) => selectedIds.includes(i.asset_id) && i.listing_id,
    );

    if (!listedToUpdate.length) {
      toast.error("No active listings selected for price update");
      return;
    }

    setBatchListingProcessing(true);
    const toastId = toast.loading(
      `Updating ${listedToUpdate.length} active listings...`,
    );
    let count = 0;

    for (const item of listedToUpdate) {
      const analysis = listingAnalysis[item.asset_id];
      const targetPrice = analysis?.targetListingPrice;
      if (!targetPrice) continue;

      try {
        await handleUpdateListing(item, targetPrice);
        setSelectedListingItems((prev) => ({
          ...prev,
          [item.asset_id]: false,
        }));
        count++;
      } catch (err) {
        console.error(
          `[Batch Update Listing Error for ${item.asset_id}]:`,
          err,
        );
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    setBatchListingProcessing(false);
    toast.success(`Batch updated ${count} listings successfully`, {
      id: toastId,
    });
  };

  const executeBatchUnlist = async () => {
    const selectedIds = Object.keys(selectedListingItems).filter(
      (id) => selectedListingItems[id],
    );
    const listedToUnlist = inventory.filter(
      (i) => selectedIds.includes(i.asset_id) && i.listing_id,
    );

    if (!listedToUnlist.length) {
      toast.error("No active listings selected for unlisting");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to unlist ${listedToUnlist.length} active listings from CSFloat?`,
    );
    if (!confirmed) return;

    setBatchListingProcessing(true);
    const toastId = toast.loading(
      `Unlisting ${listedToUnlist.length} items...`,
    );
    let count = 0;

    for (const item of listedToUnlist) {
      try {
        await handleUnlist(item);
        setSelectedListingItems((prev) => ({
          ...prev,
          [item.asset_id]: false,
        }));
        count++;
      } catch (err) {
        console.error(`[Batch Unlist Error for ${item.asset_id}]:`, err);
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    setBatchListingProcessing(false);
    toast.success(`Batch unlisted ${count} items successfully`, {
      id: toastId,
    });
  };

  // Selection filters for listings
  const selectUnlistedListings = () => {
    const newSelect: Record<string, boolean> = {};
    inventory.forEach((i) => {
      if (!i.listing_id && listingAnalysis[i.asset_id]?.targetListingPrice) {
        newSelect[i.asset_id] = true;
      }
    });
    setSelectedListingItems(newSelect);
  };

  const selectActionRequiredListings = () => {
    const newSelect: Record<string, boolean> = {};
    inventory.forEach((i) => {
      const a = listingAnalysis[i.asset_id];
      if (a?.isActionRequired) {
        newSelect[i.asset_id] = true;
      }
    });
    setSelectedListingItems(newSelect);
  };

  const selectOverpricedListings = () => {
    const newSelect: Record<string, boolean> = {};
    inventory.forEach((i) => {
      const a = listingAnalysis[i.asset_id];
      if (a?.isOverpriced) {
        newSelect[i.asset_id] = true;
      }
    });
    setSelectedListingItems(newSelect);
  };

  const selectUnderpricedListings = () => {
    const newSelect: Record<string, boolean> = {};
    inventory.forEach((i) => {
      const a = listingAnalysis[i.asset_id];
      if (a?.isUnderpriced) {
        newSelect[i.asset_id] = true;
      }
    });
    setSelectedListingItems(newSelect);
  };

  const selectAllMatchedListings = () => {
    const newSelect: Record<string, boolean> = {};
    inventory.forEach((i) => {
      if (listingAnalysis[i.asset_id]?.targetListingPrice) {
        newSelect[i.asset_id] = true;
      }
    });
    setSelectedListingItems(newSelect);
  };

  const clearListingSelection = () => setSelectedListingItems({});

  useEffect(() => {
    window.electronAPI.settings.getKeysStatus().then((status) => {
      setHasKey(status.hasCsfloatKey);
      if (status.hasCsfloatKey) {
        fetchUserData();
        fetchOrders();
      }
    });
  }, []);

  useEffect(() => {
    if (orders.length > 0) {
      fetchTrendHistoryForItems(orders.map((o) => o.market_hash_name));
    }
  }, [orders]);

  // Counts & Totals for Buy Orders & Limit
  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const pricesLoaded = acceptedPricesMeta !== null;
  const matchedCount = Object.keys(itemAnalysis).length;
  const actionRequiredCount = orders.filter(
    (o) => getOrderDriftDetails(o)?.isActionRequired,
  ).length;

  // Totals for Buy Limit Indicator (CSFloat 10x balance rule & 1,000 orders max limit)
  const selectedOrdersTotal = orders
    .filter((order) => selectedItems[order.id])
    .reduce((sum, order) => {
      const price = (order.price || 0) / 100;
      const qty = order.qty || order.quantity || 1;
      return sum + price * qty;
    }, 0);

  const activeOrdersTotal = orders.reduce((sum, order) => {
    const price = (order.price || 0) / 100;
    const qty = order.qty || order.quantity || 1;
    return sum + price * qty;
  }, 0);

  // Counts & Totals for So Close Opportunities
  const selectedSoCloseCount =
    Object.values(selectedSoCloseItems).filter(Boolean).length;
  const selectedSoCloseTotal = soCloseResults
    .filter((item) => selectedSoCloseItems[item.name])
    .reduce((sum, item) => sum + (item.acceptedPrice || 0), 0);

  // Maximum buy order exposure limit: 10x balance
  const maxLimitValue =
    userData?.balance && userData.balance > 0 ? userData.balance * 10 : 0;

  // Counts for Listings & Inventory
  const listingPricesLoaded = listingPricesMeta !== null;
  const matchedListingCount = Object.keys(listingAnalysis).length;
  const listedCount = inventory.filter((i) => !!i.listing_id).length;
  const unlistedCount = inventory.filter((i) => !i.listing_id).length;
  const overpricedCount = Object.values(listingAnalysis).filter(
    (a) => a.isOverpriced,
  ).length;
  const underpricedCount = Object.values(listingAnalysis).filter(
    (a) => a.isUnderpriced,
  ).length;
  const actionReqListingCount = Object.values(listingAnalysis).filter(
    (a) => a.isActionRequired,
  ).length;
  const selectedListingCount =
    Object.values(selectedListingItems).filter(Boolean).length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 48px)",
        gap: "10px",
        overflow: "hidden",
      }}
    >
      {/* SINGLE ITEM LOOKUP MODAL */}
      <CSFloatLookupModal
        item={lookupModalItem}
        onClose={() => setLookupModalItem(null)}
        onOpenMarket={handleOpenCsfloatMarket}
        getHumanMarketName={getHumanMarketName}
      />

      {/* FIXED TOP SECTION (Controls, Header, Sub-Tabs & Stats) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          flexShrink: 0,
        }}
      >
        {/* API Key Missing Warning Banner */}
        {hasKey === false && (
          <div
            style={{
              backgroundColor: "var(--so-warning-bg)",
              border: "1px solid var(--so-warning-border)",
              color: "var(--so-warning-text)",
              padding: "10px 16px",
              borderRadius: "var(--so-radius-md)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontWeight: 700,
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <KeyRound size={16} style={{ color: "var(--so-warning)" }} />{" "}
              CSFloat API Key is not configured. Please add your key in
              Settings.
            </div>
            <Link
              to="/settings"
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: "none", fontSize: "11px" }}
            >
              Go to Settings
            </Link>
          </div>
        )}

        {/* Main Header Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 16px",
            backgroundColor: "var(--so-surface-header)",
            border: "1px solid var(--so-border-medium)",
            borderRadius: "var(--so-radius-md)",
            gap: "12px",
          }}
        >
          {/* Brand & Status */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "3px",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img
                src={csfloatLogo}
                alt="CSFloat"
                style={{ height: 22, width: "auto", objectFit: "contain" }}
              />
              <span
                style={{
                  color: "var(--so-text-primary)",
                  fontWeight: 800,
                  fontSize: "15px",
                  letterSpacing: "-0.3px",
                }}
              >
                CSFloat Workstation
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: (
                    activeTab === "listings"
                      ? listingPricesLoaded
                      : pricesLoaded
                  )
                    ? "var(--so-success)"
                    : "var(--so-warning)",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  letterSpacing: "0.4px",
                  color: (
                    activeTab === "listings"
                      ? listingPricesLoaded
                      : pricesLoaded
                  )
                    ? "var(--so-success-text)"
                    : "var(--so-warning-text)",
                }}
              >
                {activeTab === "listings"
                  ? listingPricesLoaded
                    ? `ORACLE LISTING PRICES LOADED (${listingPricesMeta!.itemCount.toLocaleString()} ITEMS)`
                    : "NO LISTING PRICES IN MEMORY — GENERATE IN ORACLE STEP 3"
                  : pricesLoaded
                    ? `ORACLE ACCEPTED PRICES LOADED (${acceptedPricesMeta!.itemCount.toLocaleString()} ITEMS)`
                    : "NO ACCEPTED PRICES IN MEMORY — CALCULATE IN ORACLE STEP 2"}
              </span>
            </div>
          </div>

          {/* CSFloat Buy Order 10x Balance & Count Limit Indicator (Active on Buy Tabs) */}
          {activeTab !== "listings" && (
            <CSFloatBuyLimitIndicator
              balance={userData?.balance}
              balanceLoading={balanceLoading}
              orders={orders}
              ordersLoading={loading}
              activeTab={activeTab}
              selectedSoCloseTotal={selectedSoCloseTotal}
              selectedSoCloseCount={selectedSoCloseCount}
              selectedOrdersTotal={selectedOrdersTotal}
              selectedOrdersCount={selectedCount}
            />
          )}

          {/* Balance Widget */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              backgroundColor: "var(--so-surface-card)",
              border: "1px solid var(--so-border-medium)",
              padding: "5px 12px",
              borderRadius: "var(--so-radius-md)",
              flexShrink: 0,
            }}
          >
            {userData?.avatar && (
              <img
                src={userData.avatar}
                alt="avatar"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "4px",
                  border: "1px solid var(--so-border-subtle)",
                }}
              />
            )}
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "9px",
                  color: "var(--so-text-muted)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                CSFloat Balance
              </div>
              <div
                className="tabular-nums"
                style={{
                  fontSize: "13.5px",
                  fontWeight: 800,
                  color: "#ffffff",
                }}
              >
                $
                {userData?.balance !== undefined
                  ? userData.balance.toFixed(2)
                  : "--.--"}
              </div>
            </div>
            <button
              onClick={() => {
                if (hasKey) fetchUserData();
                else checkApiKey();
              }}
              disabled={balanceLoading}
              className="btn btn-secondary btn-sm"
              title="Refresh Balance"
              style={{ padding: "3px 6px" }}
            >
              {balanceLoading ? (
                <Loader2 size={12} className="spin" />
              ) : (
                <RefreshCw size={12} />
              )}
            </button>
          </div>
        </div>

        {/* Workstation Sub-Tabs Navigation */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--so-border-medium)",
            gap: "6px",
            paddingBottom: "2px",
          }}
        >
          <button
            onClick={() => setActiveTab("buy_orders")}
            className={`btn ${activeTab === "buy_orders" ? "btn-primary" : "btn-outline"} btn-sm`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              padding: "5px 12px",
            }}
          >
            <Package size={13} /> Buy Orders
          </button>
          <button
            onClick={() => setActiveTab("soclose")}
            className={`btn ${activeTab === "soclose" ? "btn-primary" : "btn-outline"} btn-sm`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              padding: "5px 12px",
            }}
          >
            <Zap
              size={13}
              style={{
                color:
                  activeTab === "soclose" ? "#ffffff" : "var(--so-accent-cyan)",
              }}
            />{" "}
            So Close Opportunities
          </button>
          <button
            onClick={() => setActiveTab("listings")}
            className={`btn ${activeTab === "listings" ? "btn-primary" : "btn-outline"} btn-sm`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              padding: "5px 12px",
            }}
          >
            <Tag size={13} /> Listings & Inventory
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "buy_orders" && (
        <BuyOrdersTab
          orders={orders}
          setOrders={setOrders}
          loading={loading}
          fetchOrders={fetchOrders}
          loadingPrices={loadingPrices}
          pricesLoaded={pricesLoaded}
          loadAcceptedPrices={loadAcceptedPrices}
          driftThresholdPercent={driftThresholdPercent}
          setDriftThresholdPercent={setDriftThresholdPercent}
          getOrderDriftDetails={getOrderDriftDetails}
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems}
          processingId={processingId}
          batchProcessing={batchProcessing}
          handleManualUpdate={handleManualUpdate}
          handleDeleteOrder={handleDeleteOrder}
          handleBatchUpdate={executeBatchUpdate}
          handleBatchDelete={executeBatchDelete}
          handleDeleteAllOrders={handleDeleteAllOrders}
          handleOpenCsfloatMarket={handleOpenCsfloatMarket}
          handleOpenLookupModal={handleOpenLookupModal}
          isSidebarExpanded={isSidebarExpanded}
          selectedOrdersTotal={selectedOrdersTotal}
          maxLimitValue={maxLimitValue}
        />
      )}

      {activeTab === "soclose" && (
        <SoCloseTab
          soCloseResults={soCloseResults}
          isSoCloseRunning={isSoCloseRunning}
          runSoCloseScan={runSoCloseScan}
          soCloseMinPrice={soCloseMinPrice}
          setSoCloseMinPrice={setSoCloseMinPrice}
          soCloseMaxPrice={soCloseMaxPrice}
          setSoCloseMaxPrice={setSoCloseMaxPrice}
          handleSetBalanceAsMax={handleSetBalanceAsMax}
          userData={userData}
          soCloseMaxCloseness={soCloseMaxCloseness}
          setSoCloseMaxCloseness={setSoCloseMaxCloseness}
          soCloseAllowedWears={soCloseAllowedWears}
          setSoCloseAllowedWears={setSoCloseAllowedWears}
          selectedSoCloseItems={selectedSoCloseItems}
          setSelectedSoCloseItems={setSelectedSoCloseItems}
          soCloseProcessingName={soCloseProcessingName}
          batchSoCloseProcessing={batchSoCloseProcessing}
          handleCreateSoCloseBuyOrder={handleCreateSoCloseBuyOrder}
          handleBatchCreateSoCloseOrders={executeBatchSoCloseCreate}
          handleOpenCsfloatMarket={handleOpenCsfloatMarket}
          handleOpenLookupModal={handleOpenLookupModal}
          getWearShortcut={getWearShortcut}
          isSidebarExpanded={isSidebarExpanded}
          selectedSoCloseTotal={selectedSoCloseTotal}
          activeOrdersTotal={activeOrdersTotal}
          maxLimitValue={maxLimitValue}
        />
      )}

      {activeTab === "listings" && (
        <ListingsTab
          inventory={inventory}
          inventoryLoading={inventoryLoading}
          fetchInventory={fetchInventory}
          loadingListingPrices={loadingListingPrices}
          listingPricesLoaded={listingPricesLoaded}
          loadListingPrices={loadListingPrices}
          isPrivateMode={isPrivateMode}
          setIsPrivateMode={setIsPrivateMode}
          listingAnalysis={listingAnalysis}
          selectedListingItems={selectedListingItems}
          setSelectedListingItems={setSelectedListingItems}
          listingProcessingId={listingProcessingId}
          batchListingProcessing={batchListingProcessing}
          handleCreateListing={handleCreateListing}
          handleUpdateListing={handleUpdateListing}
          handleUnlist={handleUnlist}
          handleBatchCreateListings={executeBatchList}
          handleBatchUpdateListings={executeBatchUpdateListings}
          handleBatchUnlist={executeBatchUnlist}
          handleOpenCsfloatMarket={handleOpenCsfloatMarket}
          handleOpenLookupModal={handleOpenLookupModal}
          getWearShortcut={getWearShortcut}
          isSidebarExpanded={isSidebarExpanded}
        />
      )}
    </div>
  );
}
