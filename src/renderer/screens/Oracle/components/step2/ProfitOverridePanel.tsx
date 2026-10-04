import React from "react";
import {
  Wand2,
  AlertTriangle,
  RotateCcw,
  Info,
  Activity,
  ShieldAlert,
  Layers,
  Check,
} from "lucide-react";
import {
  BuildPreFilters,
  DEFAULT_PROFIT_OVERRIDE_POLICY,
  ProfitOverridePolicy,
} from "../../../../store/useOracleStore";
import {
  applyProfitOverride,
  classifySss,
  classifyWear,
  computeEffectiveAdjustment,
} from "../../utils/profitOverride";

export interface ProfitOverridePreviewItem {
  name: string;
  oraclePrice: number;
  supplyStabilityScore: number;
  isHyperStable: boolean;
}

interface ProfitOverridePanelProps {
  policy: ProfitOverridePolicy;
  setPolicy: React.Dispatch<React.SetStateAction<ProfitOverridePolicy>>;
  preFilters: BuildPreFilters;
  previewItems: ProfitOverridePreviewItem[];
  onToggleEnabled: (nextEnabled: boolean) => void;
  onReapply?: () => void;
}

const MODE_OPTIONS: {
  id: ProfitOverridePolicy["mode"];
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "flat",
    label: "Flat Margin",
    desc: "One adjustment applied to every item.",
    icon: <Activity size={15} />,
  },
  {
    id: "wear",
    label: "Wear-Factored",
    desc: "Adjust per wear condition (FN → BS).",
    icon: <Layers size={15} />,
  },
  {
    id: "stability",
    label: "Stability-Factored",
    desc: "Adjust per supply-stability (SSS) band.",
    icon: <ShieldAlert size={15} />,
  },
  {
    id: "combined",
    label: "Combined",
    desc: "Base + wear + SSS deltas stacked.",
    icon: <Wand2 size={15} />,
  },
];

const WEAR_ROWS: {
  key: keyof ProfitOverridePolicy["wearAdjustments"];
  label: string;
  hint: string;
}[] = [
  { key: "fn", label: "Factory New", hint: "FN" },
  { key: "mw", label: "Minimal Wear", hint: "MW" },
  { key: "ft", label: "Field-Tested", hint: "FT" },
  { key: "ww", label: "Well-Worn", hint: "WW" },
  { key: "bs", label: "Battle-Scarred", hint: "BS" },
  { key: "vanilla", label: "Vanilla (Knives / Gloves)", hint: "No wear suffix" },
  { key: "stattrak", label: "StatTrak™", hint: "Modifier" },
  { key: "souvenir", label: "Souvenir", hint: "Modifier" },
];

const SSS_ROWS: {
  key: keyof ProfitOverridePolicy["sssAdjustments"];
  label: string;
  range: string;
}[] = [
  { key: "prime", label: "Prime / Strict", range: "SSS ≥ 1.20" },
  { key: "solid", label: "Solid", range: "SSS 1.00 – 1.20" },
  { key: "moderate", label: "Moderate", range: "SSS 0.50 – 1.00" },
  { key: "thin", label: "Thin", range: "SSS < 0.50" },
];

const clampPercent = (value: number) => Math.max(-50, Math.min(50, value));

