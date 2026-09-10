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
} from "lucide-react";
import { ListingPriceStrategy } from "../../../store/useOracleStore";
import { S } from "../OracleDashboard.styles";

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
  return (
    <div
      className="card"
      style={{
        border: "1px solid var(--so-border-medium)",
        padding: 0,
        overflow: "hidden",
      }}
    >
      {/* Accordion Header Bar */}
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          backgroundColor: isOpen
            ? "var(--so-surface-panel)"
            : "var(--so-surface-card)",
          borderBottom: isOpen ? "1px solid var(--so-border-subtle)" : "none",
          cursor: "pointer",
          userSelect: "none",
          transition: "background-color 0.15s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 800,
                color: "var(--so-text-primary)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Tag size={18} style={{ color: "var(--so-success-text)" }} />{" "}
              Generate Listing Prices (Sell Targets)
            </div>
            {!isOpen && (
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--so-text-muted)",
                  marginTop: "2px",
                }}
              >
                Configure selling strategy, outlier dump protection, & compute
                optimal listing prices
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            className={`badge ${listingSummary.lastBuiltAt ? "badge-success" : "badge-ghost"}`}
            style={{ fontSize: "11px" }}
          >
            {listingSummary.lastBuiltAt
              ? `✓ Built (${listingSummary.totalEvaluated.toLocaleString()} Items - ${listingStrategy.mode.toUpperCase()})`
              : "Not Generated Yet"}
          </span>
          {isOpen ? (
            <ChevronUp size={18} style={{ color: "var(--so-text-muted)" }} />
          ) : (
            <ChevronDown size={18} style={{ color: "var(--so-text-muted)" }} />
          )}
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: "20px" }}>
          <p
            style={{
              fontSize: "12.5px",
              color: "var(--so-text-muted)",
              marginBottom: "16px",
            }}
          >
            Configure how workstations compute optimal selling and listing
            prices for your items based on active market data.
          </p>

          {/* Listing Strategy Mode Options */}
          <div style={S.gridFourCols}>
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
              style={{
                padding: "12px 14px",
                borderRadius: "var(--so-radius-sm)",
                backgroundColor:
                  listingStrategy.mode === "lowest" &&
                  listingStrategy.offsetPercent === 0
                    ? "rgba(16, 185, 129, 0.12)"
                    : "var(--so-surface-input)",
                border:
                  listingStrategy.mode === "lowest" &&
                  listingStrategy.offsetPercent === 0
                    ? "1.5px solid var(--so-success-text)"
                    : "1px solid var(--so-border-subtle)",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "13px",
                  color:
                    listingStrategy.mode === "lowest" &&
                    listingStrategy.offsetPercent === 0
                      ? "var(--so-success-text)"
                      : "var(--so-text-primary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Zap size={14} /> Equal to Lowest Price
              </div>
              <div style={S.sectionDesc}>
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
              style={{
                padding: "12px 14px",
                borderRadius: "var(--so-radius-sm)",
                backgroundColor:
                  listingStrategy.mode === "average"
                    ? "rgba(70, 48, 235, 0.12)"
                    : "var(--so-surface-input)",
                border:
                  listingStrategy.mode === "average"
                    ? "1.5px solid var(--so-primary)"
                    : "1px solid var(--so-border-subtle)",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "13px",
                  color:
                    listingStrategy.mode === "average"
                      ? "var(--so-primary)"
                      : "var(--so-text-primary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Scale size={14} /> Equal to Market Average
              </div>
              <div style={S.sectionDesc}>
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
              style={{
                padding: "12px 14px",
                borderRadius: "var(--so-radius-sm)",
                backgroundColor:
                  listingStrategy.mode === "undercut"
                    ? "rgba(6, 182, 212, 0.12)"
                    : "var(--so-surface-input)",
                border:
                  listingStrategy.mode === "undercut"
                    ? "1.5px solid var(--so-cyan-text)"
                    : "1px solid var(--so-border-subtle)",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "13px",
                  color:
                    listingStrategy.mode === "undercut"
                      ? "var(--so-cyan-text)"
                      : "var(--so-text-primary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Scissors size={14} /> Undercut Lowest (-1%)
              </div>
              <div style={S.sectionDesc}>
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
              style={{
                padding: "12px 14px",
                borderRadius: "var(--so-radius-sm)",
                backgroundColor:
                  listingStrategy.mode === "markup"
                    ? "rgba(245, 158, 11, 0.12)"
                    : "var(--so-surface-input)",
                border:
                  listingStrategy.mode === "markup"
                    ? "1.5px solid var(--so-warning-text)"
                    : "1px solid var(--so-border-subtle)",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "13px",
                  color:
                    listingStrategy.mode === "markup"
                      ? "var(--so-warning-text)"
                      : "var(--so-text-primary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <TrendingUp size={14} /> Markup (+2%)
              </div>
              <div style={S.sectionDesc}>
                List 2% above lowest price to boost margin
              </div>
            </button>
          </div>

          {/* Forced Filtered Categories Banner for Listing Engine */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 14px",
              borderRadius: "var(--so-radius-sm)",
              backgroundColor: "var(--so-surface-input)",
              border: "1px solid var(--so-border-subtle)",
              marginTop: "16px",
              marginBottom: "16px",
            }}
          >
            <Check
              size={14}
              style={{ color: "var(--so-text-muted)", flexShrink: 0 }}
            />
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--so-text-muted)",
              }}
            >
              Forced Excluded Categories: Charms, Cases, Keys, Music Kits, Agents,
              Patches & Graffiti are automatically filtered out from listing
              price calculation.
            </div>
          </div>

          {/* Grouped Strategy Control Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "14px",
              marginTop: "16px",
            }}
          >
            {/* Card 1: Outlier Protection */}
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "var(--so-radius-md)",
                backgroundColor: "var(--so-surface-panel)",
                border: "1px solid var(--so-border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={listingStrategy.ignoreOutliers ?? true}
                    onChange={(e) =>
                      setListingStrategy((s) => ({
                        ...s,
                        ignoreOutliers: e.target.checked,
                      }))
                    }
                    style={{
                      width: "16px",
                      height: "16px",
                      accentColor: "var(--so-primary)",
                      cursor: "pointer",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "var(--so-text-primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <ShieldAlert
                      size={15}
                      style={{ color: "var(--so-warning-text)" }}
                    />{" "}
                    Ignore Outlier Dump Listings
                  </span>
                </label>
                <span
                  title="Example: If an item's Market Average is $100 and threshold is 30%, any panic seller listing below $70 is ignored as a price dump so your listing price isn't dragged down artificially."
                  style={{
                    cursor: "help",
                    color: "var(--so-primary)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <HelpCircle size={15} />
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: (listingStrategy.ignoreOutliers ?? true) ? 1 : 0.45,
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--so-text-muted)",
                    fontWeight: 600,
                  }}
                >
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
                  style={{
                    ...S.numInputSmall,
                    width: "56px",
                    textAlign: "center",
                  }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--so-text-secondary)",
                    fontWeight: 700,
                  }}
                >
                  % below Market Avg
                </span>
              </div>
            </div>

            {/* Card 2: Custom Strategy Offset */}
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "var(--so-radius-md)",
                backgroundColor: "var(--so-surface-panel)",
                border: "1px solid var(--so-border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--so-text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Sliders size={15} style={{ color: "var(--so-primary)" }} />{" "}
                  Custom Strategy Offset
                </span>
                <span
                  title="Adjust your final computed listing price up or down by a percentage offset. Positive values increase your selling price, negative values lower it."
                  style={{
                    cursor: "help",
                    color: "var(--so-primary)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <HelpCircle size={15} />
                </span>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--so-text-muted)",
                    fontWeight: 600,
                  }}
                >
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
                  style={{
                    ...S.numInputMedium,
                    width: "70px",
                    textAlign: "center",
                  }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--so-text-secondary)",
                    fontWeight: 700,
                  }}
                >
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Action Trigger Box */}
          <div style={S.actionTriggerBox}>
            <div style={{ flex: 1 }}>
              <div style={S.actionTitle}>
                <Tag size={16} style={{ color: "var(--so-success-text)" }} />{" "}
                Compute Target Workstation Listing / Selling Prices
              </div>
              <div style={S.actionDesc}>
                {cacheStatus.itemCount === 0
                  ? "Fetch or load price cache above to activate listing price generation"
                  : listingSummary.lastBuiltAt
                    ? `Last built at ${listingSummary.lastBuiltAt} — ${listingSummary.totalEvaluated.toLocaleString()} items generated using ${listingStrategy.mode.toUpperCase()} strategy`
                    : "Calculates optimal listing prices for market items based on active market data"}
              </div>
            </div>

            <button
              type="button"
              onClick={onBuildListingPrices}
              disabled={
                cacheStatus.itemCount === 0 || listingSummary.isBatchEvaluating
              }
              className="btn btn-primary btn-lg"
              style={S.actionBtnListing}
            >
              {listingSummary.isBatchEvaluating ? (
                <>
                  <Loader2 size={18} className="spin" /> Building Listing… (
                  {listingSummary.totalEvaluated.toLocaleString()})
                </>
              ) : listingSummary.lastBuiltAt ? (
                <>
                  <RotateCw size={18} /> Rebuild Listing Prices
                </>
              ) : (
                <>
                  <Tag size={18} /> Build Listing Prices
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
