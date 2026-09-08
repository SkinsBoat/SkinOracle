import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SkinsnipeMarketId } from "../../shared/types";
import { DEFAULT_CS2CAP_PROVIDERS } from "../../shared/cs2capProviders";

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
  preset: "conservative" | "balanced" | "aggressive" | "custom";
  liquidityDepth: "strict" | "moderate" | "broad";
  valuationMargin: "conservative" | "standard" | "competitive";
  outlierProtection: "strict" | "standard" | "permissive";
}

export interface NexusStrategyProfile {
  preset: "capital_shield" | "balanced" | "aggressive" | "custom";
  trendWindow: 7 | 14 | 30;
  downsideCut: "strict" | "standard" | "light";
  volatilityFilter: "strict" | "standard" | "permissive";
}

export type ListingStrategyMode = "lowest" | "average" | "undercut" | "markup";

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
  maxPrice: 0,
};

export const DEFAULT_STRATEGY_PROFILE: OracleStrategyProfile = {
  preset: "balanced",
  liquidityDepth: "moderate",
  valuationMargin: "standard",
  outlierProtection: "standard",
};

export const DEFAULT_NEXUS_PROFILE: NexusStrategyProfile = {
  preset: "balanced",
  trendWindow: 14,
  downsideCut: "standard",
  volatilityFilter: "standard",
};

export const DEFAULT_LISTING_STRATEGY: ListingPriceStrategy = {
  mode: "lowest",
  offsetPercent: 2.0,
  ignoreOutliers: true,
  maxOutlierDiscountPercent: 30.0,
};

export const DEFAULT_SELECTED_MARKETS: SkinsnipeMarketId[] = [
  "avanmarket",
  "csmoney_p2p",
  "csgofloat",
  "cstrade",
  "dmarket",
  "exeskins",
  "tradeitgg_store",
  "shadowpay",
  "skinland",
  "skinsmonkey",
  "skinswap",
  "waxpeer",
  "skinflow",
  "market_csgo",
  "lisskins",
];

interface OracleStoreState {
  pricingProvider: "skinsnipe" | "cs2cap";
  selectedMarkets: SkinsnipeMarketId[];
  selectedCs2capProviders: string[];
  preFilters: BuildPreFilters;
  selectedEngine: "standard" | "nexus";
  strategyProfile: OracleStrategyProfile;
  nexusProfile: NexusStrategyProfile;
  listingStrategy: ListingPriceStrategy;

  setPricingProvider: (provider: "skinsnipe" | "cs2cap") => void;
  setSelectedMarkets: (markets: SkinsnipeMarketId[]) => void;
  toggleMarket: (marketId: SkinsnipeMarketId) => void;
  soloMarket: (marketId: SkinsnipeMarketId) => void;
  selectAllMarkets: (allIds: SkinsnipeMarketId[]) => void;
  resetDefaultMarkets: () => void;

  setSelectedCs2capProviders: (providers: string[]) => void;
  toggleCs2capProvider: (providerId: string) => void;
  soloCs2capProvider: (providerId: string) => void;
  selectAllCs2capProviders: () => void;
  resetDefaultCs2capProviders: () => void;

  setSelectedEngine: (engine: "standard" | "nexus") => void;

  setPreFilters: (
    filters: BuildPreFilters | ((prev: BuildPreFilters) => BuildPreFilters),
  ) => void;
  toggleWear: (wearKey: keyof BuildPreFilters["allowedWears"]) => void;
  resetPreFilters: () => void;

  setStrategyProfile: (
    profile:
      | OracleStrategyProfile
      | ((prev: OracleStrategyProfile) => OracleStrategyProfile),
  ) => void;
  setNexusProfile: (
    profile:
      | NexusStrategyProfile
      | ((prev: NexusStrategyProfile) => NexusStrategyProfile),
  ) => void;
  setListingStrategy: (
    strategy:
      | ListingPriceStrategy
      | ((prev: ListingPriceStrategy) => ListingPriceStrategy),
  ) => void;
}

