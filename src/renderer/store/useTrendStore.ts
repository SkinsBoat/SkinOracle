import { create } from 'zustand';

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

function pruneCache(map: Record<string, TrendHistoryEntry>, max: number): Record<string, TrendHistoryEntry> {
  const keys = Object.keys(map);
  if (keys.length <= max) return map;
  const toRemove = keys.length - max;
  const pruned: Record<string, TrendHistoryEntry> = {};
  for (let i = toRemove; i < keys.length; i++) {
    pruned[keys[i]] = map[keys[i]];
  }
  return pruned;
}

export const useTrendStore = create<TrendStoreState>((set, get) => ({
  trendHistoryMap: {},

  fetchHistoryBatch: async (itemNames: string[], days: number = 14) => {
    if (!window.electronAPI?.trendStore?.getHistoryBatch) return;

    const currentMap = get().trendHistoryMap;
    // Filter to unique valid names that aren't already cached
    const missing = Array.from(
      new Set(itemNames.filter(name => Boolean(name) && !currentMap[name]))
    );

    if (missing.length === 0) return;

    try {
      // Chunk queries to SQLite in batches of 200 items
      const chunkSize = 200;
      for (let i = 0; i < missing.length; i += chunkSize) {
        const chunk = missing.slice(i, i + chunkSize);
        const history = await window.electronAPI.trendStore.getHistoryBatch(chunk, days);
        if (history && Object.keys(history).length > 0) {
          set(state => {
            const merged = { ...state.trendHistoryMap, ...history };
            return {
              trendHistoryMap: pruneCache(merged, MAX_TREND_CACHE_ITEMS),
            };
          });
        }
      }
    } catch (err) {
      console.warn('[useTrendStore] Failed to fetch trend history batch:', err);
    }
  },

  clearCache: () => set({ trendHistoryMap: {} }),
}));
