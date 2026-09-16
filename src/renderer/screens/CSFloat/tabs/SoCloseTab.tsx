import React from "react";
import {
  Zap,
  Wallet,
  Loader2,
  CheckSquare,
  Square,
  X,
  PlusCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import {
  CSFloatSoCloseCard,
  SoCloseResultItem,
} from "../components/CSFloatSoCloseCard";

interface SoCloseTabProps {
  soCloseResults: SoCloseResultItem[];
  isSoCloseRunning: boolean;
  runSoCloseScan: () => Promise<void>;
  soCloseMinPrice: string;
  setSoCloseMinPrice: (val: string) => void;
  soCloseMaxPrice: string;
  setSoCloseMaxPrice: (val: string) => void;
  handleSetBalanceAsMax: () => void;
  userData: {
    username?: string;
    avatar?: string;
    balance?: number;
  } | null;
  soCloseMaxCloseness: number;
  setSoCloseMaxCloseness: (val: number) => void;
  soCloseMinSssScore: number;
  setSoCloseMinSssScore: (val: number) => void;
  soCloseAllowedWears: {
    fn: boolean;
    mw: boolean;
    ft: boolean;
    ww: boolean;
    bs: boolean;
    souvenir: boolean;
    sticker: boolean;
  };
  setSoCloseAllowedWears: React.Dispatch<React.SetStateAction<any>>;
  selectedSoCloseItems: Record<string, boolean>;
  setSelectedSoCloseItems: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  soCloseProcessingName: string | null;
  batchSoCloseProcessing: boolean;
  handleCreateSoCloseBuyOrder: (item: SoCloseResultItem) => Promise<void>;
  handleBatchCreateSoCloseOrders: () => Promise<void>;
  handleOpenCsfloatMarket: (name: string) => void;
  handleOpenLookupModal: (
    name: string,
    acceptedPrice?: number,
    currentMarketPrice?: number,
    iconUrl?: string,
  ) => void;
  getWearShortcut: (wearText?: string) => string;
  isSidebarExpanded: boolean;
  selectedSoCloseTotal?: number;
  activeOrdersTotal?: number;
  maxLimitValue?: number;
}

export const SoCloseTab: React.FC<SoCloseTabProps> = ({
  soCloseResults,
  isSoCloseRunning,
  runSoCloseScan,
  soCloseMinPrice,
  setSoCloseMinPrice,
  soCloseMaxPrice,
  setSoCloseMaxPrice,
  handleSetBalanceAsMax,
  userData,
  soCloseMaxCloseness,
  setSoCloseMaxCloseness,
  soCloseMinSssScore,
  setSoCloseMinSssScore,
  soCloseAllowedWears,
  setSoCloseAllowedWears,
  selectedSoCloseItems,
  setSelectedSoCloseItems,
  soCloseProcessingName,
  batchSoCloseProcessing,
  handleCreateSoCloseBuyOrder,
  handleBatchCreateSoCloseOrders,
  handleOpenCsfloatMarket,
  handleOpenLookupModal,
  getWearShortcut,
  isSidebarExpanded,
  selectedSoCloseTotal = 0,
  activeOrdersTotal = 0,
  maxLimitValue = 0,
}) => {
  const selectedSoCloseCount =
    Object.values(selectedSoCloseItems).filter(Boolean).length;
  const projectedTotalValue = activeOrdersTotal + selectedSoCloseTotal;
  const isLimitExceeded =
    maxLimitValue > 0 && projectedTotalValue > maxLimitValue;

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    soCloseResults.forEach((item) => {
      if (!item.hasExistingOrder) {
        next[item.name] = true;
      }
    });
    setSelectedSoCloseItems(next);
  };

  const handleDeselectAll = () => {
    setSelectedSoCloseItems({});
  };

  return (
    <div style={styles.container}>
      {/* Control Bar */}
      <div style={styles.controlBar}>
        {/* Left Scanner Inputs & Filters */}
        <div style={styles.leftInputsWrapper}>
          {/* Price Range Filter Inputs */}
          <div style={styles.filterPill}>
            <span style={styles.filterLabel}>
              Price Range ($):
            </span>
            <input
              type="number"
              min="0"
              step="any"
              value={soCloseMinPrice}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setSoCloseMinPrice("");
                  return;
                }
                if (val.includes("-")) return;
                const num = parseFloat(val);
                if (!isNaN(num) && num < 0) return;
                setSoCloseMinPrice(val);
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
              value={soCloseMaxPrice}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setSoCloseMaxPrice("");
                  return;
                }
                if (val.includes("-")) return;
                const num = parseFloat(val);
                if (!isNaN(num) && num < 0) return;
                setSoCloseMaxPrice(val);
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
              title={`Set Max Price to Available Balance (${userData?.balance !== undefined ? `$${userData.balance.toFixed(2)}` : "$0.00"})`}
              style={styles.walletButton}
            >
              <Wallet size={12} />
            </button>
          </div>

          {/* Max Closeness Distance Input */}
          <div style={styles.filterPill}>
            <span style={styles.filterLabel}>
              Max Distance:
            </span>
            <input
              type="number"
              step="0.01"
              value={soCloseMaxCloseness}
              onChange={(e) =>
                setSoCloseMaxCloseness(parseFloat(e.target.value) || 1.0)
              }
              style={styles.numberInputDistance}
            />
            <span style={styles.distancePercentText}>
              (+{((soCloseMaxCloseness - 1) * 100).toFixed(0)}%)
            </span>
          </div>

          {/* Min Supply Stability Score (SSS) Filter */}
          <div style={styles.filterPill}>
            <span
              title="Supply Stability Score (SSS) measures cross-market availability, anti-monopoly supply distribution across markets (HHI), and listed stock depth relative to price bracket."
              style={styles.sssLabel}
            >
              SSS:
              <Info
                size={12}
                style={styles.sssInfoIcon}
              />
            </span>
            <input
              type="number"
              min="0"
              max="1.5"
              step="0.1"
              value={soCloseMinSssScore}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSoCloseMinSssScore(
                  isNaN(val) ? 0 : Math.max(0, Math.min(1.5, val)),
                );
              }}
              style={styles.numberInputSss}
            />
            <span style={getSssTierStyle(soCloseMinSssScore)}>
              {soCloseMinSssScore >= 1.2
                ? "Strict"
                : soCloseMinSssScore >= 0.8
                  ? "Balanced"
                  : "Broad"}
            </span>
          </div>

          {/* Wear Condition Selector Badges */}
          <div style={styles.wearsWrapper}>
            <span style={styles.wearsLabel}>
              Wears:
            </span>
            {[
              { key: "fn", label: "FN" },
              { key: "mw", label: "MW" },
              { key: "ft", label: "FT" },
              { key: "ww", label: "WW" },
              { key: "bs", label: "BS" },
              { key: "souvenir", label: "Souvenir" },
              { key: "sticker", label: "Sticker" },
            ].map((w) => {
              const active =
                soCloseAllowedWears[w.key as keyof typeof soCloseAllowedWears];
              return (
                <button
                  key={w.key}
                  type="button"
                  onClick={() =>
                    setSoCloseAllowedWears((prev: any) => ({
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
        </div>

        {/* Right Scan Button */}
        <div style={styles.rightActionsGroup}>
          <button
            onClick={runSoCloseScan}
            disabled={isSoCloseRunning}
            className="btn btn-primary btn-sm"
            style={styles.scanButton}
          >
            {isSoCloseRunning ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <Zap size={14} />
            )}{" "}
            Run SoClose Scan
          </button>
        </div>
      </div>

      {/* Floating Selection Toolbar */}
      {selectedSoCloseCount > 0 && (
        <div style={getFloatingToolbarStyle(isSidebarExpanded)}>
          <div style={styles.floatingToolbarLeft}>
            <span style={styles.floatingToolbarSelectedText}>
              <CheckSquare size={16} style={styles.checkSquareIcon} />
              <span>{selectedSoCloseCount} Selected Opportunities</span>
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
            {/* Value & Limit Indicator in Floating Bar */}
            <div style={styles.limitIndicatorPill}>
              <span style={styles.statLabelMuted}>
                Selected:{" "}
                <strong className="tabular-nums" style={styles.statWhiteText}>
                  ${selectedSoCloseTotal.toFixed(2)}
                </strong>
              </span>

              {maxLimitValue > 0 && (
                <>
                  <span style={styles.bulletSeparator}>•</span>
                  <span style={getProjectedValueContainerStyle(isLimitExceeded)}>
                    {isLimitExceeded && (
                      <AlertTriangle size={12} style={styles.limitWarningIcon} />
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
              onClick={handleBatchCreateSoCloseOrders}
              disabled={batchSoCloseProcessing}
              className={`btn ${isLimitExceeded ? "btn-danger" : "btn-primary"} btn-sm`}
              style={styles.batchCreateButton}
              title={
                isLimitExceeded
                  ? `Warning: Total buy order exposure ($${projectedTotalValue.toFixed(2)}) exceeds 10x balance limit ($${maxLimitValue.toFixed(2)})`
                  : undefined
              }
            >
              {batchSoCloseProcessing ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <PlusCircle size={13} />
              )}
              Place Buy Orders for Selected ({selectedSoCloseCount})
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

      {/* So Close Grid View */}
      <div style={styles.gridScrollView}>
        {soCloseResults.length === 0 ? (
          <div
            className="card"
            style={styles.emptyCard}
          >
            {isSoCloseRunning ? (
              <div>
                Scanning CSFloat market prices against Step 2 Accepted Prices...
              </div>
            ) : (
              <div>
                <Zap
                  size={32}
                  style={styles.emptyIcon}
                />
                <div
                  style={styles.emptyTitle}
                >
                  No Opportunities Found
                </div>
                <div style={styles.emptySubtitle}>
                  Click "Run So Close Scan" above to evaluate CSFloat market
                  prices against your Oracle Accepted Prices.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={getCardsGridStyle(selectedSoCloseCount > 0)}
          >
            {soCloseResults.map((item) => {
              const isSelected = !!selectedSoCloseItems[item.name];
              const isProcessing = soCloseProcessingName === item.name;
              const match = item.name.match(/^(.+?)\s*\(([^)]+)\)$/);
              const wearText = match ? match[2] : "";
              const wearShortcut = getWearShortcut(wearText);

              return (
                <CSFloatSoCloseCard
                  key={item.name}
                  item={item}
                  isSelected={isSelected}
                  onToggleSelect={() =>
                    setSelectedSoCloseItems((prev) => ({
                      ...prev,
                      [item.name]: !prev[item.name],
                    }))
                  }
                  isProcessing={isProcessing}
                  onCreateBuyOrder={handleCreateSoCloseBuyOrder}
                  onOpenMarket={handleOpenCsfloatMarket}
                  onOpenLookup={handleOpenLookupModal}
                  wearShortcut={wearShortcut}
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

const getSssTierStyle = (score: number): React.CSSProperties => ({
  fontSize: "10px",
  fontWeight: 800,
  color:
    score >= 1.2
      ? "var(--so-success-text)"
      : score >= 0.8
        ? "var(--so-cyan-text)"
        : "var(--so-warning)",
});

const getWearBadgeStyle = (active: boolean): React.CSSProperties => ({
  padding: "2px 6px",
  fontSize: "9.5px",
  fontWeight: 800,
  borderRadius: "3px",
  cursor: "pointer",
  backgroundColor: active
    ? "var(--so-primary)"
    : "var(--so-surface-panel)",
  color: active ? "#ffffff" : "var(--so-text-muted)",
  border: active ? "none" : "1px solid var(--so-border-subtle)",
});

const getFloatingToolbarStyle = (isSidebarExpanded: boolean): React.CSSProperties => ({
  position: "fixed",
  bottom: "24px",
  left: isSidebarExpanded ? "246px" : "84px",
  right: "24px",
  zIndex: 1000,
  backgroundColor: "rgba(23, 23, 33, 0.94)",
  backdropFilter: "blur(12px)",
  border: "1px solid var(--so-primary)",
  borderRadius: "var(--so-radius-md)",
  boxShadow:
    "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(99, 102, 241, 0.25)",
  padding: "12px 20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
  animation: "slideUp 0.2s ease-out",
  transition: "left 0.2s ease",
});

const getProjectedValueContainerStyle = (isLimitExceeded: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  color: isLimitExceeded ? "#ef4444" : "var(--so-text-secondary)",
  fontWeight: 700,
});

const getProjectedTotalTextStyle = (isLimitExceeded: boolean): React.CSSProperties => ({
  color: isLimitExceeded ? "#ef4444" : "var(--so-accent-cyan)",
});

const getCardsGridStyle = (hasSelection: boolean): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "10px",
  paddingBottom: hasSelection ? "75px" : "12px",
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

  numberInputDistance: {
    width: "48px",
    padding: "1px 4px",
    fontSize: "11px",
    fontWeight: 800,
    textAlign: "center",
    borderRadius: "3px",
    border: "1px solid var(--so-border-subtle)",
    background: "var(--so-surface-card)",
    color: "var(--so-text-primary)",
  } as React.CSSProperties,

  distancePercentText: {
    fontSize: "10.5px",
    fontWeight: 800,
    color: "var(--so-accent-cyan)",
  } as React.CSSProperties,

  sssLabel: {
    fontWeight: 700,
    color: "var(--so-text-secondary)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    cursor: "help",
  } as React.CSSProperties,

  sssInfoIcon: {
    color: "var(--so-accent-cyan)",
    opacity: 0.85,
  } as React.CSSProperties,

  numberInputSss: {
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
  } as React.CSSProperties,

  scanButton: {
    fontWeight: 800,
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

  gridScrollView: {
    flex: 1,
    overflowY: "auto",
    minHeight: 0,
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
