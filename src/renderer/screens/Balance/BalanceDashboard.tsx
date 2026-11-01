import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  const [txSortKey, setTxSortKey] = useState<
    "date" | "amount" | "category" | "type"
  >("date");
  const [txSortDir, setTxSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: "date" | "amount" | "category" | "type") => {
    if (key === txSortKey) {
      setTxSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setTxSortKey(key);
      setTxSortDir(key === "category" || key === "type" ? "asc" : "desc");
    }
  };

  const sortedTransactions = useMemo(() => {
    const list = [...transactions];
    list.sort((a, b) => {
      let comparison = 0;
      switch (txSortKey) {
        case "amount":
          comparison = a.amountCents - b.amountCents;
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
        case "date":
        default:
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return txSortDir === "asc" ? comparison : -comparison;
    });
    return list;
  }, [transactions, txSortKey, txSortDir]);

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
      toast.error(err.message || "Failed to load balance information");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBalanceData(1);
  }, [fetchBalanceData]);

  const freeAllowanceUsedPercent = useMemo(() => {
    if (!balance || balance.dailyFreeAllowanceCents <= 0) return 0;
    const used =
      balance.dailyFreeAllowanceCents - balance.dailyFreeRemainingCents;
    return Math.min(
      100,
      Math.max(0, Math.round((used / balance.dailyFreeAllowanceCents) * 100)),
    );
  }, [balance]);

  const groupedTransactions = useMemo(() => {
    if (txSortKey !== "date") {
      return [{ label: "All Transactions", items: sortedTransactions }];
    }

    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

    const groups: { label: string; items: Transaction[] }[] = [
      { label: "Today", items: [] },
      { label: "Yesterday", items: [] },
      { label: "This Week", items: [] },
      { label: "Earlier", items: [] },
    ];

    for (const tx of sortedTransactions) {
      const timestamp = new Date(tx.createdAt).getTime();
      if (Number.isNaN(timestamp)) {
        groups[3].items.push(tx);
      } else if (timestamp >= startOfToday) {
        groups[0].items.push(tx);
      } else if (timestamp >= startOfYesterday) {
        groups[1].items.push(tx);
      } else if (timestamp >= startOfWeek) {
        groups[2].items.push(tx);
      } else {
        groups[3].items.push(tx);
      }
    }

    return groups.filter((group) => group.items.length > 0);
  }, [sortedTransactions, txSortKey]);

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

      {/* Hero balance + usage overview */}
      <div style={styles.heroGrid}>
        <div style={styles.heroCard}>
          <div style={styles.heroLabel}>SkinOracle Balance</div>
          <div style={styles.heroValue}>
            {balance ? balance.formattedBalance : "$0.00"}
          </div>
          <div style={styles.heroMeta}>
            <CheckCircle2 size={13} style={styles.permanentIcon} /> Permanent
            prepaid balance
          </div>
          <button
            onClick={() => setIsDepositModalOpen(true)}
            style={styles.heroDepositBtn}
          >
            <PlusCircle size={15} /> Buy More Credits
          </button>
        </div>

        <div style={styles.sideStatStack}>
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
              <div className="progress-bar-track" style={styles.usageTrack}>
                <div
                  className="progress-bar-fill"
                  style={{ width: `${freeAllowanceUsedPercent}%` }}
                />
              </div>
              <div style={styles.allowanceNote}>
                {freeAllowanceUsedPercent}% used this period • Resets daily at
                00:00 UTC
              </div>
            </div>
          )}

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
                    <th
                      className="sortable-th"
                      style={styles.th}
                      onClick={() => handleSort("type")}
                    >
                      Type{getSortIndicator(txSortKey, txSortDir, "type")}
                    </th>
                    <th
                      className="sortable-th"
                      style={styles.th}
                      onClick={() => handleSort("category")}
                    >
                      Category{getSortIndicator(txSortKey, txSortDir, "category")}
                    </th>
                    <th
                      className="sortable-th"
                      style={styles.th}
                      onClick={() => handleSort("amount")}
                    >
                      Amount{getSortIndicator(txSortKey, txSortDir, "amount")}
                    </th>
                    <th style={styles.th}>Balance After</th>
                    <th style={styles.th}>Description</th>
                    <th
                      className="sortable-th"
                      style={styles.th}
                      onClick={() => handleSort("date")}
                    >
                      Date{getSortIndicator(txSortKey, txSortDir, "date")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedTransactions.map((group) => (
                    <React.Fragment key={group.label}>
                      <tr>
                        <td colSpan={6} style={styles.dateGroupLabel}>
                          {group.label}
                        </td>
                      </tr>
                      {group.items.map((tx) => {
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
                    </React.Fragment>
                  ))}
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
    transition:
      "background-color var(--so-duration-fast) var(--so-ease-out), color var(--so-duration-fast) var(--so-ease-out)",
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

// ── Sort indicator ──────────────────────────────────────────────────

function getSortIndicator(
  activeKey: string,
  direction: "asc" | "desc",
  key: string,
): string {
  if (activeKey !== key) return "";
  return direction === "asc" ? " ↑" : " ↓";
}

// ─────────────────────────────────────────────────────────────────────────────
// Centralized Styles Object
// ─────────────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "var(--so-screen-max-width)",
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
  heroGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 1.2fr) minmax(260px, 1fr)",
    gap: "16px",
    marginBottom: "24px",
  },
  heroCard: {
    padding: "28px 30px",
    borderRadius: "var(--so-radius-lg)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-2)",
    background:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.16) 0%, rgba(15, 23, 42, 0.7) 100%)",
    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.3)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    justifyContent: "center",
  },
  heroLabel: {
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.7px",
    textTransform: "uppercase",
    color: "var(--so-text-secondary)",
  },
  heroValue: {
    fontSize: "46px",
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: "-1px",
    color: "var(--so-text-primary)",
    fontVariantNumeric: "tabular-nums",
  },
  heroMeta: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "var(--so-text-muted)",
  },
  heroDepositBtn: {
    marginTop: "12px",
    alignSelf: "flex-start",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "9px 16px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-primary)",
    border: "1px solid var(--so-primary-hover)",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 800,
    cursor: "pointer",
    transition:
      "background-color var(--so-duration-fast) var(--so-ease-out), border-color var(--so-duration-fast) var(--so-ease-out)",
  },
  sideStatStack: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  usageTrack: {
    marginTop: "10px",
    backgroundColor: "var(--so-surface-3)",
  },
  dateGroupLabel: {
    padding: "14px 12px 6px 12px",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    color: "var(--so-text-muted)",
    borderBottom: "1px solid var(--so-border-0)",
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
    position: "sticky",
    top: 0,
    zIndex: 1,
    padding: "12px 18px",
    color: "var(--so-text-muted)",
    fontWeight: 700,
    backgroundColor: "var(--so-surface-panel)",
    borderBottom: "1px solid var(--so-border-medium)",
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

