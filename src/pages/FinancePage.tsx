import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import {
  FinancialAccount,
  Transaction,
  Budget,
  SavingsGoal,
  DebtRecord,
  RecurringTransaction,
  FinanceCategory,
} from '../types';
import { getTodayKey } from '../utils/dateUtils';
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

// Subcomponents & Modals
import { TransactionModal } from '../components/finance/TransactionModal';
import { CategorySettingsModal } from '../components/finance/CategorySettingsModal';
import { FinanceReportsView } from '../components/finance/FinanceReportsView';
import { BudgetModal } from '../components/finance/BudgetModal';
import { SavingsModal } from '../components/finance/SavingsModal';
import { SavingsActionModal } from '../components/finance/SavingsActionModal';
import { DebtModal } from '../components/finance/DebtModal';
import { DebtPaymentModal } from '../components/finance/DebtPaymentModal';
import { RecurringModal } from '../components/finance/RecurringModal';
import { AccountModal } from '../components/finance/AccountModal';

// Views
import { FinanceOverviewView } from '../components/finance/FinanceOverviewView';
import { FinanceTransactionsView } from '../components/finance/FinanceTransactionsView';
import { FinanceAccountsView } from '../components/finance/FinanceAccountsView';
import { FinanceBudgetsView } from '../components/finance/FinanceBudgetsView';
import { FinanceGoalsView } from '../components/finance/FinanceGoalsView';
import { FinanceDebtsView } from '../components/finance/FinanceDebtsView';
import { FinanceRecurringView } from '../components/finance/FinanceRecurringView';
import { FinanceDeleteModal } from '../components/finance/FinanceDeleteModal';

