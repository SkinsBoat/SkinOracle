import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Cpu,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { APP_RELEASES_URL } from "../../../constants/brandUrls";
import { UpdateStatusState } from "../../../../shared/types";

export const SystemDiagnosticsSection: React.FC = () => {
  const [appVersion, setAppVersion] = useState<string>("0.1.22");
  const [dbPath, setDbPath] = useState<string>("");
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [updateState, setUpdateState] = useState<UpdateStatusState | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (window.electronAPI?.app?.getVersion) {
      window.electronAPI.app
        .getVersion()
        .then((v) => {
          if (v) setAppVersion(v);
        })
        .catch(() => {});
    }

    if (window.electronAPI?.trendStore?.getDbPath) {
      window.electronAPI.trendStore
        .getDbPath()
        .then((path) => {
          if (path) setDbPath(path);
        })
        .catch(() => {});
    }

    let isMounted = true;
    if (window.electronAPI?.updater?.onUpdateStatus) {
      const unsub = window.electronAPI.updater.onUpdateStatus((state) => {
        if (!isMounted) return;
        setUpdateState(state);
        if (state.status !== "checking") {
          setIsCheckingUpdate(false);
        }
      });
      return () => {
        isMounted = false;
        unsub();
      };
    }
  }, []);

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      if (window.electronAPI?.updater?.checkForUpdates) {
        const res = await window.electronAPI.updater.checkForUpdates();
        if (res?.message) {
          toast.success(res.message);
        }
      } else {
        toast("Updater is active in packaged builds.", { icon: "ℹ️" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to check for updates");
    } finally {
      setTimeout(() => setIsCheckingUpdate(false), 1200);
    }
  };

  const handleCopyDiagnostics = () => {
    const diagnostics = {
      product: "Skin Oracle",
      version: appVersion,
      brand: "A SkinsBoat Product",
      databasePath: dbPath || "analytics.sqlite",
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      platform: navigator.platform,
    };
    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    setCopied(true);
    toast.success("System diagnostics copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenReleases = () => {
    if (window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(APP_RELEASES_URL);
    } else {
      window.open(APP_RELEASES_URL, "_blank");
    }
  };

  return (
    <div style={styles.container}>
      {/* Section Header */}
      <div>
        <h2 style={styles.sectionHeading}>
          <Cpu size={22} style={{ color: "var(--so-primary)" }} />
          System Health & Environment Diagnostics
        </h2>
        <p style={styles.sectionSubtitle}>
          View technical specifications, copy system diagnostics for customer support, and inspect update channels.
        </p>
      </div>

      {/* Overview & Update Strip Card */}
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <div>
            <div style={styles.titleRow}>
              <span style={styles.cardTitle}>Application Runtime</span>
              <span style={styles.versionBadge}>v{appVersion}</span>
              <span style={styles.channelBadge}>Production Channel</span>
            </div>
            <p style={styles.cardDesc}>
              Electron desktop client with local SQLite WASM engine, hardware OS key store, and direct websocket marketplace streaming.
            </p>
          </div>

          <div style={styles.actionButtonGroup}>
            <button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={isCheckingUpdate}
              style={styles.primaryActionBtn}
            >
              <RefreshCw size={13} className={isCheckingUpdate ? "spin" : ""} />
              {isCheckingUpdate ? "Checking..." : "Check for Updates"}
            </button>

            <button
              type="button"
              onClick={handleCopyDiagnostics}
              style={styles.actionBtn}
              title="Copy JSON diagnostics to clipboard"
            >
              {copied ? <Check size={13} style={{ color: "#10b981" }} /> : <Copy size={13} />}
              {copied ? "Diagnostics Copied!" : "Copy Diagnostics"}
            </button>
          </div>
        </div>

        {/* Status Strip */}
        <div style={styles.statusStrip}>
          <div style={styles.statusLeft}>
            <span
              style={{
                ...styles.statusDot,
                backgroundColor: updateState?.status === "available" ? "#f59e0b" : "#10b981",
              }}
            />
            <span style={styles.statusText}>
              {updateState?.status === "available"
                ? `Update v${updateState.info?.version || "new"} is available`
                : "Desktop Client is running the latest version"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenReleases}
            style={styles.linkBtn}
            title="Open GitHub Releases"
          >
            Releases &amp; Changelog
            <ExternalLink size={12} />
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
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "4px",
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
  },
  versionBadge: {
    fontSize: "10.5px",
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: "4px",
    backgroundColor: "rgba(37, 99, 235, 0.15)",
    color: "#60a5fa",
    border: "1px solid rgba(37, 99, 235, 0.3)",
    fontFamily: "var(--so-font-mono)",
  },
  channelBadge: {
    fontSize: "10px",
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: "4px",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "#10b981",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    textTransform: "uppercase",
  },
  cardDesc: {
    fontSize: "12.5px",
    color: "var(--so-text-secondary)",
    margin: 0,
    lineHeight: 1.45,
  },
  actionButtonGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  primaryActionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-primary)",
    border: "1px solid var(--so-primary)",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  actionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 12px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    color: "var(--so-text-secondary)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  statusStrip: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "var(--so-radius-sm)",
    padding: "10px 14px",
    gap: "12px",
    flexWrap: "wrap",
  },
  statusLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  statusText: {
    fontSize: "12px",
    color: "var(--so-text-primary)",
    fontWeight: 600,
  },
  linkBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    backgroundColor: "transparent",
    border: "none",
    color: "var(--so-primary-light, #93c5fd)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
  },
};
