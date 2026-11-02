import React, { useState, useMemo } from 'react';
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
} from '../types';
import { getTodayKey, formatDisplayDate } from '../utils/dateUtils';
import { generateId } from '../utils/idGenerator';
import { awardXp, triggerLevelUpConfetti } from '../services/rpgService';
import {
  calculateAccountBalances,
  calculateCashFlowPeriodStats,
  calculateBudgetStatuses,
  calculateDebtSummary,
  formatMoney,
  generateTransactionsCsv,
} from '../utils/financeEngine';
import { downloadFile } from '../services/backupService';
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
  PieChart,
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
  UserCheck,
  ChevronDown,
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

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Campus Transport',
  'Stationery & Printing',
  'Books & Course Materials',
  'Dorm & Housing',
  'Internet & Airtime',
  'Personal Care & Health',
  'Entertainment & Social',
  'Academic Fees',
  'Other Expense',
];

const INCOME_CATEGORIES = [
  'Allowance & Stipend',
  'Family Support',
  'Scholarship & Grant',
  'Tutoring & Freelancing',
  'Part-time Job',
  'Cash Gift',
  'Reimbursement',
  'Other Income',
];

type FinanceTab = 'overview' | 'accounts' | 'transactions' | 'budgets' | 'savings' | 'debts' | 'recurring';
type PeriodFilter = 'day' | 'week' | 'month' | 'year' | 'all';