export const ProfitOverridePanel: React.FC<ProfitOverridePanelProps> = ({
  policy,
  setPolicy,
  preFilters,
  previewItems,
  onToggleEnabled,
  onReapply,
}) => {
  const usesWear = policy.mode === "wear" || policy.mode === "combined";
  const usesSss = policy.mode === "stability" || policy.mode === "combined";
  const active = policy.enabled && policy.mode !== "off";

  const update = (patch: Partial<ProfitOverridePolicy>) =>
    setPolicy((p) => ({ ...p, ...patch }));

  const setWearDelta = (
    key: keyof ProfitOverridePolicy["wearAdjustments"],
    value: number,
  ) =>
    setPolicy((p) => ({
      ...p,
      wearAdjustments: { ...p.wearAdjustments, [key]: clampPercent(value) },
    }));

  const setSssDelta = (
    key: keyof ProfitOverridePolicy["sssAdjustments"],
    value: number,
  ) =>
    setPolicy((p) => ({
      ...p,
      sssAdjustments: { ...p.sssAdjustments, [key]: clampPercent(value) },
    }));

  const isWearRowVisible = (
    key: keyof ProfitOverridePolicy["wearAdjustments"],
  ) => {
    if (key === "stattrak") return !preFilters.excludeStatTrak;
    if (key === "souvenir") return !preFilters.excludeSouvenir;
    if (key === "vanilla") return preFilters.allowedWears.vanilla !== false;
    return preFilters.allowedWears[key] !== false;
  };

  const [sampleSeed, setSampleSeed] = React.useState(0);

  // Representative sample: prefer one item per distinct wear × SSS combo so
  // the preview actually exercises every active delta, rotated by sampleSeed
  // so the trader can shuffle through other items.
  const previewRows = React.useMemo(() => {
    if (previewItems.length === 0) return [];
    const max = 5;
    const picks: ProfitOverridePreviewItem[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < previewItems.length && picks.length < max; i++) {
      const item = previewItems[(i + sampleSeed) % previewItems.length];
      const key = `${classifyWear(item.name).wear}:${classifySss(
        item.supplyStabilityScore,
      )}`;
      if (seen.has(key)) continue;
      seen.add(key);
      picks.push(item);
    }
    // Fill any remaining slots with evenly spaced items when there is little
    // bucket diversity in the cache.
    if (picks.length < max) {
      const step = Math.max(1, Math.floor(previewItems.length / max));
      for (
        let i = 0;
        i < previewItems.length && picks.length < max;
        i += step
      ) {
        const item = previewItems[(i + sampleSeed) % previewItems.length];
        if (!picks.includes(item)) picks.push(item);
      }
    }
    return picks.map((item) => {
      const projected = applyProfitOverride(
        {
          acceptedPrice: item.oraclePrice,
          supplyStabilityScore: item.supplyStabilityScore,
          isHyperStable: item.isHyperStable,
        },
        item.name,
        policy,
      );
      return {
        name: item.name,
        wear: classifyWear(item.name).wear,
        band: classifySss(item.supplyStabilityScore),
        oraclePrice: item.oraclePrice,
        bidPrice: projected.acceptedPrice,
        adjustment: projected.appliedAdjustmentPercent ?? 0,
      };
    });
  }, [previewItems, policy, sampleSeed]);

  // Whole-cache summary so the panel shows the real blast radius, not 3 rows.
  const previewSummary = React.useMemo(() => {
    if (previewItems.length === 0) return null;
    let trimmed = 0;
    let premium = 0;
    let sumAdjustment = 0;
    for (const item of previewItems) {
      const adj = computeEffectiveAdjustment(policy, item.name, item);
      sumAdjustment += adj;
      if (adj < 0) trimmed++;
      else if (adj > 0) premium++;
    }
    return {
      total: previewItems.length,
      avgAdjustment: sumAdjustment / previewItems.length,
      trimmed,
      premium,
    };
  }, [previewItems, policy]);

  return (
    <div style={styles.panelContainer}>
      <div style={styles.headerRow}>
        <div style={styles.headerTitle}>
          <Wand2 size={16} style={styles.wandIcon} /> Section 4: Profit Override
          (Bid Policy)
        </div>
        <div style={styles.headerRight}>
          <button
            type="button"
            className={`btn btn-sm ${active ? "btn-primary" : "btn-ghost"}`}
            style={styles.enableBtn}
            onClick={() => onToggleEnabled(!policy.enabled)}
          >
            {active ? (
              <>
                <Check size={13} /> Override Active
              </>
            ) : (
              <>
                <Wand2 size={13} /> Enable Override
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            style={styles.enableBtn}
            onClick={() => setPolicy({ ...DEFAULT_PROFIT_OVERRIDE_POLICY })}
            title="Reset the override policy back to pure Oracle values."
          >
            <RotateCcw size={12} /> Revert
          </button>
        </div>
      </div>

      <p style={styles.subtitle}>
        Override the Oracle's accepted price (buy ceiling) with your own signed
        adjustment. Negative trims the ceiling for more margin; positive bids
        above the Oracle ceiling. The original Oracle value is always preserved.
      </p>

      {active && (
        <div style={styles.warningBanner}>
          <AlertTriangle size={14} style={styles.warningIcon} />
          <span>
            <strong>Override active.</strong> Buy ceilings are no longer pure
            Oracle values, and engine safety shields do not validate your custom
            margins. Recalculate or Re-apply to push the new ceilings.
          </span>
        </div>
      )}

      {/* Mode selector */}
      <div style={styles.modeGrid}>
        {MODE_OPTIONS.map((mode) => (
          <div
            key={mode.id}
            onClick={() =>
              setPolicy((p) => ({ ...p, mode: mode.id }))
            }
            style={getModeCardStyle(policy.mode === mode.id)}
          >
            <div style={getModeIconStyle(policy.mode === mode.id)}>
              {mode.icon}
            </div>
            <div>
              <div style={getModeTitleStyle(policy.mode === mode.id)}>
                {mode.label}
              </div>
              <div style={styles.modeDesc}>{mode.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Base signed adjustment — only meaningful for Flat and Combined */}
      {(policy.mode === "flat" || policy.mode === "combined") && (
      <div style={styles.card}>
        <div style={styles.cardHeaderRow}>
          <div style={styles.cardTitle}>
            <Activity size={14} style={styles.cardIconCyan} /> Base Bid
            Adjustment
          </div>
          <div style={getSignedValueStyle(policy.bidAdjustmentPercent)}>
            {formatSigned(policy.bidAdjustmentPercent)}%
          </div>
        </div>
        <div style={styles.cardDesc}>
          Applied to every item. Negative = trim (more margin). Positive = pay
          above the Oracle ceiling (aggressive).
        </div>
        <div style={styles.sliderRow}>
          <input
            type="range"
            min={-50}
            max={50}
            step={0.5}
            value={policy.bidAdjustmentPercent}
            onChange={(e) =>
              update({ bidAdjustmentPercent: Number(e.target.value) })
            }
            style={styles.slider}
          />
          <input
            type="number"
            min={-50}
            max={50}
            step={0.5}
            value={policy.bidAdjustmentPercent}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (Number.isFinite(parsed))
                update({ bidAdjustmentPercent: clampPercent(parsed) });
            }}
            style={styles.numberInput}
          />
          <span style={styles.unitText}>%</span>
        </div>
        <div style={styles.quickRow}>
          {[-20, -10, -5, 0, 5, 10].map((v) => (
            <button
              key={v}
              type="button"
              className="btn btn-sm btn-ghost"
              style={styles.quickBtn}
              onClick={() => update({ bidAdjustmentPercent: v })}
            >
              {formatSigned(v)}%
            </button>
          ))}
        </div>
      </div>
      )}

      {/* Wear-factored deltas */}
      {usesWear && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <Layers size={14} style={styles.cardIconPrimary} /> Wear Adjustments
          </div>
          <div style={styles.cardDesc}>
            Applied per item wear. Rows hidden by your Step 2 pre-filters are
            omitted.
          </div>
          <div style={styles.deltaGrid}>
            {WEAR_ROWS.filter((row) => isWearRowVisible(row.key)).map((row) => (
              <DeltaRow
                key={row.key}
                label={row.label}
                hint={row.hint}
                value={policy.wearAdjustments[row.key] ?? 0}
                onChange={(v) => setWearDelta(row.key, v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* SSS-factored deltas */}
      {usesSss && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <ShieldAlert size={14} style={styles.cardIconWarning} /> Stability
            (SSS) Adjustments
          </div>
          <div style={styles.cardDesc}>
            Applied per supply-stability band. Thinner supply stability usually
            deserves a heavier margin.
          </div>
          <div style={styles.deltaGrid}>
            {SSS_ROWS.map((row) => (
              <DeltaRow
                key={row.key}
                label={row.label}
                hint={row.range}
                value={policy.sssAdjustments[row.key] ?? 0}
                onChange={(v) => setSssDelta(row.key, v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Live preview */}
      {active && previewRows.length > 0 && (
        <div style={styles.card}>
          <div style={styles.previewHeaderRow}>
            <div style={styles.cardTitle}>
              <Info size={14} style={styles.cardIconCyan} /> Live Preview
            </div>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              style={styles.shuffleBtn}
              onClick={() => setSampleSeed((s) => s + 1)}
              title="Show a different representative sample."
            >
              <RotateCcw size={12} /> Shuffle
            </button>
          </div>
          <div style={styles.cardDesc}>
            Representative sample — one item per wear × stability combo, using
            the exact math that will be applied.
          </div>
          {previewSummary && (
            <div style={styles.summaryLine}>
              <span>
                <strong>{previewSummary.total.toLocaleString()}</strong> items
              </span>
              <span style={getSignedValueStyle(previewSummary.avgAdjustment)}>
                avg {formatSigned(previewSummary.avgAdjustment)}%
              </span>
              {previewSummary.trimmed > 0 && (
                <span style={styles.summaryTrim}>
                  {previewSummary.trimmed.toLocaleString()} trimmed
                </span>
              )}
              {previewSummary.premium > 0 && (
                <span style={styles.summaryPremium}>
                  {previewSummary.premium.toLocaleString()} above Oracle
                </span>
              )}
            </div>
          )}
          <div style={styles.previewTable}>
            <div style={styles.previewHeadRow}>
              <span style={{ flex: 1, minWidth: 0 }}>Item</span>
              <span style={styles.previewHeadCell}>Oracle</span>
              <span style={styles.previewHeadCell}>Your Bid</span>
              <span style={styles.previewHeadCell}>Δ</span>
            </div>
            {previewRows.map((row) => (
              <div key={row.name} style={styles.previewRow}>
                <span style={styles.previewNameCol}>
                  <span style={styles.previewName} title={row.name}>
                    {row.name}
                  </span>
                  <span style={styles.previewTags}>
                    <span style={styles.previewTag}>{row.wear.toUpperCase()}</span>
                    <span style={styles.previewTag}>SSS {row.band}</span>
                  </span>
                </span>
                <span style={styles.previewCell}>
                  ${row.oraclePrice.toFixed(2)}
                </span>
                <span style={styles.previewBidCell}>
                  ${row.bidPrice.toFixed(2)}
                </span>
                <span
                  style={getSignedValueStyle(row.adjustment, styles.deltaCell)}
                >
                  {formatSigned(row.adjustment)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary action: push the policy to stored buy ceilings */}
      {active && onReapply && (
        <div style={styles.actionRow}>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            style={styles.reapplyBtn}
            onClick={onReapply}
            title="Re-apply this policy to your stored buy ceilings instantly. Uses no valuation credits."
          >
            <RotateCcw size={15} /> Apply Override to Buy Ceilings
          </button>
          <span style={styles.actionHint}>
            Recomputes from the preserved Oracle values. No valuation credits
            are used.
          </span>
        </div>
      )}
    </div>
  );
};

const DeltaRow: React.FC<{
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}> = ({ label, hint, value, onChange }) => (
  <div style={styles.deltaRow}>
    <div style={styles.deltaLabelCol}>
      <span style={styles.deltaLabel}>{label}</span>
      <span style={styles.deltaHint}>{hint}</span>
    </div>
    <div style={styles.stepperRow}>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        style={styles.stepBtn}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span style={getSignedValueStyle(value, styles.deltaValue)}>
        {formatSigned(value)}%
      </span>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        style={styles.stepBtn}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  </div>
);

function formatSigned(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function getSignedValueStyle(
  value: number,
  base: React.CSSProperties = {},
): React.CSSProperties {
  const color =
    value > 0
      ? "var(--so-danger-text, #ef4444)"
      : value < 0
        ? "var(--so-success-text, #22c55e)"
        : "var(--so-text-muted)";
  return { ...styles.signedValue, ...base, color };
}

function getModeCardStyle(selected: boolean): React.CSSProperties {
  return {
    ...styles.modeCard,
    borderColor: selected
      ? "var(--so-primary, #6366f1)"
      : "var(--so-border-subtle)",
    backgroundColor: selected
      ? "rgba(99, 102, 241, 0.12)"
      : "var(--so-surface-input)",
  };
}

function getModeIconStyle(selected: boolean): React.CSSProperties {
  return {
    ...styles.modeIcon,
    color: selected ? "var(--so-primary)" : "var(--so-text-muted)",
    backgroundColor: selected
      ? "rgba(99, 102, 241, 0.2)"
      : "rgba(255,255,255,0.04)",
  };
}

function getModeTitleStyle(selected: boolean): React.CSSProperties {
  return {
    ...styles.modeTitle,
    color: selected ? "var(--so-text-primary)" : "var(--so-text-secondary)",
  };
}

const styles: Record<string, React.CSSProperties> = {
  panelContainer: {
    padding: "18px 20px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "rgba(99, 102, 241, 0.04)",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    marginBottom: "18px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
    gap: "8px",
  },
  headerTitle: {
    fontWeight: 800,
    fontSize: "14px",
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  wandIcon: {
    color: "var(--so-primary)",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  enableBtn: {
    fontSize: "11.5px",
    padding: "3px 10px",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  actionRow: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "6px",
    paddingTop: "12px",
    marginTop: "4px",
    borderTop: "1px solid var(--so-border-subtle)",
  },
  reapplyBtn: {
    width: "100%",
    height: "40px",
    fontSize: "13px",
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  actionHint: {
    fontSize: "10.5px",
    color: "var(--so-text-muted)",
    textAlign: "center",
  },
  subtitle: {
    fontSize: "12.5px",
    color: "var(--so-text-muted)",
    marginBottom: "12px",
  },
  warningBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    padding: "9px 12px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    border: "1px solid rgba(245, 158, 11, 0.4)",
    fontSize: "11.5px",
    color: "var(--so-warning-text, #f59e0b)",
    marginBottom: "14px",
    lineHeight: 1.45,
  },
  warningIcon: {
    flexShrink: 0,
    marginTop: "1px",
  },
  modeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "10px",
    marginBottom: "14px",
  },
  modeCard: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "var(--so-radius-sm)",
    border: "1px solid var(--so-border-subtle)",
    cursor: "pointer",
    transition: "all 0.16s ease",
    userSelect: "none",
  },
  modeIcon: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  modeTitle: {
    fontSize: "12px",
    fontWeight: 700,
  },
  modeDesc: {
    fontSize: "10.5px",
    color: "var(--so-text-muted)",
  },
  card: {
    padding: "12px 14px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-subtle)",
    marginBottom: "12px",
  },
  cardHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "4px",
  },
  cardIconCyan: { color: "var(--so-cyan-text)" },
  cardIconPrimary: { color: "var(--so-primary)" },
  cardIconWarning: { color: "var(--so-warning-text, #f59e0b)" },
  cardDesc: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
    marginBottom: "8px",
  },
  sliderRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  slider: {
    flex: 1,
    accentColor: "var(--so-primary, #6366f1)",
    cursor: "pointer",
  },
  numberInput: {
    width: 76,
    height: 30,
    backgroundColor: "var(--so-surface-panel)",
    color: "var(--so-text-primary)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-sm)",
    padding: "0 8px",
    textAlign: "center",
    fontSize: "12px",
  },
  unitText: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  quickRow: {
    display: "flex",
    gap: "6px",
    marginTop: "8px",
    flexWrap: "wrap",
  },
  quickBtn: {
    fontSize: "11px",
    padding: "2px 8px",
  },
  signedValue: {
    fontSize: "12px",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  },
  deltaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "8px",
  },
  deltaRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    padding: "6px 10px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
  },
  deltaLabelCol: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  deltaLabel: {
    fontSize: "11.5px",
    color: "var(--so-text-primary)",
    fontWeight: 600,
  },
  deltaHint: {
    fontSize: "10px",
    color: "var(--so-text-muted)",
  },
  stepperRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexShrink: 0,
  },
  stepBtn: {
    width: 26,
    height: 26,
    padding: 0,
    fontSize: "14px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  deltaValue: {
    minWidth: 48,
    textAlign: "center",
  },
  previewTable: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  previewHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shuffleBtn: {
    fontSize: "10.5px",
    padding: "2px 8px",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  summaryLine: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "10px",
    fontSize: "11px",
    color: "var(--so-text-muted)",
    padding: "6px 8px",
    marginBottom: "8px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
  },
  summaryTrim: {
    color: "var(--so-success-text, #22c55e)",
  },
  summaryPremium: {
    color: "var(--so-danger-text, #ef4444)",
  },
  previewNameCol: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  previewTags: {
    display: "flex",
    gap: "4px",
  },
  previewTag: {
    fontSize: "9px",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    color: "var(--so-text-muted)",
    border: "1px solid var(--so-border-subtle)",
    borderRadius: "4px",
    padding: "0 4px",
  },
  previewHeadRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "var(--so-text-muted)",
    padding: "6px",
    border: "1px solid transparent",
  },
  previewHeadCell: {
    width: 74,
    textAlign: "right",
  },
  previewRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
  },
  previewName: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "11.5px",
    color: "var(--so-text-primary)",
  },
  previewCell: {
    width: 74,
    textAlign: "right",
    fontSize: "11.5px",
    color: "var(--so-text-muted)",
    fontVariantNumeric: "tabular-nums",
  },
  previewBidCell: {
    width: 74,
    textAlign: "right",
    fontSize: "11.5px",
    color: "var(--so-text-primary)",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  },
  deltaCell: {
    width: 74,
    textAlign: "right",
    flexShrink: 0,
  },
};
