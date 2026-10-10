import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import type { SkinportMarketItem } from "../../../../shared/types/skinport.types";
import { CS2_APPID } from "../constants";

interface UseSkinportItemsOptions {
  onScanned?: (count: number) => void;
}

/**
 * Skins market items scan for Skinport. `GET /v1/items` is a single cached
 * (5 min) response with no paging, so `scan()` fetches the whole market once.
 */
export function useSkinportItems({ onScanned }: UseSkinportItemsOptions = {}) {
  const [items, setItems] = useState<SkinportMarketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    const toastId = "skinport-scan-market";
    toast.loading("Scanning Skinport market...", { id: toastId });
    try {
      const list = await window.electronAPI.skinport.getItems({
        app_id: CS2_APPID,
        currency: "USD",
        tradable: true,
      });
      const arr = Array.isArray(list) ? list : [];
      setItems(arr);
      setHasScanned(true);
      setUpdatedAt(Date.now());
      onScanned?.(arr.length);
      toast.success(`Scanned ${arr.length.toLocaleString()} items`, {
        id: toastId,
      });
    } catch (err: any) {
      toast.error(`Scan failed: ${err?.message || err}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  }, [onScanned]);

  return { items, loading, hasScanned, updatedAt, scan };
}
