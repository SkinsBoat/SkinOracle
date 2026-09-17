import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { confirmModal } from "../../../store/useConfirmStore";
import {
  Database,
  FolderOpen,
  Copy,
  Check,
  RotateCw,
  Trash2,
  Scissors,
  HardDrive,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";

interface TrendStats {
  daysCount: number;
  totalSnapshots: number;
  itemCoverage: number;
  latestDate: string | null;
  oldestDate: string | null;
}

export const DatabaseStorageSection: React.FC = () => {
  const [dbPath, setDbPath] = useState<string>("");
  const [trendStats, setTrendStats] = useState<TrendStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPruning, setIsPruning] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchStatsAndPath = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.trendStore?.getDbPath) {
        const path = await window.electronAPI.trendStore.getDbPath();
        if (path) setDbPath(path);
      }
      if (window.electronAPI?.trendStore?.getStats) {
        const stats = await window.electronAPI.trendStore.getStats();
        setTrendStats(stats);
      }
    } catch (err: any) {
      console.warn("[DatabaseStorageSection] Error fetching DB info:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatsAndPath();
  }, [fetchStatsAndPath]);

  const handleOpenFolder = async () => {
    if (window.electronAPI?.trendStore?.revealInFolder) {
      try {
        await window.electronAPI.trendStore.revealInFolder();
        toast.success("Opened local database directory in file manager");
      } catch (err: any) {
        toast.error(err?.message || "Failed to open folder");
      }
    } else {
      toast("Local storage explorer is active in desktop builds.", { icon: "ℹ️" });
    }
  };

  const handleCopyPath = () => {
    if (!dbPath) {
      toast("Database path not loaded yet", { icon: "ℹ️" });
      return;
    }
    navigator.clipboard.writeText(dbPath);
    setCopied(true);
    toast.success("Database file path copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrune = async (retentionDays: number) => {
    const confirmed = await confirmModal({
      title: "Prune Historical Snapshots?",
      message: `Are you sure you want to prune snapshots older than ${retentionDays} days? Daily price data captured prior to this retention window will be permanently deleted.`,
      confirmText: `Prune >${retentionDays} Days`,
      cancelText: "Cancel",
      variant: "warning",
    });
    if (!confirmed) return;

    setIsPruning(true);
    try {
      if (window.electronAPI?.trendStore?.prune) {
        const removed = await window.electronAPI.trendStore.prune(retentionDays);
        toast.success(
          `Pruning complete: Removed ${removed.toLocaleString()} old snapshot entries.`,
        );
        await fetchStatsAndPath();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to prune snapshots");
    } finally {
      setIsPruning(false);
    }
  };

  const handleClearDatabase = async () => {
    const confirmed = await confirmModal({
      title: "Wipe Local Database?",
      message: "Are you sure you want to permanently wipe all local historical trend snapshots? All recorded daily prices will be cleared from SQLite. This action cannot be undone.",
      confirmText: "Wipe Database",
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!confirmed) return;

    setIsClearing(true);
    try {
      if (window.electronAPI?.trendStore?.clear) {
        const removed = await window.electronAPI.trendStore.clear();
        toast.success(`Wiped database: Removed ${removed.toLocaleString()} snapshots.`);
        await fetchStatsAndPath();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to clear database");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Section Header */}
      <div>
        <h2 style={styles.sectionHeading}>
          <Database size={22} style={{ color: "#a855f7" }} />
          Local Database & Trend Storage
        </h2>
        <p style={styles.sectionSubtitle}>
          Manage your high-frequency SQLite pricing snapshots, monitor database health, and export or backup your historical market records.
        </p>
      </div>

      {/* Database Identity & File Actions Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardHeaderLeft}>
            <div style={styles.dbIconBox}>
              <HardDrive size={22} style={{ color: "#a855f7" }} />
            </div>
            <div>
              <div style={styles.dbTitleRow}>
                <span style={styles.dbTitle}>analytics.sqlite</span>
                <span style={styles.sqliteBadge}>SQLite 3 WASM</span>
                <span style={styles.localBadge}>100% Local Drive</span>
              </div>
              <p style={styles.dbDesc}>
                Atomic embedded SQLite database stored directly on your computer. Contains historical market medians, active listing volumes, and trend snapshots used by OracleNexus v2.
              </p>
            </div>
          </div>
        </div>

        {/* File Path Display & Action Buttons Row */}
        <div style={styles.pathRow}>
          <div style={styles.pathBox} title={dbPath || "Loading database path..."}>
            <span style={styles.pathLabel}>Location:</span>
            <code style={styles.pathCode}>{dbPath || "Detecting OS application path..."}</code>
          </div>

          <div style={styles.pathActions}>
            <button
              type="button"
              onClick={handleCopyPath}
              style={styles.actionBtn}
              title="Copy absolute database file path"
            >
              {copied ? <Check size={14} style={{ color: "#10b981" }} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy Path"}
            </button>

            <button
              type="button"
              onClick={handleOpenFolder}
              style={styles.primaryActionBtn}
              title="Reveal database in file manager"
            >
              <FolderOpen size={14} />
              Open DB Folder
            </button>
          </div>
        </div>
      </div>

      {/* Storage Metrics & Snapshot Coverage Card */}
      <div style={styles.card}>
        <div style={styles.metricsHeaderRow}>
          <div style={styles.cardHeaderTitle}>
            <Sparkles size={16} style={{ color: "var(--so-primary)" }} />
            Storage & History Telemetry
          </div>

          <button
            type="button"
            onClick={fetchStatsAndPath}
            disabled={isLoading}
            style={styles.refreshBtn}
            title="Refresh database statistics"
          >
            <RotateCw size={13} className={isLoading ? "spin" : ""} />
            Refresh
          </button>
        </div>

        <div style={styles.metricsGrid}>
          {/* Metric 1: Total Snapshots */}
          <div style={styles.metricCard}>
            <div style={styles.metricIconWrap}>
              <Layers size={16} style={{ color: "#38bdf8" }} />
              <span style={styles.metricLabel}>Total Snapshots</span>
            </div>
            <div style={styles.metricValue}>
              {trendStats ? trendStats.totalSnapshots.toLocaleString() : "—"}
            </div>
            <div style={styles.metricSubtext}>Recorded price points</div>
          </div>

          {/* Metric 2: Item Coverage */}
          <div style={styles.metricCard}>
            <div style={styles.metricIconWrap}>
              <Database size={16} style={{ color: "#a855f7" }} />
              <span style={styles.metricLabel}>Unique Skins</span>
            </div>
            <div style={styles.metricValue}>
              {trendStats ? trendStats.itemCoverage.toLocaleString() : "—"}
            </div>
            <div style={styles.metricSubtext}>Distinct catalog items</div>
          </div>

          {/* Metric 3: Total Days */}
          <div style={styles.metricCard}>
            <div style={styles.metricIconWrap}>
              <Calendar size={16} style={{ color: "#10b981" }} />
              <span style={styles.metricLabel}>History Days</span>
            </div>
            <div style={styles.metricValue}>
              {trendStats ? `${trendStats.daysCount} Days` : "—"}
            </div>
            <div style={styles.metricSubtext}>Active trend window</div>
          </div>

          {/* Metric 4: Date Range */}
          <div style={styles.metricCard}>
            <div style={styles.metricIconWrap}>
              <Calendar size={16} style={{ color: "#f59e0b" }} />
              <span style={styles.metricLabel}>Recorded Range</span>
            </div>
            <div style={styles.metricDateValue}>
              {trendStats?.oldestDate && trendStats?.latestDate
                ? `${trendStats.oldestDate} → ${trendStats.latestDate}`
                : "No snapshots yet"}
            </div>
            <div style={styles.metricSubtext}>Oldest to newest capture</div>
          </div>
        </div>
      </div>

      {/* Maintenance, Pruning & Retention Card */}
      <div style={styles.card}>
        <div style={styles.cardHeaderTitle}>
          <Scissors size={16} style={{ color: "#f59e0b" }} />
          Database Maintenance & Retention
        </div>
        <p style={styles.maintenanceDesc}>
          Keep your SQLite database compact and fast by pruning historical snapshots beyond your active trading window, or safely reset your cache.
        </p>

        <div style={styles.maintenanceRow}>
          <div style={styles.pruneButtonGroup}>
            <button
              type="button"
              onClick={() => handlePrune(30)}
              disabled={isPruning || !trendStats || trendStats.daysCount <= 30}
              style={styles.pruneBtn}
              title="Remove snapshots older than 30 days"
            >
              <Scissors size={13} />
              Prune &gt;30 Days
            </button>

            <button
              type="button"
              onClick={() => handlePrune(60)}
              disabled={isPruning || !trendStats || trendStats.daysCount <= 60}
              style={styles.pruneBtn}
              title="Remove snapshots older than 60 days"
            >
              <Scissors size={13} />
              Prune &gt;60 Days
            </button>
          </div>

          <button
            type="button"
            onClick={handleClearDatabase}
            disabled={isClearing || !trendStats || trendStats.totalSnapshots === 0}
            style={styles.dangerBtn}
            title="Permanently wipe all price snapshots"
          >
            <Trash2 size={14} />
            Wipe Snapshot History
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Extracted Styles Dictionary (Rule 9: Zero inline styles in render flow)
// ─────────────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  sectionHeading: {
    fontSize: "20px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: "13px",
    color: "var(--so-text-secondary)",
    marginTop: "4px",
    marginBottom: 0,
    lineHeight: 1.45,
  },
  card: {
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
  },
  cardHeaderLeft: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
  },
  dbIconBox: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    backgroundColor: "rgba(168, 85, 247, 0.12)",
    border: "1px solid rgba(168, 85, 247, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dbTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "4px",
  },
  dbTitle: {
    fontSize: "16px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    fontFamily: "var(--so-font-mono)",
  },
  sqliteBadge: {
    fontSize: "10.5px",
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: "4px",
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    color: "#c084fc",
    border: "1px solid rgba(168, 85, 247, 0.3)",
    textTransform: "uppercase",
  },
  localBadge: {
    fontSize: "10.5px",
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: "4px",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#10b981",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    textTransform: "uppercase",
  },
  dbDesc: {
    fontSize: "12.5px",
    color: "var(--so-text-secondary)",
    margin: 0,
    lineHeight: 1.45,
  },
  pathRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "var(--so-radius-sm)",
    padding: "10px 14px",
    flexWrap: "wrap",
  },
  pathBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flex: 1,
    minWidth: "260px",
    overflow: "hidden",
  },
  pathLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--so-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    flexShrink: 0,
  },
  pathCode: {
    fontSize: "12px",
    color: "var(--so-text-primary)",
    fontFamily: "var(--so-font-mono)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  pathActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },
  actionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    color: "var(--so-text-secondary)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  primaryActionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-primary)",
    border: "1px solid var(--so-primary)",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  metricsHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeaderTitle: {
    fontSize: "14px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  refreshBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "transparent",
    border: "1px solid var(--so-border-subtle)",
    color: "var(--so-text-muted)",
    fontSize: "11.5px",
    fontWeight: 600,
    cursor: "pointer",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
  },
  metricCard: {
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "var(--so-radius-sm)",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  metricIconWrap: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  metricLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--so-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  metricValue: {
    fontSize: "20px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    fontFamily: "var(--so-font-mono)",
  },
  metricDateValue: {
    fontSize: "12.5px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
    fontFamily: "var(--so-font-mono)",
    wordBreak: "break-all",
  },
  metricSubtext: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  maintenanceDesc: {
    fontSize: "12.5px",
    color: "var(--so-text-secondary)",
    margin: 0,
    lineHeight: 1.45,
  },
  maintenanceRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  pruneButtonGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  pruneBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    color: "var(--so-text-primary)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  dangerBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    color: "var(--so-danger-text, #ef4444)",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
