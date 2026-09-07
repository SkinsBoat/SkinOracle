import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Target, Zap, Tag } from 'lucide-react';
import { DmarketTargetItem } from '../../../shared/types';
import { safeGetItem } from '../../utils/storage';
import { useLayoutStore } from '../../store/useLayoutStore';
import { useTrendStore } from '../../store/useTrendStore';
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
} from './dmarket-utils';

import { DmarketHeader } from './components/DmarketHeader';
import { TargetTab } from './tabs/TargetTab/TargetTab';
import { SoCloseTab } from './tabs/SoCloseTab/SoCloseTab';
import { ListingsTab } from './tabs/ListingsTab/ListingsTab';
import { ItemLookupModal } from './modals/ItemLookupModal';
import { EditTargetModal } from './modals/EditTargetModal';

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

  // Main Tab Navigation ('target' | 'soclose' | 'listings')
  const [mainTab, setMainTab] = useState<'target' | 'soclose' | 'listings'>('target');

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
  const [editingTarget, setEditingTarget] = useState<DmarketTargetItem | null>(null);
  const [editingTargetAnalysis, setEditingTargetAnalysis] = useState<TargetAnalysis | undefined>(undefined);

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
    if (targets.length > 0) {
      useTrendStore.getState().fetchHistoryBatch(targets.map(t => t.title));
    }
  }, [targets]);

  // Open item inspection modal with fast single-item lookup
  const handleOpenLookupModal = async (title: string, acceptedPrice?: number, marketPrice?: number, iconUrl?: string) => {
    setLookupModalItem({ name: title, acceptedPrice, marketPrice, iconUrl });
    try {
      const singleItem = await window.electronAPI.skinsnipe.getItem(title);
      if (singleItem) {
        setLookupModalItem(prev => (prev ? { ...prev, cacheItem: singleItem } : null));
      } else {
        const cache = await window.electronAPI.skinsnipe.getCache();
        const cacheItem = cache ? cache[title] : null;
        setLookupModalItem(prev => (prev ? { ...prev, cacheItem } : null));
      }
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

  const handleUpdateTarget = async (target: DmarketTargetItem, newPriceUsd: number, newAmount: number) => {
    const toastId = toast.loading(`Updating target for ${target.title} to $${newPriceUsd.toFixed(2)}...`);
    try {
      const res = await window.electronAPI.dmarket.updateTarget(
        target.targetId,
        target.title,
        newPriceUsd,
        newAmount,
      );
      const newTargetId = res?.newTargetId || target.targetId;
      const updatedPriceCents = String(Math.round(newPriceUsd * 100));

      setTargets(prev =>
        prev.map(t =>
          t.targetId === target.targetId
            ? {
                ...t,
                targetId: newTargetId,
                amount: String(newAmount || 1),
                priceCents: updatedPriceCents,
              }
            : t,
        ),
      );
      toast.success(`Target updated to $${newPriceUsd.toFixed(2)}`, { id: toastId });
      fetchUserData();
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`, { id: toastId });
      throw err;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '70px' }}>
      {/* ── WORKSTATION HEADER ────────────────────────────────────────── */}
      <DmarketHeader
        profileData={profileData}
        balanceData={balanceData}
        balanceLoading={balanceLoading}
        hasKey={hasKey}
        targetCount={targets.length}
        onRefreshBalance={fetchUserData}
      />

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
        </button>
        {/* Commented out for production until testing and development are completed */}
        {/*
        <button
          onClick={() => setMainTab('listings')}
          className={`btn ${mainTab === 'listings' ? 'btn-primary' : 'btn-outline'} btn-sm`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 14px' }}
        >
          <Tag size={13} /> Listings & Inventory
        </button>
        */}
      </div>

      {/* ── TAB VIEWS ─────────────────────────────────────────────────── */}
      {mainTab === 'target' && (
        <TargetTab
          hasKey={hasKey}
          targets={targets}
          setTargets={setTargets}
          loading={loading}
          fetchTargets={fetchTargets}
          isSidebarExpanded={isSidebarExpanded}
          onUserDataUpdated={fetchUserData}
          onOpenLookupModal={handleOpenLookupModal}
          onOpenEditModal={(target, analysis) => {
            setEditingTarget(target);
            setEditingTargetAnalysis(analysis);
          }}
          onOpenMarket={handleOpenDmarketMarket}
        />
      )}

      {mainTab === 'soclose' && (
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

      {/* Commented out for production until testing and development are completed */}
      {/*
      {mainTab === 'listings' && (
        <ListingsTab
          hasKey={!!hasKey}
          isSidebarExpanded={isSidebarExpanded}
          checkApiKey={checkApiKey}
          onOpenLookupModal={handleOpenLookupModal}
          onOpenMarket={handleOpenDmarketMarket}
        />
      )}
      */}

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