import {
  Wallet,
  PiggyBank,
  Plus,
  ArrowLeftRight,
  TrendingUp,
  BarChart3,
  Clock,
  Download,
  Target,
  HandCoins,
  Settings,
} from 'lucide-react';

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

  // Idempotent recurring transactions check on open
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

  // Derived Financial Calculations (Strict Accounting Rules)
  const accountBalances = useMemo(() => {
    return calculateAccountBalances(accounts, transactions);
  }, [accounts, transactions]);

  const totalNetWorth = useMemo(() => {
    return accounts
      .filter((a) => !a.isArchived)
      .reduce((sum, acc) => sum + (accountBalances[acc.id] || 0), 0);
  }, [accounts, accountBalances]);

  const thisMonthCashFlow = useMemo(() => {
    return calculateCashFlowPeriodStats(
      transactions,
      `${currentMonthKey}-01`,
      `${currentMonthKey}-31`,
      { primaryCurrency, rates: exchangeRates }
    );
  }, [transactions, currentMonthKey, primaryCurrency, exchangeRates]);

  const budgetStatuses = useMemo(() => {
    return calculateBudgetStatuses(budgets, transactions, currentMonthKey, todayKey);
  }, [budgets, transactions, currentMonthKey, todayKey]);

  const debtSummary = useMemo(() => {
    return calculateDebtSummary(debts);
  }, [debts]);

  const filteredTransactionsList = useMemo(() => {
    return filterTransactions(transactions, filters);
  }, [transactions, filters]);

  const accountMap = useMemo(() => {
    const map = new Map<string, FinancialAccount>();
    accounts.forEach((a) => map.set(a.id, a));
    return map;
  }, [accounts]);

  // Handlers
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
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-md hover:opacity-95 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Transaction</span>
          </button>

          <button
            onClick={() => setIsCategorySettingsOpen(true)}
            className="p-2.5 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-border))]/30 transition cursor-pointer"
            title="Manage Categories & Currencies"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] text-xs font-heading font-bold hover:bg-[rgb(var(--c-border))]/30 transition cursor-pointer"
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-heading font-bold whitespace-nowrap transition cursor-pointer ${
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

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <FinanceOverviewView
          totalNetWorth={totalNetWorth}
          primaryCurrency={primaryCurrency}
          accounts={accounts}
          accountBalances={accountBalances}
          thisMonthCashFlow={thisMonthCashFlow}
          currentMonthKey={currentMonthKey}
          onManageAccounts={() => setActiveTab('accounts')}
          onAddAccount={() => {
            setEditingAccount(null);
            setIsAccountModalOpen(true);
          }}
          budgetStatuses={budgetStatuses}
          onNewBudget={() => {
            setEditingBudget(null);
            setIsBudgetModalOpen(true);
          }}
          savingsGoals={savingsGoals}
          onViewAllSavings={() => setActiveTab('savings')}
          debtSummary={debtSummary}
          onManageDebts={() => setActiveTab('debts')}
        />
      )}

      {/* TAB 2: TRANSACTIONS LEDGER */}
      {activeTab === 'transactions' && (
        <FinanceTransactionsView
          filters={filters}
          onFiltersChange={setFilters}
          onResetFilters={() =>
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
          transactions={filteredTransactionsList}
          accountMap={accountMap}
          primaryCurrency={primaryCurrency}
          onEditTransaction={(tx) => {
            setEditingTx(tx);
            setIsTxModalOpen(true);
          }}
          onDeleteTransaction={(tx) =>
            setRecordToDelete({
              type: 'transaction',
              id: tx.id,
              title: `${tx.category} (${formatMoney(tx.amount, tx.currency || primaryCurrency)})`,
            })
          }
        />
      )}

      {/* TAB 3: ACCOUNTS & WALLETS */}
      {activeTab === 'accounts' && (
        <FinanceAccountsView
          accounts={accounts}
          accountBalances={accountBalances}
          primaryCurrency={primaryCurrency}
          onAddAccount={() => {
            setEditingAccount(null);
            setIsAccountModalOpen(true);
          }}
          onEditAccount={(acc) => {
            setEditingAccount(acc);
            setIsAccountModalOpen(true);
          }}
          onDeleteAccount={(acc) =>
            setRecordToDelete({
              type: 'account',
              id: acc.id,
              title: acc.name,
            })
          }
        />
      )}

      {/* TAB 4: BUDGETS */}
      {activeTab === 'budgets' && (
        <FinanceBudgetsView
          budgets={budgets}
          budgetStatuses={budgetStatuses}
          currentMonthKey={currentMonthKey}
          primaryCurrency={primaryCurrency}
          onNewBudget={() => {
            setEditingBudget(null);
            setIsBudgetModalOpen(true);
          }}
          onEditBudget={(b) => {
            setEditingBudget(b);
            setIsBudgetModalOpen(true);
          }}
          onDeleteBudget={(b) =>
            setRecordToDelete({
              type: 'budget',
              id: b.id,
              title: b.name || b.category,
            })
          }
        />
      )}

      {/* TAB 5: SAVINGS GOALS */}
      {activeTab === 'savings' && (
        <FinanceGoalsView
          savingsGoals={savingsGoals}
          primaryCurrency={primaryCurrency}
          onNewGoal={() => {
            setEditingGoal(null);
            setIsSavingsModalOpen(true);
          }}
          onEditGoal={(g) => {
            setEditingGoal(g);
            setIsSavingsModalOpen(true);
          }}
          onDeleteGoal={(g) =>
            setRecordToDelete({
              type: 'goal',
              id: g.id,
              title: g.title,
            })
          }
          onActionGoal={(g) => {
            setSelectedGoalForAction(g);
            setIsSavingsActionOpen(true);
          }}
        />
      )}

      {/* TAB 6: DEBTS & LOANS */}
      {activeTab === 'debts' && (
        <FinanceDebtsView
          debts={debts}
          primaryCurrency={primaryCurrency}
          onNewDebt={() => {
            setEditingDebt(null);
            setIsDebtModalOpen(true);
          }}
          onEditDebt={(d) => {
            setEditingDebt(d);
            setIsDebtModalOpen(true);
          }}
          onDeleteDebt={(d) =>
            setRecordToDelete({
              type: 'debt',
              id: d.id,
              title: `Debt with ${d.personName || d.person}`,
            })
          }
          onPaymentDebt={(d) => {
            setSelectedDebtForPayment(d);
            setIsDebtPaymentOpen(true);
          }}
        />
      )}

      {/* TAB 7: RECURRING SCHEDULES */}
      {activeTab === 'recurring' && (
        <FinanceRecurringView
          recurringList={recurringList}
          accountMap={accountMap}
          primaryCurrency={primaryCurrency}
          onNewRecurring={() => {
            setEditingRecurring(null);
            setIsRecurringModalOpen(true);
          }}
          onEditRecurring={(rec) => {
            setEditingRecurring(rec);
            setIsRecurringModalOpen(true);
          }}
          onDeleteRecurring={(rec) =>
            setRecordToDelete({
              type: 'recurring',
              id: rec.id,
              title: `${rec.frequency} ${rec.category}`,
            })
          }
        />
      )}

      {/* TAB 8: ANNUAL REPORTS & ANALYTICS */}
      {activeTab === 'reports' && (
        <FinanceReportsView
          transactions={transactions}
          primaryCurrency={primaryCurrency}
          exchangeRates={exchangeRates}
        />
      )}

      {/* Modals */}
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
      <FinanceDeleteModal
        recordToDelete={recordToDelete}
        onCancel={() => setRecordToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
