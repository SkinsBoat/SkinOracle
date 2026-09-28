import React, { useState } from "react";
import {
  Upload,
  RefreshCw,
  Trash2,
  DollarSign,
  Users,
  ShieldCheck,
  Calendar,
  Layers,
  Database,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { TrendMarketMyListingResponse } from "../../../../shared/types/electron-api.types";

interface SellerDashboardTabProps {
  myListing: TrendMarketMyListingResponse | null;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onPublishOrUpdate: (title: string, days: number) => Promise<void>;
  onDeleteListing: () => Promise<void>;
  localTrendStats: {
    daysCount: number;
    totalSnapshots: number;
    itemCoverage: number;
    latestDate: string | null;
    oldestDate: string | null;
  } | null;
  isPublishing: boolean;
  isHeld?: boolean;
}

export const SellerDashboardTab: React.FC<SellerDashboardTabProps> = ({
  myListing,
  isLoading,
  onRefresh,
  onPublishOrUpdate,
  onDeleteListing,
  localTrendStats,
  isPublishing,
  isHeld = false,
}) => {
  const [packTitle, setPackTitle] = useState("Global CS2 Comprehensive History");
  const [selectedDays, setSelectedDays] = useState(30);

  const activeListing = myListing?.listing;
  const hasLocalData = localTrendStats && localTrendStats.daysCount > 0;

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packTitle.trim()) return;
    onPublishOrUpdate(packTitle.trim(), selectedDays);
  };

  return (
    <div style={styles.container}>
      {/* Top Status & Earnings Overview */}
      <div style={styles.overviewGrid}>
        <div style={styles.overviewCard}>
          <div style={styles.overviewIconContainer}>
            <DollarSign size={18} style={styles.dollarIcon} />
          </div>
          <div>
            <div style={styles.overviewLabel}>Seller Net Earnings</div>
            <div style={styles.overviewValue}>
              {myListing ? myListing.formattedEarned : "$0.00"}
            </div>
            <div style={styles.overviewSub}>
              {myListing
                ? `${myListing.formattedEarned} net earned (80% split)`
                : "0 sales"}
            </div>
          </div>
        </div>

        <div style={styles.overviewCard}>
          <div style={styles.overviewIconContainer}>
            <Users size={18} style={styles.usersIcon} />
          </div>
          <div>
            <div style={styles.overviewLabel}>Total Buyers</div>
            <div style={styles.overviewValue}>
              {myListing ? myListing.totalSales : 0}
            </div>
            <div style={styles.overviewSub}>Community downloads</div>
          </div>
        </div>

        <div style={styles.overviewCard}>
          <div style={styles.overviewIconContainer}>
            <Database size={18} style={styles.dbIcon} />
          </div>
          <div>
            <div style={styles.overviewLabel}>Local History Buffer</div>
            <div style={styles.overviewValue}>
              {localTrendStats ? `${localTrendStats.daysCount} Days` : "0 Days"}
            </div>
            <div style={styles.overviewSub}>
              {localTrendStats
                ? `${localTrendStats.itemCoverage.toLocaleString()} skins scanned`
                : "No snapshots"}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={styles.loadingBox}>
          <Loader2 size={24} className="spin" />
          <span>Refreshing seller account status…</span>
        </div>
      ) : activeListing ? (
        /* ── Active Listing Management Card ── */
        <div style={styles.activePackCard}>
          <div style={styles.activeHeader}>
            <div>
              <div style={styles.activeTitleRow}>
                <span style={styles.activeTitle}>{activeListing.title}</span>
                <span style={styles.versionTag}>v{activeListing.version}</span>
              </div>
              <div style={styles.activeSub}>
                Published on marketplace • Last updated:{" "}
                {new Date(activeListing.updatedAt).toLocaleDateString()}
              </div>
            </div>

            <div style={styles.activeHeaderRight}>
              <button
                type="button"
                style={styles.refreshBtn}
                onClick={onRefresh}
                title="Refresh earnings and sales stats"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>
          </div>

          <div style={styles.activeMetricsGrid}>
            <div style={styles.activeMetricItem}>
              <Calendar size={13} style={styles.metricIcon} />
              <div>
                <div style={styles.activeMetricValue}>
                  {activeListing.daysCount} Days
                </div>
                <div style={styles.activeMetricLabel}>
                  {activeListing.oldestDate} &rarr; {activeListing.latestDate}
                </div>
              </div>
            </div>

            <div style={styles.activeMetricItem}>
              <Layers size={13} style={styles.metricIconCyan} />
              <div>
                <div style={styles.activeMetricValue}>
                  {activeListing.itemCoverage.toLocaleString()} Skins
                </div>
                <div style={styles.activeMetricLabel}>Catalog Coverage</div>
              </div>
            </div>

            <div style={styles.activeMetricItem}>
              <Database size={13} style={styles.metricIconPurple} />
              <div>
                <div style={styles.activeMetricValue}>
                  {activeListing.totalSnapshots.toLocaleString()}
                </div>
                <div style={styles.activeMetricLabel}>Total Snapshots</div>
              </div>
            </div>

            <div style={styles.activeMetricItem}>
              <ShieldCheck size={13} style={styles.metricIconGreen} />
              <div>
                <div style={styles.activeMetricValue}>
                  {activeListing.qualityScore}%
                </div>
                <div style={styles.activeMetricLabel}>Dataset Quality</div>
              </div>
            </div>
          </div>

          <div style={styles.activeNotice}>
            <CheckCircle2 size={14} style={styles.noticeIcon} />
            <span>
              <strong>Continuity Delta Lock Active:</strong> Daily updates are 100% Free ($0.00 fee) as long as historical overlap with your previous snapshot is &ge; 70%.
            </span>
          </div>

          <div style={styles.activeActionsRow}>
            <button
              type="button"
              style={styles.deleteBtn}
              onClick={onDeleteListing}
              disabled={isPublishing || isHeld}
              title="Remove listing from marketplace"
            >
              <Trash2 size={13} />
              Delete Listing
            </button>

            <button
              type="button"
              style={styles.syncBtn}
              onClick={() =>
                onPublishOrUpdate(
                  activeListing.title,
                  activeListing.daysCount || 30,
                )
              }
              disabled={isPublishing || !hasLocalData || isHeld}
              title={
                isHeld
                  ? "Marketplace temporarily paused while the valuation engine restarts"
                  : "Export local SQLite snapshots and push free daily update"
              }
            >
              {isPublishing ? (
                <>
                  <Loader2 size={13} className="spin" />
                  Syncing Update…
                </>
              ) : (
                <>
                  <Upload size={13} />
                  Sync / Push Daily Update (Free)
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* ── No Active Listing: Publish Form ── */
        <div style={styles.publishCard}>
          <div style={styles.publishHeader}>
            <Upload size={18} style={styles.uploadIcon} />
            <div>
              <div style={styles.publishTitle}>
                List Trend Pack on Marketplace
              </div>
              <div style={styles.publishSub}>
                Monetize your scanned price history. Earn $4.00 USD (80% revenue
                split) per purchase directly to your account balance.
              </div>
            </div>
          </div>

          <form onSubmit={handlePublishSubmit} style={styles.publishForm}>
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Trend Pack Title</label>
              <input
                type="text"
                value={packTitle}
                onChange={(e) => setPackTitle(e.target.value)}
                placeholder="e.g. CS2 Global Market 21-Day History"
                style={styles.textInput}
                maxLength={60}
                required
              />
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroupHalf}>
                <label style={styles.formLabel}>Retention Window</label>
                <div style={styles.daysSelector}>
                  {[7, 14, 21, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      style={{
                        ...styles.dayChoiceBtn,
                        ...(selectedDays === d ? styles.dayChoiceActive : {}),
                      }}
                      onClick={() => setSelectedDays(d)}
                    >
                      {d} Days
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.formGroupHalf}>
                <label style={styles.formLabel}>
                  Local SQLite Ready to Export
                </label>
                <div style={styles.localStatsBox}>
                  {localTrendStats ? (
                    <span>
                      {localTrendStats.daysCount} days •{" "}
                      {localTrendStats.itemCoverage.toLocaleString()} skins •{" "}
                      {localTrendStats.totalSnapshots.toLocaleString()} points
                    </span>
                  ) : (
                    <span>No local SQLite data</span>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.feeNoticeBox}>
              <AlertCircle size={15} style={styles.feeNoticeIcon} />
              <div style={styles.feeNoticeText}>
                <strong>First-Time Listing Fee: $2.50 USD.</strong>{" "}
                Charged once to publish a new dataset and prevent duplicate spam.
                Future daily updates under Continuity Delta Lock are{" "}
                <strong>100% Free</strong>.
              </div>
            </div>

            <div style={styles.publishActions}>
              <button
                type="submit"
                style={styles.publishSubmitBtn}
                disabled={
                  isPublishing || !hasLocalData || !packTitle.trim() || isHeld
                }
              >
                {isPublishing ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    Packaging &amp; Uploading…
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    Publish Trend Pack ($2.50)
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ── EXTRACTED STYLES ────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  overviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
  },
  overviewCard: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "8px",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  overviewIconContainer: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dollarIcon: {
    color: "#4ade80",
  },
  usersIcon: {
    color: "var(--so-cyan-text, #38bdf8)",
  },
  dbIcon: {
    color: "#c084fc",
  },
  overviewLabel: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  overviewValue: {
    fontSize: "16px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
    fontFamily: "monospace",
  },
  overviewSub: {
    fontSize: "10px",
    color: "var(--so-text-secondary)",
  },
  loadingBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    padding: "36px",
    color: "var(--so-text-secondary)",
    fontSize: "13px",
  },
  activePackCard: {
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium, rgba(255, 255, 255, 0.15))",
    borderRadius: "8px",
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  activeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  activeTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  activeTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
  },
  versionTag: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
    fontFamily: "monospace",
  },
  activeSub: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
    marginTop: "2px",
  },
  activeHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  refreshBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 10px",
    fontSize: "11px",
    backgroundColor: "transparent",
    border: "1px solid var(--so-border-subtle)",
    color: "var(--so-text-secondary)",
    borderRadius: "4px",
    cursor: "pointer",
  },
  activeMetricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "10px",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    padding: "12px 14px",
    borderRadius: "6px",
    border: "1px solid rgba(255, 255, 255, 0.04)",
  },
  activeMetricItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  metricIcon: {
    color: "var(--so-text-secondary)",
  },
  metricIconCyan: {
    color: "var(--so-cyan-text, #38bdf8)",
  },
  metricIconPurple: {
    color: "#c084fc",
  },
  metricIconGreen: {
    color: "#4ade80",
  },
  activeMetricValue: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--so-text-primary)",
  },
  activeMetricLabel: {
    fontSize: "10px",
    color: "var(--so-text-muted)",
  },
  activeNotice: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "11px",
    color: "var(--so-text-secondary)",
    backgroundColor: "rgba(74, 222, 128, 0.08)",
    border: "1px solid rgba(74, 222, 128, 0.2)",
    padding: "8px 12px",
    borderRadius: "6px",
  },
  noticeIcon: {
    color: "#4ade80",
    flexShrink: 0,
  },
  activeActionsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "4px",
  },
  deleteBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 14px",
    fontSize: "11px",
    color: "var(--so-danger-text, #f87171)",
    backgroundColor: "transparent",
    border: "1px solid rgba(248, 113, 113, 0.3)",
    borderRadius: "5px",
    cursor: "pointer",
  },
  syncBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 18px",
    fontSize: "11px",
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "var(--so-primary, #2563eb)",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
  publishCard: {
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "8px",
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  publishHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  uploadIcon: {
    color: "var(--so-cyan-text, #38bdf8)",
  },
  publishTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
  },
  publishSub: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  publishForm: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  formRow: {
    display: "flex",
    gap: "12px",
  },
  formGroupHalf: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  formLabel: {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--so-text-secondary)",
  },
  textInput: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "5px",
    padding: "8px 12px",
    fontSize: "12px",
    color: "var(--so-text-primary)",
    outline: "none",
  },
  daysSelector: {
    display: "flex",
    gap: "6px",
  },
  dayChoiceBtn: {
    flex: 1,
    padding: "7px 0",
    fontSize: "11px",
    color: "var(--so-text-secondary)",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "4px",
    cursor: "pointer",
  },
  dayChoiceActive: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderColor: "var(--so-cyan-text, #38bdf8)",
    color: "var(--so-cyan-text, #38bdf8)",
    fontWeight: 600,
  },
  localStatsBox: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "5px",
    padding: "8px 12px",
    fontSize: "11px",
    color: "var(--so-text-muted)",
    display: "flex",
    alignItems: "center",
  },
  feeNoticeBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    border: "1px solid rgba(251, 191, 36, 0.25)",
    padding: "10px 12px",
    borderRadius: "6px",
  },
  feeNoticeIcon: {
    color: "#fbbf24",
    flexShrink: 0,
    marginTop: "2px",
  },
  feeNoticeText: {
    fontSize: "11px",
    color: "var(--so-text-secondary)",
    lineHeight: "1.4",
  },
  publishActions: {
    display: "flex",
    justifyContent: "flex-end",
  },
  publishSubmitBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 20px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "var(--so-primary, #2563eb)",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};
