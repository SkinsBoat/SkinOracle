import React from "react";
import { Loader2, RefreshCw, KeyRound, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { dmarketLogo } from "../../../../../assets/images";
import { WorkstationHeader } from "../../../components/WorkstationHeader";

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
      <WorkstationHeader
        logo={dmarketLogo}
        logoAlt="DMarket"
        title="DMarket Workstation"
        badge="Direct Device IPC"
        subtitle={
          <>
            {profileData?.username
              ? `Logged in as ${profileData.username}`
              : "Direct device API connection"}
            {profileData?.targetsLimit
              ? ` • Quota: ${targetCount}/${profileData.targetsLimit} Targets`
              : ""}
          </>
        }
        right={
          <div style={styles.balanceWidget}>
            <Wallet size={15} style={{ color: "#38bdf8" }} />
            <div>
              <div style={styles.balanceLabel}>DMarket USD Balance</div>
              <div className="tabular-nums" style={styles.balanceValue}>
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
              style={styles.refreshBtn}
            >
              {balanceLoading ? (
                <Loader2 size={12} className="spin" />
              ) : (
                <RefreshCw size={12} />
              )}
            </button>
          </div>
        }
      />

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

// ── EXTRACTED STYLES ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  balanceWidget: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "6px 14px",
    backgroundColor: "rgba(14, 165, 233, 0.08)",
    border: "1px solid rgba(14, 165, 233, 0.22)",
    borderRadius: "var(--so-radius-sm)",
  },
  balanceLabel: {
    fontSize: "9.5px",
    color: "var(--so-text-muted)",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  balanceValue: {
    fontSize: "15px",
    fontWeight: 900,
    color: "#ffffff",
  },
  refreshBtn: {
    padding: "3px 6px",
    marginLeft: "4px",
  },
};
