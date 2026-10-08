import { useState } from "react";
import toast from "react-hot-toast";
import type {
  SkinscomListing,
  SkinscomListedItemsParams,
} from "../../../../shared/types/skinscom.types";
import { MAX_SCAN_PAGES } from "../constants";

interface UseMarketplaceScanOptions {
  hasKey: boolean;
  /** Build the `/trading/items` query for a given page. */
  buildParams: (
    page: number,
    autoFetchAll?: boolean,
  ) => SkinscomListedItemsParams;
  onScanned?: (count: number) => void;
}

/**
 * Encapsulates Skins.com marketplace scan state and paging. `scan()` fetches
 * the whole filtered market (main process pages internally); `loadMore()`
 * appends the next page with de-duplication.
 */
export function useMarketplaceScan({
  hasKey,
  buildParams,
  onScanned,
}: UseMarketplaceScanOptions) {
  const [items, setItems] = useState<SkinscomListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [hasScanned, setHasScanned] = useState(false);

  const scan = async () => {
    if (!hasKey) {
      toast.error(
        "Skins.com API key is not configured. Please add it in Settings first.",
      );
      return;
    }
    setLoading(true);
    setPage(1);
    const toastId = "skinscom-scan-market";
    toast.loading("Scanning Skins.com market...", { id: toastId });
    try {
      const res = await window.electronAPI.skinscom.getListedItems(
        buildParams(1, true),
      );
      const list = Array.isArray(res?.data) ? res.data : [];
      setItems(list);
      const maxPages = Math.min(res?.last_page ?? 1, MAX_SCAN_PAGES);
      setLastPage(maxPages);
      setPage(maxPages);
      setHasScanned(true);
      onScanned?.(list.length);
      toast.success(`Scanned ${list.length} listings`, { id: toastId });
    } catch (err: any) {
      toast.error(`Scan failed: ${err.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || page >= lastPage) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await window.electronAPI.skinscom.getListedItems(
        buildParams(nextPage),
      );
      const list = Array.isArray(res?.data) ? res.data : [];
      setItems((prev) => {
        // Dedupe: default ordering can shift between page requests.
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...list.filter((l) => !seen.has(l.id))];
      });
      setPage(nextPage);
      setLastPage(res?.last_page ?? lastPage);
    } catch (err: any) {
      toast.error(`Load more failed: ${err.message}`);
    } finally {
      setLoadingMore(false);
    }
  };

  return {
    items,
    loading,
    loadingMore,
    page,
    lastPage,
    hasScanned,
    scan,
    loadMore,
  };
}
