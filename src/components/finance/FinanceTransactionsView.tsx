import React, { useState } from 'react';
import {
  HandCoins,
  PiggyBank,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Trash2,
} from 'lucide-react';
import { FinancialAccount, Transaction, FinanceCategory } from '../../types';
import { TransactionFilterOptions, formatMoney } from '../../utils/financeEngine';
import { TransactionFilterDrawer } from './TransactionFilterDrawer';

interface FinanceTransactionsViewProps {
  filters: TransactionFilterOptions;
  onFiltersChange: (f: TransactionFilterOptions) => void;
  onResetFilters: () => void;
  accounts: FinancialAccount[];
  categories: FinanceCategory[];
  transactions: Transaction[];
  accountMap: Map<string, FinancialAccount>;
  primaryCurrency: string;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
}

const PAGE_SIZE = 30;

export const FinanceTransactionsView: React.FC<FinanceTransactionsViewProps> = ({
  filters,
  onFiltersChange,
  onResetFilters,
  accounts,
  categories,
  transactions,
  accountMap,
  primaryCurrency,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  const visibleTransactions = transactions.slice(0, displayCount);
  const hasMore = transactions.length > displayCount;

  return (
    <div className="space-y-4">
      {/* Filter Drawer */}
      <TransactionFilterDrawer
        filters={filters}
        onChange={onFiltersChange}
        onReset={() => {
          onResetFilters();
          setDisplayCount(PAGE_SIZE);
        }}
        accounts={accounts}
        categories={categories}
        totalMatches={transactions.length}
      />

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] space-y-2">
          <p className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
            No matching transactions found
          </p>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            Try adjusting your search criteria, amount limits, or date filters
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleTransactions.map((tx) => {
            const acc = accountMap.get(tx.financialAccountId || tx.accountId || '');
            const srcAcc = accountMap.get(tx.sourceAccountId || '');
            const tgtAcc = accountMap.get(tx.targetAccountId || tx.toAccountId || '');

            const isExpense = tx.type === 'expense';
            const isIncome = tx.type === 'income';
            const isTransfer = tx.type === 'transfer';
            const isSaving = tx.type === 'saving';
            const isDebt = Boolean(tx.debtId) || tx.isDebtRepayment;

            return (
              <div
                key={tx.id}
                className="p-4 rounded-2xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition hover:border-[rgb(var(--c-primary))]/40"
              >
                <div className="flex items-start gap-3">
                  {/* Type Icon Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                      isDebt
                        ? 'bg-purple-500/15 text-purple-500'
                        : isSaving
                        ? 'bg-amber-500/15 text-amber-500'
                        : isTransfer
                        ? 'bg-blue-500/15 text-blue-500'
                        : isIncome
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-rose-500/15 text-rose-500'
                    }`}
                  >
                    {isDebt ? (
                      <HandCoins className="w-4 h-4" />
                    ) : isSaving ? (
                      <PiggyBank className="w-4 h-4" />
                    ) : isTransfer ? (
                      <ArrowLeftRight className="w-4 h-4" />
                    ) : isIncome ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-bold text-xs text-[rgb(var(--c-text))]">
                        {tx.category}
                      </span>

                      {tx.subcategory && (
                        <span className="px-2 py-0.5 rounded-md bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[10px] font-heading text-[rgb(var(--c-muted))]">
                          {tx.subcategory}
                        </span>
                      )}

                      {isTransfer && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-500 text-[10px] font-heading font-bold">
                          Transfer: {srcAcc?.name || 'Account'} → {tgtAcc?.name || 'Account'}
                        </span>
                      )}

                      {isDebt && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-500 text-[10px] font-heading font-bold">
                          Debt Repayment
                        </span>
                      )}

                      {isSaving && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 text-[10px] font-heading font-bold">
                          Savings Goal Deposit
                        </span>
                      )}
                    </div>

                    {/* Account & Date */}
                    <div className="text-[11px] text-[rgb(var(--c-muted))] flex items-center gap-2">
                      <span>{tx.date.substring(0, 10)}</span>
                      {!isTransfer && acc && <span>• {acc.name}</span>}
                      {tx.notes && <span>• &ldquo;{tx.notes}&rdquo;</span>}
                    </div>

                    {/* Tags */}
                    {tx.tags && tx.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {tx.tags.map((tg) => (
                          <span
                            key={tg}
                            className="px-1.5 py-0.2 rounded-md bg-[rgb(var(--c-border))]/50 text-[9px] font-mono text-[rgb(var(--c-muted))]"
                          >
                            #{tg}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Amount & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-[rgb(var(--c-border))]/50">
                  <div className="text-right">
                    <div
                      className={`text-base font-mono font-bold ${
                        isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isExpense
                          ? 'text-rose-600 dark:text-rose-400'
                          : isSaving
                          ? 'text-amber-500'
                          : 'text-blue-500'
                      }`}
                    >
                      {isIncome ? '+' : isExpense ? '-' : ''}
                      {formatMoney(tx.amount, tx.currency || primaryCurrency)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditTransaction(tx)}
                      className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-border))]/30 transition cursor-pointer"
                      title="Edit transaction"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteTransaction(tx)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Large list pagination: 30 items with "Show more" button */}
          {hasMore && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setDisplayCount((prev) => prev + PAGE_SIZE)}
                className="px-6 py-2.5 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:border-[rgb(var(--c-primary))] hover:text-[rgb(var(--c-primary))] shadow-xs transition active:scale-95 cursor-pointer"
              >
                Show more transactions ({transactions.length - displayCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
