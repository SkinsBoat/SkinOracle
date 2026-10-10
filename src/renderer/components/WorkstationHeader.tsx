import React from "react";

export interface WorkstationHeaderProps {
  /** Marketplace/aggregator brand mark rendered as the leading element. */
  logo: string;
  logoAlt: string;
  title: string;
  /** Optional pill rendered beside the title (e.g. "Direct Device IPC"). */
  badge?: string;
  /** Optional supporting line rendered under the title row. */
  subtitle?: React.ReactNode;
  /** Right-aligned widgets (balance, stats, indicators). */
  right?: React.ReactNode;
}

export const WorkstationHeader: React.FC<WorkstationHeaderProps> = ({
  logo,
  logoAlt,
  title,
  badge,
  subtitle,
  right,
}) => {
  return (
    <div style={styles.header}>
      <div style={styles.brandSection}>
        <img src={logo} alt={logoAlt} style={styles.logo} />
        <div style={styles.brandText}>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>{title}</h1>
            {badge && <span style={styles.badge}>{badge}</span>}
          </div>
          {subtitle && <div style={styles.subtitle}>{subtitle}</div>}
        </div>
      </div>

      {right && <div style={styles.right}>{right}</div>}
    </div>
  );
};

// ── EXTRACTED STYLES ────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    padding: "14px 20px",
    boxSizing: "border-box",
    flexShrink: 0,
  },
  brandSection: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    minWidth: 0,
  },
  logo: {
    width: "36px",
    height: "36px",
    objectFit: "contain",
    flexShrink: 0,
  },
  brandText: {
    minWidth: 0,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  title: {
    fontSize: "19px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    margin: 0,
    lineHeight: 1.2,
  },
  badge: {
    fontSize: "10.5px",
    fontWeight: 700,
    padding: "2px 7px",
    borderRadius: "12px",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    color: "var(--so-accent-cyan)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    whiteSpace: "nowrap",
  },
  subtitle: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
    marginTop: "3px",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexShrink: 0,
  },
};
