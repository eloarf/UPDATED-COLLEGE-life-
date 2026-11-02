import { describe, it, expect } from 'vitest';
import {
  calculateAccountBalances,
  calculateCashFlowPeriodStats,
  calculateBudgetStatuses,
  calculateDebtSummary,
  formatMoney,
  generateTransactionsCsv,
} from './financeEngine';
import {
  FinancialAccount,
  Transaction,
  Budget,
  DebtRecord,
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

  it('calculates cash flow period stats without treating transfers as income or expense', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx1',
        amount: 4000,
        type: 'income',
        category: 'Allowance',
        financialAccountId: 'acc1',
        accountId: 'acc1',
        currency: 'ETB',
        account: 'bank',
        date: '2026-11-02T10:00:00Z',
      },
      {
        id: 'tx2',
        amount: 1000,
        type: 'expense',
        category: 'Food',
        financialAccountId: 'acc1',
        accountId: 'acc1',
        currency: 'ETB',
        account: 'bank',
        date: '2026-11-02T12:00:00Z',
      },
      {
        id: 'tx3',
        amount: 2000,
        type: 'transfer',
        category: 'Transfer',
        sourceAccountId: 'acc1',
        targetAccountId: 'acc2',
        accountId: 'acc1',
        toAccountId: 'acc2',
        currency: 'ETB',
        account: 'bank',
        date: '2026-11-02T13:00:00Z',
      },
    ];

    const stats = calculateCashFlowPeriodStats(transactions, '2026-11-01', '2026-11-30');
    expect(stats.totalIncome).toBe(4000);
    expect(stats.totalExpenses).toBe(1000);
    expect(stats.netCashFlow).toBe(3000);
    expect(stats.savingsRate).toBe(75);
    expect(stats.categoryBreakdown[0].category).toBe('Food');
    expect(stats.categoryBreakdown[0].amount).toBe(1000);
  });

  it('calculates budget alerts and progress accurately', () => {
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
        period: 'monthly',
        month: '2026-11',
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

    const statuses = calculateBudgetStatuses(budgets, transactions, '2026-11');
    const foodBudget = statuses.find((s) => s.budget.category === 'Food')!;
    expect(foodBudget.spentAmount).toBe(1600);
    expect(foodBudget.remainingAmount).toBe(400);
    expect(foodBudget.percentageUsed).toBe(80);
    expect(foodBudget.warningLevel).toBe('warning'); // 80% is >= 75%
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

  it('formats money and generates valid CSV headers and rows', () => {
    expect(formatMoney(1250.5, 'ETB')).toContain('1,250.50 ETB');

    const csv = generateTransactionsCsv(
      [
        {
          id: 'tx1',
          amount: 500,
          type: 'expense',
          category: 'Books',
          financialAccountId: 'acc1',
          currency: 'ETB',
          account: 'bank',
          date: '2026-11-01T00:00:00Z',
          notes: 'Calculus textbook',
        },
      ],
      accounts
    );
    expect(csv).toContain('ID,Date,Type,Category,Amount');
    expect(csv).toContain('Calculus textbook');
    expect(csv).toContain('My Personal Bank');
  });
});
