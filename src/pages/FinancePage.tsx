import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import {
  FinancialAccount,
  FinancialAccountType,
  Transaction,
  Budget,
  SavingsGoal,
  DebtRecord,
  RecurringTransaction,
  FinanceCategory,
} from '../types';
import { getTodayKey, formatDisplayDate } from '../utils/dateUtils';
import { generateId } from '../utils/idGenerator';
import { awardXp } from '../services/rpgService';
import {
  calculateAccountBalances,
  calculateCashFlowPeriodStats,
  calculateBudgetStatuses,
  calculateDebtSummary,
  filterTransactions,
  formatMoney,
  generateTransactionsCsv,
  processRecurringTransactions,
  DEFAULT_FINANCE_CATEGORIES,
  DEFAULT_EXCHANGE_RATES,
  TransactionFilterOptions,
} from '../utils/financeEngine';
import { saveOrShareFile } from '../services/backupService';

// Subcomponents
import { TransactionModal } from '../components/finance/TransactionModal';
import { TransactionFilterDrawer } from '../components/finance/TransactionFilterDrawer';
import { CategorySettingsModal } from '../components/finance/CategorySettingsModal';
import { FinanceReportsView } from '../components/finance/FinanceReportsView';
import { BudgetModal } from '../components/finance/BudgetModal';
import { SavingsModal } from '../components/finance/SavingsModal';
import { SavingsActionModal } from '../components/finance/SavingsActionModal';
import { DebtModal } from '../components/finance/DebtModal';
import { DebtPaymentModal } from '../components/finance/DebtPaymentModal';
import { RecurringModal } from '../components/finance/RecurringModal';
import { AccountModal } from '../components/finance/AccountModal';

import {
  Wallet,
  Building2,
  Smartphone,
  Banknote,
  PiggyBank,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  Sparkles,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Target,
  Clock,
  Coins,
  ShieldCheck,
  Check,
  ChevronDown,
  HandCoins,
  Settings,
  Layers,
  ArrowRight,
  RefreshCw,
  Archive,
} from 'lucide-react';

const ACCOUNT_TYPE_LABELS: Record<FinancialAccountType, { label: string; icon: any }> = {
  bank: { label: 'Bank Account', icon: Building2 },
  mobile_money: { label: 'Mobile Money', icon: Smartphone },
  cash: { label: 'Cash on Hand', icon: Banknote },
  savings: { label: 'Dedicated Savings', icon: PiggyBank },
  digital_wallet: { label: 'Digital Wallet', icon: Wallet },
  custom: { label: 'Custom Account', icon: Coins },
  other: { label: 'Other Account', icon: Coins },
};

type FinanceTab =
  | 'overview'
  | 'transactions'
  | 'accounts'
  | 'budgets'
  | 'savings'
  | 'debts'
  | 'recurring'
  | 'reports';

