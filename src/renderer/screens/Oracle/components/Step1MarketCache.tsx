import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  Radio,
  ChevronDown,
  Loader2,
  RotateCw,
  Clock,
  Bell,
  BellOff,
  Zap,
} from "lucide-react";
import { skinSnipeLogo, cs2capLogo } from "../../../../../assets/images";
import { SkinsnipeMarketId } from "../../../../shared/types";
import { QuantityIntegrityReport, formatTimeAgo } from "../utils/oracleUtils";
import { resolveMarketCount, resolveMissingQty } from "./step1/Step1Common";
import { AutoRefreshControl } from "./step1/AutoRefreshControl";
import { Cs2capProviderPanel } from "./step1/Cs2capProviderPanel";
import { SkinsnipeProviderPanel } from "./step1/SkinsnipeProviderPanel";
import { MarketScope, useOracleStore } from "../../../store/useOracleStore";
import { useNotificationStore } from "../../../store/useNotificationStore";
import { notificationManager } from "../../../services/notificationManager";
import { Step1CacheStatus } from "./step1/types";
import {
  step1Styles as styles,
  getAccordionCardStyle,
  getAccordionHeaderStyle,
  getAccordionCollapseStyle,
  getAccordionInnerStyle,
  getChevronStyle,
  getHeaderActionContainerStyle,
  getAlertSwitchBtnStyle,
  getProviderTabStyle,
} from "./step1/step1Styles";

export { SKINSNIPE_AVAILABLE_MARKETS } from "./step1/skinsnipeMarkets";

interface Step1MarketCacheProps {
  isOpen: boolean;
  onToggle: () => void;
  cacheStatus: Step1CacheStatus;
  hasApiKey: boolean;
  hasCs2capKey?: boolean;
  pricingProvider?: "skinsnipe" | "cs2cap";
  onChangePricingProvider?: (provider: "skinsnipe" | "cs2cap") => void;
  isCs2capStreaming?: boolean;
  cs2capProgress?: any;
  onStreamCs2cap?: () => void;
  onCancelCs2capStream?: () => void;
  selectedCs2capProviders?: string[];
  onToggleCs2capProvider?: (providerId: string) => void;
  onSoloCs2capProvider?: (providerId: string) => void;
  onSelectAllCs2capProviders?: (providers?: string[]) => void;
  onResetDefaultCs2capProviders?: () => void;
  selectedMarkets: SkinsnipeMarketId[];
  marketCounts: Record<string, number>;
  quantityAudit?: QuantityIntegrityReport;
  fetchProgress: any;
  isBatchEvaluating: boolean;
  isDemoCache?: boolean;
  onToggleMarket: (marketId: SkinsnipeMarketId) => void;
  onSoloMarket: (marketId: SkinsnipeMarketId) => void;
  onSelectAllMarkets?: (markets?: SkinsnipeMarketId[]) => void;
  onDeselectAllMarkets: () => void;
  onFetchPrices: () => void;
  onUploadJsonCache: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadDemoCache: (forceRefresh?: boolean) => void;
  onCancelFetch: () => void;
  hideTradeMarkets?: boolean;
  onToggleHideTrade?: (hide: boolean) => void;
}

