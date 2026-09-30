import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  X,
  Search,
  TrendingUp,
  TrendingDown,
  Activity,
  Download,
  Loader2,
} from "lucide-react";
import { TrendMarketListing } from "../../../../shared/types/electron-api.types";

interface InteractiveSkinTesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  pack: TrendMarketListing | null;
  onPurchase: (pack: TrendMarketListing) => Promise<void>;
  isPurchasing: boolean;
  /** True when this listing belongs to the current user (device-to-device sync). */
  isOwn?: boolean;
}

const MODAL_TITLE_ID = "trend-preview-modal-title";

export const InteractiveSkinTesterModal: React.FC<
  InteractiveSkinTesterModalProps
> = ({ isOpen, onClose, pack, onPurchase, isPurchasing, isOwn = false }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkin, setSelectedSkin] = useState<string>("");
  const [chartData, setChartData] = useState<{
    labels: string[];
    prices: number[];
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Monotonic request id discards out-of-order preview responses when the user
  // clicks through skins quickly (last write wins, never a stale curve).
  const requestIdRef = useRef(0);

  const fetchSkinPreview = useCallback(
    async (packId: string, skinName: string) => {
      if (!window.electronAPI?.trendMarket?.previewSkin) return;
      const requestId = ++requestIdRef.current;
      try {
        setIsLoadingPreview(true);
        const res = await window.electronAPI.trendMarket.previewSkin(
          packId,
          skinName,
        );
        if (requestId !== requestIdRef.current) return;
        if (res && res.chartData) {
          setChartData(res.chartData);
        }
      } catch (err) {
        if (requestId === requestIdRef.current) {
          console.warn("Failed to load skin preview chart data:", err);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoadingPreview(false);
        }
      }
    },
    [],
  );

  // Initialize selected skin when the pack changes or the modal opens.
  useEffect(() => {
    if (!isOpen) return;

    if (pack && pack.sampleSkinNames && pack.sampleSkinNames.length > 0) {
      const firstSkin = pack.sampleSkinNames[0];
      setSelectedSkin(firstSkin);
      setSearchTerm("");
      setChartData(null);
      fetchSkinPreview(pack.id, firstSkin);
    } else {
      setChartData(null);
    }

    // Invalidate any in-flight preview when the pack changes or modal closes.
    return () => {
      requestIdRef.current += 1;
    };
  }, [pack, isOpen, fetchSkinPreview]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelectSkin = (skin: string) => {
    setSelectedSkin(skin);
    if (pack) {
      fetchSkinPreview(pack.id, skin);
    }
  };

  const filteredSkins = useMemo(() => {
    if (!pack || !pack.sampleSkinNames) return [];
    if (!searchTerm.trim()) return pack.sampleSkinNames;
    const q = searchTerm.toLowerCase().trim();
    return pack.sampleSkinNames.filter((s) => s.toLowerCase().includes(q));
  }, [pack, searchTerm]);

  // Calculations for the interactive price trajectory summary.
  const metrics = useMemo(() => {
    if (!chartData || !chartData.prices || chartData.prices.length === 0) {
      return null;
    }
    const prices = chartData.prices;
    const oldestPrice = prices[0];
    const latestPrice = prices[prices.length - 1];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const changePercent =
      oldestPrice > 0 ? ((latestPrice - oldestPrice) / oldestPrice) * 100 : 0;

    return {
      oldestPrice,
      latestPrice,
      minPrice,
      maxPrice,
      changePercent,
    };
  }, [chartData]);

  // Precompute the SVG geometry once per dataset instead of on every render.
  const chartGeometry = useMemo(() => {
    if (!chartData || chartData.prices.length < 2) return null;

    const prices = chartData.prices;
    const min = Math.min(...prices) * 0.96;
    const max = Math.max(...prices) * 1.04;
    const range = max - min || 1;
    const width = 540;
    const height = 160;
    const paddingX = 20;
    const paddingY = 15;

    const points = prices.map((price, idx) => {
      const x =
        paddingX + (idx / (prices.length - 1 || 1)) * (width - paddingX * 2);
      const y = height - paddingY - ((price - min) / range) * (height - paddingY * 2);
      return { x, y };
    });

    const pathD = points
      .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
      .join(" ");

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { pathD, areaD, points };
  }, [chartData]);

  if (!isOpen || !pack) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={MODAL_TITLE_ID}
      >
        {/* Modal Header */}
        <div style={styles.header}>
          <div style={styles.headerTitleGroup}>
            <div style={styles.titleRow}>
              <Activity size={18} style={styles.headerIcon} />
              <span id={MODAL_TITLE_ID} style={styles.titleText}>
                Interactive Dataset Preview
              </span>
              <span style={styles.packBadge}>{pack.title}</span>
            </div>
            <div style={styles.subtitleText}>
              Sample testing top 50 skins across {pack.daysCount} days of verified market history.
            </div>
          </div>
          <button
            type="button"
            style={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dataset preview"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content Body */}
        <div style={styles.body}>
          {/* Left Sidebar: Skin Selection */}
          <div style={styles.sidebar}>
            <div style={styles.searchBox}>
              <Search size={14} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Filter 50 sample skins…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <div style={styles.skinList}>
              {filteredSkins.map((skin) => {
                const isSelected = skin === selectedSkin;
                return (
                  <button
                    key={skin}
                    type="button"
                    aria-pressed={isSelected}
                    style={{
                      ...styles.skinItem,
                      ...(isSelected ? styles.skinItemSelected : {}),
                    }}
                    onClick={() => handleSelectSkin(skin)}
                  >
                    <span style={styles.skinItemName}>{skin}</span>
                  </button>
                );
              })}
              {filteredSkins.length === 0 && (
                <div style={styles.noSkinsFound}>No matching sample skins</div>
              )}
            </div>
          </div>

          {/* Right Main Panel: Chart & Strategy Simulator */}
          <div style={styles.mainPanel}>
            <div style={styles.selectedSkinHeader}>
              <span style={styles.activeSkinName}>{selectedSkin}</span>
              {metrics && (
                <div style={styles.priceTrajectoryPill}>
                  {metrics.changePercent >= 0 ? (
                    <TrendingUp size={14} style={styles.trendUpIcon} />
                  ) : (
                    <TrendingDown size={14} style={styles.trendDownIcon} />
                  )}
                  <span
                    style={{
                      color:
                        metrics.changePercent >= 0
                          ? "var(--so-success-text, #4ade80)"
                          : "var(--so-danger-text, #f87171)",
                      fontWeight: 600,
                    }}
                  >
                    {metrics.changePercent >= 0 ? "+" : ""}
                    {metrics.changePercent.toFixed(1)}%
                  </span>
                  <span style={styles.windowText}>over {pack.daysCount}d</span>
                </div>
              )}
            </div>

            {/* SVG Line Chart */}
            <div style={styles.chartContainer}>
              {isLoadingPreview ? (
                <div style={styles.loadingContainer}>
                  <Loader2 size={24} className="spin" />
                  <span>Loading price curve…</span>
                </div>
              ) : chartData && chartData.prices.length > 1 ? (
                <svg
                  viewBox="0 0 540 180"
                  style={styles.svgChart}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient
                      id="priceGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--so-cyan-text, #38bdf8)"
                        stopOpacity="0.35"
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--so-cyan-text, #38bdf8)"
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  </defs>

                  {/* Render Area & Line Path */}
                  {chartGeometry && (
                    <>
                      <path d={chartGeometry.areaD} fill="url(#priceGradient)" />
                      <path
                        d={chartGeometry.pathD}
                        fill="none"
                        stroke="var(--so-cyan-text, #38bdf8)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {chartGeometry.points.map((pt, i) => (
                        <circle
                          key={i}
                          cx={pt.x}
                          cy={pt.y}
                          r="3.5"
                          fill="var(--so-cyan-text, #38bdf8)"
                          stroke="#0f172a"
                          strokeWidth="1.5"
                        />
                      ))}
                    </>
                  )}
                </svg>
              ) : (
                <div style={styles.noDataState}>
                  Single snapshot available or data point loading.
                </div>
              )}

              {/* Date Labels below chart */}
              {chartData && chartData.labels.length > 0 && (
                <div style={styles.chartDateLabels}>
                  <span>{chartData.labels[0]}</span>
                  <span>
                    {chartData.labels[Math.floor(chartData.labels.length / 2)]}
                  </span>
                  <span>
                    {chartData.labels[chartData.labels.length - 1]}
                  </span>
                </div>
              )}
            </div>

            {/* Metrics Breakdown Bar */}
            {metrics && (
              <div style={styles.metricsBar}>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Oldest Price</span>
                  <span style={styles.metricVal}>
                    ${metrics.oldestPrice.toFixed(2)}
                  </span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Latest Verified</span>
                  <span style={styles.metricVal}>
                    ${metrics.latestPrice.toFixed(2)}
                  </span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>30d Range</span>
                  <span style={styles.metricVal}>
                    ${metrics.minPrice.toFixed(2)} &ndash; ${metrics.maxPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={styles.footer}>
          <div style={styles.footerNote}>
            Replaces local trend history with this pack (own scans are cleared).
          </div>
          <div style={styles.footerActions}>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              style={styles.buyNowBtn}
              onClick={() => onPurchase(pack)}
              disabled={isPurchasing}
              title={
                isOwn
                  ? "Sync your own pack to this device (platform fee only, no sale)"
                  : "Purchase and replace local trend history (SQLite)"
              }
            >
              {isPurchasing ? (
                <>
                  <Loader2 size={13} className="spin" />
                  Replacing Data…
                </>
              ) : (
                <>
                  <Download size={13} />
                  {isOwn
                    ? "Replace Local Data ($1.00)"
                    : "Buy & Replace Pack ($5.00)"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── EXTRACTED STYLES ────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modal: {
    backgroundColor: "var(--so-surface-panel, #0f172a)",
    border: "1px solid var(--so-border-medium, rgba(255, 255, 255, 0.12))",
    borderRadius: "10px",
    width: "100%",
    maxWidth: "880px",
    height: "min(720px, 88vh)",
    minHeight: "560px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
    overflow: "hidden",
  },
  header: {
    padding: "16px 20px",
    borderBottom: "1px solid var(--so-border-subtle, rgba(255, 255, 255, 0.08))",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  headerTitleGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  headerIcon: {
    color: "var(--so-cyan-text, #38bdf8)",
  },
  titleText: {
    fontSize: "15px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
  },
  packBadge: {
    fontSize: "11px",
    color: "var(--so-text-secondary)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    padding: "2px 8px",
    borderRadius: "4px",
    border: "1px solid var(--so-border-subtle)",
  },
  subtitleText: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "var(--so-text-secondary)",
    cursor: "pointer",
    padding: "4px",
  },
  body: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },
  sidebar: {
    width: "260px",
    borderRight: "1px solid var(--so-border-subtle, rgba(255, 255, 255, 0.08))",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  searchBox: {
    padding: "12px",
    borderBottom: "1px solid var(--so-border-subtle)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  searchIcon: {
    color: "var(--so-text-muted)",
  },
  searchInput: {
    background: "none",
    border: "none",
    outline: "none",
    fontSize: "12px",
    color: "var(--so-text-primary)",
    width: "100%",
  },
  skinList: {
    flex: 1,
    overflowY: "auto",
    padding: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  skinItem: {
    display: "flex",
    alignItems: "center",
    textAlign: "left",
    width: "100%",
    minHeight: "38px",
    background: "none",
    border: "none",
    padding: "9px 12px",
    borderRadius: "5px",
    fontSize: "12px",
    lineHeight: "1.35",
    color: "var(--so-text-secondary)",
    cursor: "pointer",
    transition: "background 0.15s ease",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  skinItemSelected: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "var(--so-cyan-text, #38bdf8)",
    fontWeight: 600,
  },
  skinItemName: {
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  noSkinsFound: {
    padding: "20px 10px",
    textAlign: "center",
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  mainPanel: {
    flex: 1,
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    overflowY: "auto",
  },
  selectedSkinHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  activeSkinName: {
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
  },
  priceTrajectoryPill: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: "4px 10px",
    borderRadius: "6px",
    border: "1px solid var(--so-border-subtle)",
  },
  trendUpIcon: {
    color: "var(--so-success-text, #4ade80)",
  },
  trendDownIcon: {
    color: "var(--so-danger-text, #f87171)",
  },
  windowText: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  chartContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "8px",
    padding: "14px 16px 8px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    minHeight: "180px",
    position: "relative",
  },
  svgChart: {
    width: "100%",
    height: "150px",
  },
  chartDateLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "10px",
    color: "var(--so-text-muted)",
    fontFamily: "monospace",
  },
  loadingContainer: {
    height: "150px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    color: "var(--so-text-secondary)",
    fontSize: "12px",
  },
  noDataState: {
    height: "150px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--so-text-muted)",
    fontSize: "12px",
  },
  metricsBar: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "10px",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    padding: "10px 14px",
    borderRadius: "6px",
    border: "1px solid var(--so-border-subtle)",
  },
  metricItem: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  metricLabel: {
    fontSize: "10px",
    color: "var(--so-text-muted)",
  },
  metricVal: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--so-text-primary)",
    fontFamily: "monospace",
  },
  simulatorPill: {
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    border: "1px solid rgba(37, 99, 235, 0.25)",
    borderRadius: "6px",
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  simulatorHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  simulatorIcon: {
    color: "var(--so-cyan-text, #38bdf8)",
  },
  simulatorTitle: {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--so-text-primary)",
    flex: 1,
    marginLeft: "6px",
  },
  shieldBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "10px",
    color: "var(--so-cyan-text, #38bdf8)",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  simulatorBody: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  simValLabel: {
    fontSize: "12px",
    color: "var(--so-text-secondary)",
    marginRight: "6px",
  },
  simValAmount: {
    fontSize: "15px",
    fontWeight: 700,
    color: "var(--so-cyan-text, #38bdf8)",
    fontFamily: "monospace",
  },
  simValExplanation: {
    fontSize: "10px",
    color: "var(--so-text-muted)",
    maxWidth: "260px",
    textAlign: "right",
  },
  footer: {
    padding: "12px 20px",
    borderTop: "1px solid var(--so-border-subtle)",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerNote: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  footerActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  cancelBtn: {
    padding: "7px 14px",
    fontSize: "11px",
    color: "var(--so-text-secondary)",
    backgroundColor: "transparent",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "5px",
    cursor: "pointer",
  },
  buyNowBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 16px",
    fontSize: "11px",
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "var(--so-primary, #2563eb)",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};
