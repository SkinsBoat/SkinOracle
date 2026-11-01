import React from "react";
import { Database, Info, Layers, RefreshCw, Sliders, Target } from "lucide-react";
import {
  getMarketDisplayName,
  isMarketMatch,
  isTradeMarket,
} from "../../../../shared/canonicalMarkets";
import {
  MarketSelectionChip,
  MarketSelectionToolbar,
} from "../../Oracle/components/step1/Step1Common";
import { AllowedWears } from "../hooks/useSoCloseScanner";

export interface SoCloseControlsProps {
  availableMarkets: string[];
  visibleMarkets: string[];
  selectedFilterMarkets: string[];
  isAllSelected: boolean;
  selectedCount: number;
  tradeCount: number;
  hideTradeMarkets: boolean;
  isLoadingMarkets: boolean;
  cacheItemCount: number;
  onToggleHideTrade: (hide: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onToggleMarket: (marketId: string) => void;
  onSoloMarket: (marketId: string) => void;
  getMarketCount: (marketId: string) => number;
  minPrice: string;
  setMinPrice: (value: string) => void;
  maxPrice: string;
  setMaxPrice: (value: string) => void;
  soCloseMaxCloseness: string;
  setSoCloseMaxCloseness: (value: string) => void;
  soCloseMinSssScore: string;
  setSoCloseMinSssScore: (value: string) => void;
  allowedWears: AllowedWears;
  setAllowedWears: React.Dispatch<React.SetStateAction<AllowedWears>>;
  isScanning: boolean;
  onScan: () => void;
}

/**
 * Scanner configuration: market filter grid, wear filters, price/threshold
 * parameters, and the primary Scan action.
 */
export const SoCloseControls: React.FC<SoCloseControlsProps> = ({
  availableMarkets,
  visibleMarkets,
  selectedFilterMarkets,
  isAllSelected,
  selectedCount,
  tradeCount,
  hideTradeMarkets,
  isLoadingMarkets,
  cacheItemCount,
  onToggleHideTrade,
  onSelectAll,
  onDeselectAll,
  onToggleMarket,
  onSoloMarket,
  getMarketCount,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  soCloseMaxCloseness,
  setSoCloseMaxCloseness,
  soCloseMinSssScore,
  setSoCloseMinSssScore,
  allowedWears,
  setAllowedWears,
  isScanning,
  onScan,
}) => {
  const closenessPercent = (
    (Math.max(1.0, parseFloat(soCloseMaxCloseness) || 1.0) - 1) *
    100
  ).toFixed(0);

  return (
    <>
      {/* Market filter grid */}
      <div style={styles.targetMarketPanel}>
        <MarketSelectionToolbar
          title="Target Markets Filter"
          selectedCount={selectedCount}
          totalCount={availableMarkets.length}
          itemTypeLabel="Markets"
          tradeCount={tradeCount}
          hideTradeMarkets={hideTradeMarkets}
          onToggleHideTrade={onToggleHideTrade}
          onSelectAll={onSelectAll}
          onResetOrDeselect={onDeselectAll}
          resetLabel="Deselect All"
          accentColor="var(--so-accent-cyan)"
          badgeClassName="badge-cyan"
          badgeTextColor="#38bdf8"
          badgeBorderColor="rgba(56, 189, 248, 0.4)"
        />

        {isLoadingMarkets ? (
          <div style={styles.marketLoadingBox}>
            <RefreshCw size={15} className="spin" />
            Loading & indexing available markets from price cache...
          </div>
        ) : cacheItemCount === 0 || visibleMarkets.length === 0 ? (
          <div style={styles.noCacheMarketsBox}>
            <Database size={16} style={styles.noCacheIcon} />
            <div style={styles.noCacheTextContainer}>
              <span style={styles.noCacheTitle}>
                No Market Price Cache Available
              </span>
              <p style={styles.noCacheDesc}>
                Build or update your local price cache in Step 1 to populate
                available markets for filtering.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div style={styles.marketChipsGrid}>
              {visibleMarkets.map((marketId) => {
                const isSelected =
                  isAllSelected ||
                  selectedFilterMarkets.some((m) =>
                    isMarketMatch(m, marketId),
                  );
                return (
                  <MarketSelectionChip
                    key={marketId}
                    id={marketId}
                    name={getMarketDisplayName(marketId)}
                    isSelected={isSelected}
                    onToggle={onToggleMarket}
                    onSolo={onSoloMarket}
                    isTrade={isTradeMarket(marketId)}
                    marketCount={getMarketCount(marketId)}
                    missingQtyCount={0}
                    accentColor="var(--so-accent-cyan)"
                    variant="soclose"
                  />
                );
              })}
            </div>

            <div style={styles.marketHintText}>
              <Layers size={14} /> Right-click any market chip to solo it.
            </div>
          </>
        )}
      </div>

      {/* Scanner parameters */}
      <div style={styles.scannerConfigPanel}>
        <div style={styles.scannerHeaderRow}>
          <div style={styles.scannerTitleGroup}>
            <Sliders size={16} style={styles.scannerTitleIcon} />
            <span style={styles.scannerTitleText}>Scanner Parameters</span>
          </div>

          <div style={styles.wearFiltersRow}>
            {(
              [
                ["fn", "FN"],
                ["mw", "MW"],
                ["ft", "FT"],
                ["ww", "WW"],
                ["bs", "BS"],
                ["souvenir", "Souvenir"],
                ["sticker", "Stickers"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                style={getWearLabelStyle(Boolean((allowedWears as any)[key]))}
              >
                <input
                  type="checkbox"
                  checked={(allowedWears as any)[key]}
                  onChange={(e) =>
                    setAllowedWears((prev) => ({
                      ...prev,
                      [key]: e.target.checked,
                    }))
                  }
                  style={styles.wearCheckbox}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div style={styles.controlsRow}>
          <div style={styles.controlGroup}>
            <span style={styles.controlLabel}>Price Range ($):</span>
            <input
              type="number"
              min="0"
              step="any"
              className="input"
              style={styles.priceInput}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min"
            />
            <span style={styles.separatorDash}>-</span>
            <input
              type="number"
              min="0"
              step="any"
              className="input"
              style={styles.priceInput}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max"
            />
          </div>

          <div style={styles.controlGroupWide}>
            <div style={styles.subControlGroup}>
              <span
                title="Distance ceiling relative to accepted buy ceiling (1.08 = within 8%)"
                style={styles.controlLabel}
              >
                Max Distance:
              </span>
              <input
                type="number"
                step="0.01"
                className="input"
                style={styles.closenessInput}
                value={soCloseMaxCloseness}
                onChange={(e) => setSoCloseMaxCloseness(e.target.value)}
                placeholder="1.08"
              />
              <span style={styles.closenessPercentTag}>
                (+{closenessPercent}%)
              </span>
            </div>

            <div style={styles.subSeparator} />

            <div style={styles.subControlGroup}>
              <span
                title="Supply Stability Score (SSS) measures cross-market availability, liquidity distribution, and listed stock depth relative to price bracket."
                style={styles.sssLabel}
              >
                SSS:
                <Info size={12} style={styles.sssInfoIcon} />
              </span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1.5"
                className="input"
                style={styles.sssInput}
                value={soCloseMinSssScore}
                onChange={(e) => setSoCloseMinSssScore(e.target.value)}
                placeholder="1.2"
              />
            </div>
          </div>

          <button
            type="button"
            className={`btn btn-primary ${isScanning ? "btn-loading" : ""}`}
            onClick={onScan}
            disabled={isScanning}
            style={styles.scanBtn}
          >
            {isScanning ? (
              <>
                <RefreshCw size={14} className="spin" /> Scanning...
              </>
            ) : (
              <>
                <Target size={14} /> Scan
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

function getWearLabelStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11.5px",
    fontWeight: active ? 700 : 500,
    color: active ? "var(--so-text-primary)" : "var(--so-text-muted)",
    cursor: "pointer",
  };
}

const styles: Record<string, React.CSSProperties> = {
  targetMarketPanel: {
    padding: "18px 20px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
  },
  marketLoadingBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "28px 16px",
    color: "var(--so-text-muted)",
    fontSize: "12.5px",
    fontWeight: 600,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    borderRadius: "var(--so-radius-sm)",
    border: "1px dashed var(--so-border-subtle)",
    marginBottom: "12px",
  },
  noCacheMarketsBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px 18px",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    borderRadius: "var(--so-radius-sm)",
    border: "1px dashed rgba(245, 158, 11, 0.3)",
    marginBottom: "4px",
  },
  noCacheIcon: {
    color: "var(--so-warning)",
    flexShrink: 0,
  },
  noCacheTextContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  noCacheTitle: {
    fontSize: "12.5px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
  },
  noCacheDesc: {
    fontSize: "11.5px",
    color: "var(--so-text-muted)",
    margin: 0,
  },
  marketChipsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))",
    gap: "8px",
    marginBottom: "12px",
  },
  marketHintText: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  scannerConfigPanel: {
    padding: "18px 20px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  scannerHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  scannerTitleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  scannerTitleIcon: {
    color: "var(--so-accent-cyan)",
  },
  scannerTitleText: {
    fontSize: "13.5px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
  },
  wearFiltersRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  wearCheckbox: {
    width: "13px",
    height: "13px",
    accentColor: "var(--so-primary)",
  },
  controlsRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
  },
  controlGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  controlGroupWide: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
  },
  controlLabel: {
    fontSize: "11.5px",
    fontWeight: 700,
    color: "var(--so-text-secondary)",
  },
  priceInput: {
    width: "82px",
  },
  separatorDash: {
    color: "var(--so-text-muted)",
  },
  subControlGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  closenessInput: {
    width: "72px",
  },
  closenessPercentTag: {
    fontSize: "11px",
    color: "var(--so-accent-cyan)",
    fontWeight: 700,
  },
  subSeparator: {
    width: "1px",
    height: "20px",
    backgroundColor: "var(--so-border-subtle)",
  },
  sssLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11.5px",
    fontWeight: 700,
    color: "var(--so-text-secondary)",
  },
  sssInfoIcon: {
    color: "var(--so-text-muted)",
  },
  sssInput: {
    width: "64px",
  },
  scanBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    marginLeft: "auto",
  },
};
