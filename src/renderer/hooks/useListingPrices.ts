import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import type { ListingPriceInfo } from "../../shared/types/csfloat.types";

export interface ListingPricesMeta {
  itemCount: number;
  storedAt: string | null;
}

export interface UseListingPricesReturn {
  listingPriceMap: Record<string, ListingPriceInfo>;
  listingPricesMeta: ListingPricesMeta | null;
  loadingPrices: boolean;
  pricesLoaded: boolean;
  loadListingPrices: (silent?: boolean) => Promise<boolean>;
}

/**
 * useListingPrices
 * Centralized access to Oracle-calculated listing prices (Sell Targets) for
 * market workstations. Mirrors `useAcceptedPrices` but for the listing dataset
 * generated in Oracle Step 3.
 */
export function useListingPrices(): UseListingPricesReturn {
  const [listingPriceMap, setListingPriceMap] = useState<
    Record<string, ListingPriceInfo>
  >({});
  const [listingPricesMeta, setListingPricesMeta] =
    useState<ListingPricesMeta | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);

  const loadListingPrices = useCallback(
    async (silent = false): Promise<boolean> => {
      if (!window.electronAPI?.oracle) return false;
      setLoadingPrices(true);
      const toastId = silent
        ? undefined
        : toast.loading("Loading listing prices...");
      try {
        const result = await window.electronAPI.oracle.getListingPrices();
        if (!result || !result.map || result.itemCount === 0) {
          if (!silent) {
            toast.error(
              "No listing prices found. Generate Sell Targets in Oracle (Step 3) first.",
              { id: toastId },
            );
          }
          return false;
        }
        setListingPricesMeta({
          itemCount: result.itemCount,
          storedAt: result.storedAt,
        });
        setListingPriceMap(result.map);
        if (!silent) {
          toast.success(
            `Loaded listing prices for ${result.itemCount.toLocaleString()} items`,
            { id: toastId },
          );
        }
        return true;
      } catch (err: any) {
        if (!silent) {
          toast.error(`Failed to load listing prices: ${err?.message || err}`, {
            id: toastId,
          });
        }
        return false;
      } finally {
        setLoadingPrices(false);
      }
    },
    [],
  );

  // Populate from in-memory Oracle data on mount (silent, no network).
  useEffect(() => {
    loadListingPrices(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    listingPriceMap,
    listingPricesMeta,
    loadingPrices,
    pricesLoaded: listingPricesMeta !== null && listingPricesMeta.itemCount > 0,
    loadListingPrices,
  };
}
