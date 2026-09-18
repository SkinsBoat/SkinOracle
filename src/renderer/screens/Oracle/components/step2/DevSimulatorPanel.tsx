import React from "react";
import {
  Database,
  RotateCw,
  AlertTriangle,
  Check,
  Sparkles,
  Loader2,
  Zap,
} from "lucide-react";
import {
  evaluateTrendHealth,
  TrendHealthStatus,
} from "../../utils/oracleUtils";

interface DevSimulatorPanelProps {
  trendStats: {
    daysCount: number;
    totalSnapshots: number;
    itemCoverage: number;
    latestDate: string | null;
    oldestDate: string | null;
  } | null;
  isLoadingStats: boolean;
  fetchConfigAndStats: () => Promise<void>;
  simulatedDate: string | null;
  seedDays: number;
  setSeedDays: (days: number) => void;
  isSeedingHistory: boolean;
  handleSeedMockHistory: (days?: number) => Promise<void>;
  handleSetSimulatedDate: (date: string | null) => Promise<void>;
  isClearingHistory: boolean;
  handleClearTrendHistory: () => Promise<void>;
  trendHealth?: TrendHealthStatus | null;
}

export const DevSimulatorPanel: React.FC<DevSimulatorPanelProps> = ({
  trendStats,
  isLoadingStats,
  fetchConfigAndStats,
  simulatedDate,
  seedDays,
  setSeedDays,
  isSeedingHistory,
  handleSeedMockHistory,
  handleSetSimulatedDate,
  isClearingHistory,
  handleClearTrendHistory,
  trendHealth: propTrendHealth,
}) => {
  const trendHealth = React.useMemo(() => {
    return propTrendHealth ?? evaluateTrendHealth(trendStats, simulatedDate);
  }, [propTrendHealth, trendStats, simulatedDate]);

  const getPastDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  return (
    <div style={styles.panelContainer}>
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <Database size={16} style={styles.dbIcon} />
          <span style={styles.headerTitle}>
            Local SQLite Trend Intelligence:
          </span>
          {trendStats ? (
            <span
              className={`badge ${trendHealth.badgeClass}`}
              style={{
                ...styles.trendBadge,
                ...getTrendBadgeStyle(trendHealth.isStale),
              }}
              title={trendHealth.warningMessage || undefined}
            >
              {trendHealth.badgeText}
            </span>
          ) : (
            <span style={styles.connectingText}>
              Connecting to local analytics.sqlite...
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={fetchConfigAndStats}
          disabled={isLoadingStats}
          style={styles.refreshBtn}
        >
          <RotateCw size={12} className={isLoadingStats ? "spin" : ""} />
          Refresh Status
        </button>
      </div>

      {trendStats && (
        <div style={styles.statsRow}>
          <span>
            Total Snapshots:{" "}
            <strong style={styles.statValue}>
              {trendStats.totalSnapshots.toLocaleString()}
            </strong>
          </span>
          <span>•</span>
          <span>
            Item Coverage:{" "}
            <strong style={styles.statValue}>
              {trendStats.itemCoverage.toLocaleString()} unique skins
            </strong>
          </span>
          <span>•</span>
          <span>
            Date Range:{" "}
            <strong style={styles.statValue}>
              {trendStats.oldestDate || "None"} →{" "}
              {trendStats.latestDate || "None"}
            </strong>
            {trendHealth.daysSinceLatest !== null && (
              <span
                style={{
                  ...styles.dateLagText,
                  ...getDateLagStyle(trendHealth.isStale, trendHealth.isDecaying),
                }}
              >
                (
                {trendHealth.daysSinceLatest === 0
                  ? "Today"
                  : `${trendHealth.daysSinceLatest}d ago`}
                )
              </span>
            )}
            {trendHealth.spanDays !== null && trendHealth.spanDays > 1 && (
              <span style={styles.spanText}>
                [{trendHealth.spanDays}d span]
              </span>
            )}
          </span>
        </div>
      )}

      {/* ── Status Alerts & Health Warnings ── */}
      {trendHealth.isInsufficient && trendStats && (
        <div style={styles.insufficientAlert}>
          <AlertTriangle size={14} />
          <span>
            Baseline building: Minimum 3 days of trend required for Nexus engine
            (Recommended: 7 days). Items without 3 days of trend lock to $0.00
            for capital safety. Build price cache in Step 1 daily to accumulate
            history.
          </span>
        </div>
      )}

      {trendHealth.isStale && trendStats && (
        <div style={styles.criticalStaleAlert}>
          <AlertTriangle
            size={16}
            style={styles.alertIcon}
          />
          <div>
            <div style={styles.alertHeading}>
              CRITICAL STALENESS WARNING ({trendHealth.daysSinceLatest} Days
              Old)
            </div>
            <span>
              Your latest price snapshot was recorded on{" "}
              <strong>{trendStats.latestDate}</strong> (
              {trendHealth.daysSinceLatest} days ago). The Nexus valuation
              engine enforces a hard staleness cap of 3 days (
              <code>maxDataAgeDays: 3</code>). Because data is older than 3
              days, trend momentum adjustments and downside cuts will be{" "}
              <strong>BYPASSED</strong>, silently falling back to standard base
              Oracle pricing. Please scan or load a fresh price cache in Step 1
              to record today&apos;s snapshot.
            </span>
          </div>
        </div>
      )}

      {trendHealth.isDecaying && trendStats && (
        <div style={styles.decayingAlert}>
          <AlertTriangle
            size={16}
            style={styles.alertIcon}
          />
          <div>
            <div style={styles.alertHeading}>
              DECAYING TREND CAUTION ({trendHealth.daysSinceLatest} Days Old)
            </div>
            <span>
              Latest snapshot is from <strong>{trendStats.latestDate}</strong> (
              {trendHealth.daysSinceLatest} days ago). Market price movements
              over the last 48 hours are missing, meaning recent crashes or
              sudden breakouts may not be reflected in trend slopes. Consider
              refreshing your price cache in Step 1 for optimal trend accuracy.
            </span>
          </div>
        </div>
      )}

      {trendHealth.hasContinuityGap && !trendHealth.isStale && trendStats && (
        <div style={styles.decayingAlert}>
          <AlertTriangle
            size={16}
            style={styles.alertIcon}
          />
          <div>
            <div style={styles.alertHeading}>
              DATA CONTINUITY GAP ({trendHealth.missingDaysInRange} Missing
              Days)
            </div>
            <span>
              There are{" "}
              <strong>{trendHealth.missingDaysInRange} missing days</strong>{" "}
              between {trendStats.oldestDate} and {trendStats.latestDate} (
              {trendStats.daysCount} of {trendHealth.spanDays} days captured).
              Sparse data points may produce sensitive or distorted linear
              regression slopes.
            </span>
          </div>
        </div>
      )}

      {!trendHealth.isInsufficient &&
        !trendHealth.isStale &&
        !trendHealth.isDecaying &&
        trendStats &&
        trendStats.daysCount >= 3 &&
        trendStats.daysCount < 7 && (
          <div style={styles.readyCard}>
            <Check size={14} />
            <span>
              Minimum 3 days met for Nexus Pro pricing (7+ days recommended for
              optimal linear regression & volatility accuracy).
            </span>
          </div>
        )}

      {!trendHealth.isInsufficient &&
        !trendHealth.isStale &&
        !trendHealth.isDecaying &&
        trendStats &&
        trendStats.daysCount >= 7 && (
          <div style={styles.readyCard}>
            <Check size={14} />
            <span>
              Ready for AI Momentum Valuation: Slope linear regression &
              volatility cut filters are active with verified history.
            </span>
          </div>
        )}

      {/* ── Dev Mode: Trend Data Simulator Toolbar ── */}
      {import.meta.env.DEV && (
        <div style={styles.simulatorToolbar}>
          <div style={styles.simulatorHeader}>
            <div style={styles.simulatorTitle}>
              <Sparkles size={14} /> Dev Simulator: Rapid Trend History Injector
            </div>
            {simulatedDate && (
              <span
                className="badge badge-warning"
                style={styles.dateOverrideBadge}
              >
                Date Override: {simulatedDate}
              </span>
            )}
          </div>

          <div style={styles.simulatorControlsRow}>
            {/* Action 1: Inject Mock History with Days Selector */}
            <div style={styles.mockHistoryGroup}>
              <select
                value={seedDays}
                onChange={(e) => setSeedDays(Number(e.target.value))}
                disabled={isSeedingHistory}
                style={styles.seedSelect}
                title="Select number of days of synthetic trend data to generate"
              >
                <option value={7}>7 Days (Fast Momentum)</option>
                <option value={14}>14 Days (Standard Window)</option>
                <option value={30}>30 Days (Macro Stability)</option>
                <option value={60}>60 Days (Extended)</option>
                <option value={90}>90 Days (Deep Analysis)</option>
              </select>

              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => handleSeedMockHistory(seedDays)}
                disabled={isSeedingHistory}
                style={styles.seedBtn}
                title={`Instantly populates ${seedDays} days of realistic price movements for all cached skins`}
              >
                {isSeedingHistory ? (
                  <Loader2 size={13} className="spin" />
                ) : (
                  <Zap size={13} />
                )}
                ⚡ Seed {seedDays}-Day Trend Data
              </button>
            </div>

            {/* Action 2: Simulate Date Override Selector */}
            <div style={styles.simDateGroup}>
              <span style={styles.simDateLabel}>
                Simulate Date:
              </span>
              <select
                value={simulatedDate || ""}
                onChange={(e) => handleSetSimulatedDate(e.target.value || null)}
                style={{
                  ...styles.simDateSelect,
                  color: simulatedDate
                    ? "var(--so-warning-text, #f59e0b)"
                    : "var(--so-text-primary)",
                }}
              >
                <option value="">Live (Today)</option>
                <option value={getPastDateStr(1)}>Yesterday (-1 Day)</option>
                <option value={getPastDateStr(2)}>-2 Days</option>
                <option value={getPastDateStr(3)}>-3 Days</option>
                <option value={getPastDateStr(7)}>-7 Days (1 Week)</option>
                <option value={getPastDateStr(14)}>-14 Days (2 Weeks)</option>
              </select>
            </div>

            {/* Action 3: Wipe SQLite History */}
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={handleClearTrendHistory}
              disabled={isClearingHistory}
              style={styles.wipeBtn}
              title="Wipes SQLite price_snapshots to test $0.00 cold-start safety contract"
            >
              {isClearingHistory ? (
                <Loader2 size={12} className="spin" />
              ) : (
                "🗑️ Wipe Trend DB"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC STYLE HELPERS ─────────────────────────

function getTrendBadgeStyle(isStale?: boolean): React.CSSProperties {
  if (!isStale) return {};
  return {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "var(--so-danger-text, #ef4444)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
  };
}

function getDateLagStyle(isStale?: boolean, isDecaying?: boolean): React.CSSProperties {
  let color = "var(--so-text-muted)";
  if (isStale) color = "var(--so-danger-text, #ef4444)";
  else if (isDecaying) color = "var(--so-warning-text, #f59e0b)";

  return {
    color,
    fontWeight: isStale || isDecaying ? 700 : 400,
  };
}

const styles: Record<string, React.CSSProperties> = {
  panelContainer: {
    padding: "12px 16px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    border: "1px solid var(--so-border-subtle)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "18px",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "10px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  dbIcon: {
    color: "var(--so-cyan-text)",
  },
  headerTitle: {
    fontSize: "12.5px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
  },
  trendBadge: {
    fontSize: "11px",
    padding: "2px 8px",
  },
  connectingText: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
  },
  refreshBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    background: "none",
    border: "none",
    color: "var(--so-text-muted)",
    fontSize: "11.5px",
    cursor: "pointer",
    padding: "2px 6px",
  },
  statsRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
    fontSize: "11.5px",
    color: "var(--so-text-secondary)",
  },
  statValue: {
    color: "var(--so-text-primary)",
  },
  dateLagText: {
    marginLeft: "4px",
  },
  spanText: {
    color: "var(--so-text-muted)",
    marginLeft: "4px",
  },
  insufficientAlert: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "var(--so-warning-text)",
    fontSize: "11.5px",
    fontWeight: 600,
    marginTop: "2px",
  },
  criticalStaleAlert: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    color: "var(--so-danger-text, #ef4444)",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    padding: "10px 14px",
    borderRadius: "var(--so-radius-sm)",
    fontSize: "12px",
    fontWeight: 500,
    marginTop: "4px",
  },
  alertIcon: {
    flexShrink: 0,
    marginTop: "2px",
  },
  alertHeading: {
    fontWeight: 800,
    marginBottom: "2px",
  },
  decayingAlert: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    color: "var(--so-warning-text, #f59e0b)",
    backgroundColor: "rgba(234, 179, 8, 0.08)",
    border: "1px solid rgba(234, 179, 8, 0.3)",
    padding: "10px 14px",
    borderRadius: "var(--so-radius-sm)",
    fontSize: "12px",
    fontWeight: 500,
    marginTop: "4px",
  },
  readyCard: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#10b981",
    fontSize: "11.5px",
    fontWeight: 600,
    marginTop: "2px",
  },
  simulatorToolbar: {
    marginTop: "12px",
    padding: "12px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "rgba(234, 179, 8, 0.05)",
    border: "1px dashed rgba(234, 179, 8, 0.35)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  simulatorHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "8px",
  },
  simulatorTitle: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "11.5px",
    fontWeight: 800,
    color: "var(--so-warning-text, #f59e0b)",
  },
  dateOverrideBadge: {
    fontSize: "10px",
    padding: "2px 6px",
  },
  simulatorControlsRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  mockHistoryGroup: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  seedSelect: {
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "4px",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid rgba(99, 102, 241, 0.4)",
    color: "var(--so-text-primary)",
    cursor: "pointer",
  },
  seedBtn: {
    fontSize: "11.5px",
    padding: "4px 10px",
    border: "1px solid rgba(99, 102, 241, 0.5)",
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    color: "var(--so-primary, #6366f1)",
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
  },
  simDateGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  simDateLabel: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  simDateSelect: {
    fontSize: "11px",
    padding: "3px 8px",
    borderRadius: "4px",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-subtle)",
  },
  wipeBtn: {
    fontSize: "11px",
    padding: "4px 8px",
    color: "var(--so-danger-text, #ef4444)",
    marginLeft: "auto",
  },
};