export const useOracleStore = create<OracleStoreState>()(
  persist(
    (set) => ({
      pricingProvider: "skinsnipe",
      selectedMarkets: DEFAULT_SELECTED_MARKETS,
      selectedCs2capProviders: DEFAULT_CS2CAP_PROVIDERS,
      preFilters: DEFAULT_PRE_FILTERS,
      selectedEngine: "standard",
      strategyProfile: DEFAULT_STRATEGY_PROFILE,
      nexusProfile: DEFAULT_NEXUS_PROFILE,
      listingStrategy: DEFAULT_LISTING_STRATEGY,

      setPricingProvider: (provider) => set({ pricingProvider: provider }),
      setSelectedMarkets: (markets) => set({ selectedMarkets: markets }),
      toggleMarket: (marketId) =>
        set((state) => {
          if (state.selectedMarkets.includes(marketId)) {
            if (state.selectedMarkets.length === 1) return state;
            return {
              selectedMarkets: state.selectedMarkets.filter(
                (m) => m !== marketId,
              ),
            };
          }
          return { selectedMarkets: [...state.selectedMarkets, marketId] };
        }),
      soloMarket: (marketId) => set({ selectedMarkets: [marketId] }),
      selectAllMarkets: (allIds) => set({ selectedMarkets: allIds }),
      resetDefaultMarkets: () =>
        set({ selectedMarkets: DEFAULT_SELECTED_MARKETS }),

      setSelectedCs2capProviders: (providers) =>
        set({ selectedCs2capProviders: providers }),
      toggleCs2capProvider: (providerId) =>
        set((state) => {
          if (state.selectedCs2capProviders.includes(providerId)) {
            if (state.selectedCs2capProviders.length === 1) return state;
            return {
              selectedCs2capProviders: state.selectedCs2capProviders.filter(
                (p) => p !== providerId,
              ),
            };
          }
          return {
            selectedCs2capProviders: [
              ...state.selectedCs2capProviders,
              providerId,
            ],
          };
        }),
      soloCs2capProvider: (providerId) =>
        set({ selectedCs2capProviders: [providerId] }),
      selectAllCs2capProviders: () =>
        set({ selectedCs2capProviders: DEFAULT_CS2CAP_PROVIDERS }),
      resetDefaultCs2capProviders: () =>
        set({ selectedCs2capProviders: DEFAULT_CS2CAP_PROVIDERS }),

      setSelectedEngine: (engine) => set({ selectedEngine: engine }),

      setPreFilters: (filters) =>
        set((state) => ({
          preFilters:
            typeof filters === "function" ? filters(state.preFilters) : filters,
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
          strategyProfile:
            typeof profile === "function"
              ? profile(state.strategyProfile)
              : profile,
        })),
      setNexusProfile: (profile) =>
        set((state) => ({
          nexusProfile:
            typeof profile === "function"
              ? profile(state.nexusProfile)
              : profile,
        })),
      setListingStrategy: (strategy) =>
        set((state) => ({
          listingStrategy:
            typeof strategy === "function"
              ? strategy(state.listingStrategy)
              : strategy,
        })),
    }),
    {
      name: "oracle_dashboard_store",
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (!persistedState || typeof persistedState !== "object") {
          return persistedState;
        }
        if (
          version < 2 ||
          !Array.isArray(persistedState.selectedCs2capProviders)
        ) {
          persistedState.selectedCs2capProviders = DEFAULT_CS2CAP_PROVIDERS;
        } else {
          const validSet = new Set(DEFAULT_CS2CAP_PROVIDERS);
          const filtered = persistedState.selectedCs2capProviders.filter(
            (p: string) => validSet.has(p),
          );
          persistedState.selectedCs2capProviders =
            filtered.length > 0 ? filtered : DEFAULT_CS2CAP_PROVIDERS;
        }
        return persistedState;
      },
    },
  ),
);
