import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  ExternalLink,
  ShieldCheck,
  Coins,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDepositSuccess: () => void;
}

type DepositPhase = "input" | "creating" | "awaiting" | "success" | "failed";

const MIN_DEPOSIT_USD = 11.0;
const MAX_DEPOSIT_USD = 50.0;
const PRESET_AMOUNTS = [15, 25, 50];

export default function DepositModal({
  isOpen,
  onClose,
  onDepositSuccess,
}: DepositModalProps) {
  const [amountStr, setAmountStr] = useState<string>("25");
  const [phase, setPhase] = useState<DepositPhase>("input");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeDepositId, setActiveDepositId] = useState<string | null>(null);
  const [activeInvoiceUrl, setActiveInvoiceUrl] = useState<string | null>(null);
  const [depositStatus, setDepositStatus] = useState<string>("waiting");
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear polling interval when closing or unmounting
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Reset modal state when opening
  useEffect(() => {
    if (isOpen) {
      setAmountStr("25");
      setPhase("input");
      setErrorMsg(null);
      setActiveDepositId(null);
      setActiveInvoiceUrl(null);
      setDepositStatus("waiting");
    } else {
      stopPolling();
    }
  }, [isOpen, stopPolling]);

  if (!isOpen) return null;

  const numericAmount = parseFloat(amountStr) || 0;
  const isAmountValid =
    numericAmount >= MIN_DEPOSIT_USD && numericAmount <= MAX_DEPOSIT_USD;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmountStr(e.target.value);
    if (errorMsg) setErrorMsg(null);
  };

  const handlePresetClick = (val: number) => {
    setAmountStr(val.toString());
    if (errorMsg) setErrorMsg(null);
  };

  const handleOpenBrowser = async (url: string) => {
    try {
      if (window.electronAPI?.app?.openExternal) {
        await window.electronAPI.app.openExternal(url);
      } else {
        window.open(url, "_blank");
      }
    } catch (err: any) {
      toast.error("Could not launch default browser");
    }
  };

  const handleStartDeposit = async () => {
    if (!isAmountValid) {
      setErrorMsg(
        `Please enter an amount between $${MIN_DEPOSIT_USD.toFixed(
          2,
        )} and $${MAX_DEPOSIT_USD.toFixed(2)} USD`,
      );
      return;
    }

    try {
      setPhase("creating");
      setErrorMsg(null);

      const res = await window.electronAPI.balance.createDeposit(numericAmount);
      setActiveDepositId(res.depositId);
      setActiveInvoiceUrl(res.invoiceUrl);
      setDepositStatus(res.status || "waiting");
      setPhase("awaiting");

      // Launch the browser invoice automatically
      if (res.invoiceUrl) {
        await handleOpenBrowser(res.invoiceUrl);
      }

      // Start polling deposit status every 4 seconds
      startPollingStatus(res.depositId);
    } catch (err: any) {
      setPhase("input");
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to initiate deposit invoice";
      setErrorMsg(message);
      toast.error(message);
    }
  };

  const startPollingStatus = (depositId: string) => {
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const statusRes =
          await window.electronAPI.balance.getDepositStatus(depositId);
        const currentStatus = (statusRes.status || "").toLowerCase();
        setDepositStatus(currentStatus);

        if (currentStatus === "completed") {
          stopPolling();
          setPhase("success");
          toast.success("Deposit confirmed and credited to balance!");
          onDepositSuccess();
        } else if (currentStatus === "failed" || currentStatus === "expired") {
          stopPolling();
          setPhase("failed");
          setErrorMsg(
            `Deposit ${currentStatus}. If you sent funds, contact support.`,
          );
        }
      } catch (err) {
        // Silently tolerate transient polling errors
      }
    }, 4000);
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modalCard}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconBadge}>
              <Coins size={20} style={styles.iconBadgeSvg} />
            </div>
            <div>
              <h2 style={styles.title}>Deposit Funds</h2>
              <p style={styles.subtitle}>
                Instant crypto top-up via NOWPayments
              </p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body Content by Phase */}
        {phase === "input" && (
          <div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Deposit Amount (USD)</label>
              <div style={styles.inputWrapper}>
                <span style={styles.currencyPrefix}>$</span>
                <input
                  type="number"
                  step="0.5"
                  min={MIN_DEPOSIT_USD}
                  max={MAX_DEPOSIT_USD}
                  value={amountStr}
                  onChange={handleAmountChange}
                  placeholder="25.00"
                  style={styles.amountInput}
                  autoFocus
                />
              </div>
              <div style={styles.limitsHint}>
                Allowed Range: ${MIN_DEPOSIT_USD.toFixed(2)} – $
                {MAX_DEPOSIT_USD.toFixed(2)} USD
              </div>
            </div>

            {/* Quick Presets */}
            <div style={styles.presetsRow}>
              {PRESET_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handlePresetClick(val)}
                  style={getPresetBtnStyle(numericAmount === val)}
                >
                  ${val}
                </button>
              ))}
            </div>

            {errorMsg && (
              <div style={styles.errorBanner}>
                <AlertCircle size={15} style={styles.errorIcon} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Platform Feature Notice */}
            <div style={styles.infoCard}>
              <div style={styles.infoRow}>
                <ShieldCheck size={16} style={styles.infoIcon} />
                <div>
                  <div style={styles.infoTitle}>300+ Supported Cryptos</div>
                  <div style={styles.infoText}>
                    USDT (TRC20, ERC20, BEP20), BTC, ETH, SOL, LTC, and more.
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={styles.actionsRow}>
              <button
                type="button"
                onClick={onClose}
                style={styles.secondaryBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartDeposit}
                disabled={!isAmountValid}
                style={getPrimaryBtnStyle(!isAmountValid)}
              >
                Continue to Payment
                <ExternalLink size={15} />
              </button>
            </div>
          </div>
        )}

        {phase === "creating" && (
          <div style={styles.centerState}>
            <RefreshCw size={36} className="spin" style={styles.spinner} />
            <h3 style={styles.stateTitle}>Generating Invoice Link</h3>
            <p style={styles.stateSubtitle}>
              Connecting to NOWPayments gateway...
            </p>
          </div>
        )}

        {phase === "awaiting" && (
          <div>
            <div style={styles.centerState}>
              <Clock size={40} style={styles.clockIcon} />
              <h3 style={styles.stateTitle}>Awaiting Blockchain Payment</h3>
              <p style={styles.stateSubtitle}>
                Complete your deposit on the NOWPayments checkout page opened in
                your browser.
              </p>
            </div>

            <div style={styles.statusBox}>
              <div style={styles.statusRow}>
                <span style={styles.statusLabel}>Deposit Amount:</span>
                <span style={styles.statusValue}>
                  ${numericAmount.toFixed(2)} USD
                </span>
              </div>
              <div style={styles.statusRow}>
                <span style={styles.statusLabel}>Order Status:</span>
                <span style={getStatusBadgeStyle(depositStatus)}>
                  {depositStatus.toUpperCase()}
                </span>
              </div>
            </div>

            {activeInvoiceUrl && (
              <div style={styles.reopenWrapper}>
                <button
                  type="button"
                  onClick={() => handleOpenBrowser(activeInvoiceUrl)}
                  style={styles.reopenBtn}
                >
                  <ExternalLink size={15} /> Reopen Checkout in Browser
                </button>
              </div>
            )}

            <div style={styles.actionsRow}>
              <button
                type="button"
                onClick={onClose}
                style={styles.secondaryBtn}
              >
                Close (Continues in Background)
              </button>
            </div>
          </div>
        )}

        {phase === "success" && (
          <div style={styles.centerState}>
            <CheckCircle2 size={46} style={styles.successIcon} />
            <h3 style={styles.stateTitle}>Deposit Confirmed!</h3>
            <p style={styles.stateSubtitle}>
              ${numericAmount.toFixed(2)} USD has been credited to your account
              balance.
            </p>
            <div style={styles.actionsRow}>
              <button
                type="button"
                onClick={onClose}
                style={getPrimaryBtnStyle(false)}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {phase === "failed" && (
          <div style={styles.centerState}>
            <AlertCircle size={46} style={styles.failIcon} />
            <h3 style={styles.stateTitle}>Payment Unsuccessful</h3>
            <p style={styles.stateSubtitle}>
              {errorMsg || "The transaction expired or could not be completed."}
            </p>
            <div style={styles.actionsRow}>
              <button
                type="button"
                onClick={() => setPhase("input")}
                style={getPrimaryBtnStyle(false)}
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={onClose}
                style={styles.secondaryBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Static Styles Object (Strict adherence to React TSX styling guidelines)
// ─────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 14, 23, 0.8)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalCard: {
    width: "100%",
    maxWidth: "460px",
    backgroundColor: "var(--so-surface-panel, #0f172a)",
    borderRadius: "var(--so-radius-xl, 16px)",
    border: "1px solid var(--so-border-medium, rgba(255, 255, 255, 0.12))",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
    padding: "24px",
    position: "relative",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  iconBadge: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeSvg: {
    color: "var(--so-primary, #6366f1)",
  },
  title: {
    fontSize: "18px",
    fontWeight: 800,
    color: "var(--so-text-primary, #f8fafc)",
    margin: "0 0 2px 0",
  },
  subtitle: {
    fontSize: "12px",
    color: "var(--so-text-secondary, #94a3b8)",
    margin: 0,
  },
  closeBtn: {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--so-text-muted, #64748b)",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  formGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--so-text-secondary, #94a3b8)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "8px",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  currencyPrefix: {
    position: "absolute",
    left: "16px",
    fontSize: "20px",
    fontWeight: 800,
    color: "var(--so-primary, #6366f1)",
  },
  amountInput: {
    width: "100%",
    padding: "12px 16px 12px 36px",
    fontSize: "22px",
    fontWeight: 800,
    backgroundColor: "var(--so-surface-card, #1e293b)",
    border: "1px solid var(--so-border-medium, rgba(255, 255, 255, 0.15))",
    borderRadius: "10px",
    color: "var(--so-text-primary, #f8fafc)",
    outline: "none",
  },
  limitsHint: {
    fontSize: "11px",
    color: "var(--so-text-muted, #64748b)",
    marginTop: "6px",
  },
  presetsRow: {
    display: "flex",
    gap: "8px",
    marginBottom: "18px",
  },
  errorBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "8px",
    padding: "10px 12px",
    color: "#f87171",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
  },
  errorIcon: {
    flexShrink: 0,
  },
  infoCard: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    border: "1px solid rgba(99, 102, 241, 0.2)",
    borderRadius: "10px",
    padding: "12px 14px",
    marginBottom: "20px",
  },
  infoRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  },
  infoIcon: {
    color: "var(--so-primary, #6366f1)",
    marginTop: "2px",
    flexShrink: 0,
  },
  infoTitle: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--so-text-primary, #f8fafc)",
  },
  infoText: {
    fontSize: "11px",
    color: "var(--so-text-secondary, #94a3b8)",
    marginTop: "2px",
  },
  actionsRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "20px",
  },
  secondaryBtn: {
    padding: "10px 18px",
    borderRadius: "8px",
    border: "1px solid var(--so-border-medium, rgba(255, 255, 255, 0.15))",
    backgroundColor: "transparent",
    color: "var(--so-text-primary, #f8fafc)",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  centerState: {
    textAlign: "center",
    padding: "24px 10px",
  },
  spinner: {
    color: "var(--so-primary, #6366f1)",
    marginBottom: "16px",
  },
  clockIcon: {
    color: "#f59e0b",
    marginBottom: "12px",
  },
  successIcon: {
    color: "#10b981",
    marginBottom: "12px",
  },
  failIcon: {
    color: "#ef4444",
    marginBottom: "12px",
  },
  stateTitle: {
    fontSize: "18px",
    fontWeight: 800,
    color: "var(--so-text-primary, #f8fafc)",
    margin: "0 0 6px 0",
  },
  stateSubtitle: {
    fontSize: "13px",
    color: "var(--so-text-secondary, #94a3b8)",
    margin: 0,
    lineHeight: "1.4",
  },
  statusBox: {
    backgroundColor: "var(--so-surface-card, #1e293b)",
    borderRadius: "10px",
    padding: "14px 16px",
    marginTop: "16px",
    border: "1px solid var(--so-border-subtle, rgba(255, 255, 255, 0.08))",
  },
  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "4px 0",
  },
  statusLabel: {
    fontSize: "12px",
    color: "var(--so-text-secondary, #94a3b8)",
    fontWeight: 600,
  },
  statusValue: {
    fontSize: "13px",
    color: "var(--so-text-primary, #f8fafc)",
    fontWeight: 800,
  },
  reopenWrapper: {
    textAlign: "center",
    marginTop: "14px",
  },
  reopenBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--so-primary, #6366f1)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "6px 12px",
  },
};

