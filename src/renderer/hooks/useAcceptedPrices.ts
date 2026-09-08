import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

export interface AcceptedPriceEntry {
  acceptedPrice: number;
  liquidityScore: number;
  isHyperLiquid?: boolean;
}

export interface AcceptedPricesMeta {
  itemCount: number;
  storedAt: string | null;
}

export interface UseAcceptedPricesReturn {
  acceptedPriceMap: Record<string, AcceptedPriceEntry>;
  acceptedPricesMeta: AcceptedPricesMeta | null;
  loadingPrices: boolean;
  pricesLoaded: boolean;
  loadAcceptedPrices: (silent?: boolean) => Promise<boolean>;
  clearAcceptedPrices: () => void;
}

/**
 * useAcceptedPrices
 * Centralized hook providing access to Oracle-calculated accepted prices
 * for all market workstations (CSFloat, DMarket, Skins.com).
 */
export function useAcceptedPrices(): UseAcceptedPricesReturn {
  const [acceptedPriceMap, setAcceptedPriceMap] = useState<
    Record<string, AcceptedPriceEntry>
  >({});
  const [acceptedPricesMeta, setAcceptedPricesMeta] =
    useState<AcceptedPricesMeta | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);

  const loadAcceptedPrices = useCallback(
    async (silent = false): Promise<boolean> => {
      if (!window.electronAPI?.oracle) return false;

      setLoadingPrices(true);
      const toastId = silent
        ? undefined
        : toast.loading("Loading accepted prices...");

      try {
        const result: {
          map: Record<string, AcceptedPriceEntry>;
          itemCount: number;
          storedAt: string | null;
        } = await (window.electronAPI.oracle as any).getAcceptedPrices();

        if (!result || !result.map || result.itemCount === 0) {
          if (!silent) {
            toast.error(
              "No accepted prices found. Please build prices in Oracle Workstation first.",
              { id: toastId },
            );
          }
          setLoadingPrices(false);
          return false;
        }

        setAcceptedPricesMeta({
          itemCount: result.itemCount,
          storedAt: result.storedAt,
        });
        setAcceptedPriceMap(result.map);

        if (!silent) {
          toast.success(
            `Loaded accepted prices for ${result.itemCount.toLocaleString()} items`,
            { id: toastId },
          );
        }
        return true;
      } catch (err: any) {
        if (!silent) {
          toast.error(`Failed to load prices: ${err?.message || err}`, {
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

  const clearAcceptedPrices = useCallback(() => {
    setAcceptedPriceMap({});
    setAcceptedPricesMeta(null);
  }, []);

  return {
    acceptedPriceMap,
    acceptedPricesMeta,
    loadingPrices,
    pricesLoaded:
      acceptedPricesMeta !== null && acceptedPricesMeta.itemCount > 0,
    loadAcceptedPrices,
    clearAcceptedPrices,
  };
}
