import React from "react";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={styles.container}>
      <div style={styles.icon}>{icon}</div>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.description}>{description}</p>
      {action && (
        <button onClick={action.onClick} style={styles.button}>
          {action.label}
        </button>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
    textAlign: "center" as const,
    gap: "12px",
  },
  icon: {
    color: "var(--so-text-muted)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "8px",
  },
  title: {
    fontSize: "16px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
    margin: 0,
  },
  description: {
    fontSize: "13px",
    color: "var(--so-text-secondary)",
    margin: 0,
    maxWidth: "400px",
    lineHeight: "1.5",
  },
  button: {
    marginTop: "8px",
    padding: "8px 16px",
    backgroundColor: "var(--so-primary)",
    color: "#ffffff",
    border: "none",
    borderRadius: "var(--so-radius-sm)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.15s ease",
  },
};
