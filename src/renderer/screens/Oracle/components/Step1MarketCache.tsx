import React, { useState, useEffect, useRef } from "react";
import {
  Radio,
  ChevronUp,
  ChevronDown,
  Info,
  Square,
  Layers,
  Loader2,
  FileUp,
  Check,
  AlertCircle,
  RotateCw,
  Sparkles,
  AlertTriangle,
  Zap,
  Database,
  Clock,
  Bell,
  BellOff,
} from "lucide-react";
import { skinSnipeLogo, cs2capLogo } from "../../../../../assets/images";
import { MarketLogo } from "../../../components/MarketLogo";
import { SkinsnipeMarketId } from "../../../../shared/types";
import { CS2CAP_PROVIDERS } from "../../../../shared/cs2capProviders";
import { isTradeMarket } from "../../../../shared/canonicalMarkets";
import { QuantityIntegrityReport, formatTimeAgo } from "../utils/oracleUtils";
import {
  MarketSelectionChip,
  MarketSelectionToolbar,
  CacheStatusInfo,
  resolveMarketCount,
  resolveMissingQty,
} from "./step1/Step1Common";
import { useOracleStore } from "../../../store/useOracleStore";
import { useNotificationStore } from "../../../store/useNotificationStore";
import { notificationManager } from "../../../services/notificationManager";

export const SKINSNIPE_AVAILABLE_MARKETS: {
  id: SkinsnipeMarketId;
  name: string;
}[] = [
  { id: "avanmarket", name: "AvanMarket" },
  { id: "buffmarket", name: "BUFF.Market" },
  { id: "csgofloat", name: "CSFloat" },
  { id: "csmoney_p2p", name: "CS.MONEY P2P" },
  { id: "csmoney_trade", name: "CS.MONEY Trade" },
  { id: "cstrade", name: "CSTrade" },
  { id: "dmarket", name: "DMarket" },
  { id: "exeskins", name: "ExeSkins" },
  { id: "itradegg", name: "iTradeGG" },
  { id: "lisskins", name: "LisSkins" },
  { id: "manncostore", name: "ManncoStore" },
  { id: "market_csgo", name: "Market CSGO" },
  { id: "merchanttf", name: "Merchant TF" },
  { id: "shadowpay", name: "ShadowPay" },
  { id: "skinbaron", name: "SkinBaron" },
  { id: "skinflow", name: "SkinFlow" },
  { id: "skinland", name: "SkinLand" },
  { id: "skinport", name: "Skinport" },
  { id: "skinsmonkey", name: "SkinsMonkey" },
  { id: "skinswap", name: "SkinSwap" },
  { id: "tradeitgg", name: "Tradeit.GG" },
  { id: "tradeitgg_store", name: "Tradeit.GG Store" },
  { id: "waxpeer", name: "Waxpeer" },
  { id: "whitemarket", name: "WhiteMarket" },
];

interface Step1MarketCacheProps {
  isOpen: boolean;
  onToggle: () => void;
  cacheStatus: {
    itemCount: number;
    isFetching: boolean;
    lastFetchedAt: string | null;
  };
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

  const cs2capTradeCount = CS2CAP_PROVIDERS.filter((p) =>
    isTradeMarket(p.id),
  ).length;
  const skinsnipeTradeCount = SKINSNIPE_AVAILABLE_MARKETS.filter((m) =>
    isTradeMarket(m.id),
  ).length;

  const visibleSelectedCs2capCount = hideTradeMarkets
    ? selectedCs2capProviders.filter((p) => !isTradeMarket(p)).length
    : selectedCs2capProviders.length;

  const visibleSelectedMarketsCount = hideTradeMarkets
    ? selectedMarkets.filter((m) => !isTradeMarket(m)).length
    : selectedMarkets.length;

  const handleSelectAllCs2cap = () => {
    const providersToSelect = hideTradeMarkets
      ? CS2CAP_PROVIDERS.filter((p) => !isTradeMarket(p.id)).map((p) => p.id)
      : CS2CAP_PROVIDERS.map((p) => p.id);
    onSelectAllCs2capProviders?.(providersToSelect);
  };

