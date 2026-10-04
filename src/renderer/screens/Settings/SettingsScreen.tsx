import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Settings, KeyRound, Database, Cpu, Ban, Bell, Clock, Sliders } from "lucide-react";
import { ApiKeysSection } from "./components/ApiKeysSection";
import { NotificationsSection } from "./components/NotificationsSection";
import { DataFreshnessSection } from "./components/DataFreshnessSection";
import { DatabaseStorageSection } from "./components/DatabaseStorageSection";
import { SystemDiagnosticsSection } from "./components/SystemDiagnosticsSection";
import { BlockedSkinsSection } from "./components/BlockedSkinsSection";
import { AdvancedToolsSection } from "./components/AdvancedToolsSection";
import { useOracleStore } from "../../store/useOracleStore";

export type SettingsTabId =
  | "api-keys"
  | "notifications"
  | "data-storage"
  | "diagnostics";

export type SettingsSubTabId = "data-freshness" | "database" | "blocked-skins" | "advanced";

interface SettingsTab {
  id: SettingsTabId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface SettingsSubTab {
  id: SettingsSubTabId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const VALID_TABS: SettingsTabId[] = [
  "api-keys",
  "notifications",
  "data-storage",
  "diagnostics",
];

const SUB_TABS: SettingsSubTabId[] = [
  "data-freshness",
  "database",
  "blocked-skins",
  "advanced",
];

// Legacy top-level tab ids that were merged under the "Data & Storage" parent.
const LEGACY_TAB_MAP: Record<
  string,
  { tab: SettingsTabId; sub?: SettingsSubTabId }
> = {
  "data-freshness": { tab: "data-storage", sub: "data-freshness" },
  database: { tab: "data-storage", sub: "database" },
  "blocked-skins": { tab: "data-storage", sub: "blocked-skins" },
  advanced: { tab: "data-storage", sub: "advanced" },
};

function resolveTab(raw: string | null): {
  tab: SettingsTabId;
  sub?: SettingsSubTabId;
} {
  if (raw && LEGACY_TAB_MAP[raw]) return LEGACY_TAB_MAP[raw];
  if (raw && VALID_TABS.includes(raw as SettingsTabId)) {
    return { tab: raw as SettingsTabId };
  }
  return { tab: "api-keys" };
}

export default function SettingsScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialResolved = resolveTab(searchParams.get("tab"));
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialResolved.tab);

  const initialSub =
    (searchParams.get("sub") as SettingsSubTabId | null) ||
    initialResolved.sub ||
    "data-freshness";
  const [activeSubTab, setActiveSubTab] =
    useState<SettingsSubTabId>(initialSub);

  const { blockedSkins } = useOracleStore();

  useEffect(() => {
    const resolved = resolveTab(searchParams.get("tab"));
    setActiveTab(resolved.tab);

    const subFromUrl = searchParams.get("sub") as SettingsSubTabId | null;
    if (resolved.sub) {
      setActiveSubTab(resolved.sub);
    } else if (subFromUrl && SUB_TABS.includes(subFromUrl)) {
      setActiveSubTab(subFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: SettingsTabId) => {
    setActiveTab(tabId);
    setSearchParams(
      tabId === "data-storage"
        ? { tab: tabId, sub: activeSubTab }
        : { tab: tabId },
    );
  };

  const handleSubTabChange = (subTabId: SettingsSubTabId) => {
    setActiveSubTab(subTabId);
    setSearchParams({ tab: "data-storage", sub: subTabId });
  };

  const tabs: SettingsTab[] = [
    {
      id: "api-keys",
      label: "API Keys & Integrations",
      icon: <KeyRound size={15} />,
    },
    {
      id: "notifications",
      label: "Notifications & Audio",
      icon: <Bell size={15} />,
    },
    {
      id: "data-storage",
      label: "Data & Storage",
      icon: <Database size={15} />,
    },
    {
      id: "diagnostics",
      label: "System & Diagnostics",
      icon: <Cpu size={15} />,
    },
  ];

  const subTabs: SettingsSubTab[] = [
    {
      id: "data-freshness",
      label: "Data Freshness",
      icon: <Clock size={14} />,
    },
    {
      id: "database",
      label: "Database & Storage",
      icon: <Database size={14} />,
    },
    {
      id: "blocked-skins",
      label: "Blocked Skins",
      icon: <Ban size={14} />,
      badge: blockedSkins.length > 0 ? `${blockedSkins.length}` : undefined,
    },
    {
      id: "advanced",
      label: "Advanced",
      icon: <Sliders size={14} />,
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
        {activeTab === "notifications" && <NotificationsSection />}

        {activeTab === "data-storage" && (
          <>
            {/* Nested sub-tab bar: one level down from the parent tab */}
            <div style={styles.subTabBar}>
              {subTabs.map((subTab) => {
                const isActive = activeSubTab === subTab.id;
                return (
                  <button
                    key={subTab.id}
                    type="button"
                    onClick={() => handleSubTabChange(subTab.id)}
                    style={getSubTabButtonStyle(isActive)}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor =
                          "var(--so-surface-card-hover)";
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
                    {subTab.icon}
                    <span>{subTab.label}</span>
                    {subTab.badge && (
                      <span style={getSubTabBadgeStyle(isActive)}>
                        {subTab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={styles.subContentWrap}>
              {activeSubTab === "data-freshness" && <DataFreshnessSection />}
              {activeSubTab === "database" && <DatabaseStorageSection />}
              {activeSubTab === "blocked-skins" && <BlockedSkinsSection />}
              {activeSubTab === "advanced" && <AdvancedToolsSection />}
            </div>
          </>
        )}

        {activeTab === "diagnostics" && <SystemDiagnosticsSection />}
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

function getSubTabButtonStyle(isActive: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "6px 12px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: isActive ? "var(--so-surface-panel)" : "transparent",
    color: isActive ? "var(--so-text-primary)" : "var(--so-text-muted)",
    border: isActive
      ? "1px solid var(--so-border-medium)"
      : "1px solid transparent",
    fontSize: "12px",
    fontWeight: isActive ? 700 : 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  };
}

function getSubTabBadgeStyle(isActive: boolean): React.CSSProperties {
  return {
    fontSize: "9.5px",
    fontWeight: 800,
    padding: "1px 5px",
    borderRadius: "4px",
    backgroundColor: isActive
      ? "rgba(59, 130, 246, 0.2)"
      : "rgba(255, 255, 255, 0.06)",
    color: isActive ? "#93c5fd" : "var(--so-text-muted)",
    border: isActive ? "1px solid rgba(96, 165, 250, 0.4)" : "1px solid transparent",
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
  subTabBar: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px",
    backgroundColor: "rgba(0, 0, 0, 0.18)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "var(--so-radius-sm)",
    overflowX: "auto",
    marginBottom: "18px",
  },
  subContentWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  contentWrap: {
    minHeight: "400px",
  },
};
