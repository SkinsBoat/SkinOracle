import React, { useEffect, useRef } from "react";
import { AlertTriangle, AlertCircle, HelpCircle, X } from "lucide-react";
import { useConfirmStore, ConfirmVariant } from "../store/useConfirmStore";

export const ConfirmModal: React.FC = () => {
  const { isOpen, options, handleConfirm, handleCancel } = useConfirmStore();
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus confirm or cancel button for quick keyboard navigation
    const timer = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleCancel]);

  if (!isOpen || !options) {
    return null;
  }

  const variant: ConfirmVariant = options.variant || "danger";
  const title = options.title || getDefaultTitle(variant);
  const confirmText = options.confirmText || getDefaultConfirmText(variant);
  const cancelText = options.cancelText || "Cancel";

  return (
    <div style={styles.backdrop} onClick={handleCancel}>
      <div
        style={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Icon Top Right */}
        <button
          type="button"
          onClick={handleCancel}
          style={styles.closeBtn}
          title="Dismiss"
          aria-label="Close"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--so-text-primary)";
            e.currentTarget.style.backgroundColor = "var(--so-surface-panel)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--so-text-muted)";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <X size={16} />
        </button>

        {/* Header with Variant Icon Badge */}
        <div style={styles.headerRow}>
          <div style={getIconBadgeStyle(variant)}>
            {options.icon || renderDefaultIcon(variant)}
          </div>

          <div style={styles.headerTextWrap}>
            <h3 style={styles.title}>{title}</h3>
            <span style={getVariantBadgeStyle(variant)}>
              {variant.toUpperCase()} CONFIRMATION
            </span>
          </div>
        </div>

        {/* Body Message */}
        <div style={styles.bodyWrap}>
          {typeof options.message === "string" ? (
            <p style={styles.messageText}>{options.message}</p>
          ) : (
            options.message
          )}
        </div>

        {/* Action Buttons */}
        <div style={styles.actionRow}>
          <button
            type="button"
            onClick={handleCancel}
            style={styles.cancelBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--so-surface-card-hover)";
              e.currentTarget.style.borderColor = "var(--so-border-strong)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--so-surface-panel)";
              e.currentTarget.style.borderColor = "var(--so-border-medium)";
            }}
          >
            {cancelText}
          </button>

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={handleConfirm}
            style={getConfirmBtnStyle(variant)}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = "brightness(1.12)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions for Dynamic Variants
// ─────────────────────────────────────────────────────────────────────────────

function getDefaultTitle(variant: ConfirmVariant): string {
  switch (variant) {
    case "danger":
      return "Confirm Destructive Action";
    case "warning":
      return "Confirm Operation";
    case "info":
    case "primary":
      return "Confirmation Required";
  }
}

function getDefaultConfirmText(variant: ConfirmVariant): string {
  switch (variant) {
    case "danger":
      return "Confirm & Delete";
    case "warning":
      return "Proceed";
    case "info":
    case "primary":
      return "Confirm";
  }
}

function renderDefaultIcon(variant: ConfirmVariant): React.ReactNode {
  switch (variant) {
    case "danger":
      return <AlertTriangle size={20} style={{ color: "#ef4444" }} />;
    case "warning":
      return <AlertCircle size={20} style={{ color: "#f59e0b" }} />;
    case "info":
    case "primary":
      return <HelpCircle size={20} style={{ color: "var(--so-primary-light, #38bdf8)" }} />;
  }
}

function getIconBadgeStyle(variant: ConfirmVariant): React.CSSProperties {
  let bg = "rgba(56, 189, 248, 0.12)";
  let border = "1px solid rgba(56, 189, 248, 0.3)";

  if (variant === "danger") {
    bg = "rgba(239, 68, 68, 0.12)";
    border = "1px solid rgba(239, 68, 68, 0.35)";
  } else if (variant === "warning") {
    bg = "rgba(245, 158, 11, 0.12)";
    border = "1px solid rgba(245, 158, 11, 0.35)";
  }

  return {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    backgroundColor: bg,
    border,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };
}

function getVariantBadgeStyle(variant: ConfirmVariant): React.CSSProperties {
  let color = "var(--so-primary-light, #38bdf8)";
  let bg = "rgba(56, 189, 248, 0.1)";

  if (variant === "danger") {
    color = "#f87171";
    bg = "rgba(239, 68, 68, 0.15)";
  } else if (variant === "warning") {
    color = "#fbbf24";
    bg = "rgba(245, 158, 11, 0.15)";
  }

  return {
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.5px",
    color,
    backgroundColor: bg,
    padding: "2px 6px",
    borderRadius: "4px",
    display: "inline-block",
    alignSelf: "flex-start",
    marginTop: "2px",
  };
}

function getConfirmBtnStyle(variant: ConfirmVariant): React.CSSProperties {
  let bg = "var(--so-primary)";
  let color = "#ffffff";
  let border = "1px solid var(--so-primary)";

  if (variant === "danger") {
    bg = "#dc2626";
    color = "#ffffff";
    border = "1px solid #ef4444";
  } else if (variant === "warning") {
    bg = "#d97706";
    color = "#ffffff";
    border = "1px solid #f59e0b";
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "9px 18px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: bg,
    border,
    color,
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s ease",
    minWidth: "100px",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Extracted Styles Dictionary (Rule 9: Zero inline styles in render flow)
// ─────────────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(3, 7, 18, 0.78)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  modalCard: {
    position: "relative",
    width: "100%",
    maxWidth: "460px",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9), 0 0 1px rgba(255, 255, 255, 0.1)",
    padding: "22px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    animation: "modalFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  closeBtn: {
    position: "absolute",
    top: "14px",
    right: "14px",
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "transparent",
    color: "var(--so-text-muted)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    paddingRight: "24px",
  },
  headerTextWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  title: {
    margin: 0,
    fontSize: "16.5px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    letterSpacing: "-0.2px",
  },
  bodyWrap: {
    padding: "4px 0",
  },
  messageText: {
    margin: 0,
    fontSize: "13px",
    lineHeight: 1.55,
    color: "var(--so-text-secondary)",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  actionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "6px",
    paddingTop: "14px",
    borderTop: "1px solid var(--so-border-subtle)",
  },
  cancelBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "9px 16px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    color: "var(--so-text-secondary)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
  },
};
