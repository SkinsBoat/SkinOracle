import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Tag,
  Package,
  History,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  Edit3,
  Trash2,
  PlusCircle,
  ArrowUpRight,
  Loader2,
  RotateCw,
  RefreshCw,
  Zap,
  Search,
  X,
  Info,
} from "lucide-react";
import {
  DmarketOfferItem,
  DmarketInventoryItem,
  ListingPriceInfo,
  ListingAnalysis,
} from "../../../../../shared/types";
import {
  getWearShortcut,
  getTradeTitle,
  getItemListingPriceWithMap,
  formatItemFloat,
} from "../../dmarket-utils";
import { EditOfferModal } from "../../modals/EditOfferModal";
import { CreateListingModal } from "../../modals/CreateListingModal";
import { CopyMarketHashButton } from "../../../../components/CopyMarketHashButton";
import TrendSparkline from "../../../../components/TrendSparkline";
import { useTrendStore } from "../../../../store/useTrendStore";

export interface ListingsTabProps {
  hasKey: boolean;
  isSidebarExpanded: boolean;
  checkApiKey: () => Promise<boolean>;
  onOpenLookupModal: (
    name: string,
    targetPrice?: number,
    marketPrice?: number,
    iconUrl?: string,
  ) => void;
  onOpenMarket: (title: string) => void;
  driftThresholdPercent?: number;
}

