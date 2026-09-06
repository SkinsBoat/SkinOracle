import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Package,
  RotateCw,
  Link as LinkIcon,
  Trash2,
  Loader2,
  RefreshCw,
  KeyRound,
  Percent,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Check,
  ChevronLeft,
  ChevronRight,
  Tag,
  Lock,
  Globe,
  PlusCircle,
  Edit3,
  Zap,
  Filter,
  ExternalLink,
  Eye,
  X,
  Search,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { csfloatLogo } from '../../../../assets/images';
import { CsFloatInventoryItem, ListingAnalysis, ListingPriceInfo } from '../../../shared/types';
import { safeGetItem } from '../../utils/storage';

import { roundToCsFloatStep, snapCsFloatBuyOrderPriceCents } from '../Oracle/utils/oracleUtils';

const getWearShortcut = (wear?: string) => {
  if (!wear) return '';
  const w = wear.toLowerCase();
  if (w.includes('factory new')) return 'FN';
  if (w.includes('minimal wear')) return 'MW';
  if (w.includes('field-tested')) return 'FT';
  if (w.includes('well-worn')) return 'WW';
  if (w.includes('battle-scarred')) return 'BS';
  return wear;
};

interface AcceptedPriceEntry {
  acceptedPrice: number;
  liquidityScore: number;
  isHyperLiquid: boolean;
}

interface OrderAnalysis {
  acceptedPrice: number;
  liquidityScore: number;
  isHyperLiquid: boolean;
  currentPrice: number;
}

interface SoCloseResultItem {
  name: string;
  acceptedPrice: number;
  currentMarketPrice: number;
  closeness: number;
  closenessPercent: number;
  hasExistingOrder: boolean;
  iconUrl?: string;
}

const MARKET_NAME_MAP: Record<string, string> = {
  csgofloat: 'CSFloat',
  csmoney: 'CS.MONEY',
  csmoney_p2p: 'CS.MONEY P2P',
  csmoney_trade: 'CS.MONEY Trade',
  skinport: 'Skinport',
  dmarket: 'DMarket',
  waxpeer: 'Waxpeer',
  shadowpay: 'ShadowPay',
  bitskins: 'BitSkins',
  buff163: 'BUFF163',
  skinbaron: 'SkinBaron',
  tradeitgg: 'Tradeit.GG',
  tradeitgg_store: 'Tradeit.GG Store',
  cstrade: 'CSTrade',
  exeskins: 'ExeSkins',
  itradegg: 'iTradeGG',
  lisskins: 'LisSkins',
  manncostore: 'ManncoStore',
  market_csgo: 'Market CSGO',
  merchanttf: 'Merchant TF',
  skinflow: 'SkinFlow',
  skinland: 'SkinLand',
  skinsmonkey: 'SkinsMonkey',
  skinswap: 'SkinSwap',
  whitemarket: 'WhiteMarket',
  avanmarket: 'AvanMarket',
  gamerpay: 'GamerPay',
  skinout: 'Skinout',
};

const getHumanMarketName = (marketId: string): string => {
  if (!marketId) return 'Market';
  const idLower = marketId.toLowerCase();
  return MARKET_NAME_MAP[idLower] || MARKET_NAME_MAP[marketId] || marketId;
};

