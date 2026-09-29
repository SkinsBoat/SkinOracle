import React from "react";

// ── DYNAMIC STYLE HELPERS ────────────────────────────────────────────

export function getAccordionCardStyle(isOpen: boolean): React.CSSProperties {
  return {
    ...step1Styles.cardContainer,
    borderColor: isOpen ? "var(--so-border-strong)" : "var(--so-border-medium)",
    boxShadow: isOpen ? "0 4px 20px rgba(0, 0, 0, 0.2)" : "none",
    transition: "border-color 0.25s ease, box-shadow 0.25s ease",
  };
}

export function getAccordionHeaderStyle(isOpen: boolean): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    backgroundColor: isOpen
      ? "var(--so-surface-panel)"
      : "var(--so-surface-card)",
    borderBottom: "1px solid",
    borderBottomColor: isOpen ? "var(--so-border-subtle)" : "transparent",
    cursor: "pointer",
    userSelect: "none",
    transition: "background-color 0.25s ease, border-color 0.25s ease",
  };
}

export function getAccordionCollapseStyle(isOpen: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateRows: isOpen ? "1fr" : "0fr",
    transition: "grid-template-rows 0.5s cubic-bezier(0.25, 1, 0.35, 1)",
    overflow: "hidden",
  };
}

export function getAccordionInnerStyle(isOpen: boolean): React.CSSProperties {
  return {
    minHeight: 0,
    overflow: "hidden",
    opacity: isOpen ? 1 : 0,
    transform: isOpen ? "translateY(0)" : "translateY(-8px)",
    transition:
      "opacity 0.4s cubic-bezier(0.25, 1, 0.35, 1), transform 0.5s cubic-bezier(0.25, 1, 0.35, 1), visibility 0.5s ease",
    visibility: isOpen ? "visible" : "hidden",
  };
}

export function getChevronStyle(isOpen: boolean): React.CSSProperties {
  return {
    ...step1Styles.chevronIcon,
    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
    transition: "transform 0.4s cubic-bezier(0.25, 1, 0.35, 1)",
  };
}

export function getHeaderActionContainerStyle(
  isOpen: boolean,
): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    opacity: isOpen ? 0 : 1,
    maxWidth: isOpen ? 0 : 160,
    overflow: "hidden",
    pointerEvents: isOpen ? "none" : "auto",
    transition:
      "opacity 0.2s ease, max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    whiteSpace: "nowrap",
  };
}

export function getAlertSwitchBtnStyle(isActive: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "11px",
    fontWeight: 700,
    backgroundColor: isActive
      ? "rgba(37, 99, 235, 0.2)"
      : "rgba(255, 255, 255, 0.05)",
    border: `1px solid ${isActive ? "rgba(96, 165, 250, 0.45)" : "rgba(255, 255, 255, 0.12)"}`,
    color: isActive ? "#93c5fd" : "var(--so-text-muted)",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  };
}

export function getProviderTabStyle(
  active: boolean,
  type: "cs2cap" | "skinsnipe",
): React.CSSProperties {
  const isCs2cap = type === "cs2cap";
  return {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    borderRadius: "var(--so-radius-sm)",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    backgroundColor: active ? "var(--so-surface-card)" : "transparent",
    border: active
      ? isCs2cap
        ? "1px solid rgba(6, 182, 212, 0.45)"
        : "1px solid var(--so-primary)"
      : "1px solid transparent",
    color: active ? "var(--so-text-primary)" : "var(--so-text-muted)",
    boxShadow: active
      ? isCs2cap
        ? "0 2px 6px rgba(0, 0, 0, 0.2)"
        : "0 2px 10px rgba(99, 102, 241, 0.2)"
      : "none",
  };
}

export function getStreamLiveButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
    border: "none",
    fontWeight: 800,
    fontSize: "13px",
    padding: "8px 18px",
    boxShadow: "0 4px 14px rgba(6, 182, 212, 0.3)",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

export function getStreamingMeterStyle(isError: boolean): React.CSSProperties {
  return {
    marginTop: "14px",
    padding: "14px",
    backgroundColor: isError
      ? "rgba(239, 68, 68, 0.08)"
      : "rgba(6, 182, 212, 0.08)",
    borderRadius: "8px",
    border: isError
      ? "1px solid rgba(239, 68, 68, 0.3)"
      : "1px solid rgba(6, 182, 212, 0.25)",
  };
}

export function getStreamingMeterStatusStyle(
  isError: boolean,
): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 700,
    color: isError ? "var(--so-danger-text)" : "#06b6d4",
  };
}

