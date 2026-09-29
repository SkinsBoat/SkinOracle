import React from "react";
import {
  Radio,
  Loader2,
  FileUp,
  Sparkles,
  AlertTriangle,
  RotateCw,
  Check,
  AlertCircle,
  Square,
  Info,
  Layers,
} from "lucide-react";
import { skinSnipeLogo } from "../../../../../../assets/images";
import { MarketLogo } from "../../../../components/MarketLogo";
import { SkinsnipeMarketId } from "../../../../../shared/types";
import { isTradeMarket } from "../../../../../shared/canonicalMarkets";
import { SKINSNIPE_AVAILABLE_MARKETS } from "./skinsnipeMarkets";
import {
  MarketSelectionChip,
  MarketSelectionToolbar,
  MarketScopeToggle,
  CacheStatusInfo,
} from "./Step1Common";
import {
  step1Styles,
  getProgressPanelStyle,
  getProgressBarFillStyle,
} from "./step1Styles";
import {
  MarketScope,
  MarketScopePresets,
} from "../../../../store/useOracleStore";
import { Step1CacheStatus } from "./types";

export interface SkinsnipeProviderPanelProps {
  cacheStatus: Step1CacheStatus;
  hasApiKey: boolean;
  isDemoCache?: boolean;
  selectedMarkets: SkinsnipeMarketId[];
  onToggleMarket: (marketId: SkinsnipeMarketId) => void;
  onSoloMarket: (marketId: SkinsnipeMarketId) => void;
  onSelectAllMarkets?: (markets?: SkinsnipeMarketId[]) => void;
  onDeselectAllMarkets: () => void;
  onFetchPrices: () => void;
  onUploadJsonCache: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadDemoCache: (forceRefresh?: boolean) => void;
  onCancelFetch: () => void;
  fetchProgress: any;
  isBatchEvaluating: boolean;
  hideTradeMarkets: boolean;
  setHideTradeMarkets: (hide: boolean) => void;
  activeScope: MarketScope;
  onSelectScope: (scope: MarketScope) => void;
  skinsnipeScopes?: MarketScopePresets<SkinsnipeMarketId>;
  getMarketCount: (marketId: string) => number;
  getMissingQtyForMarket: (marketId: string) => number;
}

