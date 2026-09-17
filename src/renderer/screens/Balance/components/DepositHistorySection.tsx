import React, { useEffect, useState, useCallback } from "react";
import {
  Receipt,
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Lock,
  Coins,
} from "lucide-react";
import toast from "react-hot-toast";

interface DepositItem {
  id: string;
  amountCents: number;
  status: string;
  invoiceUrl: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  payCurrency: string | null;
  payAmount: string | null;
  actuallyPaidFiat: number | null;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

interface DepositHistorySectionProps {
  onBalanceRefreshRequired: () => void;
  onOpenDepositModal: () => void;
}

export default function DepositHistorySection({
  onBalanceRefreshRequired,
  onOpenDepositModal,
}: DepositHistorySectionProps) {
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());

  const fetchDeposits = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await window.electronAPI.balance.getDepositHistory(1, 10);
      setDeposits(res.deposits || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load deposit invoice history");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeposits();
    // Update live timestamp every 30 seconds for countdown calculations
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchDeposits]);

  const handleOpenBrowser = async (url: string) => {
    try {
      if (window.electronAPI?.app?.openExternal) {
        await window.electronAPI.app.openExternal(url);
      } else {
        window.open(url, "_blank");
      }
    } catch {
      toast.error("Could not launch default browser");
    }
  };

  const handleSync = async (depositId: string) => {
    try {
      setSyncingId(depositId);
      const res = await window.electronAPI.balance.syncDeposit(depositId);
      if (res.credited) {
        toast.success(res.message);
        onBalanceRefreshRequired();
      } else {
        toast(res.message, { icon: "ℹ️" });
      }
      await fetchDeposits();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not synchronize deposit with gateway";
      toast.error(msg);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div style={styles.cardContainer}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitleRow}>
          <Receipt size={16} style={styles.headerIcon} />
          <span style={styles.headerTitle}>Recent Deposit Invoices</span>
          <span style={styles.headerBadge}>Last 10 Invoices</span>
        </div>
        <button
          onClick={fetchDeposits}
          disabled={isLoading}
          style={styles.refreshBtn}
          title="Refresh deposit history"
        >
          <RefreshCw size={13} className={isLoading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Body */}
      {isLoading ? (
        <div style={styles.emptyContainer}>
          <RefreshCw size={20} className="spin" style={{ opacity: 0.6 }} />
          <div style={{ marginTop: "8px" }}>Loading deposit invoices...</div>
        </div>
      ) : deposits.length === 0 ? (
        <div style={styles.emptyContainer}>
          <Coins size={30} style={{ opacity: 0.3, marginBottom: "8px" }} />
          <div style={styles.emptyTitle}>No deposit invoices generated yet</div>
          <p style={styles.emptyDesc}>
            Initiate your first deposit to top up your pay-as-you-go query
            balance.
          </p>
          <button onClick={onOpenDepositModal} style={styles.emptyActionBtn}>
            + Create Deposit
          </button>
        </div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeadRow}>
                <th style={styles.th}>Invoice / Ref</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Crypto Asset</th>
                <th style={styles.th}>Gateway Status</th>
                <th style={styles.th}>Created At</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((dep) => {
                const status = (dep.status || "waiting").toLowerCase();
                const isCompleted = status === "completed";
                const isFailed = status === "failed" || status === "expired";
                const createdTime = new Date(dep.createdAt).getTime();
                const ageMs = nowTimestamp - createdTime;
                const oneHourMs = 60 * 60 * 1000;
                const isLockedAntiSpam = ageMs < oneHourMs;
                const remainingMinutes = Math.max(
                  1,
                  Math.ceil((oneHourMs - ageMs) / 60000),
                );

                return (
                  <tr key={dep.id} style={styles.tableRow}>
                    {/* ID */}
                    <td style={styles.td}>
                      <div style={styles.idPrimary}>
                        #{dep.id.substring(0, 8)}
                      </div>
                      {dep.paymentId && (
                        <div style={styles.idSecondary}>
                          NP: {dep.paymentId}
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td style={styles.td}>
                      <span style={styles.amountText}>
                        ${(dep.amountCents / 100).toFixed(2)} USD
                      </span>
                    </td>

                    {/* Crypto Asset */}
                    <td style={styles.td}>
                      {dep.payCurrency ? (
                        <span style={styles.cryptoBadge}>
                          {dep.payAmount ? `${dep.payAmount} ` : ""}
                          {dep.payCurrency.toUpperCase()}
                        </span>
                      ) : (
                        <span style={styles.cryptoPending}>
                          Not selected yet
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={styles.td}>
                      <span style={getStatusBadgeStyle(status)}>
                        {getStatusIcon(status)}
                        <span>{status.toUpperCase()}</span>
                      </span>
                    </td>

                    {/* Date */}
                    <td style={styles.tdDate}>
                      <Clock size={11} style={{ marginRight: "4px" }} />
                      {new Date(dep.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      • {new Date(dep.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td style={styles.tdActions}>
                      <div style={styles.actionGroup}>
                        {/* Open Checkout Button */}
                        {!isCompleted && !isFailed && dep.invoiceUrl && (
                          <button
                            onClick={() => handleOpenBrowser(dep.invoiceUrl!)}
                            style={styles.openBtn}
                            title="Open payment page in browser"
                          >
                            <ExternalLink size={12} /> Pay
                          </button>
                        )}

                        {/* Sync Gateway Button */}
                        {!isCompleted && (
                          <button
                            onClick={() => handleSync(dep.id)}
                            disabled={
                              isLockedAntiSpam || syncingId === dep.id
                            }
                            style={getSyncBtnStyle(isLockedAntiSpam)}
                            title={
                              isLockedAntiSpam
                                ? `Anti-spam: Manual sync unlocks 1 hour after deposit creation if webhook was missed (${remainingMinutes}m remaining)`
                                : "Check and synchronize live status directly with NOWPayments"
                            }
                          >
                            {isLockedAntiSpam ? (
                              <>
                                <Lock size={11} />
                                <span>Sync in {remainingMinutes}m</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw
                                  size={11}
                                  className={
                                    syncingId === dep.id ? "spin" : ""
                                  }
                                />
                                <span>Sync</span>
                              </>
                            )}
                          </button>
                        )}

                        {isCompleted && (
                          <span style={styles.creditedBadge}>
                            <CheckCircle2 size={12} /> Credited
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure Helper Functions for Dynamic Styling
// ─────────────────────────────────────────────────────────────────────────────
function getStatusBadgeStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "3px 8px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  };

  switch (status) {
    case "completed":
      return {
        ...base,
        backgroundColor: "rgba(16, 185, 129, 0.12)",
        color: "#10b981",
        border: "1px solid rgba(16, 185, 129, 0.25)",
      };
    case "confirming":
    case "confirmed":
    case "sending":
      return {
        ...base,
        backgroundColor: "rgba(59, 130, 246, 0.12)",
        color: "#3b82f6",
        border: "1px solid rgba(59, 130, 246, 0.25)",
      };
    case "partially_paid":
      return {
        ...base,
        backgroundColor: "rgba(249, 115, 22, 0.12)",
        color: "#f97316",
        border: "1px solid rgba(249, 115, 22, 0.25)",
      };
    case "failed":
    case "expired":
    case "refunded":
      return {
        ...base,
        backgroundColor: "rgba(239, 68, 68, 0.12)",
        color: "#ef4444",
        border: "1px solid rgba(239, 68, 68, 0.25)",
      };
    case "waiting":
    case "pending":
    default:
      return {
        ...base,
        backgroundColor: "rgba(245, 158, 11, 0.12)",
        color: "#f59e0b",
        border: "1px solid rgba(245, 158, 11, 0.25)",
      };
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle2 size={12} />;
    case "confirming":
    case "confirmed":
    case "sending":
      return <RefreshCw size={12} className="spin" />;
    case "partially_paid":
      return <AlertCircle size={12} />;
    case "failed":
    case "expired":
    case "refunded":
      return <AlertCircle size={12} />;
    case "waiting":
    case "pending":
    default:
      return <Clock size={12} />;
  }
}

function getSyncBtnStyle(isLocked: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 10px",
    borderRadius: "var(--so-radius-sm, 6px)",
    fontSize: "11px",
    fontWeight: 700,
    border: isLocked
      ? "1px solid var(--so-border-subtle, #333)"
      : "1px solid var(--so-border-medium, #444)",
    backgroundColor: isLocked
      ? "rgba(255, 255, 255, 0.02)"
      : "var(--so-surface-input, #222)",
    color: isLocked ? "var(--so-text-muted, #777)" : "var(--so-text-primary, #fff)",
    cursor: isLocked ? "not-allowed" : "pointer",
    opacity: isLocked ? 0.6 : 1,
    transition: "all 0.15s ease",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Centralized Styles Object
// ─────────────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  cardContainer: {
    borderRadius: "var(--so-radius-lg, 12px)",
    backgroundColor: "var(--so-surface-panel, #18191f)",
    border: "1px solid var(--so-border-medium, #2a2b36)",
    overflow: "hidden",
    marginBottom: "28px",
  },
  header: {
    padding: "14px 20px",
    borderBottom: "1px solid var(--so-border-subtle, #252631)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.01)",
  },
  headerTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  headerIcon: {
    color: "var(--so-primary, #6366f1)",
  },
  headerTitle: {
    fontWeight: 800,
    fontSize: "14px",
    color: "var(--so-text-primary, #fff)",
  },
  headerBadge: {
    fontSize: "11px",
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    color: "var(--so-text-muted, #888)",
    fontWeight: 600,
  },
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 10px",
    backgroundColor: "transparent",
    border: "1px solid var(--so-border-subtle, #333)",
    borderRadius: "var(--so-radius-sm, 6px)",
    color: "var(--so-text-secondary, #aaa)",
    fontSize: "11px",
    fontWeight: 700,
    cursor: "pointer",
  },
  emptyContainer: {
    padding: "36px 20px",
    textAlign: "center",
    color: "var(--so-text-muted, #888)",
  },
  emptyTitle: {
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--so-text-secondary, #aaa)",
    marginBottom: "4px",
  },
  emptyDesc: {
    margin: "0 0 14px 0",
    fontSize: "12px",
  },
  emptyActionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 14px",
    backgroundColor: "var(--so-primary, #6366f1)",
    border: "none",
    borderRadius: "var(--so-radius-md, 8px)",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  tableWrapper: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
    textAlign: "left",
  },
  tableHeadRow: {
    borderBottom: "1px solid var(--so-border-subtle, #252631)",
    backgroundColor: "rgba(255, 255, 255, 0.01)",
  },
  th: {
    padding: "10px 18px",
    color: "var(--so-text-muted, #888)",
    fontWeight: 700,
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.3px",
  },
  tableRow: {
    borderBottom: "1px solid var(--so-border-subtle, #1e1f29)",
  },
  td: {
    padding: "12px 18px",
    color: "var(--so-text-primary, #fff)",
    verticalAlign: "middle",
  },
  idPrimary: {
    fontFamily: "monospace",
    fontWeight: 700,
    color: "var(--so-text-primary, #fff)",
  },
  idSecondary: {
    fontSize: "10px",
    color: "var(--so-text-muted, #777)",
    marginTop: "2px",
  },
  amountText: {
    fontWeight: 800,
    color: "var(--so-text-primary, #fff)",
  },
  cryptoBadge: {
    display: "inline-block",
    padding: "2px 6px",
    borderRadius: "4px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    fontFamily: "monospace",
    fontWeight: 700,
    fontSize: "11px",
    color: "var(--so-text-secondary, #aaa)",
  },
  cryptoPending: {
    color: "var(--so-text-muted, #666)",
    fontStyle: "italic",
  },
  tdDate: {
    padding: "12px 18px",
    color: "var(--so-text-muted, #888)",
    fontSize: "11px",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
  },
  tdActions: {
    padding: "12px 18px",
    textAlign: "right",
    verticalAlign: "middle",
  },
  actionGroup: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "6px",
  },
  openBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "5px 9px",
    borderRadius: "var(--so-radius-sm, 6px)",
    fontSize: "11px",
    fontWeight: 700,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    color: "var(--so-primary, #6366f1)",
    cursor: "pointer",
  },
  creditedBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#10b981",
  },
};
