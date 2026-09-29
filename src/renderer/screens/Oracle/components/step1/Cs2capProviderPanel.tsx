import React from "react";
import {
  Loader2,
  Check,
  AlertCircle,
  Zap,
  Database,
  Info,
  Square,
} from "lucide-react";
import { cs2capLogo } from "../../../../../../assets/images";
import { CS2CAP_PROVIDERS } from "../../../../../shared/cs2capProviders";
import { isTradeMarket } from "../../../../../shared/canonicalMarkets";
import {
  MarketSelectionChip,
  MarketSelectionToolbar,
  MarketScopeToggle,
  CacheStatusInfo,
} from "./Step1Common";
import { step1Styles } from "./step1Styles";
import {
  getStreamLiveButtonStyle,
  getStreamingMeterStyle,
  getStreamingMeterStatusStyle,
} from "./step1Styles";
import {
  MarketScope,
  MarketScopePresets,
} from "../../../../store/useOracleStore";
import { Step1CacheStatus } from "./types";

export interface Cs2capProviderPanelProps {
  cacheStatus: Step1CacheStatus;
  hasCs2capKey?: boolean;
  isCs2capStreaming?: boolean;
  cs2capProgress?: any;
  onStreamCs2cap?: () => void;
  onCancelCs2capStream?: () => void;
  isBatchEvaluating: boolean;
  selectedCs2capProviders: string[];
  onToggleCs2capProvider?: (providerId: string) => void;
  onSoloCs2capProvider?: (providerId: string) => void;
  onSelectAllCs2capProviders?: (providers?: string[]) => void;
  onResetDefaultCs2capProviders?: () => void;
  hideTradeMarkets: boolean;
  setHideTradeMarkets: (hide: boolean) => void;
  activeScope: MarketScope;
  onSelectScope: (scope: MarketScope) => void;
  cs2capScopes?: MarketScopePresets<string>;
  getMarketCount: (marketId: string) => number;
  getMissingQtyForMarket: (marketId: string) => number;
}