export const Step1MarketCache: React.FC<Step1MarketCacheProps> = ({
  isOpen,
  onToggle,
  cacheStatus,
  hasApiKey,
  hasCs2capKey,
  pricingProvider = "skinsnipe",
  onChangePricingProvider,
  isCs2capStreaming,
  cs2capProgress,
  onStreamCs2cap,
  onCancelCs2capStream,
  selectedCs2capProviders = [],
  onToggleCs2capProvider,
  onSoloCs2capProvider,
  onSelectAllCs2capProviders,
  onResetDefaultCs2capProviders,
  selectedMarkets,
  marketCounts,
  quantityAudit,
  fetchProgress,
  isBatchEvaluating,
  isDemoCache,
  onToggleMarket,
  onSoloMarket,
  onSelectAllMarkets,
  onDeselectAllMarkets,
  onFetchPrices,
  onUploadJsonCache,
  onLoadDemoCache,
  onCancelFetch,
  hideTradeMarkets: propHideTradeMarkets,
  onToggleHideTrade: propOnToggleHideTrade,
}) => {
  const storeHideTradeMarkets = useOracleStore((s) => s.hideTradeMarkets);
  const storeSetHideTradeMarkets = useOracleStore((s) => s.setHideTradeMarkets);

  const hideTradeMarkets = propHideTradeMarkets ?? storeHideTradeMarkets;
  const setHideTradeMarkets = propOnToggleHideTrade ?? storeSetHideTradeMarkets;

  // Market Scope: fast wide (Baseline) / narrow (Snipe) switching
  const activeScope = useOracleStore((s) => s.activeScope);
  const setActiveScope = useOracleStore((s) => s.setActiveScope);
  const skinsnipeScopes = useOracleStore((s) => s.skinsnipeScopes);
  const cs2capScopes = useOracleStore((s) => s.cs2capScopes);

  const handleSelectScope = (scope: MarketScope) => {
    setActiveScope(scope);
    toast.success(
      scope === "snipe"
        ? "Snipe scope applied — live refresh limited to your execution venues"
        : "Baseline scope applied — wide market set for accepted-price calculation",
      { id: "market-scope" },
    );
  };

  const scopeLabel = activeScope === "snipe" ? "Snipe Scope" : "Baseline Scope";

  // Notification alert preference for this section
  const { notifyOnCacheComplete, setNotifyOnCacheComplete } =
    useNotificationStore();

  // Track completion milestones for notifications & audio alerts
  const wasFetchingRef = useRef(cacheStatus.isFetching);
  const wasStreamingRef = useRef(!!isCs2capStreaming);

  useEffect(() => {
    if (
      wasFetchingRef.current &&
      !cacheStatus.isFetching &&
      cacheStatus.itemCount > 0
    ) {
      if (notifyOnCacheComplete) {
        notificationManager.notifyMilestone({
          title: "Price Cache Updated",
          body: `Price scan finished: ${cacheStatus.itemCount.toLocaleString()} items cached.`,
        });
      }
    }
    wasFetchingRef.current = cacheStatus.isFetching;
  }, [cacheStatus.isFetching, cacheStatus.itemCount, notifyOnCacheComplete]);

  useEffect(() => {
    if (wasStreamingRef.current && !isCs2capStreaming) {
      const itemsCount = cs2capProgress?.receivedItems || cacheStatus.itemCount;
      if (itemsCount > 0 && notifyOnCacheComplete) {
        notificationManager.notifyMilestone({
          title: "CS2CAP Stream Completed",
          body: `Live pricing stream finished: ${itemsCount.toLocaleString()} items updated.`,
        });
      }
    }
    wasStreamingRef.current = !!isCs2capStreaming;
  }, [
    isCs2capStreaming,
    cs2capProgress?.receivedItems,
    cacheStatus.itemCount,
    notifyOnCacheComplete,
  ]);

  const [, setTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTicker((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const getMissingQtyForMarket = (marketId: string): number =>
    resolveMissingQty(quantityAudit, marketId);

  const getMarketCount = (marketId: string): number =>
    resolveMarketCount(marketCounts, marketId);

  return (
    <div className="card" style={getAccordionCardStyle(isOpen)}>
      {/* Accordion Header Bar */}
      <div onClick={onToggle} style={getAccordionHeaderStyle(isOpen)}>
        <div style={styles.headerLeft}>
          <div>
            <div style={styles.headerTitle}>
              <Radio size={18} style={styles.radioIcon} /> Market Price
              Aggregation & Cache
            </div>
            <div style={styles.headerSubtitle}>
              {cacheStatus.lastFetchedAt
                ? `Last synced ${formatTimeAgo(cacheStatus.lastFetchedAt)} • ${
                    pricingProvider === "cs2cap"
                      ? `${selectedCs2capProviders.length} providers`
                      : `${selectedMarkets.length} markets`
                  } · ${scopeLabel} • Real-time price cache`
                : import.meta.env.DEV
                  ? "Select target markets, scan real-time marketplace feeds"
                  : "Select target markets and scan real-time marketplace feeds"}
            </div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <span
            className={`badge ${cacheStatus.itemCount > 0 ? "badge-success" : "badge-cyan"}`}
            style={styles.headerBadge}
          >
            {cacheStatus.itemCount > 0
              ? `✓ ${cacheStatus.itemCount.toLocaleString()} Items Cached`
              : "Cache Empty"}
          </span>

          <span
            className="badge badge-ghost"
            style={styles.timeAgoBadge}
            title={
              cacheStatus.lastFetchedAt
                ? `Last synced: ${cacheStatus.lastFetchedAt}`
                : "No price sync recorded"
            }
          >
            <Clock size={11} style={styles.timeAgoIcon} />
            {formatTimeAgo(cacheStatus.lastFetchedAt)}
          </span>

          {/* Section-Specific Alert On/Off Switch */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setNotifyOnCacheComplete(!notifyOnCacheComplete);
            }}
            style={getAlertSwitchBtnStyle(notifyOnCacheComplete)}
            title={
              notifyOnCacheComplete
                ? "Notification chime active: will alert when scan completes (click to mute)"
                : "Notification chime muted: click to alert when scan completes"
            }
          >
            {notifyOnCacheComplete ? (
              <>
                <Bell size={12} style={{ color: "#60a5fa" }} />
                <span>Alert on Sync</span>
              </>
            ) : (
              <>
                <BellOff size={12} style={{ color: "var(--so-text-muted)" }} />
                <span>Muted</span>
              </>
            )}
          </button>

          <div style={getHeaderActionContainerStyle(isOpen)}>
            {pricingProvider === "cs2cap" ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={styles.headerActionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isCs2capStreaming) {
                    onCancelCs2capStream?.();
                  } else {
                    onStreamCs2cap?.();
                  }
                }}
                disabled={
                  !hasCs2capKey || cacheStatus.isFetching || isBatchEvaluating
                }
                title={
                  !hasCs2capKey
                    ? "CS2Cap API Key required"
                    : isCs2capStreaming
                      ? "Cancel active stream"
                      : "Stream CS2Cap prices into local cache"
                }
              >
                {isCs2capStreaming ? (
                  <>
                    <Loader2 size={13} className="spin" /> Streaming…
                  </>
                ) : (
                  <>
                    <Zap size={13} />{" "}
                    {cacheStatus.itemCount > 0 ? "Restream" : "Stream"}
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={styles.headerActionBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  if (cacheStatus.isFetching) {
                    onCancelFetch();
                  } else {
                    onFetchPrices();
                  }
                }}
                disabled={
                  cacheStatus.isFetching ||
                  isBatchEvaluating ||
                  (!hasApiKey && !isDemoCache) ||
                  selectedMarkets.length === 0
                }
                title={
                  !hasApiKey && !isDemoCache
                    ? "Skinsnipe API Key required"
                    : selectedMarkets.length === 0
                      ? "Select at least 1 market"
                      : cacheStatus.isFetching
                        ? "Cancel active market scan"
                        : "Scan prices from selected markets"
                }
              >
                {cacheStatus.isFetching ? (
                  <>
                    <Loader2 size={13} className="spin" /> Scanning…
                  </>
                ) : (
                  <>
                    <RotateCw size={13} />{" "}
                    {cacheStatus.itemCount > 0 ? "Rescan" : "Scan"}
                  </>
                )}
              </button>
            )}
          </div>

          <ChevronDown size={18} style={getChevronStyle(isOpen)} />
        </div>
      </div>

      <div style={getAccordionCollapseStyle(isOpen)}>
        <div style={getAccordionInnerStyle(isOpen)}>
          <div style={styles.bodyContainer}>
            {/* Pricing Provider Switcher Tab */}
            <div style={styles.providerSwitcher}>
              <button
                type="button"
                onClick={() => onChangePricingProvider?.("cs2cap")}
                style={getProviderTabStyle(
                  pricingProvider === "cs2cap",
                  "cs2cap",
                )}
              >
                <img
                  src={cs2capLogo}
                  alt="CS2Cap"
                  style={styles.providerLogoSmall}
                />
                CS2Cap
                <span className="badge badge-cyan" style={styles.cs2capBadge}>
                  PRO / QUANT
                </span>
              </button>

              <button
                type="button"
                onClick={() => onChangePricingProvider?.("skinsnipe")}
                style={getProviderTabStyle(
                  pricingProvider === "skinsnipe",
                  "skinsnipe",
                )}
              >
                <img
                  src={skinSnipeLogo}
                  alt="Skinsnipe"
                  style={styles.providerLogoSmall}
                />
                Skinsnipe
                <span className="badge" style={styles.skinsnipeBadge}>
                  STD PLAN
                </span>
              </button>
            </div>

            <AutoRefreshControl />

            {pricingProvider === "cs2cap" ? (
              <Cs2capProviderPanel
                cacheStatus={cacheStatus}
                hasCs2capKey={hasCs2capKey}
                isCs2capStreaming={isCs2capStreaming}
                cs2capProgress={cs2capProgress}
                onStreamCs2cap={onStreamCs2cap}
                onCancelCs2capStream={onCancelCs2capStream}
                isBatchEvaluating={isBatchEvaluating}
                selectedCs2capProviders={selectedCs2capProviders}
                onToggleCs2capProvider={onToggleCs2capProvider}
                onSoloCs2capProvider={onSoloCs2capProvider}
                onSelectAllCs2capProviders={onSelectAllCs2capProviders}
                onResetDefaultCs2capProviders={onResetDefaultCs2capProviders}
                hideTradeMarkets={hideTradeMarkets}
                setHideTradeMarkets={setHideTradeMarkets}
                activeScope={activeScope}
                onSelectScope={handleSelectScope}
                cs2capScopes={cs2capScopes}
                getMarketCount={getMarketCount}
                getMissingQtyForMarket={getMissingQtyForMarket}
              />
            ) : (
              <SkinsnipeProviderPanel
                cacheStatus={cacheStatus}
                hasApiKey={hasApiKey}
                isDemoCache={isDemoCache}
                selectedMarkets={selectedMarkets}
                onToggleMarket={onToggleMarket}
                onSoloMarket={onSoloMarket}
                onSelectAllMarkets={onSelectAllMarkets}
                onDeselectAllMarkets={onDeselectAllMarkets}
                onFetchPrices={onFetchPrices}
                onUploadJsonCache={onUploadJsonCache}
                onLoadDemoCache={onLoadDemoCache}
                onCancelFetch={onCancelFetch}
                fetchProgress={fetchProgress}
                isBatchEvaluating={isBatchEvaluating}
                hideTradeMarkets={hideTradeMarkets}
                setHideTradeMarkets={setHideTradeMarkets}
                activeScope={activeScope}
                onSelectScope={handleSelectScope}
                skinsnipeScopes={skinsnipeScopes}
                getMarketCount={getMarketCount}
                getMissingQtyForMarket={getMissingQtyForMarket}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step1MarketCache;
