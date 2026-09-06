import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  RotateCw,
  Trash2,
  Loader2,
  RefreshCw,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  KeyRound,
  History,
  X,
  Target,
  Wallet,
  Eye,
  Zap,
  Tag,
  Package,
  PlusCircle,
  Search,
  Percent,
  Lock,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dmarketLogo } from '../../../../assets/images';
import {
  DmarketTargetItem,
  AcceptedPriceInfo,
  DmarketOfferItem,
  DmarketInventoryItem,
  ListingAnalysis,
  ListingPriceInfo,
} from '../../../shared/types';
import { safeGetItem } from '../../utils/storage';

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

const getWearShortcut = (wear?: string) => {
  if (!wear) return '';
  const w = wear.toLowerCase();
  if (w.includes('factory new') || w.includes('exterior_factory_new')) return 'FN';
  if (w.includes('minimal wear') || w.includes('exterior_minimal_wear')) return 'MW';
  if (w.includes('field-tested') || w.includes('exterior_field_tested')) return 'FT';
  if (w.includes('well-worn') || w.includes('exterior_well_worn')) return 'WW';
  if (w.includes('battle-scarred') || w.includes('exterior_battle_scarred')) return 'BS';
  return wear;
};

const getTradeTitle = (trade: any): string => {
  if (!trade) return 'CS2 Item';
  return (
    trade.Title ||
    trade.title ||
    trade.marketHashName ||
    trade.MarketHashName ||
    trade.name ||
    trade.Name ||
    trade.assetTitle ||
    trade.AssetTitle ||
    'CS2 Item'
  );
};

const getTradePrice = (trade: any): string => {
  if (!trade) return '—';
  if (trade.priceUSD && trade.priceUSD !== '—') return trade.priceUSD;

  const priceObj = trade.Price || trade.price;
  let raw: any = undefined;

  if (priceObj && typeof priceObj === 'object') {
    raw =
      priceObj.Amount ??
      priceObj.amount ??
      priceObj.USD ??
      priceObj.usd ??
      priceObj.price ??
      priceObj.Price;
  } else if (typeof priceObj === 'number' || typeof priceObj === 'string') {
    raw = priceObj;
  }

  if (raw === undefined || raw === null || raw === '') {
    raw =
      trade.PriceCents ??
      trade.priceCents ??
      trade.PriceAmount ??
      trade.priceAmount ??
      trade.AmountCents ??
      trade.amountCents;
  }

  if (raw === undefined || raw === null || raw === '') return '—';

  const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (isNaN(num)) return '—';

  const str = String(raw);
  if (str.includes('.')) return num.toFixed(2);
  if (priceObj?.USD !== undefined || priceObj?.usd !== undefined || num >= 50) {
    return (num / 100).toFixed(2);
  }
  return num.toFixed(2);
};

const getTradeAmount = (trade: any): string => {
  return String(trade?.Amount || trade?.amount || '1');
};

const getTradeDate = (trade: any): string => {
  const ts =
    trade?.ClosedAt ??
    trade?.closedAt ??
    trade?.ClosedTime ??
    trade?.closedTime ??
    trade?.CreatedAt ??
    trade?.createdAt;
  if (!ts) return 'Recent';
  const num = typeof ts === 'number' ? ts : parseInt(String(ts), 10);
  if (isNaN(num)) return String(ts);
  const sec = num > 1e11 ? Math.floor(num / 1000) : num;
  return new Date(sec * 1000).toLocaleString();
};

interface TargetAnalysis {
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
  hasExistingTarget: boolean;
  iconUrl?: string;
}

