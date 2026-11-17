import React, { useState, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import {
  ScanSearch,
  Crosshair,
  Calculator,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  runBuildAcceptedPrices,
  runBuildListingPrices,
  runScanWide,
  runScanSnipe,
} from "../utils/oracleActions";

// ─── Keyframes injected once ──────────────────────────────────────────────────
(function injectStyles() {
  const ID = "oracle-qa-kf";
  if (typeof document === "undefined" || document.getElementById(ID)) return;
  const s = document.createElement("style");
  s.id = ID;
  s.textContent = `
    @keyframes oqa-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes oqa-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.65; }
    }
  `;
  document.head.appendChild(s);
})();

// ─── Types ────────────────────────────────────────────────────────────────────

export type OracleQuickAction = "wide" | "snipe" | "calc" | "calcListing";

export interface OracleQuickActionsProps {
  className?: string;
  which?: OracleQuickAction[];
  onCalcListing?: () => void | Promise<void>;
}

const DEFAULT_WHICH: OracleQuickAction[] = ["wide", "calc", "snipe"];

const cm = (token: string, pct: number) =>
  `color-mix(in srgb, var(${token}) ${pct}%, transparent)`;

// ─── Unified theme tokens (Solid Royal Blue & Sky Blue) ───────────────────────
// Sourced from app design tokens: --so-primary (#2563eb) & --so-cyan (#38bdf8)
const UNIFIED_ACCENT = {
  idle:         "var(--so-text-muted)",
  active:       "var(--so-cyan)",          // #38bdf8 - crisp high-contrast sky blue
  border:       cm("--so-primary", 45),
  borderActive: "var(--so-primary)",       // #2563eb - app primary royal blue
  bg:           cm("--so-primary", 12),
  glow:         cm("--so-primary", 35),
};

interface ActionMeta {
  label: string;
  icon: React.ReactNode;
  hideSpinner?: boolean;
}

const ACTION_META: Record<OracleQuickAction, ActionMeta> = {
  wide: {
    label: "Wide",
    icon: <ScanSearch size={13} />,
    hideSpinner: true,
  },
  snipe: {
    label: "Snipe",
    icon: <Crosshair size={13} />,
  },
  calc: {
    label: "Calc",
    icon: <Calculator size={13} />,
  },
  calcListing: {
    label: "List",
    icon: <TrendingUp size={13} />,
  },
};

// ─── Root Component ───────────────────────────────────────────────────────────

export const OracleQuickActions: React.FC<OracleQuickActionsProps> = ({
  className,
  which = DEFAULT_WHICH,
  onCalcListing,
}) => {
  const [busyActions, setBusyActions] = useState<Set<OracleQuickAction>>(new Set());
  const [isSnipeActive, setIsSnipeActive] = useState<boolean>(false);

  const isBusy = useCallback((k: OracleQuickAction) => busyActions.has(k), [busyActions]);
  const anyBusy = busyActions.size > 0;

  const withBusy = useCallback(
    (key: OracleQuickAction, fn: () => Promise<void>) => async () => {
      if (busyActions.has(key)) return;
      setBusyActions((p) => new Set([...p, key]));
      try {
        await fn();
      } finally {
        setBusyActions((p) => {
          const n = new Set(p);
          n.delete(key);
          return n;
        });
      }
    },
    [busyActions],
  );

  const handleScanWide = useCallback(async () => {
    setIsSnipeActive(false);
    await withBusy("wide", runScanWide)();
  }, [withBusy]);

  const handleScanSnipe = useCallback(async () => {
    setIsSnipeActive(true);
    await withBusy("snipe", runScanSnipe)();
  }, [withBusy]);

  const handleCalcAccepted = useCallback(async () => {
    setIsSnipeActive(false);
    await withBusy("calc", async () => {
      await runBuildAcceptedPrices({ setEvaluatedSummary: () => {}, toast });
    })();
  }, [withBusy]);

  const handleCalcListing = useCallback(async () => {
    await withBusy("calcListing", () =>
      onCalcListing
        ? Promise.resolve(onCalcListing())
        : runBuildListingPrices({ setListingSummary: () => {}, toast }),
    )();
  }, [withBusy, onCalcListing]);

  const handlers = useMemo(
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
      style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
    >
      {which.map((key) => (
        <ActionBtn
          key={key}
          meta={ACTION_META[key]}
          onClick={handlers[key]}
          dimmed={anyBusy && !isBusy(key)}
          busy={isBusy(key)}
          isLit={key === "snipe" && isSnipeActive}
        />
      ))}
    </div>
  );
};

// ─── ActionBtn ────────────────────────────────────────────────────────────────

const BTN = 38;
const RADIUS = 7;

const ActionBtn: React.FC<{
  meta: ActionMeta;
  onClick: () => void;
  dimmed?: boolean;
  busy?: boolean;
  isLit?: boolean;
}> = ({ meta, onClick, dimmed, busy, isLit: isLitExternal }) => {
  const [hovered, setHovered] = useState(false);
  const accent = UNIFIED_ACCENT;
  const lit = hovered || busy || isLitExternal;

  const showSpinner = busy && !meta.hideSpinner;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={dimmed || busy}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: `${BTN}px`,
        height: `${BTN}px`,
        flexShrink: 0,
        padding: 0,
        overflow: "hidden",
        borderRadius: `${RADIUS}px`,
        background: lit ? accent.bg : "var(--so-surface-card)",
        border: `1px solid ${
          isLitExternal
            ? accent.borderActive
            : lit
              ? accent.border
              : "var(--so-border-medium)"
        }`,
        boxShadow: isLitExternal
          ? `0 0 0 1px ${accent.borderActive}, 0 0 8px ${accent.glow}, inset 0 1px 2px rgba(0,0,0,0.35)`
          : lit && !busy
            ? `0 0 0 1px ${accent.glow}`
            : "none",
        animation: busy ? "oqa-pulse 1.3s ease-in-out infinite" : "none",
        color: lit ? accent.active : accent.idle,
        opacity: dimmed ? 0.28 : 1,
        cursor: dimmed ? "not-allowed" : busy ? "wait" : "pointer",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        outline: "none",
        transition:
          "background 150ms ease, border-color 150ms ease, color 150ms ease, box-shadow 150ms ease, opacity 150ms ease",
      }}
    >
      {/* ── Active Snipe indicator pip & strip (Electric Sky Blue) ── */}
      {isLitExternal && !busy && (
        <>
          <span
            style={{
              position: "absolute",
              top: "3px",
              right: "3px",
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              backgroundColor: "var(--so-cyan)",
              boxShadow: "0 0 5px var(--so-cyan), 0 0 1px #fff",
              pointerEvents: "none",
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: 0,
              left: "6px",
              right: "6px",
              height: "2px",
              borderRadius: "2px 2px 0 0",
              backgroundColor: "var(--so-cyan)",
              boxShadow: "0 0 6px var(--so-cyan)",
              pointerEvents: "none",
            }}
          />
        </>
      )}

      {/* ── Icon ── */}
      <span
        style={{
          position: "absolute",
          display: "inline-flex",
          marginBottom: "7px",
          opacity: showSpinner ? 0 : 1,
          transform: showSpinner ? "scale(0.5)" : "scale(1)",
          transition: "opacity 140ms ease, transform 140ms ease",
          pointerEvents: "none",
        }}
      >
        {meta.icon}
      </span>

      {/* ── Spinner (omitted when hideSpinner is set, e.g. Wide scan) ── */}
      {!meta.hideSpinner && (
        <span
          style={{
            position: "absolute",
            display: "inline-flex",
            marginBottom: "7px",
            opacity: showSpinner ? 1 : 0,
            transform: showSpinner ? "scale(1)" : "scale(0.5)",
            transition: "opacity 140ms ease, transform 140ms ease",
          }}
        >
          <Loader2
            size={13}
            style={{ animation: busy ? "oqa-spin 0.75s linear infinite" : "none" }}
          />
        </span>
      )}

      {/* ── Short label below icon ── */}
      <span
        style={{
          position: "absolute",
          bottom: "5px",
          fontSize: "8px",
          fontWeight: 700,
          letterSpacing: "0.3px",
          lineHeight: 1,
          color: lit ? accent.active : "var(--so-text-muted)",
          opacity: lit ? 0.95 : 0.45,
          transition: "color 150ms ease, opacity 150ms ease",
          userSelect: "none",
        }}
      >
        {meta.label}
      </span>
    </button>
  );
};
