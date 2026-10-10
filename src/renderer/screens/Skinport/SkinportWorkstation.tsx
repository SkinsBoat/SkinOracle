import React, { useEffect, useState } from "react";
import { Activity, BellOff, BellRing, ScanLine } from "lucide-react";
import { skinportLogo } from "../../../../assets/images";
import { useAcceptedPrices } from "../../hooks/useAcceptedPrices";
import { WorkstationOracleAction } from "../../components/WorkstationOracleAction";
import { WorkstationHeader } from "../../components/WorkstationHeader";
import { useNotificationStore } from "../../store/useNotificationStore";
import { MarketItemsTab } from "./tabs/MarketItemsTab";
import { EventFeedTab } from "./tabs/EventFeedTab";

// ─────────────────────────────────────────────────────────────────
// Skinport Workstation
//
// Public, read-only scanner for the Skinport marketplace:
//   • Market Items — GET /v1/items (USD, cached 5 min) matched against
//     the Oracle Buy Ceilings (accepted prices).
//   • Events — the live sale feed (socket.io + msgpack) for listed/sold
//     items, matched the same way.
// No API key is required; nothing is routed through our SaaS backend.
// ─────────────────────────────────────────────────────────────────

type SkinportTab = "marketItems" | "events";

export default function SkinportWorkstation() {
  const [activeTab, setActiveTab] = useState<SkinportTab>("marketItems");
  const [scannedCount, setScannedCount] = useState(0);
  const [eventStats, setEventStats] = useState({ streaming: false, events: 0 });

  const {
    acceptedPriceMap,
    acceptedPricesMeta,
    loadingPrices,
    loadAcceptedPrices,
  } = useAcceptedPrices();

  const notifyOnNewDeals = useNotificationStore((s) => s.notifyOnNewDeals);
  const setNotifyOnNewDeals = useNotificationStore(
    (s) => s.setNotifyOnNewDeals,
  );

  const handleLoadOracle = async () => {
    await loadAcceptedPrices(false);
  };

  useEffect(() => {
    loadAcceptedPrices(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      window.electronAPI?.skinport?.stopStream?.().catch(() => {});
    };
  }, []);

  return (
    <div style={styles.container}>
      <WorkstationHeader
        logo={skinportLogo}
        logoAlt="Skinport"
        title="Skinport Workstation"
        badge="Direct Device IPC"
        subtitle="Direct device-to-marketplace · Public market items & live sale feed"
        right={
          <>
            <div style={styles.statBox}>
              <span style={styles.statLabel}>
                {activeTab === "events" ? "EVENT FEED" : "MARKET ITEMS"}
              </span>
              <span className="tabular-nums" style={styles.statValue}>
                {activeTab === "events"
                  ? eventStats.events
                  : scannedCount.toLocaleString()}
              </span>
            </div>
            <div style={styles.statBox}>
              <span style={styles.statLabel}>BUY CEILINGS</span>
              <span className="tabular-nums" style={styles.statValue}>
                {acceptedPricesMeta?.itemCount.toLocaleString() ?? 0}
              </span>
            </div>
          </>
        }
      />

      <div style={styles.tabsNav}>
        <div style={styles.tabsLeftGroup}>
          <button
            onClick={() => setActiveTab("marketItems")}
            className={`btn ${activeTab === "marketItems" ? "btn-primary" : "btn-outline"} btn-sm`}
            style={styles.tabButton}
          >
            <ScanLine size={13} /> Market Items
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`btn ${activeTab === "events" ? "btn-primary" : "btn-outline"} btn-sm`}
            style={styles.tabButton}
          >
            <Activity size={13} /> Events
            {eventStats.streaming && <span style={styles.liveDot} />}
          </button>
        </div>
        <div style={styles.tabsRightGroup}>
          <button
            type="button"
            role="switch"
            aria-checked={notifyOnNewDeals}
            onClick={() => setNotifyOnNewDeals(!notifyOnNewDeals)}
            className={`btn ${notifyOnNewDeals ? "btn-primary" : "btn-outline"} btn-sm`}
            style={styles.alertToggle}
            title={
              notifyOnNewDeals
                ? "Deal alerts ON — you are alerted when a listing hits your Buy Ceiling"
                : "Deal alerts OFF — click to be alerted on target matches"
            }
          >
            {notifyOnNewDeals ? <BellRing size={13} /> : <BellOff size={13} />}
            {notifyOnNewDeals ? "Alerts On" : "Alerts Off"}
          </button>
          <WorkstationOracleAction
            meta={acceptedPricesMeta}
            datasetKind="accepted"
            loading={loadingPrices}
            onLoad={handleLoadOracle}
          />
        </div>
      </div>

      {activeTab === "marketItems" && (
        <MarketItemsTab
          onScanned={setScannedCount}
          acceptedPriceMap={acceptedPriceMap}
        />
      )}
      {activeTab === "events" && (
        <EventFeedTab
          onStreamStats={setEventStats}
          acceptedPriceMap={acceptedPriceMap}
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
    gap: "8px",
  },
  alertToggle: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: 800,
    padding: "5px 10px",
    whiteSpace: "nowrap",
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
