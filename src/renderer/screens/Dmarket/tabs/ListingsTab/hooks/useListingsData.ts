import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import {
  DmarketOfferItem,
  DmarketInventoryItem,
  ListingPriceInfo,
  ListingAnalysis,
} from "../../../../../../shared/types";
import {
  getTradeTitle,
  getItemListingPriceWithMap,
  isDmarketP2POffer,
  parseCooldownSeconds,
  formatCooldown,
} from "../../../dmarket-utils";
import { useTrendStore } from "../../../../../store/useTrendStore";
import { useDmarketCooldowns } from "./useDmarketCooldowns";

export interface UseListingsDataOptions {
  hasKey: boolean;
  checkApiKey: () => Promise<boolean>;
  driftThresholdPercent?: number;
}

export function useListingsData({
  hasKey,
  checkApiKey,
  driftThresholdPercent = 2,
}: UseListingsDataOptions) {
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
  const [depositingAssetId, setDepositingAssetId] = useState<string | null>(
    null,
  );
  const [batchDepositing, setBatchDepositing] = useState(false);

  // DMarket Cooldown / AssetTimeLocked management hook
  const {
    cooldowns,
    isItemLocked,
    getItemCooldown,
    recordCooldown,
    recordCooldownsFromFailures,
  } = useDmarketCooldowns();

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

  const recalculateListingAnalysis = useCallback(
    (
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
          const thresholdFraction = (threshold ?? 2) / 100;
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
    },
    [],
  );

  const fetchOffers = useCallback(
    async (silent = false) => {
      const keyOk = await checkApiKey();
      if (!keyOk) {
        if (!silent) {
          toast.error(
            "DMarket API keys not configured. Please add your keys in Settings.",
          );
        }
        return;
      }
      setOffersLoading(true);
      setSelectedOffers({});
      const toastId = silent
        ? null
        : toast.loading("Syncing active sell offers from DMarket...");
      try {
        const res = await window.electronAPI.dmarket.getOffers({
          fetchAll: true,
        });
        const items = Array.isArray(res?.items) ? res.items : [];
        setOffers(items);
        if (toastId) {
          toast.success(`Loaded ${items.length} active sell offers`, {
            id: toastId,
          });
        }

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
        if (toastId) {
          toast.error(`Error fetching offers: ${err.message}`, { id: toastId });
        } else {
          toast.error(`Error fetching offers: ${err.message}`);
        }
      } finally {
        setOffersLoading(false);
      }
    },
    [checkApiKey, listingPriceMap, driftThresholdPercent, recalculateListingAnalysis],
  );

  const fetchInventory = useCallback(
    async (silent = false) => {
      const keyOk = await checkApiKey();
      if (!keyOk) {
        if (!silent) {
          toast.error(
            "DMarket API keys not configured. Please add your keys in Settings.",
          );
        }
        return;
      }
      setInventoryLoading(true);
      setSelectedInventory({});
      const toastId = silent
        ? null
        : toast.loading("Syncing inventory from DMarket...");
      try {
        const res = await window.electronAPI.dmarket.getInventory({
          fetchAll: true,
        });
        const items: DmarketInventoryItem[] = Array.isArray(res?.items)
          ? res.items
          : [];
        setInventory(items);
        if (toastId) {
          const dmarketCount = items.filter((i) => i.inMarket).length;
          const steamCount = items.filter((i) => !i.inMarket).length;
          toast.success(
            `Loaded ${items.length} inventory items (${dmarketCount} on DMarket, ${steamCount} in Steam)`,
            { id: toastId },
          );
        }
      } catch (err: any) {
        console.error("[DMarket Workstation] Error fetching inventory:", err);
        if (toastId) {
          toast.error(`Error fetching inventory: ${err.message}`, { id: toastId });
        } else {
          toast.error(`Error fetching inventory: ${err.message}`);
        }
      } finally {
        setInventoryLoading(false);
      }
    },
    [checkApiKey],
  );

  const handleSteamResync = useCallback(async () => {
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
  }, [fetchInventory]);

  const handleDepositItem = useCallback(
    async (item: DmarketInventoryItem) => {
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
    },
    [fetchInventory],
  );

  const handleBatchDepositSteamItems = useCallback(async () => {
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
  }, [inventory, selectedInventory, fetchInventory]);

  const fetchClosedOffers = useCallback(async () => {
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
  }, [checkApiKey]);

  const loadListingPrices = useCallback(
    async (activeSubTab: "active" | "inventory" | "history") => {
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

        if (activeSubTab === "inventory") {
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
    },
    [offers, inventory, driftThresholdPercent, recalculateListingAnalysis],
  );

  const handleQuickUpdateOffer = useCallback(
    async (offer: DmarketOfferItem, targetPriceUsd: number) => {
      if (!targetPriceUsd || targetPriceUsd <= 0) return;

      const activeCooldown = getItemCooldown(offer);
      if (activeCooldown) {
        toast.error(
          `"${offer.title}" is on DMarket rate-limit cooldown (${activeCooldown.formatted} remaining). Edits temporarily locked.`,
          { duration: 4500 },
        );
        return;
      }

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
          {
            id: targetOfferId,
            priceUsd: targetPriceUsd,
            isP2P: isDmarketP2POffer(offer),
          },
        ]);
        console.log("[ListingsTab] Quick update response:", res);
        if (res.failed && res.failed.length > 0) {
          const failItem = res.failed[0];
          const isTimeLocked =
            failItem?.code === "AssetTimeLocked" ||
            /timelock/i.test(failItem?.code || "") ||
            /time limit/i.test(failItem?.message || "");

          if (isTimeLocked) {
            const secs = parseCooldownSeconds(failItem.message);
            recordCooldown(offer.id, secs, {
              assetId: offer.assetId,
              reason: failItem.message,
            });
            if (offer.offerId && offer.offerId !== offer.id) {
              recordCooldown(offer.offerId, secs, {
                assetId: offer.assetId,
                reason: failItem.message,
              });
            }
            toast.error(
              `"${offer.title}" is locked by DMarket: Changes restricted for ${formatCooldown(secs)}. Cooldown active on card.`,
              { id: toastId, duration: 6000 },
            );
            return;
          }

          const failMsg =
            failItem?.message ||
            failItem?.code ||
            JSON.stringify(failItem) ||
            "Update failed";
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
    },
    [listingPriceMap],
  );

  const handleDeleteOffer = useCallback(async (offer: DmarketOfferItem) => {
    setListingProcessingId(offer.id);
    const isP2P = isDmarketP2POffer(offer);
    const toastId = toast.loading(
      `Delisting "${offer.title}"${isP2P ? " (P2P)" : ""}...`,
    );
    try {
      const res = await window.electronAPI.dmarket.deleteOffers([
        {
          id: offer.id,
          offerId: offer.offerId || offer.id,
          assetId: offer.assetId,
          isP2P,
        },
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
  }, []);

  const handleCreateOffer = useCallback(
    async (item: DmarketInventoryItem, priceUsd: number) => {
      if (!priceUsd || priceUsd <= 0) {
        toast.error("Invalid listing price");
        return;
      }
      const targetAssetId =
        item.assetId || (item as any).itemId || (item as any).id;

      const activeCooldown = getItemCooldown(targetAssetId);
      if (activeCooldown) {
        toast.error(
          `"${item.title}" is on DMarket rate-limit cooldown (${activeCooldown.formatted} remaining). Listing restricted.`,
          { duration: 4500 },
        );
        return;
      }

      const isP2P = !item.inMarket || isDmarketP2POffer(item);
      setListingProcessingId(targetAssetId);
      const toastId = toast.loading(
        `Listing "${item.title}" for $${priceUsd.toFixed(2)}${isP2P ? " (P2P)" : ""}...`,
      );
      try {
        const res = await window.electronAPI.dmarket.createOffers([
          {
            assetId: targetAssetId,
            itemId: targetAssetId,
            id: targetAssetId,
            priceUsd,
            isP2P,
          },
        ]);
        if (res.failed && res.failed.length > 0) {
          const failItem = res.failed[0];
          const isTimeLocked =
            failItem?.code === "AssetTimeLocked" ||
            /timelock/i.test(failItem?.code || "") ||
            /time limit/i.test(failItem?.message || "");

          if (isTimeLocked) {
            const secs = parseCooldownSeconds(failItem.message);
            recordCooldown(targetAssetId, secs, {
              assetId: targetAssetId,
              reason: failItem.message,
            });
            toast.error(
              `"${item.title}" is locked by DMarket: Rate limit active (${formatCooldown(secs)} cooldown). Cooldown active on card.`,
              { id: toastId, duration: 6000 },
            );
            return;
          }

          const failMsg =
            failItem?.message ||
            failItem?.code ||
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
    },
    [fetchOffers],
  );

  const handleBatchUpdateOffersToOracle = useCallback(async () => {
    const toUpdate: Array<{ id: string; priceUsd: number; title: string }> = [];
    const lockedOffers: Array<{ id: string; title: string }> = [];

    offers.forEach((offer) => {
      if (selectedOffers[offer.id]) {
        const a = listingAnalysis[offer.id];
        if (a && a.targetListingPrice && a.targetListingPrice > 0) {
          if (isItemLocked(offer)) {
            lockedOffers.push({ id: offer.id, title: offer.title });
          } else {
            toUpdate.push({
              id: offer.id,
              priceUsd: a.targetListingPrice,
              title: offer.title,
            });
          }
        }
      }
    });

    if (lockedOffers.length > 0) {
      if (toUpdate.length === 0) {
        const firstLock = getItemCooldown(lockedOffers[0].id);
        toast.error(
          `All selected offers are on DMarket rate-limit cooldown${firstLock ? ` (${firstLock.formatted} remaining)` : ""}. Please wait before updating.`,
          { duration: 5000 },
        );
        return;
      }
      toast(
        `Skipped ${lockedOffers.length} offer(s) currently on DMarket time-limit cooldown`,
        { icon: "⏳", duration: 4000 },
      );
    }

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
        isP2P: isDmarketP2POffer(u),
      }));
      console.log("[ListingsTab] Batch update requests:", requests);
      const res = await window.electronAPI.dmarket.updateOffers(requests);
      console.log("[ListingsTab] Batch update response:", res);
      const successCount = res.offers?.length || 0;
      const failCount = res.failed?.length || 0;

      if (failCount > 0) {
        recordCooldownsFromFailures(res.failed);
        const timeLockedFails = res.failed.filter(
          (f: any) =>
            f.code === "AssetTimeLocked" ||
            /timelock/i.test(f.code || "") ||
            /time limit/i.test(f.message || ""),
        );
        console.error("[ListingsTab] ❌ Batch update failures:", res.failed);
        if (timeLockedFails.length > 0) {
          const sampleSecs = parseCooldownSeconds(timeLockedFails[0]?.message);
          const sampleTime = formatCooldown(sampleSecs);
          toast.error(
            `Updated ${successCount} offers, ${failCount} failed. ${timeLockedFails.length} offer(s) locked by DMarket rate limits (${sampleTime} cooldown). Cooldown timers active on cards.`,
            { id: toastId, duration: 6000 },
          );
        } else {
          const firstFail = res.failed[0];
          const failReason = firstFail?.message || firstFail?.code || "";
          toast.error(
            `Updated ${successCount} offers, ${failCount} failed${failReason ? `: ${failReason}` : ""}`,
            { id: toastId },
          );
        }
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
  }, [offers, selectedOffers, listingAnalysis, fetchOffers]);

  const handleBatchDelistOffers = useCallback(async () => {
    const toDelist = offers.filter((o) => selectedOffers[o.id]);
    if (toDelist.length === 0) return;

    setBatchListingProcessing(true);
    const toastId = toast.loading(
      `Batch delisting ${toDelist.length} offers...`,
    );
    try {
      const requests = toDelist.map((o) => ({
        id: o.id,
        offerId: o.offerId || o.id,
        assetId: o.assetId,
        isP2P: isDmarketP2POffer(o),
      }));
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
  }, [offers, selectedOffers, fetchOffers]);

  const handleBatchListInventoryAtOracle = useCallback(
    async (mode: "all" | "p2p" | "bot" = "all") => {
      const selectedItems = inventory.filter((i) => selectedInventory[i.assetId]);
      let targetItems = selectedItems;
      if (mode === "p2p") {
        targetItems = selectedItems.filter(
          (i) => !i.inMarket || isDmarketP2POffer(i),
        );
      } else if (mode === "bot") {
        targetItems = selectedItems.filter(
          (i) => i.inMarket && !isDmarketP2POffer(i),
        );
      }

      if (targetItems.length === 0) {
        toast.error(
          `No ${mode === "p2p" ? "Steam P2P" : mode === "bot" ? "DMarket Bot" : ""} items selected.`,
        );
        return;
      }

      const toList: Array<{
        assetId: string;
        priceUsd: number;
        title: string;
        isP2P: boolean;
      }> = [];

      targetItems.forEach((item) => {
        const priceEntry = getItemListingPriceWithMap(item, listingPriceMap);
        if (priceEntry && priceEntry.listingPrice > 0) {
          const targetAssetId =
            item.assetId || (item as any).itemId || (item as any).id;
          const isP2P = !item.inMarket || isDmarketP2POffer(item);
          toList.push({
            assetId: targetAssetId,
            priceUsd: Number(priceEntry.listingPrice.toFixed(2)),
            title: getTradeTitle(item),
            isP2P,
          });
        }
      });

      if (toList.length === 0) {
        toast.error(
          "None of the selected items have matching Oracle listing prices. Load Oracle prices in step 3 or list manually.",
        );
        return;
      }

      setBatchListingProcessing(true);
      const p2pCount = toList.filter((i) => i.isP2P).length;
      const botCount = toList.filter((i) => !i.isP2P).length;
      const toastId = toast.loading(
        `Batch listing ${toList.length} item(s) at Oracle price (${p2pCount} P2P, ${botCount} Bot)...`,
      );

      try {
        const requests = toList.map((item) => ({
          assetId: item.assetId,
          itemId: item.assetId,
          id: item.assetId,
          priceUsd: item.priceUsd,
          isP2P: item.isP2P,
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
    },
    [inventory, selectedInventory, listingPriceMap, fetchInventory, fetchOffers],
  );

  const initialFetchedRef = useRef(false);

  // Auto-fetch offers & inventory quietly on first mount without popup toasts
  useEffect(() => {
    if (hasKey && !initialFetchedRef.current) {
      initialFetchedRef.current = true;
      fetchOffers(true);
      fetchInventory(true);
    }
  }, [hasKey, fetchOffers, fetchInventory]);

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

  return {
    offers,
    setOffers,
    offersLoading,
    inventory,
    setInventory,
    inventoryLoading,
    steamSyncing,
    closedOffers,
    closedOffersLoading,
    listingAnalysis,
    setListingAnalysis,
    listingPriceMap,
    listingPricesMeta,
    loadingListingPrices,
    listingPricesLoaded,
    selectedOffers,
    setSelectedOffers,
    selectedInventory,
    setSelectedInventory,
    listingProcessingId,
    batchListingProcessing,
    depositingAssetId,
    batchDepositing,
    selectedOfferCount,
    selectedInventoryCount,
    dmarketInventoryCount,
    steamInventoryCount,
    selectedSteamCount,
    selectedDmarketCount,
    fetchOffers,
    fetchInventory,
    handleSteamResync,
    handleDepositItem,
    handleBatchDepositSteamItems,
    fetchClosedOffers,
    loadListingPrices,
    handleQuickUpdateOffer,
    handleDeleteOffer,
    handleCreateOffer,
    handleBatchUpdateOffersToOracle,
    handleBatchDelistOffers,
    handleBatchListInventoryAtOracle,
    cooldowns,
    isItemLocked,
    getItemCooldown,
    recordCooldown,
  };
}
