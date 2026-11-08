import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { RecurringTransaction, FinancialAccount } from '../../types';
import { formatMoney } from '../../utils/financeEngine';
import { db } from '../../db/db';
import { useUiStore } from '../../store/uiStore';

interface FinanceRecurringViewProps {
  recurringList: RecurringTransaction[];
  accountMap: Map<string, FinancialAccount>;
  primaryCurrency: string;
  onNewRecurring: () => void;
  onEditRecurring: (rec: RecurringTransaction) => void;
  onDeleteRecurring: (rec: RecurringTransaction) => void;
}

export const FinanceRecurringView: React.FC<FinanceRecurringViewProps> = ({
  recurringList,
  accountMap,
  primaryCurrency,
  onNewRecurring,
  onEditRecurring,
  onDeleteRecurring,
}) => {
  const { showToast } = useUiStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] shadow-xs">
        <div>
          <h3 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
            Recurring Schedules ({recurringList.length})
          </h3>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            Automated monthly internet, dorm rent, allowances, or weekly transport budgets
          </p>
        </div>
        <button
          onClick={onNewRecurring}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Schedule</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recurringList.map((rec) => {
          const acc = accountMap.get(rec.financialAccountId || rec.accountId || '');
          return (
            <div
              key={rec.id}
              className="p-5 rounded-3xl bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] space-y-3 shadow-xs hover:border-[rgb(var(--c-primary))]/40 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-heading font-bold uppercase ${
                      rec.type === 'income'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-rose-500/15 text-rose-500'
                    }`}
                  >
                    {rec.frequency} {rec.type}
                  </span>
                  <h4 className="font-heading font-bold text-sm text-[rgb(var(--c-text))] mt-1">
                    {rec.category}
                  </h4>
                  {rec.subcategory && (
                    <div className="text-[10px] text-[rgb(var(--c-muted))]">
                      {rec.subcategory}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditRecurring(rec)}
                    className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteRecurring(rec)}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-xl font-mono font-bold text-[rgb(var(--c-text))]">
                {formatMoney(rec.amount, rec.currency || primaryCurrency)}
              </div>

              <div className="text-[11px] text-[rgb(var(--c-muted))] space-y-0.5">
                <div>Next Due: <span className="font-mono font-bold text-[rgb(var(--c-text))]">{rec.nextDueDate}</span></div>
                {acc && <div>Account: {acc.name}</div>}
                {rec.notes && <div className="italic">&ldquo;{rec.notes}&rdquo;</div>}
              </div>

              <div className="pt-2 border-t border-[rgb(var(--c-border))] flex items-center justify-between text-xs">
                <button
                  onClick={async () => {
                    await db.recurringTransactions.update(rec.id, {
                      isActive: !rec.isActive,
                    });
                    showToast(rec.isActive ? 'Schedule paused' : 'Schedule resumed', 'info');
                  }}
                  className="text-[11px] font-heading font-bold text-[rgb(var(--c-primary))] cursor-pointer"
                >
                  {rec.isActive ? 'Active (Tap to Pause)' : 'Paused (Tap to Resume)'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
