import React from "react";
import { Zap, RotateCw, Loader2, AlertTriangle, Lock } from "lucide-react";
import { formatTimeAgo, TrendHealthStatus } from "../../utils/oracleUtils";

interface CostLedgerSummaryProps {
  passingFilterCount: number;
  activeUnitCost: number;
  selectedEngine: "standard" | "nexus";
  cacheStatus: {
    itemCount: number;
    isFetching: boolean;
    lastFetchedAt: string | null;
  };
  evaluatedSummary: {
    totalEvaluated: number;
    soCloseCount: number;
    highSssCount: number;
    isBatchEvaluating: boolean;
    lastBuiltAt: string | null;
    batchProgress?: {
      current: number;
      total: number;
      percent: number;
    } | null;
  };
  strategyProfilePreset: string;
  canBuild: boolean;
  onBuildAcceptedPrices: () => void;
  isNexusTrendBlocked?: boolean;
  trendDaysCount?: number;
  trendHealth?: TrendHealthStatus | null;
}

export const CostLedgerSummary: React.FC<CostLedgerSummaryProps> = ({
  passingFilterCount,
  activeUnitCost,
  selectedEngine,
  cacheStatus,
  evaluatedSummary,
  strategyProfilePreset,
  canBuild,
  onBuildAcceptedPrices,
  isNexusTrendBlocked = false,
  trendDaysCount = 0,
  trendHealth,
}) => {
  const estimatedCostCents = passingFilterCount * activeUnitCost;
  const formattedCost = `$${(estimatedCostCents / 100).toFixed(2)}`;
  const isNexus = selectedEngine === "nexus";
  const isBlocked = isNexus && isNexusTrendBlocked;

  return (
    <div style={getContainerStyle(isNexus)}>
      <div style={styles.contentWrapper}>
        <div style={styles.titleRow}>
          <Zap
            size={16}
            style={getTitleZapIconStyle(isNexus)}
          />
          Compute Target Workstation Accepted Prices (
          {isNexus ? "Nexus Pro Dynamic" : "Standard Baseline"})
        </div>
        <div style={styles.descText}>
          {cacheStatus.itemCount === 0
            ? "Scan or load price cache above to activate pricing generation"
            : evaluatedSummary.lastBuiltAt
              ? `Last built ${formatTimeAgo(evaluatedSummary.lastBuiltAt)} — ${evaluatedSummary.totalEvaluated.toLocaleString()} items generated using ${isNexus ? "NEXUS PRO" : strategyProfilePreset.toUpperCase()} strategy`
              : `Send merged price cache to SaaS Backend (${isNexus ? "OracleNexus v2" : "SkinOracle v20"}) → stores accepted prices in local memory`}
        </div>
        {isNexus &&
          trendHealth &&
          (trendHealth.isStale ||
            trendHealth.isDecaying ||
            trendHealth.hasContinuityGap) && (
            <div style={getTrendHealthWarningStyle(trendHealth.isStale)}>
              <AlertTriangle size={13} style={styles.warningIcon} />
              <span>
                {trendHealth.isStale
                  ? `Stale Trend History (${trendHealth.daysSinceLatest}d old) — Nexus Pro will bypass trend momentum and fall back to base Oracle.`
                  : trendHealth.isDecaying
                    ? `Decaying Trend Recency (${trendHealth.daysSinceLatest}d lag) — Missing last 48h market activity.`
                    : `Trend Data Gap (${trendHealth.missingDaysInRange} missing days) — Regression slope may vary.`}
              </span>
            </div>
          )}
      </div>

      {/* Estimated Cost Breakdown Pill */}
      {passingFilterCount > 0 && (
        <div style={getCostPillStyle(isNexus)}>
          <div style={styles.costPillHeader}>
            <div style={getCostPillDotStyle(isNexus)} />
            <span style={styles.costPillLabel}>
              {isNexus ? "Nexus Cost" : "Est. Cost"}
            </span>
          </div>
          <div style={styles.costPillDivider} />
          <div style={styles.costPillValue}>
            {formattedCost}
            <span style={styles.unitCostText}>
              ({activeUnitCost}¢ / item)
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onBuildAcceptedPrices}
        disabled={!canBuild || evaluatedSummary.isBatchEvaluating || isBlocked}
        className={`btn ${isNexus ? "btn-primary" : "btn-primary"} btn-lg ${evaluatedSummary.isBatchEvaluating ? "btn-evaluating" : ""}`}
        style={getBuildButtonStyle(isBlocked)}
        aria-busy={evaluatedSummary.isBatchEvaluating}
        title={
          isBlocked
            ? `Nexus Pro requires at least 3 days of trend data (Recommended: 7 days). Currently available: ${trendDaysCount} day(s).`
            : trendHealth?.isStale
              ? `Warning: Latest trend snapshot is ${trendHealth.daysSinceLatest} days old. Nexus Pro will bypass trend adjustments and use base Oracle pricing.`
              : undefined
        }
      >
        {/* Real-time Progress Bar fill inside button */}
        {evaluatedSummary.isBatchEvaluating &&
          evaluatedSummary.batchProgress && (
            <>
              <div
                style={getProgressBarFillStyle(evaluatedSummary.batchProgress.percent)}
              />
              <div
                style={getProgressBarTrackStyle(evaluatedSummary.batchProgress.percent, isNexus)}
              />
            </>
          )}

        {evaluatedSummary.isBatchEvaluating ? (
          <span style={styles.evaluatingContent}>
            <Loader2 size={18} className="spin" style={styles.spinIcon} />
            <span>
              {evaluatedSummary.batchProgress
                ? `Building… ${evaluatedSummary.batchProgress.percent}% (${evaluatedSummary.batchProgress.current.toLocaleString()}/${evaluatedSummary.batchProgress.total.toLocaleString()})`
                : `Building… (${evaluatedSummary.totalEvaluated.toLocaleString()})`}
            </span>
          </span>
        ) : isBlocked ? (
          <span style={styles.blockedContent}>
            <Lock size={18} /> Min 3 Days Trends Required (Nexus Pro)
          </span>
        ) : evaluatedSummary.lastBuiltAt ? (
          <>
            <RotateCw size={18} /> Rebuild Accepted Prices (
            {isNexus ? "Nexus Pro" : "Standard"})
          </>
        ) : (
          <>
            <Zap size={18} /> Build Accepted Price (
            {isNexus ? "Nexus Pro" : "Standard"})
          </>
        )}
      </button>

      {/* Notice Banner when Nexus is blocked due to insufficient trend history */}
      {isBlocked && (
        <div style={styles.blockedNoticeBanner}>
          <AlertTriangle size={16} style={styles.warningIcon} />
          <span>
            Nexus Pro requires at least <strong>3 days</strong> of price trend
            history (Recommended: <strong>7 days</strong>) to compute linear
            momentum and volatility. Currently recorded:{" "}
            <strong>{trendDaysCount}/3 days</strong>.
          </span>
        </div>
      )}
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC STYLE HELPERS ─────────────────────────

function getContainerStyle(isNexus: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    backgroundColor: "var(--so-surface-panel)",
    border: isNexus
      ? "1px solid rgba(99, 102, 241, 0.4)"
      : "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    flexWrap: "wrap",
  };
}

function getTitleZapIconStyle(isNexus: boolean): React.CSSProperties {
  return {
    color: isNexus ? "var(--so-primary)" : "var(--so-cyan-text)",
  };
}

function getTrendHealthWarningStyle(isStale?: boolean): React.CSSProperties {
  return {
    marginTop: "8px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "4px",
    backgroundColor: isStale
      ? "rgba(239, 68, 68, 0.12)"
      : "rgba(234, 179, 8, 0.1)",
    border: isStale
      ? "1px solid rgba(239, 68, 68, 0.35)"
      : "1px solid rgba(234, 179, 8, 0.3)",
    color: isStale
      ? "var(--so-danger-text, #ef4444)"
      : "var(--so-warning-text, #f59e0b)",
    fontSize: "11.5px",
    fontWeight: 600,
  };
}

function getCostPillStyle(isNexus: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "8px 20px",
    borderRadius: "30px",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    border: isNexus
      ? "1px solid rgba(99, 102, 241, 0.4)"
      : "1px solid rgba(14, 165, 233, 0.25)",
    boxShadow: isNexus ? "0 0 16px rgba(99, 102, 241, 0.15)" : "none",
  };
}

function getCostPillDotStyle(isNexus: boolean): React.CSSProperties {
  return {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: isNexus ? "#818cf8" : "#38bdf8",
    boxShadow: isNexus ? "0 0 8px #818cf8" : "0 0 8px #38bdf8",
  };
}

function getBuildButtonStyle(isBlocked: boolean): React.CSSProperties {
  return {
    minWidth: "240px",
    position: "relative",
    overflow: "hidden",
    opacity: isBlocked ? 0.6 : 1,
    cursor: isBlocked ? "not-allowed" : undefined,
  };
}

function getProgressBarFillStyle(percent: number): React.CSSProperties {
  return {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: `${percent}%`,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    transition: "width 0.25s ease-out",
    pointerEvents: "none",
  };
}

function getProgressBarTrackStyle(percent: number, isNexus: boolean): React.CSSProperties {
  return {
    position: "absolute",
    left: 0,
    bottom: 0,
    height: "3px",
    width: `${percent}%`,
    backgroundColor: isNexus
      ? "var(--so-primary)"
      : "var(--so-accent-cyan, #0284c7)",
    transition: "width 0.25s ease-out",
    pointerEvents: "none",
  };
}

const styles: Record<string, React.CSSProperties> = {
  contentWrapper: {
    flex: 1,
    minWidth: "260px",
  },
  titleRow: {
    fontWeight: 800,
    fontSize: "14px",
    color: "var(--so-text-primary)",
    marginBottom: "3px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  descText: {
    fontSize: "12.5px",
    color: "var(--so-text-muted)",
  },
  warningIcon: {
    flexShrink: 0,
  },
  costPillHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  costPillLabel: {
    fontSize: "11.5px",
    fontWeight: 700,
    color: "var(--so-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  costPillDivider: {
    width: "1px",
    height: "14px",
    backgroundColor: "var(--so-border-subtle)",
  },
  costPillValue: {
    fontSize: "14px",
    fontWeight: 800,
    color: "#f3f4f6",
    letterSpacing: "0.5px",
  },
  unitCostText: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
    fontWeight: 500,
    marginLeft: "6px",
  },
  evaluatingContent: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    zIndex: 1,
  },
  spinIcon: {
    flexShrink: 0,
  },
  blockedContent: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  blockedNoticeBanner: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "rgba(234, 179, 8, 0.08)",
    border: "1px solid rgba(234, 179, 8, 0.3)",
    color: "var(--so-warning-text, #f59e0b)",
    fontSize: "12px",
    fontWeight: 600,
  },
};
