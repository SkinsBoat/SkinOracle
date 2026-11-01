import React from "react";
import { Check, Database, Calculator, Tag, Search, Lock } from "lucide-react";

export interface OracleStepperProps {
  cacheCount: number;
  acceptedCount: number;
  listingCount: number;
  onNavigate: (step: 1 | 2 | 3) => void;
  onOpenLookup: () => void;
}

interface StepDefinition {
  id: 1 | 2 | 3 | 4;
  label: string;
  hint: string;
  icon: React.ReactNode;
  complete: boolean;
  locked: boolean;
  onClick: () => void;
}

/**
 * Horizontal progress stepper for the Oracle flow. The stepper is navigation
 * only — it scrolls to the step section and never collapses sibling steps.
 */
export const OracleStepper: React.FC<OracleStepperProps> = ({
  cacheCount,
  acceptedCount,
  listingCount,
  onNavigate,
  onOpenLookup,
}) => {
  const cacheReady = cacheCount > 0;

  const steps: StepDefinition[] = [
    {
      id: 1,
      label: "Market Data",
      hint: cacheReady
        ? `${cacheCount.toLocaleString()} prices cached`
        : "Scan markets first",
      icon: <Database size={15} />,
      complete: cacheReady,
      locked: false,
      onClick: () => onNavigate(1),
    },
    {
      id: 2,
      label: "Buy Ceilings",
      hint: !cacheReady
        ? "Requires Step 1"
        : acceptedCount > 0
          ? `${acceptedCount.toLocaleString()} calculated`
          : "Ready to calculate",
      icon: <Calculator size={15} />,
      complete: acceptedCount > 0,
      locked: !cacheReady,
      onClick: () => onNavigate(2),
    },
    {
      id: 3,
      label: "Sell Targets",
      hint: !cacheReady
        ? "Requires Step 1"
        : listingCount > 0
          ? `${listingCount.toLocaleString()} generated`
          : "Ready to generate",
      icon: <Tag size={15} />,
      complete: listingCount > 0,
      locked: !cacheReady,
      onClick: () => onNavigate(3),
    },
    {
      id: 4,
      label: "Single Lookup",
      hint: "Ad-hoc inspection",
      icon: <Search size={15} />,
      complete: false,
      locked: false,
      onClick: onOpenLookup,
    },
  ];

  return (
    <div style={styles.stepper} role="list" aria-label="Oracle workflow steps">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <button
            type="button"
            role="listitem"
            onClick={step.onClick}
            style={getStepStyle(step.complete, step.locked)}
            title={step.locked ? "Complete Step 1 first" : step.label}
          >
            <span style={getStepIndexStyle(step.complete, step.locked)}>
              {step.locked ? (
                <Lock size={12} />
              ) : step.complete ? (
                <Check size={13} />
              ) : (
                step.icon
              )}
            </span>
            <span style={styles.stepText}>
              <span style={styles.stepLabel}>{step.label}</span>
              <span style={styles.stepHint}>{step.hint}</span>
            </span>
          </button>
          {index < steps.length - 1 && (
            <span
              style={getConnectorStyle(steps[index + 1].locked)}
              aria-hidden="true"
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  stepper: {
    display: "flex",
    alignItems: "stretch",
    gap: "6px",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    padding: "8px",
  },
  stepText: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  },
  stepLabel: {
    fontSize: "12.5px",
    fontWeight: 800,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  },
  stepHint: {
    fontSize: "10.5px",
    color: "var(--so-text-muted)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};

const getStepStyle = (
  complete: boolean,
  locked: boolean,
): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 10px",
  borderRadius: "var(--so-radius-sm)",
  border: `1px solid ${
    complete && !locked
      ? "rgba(56, 189, 248, 0.35)"
      : "var(--so-border-subtle)"
  }`,
  backgroundColor:
    complete && !locked ? "rgba(56, 189, 248, 0.08)" : "transparent",
  color: locked ? "var(--so-text-muted)" : "var(--so-text-primary)",
  cursor: locked ? "not-allowed" : "pointer",
  opacity: locked ? 0.65 : 1,
  transition:
    "background-color var(--so-duration-fast) var(--so-ease-out), border-color var(--so-duration-fast) var(--so-ease-out)",
  flex: 1,
  minWidth: 0,
  textAlign: "left",
});

const getStepIndexStyle = (
  complete: boolean,
  locked: boolean,
): React.CSSProperties => ({
  width: "22px",
  height: "22px",
  borderRadius: "50%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  border: `1px solid ${
    complete && !locked
      ? "rgba(56, 189, 248, 0.5)"
      : "var(--so-border-2)"
  }`,
  backgroundColor:
    complete && !locked ? "rgba(56, 189, 248, 0.15)" : "var(--so-surface-3)",
  color: locked
    ? "var(--so-text-muted)"
    : complete
      ? "var(--so-cyan-text)"
      : "var(--so-text-secondary)",
});

const getConnectorStyle = (locked: boolean): React.CSSProperties => ({
  width: "18px",
  alignSelf: "center",
  height: "1px",
  flexShrink: 0,
  backgroundColor: locked ? "var(--so-border-0)" : "var(--so-border-2)",
});
