// Pure Finance Calculation Engine & Metrics (100% offline & testable)
import {
  FinancialAccount,
  Transaction,
  Budget,
  SavingsGoal,
  DebtRecord,
  RecurringTransaction,
} from '../types';

export interface AccountBalanceMap {
  [accountId: string]: number;
}

/**
 * Calculates current balance for every account dynamically based on opening balance
 * and all net transactions, transfers, and savings contributions.
 */
export function calculateAccountBalances(
  accounts: FinancialAccount[],
  transactions: Transaction[]
): AccountBalanceMap {
  const balances: AccountBalanceMap = {};

  // Initialize with opening balance
  accounts.forEach((acc) => {
    balances[acc.id] = Number(acc.openingBalance) || 0;
  });

  // Apply transactions
  transactions.forEach((tx) => {
    const amount = Number(tx.amount) || 0;

    if (tx.type === 'income') {
      const targetAccId = tx.financialAccountId || tx.account;
      if (targetAccId && balances[targetAccId] !== undefined) {
        balances[targetAccId] += amount;
      }
    } else if (tx.type === 'expense') {
      const targetAccId = tx.financialAccountId || tx.account;
      if (targetAccId && balances[targetAccId] !== undefined) {
        balances[targetAccId] -= amount;
      }
    } else if (tx.type === 'transfer') {
      const sourceId = tx.sourceAccountId;
      const targetId = tx.targetAccountId;

      if (sourceId && balances[sourceId] !== undefined) {
        balances[sourceId] -= amount;
      }
      if (targetId && balances[targetId] !== undefined) {
        balances[targetId] += amount;
      }
    }
  });

  return balances;
}

export interface CashFlowPeriodStats {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  savingsRate: number; // percentage (0-100)
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  dailyTrend: { dateKey: string; income: number; expense: number }[];
}

/**
 * Calculates income, expense, net cash flow, and category breakdown for a date range.
 */