export const SkinsnipeProviderPanel: React.FC<SkinsnipeProviderPanelProps> = ({
  cacheStatus,
  hasApiKey,
  isDemoCache,
  selectedMarkets,
  onToggleMarket,
  onSoloMarket,
  onSelectAllMarkets,
  onDeselectAllMarkets,
  onFetchPrices,
  onUploadJsonCache,
  onLoadDemoCache,
  onCancelFetch,
  fetchProgress,
  isBatchEvaluating,
  hideTradeMarkets,
  setHideTradeMarkets,
  activeScope,
  onSelectScope,
  skinsnipeScopes,
  getMarketCount,
  getMissingQtyForMarket,
}) => {
  const skinsnipeTradeCount = SKINSNIPE_AVAILABLE_MARKETS.filter((m) =>
    isTradeMarket(m.id),
  ).length;

  const visibleSelectedMarketsCount = hideTradeMarkets
    ? selectedMarkets.filter((m) => !isTradeMarket(m)).length
    : selectedMarkets.length;

  const handleSelectAllMarkets = () => {
    const marketsToSelect = hideTradeMarkets
      ? SKINSNIPE_AVAILABLE_MARKETS.filter((m) => !isTradeMarket(m.id)).map(
          (m) => m.id,
        )
      : SKINSNIPE_AVAILABLE_MARKETS.map((m) => m.id);
    onSelectAllMarkets?.(marketsToSelect);
  };

  const estimatedFetchSeconds = Math.max(0, (selectedMarkets.length - 1) * 32);

  return (
    <div>
      {/* Provider Header */}
      <div style={step1Styles.providerHeader}>
        <div>
          <div style={step1Styles.providerHeaderTitleGroup}>
            <img
              src={skinSnipeLogo}
              alt="Skinsnipe"
              style={step1Styles.providerHeaderLogo}
            />
            <h2 style={step1Styles.providerHeaderTitle}>Skinsnipe</h2>
            <span className="badge" style={step1Styles.skinsnipeStdBadge}>
              STD PLAN
            </span>
          </div>
          {!hasApiKey && (
            <p style={step1Styles.skinsnipeHeaderDescription}>
              Skinsnipe acts as a multi-market price aggregator for CS2 items. To
              fetch live market data directly from your device,{" "}
              <span style={step1Styles.whiteSpaceNowrap}>
                a <strong>Skinsnipe Standard Plan</strong>
              </span>{" "}
              API key is required.
            </p>
          )}
        </div>
      </div>

      {/* Dedicated Skinsnipe Market Selection Section */}
      <div style={step1Styles.configSectionCard}>
        <MarketScopeToggle
          activeScope={activeScope}
          onSelectScope={onSelectScope}
          baselineCount={skinsnipeScopes?.baseline?.length ?? 0}
          snipeCount={skinsnipeScopes?.snipe?.length ?? 0}
          accentColor="var(--so-primary)"
        />

        <MarketSelectionToolbar
          title="Skinsnipe Target Markets Config"
          selectedCount={visibleSelectedMarketsCount}
          totalCount={SKINSNIPE_AVAILABLE_MARKETS.length}
          itemTypeLabel="Markets"
          tradeCount={skinsnipeTradeCount}
          hideTradeMarkets={hideTradeMarkets}
          onToggleHideTrade={setHideTradeMarkets}
          onSelectAll={handleSelectAllMarkets}
          onResetOrDeselect={onDeselectAllMarkets}
          resetLabel="Reset Scope"
          accentColor="var(--so-primary)"
          badgeClassName="badge-cyan"
          badgeTextColor="#38bdf8"
          badgeBorderColor="rgba(56, 189, 248, 0.4)"
        />

        <p style={step1Styles.configSectionDescription}>
          Choose which of Skinsnipe's {SKINSNIPE_AVAILABLE_MARKETS.length} markets
          to query during live fetches. Preferences are saved automatically.
        </p>

        {/* Interactive Market Chips Grid */}
        <div style={step1Styles.marketChipsGrid}>
          {(hideTradeMarkets
            ? SKINSNIPE_AVAILABLE_MARKETS.filter((m) => !isTradeMarket(m.id))
            : SKINSNIPE_AVAILABLE_MARKETS
          ).map((market) => (
            <MarketSelectionChip
              key={market.id}
              id={market.id}
              name={market.name}
              isSelected={selectedMarkets.includes(market.id)}
              onToggle={onToggleMarket}
              onSolo={onSoloMarket}
              isTrade={isTradeMarket(market.id)}
              marketCount={getMarketCount(market.id)}
              missingQtyCount={getMissingQtyForMarket(market.id)}
              accentColor="var(--so-primary)"
            />
          ))}
        </div>

        <div style={step1Styles.estimatedCycleText}>
          <Layers size={14} />
          Estimated fetch cycle: ~{Math.floor(estimatedFetchSeconds / 60)}m{" "}
          {estimatedFetchSeconds % 60}s
        </div>

        <div style={step1Styles.brandDisclaimer}>
          <Info size={13} style={step1Styles.brandDisclaimerIcon} />
          <span>
            All brand logos and names are property of their respective owners.
            SkinOracle is an independent tool and is not affiliated with,
            endorsed, or sponsored by any listed marketplace.
          </span>
        </div>
      </div>

      {/* Skinsnipe Fetch & Local Cache Loading Controls */}
      <div style={step1Styles.fetchControlsGroup}>
        {hasApiKey && (
          <button
            className="btn btn-primary"
            onClick={onFetchPrices}
            disabled={cacheStatus.isFetching || isBatchEvaluating}
          >
            {cacheStatus.isFetching ? (
              <>
                <Loader2 size={16} className="spin" /> Scanning Skinsnipe
                Prices...
              </>
            ) : (
              <>
                <Radio size={16} /> Scan {selectedMarkets.length} Skinsnipe
                Markets
              </>
            )}
          </button>
        )}

        {import.meta.env.DEV && (
          <label
            className="btn btn-cyan"
            style={step1Styles.uploadJsonLabel}
            title="Import an offline JSON price cache file"
          >
            <FileUp size={16} /> Load Cache JSON File
            <input
              type="file"
              accept=".json"
              onChange={onUploadJsonCache}
              style={step1Styles.hiddenInput}
            />
          </label>
        )}

        {!hasApiKey && (
          <div style={step1Styles.demoCacheGroup}>
            <button
              type="button"
              className="btn"
              onClick={() => onLoadDemoCache(false)}
              disabled={cacheStatus.isFetching || isBatchEvaluating}
              style={step1Styles.loadDemoButton}
              title="Load demo historical dataset for offline simulation"
            >
              <Sparkles size={15} /> Load Demo Cache (Offline Simulation)
            </button>

            {isDemoCache && cacheStatus.itemCount > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onLoadDemoCache(true)}
                disabled={cacheStatus.isFetching || isBatchEvaluating}
                style={step1Styles.reloadDemoButton}
                title="Re-download latest demo price dataset from SaaS cloud"
              >
                <RotateCw size={13} /> Re-download from Cloud
              </button>
            )}
          </div>
        )}

        <CacheStatusInfo
          itemCount={cacheStatus.itemCount}
          lastFetchedAt={cacheStatus.lastFetchedAt}
          style={step1Styles.cacheStatusOffset}
        />
      </div>

      {/* Demo Cache Warning Alert Box */}
      {isDemoCache && (
        <div style={step1Styles.demoAlertBox}>
          <AlertTriangle size={24} style={step1Styles.demoAlertIcon} />
          <div>
            <div style={step1Styles.demoAlertTitle}>
              ⚠️ DEMO PRICE CACHE ACTIVE (HISTORICAL DATA — TESTING ONLY)
            </div>
            <div style={step1Styles.demoAlertBody}>
              ⚠️ Price Cache Loaded (Offline Mode) This cache contains sample
              historical price data intended for offline testing and workflow
              simulation only. 🔴 WARNING: Do NOT use this data for live trading,
              automated strategies, or real order execution.
            </div>
          </div>
        </div>
      )}

      {/* Live Fetching Progress & Error Tracking Panel */}
      {fetchProgress && (
        <div
          style={getProgressPanelStyle(
            Boolean(
              fetchProgress.criticalError || fetchProgress.status === "aborted",
            ),
          )}
        >
          <div style={step1Styles.progressHeader}>
            <div style={step1Styles.progressStatusText}>
              {fetchProgress.status === "fetching" ? (
                <>
                  <Loader2
                    size={16}
                    className="spin"
                    style={step1Styles.primaryIcon}
                  />
                  Scanning Market {fetchProgress.currentMarketIndex} of{" "}
                  {fetchProgress.totalMarkets}:
                  <span style={step1Styles.progressCurrentMarketPrimary}>
                    <MarketLogo
                      marketId={fetchProgress.currentMarket}
                      size={15}
                    />
                    {SKINSNIPE_AVAILABLE_MARKETS.find(
                      (m) => m.id === fetchProgress.currentMarket,
                    )?.name || fetchProgress.currentMarket}
                  </span>
                </>
              ) : fetchProgress.status === "waiting" ? (
                <>
                  <RotateCw
                    size={16}
                    className="spin"
                    style={step1Styles.cyanTextIcon}
                  />
                  Rate-Limit Cooldown: Scanning{" "}
                  <span style={step1Styles.progressCurrentMarketCyan}>
                    <MarketLogo
                      marketId={fetchProgress.currentMarket}
                      size={15}
                    />
                    {SKINSNIPE_AVAILABLE_MARKETS.find(
                      (m) => m.id === fetchProgress.currentMarket,
                    )?.name || fetchProgress.currentMarket}
                  </span>{" "}
                  in{" "}
                  <span style={step1Styles.progressRemainingSeconds}>
                    {fetchProgress.sleepRemaining ?? 0}s
                  </span>
                  ...
                </>
              ) : fetchProgress.criticalError ||
                fetchProgress.status === "aborted" ? (
                <span style={step1Styles.progressAbortedText}>
                  <AlertCircle size={16} /> Scan Process Aborted
                </span>
              ) : (
                <span style={step1Styles.progressCompletedText}>
                  <Check size={16} /> Market Scan Completed
                </span>
              )}
            </div>

            <div style={step1Styles.progressHeaderRight}>
              {fetchProgress.errorCount > 0 && (
                <span style={step1Styles.progressErrorCountBadge}>
                  ❌ {fetchProgress.errorCount} Error
                  {fetchProgress.errorCount > 1 ? "s" : ""}
                </span>
              )}

              {(fetchProgress.status === "fetching" ||
                fetchProgress.status === "waiting") && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={onCancelFetch}
                  style={step1Styles.stopFetchingButton}
                >
                  <Square size={11} fill="#ffffff" /> Stop Scan
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div style={step1Styles.progressBarTrack}>
            <div
              style={getProgressBarFillStyle(
                Boolean(
                  fetchProgress.criticalError ||
                    fetchProgress.status === "aborted",
                ),
                Math.min(
                  100,
                  Math.round(
                    ((fetchProgress.completedMarkets ||
                      fetchProgress.currentMarketIndex - 1) /
                      fetchProgress.totalMarkets) *
                      100,
                  ),
                ),
              )}
            />
          </div>

          {fetchProgress.criticalError && (
            <div style={step1Styles.criticalErrorBox}>
              {fetchProgress.criticalError}
            </div>
          )}

          {!fetchProgress.criticalError && fetchProgress.lastError && (
            <div style={step1Styles.lastErrorText}>
              Latest event: {fetchProgress.lastError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