export const FinancePage: React.FC = () => {
  const { showToast } = useUiStore();
  const todayKey = getTodayKey();
  const currentMonthKey = todayKey.substring(0, 7);

  // Dexie Live Queries
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const accounts = useLiveQuery(() => db.financialAccounts.toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const budgets = useLiveQuery(() => db.budgets.toArray()) || [];
  const savingsGoals = useLiveQuery(() => db.savingsGoals.toArray()) || [];
  const debts = useLiveQuery(() => db.debts.toArray()) || [];
  const recurringList = useLiveQuery(() => db.recurringTransactions.toArray()) || [];

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');

  // Currencies & Categories from AppSettings
  const primaryCurrency = settings?.primaryCurrency || 'ETB';
  const exchangeRates = useMemo(
    () => ({ ...DEFAULT_EXCHANGE_RATES, ...(settings?.currencyExchangeRates || {}) }),
    [settings?.currencyExchangeRates]
  );
  const categories: FinanceCategory[] = useMemo(() => {
    return settings?.customFinanceCategories && settings.customFinanceCategories.length > 0
      ? settings.customFinanceCategories
      : DEFAULT_FINANCE_CATEGORIES;
  }, [settings?.customFinanceCategories]);

  // Transaction Filters State
  const [filters, setFilters] = useState<TransactionFilterOptions>({
    searchQuery: '',
    type: 'all',
    accountId: 'all',
    category: 'all',
    subcategory: 'all',
    sortOrder: 'newest',
  });

  // Modal Visibility States
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [isSavingsActionOpen, setIsSavingsActionOpen] = useState(false);
  const [selectedGoalForAction, setSelectedGoalForAction] = useState<SavingsGoal | null>(null);

  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null);
  const [isDebtPaymentOpen, setIsDebtPaymentOpen] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<DebtRecord | null>(null);

  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);

  const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false);

  // Deletion Confirmation States
  const [recordToDelete, setRecordToDelete] = useState<{
    type: 'transaction' | 'account' | 'budget' | 'goal' | 'debt' | 'recurring';
    id: string;
    title: string;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // IDEMPOTENT RECURRING TRANSACTIONS CHECK ON OPEN
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const runRecurringSync = async () => {
      if (recurringList.length === 0) return;
      const { newTransactions, updatedTemplates } = processRecurringTransactions(
        recurringList,
        transactions,
        todayKey
      );

      if (newTransactions.length > 0) {
        await db.transactions.bulkAdd(newTransactions);
        for (const tmpl of updatedTemplates) {
          await db.recurringTransactions.update(tmpl.id, tmpl);
        }
        showToast(
          `⚡ Automatically logged ${newTransactions.length} scheduled recurring transaction(s)`,
          'info'
        );
      }
    };
    runRecurringSync();
  }, [recurringList.length, todayKey]);

  // ---------------------------------------------------------------------------
  // DYNAMIC FINANCIAL CALCULATIONS (Strict Accounting Rules)
  // ---------------------------------------------------------------------------
  const accountBalances = useMemo(() => {
    return calculateAccountBalances(accounts, transactions);
  }, [accounts, transactions]);

  // Net worth across active accounts
  const totalNetWorth = useMemo(() => {
    return accounts
      .filter((a) => !a.isArchived)
      .reduce((sum, acc) => sum + (accountBalances[acc.id] || 0), 0);
  }, [accounts, accountBalances]);

  // Operational Cash Flow for current month
  const thisMonthCashFlow = useMemo(() => {
    return calculateCashFlowPeriodStats(
      transactions,
      `${currentMonthKey}-01`,
      `${currentMonthKey}-31`,
      { primaryCurrency, rates: exchangeRates }
    );
  }, [transactions, currentMonthKey, primaryCurrency, exchangeRates]);

  // Budgets status for this month
  const budgetStatuses = useMemo(() => {
    return calculateBudgetStatuses(budgets, transactions, currentMonthKey, todayKey);
  }, [budgets, transactions, currentMonthKey, todayKey]);

  // Debts summary
  const debtSummary = useMemo(() => {
    return calculateDebtSummary(debts);
  }, [debts]);

  // Filtered transactions for the ledger
  const filteredTransactionsList = useMemo(() => {
    return filterTransactions(transactions, filters);
  }, [transactions, filters]);

  // Account map helper for transaction badges
  const accountMap = useMemo(() => {
    const map = new Map<string, FinancialAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  // ---------------------------------------------------------------------------
  // HANDLERS: SAVE & MUTATIONS
  // ---------------------------------------------------------------------------
  const handleSaveTransaction = async (tx: Transaction, isNew: boolean) => {
    if (isNew) {
      await db.transactions.add(tx);
      await awardXp({
        source: 'finance_tx',
        sourceId: tx.id,
        amount: 15,
        stat: 'discipline',
      });
      showToast('Transaction recorded successfully!', 'success');
    } else {
      await db.transactions.put(tx);
      showToast('Transaction updated', 'success');
    }
  };

  const handleSaveAccount = async (account: FinancialAccount) => {
    if (account.isDefault) {
      // Unmark any previous default
      await db.financialAccounts.toCollection().modify((a) => {
        a.isDefault = false;
      });
    }
    await db.financialAccounts.put(account);
    showToast(`Account "${account.name}" saved!`, 'success');
  };

  const handleSaveBudget = async (budget: Budget) => {
    await db.budgets.put(budget);
    showToast('Budget saved!', 'success');
  };

  const handleSaveGoal = async (goal: SavingsGoal) => {
    await db.savingsGoals.put(goal);
    showToast(`Savings goal "${goal.title}" saved!`, 'success');
  };

  const handleExecuteSavingsAction = async (params: {
    type: 'deposit' | 'withdraw';
    amount: number;
    accountId: string;
    notes?: string;
  }) => {
    if (!selectedGoalForAction) return;

    const currentSaved = selectedGoalForAction.currentAmount || 0;
    const newAmount =
      params.type === 'deposit'
        ? currentSaved + params.amount
        : Math.max(0, currentSaved - params.amount);

    await db.savingsGoals.update(selectedGoalForAction.id, {
      currentAmount: newAmount,
    });

    const fundingAcc = accountMap.get(params.accountId);

    // Record savings contribution transaction (strictly categorized as saving, not operational expense)
    await db.transactions.add({
      id: generateId(),
      amount: params.amount,
      currency: selectedGoalForAction.currency || primaryCurrency,
      type: 'saving',
      category: `Savings: ${selectedGoalForAction.title}`,
      subcategory: selectedGoalForAction.category,
      financialAccountId: params.accountId,
      sourceAccountId: params.type === 'deposit' ? params.accountId : undefined,
      targetAccountId: params.type === 'withdraw' ? params.accountId : undefined,
      savingsGoalId: selectedGoalForAction.id,
      isSavingsContribution: true,
      date: todayKey,
      time: new Date().toTimeString().substring(0, 5),
      notes: params.notes || `${params.type === 'deposit' ? 'Deposit to' : 'Withdrawal from'} ${selectedGoalForAction.title}`,
      createdAt: new Date().toISOString(),
    });

    await awardXp({
      source: 'savings_contribution',
      sourceId: `${selectedGoalForAction.id}_${Date.now()}`,
      amount: 25,
      stat: 'discipline',
    });
    showToast(
      params.type === 'deposit'
        ? `Deposited ${formatMoney(params.amount, primaryCurrency)} to "${selectedGoalForAction.title}"!`
        : `Withdrew ${formatMoney(params.amount, primaryCurrency)} to account!`,
      'success'
    );
  };

  const handleSaveDebt = async (debt: DebtRecord) => {
    await db.debts.put(debt);
    showToast(`Debt record with ${debt.personName || debt.person} saved!`, 'success');
  };

  const handleExecuteDebtPayment = async (params: {
    amount: number;
    accountId: string;
    notes?: string;
  }) => {
    if (!selectedDebtForPayment) return;

    const totalAmt = Number(selectedDebtForPayment.amount ?? selectedDebtForPayment.originalAmount) || 0;
    const currentPaid = Number(selectedDebtForPayment.paidAmount) || 0;
    const newPaid = currentPaid + params.amount;
    const remaining = Math.max(0, totalAmt - newPaid);
    const isSettled = remaining <= 0;

    await db.debts.update(selectedDebtForPayment.id, {
      paidAmount: newPaid,
      remainingAmount: remaining,
      status: isSettled ? 'settled' : 'partial',
      settledAt: isSettled ? new Date().toISOString() : undefined,
    });

    const isPayable = selectedDebtForPayment.type === 'payable' || selectedDebtForPayment.type === 'owe';

    // Log transaction with debtId and isDebtRepayment flag
    // Strictly excluded from operational income/expense figures
    await db.transactions.add({
      id: generateId(),
      amount: params.amount,
      currency: selectedDebtForPayment.currency || primaryCurrency,
      type: isPayable ? 'expense' : 'income',
      category: isPayable ? 'Debt Payment' : 'Debt Collection',
      subcategory: 'Debt Settlement',
      financialAccountId: params.accountId,
      debtId: selectedDebtForPayment.id,
      isDebtRepayment: true,
      date: todayKey,
      time: new Date().toTimeString().substring(0, 5),
      notes:
        params.notes ||
        `${isPayable ? 'Repayment to' : 'Collection from'} ${
          selectedDebtForPayment.personName || selectedDebtForPayment.person
        }`,
      createdAt: new Date().toISOString(),
    });

    await awardXp({
      source: 'debt_settlement',
      sourceId: `${selectedDebtForPayment.id}_${Date.now()}`,
      amount: 20,
      stat: 'discipline',
    });
    showToast(
      isSettled
        ? `🎉 Debt with ${selectedDebtForPayment.personName || selectedDebtForPayment.person} is settled!`
        : `Recorded payment of ${formatMoney(params.amount, primaryCurrency)}!`,
      'success'
    );
  };

  const handleSaveRecurring = async (rec: RecurringTransaction) => {
    await db.recurringTransactions.put(rec);
    showToast(`Recurring schedule "${rec.category}" saved!`, 'success');
  };

  const handleSaveCategories = async (updated: FinanceCategory[]) => {
    await db.settings.update('current_user', {
      customFinanceCategories: updated,
    });
    showToast('Categories updated successfully!', 'success');
  };

  const handleSavePrimaryCurrency = async (curr: string) => {
    await db.settings.update('current_user', {
      primaryCurrency: curr,
    });
    showToast(`Primary display currency set to ${curr}`, 'success');
  };

  const handleSaveExchangeRates = async (rates: Record<string, number>) => {
    await db.settings.update('current_user', {
      currencyExchangeRates: rates,
    });
    showToast('Currency exchange rates updated!', 'success');
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    const { type, id } = recordToDelete;

    if (type === 'transaction') {
      await db.transactions.delete(id);
      showToast('Transaction removed', 'info');
    } else if (type === 'account') {
      const linked = transactions.filter(
        (t) => t.financialAccountId === id || t.sourceAccountId === id || t.targetAccountId === id
      );
      if (linked.length > 0) {
        showToast(
          `Cannot delete account with ${linked.length} linked transactions. Archive it instead.`,
          'warning'
        );
      } else {
        await db.financialAccounts.delete(id);
        showToast('Account removed', 'info');
      }
    } else if (type === 'budget') {
      await db.budgets.delete(id);
      showToast('Budget removed', 'info');
    } else if (type === 'goal') {
      await db.savingsGoals.delete(id);
      showToast('Savings goal removed', 'info');
    } else if (type === 'debt') {
      await db.debts.delete(id);
      showToast('Debt record removed', 'info');
    } else if (type === 'recurring') {
      await db.recurringTransactions.delete(id);
      showToast('Recurring schedule removed', 'info');
    }
    setRecordToDelete(null);
  };

  // CSV Export using universal native/browser save utility
  const handleExportCsv = async () => {
    try {
      const csv = generateTransactionsCsv(transactions, accounts);
      const filename = `college-finance-ledger-${todayKey}.csv`;
      const res = await saveOrShareFile(csv, filename, 'text/csv');
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'danger');
      }
    } catch (err: any) {
      showToast(`Export failed: ${err?.message || 'Unknown error'}`, 'danger');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[rgb(var(--c-primary))]/15 text-[rgb(var(--c-primary))] text-[10px] font-heading font-bold uppercase tracking-wider">
              Offline-First Personal Finance
            </span>
            <span className="text-[11px] font-mono text-[rgb(var(--c-muted))]">
              {primaryCurrency} Primary
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-heading font-black text-[rgb(var(--c-text))] mt-1">
            Student Financial Ledger &amp; Cash Flow
          </h1>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            Track allowances, dining, dorm fees, budgets, savings goals, and debts with zero cloud dependencies
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setEditingTx(null);
              setIsTxModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-md hover:opacity-95 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Transaction</span>
          </button>

          <button
            onClick={() => setIsCategorySettingsOpen(true)}
            className="p-2.5 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-border))]/30 transition"
            title="Manage Categories & Currencies"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] text-xs font-heading font-bold hover:bg-[rgb(var(--c-border))]/30 transition"
            title="Export CSV"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-[rgb(var(--c-border))]">
        {(
          [
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
            { id: 'accounts', label: 'Accounts & Wallets', icon: Wallet },
            { id: 'budgets', label: 'Budgets', icon: Target },
            { id: 'savings', label: 'Savings Goals', icon: PiggyBank },
            { id: 'debts', label: 'Debts & Loans', icon: HandCoins },
            { id: 'recurring', label: 'Recurring', icon: Clock },
            { id: 'reports', label: 'Annual Analytics', icon: TrendingUp },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-heading font-bold whitespace-nowrap transition ${
                isActive
                  ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] shadow-xs'
                  : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ======================================================================= */}
      {activeTab === 'overview' && (
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
                onClick={() => setActiveTab('accounts')}
                className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] hover:underline flex items-center gap-1"
              >
                <span>Manage Accounts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className="p-4 text-center rounded-2xl bg-[rgb(var(--c-surface2))] text-xs text-[rgb(var(--c-muted))] font-flourish">
                No accounts set up yet.{' '}
                <button
                  onClick={() => setIsAccountModalOpen(true)}
                  className="text-[rgb(var(--c-primary))] font-bold underline"
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
                onClick={() => {
                  setEditingBudget(null);
                  setIsBudgetModalOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[rgb(var(--c-primary))]/15 text-[rgb(var(--c-primary))] font-heading text-xs font-bold hover:bg-[rgb(var(--c-primary))]/25 transition"
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
                  onClick={() => setActiveTab('savings')}
                  className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] hover:underline"
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
                  onClick={() => setActiveTab('debts')}
                  className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] hover:underline"
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
      )}

      {/* ======================================================================= */}
      {/* TAB 2: TRANSACTIONS LEDGER */}
      {/* ======================================================================= */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filter Drawer */}
          <TransactionFilterDrawer
            filters={filters}
            onChange={setFilters}
            onReset={() =>
              setFilters({
                searchQuery: '',
                type: 'all',
                accountId: 'all',
                category: 'all',
                subcategory: 'all',
                sortOrder: 'newest',
              })
            }
            accounts={accounts}
            categories={categories}
            totalMatches={filteredTransactionsList.length}
          />

          {/* Transactions List */}
          {filteredTransactionsList.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] space-y-2">
              <p className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                No matching transactions found
              </p>
              <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
                Try adjusting your search criteria, amount limits, or date filters
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTransactionsList.map((tx) => {
                const acc = accountMap.get(tx.financialAccountId || tx.accountId || '');
                const srcAcc = accountMap.get(tx.sourceAccountId || '');
                const tgtAcc = accountMap.get(tx.targetAccountId || tx.toAccountId || '');

                const isExpense = tx.type === 'expense';
                const isIncome = tx.type === 'income';
                const isTransfer = tx.type === 'transfer';
                const isSaving = tx.type === 'saving';
                const isDebt = Boolean(tx.debtId) || tx.isDebtRepayment;

                return (
                  <div
                    key={tx.id}
                    className="p-4 rounded-2xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition hover:border-[rgb(var(--c-primary))]/40"
                  >
                    <div className="flex items-start gap-3">
                      {/* Type Icon Badge */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                          isDebt
                            ? 'bg-purple-500/15 text-purple-500'
                            : isSaving
                            ? 'bg-amber-500/15 text-amber-500'
                            : isTransfer
                            ? 'bg-blue-500/15 text-blue-500'
                            : isIncome
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-rose-500/15 text-rose-500'
                        }`}
                      >
                        {isDebt ? (
                          <HandCoins className="w-4 h-4" />
                        ) : isSaving ? (
                          <PiggyBank className="w-4 h-4" />
                        ) : isTransfer ? (
                          <ArrowLeftRight className="w-4 h-4" />
                        ) : isIncome ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-heading font-bold text-xs text-[rgb(var(--c-text))]">
                            {tx.category}
                          </span>

                          {tx.subcategory && (
                            <span className="px-2 py-0.5 rounded-md bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[10px] font-heading text-[rgb(var(--c-muted))]">
                              {tx.subcategory}
                            </span>
                          )}

                          {isTransfer && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-500 text-[10px] font-heading font-bold">
                              Transfer: {srcAcc?.name || 'Account'} → {tgtAcc?.name || 'Account'}
                            </span>
                          )}

                          {isDebt && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-500 text-[10px] font-heading font-bold">
                              Debt Repayment
                            </span>
                          )}

                          {isSaving && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 text-[10px] font-heading font-bold">
                              Savings Goal Deposit
                            </span>
                          )}
                        </div>

                        {/* Account & Date */}
                        <div className="text-[11px] text-[rgb(var(--c-muted))] flex items-center gap-2">
                          <span>{tx.date.substring(0, 10)}</span>
                          {!isTransfer && acc && <span>• {acc.name}</span>}
                          {tx.notes && <span>• &ldquo;{tx.notes}&rdquo;</span>}
                        </div>

                        {/* Tags */}
                        {tx.tags && tx.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            {tx.tags.map((tg) => (
                              <span
                                key={tg}
                                className="px-1.5 py-0.2 rounded-md bg-[rgb(var(--c-border))]/50 text-[9px] font-mono text-[rgb(var(--c-muted))]"
                              >
                                #{tg}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-[rgb(var(--c-border))]/50">
                      <div className="text-right">
                        <div
                          className={`text-base font-mono font-bold ${
                            isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isExpense
                              ? 'text-rose-600 dark:text-rose-400'
                              : isSaving
                              ? 'text-amber-500'
                              : 'text-blue-500'
                          }`}
                        >
                          {isIncome ? '+' : isExpense ? '-' : ''}
                          {formatMoney(tx.amount, tx.currency || primaryCurrency)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingTx(tx);
                            setIsTxModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-border))]/30 transition"
                          title="Edit transaction"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setRecordToDelete({
                              type: 'transaction',
                              id: tx.id,
                              title: `${tx.category} (${formatMoney(tx.amount, tx.currency || primaryCurrency)})`,
                            })
                          }
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 3: ACCOUNTS & WALLETS */}
      {/* ======================================================================= */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] shadow-xs">
            <div>
              <h3 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                Financial Accounts &amp; Wallets ({accounts.length})
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
                Manage your campus cash, Commercial Bank of Ethiopia (CBE), Telebirr, or savings accounts
              </p>
            </div>
            <button
              onClick={() => {
                setEditingAccount(null);
                setIsAccountModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Account</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => {
              const balance = accountBalances[acc.id] || 0;
              const Icon = ACCOUNT_TYPE_LABELS[acc.accountType || acc.type || 'bank']?.icon || Wallet;
              return (
                <div
                  key={acc.id}
                  className={`p-5 rounded-3xl bg-[rgb(var(--c-surface))] border-2 transition space-y-3 ${
                    acc.isArchived
                      ? 'opacity-60 border-[rgb(var(--c-border))]'
                      : 'border-[rgb(var(--c-border))] hover:border-[rgb(var(--c-primary))]/40 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-[rgb(var(--c-surface2))] flex items-center justify-center text-[rgb(var(--c-primary))]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                          {acc.name}
                        </div>
                        <div className="text-[10px] text-[rgb(var(--c-muted))]">
                          {acc.institution || acc.accountType || acc.type}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {acc.isDefault && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-heading font-bold">
                          Default
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setEditingAccount(acc);
                          setIsAccountModalOpen(true);
                        }}
                        className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase">
                      Current Dynamic Balance
                    </div>
                    <div className="text-xl font-mono font-bold text-[rgb(var(--c-text))]">
                      {formatMoney(balance, acc.currency || primaryCurrency)}
                    </div>
                    <div className="text-[10px] font-mono text-[rgb(var(--c-muted))] mt-0.5">
                      Opening: {formatMoney(acc.openingBalance, acc.currency || primaryCurrency)}
                    </div>
                  </div>

                  {acc.notes && (
                    <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish italic">
                      &ldquo;{acc.notes}&rdquo;
                    </p>
                  )}

                  <div className="pt-2 border-t border-[rgb(var(--c-border))] flex items-center justify-between text-xs">
                    <button
                      onClick={async () => {
                        await db.financialAccounts.update(acc.id, {
                          isArchived: !acc.isArchived,
                        });
                        showToast(acc.isArchived ? 'Account unarchived' : 'Account archived', 'info');
                      }}
                      className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                    >
                      {acc.isArchived ? 'Unarchive' : 'Archive'}
                    </button>

                    <button
                      onClick={() =>
                        setRecordToDelete({
                          type: 'account',
                          id: acc.id,
                          title: acc.name,
                        })
                      }
                      className="text-[10px] font-heading font-bold text-rose-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 4: BUDGETS */}
      {/* ======================================================================= */}
      {activeTab === 'budgets' && (
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
              onClick={() => {
                setEditingBudget(null);
                setIsBudgetModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90"
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
                      onClick={() => {
                        setEditingBudget(st.budget);
                        setIsBudgetModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setRecordToDelete({
                          type: 'budget',
                          id: st.budget.id,
                          title: st.budget.name || st.budget.category,
                        })
                      }
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"
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
      )}

      {/* ======================================================================= */}
      {/* TAB 5: SAVINGS GOALS */}
      {/* ======================================================================= */}
      {activeTab === 'savings' && (
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
              onClick={() => {
                setEditingGoal(null);
                setIsSavingsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90"
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
                        onClick={() => {
                          setEditingGoal(goal);
                          setIsSavingsModalOpen(true);
                        }}
                        className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          setRecordToDelete({
                            type: 'goal',
                            id: goal.id,
                            title: goal.title,
                          })
                        }
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10"
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
                      onClick={() => {
                        setSelectedGoalForAction(goal);
                        setIsSavingsActionOpen(true);
                      }}
                      className="w-full py-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-heading text-xs font-bold hover:bg-amber-500/25 transition flex items-center justify-center gap-1.5"
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
      )}

      {/* ======================================================================= */}
      {/* TAB 6: DEBTS & LOANS */}
      {/* ======================================================================= */}
      {activeTab === 'debts' && (
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
              onClick={() => {
                setEditingDebt(null);
                setIsDebtModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90"
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
                        onClick={() => {
                          setEditingDebt(debt);
                          setIsDebtModalOpen(true);
                        }}
                        className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          setRecordToDelete({
                            type: 'debt',
                            id: debt.id,
                            title: `Debt with ${debt.personName || debt.person}`,
                          })
                        }
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10"
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
                        onClick={() => {
                          setSelectedDebtForPayment(debt);
                          setIsDebtPaymentOpen(true);
                        }}
                        className={`w-full py-2 rounded-xl font-heading text-xs font-bold transition flex items-center justify-center gap-1.5 ${
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
      )}

      {/* ======================================================================= */}
      {/* TAB 7: RECURRING SCHEDULES */}
      {/* ======================================================================= */}
      {activeTab === 'recurring' && (
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
              onClick={() => {
                setEditingRecurring(null);
                setIsRecurringModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90"
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
                        onClick={() => {
                          setEditingRecurring(rec);
                          setIsRecurringModalOpen(true);
                        }}
                        className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          setRecordToDelete({
                            type: 'recurring',
                            id: rec.id,
                            title: `${rec.frequency} ${rec.category}`,
                          })
                        }
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10"
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
                      className="text-[11px] font-heading font-bold text-[rgb(var(--c-primary))]"
                    >
                      {rec.isActive ? 'Active (Tap to Pause)' : 'Paused (Tap to Resume)'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 8: ANNUAL REPORTS & ANALYTICS */}
      {/* ======================================================================= */}
      {activeTab === 'reports' && (
        <FinanceReportsView
          transactions={transactions}
          primaryCurrency={primaryCurrency}
          exchangeRates={exchangeRates}
        />
      )}

      {/* ======================================================================= */}
      {/* MODALS */}
      {/* ======================================================================= */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        editingTx={editingTx}
        accounts={accounts}
        categories={categories}
        savingsGoals={savingsGoals}
        debts={debts}
        primaryCurrency={primaryCurrency}
        todayKey={todayKey}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setEditingAccount(null);
        }}
        onSave={handleSaveAccount}
        editingAccount={editingAccount}
        primaryCurrency={primaryCurrency}
        isFirstAccount={accounts.length === 0}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => {
          setIsBudgetModalOpen(false);
          setEditingBudget(null);
        }}
        onSave={handleSaveBudget}
        editingBudget={editingBudget}
        categories={categories}
        currentMonthKey={currentMonthKey}
        todayKey={todayKey}
      />

      <SavingsModal
        isOpen={isSavingsModalOpen}
        onClose={() => {
          setIsSavingsModalOpen(false);
          setEditingGoal(null);
        }}
        onSave={handleSaveGoal}
        editingGoal={editingGoal}
        primaryCurrency={primaryCurrency}
        todayKey={todayKey}
      />

      {selectedGoalForAction && (
        <SavingsActionModal
          isOpen={isSavingsActionOpen}
          onClose={() => {
            setIsSavingsActionOpen(false);
            setSelectedGoalForAction(null);
          }}
          goal={selectedGoalForAction}
          accounts={accounts}
          onExecute={handleExecuteSavingsAction}
          primaryCurrency={primaryCurrency}
        />
      )}

      <DebtModal
        isOpen={isDebtModalOpen}
        onClose={() => {
          setIsDebtModalOpen(false);
          setEditingDebt(null);
        }}
        onSave={handleSaveDebt}
        editingDebt={editingDebt}
        primaryCurrency={primaryCurrency}
        todayKey={todayKey}
      />

      {selectedDebtForPayment && (
        <DebtPaymentModal
          isOpen={isDebtPaymentOpen}
          onClose={() => {
            setIsDebtPaymentOpen(false);
            setSelectedDebtForPayment(null);
          }}
          debt={selectedDebtForPayment}
          accounts={accounts}
          onExecutePayment={handleExecuteDebtPayment}
          primaryCurrency={primaryCurrency}
        />
      )}

      <RecurringModal
        isOpen={isRecurringModalOpen}
        onClose={() => {
          setIsRecurringModalOpen(false);
          setEditingRecurring(null);
        }}
        onSave={handleSaveRecurring}
        editingRecurring={editingRecurring}
        accounts={accounts}
        categories={categories}
        primaryCurrency={primaryCurrency}
        todayKey={todayKey}
      />

      <CategorySettingsModal
        isOpen={isCategorySettingsOpen}
        onClose={() => setIsCategorySettingsOpen(false)}
        categories={categories}
        onSaveCategories={handleSaveCategories}
        primaryCurrency={primaryCurrency}
        onSavePrimaryCurrency={handleSavePrimaryCurrency}
        exchangeRates={exchangeRates}
        onSaveExchangeRates={handleSaveExchangeRates}
      />

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                Confirm Deletion
              </h3>
            </div>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Are you sure you want to delete &ldquo;{recordToDelete.title}&rdquo;? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] text-xs font-heading font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white font-heading text-xs font-bold shadow-xs hover:bg-rose-600"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
