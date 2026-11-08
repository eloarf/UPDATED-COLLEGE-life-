import React from 'react';
import {
  Wallet,
  Building2,
  Smartphone,
  Banknote,
  PiggyBank,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  ArrowRight,
  Plus,
  HandCoins,
  LucideIcon,
} from 'lucide-react';
import { FinancialAccount, FinancialAccountType, SavingsGoal } from '../../types';
import { formatMoney, BudgetStatus } from '../../utils/financeEngine';

const ACCOUNT_TYPE_LABELS: Record<FinancialAccountType, { label: string; icon: LucideIcon }> = {
  bank: { label: 'Bank Account', icon: Building2 },
  mobile_money: { label: 'Mobile Money', icon: Smartphone },
  cash: { label: 'Cash on Hand', icon: Banknote },
  savings: { label: 'Dedicated Savings', icon: PiggyBank },
  digital_wallet: { label: 'Digital Wallet', icon: Wallet },
  custom: { label: 'Custom Account', icon: Coins },
  other: { label: 'Other Account', icon: Coins },
};

interface FinanceOverviewViewProps {
  totalNetWorth: number;
  primaryCurrency: string;
  accounts: FinancialAccount[];
  accountBalances: Record<string, number>;
  thisMonthCashFlow: {
    totalIncome: number;
    totalExpenses: number;
    netCashFlow: number;
    savingsRate: number;
  };
  currentMonthKey: string;
  onManageAccounts: () => void;
  onAddAccount: () => void;
  budgetStatuses: BudgetStatus[];
  onNewBudget: () => void;
  savingsGoals: SavingsGoal[];
  onViewAllSavings: () => void;
  debtSummary: {
    totalPayable: number;
    totalReceivable: number;
    pendingPayablesCount: number;
    pendingReceivablesCount: number;
  };
  onManageDebts: () => void;
}

