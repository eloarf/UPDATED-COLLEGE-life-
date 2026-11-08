import React from 'react';
import { Plus, Edit2, Trash2, HandCoins } from 'lucide-react';
import { DebtRecord } from '../../types';
import { formatMoney } from '../../utils/financeEngine';

interface FinanceDebtsViewProps {
  debts: DebtRecord[];
  primaryCurrency: string;
  onNewDebt: () => void;
  onEditDebt: (d: DebtRecord) => void;
  onDeleteDebt: (d: DebtRecord) => void;
  onPaymentDebt: (d: DebtRecord) => void;
}

export const FinanceDebtsView: React.FC<FinanceDebtsViewProps> = ({
  debts,
  primaryCurrency,
  onNewDebt,
  onEditDebt,
  onDeleteDebt,
  onPaymentDebt,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] shadow-xs">
        <div>
          <h3 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
            Debt Ledger &amp; Borrowings ({debts.length})
          </h3>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            Strict accounting: Repayments reduce debt principal without distorting ordinary spending
          </p>
        </div>
        <button
          onClick={onNewDebt}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Debt</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {debts.map((debt) => {
          const isPayable = debt.type === 'payable' || debt.type === 'owe';
          const totalAmt = Number(debt.amount ?? debt.originalAmount) || 0;
          const paid = Number(debt.paidAmount) || 0;
          const remaining = typeof debt.remainingAmount === 'number'
            ? debt.remainingAmount
            : Math.max(0, totalAmt - paid);
          const isSettled = debt.status === 'settled' || remaining <= 0;

          return (
            <div
              key={debt.id}
              className={`p-5 rounded-3xl bg-[rgb(var(--c-surface))] border-2 space-y-3 transition ${
                isSettled
                  ? 'border-[rgb(var(--c-border))] opacity-70'
                  : isPayable
                  ? 'border-rose-500/30'
                  : 'border-emerald-500/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-heading font-bold ${
                        isPayable
                          ? 'bg-rose-500/15 text-rose-500'
                          : 'bg-emerald-500/15 text-emerald-500'
                      }`}
                    >
                      {isPayable ? '⚠️ I OWE' : '💰 OWED TO ME'}
                    </span>
                    {isSettled && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-heading font-bold">
                        SETTLED
                      </span>
                    )}
                  </div>
                  <h4 className="font-heading font-bold text-sm text-[rgb(var(--c-text))] mt-1">
                    {debt.personName || debt.person}
                  </h4>
                  {debt.dueDate && (
                    <div className="text-[10px] text-[rgb(var(--c-muted))] font-mono">
                      Due Date: {debt.dueDate}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditDebt(debt)}
                    className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteDebt(debt)}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-[rgb(var(--c-muted))]">Remaining: </span>
                  <span className="font-bold text-[rgb(var(--c-text))] text-sm">
                    {formatMoney(remaining, debt.currency || primaryCurrency)}
                  </span>
                </div>
                <div>
                  <span className="text-[rgb(var(--c-muted))]">Paid: </span>
                  <span>{formatMoney(paid, debt.currency || primaryCurrency)}</span> /{' '}
                  <span>{formatMoney(totalAmt, debt.currency || primaryCurrency)}</span>
                </div>
              </div>

              {debt.notes && (
                <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish italic">
                  &ldquo;{debt.notes}&rdquo;
                </p>
              )}

              {!isSettled && (
                <div className="pt-2 border-t border-[rgb(var(--c-border))]">
                  <button
                    onClick={() => onPaymentDebt(debt)}
                    className={`w-full py-2 rounded-xl font-heading text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isPayable
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                    }`}
                  >
                    <HandCoins className="w-3.5 h-3.5" />
                    <span>{isPayable ? 'Record Repayment' : 'Record Collection'}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
