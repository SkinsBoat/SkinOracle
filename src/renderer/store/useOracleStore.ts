import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SkinsnipeMarketId } from '../../shared/types';

export interface BuildPreFilters {
  excludeSouvenir: boolean;
  excludeStatTrak: boolean;
  excludeStickers: boolean;
  excludeCharms: boolean;
  excludeCases: boolean;
  excludeKeys: boolean;
  excludeMusicKits: boolean;
  excludeAgents: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  allowedWears: {
    fn: boolean;
    mw: boolean;
    ft: boolean;
    ww: boolean;
    bs: boolean;
    vanilla?: boolean;
  };
}

export interface OracleStrategyProfile {
  preset: 'conservative' | 'balanced' | 'aggressive' | 'custom';
  liquidityDepth: 'strict' | 'moderate' | 'broad';
  valuationMargin: 'conservative' | 'standard' | 'competitive';
  outlierProtection: 'strict' | 'standard' | 'permissive';
}

export interface NexusStrategyProfile {
  preset: 'capital_shield' | 'balanced' | 'aggressive' | 'custom';
  trendWindow: 7 | 14 | 30;
  downsideCut: 'strict' | 'standard' | 'light';
  volatilityFilter: 'strict' | 'standard' | 'permissive';
}

export type ListingStrategyMode = 'lowest' | 'average' | 'undercut' | 'markup';

export interface ListingPriceStrategy {
  mode: ListingStrategyMode;
  offsetPercent: number;
  ignoreOutliers: boolean;
  maxOutlierDiscountPercent: number;
}

export const DEFAULT_PRE_FILTERS: BuildPreFilters = {
  excludeSouvenir: false,
  excludeStatTrak: false,
  excludeStickers: false,
  excludeCharms: true,
  excludeCases: true,
  excludeKeys: true,
  excludeMusicKits: true,
  excludeAgents: true,
  allowedWears: {
    fn: true,
    mw: true,
    ft: true,
    ww: true,
    bs: true,
    vanilla: true,
  },
  minPrice: 0,
  maxPrice: 0
};

export const DEFAULT_STRATEGY_PROFILE: OracleStrategyProfile = {
  preset: 'balanced',
  liquidityDepth: 'moderate',
  valuationMargin: 'standard',
  outlierProtection: 'standard',
};

export const DEFAULT_NEXUS_PROFILE: NexusStrategyProfile = {
  preset: 'balanced',
  trendWindow: 14,
  downsideCut: 'standard',
  volatilityFilter: 'standard',
};

export const DEFAULT_LISTING_STRATEGY: ListingPriceStrategy = {
  mode: 'lowest',
  offsetPercent: 2.0,
  ignoreOutliers: true,
  maxOutlierDiscountPercent: 30.0,
};

export const DEFAULT_SELECTED_MARKETS: SkinsnipeMarketId[] = [
  'avanmarket',
  'csmoney_p2p',
  'csgofloat',
  'cstrade',
  'dmarket',
  'exeskins',
  'tradeitgg_store',
  'shadowpay',
  'skinland',
  'skinsmonkey',
  'skinswap',
  'waxpeer',
  'skinflow',
  'market_csgo',
  'lisskins',
];

interface OracleStoreState {
  selectedMarkets: SkinsnipeMarketId[];
  preFilters: BuildPreFilters;
  selectedEngine: 'standard' | 'nexus';
  strategyProfile: OracleStrategyProfile;
  nexusProfile: NexusStrategyProfile;
  listingStrategy: ListingPriceStrategy;

  setSelectedMarkets: (markets: SkinsnipeMarketId[]) => void;
  toggleMarket: (marketId: SkinsnipeMarketId) => void;
  soloMarket: (marketId: SkinsnipeMarketId) => void;
  selectAllMarkets: (allIds: SkinsnipeMarketId[]) => void;
  resetDefaultMarkets: () => void;

  setSelectedEngine: (engine: 'standard' | 'nexus') => void;

  setPreFilters: (filters: BuildPreFilters | ((prev: BuildPreFilters) => BuildPreFilters)) => void;
  toggleWear: (wearKey: keyof BuildPreFilters['allowedWears']) => void;
  resetPreFilters: () => void;

  setStrategyProfile: (profile: OracleStrategyProfile | ((prev: OracleStrategyProfile) => OracleStrategyProfile)) => void;
  setNexusProfile: (profile: NexusStrategyProfile | ((prev: NexusStrategyProfile) => NexusStrategyProfile)) => void;
  setListingStrategy: (strategy: ListingPriceStrategy | ((prev: ListingPriceStrategy) => ListingPriceStrategy)) => void;
}

export const useOracleStore = create<OracleStoreState>()(
  persist(
    (set) => ({
      selectedMarkets: DEFAULT_SELECTED_MARKETS,
      preFilters: DEFAULT_PRE_FILTERS,
      selectedEngine: 'standard',
      strategyProfile: DEFAULT_STRATEGY_PROFILE,
      nexusProfile: DEFAULT_NEXUS_PROFILE,
      listingStrategy: DEFAULT_LISTING_STRATEGY,

      setSelectedMarkets: (markets) => set({ selectedMarkets: markets }),
      toggleMarket: (marketId) =>
        set((state) => {
          if (state.selectedMarkets.includes(marketId)) {
            if (state.selectedMarkets.length === 1) return state;
            return { selectedMarkets: state.selectedMarkets.filter((m) => m !== marketId) };
          }
          return { selectedMarkets: [...state.selectedMarkets, marketId] };
        }),
      soloMarket: (marketId) => set({ selectedMarkets: [marketId] }),
      selectAllMarkets: (allIds) => set({ selectedMarkets: allIds }),
      resetDefaultMarkets: () => set({ selectedMarkets: DEFAULT_SELECTED_MARKETS }),

      setSelectedEngine: (engine) => set({ selectedEngine: engine }),

      setPreFilters: (filters) =>
        set((state) => ({
          preFilters: typeof filters === 'function' ? filters(state.preFilters) : filters,
        })),
      toggleWear: (wearKey) =>
        set((state) => ({
          preFilters: {
            ...state.preFilters,
            allowedWears: {
              ...state.preFilters.allowedWears,
              [wearKey]: !state.preFilters.allowedWears[wearKey],
            },
          },
        })),
      resetPreFilters: () => set({ preFilters: DEFAULT_PRE_FILTERS }),

      setStrategyProfile: (profile) =>
        set((state) => ({
          strategyProfile: typeof profile === 'function' ? profile(state.strategyProfile) : profile,
        })),
      setNexusProfile: (profile) =>
        set((state) => ({
          nexusProfile: typeof profile === 'function' ? profile(state.nexusProfile) : profile,
        })),
      setListingStrategy: (strategy) =>
        set((state) => ({
          listingStrategy: typeof strategy === 'function' ? strategy(state.listingStrategy) : strategy,
        })),
    }),
    {
      name: 'oracle_dashboard_store',
    }
  )
);
