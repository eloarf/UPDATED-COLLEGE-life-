// Pure Finance Calculation Engine & Metrics (100% offline & testable)
import {
  FinancialAccount,
  Transaction,
  Budget,
  SavingsGoal,
  DebtRecord,
  RecurringTransaction,
  FinanceCategory,
} from '../types';
import { generateId } from './idGenerator';

export interface AccountBalanceMap {
  [accountId: string]: number;
}

/**
 * Standard currencies and exchange rates relative to ETB (Ethiopian Birr).
 * User can customize rates at any time.
 */
export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  ETB: 1,
  USD: 125.0,
  EUR: 135.0,
  GBP: 160.0,
  KES: 0.95,
  AED: 34.0,
};

export const SUPPORTED_CURRENCIES = ['ETB', 'USD', 'EUR', 'GBP', 'KES', 'AED'] as const;

/**
 * Converts any currency amount into target currency using provided or default exchange rates.
 * Historical transactions keep their original amount & currency; conversion is strictly
 * applied on read/aggregation for cross-currency summaries.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string = 'ETB',
  toCurrency: string = 'ETB',
  rates: Record<string, number> = DEFAULT_EXCHANGE_RATES
): number {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to || !amount) return amount;

  const fromRate = rates[from] ?? (from === 'ETB' ? 1 : 1);
  const toRate = rates[to] ?? (to === 'ETB' ? 1 : 1);

  // Convert from origin to ETB base, then from ETB to target
  const amountInBase = amount * fromRate;
  const converted = amountInBase / toRate;

  return Math.round(converted * 100) / 100;
}

/**
 * Rich student-focused default categories with subcategories.
 * Editable by the user without modifying code.
 */
export const DEFAULT_FINANCE_CATEGORIES: FinanceCategory[] = [
  {
    id: 'cat-food',
    name: 'Food & Dining',
    type: 'expense',
    icon: 'Utensils',
    subcategories: ['Campus Cafeteria', 'Groceries', 'Snacks & Coffee', 'Dining Out', 'Late Night Bites'],
  },
  {
    id: 'cat-academics',
    name: 'Academics & Supplies',
    type: 'expense',
    icon: 'GraduationCap',
    subcategories: ['Tuition & Fees', 'Textbooks', 'Stationery & Notebooks', 'Printing & Photocopy', 'Lab Equipment'],
  },
  {
    id: 'cat-housing',
    name: 'Dorm & Housing',
    type: 'expense',
    icon: 'Home',
    subcategories: ['Dorm Fee / Rent', 'Electricity & Water', 'Laundry', 'Room Supplies & Cleaning'],
  },
  {
    id: 'cat-transport',
    name: 'Campus Transport',
    type: 'expense',
    icon: 'Bus',
    subcategories: ['Bus / Minibus', 'Taxi & Ride', 'Campus Shuttle', 'Travel Back Home'],
  },
  {
    id: 'cat-telecom',
    name: 'Internet & Airtime',
    type: 'expense',
    icon: 'Wifi',
    subcategories: ['Airtime Top-up', 'Monthly Data Package', 'Software & VPN', 'Printing Card'],
  },
  {
    id: 'cat-health',
    name: 'Personal Care & Health',
    type: 'expense',
    icon: 'HeartPulse',
    subcategories: ['Pharmacy & Medicine', 'Toiletries & Hygiene', 'Haircut & Grooming', 'Fitness'],
  },
  {
    id: 'cat-entertainment',
    name: 'Entertainment & Leisure',
    type: 'expense',
    icon: 'Gamepad2',
    subcategories: ['Social Outings', 'Cinema & Streaming', 'Video Games & Hobbies', 'Campus Events'],
  },
  {
    id: 'cat-other-exp',
    name: 'Other Expense',
    type: 'expense',
    icon: 'MoreHorizontal',
    subcategories: ['Unplanned Emergencies', 'Gifts & Donations', 'Miscellaneous'],
  },
  // Income Categories
  {
    id: 'cat-allowance',
    name: 'Allowance & Stipend',
    type: 'income',
    icon: 'HandCoins',
    subcategories: ['Monthly Family Allowance', 'University Dorm Stipend', 'Emergency Support'],
  },
  {
    id: 'cat-freelance',
    name: 'Tutoring & Freelancing',
    type: 'income',
    icon: 'Briefcase',
    subcategories: ['Peer Tutoring', 'Coding & Tech Work', 'Design & Writing', 'Campus Assistant'],
  },
  {
    id: 'cat-scholarship',
    name: 'Scholarship & Grants',
    type: 'income',
    icon: 'Award',
    subcategories: ['Academic Merit Award', 'Research Grant', 'Government Assistance'],
  },
  {
    id: 'cat-gifts',
    name: 'Gifts & Reimbursements',
    type: 'income',
    icon: 'Gift',
    subcategories: ['Holiday Gift', 'Debt Returned to Me', 'Expense Reimbursement'],
  },
  {
    id: 'cat-other-inc',
    name: 'Other Income',
    type: 'income',
    icon: 'PlusCircle',
    subcategories: ['Resale / Second-hand', 'Dividends / Interest', 'Miscellaneous'],
  },
];

