import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Loader2,
  Play,
  RefreshCw,
  Square,
  Timer,
} from "lucide-react";
import { useOracleStore } from "../../../../store/useOracleStore";
import type { AutoRefreshStatus } from "../../../../../shared/types/autoRefresh.types";

const PRESET_MINUTES = [15, 30, 60, 120];

const formatInterval = (minutes: number): string => {
  if (minutes % 60 === 0 && minutes >= 60) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  return `${minutes} min`;
};

export const AutoRefreshControl: React.FC = () => {
  const pricingProvider = useOracleStore((s) => s.pricingProvider);
  const selectedMarkets = useOracleStore((s) => s.selectedMarkets);
  const selectedCs2capProviders = useOracleStore(
    (s) => s.selectedCs2capProviders,
  );

  const api = window.electronAPI?.autoRefresh;

  const [status, setStatus] = useState<AutoRefreshStatus | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(30);
  const [customValue, setCustomValue] = useState<number>(4);
  const [customUnit, setCustomUnit] = useState<"minutes" | "hours">("hours");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Collapsed by default; auto-refresh starts OFF on every app open.
  const [isExpanded, setIsExpanded] = useState(false);

  const customMinutes = Math.max(
    1,
    Math.round(customValue * (customUnit === "hours" ? 60 : 1)),
  );
  const effectiveMinutes = selectedMinutes ?? customMinutes;

  const stateRef = useRef({ enabled: false, minutes: effectiveMinutes });
  useEffect(() => {
    stateRef.current = {
      enabled: !!status?.enabled,
      minutes: effectiveMinutes,
    };
  }, [status?.enabled, effectiveMinutes]);

  // Restore scheduler state from the main process and subscribe to updates.
  useEffect(() => {
    if (!api) return;
    let mounted = true;

    api
      .getStatus()
      .then((s) => {
        if (!mounted || !s) return;
        setStatus(s);
        if (PRESET_MINUTES.includes(s.intervalMinutes)) {
          setSelectedMinutes(s.intervalMinutes);
        } else {
          setSelectedMinutes(null);
          if (s.intervalMinutes % 60 === 0) {
            setCustomValue(s.intervalMinutes / 60);
            setCustomUnit("hours");
          } else {
            setCustomValue(s.intervalMinutes);
            setCustomUnit("minutes");
          }
        }
      })
      .catch(() => {});

    const unsubscribe = api.onStatusUpdated((s) => {
      if (mounted && s) setStatus(s);
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [api]);

  // 1s ticker for the live countdown.
  useEffect(() => {
    if (!status?.enabled) return;
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, [status?.enabled]);

  const pushConfig = useCallback(
    async (enabled: boolean, minutes?: number) => {
      if (!api) return;
      try {
        const next = await api.setConfig({
          enabled,
          intervalMinutes: minutes ?? effectiveMinutes,
          provider: pricingProvider,
          markets: selectedMarkets,
          providers: selectedCs2capProviders,
        });
        if (next) setStatus(next);
      } catch {
        /* Scheduler errors are surfaced through status broadcasts. */
      }
    },
    [
      api,
      effectiveMinutes,
      pricingProvider,
      selectedMarkets,
      selectedCs2capProviders,
    ],
  );

  // Keep the main-process scheduler pointed at the latest provider selection.
  useEffect(() => {
    if (!api || !stateRef.current.enabled) return;
    void pushConfig(true);
  }, [
    api,
    pushConfig,
    pricingProvider,
    selectedMarkets,
    selectedCs2capProviders,
  ]);

  const handleToggle = async () => {
    if (!api || busy) return;
    setBusy(true);
    await pushConfig(!status?.enabled);
    setBusy(false);
  };

  const handlePreset = (minutes: number) => {
    setSelectedMinutes(minutes);
    if (status?.enabled) void pushConfig(true, minutes);
  };

  const handleCustomChange = (value: number, unit: "minutes" | "hours") => {
    const safeValue = Number.isFinite(value) ? Math.max(1, value) : 1;
    setSelectedMinutes(null);
    setCustomValue(safeValue);
    setCustomUnit(unit);
    const minutes = Math.max(
      1,
      Math.round(safeValue * (unit === "hours" ? 60 : 1)),
    );
    if (status?.enabled) void pushConfig(true, minutes);
  };

  const handleRunNow = async () => {
    if (!api || busy) return;
    setBusy(true);
    const next = await api.runNow().catch(() => null);
    if (next) setStatus(next);
    setBusy(false);
  };

  const handleStop = async () => {
    if (!api || busy) return;
    setBusy(true);
    const next = await api.stop().catch(() => null);
    if (next) setStatus(next);
    setBusy(false);
  };

  const isEnabled = !!status?.enabled;
  const providerLabel = pricingProvider === "cs2cap" ? "CS2Cap" : "Skinsnipe";

  let nextRunLabel: string | null = null;
  if (isEnabled) {
    if (status?.isRunning) {
      nextRunLabel = "Cycle running…";
    } else if (status?.nextRunAt) {
      const remaining = Math.max(0, new Date(status.nextRunAt).getTime() - now);
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      nextRunLabel = `Next cycle in ${mins}m ${secs.toString().padStart(2, "0")}s`;
    } else {
      nextRunLabel = "Scheduling next cycle…";
    }
  }

  return (
    <div style={getContainerStyle(isEnabled)}>
      <div
        style={getHeaderStyle(isEnabled)}
        onClick={() => setIsExpanded((v) => !v)}
        role="button"
        aria-expanded={isExpanded}
        title={
          isExpanded
            ? "Collapse auto-refresh settings"
            : "Expand auto-refresh settings"
        }
      >
        <div style={styles.headerTitleGroup}>
          <Timer
            size={16}
            style={isEnabled ? styles.iconActive : styles.icon}
          />
          <span style={styles.title}>Auto-Refresh Cycle</span>
          <span
            className={`badge ${isEnabled ? "badge-success" : "badge-ghost"}`}
            style={styles.badge}
          >
            {isEnabled ? "ACTIVE" : "OFF"}
          </span>
        </div>

        <div style={styles.headerRight}>
          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            onClick={(e) => {
              e.stopPropagation();
              void handleToggle();
            }}
            disabled={!api || busy}
            style={getToggleButtonStyle(isEnabled, !api || busy)}
            title={
              isEnabled
                ? "Turn off automatic price refresh"
                : "Start automatic price refresh for this provider"
            }
          >
            <span style={getToggleTrackStyle(isEnabled)}>
              <span style={getToggleKnobStyle(isEnabled)} />
            </span>
            <span style={styles.toggleLabel}>
              {isEnabled ? "Auto-Refresh On" : "Auto-Refresh Off"}
            </span>
          </button>

          <ChevronDown size={18} style={getChevronStyle(isExpanded)} />
        </div>
      </div>

      <div style={getCollapseStyle(isExpanded)}>
        <div style={getCollapseInnerStyle(isExpanded)}>
          <div style={styles.body}>
            <p style={styles.description}>
              Repeats the {providerLabel} price cycle automatically. The
              countdown starts only after the previous cycle finishes, and
              scheduling runs in the background so it keeps cycling while you
              work on other screens.
            </p>

            <div style={styles.intervalRow}>
              <span style={styles.intervalLabel}>Cycle Interval:</span>
              <div style={styles.chipGroup}>
                {PRESET_MINUTES.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => handlePreset(minutes)}
                    style={getChipStyle(selectedMinutes === minutes)}
                  >
                    {formatInterval(minutes)}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setSelectedMinutes(null)}
                  style={getChipStyle(selectedMinutes === null)}
                >
                  Custom
                </button>

                {selectedMinutes === null && (
                  <div style={styles.customGroup}>
                    <input
                      type="number"
                      min={1}
                      value={customValue}
                      onChange={(e) =>
                        handleCustomChange(Number(e.target.value), customUnit)
                      }
                      style={styles.customInput}
                      aria-label="Custom interval value"
                    />
                    <select
                      value={customUnit}
                      onChange={(e) =>
                        handleCustomChange(
                          customValue,
                          e.target.value as "minutes" | "hours",
                        )
                      }
                      style={styles.customSelect}
                      aria-label="Custom interval unit"
                    >
                      <option value="minutes">minutes</option>
                      <option value="hours">hours</option>
                    </select>
                    <span style={styles.customSummary}>
                      = {formatInterval(customMinutes)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {isEnabled && (
              <div style={styles.statusPanel}>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Status</span>
                  <span style={styles.statusValue}>
                    {status?.isRunning ? (
                      <>
                        <Loader2 size={12} className="spin" /> Running
                      </>
                    ) : (
                      <>
                        <span style={getDotStyle(status?.lastCycleStatus)} />{" "}
                        {status?.lastCycleStatus === "error"
                          ? "Error"
                          : "Scheduled"}
                      </>
                    )}
                  </span>
                </div>

                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Provider</span>
                  <span style={styles.statusValue}>{providerLabel}</span>
                </div>

                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Cycles Completed</span>
                  <span style={styles.statusValueMono}>
                    {status?.cycleCount ?? 0}
                  </span>
                </div>

                {nextRunLabel && (
                  <div style={styles.statusItem}>
                    <span style={styles.statusLabel}>Next</span>
                    <span style={styles.statusValueHighlight}>
                      {nextRunLabel}
                    </span>
                  </div>
                )}

                <div style={styles.actions}>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={handleRunNow}
                    disabled={busy || status?.isRunning}
                    style={styles.actionButton}
                    title="Run a cycle now and restart the countdown"
                  >
                    <Play size={12} /> Run Now
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={handleStop}
                    disabled={busy}
                    style={styles.stopButton}
                    title="Stop automatic refresh"
                  >
                    <Square size={12} /> Stop
                  </button>
                </div>
              </div>
            )}

            {isEnabled &&
              status?.lastCycleStatus === "error" &&
              status.lastError && (
                <div style={styles.errorText}>
                  <RefreshCw size={12} /> {status.lastError}
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC STYLE HELPERS ─────────────────────────

function getContainerStyle(isEnabled: boolean): React.CSSProperties {
  return {
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-panel)",
    border: isEnabled
      ? "1px solid rgba(6, 182, 212, 0.35)"
      : "1px solid var(--so-border-subtle)",
    boxShadow: isEnabled ? "0 2px 12px rgba(6, 182, 212, 0.12)" : "none",
    marginBottom: "20px",
    overflow: "hidden",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  };
}

function getHeaderStyle(isEnabled: boolean): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    padding: "14px 18px",
    cursor: "pointer",
    userSelect: "none",
    backgroundColor: isEnabled ? "rgba(6, 182, 212, 0.05)" : "transparent",
    transition: "background-color 0.2s ease",
  };
}

function getChevronStyle(isExpanded: boolean): React.CSSProperties {
  return {
    color: "var(--so-text-muted)",
    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
    transition: "transform 0.3s cubic-bezier(0.25, 1, 0.35, 1)",
    flexShrink: 0,
  };
}

function getCollapseStyle(isExpanded: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateRows: isExpanded ? "1fr" : "0fr",
    transition: "grid-template-rows 0.35s cubic-bezier(0.25, 1, 0.35, 1)",
    overflow: "hidden",
  };
}

function getCollapseInnerStyle(isExpanded: boolean): React.CSSProperties {
  return {
    minHeight: 0,
    overflow: "hidden",
    opacity: isExpanded ? 1 : 0,
    transition: "opacity 0.25s ease",
  };
}

function getToggleButtonStyle(
  isEnabled: boolean,
  disabled: boolean,
): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "5px 10px",
    borderRadius: "var(--so-radius-sm)",
    fontSize: "12px",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    backgroundColor: isEnabled
      ? "rgba(6, 182, 212, 0.12)"
      : "rgba(255, 255, 255, 0.04)",
    border: isEnabled
      ? "1px solid rgba(6, 182, 212, 0.4)"
      : "1px solid var(--so-border-medium)",
    color: isEnabled ? "#38bdf8" : "var(--so-text-muted)",
    opacity: disabled ? 0.6 : 1,
    transition: "all 0.15s ease",
  };
}

function getToggleTrackStyle(isEnabled: boolean): React.CSSProperties {
  return {
    width: 30,
    height: 16,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    padding: 2,
    backgroundColor: isEnabled ? "#06b6d4" : "var(--so-border-strong)",
    transition: "background-color 0.15s ease",
  };
}

function getToggleKnobStyle(isEnabled: boolean): React.CSSProperties {
  return {
    width: 12,
    height: 12,
    borderRadius: "50%",
    backgroundColor: "#ffffff",
    transform: isEnabled ? "translateX(14px)" : "translateX(0)",
    transition: "transform 0.15s ease",
  };
}

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

function getDotStyle(
  cycleStatus: AutoRefreshStatus["lastCycleStatus"] | undefined,
): React.CSSProperties {
  return {
    display: "inline-block",
    width: 7,
    height: 7,
    borderRadius: "50%",
    backgroundColor:
      cycleStatus === "error" ? "#ef4444" : "var(--so-text-muted)",
  };
}

const styles: Record<string, React.CSSProperties> = {
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexShrink: 0,
  },
  body: {
    padding: "0 18px 16px",
  },
  headerTitleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  title: {
    fontSize: "14px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
  },
  icon: {
    color: "var(--so-text-muted)",
  },
  iconActive: {
    color: "#06b6d4",
  },
  badge: {
    fontSize: "10px",
    letterSpacing: "0.5px",
  },
  toggleLabel: {
    whiteSpace: "nowrap",
  },
  description: {
    fontSize: "12.5px",
    color: "var(--so-text-muted)",
    margin: "8px 0 12px",
    lineHeight: 1.5,
  },
  intervalRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  intervalLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--so-text-secondary)",
  },
  chipGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
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
  statusPanel: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap",
    marginTop: "14px",
    paddingTop: "12px",
    borderTop: "1px solid var(--so-border-subtle)",
  },
  statusItem: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  statusLabel: {
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
    color: "var(--so-text-muted)",
  },
  statusValue: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "12.5px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
  },
  statusValueMono: {
    fontSize: "12.5px",
    fontWeight: 800,
    fontFamily: "monospace",
    color: "var(--so-text-primary)",
  },
  statusValueHighlight: {
    fontSize: "12.5px",
    fontWeight: 800,
    fontFamily: "monospace",
    color: "#38bdf8",
  },
  actions: {
    display: "flex",
    gap: "8px",
    marginLeft: "auto",
  },
  actionButton: {
    fontSize: "12px",
    padding: "4px 10px",
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
  },
  stopButton: {
    fontSize: "12px",
    padding: "4px 10px",
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    color: "#f87171",
  },
  errorText: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "10px",
    fontSize: "12px",
    color: "#f87171",
  },
};
