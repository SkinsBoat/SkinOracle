import React from "react";
import {
  Cpu,
  TrendingUp,
  Check,
  Compass,
  Shield,
  Scale,
  Rocket,
  Activity,
  ShieldAlert,
} from "lucide-react";
import { OracleStrategyProfile } from "../../../../store/useOracleStore";

export const STRATEGY_PRESETS: Record<string, OracleStrategyProfile> = {
  conservative: {
    preset: "conservative",
    liquidityDepth: "strict",
    valuationMargin: "conservative",
    outlierProtection: "strict",
  },
  balanced: {
    preset: "balanced",
    liquidityDepth: "moderate",
    valuationMargin: "standard",
    outlierProtection: "standard",
  },
  aggressive: {
    preset: "aggressive",
    liquidityDepth: "broad",
    valuationMargin: "competitive",
    outlierProtection: "permissive",
  },
};

interface EngineStrategyPanelProps {
  selectedEngine: "standard" | "nexus";
  setSelectedEngine: (engine: "standard" | "nexus") => void;
  unitCostCents: number;
  nexusUnitCostCents: number;
  strategyProfile: OracleStrategyProfile;
  setStrategyProfile: React.Dispatch<
    React.SetStateAction<OracleStrategyProfile>
  >;
}

export const EngineStrategyPanel: React.FC<EngineStrategyPanelProps> = ({
  selectedEngine,
  setSelectedEngine,
  unitCostCents,
  nexusUnitCostCents,
  strategyProfile,
  setStrategyProfile,
}) => {
  const applyBasePreset = (
    presetName: "conservative" | "balanced" | "aggressive",
  ) => {
    setStrategyProfile(STRATEGY_PRESETS[presetName]);
  };

  return (
    <>
      {/* ── Engine / AI Model Selector Cards ── */}
      <div style={styles.engineSection}>
        <div style={styles.engineSectionTitle}>
          Select Valuation Engine Model
        </div>
        <div style={styles.engineGrid}>
          {/* Option 1: SkinOracle v20 Standard */}
          <div
            onClick={() => setSelectedEngine("standard")}
            style={getEngineCardStyle(selectedEngine === "standard", "standard")}
          >
            <div style={getEngineIconBoxStyle(selectedEngine === "standard", "standard")}>
              <Cpu size={20} />
            </div>
            <div style={styles.engineCardContent}>
              <div style={styles.engineTitleRow}>
                <span style={getEngineTitleStyle(selectedEngine === "standard")}>
                  SkinOracle v20 Standard
                </span>
                <span className="badge badge-ghost" style={styles.costBadge}>
                  {unitCostCents}¢ / item ($
                  {((unitCostCents * 10000) / 100).toFixed(2)} / 10k)
                </span>
              </div>
              <div style={styles.engineDesc}>
                Multi-market weighted cross-sectional evaluation & outlier cap
                shield.
              </div>
            </div>
            {selectedEngine === "standard" && (
              <Check size={18} style={styles.cyanCheckIcon} />
            )}
          </div>

          {/* Option 2: OracleNexus v2 Pro */}
          <div
            onClick={() => setSelectedEngine("nexus")}
            style={getEngineCardStyle(selectedEngine === "nexus", "nexus")}
          >
            <div style={getEngineIconBoxStyle(selectedEngine === "nexus", "nexus")}>
              <TrendingUp size={20} />
            </div>
            <div style={styles.engineCardContent}>
              <div style={styles.engineTitleRow}>
                <span style={getEngineTitleStyle(selectedEngine === "nexus")}>
                  🧬 OracleNexus v2 Pro
                </span>
                <span className="badge badge-primary" style={styles.costBadge}>
                  {nexusUnitCostCents}¢ / item ($
                  {((nexusUnitCostCents * 10000) / 100).toFixed(2)} / 10k)
                </span>
              </div>
              <div style={styles.engineDesc}>
                Dynamic trend intelligence: momentum, crash detection &
                volatility haircut.
              </div>
            </div>
            {selectedEngine === "nexus" && (
              <Check size={18} style={styles.primaryCheckIcon} />
            )}
          </div>
        </div>
      </div>

      {/* ── Section 2: Oracle Strategy & Risk Parameters ── */}
      <div style={styles.strategyPanel}>
        <div style={styles.strategyHeaderRow}>
          <div style={styles.strategyTitle}>
            <Compass size={16} style={styles.compassIcon} />{" "}
            Section 2: Valuation Strategy & Risk Profile
          </div>

          {/* Quick Strategy Presets */}
          <div style={styles.presetButtonsRow}>
            <button
              type="button"
              className={`btn btn-sm ${strategyProfile.preset === "conservative" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => applyBasePreset("conservative")}
              style={styles.presetBtn}
            >
              <Shield size={13} /> Conservative
            </button>
            <button
              type="button"
              className={`btn btn-sm ${strategyProfile.preset === "balanced" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => applyBasePreset("balanced")}
              style={styles.presetBtn}
            >
              <Scale size={13} /> Balanced
            </button>
            <button
              type="button"
              className={`btn btn-sm ${strategyProfile.preset === "aggressive" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => applyBasePreset("aggressive")}
              style={styles.presetBtn}
            >
              <Rocket size={13} /> Aggressive
            </button>
          </div>
        </div>

        <p style={styles.strategySubtitle}>
          Configure your trading aggressiveness, market depth preference, and
          spike protection.
        </p>

        {/* Strategy Control Selectors */}
        <div style={styles.controlsGrid}>
          {/* 1. Market Liquidity Depth */}
          <div style={styles.controlCard}>
            <div style={styles.controlTitle}>
              <Activity size={14} style={styles.activityIcon} />{" "}
              Market Volume Threshold
            </div>
            <div style={styles.controlDesc}>
              Controls minimum market activity required for pricing
            </div>

            <select
              value={strategyProfile.liquidityDepth}
              onChange={(e) =>
                setStrategyProfile((s) => ({
                  ...s,
                  preset: "custom",
                  liquidityDepth: e.target.value as any,
                }))
              }
              style={styles.selectInput}
            >
              <option value="strict">High Volume Only (Ultra Safe)</option>
              <option value="moderate">Moderate Volume (Standard)</option>
              <option value="broad">
                Broad Coverage (Include Niche Items)
              </option>
            </select>
          </div>

          {/* 2. Valuation Margin Profile */}
          <div style={styles.controlCard}>
            <div style={styles.controlTitle}>
              <Cpu size={14} style={styles.cpuIcon} /> Pricing
              Target Profile
            </div>
            <div style={styles.controlDesc}>
              Controls valuation aggressiveness for buy orders
            </div>

            <select
              value={strategyProfile.valuationMargin}
              onChange={(e) =>
                setStrategyProfile((s) => ({
                  ...s,
                  preset: "custom",
                  valuationMargin: e.target.value as any,
                }))
              }
              style={styles.selectInput}
            >
              <option value="conservative">
                Conservative (-5% Risk Buffer)
              </option>
              <option value="standard">Standard (Optimal Yield)</option>
              <option value="competitive">
                Competitive (+3% Aggressive Execution)
              </option>
            </select>
          </div>

          {/* 3. Outlier & Spike Protection */}
          <div style={styles.controlCard}>
            <div style={styles.controlTitle}>
              <ShieldAlert
                size={14}
                style={styles.shieldAlertIcon}
              />{" "}
              Spike Protection Filter
            </div>
            <div style={styles.controlDesc}>
              Filters temporary price spikes across market listings
            </div>

            <select
              value={strategyProfile.outlierProtection}
              onChange={(e) =>
                setStrategyProfile((s) => ({
                  ...s,
                  preset: "custom",
                  outlierProtection: e.target.value as any,
                }))
              }
              style={styles.selectInput}
            >
              <option value="strict">
                Strict Spike Shield (Filter Volatile Spikes)
              </option>
              <option value="standard">Standard Spike Filter</option>
              <option value="permissive">
                Permissive (Include High Listings)
              </option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
};

// ── EXTRACTED STYLES & DYNAMIC STYLE HELPERS ─────────────────────────

function getEngineCardStyle(
  isSelected: boolean,
  engineType: "standard" | "nexus"
): React.CSSProperties {
  let backgroundColor = "var(--so-surface-panel)";
  let border = "1px solid var(--so-border-medium)";
  let boxShadow = "none";

  if (isSelected) {
    if (engineType === "standard") {
      backgroundColor = "rgba(14, 165, 233, 0.10)";
      border = "2px solid var(--so-cyan-text, #0ea5e9)";
      boxShadow = "0 0 16px rgba(14, 165, 233, 0.15)";
    } else {
      backgroundColor = "rgba(99, 102, 241, 0.12)";
      border = "2px solid var(--so-primary, #6366f1)";
      boxShadow = "0 0 16px rgba(99, 102, 241, 0.22)";
    }
  }

  return {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px 16px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor,
    border,
    boxShadow,
    cursor: "pointer",
    transition: "all 0.18s ease",
    userSelect: "none",
  };
}

function getEngineIconBoxStyle(
  isSelected: boolean,
  engineType: "standard" | "nexus"
): React.CSSProperties {
  let backgroundColor = "var(--so-surface-input)";
  let color = "var(--so-text-muted)";

  if (isSelected) {
    if (engineType === "standard") {
      backgroundColor = "rgba(14, 165, 233, 0.25)";
      color = "var(--so-cyan-text)";
    } else {
      backgroundColor = "rgba(99, 102, 241, 0.25)";
      color = "var(--so-primary)";
    }
  }

  return {
    width: 38,
    height: 38,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor,
    color,
  };
}

function getEngineTitleStyle(isSelected: boolean): React.CSSProperties {
  return {
    fontSize: "13.5px",
    fontWeight: 800,
    color: isSelected ? "#fff" : "var(--so-text-primary)",
  };
}

const styles: Record<string, React.CSSProperties> = {
  engineSection: {
    marginBottom: "18px",
  },
  engineSectionTitle: {
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    color: "var(--so-text-muted)",
    marginBottom: "8px",
  },
  engineGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "12px",
  },
  engineCardContent: {
    flex: 1,
  },
  engineTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  costBadge: {
    fontSize: "10.5px",
    padding: "2px 8px",
  },
  engineDesc: {
    fontSize: "11.5px",
    color: "var(--so-text-muted)",
    marginTop: "2px",
  },
  cyanCheckIcon: {
    color: "var(--so-cyan-text)",
  },
  primaryCheckIcon: {
    color: "var(--so-primary)",
  },
  strategyPanel: {
    padding: "18px 20px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    marginBottom: "18px",
  },
  strategyHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
  },
  strategyTitle: {
    fontWeight: 800,
    fontSize: "14px",
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  compassIcon: {
    color: "var(--so-cyan-text)",
  },
  presetButtonsRow: {
    display: "flex",
    gap: "6px",
  },
  presetBtn: {
    fontSize: "11.5px",
    padding: "3px 10px",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  strategySubtitle: {
    fontSize: "12.5px",
    color: "var(--so-text-muted)",
    marginBottom: "14px",
  },
  controlsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "14px",
  },
  controlCard: {
    padding: "12px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-subtle)",
  },
  controlTitle: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
    marginBottom: "4px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  activityIcon: {
    color: "var(--so-cyan-text)",
  },
  cpuIcon: {
    color: "var(--so-primary)",
  },
  shieldAlertIcon: {
    color: "var(--so-warning-text)",
  },
  controlDesc: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
    marginBottom: "8px",
  },
  selectInput: {
    width: "100%",
    fontSize: "12px",
    padding: "6px 8px",
    borderRadius: "var(--so-radius-sm)",
  },
};

