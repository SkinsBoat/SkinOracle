import React from "react";
import {
  TrendingUp,
  Shield,
  Scale,
  Rocket,
  Layers,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { NexusStrategyProfile } from "../../../../store/useOracleStore";
import { NEXUS_PRESETS } from "../../utils/oracleUtils";

interface NexusLabControlsProps {
  nexusProfile: NexusStrategyProfile;
  setNexusProfile: React.Dispatch<React.SetStateAction<NexusStrategyProfile>>;
}

export const NexusLabControls: React.FC<NexusLabControlsProps> = ({
  nexusProfile,
  setNexusProfile,
}) => {
  const applyNexusPreset = (
    presetName: "capital_shield" | "balanced" | "aggressive",
  ) => {
    setNexusProfile(NEXUS_PRESETS[presetName]);
  };

  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: "var(--so-radius-md)",
        backgroundColor: "rgba(99, 102, 241, 0.05)",
        border: "1px solid rgba(99, 102, 241, 0.35)",
        marginBottom: "18px",
        animation: "fadeIn 0.2s ease-in-out",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: "14px",
            color: "var(--so-text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <TrendingUp size={16} style={{ color: "var(--so-primary)" }} />{" "}
          Section 3: Nexus Trend Intelligence & Capital Shield
        </div>

        {/* Quick Nexus Presets */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            className={`btn btn-sm ${nexusProfile.preset === "capital_shield" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => applyNexusPreset("capital_shield")}
            style={{
              fontSize: "11.5px",
              padding: "3px 10px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Shield size={13} /> Capital Shield
          </button>
          <button
            type="button"
            className={`btn btn-sm ${nexusProfile.preset === "balanced" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => applyNexusPreset("balanced")}
            style={{
              fontSize: "11.5px",
              padding: "3px 10px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Scale size={13} /> Balanced Momentum
          </button>
          <button
            type="button"
            className={`btn btn-sm ${nexusProfile.preset === "aggressive" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => applyNexusPreset("aggressive")}
            style={{
              fontSize: "11.5px",
              padding: "3px 10px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Rocket size={13} /> Aggressive
          </button>
        </div>
      </div>

      <p
        style={{
          fontSize: "12.5px",
          color: "var(--so-text-muted)",
          marginBottom: "14px",
        }}
      >
        Dynamically penalizes crashing items to shield capital, while awarding
        cautious upside bonus for verified rising trends.
      </p>

      {/* Nexus Modular Card Selectors */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "14px",
        }}
      >
        {/* 1. Trend Horizon Window */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "var(--so-radius-sm)",
            backgroundColor: "var(--so-surface-input)",
            border: "1px solid var(--so-border-subtle)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--so-text-primary)",
              marginBottom: "4px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Layers size={14} style={{ color: "var(--so-cyan-text)" }} /> Trend
            Time Horizon
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--so-text-muted)",
              marginBottom: "8px",
            }}
          >
            Window of historical data for linear regression slope
          </div>

          <select
            value={nexusProfile.trendWindow}
            onChange={(e) =>
              setNexusProfile((p) => ({
                ...p,
                preset: "custom",
                trendWindow: Number(e.target.value) as any,
              }))
            }
            style={{
              width: "100%",
              fontSize: "12px",
              padding: "6px 8px",
              borderRadius: "var(--so-radius-sm)",
            }}
          >
            <option value={14}>14 Days (Optimal Balance)</option>
            <option value={7}>7 Days (Fast Momentum / Breakout)</option>
            <option value={30}>30 Days (Macro Stability)</option>
          </select>
        </div>

        {/* 2. Downside Crash Protection */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "var(--so-radius-sm)",
            backgroundColor: "var(--so-surface-input)",
            border: "1px solid var(--so-border-subtle)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--so-text-primary)",
              marginBottom: "4px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <ShieldAlert
              size={14}
              style={{ color: "var(--so-danger-text, #ef4444)" }}
            />{" "}
            Downside Crash Cut
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--so-text-muted)",
              marginBottom: "8px",
            }}
          >
            Maximum haircut applied to declining skin prices
          </div>

          <select
            value={nexusProfile.downsideCut}
            onChange={(e) =>
              setNexusProfile((p) => ({
                ...p,
                preset: "custom",
                downsideCut: e.target.value as any,
              }))
            }
            style={{
              width: "100%",
              fontSize: "12px",
              padding: "6px 8px",
              borderRadius: "var(--so-radius-sm)",
            }}
          >
            <option value="strict">
              Strict (-10% Safety Cut — Capital Shield)
            </option>
            <option value="standard">
              Standard (-8% Safety Cut — Balanced)
            </option>
            <option value="light">Light (-5% Cut — Permissive)</option>
          </select>
        </div>

        {/* 3. Volatility Filter Shield */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "var(--so-radius-sm)",
            backgroundColor: "var(--so-surface-input)",
            border: "1px solid var(--so-border-subtle)",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--so-text-primary)",
              marginBottom: "4px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Activity
              size={14}
              style={{ color: "var(--so-warning-text, #f59e0b)" }}
            />{" "}
            Volatility Noise Shield
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--so-text-muted)",
              marginBottom: "8px",
            }}
          >
            Dampens trend bonus on erratic price spikes
          </div>

          <select
            value={nexusProfile.volatilityFilter}
            onChange={(e) =>
              setNexusProfile((p) => ({
                ...p,
                preset: "custom",
                volatilityFilter: e.target.value as any,
              }))
            }
            style={{
              width: "100%",
              fontSize: "12px",
              padding: "6px 8px",
              borderRadius: "var(--so-radius-sm)",
            }}
          >
            <option value="strict">Strict Shield (High Noise Dampening)</option>
            <option value="standard">Standard Adaptive Shield</option>
            <option value="permissive">Permissive (Tolerate Volatility)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
