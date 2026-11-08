import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Budget } from '../../types';
import { formatMoney, BudgetStatus } from '../../utils/financeEngine';

interface FinanceBudgetsViewProps {
  budgets: Budget[];
  budgetStatuses: BudgetStatus[];
  currentMonthKey: string;
  primaryCurrency: string;
  onNewBudget: () => void;
  onEditBudget: (b: Budget) => void;
  onDeleteBudget: (b: Budget) => void;
}

export const FinanceBudgetsView: React.FC<FinanceBudgetsViewProps> = ({
  budgets,
  budgetStatuses,
  currentMonthKey,
  primaryCurrency,
  onNewBudget,
  onEditBudget,
  onDeleteBudget,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] shadow-xs">
        <div>
          <h3 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
            Spending Budgets &amp; Limits ({budgets.length})
          </h3>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            Set monthly or custom-period spending caps by category to stay disciplined
          </p>
        </div>
        <button
          onClick={onNewBudget}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Budget</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgetStatuses.map((st) => (
          <div
            key={st.budget.id}
            className="p-5 rounded-3xl bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                  {st.budget.name || st.budget.category}
                </h4>
                <span className="text-[10px] text-[rgb(var(--c-muted))]">
                  Scope: {st.budget.category === 'all' ? 'All Spending' : st.budget.category} •{' '}
                  {st.budget.period === 'custom'
                    ? `${st.budget.startDate} to ${st.budget.endDate}`
                    : `Month: ${st.budget.month || currentMonthKey}`}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onEditBudget(st.budget)}
                  className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteBudget(st.budget)}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-3 rounded-full bg-[rgb(var(--c-surface2))] overflow-hidden">
              <div
                style={{ width: `${Math.min(100, st.percentageUsed)}%` }}
                className={`h-full rounded-full transition-all duration-300 ${
                  st.warningLevel === 'danger'
                    ? 'bg-rose-500'
                    : st.warningLevel === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[rgb(var(--c-muted))]">Spent: </span>
                <span className="font-bold text-[rgb(var(--c-text))]">
                  {formatMoney(st.spentAmount, primaryCurrency)}
                </span>
              </div>

              <div>
                <span className="text-[rgb(var(--c-muted))]">Remaining: </span>
                <span
                  className={`font-bold ${
                    st.isOverBudget ? 'text-rose-500' : 'text-emerald-500'
                  }`}
                >
                  {formatMoney(st.remainingAmount, primaryCurrency)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[rgb(var(--c-border))] flex items-center justify-between text-[11px]">
              <span className="text-[rgb(var(--c-muted))]">
                Limit: {formatMoney(st.limitAmount, primaryCurrency)}
              </span>
              <span
                className={`font-heading font-bold ${
                  st.warningLevel === 'danger'
                    ? 'text-rose-500'
                    : st.warningLevel === 'warning'
                    ? 'text-amber-500'
                    : 'text-emerald-500'
                }`}
              >
                {st.percentageUsed}% of limit consumed
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
