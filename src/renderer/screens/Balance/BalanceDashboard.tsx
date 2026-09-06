import React, { useEffect, useState, useCallback } from 'react';
import { Wallet, RefreshCw, ArrowUpRight, ArrowDownLeft, Clock, History, FileText, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
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
      toast.error(err.message || 'Failed to fetch balance information');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBalanceData(1);
  }, [fetchBalanceData]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--so-text-primary)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wallet style={{ color: 'var(--so-primary)' }} size={26} /> User Balance & Billing Ledger
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--so-text-secondary)' }}>
            Real-time balance, daily free credit allowance, and pay-as-you-go billing logs.
          </p>
        </div>
        <button
          onClick={() => fetchBalanceData(page)}
          disabled={isRefreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: 'var(--so-surface-card)',
            border: '1px solid var(--so-border-medium)',
            borderRadius: 'var(--so-radius-md)',
            color: 'var(--so-text-primary)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Balance Cards Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* Paid Account Balance Card */}
        <div
          style={{
            padding: '20px 24px',
            borderRadius: 'var(--so-radius-lg)',
            backgroundColor: 'var(--so-surface-panel)',
            border: '1px solid var(--so-border-medium)',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--so-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            Account Balance
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--so-text-primary)', letterSpacing: '-0.5px' }}>
            {balance ? balance.formattedBalance : '$0.00'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--so-text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={13} style={{ color: '#38bdf8' }} /> Permanent balance
          </div>
        </div>

        {/* Daily Free Allowance Card */}
        <div
          style={{
            padding: '20px 24px',
            borderRadius: 'var(--so-radius-lg)',
            backgroundColor: 'var(--so-surface-panel)',
            border: '1px solid rgba(14, 165, 233, 0.25)',
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--so-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            Daily Free Credit Allowance
          </div>
          <div style={{ fontSize: '32px', fontWeight: 900, color: '#38bdf8', letterSpacing: '-0.5px' }}>
            ${balance ? (balance.dailyFreeRemainingCents / 100).toFixed(2) : '0.00'}
            <span style={{ fontSize: '14px', color: 'var(--so-text-muted)', fontWeight: 600 }}> / ${(balance ? balance.dailyFreeAllowanceCents / 100 : 0.5).toFixed(2)}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--so-text-muted)', marginTop: '6px' }}>
            Resets daily at 00:00 UTC (usable across all services)
          </div>
        </div>

        {/* Audit Count Card */}
        <div
          style={{
            padding: '20px 24px',
            borderRadius: 'var(--so-radius-lg)',
            backgroundColor: 'var(--so-surface-panel)',
            border: '1px solid var(--so-border-medium)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--so-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            Ledger Audit Entries
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--so-text-primary)' }}>
            {totalTxns} <span style={{ fontSize: '13px', color: 'var(--so-text-muted)', fontWeight: 600 }}>records</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--so-text-muted)', marginTop: '4px' }}>
            Double-entry immutable transaction log
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div
        style={{
          borderRadius: 'var(--so-radius-lg)',
          backgroundColor: 'var(--so-surface-panel)',
          border: '1px solid var(--so-border-medium)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--so-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--so-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={16} style={{ color: 'var(--so-primary)' }} /> Transaction Audit History
          </div>
          <span style={{ fontSize: '12px', color: 'var(--so-text-muted)' }}>
            Page {page} of {totalPages} ({totalTxns} entries • Recent 200 max)
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--so-text-muted)' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '12px' }} />
            <div>Loading balance ledger...</div>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--so-text-muted)' }}>
            <FileText size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
            <div>No transaction logs found yet.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--so-border-medium)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                  <th style={{ padding: '12px 18px', color: 'var(--so-text-muted)', fontWeight: 700 }}>Type</th>
                  <th style={{ padding: '12px 18px', color: 'var(--so-text-muted)', fontWeight: 700 }}>Category</th>
                  <th style={{ padding: '12px 18px', color: 'var(--so-text-muted)', fontWeight: 700 }}>Amount</th>
                  <th style={{ padding: '12px 18px', color: 'var(--so-text-muted)', fontWeight: 700 }}>Balance After</th>
                  <th style={{ padding: '12px 18px', color: 'var(--so-text-muted)', fontWeight: 700 }}>Description</th>
                  <th style={{ padding: '12px 18px', color: 'var(--so-text-muted)', fontWeight: 700 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isCredit = tx.type === 'credit';
                  return (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--so-border-subtle)' }}>
                      {/* Type Badge */}
                      <td style={{ padding: '12px 18px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 800,
                            backgroundColor: isCredit ? 'rgba(14, 165, 233, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isCredit ? '#38bdf8' : 'var(--so-danger-text)',
                            border: `1px solid ${isCredit ? 'rgba(14, 165, 233, 0.35)' : 'rgba(239, 68, 68, 0.3)'}`,
                          }}
                        >
                          {isCredit ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                          {tx.type.toUpperCase()}
                        </span>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--so-text-secondary)' }}>
                        {tx.category}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '12px 18px', fontWeight: 800, color: isCredit ? '#38bdf8' : 'var(--so-text-primary)' }}>
                        {isCredit ? '+' : '-'}${(tx.amountCents / 100).toFixed(2)}
                      </td>

                      {/* Balance After */}
                      <td style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--so-text-muted)' }}>
                        ${(tx.balanceAfterCents / 100).toFixed(2)}
                      </td>

                      {/* Description */}
                      <td style={{ padding: '12px 18px', color: 'var(--so-text-primary)', maxWidth: '300px' }}>
                        {tx.description?.replace(/@\s*\$0\.0000\/unit/g, '@ $0.00002/unit ($0.20/10k)')}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '12px 18px', color: 'var(--so-text-muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
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
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--so-border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={() => fetchBalanceData(page - 1)}
              disabled={page <= 1}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: 'var(--so-radius-sm)',
                backgroundColor: 'var(--so-surface-input)',
                border: '1px solid var(--so-border-subtle)',
                color: 'var(--so-text-primary)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            <button
              onClick={() => fetchBalanceData(page + 1)}
              disabled={page >= totalPages}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: 'var(--so-radius-sm)',
                backgroundColor: 'var(--so-surface-input)',
                border: '1px solid var(--so-border-subtle)',
                color: 'var(--so-text-primary)',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