// ─────────────────────────────────────────────────────────────────
// Dynamic Style Helpers
// ─────────────────────────────────────────────────────────────────
function getPresetBtnStyle(isSelected: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: "8px 0",
    borderRadius: "8px",
    border: isSelected
      ? "1px solid var(--so-primary, #6366f1)"
      : "1px solid var(--so-border-subtle, rgba(255, 255, 255, 0.1))",
    backgroundColor: isSelected
      ? "rgba(99, 102, 241, 0.2)"
      : "var(--so-surface-card, #1e293b)",
    color: isSelected
      ? "var(--so-primary, #818cf8)"
      : "var(--so-text-secondary, #94a3b8)",
    fontSize: "13px",
    fontWeight: 800,
    cursor: "pointer",
    transition: "all 0.15s ease",
  };
}

function getPrimaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: disabled
      ? "var(--so-border-medium, #334155)"
      : "var(--so-primary, #6366f1)",
    color: disabled ? "var(--so-text-muted, #94a3b8)" : "#ffffff",
    fontSize: "13px",
    fontWeight: 800,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "background-color 0.15s ease",
  };
}

function getStatusBadgeStyle(status: string): React.CSSProperties {
  let bg = "rgba(100, 116, 139, 0.2)";
  let color = "#94a3b8";

  if (["confirming", "confirmed", "sending"].includes(status)) {
    bg = "rgba(245, 158, 11, 0.2)";
    color = "#fbbf24";
  } else if (status === "completed") {
    bg = "rgba(16, 185, 129, 0.2)";
    color = "#34d399";
  } else if (["failed", "expired"].includes(status)) {
    bg = "rgba(239, 68, 68, 0.2)";
    color = "#f87171";
  }

  return {
    padding: "2px 8px",
    borderRadius: "6px",
    backgroundColor: bg,
    color,
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.5px",
  };
}
