import React, { useState, useMemo } from 'react';
import { Transaction } from '../../types';
import {
  generateFinanceReport,
  formatMoney,
  DEFAULT_EXCHANGE_RATES,
} from '../../utils/financeEngine';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

interface FinanceReportsViewProps {
  transactions: Transaction[];
  primaryCurrency?: string;
  exchangeRates?: Record<string, number>;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const FinanceReportsView: React.FC<FinanceReportsViewProps> = ({
  transactions,
  primaryCurrency = 'ETB',
  exchangeRates = DEFAULT_EXCHANGE_RATES,
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  const report = useMemo(() => {
    return generateFinanceReport(transactions, selectedYear, primaryCurrency, exchangeRates);
  }, [transactions, selectedYear, primaryCurrency, exchangeRates]);

  const { monthlyStats, yearlyStats } = report;

  // Find max monthly value for bar chart scaling
  const maxMonthlyVal = useMemo(() => {
    const vals = monthlyStats.flatMap((m) => [m.income, m.expense]);
    return Math.max(...vals, 100);
  }, [monthlyStats]);

  return (
    <div className="space-y-6">
      {/* Year Selector & Summary Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] shadow-xs">
        <div>
          <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
            Financial Analytics &amp; Reports ({selectedYear})
          </h3>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            Strict cash-flow accounting, multi-currency conversion, and category breakdown
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[rgb(var(--c-muted))]" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-heading font-bold text-[rgb(var(--c-text))]"
          >
            {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((yr) => (
              <option key={yr} value={yr}>
                {yr} Annual View
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Yearly Highlights Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] shadow-xs">
          <div className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
            Total Inflow ({selectedYear})
          </div>
          <div className="text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formatMoney(yearlyStats.totalIncome, primaryCurrency)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] shadow-xs">
          <div className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
            Total Outflow ({selectedYear})
          </div>
          <div className="text-lg font-mono font-bold text-rose-600 dark:text-rose-400">
            {formatMoney(yearlyStats.totalExpenses, primaryCurrency)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] shadow-xs">
          <div className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
            Net Surplus / Cash Flow
          </div>
          <div
            className={`text-lg font-mono font-bold ${
              yearlyStats.netCashFlow >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatMoney(yearlyStats.netCashFlow, primaryCurrency)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] shadow-xs">
          <div className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
            Overall Savings Rate
          </div>
          <div className="text-lg font-mono font-bold text-amber-500">
            {yearlyStats.savingsRate}%
          </div>
        </div>
      </div>

      {/* Monthly Inflow vs Outflow Bar Chart */}
      <div className="p-6 rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[rgb(var(--c-primary))]" />
            <h4 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
              Monthly Inflow vs. Outflow Breakdown
            </h4>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-heading font-bold">
            <span className="flex items-center gap-1.5 text-emerald-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Income
            </span>
            <span className="flex items-center gap-1.5 text-rose-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> Expense
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-1.5 items-end h-44 pt-6 border-b border-[rgb(var(--c-border))] pb-2">
          {monthlyStats.map((m, idx) => {
            const incomeH = maxMonthlyVal > 0 ? (m.income / maxMonthlyVal) * 100 : 0;
            const expenseH = maxMonthlyVal > 0 ? (m.expense / maxMonthlyVal) * 100 : 0;

            return (
              <div key={m.monthKey} className="flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 pointer-events-none bg-black/90 text-white text-[9px] font-mono p-1.5 rounded-md whitespace-nowrap shadow-lg">
                  <div>Inc: {formatMoney(m.income, primaryCurrency)}</div>
                  <div>Exp: {formatMoney(m.expense, primaryCurrency)}</div>
                </div>

                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                  <div
                    style={{ height: `${Math.max(4, incomeH)}%` }}
                    className="w-2 sm:w-3 bg-emerald-500/80 rounded-t-sm transition-all group-hover:bg-emerald-500"
                  />
                  <div
                    style={{ height: `${Math.max(4, expenseH)}%` }}
                    className="w-2 sm:w-3 bg-rose-500/80 rounded-t-sm transition-all group-hover:bg-rose-500"
                  />
                </div>
                <span className="text-[9px] font-mono text-[rgb(var(--c-muted))] mt-2 font-bold">
                  {MONTH_NAMES[idx]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category & Subcategory Spending Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="p-6 rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[rgb(var(--c-primary))]" />
            <h4 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
              Spending by Category ({selectedYear})
            </h4>
          </div>

          {yearlyStats.categoryBreakdown.length === 0 ? (
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish py-6 text-center">
              No expenses recorded in {selectedYear} yet.
            </p>
          ) : (
            <div className="space-y-3">
              {yearlyStats.categoryBreakdown.map((cat, i) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-heading font-bold text-[rgb(var(--c-text))]">
                      {cat.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[rgb(var(--c-text))]">
                        {formatMoney(cat.amount, primaryCurrency)}
                      </span>
                      <span className="font-mono text-[10px] text-[rgb(var(--c-muted))] w-10 text-right">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[rgb(var(--c-surface2))] overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      className={`h-full rounded-full ${
                        i === 0
                          ? 'bg-rose-500'
                          : i === 1
                          ? 'bg-amber-500'
                          : i === 2
                          ? 'bg-blue-500'
                          : i === 3
                          ? 'bg-purple-500'
                          : 'bg-[rgb(var(--c-primary))]'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subcategory Details */}
        <div className="p-6 rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[rgb(var(--c-primary))]" />
            <h4 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
              Granular Subcategory Breakdown
            </h4>
          </div>

          {yearlyStats.subcategoryBreakdown.length === 0 ? (
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish py-6 text-center">
              No subcategory expenses recorded in {selectedYear} yet.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {yearlyStats.subcategoryBreakdown.map((sub) => (
                <div
                  key={`${sub.category}-${sub.subcategory}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[rgb(var(--c-surface2))] text-xs"
                >
                  <div>
                    <div className="font-heading font-bold text-[rgb(var(--c-text))]">
                      {sub.subcategory}
                    </div>
                    <div className="text-[10px] text-[rgb(var(--c-muted))]">
                      {sub.category}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-[rgb(var(--c-text))]">
                      {formatMoney(sub.amount, primaryCurrency)}
                    </div>
                    <div className="text-[10px] font-mono text-[rgb(var(--c-muted))]">
                      {sub.percentage}% of spending
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
