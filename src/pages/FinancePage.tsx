import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { Transaction, Budget, SavingsGoal, DEFAULT_ACCOUNT_BALANCES } from '../types';
import { getTodayKey, formatDisplayDate } from '../utils/dateUtils';
import { awardXp, triggerLevelUpConfetti } from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import {
  CreditCard,
  Plus,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  PieChart,
  BarChart3,
  Calendar,
  Sparkles,
  Trash2,
  X,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Target,
  Wallet,
  ShieldCheck,
  ChevronRight,
  Coins,
  DollarSign,
  Info,
  CalendarDays,
  Smartphone,
  Building2,
  Banknote,
  Percent,
  Sliders,
  AlertTriangle,
  Edit2,
  RefreshCw,
  WalletCards,
  Receipt,
} from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Cafeteria': '#F6A8BE',
  'Coffee & Snacks': '#E8C9A0',
  'Stationery & Prints': '#8EC5E8',
  'Campus Transport': '#B6E63E',
  'Internet & Mobile': '#BBA6E0',
  'Personal Care': '#F5B58A',
  'Books & Materials': '#4FA3A5',
  'Other': '#A6D938',
};

const EXPENSE_CATEGORIES = [
  'Food & Cafeteria',
  'Coffee & Snacks',
  'Stationery & Prints',
  'Campus Transport',
  'Internet & Mobile',
  'Personal Care',
  'Books & Materials',
  'Other',
];

const INCOME_CATEGORIES = [
  'Monthly Allowance',
  'Family Support',
  'Freelance & Tutoring',
  'Campus Stipend',
  'Reimbursement',
  'Cash Gift',
  'Other Income',
];

