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

import {
  OracleStrategyProfile,
  NexusStrategyProfile,
  ProfitOverridePolicy,
} from "../../shared/types/oracle.types";

export type {
  OracleStrategyProfile,
  NexusStrategyProfile,
  ProfitOverridePolicy,
};

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

/**
 * Front-end profit override defaults. Disabled by default so out-of-the-box
 * buy ceilings are pure Oracle values; the trader opts in explicitly.
 */
export const DEFAULT_PROFIT_OVERRIDE_POLICY: ProfitOverridePolicy = {
  enabled: false,
  mode: "off",
  bidAdjustmentPercent: 0,
  wearAdjustments: {
    fn: 0,
    mw: 0,
    ft: 0,
    ww: 0,
    bs: 0,
    vanilla: 0,
    stattrak: 0,
    souvenir: 0,
  },
  sssAdjustments: { prime: 0, solid: 0, moderate: 0, thin: 0 },
};

export const DEFAULT_SELECTED_MARKETS: SkinsnipeMarketId[] = [
  "avanmarket",
  "csmoney_p2p",
  "csgofloat",
  "dmarket",
  "exeskins",
  "tradeitgg_store",
  "shadowpay",
  "skinland",
  "skinswap",
  "waxpeer",
  "skinflow",
  "market_csgo",
  "lisskins",
];

/**
 * Market Scope presets.
 *
 * A trader needs two different market sets:
 *  - `baseline` (wide, 8–15 stable cash markets) → used when scanning to
 *    calculate accepted prices (buy ceilings).
 *  - `snipe` (narrow, execution venues) → used for live refresh when hunting
 *    SoClose deals.
 *
 * The two provider pipelines (Skinsnipe, CS2Cap) expose partially different
 * market ids, so each pipeline keeps its own independent pair of presets.
 */
export type MarketScope = "baseline" | "snipe";

export interface MarketScopePresets<T> {
  baseline: T[];
  snipe: T[];
}

export const DEFAULT_SKINSNIPE_SNIPE_MARKETS: SkinsnipeMarketId[] = [
  "csgofloat",
  "dmarket",
];

export const DEFAULT_CS2CAP_SNIPE_MARKETS: string[] = ["csfloat", "dmarket"];

export const DEFAULT_SKINSNIPE_SCOPES: MarketScopePresets<SkinsnipeMarketId> = {
  baseline: DEFAULT_SELECTED_MARKETS,
  snipe: DEFAULT_SKINSNIPE_SNIPE_MARKETS,
};

export const DEFAULT_CS2CAP_SCOPES: MarketScopePresets<string> = {
  baseline: DEFAULT_CS2CAP_PROVIDERS,
  snipe: DEFAULT_CS2CAP_SNIPE_MARKETS,
};

interface OracleStoreState {
  pricingProvider: "skinsnipe" | "cs2cap";
  selectedMarkets: SkinsnipeMarketId[];
  selectedCs2capProviders: string[];
  activeScope: MarketScope;
  skinsnipeScopes: MarketScopePresets<SkinsnipeMarketId>;
  cs2capScopes: MarketScopePresets<string>;
  preFilters: BuildPreFilters;
  blockedSkins: string[];
  selectedEngine: "standard" | "nexus";
  strategyProfile: OracleStrategyProfile;
  nexusProfile: NexusStrategyProfile;
  profitOverride: ProfitOverridePolicy;
  /** Advanced/opt-in visibility for the Profit Override section. */
  showProfitOverride: boolean;
  setShowProfitOverride: (visible: boolean) => void;
  listingStrategy: ListingPriceStrategy;
  hideTradeMarkets: boolean;
  setHideTradeMarkets: (hide: boolean | ((prev: boolean) => boolean)) => void;

  setPricingProvider: (provider: "skinsnipe" | "cs2cap") => void;
  setActiveScope: (scope: MarketScope) => void;
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