  const handleSelectAllMarkets = () => {
    const marketsToSelect = hideTradeMarkets
      ? SKINSNIPE_AVAILABLE_MARKETS.filter((m) => !isTradeMarket(m.id)).map(
          (m) => m.id,
        )
      : SKINSNIPE_AVAILABLE_MARKETS.map((m) => m.id);
    onSelectAllMarkets?.(marketsToSelect);
  };

  const estimatedFetchSeconds = Math.max(0, (selectedMarkets.length - 1) * 32);

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
                ? `Last synced ${formatTimeAgo(cacheStatus.lastFetchedAt)} • ${pricingProvider === "cs2cap" ? "CS2Cap Stream Pipeline" : `${selectedMarkets.length} active markets`} • Real-time price cache`
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

            {pricingProvider === "cs2cap" ? (
              /* ─────────────────────────────────────────────────────────────
               CS2Cap Streaming Panel
            ───────────────────────────────────────────────────────────── */
              <div>
                {/* CS2Cap Header */}
                <div style={styles.providerHeader}>
                  <div>
                    <div style={styles.providerHeaderTitleGroup}>
                      <img
                        src={cs2capLogo}
                        alt="CS2Cap"
                        style={styles.providerHeaderLogo}
                      />
                      <h2 style={styles.providerHeaderTitle}>CS2Cap</h2>
                      <span
                        className="badge badge-cyan"
                        style={styles.cs2capLiveBadge}
                      >
                        Live Stream
                      </span>
                    </div>
                    <p style={styles.cs2capHeaderDescription}>
                      Streams live price snapshots across 40+ global
                      marketplaces (Buff163, C5, CSFloat, AvanMarket, etc.)
                      directly to your local workstation.
                    </p>
                  </div>
                </div>

                {/* Dedicated CS2Cap Provider Selection Section */}
                <div style={styles.configSectionCard}>
                  <MarketSelectionToolbar
                    title="CS2Cap Target Providers Config"
                    selectedCount={visibleSelectedCs2capCount}
                    totalCount={CS2CAP_PROVIDERS.length}
                    itemTypeLabel="Providers"
                    tradeCount={cs2capTradeCount}
                    hideTradeMarkets={hideTradeMarkets}
                    onToggleHideTrade={setHideTradeMarkets}
                    onSelectAll={handleSelectAllCs2cap}
                    onResetOrDeselect={
                      onResetDefaultCs2capProviders || (() => {})
                    }
                    resetLabel="Reset Defaults"
                    accentColor="#0891b2"
                    badgeClassName="badge-cyan"
                    badgeTextColor="#38bdf8"
                    badgeBorderColor="rgba(56, 189, 248, 0.4)"
                  />

                  <p style={styles.configSectionDescription}>
                    Choose which of CS2Cap's {CS2CAP_PROVIDERS.length} supported
                    marketplaces to query during live NDJSON streaming.
                    Preferences are saved automatically.
                  </p>

                  {/* Interactive Provider Chips Grid */}
                  <div style={styles.providerChipsGrid}>
                    {(hideTradeMarkets
                      ? CS2CAP_PROVIDERS.filter((p) => !isTradeMarket(p.id))
                      : CS2CAP_PROVIDERS
                    ).map((provider) => (
                      <MarketSelectionChip
                        key={provider.id}
                        id={provider.id}
                        name={provider.name}
                        isSelected={selectedCs2capProviders.includes(
                          provider.id,
                        )}
                        onToggle={onToggleCs2capProvider || (() => {})}
                        onSolo={onSoloCs2capProvider || (() => {})}
                        isTrade={isTradeMarket(provider.id)}
                        marketCount={getMarketCount(provider.id)}
                        missingQtyCount={getMissingQtyForMarket(provider.id)}
                        accentColor="#06b6d4"
                      />
                    ))}
                  </div>

                  <div style={styles.brandDisclaimer}>
                    <Info size={13} style={styles.brandDisclaimerIcon} />
                    <span>
                      All brand logos and names are property of their respective
                      owners. SkinOracle is an independent tool and is not
                      affiliated with, endorsed, or sponsored by any listed
                      marketplace.
                    </span>
                  </div>
                </div>

                {/* CS2Cap Status & Streaming Section */}
                <div style={styles.streamingSectionCard}>
                  <div style={styles.streamingSectionHeader}>
                    <div style={styles.streamingSectionTitle}>
                      <Database size={16} style={styles.cyanIcon} /> CS2Cap
                      Streaming Pipeline
                      {hasCs2capKey ? (
                        <span
                          className="badge badge-success"
                          style={styles.badgeSmall}
                        >
                          PRO / QUANT ACTIVE
                        </span>
                      ) : (
                        <span
                          className="badge badge-warning"
                          style={styles.badgeSmall}
                        >
                          API KEY REQUIRED
                        </span>
                      )}
                    </div>

                    <div style={styles.streamingSectionActions}>
                      {isCs2capStreaming ? (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={onCancelCs2capStream}
                          style={styles.cancelStreamButton}
                        >
                          <Square size={12} fill="#ffffff" /> Cancel Stream
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={onStreamCs2cap}
                          disabled={
                            !hasCs2capKey ||
                            cacheStatus.isFetching ||
                            isBatchEvaluating
                          }
                          style={getStreamLiveButtonStyle(
                            !hasCs2capKey ||
                              cacheStatus.isFetching ||
                              isBatchEvaluating,
                          )}
                        >
                          <Zap size={15} /> Stream Live Prices Snapshot
                        </button>
                      )}
                    </div>
                  </div>

                  {!hasCs2capKey && (
                    <div style={styles.cs2capMissingKeyBanner}>
                      ⚠️ CS2Cap API Key not configured. Go to{" "}
                      <strong>Settings → API Keys</strong> to add your CS2Cap
                      Pro or Quant API Key.
                    </div>
                  )}

                  {/* Active Streaming Meter */}
                  {cs2capProgress && (
                    <div
                      style={getStreamingMeterStyle(
                        cs2capProgress.status === "error",
                      )}
                    >
                      <div style={styles.streamingMeterHeader}>
                        <div
                          style={getStreamingMeterStatusStyle(
                            cs2capProgress.status === "error",
                          )}
                        >
                          {cs2capProgress.status === "streaming" ? (
                            <>
                              <Loader2 size={16} className="spin" /> Streaming
                              NDJSON Catalog...
                            </>
                          ) : cs2capProgress.status === "completed" ? (
                            <>
                              <Check size={16} style={styles.successIcon} />{" "}
                              Stream Completed Successfully
                            </>
                          ) : cs2capProgress.status === "aborted" ? (
                            <>
                              <AlertCircle size={16} /> Stream Cancelled
                            </>
                          ) : cs2capProgress.status === "error" ? (
                            <>
                              <AlertCircle size={16} /> Stream Error
                            </>
                          ) : (
                            <>
                              <Loader2 size={16} className="spin" />{" "}
                              Connecting...
                            </>
                          )}
                        </div>
                        <span style={styles.streamingElapsedText}>
                          {(cs2capProgress.elapsedMs / 1000).toFixed(1)}s
                          elapsed
                        </span>
                      </div>

                      <div style={styles.streamingMetricsGrid}>
                        <div style={styles.metricBox}>
                          <div style={styles.metricLabel}>Lines Parsed</div>
                          <div style={styles.metricValuePrimary}>
                            {cs2capProgress.linesRead.toLocaleString()}
                          </div>
                        </div>
                        <div style={styles.metricBox}>
                          <div style={styles.metricLabel}>Unique Skins</div>
                          <div style={styles.metricValueCyan}>
                            {cs2capProgress.itemsCount.toLocaleString()}
                          </div>
                        </div>
                        <div style={styles.metricBox}>
                          <div style={styles.metricLabel}>Providers Seen</div>
                          <div style={styles.metricValuePrimary}>
                            {cs2capProgress.providersCount}
                          </div>
                        </div>
                        <div style={styles.metricBox}>
                          <div style={styles.metricLabel}>Transferred</div>
                          <div style={styles.metricValuePrimary}>
                            {(
                              cs2capProgress.bytesReceived /
                              (1024 * 1024)
                            ).toFixed(2)}{" "}
                            MB
                          </div>
                        </div>
                      </div>

                      {cs2capProgress.lastError && (
                        <div style={styles.streamingErrorText}>
                          {cs2capProgress.lastError}
                        </div>
                      )}
                    </div>
                  )}

                  <CacheStatusInfo
                    itemCount={cacheStatus.itemCount}
                    lastFetchedAt={cacheStatus.lastFetchedAt}
                  />
                </div>
              </div>
            ) : (
              /* ─────────────────────────────────────────────────────────────
               Skinsnipe Multi-Call REST Panel (Default)
            ───────────────────────────────────────────────────────────── */
              <div>
                {/* Provider Header */}
                <div style={styles.providerHeader}>
                  <div>
                    <div style={styles.providerHeaderTitleGroup}>
                      <img
                        src={skinSnipeLogo}
                        alt="Skinsnipe"
                        style={styles.providerHeaderLogo}
                      />
                      <h2 style={styles.providerHeaderTitle}>Skinsnipe</h2>
                      <span className="badge" style={styles.skinsnipeStdBadge}>
                        STD PLAN
                      </span>
                    </div>
                    {!hasApiKey && (
                      <p style={styles.skinsnipeHeaderDescription}>
                        Skinsnipe acts as a multi-market price aggregator for
                        CS2 items. To fetch live market data directly from your
                        device,{" "}
                        <span style={styles.whiteSpaceNowrap}>
                          a <strong>Skinsnipe Standard Plan</strong>
                        </span>{" "}
                        API key is required.
                      </p>
                    )}
                  </div>
                </div>

                {/* Dedicated Skinsnipe Market Selection Section */}
                <div style={styles.configSectionCard}>
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
                    resetLabel="Deselect All"
                    accentColor="var(--so-primary)"
                    badgeClassName="badge-cyan"
                    badgeTextColor="#38bdf8"
                    badgeBorderColor="rgba(56, 189, 248, 0.4)"
                  />

                  <p style={styles.configSectionDescription}>
                    Choose which of Skinsnipe's{" "}
                    {SKINSNIPE_AVAILABLE_MARKETS.length} markets to query during
                    live fetches. Preferences are saved automatically.
                  </p>

                  {/* Interactive Market Chips Grid */}
                  <div style={styles.marketChipsGrid}>
                    {(hideTradeMarkets
                      ? SKINSNIPE_AVAILABLE_MARKETS.filter(
                          (m) => !isTradeMarket(m.id),
                        )
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

                  <div style={styles.estimatedCycleText}>
                    <Layers size={14} />
                    Estimated fetch cycle: ~
                    {Math.floor(estimatedFetchSeconds / 60)}m{" "}
                    {estimatedFetchSeconds % 60}s
                  </div>

                  <div style={styles.brandDisclaimer}>
                    <Info size={13} style={styles.brandDisclaimerIcon} />
                    <span>
                      All brand logos and names are property of their respective
                      owners. SkinOracle is an independent tool and is not
                      affiliated with, endorsed, or sponsored by any listed
                      marketplace.
                    </span>
                  </div>
                </div>

                {/* Skinsnipe Fetch & Local Cache Loading Controls */}
                <div style={styles.fetchControlsGroup}>
                  {hasApiKey && (
                    <button
                      className="btn btn-primary"
                      onClick={onFetchPrices}
                      disabled={cacheStatus.isFetching || isBatchEvaluating}
                    >
                      {cacheStatus.isFetching ? (
                        <>
                          <Loader2 size={16} className="spin" /> Scanning
                          Skinsnipe Prices...
                        </>
                      ) : (
                        <>
                          <Radio size={16} /> Scan {selectedMarkets.length}{" "}
                          Skinsnipe Markets
                        </>
                      )}
                    </button>
                  )}

                  {import.meta.env.DEV && (
                    <label
                      className="btn btn-cyan"
                      style={styles.uploadJsonLabel}
                      title="Import an offline JSON price cache file"
                    >
                      <FileUp size={16} /> Load Cache JSON File
                      <input
                        type="file"
                        accept=".json"
                        onChange={onUploadJsonCache}
                        style={styles.hiddenInput}
                      />
                    </label>
                  )}

                  {!hasApiKey && (
                    <div style={styles.demoCacheGroup}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => onLoadDemoCache(false)}
                        disabled={cacheStatus.isFetching || isBatchEvaluating}
                        style={styles.loadDemoButton}
                        title="Load demo historical dataset for offline simulation"
                      >
                        <Sparkles size={15} /> Load Demo Cache (Offline
                        Simulation)
                      </button>

                      {isDemoCache && cacheStatus.itemCount > 0 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => onLoadDemoCache(true)}
                          disabled={cacheStatus.isFetching || isBatchEvaluating}
                          style={styles.reloadDemoButton}
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
                    style={styles.cacheStatusOffset}
                  />
                </div>

                {/* Demo Cache Warning Alert Box */}
                {isDemoCache && (
                  <div style={styles.demoAlertBox}>
                    <AlertTriangle size={24} style={styles.demoAlertIcon} />
                    <div>
                      <div style={styles.demoAlertTitle}>
                        ⚠️ DEMO PRICE CACHE ACTIVE (HISTORICAL DATA — TESTING
                        ONLY)
                      </div>
                      <div style={styles.demoAlertBody}>
                        ⚠️ Price Cache Loaded (Offline Mode) This cache contains
                        sample historical price data intended for offline
                        testing and workflow simulation only. 🔴 WARNING: Do NOT
                        use this data for live trading, automated strategies, or
                        real order execution.
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Fetching Progress & Error Tracking Panel */}
                {fetchProgress && (
                  <div
                    style={getProgressPanelStyle(
                      Boolean(
                        fetchProgress.criticalError ||
                        fetchProgress.status === "aborted",
                      ),
                    )}
                  >
                    <div style={styles.progressHeader}>
                      <div style={styles.progressStatusText}>
                        {fetchProgress.status === "fetching" ? (
                          <>
                            <Loader2
                              size={16}
                              className="spin"
                              style={styles.primaryIcon}
                            />
                            Scanning Market {fetchProgress.currentMarketIndex}{" "}
                            of {fetchProgress.totalMarkets}:
                            <span style={styles.progressCurrentMarketPrimary}>
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
                              style={styles.cyanTextIcon}
                            />
                            Rate-Limit Cooldown: Scanning{" "}
                            <span style={styles.progressCurrentMarketCyan}>
                              <MarketLogo
                                marketId={fetchProgress.currentMarket}
                                size={15}
                              />
                              {SKINSNIPE_AVAILABLE_MARKETS.find(
                                (m) => m.id === fetchProgress.currentMarket,
                              )?.name || fetchProgress.currentMarket}
                            </span>{" "}
                            in{" "}
                            <span style={styles.progressRemainingSeconds}>
                              {fetchProgress.sleepRemaining ?? 0}s
                            </span>
                            ...
                          </>
                        ) : fetchProgress.criticalError ||
                          fetchProgress.status === "aborted" ? (
                          <span style={styles.progressAbortedText}>
                            <AlertCircle size={16} /> Scan Process Aborted
                          </span>
                        ) : (
                          <span style={styles.progressCompletedText}>
                            <Check size={16} /> Market Scan Completed
                          </span>
                        )}
                      </div>

                      <div style={styles.progressHeaderRight}>
                        {fetchProgress.errorCount > 0 && (
                          <span style={styles.progressErrorCountBadge}>
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
                            style={styles.stopFetchingButton}
                          >
                            <Square size={11} fill="#ffffff" /> Stop Scan
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={styles.progressBarTrack}>
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
                      <div style={styles.criticalErrorBox}>
                        {fetchProgress.criticalError}
                      </div>
                    )}

                    {!fetchProgress.criticalError &&
                      fetchProgress.lastError && (
                        <div style={styles.lastErrorText}>
                          Latest event: {fetchProgress.lastError}
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC STYLE HELPERS ─────────────────────────

function getAccordionCardStyle(isOpen: boolean): React.CSSProperties {
  return {
    ...styles.cardContainer,
    borderColor: isOpen ? "var(--so-border-strong)" : "var(--so-border-medium)",
    boxShadow: isOpen ? "0 4px 20px rgba(0, 0, 0, 0.2)" : "none",
    transition: "border-color 0.25s ease, box-shadow 0.25s ease",
  };
}

function getAccordionHeaderStyle(isOpen: boolean): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    backgroundColor: isOpen
      ? "var(--so-surface-panel)"
      : "var(--so-surface-card)",
    borderBottom: "1px solid",
    borderBottomColor: isOpen ? "var(--so-border-subtle)" : "transparent",
    cursor: "pointer",
    userSelect: "none",
    transition: "background-color 0.25s ease, border-color 0.25s ease",
  };
}

function getAccordionCollapseStyle(isOpen: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateRows: isOpen ? "1fr" : "0fr",
    transition: "grid-template-rows 0.5s cubic-bezier(0.25, 1, 0.35, 1)",
    overflow: "hidden",
  };
}

function getAccordionInnerStyle(isOpen: boolean): React.CSSProperties {
  return {
    minHeight: 0,
    overflow: "hidden",
    opacity: isOpen ? 1 : 0,
    transform: isOpen ? "translateY(0)" : "translateY(-8px)",
    transition:
      "opacity 0.4s cubic-bezier(0.25, 1, 0.35, 1), transform 0.5s cubic-bezier(0.25, 1, 0.35, 1), visibility 0.5s ease",
    visibility: isOpen ? "visible" : "hidden",
  };
}

function getChevronStyle(isOpen: boolean): React.CSSProperties {
  return {
    ...styles.chevronIcon,
    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
    transition: "transform 0.4s cubic-bezier(0.25, 1, 0.35, 1)",
  };
}

function getHeaderActionContainerStyle(isOpen: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    opacity: isOpen ? 0 : 1,
    maxWidth: isOpen ? 0 : 160,
    overflow: "hidden",
    pointerEvents: isOpen ? "none" : "auto",
    transition:
      "opacity 0.2s ease, max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    whiteSpace: "nowrap",
  };
}

function getAlertSwitchBtnStyle(isActive: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 700,
    backgroundColor: isActive
      ? "rgba(37, 99, 235, 0.2)"
      : "rgba(255, 255, 255, 0.05)",
    border: `1px solid ${isActive ? "rgba(96, 165, 250, 0.45)" : "rgba(255, 255, 255, 0.12)"}`,
    color: isActive ? "#93c5fd" : "var(--so-text-muted)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  };
}

function getProviderTabStyle(
  active: boolean,
  type: "cs2cap" | "skinsnipe",
): React.CSSProperties {
  const isCs2cap = type === "cs2cap";
  return {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    borderRadius: "var(--so-radius-sm)",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    backgroundColor: active ? "var(--so-surface-card)" : "transparent",
    border: active
      ? isCs2cap
        ? "1px solid rgba(6, 182, 212, 0.45)"
        : "1px solid var(--so-primary)"
      : "1px solid transparent",
    color: active ? "var(--so-text-primary)" : "var(--so-text-muted)",
    boxShadow: active
      ? isCs2cap
        ? "0 2px 6px rgba(0, 0, 0, 0.2)"
        : "0 2px 10px rgba(99, 102, 241, 0.2)"
      : "none",
  };
}

function getStreamLiveButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
    border: "none",
    fontWeight: 800,
    fontSize: "13px",
    padding: "8px 18px",
    boxShadow: "0 4px 14px rgba(6, 182, 212, 0.3)",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function getStreamingMeterStyle(isError: boolean): React.CSSProperties {
  return {
    marginTop: "14px",
    padding: "14px",
    backgroundColor: isError
      ? "rgba(239, 68, 68, 0.08)"
      : "rgba(6, 182, 212, 0.08)",
    borderRadius: "8px",
    border: isError
      ? "1px solid rgba(239, 68, 68, 0.3)"
      : "1px solid rgba(6, 182, 212, 0.25)",
  };
}

function getStreamingMeterStatusStyle(isError: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 700,
    color: isError ? "var(--so-danger-text)" : "#06b6d4",
  };
}

function getProgressPanelStyle(isAbortedOrError: boolean): React.CSSProperties {
  return {
    marginTop: "16px",
    padding: "16px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: isAbortedOrError
      ? "rgba(239, 68, 68, 0.08)"
      : "rgba(59, 130, 246, 0.08)",
    border: isAbortedOrError
      ? "1px solid rgba(239, 68, 68, 0.3)"
      : "1px solid rgba(59, 130, 246, 0.3)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  };
}

function getProgressBarFillStyle(
  isAbortedOrError: boolean,
  percent: number,
): React.CSSProperties {
  return {
    height: "100%",
    width: `${percent}%`,
    backgroundColor: isAbortedOrError
      ? "var(--so-danger-text)"
      : "var(--so-primary)",
    transition: "width 0.3s ease",
  };
}

const styles: Record<string, React.CSSProperties> = {
  cardContainer: {
    border: "1px solid var(--so-border-medium)",
    padding: 0,
    overflow: "hidden",
    background:
      "linear-gradient(180deg, var(--so-surface-card) 0%, rgba(15, 23, 42, 0.6) 100%)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
    flex: "1 1 auto",
  },
  headerTitle: {
    fontSize: "15px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    whiteSpace: "nowrap",
  },
  radioIcon: {
    color: "var(--so-primary)",
  },
  headerSubtitle: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
    marginTop: "2px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "nowrap",
    flexShrink: 0,
  },
  headerBadge: {
    fontSize: "11px",
    whiteSpace: "nowrap",
  },
  timeAgoBadge: {
    fontSize: "11px",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--so-text-muted)",
    border: "1px solid var(--so-border-subtle)",
    whiteSpace: "nowrap",
  },
  timeAgoIcon: {
    opacity: 0.75,
  },
  headerActionBtn: {
    padding: "3px 10px",
    fontSize: "11.5px",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    height: "26px",
    whiteSpace: "nowrap",
  },
  chevronIcon: {
    color: "var(--so-text-muted)",
  },
  bodyContainer: {
    padding: "20px",
  },
  providerSwitcher: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    borderBottom: "1px solid var(--so-border-subtle)",
    paddingBottom: "14px",
    flexWrap: "wrap",
  },
  providerLogoSmall: {
    height: 16,
    width: "auto",
    objectFit: "contain",
  },
  cs2capBadge: {
    fontSize: "9.5px",
    padding: "2px 6px",
    textTransform: "uppercase",
  },
  skinsnipeBadge: {
    fontSize: "9.5px",
    padding: "2px 6px",
    textTransform: "uppercase",
    backgroundColor: "rgba(99, 102, 241, 0.18)",
    color: "#818cf8",
    border: "1px solid rgba(99, 102, 241, 0.4)",
  },
  providerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "16px",
  },
  providerHeaderTitleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  providerHeaderLogo: {
    height: 26,
    width: "auto",
    objectFit: "contain",
  },
  providerHeaderTitle: {
    fontSize: "18px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    margin: 0,
  },
  cs2capLiveBadge: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  cs2capHeaderDescription: {
    fontSize: "13px",
    color: "var(--so-text-secondary)",
    marginTop: "6px",
    maxWidth: "720px",
    lineHeight: 1.5,
  },
  configSectionCard: {
    padding: "18px 20px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
    marginBottom: "20px",
  },
  configSectionDescription: {
    fontSize: "12.5px",
    color: "var(--so-text-muted)",
    marginBottom: "12px",
  },
  providerChipsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))",
    gap: "8px",
    marginBottom: "8px",
  },
  brandDisclaimer: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "8px",
    opacity: 0.75,
  },
  brandDisclaimerIcon: {
    flexShrink: 0,
  },
  streamingSectionCard: {
    padding: "18px 20px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    marginBottom: "20px",
  },
  streamingSectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
    flexWrap: "wrap",
    gap: "10px",
  },
  streamingSectionTitle: {
    fontWeight: 800,
    fontSize: "14px",
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  cyanIcon: {
    color: "#06b6d4",
  },
  badgeSmall: {
    fontSize: "11px",
  },
  streamingSectionActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  cancelStreamButton: {
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    fontWeight: 700,
    fontSize: "12px",
    padding: "7px 14px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
  },
  cs2capMissingKeyBanner: {
    fontSize: "12.5px",
    color: "var(--so-text-secondary)",
    padding: "12px 14px",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: "6px",
    border: "1px solid rgba(245, 158, 11, 0.25)",
    marginBottom: "10px",
  },
  streamingMeterHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  successIcon: {
    color: "var(--so-success-text)",
  },
  streamingElapsedText: {
    fontSize: "12px",
    color: "var(--so-text-secondary)",
    fontFamily: "monospace",
  },
  streamingMetricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "8px",
    marginTop: "10px",
  },
  metricBox: {
    backgroundColor: "var(--so-surface-card)",
    padding: "8px 12px",
    borderRadius: "6px",
  },
  metricLabel: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  metricValuePrimary: {
    fontSize: "15px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
  },
  metricValueCyan: {
    fontSize: "15px",
    fontWeight: 800,
    color: "#06b6d4",
  },
  streamingErrorText: {
    marginTop: "8px",
    fontSize: "12px",
    color: "var(--so-danger-text)",
  },
  skinsnipeStdBadge: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    backgroundColor: "rgba(99, 102, 241, 0.18)",
    color: "#818cf8",
    border: "1px solid rgba(99, 102, 241, 0.4)",
  },
  skinsnipeHeaderDescription: {
    fontSize: "13px",
    color: "var(--so-text-secondary)",
    marginTop: "6px",
    maxWidth: "680px",
    lineHeight: 1.5,
  },
  whiteSpaceNowrap: {
    whiteSpace: "nowrap",
  },
  marketChipsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))",
    gap: "8px",
    marginBottom: "12px",
  },
  estimatedCycleText: {
    fontSize: "11.5px",
    color: "var(--so-text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  fetchControlsGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  uploadJsonLabel: {
    cursor: "pointer",
    margin: 0,
  },
  hiddenInput: {
    display: "none",
  },
  demoCacheGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  loadDemoButton: {
    background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "13px",
    padding: "8px 14px",
    border: "none",
    borderRadius: "var(--so-radius-sm)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(139, 92, 246, 0.3)",
  },
  reloadDemoButton: {
    fontSize: "11.5px",
    padding: "6px 10px",
    color: "var(--so-text-secondary)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  cacheStatusOffset: {
    marginLeft: "auto",
    fontSize: "13px",
    marginTop: 0,
  },
  demoAlertBox: {
    marginTop: "16px",
    padding: "14px 18px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    border: "1px solid rgba(245, 158, 11, 0.35)",
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  demoAlertIcon: {
    color: "#f59e0b",
    flexShrink: 0,
  },
  demoAlertTitle: {
    fontWeight: 800,
    fontSize: "13.5px",
    color: "#f59e0b",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  demoAlertBody: {
    fontSize: "12.5px",
    color: "var(--so-text-secondary)",
    marginTop: "3px",
    lineHeight: 1.4,
  },
  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressStatusText: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 700,
    fontSize: "13.5px",
  },
  primaryIcon: {
    color: "var(--so-primary)",
  },
  cyanTextIcon: {
    color: "var(--so-cyan-text)",
  },
  progressCurrentMarketPrimary: {
    color: "var(--so-primary)",
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
  },
  progressCurrentMarketCyan: {
    color: "var(--so-cyan-text)",
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
  },
  progressRemainingSeconds: {
    color: "#fff",
    fontWeight: 900,
    fontSize: "13.5px",
  },
  progressAbortedText: {
    color: "var(--so-danger-text)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  progressCompletedText: {
    color: "var(--so-success-text)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  progressHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  progressErrorCountBadge: {
    fontSize: "11px",
    fontWeight: 800,
    padding: "2px 8px",
    borderRadius: "4px",
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    color: "var(--so-danger-text)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
  },
  stopFetchingButton: {
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    fontWeight: 700,
    fontSize: "11.5px",
    padding: "4px 12px",
    borderRadius: "6px",
    boxShadow: "0 2px 8px rgba(220, 38, 38, 0.35)",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    cursor: "pointer",
  },
  progressBarTrack: {
    width: "100%",
    height: "6px",
    backgroundColor: "var(--so-surface-card)",
    borderRadius: "3px",
    overflow: "hidden",
  },
  criticalErrorBox: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--so-danger-text)",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    padding: "8px 12px",
    borderRadius: "6px",
    lineHeight: 1.5,
  },
  lastErrorText: {
    fontSize: "11.5px",
    color: "var(--so-text-muted)",
  },
};
