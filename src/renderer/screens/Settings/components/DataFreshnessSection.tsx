import React, { useState } from "react";
import {
  Clock,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useDataFreshnessStore } from "../../../store/useDataFreshnessStore";
import { formatTtlLabel } from "../../../utils/dataFreshness";

interface ExpiryPreset {
  label: string;
  minutes: number;
}

const PRESETS: ExpiryPreset[] = [
  { label: "1 hour", minutes: 60 },
  { label: "3 hours", minutes: 180 },
  { label: "6 hours", minutes: 360 },
  { label: "12 hours", minutes: 720 },
  { label: "24 hours", minutes: 1440 },
  { label: "Never", minutes: 0 },
];

const isPresetValue = (minutes: number): boolean =>
  PRESETS.some((p) => p.minutes === minutes);

interface ExpiryFieldProps {
  label: string;
  description: string;
  value: number;
  onChange: (minutes: number) => void;
}

const ExpiryField: React.FC<ExpiryFieldProps> = ({
  label,
  description,
  value,
  onChange,
}) => {
  const [customOpen, setCustomOpen] = useState(!isPresetValue(value));
  const [customValue, setCustomValue] = useState(() =>
    value > 0 && value % 60 === 0 ? value / 60 : Math.max(1, value || 1),
  );
  const [customUnit, setCustomUnit] = useState<"minutes" | "hours">(
    value > 0 && value % 60 === 0 ? "hours" : "minutes",
  );

  const applyCustom = (raw: number, unit: "minutes" | "hours") => {
    const safe = Number.isFinite(raw) ? Math.max(1, Math.round(raw)) : 1;
    setCustomValue(safe);
    setCustomUnit(unit);
    onChange(Math.round(safe * (unit === "hours" ? 60 : 1)));
  };

  const activePreset = isPresetValue(value) ? value : null;

  return (
    <div style={styles.controlRow}>
      <div style={styles.labelCol}>
        <span style={styles.controlLabel}>{label}</span>
        <span style={styles.controlDesc}>{description}</span>
      </div>
      <div style={styles.fieldRight}>
        <span style={styles.ttlSummary}>
          Expires after {formatTtlLabel(value)}
        </span>
        <div style={styles.chipGroup}>
          {PRESETS.map((preset) => (
            <button
              key={preset.minutes}
              type="button"
              onClick={() => {
                setCustomOpen(false);
                onChange(preset.minutes);
              }}
              style={getChipStyle(activePreset === preset.minutes)}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setCustomOpen(true);
              applyCustom(customValue, customUnit);
            }}
            style={getChipStyle(customOpen)}
          >
            Custom
          </button>
        </div>

        {customOpen && (
          <div style={styles.customGroup}>
            <input
              type="number"
              min={1}
              value={customValue}
              onChange={(e) => applyCustom(Number(e.target.value), customUnit)}
              style={styles.customInput}
              aria-label={`${label} custom value`}
            />
            <select
              value={customUnit}
              onChange={(e) =>
                applyCustom(
                  customValue,
                  e.target.value as "minutes" | "hours",
                )
              }
              style={styles.customSelect}
              aria-label={`${label} custom unit`}
            >
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
            </select>
            <span style={styles.customSummary}>= {formatTtlLabel(value)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const DataFreshnessSection: React.FC = () => {
  const {
    cacheExpiryMinutes,
    acceptedPriceExpiryMinutes,
    listingPriceExpiryMinutes,
    freshnessWarningsEnabled,
    setCacheExpiryMinutes,
    setAcceptedPriceExpiryMinutes,
    setListingPriceExpiryMinutes,
    setFreshnessWarningsEnabled,
    resetDefaults,
  } = useDataFreshnessStore();

  return (
    <div style={styles.container}>
      {/* Top Banner Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardIconBox}>
            <Clock size={18} style={{ color: "var(--so-primary)" }} />
          </div>
          <div>
            <h2 style={styles.cardTitle}>Data Freshness &amp; Expiry Windows</h2>
            <p style={styles.cardSubtitle}>
              Set how long locally held prices stay trustworthy. Workstations
              flag data past its window so you never act on stale ceilings or
              market prices.
            </p>
          </div>
          <button
            type="button"
            onClick={resetDefaults}
            style={styles.resetButton}
            title="Restore default freshness windows"
          >
            <RotateCcw size={13} />
            Reset Defaults
          </button>
        </div>

        <div style={styles.controlRow}>
          <div style={styles.labelCol}>
            <span style={styles.controlLabel}>
              Surface Stale-Data Warnings
            </span>
            <span style={styles.controlDesc}>
              Show a warning in workstations when cached prices or calculated
              ceilings are older than their configured expiry window. This is
              advisory only — no actions are blocked.
            </span>
          </div>
          <label style={styles.switchWrapper}>
            <input
              type="checkbox"
              checked={freshnessWarningsEnabled}
              onChange={(e) => setFreshnessWarningsEnabled(e.target.checked)}
              style={styles.hiddenCheckbox}
            />
            <span style={getSwitchTrackStyle(freshnessWarningsEnabled)}>
              <span style={getSwitchThumbStyle(freshnessWarningsEnabled)} />
            </span>
          </label>
        </div>
      </div>

      {/* Expiry Windows Card */}
      <div
        style={
          freshnessWarningsEnabled
            ? styles.card
            : styles.cardDisabled
        }
      >
        <div style={styles.sectionHeaderRow}>
          <div style={styles.sectionIconRow}>
            <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
            <h3 style={styles.sectionTitle}>Expiry Windows</h3>
          </div>
        </div>

        <ExpiryField
          label="Market Price Cache"
          description="Cached Skinsnipe / CS2Cap scan snapshots used for live SoClose matching. Short windows force fresher scans."
          value={cacheExpiryMinutes}
          onChange={setCacheExpiryMinutes}
        />
        <div style={styles.divider} />
        <ExpiryField
          label="Accepted Prices (Buy Ceilings)"
          description="Calculated accepted prices produced by the Oracle batch build. Drives drift detection and buy ceiling comparisons."
          value={acceptedPriceExpiryMinutes}
          onChange={setAcceptedPriceExpiryMinutes}
        />
        <div style={styles.divider} />
        <ExpiryField
          label="Listing Prices (Sell Targets)"
          description="Calculated listing prices used for inventory repricing and sell target suggestions."
          value={listingPriceExpiryMinutes}
          onChange={setListingPriceExpiryMinutes}
        />
      </div>

      {/* Information strip */}
      <div style={styles.infoStrip}>
        <ShieldCheck
          size={16}
          style={{ color: "var(--so-primary)", flexShrink: 0 }}
        />
        <span style={styles.infoText}>
          Set a window to <strong>Never</strong> to disable expiry for that
          dataset. Freshness is evaluated per dataset from its last update
          timestamp; preferences are preserved across app restarts.
        </span>
      </div>
    </div>
  );
};

// ── Pure Dynamic Style Helpers ─────────────────────────────────────
function getChipStyle(active: boolean): React.CSSProperties {
  return {
    padding: "4px 10px",
    borderRadius: "var(--so-radius-sm)",
    fontSize: "11.5px",
    fontWeight: 700,
    cursor: "pointer",
    backgroundColor: active
      ? "rgba(6, 182, 212, 0.14)"
      : "var(--so-surface-input)",
    border: active
      ? "1px solid rgba(6, 182, 212, 0.45)"
      : "1px solid var(--so-border-subtle)",
    color: active ? "#38bdf8" : "var(--so-text-secondary)",
    transition: "all 0.15s ease",
  };
}

function getSwitchTrackStyle(checked: boolean): React.CSSProperties {
  return {
    position: "relative",
    display: "inline-block",
    width: "40px",
    height: "22px",
    borderRadius: "12px",
    backgroundColor: checked
      ? "var(--so-primary)"
      : "rgba(255, 255, 255, 0.12)",
    transition: "background-color 0.2s ease",
    cursor: "pointer",
  };
}

function getSwitchThumbStyle(checked: boolean): React.CSSProperties {
  return {
    position: "absolute",
    top: "3px",
    left: checked ? "21px" : "3px",
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    backgroundColor: "#ffffff",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.4)",
    transition: "left 0.2s ease",
  };
}

// ── Static Styles ──────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  card: {
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "var(--so-radius-md, 8px)",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  cardDisabled: {
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "var(--so-radius-md, 8px)",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    opacity: 0.55,
    pointerEvents: "none",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  cardIconBox: {
    width: "36px",
    height: "36px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTitle: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
  },
  cardSubtitle: {
    margin: "4px 0 0 0",
    fontSize: "12px",
    color: "var(--so-text-secondary)",
    lineHeight: 1.5,
  },
  resetButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    marginLeft: "auto",
    padding: "8px 12px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "transparent",
    border: "1px solid var(--so-border-subtle)",
    color: "var(--so-text-muted)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    flexShrink: 0,
  },
  sectionHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: "10px",
    borderBottom: "1px solid var(--so-border-subtle)",
  },
  sectionIconRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
  },
  controlRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    padding: "6px 0",
  },
  labelCol: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    flex: 1,
    minWidth: 0,
  },
  controlLabel: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--so-text-primary)",
  },
  controlDesc: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
    lineHeight: 1.4,
  },
  fieldRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "6px",
    flexShrink: 0,
  },
  ttlSummary: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--so-primary)",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    padding: "1px 8px",
    borderRadius: "4px",
  },
  chipGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  customGroup: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  customInput: {
    width: 58,
    padding: "4px 8px",
    borderRadius: "var(--so-radius-sm)",
    fontSize: "12px",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-medium)",
    color: "var(--so-text-primary)",
  },
  customSelect: {
    padding: "4px 6px",
    borderRadius: "var(--so-radius-sm)",
    fontSize: "12px",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-medium)",
    color: "var(--so-text-primary)",
  },
  customSummary: {
    fontSize: "11.5px",
    color: "var(--so-text-muted)",
  },
  divider: {
    height: 1,
    backgroundColor: "var(--so-border-subtle)",
    margin: "4px 0",
  },
  switchWrapper: {
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
  },
  hiddenCheckbox: {
    position: "absolute",
    opacity: 0,
    width: 0,
    height: 0,
  },
  infoStrip: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "var(--so-radius-sm)",
    padding: "12px 16px",
  },
  infoText: {
    fontSize: "11px",
    color: "var(--so-text-secondary)",
    lineHeight: 1.5,
  },
};
