import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  Sparkles,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wallet,
  ShieldAlert,
  X,
  Target,
  Info,
  Handshake,
} from "lucide-react";
import {
  oracleLogo,
  csfloatLogo,
  skinsLogo,
  dmarketLogo,
  skinsBoatLogo,
} from "../../assets/images";
import RegisterScreen from "./screens/Onboarding/RegisterScreen";
import OtpScreen from "./screens/Onboarding/OtpScreen";
import SettingsScreen from "./screens/Settings";
import OracleDashboard from "./screens/Oracle/OracleDashboard";
import CSFloatWorkstation from "./screens/CSFloat/CSFloatWorkstation";
import DmarketWorkstation from "./screens/Dmarket/DmarketWorkstation";
import SoCloseWorkstationScreen from "./screens/SoClose/SoCloseWorkstationScreen";
import { DealMakerFloorScreen } from "./screens/DealMaker/DealMakerFloorScreen";
import SkinscomWorkstation from "./screens/Skinscom/SkinscomWorkstation";
import BalanceDashboard from "./screens/Balance/BalanceDashboard";
import AboutScreen from "./screens/About/AboutScreen";
import UpdateNotification from "./components/UpdateNotification";
import ConfirmModal from "./components/ConfirmModal";
import { CreateDealModal } from "./screens/DealMaker/modals/CreateDealModal";
import MaintenanceScreen from "./screens/MaintenanceScreen";
import VersionBlockedScreen from "./screens/VersionBlockedScreen";
import { VersionGateState } from "../shared/types";
import { safeGetItem, safeSetItem } from "./utils/storage";
import { useLayoutStore } from "./store/useLayoutStore";
import "./App.css";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [versionGateState, setVersionGateState] =
    useState<VersionGateState | null>(null);
  const [userBalance, setUserBalance] = useState<string>("");
  const [encryptionWarning, setEncryptionWarning] = useState<boolean>(false);
  const [encryptionWarningDismissed, setEncryptionWarningDismissed] =
    useState<boolean>(() => safeGetItem("so_enc_warn_dismissed") === "true");
  const { isSidebarExpanded, toggleSidebar } = useLayoutStore();

  useEffect(() => {
    let unsubMaintenance: (() => void) | undefined;
    let unsubSessionExpired: (() => void) | undefined;
    let unsubVersionBlock: (() => void) | undefined;

    if (window.electronAPI?.system) {
      window.electronAPI.system
        .getConfig()
        .then((config) => {
          setSystemConfig(config);
        })
        .catch(() => {});

      if (window.electronAPI.system.getVersionGateStatus) {
        window.electronAPI.system
          .getVersionGateStatus()
          .then((gate) => {
            if (gate && !gate.allowed) {
              setVersionGateState(gate);
            }
          })
          .catch(() => {});
      }

      if (window.electronAPI.system.onForceVersionBlock) {
        unsubVersionBlock = window.electronAPI.system.onForceVersionBlock(
          (gate) => {
            setVersionGateState(gate);
          },
        );
      }

      // Global listener: if backend kicks us with 503 Maintenance Mode, immediately show screen
      if (window.electronAPI.system.onForceMaintenance) {
        unsubMaintenance = window.electronAPI.system.onForceMaintenance(() => {
          setSystemConfig((prev: any) => ({
            ...prev,
            isMaintenanceMode: true,
          }));
        });
      }
    }

    if (window.electronAPI?.auth) {
      // Global listener: if backend returns 401 and session expires, smoothly reset to login
      if (window.electronAPI.auth.onSessionExpired) {
        unsubSessionExpired = window.electronAPI.auth.onSessionExpired(() => {
          setIsLoggedIn(false);
          toast.error("Session expired. Please log in again.");
        });
      }

      window.electronAPI.auth
        .getStatus()
        .then(({ isLoggedIn }) => {
          setIsLoggedIn(isLoggedIn);
          if (isLoggedIn && window.electronAPI?.balance) {
            window.electronAPI.balance
              .getBalance()
              .then((res) => {
                if (res?.formattedBalance) setUserBalance(res.formattedBalance);
              })
              .catch(() => {});
          }
        })
        .catch(() => {
          setIsLoggedIn(false);
        });
    } else {
      setIsLoggedIn(true);
    }

    // Check if OS-level encryption is available for stored API keys
    window.electronAPI?.settings
      ?.getEncryptionStatus?.()
      .then(({ isEncrypted }) => {
        setEncryptionWarning(!isEncrypted);
      })
      .catch(() => {});

    return () => {
      if (unsubMaintenance) unsubMaintenance();
      if (unsubSessionExpired) unsubSessionExpired();
      if (unsubVersionBlock) unsubVersionBlock();
    };
  }, []);

  // Immediate Version Gate Interception: if version is blocked, render VersionBlockedScreen immediately
  if (versionGateState && !versionGateState.allowed) {
    return (
      <HashRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            className: "toast-custom",
            duration: 3500,
          }}
        />
        <UpdateNotification isMandatory={true} />
        <VersionBlockedScreen gateState={versionGateState} />
      </HashRouter>
    );
  }

  if (isLoggedIn === null) {
    return (
      <div className="splash">
        <div className="splash-logo" style={styles.splashLogo}>
          <img
            src={oracleLogo}
            alt="Skin Oracle"
            style={styles.splashImg}
          />
        </div>
        <div className="splash-text">
          Skin Oracle{" "}
          <span style={styles.splashBetaBadge}>
            BETA
          </span>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          className: "toast-custom",
          duration: 3500,
        }}
      />
      <UpdateNotification
        isMandatory={Boolean(versionGateState && !versionGateState.allowed)}
      />
      <ConfirmModal />
      <CreateDealModal />

      {systemConfig?.globalBannerMessage && (
        <div
          style={getGlobalBannerStyle(systemConfig.globalBannerType)}
        >
          {systemConfig.globalBannerMessage}
        </div>
      )}

      {/* OS Encryption Unavailable Warning — only shown when safeStorage falls back to base64 */}
      {encryptionWarning && !encryptionWarningDismissed && (
        <div style={styles.encryptionWarningBanner}>
          <ShieldAlert size={15} style={styles.shieldIcon} />
          <span style={styles.encryptionWarningText}>
            OS encryption is unavailable on this system. Your API keys are
            stored as base64 (not hardware-protected). Avoid using SkinOracle on
            a shared or public machine.
          </span>
          <button
            onClick={() => {
              setEncryptionWarningDismissed(true);
              safeSetItem("so_enc_warn_dismissed", "true");
            }}
            title="Dismiss"
            style={styles.dismissButton}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {versionGateState && !versionGateState.allowed ? (
        <VersionBlockedScreen gateState={versionGateState} />
      ) : systemConfig?.isMaintenanceMode ? (
        <MaintenanceScreen />
      ) : isLoggedIn ? (
        <div
          className="app-container"
          style={getAppContainerStyle(Boolean(systemConfig?.globalBannerMessage))}
        >
          {/* Expandable/Collapsible Sidebar */}
          <aside
            className={`app-sidebar ${isSidebarExpanded ? "expanded" : "collapsed"}`}
            style={getSidebarStyle(isSidebarExpanded)}
          >
            {/* Sidebar Top: Header Brand + Arrow Toggle */}
            <div style={styles.sidebarTop}>
              {/* Header Container */}
              {isSidebarExpanded ? (
                /* Expanded Header: Brand Left, Arrow Toggle Right */
                <div style={styles.headerExpanded}>
                  <div style={styles.headerBrandGroup}>
                    <img
                      src={oracleLogo}
                      alt="Skin Oracle Logo"
                      style={styles.logoImgExpanded}
                    />
                    <div style={styles.titleGroup}>
                      <span style={styles.titleText}>
                        Skin Oracle
                      </span>
                      <span style={styles.betaBadge}>
                        BETA
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={toggleSidebar}
                    title="Collapse sidebar"
                    style={styles.collapseButton}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#ffffff";
                      e.currentTarget.style.backgroundColor =
                        "var(--so-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--so-text-secondary)";
                      e.currentTarget.style.backgroundColor =
                        "var(--so-surface-card)";
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              ) : (
                /* Collapsed Header: Clean Brand Logo Top, Arrow Toggle Directly Below */
                <div style={styles.headerCollapsed}>
                  <img
                    src={oracleLogo}
                    alt="Skin Oracle (Beta)"
                    title="Skin Oracle (Beta)"
                    style={styles.logoImgCollapsed}
                  />

                  <button
                    onClick={toggleSidebar}
                    title="Expand sidebar"
                    style={styles.expandButton}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#ffffff";
                      e.currentTarget.style.backgroundColor =
                        "var(--so-primary)";
                      e.currentTarget.style.borderColor = "var(--so-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--so-text-secondary)";
                      e.currentTarget.style.backgroundColor =
                        "var(--so-surface-card)";
                      e.currentTarget.style.borderColor =
                        "var(--so-border-medium)";
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {/* Navigation Items */}
              <nav style={styles.navContainer}>
                <NavLink
                  to="/"
                  title={!isSidebarExpanded ? "Pricing Central" : undefined}
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  style={({ isActive }) =>
                    getNavLinkStyle(isActive, isSidebarExpanded)
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Sparkles
                        size={18}
                        style={getNavIconStyle(isActive, "accent")}
                      />
                      {isSidebarExpanded && <span>Pricing Central</span>}
                    </>
                  )}
                </NavLink>

                <NavLink
                  to="/dealmaker"
                  title={!isSidebarExpanded ? "Deal Maker" : undefined}
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  style={({ isActive }) =>
                    getNavLinkStyle(isActive, isSidebarExpanded)
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Handshake
                        size={18}
                        style={getNavIconStyle(isActive, "accent")}
                      />
                      {isSidebarExpanded && <span>Deal Maker</span>}
                    </>
                  )}
                </NavLink>

                <NavLink
                  to="/soclose"
                  title={!isSidebarExpanded ? "So Close Scanner" : undefined}
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  style={({ isActive }) =>
                    getNavLinkStyle(isActive, isSidebarExpanded)
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Target
                        size={18}
                        style={getNavIconStyle(isActive, "accent")}
                      />
                      {isSidebarExpanded && <span>So Close</span>}
                    </>
                  )}
                </NavLink>

                <NavLink
                  to="/csfloat"
                  title={!isSidebarExpanded ? "CSFloat Workstation" : undefined}
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  style={({ isActive }) =>
                    getNavLinkStyle(isActive, isSidebarExpanded)
                  }
                >
                  <img
                    src={csfloatLogo}
                    alt="CSFloat"
                    style={styles.marketIcon}
                  />
                  {isSidebarExpanded && <span>CSFloat</span>}
                </NavLink>

                <NavLink
                  to="/dmarket"
                  title={!isSidebarExpanded ? "DMarket Workstation" : undefined}
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  style={({ isActive }) =>
                    getNavLinkStyle(isActive, isSidebarExpanded)
                  }
                >
                  <img
                    src={dmarketLogo}
                    alt="DMarket"
                    style={styles.marketIcon}
                  />
                  {isSidebarExpanded && <span>DMarket</span>}
                </NavLink>

                {/* Skins.com Workstation NavLink - Temporarily Commented Out
                <NavLink
                  to="/skinscom"
                  title={!isSidebarExpanded ? 'Skins.com Workstation' : undefined}
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  style={({ isActive }) =>
                    getNavLinkStyle(isActive, isSidebarExpanded)
                  }
                >
                  <img src={skinsLogo} alt="Skins.com" style={styles.marketIcon} />
                  {isSidebarExpanded && <span>Skins.com</span>}
                </NavLink>
                */}

                <NavLink
                  to="/balance"
                  title={
                    !isSidebarExpanded
                      ? `Balance & Ledger (${userBalance || "$0.00"})`
                      : undefined
                  }
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  style={({ isActive }) =>
                    getBalanceNavLinkStyle(isActive, isSidebarExpanded)
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div style={styles.balanceGroup}>
                        <Wallet
                          size={18}
                          style={getNavIconStyle(isActive, "accent")}
                        />
                        {isSidebarExpanded && <span>Balance</span>}
                      </div>
                      {isSidebarExpanded && userBalance && (
                        <span style={getBalanceBadgeStyle(isActive)}>
                          {userBalance}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>

                <NavLink
                  to="/settings"
                  title={!isSidebarExpanded ? "Settings" : undefined}
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  style={({ isActive }) =>
                    getNavLinkStyle(isActive, isSidebarExpanded)
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Settings
                        size={18}
                        style={getNavIconStyle(isActive, "muted")}
                      />
                      {isSidebarExpanded && <span>Settings</span>}
                    </>
                  )}
                </NavLink>

                <NavLink
                  to="/about"
                  title={!isSidebarExpanded ? "About Skin Oracle" : undefined}
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  style={({ isActive }) =>
                    getNavLinkStyle(isActive, isSidebarExpanded)
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Info
                        size={18}
                        style={getNavIconStyle(isActive, "muted")}
                      />
                      {isSidebarExpanded && <span>About</span>}
                    </>
                  )}
                </NavLink>
              </nav>
            </div>

            {/* Sidebar Bottom: Logout Action & Disclaimer */}
            <div style={styles.sidebarBottom}>
              <button
                onClick={async () => {
                  if (window.electronAPI?.auth) {
                    await window.electronAPI.auth.logout();
                  }
                  setIsLoggedIn(false);
                }}
                title={!isSidebarExpanded ? "Logout" : undefined}
                style={getLogoutButtonStyle(isSidebarExpanded)}
              >
                <LogOut size={18} style={styles.navIcon} />
                {isSidebarExpanded && <span>Logout</span>}
              </button>

              {isSidebarExpanded && (
                <div style={styles.disclaimer}>
                  Skin Oracle is an independent tool not affiliated with Valve,
                  CSFloat, DMarket, or any listed marketplace. All trademarks
                  belong to their respective owners.
                </div>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <main style={styles.mainContent}>
            <Routes>
              <Route path="/" element={<OracleDashboard />} />
              <Route path="/csfloat" element={<CSFloatWorkstation />} />
              <Route path="/dmarket" element={<DmarketWorkstation />} />
              <Route path="/soclose" element={<SoCloseWorkstationScreen />} />
              <Route path="/dealmaker" element={<DealMakerFloorScreen />} />
              <Route path="/auctions" element={<DealMakerFloorScreen />} />
              {/* <Route path="/skinscom" element={<SkinscomWorkstation />} /> */}
              <Route path="/balance" element={<BalanceDashboard />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/about" element={<AboutScreen />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      ) : (
        <Routes>
          <Route
            path="/register"
            element={<RegisterScreen onSuccess={() => setIsLoggedIn(false)} />}
          />
          <Route
            path="/verify"
            element={<OtpScreen onSuccess={() => setIsLoggedIn(true)} />}
          />
          <Route path="*" element={<Navigate to="/register" />} />
        </Routes>
      )}
    </HashRouter>
  );
}

// ── Pure Dynamic Style Helpers ───────────────────────────────────────────────

const getGlobalBannerStyle = (type?: string): React.CSSProperties => ({
  backgroundColor:
    type === "error"
      ? "var(--so-error)"
      : type === "warning"
        ? "var(--so-warning)"
        : "var(--so-primary)",
  color: "#fff",
  padding: "8px 16px",
  textAlign: "center",
  fontSize: "13px",
  fontWeight: 700,
  zIndex: 10000,
  width: "100%",
  flexShrink: 0,
});

const getAppContainerStyle = (hasBanner: boolean): React.CSSProperties => ({
  display: "flex",
  height: hasBanner ? "calc(100vh - 34px)" : "100vh",
  width: "100vw",
  overflow: "hidden",
});

const getSidebarStyle = (isExpanded: boolean): React.CSSProperties => ({
  width: isExpanded ? "230px" : "68px",
  transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  backgroundColor: "var(--so-surface-sidebar)",
  borderRight: "1px solid var(--so-border-medium)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: "14px 10px",
  flexShrink: 0,
  zIndex: 100,
  boxSizing: "border-box",
});

const getNavLinkStyle = (
  isActive: boolean,
  isExpanded: boolean,
): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: isExpanded ? "flex-start" : "center",
  gap: "12px",
  padding: "10px 12px",
  borderRadius: "var(--so-radius-sm)",
  color: isActive ? "#ffffff" : "var(--so-text-secondary)",
  backgroundColor: isActive ? "var(--so-primary)" : "transparent",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: "13.5px",
  transition: "all 0.15s ease",
  whiteSpace: "nowrap",
  overflow: "hidden",
});

const getBalanceNavLinkStyle = (
  isActive: boolean,
  isExpanded: boolean,
): React.CSSProperties => ({
  ...getNavLinkStyle(isActive, isExpanded),
  justifyContent: isExpanded ? "space-between" : "center",
  gap: "10px",
});

const getNavIconStyle = (
  isActive: boolean,
  variant: "accent" | "muted" = "accent",
): React.CSSProperties => ({
  flexShrink: 0,
  color: isActive ? "#ffffff" : variant === "accent" ? "#38bdf8" : "#cbd5e1",
  transition: "color 0.15s ease",
});

const getBalanceBadgeStyle = (isActive: boolean): React.CSSProperties => ({
  fontSize: "11px",
  fontWeight: 800,
  padding: "2px 7px",
  borderRadius: "10px",
  backgroundColor: isActive
    ? "rgba(255, 255, 255, 0.2)"
    : "rgba(14, 165, 233, 0.12)",
  color: isActive ? "#ffffff" : "#38bdf8",
  border: `1px solid ${
    isActive ? "rgba(255, 255, 255, 0.3)" : "rgba(14, 165, 233, 0.28)"
  }`,
});

const getLogoutButtonStyle = (isExpanded: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  justifyContent: isExpanded ? "flex-start" : "center",
  gap: "12px",
  padding: "10px 12px",
  borderRadius: "var(--so-radius-sm)",
  color: "var(--so-danger-text)",
  backgroundColor: "rgba(220, 38, 38, 0.1)",
  border: "1px solid rgba(220, 38, 38, 0.25)",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "13.5px",
  width: "100%",
  transition: "all 0.15s ease",
  whiteSpace: "nowrap",
  overflow: "hidden",
  boxSizing: "border-box",
});