export const FinancePage: React.FC = () => {
  const { showToast } = useUiStore();
  const todayKey = getTodayKey();

  // Settings
  const settings = useLiveQuery(() => db.settings.get('current_user'));

  // Tab switching inside Finance page: 'overview' | 'charts' | 'savings' | 'ledger'
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'savings' | 'ledger'>('overview');

  // Chart range: 7, 14, or 30 days
  const [chartDays, setChartDays] = useState<7 | 14 | 30>(7);

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [isNewGoalModalOpen, setIsNewGoalModalOpen] = useState(false);
  const [isAdjustBalancesModalOpen, setIsAdjustBalancesModalOpen] = useState(false);
  const [selectedGoalForDeposit, setSelectedGoalForDeposit] = useState<string>('');

  // Transaction edit & delete state
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  // Transaction filter
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'expense' | 'saving' | 'income'>('all');

  // Expense form
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Food & Cafeteria');
  const [expenseAccount, setExpenseAccount] = useState<'cash' | 'bank' | 'mobile_money'>('cash');
  const [expenseNotes, setExpenseNotes] = useState('');

  // Income form
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('Monthly Allowance');
  const [incomeAccount, setIncomeAccount] = useState<'cash' | 'bank' | 'mobile_money'>('mobile_money');
  const [incomeNotes, setIncomeNotes] = useState('');

  // Savings form ("Tell it how much I am saving")
  const [savingsAmount, setSavingsAmount] = useState('');
  const [targetGoalId, setTargetGoalId] = useState('');
  const [savingsAccount, setSavingsAccount] = useState<'cash' | 'bank' | 'mobile_money'>('mobile_money');
  const [savingsNotes, setSavingsNotes] = useState('');

  // Adjust starting balances form
  const [editCashStarting, setEditCashStarting] = useState('');
  const [editTelebirrStarting, setEditTelebirrStarting] = useState('');
  const [editCbeStarting, setEditCbeStarting] = useState('');
  const [editLowThreshold, setEditLowThreshold] = useState('');

  // Quick preset amounts for savings
  const quickSavePresets = [50, 100, 200, 500, 1000];

  // New Goal form
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalDeadline, setGoalDeadline] = useState(
    new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)
  );
  const [goalCategory, setGoalCategory] = useState('tech');

  // Dexie live queries
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const budgets = useLiveQuery(() => db.budgets.toArray()) || [];
  const savingsGoals = useLiveQuery(() => db.savingsGoals.toArray()) || [];

  // Account starting balances
  const initialCash =
    settings?.accountBalances?.initialCash ?? DEFAULT_ACCOUNT_BALANCES.initialCash;
  const initialBank =
    settings?.accountBalances?.initialBank ?? DEFAULT_ACCOUNT_BALANCES.initialBank;
  const initialMobileMoney =
    settings?.accountBalances?.initialMobileMoney ?? DEFAULT_ACCOUNT_BALANCES.initialMobileMoney;
  const lowBalanceThreshold =
    settings?.accountBalances?.lowBalanceThreshold ?? DEFAULT_ACCOUNT_BALANCES.lowBalanceThreshold;

  // Running Balances per Account (Live running totals)
  const cashIncomes = transactions
    .filter((t) => t.account === 'cash' && t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const cashExpenses = transactions
    .filter((t) => t.account === 'cash' && t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const cashSavings = transactions
    .filter((t) => t.account === 'cash' && t.type === 'saving')
    .reduce((s, t) => s + t.amount, 0);
  const cashBalance = initialCash + cashIncomes - cashExpenses - cashSavings;

  const mobileIncomes = transactions
    .filter((t) => t.account === 'mobile_money' && t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const mobileExpenses = transactions
    .filter((t) => t.account === 'mobile_money' && t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const mobileSavings = transactions
    .filter((t) => t.account === 'mobile_money' && t.type === 'saving')
    .reduce((s, t) => s + t.amount, 0);
  const mobileBalance = initialMobileMoney + mobileIncomes - mobileExpenses - mobileSavings;

  const bankIncomes = transactions
    .filter((t) => t.account === 'bank' && t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const bankExpenses = transactions
    .filter((t) => t.account === 'bank' && t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);
  const bankSavings = transactions
    .filter((t) => t.account === 'bank' && t.type === 'saving')
    .reduce((s, t) => s + t.amount, 0);
  const bankBalance = initialBank + bankIncomes - bankExpenses - bankSavings;

  const totalLiquidBalance = cashBalance + mobileBalance + bankBalance;

  // Low balance alerts
  const lowAccounts: { name: string; balance: number }[] = [];
  if (cashBalance < lowBalanceThreshold) lowAccounts.push({ name: 'Cash in Pocket', balance: cashBalance });
  if (mobileBalance < lowBalanceThreshold) lowAccounts.push({ name: 'Telebirr Mobile Wallet', balance: mobileBalance });
  if (bankBalance < lowBalanceThreshold) lowAccounts.push({ name: 'CBE Bank Account', balance: bankBalance });

  // Metrics computation
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalSaved = savingsGoals.reduce((acc, curr) => acc + (curr.currentAmount || 0), 0);
  const grandNetWorth = totalLiquidBalance + totalSaved;

  // Savings rate calculation
  const totalCashflow = totalExpense + totalSaved;
  const savingsRate = totalCashflow > 0 ? Math.round((totalSaved / totalCashflow) * 100) : 0;

  // Chart Data: dynamic based on chartDays (7, 14, or 30 days)
  const chartDaysData = Array.from({ length: chartDays }, (_, i) => {
    const d = new Date(Date.now() - (chartDays - 1 - i) * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const dayName =
      chartDays <= 7
        ? d.toLocaleDateString('en-US', { weekday: 'short' })
        : d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

    const dayExpenses = transactions
      .filter((t) => t.type === 'expense' && t.date === dateStr)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const daySaves = transactions
      .filter((t) => t.type === 'saving' && t.date === dateStr)
      .reduce((acc, curr) => acc + curr.amount, 0);

    return { dateStr, dayName, expense: dayExpenses, saving: daySaves };
  });

  const maxDailyExpense = Math.max(...chartDaysData.map((d) => d.expense), 250);
  const totalPeriodSpend = chartDaysData.reduce((acc, curr) => acc + curr.expense, 0);
  const avgDailySpend = Math.round(totalPeriodSpend / chartDays);
  const highestSpendDay = chartDaysData.reduce(
    (max, curr) => (curr.expense > max.expense ? curr : max),
    { expense: 0, dateStr: '', dayName: '' }
  );

  // Category breakdown calculation
  const categoryTotals: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

  const categoryList = Object.entries(categoryTotals)
    .map(([cat, total]) => ({
      category: cat,
      total,
      percent: totalExpense > 0 ? Math.round((total / totalExpense) * 100) : 0,
      color: CATEGORY_COLORS[cat] || '#B6E63E',
      count: transactions.filter((t) => t.type === 'expense' && t.category === cat).length,
    }))
    .sort((a, b) => b.total - a.total);

  // Filtered transactions for the ledger
  const filteredTransactions = transactions
    .filter((t) => (ledgerFilter === 'all' ? true : t.type === ledgerFilter))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Handlers
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(expenseAmount);
    if (isNaN(num) || num <= 0) return;

    // Safeguard check
    const currentAccBalance =
      expenseAccount === 'cash' ? cashBalance : expenseAccount === 'mobile_money' ? mobileBalance : bankBalance;
    if (num > currentAccBalance) {
      showToast(
        `Notice: Expense (${num} ETB) exceeds ${expenseAccount} balance (${currentAccBalance.toLocaleString()} ETB).`,
        'warning'
      );
    }

    await db.transactions.add({
      id: generateId(),
      type: 'expense',
      amount: num,
      currency: 'ETB',
      category: expenseCategory,
      account: expenseAccount,
      date: todayKey,
      notes: expenseNotes.trim() || undefined,
    });

    await awardXp({
      source: 'expense',
      sourceId: generateId(),
      amount: 5,
      stat: 'discipline',
    });

    showToast(`Expense recorded: ${num} ETB in ${expenseCategory} (+5 XP)`, 'success');
    setExpenseAmount('');
    setExpenseNotes('');
    setIsExpenseModalOpen(false);
  };

  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(incomeAmount);
    if (isNaN(num) || num <= 0) return;

    await db.transactions.add({
      id: generateId(),
      type: 'income',
      amount: num,
      currency: 'ETB',
      category: incomeCategory,
      account: incomeAccount,
      date: todayKey,
      notes: incomeNotes.trim() || undefined,
    });

    await awardXp({
      source: 'income',
      sourceId: generateId(),
      amount: 10,
      stat: 'discipline',
    });

    showToast(`Income deposit recorded: +${num.toLocaleString()} ETB (+10 XP)!`, 'success');
    setIncomeAmount('');
    setIncomeNotes('');
    setIsIncomeModalOpen(false);
  };

  const handleDepositSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(savingsAmount);
    if (isNaN(num) || num <= 0) return;

    const goal = savingsGoals.find((g) => g.id === targetGoalId) || savingsGoals[0];
    const newTotal = (goal ? goal.currentAmount : 0) + num;

    if (goal) {
      await db.savingsGoals.update(goal.id, {
        currentAmount: newTotal,
      });
    }

    await db.transactions.add({
      id: generateId(),
      type: 'saving',
      amount: num,
      currency: 'ETB',
      category: 'Savings Deposit',
      account: savingsAccount,
      date: todayKey,
      notes: savingsNotes.trim() || (goal ? `Stashed for ${goal.title}` : 'General savings buffer'),
      savingsGoalId: goal?.id,
    });

    await awardXp({
      source: 'saving_deposit',
      sourceId: generateId(),
      amount: 15,
      stat: 'discipline',
    });

    if (goal && newTotal >= goal.targetAmount) {
      triggerLevelUpConfetti();
      showToast(`🏆 SAVINGS GOAL ACHIEVED! You hit your target for ${goal.title}!`, 'success');
    } else {
      showToast(`Saved ${num} ETB into ${goal ? goal.title : 'Vault'} (+15 XP)!`, 'success');
    }

    setSavingsAmount('');
    setSavingsNotes('');
    setIsSavingsModalOpen(false);
  };

  const handleQuickSaveClick = (amount: number, goalId?: string) => {
    setSavingsAmount(amount.toString());
    if (goalId) setTargetGoalId(goalId);
    else if (savingsGoals.length > 0) setTargetGoalId(savingsGoals[0].id);
    setIsSavingsModalOpen(true);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseFloat(goalTargetAmount);
    if (!goalTitle.trim() || isNaN(targetNum) || targetNum <= 0) return;

    await db.savingsGoals.add({
      id: generateId(),
      title: goalTitle.trim(),
      targetAmount: targetNum,
      currentAmount: 0,
      deadline: goalDeadline,
      category: goalCategory,
      color: '#4FA3A5',
      createdAt: new Date().toISOString(),
    });

    showToast(`Savings target “${goalTitle}” established in vault!`, 'success');
    setGoalTitle('');
    setGoalTargetAmount('');
    setIsNewGoalModalOpen(false);
  };

  const handleOpenAdjustBalances = () => {
    setEditCashStarting(initialCash.toString());
    setEditTelebirrStarting(initialMobileMoney.toString());
    setEditCbeStarting(initialBank.toString());
    setEditLowThreshold(lowBalanceThreshold.toString());
    setIsAdjustBalancesModalOpen(true);
  };

  const handleSaveAdjustBalances = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = parseFloat(editCashStarting) || 0;
    const t = parseFloat(editTelebirrStarting) || 0;
    const b = parseFloat(editCbeStarting) || 0;
    const th = parseFloat(editLowThreshold) || 150;

    await db.settings.update('current_user', {
      accountBalances: {
        initialCash: c,
        initialMobileMoney: t,
        initialBank: b,
        lowBalanceThreshold: th,
      },
    });

    showToast('Starting balances & threshold updated!', 'success');
    setIsAdjustBalancesModalOpen(false);
  };

  const handleConfirmDeleteTransaction = async () => {
    if (!txToDelete) return;
    if (txToDelete.type === 'saving' && txToDelete.savingsGoalId) {
      const goal = await db.savingsGoals.get(txToDelete.savingsGoalId);
      if (goal) {
        await db.savingsGoals.update(goal.id, {
          currentAmount: Math.max(0, goal.currentAmount - txToDelete.amount),
        });
      }
    }
    await db.transactions.delete(txToDelete.id);
    showToast('Transaction removed. Running balances recalculated.', 'info');
    setTxToDelete(null);
  };

  const handleOpenEditTransaction = (tx: Transaction) => {
    setTxToEdit(tx);
  };

  const handleSaveEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txToEdit) return;

    await db.transactions.update(txToEdit.id, {
      amount: Number(txToEdit.amount),
      account: txToEdit.account,
      category: txToEdit.category,
      type: txToEdit.type,
      notes: txToEdit.notes,
      date: txToEdit.date,
    });

    showToast('Transaction updated. Live balances recalculated.', 'success');
    setTxToEdit(null);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-28 animate-pop">
      {/* 1. Grand Budapest Treasury Hero Banner */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[10px] uppercase font-heading tracking-widest text-[#E5C04B] font-bold">
              <PiggyBank className="w-3.5 h-3.5 text-[#E5C04B]" />
              <span>Campus Treasury &amp; Wealth Chamber</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[rgb(var(--c-text))] tracking-tight">
              Finance &amp; Balance Operating System
            </h2>
            <p className="text-xs sm:text-sm text-[rgb(var(--c-muted))] font-flourish leading-relaxed max-w-xl">
              Real-time multi-account tracking (Cash, Telebirr, CBE) with editable starting baselines, live running balances, and spending intelligence.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsIncomeModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-lime-600 hover:bg-lime-700 text-white font-heading text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Log Income</span>
            </button>

            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#E5C04B] text-stone-950 font-heading text-xs sm:text-sm font-bold shadow-xs hover:opacity-90 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Log Expense</span>
            </button>

            <button
              onClick={() => {
                if (savingsGoals.length > 0) setTargetGoalId(savingsGoals[0].id);
                setIsSavingsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading text-xs sm:text-sm font-bold shadow-xs active:scale-95 transition"
            >
              <PiggyBank className="w-4 h-4" />
              <span>Tell Save</span>
            </button>

            <button
              onClick={handleOpenAdjustBalances}
              className="p-2.5 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface))] transition"
              title="Adjust account starting balances & threshold"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Low Balance Alert Banner */}
        {lowAccounts.length > 0 && (
          <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-start sm:items-center justify-between gap-3 text-xs animate-pop">
            <div className="flex items-center gap-3 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
              <div>
                <span className="font-heading font-bold uppercase tracking-wider text-[11px]">
                  Low Balance Alert (Threshold: {lowBalanceThreshold.toLocaleString()} ETB):
                </span>{' '}
                <span className="font-flourish">
                  {lowAccounts.map((a) => `${a.name} is down to ${a.balance.toLocaleString()} ETB`).join(' • ')}. Refill via allowance or ATM withdrawal.
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsIncomeModalOpen(true)}
              className="px-3 py-1 rounded-xl bg-amber-600 text-white font-heading text-[11px] font-bold hover:bg-amber-700 shrink-0"
            >
              Deposit Funds
            </button>
          </div>
        )}

        {/* 2. Multi-Account Balances Banner with Live Running Totals */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase tracking-wider">
              <WalletCards className="w-4 h-4 text-[#E5C04B]" />
              <span>Live Account Ledger &amp; Running Balances</span>
            </div>
            <button
              onClick={handleOpenAdjustBalances}
              className="text-[11px] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] font-heading font-bold flex items-center gap-1"
            >
              <Sliders className="w-3 h-3" /> Adjust Baseline Balances
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Account 1: Cash in Pocket */}
            <div
              className={`p-5 rounded-2xl border transition shadow-2xs ${
                cashBalance < lowBalanceThreshold
                  ? 'bg-amber-500/5 border-amber-500/50'
                  : 'bg-[rgb(var(--c-bg))] border-[rgb(var(--c-border))]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-heading font-bold text-[rgb(var(--c-muted))]">
                <span className="flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-600" /> Cash in Hand
                </span>
                {cashBalance < lowBalanceThreshold && (
                  <span className="text-[10px] text-amber-600 font-bold uppercase">Low</span>
                )}
              </div>
              <div className="text-2xl font-heading font-bold text-[rgb(var(--c-text))] mt-1">
                {cashBalance.toLocaleString()}{' '}
                <span className="text-xs font-normal text-[rgb(var(--c-muted))]">ETB</span>
              </div>
              <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish mt-1">
                Start: {initialCash.toLocaleString()} • Spent: -{cashExpenses.toLocaleString()} ETB
              </div>
            </div>

            {/* Account 2: Telebirr Wallet */}
            <div
              className={`p-5 rounded-2xl border transition shadow-2xs ${
                mobileBalance < lowBalanceThreshold
                  ? 'bg-amber-500/5 border-amber-500/50'
                  : 'bg-[rgb(var(--c-bg))] border-[rgb(var(--c-border))]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-heading font-bold text-[rgb(var(--c-muted))]">
                <span className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-600" /> Telebirr Wallet
                </span>
                {mobileBalance < lowBalanceThreshold && (
                  <span className="text-[10px] text-amber-600 font-bold uppercase">Low</span>
                )}
              </div>
              <div className="text-2xl font-heading font-bold text-[rgb(var(--c-text))] mt-1">
                {mobileBalance.toLocaleString()}{' '}
                <span className="text-xs font-normal text-[rgb(var(--c-muted))]">ETB</span>
              </div>
              <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish mt-1">
                Start: {initialMobileMoney.toLocaleString()} • Spent: -{mobileExpenses.toLocaleString()} ETB
              </div>
            </div>

            {/* Account 3: CBE Bank Account */}
            <div
              className={`p-5 rounded-2xl border transition shadow-2xs ${
                bankBalance < lowBalanceThreshold
                  ? 'bg-amber-500/5 border-amber-500/50'
                  : 'bg-[rgb(var(--c-bg))] border-[rgb(var(--c-border))]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-heading font-bold text-[rgb(var(--c-muted))]">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-purple-600" /> CBE Bank
                </span>
                {bankBalance < lowBalanceThreshold && (
                  <span className="text-[10px] text-amber-600 font-bold uppercase">Low</span>
                )}
              </div>
              <div className="text-2xl font-heading font-bold text-[rgb(var(--c-text))] mt-1">
                {bankBalance.toLocaleString()}{' '}
                <span className="text-xs font-normal text-[rgb(var(--c-muted))]">ETB</span>
              </div>
              <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish mt-1">
                Start: {initialBank.toLocaleString()} • Spent: -{bankExpenses.toLocaleString()} ETB
              </div>
            </div>

            {/* Account 4: Total Liquid & Vault */}
            <div className="p-5 rounded-2xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] sm:col-span-3 lg:col-span-1 shadow-2xs">
              <div className="flex items-center justify-between text-xs font-heading font-bold text-[rgb(var(--c-primary))] uppercase">
                <span>Total Liquid Wealth</span>
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-2xl font-heading font-bold text-[rgb(var(--c-primary))] mt-1">
                {totalLiquidBalance.toLocaleString()}{' '}
                <span className="text-xs font-normal text-[rgb(var(--c-muted))]">ETB</span>
              </div>
              <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish mt-1">
                + Vault: {totalSaved.toLocaleString()} ETB (Net: {grandNetWorth.toLocaleString()} ETB)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs within Finance Page */}
      <div className="flex items-center gap-3 border-b border-[rgb(var(--c-border))] pb-3 overflow-x-auto">
        {[
          { id: 'overview', label: 'Spending & Analytics', icon: BarChart3 },
          { id: 'savings', label: 'Savings Vault & Targets', icon: PiggyBank },
          { id: 'ledger', label: 'Receipts Ledger & Reconciliation', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-heading font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] shadow-sm'
                  : 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] border border-[rgb(var(--c-border))]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: OVERVIEW & SPENDING CHARTS ================= */}
      {(activeTab === 'overview' || activeTab === 'charts') && (
        <div className="space-y-6 sm:space-y-8">
          {/* Main Spending Chart with Range Selector */}
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgb(var(--c-border))]">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-rose-500" />
                  <h3 className="font-heading text-lg font-bold text-[rgb(var(--c-text))]">
                    How Much You Spent
                  </h3>
                </div>
                <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-1">
                  Daily spending timeline in Ethiopian Birr (ETB) with peak day tracking.
                </p>
              </div>

              {/* Timeframe selector: 7, 14, 30 days */}
              <div className="flex items-center gap-2 bg-[rgb(var(--c-surface2))] p-1 rounded-2xl border border-[rgb(var(--c-border))]">
                {([7, 14, 30] as const).map((days) => (
                  <button
                    key={days}
                    onClick={() => setChartDays(days)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition ${
                      chartDays === days
                        ? 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] shadow-xs'
                        : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Chart Highlight Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
                <span className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))]">
                  Period Total Spent
                </span>
                <div className="text-lg font-heading font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  {totalPeriodSpend.toLocaleString()} ETB
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
                <span className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))]">
                  Daily Average Spend
                </span>
                <div className="text-lg font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
                  {avgDailySpend.toLocaleString()} ETB / day
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
                <span className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))]">
                  Highest Spend Day
                </span>
                <div className="text-lg font-heading font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {highestSpendDay.expense.toLocaleString()} ETB
                  <span className="text-xs font-normal text-[rgb(var(--c-muted))] ml-1">
                    ({highestSpendDay.dayName})
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive SVG / Bar Chart */}
            <div className="pt-4">
              <div className="flex items-end justify-between gap-2 sm:gap-3 h-52 px-2 pb-3 border-b border-[rgb(var(--c-border))] overflow-x-auto">
                {chartDaysData.map((day) => {
                  const heightPercent =
                    maxDailyExpense > 0
                      ? Math.max(6, Math.round((day.expense / maxDailyExpense) * 100))
                      : 6;
                  const isToday = day.dateStr === todayKey;

                  return (
                    <div
                      key={day.dateStr}
                      className="flex-1 min-w-[28px] max-w-[52px] flex flex-col items-center gap-2 group relative"
                    >
                      {/* Floating tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition absolute -top-10 bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] text-[11px] font-heading font-bold px-2.5 py-1 rounded-xl border border-[rgb(var(--c-border))] shadow-lg pointer-events-none whitespace-nowrap z-20">
                        {day.expense.toLocaleString()} ETB
                      </div>

                      <div className="w-full flex flex-col justify-end items-center h-40">
                        <div
                          className={`w-full rounded-t-xl transition-all duration-500 ${
                            isToday
                              ? 'bg-rose-500 shadow-sm ring-2 ring-rose-400/50'
                              : day.expense > 0
                              ? 'bg-gradient-to-t from-rose-400 to-[#F6A8BE]'
                              : 'bg-[rgb(var(--c-surface2))]'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>

                      <span
                        className={`text-[10px] sm:text-[11px] font-heading font-bold text-center ${
                          isToday
                            ? 'text-rose-600 dark:text-rose-400 font-extrabold underline underline-offset-4'
                            : 'text-[rgb(var(--c-muted))]'
                        }`}
                      >
                        {day.dayName}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center text-xs text-[rgb(var(--c-muted))] font-flourish pt-3 px-2">
                <span>{chartDays} days ago</span>
                <span className="flex items-center gap-1.5 font-bold text-[rgb(var(--c-text))]">
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  Today ({chartDaysData[chartDaysData.length - 1]?.expense || 0} ETB)
                </span>
              </div>
            </div>
          </div>

          {/* Section B: Category Breakdown & Payment Channels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Card */}
            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
                <div className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-[#4FA3A5]" />
                  <h3 className="font-heading text-base font-bold text-[rgb(var(--c-text))]">
                    Spending By Category
                  </h3>
                </div>
                <span className="text-xs font-heading font-semibold text-[rgb(var(--c-muted))]">
                  {categoryList.length} Categories
                </span>
              </div>

              {categoryList.length === 0 ? (
                <div className="text-center py-12 text-xs text-[rgb(var(--c-muted))] font-flourish">
                  No expenses recorded yet. Click “Log Expense” to start tracking!
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))]">
                    {categoryList.map((item) => (
                      <div
                        key={item.category}
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${item.percent}%`,
                          backgroundColor: item.color,
                        }}
                        title={`${item.category}: ${item.percent}%`}
                      />
                    ))}
                  </div>

                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {categoryList.map((item) => (
                      <div
                        key={item.category}
                        className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: item.color }}
                          />
                          <div>
                            <div className="font-heading text-xs sm:text-sm font-bold text-[rgb(var(--c-text))]">
                              {item.category}
                            </div>
                            <div className="text-[10px] text-[rgb(var(--c-muted))]">
                              {item.count} transaction{item.count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-heading font-bold text-sm sm:text-base text-[rgb(var(--c-text))]">
                            {item.total.toLocaleString()} ETB
                          </span>
                          <span className="text-xs font-semibold text-[rgb(var(--c-muted))] ml-2">
                            ({item.percent}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Channel Running Balances Summary */}
            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-heading text-base font-bold text-[rgb(var(--c-text))]">
                    Channel Solvency Overview
                  </h3>
                </div>
                <button
                  onClick={() => setIsIncomeModalOpen(true)}
                  className="text-xs font-heading font-bold text-lime-700 dark:text-lime-400 hover:underline"
                >
                  + Add Funds
                </button>
              </div>

              <div className="space-y-3.5">
                {/* Telebirr */}
                <div className="p-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                        Telebirr Mobile Wallet
                      </div>
                      <div className="text-[11px] text-[rgb(var(--c-muted))]">
                        Fast cafeteria food, campus cafes &amp; data
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                      {mobileBalance.toLocaleString()} ETB
                    </div>
                    <div className="text-[10px] text-[rgb(var(--c-muted))]">Running Total</div>
                  </div>
                </div>

                {/* CBE */}
                <div className="p-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                        Commercial Bank of Ethiopia (CBE)
                      </div>
                      <div className="text-[11px] text-[rgb(var(--c-muted))]">
                        Monthly allowance &amp; bulk bookstore stashes
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                      {bankBalance.toLocaleString()} ETB
                    </div>
                    <div className="text-[10px] text-[rgb(var(--c-muted))]">Running Total</div>
                  </div>
                </div>

                {/* Cash in Pocket */}
                <div className="p-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                        Physical Cash in Pocket
                      </div>
                      <div className="text-[11px] text-[rgb(var(--c-muted))]">
                        Minibus transport, fruit stands &amp; printers
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                      {cashBalance.toLocaleString()} ETB
                    </div>
                    <div className="text-[10px] text-[rgb(var(--c-muted))]">Running Total</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: SAVINGS TRACKER & VAULT ================= */}
      {activeTab === 'savings' && (
        <div className="space-y-6 sm:space-y-8">
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgb(var(--c-border))]">
              <div>
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-heading text-lg font-bold text-[rgb(var(--c-text))]">
                    The Grand Budapest Savings Vault
                  </h3>
                </div>
                <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-1">
                  Tell the OS when you set aside money. Locked reserves are safeguarded from daily liquid spending.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsNewGoalModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold hover:bg-[rgb(var(--c-surface2))]"
                >
                  <Target className="w-3.5 h-3.5 text-[#4FA3A5]" />
                  <span>+ Target</span>
                </button>
                <button
                  onClick={() => {
                    if (savingsGoals.length > 0) setTargetGoalId(savingsGoals[0].id);
                    setIsSavingsModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading text-xs font-bold shadow-xs active:scale-95 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Deposit Savings</span>
                </button>
              </div>
            </div>

            {/* Savings Goals Grid */}
            {savingsGoals.length === 0 ? (
              <div className="text-center py-12 text-xs text-[rgb(var(--c-muted))] font-flourish">
                No savings buckets set up yet. Click “+ Target” to create your first goal!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savingsGoals.map((goal) => {
                  const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                  return (
                    <div
                      key={goal.id}
                      className="ticket-border rounded-2xl p-5 bg-[rgb(var(--c-bg))] space-y-4 shadow-2xs hover:border-emerald-500/50 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                            {goal.title}
                          </div>
                          <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
                            {goal.deadline ? `Target: ${goal.deadline}` : 'Perpetual reserve'}
                          </div>
                        </div>
                        <span className="text-xs font-heading font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {percent}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-xs font-heading font-bold text-[rgb(var(--c-text))] mb-1">
                          <span>{goal.currentAmount.toLocaleString()} ETB</span>
                          <span className="text-[rgb(var(--c-muted))]">{goal.targetAmount.toLocaleString()} ETB</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[rgb(var(--c-surface2))] overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Quick Deposit Actions */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => handleQuickSaveClick(100, goal.id)}
                          className="flex-1 py-1 text-xs font-heading font-semibold rounded-lg bg-[rgb(var(--c-surface2))] hover:bg-emerald-600 hover:text-white transition"
                        >
                          +100
                        </button>
                        <button
                          onClick={() => handleQuickSaveClick(500, goal.id)}
                          className="flex-1 py-1 text-xs font-heading font-semibold rounded-lg bg-[rgb(var(--c-surface2))] hover:bg-emerald-600 hover:text-white transition"
                        >
                          +500
                        </button>
                        <button
                          onClick={() => {
                            setTargetGoalId(goal.id);
                            setIsSavingsModalOpen(true);
                          }}
                          className="px-3 py-1 text-xs font-heading font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                        >
                          Deposit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: RECEIPTS LEDGER & RECONCILIATION ================= */}
      {activeTab === 'ledger' && (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgb(var(--c-border))]">
            <div>
              <h3 className="font-heading text-base sm:text-lg font-bold text-[rgb(var(--c-text))]">
                Receipt Ledger &amp; Cashflow History
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-0.5">
                Every transaction automatically updates running account balances. Edit or delete to recalculate ledger.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {(['all', 'expense', 'saving', 'income'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setLedgerFilter(filter)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-heading font-bold transition capitalize ${
                    ledgerFilter === filter
                      ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] shadow-xs'
                      : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                  }`}
                >
                  {filter === 'all' ? 'All Ledger' : `${filter}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Audit & Balance Reconciliation Ribbon */}
          <div className="p-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2 text-xs">
            <div className="flex items-center justify-between font-heading font-bold text-[rgb(var(--c-text))]">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-[#E5C04B]" /> Balance Reconciliation Equation
              </span>
              <button
                onClick={handleOpenAdjustBalances}
                className="text-[11px] text-[#E5C04B] hover:underline"
              >
                Edit Baselines
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[rgb(var(--c-muted))] font-mono">
              <div className="p-2 rounded-xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))]">
                <strong>Cash:</strong> {initialCash} + {cashIncomes} - {cashExpenses} - {cashSavings} ={' '}
                <span className="text-[rgb(var(--c-text))] font-bold">{cashBalance.toLocaleString()} ETB</span>
              </div>
              <div className="p-2 rounded-xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))]">
                <strong>Telebirr:</strong> {initialMobileMoney} + {mobileIncomes} - {mobileExpenses} - {mobileSavings} ={' '}
                <span className="text-[rgb(var(--c-text))] font-bold">{mobileBalance.toLocaleString()} ETB</span>
              </div>
              <div className="p-2 rounded-xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))]">
                <strong>CBE:</strong> {initialBank} + {bankIncomes} - {bankExpenses} - {bankSavings} ={' '}
                <span className="text-[rgb(var(--c-text))] font-bold">{bankBalance.toLocaleString()} ETB</span>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-xs text-[rgb(var(--c-muted))] font-flourish">
              No transactions match this filter. Use the buttons above to log expenses, income, or savings!
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((t) => {
                const isExpense = t.type === 'expense';
                const isSaving = t.type === 'saving';
                const isIncome = t.type === 'income';

                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] flex items-center justify-between gap-4 shadow-2xs hover:border-[rgb(var(--c-primary))]/50 transition"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          isExpense
                            ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600'
                            : isSaving
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600'
                            : 'bg-lime-100 dark:bg-lime-950/40 text-lime-700'
                        }`}
                      >
                        {isExpense ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : isSaving ? (
                          <PiggyBank className="w-5 h-5" />
                        ) : (
                          <ArrowDownLeft className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-heading font-bold text-[rgb(var(--c-text))] truncate">
                            {t.category}
                          </span>
                          <span
                            className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold ${
                              isExpense
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
                                : isSaving
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                                : 'bg-lime-50 text-lime-700 dark:bg-lime-950/30 dark:text-lime-300'
                            }`}
                          >
                            {t.type}
                          </span>
                        </div>
                        <div className="text-[11px] text-[rgb(var(--c-muted))] truncate font-flourish">
                          {formatDisplayDate(t.date)} • {t.account.replace('_', ' ')}{' '}
                          {t.notes && `• “${t.notes}”`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`font-heading font-bold text-sm sm:text-base ${
                          isExpense
                            ? 'text-rose-600 dark:text-rose-400'
                            : isSaving
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-lime-600 dark:text-lime-400'
                        }`}
                      >
                        {isExpense ? '-' : '+'}
                        {t.amount.toLocaleString()} ETB
                      </span>

                      <button
                        onClick={() => handleOpenEditTransaction(t)}
                        className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] transition"
                        title="Edit Entry"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setTxToDelete(t)}
                        className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500 hover:bg-[rgb(var(--c-surface2))] transition"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: LOG INCOME ================= */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2 text-lime-700 dark:text-lime-400">
                <ArrowDownLeft className="w-5 h-5" />
                <h3 className="font-heading text-lg font-bold text-[rgb(var(--c-text))]">
                  Log Inflow / Allowance Deposit
                </h3>
              </div>
              <button
                onClick={() => setIsIncomeModalOpen(false)}
                className="p-1.5 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIncome} className="space-y-4">
              <div>
                <label className="block text-xs font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                  Amount in ETB
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  placeholder="e.g. 2000"
                  className="w-full px-4 py-3 text-base rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-bold focus:outline-none focus:ring-2 focus:ring-lime-500"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                    Category
                  </label>
                  <select
                    value={incomeCategory}
                    onChange={(e) => setIncomeCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    {INCOME_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                    Deposit Into Account
                  </label>
                  <select
                    value={incomeAccount}
                    onChange={(e) => setIncomeAccount(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="mobile_money">Telebirr Mobile Wallet</option>
                    <option value="bank">Commercial Bank of Ethiopia (CBE)</option>
                    <option value="cash">Cash in Pocket / Hand</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                  Memo / Source (Optional)
                </label>
                <input
                  type="text"
                  value={incomeNotes}
                  onChange={(e) => setIncomeNotes(e.target.value)}
                  placeholder="e.g. Monthly transfer from parents, Tutoring session fee"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-lime-600 hover:bg-lime-700 text-white font-heading text-sm font-bold shadow-md active:scale-95 transition mt-2"
              >
                Record Deposit (+10 XP)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: LOG EXPENSE ================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[rgb(var(--c-border))]">
              <div>
                <div className="text-[10px] uppercase font-heading tracking-widest text-[#E5C04B] font-bold">
                  Receipt Inscription
                </div>
                <h3 className="font-heading text-lg font-bold text-[rgb(var(--c-text))]">
                  Log Student Expense
                </h3>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1.5 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-1.5">
                  Amount in ETB
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full px-4 py-3 text-base rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-bold focus:outline-none focus:ring-2 focus:ring-[#E5C04B]"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-1.5">
                    Category
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-1.5">
                    Paid Via Account
                  </label>
                  <select
                    value={expenseAccount}
                    onChange={(e) => setExpenseAccount(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="cash">Cash in Pocket ({cashBalance.toLocaleString()} ETB)</option>
                    <option value="mobile_money">Telebirr Wallet ({mobileBalance.toLocaleString()} ETB)</option>
                    <option value="bank">CBE Bank ({bankBalance.toLocaleString()} ETB)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-1.5">
                  Memo / Note (Optional)
                </label>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="e.g. Applied Math tutorial photocopy &amp; pen"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-[#E5C04B] text-stone-950 font-heading text-sm font-bold shadow-md hover:opacity-90 active:scale-98 transition flex items-center justify-center gap-2 mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>Inscribe Expense to Ledger (+5 XP)</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADJUST STARTING BALANCES ================= */}
      {isAdjustBalancesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2 font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                <Sliders className="w-4 h-4 text-[#E5C04B]" />
                <span>Adjust Baseline Balances &amp; Threshold</span>
              </div>
              <button onClick={() => setIsAdjustBalancesModalOpen(false)}>
                <X className="w-5 h-5 text-[rgb(var(--c-muted))]" />
              </button>
            </div>

            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Set the opening balances for each account when you started tracking, plus your low-balance alert target.
            </p>

            <form onSubmit={handleSaveAdjustBalances} className="space-y-3">
              <div>
                <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                  Cash in Pocket Opening Balance (ETB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editCashStarting}
                  onChange={(e) => setEditCashStarting(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                  Telebirr Opening Balance (ETB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editTelebirrStarting}
                  onChange={(e) => setEditTelebirrStarting(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                  CBE Bank Opening Balance (ETB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editCbeStarting}
                  onChange={(e) => setEditCbeStarting(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold text-amber-600 dark:text-amber-400 mb-1">
                  Low Balance Alert Threshold (ETB)
                </label>
                <input
                  type="number"
                  step="1"
                  value={editLowThreshold}
                  onChange={(e) => setEditLowThreshold(e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
                <button
                  type="button"
                  onClick={() => setIsAdjustBalancesModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#E5C04B] text-stone-950 font-heading text-xs font-bold shadow-xs hover:opacity-90 transition"
                >
                  Save Baseline Balances
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT TRANSACTION ================= */}
      {txToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                Edit Transaction Receipt
              </div>
              <button onClick={() => setTxToEdit(null)}>
                <X className="w-5 h-5 text-[rgb(var(--c-muted))]" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTransaction} className="space-y-3">
              <div>
                <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                  Amount in ETB
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={txToEdit.amount}
                  onChange={(e) => setTxToEdit({ ...txToEdit, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Type
                  </label>
                  <select
                    value={txToEdit.type}
                    onChange={(e) => setTxToEdit({ ...txToEdit, type: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="saving">Saving</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Account Channel
                  </label>
                  <select
                    value={txToEdit.account}
                    onChange={(e) => setTxToEdit({ ...txToEdit, account: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="cash">Cash in Pocket</option>
                    <option value="mobile_money">Telebirr Wallet</option>
                    <option value="bank">CBE Bank</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={txToEdit.category}
                  onChange={(e) => setTxToEdit({ ...txToEdit, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                  Memo / Note
                </label>
                <input
                  type="text"
                  value={txToEdit.notes || ''}
                  onChange={(e) => setTxToEdit({ ...txToEdit, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
                <button
                  type="button"
                  onClick={() => setTxToEdit(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#E5C04B] text-stone-950 font-heading text-xs font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE TRANSACTION CONFIRMATION ================= */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-rose-500/50 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <Trash2 className="w-5 h-5 shrink-0" />
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                Remove Transaction?
              </div>
            </div>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish leading-relaxed">
              Are you sure you want to delete this {txToDelete.type} of{' '}
              <strong className="text-[rgb(var(--c-text))]">
                {txToDelete.amount.toLocaleString()} ETB ({txToDelete.category})
              </strong>
              ? Your account running balances will be updated immediately.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
              <button
                onClick={() => setTxToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteTransaction}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-heading font-bold transition shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TELL SAVINGS ================= */}
      {isSavingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2.5">
                <PiggyBank className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <div className="text-[10px] uppercase font-heading tracking-widest text-emerald-600 font-bold">
                    Wealth Stash
                  </div>
                  <h3 className="font-heading text-lg font-bold text-[rgb(var(--c-text))]">
                    Tell OS How Much You Saved
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsSavingsModalOpen(false)}
                className="p-1.5 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDepositSavings} className="space-y-4">
              <div>
                <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-1.5">
                  Amount Saved (ETB)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={savingsAmount}
                    onChange={(e) => setSavingsAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-4 py-3 text-base rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    autoFocus
                    required
                  />
                  <span className="absolute right-4 top-3.5 font-heading text-xs font-bold text-[rgb(var(--c-muted))]">
                    ETB
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {quickSavePresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSavingsAmount(preset.toString())}
                      className="px-2.5 py-1 rounded-lg text-xs font-heading font-semibold bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:bg-emerald-600 hover:text-white transition"
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-1.5">
                  Deposit Into Savings Goal
                </label>
                <select
                  value={targetGoalId}
                  onChange={(e) => setTargetGoalId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  {savingsGoals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.currentAmount.toLocaleString()} / {g.targetAmount.toLocaleString()} ETB)
                    </option>
                  ))}
                  {savingsGoals.length === 0 && <option value="">General Emergency Buffer</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-1.5">
                  Saved From Channel
                </label>
                <select
                  value={savingsAccount}
                  onChange={(e) => setSavingsAccount(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="mobile_money">Telebirr Mobile Wallet</option>
                  <option value="bank">Commercial Bank of Ethiopia (CBE)</option>
                  <option value="cash">Cash in Pocket / Hand</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-1.5">
                  Memo / Why You Saved (Optional)
                </label>
                <input
                  type="text"
                  value={savingsNotes}
                  onChange={(e) => setSavingsNotes(e.target.value)}
                  placeholder="e.g. Cooked lunch at dorm instead of buying out"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading text-sm font-bold active:scale-98 transition shadow-md flex items-center justify-center gap-2 mt-2"
              >
                <PiggyBank className="w-5 h-5" />
                <span>Confirm Savings (+15 XP)</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE NEW SAVINGS TARGET ================= */}
      {isNewGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[rgb(var(--c-border))]">
              <div>
                <div className="text-[10px] uppercase font-heading tracking-widest text-[#4FA3A5] font-bold">
                  New Vault Objective
                </div>
                <h3 className="font-heading text-lg font-bold text-[rgb(var(--c-text))]">
                  Create Savings Target
                </h3>
              </div>
              <button
                onClick={() => setIsNewGoalModalOpen(false)}
                className="p-1.5 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-1.5">
                  Target Title
                </label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. Engineering Laptop Upgrade, Certification Exam"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-1.5">
                    Target Goal (ETB)
                  </label>
                  <input
                    type="number"
                    value={goalTargetAmount}
                    onChange={(e) => setGoalTargetAmount(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-1.5">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-[#4FA3A5] text-white font-heading text-sm font-bold shadow-md hover:opacity-90 active:scale-98 transition flex items-center justify-center gap-2 mt-2"
              >
                <Target className="w-5 h-5" />
                <span>Establish Savings Target</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