export const FinanceOverviewView: React.FC<FinanceOverviewViewProps> = ({
  totalNetWorth,
  primaryCurrency,
  accounts,
  accountBalances,
  thisMonthCashFlow,
  currentMonthKey,
  onManageAccounts,
  onAddAccount,
  budgetStatuses,
  onNewBudget,
  savingsGoals,
  onViewAllSavings,
  debtSummary,
  onManageDebts,
}) => {
  return (
    <div className="space-y-6">
      {/* Net Worth & Cash Flow Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Balance Card */}
        <div className="p-5 rounded-3xl bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
            <span>Total Net Worth</span>
            <Wallet className="w-4 h-4 text-[rgb(var(--c-primary))]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[rgb(var(--c-text))]">
            {formatMoney(totalNetWorth, primaryCurrency)}
          </div>
          <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
            Across {accounts.filter((a) => !a.isArchived).length} active accounts &amp; wallets
          </p>
        </div>

        {/* Monthly Inflow */}
        <div className="p-5 rounded-3xl bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
            <span>This Month Inflow</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(thisMonthCashFlow.totalIncome, primaryCurrency)}
          </div>
          <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
            Excludes internal transfers &amp; debt repayments
          </p>
        </div>

        {/* Monthly Outflow */}
        <div className="p-5 rounded-3xl bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
            <span>This Month Spending</span>
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400">
            {formatMoney(thisMonthCashFlow.totalExpenses, primaryCurrency)}
          </div>
          <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
            Pure operating expenses only
          </p>
        </div>

        {/* Net Surplus / Savings Rate */}
        <div className="p-5 rounded-3xl bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
            <span>Net Cash Flow ({currentMonthKey})</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div
            className={`text-2xl font-mono font-bold ${
              thisMonthCashFlow.netCashFlow >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatMoney(thisMonthCashFlow.netCashFlow, primaryCurrency)}
          </div>
          <div className="text-[11px] font-mono font-bold text-amber-500">
            Savings Rate: {thisMonthCashFlow.savingsRate}%
          </div>
        </div>
      </div>

      {/* Quick Account Balances Chips */}
      <div className="p-5 rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-[rgb(var(--c-muted))]">
            Account &amp; Wallet Balances
          </h3>
          <button
            onClick={onManageAccounts}
            className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Manage Accounts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="p-4 text-center rounded-2xl bg-[rgb(var(--c-surface2))] text-xs text-[rgb(var(--c-muted))] font-flourish">
            No accounts set up yet.{' '}
            <button
              onClick={onAddAccount}
              className="text-[rgb(var(--c-primary))] font-bold underline cursor-pointer"
            >
              Add your first account (CBE, Telebirr, Cash)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {accounts
              .filter((a) => !a.isArchived)
              .map((acc) => {
                const balance = accountBalances[acc.id] || 0;
                const Icon = ACCOUNT_TYPE_LABELS[acc.accountType || acc.type || 'bank']?.icon || Wallet;
                return (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-2xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] space-y-1"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-heading font-bold text-[rgb(var(--c-text))] truncate">
                      <Icon className="w-3.5 h-3.5 text-[rgb(var(--c-primary))] shrink-0" />
                      <span className="truncate">{acc.name}</span>
                    </div>
                    <div className="text-base font-mono font-bold text-[rgb(var(--c-text))]">
                      {formatMoney(balance, acc.currency || primaryCurrency)}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Active Budgets Progress Section */}
      <div className="p-6 rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
              Monthly &amp; Custom Budget Progress
            </h3>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Live tracking against your configured spending limits
            </p>
          </div>
          <button
            onClick={onNewBudget}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[rgb(var(--c-primary))]/15 text-[rgb(var(--c-primary))] font-heading text-xs font-bold hover:bg-[rgb(var(--c-primary))]/25 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Budget</span>
          </button>
        </div>

        {budgetStatuses.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-[rgb(var(--c-surface2))] text-xs text-[rgb(var(--c-muted))] font-flourish">
            No active budgets for {currentMonthKey}. Set a budget to prevent student overspending!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgetStatuses.map((st) => (
              <div
                key={st.budget.id}
                className="p-4 rounded-2xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-heading font-bold text-xs text-[rgb(var(--c-text))]">
                      {st.budget.name || st.budget.category}
                    </div>
                    <div className="text-[10px] text-[rgb(var(--c-muted))]">
                      {st.budget.category === 'all' ? 'All Categories' : st.budget.category} •{' '}
                      {st.budget.period === 'custom'
                        ? `${st.budget.startDate} to ${st.budget.endDate}`
                        : 'Monthly'}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-heading font-bold ${
                      st.warningLevel === 'danger'
                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                        : st.warningLevel === 'warning'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {st.isOverBudget
                      ? 'EXCEEDED'
                      : st.warningLevel === 'warning'
                      ? 'WARNING 80%'
                      : `${st.percentageUsed}% USED`}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 rounded-full bg-[rgb(var(--c-border))] overflow-hidden">
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

                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[rgb(var(--c-muted))]">
                    Spent: {formatMoney(st.spentAmount, primaryCurrency)}
                  </span>
                  <span className="font-bold text-[rgb(var(--c-text))]">
                    Rem: {formatMoney(st.remainingAmount, primaryCurrency)} of{' '}
                    {formatMoney(st.limitAmount, primaryCurrency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Widgets Grid: Savings & Debts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Savings Goals Widget */}
        <div className="p-6 rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-amber-500" />
              <h3 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                Savings Goals
              </h3>
            </div>
            <button
              onClick={onViewAllSavings}
              className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] hover:underline cursor-pointer"
            >
              View All ({savingsGoals.length})
            </button>
          </div>

          {savingsGoals.length === 0 ? (
            <div className="p-4 text-center rounded-2xl bg-[rgb(var(--c-surface2))] text-xs text-[rgb(var(--c-muted))] font-flourish">
              No active savings goals. Create one for dorm equipment, books, or emergencies!
            </div>
          ) : (
            <div className="space-y-3">
              {savingsGoals.slice(0, 3).map((g) => {
                const pct =
                  g.targetAmount > 0
                    ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
                    : 0;
                return (
                  <div
                    key={g.id}
                    className="p-3 rounded-2xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-heading font-bold text-[rgb(var(--c-text))]">
                        {g.title}
                      </span>
                      <span className="font-mono font-bold text-amber-500">{pct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[rgb(var(--c-border))] overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-amber-500 transition-all"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[rgb(var(--c-muted))]">
                      <span>Saved: {formatMoney(g.currentAmount, g.currency || primaryCurrency)}</span>
                      <span>Target: {formatMoney(g.targetAmount, g.currency || primaryCurrency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Debts Widget */}
        <div className="p-6 rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HandCoins className="w-4 h-4 text-purple-500" />
              <h3 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                Debts &amp; Receivables
              </h3>
            </div>
            <button
              onClick={onManageDebts}
              className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] hover:underline cursor-pointer"
            >
              Manage Ledger
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
              <div className="text-[10px] font-heading font-bold text-rose-600 dark:text-rose-400 uppercase">
                I Owe Others
              </div>
              <div className="text-lg font-mono font-bold text-rose-600 dark:text-rose-400 mt-1">
                {formatMoney(debtSummary.totalPayable, primaryCurrency)}
              </div>
              <div className="text-[10px] text-[rgb(var(--c-muted))]">
                {debtSummary.pendingPayablesCount} unsettled
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-[10px] font-heading font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                Owed to Me
              </div>
              <div className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatMoney(debtSummary.totalReceivable, primaryCurrency)}
              </div>
              <div className="text-[10px] text-[rgb(var(--c-muted))]">
                {debtSummary.pendingReceivablesCount} unsettled
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