// ── Static Component Styles ──────────────────────────────────────────────────

const styles = {
  splashLogo: {
    background: "transparent",
    width: "auto",
    height: "auto",
  } as React.CSSProperties,

  splashImg: {
    width: 64,
    height: 64,
    objectFit: "contain",
    filter: "drop-shadow(0 4px 12px rgba(37, 99, 235, 0.4))",
  } as React.CSSProperties,

  splashBetaBadge: {
    fontSize: "12px",
    fontWeight: 800,
    color: "#06b6d4",
    padding: "1px 6px",
    borderRadius: "4px",
    border: "1px solid rgba(6, 182, 212, 0.4)",
    verticalAlign: "middle",
    marginLeft: "4px",
  } as React.CSSProperties,

  encryptionWarningBanner: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "9px 16px",
    backgroundColor: "rgba(180, 120, 0, 0.18)",
    borderBottom: "1px solid rgba(234, 179, 8, 0.4)",
    backdropFilter: "blur(8px)",
  } as React.CSSProperties,

  shieldIcon: {
    color: "#eab308",
    flexShrink: 0,
  } as React.CSSProperties,

  encryptionWarningText: {
    fontSize: "12.5px",
    color: "#fde68a",
    fontWeight: 600,
    flex: 1,
  } as React.CSSProperties,

  dismissButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#ca8a04",
    display: "flex",
    alignItems: "center",
    padding: "2px",
    borderRadius: "4px",
    flexShrink: 0,
  } as React.CSSProperties,

  sidebarTop: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  } as React.CSSProperties,

  headerExpanded: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "2px 4px",
  } as React.CSSProperties,

  headerBrandGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    overflow: "hidden",
  } as React.CSSProperties,

  logoImgExpanded: {
    width: "32px",
    height: "32px",
    objectFit: "contain",
    flexShrink: 0,
  } as React.CSSProperties,

  titleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  titleText: {
    fontSize: "15px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    letterSpacing: "-0.3px",
  } as React.CSSProperties,

  betaBadge: {
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.5px",
    padding: "1px 5px",
    borderRadius: "4px",
    background: "rgba(6, 182, 212, 0.15)",
    color: "#06b6d4",
    border: "1px solid rgba(6, 182, 212, 0.35)",
    textTransform: "uppercase",
  } as React.CSSProperties,

  collapseButton: {
    width: "26px",
    height: "26px",
    borderRadius: "6px",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-strong)",
    color: "var(--so-text-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
    padding: 0,
  } as React.CSSProperties,

  headerCollapsed: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    padding: "2px 0",
  } as React.CSSProperties,

  logoImgCollapsed: {
    width: "34px",
    height: "34px",
    objectFit: "contain",
    filter: "drop-shadow(0 2px 6px rgba(37, 99, 235, 0.4))",
  } as React.CSSProperties,

  expandButton: {
    width: "34px",
    height: "22px",
    borderRadius: "4px",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    color: "var(--so-text-secondary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
    padding: 0,
  } as React.CSSProperties,

  navContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  } as React.CSSProperties,

  navIcon: {
    flexShrink: 0,
  } as React.CSSProperties,

  marketIcon: {
    width: 18,
    height: 18,
    objectFit: "contain",
    flexShrink: 0,
  } as React.CSSProperties,

  balanceGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  } as React.CSSProperties,

  sidebarBottom: {
    marginTop: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
  } as React.CSSProperties,

  disclaimer: {
    fontSize: "10px",
    lineHeight: 1.35,
    color: "var(--so-text-muted)",
    padding: "8px 4px 0 4px",
    borderTop: "1px solid var(--so-border-subtle)",
    textAlign: "center",
    opacity: 0.7,
  } as React.CSSProperties,

  mainContent: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 28px",
    backgroundColor: "var(--so-bg)",
    boxSizing: "border-box",
    height: "100vh",
  } as React.CSSProperties,
};
