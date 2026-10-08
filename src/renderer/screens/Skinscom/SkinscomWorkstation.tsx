import React, { useEffect, useState } from "react";
import {
  Activity,
  KeyRound,
  Loader2,
  Package,
  RefreshCw,
  ScanLine,
} from "lucide-react";
import { Link } from "react-router-dom";
import { skinsLogo } from "../../../../assets/images";
import type { SkinscomSocketUser } from "../../../shared/types/skinscom.types";
import { useAcceptedPrices } from "../../hooks/useAcceptedPrices";
import { useListingPrices } from "../../hooks/useListingPrices";
import { FEATURE_FLAGS } from "../../../shared/featureFlags";
import { WorkstationOracleAction } from "../../components/WorkstationOracleAction";
import { formatUsdFromCents } from "./utils/skinscomUtils";
import { SkinscomMarketScanTab } from "./tabs/MarketScanTab";
import { SkinscomEventStreamTab } from "./tabs/EventStreamTab";
import { SkinscomListingsTab } from "./tabs/ListingsTab";

// ─────────────────────────────────────────────────────────────────
// Skins.com Workstation
//
// Clean-room implementation of the Skins.com Trading API.
// Reference: src/renderer/screens/Skinscom/SKINSCOM_TRADING_API.md
// (vendored spec: skinscomtradingopenapi.json)
//
// Soft start: the Marketplace tab is live against the real API.
// GET /trading/items returns the PUBLIC marketplace feed (items listed
// for sale by any depositor), so this tab is a read-only scan that
// matches live listing prices against the Oracle Buy Ceilings
// (accepted prices) — the unified WorkstationOracleAction drives the
// match, exactly like the CSFloat/DMarket workstations.
// ─────────────────────────────────────────────────────────────────

type SkinscomTab = "marketScan" | "events" | "listings";

// Listings & Inventory is hidden in production (see FEATURE_FLAGS.SKINSCOM_LISTINGS)
// but always available in development.
const SHOW_LISTINGS =
  import.meta.env.DEV || FEATURE_FLAGS.SKINSCOM_LISTINGS;