export function calculateCashFlowPeriodStats(
  transactions: Transaction[],
  startDateIso?: string,
  endDateIso?: string
): CashFlowPeriodStats {
  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryMap: Record<string, number> = {};
  const dailyMap: Record<string, { income: number; expense: number }> = {};

  const filtered = transactions.filter((tx) => {
    if (tx.type === 'transfer') return false; // Transfers are balance neutral
    const txDate = tx.date.substring(0, 10);
    if (startDateIso && txDate < startDateIso) return false;
    if (endDateIso && txDate > endDateIso) return false;
    return true;
  });

  filtered.forEach((tx) => {
    const amount = Number(tx.amount) || 0;
    const dateKey = tx.date.substring(0, 10);

    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { income: 0, expense: 0 };
    }

    if (tx.type === 'income') {
      totalIncome += amount;
      dailyMap[dateKey].income += amount;
    } else if (tx.type === 'expense') {
      totalExpenses += amount;
      dailyMap[dateKey].expense += amount;

      const cat = tx.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + amount;
    }
  });

  const netCashFlow = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 && netCashFlow > 0
    ? Math.min(100, Math.round((netCashFlow / totalIncome) * 100))
    : 0;

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const dailyTrend = Object.entries(dailyMap)
    .map(([dateKey, val]) => ({
      dateKey,
      income: val.income,
      expense: val.expense,
    }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  return {
    totalIncome,
    totalExpenses,
    netCashFlow,
    savingsRate,
    categoryBreakdown,
    dailyTrend,
  };
}

export interface BudgetStatus {
  budget: Budget;
  limitAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  isOverBudget: boolean;
  warningLevel: 'safe' | 'warning' | 'danger';
}

/**
 * Calculates budget consumption for all active budgets against actual expense transactions
 */
export function calculateBudgetStatuses(
  budgets: Budget[],
  transactions: Transaction[],
  currentMonthKey: string // YYYY-MM
): BudgetStatus[] {
  return budgets.map((b) => {
    const limitAmount = Number(b.amount) || 0;

    // Filter relevant transactions
    const relevantExpenses = transactions.filter((tx) => {
      if (tx.type !== 'expense') return false;
      if (!tx.date.startsWith(currentMonthKey)) return false;

      // Category matching
      if (b.category && b.category !== 'all') {
        return tx.category.toLowerCase() === b.category.toLowerCase();
      }
      return true;
    });

    const spentAmount = relevantExpenses.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const remainingAmount = Math.max(0, limitAmount - spentAmount);
    const percentageUsed = limitAmount > 0 ? Math.round((spentAmount / limitAmount) * 100) : 0;
    const isOverBudget = spentAmount > limitAmount;

    let warningLevel: 'safe' | 'warning' | 'danger' = 'safe';
    if (percentageUsed >= 100 || isOverBudget) {
      warningLevel = 'danger';
    } else if (percentageUsed >= 75) {
      warningLevel = 'warning';
    }

    return {
      budget: b,
      limitAmount,
      spentAmount,
      remainingAmount,
      percentageUsed,
      isOverBudget,
      warningLevel,
    };
  });
}

export interface DebtSummary {
  totalPayable: number; // I owe others
  totalReceivable: number; // Others owe me
  netBalance: number; // Receivable - Payable
  pendingPayablesCount: number;
  pendingReceivablesCount: number;
}

export function calculateDebtSummary(debts: DebtRecord[]): DebtSummary {
  let totalPayable = 0;
  let totalReceivable = 0;
  let pendingPayablesCount = 0;
  let pendingReceivablesCount = 0;

  debts.forEach((d) => {
    if (d.status === 'settled') return;

    const original = Number(d.amount ?? d.originalAmount) || 0;
    const remaining = typeof d.remainingAmount === 'number'
      ? d.remainingAmount
      : Math.max(0, original - (Number(d.paidAmount) || 0));

    if (d.type === 'payable' || d.type === 'owe') {
      totalPayable += remaining;
      pendingPayablesCount += 1;
    } else {
      totalReceivable += remaining;
      pendingReceivablesCount += 1;
    }
  });

  return {
    totalPayable,
    totalReceivable,
    netBalance: totalReceivable - totalPayable,
    pendingPayablesCount,
    pendingReceivablesCount,
  };
}

/**
 * Format numbers with comma separators and currency symbol
 */
export function formatMoney(amount: number, currency: string = 'ETB'): string {
  const rounded = Math.round(amount * 100) / 100;
  const formatted = rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

/**
 * Export transactions to clean CSV string
 */
export function generateTransactionsCsv(
  transactions: Transaction[],
  accounts: FinancialAccount[]
): string {
  const accountMap = new Map<string, string>();
  accounts.forEach((a) => accountMap.set(a.id, a.name));

  const headers = ['ID', 'Date', 'Type', 'Category', 'Amount', 'Account', 'SourceAccount', 'TargetAccount', 'Notes', 'Tags'];
  const rows = transactions.map((tx) => {
    const accKey = tx.financialAccountId || tx.accountId || tx.account || '';
    const accLabel = accountMap.get(accKey) || accKey;
    const srcKey = tx.sourceAccountId || '';
    const srcLabel = accountMap.get(srcKey) || srcKey;
    const tgtKey = tx.targetAccountId || tx.toAccountId || '';
    const tgtLabel = accountMap.get(tgtKey) || tgtKey;

    return [
      tx.id,
      tx.date,
      tx.type,
      `"${(tx.category || '').replace(/"/g, '""')}"`,
      tx.amount,
      `"${accLabel.replace(/"/g, '""')}"`,
      `"${srcLabel.replace(/"/g, '""')}"`,
      `"${tgtLabel.replace(/"/g, '""')}"`,
      `"${(tx.notes || tx.description || '').replace(/"/g, '""')}"`,
      `"${(tx.tags || []).join('; ')}"`,
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
