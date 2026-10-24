import React, { useState } from "react";
import {
  AlertTriangle,
  CheckSquare,
  EyeOff,
  Gauge,
  Globe2,
  Loader2,
  PlusCircle,
  Search,
  Square,
  Wallet,
  X,
} from "lucide-react";
import type { MarketGapResultItem } from "../../../shared/types";
import type { MarketGapCardProps } from "./types";

type AllowedWears = {
  fn: boolean;
  mw: boolean;
  ft: boolean;
  ww: boolean;
  bs: boolean;
  souvenir: boolean;
  sticker: boolean;
};

export interface MarketGapTabProps {
  results: MarketGapResultItem[];
  isRunning: boolean;
  runScan: (overrides?: { buyCeilingOnly?: boolean }) => Promise<void>;
  minOtherMarkets: number;
  setMinOtherMarkets: (val: number) => void;
  minPrice: string;
  setMinPrice: (val: string) => void;
  maxPrice: string;
  setMaxPrice: (val: string) => void;
  handleSetBalanceAsMax: () => void;
  userBalance?: number;
  buyCeilingOnly: boolean;
  setBuyCeilingOnly: (val: boolean) => void;
  minSssScore: number;
  setMinSssScore: (val: number) => void;
  allowedWears: AllowedWears;
  setAllowedWears: React.Dispatch<React.SetStateAction<AllowedWears>>;
  selectedItems: Record<string, boolean>;
  setSelectedItems: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  processingName: string | null;
  batchProcessing: boolean;
  handleCreateOrder: (
    item: MarketGapResultItem,
    targetPrice?: number,
  ) => Promise<void>;
  handleBatchCreateOrders: () => Promise<void>;
  handleOpenTargetMarket: (name: string) => void;
  handleOpenLookupModal: (
    name: string,
    acceptedPrice?: number,
    currentMarketPrice?: number,
    iconUrl?: string,
  ) => void;
  getWearShortcut: (wearText?: string) => string;
  isSidebarExpanded: boolean;
  selectedTotal?: number;
  activeOrdersTotal?: number;
  maxLimitValue?: number;
  targetMarketName: string;
  createOrderLabel: string;
  batchActionLabel: string;
  orderPlacedLabel: string;
  targetPriceLabel: string;
  limitCaption?: string;
  CardComponent: React.ComponentType<MarketGapCardProps>;
  targetPrices?: Record<string, number>;
  onTargetPriceChange?: (name: string, price: number) => void;
}

const WEAR_FILTERS: Array<{ key: keyof AllowedWears; label: string }> = [
  { key: "fn", label: "FN" },
  { key: "mw", label: "MW" },
  { key: "ft", label: "FT" },
  { key: "ww", label: "WW" },
  { key: "bs", label: "BS" },
  { key: "souvenir", label: "Souvenir" },
  { key: "sticker", label: "Sticker" },
];

