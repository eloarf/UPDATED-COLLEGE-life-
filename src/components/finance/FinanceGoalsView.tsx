import React from 'react';
import { Plus, Edit2, Trash2, PiggyBank } from 'lucide-react';
import { SavingsGoal } from '../../types';
import { formatMoney } from '../../utils/financeEngine';

interface FinanceGoalsViewProps {
  savingsGoals: SavingsGoal[];
  primaryCurrency: string;
  onNewGoal: () => void;
  onEditGoal: (g: SavingsGoal) => void;
  onDeleteGoal: (g: SavingsGoal) => void;
  onActionGoal: (g: SavingsGoal) => void;
}

export const FinanceGoalsView: React.FC<FinanceGoalsViewProps> = ({
  savingsGoals,
  primaryCurrency,
  onNewGoal,
  onEditGoal,
  onDeleteGoal,
  onActionGoal,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] shadow-xs">
        <div>
          <h3 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
            Student Savings Goals ({savingsGoals.length})
          </h3>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            Set milestones for tuition, emergency funds, tech gear, or semester trips
          </p>
        </div>
        <button
          onClick={onNewGoal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Savings Goal</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {savingsGoals.map((goal) => {
          const pct =
            goal.targetAmount > 0
              ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
              : 0;
          return (
            <div
              key={goal.id}
              className="p-5 rounded-3xl bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] space-y-3 shadow-xs hover:border-[rgb(var(--c-primary))]/40 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                    {goal.title}
                  </h4>
                  {goal.deadline && (
                    <div className="text-[10px] text-[rgb(var(--c-muted))] font-mono">
                      Target: {goal.deadline}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditGoal(goal)}
                    className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteGoal(goal)}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-heading font-bold text-[rgb(var(--c-muted))]">
                    Progress
                  </span>
                  <span className="font-mono font-bold text-amber-500">{pct}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-[rgb(var(--c-surface2))] overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className="h-full rounded-full bg-amber-500 transition-all duration-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[rgb(var(--c-muted))]">
                  Saved: {formatMoney(goal.currentAmount, goal.currency || primaryCurrency)}
                </span>
                <span className="font-bold text-[rgb(var(--c-text))]">
                  Target: {formatMoney(goal.targetAmount, goal.currency || primaryCurrency)}
                </span>
              </div>

              {/* Contribution Button */}
              <div className="pt-2 border-t border-[rgb(var(--c-border))]">
                <button
                  onClick={() => onActionGoal(goal)}
                  className="w-full py-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-heading text-xs font-bold hover:bg-amber-500/25 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PiggyBank className="w-3.5 h-3.5" />
                  <span>Deposit / Withdraw</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