/**
 * Calculates current balance for every account dynamically based on opening balance
 * and all net transactions, transfers, debt repayments, and savings contributions.
 *
 * Strict Accounting Rules:
 * - Transfers decrease source account and increase target account.
 * - Ordinary expenses decrease account balance.
 * - Ordinary income increases account balance.
 * - Debt repayments decrease balance (when paying) or increase balance (when collecting).
 * - Savings contributions decrease funding account and, if target savings account is linked, increase it.
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

  // Apply transactions chronologically
  transactions.forEach((tx) => {
    const amount = Number(tx.amount) || 0;
    if (amount <= 0) return;

    if (tx.type === 'income') {
      const targetAccId = tx.financialAccountId || tx.accountId || tx.account;
      if (targetAccId && balances[targetAccId] !== undefined) {
        balances[targetAccId] += amount;
      }
    } else if (tx.type === 'expense') {
      const targetAccId = tx.financialAccountId || tx.accountId || tx.account;
      if (targetAccId && balances[targetAccId] !== undefined) {
        balances[targetAccId] -= amount;
      }
    } else if (tx.type === 'transfer') {
      const sourceId = tx.sourceAccountId || tx.financialAccountId || tx.accountId;
      const targetId = tx.targetAccountId || tx.toAccountId;

      if (sourceId && balances[sourceId] !== undefined) {
        balances[sourceId] -= amount;
      }
      if (targetId && balances[targetId] !== undefined) {
        balances[targetId] += amount;
      }
    } else if (tx.type === 'saving') {
      // Savings contribution moves money out of funding account
      const fundingId = tx.sourceAccountId || tx.financialAccountId || tx.accountId;
      const destinationId = tx.targetAccountId || tx.toAccountId;

      if (fundingId && balances[fundingId] !== undefined) {
        balances[fundingId] -= amount;
      }
      if (destinationId && balances[destinationId] !== undefined) {
        balances[destinationId] += amount;
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
  totalTransfers: number;
  totalSavingsAllocated: number;
  totalDebtPaid: number;
  totalDebtCollected: number;
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  subcategoryBreakdown: { category: string; subcategory: string; amount: number; percentage: number }[];
  dailyTrend: { dateKey: string; income: number; expense: number }[];
}

/**
 * Calculates operational cash flow stats (income vs expense) for a date range.
 *
 * CRITICAL ACCOUNTING RULES:
 * 1. Transfers are neutral and EXCLUDED from income/expense.
 * 2. Savings contributions are transfers to goals/savings and EXCLUDED from operational expenses.
 * 3. Debt repayments (paying what you owe) reduce liabilities, NOT counted as operational spending.
 * 4. Debt collections (receiving what is owed to you) recover principal, NOT counted as operational income.
 */