  blockSkin: (name: string) => void;
  unblockSkin: (name: string) => void;
  clearBlockedSkins: () => void;

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
  setProfitOverride: (
    policy:
      | ProfitOverridePolicy
      | ((prev: ProfitOverridePolicy) => ProfitOverridePolicy),
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
      pricingProvider: "cs2cap",
      selectedMarkets: DEFAULT_SELECTED_MARKETS,
      selectedCs2capProviders: DEFAULT_CS2CAP_PROVIDERS,
      activeScope: "baseline" as MarketScope,
      skinsnipeScopes: DEFAULT_SKINSNIPE_SCOPES,
      cs2capScopes: DEFAULT_CS2CAP_SCOPES,
      preFilters: DEFAULT_PRE_FILTERS,
      blockedSkins: [],
      selectedEngine: "standard",
      strategyProfile: DEFAULT_STRATEGY_PROFILE,
      nexusProfile: DEFAULT_NEXUS_PROFILE,
      profitOverride: DEFAULT_PROFIT_OVERRIDE_POLICY,
      showProfitOverride: false,
      listingStrategy: DEFAULT_LISTING_STRATEGY,
      hideTradeMarkets: false,

      setPricingProvider: (provider) => set({ pricingProvider: provider }),
      setHideTradeMarkets: (hide) =>
        set((state) => ({
          hideTradeMarkets:
            typeof hide === "function" ? hide(state.hideTradeMarkets) : hide,
        })),

      setActiveScope: (scope) =>
        set((state) => ({
          activeScope: scope,
          selectedMarkets:
            state.skinsnipeScopes?.[scope] ?? state.selectedMarkets,
          selectedCs2capProviders:
            state.cs2capScopes?.[scope] ?? state.selectedCs2capProviders,
        })),

      setSelectedMarkets: (markets) =>
        set((state) => ({
          selectedMarkets: markets,
          skinsnipeScopes: {
            ...state.skinsnipeScopes,
            [state.activeScope]: markets,
          },
        })),
      toggleMarket: (marketId) =>
        set((state) => {
          const current =
            state.skinsnipeScopes?.[state.activeScope] ?? state.selectedMarkets;
          if (current.includes(marketId)) {
            if (current.length === 1) return state;
            const next = current.filter((m) => m !== marketId);
            return {
              selectedMarkets: next,
              skinsnipeScopes: {
                ...state.skinsnipeScopes,
                [state.activeScope]: next,
              },
            };
          }
          const next = [...current, marketId];
          return {
            selectedMarkets: next,
            skinsnipeScopes: {
              ...state.skinsnipeScopes,
              [state.activeScope]: next,
            },
          };
        }),
      soloMarket: (marketId) =>
        set((state) => ({
          selectedMarkets: [marketId],
          skinsnipeScopes: {
            ...state.skinsnipeScopes,
            [state.activeScope]: [marketId],
          },
        })),
      selectAllMarkets: (allIds) =>
        set((state) => ({
          selectedMarkets: allIds,
          skinsnipeScopes: {
            ...state.skinsnipeScopes,
            [state.activeScope]: allIds,
          },
        })),
      resetDefaultMarkets: () =>
        set((state) => {
          const defaults =
            state.activeScope === "snipe"
              ? DEFAULT_SKINSNIPE_SNIPE_MARKETS
              : DEFAULT_SELECTED_MARKETS;
          return {
            selectedMarkets: defaults,
            skinsnipeScopes: {
              ...state.skinsnipeScopes,
              [state.activeScope]: defaults,
            },
          };
        }),

      setSelectedCs2capProviders: (providers) =>
        set((state) => ({
          selectedCs2capProviders: providers,
          cs2capScopes: {
            ...state.cs2capScopes,
            [state.activeScope]: providers,
          },
        })),
      toggleCs2capProvider: (providerId) =>
        set((state) => {
          const current =
            state.cs2capScopes?.[state.activeScope] ??
            state.selectedCs2capProviders;
          if (current.includes(providerId)) {
            if (current.length === 1) return state;
            const next = current.filter((p) => p !== providerId);
            return {
              selectedCs2capProviders: next,
              cs2capScopes: {
                ...state.cs2capScopes,
                [state.activeScope]: next,
              },
            };
          }
          const next = [...current, providerId];
          return {
            selectedCs2capProviders: next,
            cs2capScopes: {
              ...state.cs2capScopes,
              [state.activeScope]: next,
            },
          };
        }),
      soloCs2capProvider: (providerId) =>
        set((state) => ({
          selectedCs2capProviders: [providerId],
          cs2capScopes: {
            ...state.cs2capScopes,
            [state.activeScope]: [providerId],
          },
        })),
      selectAllCs2capProviders: () =>
        set((state) => ({
          selectedCs2capProviders: DEFAULT_CS2CAP_PROVIDERS,
          cs2capScopes: {
            ...state.cs2capScopes,
            [state.activeScope]: DEFAULT_CS2CAP_PROVIDERS,
          },
        })),
      resetDefaultCs2capProviders: () =>
        set((state) => {
          const defaults =
            state.activeScope === "snipe"
              ? DEFAULT_CS2CAP_SNIPE_MARKETS
              : DEFAULT_CS2CAP_PROVIDERS;
          return {
            selectedCs2capProviders: defaults,
            cs2capScopes: {
              ...state.cs2capScopes,
              [state.activeScope]: defaults,
            },
          };
        }),

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

      blockSkin: (name) =>
        set((state) => {
          const trimmed = name.trim();
          if (!trimmed || state.blockedSkins.includes(trimmed)) return state;
          return { blockedSkins: [...state.blockedSkins, trimmed] };
        }),
      unblockSkin: (name) =>
        set((state) => ({
          blockedSkins: state.blockedSkins.filter((s) => s !== name),
        })),
      clearBlockedSkins: () => set({ blockedSkins: [] }),

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
      setProfitOverride: (policy) =>
        set((state) => ({
          profitOverride:
            typeof policy === "function"
              ? policy(state.profitOverride)
              : policy,
        })),
      setShowProfitOverride: (visible) =>
        set({ showProfitOverride: visible }),
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
      version: 8,
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
        if (typeof persistedState.hideTradeMarkets !== "boolean") {
          persistedState.hideTradeMarkets = false;
        }
        // v4: initialize blocked skins list
        if (!Array.isArray(persistedState.blockedSkins)) {
          persistedState.blockedSkins = [];
        }

        // v5: Market Scope presets. Preserve the trader's existing market
        // selection as their wide Baseline, and seed a narrow Snipe scope so
        // the fast wide/narrow switch works out of the box.
        if (
          !persistedState.skinsnipeScopes ||
          !Array.isArray(persistedState.skinsnipeScopes.baseline) ||
          !Array.isArray(persistedState.skinsnipeScopes.snipe)
        ) {
          const baseline =
            Array.isArray(persistedState.selectedMarkets) &&
            persistedState.selectedMarkets.length > 0
              ? persistedState.selectedMarkets
              : DEFAULT_SELECTED_MARKETS;
          persistedState.skinsnipeScopes = {
            baseline,
            snipe: [...DEFAULT_SKINSNIPE_SNIPE_MARKETS],
          };
        }
        if (
          !persistedState.cs2capScopes ||
          !Array.isArray(persistedState.cs2capScopes.baseline) ||
          !Array.isArray(persistedState.cs2capScopes.snipe)
        ) {
          const baseline =
            Array.isArray(persistedState.selectedCs2capProviders) &&
            persistedState.selectedCs2capProviders.length > 0
              ? persistedState.selectedCs2capProviders
              : DEFAULT_CS2CAP_PROVIDERS;
          persistedState.cs2capScopes = {
            baseline,
            snipe: [...DEFAULT_CS2CAP_SNIPE_MARKETS],
          };
        }
        if (
          persistedState.activeScope !== "baseline" &&
          persistedState.activeScope !== "snipe"
        ) {
          persistedState.activeScope = "baseline";
        }

        // v6: front-end profit override policy. Default to disabled so an
        // upgraded install keeps pure Oracle buy ceilings until the trader
        // opts in.
        if (
          !persistedState.profitOverride ||
          typeof persistedState.profitOverride !== "object"
        ) {
          persistedState.profitOverride = DEFAULT_PROFIT_OVERRIDE_POLICY;
        }

        // v7: SSS buckets were renamed from liquidity-flavored keys
        // (hyper/high/medium/low) to stability levels (prime/solid/
        // moderate/thin). SSS is a supply-stability measure, not liquidity.
        const sss = persistedState.profitOverride?.sssAdjustments;
        if (sss) {
          persistedState.profitOverride.sssAdjustments = {
            prime: sss.prime ?? sss.hyper ?? 0,
            solid: sss.solid ?? sss.high ?? 0,
            moderate: sss.moderate ?? sss.medium ?? 0,
            thin: sss.thin ?? sss.low ?? 0,
          };
        }

        // v8: advanced Profit Override section is opt-in (hidden by default).
        if (typeof persistedState.showProfitOverride !== "boolean") {
          persistedState.showProfitOverride = false;
        }
        return persistedState;
      },
    },
  ),
);