export function getProgressPanelStyle(
  isAbortedOrError: boolean,
): React.CSSProperties {
  return {
    marginTop: "16px",
    padding: "16px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: isAbortedOrError
      ? "rgba(239, 68, 68, 0.08)"
      : "rgba(59, 130, 246, 0.08)",
    border: isAbortedOrError
      ? "1px solid rgba(239, 68, 68, 0.3)"
      : "1px solid rgba(59, 130, 246, 0.3)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  };
}

export function getProgressBarFillStyle(
  isAbortedOrError: boolean,
  percent: number,
): React.CSSProperties {
  return {
    height: "100%",
    width: `${percent}%`,
    backgroundColor: isAbortedOrError
      ? "var(--so-danger-text)"
      : "var(--so-primary)",
    transition: "width 0.3s ease",
  };
}

// ── STATIC STYLES ────────────────────────────────────────────────────

export const step1Styles: Record<string, React.CSSProperties> = {
  cardContainer: {
    border: "1px solid var(--so-border-medium)",
    padding: 0,
    overflow: "hidden",
    background:
      "linear-gradient(180deg, var(--so-surface-card) 0%, rgba(15, 23, 42, 0.6) 100%)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
    flex: "1 1 auto",
  },
  headerTitle: {
    fontSize: "15px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    whiteSpace: "nowrap",
  },
  radioIcon: {
    color: "var(--so-primary)",
  },
  headerSubtitle: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
    marginTop: "2px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "nowrap",
    flexShrink: 0,
  },
  headerBadge: {
    fontSize: "11px",
    whiteSpace: "nowrap",
  },
  timeAgoBadge: {
    fontSize: "11px",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--so-text-muted)",
    border: "1px solid var(--so-border-subtle)",
    whiteSpace: "nowrap",
  },
  timeAgoIcon: {
    opacity: 0.75,
  },
  headerActionBtn: {
    padding: "3px 10px",
    fontSize: "11.5px",
    fontWeight: 600,
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    height: "26px",
    whiteSpace: "nowrap",
  },
  chevronIcon: {
    color: "var(--so-text-muted)",
  },
  bodyContainer: {
    padding: "20px",
  },
  providerSwitcher: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    borderBottom: "1px solid var(--so-border-subtle)",
    paddingBottom: "14px",
    flexWrap: "wrap",
  },
  providerLogoSmall: {
    height: 16,
    width: "auto",
    objectFit: "contain",
  },
  cs2capBadge: {
    fontSize: "9.5px",
    padding: "2px 6px",
    textTransform: "uppercase",
  },
  skinsnipeBadge: {
    fontSize: "9.5px",
    padding: "2px 6px",
    textTransform: "uppercase",
    backgroundColor: "rgba(99, 102, 241, 0.18)",
    color: "#818cf8",
    border: "1px solid rgba(99, 102, 241, 0.4)",
  },
  providerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "16px",
  },
  providerHeaderTitleGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  providerHeaderLogo: {
    height: 26,
    width: "auto",
    objectFit: "contain",
  },
  providerHeaderTitle: {
    fontSize: "18px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    margin: 0,
  },
  cs2capLiveBadge: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  cs2capHeaderDescription: {
    fontSize: "13px",
    color: "var(--so-text-secondary)",
    marginTop: "6px",
    maxWidth: "720px",
    lineHeight: 1.5,
  },
  configSectionCard: {
    padding: "18px 20px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
    marginBottom: "20px",
  },
  configSectionDescription: {
    fontSize: "12.5px",
    color: "var(--so-text-muted)",
    marginBottom: "12px",
  },
  providerChipsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))",
    gap: "8px",
    marginBottom: "8px",
  },
  brandDisclaimer: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "8px",
    opacity: 0.75,
  },
  brandDisclaimerIcon: {
    flexShrink: 0,
  },
  streamingSectionCard: {
    padding: "18px 20px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-subtle)",
    marginBottom: "20px",
  },
  streamingSectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
    flexWrap: "wrap",
    gap: "10px",
  },
  streamingSectionTitle: {
    fontWeight: 800,
    fontSize: "14px",
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  cyanIcon: {
    color: "#06b6d4",
  },
  badgeSmall: {
    fontSize: "11px",
  },
  streamingSectionActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  cancelStreamButton: {
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    fontWeight: 700,
    fontSize: "12px",
    padding: "7px 14px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
  },
  cs2capMissingKeyBanner: {
    fontSize: "12.5px",
    color: "var(--so-text-secondary)",
    padding: "12px 14px",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderRadius: "6px",
    border: "1px solid rgba(245, 158, 11, 0.25)",
    marginBottom: "10px",
  },
  streamingMeterHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  successIcon: {
    color: "var(--so-success-text)",
  },
  streamingElapsedText: {
    fontSize: "12px",
    color: "var(--so-text-secondary)",
    fontFamily: "monospace",
  },
  streamingMetricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "8px",
    marginTop: "10px",
  },
  metricBox: {
    backgroundColor: "var(--so-surface-card)",
    padding: "8px 12px",
    borderRadius: "6px",
  },
  metricLabel: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  metricValuePrimary: {
    fontSize: "15px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
  },
  metricValueCyan: {
    fontSize: "15px",
    fontWeight: 800,
    color: "#06b6d4",
  },
  streamingErrorText: {
    marginTop: "8px",
    fontSize: "12px",
    color: "var(--so-danger-text)",
  },
  skinsnipeStdBadge: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    backgroundColor: "rgba(99, 102, 241, 0.18)",
    color: "#818cf8",
    border: "1px solid rgba(99, 102, 241, 0.4)",
  },
  skinsnipeHeaderDescription: {
    fontSize: "13px",
    color: "var(--so-text-secondary)",
    marginTop: "6px",
    maxWidth: "680px",
    lineHeight: 1.5,
  },
  whiteSpaceNowrap: {
    whiteSpace: "nowrap",
  },
  marketChipsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))",
    gap: "8px",
    marginBottom: "12px",
  },
  estimatedCycleText: {
    fontSize: "11.5px",
    color: "var(--so-text-muted)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  fetchControlsGroup: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  uploadJsonLabel: {
    cursor: "pointer",
    margin: 0,
  },
  hiddenInput: {
    display: "none",
  },
  demoCacheGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  loadDemoButton: {
    background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "13px",
    padding: "8px 14px",
    border: "none",
    borderRadius: "var(--so-radius-sm)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(139, 92, 246, 0.3)",
  },
  reloadDemoButton: {
    fontSize: "11.5px",
    padding: "6px 10px",
    color: "var(--so-text-secondary)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  cacheStatusOffset: {
    marginLeft: "auto",
    fontSize: "13px",
    marginTop: 0,
  },
  demoAlertBox: {
    marginTop: "16px",
    padding: "14px 18px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    border: "1px solid rgba(245, 158, 11, 0.35)",
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  demoAlertIcon: {
    color: "#f59e0b",
    flexShrink: 0,
  },
  demoAlertTitle: {
    fontWeight: 800,
    fontSize: "13.5px",
    color: "#f59e0b",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  demoAlertBody: {
    fontSize: "12.5px",
    color: "var(--so-text-secondary)",
    marginTop: "3px",
    lineHeight: 1.4,
  },
  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressStatusText: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: 700,
    fontSize: "13.5px",
  },
  primaryIcon: {
    color: "var(--so-primary)",
  },
  cyanTextIcon: {
    color: "var(--so-cyan-text)",
  },
  progressCurrentMarketPrimary: {
    color: "var(--so-primary)",
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
  },
  progressCurrentMarketCyan: {
    color: "var(--so-cyan-text)",
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
  },
  progressRemainingSeconds: {
    color: "#fff",
    fontWeight: 900,
    fontSize: "13.5px",
  },
  progressAbortedText: {
    color: "var(--so-danger-text)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  progressCompletedText: {
    color: "var(--so-success-text)",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  progressHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  progressErrorCountBadge: {
    fontSize: "11px",
    fontWeight: 800,
    padding: "2px 8px",
    borderRadius: "4px",
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    color: "var(--so-danger-text)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
  },
  stopFetchingButton: {
    backgroundColor: "#dc2626",
    color: "#ffffff",
    border: "none",
    fontWeight: 700,
    fontSize: "11.5px",
    padding: "4px 12px",
    borderRadius: "6px",
    boxShadow: "0 2px 8px rgba(220, 38, 38, 0.35)",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    cursor: "pointer",
  },
  progressBarTrack: {
    width: "100%",
    height: "6px",
    backgroundColor: "var(--so-surface-card)",
    borderRadius: "3px",
    overflow: "hidden",
  },
  criticalErrorBox: {
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--so-danger-text)",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    padding: "8px 12px",
    borderRadius: "6px",
    lineHeight: 1.5,
  },
  lastErrorText: {
    fontSize: "11.5px",
    color: "var(--so-text-muted)",
  },
};
