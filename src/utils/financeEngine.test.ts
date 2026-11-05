import { describe, it, expect } from 'vitest';
import {
  calculateAccountBalances,
  calculateCashFlowPeriodStats,
  calculateBudgetStatuses,
  calculateDebtSummary,
  formatMoney,
  generateTransactionsCsv,
  convertCurrency,
  filterTransactions,
  processRecurringTransactions,
  DEFAULT_EXCHANGE_RATES,
} from './financeEngine';
import {
  FinancialAccount,
  Transaction,
  Budget,
  DebtRecord,
  RecurringTransaction,
} from '../types';

describe('financeEngine', () => {
  const accounts: FinancialAccount[] = [
    {
      id: 'acc1',
      name: 'My Personal Bank',
      type: 'bank',
      accountType: 'bank',
      openingBalance: 5000,
      currency: 'ETB',
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'acc2',
      name: 'Cash Pocket',
      type: 'cash',
      accountType: 'cash',
      openingBalance: 1000,
      currency: 'ETB',
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    },
  ];

  it('correctly calculates account balances with income, expenses, and transfers', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx1',
        amount: 3000,
        type: 'income',
        category: 'Scholarship',
        financialAccountId: 'acc1',
        accountId: 'acc1',
        currency: 'ETB',
        account: 'bank',
        date: '2026-11-01T10:00:00Z',
      },
      {
        id: 'tx2',
        amount: 500,
        type: 'expense',
        category: 'Food',
        financialAccountId: 'acc1',
        accountId: 'acc1',
        currency: 'ETB',
        account: 'bank',
        date: '2026-11-01T12:00:00Z',
      },
      {
        id: 'tx3',
        amount: 1500,
        type: 'transfer',
        category: 'Transfer',
        sourceAccountId: 'acc1',
        targetAccountId: 'acc2',
        accountId: 'acc1',
        toAccountId: 'acc2',
        currency: 'ETB',
        account: 'bank',
        date: '2026-11-01T14:00:00Z',
      },
      {
        id: 'tx4',
        amount: 200,
        type: 'expense',
        category: 'Transport',
        financialAccountId: 'acc2',
        accountId: 'acc2',
        currency: 'ETB',
        account: 'cash',
        date: '2026-11-01T16:00:00Z',
      },
    ];

    const balances = calculateAccountBalances(accounts, transactions);

    // acc1: 5000 (opening) + 3000 (income) - 500 (expense) - 1500 (transfer out) = 6000
    expect(balances['acc1']).toBe(6000);

    // acc2: 1000 (opening) + 1500 (transfer in) - 200 (expense) = 2300
    expect(balances['acc2']).toBe(2300);
  });

  it('calculates cash flow period stats without treating transfers, savings, or debt payments as ordinary income/expense', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx1',
        amount: 4000,
        type: 'income',
        category: 'Allowance',
        financialAccountId: 'acc1',
        date: '2026-11-02',
      },
      {
        id: 'tx2',
        amount: 1000,
        type: 'expense',
        category: 'Food',
        subcategory: 'Groceries',
        financialAccountId: 'acc1',
        date: '2026-11-02',
      },
      {
        id: 'tx3',
        amount: 2000,
        type: 'transfer',
        category: 'Transfer',
        sourceAccountId: 'acc1',
        targetAccountId: 'acc2',
        date: '2026-11-02',
      },
      {
        id: 'tx4',
        amount: 500,
        type: 'saving',
        category: 'Emergency Savings Goal',
        savingsGoalId: 'goal-1',
        financialAccountId: 'acc1',
        date: '2026-11-02',
      },
      {
        id: 'tx5',
        amount: 300,
        type: 'expense',
        category: 'Debt Payment',
        debtId: 'debt-1',
        financialAccountId: 'acc1',
        date: '2026-11-02',
      },
    ];

    const stats = calculateCashFlowPeriodStats(transactions, '2026-11-01', '2026-11-30');

    // Only tx1 (4000) is operational income
    expect(stats.totalIncome).toBe(4000);
    // Only tx2 (1000) is operational expense (tx3 transfer, tx4 savings, tx5 debt payment are excluded)
    expect(stats.totalExpenses).toBe(1000);
    expect(stats.netCashFlow).toBe(3000);
    expect(stats.totalTransfers).toBe(2000);
    expect(stats.totalSavingsAllocated).toBe(500);
    expect(stats.totalDebtPaid).toBe(300);
    expect(stats.savingsRate).toBe(75);
    expect(stats.categoryBreakdown[0].category).toBe('Food');
    expect(stats.categoryBreakdown[0].amount).toBe(1000);
    expect(stats.subcategoryBreakdown[0].subcategory).toBe('Groceries');
  });

  it('accurately converts currencies with configurable exchange rates', () => {
    // 10 USD to ETB at 125 ETB/USD
    const converted = convertCurrency(10, 'USD', 'ETB', DEFAULT_EXCHANGE_RATES);
    expect(converted).toBe(1250);

    // 1250 ETB to USD
    const backToUsd = convertCurrency(1250, 'ETB', 'USD', DEFAULT_EXCHANGE_RATES);
    expect(backToUsd).toBe(10);
  });

  it('filters transactions with search query, date ranges, amount limits, and categories', () => {
    const list: Transaction[] = [
      {
        id: 't1',
        amount: 150,
        type: 'expense',
        category: 'Food & Dining',
        subcategory: 'Campus Cafeteria',
        financialAccountId: 'acc1',
        date: '2026-11-05',
        notes: 'Lunch with dorm mates',
        tags: ['campus', 'lunch'],
      },
      {
        id: 't2',
        amount: 850,
        type: 'expense',
        category: 'Academics & Supplies',
        subcategory: 'Textbooks',
        financialAccountId: 'acc1',
        date: '2026-11-06',
        notes: 'Algorithm handbook',
        tags: ['books', 'study'],
      },
      {
        id: 't3',
        amount: 3000,
        type: 'income',
        category: 'Allowance & Stipend',
        financialAccountId: 'acc1',
        date: '2026-11-07',
        notes: 'Monthly stipend',
      },
    ];

    // Filter by search query
    const searchMatch = filterTransactions(list, { searchQuery: 'Algorithm' });
    expect(searchMatch).toHaveLength(1);
    expect(searchMatch[0].id).toBe('t2');

    // Filter by amount range
    const amountMatch = filterTransactions(list, { minAmount: 100, maxAmount: 500 });
    expect(amountMatch).toHaveLength(1);
    expect(amountMatch[0].id).toBe('t1');

    // Filter by date range
    const dateMatch = filterTransactions(list, { startDate: '2026-11-06', endDate: '2026-11-10' });
    expect(dateMatch).toHaveLength(2);

    // Filter by tag
    const tagMatch = filterTransactions(list, { tags: ['study'] });
    expect(tagMatch).toHaveLength(1);
    expect(tagMatch[0].id).toBe('t2');
  });

  it('processes recurring transactions idempotently without creating duplicates on app reopen', () => {
    const template: RecurringTransaction = {
      id: 'rec-1',
      title: 'Monthly Internet Package',
      type: 'expense',
      amount: 450,
      category: 'Internet & Airtime',
      frequency: 'monthly',
      financialAccountId: 'acc1',
      nextDueDate: '2026-11-01',
      isActive: true,
      createdAt: '2026-10-01',
    };

    const existingTransactions: Transaction[] = [];

    // First process on due date
    const run1 = processRecurringTransactions([template], existingTransactions, '2026-11-05');
    expect(run1.newTransactions).toHaveLength(1);
    expect(run1.newTransactions[0].amount).toBe(450);
    expect(run1.updatedTemplates[0].nextDueDate).toBe('2026-12-01');

    // Second process simulated on app reopen with updated template and newly saved transaction
    const updatedTemplate = run1.updatedTemplates[0];
    const updatedTxList = [...existingTransactions, ...run1.newTransactions];

    const run2 = processRecurringTransactions([updatedTemplate], updatedTxList, '2026-11-05');
    // Must NOT create duplicates
    expect(run2.newTransactions).toHaveLength(0);
  });

  it('calculates budget alerts and progress accurately for monthly and custom-period budgets', () => {
    const budgets: Budget[] = [
      {
        id: 'b1',
        category: 'Food',
        amount: 2000,
        period: 'monthly',
        month: '2026-11',
      },
      {
        id: 'b2',
        category: 'all',
        amount: 5000,
        period: 'custom',
        startDate: '2026-11-01',
        endDate: '2026-11-15',
      },
    ];

    const transactions: Transaction[] = [
      {
        id: 'tx1',
        amount: 1600,
        type: 'expense',
        category: 'Food',
        currency: 'ETB',
        account: 'bank',
        date: '2026-11-02T10:00:00Z',
      },
    ];

    const statuses = calculateBudgetStatuses(budgets, transactions, '2026-11', '2026-11-05');
    const foodBudget = statuses.find((s) => s.budget.category === 'Food')!;
    expect(foodBudget.spentAmount).toBe(1600);
    expect(foodBudget.remainingAmount).toBe(400);
    expect(foodBudget.percentageUsed).toBe(80);
    expect(foodBudget.warningLevel).toBe('warning');

    const customBudget = statuses.find((s) => s.budget.category === 'all')!;
    expect(customBudget.spentAmount).toBe(1600);
    expect(customBudget.remainingAmount).toBe(3400);
  });

  it('calculates debts and receivables summary', () => {
    const debts: DebtRecord[] = [
      {
        id: 'd1',
        type: 'payable',
        person: 'Dorm Mate',
        personName: 'Dorm Mate',
        amount: 500,
        originalAmount: 500,
        paidAmount: 200,
        remainingAmount: 300,
        currency: 'ETB',
        status: 'partial',
        createdAt: '2026-11-01T00:00:00Z',
      },
      {
        id: 'd2',
        type: 'receivable',
        person: 'Class Project Partner',
        personName: 'Class Project Partner',
        amount: 1200,
        originalAmount: 1200,
        paidAmount: 200,
        remainingAmount: 1000,
        currency: 'ETB',
        status: 'partial',
        createdAt: '2026-11-01T00:00:00Z',
      },
      {
        id: 'd3',
        type: 'payable',
        person: 'Cafeteria',
        personName: 'Cafeteria',
        amount: 300,
        originalAmount: 300,
        paidAmount: 300,
        remainingAmount: 0,
        currency: 'ETB',
        status: 'settled',
        createdAt: '2026-11-01T00:00:00Z',
      },
    ];

    const summary = calculateDebtSummary(debts);
    expect(summary.totalPayable).toBe(300); // 500 - 200 (settled d3 excluded)
    expect(summary.totalReceivable).toBe(1000); // 1200 - 200
    expect(summary.netBalance).toBe(700);
  });

  it('formats money and generates valid CSV headers and rows with subcategories', () => {
    expect(formatMoney(1250.5, 'ETB')).toContain('1,250.50 ETB');

    const csv = generateTransactionsCsv(
      [
        {
          id: 'tx1',
          amount: 500,
          type: 'expense',
          category: 'Academics & Supplies',
          subcategory: 'Textbooks',
          financialAccountId: 'acc1',
          currency: 'ETB',
          date: '2026-11-01',
          notes: 'Calculus textbook',
          tags: ['math', 'sem1'],
        },
      ],
      accounts
    );
    expect(csv).toContain('ID,Date,Type,Category,Subcategory,Amount');
    expect(csv).toContain('Textbooks');
    expect(csv).toContain('Calculus textbook');
    expect(csv).toContain('My Personal Bank');
  });
});
