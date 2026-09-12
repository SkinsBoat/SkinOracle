import React, { useEffect, useState } from "react";
import { HashRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  Sparkles,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Wallet,
  ShieldAlert,
  X,
  Target,
} from "lucide-react";
import {
  oracleLogo,
  csfloatLogo,
  skinsLogo,
  dmarketLogo,
} from "../../assets/images";
import RegisterScreen from "./screens/Onboarding/RegisterScreen";
import OtpScreen from "./screens/Onboarding/OtpScreen";
import ApiKeysScreen from "./screens/Settings/ApiKeysScreen";
import OracleDashboard from "./screens/Oracle/OracleDashboard";
import CSFloatWorkstation from "./screens/CSFloat/CSFloatWorkstation";
import DmarketWorkstation from "./screens/Dmarket/DmarketWorkstation";
import SoCloseWorkstationScreen from "./screens/SoClose/SoCloseWorkstationScreen";
import SkinscomWorkstation from "./screens/Skinscom/SkinscomWorkstation";
import BalanceDashboard from "./screens/Balance/BalanceDashboard";
import UpdateNotification from "./components/UpdateNotification";
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
        <div
          className="splash-logo"
          style={{ background: "transparent", width: "auto", height: "auto" }}
        >
          <img
            src={oracleLogo}
            alt="SkinOracle"
            style={{
              width: 64,
              height: 64,
              objectFit: "contain",
              filter: "drop-shadow(0 4px 12px rgba(37, 99, 235, 0.4))",
            }}
          />
        </div>
        <div className="splash-text">
          SkinOracle{" "}
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#06b6d4",
              padding: "1px 6px",
              borderRadius: "4px",
              border: "1px solid rgba(6, 182, 212, 0.4)",
              verticalAlign: "middle",
              marginLeft: "4px",
            }}
          >
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

      {systemConfig?.globalBannerMessage && (
        <div
          style={{
            backgroundColor:
              systemConfig.globalBannerType === "error"
                ? "var(--so-error)"
                : systemConfig.globalBannerType === "warning"
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
          }}
        >
          {systemConfig.globalBannerMessage}
        </div>
      )}

      {/* OS Encryption Unavailable Warning — only shown when safeStorage falls back to base64 */}
      {encryptionWarning && !encryptionWarningDismissed && (
        <div
          style={{
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
          }}
        >
          <ShieldAlert size={15} style={{ color: "#eab308", flexShrink: 0 }} />
          <span
            style={{
              fontSize: "12.5px",
              color: "#fde68a",
              fontWeight: 600,
              flex: 1,
            }}
          >
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
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#ca8a04",
              display: "flex",
              alignItems: "center",
              padding: "2px",
              borderRadius: "4px",
              flexShrink: 0,
            }}
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
          style={{
            display: "flex",
            height: systemConfig?.globalBannerMessage
              ? "calc(100vh - 34px)"
              : "100vh",
            width: "100vw",
            overflow: "hidden",
          }}
        >
          {/* Expandable/Collapsible Sidebar */}
          <aside
            className={`app-sidebar ${isSidebarExpanded ? "expanded" : "collapsed"}`}
            style={{
              width: isSidebarExpanded ? "230px" : "68px",
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
            }}
          >
            {/* Sidebar Top: Header Brand + Arrow Toggle */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {/* Header Container */}
              {isSidebarExpanded ? (
                /* Expanded Header: Brand Left, Arrow Toggle Right */
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "2px 4px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={oracleLogo}
                      alt="SkinOracle Logo"
                      style={{
                        width: "32px",
                        height: "32px",
                        objectFit: "contain",
                        flexShrink: 0,
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "15px",
                          fontWeight: 800,
                          color: "var(--so-text-primary)",
                          letterSpacing: "-0.3px",
                        }}
                      >
                        SkinOracle
                      </span>
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: 800,
                          letterSpacing: "0.5px",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          background: "rgba(6, 182, 212, 0.15)",
                          color: "#06b6d4",
                          border: "1px solid rgba(6, 182, 212, 0.35)",
                          textTransform: "uppercase",
                        }}
                      >
                        BETA
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={toggleSidebar}
                    title="Collapse sidebar"
                    style={{
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
                    }}
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
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    padding: "2px 0",
                  }}
                >
                  <img
                    src={oracleLogo}
                    alt="SkinOracle (Beta)"
                    title="SkinOracle (Beta)"
                    style={{
                      width: "34px",
                      height: "34px",
                      objectFit: "contain",
                      filter: "drop-shadow(0 2px 6px rgba(37, 99, 235, 0.4))",
                    }}
                  />

                  <button
                    onClick={toggleSidebar}
                    title="Expand sidebar"
                    style={{
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
                    }}
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
              <nav
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <NavLink
                  to="/"
                  title={!isSidebarExpanded ? "Oracle Dashboard" : undefined}
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isSidebarExpanded ? "flex-start" : "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "var(--so-radius-sm)",
                    color: isActive ? "#ffffff" : "var(--so-text-secondary)",
                    backgroundColor: isActive
                      ? "var(--so-primary)"
                      : "transparent",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: "13.5px",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  })}
                >
                  <LayoutDashboard size={18} style={{ flexShrink: 0 }} />
                  {isSidebarExpanded && <span>Dashboard</span>}
                </NavLink>

                <NavLink
                  to="/csfloat"
                  title={!isSidebarExpanded ? "CSFloat Workstation" : undefined}
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isSidebarExpanded ? "flex-start" : "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "var(--so-radius-sm)",
                    color: isActive ? "#ffffff" : "var(--so-text-secondary)",
                    backgroundColor: isActive
                      ? "var(--so-primary)"
                      : "transparent",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: "13.5px",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  })}
                >
                  <img
                    src={csfloatLogo}
                    alt="CSFloat"
                    style={{
                      width: 18,
                      height: 18,
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />
                  {isSidebarExpanded && <span>CSFloat</span>}
                </NavLink>

                <NavLink
                  to="/dmarket"
                  title={!isSidebarExpanded ? "DMarket Workstation" : undefined}
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isSidebarExpanded ? "flex-start" : "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "var(--so-radius-sm)",
                    color: isActive ? "#ffffff" : "var(--so-text-secondary)",
                    backgroundColor: isActive
                      ? "var(--so-primary)"
                      : "transparent",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: "13.5px",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  })}
                >
                  <img
                    src={dmarketLogo}
                    alt="DMarket"
                    style={{
                      width: 18,
                      height: 18,
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />
                  {isSidebarExpanded && <span>DMarket</span>}
                </NavLink>

                <NavLink
                  to="/soclose"
                  title={!isSidebarExpanded ? "SoClose Scanner" : undefined}
                  className={({ isActive }) =>
                    `sidebar-nav-item ${isActive ? "active" : ""}`
                  }
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isSidebarExpanded ? "flex-start" : "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "var(--so-radius-sm)",
                    color: isActive ? "#ffffff" : "var(--so-text-secondary)",
                    backgroundColor: isActive
                      ? "var(--so-primary)"
                      : "transparent",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: "13.5px",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  })}
                >
                  <Target
                    size={18}
                    style={{
                      flexShrink: 0,
                      color: "var(--so-primary)",
                    }}
                  />
                  {isSidebarExpanded && <span>SoClose</span>}
                </NavLink>

                {/* Skins.com Workstation NavLink - Temporarily Commented Out
                <NavLink
                  to="/skinscom"
                  title={!isSidebarExpanded ? 'Skins.com Workstation' : undefined}
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: 'var(--so-radius-sm)',
                    color: isActive ? '#ffffff' : 'var(--so-text-secondary)',
                    backgroundColor: isActive ? 'var(--so-primary)' : 'transparent',
                    textDecoration: 'none',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  })}
                >
                  <img src={skinsLogo} alt="Skins.com" style={{ width: 18, height: 18, objectFit: 'contain', flexShrink: 0 }} />
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
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isSidebarExpanded
                      ? "space-between"
                      : "center",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "var(--so-radius-sm)",
                    color: isActive ? "#ffffff" : "var(--so-text-secondary)",
                    backgroundColor: isActive
                      ? "var(--so-primary)"
                      : "transparent",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: "13.5px",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <Wallet
                          size={18}
                          style={{
                            flexShrink: 0,
                            color: isActive
                              ? "#ffffff"
                              : "var(--so-text-secondary)",
                          }}
                        />
                        {isSidebarExpanded && <span>Balance</span>}
                      </div>
                      {isSidebarExpanded && userBalance && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "2px 7px",
                            borderRadius: "10px",
                            backgroundColor: isActive
                              ? "rgba(255, 255, 255, 0.2)"
                              : "rgba(14, 165, 233, 0.12)",
                            color: isActive ? "#ffffff" : "#38bdf8",
                            border: `1px solid ${isActive ? "rgba(255, 255, 255, 0.3)" : "rgba(14, 165, 233, 0.28)"}`,
                          }}
                        >
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
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isSidebarExpanded ? "flex-start" : "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "var(--so-radius-sm)",
                    color: isActive ? "#ffffff" : "var(--so-text-secondary)",
                    backgroundColor: isActive
                      ? "var(--so-primary)"
                      : "transparent",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: "13.5px",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                  })}
                >
                  <Settings size={18} style={{ flexShrink: 0 }} />
                  {isSidebarExpanded && <span>Settings</span>}
                </NavLink>
              </nav>
            </div>

            {/* Sidebar Bottom: Logout Action & Disclaimer */}
            <div
              style={{
                marginTop: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                width: "100%",
              }}
            >
              <button
                onClick={async () => {
                  if (window.electronAPI?.auth) {
                    await window.electronAPI.auth.logout();
                  }
                  setIsLoggedIn(false);
                }}
                title={!isSidebarExpanded ? "Logout" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isSidebarExpanded ? "flex-start" : "center",
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
                }}
              >
                <LogOut size={18} style={{ flexShrink: 0 }} />
                {isSidebarExpanded && <span>Logout</span>}
              </button>

              {isSidebarExpanded && (
                <div
                  style={{
                    fontSize: "10px",
                    lineHeight: 1.35,
                    color: "var(--so-text-muted)",
                    padding: "8px 4px 0 4px",
                    borderTop: "1px solid var(--so-border-subtle)",
                    textAlign: "center",
                    opacity: 0.7,
                  }}
                >
                  SkinOracle is an independent tool not affiliated with Valve, CSFloat, DMarket, or any listed marketplace. All trademarks belong to their respective owners.
                </div>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <main
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px 28px",
              backgroundColor: "var(--so-bg)",
              boxSizing: "border-box",
              height: "100vh",
            }}
          >
            <Routes>
              <Route path="/" element={<OracleDashboard />} />
              <Route path="/csfloat" element={<CSFloatWorkstation />} />
              <Route path="/dmarket" element={<DmarketWorkstation />} />
              <Route path="/soclose" element={<SoCloseWorkstationScreen />} />
              {/* <Route path="/skinscom" element={<SkinscomWorkstation />} /> */}
              <Route path="/balance" element={<BalanceDashboard />} />
              <Route path="/settings" element={<ApiKeysScreen />} />
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
