import React, { useEffect, useState, useCallback } from "react";
import {
  Wallet,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  History,
  FileText,
  CheckCircle2,
  Coins,
  Receipt,
  PlusCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import DepositModal from "./components/DepositModal";
import DepositHistorySection from "./components/DepositHistorySection";

export type BalanceTabId = "ledger" | "deposits";

interface BalanceTab {
  id: BalanceTabId;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

interface Transaction {
  id: string;
  type: "credit" | "debit";
  category: string;
  amountCents: number;
  balanceAfterCents: number;
  description: string;
  referenceId: string | null;
  createdAt: string;
}

interface BalanceData {
  balanceCents: number;
  formattedBalance: string;
  dailyFreeAllowanceCents: number;
  dailyFreeRemainingCents: number;
}

export default function BalanceDashboard() {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalTxns, setTotalTxns] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<BalanceTabId>("ledger");

  const tabs: BalanceTab[] = [
    {
      id: "ledger",
      label: "Transaction Ledger",
      icon: <History size={15} />,
      badge: totalTxns > 0 ? `${totalTxns}` : undefined,
    },
    {
      id: "deposits",
      label: "Deposit Invoices",
      icon: <Receipt size={15} />,
    },
  ];

  const fetchBalanceData = useCallback(async (targetPage = 1) => {
    try {
      setIsRefreshing(true);
      const [balRes, histRes] = await Promise.all([
        window.electronAPI.balance.getBalance(),
        window.electronAPI.balance.getHistory(targetPage, 15),
      ]);
      setBalance(balRes);
      setTransactions(histRes.transactions || []);
      setPage(histRes.page || 1);
      setTotalPages(histRes.totalPages || 1);
      setTotalTxns(histRes.total || 0);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch balance information");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBalanceData(1);
  }, [fetchBalanceData]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>
            <Wallet style={styles.headerIcon} size={26} /> User Balance &
            Billing Ledger
          </h1>
          <p style={styles.headerSubtitle}>
            Real-time balance and pay-as-you-go billing ledger logs.
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={() => setIsDepositModalOpen(true)}
            style={styles.depositBtn}
          >
            <PlusCircle size={15} /> Deposit Funds
          </button>
          <button
            onClick={() => fetchBalanceData(page)}
            disabled={isRefreshing}
            style={styles.refreshBtn}
          >
            <RefreshCw size={14} className={isRefreshing ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Balance Cards Overview */}
      <div style={styles.overviewGrid}>
        {/* Paid Account Balance Card */}
        <div style={styles.balanceCard}>
          <div style={styles.cardLabel}>Account Balance</div>
          <div style={styles.balanceValue}>
            {balance ? balance.formattedBalance : "$0.00"}
          </div>
          <div style={styles.permanentBadge}>
            <CheckCircle2 size={13} style={styles.permanentIcon} /> Permanent
            balance
          </div>
        </div>

        {/* Daily Free Allowance Card (Hidden if set to 0 in DB) */}
        {Boolean(balance && balance.dailyFreeAllowanceCents > 0) && (
          <div style={styles.allowanceCard}>
            <div style={styles.cardLabel}>Daily Free Credit Allowance</div>
            <div style={styles.allowanceValue}>
              $
              {balance
                ? (balance.dailyFreeRemainingCents / 100).toFixed(2)
                : "0.00"}
              <span style={styles.allowanceTotal}>
                {" "}
                / $
                {(balance
                  ? balance.dailyFreeAllowanceCents / 100
                  : 0
                ).toFixed(2)}
              </span>
            </div>
            <div style={styles.allowanceNote}>
              Resets daily at 00:00 UTC (usable across all services)
            </div>
          </div>
        )}

        {/* Audit Count Card */}
        <div style={styles.auditCard}>
          <div style={styles.cardLabel}>Ledger Audit Entries</div>
          <div style={styles.auditValue}>
            {totalTxns} <span style={styles.auditUnit}>records</span>
          </div>
          <div style={styles.auditNote}>
            Double-entry immutable transaction log
          </div>
        </div>
      </div>

      {/* Tab Switcher Bar (Matching Settings Screen) */}
      <div style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={getTabButtonStyle(isActive)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor =
                    "var(--so-surface-card-hover)";
                  e.currentTarget.style.color = "var(--so-text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--so-text-secondary)";
                }
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span style={getTabBadgeStyle(isActive)}>{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Transaction Audit History */}
      {activeTab === "ledger" && (
        <div style={styles.ledgerPanel}>
          <div style={styles.ledgerHeader}>
            <div style={styles.ledgerTitle}>
              <History size={16} style={styles.ledgerIcon} /> Transaction Audit
              History
            </div>
            <span style={styles.ledgerPageMeta}>
              Page {page} of {totalPages} ({totalTxns} entries • Recent 200 max)
            </span>
          </div>

          {isLoading ? (
            <div style={styles.centerState}>
              <RefreshCw
                size={24}
                className="spin"
                style={styles.spinIcon}
              />
              <div>Loading balance ledger...</div>
            </div>
          ) : transactions.length === 0 ? (
            <div style={styles.centerState}>
              <FileText
                size={32}
                style={styles.emptyIcon}
              />
              <div>No transaction logs found yet.</div>
            </div>
          ) : (
            <div style={styles.tableScroll}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeadRow}>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Balance After</th>
                    <th style={styles.th}>Description</th>
                    <th style={styles.th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const isCredit = tx.type === "credit";
                    return (
                      <tr key={tx.id} style={styles.tableRow}>
                        {/* Type Badge */}
                        <td style={styles.td}>
                          <span style={getTypeBadgeStyle(isCredit)}>
                            {isCredit ? (
                              <ArrowUpRight size={13} />
                            ) : (
                              <ArrowDownLeft size={13} />
                            )}
                            {tx.type.toUpperCase()}
                          </span>
                        </td>

                        {/* Category */}
                        <td style={styles.categoryTd}>{tx.category}</td>

                        {/* Amount */}
                        <td style={getAmountStyle(isCredit)}>
                          {isCredit ? "+" : "-"}$
                          {(tx.amountCents / 100).toFixed(2)}
                        </td>

                        {/* Balance After */}
                        <td style={styles.balanceAfterTd}>
                          ${(tx.balanceAfterCents / 100).toFixed(2)}
                        </td>

                        {/* Description */}
                        <td style={styles.descriptionTd}>
                          {tx.description?.replace(
                            /@\s*\$0\.0000\/unit/g,
                            "@ $0.00002/unit ($0.20/10k)",
                          )}
                        </td>

                        {/* Date */}
                        <td style={styles.dateTd}>
                          <Clock size={12} style={styles.dateIcon} />
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div style={styles.paginationFooter}>
              <button
                onClick={() => fetchBalanceData(page - 1)}
                disabled={page <= 1}
                style={getPaginationBtnStyle(page <= 1)}
              >
                Previous
              </button>
              <button
                onClick={() => fetchBalanceData(page + 1)}
                disabled={page >= totalPages}
                style={getPaginationBtnStyle(page >= totalPages)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Deposit Invoices */}
      {activeTab === "deposits" && (
        <DepositHistorySection
          onBalanceRefreshRequired={() => fetchBalanceData(page)}
          onOpenDepositModal={() => setIsDepositModalOpen(true)}
        />
      )}

      {/* Deposit Funds Modal */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onDepositSuccess={() => {
          fetchBalanceData(1);
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure Helper Functions for Dynamic Styling
// ─────────────────────────────────────────────────────────────────────────────

function getTabButtonStyle(isActive: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: isActive ? "var(--so-primary)" : "transparent",
    color: isActive ? "#ffffff" : "var(--so-text-secondary)",
    border: "none",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  };
}

function getTabBadgeStyle(isActive: boolean): React.CSSProperties {
  return {
    fontSize: "10px",
    fontWeight: 800,
    padding: "1px 6px",
    borderRadius: "4px",
    backgroundColor: isActive
      ? "rgba(255, 255, 255, 0.2)"
      : "rgba(168, 85, 247, 0.15)",
    color: isActive ? "#ffffff" : "#c084fc",
    border: isActive ? "none" : "1px solid rgba(168, 85, 247, 0.3)",
    textTransform: "uppercase",
  };
}

function getTypeBadgeStyle(isCredit: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 800,
    backgroundColor: isCredit
      ? "rgba(14, 165, 233, 0.15)"
      : "rgba(239, 68, 68, 0.15)",
    color: isCredit ? "#38bdf8" : "var(--so-danger-text)",
    border: `1px solid ${
      isCredit ? "rgba(14, 165, 233, 0.35)" : "rgba(239, 68, 68, 0.3)"
    }`,
  };
}

function getAmountStyle(isCredit: boolean): React.CSSProperties {
  return {
    padding: "12px 18px",
    fontWeight: 800,
    color: isCredit ? "#38bdf8" : "var(--so-text-primary)",
  };
}

function getPaginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 700,
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-subtle)",
    color: "var(--so-text-primary)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Centralized Styles Object
// ─────────────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  headerTitle: {
    fontSize: "24px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
    margin: "0 0 6px 0",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  headerIcon: {
    color: "var(--so-primary)",
  },
  headerSubtitle: {
    margin: 0,
    fontSize: "13px",
    color: "var(--so-text-secondary)",
  },
  headerActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  depositBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 18px",
    backgroundColor: "var(--so-primary, #6366f1)",
    border: "none",
    borderRadius: "var(--so-radius-md)",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 2px 10px rgba(99, 102, 241, 0.3)",
  },
  refreshBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    color: "var(--so-text-primary)",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  overviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
    marginBottom: "28px",
  },
  balanceCard: {
    padding: "20px 24px",
    borderRadius: "var(--so-radius-lg)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    background:
      "linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
  },
  cardLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--so-text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "6px",
  },
  balanceValue: {
    fontSize: "32px",
    fontWeight: 900,
    color: "var(--so-text-primary)",
    letterSpacing: "-0.5px",
  },
  permanentBadge: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
    marginTop: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  permanentIcon: {
    color: "#38bdf8",
  },
  allowanceCard: {
    padding: "20px 24px",
    borderRadius: "var(--so-radius-lg)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid rgba(14, 165, 233, 0.25)",
    background:
      "linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)",
  },
  allowanceValue: {
    fontSize: "32px",
    fontWeight: 900,
    color: "#38bdf8",
    letterSpacing: "-0.5px",
  },
  allowanceTotal: {
    fontSize: "14px",
    color: "var(--so-text-muted)",
    fontWeight: 600,
  },
  allowanceNote: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
    marginTop: "6px",
  },
  auditCard: {
    padding: "20px 24px",
    borderRadius: "var(--so-radius-lg)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  auditValue: {
    fontSize: "28px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
  },
  auditUnit: {
    fontSize: "13px",
    color: "var(--so-text-muted)",
    fontWeight: 600,
  },
  auditNote: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
    marginTop: "4px",
  },
  tabBar: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    padding: "6px",
    overflowX: "auto",
  },
  ledgerPanel: {
    borderRadius: "var(--so-radius-lg)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    overflow: "hidden",
  },
  ledgerHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid var(--so-border-subtle)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ledgerTitle: {
    fontWeight: 800,
    fontSize: "15px",
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  ledgerIcon: {
    color: "var(--so-primary)",
  },
  ledgerPageMeta: {
    fontSize: "12px",
    color: "var(--so-text-muted)",
  },
  centerState: {
    padding: "40px",
    textAlign: "center",
    color: "var(--so-text-muted)",
  },
  spinIcon: {
    marginBottom: "12px",
  },
  emptyIcon: {
    marginBottom: "12px",
    opacity: 0.5,
  },
  tableScroll: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
    textAlign: "left",
  },
  tableHeadRow: {
    borderBottom: "1px solid var(--so-border-medium)",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  th: {
    padding: "12px 18px",
    color: "var(--so-text-muted)",
    fontWeight: 700,
  },
  tableRow: {
    borderBottom: "1px solid var(--so-border-subtle)",
  },
  td: {
    padding: "12px 18px",
  },
  categoryTd: {
    padding: "12px 18px",
    fontWeight: 600,
    color: "var(--so-text-secondary)",
  },
  balanceAfterTd: {
    padding: "12px 18px",
    fontWeight: 700,
    color: "var(--so-text-muted)",
  },
  descriptionTd: {
    padding: "12px 18px",
    color: "var(--so-text-primary)",
    maxWidth: "300px",
  },
  dateTd: {
    padding: "12px 18px",
    color: "var(--so-text-muted)",
    fontSize: "12px",
    whiteSpace: "nowrap",
  },
  dateIcon: {
    display: "inline",
    marginRight: "4px",
  },
  paginationFooter: {
    padding: "12px 20px",
    borderTop: "1px solid var(--so-border-subtle)",
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
  },
};