export const FinancePage: React.FC = () => {
  const { showToast } = useUiStore();
  const todayKey = getTodayKey();

  // Live queries from Dexie
  const accounts = useLiveQuery(() => db.financialAccounts.toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const budgets = useLiveQuery(() => db.budgets.toArray()) || [];
  const savingsGoals = useLiveQuery(() => db.savingsGoals.toArray()) || [];
  const debts = useLiveQuery(() => db.debts.toArray()) || [];
  const recurringList = useLiveQuery(() => db.recurringTransactions.toArray()) || [];

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');
  const [period, setPeriod] = useState<PeriodFilter>('month');

  // Modals state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [selectedGoalForAction, setSelectedGoalForAction] = useState<SavingsGoal | null>(null);
  const [contributeType, setContributeType] = useState<'deposit' | 'withdraw'>('deposit');
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributeAccountId, setContributeAccountId] = useState('');

  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null);
  const [isPayDebtModalOpen, setIsPayDebtModalOpen] = useState(false);
  const [selectedDebtForPay, setSelectedDebtForPay] = useState<DebtRecord | null>(null);
  const [payDebtAmount, setPayDebtAmount] = useState('');
  const [payDebtAccountId, setPayDebtAccountId] = useState('');

  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);

  // Transaction Ledger state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<FinancialAccount | null>(null);

  // Forms state
  // Account Form
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<FinancialAccountType>('bank');
  const [accOpeningBalance, setAccOpeningBalance] = useState('');
  const [accCurrency, setAccCurrency] = useState('ETB');
  const [accNotes, setAccNotes] = useState('');
  const [accIsDefault, setAccIsDefault] = useState(false);

  // Expense Form
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayKey);
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseTags, setExpenseTags] = useState('');

  // Income Form
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCategory, setIncomeCategory] = useState(INCOME_CATEGORIES[0]);
  const [incomeAccountId, setIncomeAccountId] = useState('');
  const [incomeDate, setIncomeDate] = useState(todayKey);
  const [incomeNotes, setIncomeNotes] = useState('');

  // Transfer Form
  const [transferAmount, setTransferAmount] = useState('');
  const [transferSourceId, setTransferSourceId] = useState('');
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferDate, setTransferDate] = useState(todayKey);
  const [transferNotes, setTransferNotes] = useState('');

  // Budget Form
  const [budgetCategory, setBudgetCategory] = useState('all');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<'monthly' | 'weekly' | 'custom'>('monthly');

  // Goal Form
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalCategory, setGoalCategory] = useState('tech');

  // Debt Form
  const [debtType, setDebtType] = useState<'payable' | 'receivable'>('payable');
  const [debtPerson, setDebtPerson] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtNotes, setDebtNotes] = useState('');

  // Recurring Form
  const [recType, setRecType] = useState<'expense' | 'income'>('expense');
  const [recAmount, setRecAmount] = useState('');
  const [recCategory, setRecCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [recAccountId, setRecAccountId] = useState('');
  const [recFrequency, setRecFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [recNextDueDate, setRecNextDueDate] = useState(todayKey);
  const [recNotes, setRecNotes] = useState('');

  // Calculated Dynamic Balances
  const accountBalances = useMemo(() => {
    return calculateAccountBalances(accounts, transactions);
  }, [accounts, transactions]);

  // Total Money Across Active Accounts
  const totalNetWorth = useMemo(() => {
    return accounts
      .filter((a) => !a.isArchived)
      .reduce((sum, acc) => sum + (accountBalances[acc.id] || 0), 0);
  }, [accounts, accountBalances]);

  // Period Date Range
  const { startDateIso, endDateIso } = useMemo(() => {
    const now = new Date();
    if (period === 'day') {
      return { startDateIso: todayKey, endDateIso: todayKey };
    }
    if (period === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { startDateIso: d.toISOString().substring(0, 10), endDateIso: todayKey };
    }
    if (period === 'month') {
      const monthPrefix = todayKey.substring(0, 7);
      return { startDateIso: `${monthPrefix}-01`, endDateIso: todayKey };
    }
    if (period === 'year') {
      const yearPrefix = todayKey.substring(0, 4);
      return { startDateIso: `${yearPrefix}-01-01`, endDateIso: todayKey };
    }
    return { startDateIso: undefined, endDateIso: undefined };
  }, [period, todayKey]);

  // Cash Flow Stats for current period
  const cashFlowStats = useMemo(() => {
    return calculateCashFlowPeriodStats(transactions, startDateIso, endDateIso);
  }, [transactions, startDateIso, endDateIso]);

  // Budgets status
  const currentMonthKey = todayKey.substring(0, 7);
  const budgetStatuses = useMemo(() => {
    return calculateBudgetStatuses(budgets, transactions, currentMonthKey);
  }, [budgets, transactions, currentMonthKey]);

  // Debts summary
  const debtSummary = useMemo(() => {
    return calculateDebtSummary(debts);
  }, [debts]);

  // Default account helper
  const defaultAccount = useMemo(() => {
    return accounts.find((a) => a.isDefault && !a.isArchived) || accounts.find((a) => !a.isArchived) || null;
  }, [accounts]);

  // --------------------------------------------------------------------------
  // ACCOUNT CRUD HANDLERS
  // --------------------------------------------------------------------------
  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccName('');
    setAccType('bank');
    setAccOpeningBalance('');
    setAccCurrency('ETB');
    setAccNotes('');
    setAccIsDefault(accounts.length === 0);
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: FinancialAccount) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.accountType || acc.type || 'bank');
    setAccOpeningBalance(acc.openingBalance.toString());
    setAccCurrency(acc.currency || 'ETB');
    setAccNotes(acc.notes || '');
    setAccIsDefault(!!acc.isDefault);
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) {
      showToast('Account name is required', 'warning');
      return;
    }

    const openingBal = parseFloat(accOpeningBalance) || 0;
    const now = new Date().toISOString();

    if (accIsDefault) {
      // Unmark any previous default
      await db.financialAccounts.toCollection().modify((a) => {
        a.isDefault = false;
      });
    }

    if (editingAccount) {
      await db.financialAccounts.update(editingAccount.id, {
        name: accName.trim(),
        accountType: accType,
        openingBalance: openingBal,
        currency: accCurrency.trim() || 'ETB',
        notes: accNotes.trim() || undefined,
        isDefault: accIsDefault,
        updatedAt: now,
      });
      showToast(`Account "${accName}" updated`, 'success');
    } else {
      const id = generateId();
      await db.financialAccounts.add({
        id,
        name: accName.trim(),
        accountType: accType,
        openingBalance: openingBal,
        currency: accCurrency.trim() || 'ETB',
        notes: accNotes.trim() || undefined,
        isDefault: accIsDefault,
        createdAt: now,
        updatedAt: now,
      });
      showToast(`Account "${accName}" created successfully!`, 'success');
    }

    setIsAccountModalOpen(false);
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    const txCount = transactions.filter(
      (t) => t.financialAccountId === accountToDelete.id || t.sourceAccountId === accountToDelete.id || t.targetAccountId === accountToDelete.id
    ).length;

    if (txCount > 0) {
      showToast(
        `Cannot delete "${accountToDelete.name}" because it has ${txCount} linked transactions. You can archive it instead.`,
        'warning'
      );
      setAccountToDelete(null);
      return;
    }

    await db.financialAccounts.delete(accountToDelete.id);
    showToast(`Account "${accountToDelete.name}" removed`, 'info');
    setAccountToDelete(null);
  };

  // --------------------------------------------------------------------------
  // EXPENSE HANDLER
  // --------------------------------------------------------------------------
  const handleOpenAddExpense = () => {
    setExpenseAmount('');
    setExpenseCategory(EXPENSE_CATEGORIES[0]);
    setExpenseAccountId(defaultAccount?.id || '');
    setExpenseDate(todayKey);
    setExpenseNotes('');
    setExpenseTags('');
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseAmount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid expense amount', 'warning');
      return;
    }

    const targetAccount = accounts.find((a) => a.id === expenseAccountId);
    const id = generateId();
    const tags = expenseTags.split(',').map((t) => t.trim()).filter(Boolean);

    await db.transactions.add({
      id,
      amount: amt,
      type: 'expense',
      category: expenseCategory,
      financialAccountId: expenseAccountId || undefined,
      account: (targetAccount?.accountType as any) || 'cash',
      date: expenseDate ? new Date(expenseDate).toISOString() : new Date().toISOString(),
      notes: expenseNotes.trim() || undefined,
      tags: tags.length ? tags : undefined,
    });

    await awardXp({
      source: 'habit_log',
      sourceId: id,
      amount: 5,
      stat: 'discipline',
    });

    showToast(`Logged expense: ${formatMoney(amt, targetAccount?.currency || 'ETB')}`, 'success');
    setIsExpenseModalOpen(false);
  };

  // --------------------------------------------------------------------------
  // INCOME HANDLER
  // --------------------------------------------------------------------------
  const handleOpenAddIncome = () => {
    setIncomeAmount('');
    setIncomeCategory(INCOME_CATEGORIES[0]);
    setIncomeAccountId(defaultAccount?.id || '');
    setIncomeDate(todayKey);
    setIncomeNotes('');
    setIsIncomeModalOpen(true);
  };

  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(incomeAmount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid income amount', 'warning');
      return;
    }

    const targetAccount = accounts.find((a) => a.id === incomeAccountId);
    const id = generateId();

    await db.transactions.add({
      id,
      amount: amt,
      type: 'income',
      category: incomeCategory,
      financialAccountId: incomeAccountId || undefined,
      account: (targetAccount?.accountType as any) || 'mobile_money',
      date: incomeDate ? new Date(incomeDate).toISOString() : new Date().toISOString(),
      notes: incomeNotes.trim() || undefined,
    });

    await awardXp({
      source: 'habit_log',
      sourceId: id,
      amount: 10,
      stat: 'discipline',
    });

    showToast(`Logged income: +${formatMoney(amt, targetAccount?.currency || 'ETB')}`, 'success');
    setIsIncomeModalOpen(false);
  };

  // --------------------------------------------------------------------------
  // TRANSFER HANDLER
  // --------------------------------------------------------------------------
  const handleOpenTransfer = () => {
    if (accounts.length < 2) {
      showToast('You need at least 2 accounts to make a transfer.', 'warning');
      return;
    }
    setTransferAmount('');
    setTransferSourceId(accounts[0]?.id || '');
    setTransferTargetId(accounts[1]?.id || '');
    setTransferDate(todayKey);
    setTransferNotes('');
    setIsTransferModalOpen(true);
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid transfer amount', 'warning');
      return;
    }
    if (!transferSourceId || !transferTargetId) {
      showToast('Select both source and target accounts', 'warning');
      return;
    }
    if (transferSourceId === transferTargetId) {
      showToast('Source and destination accounts must be different', 'warning');
      return;
    }

    const source = accounts.find((a) => a.id === transferSourceId);
    const target = accounts.find((a) => a.id === transferTargetId);
    const id = generateId();

    await db.transactions.add({
      id,
      amount: amt,
      type: 'transfer',
      category: 'Transfer',
      sourceAccountId: transferSourceId,
      targetAccountId: transferTargetId,
      financialAccountId: transferSourceId,
      account: (source?.accountType as any) || 'bank',
      date: transferDate ? new Date(transferDate).toISOString() : new Date().toISOString(),
      notes: transferNotes.trim() || `Transferred from ${source?.name} to ${target?.name}`,
    });

    showToast(`Transferred ${formatMoney(amt, source?.currency || 'ETB')} between accounts`, 'success');
    setIsTransferModalOpen(false);
  };

  // --------------------------------------------------------------------------
  // BUDGET HANDLER
  // --------------------------------------------------------------------------
  const handleOpenAddBudget = () => {
    setEditingBudget(null);
    setBudgetCategory('all');
    setBudgetAmount('');
    setBudgetPeriod('monthly');
    setIsBudgetModalOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(budgetAmount);
    if (!amt || amt <= 0) {
      showToast('Please enter a valid budget amount', 'warning');
      return;
    }

    if (editingBudget) {
      await db.budgets.update(editingBudget.id, {
        category: budgetCategory,
        amount: amt,
        period: budgetPeriod,
      });
      showToast('Budget updated successfully', 'success');
    } else {
      const id = generateId();
      await db.budgets.add({
        id,
        category: budgetCategory,
        amount: amt,
        month: currentMonthKey,
        period: budgetPeriod,
      });
      showToast('New budget limit set!', 'success');
    }

    setIsBudgetModalOpen(false);
  };

  // --------------------------------------------------------------------------
  // SAVINGS GOAL HANDLER
  // --------------------------------------------------------------------------
  const handleOpenAddGoal = () => {
    setEditingGoal(null);
    setGoalTitle('');
    setGoalTargetAmount('');
    setGoalDeadline('');
    setGoalCategory('tech');
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmt = parseFloat(goalTargetAmount);
    if (!goalTitle.trim() || !targetAmt || targetAmt <= 0) {
      showToast('Provide a goal title and target amount', 'warning');
      return;
    }

    if (editingGoal) {
      await db.savingsGoals.update(editingGoal.id, {
        title: goalTitle.trim(),
        targetAmount: targetAmt,
        deadline: goalDeadline || undefined,
        category: goalCategory,
      });
      showToast(`Goal "${goalTitle}" updated`, 'success');
    } else {
      const id = generateId();
      await db.savingsGoals.add({
        id,
        title: goalTitle.trim(),
        targetAmount: targetAmt,
        currentAmount: 0,
        deadline: goalDeadline || undefined,
        category: goalCategory,
        createdAt: new Date().toISOString(),
      });
      showToast(`Goal "${goalTitle}" created!`, 'success');
    }

    setIsGoalModalOpen(false);
  };

  const handleContributeToGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalForAction) return;
    const amt = parseFloat(contributeAmount);
    if (!amt || amt <= 0) {
      showToast('Enter a valid contribution amount', 'warning');
      return;
    }

    const current = Number(selectedGoalForAction.currentAmount) || 0;
    const targetAccount = accounts.find((a) => a.id === contributeAccountId);

    if (contributeType === 'deposit') {
      const newAmt = current + amt;
      await db.savingsGoals.update(selectedGoalForAction.id, {
        currentAmount: newAmt,
      });

      // Log transaction if account specified
      if (contributeAccountId) {
        await db.transactions.add({
          id: generateId(),
          amount: amt,
          type: 'saving',
          category: `Savings: ${selectedGoalForAction.title}`,
          financialAccountId: contributeAccountId,
          account: (targetAccount?.accountType as any) || 'savings',
          date: new Date().toISOString(),
          notes: `Deposit to savings goal: ${selectedGoalForAction.title}`,
        });
      }

      await awardXp({
        source: 'habit_log',
        sourceId: selectedGoalForAction.id,
        amount: 15,
        stat: 'discipline',
      });

      if (newAmt >= selectedGoalForAction.targetAmount) {
        triggerLevelUpConfetti();
        showToast(`🏆 Goal reached! You completed "${selectedGoalForAction.title}"!`, 'success');
      } else {
        showToast(`Added ${formatMoney(amt, 'ETB')} to "${selectedGoalForAction.title}"`, 'success');
      }
    } else {
      // Withdrawal
      const newAmt = Math.max(0, current - amt);
      await db.savingsGoals.update(selectedGoalForAction.id, {
        currentAmount: newAmt,
      });

      if (contributeAccountId) {
        await db.transactions.add({
          id: generateId(),
          amount: amt,
          type: 'income',
          category: `Withdrawal: ${selectedGoalForAction.title}`,
          financialAccountId: contributeAccountId,
          account: (targetAccount?.accountType as any) || 'savings',
          date: new Date().toISOString(),
          notes: `Withdrawal from savings goal: ${selectedGoalForAction.title}`,
        });
      }

      showToast(`Withdrew ${formatMoney(amt, 'ETB')} from "${selectedGoalForAction.title}"`, 'info');
    }

    setIsContributeModalOpen(false);
  };

  // --------------------------------------------------------------------------
  // DEBTS & LOANS HANDLER
  // --------------------------------------------------------------------------
  const handleOpenAddDebt = () => {
    setEditingDebt(null);
    setDebtType('payable');
    setDebtPerson('');
    setDebtAmount('');
    setDebtDueDate('');
    setDebtNotes('');
    setIsDebtModalOpen(true);
  };

  const handleSaveDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(debtAmount);
    if (!debtPerson.trim() || !amt || amt <= 0) {
      showToast('Enter person name and amount', 'warning');
      return;
    }

    const now = new Date().toISOString();
    if (editingDebt) {
      await db.debts.update(editingDebt.id, {
        type: debtType,
        personName: debtPerson.trim(),
        amount: amt,
        dueDate: debtDueDate || undefined,
        notes: debtNotes.trim() || undefined,
      });
      showToast('Debt record updated', 'success');
    } else {
      await db.debts.add({
        id: generateId(),
        type: debtType,
        personName: debtPerson.trim(),
        amount: amt,
        paidAmount: 0,
        dueDate: debtDueDate || undefined,
        notes: debtNotes.trim() || undefined,
        status: 'pending',
        createdAt: now,
      });
      showToast(`Recorded ${debtType === 'payable' ? 'money owed to' : 'money owed by'} ${debtPerson}`, 'success');
    }

    setIsDebtModalOpen(false);
  };

  const handleRecordDebtPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtForPay) return;
    const amt = parseFloat(payDebtAmount);
    if (!amt || amt <= 0) {
      showToast('Enter a valid payment amount', 'warning');
      return;
    }

    const currentPaid = Number(selectedDebtForPay.paidAmount) || 0;
    const newPaid = currentPaid + amt;
    const totalDebt = Number(selectedDebtForPay.amount ?? selectedDebtForPay.originalAmount) || 0;
    const isSettled = newPaid >= totalDebt;

    await db.debts.update(selectedDebtForPay.id, {
      paidAmount: newPaid,
      status: isSettled ? 'settled' : 'partial',
    });

    // Optionally record transaction
    if (payDebtAccountId) {
      const targetAcc = accounts.find((a) => a.id === payDebtAccountId);
      const isPayable = selectedDebtForPay.type === 'payable';

      await db.transactions.add({
        id: generateId(),
        amount: amt,
        type: isPayable ? 'expense' : 'income',
        category: isPayable ? 'Debt Payment' : 'Debt Collection',
        financialAccountId: payDebtAccountId,
        account: (targetAcc?.accountType as any) || 'cash',
        date: new Date().toISOString(),
        notes: `${isPayable ? 'Repayment to' : 'Received from'} ${selectedDebtForPay.personName}`,
      });
    }

    showToast(
      isSettled
        ? `🎉 Debt with ${selectedDebtForPay.personName} is fully settled!`
        : `Recorded payment of ${formatMoney(amt, 'ETB')}`,
      'success'
    );
    setIsPayDebtModalOpen(false);
  };

  // --------------------------------------------------------------------------
  // RECURRING HANDLER
  // --------------------------------------------------------------------------
  const handleOpenAddRecurring = () => {
    setRecType('expense');
    setRecAmount('');
    setRecCategory(EXPENSE_CATEGORIES[0]);
    setRecAccountId(defaultAccount?.id || '');
    setRecFrequency('monthly');
    setRecNextDueDate(todayKey);
    setRecNotes('');
    setIsRecurringModalOpen(true);
  };

  const handleSaveRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(recAmount);
    if (!amt || amt <= 0) {
      showToast('Enter a valid recurring amount', 'warning');
      return;
    }

    await db.recurringTransactions.add({
      id: generateId(),
      type: recType,
      amount: amt,
      category: recCategory,
      frequency: recFrequency,
      financialAccountId: recAccountId || undefined,
      nextDueDate: recNextDueDate || todayKey,
      notes: recNotes.trim() || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    showToast('Recurring transaction schedule saved!', 'success');
    setIsRecurringModalOpen(false);
  };

  const handleProcessRecurringItem = async (rec: RecurringTransaction) => {
    const acc = accounts.find((a) => a.id === rec.financialAccountId);
    const nowIso = new Date().toISOString();

    await db.transactions.add({
      id: generateId(),
      amount: rec.amount,
      type: rec.type,
      category: rec.category,
      financialAccountId: rec.financialAccountId,
      account: (acc?.accountType as any) || 'bank',
      date: nowIso,
      notes: rec.notes ? `Recurring: ${rec.notes}` : 'Scheduled recurring payment',
    });

    // Advance next due date
    const d = new Date(rec.nextDueDate);
    if (rec.frequency === 'daily') d.setDate(d.getDate() + 1);
    else if (rec.frequency === 'weekly') d.setDate(d.getDate() + 7);
    else if (rec.frequency === 'monthly') d.setMonth(d.getMonth() + 1);
    else if (rec.frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);

    const nextDue = d.toISOString().substring(0, 10);
    await db.recurringTransactions.update(rec.id, {
      nextDueDate: nextDue,
    });

    showToast(`Recorded transaction and advanced schedule to ${nextDue}`, 'success');
  };

  // --------------------------------------------------------------------------
  // LEDGER FILTERING & CSV EXPORT
  // --------------------------------------------------------------------------
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (filterType !== 'all' && tx.type !== filterType) return false;
        if (filterAccount !== 'all') {
          if (tx.financialAccountId !== filterAccount && tx.sourceAccountId !== filterAccount && tx.targetAccountId !== filterAccount) {
            return false;
          }
        }
        if (filterCategory !== 'all' && tx.category !== filterCategory) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesCat = tx.category.toLowerCase().includes(q);
          const matchesNotes = (tx.notes || '').toLowerCase().includes(q);
          const matchesTags = (tx.tags || []).some((t) => t.toLowerCase().includes(q));
          if (!matchesCat && !matchesNotes && !matchesTags) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') return b.date.localeCompare(a.date);
        if (sortOrder === 'oldest') return a.date.localeCompare(b.date);
        if (sortOrder === 'highest') return b.amount - a.amount;
        if (sortOrder === 'lowest') return a.amount - b.amount;
        return 0;
      });
  }, [transactions, filterType, filterAccount, filterCategory, searchQuery, sortOrder]);

  const handleExportCsv = () => {
    const csv = generateTransactionsCsv(transactions, accounts);
    downloadFile(csv, `financial-ledger-${todayKey}.csv`, 'text/csv');
    showToast('Exported transaction ledger to CSV', 'success');
  };

  const handleDeleteTransaction = async () => {
    if (!txToDelete) return;
    await db.transactions.delete(txToDelete.id);
    showToast('Transaction removed', 'info');
    setTxToDelete(null);
  };

  return (
    <div className="space-y-4 pb-24 animate-pop max-w-4xl mx-auto">
      {/* Top Header Card */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#B6E63E] font-bold">
              Autonomous Personal Finance OS
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))]">
              Financial Independence
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Complete account autonomy • Real-time double-entry balances • 100% offline
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenAddExpense}
              className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-heading font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>- Expense</span>
            </button>
            <button
              onClick={handleOpenAddIncome}
              className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-heading font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+ Income</span>
            </button>
            <button
              onClick={handleOpenTransfer}
              className="px-3 py-2 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] font-heading font-bold text-xs flex items-center gap-1.5 active:scale-95 transition"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Transfer</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-[rgb(var(--c-border))] overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'accounts', label: 'Accounts', icon: Wallet },
            { id: 'transactions', label: 'Ledger', icon: Coins },
            { id: 'budgets', label: 'Budgets', icon: Target },
            { id: 'savings', label: 'Savings', icon: PiggyBank },
            { id: 'debts', label: 'Debts & Loans', icon: UserCheck },
            { id: 'recurring', label: 'Recurring', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FinanceTab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition flex items-center gap-1.5 whitespace-nowrap active:scale-95 ${
                  isActive
                    ? 'bg-[#B6E63E] text-stone-950 shadow-xs'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 1. OVERVIEW TAB */}
      {/* =================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Net Worth & Cash Flow Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-3xl ticket-border bg-[rgb(var(--c-surface))] flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))] font-bold">
                  Total Net Worth
                </span>
                <div className="text-2xl font-heading font-bold text-[rgb(var(--c-text))] mt-1">
                  {formatMoney(totalNetWorth, 'ETB')}
                </div>
              </div>
              <div className="text-[11px] text-[rgb(var(--c-muted))] mt-3 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{accounts.filter((a) => !a.isArchived).length} Active Accounts</span>
              </div>
            </div>

            <div className="p-4 rounded-3xl ticket-border bg-[rgb(var(--c-surface))] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))] font-bold">
                  Cash Flow ({period})
                </span>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
                  className="text-[10px] px-2 py-0.5 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="day">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-500 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Income
                  </span>
                  <span className="font-heading font-bold text-[rgb(var(--c-text))]">
                    +{formatMoney(cashFlowStats.totalIncome, 'ETB')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-rose-500 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Expenses
                  </span>
                  <span className="font-heading font-bold text-[rgb(var(--c-text))]">
                    -{formatMoney(cashFlowStats.totalExpenses, 'ETB')}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[rgb(var(--c-border))] mt-2 flex items-center justify-between text-xs">
                <span className="text-[rgb(var(--c-muted))]">Net Surplus</span>
                <span
                  className={`font-heading font-bold ${
                    cashFlowStats.netCashFlow >= 0 ? 'text-[#B6E63E]' : 'text-rose-500'
                  }`}
                >
                  {cashFlowStats.netCashFlow >= 0 ? '+' : ''}
                  {formatMoney(cashFlowStats.netCashFlow, 'ETB')}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-3xl ticket-border bg-[rgb(var(--c-surface))] flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))] font-bold">
                  Debts & Money Owed
                </span>
                <div className="text-base font-heading font-bold text-[rgb(var(--c-text))] mt-1">
                  Owed to you: {formatMoney(debtSummary.totalReceivable, 'ETB')}
                </div>
                <div className="text-xs text-rose-500 font-heading font-bold mt-0.5">
                  You owe: {formatMoney(debtSummary.totalPayable, 'ETB')}
                </div>
              </div>
              <div className="text-[11px] text-[rgb(var(--c-muted))] mt-3">
                Net Debt Balance: <span className="font-bold text-[rgb(var(--c-text))]">{formatMoney(debtSummary.netBalance, 'ETB')}</span>
              </div>
            </div>
          </div>

          {/* Accounts Quick Row */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-[rgb(var(--c-text))]">
                My Accounts & Money Storage
              </h3>
              <button
                onClick={handleOpenAddAccount}
                className="text-xs font-heading font-bold text-[#B6E63E] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Account
              </button>
            </div>

            {accounts.length === 0 ? (
              <div className="p-6 rounded-3xl ticket-border bg-[rgb(var(--c-surface))] text-center space-y-3">
                <Wallet className="w-8 h-8 text-[rgb(var(--c-muted))] mx-auto" />
                <div>
                  <h4 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                    No Accounts Created Yet
                  </h4>
                  <p className="text-xs text-[rgb(var(--c-muted))] max-w-sm mx-auto mt-1">
                    Add your personal bank, mobile money wallet, or cash pocket to get started. You have 100% control over account names and institutions.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddAccount}
                  className="px-4 py-2 rounded-xl bg-[#B6E63E] text-stone-950 font-heading font-bold text-xs"
                >
                  Create First Account
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {accounts
                  .filter((a) => !a.isArchived)
                  .map((acc) => {
                    const balance = accountBalances[acc.id] || 0;
                    const accTypeKey = acc.accountType || acc.type || 'custom';
                    const typeMeta = ACCOUNT_TYPE_LABELS[accTypeKey] || ACCOUNT_TYPE_LABELS.custom;
                    const Icon = typeMeta.icon;

                    return (
                      <div
                        key={acc.id}
                        className="p-3.5 rounded-2xl ticket-border bg-[rgb(var(--c-surface))] flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] flex items-center justify-center text-[rgb(var(--c-primary))] shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-heading font-bold text-xs text-[rgb(var(--c-text))] truncate">
                                {acc.name}
                              </span>
                              {acc.isDefault && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-[#B6E63E]/20 text-[#B6E63E] font-bold">
                                  Default
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[rgb(var(--c-muted))] block">
                              {typeMeta.label}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-heading font-bold text-xs text-[rgb(var(--c-text))]">
                            {formatMoney(balance, acc.currency || 'ETB')}
                          </div>
                          <span className="text-[9px] text-[rgb(var(--c-muted))]">
                            Start: {formatMoney(acc.openingBalance, acc.currency || 'ETB')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Category Breakdown & Daily Trends */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Spending by Category */}
            <div className="p-5 rounded-3xl ticket-border bg-[rgb(var(--c-surface))] space-y-3">
              <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-[rgb(var(--c-text))]">
                Top Expense Categories ({period})
              </h4>
              {cashFlowStats.categoryBreakdown.length === 0 ? (
                <div className="py-8 text-center text-xs text-[rgb(var(--c-muted))]">
                  No expense records logged in this timeframe.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cashFlowStats.categoryBreakdown.slice(0, 5).map((item) => (
                    <div key={item.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-heading font-bold text-[rgb(var(--c-text))] truncate">
                          {item.category}
                        </span>
                        <span className="font-heading font-bold text-[rgb(var(--c-muted))]">
                          {formatMoney(item.amount, 'ETB')} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[rgb(var(--c-surface2))] overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Budgets Pulse */}
            <div className="p-5 rounded-3xl ticket-border bg-[rgb(var(--c-surface))] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-[rgb(var(--c-text))]">
                  Budget Health ({currentMonthKey})
                </h4>
                <button
                  onClick={() => setActiveTab('budgets')}
                  className="text-xs font-heading font-bold text-[#B6E63E] hover:underline"
                >
                  Manage
                </button>
              </div>

              {budgetStatuses.length === 0 ? (
                <div className="py-8 text-center text-xs text-[rgb(var(--c-muted))]">
                  No spending budgets configured. Set limits in the Budgets tab.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {budgetStatuses.slice(0, 4).map((b) => (
                    <div key={b.budget.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-heading font-bold text-[rgb(var(--c-text))]">
                          {b.budget.category === 'all' ? 'Overall Monthly Budget' : b.budget.category}
                        </span>
                        <span
                          className={`font-heading font-bold text-xs ${
                            b.warningLevel === 'danger'
                              ? 'text-rose-500'
                              : b.warningLevel === 'warning'
                              ? 'text-amber-500'
                              : 'text-emerald-500'
                          }`}
                        >
                          {b.percentageUsed}% used
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[rgb(var(--c-surface2))] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            b.warningLevel === 'danger'
                              ? 'bg-rose-500'
                              : b.warningLevel === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, b.percentageUsed)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[rgb(var(--c-muted))]">
                        <span>Spent: {formatMoney(b.spentAmount, 'ETB')}</span>
                        <span>Limit: {formatMoney(b.limitAmount, 'ETB')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. ACCOUNTS TAB */}
      {/* =================================================================== */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                Financial Accounts & Storage
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))]">
                Manage your banks, mobile money apps, wallets, and cash reserves.
              </p>
            </div>
            <button
              onClick={handleOpenAddAccount}
              className="px-3 py-1.5 rounded-xl bg-[#B6E63E] text-stone-950 font-heading font-bold text-xs flex items-center gap-1 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" /> Add Account
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.map((acc) => {
              const balance = accountBalances[acc.id] || 0;
              const accTypeKey = acc.accountType || acc.type || 'custom';
              const typeMeta = ACCOUNT_TYPE_LABELS[accTypeKey] || ACCOUNT_TYPE_LABELS.custom;
              const Icon = typeMeta.icon;

              return (
                <div
                  key={acc.id}
                  className="p-4 rounded-3xl ticket-border bg-[rgb(var(--c-surface))] space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] flex items-center justify-center text-[rgb(var(--c-primary))]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                            {acc.name}
                          </h4>
                          {acc.isDefault && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#B6E63E]/20 text-[#B6E63E] font-bold">
                              Default
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[rgb(var(--c-muted))]">
                          {typeMeta.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditAccount(acc)}
                        className="p-1.5 rounded-xl hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                        title="Edit Account"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setAccountToDelete(acc)}
                        className="p-1.5 rounded-xl hover:bg-rose-500/10 text-[rgb(var(--c-muted))] hover:text-rose-500"
                        title="Delete Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[rgb(var(--c-border))] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))]">
                        Current Balance
                      </div>
                      <div className="text-lg font-heading font-bold text-[rgb(var(--c-text))]">
                        {formatMoney(balance, acc.currency || 'ETB')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))]">
                        Opening Balance
                      </div>
                      <div className="text-xs font-heading text-[rgb(var(--c-muted))]">
                        {formatMoney(acc.openingBalance, acc.currency || 'ETB')}
                      </div>
                    </div>
                  </div>

                  {acc.notes && (
                    <div className="text-[11px] text-[rgb(var(--c-muted))] bg-[rgb(var(--c-bg))] p-2 rounded-xl">
                      {acc.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. TRANSACTIONS / LEDGER TAB */}
      {/* =================================================================== */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-3xl ticket-border bg-[rgb(var(--c-surface))] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[rgb(var(--c-muted))] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search notes, categories, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <button
                onClick={handleExportCsv}
                className="px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] text-xs font-heading font-bold flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              >
                <option value="all">All Types</option>
                <option value="expense">Expenses Only</option>
                <option value="income">Income Only</option>
                <option value="transfer">Transfers Only</option>
              </select>

              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              >
                <option value="all">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              >
                <option value="all">All Categories</option>
                {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, 'Transfer'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Amount</option>
                <option value="lowest">Lowest Amount</option>
              </select>
            </div>
          </div>

          {/* Ledger Table / List */}
          {filteredTransactions.length === 0 ? (
            <div className="p-8 rounded-3xl ticket-border bg-[rgb(var(--c-surface))] text-center text-xs text-[rgb(var(--c-muted))]">
              No transactions match your current filters.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((tx) => {
                const targetAcc = accounts.find((a) => a.id === tx.financialAccountId);
                const sourceAcc = accounts.find((a) => a.id === tx.sourceAccountId);
                const destAcc = accounts.find((a) => a.id === tx.targetAccountId);

                return (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-2xl ticket-border bg-[rgb(var(--c-surface))] flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          tx.type === 'income'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : tx.type === 'expense'
                            ? 'bg-rose-500/15 text-rose-500'
                            : 'bg-sky-500/15 text-sky-500'
                        }`}
                      >
                        {tx.type === 'income' ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : tx.type === 'expense' ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowLeftRight className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-heading font-bold text-xs text-[rgb(var(--c-text))] truncate">
                          {tx.type === 'transfer'
                            ? `Transfer: ${sourceAcc?.name || 'Account'} → ${destAcc?.name || 'Account'}`
                            : tx.category}
                        </div>
                        <div className="text-[10px] text-[rgb(var(--c-muted))] flex items-center gap-2 mt-0.5">
                          <span>{tx.date.substring(0, 10)}</span>
                          {targetAcc && <span>• {targetAcc.name}</span>}
                          {tx.notes && <span className="truncate max-w-xs">• {tx.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div
                          className={`font-heading font-bold text-xs ${
                            tx.type === 'income'
                              ? 'text-emerald-500'
                              : tx.type === 'expense'
                              ? 'text-rose-500'
                              : 'text-sky-500'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                          {formatMoney(tx.amount, targetAcc?.currency || 'ETB')}
                        </div>
                        <div className="text-[9px] uppercase font-heading text-[rgb(var(--c-muted))]">
                          {tx.type}
                        </div>
                      </div>

                      <button
                        onClick={() => setTxToDelete(tx)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[rgb(var(--c-muted))] hover:text-rose-500 transition opacity-0 group-hover:opacity-100"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. BUDGETS TAB */}
      {/* =================================================================== */}
      {activeTab === 'budgets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                Spending Limits & Budgets
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))]">
                Set monthly spending thresholds to prevent end-of-semester cash shortages.
              </p>
            </div>
            <button
              onClick={handleOpenAddBudget}
              className="px-3 py-1.5 rounded-xl bg-[#B6E63E] text-stone-950 font-heading font-bold text-xs flex items-center gap-1 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" /> Create Budget
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {budgetStatuses.map((b) => (
              <div
                key={b.budget.id}
                className="p-4 rounded-3xl ticket-border bg-[rgb(var(--c-surface))] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#B6E63E]" />
                    <span className="font-heading font-bold text-xs text-[rgb(var(--c-text))]">
                      {b.budget.category === 'all' ? 'Overall Monthly Limit' : b.budget.category}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      await db.budgets.delete(b.budget.id);
                      showToast('Budget deleted', 'info');
                    }}
                    className="p-1.5 text-[rgb(var(--c-muted))] hover:text-rose-500"
                    title="Delete budget"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[rgb(var(--c-muted))]">
                      Spent: {formatMoney(b.spentAmount, 'ETB')}
                    </span>
                    <span
                      className={`font-heading font-bold ${
                        b.warningLevel === 'danger'
                          ? 'text-rose-500'
                          : b.warningLevel === 'warning'
                          ? 'text-amber-500'
                          : 'text-emerald-500'
                      }`}
                    >
                      {b.percentageUsed}% used
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-[rgb(var(--c-surface2))] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        b.warningLevel === 'danger'
                          ? 'bg-rose-500'
                          : b.warningLevel === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, b.percentageUsed)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[rgb(var(--c-muted))]">
                    <span>Remaining: {formatMoney(b.remainingAmount, 'ETB')}</span>
                    <span>Cap: {formatMoney(b.limitAmount, 'ETB')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. SAVINGS GOALS TAB */}
      {/* =================================================================== */}
      {activeTab === 'savings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                Savings Goals & Projects
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))]">
                Lock away funds for laptop upgrades, exams, certifications, or travel.
              </p>
            </div>
            <button
              onClick={handleOpenAddGoal}
              className="px-3 py-1.5 rounded-xl bg-[#B6E63E] text-stone-950 font-heading font-bold text-xs flex items-center gap-1 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" /> New Goal
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savingsGoals.map((g) => {
              const current = Number(g.currentAmount) || 0;
              const target = Number(g.targetAmount) || 1;
              const ratio = Math.min(100, Math.round((current / target) * 100));

              return (
                <div
                  key={g.id}
                  className="p-4 rounded-3xl ticket-border bg-[rgb(var(--c-surface))] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="w-4 h-4 text-[#B6E63E]" />
                      <h4 className="font-heading font-bold text-xs text-[rgb(var(--c-text))]">
                        {g.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={async () => {
                          await db.savingsGoals.delete(g.id);
                          showToast('Savings goal deleted', 'info');
                        }}
                        className="p-1.5 text-[rgb(var(--c-muted))] hover:text-rose-500"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-heading font-bold text-[rgb(var(--c-text))]">
                        {formatMoney(current, 'ETB')}
                      </span>
                      <span className="text-[rgb(var(--c-muted))]">
                        Target: {formatMoney(target, 'ETB')} ({ratio}%)
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-[rgb(var(--c-surface2))] overflow-hidden">
                      <div
                        className="h-full bg-[#B6E63E] rounded-full transition-all duration-300"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>

                    {g.deadline && (
                      <div className="text-[10px] text-[rgb(var(--c-muted))] flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Target Date: {g.deadline}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
                    <button
                      onClick={() => {
                        setSelectedGoalForAction(g);
                        setContributeType('deposit');
                        setContributeAmount('');
                        setContributeAccountId(defaultAccount?.id || '');
                        setIsContributeModalOpen(true);
                      }}
                      className="flex-1 py-1.5 rounded-xl bg-[#B6E63E]/20 text-[#B6E63E] font-heading font-bold text-xs hover:bg-[#B6E63E]/30 transition"
                    >
                      + Deposit Funds
                    </button>
                    <button
                      onClick={() => {
                        setSelectedGoalForAction(g);
                        setContributeType('withdraw');
                        setContributeAmount('');
                        setContributeAccountId(defaultAccount?.id || '');
                        setIsContributeModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] font-heading text-xs"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 6. DEBTS & LOANS TAB */}
      {/* =================================================================== */}
      {activeTab === 'debts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                Debts & Money Owed
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))]">
                Track campus peer-to-peer loans, group meal splits, and family borrowings.
              </p>
            </div>
            <button
              onClick={handleOpenAddDebt}
              className="px-3 py-1.5 rounded-xl bg-[#B6E63E] text-stone-950 font-heading font-bold text-xs flex items-center gap-1 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" /> Add Record
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {debts.map((d) => {
              const debtTotal = Number(d.amount ?? d.originalAmount) || 0;
              const remaining = Math.max(0, debtTotal - (d.paidAmount || 0));
              const isPayable = d.type === 'payable' || d.type === 'owe';

              return (
                <div
                  key={d.id}
                  className="p-4 rounded-3xl ticket-border bg-[rgb(var(--c-surface))] space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className={`text-[9px] uppercase font-heading font-bold px-2 py-0.5 rounded-md ${
                          isPayable ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'
                        }`}
                      >
                        {isPayable ? 'I Owe Them (Payable)' : 'They Owe Me (Receivable)'}
                      </span>
                      <h4 className="font-heading font-bold text-sm text-[rgb(var(--c-text))] mt-1">
                        {d.personName || d.person || 'Contact'}
                      </h4>
                    </div>

                    <button
                      onClick={async () => {
                        await db.debts.delete(d.id);
                        showToast('Debt record removed', 'info');
                      }}
                      className="p-1.5 text-[rgb(var(--c-muted))] hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[rgb(var(--c-border))]">
                    <div>
                      <div className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))]">
                        Remaining Balance
                      </div>
                      <div className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                        {formatMoney(remaining, 'ETB')}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))]">
                        Total Amount
                      </div>
                      <div className="text-xs text-[rgb(var(--c-muted))]">
                        {formatMoney(debtTotal, 'ETB')}
                      </div>
                    </div>
                  </div>

                  {d.dueDate && (
                    <div className="text-[10px] text-[rgb(var(--c-muted))] flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Due Date: {d.dueDate}
                    </div>
                  )}

                  {d.status !== 'settled' ? (
                    <button
                      onClick={() => {
                        setSelectedDebtForPay(d);
                        setPayDebtAmount(remaining.toString());
                        setPayDebtAccountId(defaultAccount?.id || '');
                        setIsPayDebtModalOpen(true);
                      }}
                      className="w-full py-1.5 rounded-xl bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading font-bold text-xs hover:bg-[rgb(var(--c-border))] transition"
                    >
                      Record Payment / Settlement
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-1 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 font-heading font-bold text-xs">
                      <Check className="w-3.5 h-3.5" /> Fully Settled
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 7. RECURRING TRANSACTIONS TAB */}
      {/* =================================================================== */}
      {activeTab === 'recurring' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                Recurring Subscriptions & Schedules
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))]">
                Automate dorm rent, monthly allowances, SIM packages, and club dues.
              </p>
            </div>
            <button
              onClick={handleOpenAddRecurring}
              className="px-3 py-1.5 rounded-xl bg-[#B6E63E] text-stone-950 font-heading font-bold text-xs flex items-center gap-1 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" /> Add Schedule
            </button>
          </div>

          <div className="space-y-2">
            {recurringList.map((rec) => {
              const targetAcc = accounts.find((a) => a.id === rec.financialAccountId);
              const isDueNow = rec.nextDueDate <= todayKey;

              return (
                <div
                  key={rec.id}
                  className="p-4 rounded-3xl ticket-border bg-[rgb(var(--c-surface))] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] uppercase font-heading font-bold px-2 py-0.5 rounded-md ${
                          rec.type === 'income' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                        }`}
                      >
                        {rec.type} • {rec.frequency}
                      </span>
                      {isDueNow && (
                        <span className="text-[9px] uppercase font-heading font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-500 animate-pulse">
                          Due Now
                        </span>
                      )}
                    </div>

                    <h4 className="font-heading font-bold text-sm text-[rgb(var(--c-text))] mt-1">
                      {rec.category} {rec.notes ? `(${rec.notes})` : ''}
                    </h4>

                    <div className="text-[10px] text-[rgb(var(--c-muted))] flex items-center gap-2 mt-0.5">
                      <span>Next Due: {rec.nextDueDate}</span>
                      {targetAcc && <span>• Account: {targetAcc.name}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                        {formatMoney(rec.amount, targetAcc?.currency || 'ETB')}
                      </div>
                    </div>

                    <button
                      onClick={() => handleProcessRecurringItem(rec)}
                      className="px-3 py-1.5 rounded-xl bg-[#B6E63E] text-stone-950 font-heading font-bold text-xs active:scale-95 transition"
                    >
                      Mark as Paid / Received
                    </button>

                    <button
                      onClick={async () => {
                        await db.recurringTransactions.delete(rec.id);
                        showToast('Schedule removed', 'info');
                      }}
                      className="p-1.5 text-[rgb(var(--c-muted))] hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD / EDIT ACCOUNT */}
      {/* =================================================================== */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveAccount}
            className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                {editingAccount ? 'Edit Account' : 'Add Financial Account'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="p-1.5 rounded-xl text-[rgb(var(--c-muted))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Account Name / Institution
              </label>
              <input
                type="text"
                placeholder="e.g. My Commercial Bank, Telebirr, Cash Wallet"
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                  Account Type
                </label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as FinancialAccountType)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, meta]) => (
                    <option key={k} value={k}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  placeholder="ETB, USD, EUR..."
                  value={accCurrency}
                  onChange={(e) => setAccCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Opening Balance
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={accOpeningBalance}
                onChange={(e) => setAccOpeningBalance(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="Account number, branch, or usage purpose"
                value={accNotes}
                onChange={(e) => setAccNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-[rgb(var(--c-text))] font-heading cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={accIsDefault}
                onChange={(e) => setAccIsDefault(e.target.checked)}
                className="rounded text-[#B6E63E] focus:ring-[#B6E63E]"
              />
              <span>Set as my default payment account</span>
            </label>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#B6E63E] text-stone-950 font-heading font-bold text-xs shadow-md active:scale-95 transition"
            >
              {editingAccount ? 'Update Account' : 'Save Account'}
            </button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD EXPENSE */}
      {/* =================================================================== */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveExpense}
            className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2 text-rose-500">
                <ArrowDownLeft className="w-5 h-5" />
                <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                  Log Expense
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1.5 rounded-xl text-[rgb(var(--c-muted))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-2 text-lg font-bold rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            {/* Quick Tap Category Chips */}
            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-2">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setExpenseCategory(cat)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border transition ${
                      expenseCategory === cat
                        ? 'bg-rose-500 text-white border-rose-500 font-bold'
                        : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:border-[rgb(var(--c-text))]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                  Payment Account
                </label>
                <select
                  value={expenseAccountId}
                  onChange={(e) => setExpenseAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="">Cash / Unlinked</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatMoney(accountBalances[a.id] || 0, a.currency || 'ETB')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Description / Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Lunch at dormitory cafeteria"
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-rose-500 text-white font-heading font-bold text-xs shadow-md active:scale-95 transition"
            >
              Record Expense
            </button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD INCOME */}
      {/* =================================================================== */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveIncome}
            className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2 text-emerald-500">
                <ArrowUpRight className="w-5 h-5" />
                <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                  Log Income
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsIncomeModalOpen(false)}
                className="p-1.5 rounded-xl text-[rgb(var(--c-muted))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={incomeAmount}
                onChange={(e) => setIncomeAmount(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-2 text-lg font-bold rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-2">
                Income Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {INCOME_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setIncomeCategory(cat)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg border transition ${
                      incomeCategory === cat
                        ? 'bg-emerald-500 text-white border-emerald-500 font-bold'
                        : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:border-[rgb(var(--c-text))]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                  Receiving Account
                </label>
                <select
                  value={incomeAccountId}
                  onChange={(e) => setIncomeAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="">Cash / Unlinked</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Monthly transfer from parents"
                value={incomeNotes}
                onChange={(e) => setIncomeNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-heading font-bold text-xs shadow-md active:scale-95 transition"
            >
              Record Income
            </button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: TRANSFER BETWEEN ACCOUNTS */}
      {/* =================================================================== */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveTransfer}
            className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2 text-sky-500">
                <ArrowLeftRight className="w-5 h-5" />
                <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                  Transfer Funds
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1.5 rounded-xl text-[rgb(var(--c-muted))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Transfer Amount
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-2 text-lg font-bold rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                  From (Source)
                </label>
                <select
                  value={transferSourceId}
                  onChange={(e) => setTransferSourceId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatMoney(accountBalances[a.id] || 0, a.currency || 'ETB')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                  To (Destination)
                </label>
                <select
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatMoney(accountBalances[a.id] || 0, a.currency || 'ETB')})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Date
              </label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. ATM cash withdrawal for campus snacks"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-sky-500 text-white font-heading font-bold text-xs shadow-md active:scale-95 transition"
            >
              Complete Transfer
            </button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD BUDGET */}
      {/* =================================================================== */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveBudget}
            className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                {editingBudget ? 'Edit Spending Limit' : 'New Spending Budget'}
              </h3>
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(false)}
                className="p-1.5 rounded-xl text-[rgb(var(--c-muted))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Budget Scope
              </label>
              <select
                value={budgetCategory}
                onChange={(e) => setBudgetCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              >
                <option value="all">Overall Total Monthly Spending</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Limit Amount
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 3000"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#B6E63E] text-stone-950 font-heading font-bold text-xs shadow-md active:scale-95 transition"
            >
              Save Budget Limit
            </button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD SAVINGS GOAL */}
      {/* =================================================================== */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveGoal}
            className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                New Savings Goal
              </h3>
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1.5 rounded-xl text-[rgb(var(--c-muted))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Goal Title
              </label>
              <input
                type="text"
                placeholder="e.g. New Laptop, IELTS Exam Fee, Vacation"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Target Amount
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 15000"
                value={goalTargetAmount}
                onChange={(e) => setGoalTargetAmount(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Target Date (Optional)
              </label>
              <input
                type="date"
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#B6E63E] text-stone-950 font-heading font-bold text-xs shadow-md active:scale-95 transition"
            >
              Create Goal
            </button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CONTRIBUTE / WITHDRAW SAVINGS GOAL */}
      {/* =================================================================== */}
      {isContributeModalOpen && selectedGoalForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleContributeToGoal}
            className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                {contributeType === 'deposit' ? 'Contribute to Goal' : 'Withdraw from Goal'}
              </h3>
              <button
                type="button"
                onClick={() => setIsContributeModalOpen(false)}
                className="p-1.5 rounded-xl text-[rgb(var(--c-muted))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs">
              <div className="font-heading font-bold text-[rgb(var(--c-text))]">
                {selectedGoalForAction.title}
              </div>
              <div className="text-[rgb(var(--c-muted))] mt-0.5">
                Current Saved: {formatMoney(selectedGoalForAction.currentAmount, 'ETB')} of {formatMoney(selectedGoalForAction.targetAmount, 'ETB')}
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                required
                autoFocus
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                {contributeType === 'deposit' ? 'Source Account' : 'Destination Account'}
              </label>
              <select
                value={contributeAccountId}
                onChange={(e) => setContributeAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              >
                <option value="">Do not link to account balance</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatMoney(accountBalances[a.id] || 0, a.currency || 'ETB')})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#B6E63E] text-stone-950 font-heading font-bold text-xs shadow-md active:scale-95 transition"
            >
              Confirm {contributeType === 'deposit' ? 'Deposit' : 'Withdrawal'}
            </button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD / EDIT DEBT */}
      {/* =================================================================== */}
      {isDebtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveDebt}
            className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                {editingDebt ? 'Edit Debt Record' : 'Add Debt / Loan Record'}
              </h3>
              <button
                type="button"
                onClick={() => setIsDebtModalOpen(false)}
                className="p-1.5 rounded-xl text-[rgb(var(--c-muted))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDebtType('payable')}
                className={`py-2 rounded-xl text-xs font-heading font-bold border ${
                  debtType === 'payable'
                    ? 'border-rose-500 bg-rose-500/20 text-rose-500'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))]'
                }`}
              >
                I Owe Them (Payable)
              </button>
              <button
                type="button"
                onClick={() => setDebtType('receivable')}
                className={`py-2 rounded-xl text-xs font-heading font-bold border ${
                  debtType === 'receivable'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))]'
                }`}
              >
                They Owe Me (Receivable)
              </button>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Person Name
              </label>
              <input
                type="text"
                placeholder="e.g. Roommate, Lab Partner, Aunt"
                value={debtPerson}
                onChange={(e) => setDebtPerson(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={debtAmount}
                onChange={(e) => setDebtAmount(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Expected Due Date (Optional)
              </label>
              <input
                type="date"
                value={debtDueDate}
                onChange={(e) => setDebtDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Shared grocery trip"
                value={debtNotes}
                onChange={(e) => setDebtNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#B6E63E] text-stone-950 font-heading font-bold text-xs shadow-md active:scale-95 transition"
            >
              Save Debt Record
            </button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: PAY / SETTLE DEBT */}
      {/* =================================================================== */}
      {isPayDebtModalOpen && selectedDebtForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleRecordDebtPayment}
            className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                Record Payment / Settlement
              </h3>
              <button
                type="button"
                onClick={() => setIsPayDebtModalOpen(false)}
                className="p-1.5 rounded-xl text-[rgb(var(--c-muted))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs">
              <div className="font-heading font-bold text-[rgb(var(--c-text))]">
                {selectedDebtForPay.personName || selectedDebtForPay.person || 'Contact'}
              </div>
              <div className="text-[rgb(var(--c-muted))] mt-0.5">
                Total: {formatMoney(Number(selectedDebtForPay.amount ?? selectedDebtForPay.originalAmount) || 0, 'ETB')} • Already Paid: {formatMoney(selectedDebtForPay.paidAmount || 0, 'ETB')}
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Payment Amount
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={payDebtAmount}
                onChange={(e) => setPayDebtAmount(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Account (Optional)
              </label>
              <select
                value={payDebtAccountId}
                onChange={(e) => setPayDebtAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              >
                <option value="">Do not log account transaction</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatMoney(accountBalances[a.id] || 0, a.currency || 'ETB')})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#B6E63E] text-stone-950 font-heading font-bold text-xs shadow-md active:scale-95 transition"
            >
              Record Payment
            </button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD RECURRING */}
      {/* =================================================================== */}
      {isRecurringModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleSaveRecurring}
            className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                New Recurring Schedule
              </h3>
              <button
                type="button"
                onClick={() => setIsRecurringModalOpen(false)}
                className="p-1.5 rounded-xl text-[rgb(var(--c-muted))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRecType('expense')}
                className={`py-2 rounded-xl text-xs font-heading font-bold border ${
                  recType === 'expense'
                    ? 'border-rose-500 bg-rose-500/20 text-rose-500'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))]'
                }`}
              >
                Recurring Expense
              </button>
              <button
                type="button"
                onClick={() => setRecType('income')}
                className={`py-2 rounded-xl text-xs font-heading font-bold border ${
                  recType === 'income'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))]'
                }`}
              >
                Recurring Income
              </button>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Amount
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={recAmount}
                onChange={(e) => setRecAmount(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                  Frequency
                </label>
                <select
                  value={recFrequency}
                  onChange={(e) => setRecFrequency(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                  First / Next Due Date
                </label>
                <input
                  type="date"
                  value={recNextDueDate}
                  onChange={(e) => setRecNextDueDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Category
              </label>
              <select
                value={recCategory}
                onChange={(e) => setRecCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              >
                {(recType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Target Account
              </label>
              <select
                value={recAccountId}
                onChange={(e) => setRecAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              >
                <option value="">Default / Unlinked</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-1">
                Description
              </label>
              <input
                type="text"
                placeholder="e.g. Dorm room rent, Mobile internet pack"
                value={recNotes}
                onChange={(e) => setRecNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#B6E63E] text-stone-950 font-heading font-bold text-xs shadow-md active:scale-95 transition"
            >
              Save Schedule
            </button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* DELETE TRANSACTION CONFIRMATION */}
      {/* =================================================================== */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                Delete Transaction?
              </h3>
            </div>
            <p className="text-xs text-[rgb(var(--c-muted))]">
              Are you sure you want to delete this {txToDelete.type} of {formatMoney(txToDelete.amount, 'ETB')}? This will update account balances.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTxToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] font-heading text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTransaction}
                className="flex-1 py-2 rounded-xl bg-rose-500 text-white font-heading font-bold text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* DELETE ACCOUNT CONFIRMATION */}
      {/* =================================================================== */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                Delete Account?
              </h3>
            </div>
            <p className="text-xs text-[rgb(var(--c-muted))]">
              Are you sure you want to delete "{accountToDelete.name}"? Only accounts with no linked transactions can be deleted.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAccountToDelete(null)}
                className="flex-1 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] font-heading text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-2 rounded-xl bg-rose-500 text-white font-heading font-bold text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
