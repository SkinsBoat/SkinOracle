import React from "react";
import {
  Tag,
  ChevronUp,
  ChevronDown,
  Zap,
  Scale,
  Scissors,
  TrendingUp,
  Check,
  ShieldAlert,
  HelpCircle,
  Sliders,
  Loader2,
  RotateCw,
  Clock,
} from "lucide-react";
import { ListingPriceStrategy } from "../../../store/useOracleStore";
import { formatTimeAgo } from "../utils/oracleUtils";

interface Step3ListingPricesProps {
  isOpen: boolean;
  onToggle: () => void;
  listingSummary: {
    totalEvaluated: number;
    isBatchEvaluating: boolean;
    lastBuiltAt: string | null;
  };
  cacheStatus: {
    itemCount: number;
    isFetching: boolean;
    lastFetchedAt: string | null;
  };
  listingStrategy: ListingPriceStrategy;
  setListingStrategy: React.Dispatch<
    React.SetStateAction<ListingPriceStrategy>
  >;
  onBuildListingPrices: () => void;
}

export const Step3ListingPrices: React.FC<Step3ListingPricesProps> = ({
  isOpen,
  onToggle,
  listingSummary,
  cacheStatus,
  listingStrategy,
  setListingStrategy,
  onBuildListingPrices,
}) => {
  const [, setTicker] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setTicker((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="card" style={getAccordionCardStyle(isOpen)}>
      {/* Accordion Header Bar */}
      <div onClick={onToggle} style={getAccordionHeaderStyle(isOpen)}>
        <div style={styles.headerLeft}>
          <div>
            <div style={styles.headerTitle}>
              <Tag size={18} style={styles.headerTagIcon} /> Generate Listing
              Prices (Sell Targets)
            </div>
            <div style={styles.headerSubtitle}>
              Strategy: {listingStrategy.mode.toUpperCase()} (
              {listingStrategy.offsetPercent >= 0
                ? `+${listingStrategy.offsetPercent}%`
                : `${listingStrategy.offsetPercent}%`}
              )
              {listingSummary.lastBuiltAt
                ? ` • Generated ${formatTimeAgo(listingSummary.lastBuiltAt)} (${listingSummary.totalEvaluated.toLocaleString()} items)`
                : " • Outlier dump protection & optimal selling prices"}
            </div>
          </div>
        </div>

        <div style={styles.headerRight}>
          <span
            className={`badge ${listingSummary.lastBuiltAt ? "badge-success" : "badge-ghost"}`}
            style={styles.headerBadge}
          >
            {listingSummary.lastBuiltAt
              ? `✓ ${listingSummary.totalEvaluated.toLocaleString()} Items`
              : "Not Generated"}
          </span>

          <span
            className="badge badge-ghost"
            style={styles.timeAgoBadge}
            title={
              listingSummary.lastBuiltAt
                ? `Last generated: ${listingSummary.lastBuiltAt}`
                : "Not generated yet"
            }
          >
            <Clock size={11} style={styles.timeAgoIcon} />
            {formatTimeAgo(listingSummary.lastBuiltAt)}
          </span>

          <div style={getHeaderActionContainerStyle(isOpen)}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={styles.headerActionBtn}
              onClick={(e) => {
                e.stopPropagation();
                onBuildListingPrices();
              }}
              disabled={
                cacheStatus.itemCount === 0 || listingSummary.isBatchEvaluating
              }
              title={
                cacheStatus.itemCount === 0
                  ? "Price cache required (Scan Step 1 first)"
                  : listingSummary.lastBuiltAt
                    ? `Regenerate Sell Targets using ${listingStrategy.mode.toUpperCase()} strategy`
                    : `Generate Sell Targets using ${listingStrategy.mode.toUpperCase()} strategy`
              }
            >
              {listingSummary.isBatchEvaluating ? (
                <>
                  <Loader2 size={13} className="spin" /> Generating…
                </>
              ) : listingSummary.lastBuiltAt ? (
                <>
                  <RotateCw size={13} /> Regenerate
                </>
              ) : (
                <>
                  <Tag size={13} /> Generate
                </>
              )}
            </button>
          </div>

          <ChevronDown size={18} style={getChevronStyle(isOpen)} />
        </div>
      </div>

      <div style={getAccordionCollapseStyle(isOpen)}>
        <div style={getAccordionInnerStyle(isOpen)}>
          <div style={styles.body}>
            <p style={styles.bodyDesc}>
              Configure how workstations compute optimal selling and listing
              prices for your items based on active market data.
            </p>

            {/* Listing Strategy Mode Options */}
            <div style={styles.strategyGrid}>
              {/* 1. Equal to Lowest */}
              <button
                type="button"
                onClick={() =>
                  setListingStrategy((s) => ({
                    ...s,
                    mode: "lowest",
                    offsetPercent: 0,
                  }))
                }
                style={getModeButtonStyle(
                  "lowest",
                  listingStrategy.mode,
                  listingStrategy.offsetPercent,
                )}
              >
                <div
                  style={getModeTitleStyle(
                    "lowest",
                    listingStrategy.mode,
                    listingStrategy.offsetPercent,
                  )}
                >
                  <Zap size={14} /> Equal to Lowest Price
                </div>
                <div style={styles.modeDesc}>
                  Match cheapest active market listing ($lowestPrice)
                </div>
              </button>

              {/* 2. Equal to Market Average */}
              <button
                type="button"
                onClick={() =>
                  setListingStrategy((s) => ({
                    ...s,
                    mode: "average",
                    offsetPercent: 0,
                  }))
                }
                style={getModeButtonStyle(
                  "average",
                  listingStrategy.mode,
                  listingStrategy.offsetPercent,
                )}
              >
                <div
                  style={getModeTitleStyle(
                    "average",
                    listingStrategy.mode,
                    listingStrategy.offsetPercent,
                  )}
                >
                  <Scale size={14} /> Equal to Market Average
                </div>
                <div style={styles.modeDesc}>
                  List at overall fair market average ($averageMarketPrice)
                </div>
              </button>

              {/* 3. Undercut Lowest */}
              <button
                type="button"
                onClick={() =>
                  setListingStrategy((s) => ({
                    ...s,
                    mode: "undercut",
                    offsetPercent: -1,
                  }))
                }
                style={getModeButtonStyle(
                  "undercut",
                  listingStrategy.mode,
                  listingStrategy.offsetPercent,
                )}
              >
                <div
                  style={getModeTitleStyle(
                    "undercut",
                    listingStrategy.mode,
                    listingStrategy.offsetPercent,
                  )}
                >
                  <Scissors size={14} /> Undercut Lowest (-1%)
                </div>
                <div style={styles.modeDesc}>
                  List 1% below cheapest listing for fast sale
                </div>
              </button>

              {/* 4. Markup */}
              <button
                type="button"
                onClick={() =>
                  setListingStrategy((s) => ({
                    ...s,
                    mode: "markup",
                    offsetPercent: 2,
                  }))
                }
                style={getModeButtonStyle(
                  "markup",
                  listingStrategy.mode,
                  listingStrategy.offsetPercent,
                )}
              >
                <div
                  style={getModeTitleStyle(
                    "markup",
                    listingStrategy.mode,
                    listingStrategy.offsetPercent,
                  )}
                >
                  <TrendingUp size={14} /> Markup (+2%)
                </div>
                <div style={styles.modeDesc}>
                  List 2% above lowest price to boost margin
                </div>
              </button>
            </div>

            {/* Forced Filtered Categories Banner for Listing Engine */}
            <div style={styles.excludedBanner}>
              <Check size={14} style={styles.excludedBannerIcon} />
              <div style={styles.excludedBannerText}>
                Forced Excluded Categories: Charms, Cases, Keys, Music Kits,
                Agents, Patches & Graffiti are automatically filtered out from
                listing price calculation.
              </div>
            </div>

            {/* Grouped Strategy Control Cards */}
            <div style={styles.controlCardsGrid}>
              {/* Card 1: Outlier Protection */}
              <div style={styles.controlCard}>
                <div style={styles.cardHeaderRow}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={listingStrategy.ignoreOutliers ?? true}
                      onChange={(e) =>
                        setListingStrategy((s) => ({
                          ...s,
                          ignoreOutliers: e.target.checked,
                        }))
                      }
                      style={styles.checkboxInput}
                    />
                    <span style={styles.cardTitle}>
                      <ShieldAlert size={15} style={styles.outlierIcon} />{" "}
                      Ignore Outlier Dump Listings
                    </span>
                  </label>
                  <span
                    title="Example: If an item's Market Average is $100 and threshold is 30%, any panic seller listing below $70 is ignored as a price dump so your listing price isn't dragged down artificially."
                    style={styles.helpIconWrapper}
                  >
                    <HelpCircle size={15} />
                  </span>
                </div>

                <div
                  style={getOutlierRowStyle(
                    listingStrategy.ignoreOutliers ?? true,
                  )}
                >
                  <span style={styles.controlRowLabel}>
                    Skip listings more than
                  </span>
                  <input
                    type="number"
                    disabled={!(listingStrategy.ignoreOutliers ?? true)}
                    value={listingStrategy.maxOutlierDiscountPercent ?? 30}
                    onChange={(e) =>
                      setListingStrategy((s) => ({
                        ...s,
                        maxOutlierDiscountPercent:
                          parseFloat(e.target.value) || 0,
                      }))
                    }
                    style={styles.numInputSmall}
                  />
                  <span style={styles.unitText}>% below Market Avg</span>
                </div>
              </div>

              {/* Card 2: Custom Strategy Offset */}
              <div style={styles.controlCard}>
                <div style={styles.cardHeaderRow}>
                  <span style={styles.cardTitle}>
                    <Sliders size={15} style={styles.offsetIcon} /> Custom
                    Strategy Offset
                  </span>
                  <span
                    title="Adjust your final computed listing price up or down by a percentage offset. Positive values increase your selling price, negative values lower it."
                    style={styles.helpIconWrapper}
                  >
                    <HelpCircle size={15} />
                  </span>
                </div>

                <div style={styles.controlRow}>
                  <span style={styles.controlRowLabel}>
                    Price Offset Adjustment:
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    value={listingStrategy.offsetPercent}
                    onChange={(e) =>
                      setListingStrategy((s) => ({
                        ...s,
                        offsetPercent: parseFloat(e.target.value) || 0,
                      }))
                    }
                    style={styles.numInputMedium}
                  />
                  <span style={styles.unitText}>%</span>
                </div>
              </div>
            </div>

            {/* Action Trigger Box */}
            <div style={styles.actionTriggerBox}>
              <div style={styles.actionContent}>
                <div style={styles.actionTitle}>
                  <Tag size={16} style={styles.actionTitleIcon} /> Compute
                  Target Workstation Listing / Selling Prices
                </div>
                <div style={styles.actionDesc}>
                  {cacheStatus.itemCount === 0
                    ? "Scan or load price cache above to activate listing price generation"
                    : listingSummary.lastBuiltAt
                      ? `Last built ${formatTimeAgo(listingSummary.lastBuiltAt)} — ${listingSummary.totalEvaluated.toLocaleString()} items generated using ${listingStrategy.mode.toUpperCase()} strategy`
                      : "Calculates optimal listing prices for market items based on active market data"}
                </div>
              </div>

              <button
                type="button"
                onClick={onBuildListingPrices}
                disabled={
                  cacheStatus.itemCount === 0 ||
                  listingSummary.isBatchEvaluating
                }
                className="btn btn-primary btn-lg"
                style={styles.actionBtnListing}
              >
                {listingSummary.isBatchEvaluating ? (
                  <>
                    <Loader2 size={18} className="spin" /> Generating Listings…
                    ({listingSummary.totalEvaluated.toLocaleString()})
                  </>
                ) : listingSummary.lastBuiltAt ? (
                  <>
                    <RotateCw size={18} /> Regenerate Listing Prices
                  </>
                ) : (
                  <>
                    <Tag size={18} /> Generate Listing Prices
                  </>
                )}
              </button>
            </div>
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
    transition: "grid-template-rows 0.45s cubic-bezier(0.25, 1, 0.35, 1)",
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
      "opacity 0.35s cubic-bezier(0.25, 1, 0.35, 1), transform 0.45s cubic-bezier(0.25, 1, 0.35, 1), visibility 0.45s ease",
    visibility: isOpen ? "visible" : "hidden",
  };
}

function getChevronStyle(isOpen: boolean): React.CSSProperties {
  return {
    ...styles.chevronIcon,
    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
    transition: "transform 0.35s cubic-bezier(0.25, 1, 0.35, 1)",
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

function getModeButtonStyle(
  modeKey: "lowest" | "average" | "undercut" | "markup",
  currentMode: string,
  offsetPercent: number,
): React.CSSProperties {
  const isLowestActive =
    modeKey === "lowest" && currentMode === "lowest" && offsetPercent === 0;
  const isAverageActive = modeKey === "average" && currentMode === "average";
  const isUndercutActive = modeKey === "undercut" && currentMode === "undercut";
  const isMarkupActive = modeKey === "markup" && currentMode === "markup";

  let backgroundColor = "var(--so-surface-input)";
  let border = "1px solid var(--so-border-subtle)";

  if (isLowestActive) {
    backgroundColor = "rgba(16, 185, 129, 0.12)";
    border = "1.5px solid var(--so-success-text)";
  } else if (isAverageActive) {
    backgroundColor = "rgba(70, 48, 235, 0.12)";
    border = "1.5px solid var(--so-primary)";
  } else if (isUndercutActive) {
    backgroundColor = "rgba(6, 182, 212, 0.12)";
    border = "1.5px solid var(--so-cyan-text)";
  } else if (isMarkupActive) {
    backgroundColor = "rgba(245, 158, 11, 0.12)";
    border = "1.5px solid var(--so-warning-text)";
  }

  return {
    padding: "12px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor,
    border,
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  };
}

function getModeTitleStyle(
  modeKey: "lowest" | "average" | "undercut" | "markup",
  currentMode: string,
  offsetPercent: number,
): React.CSSProperties {
  const isLowestActive =
    modeKey === "lowest" && currentMode === "lowest" && offsetPercent === 0;
  const isAverageActive = modeKey === "average" && currentMode === "average";
  const isUndercutActive = modeKey === "undercut" && currentMode === "undercut";
  const isMarkupActive = modeKey === "markup" && currentMode === "markup";

  let color = "var(--so-text-primary)";
  if (isLowestActive) color = "var(--so-success-text)";
  else if (isAverageActive) color = "var(--so-primary)";
  else if (isUndercutActive) color = "var(--so-cyan-text)";
  else if (isMarkupActive) color = "var(--so-warning-text)";

  return {
    fontWeight: 800,
    fontSize: "13px",
    color,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  };
}

function getOutlierRowStyle(enabled: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    opacity: enabled ? 1 : 0.45,
  };
}

const styles: Record<string, React.CSSProperties> = {
  cardContainer: {
    border: "1px solid var(--so-border-medium)",
    padding: 0,
    overflow: "hidden",
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
  headerTagIcon: {
    color: "var(--so-success-text)",
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
  body: {
    padding: "20px",
  },
  bodyDesc: {
    fontSize: "12.5px",
    color: "var(--so-text-muted)",
    marginBottom: "16px",
  },
  strategyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
  },
  modeDesc: {
    fontSize: "12.5px",
    color: "var(--so-text-muted)",
    marginBottom: "14px",
  },
  excludedBanner: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-subtle)",
    marginTop: "16px",
    marginBottom: "16px",
  },
  excludedBannerIcon: {
    color: "var(--so-text-muted)",
    flexShrink: 0,
  },
  excludedBannerText: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--so-text-muted)",
  },
  controlCardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "14px",
    marginTop: "16px",
  },
  controlCard: {
    padding: "14px 16px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  cardHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    userSelect: "none",
  },
  checkboxInput: {
    width: "16px",
    height: "16px",
    accentColor: "var(--so-primary)",
    cursor: "pointer",
  },
  cardTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  outlierIcon: {
    color: "var(--so-warning-text)",
  },
  offsetIcon: {
    color: "var(--so-primary)",
  },
  helpIconWrapper: {
    cursor: "help",
    color: "var(--so-primary)",
    display: "flex",
    alignItems: "center",
  },
  controlRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  controlRowLabel: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
    fontWeight: 600,
  },
  numInputSmall: {
    width: "56px",
    fontSize: "12px",
    padding: "2px 4px",
    textAlign: "center",
    borderRadius: "var(--so-radius-sm)",
    border: "1px solid var(--so-border-medium)",
  },
  numInputMedium: {
    width: "70px",
    fontSize: "12px",
    padding: "5px 8px",
    textAlign: "center",
    borderRadius: "var(--so-radius-sm)",
    border: "1px solid var(--so-border-medium)",
  },
  unitText: {
    fontSize: "12px",
    color: "var(--so-text-secondary)",
    fontWeight: 700,
  },
  actionTriggerBox: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    marginTop: "18px",
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontWeight: 800,
    fontSize: "14px",
    color: "var(--so-text-primary)",
    marginBottom: "3px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  actionTitleIcon: {
    color: "var(--so-success-text)",
  },
  actionDesc: {
    fontSize: "12.5px",
    color: "var(--so-text-muted)",
  },
  actionBtnListing: {
    minWidth: "220px",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "var(--so-success-text)",
    border: "1px solid rgba(16, 185, 129, 0.4)",
  },
};