export const Cs2capProviderPanel: React.FC<Cs2capProviderPanelProps> = ({
  cacheStatus,
  hasCs2capKey,
  isCs2capStreaming,
  cs2capProgress,
  onStreamCs2cap,
  onCancelCs2capStream,
  isBatchEvaluating,
  selectedCs2capProviders,
  onToggleCs2capProvider,
  onSoloCs2capProvider,
  onSelectAllCs2capProviders,
  onResetDefaultCs2capProviders,
  hideTradeMarkets,
  setHideTradeMarkets,
  activeScope,
  onSelectScope,
  cs2capScopes,
  getMarketCount,
  getMissingQtyForMarket,
}) => {
  const cs2capTradeCount = CS2CAP_PROVIDERS.filter((p) =>
    isTradeMarket(p.id),
  ).length;

  const visibleSelectedCs2capCount = hideTradeMarkets
    ? selectedCs2capProviders.filter((p) => !isTradeMarket(p)).length
    : selectedCs2capProviders.length;

  const handleSelectAllCs2cap = () => {
    const providersToSelect = hideTradeMarkets
      ? CS2CAP_PROVIDERS.filter((p) => !isTradeMarket(p.id)).map((p) => p.id)
      : CS2CAP_PROVIDERS.map((p) => p.id);
    onSelectAllCs2capProviders?.(providersToSelect);
  };

  return (
    <div>
      {/* CS2Cap Header */}
      <div style={step1Styles.providerHeader}>
        <div>
          <div style={step1Styles.providerHeaderTitleGroup}>
            <img
              src={cs2capLogo}
              alt="CS2Cap"
              style={step1Styles.providerHeaderLogo}
            />
            <h2 style={step1Styles.providerHeaderTitle}>CS2Cap</h2>
            <span className="badge badge-cyan" style={step1Styles.cs2capLiveBadge}>
              Live Stream
            </span>
          </div>
          <p style={step1Styles.cs2capHeaderDescription}>
            Streams live price snapshots across 40+ global marketplaces
            (Buff163, C5, CSFloat, AvanMarket, etc.) directly to your local
            workstation.
          </p>
        </div>
      </div>

      {/* Dedicated CS2Cap Provider Selection Section */}
      <div style={step1Styles.configSectionCard}>
        <MarketScopeToggle
          activeScope={activeScope}
          onSelectScope={onSelectScope}
          baselineCount={cs2capScopes?.baseline?.length ?? 0}
          snipeCount={cs2capScopes?.snipe?.length ?? 0}
          accentColor="#0891b2"
        />

        <MarketSelectionToolbar
          title="CS2Cap Target Providers Config"
          selectedCount={visibleSelectedCs2capCount}
          totalCount={CS2CAP_PROVIDERS.length}
          itemTypeLabel="Providers"
          tradeCount={cs2capTradeCount}
          hideTradeMarkets={hideTradeMarkets}
          onToggleHideTrade={setHideTradeMarkets}
          onSelectAll={handleSelectAllCs2cap}
          onResetOrDeselect={onResetDefaultCs2capProviders || (() => {})}
          resetLabel="Reset Defaults"
          accentColor="#0891b2"
          badgeClassName="badge-cyan"
          badgeTextColor="#38bdf8"
          badgeBorderColor="rgba(56, 189, 248, 0.4)"
        />

        <p style={step1Styles.configSectionDescription}>
          Choose which of CS2Cap's {CS2CAP_PROVIDERS.length} supported
          marketplaces to query during live NDJSON streaming. Preferences are
          saved automatically.
        </p>

        {/* Interactive Provider Chips Grid */}
        <div style={step1Styles.providerChipsGrid}>
          {(hideTradeMarkets
            ? CS2CAP_PROVIDERS.filter((p) => !isTradeMarket(p.id))
            : CS2CAP_PROVIDERS
          ).map((provider) => (
            <MarketSelectionChip
              key={provider.id}
              id={provider.id}
              name={provider.name}
              isSelected={selectedCs2capProviders.includes(provider.id)}
              onToggle={onToggleCs2capProvider || (() => {})}
              onSolo={onSoloCs2capProvider || (() => {})}
              isTrade={isTradeMarket(provider.id)}
              marketCount={getMarketCount(provider.id)}
              missingQtyCount={getMissingQtyForMarket(provider.id)}
              accentColor="#06b6d4"
            />
          ))}
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

      {/* CS2Cap Status & Streaming Section */}
      <div style={step1Styles.streamingSectionCard}>
        <div style={step1Styles.streamingSectionHeader}>
          <div style={step1Styles.streamingSectionTitle}>
            <Database size={16} style={step1Styles.cyanIcon} /> CS2Cap Streaming
            Pipeline
            {hasCs2capKey ? (
              <span className="badge badge-success" style={step1Styles.badgeSmall}>
                PRO / QUANT ACTIVE
              </span>
            ) : (
              <span className="badge badge-warning" style={step1Styles.badgeSmall}>
                API KEY REQUIRED
              </span>
            )}
          </div>

          <div style={step1Styles.streamingSectionActions}>
            {isCs2capStreaming ? (
              <button
                type="button"
                className="btn btn-sm"
                onClick={onCancelCs2capStream}
                style={step1Styles.cancelStreamButton}
              >
                <Square size={12} fill="#ffffff" /> Cancel Stream
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onStreamCs2cap}
                disabled={
                  !hasCs2capKey || cacheStatus.isFetching || isBatchEvaluating
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
          <div style={step1Styles.cs2capMissingKeyBanner}>
            ⚠️ CS2Cap API Key not configured. Go to{" "}
            <strong>Settings → API Keys</strong> to add your CS2Cap Pro or Quant
            API Key.
          </div>
        )}

        {/* Active Streaming Meter */}
        {cs2capProgress && (
          <div style={getStreamingMeterStyle(cs2capProgress.status === "error")}>
            <div style={step1Styles.streamingMeterHeader}>
              <div
                style={getStreamingMeterStatusStyle(
                  cs2capProgress.status === "error",
                )}
              >
                {cs2capProgress.status === "streaming" ? (
                  <>
                    <Loader2 size={16} className="spin" /> Streaming NDJSON
                    Catalog...
                  </>
                ) : cs2capProgress.status === "completed" ? (
                  <>
                    <Check size={16} style={step1Styles.successIcon} /> Stream
                    Completed Successfully
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
                    <Loader2 size={16} className="spin" /> Connecting...
                  </>
                )}
              </div>
              <span style={step1Styles.streamingElapsedText}>
                {(cs2capProgress.elapsedMs / 1000).toFixed(1)}s elapsed
              </span>
            </div>

            <div style={step1Styles.streamingMetricsGrid}>
              <div style={step1Styles.metricBox}>
                <div style={step1Styles.metricLabel}>Lines Parsed</div>
                <div style={step1Styles.metricValuePrimary}>
                  {cs2capProgress.linesRead.toLocaleString()}
                </div>
              </div>
              <div style={step1Styles.metricBox}>
                <div style={step1Styles.metricLabel}>Unique Skins</div>
                <div style={step1Styles.metricValueCyan}>
                  {cs2capProgress.itemsCount.toLocaleString()}
                </div>
              </div>
              <div style={step1Styles.metricBox}>
                <div style={step1Styles.metricLabel}>Providers Seen</div>
                <div style={step1Styles.metricValuePrimary}>
                  {cs2capProgress.providersCount}
                </div>
              </div>
              <div style={step1Styles.metricBox}>
                <div style={step1Styles.metricLabel}>Transferred</div>
                <div style={step1Styles.metricValuePrimary}>
                  {(cs2capProgress.bytesReceived / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            </div>

            {cs2capProgress.lastError && (
              <div style={step1Styles.streamingErrorText}>
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
  );
};
