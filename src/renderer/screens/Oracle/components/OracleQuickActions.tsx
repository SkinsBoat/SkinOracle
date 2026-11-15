import React, { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Timer, Clock, Zap, RotateCw, Loader2 } from "lucide-react";
import {
  runBuildAcceptedPrices,
  runScanWide,
  runScanSnipe,
} from "../utils/oracleActions";

/**
 * Minimal Oracle quick-action pill row: 3 icon pills in one line, styled to
 * match the WorkstationDataStatusCards cache pills so it sits cleanly next to
 * them. No logic here — all three actions reuse the shared implementation in
 * `oracleActions.ts`.
 */
export interface OracleQuickActionsProps {
  className?: string;
}

export const OracleQuickActions: React.FC<OracleQuickActionsProps> = ({
  className,
}) => {
  const [busy, setBusy] = useState(false);
  const [calcPercent, setCalcPercent] = useState<number | null>(null);

  const handleScanWide = useCallback(async () => {
    await runScanWide();
  }, []);

  const handleScanSnipe = useCallback(async () => {
    await runScanSnipe();
  }, []);

  const handleCalcAccepted = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setCalcPercent(null);
    try {
      await runBuildAcceptedPrices({
        setEvaluatedSummary: () => {},
        toast,
      });
    } finally {
      setBusy(false);
      setCalcPercent(null);
    }
  }, [busy]);

  return (
    <div
      className={className || ""}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        ...getCardStyle(),
      }}
    >
      <OraclePill
        label="w"
        icon={<Timer size={11} style={pillIcon} />}
        onClick={handleScanWide}
        disabled={busy}
        active={false}
      />
      <OraclePill
        label="s"
        icon={<Clock size={11} style={pillIcon} />}
        onClick={handleScanSnipe}
        disabled={busy}
        active={false}
      />
      <OraclePill
        label={calcPercent != null ? `c ${calcPercent}%` : "c"}
        icon={
          busy || calcPercent != null ? (
            <Loader2 size={11} className="spin" style={pillIcon} />
          ) : (
            <Zap size={11} style={pillIcon} />
          )
        }
        onClick={handleCalcAccepted}
        disabled={busy}
        active={busy}
      />
    </div>
  );
};

const OraclePill: React.FC<{
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}> = ({ label, icon, onClick, disabled, active }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={getPillStyle(active, disabled)}
  >
    {icon}
    <span style={pillText}>{label}</span>
  </button>
);

const pillIcon: React.CSSProperties = { flexShrink: 0, opacity: 0.9 };

function getCardStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 9px",
    border: `1px solid var(--so-border-medium)`,
    borderRadius: "10px",
    backgroundColor: "var(--so-surface-panel)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  };
}

function getPillStyle(active: boolean, disabled = false): React.CSSProperties {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "3px 11px",
    borderRadius: "9px",
    border: `1px solid ${
      active
        ? "var(--so-primary)"
        : "var(--so-border-subtle)"
    }`,
    backgroundColor: active
      ? "var(--so-primary)"
      : "transparent",
    color: active
      ? "#ffffff"
      : "var(--so-text-secondary)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.2px",
    whiteSpace: "nowrap",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
  } as React.CSSProperties;

  if (disabled) {
    base.opacity = 0.45;
    base.cursor = "not-allowed";
  }

  return base;
}

const pillText: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  letterSpacing: "0.2px",
  whiteSpace: "nowrap",
};
