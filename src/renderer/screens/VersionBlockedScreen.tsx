import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  Download,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { UpdateStatusState, VersionGateState } from "../../shared/types";

interface VersionBlockedScreenProps {
  gateState: VersionGateState;
}

export default function VersionBlockedScreen({
  gateState,
}: VersionBlockedScreenProps) {
  const [updateState, setUpdateState] = useState<UpdateStatusState>({
    status: "idle",
    info: null,
    progress: null,
    error: null,
  });

  const [isStartingDownload, setIsStartingDownload] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  useEffect(() => {
    if (!window.electronAPI?.updater) return;

    // Listen for real-time status updates from the auto-updater service
    const unsubscribe = window.electronAPI.updater.onUpdateStatus((state) => {
      setUpdateState(state);
      if (state.status === "downloading") {
        setIsStartingDownload(false);
      }
      if (state.status !== "checking") {
        setIsChecking(false);
      }
    });

    // Check for updates automatically on mount if idle
    handleCheckForUpdates();

    return () => {
      unsubscribe();
    };
  }, []);

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI?.updater) return;
    setIsChecking(true);
    try {
      await window.electronAPI.updater.checkForUpdates();
    } catch (err) {
      setIsChecking(false);
    }
  };

  const handleDownload = async () => {
    if (!window.electronAPI?.updater) return;
    setIsStartingDownload(true);
    try {
      await window.electronAPI.updater.downloadUpdate();
    } catch (err) {
      setIsStartingDownload(false);
    }
  };

  const handleRestart = async () => {
    if (!window.electronAPI?.updater) return;
    await window.electronAPI.updater.quitAndInstall();
  };

  const handleOpenReleases = async () => {
    if (window.electronAPI?.system?.openReleases) {
      await window.electronAPI.system.openReleases();
    }
  };

  const formatSpeed = (bytesPerSec?: number) => {
    if (!bytesPerSec) return "";
    const mbps = bytesPerSec / (1024 * 1024);
    return `${mbps.toFixed(2)} MB/s`;
  };

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#050505",
        color: "#f3f4f6",
        padding: "32px",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "linear-gradient(145deg, #0d0e15, #08090d)",
          border: "1px solid #1e2330",
          borderRadius: "16px",
          padding: "40px 36px",
          maxWidth: "560px",
          width: "100%",
          textAlign: "center",
          boxShadow:
            "0 24px 48px rgba(0, 0, 0, 0.7), 0 0 32px rgba(244, 63, 94, 0.08)",
        }}
      >
        {/* Warning Icon Badge */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: "rgba(244, 63, 94, 0.12)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "20px",
            color: "#f43f5e",
          }}
        >
          <ShieldAlert size={34} />
        </div>

        {/* Title & Reason */}
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 800,
            color: "#ffffff",
            marginBottom: "10px",
            letterSpacing: "-0.5px",
          }}
        >
          Update Required
        </h1>

        <p
          style={{
            fontSize: "14px",
            color: "#9ca3af",
            lineHeight: 1.6,
            marginBottom: "22px",
          }}
        >
          {gateState.reason ||
            "This build of SkinOracle is outdated and cannot connect to pricing and trading services."}
        </p>

        {/* Version Comparison Box */}
        <div
          style={{
            background: "rgba(17, 24, 39, 0.75)",
            border: "1px solid #2d3748",
            borderRadius: "10px",
            padding: "12px 18px",
            display: "inline-flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "13px",
            color: "#cbd5e1",
            marginBottom: "26px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#9ca3af" }}>Your Version:</span>
            <span style={{ color: "#f43f5e", fontWeight: 700 }}>
              v{gateState.currentVersion || "Current"}
            </span>
          </div>

          <div
            style={{ width: "1px", height: "18px", background: "#374151" }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#9ca3af" }}>Required:</span>
            <span style={{ color: "#10b981", fontWeight: 700 }}>
              v{gateState.minVersion || "Latest"}+
            </span>
          </div>
        </div>

        {/* Auto-Updater Action Section */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(51, 65, 85, 0.6)",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "22px",
            textAlign: "left",
          }}
        >
          {/* Status: Checking */}
          {(updateState.status === "checking" || isChecking) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                justifyContent: "center",
                padding: "10px 0",
              }}
            >
              <RefreshCw
                size={20}
                className="spin"
                style={{ color: "var(--so-primary)" }}
              />
              <span
                style={{
                  fontSize: "13.5px",
                  color: "#cbd5e1",
                  fontWeight: 600,
                }}
              >
                Checking for updates from server...
              </span>
            </div>
          )}

          {/* Status: Available */}
          {updateState.status === "available" && !isChecking && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#ffffff",
                    }}
                  >
                    SkinOracle v{updateState.info?.version} is available!
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#94a3b8",
                      marginTop: "2px",
                    }}
                  >
                    Click below to start downloading the update automatically.
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownload}
                disabled={isStartingDownload}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "12px 20px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: isStartingDownload ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
                  transition: "background-color 0.15s ease",
                }}
              >
                <Download size={16} />
                {isStartingDownload
                  ? "Starting Download..."
                  : "Download & Install Update"}
              </button>
            </div>
          )}

          {/* Status: Downloading */}
          {updateState.status === "downloading" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <RefreshCw
                    size={16}
                    className="spin"
                    style={{ color: "var(--so-primary)" }}
                  />
                  <span
                    style={{
                      fontSize: "13.5px",
                      fontWeight: 700,
                      color: "#ffffff",
                    }}
                  >
                    Downloading v{updateState.info?.version}...
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    color: "var(--so-primary)",
                  }}
                >
                  {Math.round(updateState.progress?.percent || 0)}%
                </span>
              </div>

              {/* Progress Bar Container */}
              <div
                style={{
                  width: "100%",
                  height: "8px",
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${updateState.progress?.percent || 0}%`,
                    height: "100%",
                    backgroundColor: "var(--so-primary)",
                    borderRadius: "4px",
                    transition: "width 0.2s linear",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "12px",
                  color: "#94a3b8",
                }}
              >
                <span>{formatSpeed(updateState.progress?.bytesPerSecond)}</span>
                <span>
                  {(
                    (updateState.progress?.transferred || 0) /
                    (1024 * 1024)
                  ).toFixed(1)}{" "}
                  MB /{" "}
                  {((updateState.progress?.total || 0) / (1024 * 1024)).toFixed(
                    1,
                  )}{" "}
                  MB
                </span>
              </div>
            </div>
          )}

          {/* Status: Downloaded */}
          {updateState.status === "downloaded" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(34, 197, 94, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#22c55e",
                  }}
                >
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#ffffff",
                    }}
                  >
                    Update Ready to Install (v{updateState.info?.version})
                  </div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                    Restart SkinOracle to complete update installation.
                  </div>
                </div>
              </div>

              <button
                onClick={handleRestart}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "12px 20px",
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(22, 163, 74, 0.4)",
                }}
              >
                <RefreshCw size={16} />
                Restart & Install Update Now
              </button>
            </div>
          )}

          {/* Status: Error or Idle/Not-Available */}
          {(updateState.status === "error" ||
            updateState.status === "not-available" ||
            updateState.status === "idle") &&
            !isChecking && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {updateState.error ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "#f87171",
                      fontSize: "12.5px",
                    }}
                  >
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>Auto-update check: {updateState.error}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                    Automatic update check did not detect an automated package.
                    Please check again or download manually.
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={handleCheckForUpdates}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      flex: 1,
                      padding: "10px 16px",
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      color: "#ffffff",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <RefreshCw size={14} />
                    Check Again
                  </button>

                  <button
                    onClick={handleOpenReleases}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      flex: 1.4,
                      padding: "10px 16px",
                      backgroundColor: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <ExternalLink size={14} />
                    Download from Website
                  </button>
                </div>
              </div>
            )}
        </div>

        {/* Fallback & Security Note */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#64748b",
          }}
        >
          <span>Trading workstations paused for safety.</span>
          <button
            onClick={handleOpenReleases}
            style={{
              background: "none",
              border: "none",
              color: "#3b82f6",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              fontWeight: 600,
              padding: 0,
            }}
          >
            Manual Download <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