export function calculateCashFlowPeriodStats(
  transactions: Transaction[],
  startDateIso?: string,
  endDateIso?: string,
  options?: {
    primaryCurrency?: string;
    rates?: Record<string, number>;
  }
): CashFlowPeriodStats {
  const primaryCurrency = options?.primaryCurrency || 'ETB';
  const rates = options?.rates || DEFAULT_EXCHANGE_RATES;

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalTransfers = 0;
  let totalSavingsAllocated = 0;
  let totalDebtPaid = 0;
  let totalDebtCollected = 0;

  const categoryMap: Record<string, number> = {};
  const subcategoryMap: Record<string, number> = {};
  const dailyMap: Record<string, { income: number; expense: number }> = {};

  const filtered = transactions.filter((tx) => {
    const txDate = tx.date.substring(0, 10);
    if (startDateIso && txDate < startDateIso) return false;
    if (endDateIso && txDate > endDateIso) return false;
    return true;
  });

  filtered.forEach((tx) => {
    const rawAmount = Number(tx.amount) || 0;
    if (rawAmount <= 0) return;

    // Convert amount if cross-currency
    const amount = convertCurrency(rawAmount, tx.currency || 'ETB', primaryCurrency, rates);
    const dateKey = tx.date.substring(0, 10);

    // Rule 1: Internal Transfers
    if (tx.type === 'transfer') {
      totalTransfers += amount;
      return;
    }

    // Rule 2: Savings Contributions
    if (tx.type === 'saving' || tx.isSavingsContribution || tx.savingsGoalId) {
      totalSavingsAllocated += amount;
      return;
    }

    // Rule 3: Debt Repayments & Collections
    if (tx.debtId || tx.isDebtRepayment) {
      if (tx.type === 'expense' || tx.category.toLowerCase().includes('debt payment')) {
        totalDebtPaid += amount;
      } else {
        totalDebtCollected += amount;
      }
      return;
    }

    // Standard Operational Cash Flow
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { income: 0, expense: 0 };
    }

    if (tx.type === 'income') {
      totalIncome += amount;
      dailyMap[dateKey].income += amount;
    } else if (tx.type === 'expense') {
      totalExpenses += amount;
      dailyMap[dateKey].expense += amount;

      const cat = tx.category || 'Other Expense';
      categoryMap[cat] = (categoryMap[cat] || 0) + amount;

      if (tx.subcategory) {
        const subKey = `${cat} > ${tx.subcategory}`;
        subcategoryMap[subKey] = (subcategoryMap[subKey] || 0) + amount;
      }
    }
  });

  const netCashFlow = totalIncome - totalExpenses;
  const savingsRate =
    totalIncome > 0 && netCashFlow > 0
      ? Math.min(100, Math.round((netCashFlow / totalIncome) * 100))
      : 0;

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const subcategoryBreakdown = Object.entries(subcategoryMap)
    .map(([key, amount]) => {
      const [category, subcategory] = key.split(' > ');
      return {
        category,
        subcategory,
        amount: Math.round(amount * 100) / 100,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const dailyTrend = Object.entries(dailyMap)
    .map(([dateKey, val]) => ({
      dateKey,
      income: Math.round(val.income * 100) / 100,
      expense: Math.round(val.expense * 100) / 100,
    }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netCashFlow: Math.round(netCashFlow * 100) / 100,
    savingsRate,
    totalTransfers: Math.round(totalTransfers * 100) / 100,
    totalSavingsAllocated: Math.round(totalSavingsAllocated * 100) / 100,
    totalDebtPaid: Math.round(totalDebtPaid * 100) / 100,
    totalDebtCollected: Math.round(totalDebtCollected * 100) / 100,
    categoryBreakdown,
    subcategoryBreakdown,
    dailyTrend,
  };
}

export interface TransactionFilterOptions {
  searchQuery?: string;
  type?: 'all' | 'expense' | 'income' | 'transfer' | 'saving' | 'debt_repayment';
  accountId?: string;
  category?: string;
  subcategory?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  tags?: string[];
  sortOrder?: 'newest' | 'oldest' | 'highest' | 'lowest';
}

/**
 * Robust filter & search function for transactions
 */
export function filterTransactions(
  transactions: Transaction[],
  options: TransactionFilterOptions
): Transaction[] {
  const {
    searchQuery,
    type = 'all',
    accountId = 'all',
    category = 'all',
    subcategory = 'all',
    startDate,
    endDate,
    minAmount,
    maxAmount,
    tags,
    sortOrder = 'newest',
  } = options;

  let results = transactions.filter((tx) => {
    // Type Filter
    if (type !== 'all') {
      if (type === 'debt_repayment') {
        if (!tx.debtId && !tx.isDebtRepayment) return false;
      } else if (tx.type !== type) {
        return false;
      }
    }

    // Account Filter (matches single, source, or target account)
    if (accountId && accountId !== 'all') {
      const match =
        tx.financialAccountId === accountId ||
        tx.accountId === accountId ||
        tx.sourceAccountId === accountId ||
        tx.targetAccountId === accountId ||
        tx.toAccountId === accountId;
      if (!match) return false;
    }

    // Category Filter
    if (category && category !== 'all') {
      if (tx.category.toLowerCase() !== category.toLowerCase()) return false;
    }

    // Subcategory Filter
    if (subcategory && subcategory !== 'all') {
      if ((tx.subcategory || '').toLowerCase() !== subcategory.toLowerCase()) return false;
    }

    // Date Filters
    const dateKey = tx.date.substring(0, 10);
    if (startDate && dateKey < startDate) return false;
    if (endDate && dateKey > endDate) return false;

    // Amount Filters
    const amt = Number(tx.amount) || 0;
    if (minAmount !== undefined && !isNaN(minAmount) && amt < minAmount) return false;
    if (maxAmount !== undefined && !isNaN(maxAmount) && amt > maxAmount) return false;

    // Tags Filter
    if (tags && tags.length > 0) {
      const txTags = (tx.tags || []).map((t) => t.toLowerCase());
      const hasAnyTag = tags.some((tag) => txTags.includes(tag.toLowerCase()));
      if (!hasAnyTag) return false;
    }

    // Search Query (matches category, subcategory, notes, description, tags)
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesCat = (tx.category || '').toLowerCase().includes(q);
      const matchesSubcat = (tx.subcategory || '').toLowerCase().includes(q);
      const matchesNotes = (tx.notes || tx.description || '').toLowerCase().includes(q);
      const matchesTags = (tx.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchesCat && !matchesSubcat && !matchesNotes && !matchesTags) return false;
    }

    return true;
  });

  // Sorting
  results.sort((a, b) => {
    if (sortOrder === 'newest') {
      return (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''));
    }
    if (sortOrder === 'oldest') {
      return (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''));
    }
    if (sortOrder === 'highest') {
      return (Number(b.amount) || 0) - (Number(a.amount) || 0);
    }
    if (sortOrder === 'lowest') {
      return (Number(a.amount) || 0) - (Number(b.amount) || 0);
    }
    return 0;
  });

  return results;
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
 * Calculates budget consumption for monthly or custom-period budgets
 */
export function calculateBudgetStatuses(
  budgets: Budget[],
  transactions: Transaction[],
  currentMonthKey: string, // YYYY-MM
  todayKey?: string
): BudgetStatus[] {
  return budgets.map((b) => {
    const limitAmount = Number(b.amount ?? b.monthlyLimit) || 0;

    const relevantExpenses = transactions.filter((tx) => {
      // Must be an operational expense (not transfer, debt repayment, or savings)
      if (tx.type !== 'expense') return false;
      if (tx.debtId || tx.isDebtRepayment || tx.savingsGoalId || tx.isSavingsContribution) return false;

      const txDate = tx.date.substring(0, 10);

      // Period matching
      if (b.period === 'custom' && b.startDate && b.endDate) {
        if (txDate < b.startDate || txDate > b.endDate) return false;
      } else {
        // Monthly or weekly
        const monthPrefix = b.month || currentMonthKey;
        if (!txDate.startsWith(monthPrefix)) return false;
      }

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
    } else if (percentageUsed >= 80) {
      warningLevel = 'warning';
    }

    return {
      budget: b,
      limitAmount,
      spentAmount: Math.round(spentAmount * 100) / 100,
      remainingAmount: Math.round(remainingAmount * 100) / 100,
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
    const paid = Number(d.paidAmount) || 0;
    const remaining = typeof d.remainingAmount === 'number'
      ? d.remainingAmount
      : Math.max(0, original - paid);

    if (d.type === 'payable' || d.type === 'owe') {
      totalPayable += remaining;
      pendingPayablesCount += 1;
    } else {
      totalReceivable += remaining;
      pendingReceivablesCount += 1;
    }
  });

  return {
    totalPayable: Math.round(totalPayable * 100) / 100,
    totalReceivable: Math.round(totalReceivable * 100) / 100,
    netBalance: Math.round((totalReceivable - totalPayable) * 100) / 100,
    pendingPayablesCount,
    pendingReceivablesCount,
  };
}

/**
 * Calculates the next due date based on frequency
 */
export function getNextRecurringDate(currentDateStr: string, frequency: string): string {
  const d = new Date(currentDateStr);
  if (isNaN(d.getTime())) return currentDateStr;

  if (frequency === 'daily') {
    d.setDate(d.getDate() + 1);
  } else if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (frequency === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else if (frequency === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    // Custom / default to 30 days
    d.setDate(d.getDate() + 30);
  }

  return d.toISOString().substring(0, 10);
}

export interface ProcessRecurringResult {
  newTransactions: Transaction[];
  updatedTemplates: RecurringTransaction[];
}

/**
 * Idempotent Recurring Transactions Processor.
 *
 * CRITICAL RULE:
 * Must never create duplicates when the app is reopened.
 *
 * Checks if a transaction for this template has already been generated for this due cycle.
 * Only generates one transaction per period, records lastGeneratedDate, and advances nextDueDate.
 */
export function processRecurringTransactions(
  templates: RecurringTransaction[],
  existingTransactions: Transaction[],
  todayKey: string
): ProcessRecurringResult {
  const newTransactions: Transaction[] = [];
  const updatedTemplates: RecurringTransaction[] = [];

  templates.forEach((tmpl) => {
    if (!tmpl.isActive) return;

    // If nextDueDate is in the future, it's not due yet
    if (tmpl.nextDueDate > todayKey) return;

    // Idempotency check 1: Check if already marked generated on or after this due date
    if (tmpl.lastGeneratedDate && tmpl.lastGeneratedDate >= tmpl.nextDueDate) {
      return;
    }

    // Idempotency check 2: Check if an existing transaction matches this recurringId and dueDate
    const alreadyExists = existingTransactions.some((tx) => {
      if (tx.recurringId !== tmpl.id) return false;
      const txDate = tx.date.substring(0, 10);
      return txDate === tmpl.nextDueDate;
    });

    if (alreadyExists) {
      // Advance due date without duplicate transaction
      const nextDue = getNextRecurringDate(tmpl.nextDueDate, tmpl.frequency);
      updatedTemplates.push({
        ...tmpl,
        lastGeneratedDate: tmpl.nextDueDate,
        nextDueDate: nextDue,
      });
      return;
    }

    // Generate new transaction
    const txId = generateId();
    const newTx: Transaction = {
      id: txId,
      amount: tmpl.amount,
      currency: tmpl.currency || 'ETB',
      type: tmpl.type,
      category: tmpl.category,
      subcategory: tmpl.subcategory,
      financialAccountId: tmpl.financialAccountId || tmpl.accountId,
      date: tmpl.nextDueDate,
      notes: tmpl.notes ? `Scheduled: ${tmpl.notes}` : `Recurring ${tmpl.frequency} ${tmpl.type}`,
      recurringId: tmpl.id,
      createdAt: new Date().toISOString(),
    };

    const nextDue = getNextRecurringDate(tmpl.nextDueDate, tmpl.frequency);

    newTransactions.push(newTx);
    updatedTemplates.push({
      ...tmpl,
      lastGeneratedDate: tmpl.nextDueDate,
      nextDueDate: nextDue,
    });
  });

  return {
    newTransactions,
    updatedTemplates,
  };
}

/**
 * Generates monthly and yearly analytical report
 */
export function generateFinanceReport(
  transactions: Transaction[],
  year: number,
  primaryCurrency: string = 'ETB',
  rates: Record<string, number> = DEFAULT_EXCHANGE_RATES
) {
  const monthlyStats: Array<{
    month: number;
    monthKey: string;
    income: number;
    expense: number;
    net: number;
  }> = [];

  for (let m = 1; m <= 12; m++) {
    const monthKey = `${year}-${String(m).padStart(2, '0')}`;
    const stats = calculateCashFlowPeriodStats(
      transactions,
      `${monthKey}-01`,
      `${monthKey}-31`,
      { primaryCurrency, rates }
    );

    monthlyStats.push({
      month: m,
      monthKey,
      income: stats.totalIncome,
      expense: stats.totalExpenses,
      net: stats.netCashFlow,
    });
  }

  const yearlyStats = calculateCashFlowPeriodStats(
    transactions,
    `${year}-01-01`,
    `${year}-12-31`,
    { primaryCurrency, rates }
  );

  return {
    year,
    monthlyStats,
    yearlyStats,
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

  const headers = [
    'ID',
    'Date',
    'Type',
    'Category',
    'Subcategory',
    'Amount',
    'Currency',
    'Account',
    'SourceAccount',
    'TargetAccount',
    'Notes',
    'Tags',
  ];

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
      `"${(tx.subcategory || '').replace(/"/g, '""')}"`,
      tx.amount,
      tx.currency || 'ETB',
      `"${accLabel.replace(/"/g, '""')}"`,
      `"${srcLabel.replace(/"/g, '""')}"`,
      `"${tgtLabel.replace(/"/g, '""')}"`,
      `"${(tx.notes || tx.description || '').replace(/"/g, '""')}"`,
      `"${(tx.tags || []).join('; ')}"`,
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