export default function SkinscomWorkstation() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<SkinscomTab>("marketScan");
  const [user, setUser] = useState<SkinscomSocketUser | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [eventStats, setEventStats] = useState({ streaming: false, events: 0 });
  const [inventoryStats, setInventoryStats] = useState({
    total: 0,
    depositable: 0,
  });

  // Oracle Buy Ceilings (accepted prices) — Market Scan tab.
  const {
    acceptedPriceMap,
    acceptedPricesMeta,
    loadingPrices,
    loadAcceptedPrices,
  } = useAcceptedPrices();

  // Oracle Sell Targets (listing prices) — Listings & Inventory tab.
  const {
    listingPriceMap,
    listingPricesMeta,
    loadingPrices: loadingListingPrices,
    loadListingPrices,
  } = useListingPrices();

  const checkApiKey = async (): Promise<boolean> => {
    const status = await window.electronAPI.settings.getKeysStatus();
    setHasKey(status.hasSkinscomToken);
    return status.hasSkinscomToken;
  };

  const fetchAccount = async () => {
    setBalanceLoading(true);
    try {
      const meta = await window.electronAPI.skinscom.getMetadata();
      setUser(meta?.user ?? null);
    } catch (err: any) {
      console.warn("[Skins.com Workstation] Metadata error:", err.message);
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleLoadOracle = async () => {
    // Reload Buy Ceilings from local memory and rematch active listings. The
    // tab renders only listings within Max Distance of a ceiling.
    await loadAcceptedPrices(false);
  };

  const handleLoadListingPrices = async () => {
    // Reload Oracle Sell Targets (listing prices) for the Listings tab.
    await loadListingPrices(false);
  };

  useEffect(() => {
    // Populate Oracle Buy Ceilings from local memory (silent, no network).
    loadAcceptedPrices(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    checkApiKey().then((ok) => {
      if (ok) fetchAccount();
    });
  }, []);

  // Close the live feed when leaving the workstation so the socket does not
  // linger in the main process.
  useEffect(() => {
    return () => {
      window.electronAPI?.skinscom?.stopStream?.().catch(() => {});
    };
  }, []);

  return (
    <div style={styles.container}>
      {/* API Key Missing Warning Banner */}
      {hasKey === false && (
        <div style={styles.warningBanner}>
          <div style={styles.warningContent}>
            <KeyRound size={16} style={styles.warningIcon} /> Skins.com API key
            is not configured. Add your key (Profile &gt; Developers) in
            Settings.
          </div>
          <Link
            to="/settings"
            className="btn btn-secondary btn-sm"
            style={styles.warningLink}
          >
            Go to Settings
          </Link>
        </div>
      )}

      {/* Header Bar */}
      <div style={styles.headerBar}>
        <div style={styles.brandSection}>
          <div style={styles.brandTitleWrapper}>
            <img src={skinsLogo} alt="Skins.com" style={styles.logo} />
            <span style={styles.brandTitle}>Skins.com Workstation</span>
          </div>
          <span style={styles.brandSubtitle}>
            Direct device-to-marketplace trading · Trading API
          </span>
        </div>

        <div style={styles.headerRight}>
          {activeTab !== "listings" ? (
            <>
              <div style={styles.statBox}>
                <span style={styles.statLabel}>
                  {activeTab === "events" ? "EVENT FEED" : "MARKET ITEMS"}
                </span>
                <span className="tabular-nums" style={styles.statValue}>
                  {activeTab === "events" ? eventStats.events : scannedCount}
                </span>
              </div>
              <div style={styles.statBox}>
                <span style={styles.statLabel}>BUY CEILINGS</span>
                <span className="tabular-nums" style={styles.statValue}>
                  {acceptedPricesMeta?.itemCount.toLocaleString() ?? 0}
                </span>
              </div>
            </>
          ) : (
            <>
              <div style={styles.statBox}>
                <span style={styles.statLabel}>INVENTORY</span>
                <span className="tabular-nums" style={styles.statValue}>
                  {inventoryStats.total}
                </span>
              </div>
              <div style={styles.statBox}>
                <span style={styles.statLabel}>LISTABLE</span>
                <span className="tabular-nums" style={styles.statValue}>
                  {inventoryStats.depositable}
                </span>
              </div>
            </>
          )}

          <div style={styles.balanceWidget}>
            {user?.avatar && (
              <img src={user.avatar} alt="avatar" style={styles.avatar} />
            )}
            <div style={styles.balanceTextWrapper}>
              <div style={styles.balanceLabel}>
                {user?.username || user?.steam_name || "Skins.com Balance"}
              </div>
              <div className="tabular-nums" style={styles.balanceValue}>
                {user ? formatUsdFromCents(user.balance) : "$--.--"}
              </div>
            </div>
            <button
              onClick={() => {
                if (hasKey) fetchAccount();
                else checkApiKey();
              }}
              disabled={balanceLoading}
              className="btn btn-secondary btn-sm"
              style={styles.refreshBtn}
              title="Refresh account"
            >
              {balanceLoading ? (
                <Loader2 size={12} className="spin" />
              ) : (
                <RefreshCw size={12} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Workstation Sub-Tabs & Unified Oracle Action */}
      <div style={styles.tabsNav}>
        <div style={styles.tabsLeftGroup}>
          <button
            onClick={() => setActiveTab("marketScan")}
            className={`btn ${activeTab === "marketScan" ? "btn-primary" : "btn-outline"} btn-sm`}
            style={styles.tabButton}
          >
            <ScanLine size={13} /> Market Scan
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`btn ${activeTab === "events" ? "btn-primary" : "btn-outline"} btn-sm`}
            style={styles.tabButton}
          >
            <Activity size={13} /> Events
            {eventStats.streaming && <span style={styles.liveDot} />}
          </button>
          {SHOW_LISTINGS && (
            <button
              onClick={() => setActiveTab("listings")}
              className={`btn ${activeTab === "listings" ? "btn-primary" : "btn-outline"} btn-sm`}
              style={styles.tabButton}
            >
              <Package size={13} /> Listings &amp; Inventory
            </button>
          )}
        </div>
        <div style={styles.tabsRightGroup}>
          {activeTab === "listings" ? (
            <WorkstationOracleAction
              meta={listingPricesMeta}
              datasetKind="listing"
              loading={loadingListingPrices}
              onLoad={handleLoadListingPrices}
            />
          ) : (
            <WorkstationOracleAction
              meta={acceptedPricesMeta}
              datasetKind="accepted"
              loading={loadingPrices}
              onLoad={handleLoadOracle}
            />
          )}
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "marketScan" && (
        <SkinscomMarketScanTab
          hasKey={!!hasKey}
          balance={user ? user.balance / 100 : 0}
          onScanned={setScannedCount}
          acceptedPriceMap={acceptedPriceMap}
        />
      )}
      {activeTab === "events" && (
        <SkinscomEventStreamTab
          hasKey={!!hasKey}
          balance={user ? user.balance / 100 : 0}
          onStreamStats={setEventStats}
          acceptedPriceMap={acceptedPriceMap}
        />
      )}
      {SHOW_LISTINGS && activeTab === "listings" && (
        <SkinscomListingsTab
          hasKey={!!hasKey}
          listingPriceMap={listingPriceMap}
          onStats={setInventoryStats}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 48px)",
    gap: "10px",
    overflow: "hidden",
  },
  warningBanner: {
    backgroundColor: "var(--so-warning-bg)",
    border: "1px solid var(--so-warning-border)",
    color: "var(--so-warning-text)",
    padding: "10px 16px",
    borderRadius: "var(--so-radius-md)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: 700,
    fontSize: "12px",
    flexShrink: 0,
  },
  warningContent: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  warningIcon: {
    color: "var(--so-warning)",
  },
  warningLink: {
    textDecoration: "none",
    fontSize: "11px",
  },
  headerBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 16px",
    backgroundColor: "var(--so-surface-header)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    gap: "12px",
    minHeight: "74px",
    boxSizing: "border-box",
    flexShrink: 0,
  },
  brandSection: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  brandTitleWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logo: {
    height: 22,
    width: "auto",
    objectFit: "contain",
  },
  brandTitle: {
    color: "var(--so-text-primary)",
    fontWeight: 800,
    fontSize: "15px",
    letterSpacing: "-0.3px",
  },
  brandSubtitle: {
    fontSize: "10.5px",
    color: "var(--so-text-muted)",
    fontWeight: 600,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  statBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1px",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    padding: "5px 14px",
  },
  statLabel: {
    fontSize: "9px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "var(--so-text-muted)",
    fontWeight: 700,
  },
  statValue: {
    fontSize: "15px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
  },
  balanceWidget: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    padding: "5px 12px",
    borderRadius: "var(--so-radius-md)",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: "4px",
    border: "1px solid var(--so-border-subtle)",
  },
  balanceTextWrapper: {
    textAlign: "right",
  },
  balanceLabel: {
    fontSize: "9px",
    color: "var(--so-text-muted)",
    fontWeight: 700,
    textTransform: "uppercase",
  },
  balanceValue: {
    fontSize: "13.5px",
    fontWeight: 800,
    color: "#ffffff",
  },
  refreshBtn: {
    padding: "3px 6px",
  },
  tabsNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid var(--so-border-medium)",
    gap: "6px",
    paddingBottom: "2px",
    flexShrink: 0,
  },
  tabsLeftGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  tabsRightGroup: {
    display: "flex",
    alignItems: "center",
  },
  tabButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    padding: "5px 12px",
  },
  liveDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "var(--so-success)",
    marginLeft: "2px",
    boxShadow: "0 0 6px var(--so-success)",
  },
};
