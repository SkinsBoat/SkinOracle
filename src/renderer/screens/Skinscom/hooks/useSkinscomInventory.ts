import { useState } from "react";
import toast from "react-hot-toast";
import type { SkinscomInventoryItem } from "../../../../shared/types/skinscom.types";

/**
 * Fetches and holds the trader's Steam CS2 inventory (`GET
 * /trading/user/inventory`), the deposit source for creating listings.
 */
export function useSkinscomInventory(hasKey: boolean) {
  const [items, setItems] = useState<SkinscomInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchInventory = async () => {
    if (!hasKey) {
      toast.error(
        "Skins.com API key is not configured. Please add it in Settings first.",
      );
      return;
    }
    setLoading(true);
    const toastId = "skinscom-inventory";
    toast.loading("Syncing Steam inventory...", { id: toastId });
    try {
      const res = await window.electronAPI.skinscom.getInventory();
      const list = Array.isArray(res?.data) ? res.data : [];
      setItems(list);
      setUpdatedAt((res as any)?.updatedAt ?? null);
      setHasLoaded(true);
      toast.success(`Loaded ${list.length} inventory items`, { id: toastId });
    } catch (err: any) {
      toast.error(`Inventory error: ${err.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  /** Drop items locally after they were successfully deposited (listed). */
  const removeItems = (ids: number[]) => {
    const remove = new Set(ids);
    setItems((prev) => prev.filter((i) => !remove.has(i.id)));
  };

  return { items, loading, updatedAt, hasLoaded, fetchInventory, removeItems };
}
