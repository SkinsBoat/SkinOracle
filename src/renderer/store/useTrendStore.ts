import { create } from "zustand";

export interface TrendHistoryEntry {
  labels: string[];
  overallAverages: number[];
}

interface TrendStoreState {
  trendHistoryMap: Record<string, TrendHistoryEntry>;
  fetchHistoryBatch: (itemNames: string[], days?: number) => Promise<void>;
  clearCache: () => void;
}

/**
 * useTrendStore
 * Global reactive Zustand store caching 14-day price trend snapshots from local SQLite.
 * Allows any market workstation (CSFloat, Skins.com, DMarket, Oracle) or card component
 * to access and batch-fetch historical price trajectories with zero duplication.
 */
const MAX_TREND_CACHE_ITEMS = 2000;

function pruneCache(
  map: Record<string, TrendHistoryEntry>,
  max: number,
): Record<string, TrendHistoryEntry> {
  const keys = Object.keys(map);
  if (keys.length <= max) return map;
  const toRemove = keys.length - max;
  const pruned: Record<string, TrendHistoryEntry> = {};
  for (let i = toRemove; i < keys.length; i++) {
    pruned[keys[i]] = map[keys[i]];
  }
  return pruned;
}

const inFlight = new Set<string>();
const pendingItems = new Set<string>();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useTrendStore = create<TrendStoreState>((set, get) => {
  const flushBatch = async (days: number = 14) => {
    if (!window.electronAPI?.trendStore?.getHistoryBatch) {
      pendingItems.clear();
      return;
    }

    const itemsToFetch = Array.from(pendingItems);
    pendingItems.clear();

    if (itemsToFetch.length === 0) return;

    itemsToFetch.forEach((name) => inFlight.add(name));

    try {
      // Chunk queries to SQLite in batches of 200 items
      const chunkSize = 200;
      for (let i = 0; i < itemsToFetch.length; i += chunkSize) {
        const chunk = itemsToFetch.slice(i, i + chunkSize);
        const history = await window.electronAPI.trendStore.getHistoryBatch(
          chunk,
          days,
        );
        if (history && Object.keys(history).length > 0) {
          set((state) => {
            const merged = { ...state.trendHistoryMap, ...history };
            return {
              trendHistoryMap: pruneCache(merged, MAX_TREND_CACHE_ITEMS),
            };
          });
        } else {
          set((state) => {
            const emptyEntries: Record<string, TrendHistoryEntry> = {};
            chunk.forEach((c) => {
              emptyEntries[c] = { labels: [], overallAverages: [] };
            });
            const merged = { ...state.trendHistoryMap, ...emptyEntries };
            return {
              trendHistoryMap: pruneCache(merged, MAX_TREND_CACHE_ITEMS),
            };
          });
        }
      }
    } catch (err) {
      console.warn("[useTrendStore] Failed to fetch trend history batch:", err);
    } finally {
      itemsToFetch.forEach((name) => inFlight.delete(name));
    }
  };

  return {
    trendHistoryMap: {},

    fetchHistoryBatch: async (itemNames: string[], days: number = 14) => {
      const currentMap = get().trendHistoryMap;
      const missing = itemNames.filter(
        (name) =>
          Boolean(name) &&
          !currentMap[name] &&
          !inFlight.has(name) &&
          !pendingItems.has(name),
      );

      if (missing.length === 0) return;

      missing.forEach((name) => pendingItems.add(name));

      // If large batch (e.g. from tab sync), flush sooner, otherwise debounce to group mounting components
      if (pendingItems.size >= 50) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = null;
        flushBatch(days);
      } else {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          flushBatch(days);
        }, 40);
      }
    },

    clearCache: () => {
      inFlight.clear();
      pendingItems.clear();
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = null;
      set({ trendHistoryMap: {} });
    },
  };
});