export const ListingsTab: React.FC<ListingsTabProps> = ({
  hasKey,
  isSidebarExpanded,
  checkApiKey,
  onOpenLookupModal,
  onOpenMarket,
  driftThresholdPercent = 2,
}) => {
  const [listingSubTab, setListingSubTab] = useState<
    "active" | "inventory" | "history"
  >("active");
  const [offers, setOffers] = useState<DmarketOfferItem[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [inventory, setInventory] = useState<DmarketInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [steamSyncing, setSteamSyncing] = useState(false);
  const [closedOffers, setClosedOffers] = useState<any[]>([]);
  const [closedOffersLoading, setClosedOffersLoading] = useState(false);
  const [listingAnalysis, setListingAnalysis] = useState<
    Record<string, ListingAnalysis>
  >({});
  const [listingPriceMap, setListingPriceMap] = useState<
    Record<string, ListingPriceInfo>
  >({});
  const [listingPricesMeta, setListingPricesMeta] = useState<{
    itemCount: number;
    storedAt: string | null;
  } | null>(null);
  const [loadingListingPrices, setLoadingListingPrices] = useState(false);
  const [selectedOffers, setSelectedOffers] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedInventory, setSelectedInventory] = useState<
    Record<string, boolean>
  >({});
  const [listingProcessingId, setListingProcessingId] = useState<string | null>(
    null,
  );
  const [batchListingProcessing, setBatchListingProcessing] = useState(false);
  const [listingSearch, setListingSearch] = useState("");
  const [listingFilterAction, setListingFilterAction] = useState<
    "all" | "action_required" | "overpriced" | "underpriced" | "safe"
  >("all");
  const [inventoryMarketFilter, setInventoryMarketFilter] = useState<
    "all" | "dmarket" | "steam"
  >("all");
  const [depositingAssetId, setDepositingAssetId] = useState<string | null>(
    null,
  );
  const [batchDepositing, setBatchDepositing] = useState(false);

  // Modals state
  const [editingOffer, setEditingOffer] = useState<DmarketOfferItem | null>(
    null,
  );
  const [creatingOfferItem, setCreatingOfferItem] =
    useState<DmarketInventoryItem | null>(null);

  const listingPricesLoaded =
    listingPricesMeta !== null && listingPricesMeta.itemCount > 0;

  const selectedOfferCount = useMemo(() => {
    return Object.values(selectedOffers).filter(Boolean).length;
  }, [selectedOffers]);

  const selectedInventoryCount = useMemo(() => {
    return Object.values(selectedInventory).filter(Boolean).length;
  }, [selectedInventory]);

  const { dmarketInventoryCount, steamInventoryCount } = useMemo(() => {
    let dmarket = 0;
    let steam = 0;
    inventory.forEach((i) => {
      if (i.inMarket) dmarket++;
      else steam++;
    });
    return { dmarketInventoryCount: dmarket, steamInventoryCount: steam };
  }, [inventory]);

  const selectedSteamCount = useMemo(() => {
    return inventory.filter((i) => selectedInventory[i.assetId] && !i.inMarket)
      .length;
  }, [inventory, selectedInventory]);

  const selectedDmarketCount = useMemo(() => {
    return inventory.filter((i) => selectedInventory[i.assetId] && i.inMarket)
      .length;
  }, [inventory, selectedInventory]);

  const recalculateListingAnalysis = (
    currentOffers: DmarketOfferItem[],
    priceMap: Record<string, ListingPriceInfo>,
    threshold: number,
  ) => {
    const newAnalysis: Record<string, ListingAnalysis> = {};
    currentOffers.forEach((offer) => {
      const priceEntry = getItemListingPriceWithMap(offer, priceMap);
      if (!priceEntry) return;

      const targetPrice = Number(priceEntry.listingPrice.toFixed(2));
      const currentPriceDollar = offer.priceCents
        ? offer.priceCents / 100
        : parseFloat(offer.priceUsd) || 0;

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
        trendMomentum14d: priceEntry.trendMomentum14d,
      };
    });
    return newAnalysis;
  };

  const fetchOffers = async () => {
    const keyOk = await checkApiKey();
    if (!keyOk) {
      toast.error(
        "DMarket API keys not configured. Please add your keys in Settings.",
      );
      return;
    }
    setOffersLoading(true);
    setSelectedOffers({});
    const toastId = toast.loading("Syncing active sell offers from DMarket...");
    try {
      const res = await window.electronAPI.dmarket.getOffers({
        fetchAll: true,
      });
      const items = Array.isArray(res?.items) ? res.items : [];
      setOffers(items);
      toast.success(`Loaded ${items.length} active sell offers`, {
        id: toastId,
      });

      if (Object.keys(listingPriceMap).length > 0) {
        setListingAnalysis(
          recalculateListingAnalysis(
            items,
            listingPriceMap,
            driftThresholdPercent,
          ),
        );
      }
    } catch (err: any) {
      console.error("[DMarket Workstation] Error fetching offers:", err);
      toast.error(`Error fetching offers: ${err.message}`, { id: toastId });
    } finally {
      setOffersLoading(false);
    }
  };

  const fetchInventory = async () => {
    const keyOk = await checkApiKey();
    if (!keyOk) {
      toast.error(
        "DMarket API keys not configured. Please add your keys in Settings.",
      );
      return;
    }
    setInventoryLoading(true);
    setSelectedInventory({});
    const toastId = toast.loading("Syncing inventory from DMarket...");
    try {
      const res = await window.electronAPI.dmarket.getInventory({
        fetchAll: true,
      });
      const items: DmarketInventoryItem[] = Array.isArray(res?.items)
        ? res.items
        : [];
      setInventory(items);
      const dmarketCount = items.filter((i) => i.inMarket).length;
      const steamCount = items.filter((i) => !i.inMarket).length;
      toast.success(
        `Loaded ${items.length} inventory items (${dmarketCount} on DMarket, ${steamCount} in Steam)`,
        { id: toastId },
      );
    } catch (err: any) {
      console.error("[DMarket Workstation] Error fetching inventory:", err);
      toast.error(`Error fetching inventory: ${err.message}`, { id: toastId });
    } finally {
      setInventoryLoading(false);
    }
  };

  const handleSteamResync = async () => {
    setSteamSyncing(true);
    const toastId = toast.loading(
      "Requesting DMarket to re-sync Steam inventory...",
    );
    try {
      await window.electronAPI.dmarket.syncUserInventory();
      toast.success(
        "Sync request sent to DMarket! Refreshing inventory in 4s...",
        { id: toastId },
      );
      setTimeout(fetchInventory, 4000);
    } catch (e: any) {
      toast.error(`Steam sync error: ${e.message}`, { id: toastId });
    } finally {
      setSteamSyncing(false);
    }
  };

  const handleDepositItem = async (item: DmarketInventoryItem) => {
    const inGameId =
      item.inGameAssetId || item.attributes?.inGameAssetId || item.assetId;
    if (!inGameId) {
      toast.error("Missing in-game asset coordinates for Steam deposit");
      return;
    }
    setDepositingAssetId(item.assetId);
    const toastId = toast.loading(
      `Initiating DMarket deposit for "${item.title}"...`,
    );
    try {
      const res = await window.electronAPI.dmarket.depositAssets([inGameId]);
      const depositId = res?.DepositID;
      toast.success(
        `Deposit initiated (ID: ${depositId || "OK"})! Please accept the Steam trade offer sent by DMarket bot to complete the transfer.`,
        { id: toastId, duration: 8000 },
      );
      setTimeout(() => {
        fetchInventory();
      }, 4000);
    } catch (err: any) {
      console.error("Deposit error:", err);
      toast.error(`Deposit failed: ${err.message}`, { id: toastId });
    } finally {
      setDepositingAssetId(null);
    }
  };

  const handleBatchDepositSteamItems = async () => {
    const steamItems = inventory.filter(
      (i) => selectedInventory[i.assetId] && !i.inMarket,
    );
    if (steamItems.length === 0) {
      toast.error("No Steam items selected for deposit");
      return;
    }
    const assetIds = steamItems
      .map((i) => i.inGameAssetId || i.attributes?.inGameAssetId || i.assetId)
      .filter(Boolean) as string[];

    setBatchDepositing(true);
    const toastId = toast.loading(
      `Registering deposit for ${assetIds.length} item(s) to DMarket...`,
    );
    try {
      const res = await window.electronAPI.dmarket.depositAssets(assetIds);
      const depositId = res?.DepositID;
      toast.success(
        `Deposit registered for ${assetIds.length} item(s) (ID: ${depositId || "OK"})! Please accept the Steam trade offer(s) sent by DMarket bot.`,
        { id: toastId, duration: 8000 },
      );
      setSelectedInventory({});
      setTimeout(() => {
        fetchInventory();
      }, 4000);
    } catch (err: any) {
      toast.error(`Batch deposit failed: ${err.message}`, { id: toastId });
    } finally {
      setBatchDepositing(false);
    }
  };

  const fetchClosedOffers = async () => {
    const keyOk = await checkApiKey();
    if (!keyOk) {
      toast.error(
        "DMarket API keys not configured. Please add your keys in Settings.",
      );
      return;
    }
    setClosedOffersLoading(true);
    const toastId = toast.loading("Syncing sales history from DMarket...");
    try {
      const res = await window.electronAPI.dmarket.getClosedOffers(100);
      const trades = Array.isArray(res?.trades) ? res.trades : [];
      setClosedOffers(trades);
      toast.success(`Loaded ${trades.length} sales history items`, {
        id: toastId,
      });
    } catch (err: any) {
      console.error("[DMarket Workstation] Error fetching sales history:", err);
      toast.error(`Error fetching sales history: ${err.message}`, {
        id: toastId,
      });
    } finally {
      setClosedOffersLoading(false);
    }
  };

  const loadListingPrices = async () => {
    setLoadingListingPrices(true);
    const toastId = toast.loading("Connecting to Skin Oracle price brain...");
    try {
      const result = await window.electronAPI.oracle.getListingPrices();
      if (!result || result.itemCount === 0) {
        toast.error(
          "No listing prices found in memory. Please calculate listing prices in Step 3 of Oracle Dashboard first.",
          { id: toastId },
        );
        setLoadingListingPrices(false);
        return;
      }
      setListingPricesMeta({
        itemCount: result.itemCount,
        storedAt: result.storedAt,
      });
      setListingPriceMap(result.map);

      const newAnalysis = recalculateListingAnalysis(
        offers,
        result.map,
        driftThresholdPercent,
      );
      setListingAnalysis(newAnalysis);

      const matchedOffers = Object.keys(newAnalysis).length;
      let matchedInventory = 0;
      inventory.forEach((invItem) => {
        const entry = getItemListingPriceWithMap(invItem, result.map);
        if (entry?.listingPrice && entry.listingPrice > 0) {
          matchedInventory++;
        }
      });

      if (listingSubTab === "inventory") {
        toast.success(
          `Matched Oracle listing prices for ${matchedInventory} unlisted inventory item(s) (${result.itemCount} in brain)`,
          { id: toastId },
        );
      } else {
        toast.success(
          `Matched prices: ${matchedOffers} active offer(s), ${matchedInventory} unlisted item(s)`,
          { id: toastId },
        );
      }
    } catch (err: any) {
      toast.error(`Failed to load listing prices: ${err.message}`, {
        id: toastId,
      });
    } finally {
      setLoadingListingPrices(false);
    }
  };

  const handleQuickUpdateOffer = async (
    offer: DmarketOfferItem,
    targetPriceUsd: number,
  ) => {
    if (!targetPriceUsd || targetPriceUsd <= 0) return;
    setListingProcessingId(offer.id);
    const toastId = toast.loading(
      `Updating "${offer.title}" to $${targetPriceUsd.toFixed(2)}...`,
    );
    try {
      const targetOfferId = offer.offerId || offer.id;
      console.log(
        `[ListingsTab] Quick updating offer "${offer.title}" (offerId: ${targetOfferId}) to $${targetPriceUsd}...`,
      );
      const res = await window.electronAPI.dmarket.updateOffers([
        { id: targetOfferId, priceUsd: targetPriceUsd },
      ]);
      console.log("[ListingsTab] Quick update response:", res);
      if (res.failed && res.failed.length > 0) {
        const failItem = res.failed[0];
        const failMsg =
          failItem?.message || failItem?.code || JSON.stringify(failItem) || "Update failed";
        console.error("[ListingsTab] ❌ Quick update failed:", failItem);
        toast.error(`Failed to update offer: ${failMsg}`, { id: toastId });
        return;
      }
      toast.success(
        `Updated "${offer.title}" to $${targetPriceUsd.toFixed(2)}`,
        { id: toastId },
      );
      const cents = Math.round(targetPriceUsd * 100);
      setOffers((prev) =>
        prev.map((o) =>
          o.id === offer.id
            ? { ...o, priceCents: cents, priceUsd: targetPriceUsd.toFixed(2) }
            : o,
        ),
      );
      if (Object.keys(listingPriceMap).length > 0) {
        setListingAnalysis((prev) => ({
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

  const handleDeleteOffer = async (offer: DmarketOfferItem) => {
    setListingProcessingId(offer.id);
    const toastId = toast.loading(`Delisting "${offer.title}"...`);
    try {
      const res = await window.electronAPI.dmarket.deleteOffers([
        { id: offer.id, assetId: offer.assetId },
      ]);
      if (res.failed && res.failed.length > 0) {
        const failMsg =
          res.failed[0]?.message || res.failed[0]?.code || "Delist failed";
        toast.error(`Failed to delist offer: ${failMsg}`, { id: toastId });
        return;
      }
      toast.success(`Delisted "${offer.title}" from sale`, { id: toastId });
      setOffers((prev) => prev.filter((o) => o.id !== offer.id));
      setSelectedOffers((prev) => {
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

  const handleCreateOffer = async (
    item: DmarketInventoryItem,
    priceUsd: number,
  ) => {
    if (!item.inMarket) {
      toast.error(
        `"${item.title}" is in your Steam inventory. Click "Deposit to DMarket" first to transfer it before listing.`,
        { duration: 6000 },
      );
      return;
    }
    if (!priceUsd || priceUsd <= 0) {
      toast.error("Invalid listing price");
      return;
    }
    const targetAssetId =
      item.assetId || (item as any).itemId || (item as any).id;
    setListingProcessingId(targetAssetId);
    const toastId = toast.loading(
      `Listing "${item.title}" for $${priceUsd.toFixed(2)}...`,
    );
    try {
      const res = await window.electronAPI.dmarket.createOffers([
        { assetId: targetAssetId, priceUsd },
      ]);
      if (res.failed && res.failed.length > 0) {
        const failMsg =
          res.failed[0]?.message ||
          res.failed[0]?.code ||
          "Create listing failed";
        toast.error(`Failed to list item: ${failMsg}`, { id: toastId });
        return;
      }
      toast.success(`Listed "${item.title}" for $${priceUsd.toFixed(2)}`, {
        id: toastId,
      });
      setInventory((prev) =>
        prev.filter(
          (i) => i.assetId !== item.assetId && i.assetId !== targetAssetId,
        ),
      );
      setSelectedInventory((prev) => {
        const next = { ...prev };
        delete next[item.assetId];
        delete next[targetAssetId];
        return next;
      });
      fetchOffers();
    } catch (err: any) {
      toast.error(`Error listing item: ${err.message}`, { id: toastId });
    } finally {
      setListingProcessingId(null);
    }
  };

  const handleBatchUpdateOffersToOracle = async () => {
    const toUpdate: Array<{ id: string; priceUsd: number; title: string }> = [];
    offers.forEach((offer) => {
      if (selectedOffers[offer.id]) {
        const a = listingAnalysis[offer.id];
        if (a && a.targetListingPrice && a.targetListingPrice > 0) {
          toUpdate.push({
            id: offer.id,
            priceUsd: a.targetListingPrice,
            title: offer.title,
          });
        }
      }
    });

    if (toUpdate.length === 0) {
      toast.error(
        "None of the selected offers have matching Oracle listing prices",
      );
      return;
    }

    setBatchListingProcessing(true);
    const toastId = toast.loading(
      `Batch updating ${toUpdate.length} offers to Oracle price...`,
    );
    try {
      const requests = toUpdate.map((u) => ({
        id: (u as any).offerId || u.id,
        priceUsd: u.priceUsd,
      }));
      console.log("[ListingsTab] Batch update requests:", requests);
      const res = await window.electronAPI.dmarket.updateOffers(requests);
      console.log("[ListingsTab] Batch update response:", res);
      const successCount = res.offers?.length || 0;
      const failCount = res.failed?.length || 0;

      if (failCount > 0) {
        const firstFail = res.failed[0];
        const failReason = firstFail?.message || firstFail?.code || "";
        console.error("[ListingsTab] ❌ Batch update failures:", res.failed);
        toast.error(
          `Updated ${successCount} offers, ${failCount} failed${failReason ? `: ${failReason}` : ""}`,
          { id: toastId },
        );
      } else {
        toast.success(
          `Successfully updated all ${successCount} offers to Oracle prices!`,
          { id: toastId },
        );
      }
      setSelectedOffers({});
      fetchOffers();
    } catch (err: any) {
      toast.error(`Batch update failed: ${err.message}`, { id: toastId });
    } finally {
      setBatchListingProcessing(false);
    }
  };

  const handleBatchDelistOffers = async () => {
    const toDelist = offers.filter((o) => selectedOffers[o.id]);
    if (toDelist.length === 0) return;

    setBatchListingProcessing(true);
    const toastId = toast.loading(
      `Batch delisting ${toDelist.length} offers...`,
    );
    try {
      const requests = toDelist.map((o) => ({ id: o.id, assetId: o.assetId }));
      const res = await window.electronAPI.dmarket.deleteOffers(requests);
      const successCount =
        res.offers?.length || toDelist.length - (res.failed?.length || 0);
      const failCount = res.failed?.length || 0;

      if (failCount > 0) {
        toast.error(`Delisted ${successCount} offers, ${failCount} failed`, {
          id: toastId,
        });
      } else {
        toast.success(
          `Successfully delisted ${successCount} offers from sale!`,
          { id: toastId },
        );
      }
      setSelectedOffers({});
      fetchOffers();
    } catch (err: any) {
      toast.error(`Batch delist failed: ${err.message}`, { id: toastId });
    } finally {
      setBatchListingProcessing(false);
    }
  };

  const handleBatchListInventoryAtOracle = async () => {
    const selectedItems = inventory.filter((i) => selectedInventory[i.assetId]);
    const steamSelected = selectedItems.filter((i) => !i.inMarket);
    const dmarketSelected = selectedItems.filter((i) => i.inMarket);

    if (dmarketSelected.length === 0) {
      if (steamSelected.length > 0) {
        toast.error(
          `${steamSelected.length} selected item(s) are in Steam inventory. Click "Deposit to DMarket" first.`,
          { duration: 6000 },
        );
      } else {
        toast.error("No DMarket inventory items selected");
      }
      return;
    }

    const toList: Array<{ assetId: string; priceUsd: number; title: string }> =
      [];
    dmarketSelected.forEach((item) => {
      const priceEntry = getItemListingPriceWithMap(item, listingPriceMap);
      if (priceEntry && priceEntry.listingPrice > 0) {
        const targetAssetId =
          item.assetId || (item as any).itemId || (item as any).id;
        toList.push({
          assetId: targetAssetId,
          priceUsd: Number(priceEntry.listingPrice.toFixed(2)),
          title: getTradeTitle(item),
        });
      }
    });

    if (toList.length === 0) {
      toast.error(
        "None of the selected DMarket items have matching Oracle listing prices. Load Oracle prices first.",
      );
      return;
    }

    setBatchListingProcessing(true);
    const toastId = toast.loading(
      `Batch listing ${toList.length} inventory items at Oracle price...`,
    );
    try {
      const requests = toList.map((item) => ({
        assetId: item.assetId,
        priceUsd: item.priceUsd,
      }));
      const res = await window.electronAPI.dmarket.createOffers(requests);
      const successCount =
        res.offers?.length || toList.length - (res.failed?.length || 0);
      const failCount = res.failed?.length || 0;

      if (failCount > 0) {
        toast.error(`Listed ${successCount} items, ${failCount} failed`, {
          id: toastId,
        });
      } else {
        toast.success(
          `Successfully created ${successCount} listings on DMarket!`,
          { id: toastId },
        );
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

  // Auto-fetch offers & inventory on first mount
  useEffect(() => {
    if (hasKey && offers.length === 0 && !offersLoading) {
      fetchOffers();
      fetchInventory();
    }
  }, [hasKey]);

  // Fetch 14-day trend history for active sell offers
  useEffect(() => {
    if (offers.length > 0) {
      const titles = offers.map((o) => getTradeTitle(o)).filter(Boolean);
      useTrendStore.getState().fetchHistoryBatch(titles);
    }
  }, [offers]);

  // Fetch 14-day trend history for inventory items
  useEffect(() => {
    if (inventory.length > 0) {
      const titles = inventory.map((i) => getTradeTitle(i)).filter(Boolean);
      useTrendStore.getState().fetchHistoryBatch(titles);
    }
  }, [inventory]);

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

    offers.forEach((offer) => {
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
    return offers.filter((offer) => {
      if (listingSearch) {
        const q = listingSearch.toLowerCase().trim();
        if (!offer.title.toLowerCase().includes(q)) return false;
      }
      if (listingFilterAction === "all") return true;
      const a = listingAnalysis[offer.id];
      if (!a) return listingFilterAction === "action_required";
      if (listingFilterAction === "action_required") return a.isActionRequired;
      if (listingFilterAction === "overpriced") return a.isOverpriced;
      if (listingFilterAction === "underpriced") return a.isUnderpriced;
      if (listingFilterAction === "safe") return !a.isActionRequired;
      return true;
    });
  }, [offers, listingSearch, listingFilterAction, listingAnalysis]);

  // Filtered inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (inventoryMarketFilter === "dmarket" && !item.inMarket) return false;
      if (inventoryMarketFilter === "steam" && item.inMarket) return false;
      if (listingSearch) {
        const q = listingSearch.toLowerCase().trim();
        if (!item.title.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [inventory, inventoryMarketFilter, listingSearch]);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "var(--so-surface-card)",
          border: "1px solid var(--so-border-medium)",
          borderRadius: "var(--so-radius-md)",
          padding: "8px 14px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {/* Left Controls: Sub-Tabs, Stats & Filters */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {/* Sub-Tabs */}
          <div
            style={{
              display: "flex",
              gap: "3px",
              backgroundColor: "var(--so-surface-panel)",
              padding: "2px",
              borderRadius: "var(--so-radius-sm)",
              border: "1px solid var(--so-border-subtle)",
            }}
          >
            <button
              type="button"
              onClick={() => setListingSubTab("active")}
              style={{
                padding: "3px 10px",
                fontSize: "11.5px",
                fontWeight: 700,
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                backgroundColor:
                  listingSubTab === "active"
                    ? "var(--so-primary)"
                    : "transparent",
                color:
                  listingSubTab === "active"
                    ? "#ffffff"
                    : "var(--so-text-secondary)",
                transition: "all 0.15s ease",
              }}
            >
              Active Listings ({offers.length})
            </button>
            <button
              type="button"
              onClick={() => setListingSubTab("inventory")}
              style={{
                padding: "3px 10px",
                fontSize: "11.5px",
                fontWeight: 700,
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                backgroundColor:
                  listingSubTab === "inventory"
                    ? "var(--so-primary)"
                    : "transparent",
                color:
                  listingSubTab === "inventory"
                    ? "#ffffff"
                    : "var(--so-text-secondary)",
                transition: "all 0.15s ease",
              }}
            >
              Inventory (Unlisted) ({inventory.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setListingSubTab("history");
                if (closedOffers.length === 0 && !closedOffersLoading) {
                  fetchClosedOffers();
                }
              }}
              style={{
                padding: "3px 10px",
                fontSize: "11.5px",
                fontWeight: 700,
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                backgroundColor:
                  listingSubTab === "history"
                    ? "var(--so-primary)"
                    : "transparent",
                color:
                  listingSubTab === "history"
                    ? "#ffffff"
                    : "var(--so-text-secondary)",
                transition: "all 0.15s ease",
              }}
            >
              Sales History ({closedOffers.length})
            </button>
          </div>

          {/* Stats Pill */}
          {listingSubTab === "active" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: "var(--so-surface-panel)",
                border: "1px solid var(--so-border-medium)",
                padding: "4px 10px",
                borderRadius: "var(--so-radius-sm)",
                fontSize: "11.5px",
                fontWeight: 700,
              }}
            >
              <span style={{ color: "var(--so-text-muted)" }}>
                Offers:{" "}
                <strong style={{ color: "var(--so-text-primary)" }}>
                  {offers.length}
                </strong>
              </span>
              <span style={{ color: "var(--so-text-muted)" }}>
                Matched:{" "}
                <strong style={{ color: "var(--so-accent-cyan)" }}>
                  {matchedListingCount}
                </strong>
              </span>
              {actionReqListingCount > 0 && (
                <span
                  style={{
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                >
                  <AlertTriangle size={12} /> Action Req:{" "}
                  <strong>{actionReqListingCount}</strong>
                </span>
              )}
              {overpricedListingCount > 0 && (
                <span style={{ color: "#ef4444" }}>
                  Overpriced: <strong>{overpricedListingCount}</strong>
                </span>
              )}
              {underpricedListingCount > 0 && (
                <span style={{ color: "#f59e0b" }}>
                  Underpriced: <strong>{underpricedListingCount}</strong>
                </span>
              )}
            </div>
          )}

          {/* Active Listings Drift Quick Filters */}
          {listingSubTab === "active" && offers.length > 0 && (
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              <button
                onClick={() => setListingFilterAction("all")}
                className={`btn ${listingFilterAction === "all" ? "btn-primary" : "btn-outline"} btn-sm`}
                style={{ fontSize: "10.5px", padding: "3px 8px" }}
              >
                All ({offers.length})
              </button>
              {actionReqListingCount > 0 && (
                <button
                  onClick={() => setListingFilterAction("action_required")}
                  className={`btn ${listingFilterAction === "action_required" ? "btn-danger" : "btn-outline"} btn-sm`}
                  style={{
                    fontSize: "10.5px",
                    padding: "3px 8px",
                    borderColor: "#ef4444",
                    color:
                      listingFilterAction === "action_required"
                        ? "#ffffff"
                        : "#ef4444",
                  }}
                >
                  Action Req ({actionReqListingCount})
                </button>
              )}
              {overpricedListingCount > 0 && (
                <button
                  onClick={() => setListingFilterAction("overpriced")}
                  className={`btn ${listingFilterAction === "overpriced" ? "btn-danger" : "btn-outline"} btn-sm`}
                  style={{
                    fontSize: "10.5px",
                    padding: "3px 8px",
                    borderColor: "#ef4444",
                    color:
                      listingFilterAction === "overpriced"
                        ? "#ffffff"
                        : "#ef4444",
                  }}
                >
                  Overpriced ({overpricedListingCount})
                </button>
              )}
              {underpricedListingCount > 0 && (
                <button
                  onClick={() => setListingFilterAction("underpriced")}
                  className={`btn ${listingFilterAction === "underpriced" ? "btn-warning" : "btn-outline"} btn-sm`}
                  style={{
                    fontSize: "10.5px",
                    padding: "3px 8px",
                    borderColor: "#f59e0b",
                    color:
                      listingFilterAction === "underpriced"
                        ? "#ffffff"
                        : "#f59e0b",
                  }}
                >
                  Underpriced ({underpricedListingCount})
                </button>
              )}
              {safeListingCount > 0 && (
                <button
                  onClick={() => setListingFilterAction("safe")}
                  className={`btn ${listingFilterAction === "safe" ? "btn-success" : "btn-outline"} btn-sm`}
                  style={{ fontSize: "10.5px", padding: "3px 8px" }}
                >
                  Safe ({safeListingCount})
                </button>
              )}
              {selectedOfferCount > 0 && (
                <button
                  onClick={() => setSelectedOffers({})}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: "10.5px", padding: "3px 8px" }}
                >
                  Clear Selection ({selectedOfferCount})
                </button>
              )}
            </div>
          )}

          {/* Inventory Location Quick Filters */}
          {listingSubTab === "inventory" && inventory.length > 0 && (
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              <button
                onClick={() => setInventoryMarketFilter("all")}
                className={`btn ${inventoryMarketFilter === "all" ? "btn-primary" : "btn-outline"} btn-sm`}
                style={{ fontSize: "10.5px", padding: "3px 8px" }}
              >
                All ({inventory.length})
              </button>
              <button
                onClick={() => setInventoryMarketFilter("dmarket")}
                className={`btn ${inventoryMarketFilter === "dmarket" ? "btn-success" : "btn-outline"} btn-sm`}
                style={{ fontSize: "10.5px", padding: "3px 8px" }}
              >
                On DMarket ({dmarketInventoryCount})
              </button>
              <button
                onClick={() => setInventoryMarketFilter("steam")}
                className={`btn ${inventoryMarketFilter === "steam" ? "btn-primary" : "btn-outline"} btn-sm`}
                style={{
                  fontSize: "10.5px",
                  padding: "3px 8px",
                  borderColor: "#3b82f6",
                  color:
                    inventoryMarketFilter === "steam" ? "#ffffff" : "#60a5fa",
                }}
              >
                In Steam ({steamInventoryCount})
              </button>
              {selectedInventoryCount > 0 && (
                <button
                  onClick={() => setSelectedInventory({})}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: "10.5px", padding: "3px 8px" }}
                >
                  Clear Selection ({selectedInventoryCount})
                </button>
              )}
            </div>
          )}

          {/* Search input for skin title */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "var(--so-surface-input)",
              border: "1px solid var(--so-border-subtle)",
              borderRadius: "var(--so-radius-sm)",
              padding: "3px 8px",
            }}
          >
            <Search size={12} style={{ color: "var(--so-text-muted)" }} />
            <input
              type="text"
              placeholder="Filter by name..."
              value={listingSearch}
              onChange={(e) => setListingSearch(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--so-text-primary)",
                fontSize: "11px",
                width: "120px",
              }}
            />
            {listingSearch && (
              <button
                onClick={() => setListingSearch("")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                }}
              >
                <X size={12} style={{ color: "var(--so-text-muted)" }} />
              </button>
            )}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {listingSubTab === "active" && (
            <button
              onClick={fetchOffers}
              disabled={offersLoading}
              className="btn btn-primary btn-sm"
              style={{ fontSize: "12px", padding: "5px 12px" }}
            >
              {offersLoading ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <RotateCw size={13} />
              )}{" "}
              Sync Listings
            </button>
          )}
          {listingSubTab === "inventory" && (
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={fetchInventory}
                disabled={inventoryLoading}
                className="btn btn-primary btn-sm"
                style={{ fontSize: "12px", padding: "5px 12px" }}
                title="Fetch currently cached inventory from DMarket"
              >
                {inventoryLoading ? (
                  <Loader2 size={13} className="spin" />
                ) : (
                  <RotateCw size={13} />
                )}{" "}
                Sync Inventory
              </button>
              <button
                onClick={handleSteamResync}
                disabled={steamSyncing}
                className="btn btn-outline btn-sm"
                style={{ fontSize: "12px", padding: "5px 10px" }}
                title="Tell DMarket to re-crawl your Steam inventory for newly received items"
              >
                {steamSyncing ? (
                  <Loader2 size={13} className="spin" />
                ) : (
                  <RefreshCw size={13} />
                )}{" "}
                Steam Re-sync
              </button>
            </div>
          )}
          {listingSubTab === "history" && (
            <button
              onClick={fetchClosedOffers}
              disabled={closedOffersLoading}
              className="btn btn-primary btn-sm"
              style={{ fontSize: "12px", padding: "5px 12px" }}
            >
              {closedOffersLoading ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <RotateCw size={13} />
              )}{" "}
              Sync History
            </button>
          )}

          <button
            onClick={loadListingPrices}
            disabled={loadingListingPrices}
            className={`btn ${listingPricesLoaded ? "btn-secondary" : "btn-outline"} btn-sm`}
            style={{
              fontSize: "12px",
              padding: "5px 12px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            {loadingListingPrices ? (
              <Loader2 size={13} className="spin" />
            ) : (
              <Zap size={13} style={{ color: "var(--so-accent-cyan)" }} />
            )}
            {listingPricesLoaded
              ? "Reload Oracle Prices"
              : "Load Oracle Prices"}
          </button>
        </div>
      </div>

      {/* ── SUB-VIEW: ACTIVE LISTINGS ─────────────────────────────────── */}
      {listingSubTab === "active" && (
        <div style={{ flex: 1, minHeight: 0 }}>
          {offers.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "50px 20px",
                color: "var(--so-text-muted)",
              }}
            >
              {offersLoading ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <Loader2
                    size={32}
                    className="spin"
                    style={{ color: "var(--so-primary)" }}
                  />
                  <div>Fetching active sell offers from DMarket...</div>
                </div>
              ) : (
                <div>
                  <Tag
                    size={32}
                    style={{ marginBottom: "10px", opacity: 0.5 }}
                  />
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "15px",
                      color: "var(--so-text-primary)",
                      marginBottom: "4px",
                    }}
                  >
                    No active sell offers found
                  </div>
                  <div style={{ fontSize: "12px", marginBottom: "14px" }}>
                    You currently have no items listed for sale on DMarket or
                    they have not been synced yet.
                  </div>
                  <button
                    onClick={fetchOffers}
                    className="btn btn-primary btn-sm"
                    style={{ padding: "6px 16px" }}
                  >
                    <RotateCw size={13} /> Sync Active Listings
                  </button>
                </div>
              )}
            </div>
          ) : filteredOffers.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--so-text-muted)",
              }}
            >
              <div>No listings match the current filter.</div>
              <button
                onClick={() => {
                  setListingSearch("");
                  setListingFilterAction("all");
                }}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: "10px" }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))",
                gap: "10px",
                paddingBottom: selectedOfferCount > 0 ? "75px" : "12px",
              }}
            >
              {filteredOffers.map((offer) => {
                const analysis = listingAnalysis[offer.id];
                const isSelected = !!selectedOffers[offer.id];
                const isProcessing = listingProcessingId === offer.id;

                const fullTitle = getTradeTitle(offer);
                const match = fullTitle.match(/^(.+?)\s*\(([^)]+)\)$/);
                const cleanTitle = match ? match[1] : fullTitle;
                const wearText = match
                  ? match[2]
                  : offer.attributes?.exterior ||
                    offer.attributes?.cs2?.exterior ||
                    "";
                const wearShortcut = getWearShortcut(wearText);
                const floatVal = formatItemFloat(offer);

                const currentPriceDollar = offer.priceCents
                  ? offer.priceCents / 100
                  : parseFloat(offer.priceUsd) || 0;

                const cardBorderColor = isSelected
                  ? "var(--so-primary)"
                  : analysis?.isOverpriced
                    ? "#ef4444"
                    : analysis?.isUnderpriced
                      ? "#f59e0b"
                      : "var(--so-border-medium)";

                return (
                  <div
                    key={offer.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "8px",
                      margin: 0,
                      padding: "10px",
                      minHeight: "265px",
                      boxSizing: "border-box",
                      borderRadius: "var(--so-radius-md)",
                      backgroundColor: "var(--so-surface-card)",
                      border: `1px solid ${isSelected ? "var(--so-primary)" : cardBorderColor}`,
                      boxShadow: isSelected
                        ? "inset 0 0 0 1px var(--so-primary)"
                        : "none",
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "all 0.15s ease",
                      overflow: "hidden",
                    }}
                    onClick={() =>
                      setSelectedOffers((prev) => ({
                        ...prev,
                        [offer.id]: !prev[offer.id],
                      }))
                    }
                  >
                    {/* Top Header Row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        height: "20px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          flexShrink: 0,
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenMarket(offer.title);
                          }}
                          className="btn btn-sm"
                          style={{
                            padding: "3px 6px",
                            background: "var(--so-surface-panel)",
                            border: "1px solid var(--so-border-subtle)",
                            borderRadius: "4px",
                            color: "var(--so-text-secondary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Open on DMarket Market (Browser)"
                        >
                          <ExternalLink size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenLookupModal(
                              offer.title,
                              analysis?.targetListingPrice,
                              currentPriceDollar,
                            );
                          }}
                          className="btn btn-sm"
                          style={{
                            padding: "3px 6px",
                            background: "var(--so-surface-panel)",
                            border: "1px solid var(--so-border-subtle)",
                            borderRadius: "4px",
                            color: "var(--so-accent-cyan)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Inspect Market Price & Details"
                        >
                          <Eye size={13} />
                        </button>
                        <CopyMarketHashButton name={offer.title} />
                      </div>

                      {/* Analysis Drift Badge */}
                      {analysis ? (
                        analysis.isOverpriced ? (
                          <span
                            className="badge"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                              backgroundColor: "rgba(239, 68, 68, 0.18)",
                              color: "#ef4444",
                              border: "1px solid rgba(239, 68, 68, 0.4)",
                              fontWeight: 800,
                              fontSize: "9px",
                              padding: "1px 5px",
                            }}
                          >
                            <AlertTriangle size={10} /> OVERPRICED (
                            {analysis.driftPercent > 0
                              ? `+${analysis.driftPercent.toFixed(0)}%`
                              : `${analysis.driftPercent.toFixed(0)}%`}
                            )
                          </span>
                        ) : analysis.isUnderpriced ? (
                          <span
                            className="badge"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                              backgroundColor: "rgba(245, 158, 11, 0.18)",
                              color: "#f59e0b",
                              border: "1px solid rgba(245, 158, 11, 0.4)",
                              fontWeight: 800,
                              fontSize: "9px",
                              padding: "1px 5px",
                            }}
                          >
                            <AlertTriangle size={10} /> UNDERPRICED (
                            {analysis.driftPercent.toFixed(0)}%)
                          </span>
                        ) : (
                          <span
                            className="badge badge-success"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                              fontWeight: 800,
                              fontSize: "9px",
                              padding: "1px 5px",
                            }}
                          >
                            <CheckCircle2 size={10} /> SAFE (
                            {analysis.driftPercent >= 0
                              ? `+${analysis.driftPercent.toFixed(0)}%`
                              : `${analysis.driftPercent.toFixed(0)}%`}
                            )
                          </span>
                        )
                      ) : (
                        <span
                          className="badge badge-secondary"
                          style={{ fontSize: "9px", padding: "1px 5px" }}
                        >
                          LISTED
                        </span>
                      )}
                    </div>

                    {/* Image Showcase */}
                    <div
                      style={{
                        height: "65px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(0, 0, 0, 0.25)",
                        borderRadius: "var(--so-radius-sm)",
                        border: "1px solid var(--so-border-subtle)",
                        padding: "4px",
                        backgroundImage:
                          "radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 70%)",
                      }}
                    >
                      <img
                        src={offer.imageUrl}
                        alt={cleanTitle}
                        onError={(e) => {
                          (e.target as HTMLElement).style.opacity = "0.3";
                        }}
                        style={{
                          maxHeight: "55px",
                          maxWidth: "100%",
                          objectFit: "contain",
                          filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5))",
                        }}
                      />
                    </div>

                    {/* Title & Wear & Float */}
                    <div
                      style={{
                        textAlign: "center",
                        minHeight: "34px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "11.5px",
                          color: "var(--so-text-primary)",
                          lineHeight: "1.2",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cleanTitle}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "2px",
                          fontSize: "10px",
                        }}
                      >
                        {wearShortcut && (
                          <span
                            style={{
                              color: "var(--so-primary)",
                              fontWeight: 800,
                            }}
                          >
                            {wearShortcut}
                          </span>
                        )}
                        {floatVal && (
                          <span
                            style={{
                              color: "var(--so-text-muted)",
                              fontWeight: 700,
                            }}
                          >
                            F: {floatVal}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 14-Day Trend Sparkline */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <TrendSparkline
                        name={fullTitle}
                        momentum={analysis?.trendMomentum14d}
                        height={30}
                        onClick={() =>
                          onOpenLookupModal(
                            fullTitle,
                            analysis?.targetListingPrice,
                            currentPriceDollar,
                            offer.imageUrl,
                          )
                        }
                      />
                    </div>

                    {/* Pricing Info Box */}
                    <div
                      style={{
                        backgroundColor: analysis?.isOverpriced
                          ? "rgba(239, 68, 68, 0.12)"
                          : analysis?.isUnderpriced
                            ? "rgba(245, 158, 11, 0.12)"
                            : "var(--so-surface-input)",
                        border: `1px solid ${
                          analysis?.isOverpriced
                            ? "rgba(239, 68, 68, 0.3)"
                            : analysis?.isUnderpriced
                              ? "rgba(245, 158, 11, 0.3)"
                              : "var(--so-border-subtle)"
                        }`,
                        padding: "6px 8px",
                        borderRadius: "var(--so-radius-sm)",
                        fontSize: "11px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "3px",
                        }}
                      >
                        <span style={{ color: "var(--so-text-muted)" }}>
                          My Listed
                        </span>
                        <span
                          className="tabular-nums"
                          style={{
                            fontWeight: 800,
                            color: analysis?.isOverpriced
                              ? "#ef4444"
                              : analysis?.isUnderpriced
                                ? "#f59e0b"
                                : "var(--so-text-primary)",
                          }}
                        >
                          ${currentPriceDollar.toFixed(2)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "3px",
                        }}
                      >
                        <span style={{ color: "var(--so-text-muted)" }}>
                          Target List Price
                        </span>
                        <span
                          className="tabular-nums"
                          style={{
                            fontWeight: 800,
                            color: "var(--so-success-text)",
                          }}
                        >
                          {analysis?.targetListingPrice
                            ? `$${analysis.targetListingPrice.toFixed(2)}`
                            : "—"}
                        </span>
                      </div>

                      {analysis?.lowestPrice ? (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "9.5px",
                          }}
                        >
                          <span style={{ color: "var(--so-text-muted)" }}>
                            Lowest / Avg
                          </span>
                          <span
                            className="tabular-nums"
                            style={{
                              color: "var(--so-text-secondary)",
                              fontWeight: 600,
                            }}
                          >
                            ${analysis.lowestPrice.toFixed(2)} / $
                            {analysis.averagePrice.toFixed(2)}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Actions Row */}
                    <div
                      style={{ display: "flex", gap: "6px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {analysis?.targetListingPrice &&
                      analysis.targetListingPrice > 0 ? (
                        <button
                          onClick={() =>
                            handleQuickUpdateOffer(
                              offer,
                              analysis.targetListingPrice,
                            )
                          }
                          disabled={isProcessing}
                          className="btn btn-warning btn-sm"
                          style={{
                            flex: 1,
                            fontWeight: 700,
                            fontSize: "10.5px",
                            padding: "4px 6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "3px",
                          }}
                          title={`Update to Oracle price ($${analysis.targetListingPrice.toFixed(2)})`}
                        >
                          {isProcessing ? (
                            <Loader2 size={11} className="spin" />
                          ) : (
                            <Edit3 size={11} />
                          )}
                          <span>Quick Match</span>
                        </button>
                      ) : null}

                      <button
                        onClick={() => setEditingOffer(offer)}
                        disabled={isProcessing}
                        className="btn btn-secondary btn-sm"
                        style={{
                          flex: analysis?.targetListingPrice ? 0.8 : 1,
                          fontWeight: 700,
                          fontSize: "10.5px",
                          padding: "4px 6px",
                        }}
                        title="Edit Price Manually"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteOffer(offer)}
                        disabled={isProcessing}
                        className="btn btn-danger btn-sm"
                        style={{ padding: "4px 6px" }}
                        title="Delist from sale"
                      >
                        {isProcessing ? (
                          <Loader2 size={11} className="spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
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
      {listingSubTab === "inventory" && (
        <div style={{ flex: 1, minHeight: 0 }}>
          {/* Helpful Steam Sync Hint Banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              backgroundColor: "rgba(59, 130, 246, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.22)",
              borderRadius: "var(--so-radius-md)",
              padding: "9px 14px",
              marginBottom: "12px",
              fontSize: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                color: "var(--so-text-secondary)",
                lineHeight: "1.4",
              }}
            >
              <Info
                size={16}
                style={{ color: "var(--so-accent-cyan)", flexShrink: 0 }}
              />
              <span>
                <strong style={{ color: "#ffffff" }}>Steam Sync Notice:</strong>{" "}
                DMarket caches your Steam inventory.
                If newly bought or traded CS2 items aren&apos;t showing, click{" "}
                <strong style={{ color: "var(--so-accent-cyan)" }}>
                  Steam Re-sync
                </strong>{" "}
                to instruct DMarket to re-crawl your Steam account.
              </span>
            </div>
            <button
              onClick={handleSteamResync}
              disabled={steamSyncing}
              className="btn btn-outline btn-sm"
              style={{
                fontSize: "11px",
                padding: "4px 10px",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
              title="Tell DMarket to re-crawl Steam for your newly acquired items"
            >
              {steamSyncing ? (
                <Loader2 size={12} className="spin" />
              ) : (
                <RefreshCw size={12} />
              )}{" "}
              Steam Re-sync
            </button>
          </div>

          {inventory.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "50px 20px",
                color: "var(--so-text-muted)",
              }}
            >
              {inventoryLoading ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <Loader2
                    size={32}
                    className="spin"
                    style={{ color: "var(--so-primary)" }}
                  />
                  <div>Fetching inventory from DMarket...</div>
                </div>
              ) : (
                <div>
                  <Package
                    size={32}
                    style={{ marginBottom: "10px", opacity: 0.5 }}
                  />
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "15px",
                      color: "var(--so-text-primary)",
                      marginBottom: "4px",
                    }}
                  >
                    No unlisted inventory items found
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      marginBottom: "16px",
                      maxWidth: "420px",
                      margin: "0 auto 16px",
                      lineHeight: "1.4",
                    }}
                  >
                    No unlisted items currently cached by DMarket. If you
                    recently traded or bought items on Steam, trigger a Steam
                    Re-sync so DMarket can index them.
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      onClick={fetchInventory}
                      disabled={inventoryLoading}
                      className="btn btn-primary btn-sm"
                      style={{ padding: "6px 16px" }}
                    >
                      <RotateCw size={13} /> Sync Inventory
                    </button>
                    <button
                      onClick={handleSteamResync}
                      disabled={steamSyncing}
                      className="btn btn-outline btn-sm"
                      style={{ padding: "6px 16px" }}
                    >
                      {steamSyncing ? (
                        <Loader2 size={13} className="spin" />
                      ) : (
                        <RefreshCw size={13} />
                      )}{" "}
                      Steam Re-sync
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : filteredInventory.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--so-text-muted)",
              }}
            >
              <div>No inventory items match &quot;{listingSearch}&quot;.</div>
              <button
                onClick={() => setListingSearch("")}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: "10px" }}
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(215px, 1fr))",
                gap: "10px",
                paddingBottom: selectedInventoryCount > 0 ? "75px" : "12px",
              }}
            >
              {filteredInventory.map((item) => {
                const isSelected = !!selectedInventory[item.assetId];
                const isProcessing = listingProcessingId === item.assetId;
                const priceEntry = getItemListingPriceWithMap(
                  item,
                  listingPriceMap,
                );
                const targetPrice = priceEntry?.listingPrice
                  ? Number(priceEntry.listingPrice.toFixed(2))
                  : null;

                const title = getTradeTitle(item);
                const match = title.match(/^(.+?)\s*\(([^)]+)\)$/);
                const cleanTitle = match ? match[1] : title;
                const wearText = match
                  ? match[2]
                  : item.attributes?.exterior ||
                    item.attributes?.cs2?.exterior ||
                    item.extra?.exterior ||
                    "";
                const wearShortcut = getWearShortcut(wearText);
                const floatVal = formatItemFloat(item);

                const itemImageUrl =
                  item.imageUrl ||
                  (title && title !== "CS2 Item"
                    ? `https://api.steamapis.com/image/item/730/${encodeURIComponent(title)}`
                    : "");

                return (
                  <div
                    key={item.assetId}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "8px",
                      margin: 0,
                      padding: "10px",
                      minHeight: "265px",
                      boxSizing: "border-box",
                      borderRadius: "var(--so-radius-md)",
                      backgroundColor: "var(--so-surface-card)",
                      border: `1px solid ${isSelected ? "var(--so-primary)" : "var(--so-border-medium)"}`,
                      boxShadow: isSelected
                        ? "inset 0 0 0 1px var(--so-primary)"
                        : "none",
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "all 0.15s ease",
                      overflow: "hidden",
                    }}
                    onClick={() =>
                      setSelectedInventory((prev) => ({
                        ...prev,
                        [item.assetId]: !prev[item.assetId],
                      }))
                    }
                  >
                    {/* Header Row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        height: "22px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          flexShrink: 0,
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenMarket(title);
                          }}
                          className="btn btn-sm"
                          style={{
                            padding: "3px 6px",
                            background: "var(--so-surface-panel)",
                            border: "1px solid var(--so-border-subtle)",
                            borderRadius: "4px",
                            color: "var(--so-text-secondary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Open on DMarket Market (Browser)"
                        >
                          <ExternalLink size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenLookupModal(
                              title,
                              targetPrice || undefined,
                              undefined,
                              itemImageUrl,
                            );
                          }}
                          className="btn btn-sm"
                          style={{
                            padding: "3px 6px",
                            background: "var(--so-surface-panel)",
                            border: "1px solid var(--so-border-subtle)",
                            borderRadius: "4px",
                            color: "var(--so-accent-cyan)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Inspect Item Details & Trends"
                        >
                          <Eye size={13} />
                        </button>
                        <CopyMarketHashButton name={title} />
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          flexShrink: 0,
                        }}
                      >
                        {item.inMarket ? (
                          <span
                            className="badge badge-success"
                            style={{
                              fontSize: "8.5px",
                              padding: "1px 6px",
                              fontWeight: 800,
                              whiteSpace: "nowrap",
                            }}
                          >
                            ON DMARKET
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "8.5px",
                              padding: "1px 6px",
                              borderRadius: "3px",
                              backgroundColor: "rgba(59, 130, 246, 0.15)",
                              color: "#60a5fa",
                              border: "1px solid rgba(59, 130, 246, 0.3)",
                              fontWeight: 800,
                              whiteSpace: "nowrap",
                            }}
                          >
                            IN STEAM
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Image Showcase */}
                    <div
                      style={{
                        height: "65px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(0, 0, 0, 0.25)",
                        borderRadius: "var(--so-radius-sm)",
                        border: "1px solid var(--so-border-subtle)",
                        padding: "4px",
                        backgroundImage:
                          "radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 70%)",
                      }}
                    >
                      <img
                        src={itemImageUrl}
                        alt={cleanTitle}
                        onError={(e) => {
                          const imgEl = e.target as HTMLImageElement;
                          const fallback =
                            title && title !== "CS2 Item"
                              ? `https://api.steamapis.com/image/item/730/${encodeURIComponent(title)}`
                              : "";
                          if (fallback && imgEl.src !== fallback) {
                            imgEl.src = fallback;
                          } else {
                            imgEl.style.opacity = "0.3";
                          }
                        }}
                        style={{
                          maxHeight: "55px",
                          maxWidth: "100%",
                          objectFit: "contain",
                          filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5))",
                        }}
                      />
                    </div>

                    {/* Title & Wear & Float */}
                    <div
                      style={{
                        textAlign: "center",
                        minHeight: "34px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "11.5px",
                          color: "var(--so-text-primary)",
                          lineHeight: "1.2",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={title}
                      >
                        {cleanTitle}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "2px",
                          fontSize: "10px",
                        }}
                      >
                        {wearShortcut && (
                          <span
                            style={{
                              color: "var(--so-primary)",
                              fontWeight: 800,
                            }}
                          >
                            {wearShortcut}
                          </span>
                        )}
                        {floatVal && (
                          <span
                            style={{
                              color: "var(--so-text-muted)",
                              fontWeight: 700,
                            }}
                          >
                            F: {floatVal}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 14-Day Trend Sparkline */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <TrendSparkline
                        name={title}
                        height={30}
                        onClick={() =>
                          onOpenLookupModal(
                            title,
                            undefined,
                            undefined,
                            itemImageUrl,
                          )
                        }
                      />
                    </div>

                    {/* Pricing Info Box */}
                    <div
                      style={{
                        backgroundColor: "var(--so-surface-input)",
                        border: "1px solid var(--so-border-subtle)",
                        padding: "6px 8px",
                        borderRadius: "var(--so-radius-sm)",
                        fontSize: "11px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "3px",
                        }}
                      >
                        <span style={{ color: "var(--so-text-muted)" }}>
                          Status
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: item.tradable
                              ? "var(--so-success-text)"
                              : "#f59e0b",
                          }}
                        >
                          {item.tradable ? "Tradable" : "Trade Locked"}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "3px",
                        }}
                      >
                        <span style={{ color: "var(--so-text-muted)" }}>
                          Target List Price
                        </span>
                        <span
                          className="tabular-nums"
                          style={{
                            fontWeight: 800,
                            color: "var(--so-success-text)",
                          }}
                        >
                          {targetPrice ? `$${targetPrice.toFixed(2)}` : "—"}
                        </span>
                      </div>

                      {priceEntry?.lowestPrice ? (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "9.5px",
                          }}
                        >
                          <span style={{ color: "var(--so-text-muted)" }}>
                            Lowest / Avg
                          </span>
                          <span
                            className="tabular-nums"
                            style={{
                              color: "var(--so-text-secondary)",
                              fontWeight: 600,
                            }}
                          >
                            ${priceEntry.lowestPrice.toFixed(2)} / $
                            {priceEntry.averagePrice.toFixed(2)}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Action Row */}
                    <div
                      style={{ display: "flex", gap: "6px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!item.inMarket ? (
                        <button
                          onClick={() => handleDepositItem(item)}
                          disabled={
                            isProcessing || depositingAssetId === item.assetId
                          }
                          className="btn btn-secondary btn-sm"
                          style={{
                            flex: 1,
                            fontWeight: 700,
                            fontSize: "11px",
                            padding: "5px 8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                            backgroundColor: "rgba(59, 130, 246, 0.15)",
                            color: "#93c5fd",
                            borderColor: "rgba(59, 130, 246, 0.4)",
                          }}
                          title="Deposit this item from your Steam inventory to DMarket bots"
                        >
                          {depositingAssetId === item.assetId ? (
                            <Loader2 size={12} className="spin" />
                          ) : (
                            <ArrowUpRight
                              size={13}
                              style={{ color: "#60a5fa" }}
                            />
                          )}
                          <span>Deposit to DMarket</span>
                        </button>
                      ) : targetPrice ? (
                        <button
                          onClick={() => handleCreateOffer(item, targetPrice)}
                          disabled={isProcessing}
                          className="btn btn-primary btn-sm"
                          style={{
                            flex: 1,
                            fontWeight: 700,
                            fontSize: "11px",
                            padding: "4px 6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                          }}
                        >
                          {isProcessing ? (
                            <Loader2 size={11} className="spin" />
                          ) : (
                            <PlusCircle size={12} />
                          )}
                          <span>List for ${targetPrice.toFixed(2)}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setCreatingOfferItem(item)}
                          disabled={isProcessing}
                          className="btn btn-secondary btn-sm"
                          style={{
                            flex: 1,
                            fontWeight: 700,
                            fontSize: "11px",
                            padding: "4px 6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
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
      {listingSubTab === "history" && (
        <div style={{ flex: 1, minHeight: 0 }}>
          {closedOffers.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "50px 20px",
                color: "var(--so-text-muted)",
              }}
            >
              {closedOffersLoading ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <Loader2
                    size={32}
                    className="spin"
                    style={{ color: "var(--so-primary)" }}
                  />
                  <div>Fetching sales history from DMarket...</div>
                </div>
              ) : (
                <div>
                  <History
                    size={32}
                    style={{ marginBottom: "10px", opacity: 0.5 }}
                  />
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "15px",
                      color: "var(--so-text-primary)",
                      marginBottom: "4px",
                    }}
                  >
                    No sales history loaded
                  </div>
                  <div style={{ fontSize: "12px", marginBottom: "14px" }}>
                    Click below to sync your completed sales from DMarket.
                  </div>
                  <button
                    onClick={fetchClosedOffers}
                    className="btn btn-primary btn-sm"
                    style={{ padding: "6px 16px" }}
                  >
                    <RotateCw size={13} /> Sync Sales History
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "var(--so-surface-card)",
                border: "1px solid var(--so-border-medium)",
                borderRadius: "var(--so-radius-md)",
                overflow: "hidden",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: "var(--so-surface-panel)",
                      borderBottom: "1px solid var(--so-border-medium)",
                      color: "var(--so-text-muted)",
                      fontSize: "11px",
                      textAlign: "left",
                    }}
                  >
                    <th style={{ padding: "10px 14px" }}>Item</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>
                      Sold Price
                    </th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>
                      Fee
                    </th>
                    <th style={{ padding: "10px 14px", textAlign: "center" }}>
                      Status
                    </th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {closedOffers.map((trade, idx) => {
                    const dateStr = trade.closedAt
                      ? new Date(trade.closedAt * 1000).toLocaleString()
                      : "Recent";
                    return (
                      <tr
                        key={trade.offerId || idx}
                        style={{
                          borderBottom: "1px solid var(--so-border-subtle)",
                          backgroundColor:
                            idx % 2 === 0
                              ? "transparent"
                              : "rgba(255,255,255,0.01)",
                        }}
                      >
                        <td
                          style={{
                            padding: "10px 14px",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <img
                            src={trade.imageUrl}
                            alt={trade.title}
                            style={{
                              width: "32px",
                              height: "32px",
                              objectFit: "contain",
                            }}
                            onError={(e) => {
                              (e.target as HTMLElement).style.opacity = "0.3";
                            }}
                          />
                          <span
                            style={{
                              fontWeight: 700,
                              color: "var(--so-text-primary)",
                            }}
                          >
                            {trade.title}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "10px 14px",
                            textAlign: "right",
                            fontWeight: 800,
                            color: "var(--so-success-text)",
                          }}
                        >
                          ${trade.priceUSD}
                        </td>
                        <td
                          style={{
                            padding: "10px 14px",
                            textAlign: "right",
                            color: "var(--so-text-muted)",
                          }}
                        >
                          {trade.feeFormatted || "—"}
                        </td>
                        <td
                          style={{ padding: "10px 14px", textAlign: "center" }}
                        >
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: "10px",
                              backgroundColor: "rgba(16, 185, 129, 0.15)",
                              color: "var(--so-success-text)",
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                              textTransform: "uppercase",
                            }}
                          >
                            {trade.status}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "10px 14px",
                            textAlign: "right",
                            color: "var(--so-text-muted)",
                          }}
                        >
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

      {/* ── FLOATING BATCH ACTIONS PANEL FOR ACTIVE OFFERS ── */}
      {listingSubTab === "active" && selectedOfferCount > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: isSidebarExpanded ? "258px" : "96px",
            right: "28px",
            zIndex: 1000,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            backgroundColor: "rgba(17, 24, 39, 0.96)",
            backdropFilter: "blur(12px)",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "var(--so-radius-md)",
            border: "1px solid var(--so-border-medium)",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(37, 99, 235, 0.25)",
            boxSizing: "border-box",
            transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            <span
              style={{
                backgroundColor: "rgba(37, 99, 235, 0.2)",
                color: "var(--so-accent-cyan)",
                border: "1px solid var(--so-primary)",
                padding: "2px 9px",
                borderRadius: "4px",
                fontWeight: 900,
                fontSize: "14px",
              }}
            >
              {selectedOfferCount}
            </span>
            <span>OFFERS SELECTED FOR BATCH OPERATIONS</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setSelectedOffers({})}
              className="btn btn-sm btn-ghost"
              style={{
                fontWeight: 700,
                padding: "6px 14px",
                fontSize: "12px",
                color: "#ffffff",
              }}
            >
              Clear Selection
            </button>

            <button
              onClick={handleBatchDelistOffers}
              disabled={batchListingProcessing}
              className="btn btn-danger btn-sm"
              style={{
                fontWeight: 800,
                padding: "6px 14px",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#ffffff",
              }}
            >
              {batchListingProcessing ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <Trash2 size={13} />
              )}
              <span>Delist Selected ({selectedOfferCount})</span>
            </button>

            <button
              onClick={handleBatchUpdateOffersToOracle}
              disabled={batchListingProcessing}
              className="btn btn-primary btn-sm"
              style={{
                fontWeight: 800,
                padding: "6px 18px",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#ffffff",
              }}
            >
              {batchListingProcessing ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <Zap size={13} />
              )}
              <span>Update to Oracle Price</span>
            </button>
          </div>
        </div>
      )}

      {/* ── FLOATING BATCH ACTIONS PANEL FOR INVENTORY ── */}
      {listingSubTab === "inventory" && selectedInventoryCount > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: isSidebarExpanded ? "258px" : "96px",
            right: "28px",
            zIndex: 1000,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            backgroundColor: "rgba(17, 24, 39, 0.96)",
            backdropFilter: "blur(12px)",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "var(--so-radius-md)",
            border: "1px solid var(--so-border-medium)",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(37, 99, 235, 0.25)",
            boxSizing: "border-box",
            transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            <span
              style={{
                backgroundColor: "rgba(37, 99, 235, 0.2)",
                color: "var(--so-accent-cyan)",
                border: "1px solid var(--so-primary)",
                padding: "2px 9px",
                borderRadius: "4px",
                fontWeight: 900,
                fontSize: "14px",
              }}
            >
              {selectedInventoryCount}
            </span>
            <span>
              INVENTORY ITEMS SELECTED
              {selectedSteamCount > 0 && selectedDmarketCount > 0
                ? ` (${selectedDmarketCount} on DMarket, ${selectedSteamCount} in Steam)`
                : selectedSteamCount > 0
                  ? ` (${selectedSteamCount} in Steam — Deposit Required)`
                  : ` (${selectedDmarketCount} on DMarket — Ready to List)`}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setSelectedInventory({})}
              className="btn btn-sm btn-ghost"
              style={{
                fontWeight: 700,
                padding: "6px 14px",
                fontSize: "12px",
                color: "#ffffff",
              }}
            >
              Clear Selection
            </button>

            {selectedSteamCount > 0 && (
              <button
                onClick={handleBatchDepositSteamItems}
                disabled={batchDepositing}
                className="btn btn-primary btn-sm"
                style={{
                  fontWeight: 800,
                  padding: "6px 16px",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#ffffff",
                }}
              >
                {batchDepositing ? (
                  <Loader2 size={13} className="spin" />
                ) : (
                  <ArrowUpRight size={13} />
                )}
                <span>Deposit {selectedSteamCount} Steam Item(s)</span>
              </button>
            )}

            {selectedDmarketCount > 0 && (
              <button
                onClick={handleBatchListInventoryAtOracle}
                disabled={batchListingProcessing}
                className="btn btn-cyan btn-sm"
                style={{
                  fontWeight: 800,
                  padding: "6px 18px",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#ffffff",
                }}
              >
                {batchListingProcessing ? (
                  <Loader2 size={13} className="spin" />
                ) : (
                  <PlusCircle size={13} />
                )}
                <span>List {selectedDmarketCount} at Oracle Price</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      <EditOfferModal
        offer={editingOffer}
        targetListingPrice={
          editingOffer
            ? listingAnalysis[editingOffer.id]?.targetListingPrice
            : undefined
        }
        onClose={() => setEditingOffer(null)}
        onUpdate={handleQuickUpdateOffer}
      />

      <CreateListingModal
        item={creatingOfferItem}
        listingPriceMap={listingPriceMap}
        onClose={() => setCreatingOfferItem(null)}
        onSubmit={handleCreateOffer}
        onDeposit={handleDepositItem}
      />
    </>
  );
};
