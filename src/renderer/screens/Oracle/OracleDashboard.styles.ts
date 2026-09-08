import React from "react";

export const S = {
  // Top Header Banner
  headerContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "16px",
  } as React.CSSProperties,

  headerTitleBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  } as React.CSSProperties,

  // Section Panels
  sectionPanel: {
    padding: "18px 20px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    marginBottom: "18px",
  } as React.CSSProperties,

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  } as React.CSSProperties,

  sectionTitle: {
    fontWeight: 800,
    fontSize: "14px",
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  } as React.CSSProperties,

  sectionDesc: {
    fontSize: "12.5px",
    color: "var(--so-text-muted)",
    marginBottom: "14px",
  } as React.CSSProperties,

  // Action Trigger Box
  actionTriggerBox: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
  } as React.CSSProperties,

  actionTitle: {
    fontWeight: 800,
    fontSize: "14px",
    color: "var(--so-text-primary)",
    marginBottom: "3px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  } as React.CSSProperties,

  actionDesc: {
    fontSize: "12.5px",
    color: "var(--so-text-muted)",
  } as React.CSSProperties,

  actionBtn: {
    minWidth: "220px",
  } as React.CSSProperties,

  actionBtnListing: {
    minWidth: "220px",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    color: "var(--so-success-text)",
    border: "1px solid rgba(16, 185, 129, 0.4)",
  } as React.CSSProperties,

  // Grid Controls
  gridFourCols: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
  } as React.CSSProperties,

  gridThreeCols: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "14px",
  } as React.CSSProperties,

  gridFiveCols: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "10px",
  } as React.CSSProperties,

  // Controls Row
  controlsRowSpaceBetween: {
    marginTop: "14px",
    paddingTop: "12px",
    borderTop: "1px solid var(--so-border-subtle)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
  } as React.CSSProperties,

  controlsRowFlexEnd: {
    marginTop: "14px",
    paddingTop: "12px",
    borderTop: "1px solid var(--so-border-subtle)",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "12px",
  } as React.CSSProperties,

  // Checkbox Label
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    fontSize: "12px",
    color: "var(--so-text-primary)",
    fontWeight: 600,
  } as React.CSSProperties,

  checkboxInput: {
    width: "16px",
    height: "16px",
    accentColor: "var(--so-primary)",
  } as React.CSSProperties,

  // Inputs
  numInputSmall: {
    width: "55px",
    fontSize: "12px",
    padding: "2px 4px",
    textAlign: "center",
    borderRadius: "var(--so-radius-sm)",
    border: "1px solid var(--so-border-medium)",
  } as React.CSSProperties,

  numInputMedium: {
    width: "75px",
    fontSize: "12px",
    padding: "5px 8px",
    textAlign: "center",
    borderRadius: "var(--so-radius-sm)",
    border: "1px solid var(--so-border-medium)",
  } as React.CSSProperties,

  // Metric Cards
  metricCard: {
    padding: "10px 12px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-subtle)",
  } as React.CSSProperties,

  metricLabel: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
    fontWeight: 600,
  } as React.CSSProperties,

  metricValuePrimary: {
    fontSize: "15px",
    fontWeight: 800,
    color: "var(--so-primary)",
    marginTop: "2px",
  } as React.CSSProperties,

  metricValueText: {
    fontSize: "15px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    marginTop: "2px",
  } as React.CSSProperties,

  metricValueSuccess: {
    fontSize: "15px",
    fontWeight: 800,
    color: "var(--so-success-text)",
    marginTop: "2px",
  } as React.CSSProperties,

  metricValueCyan: {
    fontSize: "15px",
    fontWeight: 800,
    color: "var(--so-cyan-text)",
    marginTop: "2px",
  } as React.CSSProperties,

  // Single Item Result Card
  resultCard: {
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    padding: "20px",
    borderRadius: "var(--so-radius-md)",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  } as React.CSSProperties,

  resultItemImage: {
    width: 60,
    height: 60,
    objectFit: "contain",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-subtle)",
    padding: "4px",
    flexShrink: 0,
  } as React.CSSProperties,

  targetBox: {
    padding: "18px 20px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    alignItems: "center",
  } as React.CSSProperties,

  // Accordion Step Header
  accordionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    userSelect: "none",
    padding: "14px 18px",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    transition: "all 0.2s ease",
  } as React.CSSProperties,

  stepBadge: {
    fontSize: "10px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    padding: "2px 8px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-primary)",
    color: "#fff",
  } as React.CSSProperties,
};
