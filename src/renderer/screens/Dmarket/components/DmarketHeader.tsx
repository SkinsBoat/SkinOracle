import React from "react";
import { Loader2, RefreshCw, KeyRound, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { dmarketLogo } from "../../../../../assets/images";

interface DmarketHeaderProps {
  profileData: {
    username?: string;
    targetsLimit?: number;
    imageUrl?: string;
  } | null;
  balanceData: {
    usdFormatted?: string;
    usdCents?: number;
    dmc?: string;
  } | null;
  balanceLoading: boolean;
  targetCount: number;
  hasKey: boolean | null;
  onRefreshBalance: () => void;
}

export const DmarketHeader: React.FC<DmarketHeaderProps> = ({
  profileData,
  balanceData,
  balanceLoading,
  targetCount,
  hasKey,
  onRefreshBalance,
}) => {
  return (
    <>
      {/* ── WORKSTATION HEADER ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          backgroundColor: "var(--so-surface-card)",
          border: "1px solid var(--so-border-medium)",
          borderRadius: "var(--so-radius-md)",
          padding: "14px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <img
            src={dmarketLogo}
            alt="DMarket"
            style={{ width: "36px", height: "36px", objectFit: "contain" }}
          />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1
                style={{
                  fontSize: "19px",
                  fontWeight: 800,
                  color: "var(--so-text-primary)",
                  margin: 0,
                }}
              >
                DMarket Workstation
              </h1>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(56, 189, 248, 0.12)",
                  color: "var(--so-accent-cyan)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                }}
              >
                Direct Device IPC
              </span>
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--so-text-muted)",
                marginTop: "3px",
              }}
            >
              {profileData?.username
                ? `Logged in as ${profileData.username}`
                : "Direct device API connection"}
              {profileData?.targetsLimit
                ? ` • Quota: ${targetCount}/${profileData.targetsLimit} Targets`
                : ""}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Balance Indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "6px 14px",
              backgroundColor: "rgba(14, 165, 233, 0.08)",
              border: "1px solid rgba(14, 165, 233, 0.22)",
              borderRadius: "var(--so-radius-sm)",
            }}
          >
            <Wallet size={15} style={{ color: "#38bdf8" }} />
            <div>
              <div
                style={{
                  fontSize: "9.5px",
                  color: "var(--so-text-muted)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                }}
              >
                DMarket USD Balance
              </div>
              <div
                className="tabular-nums"
                style={{ fontSize: "15px", fontWeight: 900, color: "#ffffff" }}
              >
                {balanceLoading ? (
                  <Loader2 size={13} className="spin" />
                ) : (
                  balanceData?.usdFormatted || "$0.00"
                )}
              </div>
            </div>
            <button
              onClick={onRefreshBalance}
              disabled={balanceLoading}
              className="btn btn-secondary btn-sm"
              title="Refresh Balance"
              style={{ padding: "3px 6px", marginLeft: "4px" }}
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

      {/* API Key Missing Warning Banner */}
      {hasKey === false && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            backgroundColor: "var(--so-warning-bg)",
            border: "1px solid var(--so-warning-border)",
            borderRadius: "var(--so-radius-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <KeyRound size={18} style={{ color: "var(--so-warning)" }} />
            <span
              style={{
                fontSize: "12.5px",
                color: "var(--so-warning-text)",
                fontWeight: 600,
              }}
            >
              DMarket API keys are not configured. You need your Public and
              Secret keys to manage targets.
            </span>
          </div>
          <Link
            to="/settings"
            className="btn btn-primary btn-sm"
            style={{
              textDecoration: "none",
              padding: "5px 12px",
              fontSize: "12px",
            }}
          >
            Configure in Settings
          </Link>
        </div>
      )}
    </>
  );
};
