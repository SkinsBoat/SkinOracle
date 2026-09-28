import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Globe,
  Store,
  UploadCloud,
  RotateCw,
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Database,
  Layers,
  Calendar,
  CheckCircle2,
  Coins,
} from "lucide-react";
import { confirmModal } from "../../store/useConfirmStore";
import {
  TrendMarketListing,
  TrendMarketMyListingResponse,
} from "../../../shared/types/electron-api.types";
import {
  isRequestHeldError,
  isStorageUnavailableError,
  REQUEST_HOLD_MESSAGE,
  STORAGE_UNAVAILABLE_MESSAGE,
} from "../../../shared/utils/apiErrors";
import { TrendPackCard } from "./components/TrendPackCard";
import { InteractiveSkinTesterModal } from "./components/InteractiveSkinTesterModal";
import { SellerDashboardTab } from "./components/SellerDashboardTab";

type SortOption = "popular" | "recent" | "days" | "coverage" | "quality";

export const TrendMarketScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"browse" | "seller">("browse");
  const [listings, setListings] = useState<TrendMarketListing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalListings, setTotalListings] = useState(0);

  // Local Trend Storage Health
  const [localTrendStats, setLocalTrendStats] = useState<{
    daysCount: number;
    totalSnapshots: number;
    itemCoverage: number;
    latestDate: string | null;
    oldestDate: string | null;
  } | null>(null);
  const [isLoadingLocalStats, setIsLoadingLocalStats] = useState(false);

  // Preview Modal State
  const [previewPack, setPreviewPack] = useState<TrendMarketListing | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Purchasing State
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  // Transient marketplace hold: server restart hold, maintenance, or storage outage.
  const [holdReason, setHoldReason] = useState<
    "restart" | "storage" | null
  >(null);

  // Seller Dashboard State
  const [myListing, setMyListing] =
    useState<TrendMarketMyListingResponse | null>(null);
  const [isLoadingSeller, setIsLoadingSeller] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  /**
   * Centralized error handler. When the backend is in a maintenance window, an
   * engine restart hold, or has a storage outage, surface a friendly "paused"
   * message and disable marketplace actions instead of leaking raw errors.
   * Returns true when the request was intentionally held.
   */
  const handleMarketplaceError = useCallback((err: any): boolean => {
    if (isStorageUnavailableError(err)) {
      setHoldReason("storage");
      toast.error(STORAGE_UNAVAILABLE_MESSAGE, {
        duration: 8000,
        icon: "🛡️",
      });
      return true;
    }
    if (isRequestHeldError(err)) {
      setHoldReason("restart");
      toast.error(`⏳ ${REQUEST_HOLD_MESSAGE}`, {
        duration: 8000,
        icon: "🛡️",
      });
      return true;
    }
    return false;
  }, []);

  // Fetch local SQLite stats
  const fetchLocalStats = useCallback(async () => {
    if (!window.electronAPI?.trendStore?.getStats) return;
    try {
      setIsLoadingLocalStats(true);
      const stats = await window.electronAPI.trendStore.getStats();
      setLocalTrendStats(stats);
    } catch (err) {
      console.warn("Failed to fetch local SQLite stats:", err);
    } finally {
      setIsLoadingLocalStats(false);
    }
  }, []);

  // Fetch Marketplace Listings
  const fetchListings = useCallback(async () => {
    if (!window.electronAPI?.trendMarket?.getListings) return;
    try {
      setIsLoadingListings(true);
      const res = await window.electronAPI.trendMarket.getListings({
        page,
        limit: 12,
        sort: sortBy,
        search: searchQuery.trim() || undefined,
      });
      setListings(res.listings || []);
      setTotalPages(res.totalPages || 1);
      setTotalListings(res.total || 0);
      setHoldReason(null);
    } catch (err: any) {
      if (isStorageUnavailableError(err)) {
        setHoldReason("storage");
      } else if (isRequestHeldError(err)) {
        setHoldReason("restart");
      }
      console.warn(
        "Failed to fetch trend marketplace listings:",
        err?.message || err,
      );
    } finally {
      setIsLoadingListings(false);
    }
  }, [page, sortBy, searchQuery]);

  // Fetch Seller's Own Listing & Earnings
  const fetchMyListing = useCallback(async () => {
    if (!window.electronAPI?.trendMarket?.getMyListing) return;
    try {
      setIsLoadingSeller(true);
      const res = await window.electronAPI.trendMarket.getMyListing();
      setMyListing(res);
    } catch (err) {
      console.warn(
        "Failed to fetch seller listing info:",
        (err as any)?.message || err,
      );
    } finally {
      setIsLoadingSeller(false);
    }
  }, []);

  useEffect(() => {
    // Local SQLite stats are independent of listing pagination/sort/search.
    fetchLocalStats();
    // Load the seller's own listing so the grid can label self-sync entries.
    fetchMyListing();
  }, [fetchLocalStats, fetchMyListing]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    if (activeTab === "seller") {
      fetchMyListing();
    }
  }, [activeTab, fetchMyListing]);

  // Handle Preview
  const handleOpenPreview = useCallback((pack: TrendMarketListing) => {
    setPreviewPack(pack);
    setIsPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => setIsPreviewOpen(false), []);

  /**
   * Applies a soft "marketplace paused" result returned by the IPC layer
   * (storage outage, maintenance window, or engine restart hold).
   */
  const applyHeldResult = useCallback(
    (res: { code: string; message: string }) => {
      if (res.code === "STORAGE_UNAVAILABLE") {
        setHoldReason("storage");
      } else {
        setHoldReason("restart");
      }
      toast.error(res.message, { duration: 8000, icon: "🛡️" });
    },
    [],
  );

  // Handle Purchase
  const handlePurchasePack = useCallback(
    async (pack: TrendMarketListing) => {
      if (!window.electronAPI?.trendMarket?.purchasePack) return;

      const isOwnPack = myListing?.listing?.id === pack.id;

      const confirmed = await confirmModal({
        title: isOwnPack
          ? "Sync Your Own Trend Pack?"
          : "Purchase Verified Trend Pack?",
        message: isOwnPack
          ? `Sync "${pack.title}" (${pack.daysCount}d window, ${pack.itemCoverage.toLocaleString()} skins) to this device for $1.00 USD?\n\nThis is your own listing — no sale occurs, your sales counter and earnings are unchanged. Existing local snapshots are preserved and merge atomically via INSERT OR IGNORE.`
          : `Purchase "${pack.title}" (${pack.daysCount}d window, ${pack.itemCoverage.toLocaleString()} skins) for $5.00 USD?\n\nExisting local snapshots are preserved; imported points will merge atomically via INSERT OR IGNORE.`,
        confirmText: isOwnPack
          ? "Sync to Device ($1.00)"
          : "Confirm & Ingest ($5.00)",
        cancelText: "Cancel",
        variant: "primary",
      });

      if (!confirmed) return;

      try {
        setPurchasingId(pack.id);
        const res = await window.electronAPI.trendMarket.purchasePack(pack.id);

        if (res.success === false) {
          applyHeldResult(res);
          return;
        }

        if (res.selfSync) {
          toast.success(
            `Your pack "${pack.title}" synced to this device! Added ${res.mergeResult.insertedRows} snapshot rows (${res.mergeResult.daysAdded} new days).`,
          );
        } else {
          toast.success(
            `Pack "${pack.title}" ingested! Added ${res.mergeResult.insertedRows} snapshot rows (${res.mergeResult.daysAdded} new days).`,
          );
        }

        setIsPreviewOpen(false);
        await fetchLocalStats();
        await fetchListings();
      } catch (err: any) {
        if (!handleMarketplaceError(err)) {
          toast.error(err.message || "Failed to purchase and merge trend pack");
        }
      } finally {
        setPurchasingId(null);
      }
    },
    [
      applyHeldResult,
      fetchLocalStats,
      fetchListings,
      handleMarketplaceError,
      myListing,
    ],
  );

  // Handle Publish / Free Daily Sync
  const handlePublishOrUpdate = async (title: string, days: number) => {
    if (!window.electronAPI?.trendMarket?.uploadPack) return;

    // Client-side pre-check: never upload a payload the server will reject.
    // An update must add a day newer than the active listing (server enforces this
    // too; this only avoids a doomed round-trip and explains why).
    const activeListing = myListing?.listing;
    if (
      activeListing &&
      localTrendStats?.latestDate &&
      localTrendStats.latestDate <= activeListing.latestDate
    ) {
      toast.error(
        `No newer completed day to publish yet — your listing already includes data through ${activeListing.latestDate}. Scan a new day first.`,
      );
      return;
    }

    try {
      setIsPublishing(true);
      const res = await window.electronAPI.trendMarket.uploadPack({
        title,
        days,
      });

      if (res.success === false) {
        applyHeldResult(res);
        return;
      }

      if (res.isFreeUpdate) {
        toast.success(
          `Daily update successfully pushed to marketplace! Free update applied via Continuity Delta Lock.`,
        );
      } else {
        toast.success(
          `Dataset "${title}" published to marketplace! Listing fee: $2.50 USD.`,
        );
      }

      await fetchMyListing();
      await fetchListings();
      await fetchLocalStats();
    } catch (err: any) {
      if (!handleMarketplaceError(err)) {
        toast.error(err.message || "Failed to publish dataset to marketplace");
      }
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle Delete Listing
  const handleDeleteListing = async () => {
    if (!window.electronAPI?.trendMarket?.deleteListing) return;

    const confirmed = await confirmModal({
      title: "Delete Marketplace Listing?",
      message:
        "Are you sure you want to remove your trend pack from the public marketplace? Existing buyers will retain their data, but new traders will no longer be able to purchase it.",
      confirmText: "Delete Listing",
      cancelText: "Cancel",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const res = await window.electronAPI.trendMarket.deleteListing();
      if (res.success === false) {
        applyHeldResult(res);
        return;
      }
      toast.success("Listing removed from community marketplace.");
      await fetchMyListing();
      await fetchListings();
    } catch (err: any) {
      if (!handleMarketplaceError(err)) {
        toast.error(err.message || "Failed to delete listing");
      }
    }
  };

  const isColdStart = !localTrendStats || localTrendStats.daysCount < 3;

  return (
    <div style={styles.screenContainer}>
      {/* ── Screen Header ── */}
      <div style={styles.screenHeader}>
        <div style={styles.headerLeft}>
          <div style={styles.titleRow}>
            <Globe size={22} style={styles.globeIcon} />
            <h1 style={styles.screenTitle}>
              Community Trend History Marketplace
            </h1>
            <span style={styles.fixedPriceBadge}>
              <Coins size={12} /> $5.00 USD
            </span>
          </div>
          <p style={styles.screenSubtitle}>
            Browse, test, and ingest verified multi-week trend datasets from the trader community to immediately power Nexus Pro Capital Shield without waiting 3&ndash;7 days of manual scanning.
          </p>
        </div>

        {/* Global Architecture Rules Pills */}
        <div style={styles.headerPills}>
          <div style={styles.headerPill}>
            <span style={styles.pillLabel}>Seller Split:</span>
            <span style={styles.pillValue}>80% ($4.00 USD)</span>
          </div>
          <div style={styles.headerPill}>
            <span style={styles.pillLabel}>Upload Fee:</span>
            <span style={styles.pillValue}>$2.50 USD</span>
          </div>
          <div style={styles.headerPill}>
            <span style={styles.pillLabel}>Daily Updates:</span>
            <span style={styles.pillValueGreen}>100% Free</span>
          </div>
        </div>
      </div>

      {/* ── Local SQLite Storage Status Banner ── */}
      <div style={styles.localStatusBanner}>
        <div style={styles.localStatusLeft}>
          <Database size={18} style={styles.dbIcon} />
          <div>
            <div style={styles.localStatusTitle}>
              Your Local SQLite Trend Intelligence:
            </div>
            <div style={styles.localStatusDetail}>
              {localTrendStats ? (
                <span>
                  <strong>{localTrendStats.daysCount} Days</strong> of history (
                  {localTrendStats.itemCoverage.toLocaleString()} unique skins,{" "}
                  {localTrendStats.totalSnapshots.toLocaleString()} snapshots)
                  {localTrendStats.latestDate && (
                    <span>
                      {" "}• Latest: <strong>{localTrendStats.latestDate}</strong>
                    </span>
                  )}
                </span>
              ) : (
                <span>Connecting to local database…</span>
              )}
            </div>
          </div>
        </div>

        <div style={styles.localStatusRight}>
          {isColdStart ? (
            <div style={styles.coldStartWarningPill}>
              <AlertTriangle size={13} style={styles.alertIcon} />
              <span>Nexus Pro Locked (&lt;3d)</span>
            </div>
          ) : (
            <div style={styles.activeReadyPill}>
              <CheckCircle2 size={13} style={styles.readyIcon} />
              <span>Nexus Pro Active ({localTrendStats?.daysCount}d)</span>
            </div>
          )}

          <button
            type="button"
            style={styles.refreshLocalBtn}
            onClick={fetchLocalStats}
            disabled={isLoadingLocalStats}
            title="Refresh local storage stats"
          >
            <RotateCw
              size={12}
              className={isLoadingLocalStats ? "spin" : ""}
            />
          </button>
        </div>
      </div>

      {/* Marketplace Hold Advisory (restart hold, maintenance, or storage outage) */}
      {holdReason && (
        <div style={styles.holdNoticeBox}>
          <ShieldCheck size={16} style={styles.holdIcon} />
          <div>
            <div style={styles.holdHeading}>
              {holdReason === "storage"
                ? "Marketplace Temporarily Unavailable"
                : "Marketplace Temporarily Paused — Server Preparing for Restart"}
            </div>
            <div style={styles.holdBody}>
              {holdReason === "storage"
                ? "Buying and publishing are paused while marketplace storage is being restored. Browsing and your local SQLite history are unaffected. Please try again shortly."
                : "To protect against partially applied purchases or uploads, all marketplace actions are held while the valuation engine restarts. Your local SQLite history and balance are untouched. Please retry in a few seconds."}
            </div>
          </div>
        </div>
      )}

      {/* Cold-Start Advisory */}
      {isColdStart && (
        <div style={styles.coldStartNoticeBox}>
          <AlertTriangle size={16} style={styles.coldStartIcon} />
          <div>
            <div style={styles.coldStartHeading}>
              Cold-Start Detected: Unlock Nexus Pro Instantly
            </div>
            <div style={styles.coldStartBody}>
              Nexus Pro Capital Shield requires at least 3 days of trend history to compute safe buy ceilings. Purchasing any community pack below atomically merges multi-week data into your local SQLite store without overwriting your own scans.
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Switcher ── */}
      <div style={styles.tabBar}>
        <button
          type="button"
          style={{
            ...styles.tabBtn,
            ...(activeTab === "browse" ? styles.tabBtnActive : {}),
          }}
          onClick={() => setActiveTab("browse")}
        >
          <Store size={15} />
          Browse Community Packs ({totalListings})
        </button>

        <button
          type="button"
          style={{
            ...styles.tabBtn,
            ...(activeTab === "seller" ? styles.tabBtnActive : {}),
          }}
          onClick={() => setActiveTab("seller")}
        >
          <UploadCloud size={15} />
          My Seller Account
          {Boolean(myListing?.listing) && <span style={styles.sellerDot} />}
        </button>
      </div>

      {/* ── Tab 1: Browse Packs ── */}
      {activeTab === "browse" && (
        <div style={styles.browseSection}>
          {/* Controls Bar */}
          <div style={styles.controlsBar}>
            <div style={styles.searchBox}>
              <Search size={14} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search datasets by title or creator…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                style={styles.searchInput}
              />
            </div>

            <div style={styles.sortBox}>
              <Filter size={13} style={styles.filterIcon} />
              <span style={styles.sortLabel}>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as SortOption);
                  setPage(1);
                }}
                style={styles.sortSelect}
              >
                <option value="popular">Most Popular (Sales)</option>
                <option value="recent">Recently Updated</option>
                <option value="days">Longest Window (Days)</option>
                <option value="coverage">Highest Skin Coverage</option>
                <option value="quality">Data Quality Score</option>
              </select>

              <button
                type="button"
                style={styles.refreshBtn}
                onClick={fetchListings}
                disabled={isLoadingListings}
                title="Refresh listings"
              >
                <RotateCw
                  size={12}
                  className={isLoadingListings ? "spin" : ""}
                />
              </button>
            </div>
          </div>

          {/* Listings Grid */}
          {isLoadingListings ? (
            <div style={styles.loadingBox}>
              <Loader2 size={26} className="spin" />
              <span>Fetching verified trend datasets…</span>
            </div>
          ) : listings.length > 0 ? (
            <div style={styles.grid}>
              {listings.map((pack) => (
                <TrendPackCard
                  key={pack.id}
                  pack={pack}
                  onPreview={handleOpenPreview}
                  onPurchase={handlePurchasePack}
                  isPurchasing={purchasingId === pack.id}
                  isHeld={holdReason !== null}
                  isOwn={myListing?.listing?.id === pack.id}
                />
              ))}
            </div>
          ) : (
            <div style={styles.emptyBox}>
              <Store size={36} style={styles.emptyIcon} />
              <div style={styles.emptyTitle}>No Trend Datasets Found</div>
              <div style={styles.emptyDesc}>
                {searchQuery
                  ? `No datasets match "${searchQuery}". Try a different keyword.`
                  : "No community datasets are currently listed. Be the first to monetize your price scans in the 'My Seller Account' tab!"}
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.paginationRow}>
              <button
                type="button"
                style={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={styles.pageText}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                style={styles.pageBtn}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Seller Dashboard ── */}
      {activeTab === "seller" && (
        <SellerDashboardTab
          myListing={myListing}
          isLoading={isLoadingSeller}
          onRefresh={fetchMyListing}
          onPublishOrUpdate={handlePublishOrUpdate}
          onDeleteListing={handleDeleteListing}
          localTrendStats={localTrendStats}
          isPublishing={isPublishing}
          isHeld={holdReason !== null}
        />
      )}

      {/* ── Interactive Skin Preview Drawer Modal ── */}
      <InteractiveSkinTesterModal
        isOpen={isPreviewOpen}
        onClose={closePreview}
        pack={previewPack}
        onPurchase={handlePurchasePack}
        isPurchasing={purchasingId === previewPack?.id}
        isOwn={myListing?.listing?.id === previewPack?.id}
      />
    </div>
  );
};

// ── EXTRACTED STYLES ────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  screenContainer: {
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    maxWidth: "1400px",
    margin: "0 auto",
    width: "100%",
  },
  screenHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    flexWrap: "wrap",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    flex: 1,
    minWidth: "320px",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  globeIcon: {
    color: "var(--so-cyan-text, #38bdf8)",
  },
  screenTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
    margin: 0,
  },
  fixedPriceBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--so-cyan-text, #38bdf8)",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    padding: "3px 10px",
    borderRadius: "6px",
  },
  screenSubtitle: {
    fontSize: "12px",
    color: "var(--so-text-secondary)",
    margin: 0,
    maxWidth: "760px",
    lineHeight: "1.5",
  },
  headerPills: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  headerPill: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "6px",
    padding: "6px 10px",
    fontSize: "11px",
  },
  pillLabel: {
    color: "var(--so-text-muted)",
  },
  pillValue: {
    fontWeight: 600,
    color: "var(--so-text-primary)",
  },
  pillValueGreen: {
    fontWeight: 600,
    color: "#4ade80",
  },
  localStatusBanner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "8px",
    padding: "12px 18px",
    gap: "14px",
    flexWrap: "wrap",
  },
  localStatusLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  dbIcon: {
    color: "#c084fc",
  },
  localStatusTitle: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  localStatusDetail: {
    fontSize: "12px",
    color: "var(--so-text-primary)",
    marginTop: "1px",
  },
  localStatusRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  coldStartWarningPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11px",
    color: "#fbbf24",
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    border: "1px solid rgba(251, 191, 36, 0.3)",
    padding: "3px 8px",
    borderRadius: "4px",
    fontWeight: 600,
  },
  activeReadyPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "11px",
    color: "#4ade80",
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    border: "1px solid rgba(74, 222, 128, 0.25)",
    padding: "3px 8px",
    borderRadius: "4px",
    fontWeight: 600,
  },
  alertIcon: {
    color: "#fbbf24",
  },
  readyIcon: {
    color: "#4ade80",
  },
  refreshLocalBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    backgroundColor: "transparent",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "4px",
    color: "var(--so-text-secondary)",
    cursor: "pointer",
  },
  coldStartNoticeBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    border: "1px solid rgba(245, 158, 11, 0.28)",
    borderRadius: "8px",
    padding: "12px 16px",
  },
  coldStartIcon: {
    color: "#f59e0b",
    flexShrink: 0,
    marginTop: "2px",
  },
  coldStartHeading: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#fbbf24",
  },
  coldStartBody: {
    fontSize: "11px",
    color: "var(--so-text-secondary)",
    marginTop: "2px",
    lineHeight: "1.4",
  },
  holdNoticeBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    border: "1px solid rgba(56, 189, 248, 0.28)",
    borderRadius: "8px",
    padding: "12px 16px",
  },
  holdIcon: {
    color: "var(--so-cyan-text, #38bdf8)",
    flexShrink: 0,
    marginTop: "2px",
  },
  holdHeading: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--so-cyan-text, #38bdf8)",
  },
  holdBody: {
    fontSize: "11px",
    color: "var(--so-text-secondary)",
    marginTop: "2px",
    lineHeight: "1.4",
  },
  tabBar: {
    display: "flex",
    gap: "8px",
    borderBottom: "1px solid var(--so-border-subtle)",
    paddingBottom: "4px",
  },
  tabBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: 500,
    color: "var(--so-text-secondary)",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    borderRadius: "4px 4px 0 0",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  tabBtnActive: {
    color: "var(--so-cyan-text, #38bdf8)",
    borderBottomColor: "var(--so-cyan-text, #38bdf8)",
    fontWeight: 600,
  },
  sellerDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#4ade80",
  },
  browseSection: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  controlsBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  searchBox: {
    flex: 1,
    minWidth: "220px",
    maxWidth: "380px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "6px",
    padding: "7px 12px",
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
  sortBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  filterIcon: {
    color: "var(--so-text-muted)",
  },
  sortLabel: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  sortSelect: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "4px",
    padding: "6px 10px",
    fontSize: "11px",
    color: "var(--so-text-primary)",
    outline: "none",
    cursor: "pointer",
  },
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "30px",
    height: "30px",
    backgroundColor: "transparent",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "4px",
    color: "var(--so-text-secondary)",
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
    gap: "14px",
  },
  loadingBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "60px 20px",
    color: "var(--so-text-secondary)",
    fontSize: "13px",
  },
  emptyBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    border: "1px dashed var(--so-border-subtle)",
    borderRadius: "8px",
    gap: "10px",
    textAlign: "center",
  },
  emptyIcon: {
    color: "var(--so-text-muted)",
  },
  emptyTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--so-text-primary)",
  },
  emptyDesc: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
    maxWidth: "460px",
    lineHeight: "1.4",
  },
  paginationRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginTop: "10px",
  },
  pageBtn: {
    padding: "6px 14px",
    fontSize: "11px",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    border: "1px solid var(--so-border-subtle)",
    color: "var(--so-text-secondary)",
    borderRadius: "4px",
    cursor: "pointer",
  },
  pageText: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
    fontFamily: "monospace",
  },
};
