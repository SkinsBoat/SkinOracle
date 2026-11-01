import React, { useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, X } from "lucide-react";

interface InlineErrorBannerProps {
  title: string;
  detail?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

export default function InlineErrorBanner({
  title,
  detail,
  action,
  onDismiss,
}: InlineErrorBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <AlertCircle size={16} style={styles.icon} />
        <div style={styles.content}>
          <div style={styles.title}>{title}</div>
          {detail && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={styles.toggleButton}
            >
              {isExpanded ? "Hide details" : "Show details"}
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>
        {action && (
          <button onClick={action.onClick} style={styles.actionButton}>
            {action.label}
          </button>
        )}
        {onDismiss && (
          <button onClick={onDismiss} style={styles.dismissButton} title="Dismiss">
            <X size={14} />
          </button>
        )}
      </div>
      {detail && isExpanded && <div style={styles.detail}>{detail}</div>}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    borderRadius: "var(--so-radius-md)",
    marginBottom: "16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
  },
  icon: {
    color: "#ef4444",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  title: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#fca5a5",
  },
  toggleButton: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    background: "none",
    border: "none",
    color: "#f87171",
    fontSize: "11px",
    cursor: "pointer",
    padding: 0,
    width: "fit-content",
  },
  actionButton: {
    padding: "6px 12px",
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    color: "#fecaca",
    border: "1px solid rgba(239, 68, 68, 0.5)",
    borderRadius: "var(--so-radius-sm)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  dismissButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#f87171",
    display: "flex",
    alignItems: "center",
    padding: "4px",
    borderRadius: "4px",
    flexShrink: 0,
  },
  detail: {
    padding: "0 12px 10px 38px",
    fontSize: "11px",
    color: "#fca5a5",
    fontFamily: "monospace",
    wordBreak: "break-word" as const,
  },
};
