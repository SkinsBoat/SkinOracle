import React from "react";
import { Sliders } from "lucide-react";
import { useOracleStore } from "../../../store/useOracleStore";

export const AdvancedToolsSection: React.FC = () => {
  const { showProfitOverride, setShowProfitOverride } = useOracleStore();

  return (
    <div style={styles.container}>
      {/* Section Header */}
      <div>
        <h2 style={styles.sectionHeading}>
          <Sliders size={22} style={{ color: "var(--so-primary)" }} />
          Advanced Pricing Tools
        </h2>
        <p style={styles.sectionSubtitle}>
          Opt-in controls that extend the Oracle with manual bid policies.
          Hidden by default to keep the core workflow focused for everyday use.
        </p>
      </div>

      {/* Profit Override (Bid Policy) Card */}
      <div style={styles.card}>
        <div style={styles.cardHeaderRow}>
          <div style={styles.cardHeaderLeft}>
            <div style={styles.iconBox}>
              <Sliders size={20} style={{ color: "var(--so-primary)" }} />
            </div>
            <div>
              <div style={styles.cardTitle}>Profit Override (Bid Policy)</div>
              <p style={styles.cardDesc}>
                Adjust Oracle buy ceilings with your own signed margins, per
                wear condition, and per supply-stability band. Enabling this
                reveals the Profit Override section in Calculate Accepted
                Prices. The original Oracle value is always preserved.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showProfitOverride}
            onClick={() => setShowProfitOverride(!showProfitOverride)}
            style={getToggleStyle(showProfitOverride)}
            title="Reveal the Profit Override (Bid Policy) section in Oracle Step 2"
          >
            <span style={getToggleKnobStyle(showProfitOverride)} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Extracted Styles Dictionary (Rule 9: Zero inline styles in render flow)
// ─────────────────────────────────────────────────────────────────────────────
function getToggleStyle(on: boolean): React.CSSProperties {
  return {
    ...styles.toggleTrack,
    backgroundColor: on ? "var(--so-primary)" : "var(--so-border-medium)",
  };
}

function getToggleKnobStyle(on: boolean): React.CSSProperties {
  return {
    ...styles.toggleKnob,
    transform: on ? "translateX(16px)" : "translateX(0)",
  };
}

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
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
  },
  cardHeaderRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
  },
  cardHeaderLeft: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    minWidth: 0,
  },
  iconBox: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: "15px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    marginBottom: "4px",
  },
  cardDesc: {
    fontSize: "12.5px",
    color: "var(--so-text-secondary)",
    margin: 0,
    lineHeight: 1.45,
  },
  toggleTrack: {
    width: "38px",
    height: "22px",
    borderRadius: "11px",
    padding: "2px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    cursor: "pointer",
    border: "none",
    flexShrink: 0,
    transition: "background-color 0.18s ease",
  },
  toggleKnob: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    backgroundColor: "#ffffff",
    transition: "transform 0.18s ease",
  },
};