export default function DmarketWorkstation() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [targets, setTargets] = useState<DmarketTargetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [balanceData, setBalanceData] = useState<{
    usdFormatted?: string;
    usdCents?: number;
    dmc?: string;
  } | null>(null);
  const [profileData, setProfileData] = useState<{
    username?: string;
    targetsLimit?: number;
    imageUrl?: string;
  } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Main Tab Navigation ('target' | 'soclose' | 'listings')
  const [mainTab, setMainTab] = useState<'target' | 'soclose' | 'listings'>('target');

  // ── SO CLOSE OPPORTUNITIES STATE ──────────────────────────────────
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
  const [soCloseSearchQuery, setSoCloseSearchQuery] = useState('');

  // Sub-Navigation inside Target ('active' | 'history')
  const [targetSubTab, setTargetSubTab] = useState<'active' | 'history'>('active');

  // Drift Action Threshold (default 2% difference)
  const [driftThresholdPercent, setDriftThresholdPercent] = useState<number>(2);
  const [showExtraOptions, setShowExtraOptions] = useState(false);

  // Drift Filter: All, Action Req, Overbid, Underbid, Safe
  const [filterAction, setFilterAction] = useState<'all' | 'action_required' | 'overbid' | 'underbid' | 'safe'>('all');

  // Oracle Analysis State
  const [targetAnalysis, setTargetAnalysis] = useState<Record<string, TargetAnalysis>>({});
  const [acceptedPricesMeta, setAcceptedPricesMeta] = useState<{
    itemCount: number;
    storedAt: string | null;
  } | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Selection & Batch Action State
  const [selectedTargets, setSelectedTargets] = useState<Record<string, boolean>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Single Item Lookup Modal State
  const [lookupModalItem, setLookupModalItem] = useState<{
    name: string;
    acceptedPrice?: number;
    marketPrice?: number;
    iconUrl?: string;
    cacheItem?: any;
  } | null>(null);

  // Edit Target Modal State
  const [editingTarget, setEditingTarget] = useState<DmarketTargetItem | null>(null);
  const [editTargetPrice, setEditTargetPrice] = useState('');
  const [editTargetAmount, setEditTargetAmount] = useState('1');
  const [updatingTarget, setUpdatingTarget] = useState(false);

  // Closed Targets History State
  const [closedTrades, setClosedTrades] = useState<any[]>([]);
  const [closedLoading, setClosedLoading] = useState(false);

  // ── LISTINGS & INVENTORY STATE ────────────────────────────────────
  const [listingSubTab, setListingSubTab] = useState<'active' | 'inventory' | 'history'>('active');
  const [offers, setOffers] = useState<DmarketOfferItem[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [inventory, setInventory] = useState<DmarketInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [closedOffers, setClosedOffers] = useState<any[]>([]);
  const [closedOffersLoading, setClosedOffersLoading] = useState(false);
  const [listingAnalysis, setListingAnalysis] = useState<Record<string, ListingAnalysis>>({});
  const [listingPriceMap, setListingPriceMap] = useState<Record<string, ListingPriceInfo>>({});
  const [listingPricesMeta, setListingPricesMeta] = useState<{
    itemCount: number;
    storedAt: string | null;
  } | null>(null);
  const [loadingListingPrices, setLoadingListingPrices] = useState(false);
  const [selectedOffers, setSelectedOffers] = useState<Record<string, boolean>>({});
  const [selectedInventory, setSelectedInventory] = useState<Record<string, boolean>>({});
  const [listingProcessingId, setListingProcessingId] = useState<string | null>(null);
  const [batchListingProcessing, setBatchListingProcessing] = useState(false);
  const [listingSearch, setListingSearch] = useState('');
  const [listingFilterAction, setListingFilterAction] = useState<'all' | 'action_required' | 'overpriced' | 'underpriced' | 'safe'>('all');

  // Edit Offer Modal State
  const [editingOffer, setEditingOffer] = useState<DmarketOfferItem | null>(null);
  const [editOfferPrice, setEditOfferPrice] = useState('');
  const [updatingOffer, setUpdatingOffer] = useState(false);

  // Create Offer Modal State
  const [creatingOfferItem, setCreatingOfferItem] = useState<DmarketInventoryItem | null>(null);
  const [createOfferPrice, setCreateOfferPrice] = useState('');
  const [submittingCreateOffer, setSubmittingCreateOffer] = useState(false);

  // Prevent duplicate concurrent / double-invoked fetches on mount
  const isFetchingTargetsRef = useRef(false);
  const isFetchingClosedTargetsRef = useRef(false);
  const initialFetchDoneRef = useRef(false);

  // Sidebar expand/collapse tracking for full-width floating panel positioning
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
    const interval = setInterval(handleStorage, 200);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

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

      if (balanceRes.status === 'fulfilled') {
        setBalanceData(balanceRes.value);
      }
      if (profileRes.status === 'fulfilled') {
        const prof = profileRes.value;
        setProfileData({
          username: prof?.username || 'Trader',
          targetsLimit: prof?.settings?.targetsLimit,
          imageUrl: prof?.imageUrl,
        });
      }
    } catch (err: any) {
      console.warn('[DMarket Workstation] Balance/Profile error:', err.message);
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchTargets = async () => {
    if (isFetchingTargetsRef.current) return;
    isFetchingTargetsRef.current = true;

    const keyOk = await checkApiKey();
    if (!keyOk) {
      toast.error('DMarket API keys not configured. Please add your keys in Settings.');
      isFetchingTargetsRef.current = false;
      return;
    }

    setLoading(true);
    setSelectedTargets({});
    const toastId = 'dmarket-sync-targets';
    toast.loading('Syncing DMarket targets...', { id: toastId });
    try {
      const res = await window.electronAPI.dmarket.getTargets({ fetchAll: true });
      const list: DmarketTargetItem[] = Array.isArray(res?.items) ? res.items : [];
      setTargets(list);
      toast.success(`Loaded ${list.length} active DMarket targets`, { id: toastId });
      fetchUserData();
    } catch (err: any) {
      console.error('[DMarket Workstation] Error fetching targets:', err);
      toast.error(`DMarket error: ${err.message}`, { id: toastId });
    } finally {
      setLoading(false);
      isFetchingTargetsRef.current = false;
    }
  };

  const fetchClosedTargets = async () => {
    if (isFetchingClosedTargetsRef.current) return;
    isFetchingClosedTargetsRef.current = true;

    setClosedLoading(true);
    const toastId = 'dmarket-closed-targets';
    toast.loading('Loading target history...', { id: toastId });
    try {
      const res = await window.electronAPI.dmarket.getClosedTargets(50);
      setClosedTrades(Array.isArray(res?.trades) ? res.trades : []);
      toast.success(`Loaded ${res?.trades?.length || 0} completed target trades`, { id: toastId });
    } catch (err: any) {
      toast.error(`Failed to fetch target history: ${err.message}`, { id: toastId });
    } finally {
      setClosedLoading(false);
      isFetchingClosedTargetsRef.current = false;
    }
  };

  useEffect(() => {
    if (initialFetchDoneRef.current) return;
    initialFetchDoneRef.current = true;

    checkApiKey().then(ok => {
      if (ok) {
        fetchTargets();
      }
    });
  }, []);

  useEffect(() => {
    if (targetSubTab === 'history' && closedTrades.length === 0 && hasKey) {
      fetchClosedTargets();
    }
  }, [targetSubTab]);

  // Load Oracle Accepted Prices and match them against active targets
  const loadAcceptedPrices = async () => {
    setLoadingPrices(true);
    const toastId = toast.loading('Matching Oracle accepted prices...');
    try {
      const result: { map: Record<string, AcceptedPriceInfo>; itemCount: number; storedAt: string | null } =
        await (window.electronAPI.oracle as any).getAcceptedPrices();

      if (!result || result.itemCount === 0) {
        toast.error('No accepted prices found in memory. Please evaluate skins in Oracle Dashboard first.', { id: toastId });
        setLoadingPrices(false);
        return;
      }

      setAcceptedPricesMeta({ itemCount: result.itemCount, storedAt: result.storedAt });

      const newAnalysis: Record<string, TargetAnalysis> = {};
      targets.forEach(target => {
        const title = target.title;
        const priceEntry = result.map[title];
        if (!priceEntry) return;

        const currentPriceDollar = parseFloat(target.priceCents) / 100;
        const acceptedDollar = parseFloat(priceEntry.acceptedPrice.toFixed(2));

        newAnalysis[target.targetId] = {
          acceptedPrice: acceptedDollar,
          liquidityScore: priceEntry.liquidityScore,
          isHyperLiquid: priceEntry.isHyperLiquid,
          currentPrice: currentPriceDollar,
        };
      });

      setTargetAnalysis(newAnalysis);
      toast.success(`Matched ${Object.keys(newAnalysis).length} targets with Oracle prices`, { id: toastId });
    } catch (err: any) {
      toast.error(`Failed to load accepted prices: ${err.message}`, { id: toastId });
    } finally {
      setLoadingPrices(false);
    }
  };

  const getTargetDriftDetails = (target: DmarketTargetItem) => {
    const analysis = targetAnalysis[target.targetId];
    if (!analysis?.acceptedPrice) return null;

    const currentPrice = parseFloat(target.priceCents) / 100;
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

  // Open item inspection modal with Skinsnipe multi-market cache
  const handleOpenLookupModal = async (title: string, acceptedPrice?: number, marketPrice?: number, iconUrl?: string) => {
    setLookupModalItem({ name: title, acceptedPrice, marketPrice, iconUrl });
    try {
      const cache = await window.electronAPI.skinsnipe.getCache();
      const cacheItem = cache ? cache[title] : null;
      setLookupModalItem(prev => (prev ? { ...prev, cacheItem } : null));
    } catch (err) {
      console.error('Failed to load item cache for lookup:', err);
    }
  };

  // Open item in external DMarket marketplace
  const handleOpenDmarketMarket = (title: string) => {
    const url = `https://dmarket.com/ingame-items/item-list/csgo-skins?title=${encodeURIComponent(title)}`;
    if (window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  // Single target delete
  const handleDeleteTarget = async (targetId: string, title: string) => {
    setProcessingId(targetId);
    const toastId = toast.loading(`Deleting target for ${title}...`);
    try {
      await window.electronAPI.dmarket.deleteTarget(targetId);
      setTargets(prev => prev.filter(t => t.targetId !== targetId));
      setSelectedTargets(prev => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
      toast.success(`Target deleted for ${title}`, { id: toastId });
      fetchUserData();
    } catch (err: any) {
      toast.error(`Failed to delete target: ${err.message}`, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  // Quick single target update to Oracle Price
  const handleQuickUpdateToOracle = async (target: DmarketTargetItem, acceptedPrice: number) => {
    const targetQty = parseInt(target.amount, 10) || 1;
    setProcessingId(target.targetId);
    const toastId = toast.loading(`Updating ${target.title} to $${acceptedPrice.toFixed(2)}...`);
    try {
      const res = await window.electronAPI.dmarket.updateTarget(
        target.targetId,
        target.title,
        acceptedPrice,
        targetQty,
      );
      const newTargetId = res?.newTargetId || target.targetId;
      const updatedPriceCents = String(Math.round(acceptedPrice * 100));

      setTargets(prev =>
        prev.map(t =>
          t.targetId === target.targetId
            ? {
                ...t,
                targetId: newTargetId,
                priceCents: updatedPriceCents,
              }
            : t,
        ),
      );

      if (targetAnalysis[target.targetId]) {
        setTargetAnalysis(prev => {
          const next = { ...prev };
          const entry = next[target.targetId];
          delete next[target.targetId];
          next[newTargetId] = {
            ...entry,
            currentPrice: acceptedPrice,
          };
          return next;
        });
      }

      toast.success(`Target updated to $${acceptedPrice.toFixed(2)}`, { id: toastId });
      fetchUserData();
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  // Quantity quick adjust on card
  const handleQuantityAdjust = async (target: DmarketTargetItem, delta: number) => {
    const currentQty = parseInt(target.amount, 10) || 1;
    const newQty = Math.max(1, currentQty + delta);
    if (newQty === currentQty) return;

    setTargets(prev => prev.map(t => (t.targetId === target.targetId ? { ...t, amount: String(newQty) } : t)));
    const currentPrice = parseFloat(target.priceCents) / 100;
    try {
      const res = await window.electronAPI.dmarket.updateTarget(target.targetId, target.title, currentPrice, newQty);
      if (res?.newTargetId && res.newTargetId !== target.targetId) {
        setTargets(prev =>
          prev.map(t => (t.targetId === target.targetId ? { ...t, targetId: res.newTargetId } : t)),
        );
      }
    } catch (err: any) {
      toast.error(`Failed to adjust quantity: ${err.message}`);
      setTargets(prev => prev.map(t => (t.targetId === target.targetId ? { ...t, amount: String(currentQty) } : t)));
    }
  };

  // Modal target update submit
  const handleUpdateTargetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTarget) return;

    const numPrice = parseFloat(editTargetPrice);
    const numAmount = parseInt(editTargetAmount, 10);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error('Please enter a valid target price in USD');
      return;
    }

    setUpdatingTarget(true);
    const toastId = toast.loading(`Updating target for ${editingTarget.title} to $${numPrice.toFixed(2)}...`);
    try {
      const res = await window.electronAPI.dmarket.updateTarget(
        editingTarget.targetId,
        editingTarget.title,
        numPrice,
        isNaN(numAmount) || numAmount < 1 ? 1 : numAmount,
      );

      const newTargetId = res?.newTargetId || editingTarget.targetId;
      const updatedPriceCents = String(Math.round(numPrice * 100));

      setTargets(prev =>
        prev.map(t =>
          t.targetId === editingTarget.targetId
            ? {
                ...t,
                targetId: newTargetId,
                amount: String(numAmount || 1),
                priceCents: updatedPriceCents,
              }
            : t,
        ),
      );

      if (targetAnalysis[editingTarget.targetId]) {
        setTargetAnalysis(prev => {
          const next = { ...prev };
          const entry = next[editingTarget.targetId];
          delete next[editingTarget.targetId];
          next[newTargetId] = {
            ...entry,
            currentPrice: numPrice,
          };
          return next;
        });
      }

      toast.success(`Target updated to $${numPrice.toFixed(2)}`, { id: toastId });
      setEditingTarget(null);
      fetchUserData();
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`, { id: toastId });
    } finally {
      setUpdatingTarget(false);
    }
  };

  // Batch update selected targets to Oracle accepted prices
  const handleBatchUpdateToOracle = async () => {
    const selectedIds = Object.keys(selectedTargets).filter(id => selectedTargets[id]);
    if (selectedIds.length === 0) {
      toast.error('No targets selected');
      return;
    }

    const eligibleTargets = targets.filter(t => {
      if (!selectedTargets[t.targetId]) return false;
      const analysis = targetAnalysis[t.targetId];
      return !!analysis?.acceptedPrice;
    });

    if (eligibleTargets.length === 0) {
      toast.error('None of the selected targets have a matching Oracle accepted price');
      return;
    }

    setBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    const processedTitles = new Set<string>();
    const toastId = toast.loading(`Updating 0/${eligibleTargets.length} targets...`);

    for (let i = 0; i < eligibleTargets.length; i++) {
      const target = eligibleTargets[i];
      if (processedTitles.has(target.title)) {
        console.log(`[Batch] Skipping duplicate title in batch: ${target.title}`);
        continue;
      }
      processedTitles.add(target.title);

      const analysis = targetAnalysis[target.targetId];
      const targetPrice = analysis.acceptedPrice;
      const targetQty = parseInt(target.amount, 10) || 1;

      toast.loading(`[${i + 1}/${eligibleTargets.length}] Updating: ${target.title}...`, { id: toastId });
      try {
        const res = await window.electronAPI.dmarket.updateTarget(
          target.targetId,
          target.title,
          targetPrice,
          targetQty,
        );
        const newTargetId = res?.newTargetId || target.targetId;
        const updatedPriceCents = String(Math.round(targetPrice * 100));

        setTargets(prev =>
          prev.map(t =>
            t.targetId === target.targetId
              ? {
                  ...t,
                  targetId: newTargetId,
                  priceCents: updatedPriceCents,
                }
              : t,
          ),
        );
        successCount++;
      } catch (err: any) {
        console.error(`Batch update error for ${target.title}:`, err);
        failCount++;
        const errMsg = err?.message || 'Update failed';
        errors.push(`${target.title}: ${errMsg}`);
      }

      // 1500ms delay between items matching DmarketActiveTargetsManager to guarantee safe rate limits
      if (i < eligibleTargets.length - 1) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    setBatchProcessing(false);
    setSelectedTargets({});
    await fetchUserData();

    if (failCount === 0) {
      toast.success(`Batch complete: all ${successCount} target(s) updated successfully!`, { id: toastId });
    } else if (successCount === 0) {
      const sampleErr = errors[0] || 'DMarket rejected update';
      toast.error(`Batch failed (${failCount} target(s)): ${sampleErr}`, {
        id: toastId,
        duration: 8000,
      });
    } else {
      toast.error(
        `Batch finished: ${successCount} updated, ${failCount} failed. ${errors[0] || ''}`,
        {
          id: toastId,
          duration: 8000,
        },
      );
    }
  };

  // Batch delete selected targets
  const handleBatchDelete = async () => {
    const selectedIds = Object.keys(selectedTargets).filter(id => selectedTargets[id]);
    if (selectedIds.length === 0) {
      toast.error('No targets selected');
      return;
    }

    setBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;
    const deleteErrors: string[] = [];
    const toastId = toast.loading(`Deleting 0/${selectedIds.length} targets...`);

    for (let i = 0; i < selectedIds.length; i++) {
      const targetId = selectedIds[i];
      try {
        await window.electronAPI.dmarket.deleteTarget(targetId);
        setTargets(prev => prev.filter(t => t.targetId !== targetId));
        successCount++;
      } catch (err: any) {
        console.error(`Batch delete error for target ${targetId}:`, err);
        failCount++;
        deleteErrors.push(err?.message || 'Delete failed');
      }
      toast.loading(`Deleted ${i + 1}/${selectedIds.length}...`, { id: toastId });

      // Safe pacing: 600ms between deletes to avoid rate limiting
      if (i < selectedIds.length - 1) {
        await new Promise(r => setTimeout(r, 600));
      }
    }

    setBatchProcessing(false);
    setSelectedTargets({});
    await fetchUserData();

    if (failCount === 0) {
      toast.success(`Successfully deleted ${successCount} target(s)`, { id: toastId });
    } else if (successCount === 0) {
      toast.error(`Failed to delete target(s): ${deleteErrors[0] || 'DMarket error'}`, {
        id: toastId,
        duration: 6000,
      });
    } else {
      toast.error(`Deleted ${successCount} target(s), but ${failCount} failed.`, {
        id: toastId,
        duration: 6000,
      });
    }
  };

  // Selection helpers
  const clearSelection = () => setSelectedTargets({});

  // Filtered targets memo (filtering only by action/drift state)
  const filteredTargets = useMemo(() => {
    return targets.filter(target => {
      if (filterAction !== 'all') {
        const driftDetails = getTargetDriftDetails(target);
        if (filterAction === 'action_required') {
          if (!driftDetails || !driftDetails.isActionRequired) return false;
        } else if (filterAction === 'overbid') {
          if (!driftDetails || !driftDetails.isOverbid) return false;
        } else if (filterAction === 'underbid') {
          if (!driftDetails || !driftDetails.isUnderbid) return false;
        } else if (filterAction === 'safe') {
          if (!driftDetails || driftDetails.isActionRequired) return false;
        }
      }

      return true;
    });
  }, [targets, filterAction, targetAnalysis, driftThresholdPercent]);

  // Key stats
  const matchedCount = useMemo(() => {
    return targets.filter(t => !!targetAnalysis[t.targetId]?.acceptedPrice).length;
  }, [targets, targetAnalysis]);

  const actionRequiredCount = useMemo(() => {
    return targets.filter(t => {
      const d = getTargetDriftDetails(t);
      return d?.isActionRequired;
    }).length;
  }, [targets, targetAnalysis, driftThresholdPercent]);

  const selectedCount = Object.values(selectedTargets).filter(Boolean).length;

  // ── SO CLOSE DERIVED & SCANNER METHODS ────────────────────────────
  const selectedSoCloseCount = useMemo(() => {
    return Object.values(selectedSoCloseItems).filter(Boolean).length;
  }, [selectedSoCloseItems]);

  const filteredSoCloseResults = useMemo(() => {
    if (!soCloseSearchQuery.trim()) return soCloseResults;
    const q = soCloseSearchQuery.toLowerCase().trim();
    return soCloseResults.filter(r => r.name.toLowerCase().includes(q));
  }, [soCloseResults, soCloseSearchQuery]);

  const runSoCloseScan = async () => {
    setIsSoCloseRunning(true);
    setSelectedSoCloseItems({});
    const toastId = toast.loading('Running DMarket So Close market scan...');

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

      const activeTargetTitlesSet = new Set(
        targets
          .map(t => (t.title || (t as any).Title || '').toLowerCase().trim())
          .filter(Boolean),
      );
      const namesToScan = Object.keys(acceptedRes.map);

      for (const name of namesToScan) {
        const acceptedEntry = acceptedRes.map[name];
        if (!acceptedEntry || acceptedEntry.acceptedPrice <= 0) continue;

        const acceptedPrice = parseFloat(acceptedEntry.acceptedPrice.toFixed(2));
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
        let dmarketPrice = 0;
        if (cacheItem?.l && Array.isArray(cacheItem.l)) {
          const dmarketEntry = cacheItem.l.find((m: any) => m.m === 'dmarket');
          if (dmarketEntry && dmarketEntry.p) dmarketPrice = Number(dmarketEntry.p);
        }

        if (dmarketPrice <= 0 && cacheItem?.lowestPrice) {
          dmarketPrice = Number(cacheItem.lowestPrice);
        }

        if (dmarketPrice <= 0) continue;
        if (dmarketPrice < minP || dmarketPrice > maxP) continue;

        const closeness = dmarketPrice / acceptedPrice;
        if (closeness <= soCloseMaxCloseness) {
          const hasExisting = activeTargetTitlesSet.has(name.toLowerCase().trim());
          results.push({
            name,
            acceptedPrice,
            currentMarketPrice: dmarketPrice,
            closeness: parseFloat(closeness.toFixed(4)),
            closenessPercent: parseFloat(((closeness - 1) * 100).toFixed(1)),
            hasExistingTarget: hasExisting,
            iconUrl: cacheItem?.icon_url,
          });
        }
      }

      results.sort((a, b) => a.closeness - b.closeness);

      // Safety limit: Never render more than 200 items
      setSoCloseResults(results.slice(0, 200));
      toast.success(`Found ${Math.min(results.length, 200)} DMarket So Close market opportunities!`, { id: toastId });
    } catch (err: any) {
      toast.error(`So Close scan error: ${err.message}`, { id: toastId });
    } finally {
      setIsSoCloseRunning(false);
    }
  };

  const handleCreateSoCloseTarget = async (item: SoCloseResultItem) => {
    if (!hasKey) {
      toast.error('DMarket API keys are not configured. Please set your keys in Settings first.');
      return;
    }

    setSoCloseProcessingName(item.name);
    const targetPriceDollar = parseFloat(item.acceptedPrice.toFixed(2));
    const toastId = toast.loading(`Creating target for ${item.name} at $${targetPriceDollar.toFixed(2)}...`);

    try {
      await window.electronAPI.dmarket.createTarget(item.name, targetPriceDollar, 1);

      setSoCloseResults(prev => prev.map(r => r.name === item.name ? { ...r, hasExistingTarget: true } : r));
      toast.success(`Target created for ${item.name} at $${targetPriceDollar.toFixed(2)}`, { id: toastId });
      fetchTargets();
    } catch (err: any) {
      toast.error(`Failed to create target: ${err.message}`, { id: toastId });
    } finally {
      setSoCloseProcessingName(null);
    }
  };

  const executeBatchSoCloseCreate = async () => {
    const selectedNames = Object.keys(selectedSoCloseItems).filter(name => selectedSoCloseItems[name]);
    if (!selectedNames.length) return;

    setBatchSoCloseProcessing(true);
    const toastId = toast.loading(`Executing batch target creation for ${selectedNames.length} items...`);
    let createdCount = 0;

    for (const name of selectedNames) {
      const item = soCloseResults.find(r => r.name === name);
      if (!item || item.hasExistingTarget) continue;

      try {
        await handleCreateSoCloseTarget(item);
        setSelectedSoCloseItems(prev => ({ ...prev, [name]: false }));
        createdCount++;
      } catch (err) {
        console.error(`[So Close Batch Error for ${name}]:`, err);
      }
      // Pacing delay to guarantee safe rate limits
      await new Promise(r => setTimeout(r, 600));
    }

    setBatchSoCloseProcessing(false);
    toast.success(`Completed batch target creation for ${createdCount} items`, { id: toastId });
    fetchTargets();
  };

  const selectAllSoCloseAvailable = () => {
    const newSelect: Record<string, boolean> = {};
    filteredSoCloseResults.forEach(r => {
      if (!r.hasExistingTarget) {
        newSelect[r.name] = true;
      }
    });
    setSelectedSoCloseItems(newSelect);
  };

  const selectBestSoClose = () => {
    const newSelect: Record<string, boolean> = {};
    filteredSoCloseResults.forEach(r => {
      if (!r.hasExistingTarget && r.closeness <= 1.05) {
        newSelect[r.name] = true;
      }
    });
    setSelectedSoCloseItems(newSelect);
  };

  const clearSoCloseSelection = () => setSelectedSoCloseItems({});

  const handleSetBalanceAsMax = () => {
    if (balanceData && typeof balanceData.usdCents === 'number' && balanceData.usdCents > 0) {
      const dollarVal = (balanceData.usdCents / 100).toFixed(2);
      setSoCloseMaxPrice(dollarVal);
      toast.success(`Max price set to DMarket balance ($${dollarVal})`);
    } else {
      toast.error('DMarket balance is unavailable or $0.00');
    }
  };

  // ── LISTINGS & INVENTORY LOGIC ────────────────────────────────────
  const listingPricesLoaded = listingPricesMeta !== null && listingPricesMeta.itemCount > 0;

  const selectedOfferCount = useMemo(() => {
    return Object.values(selectedOffers).filter(Boolean).length;
  }, [selectedOffers]);

  const selectedInventoryCount = useMemo(() => {
    return Object.values(selectedInventory).filter(Boolean).length;
  }, [selectedInventory]);

  const recalculateListingAnalysis = (
    currentOffers: DmarketOfferItem[],
    priceMap: Record<string, ListingPriceInfo>,
    threshold: number,
  ) => {
    const newAnalysis: Record<string, ListingAnalysis> = {};
    currentOffers.forEach(offer => {
      const title = offer.title || offer.name;
      if (!title) return;

      const priceEntry = priceMap[title];
      if (!priceEntry) return;

      const targetPrice = Number(priceEntry.listingPrice.toFixed(2));
      const currentPriceDollar = offer.priceCents ? offer.priceCents / 100 : parseFloat(offer.priceUsd) || 0;

      let drift = 0;
      let driftPercent = 0;
      let isOverpriced = false;
      let isUnderpriced = false;

      if (currentPriceDollar > 0 && targetPrice > 0) {
        drift = (currentPriceDollar - targetPrice) / targetPrice;
        driftPercent = drift * 100;
        const thresholdFraction = (threshold || 2) / 100;
        isOverpriced = drift > thresholdFraction;
        isUnderpriced = drift < -thresholdFraction;
      }

      const isActionRequired = isOverpriced || isUnderpriced;

      newAnalysis[offer.id] = {
        targetListingPrice: targetPrice,
        mode: priceEntry.mode,
        offsetPercent: priceEntry.offsetPercent,
        lowestPrice: priceEntry.lowestPrice,
        averagePrice: priceEntry.averagePrice,
        currentPrice: currentPriceDollar,
        isListed: true,
        drift,
        driftPercent,
        isActionRequired,
        isOverpriced,
        isUnderpriced,
      };
    });
    return newAnalysis;
  };

  const fetchOffers = async () => {
    const keyOk = await checkApiKey();
    if (!keyOk) {
      toast.error('DMarket API keys not configured. Please add your keys in Settings.');
      return;
    }
    setOffersLoading(true);
    setSelectedOffers({});
    const toastId = toast.loading('Syncing active sell offers from DMarket...');
    try {
      const res = await window.electronAPI.dmarket.getOffers({ fetchAll: true });
      const items = Array.isArray(res?.items) ? res.items : [];
      setOffers(items);
      toast.success(`Loaded ${items.length} active sell offers`, { id: toastId });

      if (Object.keys(listingPriceMap).length > 0) {
        setListingAnalysis(recalculateListingAnalysis(items, listingPriceMap, driftThresholdPercent));
      }
    } catch (err: any) {
      console.error('[DMarket Workstation] Error fetching offers:', err);
      toast.error(`Error fetching offers: ${err.message}`, { id: toastId });
    } finally {
      setOffersLoading(false);
    }
  };

  const fetchInventory = async () => {
    const keyOk = await checkApiKey();
    if (!keyOk) {
      toast.error('DMarket API keys not configured. Please add your keys in Settings.');
      return;
    }
    setInventoryLoading(true);
    setSelectedInventory({});
    const toastId = toast.loading('Syncing inventory from DMarket...');
    try {
      const res = await window.electronAPI.dmarket.getInventory({ fetchAll: true });
      const items = Array.isArray(res?.items) ? res.items : [];
      const unlisted = items.filter(i => !i.inMarket);
      setInventory(unlisted);
      toast.success(`Loaded ${unlisted.length} unlisted items (${items.length} total)`, { id: toastId });
    } catch (err: any) {
      console.error('[DMarket Workstation] Error fetching inventory:', err);
      toast.error(`Error fetching inventory: ${err.message}`, { id: toastId });
    } finally {
      setInventoryLoading(false);
    }
  };

  const fetchClosedOffers = async () => {
    const keyOk = await checkApiKey();
    if (!keyOk) {
      toast.error('DMarket API keys not configured. Please add your keys in Settings.');
      return;
    }
    setClosedOffersLoading(true);
    const toastId = toast.loading('Syncing sales history from DMarket...');
    try {
      const res = await window.electronAPI.dmarket.getClosedOffers(100);
      const trades = Array.isArray(res?.trades) ? res.trades : [];
      setClosedOffers(trades);
      toast.success(`Loaded ${trades.length} sales history items`, { id: toastId });
    } catch (err: any) {
      console.error('[DMarket Workstation] Error fetching sales history:', err);
      toast.error(`Error fetching sales history: ${err.message}`, { id: toastId });
    } finally {
      setClosedOffersLoading(false);
    }
  };

  const loadListingPrices = async () => {
    setLoadingListingPrices(true);
    const toastId = toast.loading('Connecting to Skin Oracle price brain...');
    try {
      const result = await window.electronAPI.oracle.getListingPrices();
      if (!result || result.itemCount === 0) {
        toast.error('No listing prices found in memory. Please calculate listing prices in Step 3 of Oracle Dashboard first.', { id: toastId });
        setLoadingListingPrices(false);
        return;
      }
      setListingPricesMeta({ itemCount: result.itemCount, storedAt: result.storedAt });
      setListingPriceMap(result.map);

      const newAnalysis = recalculateListingAnalysis(offers, result.map, driftThresholdPercent);
      setListingAnalysis(newAnalysis);
      toast.success(`Matched listing prices for ${Object.keys(newAnalysis).length} active offers`, { id: toastId });
    } catch (err: any) {
      toast.error(`Failed to load listing prices: ${err.message}`, { id: toastId });
    } finally {
      setLoadingListingPrices(false);
    }
  };

  // Quick single update
  const handleQuickUpdateOffer = async (offer: DmarketOfferItem, targetPriceUsd: number) => {
    if (!targetPriceUsd || targetPriceUsd <= 0) return;
    setListingProcessingId(offer.id);
    const toastId = toast.loading(`Updating "${offer.title}" to $${targetPriceUsd.toFixed(2)}...`);
    try {
      const res = await window.electronAPI.dmarket.updateOffers([
        { id: offer.id, priceUsd: targetPriceUsd },
      ]);
      if (res.failed && res.failed.length > 0) {
        const failMsg = res.failed[0]?.message || res.failed[0]?.code || 'Update failed';
        toast.error(`Failed to update offer: ${failMsg}`, { id: toastId });
        return;
      }
      toast.success(`Updated "${offer.title}" to $${targetPriceUsd.toFixed(2)}`, { id: toastId });
      const cents = Math.round(targetPriceUsd * 100);
      setOffers(prev =>
        prev.map(o => (o.id === offer.id ? { ...o, priceCents: cents, priceUsd: targetPriceUsd.toFixed(2) } : o))
      );
      if (Object.keys(listingPriceMap).length > 0) {
        setListingAnalysis(prev => ({
          ...prev,
          [offer.id]: {
            ...prev[offer.id],
            currentPrice: targetPriceUsd,
            drift: 0,
            driftPercent: 0,
            isActionRequired: false,
            isOverpriced: false,
            isUnderpriced: false,
          },
        }));
      }
    } catch (err: any) {
      toast.error(`Error updating offer: ${err.message}`, { id: toastId });
    } finally {
      setListingProcessingId(null);
    }
  };

  // Single delist
  const handleDeleteOffer = async (offer: DmarketOfferItem) => {
    setListingProcessingId(offer.id);
    const toastId = toast.loading(`Delisting "${offer.title}"...`);
    try {
      const res = await window.electronAPI.dmarket.deleteOffers([
        { id: offer.id, assetId: offer.assetId },
      ]);
      if (res.failed && res.failed.length > 0) {
        const failMsg = res.failed[0]?.message || res.failed[0]?.code || 'Delist failed';
        toast.error(`Failed to delist offer: ${failMsg}`, { id: toastId });
        return;
      }
      toast.success(`Delisted "${offer.title}" from sale`, { id: toastId });
      setOffers(prev => prev.filter(o => o.id !== offer.id));
      setSelectedOffers(prev => {
        const next = { ...prev };
        delete next[offer.id];
        return next;
      });
    } catch (err: any) {
      toast.error(`Error delisting offer: ${err.message}`, { id: toastId });
    } finally {
      setListingProcessingId(null);
    }
  };

  // Single create listing
  const handleCreateOffer = async (item: DmarketInventoryItem, priceUsd: number) => {
    if (!priceUsd || priceUsd <= 0) {
      toast.error('Invalid listing price');
      return;
    }
    setListingProcessingId(item.assetId);
    const toastId = toast.loading(`Listing "${item.title}" for $${priceUsd.toFixed(2)}...`);
    try {
      const res = await window.electronAPI.dmarket.createOffers([
        { assetId: item.assetId, priceUsd },
      ]);
      if (res.failed && res.failed.length > 0) {
        const failMsg = res.failed[0]?.message || res.failed[0]?.code || 'Create listing failed';
        toast.error(`Failed to list item: ${failMsg}`, { id: toastId });
        return;
      }
      toast.success(`Listed "${item.title}" for $${priceUsd.toFixed(2)}`, { id: toastId });
      setInventory(prev => prev.filter(i => i.assetId !== item.assetId));
      setSelectedInventory(prev => {
        const next = { ...prev };
        delete next[item.assetId];
        return next;
      });
      fetchOffers();
    } catch (err: any) {
      toast.error(`Error listing item: ${err.message}`, { id: toastId });
    } finally {
      setListingProcessingId(null);
    }
  };

  // Batch update offers
  const handleBatchUpdateOffersToOracle = async () => {
    const toUpdate: Array<{ id: string; priceUsd: number; title: string }> = [];
    offers.forEach(offer => {
      if (selectedOffers[offer.id]) {
        const a = listingAnalysis[offer.id];
        if (a && a.targetListingPrice && a.targetListingPrice > 0) {
          toUpdate.push({ id: offer.id, priceUsd: a.targetListingPrice, title: offer.title });
        }
      }
    });

    if (toUpdate.length === 0) {
      toast.error('None of the selected offers have matching Oracle listing prices');
      return;
    }

    setBatchListingProcessing(true);
    const toastId = toast.loading(`Batch updating ${toUpdate.length} offers to Oracle price...`);
    try {
      const requests = toUpdate.map(u => ({ id: u.id, priceUsd: u.priceUsd }));
      const res = await window.electronAPI.dmarket.updateOffers(requests);
      const successCount = res.offers?.length || (toUpdate.length - (res.failed?.length || 0));
      const failCount = res.failed?.length || 0;

      if (failCount > 0) {
        toast.error(`Updated ${successCount} offers, ${failCount} failed`, { id: toastId });
      } else {
        toast.success(`Successfully updated all ${successCount} offers to Oracle prices!`, { id: toastId });
      }
      setSelectedOffers({});
      fetchOffers();
    } catch (err: any) {
      toast.error(`Batch update failed: ${err.message}`, { id: toastId });
    } finally {
      setBatchListingProcessing(false);
    }
  };

  // Batch delist offers
  const handleBatchDelistOffers = async () => {
    const toDelist = offers.filter(o => selectedOffers[o.id]);
    if (toDelist.length === 0) return;

    setBatchListingProcessing(true);
    const toastId = toast.loading(`Batch delisting ${toDelist.length} offers...`);
    try {
      const requests = toDelist.map(o => ({ id: o.id, assetId: o.assetId }));
      const res = await window.electronAPI.dmarket.deleteOffers(requests);
      const successCount = res.offers?.length || (toDelist.length - (res.failed?.length || 0));
      const failCount = res.failed?.length || 0;

      if (failCount > 0) {
        toast.error(`Delisted ${successCount} offers, ${failCount} failed`, { id: toastId });
      } else {
        toast.success(`Successfully delisted ${successCount} offers from sale!`, { id: toastId });
      }
      setSelectedOffers({});
      fetchOffers();
    } catch (err: any) {
      toast.error(`Batch delist failed: ${err.message}`, { id: toastId });
    } finally {
      setBatchListingProcessing(false);
    }
  };

  // Batch list inventory
  const handleBatchListInventoryAtOracle = async () => {
    const toList: Array<{ assetId: string; priceUsd: number; title: string }> = [];
    inventory.forEach(item => {
      if (selectedInventory[item.assetId]) {
        const priceEntry = listingPriceMap[item.title];
        if (priceEntry && priceEntry.listingPrice > 0) {
          toList.push({ assetId: item.assetId, priceUsd: priceEntry.listingPrice, title: item.title });
        }
      }
    });

    if (toList.length === 0) {
      toast.error('None of the selected inventory items have matching Oracle listing prices. Load Oracle prices first.');
      return;
    }

    setBatchListingProcessing(true);
    const toastId = toast.loading(`Batch listing ${toList.length} inventory items at Oracle price...`);
    try {
      const requests = toList.map(item => ({ assetId: item.assetId, priceUsd: item.priceUsd }));
      const res = await window.electronAPI.dmarket.createOffers(requests);
      const successCount = res.offers?.length || (toList.length - (res.failed?.length || 0));
      const failCount = res.failed?.length || 0;

      if (failCount > 0) {
        toast.error(`Listed ${successCount} items, ${failCount} failed`, { id: toastId });
      } else {
        toast.success(`Successfully created ${successCount} listings on DMarket!`, { id: toastId });
      }
      setSelectedInventory({});
      fetchInventory();
      fetchOffers();
    } catch (err: any) {
      toast.error(`Batch list failed: ${err.message}`, { id: toastId });
    } finally {
      setBatchListingProcessing(false);
    }
  };

  // Submit edit offer modal
  const handleUpdateOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOffer) return;
    const numPrice = parseFloat(editOfferPrice);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    setUpdatingOffer(true);
    try {
      await handleQuickUpdateOffer(editingOffer, numPrice);
      setEditingOffer(null);
    } finally {
      setUpdatingOffer(false);
    }
  };

  // Submit create offer modal
  const handleCreateOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatingOfferItem) return;
    const numPrice = parseFloat(createOfferPrice);
    if (isNaN(numPrice) || numPrice <= 0) {
      toast.error('Please enter a valid listing price');
      return;
    }
    setSubmittingCreateOffer(true);
    try {
      await handleCreateOffer(creatingOfferItem, numPrice);
      setCreatingOfferItem(null);
    } finally {
      setSubmittingCreateOffer(false);
    }
  };

  // Auto-fetch offers & inventory on first tab visit
  useEffect(() => {
    if (mainTab === 'listings' && hasKey && offers.length === 0 && !offersLoading) {
      fetchOffers();
      fetchInventory();
    }
  }, [mainTab, hasKey]);

  // Listings stats
  const {
    matchedListingCount,
    actionReqListingCount,
    overpricedListingCount,
    underpricedListingCount,
    safeListingCount,
  } = useMemo(() => {
    let matched = 0;
    let actionReq = 0;
    let overpriced = 0;
    let underpriced = 0;
    let safe = 0;

    offers.forEach(offer => {
      const a = listingAnalysis[offer.id];
      if (a) {
        matched++;
        if (a.isOverpriced) overpriced++;
        if (a.isUnderpriced) underpriced++;
        if (a.isActionRequired) actionReq++;
        if (!a.isActionRequired) safe++;
      }
    });

    return {
      matchedListingCount: matched,
      actionReqListingCount: actionReq,
      overpricedListingCount: overpriced,
      underpricedListingCount: underpriced,
      safeListingCount: safe,
    };
  }, [offers, listingAnalysis]);

  // Filtered active offers
  const filteredOffers = useMemo(() => {
    return offers.filter(offer => {
      if (listingSearch) {
        const q = listingSearch.toLowerCase().trim();
        if (!offer.title.toLowerCase().includes(q)) return false;
      }
      if (listingFilterAction === 'all') return true;
      const a = listingAnalysis[offer.id];
      if (!a) return listingFilterAction === 'action_required';
      if (listingFilterAction === 'action_required') return a.isActionRequired;
      if (listingFilterAction === 'overpriced') return a.isOverpriced;
      if (listingFilterAction === 'underpriced') return a.isUnderpriced;
      if (listingFilterAction === 'safe') return !a.isActionRequired;
      return true;
    });
  }, [offers, listingSearch, listingFilterAction, listingAnalysis]);

  // Filtered inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      if (listingSearch) {
        const q = listingSearch.toLowerCase().trim();
        if (!item.title.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [inventory, listingSearch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '70px' }}>
      {/* ── WORKSTATION HEADER ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          backgroundColor: 'var(--so-surface-card)',
          border: '1px solid var(--so-border-medium)',
          borderRadius: 'var(--so-radius-md)',
          padding: '14px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src={dmarketLogo}
            alt="DMarket"
            style={{ width: '36px', height: '36px', objectFit: 'contain' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--so-text-primary)', margin: 0 }}>
                DMarket Workstation
              </h1>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  color: 'var(--so-accent-cyan)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                Direct Device IPC
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--so-text-muted)', marginTop: '3px' }}>
              {profileData?.username ? `Logged in as ${profileData.username}` : 'Direct device API connection'}
              {profileData?.targetsLimit ? ` • Quota: ${targets.length}/${profileData.targetsLimit} Targets` : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Balance Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 14px',
              backgroundColor: 'rgba(14, 165, 233, 0.08)',
              border: '1px solid rgba(14, 165, 233, 0.22)',
              borderRadius: 'var(--so-radius-sm)',
            }}
          >
            <Wallet size={15} style={{ color: '#38bdf8' }} />
            <div>
              <div style={{ fontSize: '9.5px', color: 'var(--so-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                DMarket USD Balance
              </div>
              <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 900, color: '#ffffff' }}>
                {balanceLoading ? <Loader2 size={13} className="spin" /> : balanceData?.usdFormatted || '$0.00'}
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
              style={{ padding: '3px 6px', marginLeft: '4px' }}
            >
              {balanceLoading ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
            </button>
          </div>
        </div>
      </div>

      {/* API Key Missing Warning Banner */}
      {hasKey === false && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            backgroundColor: 'var(--so-warning-bg)',
            border: '1px solid var(--so-warning-border)',
            borderRadius: 'var(--so-radius-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <KeyRound size={18} style={{ color: 'var(--so-warning)' }} />
            <span style={{ fontSize: '12.5px', color: 'var(--so-warning-text)', fontWeight: 600 }}>
              DMarket API keys are not configured. You need your Public and Secret keys to manage targets.
            </span>
          </div>
          <Link to="/settings" className="btn btn-primary btn-sm" style={{ textDecoration: 'none', padding: '5px 12px', fontSize: '12px' }}>
            Configure in Settings
          </Link>
        </div>
      )}

      {/* ── MAIN WORKSTATION TABS (Mirroring CSFloat Navigation) ──────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--so-border-medium)', gap: '6px', paddingBottom: '2px' }}>
        <button
          onClick={() => setMainTab('target')}
          className={`btn ${mainTab === 'target' ? 'btn-primary' : 'btn-outline'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 14px' }}
        >
          <Target size={13} /> Targets
        </button>
        <button
          onClick={() => setMainTab('soclose')}
          className={`btn ${mainTab === 'soclose' ? 'btn-primary' : 'btn-outline'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 14px' }}
        >
          <Zap size={13} style={{ color: mainTab === 'soclose' ? '#ffffff' : 'var(--so-accent-cyan)' }} /> So Close Opportunities
          {soCloseResults.length > 0 && (
            <span
              style={{
                marginLeft: '4px',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: 800,
                backgroundColor: mainTab === 'soclose' ? 'rgba(255,255,255,0.25)' : 'rgba(56, 189, 248, 0.2)',
                color: mainTab === 'soclose' ? '#ffffff' : '#38bdf8',
              }}
            >
              {soCloseResults.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setMainTab('listings')}
          className={`btn ${mainTab === 'listings' ? 'btn-primary' : 'btn-outline'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 14px' }}
        >
          <Tag size={13} /> Listings & Inventory
        </button>
      </div>

      {/* ── INSIDE TARGET TAB: CONTROLS & FILTER BAR ──────────────────── */}
      {mainTab === 'target' && (
        <>
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
            {/* Left Controls: Sub-Tabs & Stats Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Sub-view switcher: Active Targets vs Target History */}
              <div style={{ display: 'flex', gap: '3px', backgroundColor: 'var(--so-surface-panel)', padding: '2px', borderRadius: 'var(--so-radius-sm)', border: '1px solid var(--so-border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setTargetSubTab('active')}
                  style={{
                    padding: '3px 10px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: targetSubTab === 'active' ? 'var(--so-primary)' : 'transparent',
                    color: targetSubTab === 'active' ? '#ffffff' : 'var(--so-text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Active ({targets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTargetSubTab('history')}
                  style={{
                    padding: '3px 10px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: targetSubTab === 'history' ? 'var(--so-primary)' : 'transparent',
                    color: targetSubTab === 'history' ? '#ffffff' : 'var(--so-text-secondary)',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <History size={12} /> History
                </button>
              </div>

              {/* Stats Pill */}
              {targetSubTab === 'active' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'var(--so-surface-panel)',
                    border: '1px solid var(--so-border-medium)',
                    padding: '4px 10px',
                    borderRadius: 'var(--so-radius-sm)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: 'var(--so-text-muted)' }}>Targets: <strong style={{ color: 'var(--so-text-primary)' }}>{targets.length}</strong></span>
                  <span style={{ color: 'var(--so-text-muted)' }}>Matched: <strong style={{ color: 'var(--so-accent-cyan)' }}>{matchedCount}</strong></span>
                  {actionRequiredCount > 0 && (
                    <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <AlertTriangle size={12} /> Action Req: <strong>{actionRequiredCount}</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Extra Options Slider (Mirroring CSFloat's collapsible threshold) */}
              {targetSubTab === 'active' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowExtraOptions(prev => !prev)}
                    className="btn btn-sm"
                    style={{
                      backgroundColor: showExtraOptions ? 'var(--so-surface-input)' : 'transparent',
                      color: showExtraOptions ? 'var(--so-primary)' : 'var(--so-text-muted)',
                      border: '1px solid var(--so-border-subtle)',
                      padding: '3px 7px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '4px',
                    }}
                    title="Toggle Threshold & Options"
                  >
                    <Sliders size={12} />
                    <span style={{ fontSize: '10.5px' }}>{showExtraOptions ? 'Hide' : 'Options'}</span>
                    {showExtraOptions ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
                  </button>

                  <div
                    style={{
                      maxWidth: showExtraOptions ? '220px' : '0px',
                      opacity: showExtraOptions ? 1 : 0,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
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
                        min="0.5"
                        max="20"
                        value={driftThresholdPercent}
                        onChange={e => setDriftThresholdPercent(parseFloat(e.target.value) || 2)}
                        style={{
                          width: '42px',
                          padding: '1px 3px',
                          fontSize: '11px',
                          fontWeight: 800,
                          textAlign: 'center',
                          backgroundColor: 'var(--so-surface-card)',
                          color: 'var(--so-text-primary)',
                          border: '1px solid var(--so-border-subtle)',
                          borderRadius: '3px',
                        }}
                      />
                      <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--so-text-muted)' }}>%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Controls: Drift Filter Pills & Oracle Load */}
            {targetSubTab === 'active' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Drift Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'action_required', label: 'Action Req' },
                      { id: 'overbid', label: 'Overbid' },
                      { id: 'underbid', label: 'Underbid' },
                      { id: 'safe', label: 'Safe' },
                    ] as const
                  ).map(pill => (
                    <button
                      key={pill.id}
                      onClick={() => setFilterAction(pill.id)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        borderRadius: '12px',
                        border: '1px solid',
                        cursor: 'pointer',
                        fontWeight: 700,
                        backgroundColor: filterAction === pill.id ? 'var(--so-primary)' : 'transparent',
                        color: filterAction === pill.id ? '#ffffff' : 'var(--so-text-secondary)',
                        borderColor: filterAction === pill.id ? 'var(--so-primary)' : 'var(--so-border-subtle)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                {/* Sync Targets Button (Moved from top to Target Actions area) */}
                <button
                  className="btn btn-primary btn-sm"
                  onClick={fetchTargets}
                  disabled={loading}
                  title="Refresh DMarket active targets"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', padding: '5px 12px' }}
                >
                  {loading ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />}
                  <span>Sync Targets</span>
                </button>

                {/* Load Oracle Prices Button */}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={loadAcceptedPrices}
                  disabled={loadingPrices}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', padding: '5px 12px' }}
                >
                  <RotateCw size={12} className={loadingPrices ? 'spin' : ''} />
                  <span>{acceptedPricesMeta ? 'Re-load Oracle' : 'Load Oracle'}</span>
                </button>
              </div>
            )}
          </div>

          {/* ── SUB-TAB: ACTIVE TARGETS (CARDS GRID) ─────────────────────── */}
          {targetSubTab === 'active' && (
            <>
              {loading ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--so-text-muted)' }}>
                  <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
                  <div>Fetching active targets from DMarket...</div>
                </div>
              ) : filteredTargets.length === 0 ? (
                <div
                  className="card"
                  style={{
                    textAlign: 'center',
                    padding: '50px 20px',
                    color: 'var(--so-text-muted)',
                    backgroundColor: 'var(--so-surface-card)',
                    border: '1px solid var(--so-border-medium)',
                    borderRadius: 'var(--so-radius-md)',
                  }}
                >
                  <Target size={38} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--so-text-primary)' }}>No targets found</div>
                  <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                    {filterAction !== 'all' ? 'Try switching filter back to "All"' : 'No active buy targets found on your DMarket account'}
                  </div>
                </div>
              ) : (
                /* ── CARDS GRID (100% Consistent with CSFloat Workstation!) ── */
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '10px',
                    paddingBottom: '12px',
                  }}
                >
                  {filteredTargets.map(target => {
                    const driftDetails = getTargetDriftDetails(target);
                    const isSelected = !!selectedTargets[target.targetId];
                    const currentPrice = parseFloat(target.priceCents) / 100;
                    const isProcessing = processingId === target.targetId;

                    const cardBorderColor = isSelected
                      ? 'var(--so-primary)'
                      : driftDetails?.isOverbid
                      ? '#ef4444'
                      : driftDetails?.isUnderbid
                      ? '#f59e0b'
                      : 'var(--so-border-medium)';

                    // Parsing title and wear
                    const match = target.title.match(/^(.+?)\s*\(([^)]+)\)$/);
                    const cleanTitle = match ? match[1] : target.title;
                    const wearShortcut = getWearShortcut(target.attributes?.cs2?.exterior || (match ? match[2] : ''));
                    const isStattrak =
                      target.title.includes('StatTrak™') || target.attributes?.cs2?.category === 'CATEGORY_STATTRACK';
                    const phase = target.attributes?.cs2?.phase;

                    // Steam image URL with DMarket fallback
                    const imageUrl =
                      target.attributes?.image ||
                      `https://api.steamapis.com/image/item/730/${encodeURIComponent(target.title)}`;

                    return (
                      <div
                        key={target.targetId}
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
                          transition: 'border-color 0.15s ease',
                        }}
                        onClick={() =>
                          setSelectedTargets(prev => ({ ...prev, [target.targetId]: !prev[target.targetId] }))
                        }
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
                                onClick={e => {
                                  e.stopPropagation();
                                  handleOpenDmarketMarket(target.title);
                                }}
                                className="btn btn-sm"
                                style={{
                                  padding: '3px 6px',
                                  background: 'var(--so-surface-panel)',
                                  border: '1px solid var(--so-border-subtle)',
                                  borderRadius: '4px',
                                  color: 'var(--so-text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="Open on DMarket Market (Browser)"
                              >
                                <ExternalLink size={13} />
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleOpenLookupModal(target.title, driftDetails?.acceptedPrice, currentPrice, target.attributes?.image);
                                }}
                                className="btn btn-sm"
                                style={{
                                  padding: '3px 6px',
                                  background: 'var(--so-surface-panel)',
                                  border: '1px solid var(--so-border-subtle)',
                                  borderRadius: '4px',
                                  color: 'var(--so-accent-cyan)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="Inspect Multi-Market Prices"
                              >
                                <Eye size={13} />
                              </button>
                            </div>
                          )}

                          {/* Drift Status Badge */}
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
                              <span
                                className="badge"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontWeight: 800,
                                  fontSize: '9px',
                                  padding: '1px 5px',
                                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                  color: 'var(--so-accent-cyan)',
                                  border: '1px solid rgba(56, 189, 248, 0.35)',
                                }}
                              >
                                <CheckCircle2 size={10} /> SAFE ({driftDetails.driftPercent >= 0 ? `+${driftDetails.driftPercent.toFixed(0)}%` : `${driftDetails.driftPercent.toFixed(0)}%`})
                              </span>
                            )
                          ) : (
                            <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '1px 5px' }}>
                              ACTIVE
                            </span>
                          )}
                        </div>

                        {/* Weapon Image */}
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
                            onError={e => {
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

                        {/* Title & Wear Tags */}
                        <div style={{ textAlign: 'center', minHeight: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
                            title={target.title}
                          >
                            {cleanTitle}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                            {wearShortcut && (
                              <span
                                style={{
                                  fontSize: '9.5px',
                                  fontWeight: 800,
                                  padding: '0 4px',
                                  borderRadius: '3px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                  color: 'var(--so-text-secondary)',
                                }}
                              >
                                {wearShortcut}
                              </span>
                            )}
                            {isStattrak && (
                              <span
                                style={{
                                  fontSize: '9.5px',
                                  fontWeight: 800,
                                  padding: '0 4px',
                                  borderRadius: '3px',
                                  backgroundColor: 'rgba(249, 115, 22, 0.15)',
                                  color: '#fb923c',
                                }}
                              >
                                ST™
                              </span>
                            )}
                            {phase && phase !== 'PHASE_TITLE_UNSPECIFIED' && (
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  padding: '0 4px',
                                  borderRadius: '3px',
                                  backgroundColor: 'rgba(168, 85, 247, 0.15)',
                                  color: '#c084fc',
                                }}
                              >
                                {phase.replace('PHASE_TITLE_', '')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Pricing Block */}
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
                          {/* Quantity Stepper */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                            <span style={{ color: 'var(--so-text-muted)' }}>Quantity</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleQuantityAdjust(target, -1)}
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
                                {target.amount || 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuantityAdjust(target, 1)}
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

                          {/* My Target Price */}
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
                                  : '#ffffff',
                              }}
                            >
                              ${currentPrice.toFixed(2)}
                            </span>
                          </div>

                          {/* Oracle Accepted Price */}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--so-text-muted)' }}>Accepted</span>
                            <span className="tabular-nums" style={{ fontWeight: 800, color: 'var(--so-accent-cyan)' }}>
                              {driftDetails?.acceptedPrice ? `$${driftDetails.acceptedPrice.toFixed(2)}` : '---'}
                            </span>
                          </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div style={{ display: 'flex', gap: '5px' }} onClick={e => e.stopPropagation()}>
                          {driftDetails?.acceptedPrice && (
                            <button
                              onClick={() => handleQuickUpdateToOracle(target, driftDetails.acceptedPrice)}
                              disabled={isProcessing}
                              className="btn btn-primary btn-sm"
                              style={{ flex: 1, fontWeight: 700, fontSize: '11px', padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                              title="Update Target to Oracle Price"
                            >
                              {isProcessing ? <Loader2 size={11} className="spin" /> : <Zap size={11} />}
                              <span>Update</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingTarget(target);
                              setEditTargetPrice((parseFloat(target.priceCents) / 100).toFixed(2));
                              setEditTargetAmount(target.amount || '1');
                            }}
                            disabled={isProcessing}
                            className="btn btn-secondary btn-sm"
                            title="Edit Target Price / Quantity"
                            style={{ padding: '4px 6px' }}
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteTarget(target.targetId, target.title)}
                            disabled={isProcessing}
                            className="btn btn-danger btn-sm"
                            title="Delete Target"
                            style={{ padding: '4px 6px' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── SUB-TAB: TARGET HISTORY / CLOSED TRADES ─────────────────── */}
          {targetSubTab === 'history' && (
            <div
              style={{
                backgroundColor: 'var(--so-surface-card)',
                border: '1px solid var(--so-border-medium)',
                borderRadius: 'var(--so-radius-md)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--so-border-medium)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <History size={16} style={{ color: 'var(--so-accent-cyan)' }} /> Completed Target Purchases
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={fetchClosedTargets}
                  disabled={closedLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px' }}
                >
                  <RefreshCw size={12} className={closedLoading ? 'spin' : ''} />
                  <span>Refresh History</span>
                </button>
              </div>

              {closedLoading ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--so-text-muted)' }}>
                  <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
                  <div>Loading closed targets history...</div>
                </div>
              ) : closedTrades.length === 0 ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--so-text-muted)' }}>
                  <History size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--so-text-primary)' }}>No completed target trades yet</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>When your buy targets are fulfilled by sellers, they appear here.</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--so-surface-sidebar)', borderBottom: '1px solid var(--so-border-medium)', color: 'var(--so-text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px 14px' }}>Skin Title & Wear</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', width: '70px' }}>Amount</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', width: '130px' }}>Purchased Price</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', width: '110px' }}>Status</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', width: '170px' }}>Completed Date</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', width: '60px' }}>Market</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closedTrades.map((trade, idx) => {
                        const title = getTradeTitle(trade);
                        const price = getTradePrice(trade);
                        const amount = getTradeAmount(trade);
                        const dateStr = getTradeDate(trade);
                        const status = trade.status || trade.Status || 'FULFILLED';
                        const cleanStatus = String(status).replace(/^TargetClosedStatus/, '').toUpperCase();

                        const match = title.match(/^(.+?)\s*\(([^)]+)\)$/);
                        const cleanTitle = match ? match[1] : title;
                        const wearShortcut = getWearShortcut(trade.attributes?.cs2?.exterior || (match ? match[2] : ''));
                        const isStattrak = title.includes('StatTrak™');
                        const imageUrl =
                          trade.attributes?.image ||
                          trade.image ||
                          `https://api.steamapis.com/image/item/730/${encodeURIComponent(title)}`;

                        return (
                          <tr key={trade.tradeId || trade.OfferID || trade.TargetID || idx} style={{ borderBottom: '1px solid var(--so-border-subtle)' }}>
                            {/* Skin Thumbnail, Title & Wear */}
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <img
                                  src={imageUrl}
                                  alt={cleanTitle}
                                  onError={e => {
                                    (e.target as HTMLElement).style.opacity = '0.3';
                                  }}
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    objectFit: 'contain',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                    padding: '2px',
                                    border: '1px solid var(--so-border-subtle)',
                                  }}
                                />
                                <div>
                                  <div style={{ fontWeight: 700, color: 'var(--so-text-primary)', fontSize: '12.5px' }}>
                                    {cleanTitle}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                    {wearShortcut && (
                                      <span
                                        style={{
                                          fontSize: '9.5px',
                                          fontWeight: 800,
                                          padding: '0 4px',
                                          borderRadius: '3px',
                                          backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                          color: 'var(--so-text-secondary)',
                                        }}
                                      >
                                        {wearShortcut}
                                      </span>
                                    )}
                                    {isStattrak && (
                                      <span
                                        style={{
                                          fontSize: '9.5px',
                                          fontWeight: 800,
                                          padding: '0 4px',
                                          borderRadius: '3px',
                                          backgroundColor: 'rgba(249, 115, 22, 0.15)',
                                          color: '#fb923c',
                                        }}
                                      >
                                        ST™
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Quantity */}
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>
                              {amount}
                            </td>

                            {/* Purchased Price */}
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: 'var(--so-accent-cyan)' }}>
                              {price !== '—' ? `$${price}` : '—'}
                            </td>

                            {/* Status */}
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: '10px',
                                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                                  color: 'var(--so-accent-cyan)',
                                  border: '1px solid rgba(56, 189, 248, 0.3)',
                                }}
                              >
                                {cleanStatus}
                              </span>
                            </td>

                            {/* Completed Date */}
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--so-text-muted)', fontSize: '11.5px' }}>
                              {dateStr}
                            </td>

                            {/* Action link */}
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                              <button
                                onClick={() => handleOpenDmarketMarket(title)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 6px', borderRadius: '4px' }}
                                title="Open on DMarket Market"
                              >
                                <ExternalLink size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── INSIDE SO CLOSE TAB: CONTROLS & WORKSTATION ────────────────── */}
      {mainTab === 'soclose' && (
        <>
          {/* CONTROL BAR FOR SO CLOSE OPPORTUNITIES */}
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
                  title={`Set Max Price to Available Balance (${balanceData?.usdFormatted || '$0.00'})`}
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
                    Select Available ({soCloseResults.filter(r => !r.hasExistingTarget).length})
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

            {/* Right Run Scan Button & Search */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {soCloseResults.length > 0 && (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={13} style={{ position: 'absolute', left: '8px', color: 'var(--so-text-muted)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={soCloseSearchQuery}
                    onChange={e => setSoCloseSearchQuery(e.target.value)}
                    placeholder="Search results..."
                    style={{
                      padding: '4px 8px 4px 26px',
                      fontSize: '11px',
                      width: '140px',
                      borderRadius: 'var(--so-radius-sm)',
                      border: '1px solid var(--so-border-subtle)',
                      background: 'var(--so-surface-panel)',
                      color: 'var(--so-text-primary)',
                    }}
                  />
                  {soCloseSearchQuery && (
                    <button
                      onClick={() => setSoCloseSearchQuery('')}
                      style={{ position: 'absolute', right: '6px', background: 'transparent', border: 'none', color: 'var(--so-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}

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

          {/* SO CLOSE OPPORTUNITIES GRID VIEW */}
          {filteredSoCloseResults.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '50px 20px',
                color: 'var(--so-text-muted)',
              }}
            >
              {isSoCloseRunning ? (
                <div>Scanning DMarket market prices against Step 2 Accepted Prices...</div>
              ) : soCloseResults.length > 0 && soCloseSearchQuery ? (
                <div>
                  <Search size={32} style={{ marginBottom: '10px', opacity: 0.5, color: 'var(--so-accent-cyan)' }} />
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--so-text-primary)', marginBottom: '4px' }}>
                    No matching opportunities
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    No results match &quot;{soCloseSearchQuery}&quot;. Clear search filter to view all {soCloseResults.length} scanned items.
                  </div>
                </div>
              ) : (
                <div>
                  <Zap size={32} style={{ marginBottom: '10px', opacity: 0.5, color: 'var(--so-accent-cyan)' }} />
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--so-text-primary)', marginBottom: '4px' }}>
                    No So Close opportunities loaded
                  </div>
                  <div style={{ fontSize: '12px' }}>
                    Click &quot;Run SoClose Scan&quot; above to evaluate DMarket market prices against Oracle Accepted Prices
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
              {filteredSoCloseResults.map(item => {
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
                  : item.hasExistingTarget
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
                      position: 'relative',
                      border: `1.5px solid ${cardBorderColor}`,
                      backgroundColor: isSelected
                        ? 'rgba(37, 99, 235, 0.08)'
                        : 'var(--so-surface-card)',
                      borderRadius: 'var(--so-radius-md)',
                      padding: '8px',
                      boxShadow: isSelected
                        ? '0 0 12px rgba(37, 99, 235, 0.3)'
                        : 'var(--so-shadow-sm)',
                      cursor: item.hasExistingTarget ? 'default' : 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => {
                      if (!item.hasExistingTarget) {
                        setSelectedSoCloseItems(prev => ({
                          ...prev,
                          [item.name]: !prev[item.name],
                        }));
                      }
                    }}
                  >
                    {/* Top Row: Checkbox, Actions, Distance Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {!item.hasExistingTarget && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedSoCloseItems(prev => ({
                                ...prev,
                                [item.name]: !prev[item.name],
                              }));
                            }}
                            onClick={e => e.stopPropagation()}
                            style={{ cursor: 'pointer' }}
                          />
                        )}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenDmarketMarket(item.name);
                          }}
                          className="btn btn-sm"
                          style={{
                            padding: '3px 6px',
                            background: 'var(--so-surface-panel)',
                            border: '1px solid var(--so-border-subtle)',
                            borderRadius: '4px',
                            color: 'var(--so-text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Open on DMarket (Browser)"
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenLookupModal(item.name, item.acceptedPrice, item.currentMarketPrice, item.iconUrl);
                          }}
                          className="btn btn-sm"
                          style={{
                            padding: '3px 6px',
                            background: 'var(--so-surface-panel)',
                            border: '1px solid var(--so-border-subtle)',
                            borderRadius: '4px',
                            color: 'var(--so-accent-cyan)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Inspect Item Details"
                        >
                          <Eye size={14} />
                        </button>
                      </div>

                      {/* Distance / Closeness Badge */}
                      {item.hasExistingTarget ? (
                        <span className="badge badge-cyan" style={{ fontSize: '9px', padding: '1px 5px', fontWeight: 800 }}>
                          TARGET ACTIVE
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
                        <span style={{ color: 'var(--so-text-muted)' }}>DMarket Market</span>
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
                      {item.hasExistingTarget ? (
                        <button
                          disabled
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1, fontWeight: 700, fontSize: '11px', padding: '4px 6px', opacity: 0.6 }}
                        >
                          Target Active
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCreateSoCloseTarget(item)}
                          disabled={isProcessing}
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1, fontWeight: 700, fontSize: '11px', padding: '4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                          {isProcessing ? <Loader2 size={11} className="spin" /> : <PlusCircle size={12} />}
                          <span>Create Target (${item.acceptedPrice.toFixed(2)})</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── INSIDE LISTINGS & INVENTORY TAB: CONTROLS & WORKSTATION ──── */}
      {mainTab === 'listings' && (
        <>
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
            {/* Left Controls: Sub-Tabs, Stats & Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Sub-Tabs */}
              <div
                style={{
                  display: 'flex',
                  gap: '3px',
                  backgroundColor: 'var(--so-surface-panel)',
                  padding: '2px',
                  borderRadius: 'var(--so-radius-sm)',
                  border: '1px solid var(--so-border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setListingSubTab('active')}
                  style={{
                    padding: '3px 10px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: listingSubTab === 'active' ? 'var(--so-primary)' : 'transparent',
                    color: listingSubTab === 'active' ? '#ffffff' : 'var(--so-text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Active Listings ({offers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setListingSubTab('inventory')}
                  style={{
                    padding: '3px 10px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: listingSubTab === 'inventory' ? 'var(--so-primary)' : 'transparent',
                    color: listingSubTab === 'inventory' ? '#ffffff' : 'var(--so-text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Inventory (Unlisted) ({inventory.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setListingSubTab('history');
                    if (closedOffers.length === 0 && !closedOffersLoading) {
                      fetchClosedOffers();
                    }
                  }}
                  style={{
                    padding: '3px 10px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: listingSubTab === 'history' ? 'var(--so-primary)' : 'transparent',
                    color: listingSubTab === 'history' ? '#ffffff' : 'var(--so-text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Sales History ({closedOffers.length})
                </button>
              </div>

              {/* Stats Pill */}
              {listingSubTab === 'active' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    backgroundColor: 'var(--so-surface-panel)',
                    border: '1px solid var(--so-border-medium)',
                    padding: '4px 10px',
                    borderRadius: 'var(--so-radius-sm)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: 'var(--so-text-muted)' }}>
                    Offers: <strong style={{ color: 'var(--so-text-primary)' }}>{offers.length}</strong>
                  </span>
                  <span style={{ color: 'var(--so-text-muted)' }}>
                    Matched: <strong style={{ color: 'var(--so-accent-cyan)' }}>{matchedListingCount}</strong>
                  </span>
                  {actionReqListingCount > 0 && (
                    <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <AlertTriangle size={12} /> Action Req: <strong>{actionReqListingCount}</strong>
                    </span>
                  )}
                  {overpricedListingCount > 0 && (
                    <span style={{ color: '#ef4444' }}>
                      Overpriced: <strong>{overpricedListingCount}</strong>
                    </span>
                  )}
                  {underpricedListingCount > 0 && (
                    <span style={{ color: '#f59e0b' }}>
                      Underpriced: <strong>{underpricedListingCount}</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Active Listings Drift Quick Filters */}
              {listingSubTab === 'active' && offers.length > 0 && (
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setListingFilterAction('all')}
                    className={`btn ${listingFilterAction === 'all' ? 'btn-primary' : 'btn-outline'} btn-sm`}
                    style={{ fontSize: '10.5px', padding: '3px 8px' }}
                  >
                    All ({offers.length})
                  </button>
                  {actionReqListingCount > 0 && (
                    <button
                      onClick={() => setListingFilterAction('action_required')}
                      className={`btn ${listingFilterAction === 'action_required' ? 'btn-danger' : 'btn-outline'} btn-sm`}
                      style={{
                        fontSize: '10.5px',
                        padding: '3px 8px',
                        borderColor: '#ef4444',
                        color: listingFilterAction === 'action_required' ? '#ffffff' : '#ef4444',
                      }}
                    >
                      Action Req ({actionReqListingCount})
                    </button>
                  )}
                  {overpricedListingCount > 0 && (
                    <button
                      onClick={() => setListingFilterAction('overpriced')}
                      className={`btn ${listingFilterAction === 'overpriced' ? 'btn-danger' : 'btn-outline'} btn-sm`}
                      style={{
                        fontSize: '10.5px',
                        padding: '3px 8px',
                        borderColor: '#ef4444',
                        color: listingFilterAction === 'overpriced' ? '#ffffff' : '#ef4444',
                      }}
                    >
                      Overpriced ({overpricedListingCount})
                    </button>
                  )}
                  {underpricedListingCount > 0 && (
                    <button
                      onClick={() => setListingFilterAction('underpriced')}
                      className={`btn ${listingFilterAction === 'underpriced' ? 'btn-warning' : 'btn-outline'} btn-sm`}
                      style={{
                        fontSize: '10.5px',
                        padding: '3px 8px',
                        borderColor: '#f59e0b',
                        color: listingFilterAction === 'underpriced' ? '#ffffff' : '#f59e0b',
                      }}
                    >
                      Underpriced ({underpricedListingCount})
                    </button>
                  )}
                  {safeListingCount > 0 && (
                    <button
                      onClick={() => setListingFilterAction('safe')}
                      className={`btn ${listingFilterAction === 'safe' ? 'btn-success' : 'btn-outline'} btn-sm`}
                      style={{ fontSize: '10.5px', padding: '3px 8px' }}
                    >
                      Safe ({safeListingCount})
                    </button>
                  )}
                  {selectedOfferCount > 0 && (
                    <button
                      onClick={() => setSelectedOffers({})}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '10.5px', padding: '3px 8px' }}
                    >
                      Clear Selection ({selectedOfferCount})
                    </button>
                  )}
                </div>
              )}

              {/* Search input for skin title */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--so-surface-input)',
                  border: '1px solid var(--so-border-subtle)',
                  borderRadius: 'var(--so-radius-sm)',
                  padding: '3px 8px',
                }}
              >
                <Search size={12} style={{ color: 'var(--so-text-muted)' }} />
                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={listingSearch}
                  onChange={e => setListingSearch(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--so-text-primary)',
                    fontSize: '11px',
                    width: '120px',
                  }}
                />
                {listingSearch && (
                  <button
                    onClick={() => setListingSearch('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    <X size={12} style={{ color: 'var(--so-text-muted)' }} />
                  </button>
                )}
              </div>
            </div>

            {/* Right Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {listingSubTab === 'active' && (
                <button
                  onClick={fetchOffers}
                  disabled={offersLoading}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '12px', padding: '5px 12px' }}
                >
                  {offersLoading ? <Loader2 size={13} className="spin" /> : <RotateCw size={13} />} Sync Listings
                </button>
              )}
              {listingSubTab === 'inventory' && (
                <button
                  onClick={fetchInventory}
                  disabled={inventoryLoading}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '12px', padding: '5px 12px' }}
                >
                  {inventoryLoading ? <Loader2 size={13} className="spin" /> : <RotateCw size={13} />} Sync Inventory
                </button>
              )}
              {listingSubTab === 'history' && (
                <button
                  onClick={fetchClosedOffers}
                  disabled={closedOffersLoading}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '12px', padding: '5px 12px' }}
                >
                  {closedOffersLoading ? <Loader2 size={13} className="spin" /> : <RotateCw size={13} />} Sync History
                </button>
              )}

              <button
                onClick={loadListingPrices}
                disabled={loadingListingPrices}
                className={`btn ${listingPricesLoaded ? 'btn-secondary' : 'btn-outline'} btn-sm`}
                style={{ fontSize: '12px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                {loadingListingPrices ? <Loader2 size={13} className="spin" /> : <Zap size={13} style={{ color: 'var(--so-accent-cyan)' }} />}
                {listingPricesLoaded ? 'Reload Oracle Prices' : 'Load Oracle Prices'}
              </button>
            </div>
          </div>

          {/* ── SUB-VIEW: ACTIVE LISTINGS ─────────────────────────────────── */}
          {listingSubTab === 'active' && (
            <div style={{ flex: 1, minHeight: 0 }}>
              {offers.length === 0 ? (
                <div
                  className="card"
                  style={{
                    textAlign: 'center',
                    padding: '50px 20px',
                    color: 'var(--so-text-muted)',
                  }}
                >
                  {offersLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <Loader2 size={32} className="spin" style={{ color: 'var(--so-primary)' }} />
                      <div>Fetching active sell offers from DMarket...</div>
                    </div>
                  ) : (
                    <div>
                      <Tag size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--so-text-primary)', marginBottom: '4px' }}>
                        No active sell offers found
                      </div>
                      <div style={{ fontSize: '12px', marginBottom: '14px' }}>
                        You currently have no items listed for sale on DMarket or they have not been synced yet.
                      </div>
                      <button onClick={fetchOffers} className="btn btn-primary btn-sm" style={{ padding: '6px 16px' }}>
                        <RotateCw size={13} /> Sync Active Listings
                      </button>
                    </div>
                  )}
                </div>
              ) : filteredOffers.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--so-text-muted)' }}>
                  <div>No listings match the current filter.</div>
                  <button onClick={() => { setListingSearch(''); setListingFilterAction('all'); }} className="btn btn-secondary btn-sm" style={{ marginTop: '10px' }}>
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))',
                    gap: '10px',
                    paddingBottom: selectedOfferCount > 0 ? '75px' : '12px',
                  }}
                >
                  {filteredOffers.map(offer => {
                    const analysis = listingAnalysis[offer.id];
                    const isSelected = !!selectedOffers[offer.id];
                    const isProcessing = listingProcessingId === offer.id;

                    const match = offer.title.match(/^(.+?)\s*\(([^)]+)\)$/);
                    const cleanTitle = match ? match[1] : offer.title;
                    const wearText = match ? match[2] : (offer.attributes?.exterior || offer.attributes?.cs2?.exterior || '');
                    const wearShortcut = getWearShortcut(wearText);
                    const floatVal =
                      offer.attributes?.floatPartValue ||
                      offer.attributes?.floatPart ||
                      offer.attributes?.float ||
                      offer.attributes?.cs2?.floatPart ||
                      null;

                    const currentPriceDollar = offer.priceCents ? offer.priceCents / 100 : parseFloat(offer.priceUsd) || 0;

                    const cardBorderColor = isSelected
                      ? 'var(--so-primary)'
                      : analysis?.isOverpriced
                      ? '#ef4444'
                      : analysis?.isUnderpriced
                      ? '#f59e0b'
                      : 'var(--so-border-medium)';

                    return (
                      <div
                        key={offer.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '8px',
                          margin: 0,
                          padding: '10px',
                          minHeight: '265px',
                          boxSizing: 'border-box',
                          borderRadius: 'var(--so-radius-md)',
                          backgroundColor: 'var(--so-surface-card)',
                          border: `1px solid ${isSelected ? 'var(--so-primary)' : cardBorderColor}`,
                          boxShadow: isSelected ? 'inset 0 0 0 1px var(--so-primary)' : 'none',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => setSelectedOffers(prev => ({ ...prev, [offer.id]: !prev[offer.id] }))}
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
                              }}
                            >
                              <Check size={10} /> SELECTED
                            </span>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleOpenDmarketMarket(offer.title);
                                }}
                                className="btn btn-sm"
                                style={{
                                  padding: '3px 6px',
                                  background: 'var(--so-surface-panel)',
                                  border: '1px solid var(--so-border-subtle)',
                                  borderRadius: '4px',
                                  color: 'var(--so-text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="Open on DMarket Market (Browser)"
                              >
                                <ExternalLink size={13} />
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleOpenLookupModal(offer.title, analysis?.targetListingPrice, currentPriceDollar);
                                }}
                                className="btn btn-sm"
                                style={{
                                  padding: '3px 6px',
                                  background: 'var(--so-surface-panel)',
                                  border: '1px solid var(--so-border-subtle)',
                                  borderRadius: '4px',
                                  color: 'var(--so-accent-cyan)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="Inspect Market Price & Details"
                              >
                                <Eye size={13} />
                              </button>
                            </div>
                          )}

                          {/* Analysis Drift Badge */}
                          {analysis ? (
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
                              <span
                                className="badge badge-success"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontWeight: 800,
                                  fontSize: '9px',
                                  padding: '1px 5px',
                                }}
                              >
                                <CheckCircle2 size={10} /> SAFE ({analysis.driftPercent >= 0 ? `+${analysis.driftPercent.toFixed(0)}%` : `${analysis.driftPercent.toFixed(0)}%`})
                              </span>
                            )
                          ) : (
                            <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '1px 5px' }}>
                              LISTED
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
                            src={offer.imageUrl}
                            alt={cleanTitle}
                            onError={e => {
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
                                F: {typeof floatVal === 'number' ? floatVal.toFixed(4) : String(floatVal).slice(0, 6)}
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
                                color: analysis?.isOverpriced ? '#ef4444' : analysis?.isUnderpriced ? '#f59e0b' : 'var(--so-text-primary)',
                              }}
                            >
                              ${currentPriceDollar.toFixed(2)}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ color: 'var(--so-text-muted)' }}>Target List Price</span>
                            <span className="tabular-nums" style={{ fontWeight: 800, color: 'var(--so-success-text)' }}>
                              {analysis?.targetListingPrice ? `$${analysis.targetListingPrice.toFixed(2)}` : '—'}
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

                        {/* Actions Row */}
                        <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                          {analysis?.targetListingPrice && analysis.targetListingPrice > 0 ? (
                            <button
                              onClick={() => handleQuickUpdateOffer(offer, analysis.targetListingPrice)}
                              disabled={isProcessing}
                              className="btn btn-warning btn-sm"
                              style={{
                                flex: 1,
                                fontWeight: 700,
                                fontSize: '10.5px',
                                padding: '4px 6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                              }}
                              title={`Update to Oracle price ($${analysis.targetListingPrice.toFixed(2)})`}
                            >
                              {isProcessing ? <Loader2 size={11} className="spin" /> : <Edit3 size={11} />}
                              <span>Quick Match</span>
                            </button>
                          ) : null}

                          <button
                            onClick={() => {
                              setEditingOffer(offer);
                              setEditOfferPrice(currentPriceDollar.toFixed(2));
                            }}
                            disabled={isProcessing}
                            className="btn btn-secondary btn-sm"
                            style={{
                              flex: analysis?.targetListingPrice ? 0.8 : 1,
                              fontWeight: 700,
                              fontSize: '10.5px',
                              padding: '4px 6px',
                            }}
                            title="Edit Price Manually"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDeleteOffer(offer)}
                            disabled={isProcessing}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '4px 6px' }}
                            title="Delist from sale"
                          >
                            {isProcessing ? <Loader2 size={11} className="spin" /> : <Trash2 size={12} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SUB-VIEW: INVENTORY (UNLISTED) ────────────────────────────── */}
          {listingSubTab === 'inventory' && (
            <div style={{ flex: 1, minHeight: 0 }}>
              {inventory.length === 0 ? (
                <div
                  className="card"
                  style={{
                    textAlign: 'center',
                    padding: '50px 20px',
                    color: 'var(--so-text-muted)',
                  }}
                >
                  {inventoryLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <Loader2 size={32} className="spin" style={{ color: 'var(--so-primary)' }} />
                      <div>Fetching inventory from DMarket...</div>
                    </div>
                  ) : (
                    <div>
                      <Package size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--so-text-primary)', marginBottom: '4px' }}>
                        No unlisted inventory items found
                      </div>
                      <div style={{ fontSize: '12px', marginBottom: '14px' }}>
                        You currently have no unlisted inventory items in your DMarket account.
                      </div>
                      <button onClick={fetchInventory} className="btn btn-primary btn-sm" style={{ padding: '6px 16px' }}>
                        <RotateCw size={13} /> Sync Inventory
                      </button>
                    </div>
                  )}
                </div>
              ) : filteredInventory.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--so-text-muted)' }}>
                  <div>No inventory items match "{listingSearch}".</div>
                  <button onClick={() => setListingSearch('')} className="btn btn-secondary btn-sm" style={{ marginTop: '10px' }}>
                    Clear Search
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))',
                    gap: '10px',
                    paddingBottom: selectedInventoryCount > 0 ? '75px' : '12px',
                  }}
                >
                  {filteredInventory.map(item => {
                    const isSelected = !!selectedInventory[item.assetId];
                    const isProcessing = listingProcessingId === item.assetId;
                    const priceEntry = listingPriceMap[item.title];
                    const targetPrice = priceEntry?.listingPrice ? Number(priceEntry.listingPrice.toFixed(2)) : null;

                    const match = item.title.match(/^(.+?)\s*\(([^)]+)\)$/);
                    const cleanTitle = match ? match[1] : item.title;
                    const wearText = match ? match[2] : (item.attributes?.exterior || item.attributes?.cs2?.exterior || '');
                    const wearShortcut = getWearShortcut(wearText);
                    const floatVal =
                      item.attributes?.floatPartValue ||
                      item.attributes?.floatPart ||
                      item.attributes?.float ||
                      null;

                    return (
                      <div
                        key={item.assetId}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '8px',
                          margin: 0,
                          padding: '10px',
                          minHeight: '265px',
                          boxSizing: 'border-box',
                          borderRadius: 'var(--so-radius-md)',
                          backgroundColor: 'var(--so-surface-card)',
                          border: `1px solid ${isSelected ? 'var(--so-primary)' : 'var(--so-border-medium)'}`,
                          boxShadow: isSelected ? 'inset 0 0 0 1px var(--so-primary)' : 'none',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => setSelectedInventory(prev => ({ ...prev, [item.assetId]: !prev[item.assetId] }))}
                      >
                        {/* Header Row */}
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
                              }}
                            >
                              <Check size={10} /> SELECTED
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '1px 5px',
                                fontSize: '8.5px',
                                color: 'var(--so-text-muted)',
                                backgroundColor: 'var(--so-surface-panel)',
                                borderRadius: '3px',
                                fontWeight: 800,
                              }}
                            >
                              UNLISTED
                            </span>
                          )}

                          {targetPrice ? (
                            <span className="badge badge-success" style={{ fontSize: '9px', padding: '1px 5px' }}>
                              READY TO LIST
                            </span>
                          ) : (
                            <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '1px 5px' }}>
                              NO ORACLE PRICE
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
                            src={item.imageUrl}
                            alt={cleanTitle}
                            onError={e => {
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
                                F: {typeof floatVal === 'number' ? floatVal.toFixed(4) : String(floatVal).slice(0, 6)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Pricing Info Box */}
                        <div
                          style={{
                            backgroundColor: 'var(--so-surface-input)',
                            border: '1px solid var(--so-border-subtle)',
                            padding: '6px 8px',
                            borderRadius: 'var(--so-radius-sm)',
                            fontSize: '11px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ color: 'var(--so-text-muted)' }}>Status</span>
                            <span style={{ fontWeight: 700, color: item.tradable ? 'var(--so-success-text)' : '#f59e0b' }}>
                              {item.tradable ? 'Tradable' : 'Trade Locked'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ color: 'var(--so-text-muted)' }}>Target List Price</span>
                            <span className="tabular-nums" style={{ fontWeight: 800, color: 'var(--so-success-text)' }}>
                              {targetPrice ? `$${targetPrice.toFixed(2)}` : '—'}
                            </span>
                          </div>

                          {priceEntry?.lowestPrice ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px' }}>
                              <span style={{ color: 'var(--so-text-muted)' }}>Lowest / Avg</span>
                              <span className="tabular-nums" style={{ color: 'var(--so-text-secondary)', fontWeight: 600 }}>
                                ${priceEntry.lowestPrice.toFixed(2)} / ${priceEntry.averagePrice.toFixed(2)}
                              </span>
                            </div>
                          ) : null}
                        </div>

                        {/* Action Row */}
                        <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                          {targetPrice ? (
                            <button
                              onClick={() => handleCreateOffer(item, targetPrice)}
                              disabled={isProcessing}
                              className="btn btn-primary btn-sm"
                              style={{
                                flex: 1,
                                fontWeight: 700,
                                fontSize: '11px',
                                padding: '4px 6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                              }}
                            >
                              {isProcessing ? <Loader2 size={11} className="spin" /> : <PlusCircle size={12} />}
                              <span>List for ${targetPrice.toFixed(2)}</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setCreatingOfferItem(item);
                                setCreateOfferPrice('');
                              }}
                              disabled={isProcessing}
                              className="btn btn-secondary btn-sm"
                              style={{
                                flex: 1,
                                fontWeight: 700,
                                fontSize: '11px',
                                padding: '4px 6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                              }}
                            >
                              <Tag size={12} />
                              <span>Set Price & List</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SUB-VIEW: SALES HISTORY (CLOSED OFFERS) ──────────────────── */}
          {listingSubTab === 'history' && (
            <div style={{ flex: 1, minHeight: 0 }}>
              {closedOffers.length === 0 ? (
                <div
                  className="card"
                  style={{
                    textAlign: 'center',
                    padding: '50px 20px',
                    color: 'var(--so-text-muted)',
                  }}
                >
                  {closedOffersLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      <Loader2 size={32} className="spin" style={{ color: 'var(--so-primary)' }} />
                      <div>Fetching sales history from DMarket...</div>
                    </div>
                  ) : (
                    <div>
                      <History size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
                      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--so-text-primary)', marginBottom: '4px' }}>
                        No sales history loaded
                      </div>
                      <div style={{ fontSize: '12px', marginBottom: '14px' }}>
                        Click below to sync your completed sales from DMarket.
                      </div>
                      <button onClick={fetchClosedOffers} className="btn btn-primary btn-sm" style={{ padding: '6px 16px' }}>
                        <RotateCw size={13} /> Sync Sales History
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: 'var(--so-surface-card)',
                    border: '1px solid var(--so-border-medium)',
                    borderRadius: 'var(--so-radius-md)',
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--so-surface-panel)', borderBottom: '1px solid var(--so-border-medium)', color: 'var(--so-text-muted)', fontSize: '11px', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px' }}>Item</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>Sold Price</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>Fee</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closedOffers.map((trade, idx) => {
                        const dateStr = trade.closedAt ? new Date(trade.closedAt * 1000).toLocaleString() : 'Recent';
                        return (
                          <tr
                            key={trade.offerId || idx}
                            style={{
                              borderBottom: '1px solid var(--so-border-subtle)',
                              backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                            }}
                          >
                            <td style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img
                                src={trade.imageUrl}
                                alt={trade.title}
                                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                                onError={e => { (e.target as HTMLElement).style.opacity = '0.3'; }}
                              />
                              <span style={{ fontWeight: 700, color: 'var(--so-text-primary)' }}>{trade.title}</span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: 'var(--so-success-text)' }}>
                              ${trade.priceUSD}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--so-text-muted)' }}>
                              {trade.feeFormatted || '—'}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  padding: '2px 7px',
                                  borderRadius: '10px',
                                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                  color: 'var(--so-success-text)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {trade.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--so-text-muted)' }}>
                              {dateStr}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── FLOATING BATCH ACTIONS PANEL (Mirroring CSFloat Floating Panel) ── */}
      {mainTab === 'soclose' && selectedSoCloseCount > 0 && (
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
            <span>OPPORTUNITIES SELECTED FOR BATCH TARGET CREATION</span>
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
                  <Loader2 size={13} className="spin" /> CREATING TARGETS...
                </>
              ) : (
                <>
                  <PlusCircle size={13} /> CREATE BATCH TARGETS ({selectedSoCloseCount})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {mainTab === 'target' && targetSubTab === 'active' && selectedCount > 0 && (
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
            <span>TARGETS SELECTED FOR BATCH OPERATIONS</span>
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
              onClick={handleBatchDelete}
              disabled={batchProcessing}
              className="btn btn-sm"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.85)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontWeight: 700,
                padding: '6px 14px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Trash2 size={13} />
              <span>Delete Selected</span>
            </button>

            <button
              onClick={handleBatchUpdateToOracle}
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
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {batchProcessing ? (
                <>
                  <Loader2 size={13} className="spin" />
                  <span>UPDATING BATCH...</span>
                </>
              ) : (
                <>
                  <Zap size={13} />
                  <span>MATCH ORACLE PRICES</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── FLOATING BATCH ACTIONS PANEL FOR ACTIVE OFFERS ── */}
      {mainTab === 'listings' && listingSubTab === 'active' && selectedOfferCount > 0 && (
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
              {selectedOfferCount}
            </span>
            <span>OFFERS SELECTED FOR BATCH OPERATIONS</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setSelectedOffers({})}
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
              onClick={handleBatchDelistOffers}
              disabled={batchListingProcessing}
              className="btn btn-sm"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.85)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontWeight: 700,
                padding: '6px 14px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {batchListingProcessing ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
              <span>Delist Selected ({selectedOfferCount})</span>
            </button>

            <button
              onClick={handleBatchUpdateOffersToOracle}
              disabled={batchListingProcessing}
              className="btn btn-secondary btn-sm"
              style={{
                backgroundColor: '#ffffff',
                color: 'var(--so-primary)',
                border: 'none',
                fontWeight: 900,
                padding: '6px 18px',
                fontSize: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {batchListingProcessing ? <Loader2 size={13} className="spin" /> : <Zap size={13} />}
              <span>Update to Oracle Price</span>
            </button>
          </div>
        </div>
      )}

      {/* ── FLOATING BATCH ACTIONS PANEL FOR INVENTORY ── */}
      {mainTab === 'listings' && listingSubTab === 'inventory' && selectedInventoryCount > 0 && (
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
              {selectedInventoryCount}
            </span>
            <span>INVENTORY ITEMS SELECTED FOR BATCH LISTING</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setSelectedInventory({})}
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
              onClick={handleBatchListInventoryAtOracle}
              disabled={batchListingProcessing}
              className="btn btn-secondary btn-sm"
              style={{
                backgroundColor: '#ffffff',
                color: 'var(--so-primary)',
                border: 'none',
                fontWeight: 900,
                padding: '6px 18px',
                fontSize: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {batchListingProcessing ? <Loader2 size={13} className="spin" /> : <PlusCircle size={13} />}
              <span>List Selected at Oracle Price</span>
            </button>
          </div>
        </div>
      )}

      {/* ── SINGLE ITEM LOOKUP MODAL (Mirroring CSFloat Inspection Modal) ── */}
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
                    lookupModalItem.iconUrl ||
                    `https://api.steamapis.com/image/item/730/${encodeURIComponent(lookupModalItem.name)}`
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
              const cacheListings: any[] =
                lookupModalItem.cacheItem?.l && Array.isArray(lookupModalItem.cacheItem.l)
                  ? lookupModalItem.cacheItem.l
                  : [];

              const validPrices = cacheListings
                .map((m: any) => (typeof m.p === 'number' ? m.p : parseFloat(m.p)))
                .filter((p: number) => !isNaN(p) && p > 0);

              const calculatedLowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;
              const dmarketEntry = cacheListings.find((m: any) => m.m === 'dmarket');
              const resolvedDmarketPrice =
                lookupModalItem.marketPrice || (dmarketEntry?.p ? Number(dmarketEntry.p) : null);

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  <div style={{ padding: '10px 12px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--so-text-muted)', fontWeight: 600 }}>Target Buy Ceiling</div>
                    <div className="tabular-nums" style={{ fontSize: '16px', fontWeight: 900, color: 'var(--so-accent-cyan)', marginTop: '2px' }}>
                      {lookupModalItem.acceptedPrice ? `$${lookupModalItem.acceptedPrice.toFixed(2)}` : '—'}
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--so-text-muted)', fontWeight: 600 }}>DMarket Price</div>
                    <div className="tabular-nums" style={{ fontSize: '16px', fontWeight: 900, color: '#f59e0b', marginTop: '2px' }}>
                      {resolvedDmarketPrice ? `$${resolvedDmarketPrice.toFixed(2)}` : '—'}
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--so-text-muted)', fontWeight: 600 }}>Lowest Global Listing</div>
                    <div className="tabular-nums" style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
                      {calculatedLowestPrice !== null ? `$${calculatedLowestPrice.toFixed(2)}` : '—'}
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px', borderRadius: 'var(--so-radius-sm)', backgroundColor: 'var(--so-surface-input)', border: '1px solid var(--so-border-subtle)' }}>
                    <div style={{ fontSize: '10.5px', color: 'var(--so-text-muted)', fontWeight: 600 }}>Total Markets</div>
                    <div className="tabular-nums" style={{ fontSize: '16px', fontWeight: 900, color: 'var(--so-primary)', marginTop: '2px' }}>
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
                          <td className="tabular-nums" style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--so-accent-cyan)' }}>
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
                onClick={() => handleOpenDmarketMarket(lookupModalItem.name)}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px' }}
              >
                <ExternalLink size={13} /> View on DMarket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT TARGET MODAL ──────────────────────────────────────── */}
      {editingTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => !updatingTarget && setEditingTarget(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--so-surface-card)',
              border: '1px solid var(--so-border-medium)',
              borderRadius: 'var(--so-radius-md)',
              width: '460px',
              maxWidth: '90vw',
              padding: '22px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={18} style={{ color: 'var(--so-primary)' }} /> Edit Target Price
              </div>
              <button
                onClick={() => setEditingTarget(null)}
                disabled={updatingTarget}
                style={{ background: 'none', border: 'none', color: 'var(--so-text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--so-text-primary)' }}>
                {editingTarget.title}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--so-text-muted)', marginTop: '2px' }}>
                Current Target Price: ${(parseFloat(editingTarget.priceCents) / 100).toFixed(2)}
              </div>
            </div>

            {targetAnalysis[editingTarget.targetId]?.acceptedPrice && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--so-radius-sm)',
                  backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--so-text-muted)' }}>Oracle Accepted Price: </span>
                  <strong style={{ color: 'var(--so-accent-cyan)', fontSize: '13.5px' }}>
                    ${targetAnalysis[editingTarget.targetId].acceptedPrice.toFixed(2)}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => setEditTargetPrice(targetAnalysis[editingTarget.targetId].acceptedPrice.toFixed(2))}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: '1px solid var(--so-accent-cyan)',
                    backgroundColor: 'transparent',
                    color: 'var(--so-accent-cyan)',
                    cursor: 'pointer',
                  }}
                >
                  Use This Price
                </button>
              </div>
            )}

            <form onSubmit={handleUpdateTargetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--so-text-secondary)', marginBottom: '5px' }}>
                    New Target Price ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editTargetPrice}
                    onChange={e => setEditTargetPrice(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      backgroundColor: 'var(--so-surface-input)',
                      color: 'var(--so-text-primary)',
                      border: '1px solid var(--so-border-medium)',
                      borderRadius: 'var(--so-radius-sm)',
                      padding: '10px 14px',
                      fontSize: '14px',
                      fontWeight: 700,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--so-text-secondary)', marginBottom: '5px' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editTargetAmount}
                    onChange={e => setEditTargetAmount(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      backgroundColor: 'var(--so-surface-input)',
                      color: 'var(--so-text-primary)',
                      border: '1px solid var(--so-border-medium)',
                      borderRadius: 'var(--so-radius-sm)',
                      padding: '10px 14px',
                      fontSize: '14px',
                      fontWeight: 700,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingTarget(null)}
                  disabled={updatingTarget}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={updatingTarget}>
                  {updatingTarget ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                  <span>{updatingTarget ? 'Updating...' : 'Confirm Update'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT OFFER PRICE MODAL ── */}
      {editingOffer && (
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
          onClick={() => setEditingOffer(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--so-surface-card)',
              border: '1px solid var(--so-border-medium)',
              borderRadius: 'var(--so-radius-md)',
              maxWidth: '460px',
              width: '100%',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--so-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={16} style={{ color: 'var(--so-primary)' }} /> Edit Listing Price
              </h2>
              <button
                onClick={() => setEditingOffer(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px', borderRadius: '50%' }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: 'var(--so-surface-panel)', borderRadius: 'var(--so-radius-sm)', border: '1px solid var(--so-border-subtle)' }}>
              <img src={editingOffer.imageUrl} alt={editingOffer.title} style={{ width: '45px', height: '45px', objectFit: 'contain' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--so-text-primary)' }}>{editingOffer.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', marginTop: '2px' }}>
                  Current Listed: <strong style={{ color: 'var(--so-text-primary)' }}>${(editingOffer.priceCents / 100).toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {listingAnalysis[editingOffer.id]?.targetListingPrice && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)', padding: '8px 12px', borderRadius: 'var(--so-radius-sm)' }}>
                <span style={{ fontSize: '12px', color: 'var(--so-text-muted)' }}>
                  Oracle Target Price: <strong style={{ color: 'var(--so-success-text)' }}>${listingAnalysis[editingOffer.id].targetListingPrice.toFixed(2)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setEditOfferPrice(listingAnalysis[editingOffer.id].targetListingPrice.toFixed(2))}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '10.5px', padding: '2px 8px' }}
                >
                  Use Oracle Price
                </button>
              </div>
            )}

            <form onSubmit={handleUpdateOfferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--so-text-secondary)', marginBottom: '5px' }}>
                  New Price ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editOfferPrice}
                  onChange={e => setEditOfferPrice(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: 'var(--so-surface-input)',
                    color: 'var(--so-text-primary)',
                    border: '1px solid var(--so-border-medium)',
                    borderRadius: 'var(--so-radius-sm)',
                    padding: '10px 14px',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingOffer(null)} disabled={updatingOffer}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={updatingOffer}>
                  {updatingOffer ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />}
                  <span>{updatingOffer ? 'Updating...' : 'Confirm Price'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE LISTING MODAL ── */}
      {creatingOfferItem && (
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
          onClick={() => setCreatingOfferItem(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--so-surface-card)',
              border: '1px solid var(--so-border-medium)',
              borderRadius: 'var(--so-radius-md)',
              maxWidth: '460px',
              width: '100%',
              padding: '22px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--so-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={16} style={{ color: 'var(--so-primary)' }} /> List Item on DMarket
              </h2>
              <button
                onClick={() => setCreatingOfferItem(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px', borderRadius: '50%' }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', backgroundColor: 'var(--so-surface-panel)', borderRadius: 'var(--so-radius-sm)', border: '1px solid var(--so-border-subtle)' }}>
              <img src={creatingOfferItem.imageUrl} alt={creatingOfferItem.title} style={{ width: '45px', height: '45px', objectFit: 'contain' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--so-text-primary)' }}>{creatingOfferItem.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--so-text-muted)', marginTop: '2px' }}>
                  Status: <strong style={{ color: creatingOfferItem.tradable ? 'var(--so-success-text)' : '#f59e0b' }}>
                    {creatingOfferItem.tradable ? 'Tradable' : 'Trade Locked'}
                  </strong>
                </div>
              </div>
            </div>

            {listingPriceMap[creatingOfferItem.title]?.listingPrice && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)', padding: '8px 12px', borderRadius: 'var(--so-radius-sm)' }}>
                <span style={{ fontSize: '12px', color: 'var(--so-text-muted)' }}>
                  Oracle Target Price: <strong style={{ color: 'var(--so-success-text)' }}>${listingPriceMap[creatingOfferItem.title].listingPrice.toFixed(2)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setCreateOfferPrice(listingPriceMap[creatingOfferItem.title].listingPrice.toFixed(2))}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '10.5px', padding: '2px 8px' }}
                >
                  Use Oracle Price
                </button>
              </div>
            )}

            <form onSubmit={handleCreateOfferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--so-text-secondary)', marginBottom: '5px' }}>
                  Listing Price ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={createOfferPrice}
                  onChange={e => setCreateOfferPrice(e.target.value)}
                  autoFocus
                  required
                  placeholder="e.g. 15.50"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: 'var(--so-surface-input)',
                    color: 'var(--so-text-primary)',
                    border: '1px solid var(--so-border-medium)',
                    borderRadius: 'var(--so-radius-sm)',
                    padding: '10px 14px',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setCreatingOfferItem(null)} disabled={submittingCreateOffer}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingCreateOffer}>
                  {submittingCreateOffer ? <Loader2 size={14} className="spin" /> : <PlusCircle size={14} />}
                  <span>{submittingCreateOffer ? 'Listing...' : 'Confirm & List'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
