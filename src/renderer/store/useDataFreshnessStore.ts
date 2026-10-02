import { create } from "zustand";

const STORAGE_KEY = "skin_oracle_data_freshness_v1";

/**
 * Trader-controlled expiry windows for locally held data. A value of `0`
 * disables expiry for that dataset (never considered stale).
 */
export interface DataFreshnessSettings {
  /** Market price cache (Skinsnipe / CS2Cap scan snapshots), in minutes. */
  cacheExpiryMinutes: number;
  /** Calculated accepted prices / buy ceilings, in minutes. */
  acceptedPriceExpiryMinutes: number;
  /** Calculated listing prices / sell targets, in minutes. */
  listingPriceExpiryMinutes: number;
  /** Master switch for surfacing stale-data warnings in workstations. */
  freshnessWarningsEnabled: boolean;
}

export const DEFAULT_FRESHNESS_SETTINGS: DataFreshnessSettings = {
  cacheExpiryMinutes: 60,
  acceptedPriceExpiryMinutes: 1440,
  listingPriceExpiryMinutes: 1440,
  freshnessWarningsEnabled: true,
};

function loadSettings(): DataFreshnessSettings {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged = { ...DEFAULT_FRESHNESS_SETTINGS, ...parsed };
        return {
          ...merged,
          cacheExpiryMinutes: sanitizeMinutes(merged.cacheExpiryMinutes),
          acceptedPriceExpiryMinutes: sanitizeMinutes(
            merged.acceptedPriceExpiryMinutes,
          ),
          listingPriceExpiryMinutes: sanitizeMinutes(
            merged.listingPriceExpiryMinutes,
          ),
        };
      }
    }
  } catch (err) {
    console.warn("[DataFreshnessStore] Failed to load from localStorage:", err);
  }
  return DEFAULT_FRESHNESS_SETTINGS;
}

function sanitizeMinutes(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric);
}

function saveSettings(settings: DataFreshnessSettings) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
  } catch (err) {
    console.warn("[DataFreshnessStore] Failed to save to localStorage:", err);
  }
}

interface DataFreshnessStoreState extends DataFreshnessSettings {
  setCacheExpiryMinutes: (minutes: number) => void;
  setAcceptedPriceExpiryMinutes: (minutes: number) => void;
  setListingPriceExpiryMinutes: (minutes: number) => void;
  setFreshnessWarningsEnabled: (enabled: boolean) => void;
  resetDefaults: () => void;
}

export const useDataFreshnessStore = create<DataFreshnessStoreState>((set) => {
  const initial = loadSettings();

  return {
    ...initial,

    setCacheExpiryMinutes: (cacheExpiryMinutes) =>
      set((state) => {
        const next = {
          ...state,
          cacheExpiryMinutes: sanitizeMinutes(cacheExpiryMinutes),
        };
        saveSettings(next);
        return { cacheExpiryMinutes: next.cacheExpiryMinutes };
      }),

    setAcceptedPriceExpiryMinutes: (acceptedPriceExpiryMinutes) =>
      set((state) => {
        const next = {
          ...state,
          acceptedPriceExpiryMinutes: sanitizeMinutes(
            acceptedPriceExpiryMinutes,
          ),
        };
        saveSettings(next);
        return { acceptedPriceExpiryMinutes: next.acceptedPriceExpiryMinutes };
      }),

    setListingPriceExpiryMinutes: (listingPriceExpiryMinutes) =>
      set((state) => {
        const next = {
          ...state,
          listingPriceExpiryMinutes: sanitizeMinutes(listingPriceExpiryMinutes),
        };
        saveSettings(next);
        return { listingPriceExpiryMinutes: next.listingPriceExpiryMinutes };
      }),

    setFreshnessWarningsEnabled: (freshnessWarningsEnabled) =>
      set((state) => {
        const next = { ...state, freshnessWarningsEnabled };
        saveSettings(next);
        return { freshnessWarningsEnabled };
      }),

    resetDefaults: () =>
      set(() => {
        saveSettings(DEFAULT_FRESHNESS_SETTINGS);
        return { ...DEFAULT_FRESHNESS_SETTINGS };
      }),
  };
});
