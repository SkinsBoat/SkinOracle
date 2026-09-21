import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Settings, KeyRound, Database, Cpu, Ban } from "lucide-react";
import { ApiKeysSection } from "./components/ApiKeysSection";
import { DatabaseStorageSection } from "./components/DatabaseStorageSection";
import { SystemDiagnosticsSection } from "./components/SystemDiagnosticsSection";
import { BlockedSkinsSection } from "./components/BlockedSkinsSection";
import { useOracleStore } from "../../store/useOracleStore";

export type SettingsTabId = "api-keys" | "database" | "blocked-skins" | "diagnostics";

interface SettingsTab {
  id: SettingsTabId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

export default function SettingsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") as SettingsTabId) || "api-keys";
  const [activeTab, setActiveTab] = useState<SettingsTabId>(
    ["api-keys", "database", "blocked-skins", "diagnostics"].includes(initialTab)
      ? initialTab
      : "api-keys",
  );

  const { blockedSkins } = useOracleStore();

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as SettingsTabId;
    if (tabFromUrl && (["api-keys", "database", "blocked-skins", "diagnostics"] as string[]).includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: SettingsTabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const tabs: SettingsTab[] = [
    {
      id: "api-keys",
      label: "API Keys & Integrations",
      icon: <KeyRound size={15} />,
    },
    {
      id: "database",
      label: "Database & Storage",
      icon: <Database size={15} />,
      badge: "SQLite 3",
    },
    {
      id: "blocked-skins",
      label: "Blocked Skins",
      icon: <Ban size={15} />,
      badge: blockedSkins.length > 0 ? `${blockedSkins.length}` : undefined,
    },
    {
      id: "diagnostics",
      label: "System & Diagnostics",
      icon: <Cpu size={15} />,
    },
  ];

  return (
    <div style={styles.container}>
      {/* Settings Top Header */}
      <div style={styles.pageHeader}>
        <div style={styles.pageTitleRow}>
          <div style={styles.pageIconBox}>
            <Settings size={22} style={{ color: "var(--so-primary)" }} />
          </div>
          <div>
            <h1 style={styles.pageTitle}>Settings &amp; System Configuration</h1>
            <p style={styles.pageSubtitle}>
              Configure local market data keys, manage embedded SQLite trend storage, and review environment diagnostics.
            </p>
          </div>
        </div>

        {/* Scalable Tab Switcher Bar */}
        <div style={styles.tabBar}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                style={getTabButtonStyle(isActive)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "var(--so-surface-card-hover)";
                    e.currentTarget.style.color = "var(--so-text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--so-text-secondary)";
                  }
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span style={getTabBadgeStyle(isActive)}>{tab.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Section Content */}
      <div style={styles.contentWrap}>
        {activeTab === "api-keys" && <ApiKeysSection />}
        {activeTab === "database" && <DatabaseStorageSection />}
        {activeTab === "diagnostics" && <SystemDiagnosticsSection />}
        {activeTab === "blocked-skins" && <BlockedSkinsSection />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Extracted Styles Dictionary & Dynamic Style Helpers (Rule 9)
// ─────────────────────────────────────────────────────────────────────────────

function getTabButtonStyle(isActive: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: isActive ? "var(--so-primary)" : "transparent",
    color: isActive ? "#ffffff" : "var(--so-text-secondary)",
    border: "none",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  };
}

function getTabBadgeStyle(isActive: boolean): React.CSSProperties {
  return {
    fontSize: "10px",
    fontWeight: 800,
    padding: "1px 6px",
    borderRadius: "4px",
    backgroundColor: isActive ? "rgba(255, 255, 255, 0.2)" : "rgba(168, 85, 247, 0.15)",
    color: isActive ? "#ffffff" : "#c084fc",
    border: isActive ? "none" : "1px solid rgba(168, 85, 247, 0.3)",
    textTransform: "uppercase",
  };
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "1050px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    paddingBottom: "48px",
  },
  pageHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  pageTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  pageIconBox: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: "24px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  pageSubtitle: {
    fontSize: "13.5px",
    color: "var(--so-text-secondary)",
    margin: "4px 0 0 0",
    lineHeight: 1.45,
  },
  tabBar: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    padding: "6px",
    overflowX: "auto",
  },
  contentWrap: {
    minHeight: "400px",
  },
};