export default function CSFloatWorkstation() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<{ balance?: number; username?: string; avatar?: string } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Active Workstation Sub-Tab ('buy_orders' | 'soclose' | 'listings')
  const [activeTab, setActiveTab] = useState<'buy_orders' | 'soclose' | 'listings'>('buy_orders');

  // Drift Action Threshold (default 2% difference)
  const [driftThresholdPercent, setDriftThresholdPercent] = useState<number>(2);

  // ── BUY ORDERS STATE ──────────────────────────────────────────────
  const [itemAnalysis, setItemAnalysis] = useState<Record<string, OrderAnalysis>>({});
  const [acceptedPricesMeta, setAcceptedPricesMeta] = useState<{
    itemCount: number;
    storedAt: string | null;
  } | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [showExtraActions, setShowExtraActions] = useState(false);

  // ── SO CLOSE SCANNER STATE ─────────────────────────────────────────
  const [soCloseResults, setSoCloseResults] = useState<SoCloseResultItem[]>([]);
  const [isSoCloseRunning, setIsSoCloseRunning] = useState(false);
  const [soCloseMinPrice, setSoCloseMinPrice] = useState<string>('2');
  const [soCloseMaxPrice, setSoCloseMaxPrice] = useState<string>('100');
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
  const [selectedSoCloseItems, setSelectedSoCloseItems] = useState<Record<string, boolean>>({});
  const [soCloseProcessingName, setSoCloseProcessingName] = useState<string | null>(null);
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
  const [listingAnalysis, setListingAnalysis] = useState<Record<string, ListingAnalysis>>({});
  const [listingPricesMeta, setListingPricesMeta] = useState<{
    itemCount: number;
    storedAt: string | null;
  } | null>(null);
  const [loadingListingPrices, setLoadingListingPrices] = useState(false);
  const [isPrivateMode, setIsPrivateMode] = useState<boolean>(false);
  const [selectedListingItems, setSelectedListingItems] = useState<Record<string, boolean>>({});
  const [listingProcessingId, setListingProcessingId] = useState<string | null>(null);
  const [batchListingProcessing, setBatchListingProcessing] = useState(false);

  // Sidebar expand/collapse state tracking for full-width floating panel positioning
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
    const saved = safeGetItem('so_sidebar_expanded');
    return saved !== null ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    const handleStorage = () => {
      const saved = safeGetItem('so_sidebar_expanded');
      setIsSidebarExpanded(saved !== null ? JSON.parse(saved) : false);
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 150);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

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
        username: user?.username || user?.steam_id || 'User',
        avatar: user?.avatar,
      });
    } catch (err: any) {
      console.error('[CSFloat /me] Error:', err);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleOpenCsfloatMarket = (name: string) => {
    const url = `https://csfloat.com/search?market_hash_name=${encodeURIComponent(name)}`;
    if (window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleOpenLookupModal = async (name: string, acceptedPrice?: number, marketPrice?: number, iconUrl?: string) => {
    setLookupModalItem({ name, acceptedPrice, marketPrice, iconUrl });
    try {
      const cache = await window.electronAPI.skinsnipe.getCache();
      const cacheItem = cache ? cache[name] : null;
      setLookupModalItem(prev => (prev ? { ...prev, cacheItem } : null));
    } catch (err) {
      console.error('Failed to load item cache for lookup:', err);
    }
  };

  // ── BUY ORDERS METHODS ───────────────────────────────────────────
  const fetchOrders = async () => {
    const keyOk = await checkApiKey();
    if (!keyOk) {
      toast.error('CSFloat API key is not configured. Please set your key in Settings first.');
      return;
    }

    setLoading(true);
    setSelectedItems({});
    const toastId = toast.loading('Syncing CSFloat buy orders...');
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
      toast.success(`Loaded ${list.length} active buy orders`, { id: toastId });
    } catch (err: any) {
      console.error('[CSFloat Workstation] Error fetching orders:', err);
      toast.error(`CSFloat error: ${err.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const loadAcceptedPrices = async () => {
    setLoadingPrices(true);
    const toastId = toast.loading('Loading accepted prices from local memory...');
    try {
      const result: { map: Record<string, AcceptedPriceEntry>; itemCount: number; storedAt: string | null } =
        await (window.electronAPI.oracle as any).getAcceptedPrices();

      if (!result || result.itemCount === 0) {
        toast.error('No accepted prices found in memory. Please build prices in Oracle Dashboard first.', { id: toastId });
        setLoadingPrices(false);
        return;
      }

      setAcceptedPricesMeta({ itemCount: result.itemCount, storedAt: result.storedAt });

      const newAnalysis: Record<string, OrderAnalysis> = {};
      orders.forEach(order => {
        const name = order.market_hash_name;
        const priceEntry = result.map[name];
        if (!priceEntry) return;

        const currentPriceDollar = order.price / 100;
        const roundedAcceptedPrice = roundToCsFloatStep(priceEntry.acceptedPrice);

        newAnalysis[order.id] = {
          acceptedPrice: roundedAcceptedPrice,
          liquidityScore: priceEntry.liquidityScore,
          isHyperLiquid: priceEntry.isHyperLiquid,
          currentPrice: currentPriceDollar,
        };
      });

      setItemAnalysis(newAnalysis);
      toast.success(`Matched accepted prices for ${Object.keys(newAnalysis).length} orders`, { id: toastId });
    } catch (err: any) {
      toast.error(`Failed to load accepted prices: ${err.message}`, { id: toastId });
    } finally {
      setLoadingPrices(false);
    }
  };

  const getOrderDriftDetails = (order: any) => {
    const analysis = itemAnalysis[order.id];
    if (!analysis?.acceptedPrice) return null;

    const currentPrice = order.price / 100;
    const oraclePrice = analysis.acceptedPrice;

    const drift = oraclePrice > 0 ? (currentPrice - oraclePrice) / oraclePrice : 0;
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
    };
  };

  const handleManualUpdate = async (id: string, marketHashName: string, targetAcceptedPrice: number, customQty?: number) => {
    setProcessingId(id);
    const order = orders.find(o => o.id === id);
    const finalQty = customQty !== undefined ? customQty : (order?.qty || 1);
    const maxPriceCents = snapCsFloatBuyOrderPriceCents(Math.round(targetAcceptedPrice * 100));
    const targetPriceDollar = (maxPriceCents / 100).toFixed(2);
    const toastId = toast.loading(`Updating order (Qty: ${finalQty}) to $${targetPriceDollar}...`);
    try {
      const extraProps = order?.hybrid_properties && Object.keys(order.hybrid_properties).length > 0
        ? { hybrid_properties: order.hybrid_properties }
        : undefined;

      await (window.electronAPI.csfloat as any).updateOrder(id, maxPriceCents, finalQty, extraProps);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, qty: finalQty, price: maxPriceCents } : o));
      toast.success(`Order updated (Qty: ${finalQty}) to $${targetPriceDollar}`, { id: toastId });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err.message || 'Unknown error';
      toast.error(`Update failed: ${errorMsg}`, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    setProcessingId(id);
    const toastId = toast.loading('Deleting buy order...');
    try {
      await window.electronAPI.csfloat.deleteOrder(id);
      setOrders(prev => prev.filter(o => o.id !== id));
      toast.success('Buy order removed', { id: toastId });
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteAllOrders = async () => {
    if (!orders.length) return;

    const confirmed = window.confirm(
      `⚠️ DANGER: Are you sure you want to CANCEL & DELETE ALL ${orders.length} active CSFloat buy orders?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setBatchProcessing(true);
    const toastId = toast.loading(`Deleting all ${orders.length} active buy orders...`);
    let deletedCount = 0;

    for (const order of orders) {
      setProcessingId(order.id);
      try {
        await window.electronAPI.csfloat.deleteOrder(order.id);
        setOrders(prev => prev.filter(o => o.id !== order.id));
        deletedCount++;
      } catch (err) {
        console.error(`[CSFloat Workstation] 🔴 Error deleting order ${order.id}:`, err);
      }
      await new Promise(r => setTimeout(r, 400));
    }

    setProcessingId(null);
    setBatchProcessing(false);
    toast.success(`Successfully deleted ${deletedCount} buy orders`, { id: toastId });
  };

  const executeBatchUpdate = async () => {
    const selectedIds = Object.keys(selectedItems).filter(id => selectedItems[id]);
    if (!selectedIds.length) return;

    setBatchProcessing(true);
    const toastId = toast.loading(`Executing batch update on ${selectedIds.length} orders...`);
    let updatedCount = 0;

    for (const id of selectedIds) {
      const order = orders.find(o => o.id === id);
      const analysis = itemAnalysis[id];
      if (!analysis?.acceptedPrice || !order) continue;

      try {
        await handleManualUpdate(id, order.market_hash_name, analysis.acceptedPrice, order.qty || 1);
        setSelectedItems(prev => ({ ...prev, [id]: false }));
        updatedCount++;
      } catch (err) {
        console.error(`[CSFloat Workstation] 🔴 Batch Item Error for ${id}:`, err);
      }
      await new Promise(r => setTimeout(r, 600));
    }

    setBatchProcessing(false);
    toast.success(`Completed batch update for ${updatedCount} orders`, { id: toastId });
  };

  const selectActionRequiredItems = () => {
    const newSelect: Record<string, boolean> = {};
    orders.forEach(o => {
      const driftDetails = getOrderDriftDetails(o);
      if (driftDetails?.isActionRequired) {
        newSelect[o.id] = true;
      }
    });
    setSelectedItems(newSelect);
  };

  const selectAllMatched = () => {
    const newSelect: Record<string, boolean> = {};
    orders.forEach(o => {
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
    const toastId = toast.loading('Running So Close market scan...');

    try {
      const acceptedRes: { map: Record<string, { acceptedPrice: number }>; itemCount: number } =
        await (window.electronAPI.oracle as any).getAcceptedPrices();

      if (!acceptedRes || !acceptedRes.map || Object.keys(acceptedRes.map).length === 0) {
        toast.error('No accepted prices found in memory. Please build Step 2 Accepted Prices in Oracle Dashboard first.', { id: toastId });
        setIsSoCloseRunning(false);
        return;
      }

      const priceCache: Record<string, any> = await window.electronAPI.skinsnipe.getCache();

      const minP = parseFloat(soCloseMinPrice) || 0;
      const maxP = parseFloat(soCloseMaxPrice) || 9999;
      const results: SoCloseResultItem[] = [];

      const activeOrderNamesSet = new Set(orders.map(o => o.market_hash_name));
      const namesToScan = Object.keys(acceptedRes.map);

      for (const name of namesToScan) {
        const acceptedEntry = acceptedRes.map[name];
        if (!acceptedEntry || acceptedEntry.acceptedPrice <= 0) continue;

        const acceptedPrice = roundToCsFloatStep(acceptedEntry.acceptedPrice);
        if (acceptedPrice <= 0) continue;

        const nameLower = name.toLowerCase();

        if (nameLower.includes('souvenir') && !soCloseAllowedWears.souvenir) continue;
        if (nameLower.includes('sticker |') && !soCloseAllowedWears.sticker) continue;
        if (nameLower.includes('(factory new)') && !soCloseAllowedWears.fn) continue;
        if (nameLower.includes('(minimal wear)') && !soCloseAllowedWears.mw) continue;
        if (nameLower.includes('(field-tested)') && !soCloseAllowedWears.ft) continue;
        if (nameLower.includes('(well-worn)') && !soCloseAllowedWears.ww) continue;
        if (nameLower.includes('(battle-scarred)') && !soCloseAllowedWears.bs) continue;

        const cacheItem = priceCache ? priceCache[name] : null;
        let csfloatPrice = 0;
        if (cacheItem?.l && Array.isArray(cacheItem.l)) {
          const csfloatEntry = cacheItem.l.find((m: any) => m.m === 'csgofloat');
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
          });
        }
      }

      results.sort((a, b) => a.closeness - b.closeness);

      // Safety limit: Never render more than 200 items
      setSoCloseResults(results.slice(0, 200));
      toast.success(`Found ${Math.min(results.length, 200)} So Close market opportunities!`, { id: toastId });
    } catch (err: any) {
      toast.error(`So Close scan error: ${err.message}`, { id: toastId });
    } finally {
      setIsSoCloseRunning(false);
    }
  };

  const handleCreateSoCloseBuyOrder = async (item: SoCloseResultItem) => {
    const keyOk = await checkApiKey();
    if (!keyOk) {
      toast.error('CSFloat API key is not configured. Please set your key in Settings first.');
      return;
    }

    setSoCloseProcessingName(item.name);
    const targetCents = snapCsFloatBuyOrderPriceCents(Math.round(item.acceptedPrice * 100));
    const targetPriceDollar = (targetCents / 100).toFixed(2);
    const toastId = toast.loading(`Creating buy order for ${item.name} at $${targetPriceDollar}...`);

    try {
      await window.electronAPI.csfloat.createBuyOrder(item.name, targetCents, 1);

      setSoCloseResults(prev => prev.map(r => r.name === item.name ? { ...r, hasExistingOrder: true } : r));
      toast.success(`Buy order created for ${item.name} at $${targetPriceDollar}`, { id: toastId });
    } catch (err: any) {
      toast.error(`Failed to create buy order: ${err.message}`, { id: toastId });
    } finally {
      setSoCloseProcessingName(null);
    }
  };

  const executeBatchSoCloseCreate = async () => {
    const selectedNames = Object.keys(selectedSoCloseItems).filter(name => selectedSoCloseItems[name]);
    if (!selectedNames.length) return;

    setBatchSoCloseProcessing(true);
    const toastId = toast.loading(`Executing batch buy order creation for ${selectedNames.length} items...`);
    let createdCount = 0;

    for (const name of selectedNames) {
      const item = soCloseResults.find(r => r.name === name);
      if (!item || item.hasExistingOrder) continue;

      try {
        await handleCreateSoCloseBuyOrder(item);
        setSelectedSoCloseItems(prev => ({ ...prev, [name]: false }));
        createdCount++;
      } catch (err) {
        console.error(`[So Close Batch Error for ${name}]:`, err);
      }
      await new Promise(r => setTimeout(r, 600));
    }

    setBatchSoCloseProcessing(false);
    toast.success(`Completed batch buy order creation for ${createdCount} items`, { id: toastId });
  };

  const selectAllSoCloseAvailable = () => {
    const newSelect: Record<string, boolean> = {};
    soCloseResults.forEach(r => {
      if (!r.hasExistingOrder) {
        newSelect[r.name] = true;
      }
    });
    setSelectedSoCloseItems(newSelect);
  };

  const selectBestSoClose = () => {
    const newSelect: Record<string, boolean> = {};
    soCloseResults.forEach(r => {
      if (!r.hasExistingOrder && r.closeness <= 1.05) {
        newSelect[r.name] = true;
      }
    });
    setSelectedSoCloseItems(newSelect);
  };

  const clearSoCloseSelection = () => setSelectedSoCloseItems({});

  const handleSetBalanceAsMax = () => {
    if (userData && typeof userData.balance === 'number' && userData.balance > 0) {
      const dollarVal = userData.balance.toFixed(2);
      setSoCloseMaxPrice(dollarVal);
      toast.success(`Max price set to CSFloat balance ($${dollarVal})`);
    } else {
      toast.error('CSFloat balance is unavailable or $0.00');
    }
  };

  // ── LISTINGS & INVENTORY METHODS ─────────────────────────────────
  const fetchInventory = async () => {
    const keyOk = await checkApiKey();
    if (!keyOk) {
      toast.error('CSFloat API key is not configured. Please set your key in Settings first.');
      return;
    }

    setInventoryLoading(true);
    setSelectedListingItems({});
    const toastId = toast.loading('Syncing CSFloat user inventory...');
    try {
      const list = await window.electronAPI.csfloat.getInventory();
      setInventory(list);
      toast.success(`Loaded ${list.length} inventory items`, { id: toastId });
    } catch (err: any) {
      console.error('[CSFloat Workstation] Error fetching inventory:', err);
      toast.error(`CSFloat Inventory error: ${err.message}`, { id: toastId });
    } finally {
      setInventoryLoading(false);
    }
  };

  const loadListingPrices = async () => {
    setLoadingListingPrices(true);
    const toastId = toast.loading('Loading listing prices from local Oracle memory...');
    try {
      const result: { map: Record<string, ListingPriceInfo>; itemCount: number; storedAt: string | null } =
        await window.electronAPI.oracle.getListingPrices();

      if (!result || result.itemCount === 0) {
        toast.error('No listing prices found in memory. Please build listing prices in Step 3 of Oracle Dashboard first.', { id: toastId });
        setLoadingListingPrices(false);
        return;
      }

      setListingPricesMeta({ itemCount: result.itemCount, storedAt: result.storedAt });

      const newAnalysis: Record<string, ListingAnalysis> = {};
      inventory.forEach(item => {
        const name = item.market_hash_name || item.item_name;
        if (!name) return;

        const priceEntry = result.map[name];
        if (!priceEntry) return;

        const targetPrice = roundToCsFloatStep(priceEntry.listingPrice);
        const isListed = !!item.listing_id;
        const currentPriceDollar = isListed && item.price ? item.price / 100 : null;

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
      toast.success(`Matched listing prices for ${Object.keys(newAnalysis).length} items`, { id: toastId });
    } catch (err: any) {
      toast.error(`Failed to load listing prices: ${err.message}`, { id: toastId });
    } finally {
      setLoadingListingPrices(false);
    }
  };

  const handleCreateListing = async (item: CsFloatInventoryItem, customPrice?: number) => {
    const analysis = listingAnalysis[item.asset_id];
    const targetPrice = customPrice ?? analysis?.targetListingPrice ?? (item.reference?.predicted_price ? item.reference.predicted_price / 100 : null);

    if (!targetPrice || targetPrice <= 0) {
      toast.error('No valid target listing price available for this item');
      return;
    }

    setListingProcessingId(item.asset_id);
    const priceCents = Math.round(targetPrice * 100);
    const modeLabel = isPrivateMode ? 'Private' : 'Public';
    const toastId = toast.loading(`Creating ${modeLabel} listing at $${targetPrice.toFixed(2)}...`);

    try {
      const res = await window.electronAPI.csfloat.createListing(item.asset_id, priceCents, isPrivateMode);
      const createdListingId = res?.id || res?.listing?.id || 'listed';
      
      setInventory(prev => prev.map(invItem => invItem.asset_id === item.asset_id ? {
        ...invItem,
        listing_id: createdListingId,
        price: priceCents,
        private: isPrivateMode,
      } : invItem));

      setListingAnalysis(prev => ({
        ...prev,
        [item.asset_id]: {
          ...(prev[item.asset_id] || {
            targetListingPrice: targetPrice,
            mode: 'manual',
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

      toast.success(`Listing created successfully ($${targetPrice.toFixed(2)} - ${modeLabel})`, { id: toastId });
    } catch (err: any) {
      toast.error(`Failed to create listing: ${err.message}`, { id: toastId });
    } finally {
      setListingProcessingId(null);
    }
  };

  const handleUpdateListing = async (item: CsFloatInventoryItem, targetPrice: number) => {
    if (!item.listing_id) return;

    setListingProcessingId(item.asset_id);
    const priceCents = Math.round(targetPrice * 100);
    const toastId = toast.loading(`Updating listing price to $${targetPrice.toFixed(2)}...`);

    try {
      await window.electronAPI.csfloat.updateListing(item.listing_id, priceCents, isPrivateMode);
      
      setInventory(prev => prev.map(invItem => invItem.asset_id === item.asset_id ? {
        ...invItem,
        price: priceCents,
        private: isPrivateMode,
      } : invItem));

      setListingAnalysis(prev => ({
        ...prev,
        [item.asset_id]: {
          ...(prev[item.asset_id] || {
            targetListingPrice: targetPrice,
            mode: 'manual',
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

      toast.success(`Listing updated to $${targetPrice.toFixed(2)}`, { id: toastId });
    } catch (err: any) {
      toast.error(`Failed to update listing: ${err.message}`, { id: toastId });
    } finally {
      setListingProcessingId(null);
    }
  };

  const handleUnlist = async (item: CsFloatInventoryItem) => {
    if (!item.listing_id) return;

    setListingProcessingId(item.asset_id);
    const toastId = toast.loading('Removing CSFloat listing (unlisting)...');

    try {
      await window.electronAPI.csfloat.deleteListing(item.listing_id);
      
      setInventory(prev => prev.map(invItem => invItem.asset_id === item.asset_id ? {
        ...invItem,
        listing_id: undefined,
        price: undefined,
      } : invItem));

      setListingAnalysis(prev => {
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

      toast.success('Listing removed (Item unlisted)', { id: toastId });
    } catch (err: any) {
      toast.error(`Failed to unlist item: ${err.message}`, { id: toastId });
    } finally {
      setListingProcessingId(null);
    }
  };

  const executeBatchList = async () => {
    const selectedIds = Object.keys(selectedListingItems).filter(id => selectedListingItems[id]);
    const unlistedToCreate = inventory.filter(i => selectedIds.includes(i.asset_id) && !i.listing_id);

    if (!unlistedToCreate.length) {
      toast.error('No unlisted items selected for listing creation');
      return;
    }

    setBatchListingProcessing(true);
    const toastId = toast.loading(`Creating ${unlistedToCreate.length} listings (${isPrivateMode ? 'Private' : 'Public'})...`);
    let count = 0;

    for (const item of unlistedToCreate) {
      const analysis = listingAnalysis[item.asset_id];
      const targetPrice = analysis?.targetListingPrice;
      if (!targetPrice) continue;

      try {
        await handleCreateListing(item, targetPrice);
        setSelectedListingItems(prev => ({ ...prev, [item.asset_id]: false }));
        count++;
      } catch (err) {
        console.error(`[Batch Create Listing Error for ${item.asset_id}]:`, err);
      }
      await new Promise(r => setTimeout(r, 600));
    }

    setBatchListingProcessing(false);
    toast.success(`Batch listed ${count} items successfully`, { id: toastId });
  };

  const executeBatchUpdateListings = async () => {
    const selectedIds = Object.keys(selectedListingItems).filter(id => selectedListingItems[id]);
    const listedToUpdate = inventory.filter(i => selectedIds.includes(i.asset_id) && i.listing_id);

    if (!listedToUpdate.length) {
      toast.error('No active listings selected for price update');
      return;
    }

    setBatchListingProcessing(true);
    const toastId = toast.loading(`Updating ${listedToUpdate.length} active listings...`);
    let count = 0;

    for (const item of listedToUpdate) {
      const analysis = listingAnalysis[item.asset_id];
      const targetPrice = analysis?.targetListingPrice;
      if (!targetPrice) continue;

      try {
        await handleUpdateListing(item, targetPrice);
        setSelectedListingItems(prev => ({ ...prev, [item.asset_id]: false }));
        count++;
      } catch (err) {
        console.error(`[Batch Update Listing Error for ${item.asset_id}]:`, err);
      }
      await new Promise(r => setTimeout(r, 600));
    }

    setBatchListingProcessing(false);
    toast.success(`Batch updated ${count} listings successfully`, { id: toastId });
  };

  const executeBatchUnlist = async () => {
    const selectedIds = Object.keys(selectedListingItems).filter(id => selectedListingItems[id]);
    const listedToUnlist = inventory.filter(i => selectedIds.includes(i.asset_id) && i.listing_id);

    if (!listedToUnlist.length) {
      toast.error('No active listings selected for unlisting');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to unlist ${listedToUnlist.length} active listings from CSFloat?`);
    if (!confirmed) return;

    setBatchListingProcessing(true);
    const toastId = toast.loading(`Unlisting ${listedToUnlist.length} items...`);
    let count = 0;

    for (const item of listedToUnlist) {
      try {
        await handleUnlist(item);
        setSelectedListingItems(prev => ({ ...prev, [item.asset_id]: false }));
        count++;
      } catch (err) {
        console.error(`[Batch Unlist Error for ${item.asset_id}]:`, err);
      }
      await new Promise(r => setTimeout(r, 400));
    }

    setBatchListingProcessing(false);
    toast.success(`Batch unlisted ${count} items successfully`, { id: toastId });
  };

  // Selection filters for listings
  const selectUnlistedListings = () => {
    const newSelect: Record<string, boolean> = {};
    inventory.forEach(i => {
      if (!i.listing_id && listingAnalysis[i.asset_id]?.targetListingPrice) {
        newSelect[i.asset_id] = true;
      }
    });
    setSelectedListingItems(newSelect);
  };

  const selectActionRequiredListings = () => {
    const newSelect: Record<string, boolean> = {};
    inventory.forEach(i => {
      const a = listingAnalysis[i.asset_id];
      if (a?.isActionRequired) {
        newSelect[i.asset_id] = true;
      }
    });
    setSelectedListingItems(newSelect);
  };

  const selectOverpricedListings = () => {
    const newSelect: Record<string, boolean> = {};
    inventory.forEach(i => {
      const a = listingAnalysis[i.asset_id];
      if (a?.isOverpriced) {
        newSelect[i.asset_id] = true;
      }
    });
    setSelectedListingItems(newSelect);
  };

  const selectUnderpricedListings = () => {
    const newSelect: Record<string, boolean> = {};
    inventory.forEach(i => {
      const a = listingAnalysis[i.asset_id];
      if (a?.isUnderpriced) {
        newSelect[i.asset_id] = true;
      }
    });
    setSelectedListingItems(newSelect);
  };

  const selectAllMatchedListings = () => {
    const newSelect: Record<string, boolean> = {};
    inventory.forEach(i => {
      if (listingAnalysis[i.asset_id]?.targetListingPrice) {
        newSelect[i.asset_id] = true;
      }
    });
    setSelectedListingItems(newSelect);
  };

  const clearListingSelection = () => setSelectedListingItems({});

  useEffect(() => {
    window.electronAPI.settings.getKeysStatus().then(status => {
      setHasKey(status.hasCsfloatKey);
      if (status.hasCsfloatKey) {
        fetchUserData();
      }
    });
  }, []);

  // Counts for Buy Orders
  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const pricesLoaded = acceptedPricesMeta !== null;
  const matchedCount = Object.keys(itemAnalysis).length;
  const actionRequiredCount = orders.filter(o => getOrderDriftDetails(o)?.isActionRequired).length;

  // Counts for So Close
  const selectedSoCloseCount = Object.values(selectedSoCloseItems).filter(Boolean).length;

  // Counts for Listings & Inventory
  const listingPricesLoaded = listingPricesMeta !== null;
  const matchedListingCount = Object.keys(listingAnalysis).length;
  const listedCount = inventory.filter(i => !!i.listing_id).length;
  const unlistedCount = inventory.filter(i => !i.listing_id).length;
  const overpricedCount = Object.values(listingAnalysis).filter(a => a.isOverpriced).length;
  const underpricedCount = Object.values(listingAnalysis).filter(a => a.isUnderpriced).length;
  const actionReqListingCount = Object.values(listingAnalysis).filter(a => a.isActionRequired).length;
  const selectedListingCount = Object.values(selectedListingItems).filter(Boolean).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)', gap: '10px', overflow: 'hidden' }}>

      {/* SINGLE ITEM LOOKUP MODAL */}
      {lookupModalItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setLookupModalItem(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--so-surface-card)',
              border: '1px solid var(--so-border-medium)',
              borderRadius: 'var(--so-radius-md)',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img
                  src={
                    lookupModalItem.iconUrl
                      ? `https://community.cloudflare.steamstatic.com/economy/image/${lookupModalItem.iconUrl}`
                      : `https://api.steamapis.com/image/item/730/${encodeURIComponent(lookupModalItem.name)}`
                  }
                  alt={lookupModalItem.name}
                  style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px' }}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15.5px', color: 'var(--so-text-primary)' }}>
                    {lookupModalItem.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                    <span style={{ color: 'var(--so-accent-cyan)', fontWeight: 700 }}>Single Item Inspection</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setLookupModalItem(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px', borderRadius: '50%' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* 4-Stat Metric Grid */}
            {(() => {
              const cacheListings: any[] = lookupModalItem.cacheItem?.l && Array.isArray(lookupModalItem.cacheItem.l)
                ? lookupModalItem.cacheItem.l
                : [];

              const validPrices = cacheListings
                .map((m: any) => typeof m.p === 'number' ? m.p : parseFloat(m.p))
                .filter((p: number) => !isNaN(p) && p > 0);

              const calculatedLowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
              const csfloatEntry = cacheListings.find((m: any) => m.m === 'csgofloat' || m.m === 'csfloat');
              const resolvedCsfloatPrice = lookupModalItem.marketPrice || (csfloatEntry?.p ? Number(csfloatEntry.p) : null);

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  <div style={{ padding: '10px 12px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--so-text-muted)', fontWeight: 600 }}>Target Buy Ceiling</div>
                    <div className="tabular-nums" style={{ fontSize: '16px', fontWeight: 900, color: 'var(--so-success-text)', marginTop: '2px' }}>
                      {lookupModalItem.acceptedPrice ? `$${lookupModalItem.acceptedPrice.toFixed(2)}` : '—'}
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--so-text-muted)', fontWeight: 600 }}>CSFloat Market Price</div>
                    <div className="tabular-nums" style={{ fontSize: '16px', fontWeight: 900, color: '#f59e0b', marginTop: '2px' }}>
                      {resolvedCsfloatPrice ? `$${resolvedCsfloatPrice.toFixed(2)}` : '—'}
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--so-text-muted)', fontWeight: 600 }}>Lowest Listing</div>
                    <div className="tabular-nums" style={{ fontSize: '16px', fontWeight: 900, color: 'var(--so-text-primary)', marginTop: '2px' }}>
                      {calculatedLowestPrice !== null ? `$${calculatedLowestPrice.toFixed(2)}` : '—'}
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--so-text-muted)', fontWeight: 600 }}>Total Markets</div>
                    <div className="tabular-nums" style={{ fontSize: '16px', fontWeight: 900, color: 'var(--so-accent-cyan)', marginTop: '2px' }}>
                      {cacheListings.length} Markets
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Marketplace Breakdown Table */}
            {lookupModalItem.cacheItem?.l && Array.isArray(lookupModalItem.cacheItem.l) && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--so-text-primary)', marginBottom: '8px' }}>
                  Live Marketplace Price Breakdown ({lookupModalItem.cacheItem.l.length} Markets)
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid var(--so-border-subtle)', borderRadius: 'var(--so-radius-sm)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--so-surface-input)', borderBottom: '1px solid var(--so-border-subtle)', textAlign: 'left', color: 'var(--so-text-muted)' }}>
                        <th style={{ padding: '6px 10px', fontWeight: 700 }}>Marketplace</th>
                        <th style={{ padding: '6px 10px', fontWeight: 700, textAlign: 'right' }}>Lowest Active Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lookupModalItem.cacheItem.l.map((m: any, idx: number) => (
                        <tr key={m.m + idx} style={{ borderBottom: '1px solid var(--so-border-subtle)' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--so-text-primary)' }}>
                            {getHumanMarketName(m.m)}
                          </td>
                          <td className="tabular-nums" style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--so-primary)' }}>
                            ${m.p ? m.p.toFixed(2) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => handleOpenCsfloatMarket(lookupModalItem.name)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px' }}
              >
                <ExternalLink size={13} /> View on CSFloat Market
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIXED TOP SECTION (Controls, Header, Sub-Tabs & Stats) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>

        {/* API Key Missing Warning Banner */}
        {hasKey === false && (
          <div
            style={{
              backgroundColor: 'var(--so-warning-bg)',
              border: '1px solid var(--so-warning-border)',
              color: 'var(--so-warning-text)',
              padding: '10px 16px',
              borderRadius: 'var(--so-radius-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={16} style={{ color: 'var(--so-warning)' }} /> CSFloat API Key is not configured. Please add your key in Settings.
            </div>
            <Link to="/settings" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', fontSize: '11px' }}>
              Go to Settings
            </Link>
          </div>
        )}

        {/* Main Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            backgroundColor: 'var(--so-surface-header)',
            border: '1px solid var(--so-border-medium)',
            borderRadius: 'var(--so-radius-md)',
          }}
        >
          {/* Brand & Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={csfloatLogo} alt="CSFloat" style={{ height: 22, width: 'auto', objectFit: 'contain' }} />
              <span style={{ color: 'var(--so-text-primary)', fontWeight: 800, fontSize: '15px', letterSpacing: '-0.3px' }}>
                CSFloat Workstation
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: (activeTab === 'listings' ? listingPricesLoaded : pricesLoaded)
                    ? 'var(--so-success)'
                    : 'var(--so-warning)',
                  display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  letterSpacing: '0.4px',
                  color: (activeTab === 'listings' ? listingPricesLoaded : pricesLoaded)
                    ? 'var(--so-success-text)'
                    : 'var(--so-warning-text)',
                }}
              >
                {activeTab === 'listings'
                  ? listingPricesLoaded
                    ? `ORACLE STEP 3 LISTING PRICES LOADED (${listingPricesMeta!.itemCount.toLocaleString()} ITEMS)`
                    : 'NO LISTING PRICES LOADED — BUILD IN STEP 3 OF ORACLE DASHBOARD'
                  : pricesLoaded
                    ? `ORACLE ACCEPTED PRICES LOADED (${acceptedPricesMeta!.itemCount.toLocaleString()} ITEMS)`
                    : 'NO ACCEPTED PRICES LOADED — BUILD IN STEP 2 OF ORACLE DASHBOARD'}
              </span>
            </div>
          </div>

          {/* Balance Widget */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'var(--so-surface-card)',
              border: '1px solid var(--so-border-medium)',
              padding: '5px 12px',
              borderRadius: 'var(--so-radius-md)',
            }}
          >
            {userData?.avatar && (
              <img
                src={userData.avatar}
                alt="avatar"
                style={{ width: 24, height: 24, borderRadius: '4px', border: '1px solid var(--so-border-subtle)' }}
              />
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', color: 'var(--so-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                CSFloat Balance
              </div>
              <div className="tabular-nums" style={{ fontSize: '13.5px', fontWeight: 800, color: '#ffffff' }}>
                ${userData?.balance !== undefined ? userData.balance.toFixed(2) : '--.--'}
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
              style={{ padding: '3px 6px' }}
            >
              {balanceLoading ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
            </button>
          </div>
        </div>

        {/* Workstation Sub-Tabs Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--so-border-medium)', gap: '6px', paddingBottom: '2px' }}>
          <button
            onClick={() => setActiveTab('buy_orders')}
            className={`btn ${activeTab === 'buy_orders' ? 'btn-primary' : 'btn-outline'} btn-sm`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 12px' }}
          >
            <Package size={13} /> Buy Orders
          </button>
          <button
            onClick={() => setActiveTab('soclose')}
            className={`btn ${activeTab === 'soclose' ? 'btn-primary' : 'btn-outline'} btn-sm`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 12px' }}
          >
            <Zap size={13} style={{ color: activeTab === 'soclose' ? '#ffffff' : 'var(--so-accent-cyan)' }} /> So Close Opportunities
          </button>
          <button
            onClick={() => setActiveTab('listings')}
            className={`btn ${activeTab === 'listings' ? 'btn-primary' : 'btn-outline'} btn-sm`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 12px' }}
          >
            <Tag size={13} /> Listings & Inventory
          </button>
        </div>

        {/* Control Bar scoped under active sub-tab */}
        {activeTab === 'buy_orders' ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--so-surface-card)',
              border: '1px solid var(--so-border-medium)',
              borderRadius: 'var(--so-radius-md)',
              padding: '8px 14px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            {/* Left Stats & Merged Extra Actions Card */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: 'var(--so-surface-panel)',
                  border: '1px solid var(--so-border-medium)',
                  padding: '4px 10px',
                  borderRadius: 'var(--so-radius-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', fontWeight: 700 }}>
                  <span style={{ color: 'var(--so-text-muted)' }}>Orders: <strong style={{ color: 'var(--so-text-primary)' }}>{orders.length}</strong></span>
                  <span style={{ color: 'var(--so-text-muted)' }}>Matched: <strong style={{ color: 'var(--so-accent-cyan)' }}>{matchedCount}</strong></span>
                  {actionRequiredCount > 0 && (
                    <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <AlertTriangle size={12} /> Action Req: <strong>{actionRequiredCount}</strong>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowExtraActions(prev => !prev)}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: showExtraActions ? 'var(--so-surface-input)' : 'transparent',
                    color: showExtraActions ? 'var(--so-primary)' : 'var(--so-text-muted)',
                    border: '1px solid var(--so-border-subtle)',
                    padding: '3px 7px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    transition: 'all 0.2s ease',
                  }}
                  title={showExtraActions ? 'Hide Extra Controls' : 'Open Extra Controls (Threshold & Delete All)'}
                >
                  <Sliders size={12} style={{ color: showExtraActions ? 'var(--so-primary)' : 'var(--so-text-muted)' }} />
                  <span style={{ fontSize: '10.5px' }}>{showExtraActions ? 'Hide' : 'Options'}</span>
                  {showExtraActions ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
                </button>

                <div
                  style={{
                    maxWidth: showExtraActions ? '320px' : '0px',
                    opacity: showExtraActions ? 1 : 0,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: 'var(--so-surface-input)',
                      border: '1px solid var(--so-border-medium)',
                      padding: '2px 6px',
                      borderRadius: 'var(--so-radius-sm)',
                    }}
                  >
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--so-text-secondary)' }}>
                      Threshold:
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      value={driftThresholdPercent}
                      onChange={e => setDriftThresholdPercent(parseFloat(e.target.value) || 0)}
                      style={{
                        width: '42px',
                        padding: '1px 3px',
                        fontSize: '11px',
                        fontWeight: 800,
                        textAlign: 'center',
                        backgroundColor: 'var(--so-surface-card)',
                        color: 'var(--so-text-primary)',
                        border: '1px solid var(--so-border-strong)',
                        borderRadius: '3px',
                      }}
                    />
                    <Percent size={11} style={{ color: 'var(--so-text-muted)' }} />
                  </div>

                  {orders.length > 0 && (
                    <button
                      onClick={handleDeleteAllOrders}
                      disabled={batchProcessing || loading}
                      className="btn btn-danger btn-sm"
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        fontWeight: 800,
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        borderRadius: '3px',
                      }}
                      title="Cancel and delete all active buy orders"
                    >
                      <Trash2 size={11} /> Delete All ({orders.length})
                    </button>
                  )}
                </div>
              </div>

              {matchedCount > 0 && (
                <div style={{ display: 'flex', gap: '5px' }}>
                  {actionRequiredCount > 0 && (
                    <button onClick={selectActionRequiredItems} className="btn btn-warning btn-sm" style={{ fontSize: '10.5px', padding: '3px 8px' }}>
                      Select Action Req ({actionRequiredCount})
                    </button>
                  )}
                  <button onClick={selectAllMatched} className="btn btn-secondary btn-sm" style={{ fontSize: '10.5px', padding: '3px 8px' }}>
                    Select Matched ({matchedCount})
                  </button>
                  {selectedCount > 0 && (
                    <button onClick={clearSelection} className="btn btn-outline btn-sm" style={{ fontSize: '10.5px', padding: '3px 8px' }}>
                      Clear ({selectedCount})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Primary Action Buttons */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button onClick={fetchOrders} disabled={loading} className="btn btn-primary btn-sm" style={{ fontSize: '12px', padding: '5px 12px' }}>
                {loading ? <Loader2 size={13} className="spin" /> : <RotateCw size={13} />} Sync Buy Orders
              </button>
              <button
                onClick={loadAcceptedPrices}
                disabled={loadingPrices || orders.length === 0}
                className={`btn ${pricesLoaded ? 'btn-secondary' : 'btn-outline'} btn-sm`}
                style={{ fontSize: '12px', padding: '5px 12px' }}
              >
                {loadingPrices ? <Loader2 size={13} className="spin" /> : <LinkIcon size={13} />}
                {pricesLoaded ? 'Reload Prices' : 'Load Prices'}
              </button>
            </div>
          </div>
        ) : activeTab === 'soclose' ? (
          /* CONTROL BAR FOR SO CLOSE OPPORTUNITIES */
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--so-surface-card)',
              border: '1px solid var(--so-border-medium)',
              borderRadius: 'var(--so-radius-md)',
              padding: '8px 14px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            {/* Left Scanner Inputs & Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Price Range Filter Inputs */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--so-surface-panel)',
                  border: '1px solid var(--so-border-medium)',
                  padding: '4px 8px',
                  borderRadius: 'var(--so-radius-sm)',
                  fontSize: '11px',
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--so-text-secondary)' }}>Price Range ($):</span>
                <input
                  type="number"
                  value={soCloseMinPrice}
                  onChange={e => setSoCloseMinPrice(e.target.value)}
                  placeholder="Min"
                  style={{ width: '42px', padding: '1px 4px', fontSize: '11px', fontWeight: 800, textAlign: 'center', borderRadius: '3px', border: '1px solid var(--so-border-subtle)', background: 'var(--so-surface-card)', color: 'var(--so-text-primary)' }}
                />
                <span style={{ color: 'var(--so-text-muted)' }}>-</span>
                <input
                  type="number"
                  value={soCloseMaxPrice}
                  onChange={e => setSoCloseMaxPrice(e.target.value)}
                  placeholder="Max"
                  style={{ width: '48px', padding: '1px 4px', fontSize: '11px', fontWeight: 800, textAlign: 'center', borderRadius: '3px', border: '1px solid var(--so-border-subtle)', background: 'var(--so-surface-card)', color: 'var(--so-text-primary)' }}
                />
                <button
                  type="button"
                  onClick={handleSetBalanceAsMax}
                  title={`Set Max Price to Available Balance (${userData?.balance !== undefined ? `$${userData.balance.toFixed(2)}` : '$0.00'})`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    background: 'var(--so-surface-card)',
                    border: '1px solid var(--so-border-subtle)',
                    color: 'var(--so-accent-cyan)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--so-accent-cyan)';
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--so-border-subtle)';
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--so-surface-card)';
                  }}
                >
                  <Wallet size={12} />
                </button>
              </div>

              {/* Max Closeness Distance Input */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--so-surface-panel)',
                  border: '1px solid var(--so-border-medium)',
                  padding: '4px 8px',
                  borderRadius: 'var(--so-radius-sm)',
                  fontSize: '11px',
                }}
              >
                <span style={{ fontWeight: 700, color: 'var(--so-text-secondary)' }}>Max Distance:</span>
                <input
                  type="number"
                  step="0.01"
                  value={soCloseMaxCloseness}
                  onChange={e => setSoCloseMaxCloseness(parseFloat(e.target.value) || 1.0)}
                  style={{ width: '48px', padding: '1px 4px', fontSize: '11px', fontWeight: 800, textAlign: 'center', borderRadius: '3px', border: '1px solid var(--so-border-subtle)', background: 'var(--so-surface-card)', color: 'var(--so-text-primary)' }}
                />
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--so-accent-cyan)' }}>
                  (+{((soCloseMaxCloseness - 1) * 100).toFixed(0)}%)
                </span>
              </div>

              {/* Wear Condition Selector Badges */}
              <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--so-text-muted)', marginRight: '2px' }}>Wears:</span>
                {[
                  { key: 'fn', label: 'FN' },
                  { key: 'mw', label: 'MW' },
                  { key: 'ft', label: 'FT' },
                  { key: 'ww', label: 'WW' },
                  { key: 'bs', label: 'BS' },
                  { key: 'souvenir', label: 'Souvenir' },
                  { key: 'sticker', label: 'Sticker' },
                ].map(w => {
                  const active = soCloseAllowedWears[w.key as keyof typeof soCloseAllowedWears];
                  return (
                    <button
                      key={w.key}
                      type="button"
                      onClick={() => setSoCloseAllowedWears(prev => ({ ...prev, [w.key]: !prev[w.key as keyof typeof soCloseAllowedWears] }))}
                      style={{
                        padding: '2px 6px',
                        fontSize: '9.5px',
                        fontWeight: 800,
                        borderRadius: '3px',
                        cursor: 'pointer',
                        backgroundColor: active ? 'var(--so-primary)' : 'var(--so-surface-panel)',
                        color: active ? '#ffffff' : 'var(--so-text-muted)',
                        border: active ? 'none' : '1px solid var(--so-border-subtle)',
                      }}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>

              {/* Quick Selection Filters */}
              {soCloseResults.length > 0 && (
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={selectAllSoCloseAvailable} className="btn btn-secondary btn-sm" style={{ fontSize: '10.5px', padding: '3px 8px' }}>
                    Select Available ({soCloseResults.filter(r => !r.hasExistingOrder).length})
                  </button>
                  <button onClick={selectBestSoClose} className="btn btn-warning btn-sm" style={{ fontSize: '10.5px', padding: '3px 8px' }}>
                    Select Best (&lt;5% Dist)
                  </button>
                  {selectedSoCloseCount > 0 && (
                    <button onClick={clearSoCloseSelection} className="btn btn-outline btn-sm" style={{ fontSize: '10.5px', padding: '3px 8px' }}>
                      Clear ({selectedSoCloseCount})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Run Scan Button */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                onClick={runSoCloseScan}
                disabled={isSoCloseRunning}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '12px', padding: '5px 14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isSoCloseRunning ? <Loader2 size={13} className="spin" /> : <Zap size={13} />} Run SoClose Scan
              </button>
            </div>
          </div>
        ) : (
          /* CONTROL BAR FOR LISTINGS & INVENTORY */
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--so-surface-card)',
              border: '1px solid var(--so-border-medium)',
              borderRadius: 'var(--so-radius-md)',
              padding: '8px 14px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            {/* Left Stats & Private Mode Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: 'var(--so-surface-panel)',
                  border: '1px solid var(--so-border-medium)',
                  padding: '4px 10px',
                  borderRadius: 'var(--so-radius-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', fontWeight: 700 }}>
                  <span style={{ color: 'var(--so-text-muted)' }}>Items: <strong style={{ color: 'var(--so-text-primary)' }}>{inventory.length}</strong></span>
                  <span style={{ color: 'var(--so-text-muted)' }}>Listed: <strong style={{ color: 'var(--so-success-text)' }}>{listedCount}</strong></span>
                  <span style={{ color: 'var(--so-text-muted)' }}>Unlisted: <strong style={{ color: 'var(--so-accent-cyan)' }}>{unlistedCount}</strong></span>
                  {overpricedCount > 0 && <span style={{ color: '#ef4444' }}>Overpriced: <strong>{overpricedCount}</strong></span>}
                  {underpricedCount > 0 && <span style={{ color: '#f59e0b' }}>Underpriced: <strong>{underpricedCount}</strong></span>}
                </div>

                <button
                  type="button"
                  onClick={() => setIsPrivateMode(prev => !prev)}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: isPrivateMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: isPrivateMode ? 'var(--so-primary)' : 'var(--so-success-text)',
                    border: `1px solid ${isPrivateMode ? 'var(--so-primary)' : 'var(--so-success)'}`,
                    padding: '3px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 800,
                    borderRadius: '4px',
                  }}
                  title="Toggle Private vs Public Mode when creating/updating listings"
                >
                  {isPrivateMode ? <Lock size={12} /> : <Globe size={12} />}
                  <span>Mode: {isPrivateMode ? 'PRIVATE' : 'PUBLIC'}</span>
                </button>
              </div>

              {inventory.length > 0 && (
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {unlistedCount > 0 && (
                    <button onClick={selectUnlistedListings} className="btn btn-secondary btn-sm" style={{ fontSize: '10.5px', padding: '3px 8px' }}>
                      Unlisted ({unlistedCount})
                    </button>
                  )}
                  {actionReqListingCount > 0 && (
                    <button onClick={selectActionRequiredListings} className="btn btn-warning btn-sm" style={{ fontSize: '10.5px', padding: '3px 8px' }}>
                      Action Req ({actionReqListingCount})
                    </button>
                  )}
                  {overpricedCount > 0 && (
                    <button onClick={selectOverpricedListings} className="btn btn-danger btn-sm" style={{ fontSize: '10.5px', padding: '3px 8px' }}>
                      Overpriced ({overpricedCount})
                    </button>
                  )}
                  {underpricedCount > 0 && (
                    <button onClick={selectUnderpricedListings} className="btn btn-warning btn-sm" style={{ fontSize: '10.5px', padding: '3px 8px' }}>
                      Underpriced ({underpricedCount})
                    </button>
                  )}
                  {matchedListingCount > 0 && (
                    <button onClick={selectAllMatchedListings} className="btn btn-outline btn-sm" style={{ fontSize: '10.5px', padding: '3px 8px' }}>
                      All Matched ({matchedListingCount})
                    </button>
                  )}
                  {selectedListingCount > 0 && (
                    <button onClick={clearListingSelection} className="btn btn-outline btn-sm" style={{ fontSize: '10.5px', padding: '3px 8px' }}>
                      Clear ({selectedListingCount})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Primary Action Buttons for Listings */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button onClick={fetchInventory} disabled={inventoryLoading} className="btn btn-primary btn-sm" style={{ fontSize: '12px', padding: '5px 12px' }}>
                {inventoryLoading ? <Loader2 size={13} className="spin" /> : <RotateCw size={13} />} Sync Inventory
              </button>
              <button
                onClick={loadListingPrices}
                disabled={loadingListingPrices || inventory.length === 0}
                className={`btn ${listingPricesLoaded ? 'btn-secondary' : 'btn-outline'} btn-sm`}
                style={{ fontSize: '12px', padding: '5px 12px' }}
              >
                {loadingListingPrices ? <Loader2 size={13} className="spin" /> : <LinkIcon size={13} />}
                {listingPricesLoaded ? 'Reload Listing Prices' : 'Load Listing Prices'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FLOATING BATCH PANEL FOR BUY ORDERS */}
      {activeTab === 'buy_orders' && selectedCount > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: isSidebarExpanded ? '258px' : '96px',
            right: '28px',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            backgroundColor: 'var(--so-primary)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 'var(--so-radius-md)',
            border: '1px solid var(--so-primary-hover)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(37, 99, 235, 0.4)',
            boxSizing: 'border-box',
            transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 700, fontSize: '13px' }}>
            <span
              style={{
                backgroundColor: '#ffffff',
                color: 'var(--so-primary)',
                padding: '2px 9px',
                borderRadius: '4px',
                fontWeight: 900,
                fontSize: '14px',
              }}
            >
              {selectedCount}
            </span>
            <span>ORDERS SELECTED FOR BATCH UPDATE TO ACCEPTED PRICE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={clearSelection}
              className="btn btn-secondary btn-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontWeight: 700,
                padding: '6px 14px',
                fontSize: '12px',
              }}
            >
              Clear Selection
            </button>

            <button
              onClick={executeBatchUpdate}
              disabled={batchProcessing}
              className="btn btn-secondary btn-sm"
              style={{
                backgroundColor: '#ffffff',
                color: 'var(--so-primary)',
                border: 'none',
                fontWeight: 900,
                padding: '6px 18px',
                fontSize: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              {batchProcessing ? (
                <>
                  <Loader2 size={13} className="spin" /> PROCESSING BATCH...
                </>
              ) : (
                <>EXECUTE BATCH UPDATE</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* FLOATING BATCH PANEL FOR SO CLOSE */}
      {activeTab === 'soclose' && selectedSoCloseCount > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: isSidebarExpanded ? '258px' : '96px',
            right: '28px',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            backgroundColor: 'var(--so-primary)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 'var(--so-radius-md)',
            border: '1px solid var(--so-primary-hover)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(37, 99, 235, 0.4)',
            boxSizing: 'border-box',
            transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 700, fontSize: '13px' }}>
            <span
              style={{
                backgroundColor: '#ffffff',
                color: 'var(--so-primary)',
                padding: '2px 9px',
                borderRadius: '4px',
                fontWeight: 900,
                fontSize: '14px',
              }}
            >
              {selectedSoCloseCount}
            </span>
            <span>OPPORTUNITIES SELECTED FOR BATCH BUY ORDER CREATION</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={clearSoCloseSelection}
              className="btn btn-secondary btn-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontWeight: 700,
                padding: '6px 14px',
                fontSize: '12px',
              }}
            >
              Clear Selection
            </button>

            <button
              onClick={executeBatchSoCloseCreate}
              disabled={batchSoCloseProcessing}
              className="btn btn-secondary btn-sm"
              style={{
                backgroundColor: '#ffffff',
                color: 'var(--so-primary)',
                border: 'none',
                fontWeight: 900,
                padding: '6px 18px',
                fontSize: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              {batchSoCloseProcessing ? (
                <>
                  <Loader2 size={13} className="spin" /> CREATING BUY ORDERS...
                </>
              ) : (
                <>
                  <PlusCircle size={13} /> CREATE BATCH BUY ORDERS ({selectedSoCloseCount})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* FLOATING BATCH PANEL FOR LISTINGS */}
      {activeTab === 'listings' && selectedListingCount > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: isSidebarExpanded ? '258px' : '96px',
            right: '28px',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            backgroundColor: 'var(--so-primary)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 'var(--so-radius-md)',
            border: '1px solid var(--so-primary-hover)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(37, 99, 235, 0.4)',
            boxSizing: 'border-box',
            transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 700, fontSize: '13px' }}>
            <span
              style={{
                backgroundColor: '#ffffff',
                color: 'var(--so-primary)',
                padding: '2px 9px',
                borderRadius: '4px',
                fontWeight: 900,
                fontSize: '14px',
              }}
            >
              {selectedListingCount}
            </span>
            <span>ITEMS SELECTED FOR BATCH LISTING OPERATIONS ({isPrivateMode ? 'PRIVATE' : 'PUBLIC'} MODE)</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={clearListingSelection}
              className="btn btn-secondary btn-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontWeight: 700,
                padding: '6px 12px',
                fontSize: '12px',
              }}
            >
              Clear
            </button>

            <button
              onClick={executeBatchList}
              disabled={batchListingProcessing}
              className="btn btn-secondary btn-sm"
              style={{
                backgroundColor: '#ffffff',
                color: 'var(--so-primary)',
                border: 'none',
                fontWeight: 900,
                padding: '6px 14px',
                fontSize: '12px',
              }}
            >
              {batchListingProcessing ? <Loader2 size={13} className="spin" /> : <PlusCircle size={13} />} LIST SELECTED
            </button>

            <button
              onClick={executeBatchUpdateListings}
              disabled={batchListingProcessing}
              className="btn btn-secondary btn-sm"
              style={{
                backgroundColor: '#f59e0b',
                color: '#ffffff',
                border: 'none',
                fontWeight: 900,
                padding: '6px 14px',
                fontSize: '12px',
              }}
            >
              {batchListingProcessing ? <Loader2 size={13} className="spin" /> : <Edit3 size={13} />} UPDATE PRICES
            </button>

            <button
              onClick={executeBatchUnlist}
              disabled={batchListingProcessing}
              className="btn btn-danger btn-sm"
              style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                fontWeight: 900,
                padding: '6px 14px',
                fontSize: '12px',
              }}
            >
              {batchListingProcessing ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />} UNLIST SELECTED
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT VIEW (BUY ORDERS TAB | SO CLOSE TAB | LISTINGS TAB) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '4px',
          paddingBottom:
            (activeTab === 'buy_orders' ? selectedCount : activeTab === 'soclose' ? selectedSoCloseCount : selectedListingCount) > 0
              ? '75px'
              : '0px',
          minHeight: 0,
        }}
      >
        {activeTab === 'buy_orders' ? (
          /* BUY ORDERS GRID VIEW */
          orders.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '50px 20px',
                color: 'var(--so-text-muted)',
              }}
            >
              {loading ? (
                <div>Fetching live buy orders from CSFloat...</div>
              ) : (
                <div>
                  <Package size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--so-text-primary)', marginBottom: '4px' }}>
                    No active buy orders loaded
                  </div>
                  <div style={{ fontSize: '12px' }}>Click "Sync Buy Orders" above to sync your active buy orders from CSFloat</div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '10px',
                paddingBottom: '12px',
              }}
            >
              {orders.map(order => {
                const driftDetails = getOrderDriftDetails(order);
                const isSelected = !!selectedItems[order.id];
                const currentPrice = order.price / 100;
                const isProcessing = processingId === order.id;

                const cardBorderColor = isSelected
                  ? 'var(--so-primary)'
                  : driftDetails?.isOverbid
                  ? '#ef4444'
                  : driftDetails?.isUnderbid
                  ? '#f59e0b'
                  : 'var(--so-border-medium)';

                const match = order.market_hash_name.match(/^(.+?)\s*\(([^)]+)\)$/);
                const cleanTitle = match ? match[1] : order.market_hash_name;
                const wear = match ? match[2] : '';
                const imageUrl = `https://api.steamapis.com/image/item/730/${encodeURIComponent(order.market_hash_name)}`;

                return (
                  <div
                    key={order.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px',
                      margin: 0,
                      padding: '10px',
                      minHeight: '240px',
                      height: 'auto',
                      boxSizing: 'border-box',
                      borderRadius: 'var(--so-radius-md)',
                      backgroundColor: 'var(--so-surface-card)',
                      border: `1px solid ${isSelected ? 'var(--so-primary)' : cardBorderColor}`,
                      boxShadow: isSelected ? 'inset 0 0 0 1px var(--so-primary)' : 'none',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    onClick={() => setSelectedItems(prev => ({ ...prev, [order.id]: !prev[order.id] }))}
                  >
                    {/* Top Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '20px' }}>
                      {isSelected ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            backgroundColor: 'var(--so-primary)',
                            color: '#ffffff',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            fontSize: '9px',
                            fontWeight: 800,
                            letterSpacing: '0.4px',
                            lineHeight: '1.2',
                          }}
                        >
                          <Check size={10} /> SELECTED
                        </span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCsfloatMarket(order.market_hash_name);
                            }}
                            className="btn btn-sm"
                            style={{ padding: '3px 6px', background: 'var(--so-surface-panel)', border: '1px solid var(--so-border-subtle)', borderRadius: '4px', color: 'var(--so-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Open on CSFloat Market (Browser)"
                          >
                            <ExternalLink size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLookupModal(order.market_hash_name, driftDetails?.acceptedPrice, currentPrice);
                            }}
                            className="btn btn-sm"
                            style={{ padding: '3px 6px', background: 'var(--so-surface-panel)', border: '1px solid var(--so-border-subtle)', borderRadius: '4px', color: 'var(--so-accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Inspect Item Details"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      )}

                      {driftDetails ? (
                        driftDetails.isOverbid ? (
                          <span
                            className="badge"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              backgroundColor: 'rgba(239, 68, 68, 0.18)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              fontWeight: 800,
                              fontSize: '9px',
                              padding: '1px 5px',
                            }}
                          >
                            <AlertTriangle size={10} /> OVERBID ({driftDetails.driftPercent > 0 ? `+${driftDetails.driftPercent.toFixed(0)}%` : `${driftDetails.driftPercent.toFixed(0)}%`})
                          </span>
                        ) : driftDetails.isUnderbid ? (
                          <span
                            className="badge"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              backgroundColor: 'rgba(245, 158, 11, 0.18)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              fontWeight: 800,
                              fontSize: '9px',
                              padding: '1px 5px',
                            }}
                          >
                            <AlertTriangle size={10} /> UNDERBID ({driftDetails.driftPercent.toFixed(0)}%)
                          </span>
                        ) : (
                          <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 800, fontSize: '9px', padding: '1px 5px' }}>
                            <CheckCircle2 size={10} /> SAFE ({driftDetails.driftPercent >= 0 ? `+${driftDetails.driftPercent.toFixed(0)}%` : `${driftDetails.driftPercent.toFixed(0)}%`})
                          </span>
                        )
                      ) : (
                        <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '1px 5px' }}>ACTIVE</span>
                      )}
                    </div>

                    {/* Image */}
                    <div
                      style={{
                        height: '65px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        borderRadius: 'var(--so-radius-sm)',
                        border: '1px solid var(--so-border-subtle)',
                        padding: '4px',
                        backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt={cleanTitle}
                        onError={(e) => {
                          (e.target as HTMLElement).style.opacity = '0.3';
                        }}
                        style={{
                          maxHeight: '55px',
                          maxWidth: '100%',
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
                        }}
                      />
                    </div>

                    {/* Title & Wear */}
                    <div style={{ textAlign: 'center', minHeight: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '11.5px',
                          color: 'var(--so-text-primary)',
                          lineHeight: '1.2',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cleanTitle}
                      </div>
                      {wear && (
                        <div style={{ fontSize: '10px', color: 'var(--so-text-muted)', fontWeight: 700, marginTop: '2px' }}>
                          {wear}
                        </div>
                      )}
                    </div>

                    {/* Pricing */}
                    <div
                      style={{
                        backgroundColor: driftDetails?.isOverbid
                          ? 'rgba(239, 68, 68, 0.12)'
                          : driftDetails?.isUnderbid
                          ? 'rgba(245, 158, 11, 0.12)'
                          : 'var(--so-surface-input)',
                        border: `1px solid ${
                          driftDetails?.isOverbid
                            ? 'rgba(239, 68, 68, 0.3)'
                            : driftDetails?.isUnderbid
                            ? 'rgba(245, 158, 11, 0.3)'
                            : 'var(--so-border-subtle)'
                        }`,
                        padding: '6px 8px',
                        borderRadius: 'var(--so-radius-sm)',
                        fontSize: '11px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                        <span style={{ color: 'var(--so-text-muted)' }}>Quantity</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = Math.max(1, (order.qty || 1) - 1);
                              setOrders(prev => prev.map(o => o.id === order.id ? { ...o, qty: newQty } : o));
                            }}
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '3px',
                              border: '1px solid var(--so-border-subtle)',
                              background: 'var(--so-surface-panel)',
                              color: 'var(--so-text-primary)',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              lineHeight: 1,
                            }}
                            title="Decrease Quantity"
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 800, color: 'var(--so-primary)', minWidth: '16px', textAlign: 'center', fontSize: '11.5px' }}>
                            {order.qty || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = (order.qty || 1) + 1;
                              setOrders(prev => prev.map(o => o.id === order.id ? { ...o, qty: newQty } : o));
                            }}
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '3px',
                              border: '1px solid var(--so-border-subtle)',
                              background: 'var(--so-surface-panel)',
                              color: 'var(--so-text-primary)',
                              fontSize: '11px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              lineHeight: 1,
                            }}
                            title="Increase Quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--so-text-muted)' }}>My Price</span>
                        <span
                          className="tabular-nums"
                          style={{
                            fontWeight: 800,
                            color: driftDetails?.isOverbid
                              ? '#ef4444'
                              : driftDetails?.isUnderbid
                              ? '#f59e0b'
                              : 'var(--so-text-primary)',
                          }}
                        >
                          ${currentPrice.toFixed(2)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--so-text-muted)' }}>Accepted</span>
                        <span className="tabular-nums" style={{ fontWeight: 800, color: 'var(--so-success-text)' }}>
                          {driftDetails?.acceptedPrice ? `$${driftDetails.acceptedPrice.toFixed(2)}` : '---'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                      {driftDetails?.acceptedPrice && (
                        <button
                          onClick={() => handleManualUpdate(order.id, order.market_hash_name, driftDetails.acceptedPrice, order.qty || 1)}
                          disabled={isProcessing}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, fontWeight: 700, fontSize: '11px', padding: '4px 6px' }}
                        >
                          {isProcessing ? <Loader2 size={11} className="spin" /> : 'Update Order'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        disabled={isProcessing}
                        className="btn btn-danger btn-sm"
                        title="Delete Order"
                        style={{ padding: '4px 6px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : activeTab === 'soclose' ? (
          /* SO CLOSE OPPORTUNITIES GRID VIEW */
          soCloseResults.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '50px 20px',
                color: 'var(--so-text-muted)',
              }}
            >
              {isSoCloseRunning ? (
                <div>Scanning CSFloat market prices against Step 2 Accepted Prices...</div>
              ) : (
                <div>
                  <Zap size={32} style={{ marginBottom: '10px', opacity: 0.5, color: 'var(--so-accent-cyan)' }} />
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--so-text-primary)', marginBottom: '4px' }}>
                    No So Close opportunities loaded
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    Click "Run SoClose Scan" above to evaluate Step 1 CSFloat market prices against Oracle Accepted Prices
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                gap: '10px',
                paddingBottom: '12px',
              }}
            >
              {soCloseResults.map(item => {
                const isSelected = !!selectedSoCloseItems[item.name];
                const isProcessing = soCloseProcessingName === item.name;

                const match = item.name.match(/^(.+?)\s*\(([^)]+)\)$/);
                const cleanTitle = match ? match[1] : item.name;
                const wearText = match ? match[2] : '';
                const wearShortcut = getWearShortcut(wearText);

                const imageUrl = item.iconUrl
                  ? `https://community.cloudflare.steamstatic.com/economy/image/${item.iconUrl}`
                  : `https://api.steamapis.com/image/item/730/${encodeURIComponent(item.name)}`;

                const cardBorderColor = isSelected
                  ? 'var(--so-primary)'
                  : item.hasExistingOrder
                  ? 'var(--so-accent-cyan)'
                  : item.closeness <= 1.0
                  ? 'var(--so-success)'
                  : 'var(--so-warning)';

                return (
                  <div
                    key={item.name}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px',
                      margin: 0,
                      padding: '10px',
                      minHeight: '250px',
                      height: 'auto',
                      boxSizing: 'border-box',
                      borderRadius: 'var(--so-radius-md)',
                      backgroundColor: 'var(--so-surface-card)',
                      border: `1px solid ${isSelected ? 'var(--so-primary)' : cardBorderColor}`,
                      boxShadow: isSelected ? 'inset 0 0 0 1px var(--so-primary)' : 'none',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    onClick={() => setSelectedSoCloseItems(prev => ({ ...prev, [item.name]: !prev[item.name] }))}
                  >
                    {/* Top Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '20px' }}>
                      {isSelected ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            backgroundColor: 'var(--so-primary)',
                            color: '#ffffff',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            fontSize: '9px',
                            fontWeight: 800,
                            letterSpacing: '0.4px',
                            lineHeight: '1.2',
                          }}
                        >
                          <Check size={10} /> SELECTED
                        </span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCsfloatMarket(item.name);
                            }}
                            className="btn btn-sm"
                            style={{ padding: '3px 6px', background: 'var(--so-surface-panel)', border: '1px solid var(--so-border-subtle)', borderRadius: '4px', color: 'var(--so-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Open on CSFloat Market (Browser)"
                          >
                            <ExternalLink size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLookupModal(item.name, item.acceptedPrice, item.currentMarketPrice, item.iconUrl);
                            }}
                            className="btn btn-sm"
                            style={{ padding: '3px 6px', background: 'var(--so-surface-panel)', border: '1px solid var(--so-border-subtle)', borderRadius: '4px', color: 'var(--so-accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Inspect Item Details"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      )}

                      {/* Distance / Closeness Badge */}
                      {item.hasExistingOrder ? (
                        <span className="badge badge-cyan" style={{ fontSize: '9px', padding: '1px 5px', fontWeight: 800 }}>
                          ORDER PLACED
                        </span>
                      ) : item.closeness <= 1.0 ? (
                        <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 5px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle2 size={10} /> BELOW TARGET ({item.closenessPercent >= 0 ? `+${item.closenessPercent.toFixed(1)}%` : `${item.closenessPercent.toFixed(1)}%`})
                        </span>
                      ) : (
                        <span
                          className="badge"
                          style={{
                            fontSize: '9px',
                            padding: '1px 5px',
                            fontWeight: 800,
                            backgroundColor: 'rgba(245, 158, 11, 0.18)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          SO CLOSE (+{item.closenessPercent.toFixed(1)}%)
                        </span>
                      )}
                    </div>

                    {/* Image Showcase */}
                    <div
                      style={{
                        height: '65px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        borderRadius: 'var(--so-radius-sm)',
                        border: '1px solid var(--so-border-subtle)',
                        padding: '4px',
                        backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt={cleanTitle}
                        onError={(e) => {
                          (e.target as HTMLElement).style.opacity = '0.3';
                        }}
                        style={{
                          maxHeight: '55px',
                          maxWidth: '100%',
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
                        }}
                      />
                    </div>

                    {/* Title & Wear */}
                    <div style={{ textAlign: 'center', minHeight: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '11.5px',
                          color: 'var(--so-text-primary)',
                          lineHeight: '1.2',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cleanTitle}
                      </div>
                      {wearShortcut && (
                        <div style={{ fontSize: '10px', color: 'var(--so-primary)', fontWeight: 800, marginTop: '2px' }}>
                          {wearShortcut}
                        </div>
                      )}
                    </div>

                    {/* Pricing Info Box */}
                    <div
                      style={{
                        backgroundColor: item.closeness <= 1.0 ? 'rgba(16, 185, 129, 0.12)' : 'var(--so-surface-input)',
                        border: `1px solid ${item.closeness <= 1.0 ? 'rgba(16, 185, 129, 0.3)' : 'var(--so-border-subtle)'}`,
                        padding: '6px 8px',
                        borderRadius: 'var(--so-radius-sm)',
                        fontSize: '11px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ color: 'var(--so-text-muted)' }}>Target Buy Price</span>
                        <span className="tabular-nums" style={{ fontWeight: 800, color: 'var(--so-success-text)' }}>
                          ${item.acceptedPrice.toFixed(2)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ color: 'var(--so-text-muted)' }}>CSFloat Market</span>
                        <span className="tabular-nums" style={{ fontWeight: 800, color: item.closeness <= 1.0 ? 'var(--so-success-text)' : '#f59e0b' }}>
                          ${item.currentMarketPrice.toFixed(2)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px' }}>
                        <span style={{ color: 'var(--so-text-muted)' }}>Distance</span>
                        <span className="tabular-nums" style={{ fontWeight: 700, color: item.closeness <= 1.0 ? 'var(--so-success-text)' : 'var(--so-text-secondary)' }}>
                          {item.closeness.toFixed(2)}x (+{item.closenessPercent.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                      {item.hasExistingOrder ? (
                        <button
                          disabled
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, fontWeight: 700, fontSize: '11px', padding: '4px 6px', opacity: 0.6 }}
                        >
                          Order Placed
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCreateSoCloseBuyOrder(item)}
                          disabled={isProcessing || isProcessing}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, fontWeight: 700, fontSize: '11px', padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                          {isProcessing ? <Loader2 size={11} className="spin" /> : <PlusCircle size={12} />}
                          <span>Create Buy Order (${item.acceptedPrice.toFixed(2)})</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* LISTINGS & INVENTORY GRID VIEW */
          inventory.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '50px 20px',
                color: 'var(--so-text-muted)',
              }}
            >
              {inventoryLoading ? (
                <div>Fetching CSFloat user inventory...</div>
              ) : (
                <div>
                  <Tag size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--so-text-primary)', marginBottom: '4px' }}>
                    No inventory items loaded
                  </div>
                  <div style={{ fontSize: '12px' }}>Click "Sync Inventory" above to sync your items from CSFloat</div>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                gap: '10px',
                paddingBottom: '12px',
              }}
            >
              {inventory.map(item => {
                const analysis = listingAnalysis[item.asset_id];
                const isSelected = !!selectedListingItems[item.asset_id];
                const isListed = !!item.listing_id;
                const isProcessing = listingProcessingId === item.asset_id;

                const name = item.market_hash_name || item.item_name || 'CS:GO Item';
                const match = name.match(/^(.+?)\s*\(([^)]+)\)$/);
                const cleanTitle = match ? match[1] : name;
                const wearText = match ? match[2] : (item.wear_name || '');
                const wearShortcut = getWearShortcut(wearText);

                const imageUrl = item.icon_url
                  ? `https://community.cloudflare.steamstatic.com/economy/image/${item.icon_url}`
                  : `https://api.steamapis.com/image/item/730/${encodeURIComponent(name)}`;

                const floatVal = item.float_value !== undefined && item.float_value !== null
                  ? item.float_value.toFixed(4)
                  : null;

                const currentListedPriceDollar = isListed && item.price ? item.price / 100 : null;

                const cardBorderColor = isSelected
                  ? 'var(--so-primary)'
                  : analysis?.isOverpriced
                  ? '#ef4444'
                  : analysis?.isUnderpriced
                  ? '#f59e0b'
                  : isListed
                  ? 'var(--so-success)'
                  : 'var(--so-border-medium)';

                return (
                  <div
                    key={item.asset_id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px',
                      margin: 0,
                      padding: '10px',
                      minHeight: '260px',
                      height: 'auto',
                      boxSizing: 'border-box',
                      borderRadius: 'var(--so-radius-md)',
                      backgroundColor: 'var(--so-surface-card)',
                      border: `1px solid ${isSelected ? 'var(--so-primary)' : cardBorderColor}`,
                      boxShadow: isSelected ? 'inset 0 0 0 1px var(--so-primary)' : 'none',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    onClick={() => setSelectedListingItems(prev => ({ ...prev, [item.asset_id]: !prev[item.asset_id] }))}
                  >
                    {/* Top Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '20px' }}>
                      {isSelected ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            backgroundColor: 'var(--so-primary)',
                            color: '#ffffff',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            fontSize: '9px',
                            fontWeight: 800,
                            letterSpacing: '0.4px',
                            lineHeight: '1.2',
                          }}
                        >
                          <Check size={10} /> SELECTED
                        </span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCsfloatMarket(name);
                            }}
                            className="btn btn-sm"
                            style={{ padding: '3px 6px', background: 'var(--so-surface-panel)', border: '1px solid var(--so-border-subtle)', borderRadius: '4px', color: 'var(--so-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Open on CSFloat Market (Browser)"
                          >
                            <ExternalLink size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLookupModal(name, undefined, currentListedPriceDollar || undefined, item.icon_url);
                            }}
                            className="btn btn-sm"
                            style={{ padding: '3px 6px', background: 'var(--so-surface-panel)', border: '1px solid var(--so-border-subtle)', borderRadius: '4px', color: 'var(--so-accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Inspect Item Details"
                          >
                            <Eye size={14} />
                          </button>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '1px 5px',
                              fontSize: '8.5px',
                              color: isListed ? 'var(--so-success-text)' : 'var(--so-text-muted)',
                              backgroundColor: isListed ? 'rgba(16, 185, 129, 0.15)' : 'var(--so-surface-panel)',
                              borderRadius: '3px',
                              fontWeight: 800,
                            }}
                          >
                            {isListed ? (item.private ? <Lock size={9} style={{ marginRight: 2 }} /> : <Globe size={9} style={{ marginRight: 2 }} />) : null}
                            {isListed ? 'STALL' : 'UNLISTED'}
                          </span>
                        </div>
                      )}

                      {/* Analysis Badge */}
                      {!isListed ? (
                        <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '1px 5px' }}>
                          READY TO LIST
                        </span>
                      ) : analysis ? (
                        analysis.isOverpriced ? (
                          <span
                            className="badge"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              backgroundColor: 'rgba(239, 68, 68, 0.18)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              fontWeight: 800,
                              fontSize: '9px',
                              padding: '1px 5px',
                            }}
                          >
                            <AlertTriangle size={10} /> OVERPRICED ({analysis.driftPercent > 0 ? `+${analysis.driftPercent.toFixed(0)}%` : `${analysis.driftPercent.toFixed(0)}%`})
                          </span>
                        ) : analysis.isUnderpriced ? (
                          <span
                            className="badge"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              backgroundColor: 'rgba(245, 158, 11, 0.18)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              fontWeight: 800,
                              fontSize: '9px',
                              padding: '1px 5px',
                            }}
                          >
                            <AlertTriangle size={10} /> UNDERPRICED ({analysis.driftPercent.toFixed(0)}%)
                          </span>
                        ) : (
                          <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 800, fontSize: '9px', padding: '1px 5px' }}>
                            <CheckCircle2 size={10} /> SAFE ({analysis.driftPercent >= 0 ? `+${analysis.driftPercent.toFixed(0)}%` : `${analysis.driftPercent.toFixed(0)}%`})
                          </span>
                        )
                      ) : (
                        <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '1px 5px' }}>LISTED</span>
                      )}
                    </div>

                    {/* Image Showcase */}
                    <div
                      style={{
                        height: '65px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        borderRadius: 'var(--so-radius-sm)',
                        border: '1px solid var(--so-border-subtle)',
                        padding: '4px',
                        backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 70%)',
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt={cleanTitle}
                        onError={(e) => {
                          (e.target as HTMLElement).style.opacity = '0.3';
                        }}
                        style={{
                          maxHeight: '55px',
                          maxWidth: '100%',
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
                        }}
                      />
                    </div>

                    {/* Title & Wear & Float */}
                    <div style={{ textAlign: 'center', minHeight: '34px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '11.5px',
                          color: 'var(--so-text-primary)',
                          lineHeight: '1.2',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cleanTitle}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '2px', fontSize: '10px' }}>
                        {wearShortcut && (
                          <span style={{ color: 'var(--so-primary)', fontWeight: 800 }}>
                            {wearShortcut}
                          </span>
                        )}
                        {floatVal && (
                          <span style={{ color: 'var(--so-text-muted)', fontWeight: 700 }}>
                            F: {floatVal}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pricing Info Box */}
                    <div
                      style={{
                        backgroundColor: analysis?.isOverpriced
                          ? 'rgba(239, 68, 68, 0.12)'
                          : analysis?.isUnderpriced
                          ? 'rgba(245, 158, 11, 0.12)'
                          : 'var(--so-surface-input)',
                        border: `1px solid ${
                          analysis?.isOverpriced
                            ? 'rgba(239, 68, 68, 0.3)'
                            : analysis?.isUnderpriced
                            ? 'rgba(245, 158, 11, 0.3)'
                            : 'var(--so-border-subtle)'
                        }`,
                        padding: '6px 8px',
                        borderRadius: 'var(--so-radius-sm)',
                        fontSize: '11px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ color: 'var(--so-text-muted)' }}>My Listed</span>
                        <span
                          className="tabular-nums"
                          style={{
                            fontWeight: 800,
                            color: currentListedPriceDollar !== null
                              ? (analysis?.isOverpriced ? '#ef4444' : analysis?.isUnderpriced ? '#f59e0b' : 'var(--so-text-primary)')
                              : 'var(--so-text-muted)',
                          }}
                        >
                          {currentListedPriceDollar !== null ? `$${currentListedPriceDollar.toFixed(2)}` : 'UNLISTED'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ color: 'var(--so-text-muted)' }}>Target List Price</span>
                        <span className="tabular-nums" style={{ fontWeight: 800, color: 'var(--so-success-text)' }}>
                          {analysis?.targetListingPrice ? `$${analysis.targetListingPrice.toFixed(2)}` : '---'}
                        </span>
                      </div>

                      {analysis?.lowestPrice ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px' }}>
                          <span style={{ color: 'var(--so-text-muted)' }}>Lowest / Avg</span>
                          <span className="tabular-nums" style={{ color: 'var(--so-text-secondary)', fontWeight: 600 }}>
                            ${analysis.lowestPrice.toFixed(2)} / ${analysis.averagePrice.toFixed(2)}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                      {!isListed ? (
                        <button
                          onClick={() => handleCreateListing(item, analysis?.targetListingPrice)}
                          disabled={isProcessing}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, fontWeight: 700, fontSize: '11px', padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                          {isProcessing ? <Loader2 size={11} className="spin" /> : <PlusCircle size={12} />}
                          <span>List {isPrivateMode ? '(Priv)' : '(Pub)'}</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleUpdateListing(item, analysis?.targetListingPrice || (currentListedPriceDollar || 0))}
                            disabled={isProcessing || !analysis?.targetListingPrice}
                            className="btn btn-warning btn-sm"
                            style={{ flex: 1, fontWeight: 700, fontSize: '10.5px', padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}
                            title="Update listing to Target Listing Price"
                          >
                            {isProcessing ? <Loader2 size={11} className="spin" /> : <Edit3 size={11} />}
                            <span>Update</span>
                          </button>
                          <button
                            onClick={() => handleUnlist(item)}
                            disabled={isProcessing}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '4px 6px' }}
                            title="Remove listing (Unlist)"
                          >
                            {isProcessing ? <Loader2 size={11} className="spin" /> : <Trash2 size={12} />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
