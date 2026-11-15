import React, { useState, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Timer,
  Clock,
  Zap,
  Tag,
} from "lucide-react";
import {
  runBuildAcceptedPrices,
  runBuildListingPrices,
  runScanWide,
  runScanSnipe,
} from "../utils/oracleActions";

/**
 * Configurable Oracle quick-action pill row.
 *
 * Each workstation passes `which` to pick the actions it needs (default:
 * wide / calc / snipe). All actions reuse the shared implementation in
 * `oracleActions.ts` — no logic duplicated.
 *
 *   - "wide"  — Scan Wide (baseline scope, auto-refresh off)
 *   - "snipe" — Scan Snipe (snipe scope, auto-refresh on)
 *   - "calc"  — Calculate Accepted Prices (Buy Ceilings)
 *   - "calcListing" — Generate Listing Prices (Sell Targets)
 *
 * Pass `onCalcListing` to override the default listing-prices handler (useful
 * for workstations that load listing prices from their own state).
 */
export type OracleQuickAction = "wide" | "snipe" | "calc" | "calcListing";

export interface OracleQuickActionsProps {
  className?: string;
  which?: OracleQuickAction[];
  onCalcListing?: () => void | Promise<void>;
}

const DEFAULT_WHICH: OracleQuickAction[] = ["wide", "calc", "snipe"];

const pillIcon: React.CSSProperties = { flexShrink: 0, opacity: 0.9 };

const ACTION_LABELS: Record<OracleQuickAction, string> = {
  wide: "w",
  snipe: "s",
  calc: "c",
  calcListing: "l",
};

const ACTION_ICONS: Record<OracleQuickAction, React.ReactNode> = {
  wide: <Timer size={11} style={pillIcon} />,
  snipe: <Clock size={11} style={pillIcon} />,
  calc: <Zap size={11} style={pillIcon} />,
  calcListing: <Tag size={11} style={pillIcon} />,
};

/**
 * Minimal Oracle quick-action pill row styled to match the
 * WorkstationDataStatusCards cache pills. Sits cleanly next to them.
 */
export const OracleQuickActions: React.FC<OracleQuickActionsProps> = ({
  className,
  which = DEFAULT_WHICH,
  onCalcListing,
}) => {
  const [busyActions, setBusyActions] = useState<Set<OracleQuickAction>>(
    new Set(),
  );

  const isBusy = (key: OracleQuickAction) => busyActions.has(key);
  const anyBusy = busyActions.size > 0;

  const handleScanWide = useCallback(async () => {
    setBusyActions((prev) => new Set([...prev, "wide"]));
    try {
      await runScanWide();
    } finally {
      setBusyActions((prev) => {
        const next = new Set(prev);
        next.delete("wide");
        return next;
      });
    }
  }, []);

  const handleScanSnipe = useCallback(async () => {
    setBusyActions((prev) => new Set([...prev, "snipe"]));
    try {
      await runScanSnipe();
    } finally {
      setBusyActions((prev) => {
        const next = new Set(prev);
        next.delete("snipe");
        return next;
      });
    }
  }, []);

  const handleCalcAccepted = useCallback(async () => {
    if (isBusy("calc")) return;
    setBusyActions((prev) => new Set([...prev, "calc"]));
    try {
      await runBuildAcceptedPrices({
        setEvaluatedSummary: () => {},
        toast,
      });
    } finally {
      setBusyActions((prev) => {
        const next = new Set(prev);
        next.delete("calc");
        return next;
      });
    }
  }, [isBusy]);

  const handleCalcListing = useCallback(async () => {
    if (isBusy("calcListing")) return;
    setBusyActions((prev) => new Set([...prev, "calcListing"]));
    try {
      if (onCalcListing) {
        await onCalcListing();
      } else {
        await runBuildListingPrices({
          setListingSummary: () => {},
          toast,
        });
      }
    } finally {
      setBusyActions((prev) => {
        const next = new Set(prev);
        next.delete("calcListing");
        return next;
      });
    }
  }, [isBusy, onCalcListing]);

  const handlers: Record<OracleQuickAction, () => Promise<void>> = useMemo(
    () => ({
      wide: handleScanWide,
      snipe: handleScanSnipe,
      calc: handleCalcAccepted,
      calcListing: handleCalcListing,
    }),
    [handleScanWide, handleScanSnipe, handleCalcAccepted, handleCalcListing],
  );

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
      {which.map((key) => {
        const active = isBusy(key);
        const label = active ? `${ACTION_LABELS[key]}…` : ACTION_LABELS[key];
        return (
          <OraclePill
            key={key}
            label={label}
            icon={ACTION_ICONS[key]}
            onClick={handlers[key]}
            disabled={anyBusy}
            active={active}
          />
        );
      })}
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
      ? "rgba(6, 182, 212, 0.1)"
      : "transparent",
    color: active
      ? "var(--so-primary)"
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