export const MarketGapTab: React.FC<MarketGapTabProps> = ({
  results,
  isRunning,
  runScan,
  minOtherMarkets,
  setMinOtherMarkets,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  handleSetBalanceAsMax,
  userBalance,
  buyCeilingOnly,
  setBuyCeilingOnly,
  minSssScore,
  setMinSssScore,
  allowedWears,
  setAllowedWears,
  selectedItems,
  setSelectedItems,
  processingName,
  batchProcessing,
  handleCreateOrder,
  handleBatchCreateOrders,
  handleOpenTargetMarket,
  handleOpenLookupModal,
  getWearShortcut,
  isSidebarExpanded,
  selectedTotal = 0,
  activeOrdersTotal = 0,
  maxLimitValue = 0,
  targetMarketName,
  createOrderLabel,
  batchActionLabel,
  orderPlacedLabel,
  targetPriceLabel,
  limitCaption = "10x balance limit",
  CardComponent: Card,
  targetPrices,
  onTargetPriceChange,
}) => {
  const [showNameWarning, setShowNameWarning] = useState(false);
  const [sssText, setSssText] = useState(() => String(minSssScore));
  const [hidePlaced, setHidePlaced] = useState(false);
  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const visibleResults = hidePlaced
    ? results.filter((item) => !item.hasExistingOrder)
    : results;
  const allPlacedHidden =
    hidePlaced && results.length > 0 && visibleResults.length === 0;
  const projectedTotalValue = activeOrdersTotal + selectedTotal;
  const isLimitExceeded =
    maxLimitValue > 0 && projectedTotalValue > maxLimitValue;

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    visibleResults.forEach((item) => {
      if (!item.hasExistingOrder && item.acceptedPrice) {
        next[item.name] = true;
      }
    });
    setSelectedItems(next);
  };

  const handleToggleHidePlaced = () => {
    setHidePlaced((prev) => {
      const next = !prev;
      if (next) {
        setSelectedItems((prevSelected) => {
          const copy = { ...prevSelected };
          results.forEach((item) => {
            if (item.hasExistingOrder) copy[item.name] = false;
          });
          return copy;
        });
      }
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectedItems({});
  };

  return (
    <div style={styles.container}>
      {/* Control Bar */}
      <div style={styles.controlBar}>
        <div style={styles.leftInputsWrapper}>
          {/* Minimum Other Markets Filter */}
          <div style={styles.filterPill}>
            <span style={styles.filterLabel}>Min Other Markets:</span>
            <input
              type="number"
              min="2"
              max="10"
              step="1"
              value={minOtherMarkets}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setMinOtherMarkets(
                  isNaN(val) ? 3 : Math.max(2, Math.min(10, val)),
                );
              }}
              style={styles.numberInput}
            />
          </div>

          {/* Price Range Filter */}
          <div
            style={styles.filterPill}
            title="Filters by the lowest available source-market price"
          >
            <span style={styles.filterLabel}>Price Range ($):</span>
            <input
              type="number"
              min="0"
              step="any"
              value={minPrice}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setMinPrice("");
                  return;
                }
                if (val.includes("-")) return;
                const num = parseFloat(val);
                if (!isNaN(num) && num < 0) return;
                setMinPrice(val);
              }}
              onKeyDown={(e) => {
                if (e.key === "-" || e.key === "e" || e.key === "E") {
                  e.preventDefault();
                }
              }}
              placeholder="Min"
              style={styles.numberInputWide}
            />
            <span style={styles.dashSeparator}>-</span>
            <input
              type="number"
              min="0"
              step="any"
              value={maxPrice}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setMaxPrice("");
                  return;
                }
                if (val.includes("-")) return;
                const num = parseFloat(val);
                if (!isNaN(num) && num < 0) return;
                setMaxPrice(val);
              }}
              onKeyDown={(e) => {
                if (e.key === "-" || e.key === "e" || e.key === "E") {
                  e.preventDefault();
                }
              }}
              placeholder="Max"
              style={styles.numberInputWide}
            />
            <button
              type="button"
              onClick={handleSetBalanceAsMax}
              title={`Set Max Price to Available Balance (${userBalance !== undefined ? `$${userBalance.toFixed(2)}` : "$0.00"})`}
              style={styles.walletButton}
            >
              <Wallet size={12} />
            </button>
          </div>

          {/* Buy Ceiling Only Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !buyCeilingOnly;
              setBuyCeilingOnly(next);
              void runScan({ buyCeilingOnly: next });
            }}
            className={`btn ${buyCeilingOnly ? "btn-primary" : "btn-outline"} btn-sm`}
            style={styles.ceilingToggle}
            title="Only show items that have an Oracle Buy Ceiling available"
          >
            <Gauge size={12} /> Buy Ceiling Only
          </button>

          {/* Hide Already Placed Orders/Targets */}
          <button
            type="button"
            onClick={handleToggleHidePlaced}
            className={`btn ${hidePlaced ? "btn-primary" : "btn-outline"} btn-sm`}
            style={styles.ceilingToggle}
            title="Hide items that already have an existing buy order or target"
          >
            <EyeOff size={12} /> Hide Placed
          </button>

          {/* Minimum SSS Filter */}
          <div
            style={styles.filterPill}
            title="Minimum Supply Stability Score (SSS): cross-market distribution, HHI balance, and volume depth."
          >
            <span style={styles.filterLabel}>Min SSS:</span>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={sssText}
              onChange={(e) => {
                const raw = e.target.value;
                if (!/^\d*\.?\d{0,2}$/.test(raw)) return;
                setSssText(raw);
                const parsed = parseFloat(raw);
                setMinSssScore(
                  Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
                );
              }}
              onBlur={() => {
                const parsed = parseFloat(sssText);
                const next = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
                setSssText(next.toFixed(1));
                setMinSssScore(next);
              }}
              style={styles.numberInputSmall}
              aria-label="Minimum Supply Stability Score"
            />
          </div>

          {/* Wear Condition Selector Badges */}
          <div style={styles.wearsWrapper}>
            <span style={styles.wearsLabel}>Wears:</span>
            {WEAR_FILTERS.map((w) => {
              const active = allowedWears[w.key];
              return (
                <button
                  key={w.key}
                  type="button"
                  onClick={() =>
                    setAllowedWears((prev) => ({
                      ...prev,
                      [w.key]: !prev[w.key],
                    }))
                  }
                  style={getWearBadgeStyle(active)}
                >
                  {w.label}
                </button>
              );
            })}
          </div>

          {/* Name Matching Warning (icon only) */}
          <div
            style={styles.nameWarningWrapper}
            onMouseEnter={() => setShowNameWarning(true)}
            onMouseLeave={() => setShowNameWarning(false)}
          >
            <button
              type="button"
              style={styles.nameWarningTrigger}
              onClick={() => setShowNameWarning(true)}
              onFocus={() => setShowNameWarning(true)}
              onBlur={() => setShowNameWarning(false)}
              aria-expanded={showNameWarning}
              title="Item name matching warning"
            >
              <AlertTriangle size={12} />
            </button>
            {showNameWarning && (
              <div style={styles.nameWarningPopover} role="tooltip">
                <div style={styles.nameWarningTitle}>
                  <AlertTriangle size={12} /> Possible false gaps
                </div>
                <div style={styles.nameWarningText}>
                  Some items may appear in this list even though they exist on{" "}
                  {targetMarketName}, or may be missed, when the marketplace and
                  price provider use different item names. Verify the item
                  before creating an order or target.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Status & Scan Action */}
        <div style={styles.rightActionsGroup}>
          {visibleResults.length > 0 && (
            <span style={styles.resultCount}>{visibleResults.length} gaps</span>
          )}
          <button
            onClick={() => void runScan()}
            disabled={isRunning}
            className="btn btn-primary btn-sm"
            style={styles.scanButton}
          >
            {isRunning ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <Search size={14} />
            )}{" "}
            Scan
          </button>
        </div>
      </div>

      {/* Floating Selection Toolbar */}
      {selectedCount > 0 && (
        <div style={getFloatingToolbarStyle(isSidebarExpanded)}>
          <div style={styles.floatingToolbarLeft}>
            <span style={styles.floatingToolbarSelectedText}>
              <CheckSquare size={16} style={styles.checkSquareIcon} />
              <span>{selectedCount} Selected Opportunities</span>
            </span>
            <div style={styles.floatingToolbarDivider} />
            <button
              onClick={handleSelectAll}
              className="btn btn-sm btn-ghost"
              style={styles.ghostToolbarButton}
            >
              <CheckSquare size={12} /> Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="btn btn-sm btn-ghost"
              style={styles.ghostClearButton}
            >
              <Square size={12} /> Clear Selection
            </button>
          </div>

          <div style={styles.floatingToolbarRight}>
            <div style={styles.limitIndicatorPill}>
              <span style={styles.statLabelMuted}>
                Selected:{" "}
                <strong className="tabular-nums" style={styles.statWhiteText}>
                  ${selectedTotal.toFixed(2)}
                </strong>
              </span>

              {maxLimitValue > 0 && (
                <>
                  <span style={styles.bulletSeparator}>•</span>
                  <span
                    style={getProjectedValueContainerStyle(isLimitExceeded)}
                  >
                    {isLimitExceeded && (
                      <AlertTriangle
                        size={12}
                        style={styles.limitWarningIcon}
                      />
                    )}
                    <span>
                      Projected:{" "}
                      <strong
                        className="tabular-nums"
                        style={getProjectedTotalTextStyle(isLimitExceeded)}
                      >
                        ${projectedTotalValue.toFixed(2)}
                      </strong>
                      <span style={styles.statLabelMuted}>
                        {" "}
                        / ${maxLimitValue.toFixed(2)}
                      </span>
                    </span>
                  </span>
                </>
              )}
            </div>

            <button
              onClick={handleBatchCreateOrders}
              disabled={batchProcessing}
              className={`btn ${isLimitExceeded ? "btn-danger" : "btn-primary"} btn-sm`}
              style={styles.batchCreateButton}
              title={
                isLimitExceeded
                  ? `Warning: Total commitment ($${projectedTotalValue.toFixed(2)}) exceeds ${limitCaption} ($${maxLimitValue.toFixed(2)})`
                  : undefined
              }
            >
              {batchProcessing ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <PlusCircle size={13} />
              )}
              {batchActionLabel} ({selectedCount})
            </button>
            <button
              onClick={handleDeselectAll}
              className="btn btn-sm btn-ghost"
              style={styles.clearCircleButton}
              title="Clear selection"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Market Gap Grid View */}
      <div style={getGridScrollViewStyle(selectedCount > 0)}>
        {visibleResults.length === 0 ? (
          <div className="card" style={styles.emptyCard}>
            {isRunning ? (
              <div>
                Scanning cached market availability for {targetMarketName}{" "}
                listing gaps...
              </div>
            ) : allPlacedHidden ? (
              <div>
                <EyeOff size={32} style={styles.emptyIcon} />
                <div style={styles.emptyTitle}>All Gaps Already Placed</div>
                <div style={styles.emptySubtitle}>
                  Every scanned gap already has an existing order or target.
                  Turn off Hide Placed or rescan to review them.
                </div>
              </div>
            ) : (
              <div>
                <Globe2 size={32} style={styles.emptyIcon} />
                <div style={styles.emptyTitle}>No Market Gaps Found</div>
                <div style={styles.emptySubtitle}>
                  Scan the cached market matrix to surface items listed on{" "}
                  {minOtherMarkets}+ other markets with no active{" "}
                  {targetMarketName} listing.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={styles.cardsGrid}>
            {visibleResults.map((item) => {
              const match = item.name.match(/^(.+?)\s*\(([^)]+)\)$/);
              const wearText = match ? match[2] : "";
              const wearShortcut = getWearShortcut(wearText);

              return (
                <Card
                  key={item.name}
                  item={item}
                  isSelected={!!selectedItems[item.name]}
                  onToggleSelect={() =>
                    setSelectedItems((prev) => ({
                      ...prev,
                      [item.name]: !prev[item.name],
                    }))
                  }
                  isProcessing={processingName === item.name}
                  onCreateOrder={handleCreateOrder}
                  onOpenTargetMarket={handleOpenTargetMarket}
                  onOpenLookup={handleOpenLookupModal}
                  wearShortcut={wearShortcut}
                  targetMarketName={targetMarketName}
                  createOrderLabel={createOrderLabel}
                  orderPlacedLabel={orderPlacedLabel}
                  targetPriceLabel={targetPriceLabel}
                  targetPrice={targetPrices?.[item.name]}
                  onTargetPriceChange={
                    onTargetPriceChange
                      ? (price) => onTargetPriceChange(item.name, price)
                      : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC STYLE HELPERS ─────────────────────────

const getWearBadgeStyle = (active: boolean): React.CSSProperties => ({
  padding: "2px 6px",
  fontSize: "9.5px",
  fontWeight: 800,
  borderRadius: "3px",
  cursor: "pointer",
  backgroundColor: active ? "var(--so-primary)" : "var(--so-surface-panel)",
  color: active ? "#ffffff" : "var(--so-text-muted)",
  border: active ? "none" : "1px solid var(--so-border-subtle)",
});

const getFloatingToolbarStyle = (
  isSidebarExpanded: boolean,
): React.CSSProperties => ({
  position: "fixed",
  bottom: "24px",
  left: isSidebarExpanded ? "246px" : "84px",
  right: "24px",
  zIndex: 1000,
  backgroundColor: "rgba(23, 23, 33, 0.94)",
  backdropFilter: "blur(12px)",
  border: "1px solid var(--so-primary)",
  borderRadius: "var(--so-radius-md)",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(99, 102, 241, 0.25)",
  padding: "12px 20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  animation: "slideUp 0.2s ease-out",
  transition: "left 0.2s ease",
});

const getProjectedValueContainerStyle = (
  isLimitExceeded: boolean,
): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  color: isLimitExceeded ? "#ef4444" : "var(--so-text-secondary)",
  fontWeight: 700,
});

const getProjectedTotalTextStyle = (
  isLimitExceeded: boolean,
): React.CSSProperties => ({
  color: isLimitExceeded ? "#ef4444" : "var(--so-accent-cyan)",
});

const getGridScrollViewStyle = (
  hasSelection: boolean,
): React.CSSProperties => ({
  flex: 1,
  overflowY: "auto",
  minHeight: 0,
  paddingBottom: hasSelection ? "75px" : 0,
});

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    gap: "10px",
    minHeight: 0,
  } as React.CSSProperties,

  controlBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    padding: "8px 14px",
    flexWrap: "wrap",
    gap: "10px",
    flexShrink: 0,
  } as React.CSSProperties,

  leftInputsWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    flex: "1 1 auto",
    minWidth: 0,
  } as React.CSSProperties,

  filterPill: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    padding: "4px 8px",
    borderRadius: "var(--so-radius-sm)",
    fontSize: "11px",
  } as React.CSSProperties,

  filterLabel: {
    fontWeight: 700,
    color: "var(--so-text-secondary)",
  } as React.CSSProperties,

  numberInput: {
    width: "44px",
    padding: "1px 4px",
    fontSize: "11px",
    fontWeight: 800,
    textAlign: "center",
    borderRadius: "3px",
    border: "1px solid var(--so-border-subtle)",
    background: "var(--so-surface-card)",
    color: "var(--so-text-primary)",
  } as React.CSSProperties,

  numberInputWide: {
    width: "72px",
    padding: "2px 6px",
    fontSize: "11px",
    fontWeight: 800,
    textAlign: "center",
    borderRadius: "3px",
    border: "1px solid var(--so-border-subtle)",
    background: "var(--so-surface-card)",
    color: "var(--so-text-primary)",
  } as React.CSSProperties,

  numberInputSmall: {
    width: "52px",
    padding: "1px 4px",
    fontSize: "11px",
    fontWeight: 800,
    textAlign: "center",
    borderRadius: "3px",
    border: "1px solid var(--so-border-subtle)",
    background: "var(--so-surface-card)",
    color: "var(--so-text-primary)",
  } as React.CSSProperties,

  dashSeparator: {
    color: "var(--so-text-muted)",
  } as React.CSSProperties,

  walletButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2px 4px",
    borderRadius: "3px",
    background: "var(--so-surface-card)",
    border: "1px solid var(--so-border-subtle)",
    color: "var(--so-accent-cyan)",
    cursor: "pointer",
    transition: "all 0.15s ease",
  } as React.CSSProperties,

  ceilingToggle: {
    fontWeight: 700,
    fontSize: "11px",
    display: "flex",
    alignItems: "center",
    gap: "5px",
  } as React.CSSProperties,

  wearsWrapper: {
    display: "flex",
    gap: "3px",
    alignItems: "center",
  } as React.CSSProperties,

  wearsLabel: {
    fontSize: "10.5px",
    fontWeight: 700,
    color: "var(--so-text-muted)",
    marginRight: "2px",
  } as React.CSSProperties,

  rightActionsGroup: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
    marginLeft: "auto",
  } as React.CSSProperties,

  nameWarningWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginLeft: "auto",
  } as React.CSSProperties,

  nameWarningTrigger: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "22px",
    height: "22px",
    padding: 0,
    borderRadius: "var(--so-radius-sm)",
    background: "rgba(245, 158, 11, 0.12)",
    border: "1px solid rgba(245, 158, 11, 0.35)",
    color: "#f59e0b",
    cursor: "pointer",
  } as React.CSSProperties,

  nameWarningPopover: {
    position: "absolute",
    bottom: "100%",
    right: 0,
    width: "300px",
    padding: "10px",
    borderRadius: "var(--so-radius-sm)",
    background: "var(--so-surface-card)",
    border: "1px solid rgba(245, 158, 11, 0.45)",
    boxShadow: "0 10px 28px rgba(0, 0, 0, 0.55)",
    zIndex: 1200,
    textAlign: "left" as const,
  } as React.CSSProperties,

  nameWarningTitle: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    fontWeight: 800,
    color: "#f59e0b",
    marginBottom: "4px",
  } as React.CSSProperties,

  nameWarningText: {
    fontSize: "10.5px",
    lineHeight: 1.45,
    color: "var(--so-text-secondary)",
  } as React.CSSProperties,

  resultCount: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--so-text-muted)",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  scanButton: {
    fontWeight: 800,
    whiteSpace: "nowrap",
    flexShrink: 0,
  } as React.CSSProperties,

  floatingToolbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  } as React.CSSProperties,

  floatingToolbarSelectedText: {
    fontSize: "13px",
    fontWeight: 800,
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  } as React.CSSProperties,

  checkSquareIcon: {
    color: "var(--so-primary)",
  } as React.CSSProperties,

  floatingToolbarDivider: {
    width: "1px",
    height: "16px",
    backgroundColor: "var(--so-border-subtle)",
  } as React.CSSProperties,

  ghostToolbarButton: {
    fontSize: "11px",
    padding: "3px 8px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  } as React.CSSProperties,

  ghostClearButton: {
    fontSize: "11px",
    padding: "3px 8px",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--so-text-primary)",
  } as React.CSSProperties,

  floatingToolbarRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  } as React.CSSProperties,

  limitIndicatorPill: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "11px",
    backgroundColor: "var(--so-surface-panel)",
    padding: "4px 10px",
    borderRadius: "var(--so-radius-sm)",
    border: "1px solid var(--so-border-subtle)",
  } as React.CSSProperties,

  statLabelMuted: {
    color: "var(--so-text-muted)",
  } as React.CSSProperties,

  statWhiteText: {
    color: "#ffffff",
  } as React.CSSProperties,

  bulletSeparator: {
    color: "var(--so-border-subtle)",
  } as React.CSSProperties,

  limitWarningIcon: {
    color: "#ef4444",
  } as React.CSSProperties,

  batchCreateButton: {
    fontWeight: 800,
    fontSize: "12px",
    padding: "6px 14px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#ffffff",
  } as React.CSSProperties,

  clearCircleButton: {
    padding: "6px",
    borderRadius: "50%",
    color: "var(--so-text-primary)",
  } as React.CSSProperties,

  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "10px",
    paddingBottom: "12px",
  } as React.CSSProperties,

  emptyCard: {
    textAlign: "center",
    padding: "50px 20px",
    color: "var(--so-text-muted)",
  } as React.CSSProperties,

  emptyIcon: {
    marginBottom: "10px",
    opacity: 0.5,
    color: "var(--so-accent-cyan)",
  } as React.CSSProperties,

  emptyTitle: {
    fontWeight: 700,
    fontSize: "15px",
    color: "var(--so-text-primary)",
    marginBottom: "4px",
  } as React.CSSProperties,

  emptySubtitle: {
    fontSize: "12px",
  } as React.CSSProperties,
};
