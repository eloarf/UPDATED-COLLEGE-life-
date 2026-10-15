import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { Transaction, Budget, SavingsGoal } from '../types';
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

export const FinancePage: React.FC = () => {
  const { showToast } = useUiStore();
  const todayKey = getTodayKey();

  // Tab switching inside Finance page: 'overview' | 'charts' | 'savings' | 'ledger'
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'savings' | 'ledger'>('overview');

  // Chart range: 7, 14, or 30 days
  const [chartDays, setChartDays] = useState<7 | 14 | 30>(7);

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [isNewGoalModalOpen, setIsNewGoalModalOpen] = useState(false);
  const [selectedGoalForDeposit, setSelectedGoalForDeposit] = useState<string>('');

  // Transaction filter
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'expense' | 'saving' | 'income'>('all');

  // Expense form
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Food & Cafeteria');
  const [expenseAccount, setExpenseAccount] = useState<'cash' | 'bank' | 'mobile_money'>('cash');
  const [expenseNotes, setExpenseNotes] = useState('');

  // Savings form ("Tell it how much I am saving")
  const [savingsAmount, setSavingsAmount] = useState('');
  const [targetGoalId, setTargetGoalId] = useState('');
  const [savingsAccount, setSavingsAccount] = useState<'cash' | 'bank' | 'mobile_money'>('mobile_money');
  const [savingsNotes, setSavingsNotes] = useState('');

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

  // Metrics computation
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalSaved = savingsGoals.reduce((acc, curr) => acc + (curr.currentAmount || 0), 0);
  const netBalance = Math.max(0, totalIncome - totalExpense - totalSaved);

  // Savings rate calculation
  const totalCashflow = totalExpense + totalSaved;
  const savingsRate = totalCashflow > 0 ? Math.round((totalSaved / totalCashflow) * 100) : 0;

  // Chart Data: dynamic based on chartDays (7, 14, or 30 days)
  const chartDaysData = Array.from({ length: chartDays }, (_, i) => {
    const d = new Date(Date.now() - (chartDays - 1 - i) * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = chartDays <= 7 
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

  // Account Breakdown (Mobile Money / CBE Bank / Cash)
  const accountTotals = {
    mobile_money: transactions
      .filter((t) => t.account === 'mobile_money' && t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0),
    bank: transactions
      .filter((t) => t.account === 'bank' && t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0),
    cash: transactions
      .filter((t) => t.account === 'cash' && t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0),
  };

  // Filtered transactions for the ledger
  const filteredTransactions = transactions
    .filter((t) => (ledgerFilter === 'all' ? true : t.type === ledgerFilter))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Savings transactions only for the dedicated saves tracker
  const savingsTransactions = transactions
    .filter((t) => t.type === 'saving')
    .sort((a, b) => b.date.localeCompare(a.date));

  // Handlers
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(expenseAmount);
    if (isNaN(num) || num <= 0) return;

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

  const handleDeleteTransaction = async (tx: Transaction) => {
    if (tx.type === 'saving' && tx.savingsGoalId) {
      const goal = await db.savingsGoals.get(tx.savingsGoalId);
      if (goal) {
        await db.savingsGoals.update(goal.id, {
          currentAmount: Math.max(0, goal.currentAmount - tx.amount),
        });
      }
    }
    await db.transactions.delete(tx.id);
    showToast('Transaction removed from ledger.', 'info');
  };

  const handleDeleteGoal = async (goalId: string) => {
    await db.savingsGoals.delete(goalId);
    showToast('Savings goal closed.', 'info');
  };

  const openDepositModalForGoal = (goalId: string) => {
    setTargetGoalId(goalId);
    setSelectedGoalForDeposit(goalId);
    setIsSavingsModalOpen(true);
  };

  return (
    <div className="space-y-8 sm:space-y-10 pb-28 animate-pop">
      {/* 1. Grand Budapest Treasury Hero Banner */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-9 relative overflow-hidden shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[10px] uppercase font-heading tracking-widest text-[#E5C04B] font-bold">
              <PiggyBank className="w-3.5 h-3.5 text-[#E5C04B]" />
              <span>Campus Treasury &amp; Wealth Chamber</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[rgb(var(--c-text))] tracking-tight">
              Finance &amp; Savings Tracker
            </h2>
            <p className="text-xs sm:text-sm text-[rgb(var(--c-muted))] font-flourish leading-relaxed max-w-xl">
              Track how much you spend with interactive charts, tell the OS whenever you save money, and build your student wealth vault.
            </p>
          </div>

          {/* Quick Action Buttons with Generous Padding */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                if (savingsGoals.length > 0) setTargetGoalId(savingsGoals[0].id);
                setIsSavingsModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading text-xs sm:text-sm font-bold shadow-md active:scale-95 transition"
            >
              <PiggyBank className="w-4 h-4" />
              <span>Tell My Save</span>
            </button>

            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#E5C04B] text-stone-950 font-heading text-xs sm:text-sm font-bold shadow-md hover:opacity-90 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Log Expense</span>
            </button>

            <button
              onClick={() => setIsNewGoalModalOpen(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs sm:text-sm font-bold hover:bg-[rgb(var(--c-surface))] active:scale-95 transition"
            >
              <Target className="w-4 h-4 text-[#4FA3A5]" />
              <span>New Target</span>
            </button>
          </div>
        </div>

        {/* 2. Key Metrics Bar (Spaced Apart Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-8">
          {/* Total Spent */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-heading uppercase text-rose-500 font-bold">
              <span>Total Spent</span>
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-heading font-bold text-rose-600 dark:text-rose-400">
              {totalExpense.toLocaleString()} <span className="text-xs font-normal text-[rgb(var(--c-muted))]">ETB</span>
            </div>
            <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
              {totalPeriodSpend.toLocaleString()} ETB in past {chartDays} days
            </div>
          </div>

          {/* Total Saved */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-heading uppercase text-emerald-600 dark:text-emerald-400 font-bold">
              <span>Total Saved In Vault</span>
              <PiggyBank className="w-4 h-4" />
            </div>
            <div className="text-2xl sm:text-3xl font-heading font-bold text-emerald-600 dark:text-emerald-400">
              {totalSaved.toLocaleString()} <span className="text-xs font-normal text-[rgb(var(--c-muted))]">ETB</span>
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-flourish">
              Across {savingsGoals.length} target buckets
            </div>
          </div>

          {/* Savings Rate */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-heading uppercase text-[#4FA3A5] font-bold">
              <span>Savings Rate</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-heading font-bold text-[rgb(var(--c-primary))]">
              {savingsRate}%
            </div>
            <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
              Of all cashflow stored for future
            </div>
          </div>

          {/* Net Liquid Pocket Balance */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-xs font-heading uppercase text-[rgb(var(--c-muted))] font-bold">
              <span>Liquid Balance</span>
              <Wallet className="w-4 h-4 text-[rgb(var(--c-primary))]" />
            </div>
            <div className="text-2xl sm:text-3xl font-heading font-bold text-[rgb(var(--c-text))]">
              {netBalance.toLocaleString()} <span className="text-xs font-normal text-[rgb(var(--c-muted))]">ETB</span>
            </div>
            <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
              Allowances: {totalIncome.toLocaleString()} ETB
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs within Finance Page */}
      <div className="flex items-center gap-3 border-b border-[rgb(var(--c-border))] pb-3 overflow-x-auto">
        {[
          { id: 'overview', label: 'Spending & Charts', icon: BarChart3 },
          { id: 'savings', label: 'Savings Tracker & Vault', icon: PiggyBank },
          { id: 'ledger', label: 'Transaction Receipts', icon: CreditCard },
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
        <div className="space-y-8 sm:space-y-10">
          {/* Section A: Main Spending Chart with Range Selector */}
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

          {/* Section B: Category & Account Distribution Grid (Spacious) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                  {/* Proportional Stack Bar */}
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

                  {/* List of categories with amounts and percentages */}
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
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
                              {item.count} recorded transaction{item.count !== 1 ? 's' : ''}
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

            {/* Payment Method / Channel Breakdown Card */}
            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-heading text-base font-bold text-[rgb(var(--c-text))]">
                    Payment Channel Breakdown
                  </h3>
                </div>
                <span className="text-xs font-heading font-semibold text-[rgb(var(--c-muted))]">
                  Cash vs Digital
                </span>
              </div>

              <div className="space-y-4">
                {/* Telebirr Mobile Wallet */}
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
                        Fast campus food &amp; data transfers
                      </div>
                    </div>
                  </div>
                  <div className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                    {accountTotals.mobile_money.toLocaleString()} ETB
                  </div>
                </div>

                {/* CBE Bank */}
                <div className="p-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                        CBE / Bank Account
                      </div>
                      <div className="text-[11px] text-[rgb(var(--c-muted))]">
                        Allowances &amp; bulk tuition/books
                      </div>
                    </div>
                  </div>
                  <div className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                    {accountTotals.bank.toLocaleString()} ETB
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
                        Cash in Pocket / Hand
                      </div>
                      <div className="text-[11px] text-[rgb(var(--c-muted))]">
                        Minibus transport &amp; photocopies
                      </div>
                    </div>
                  </div>
                  <div className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                    {accountTotals.cash.toLocaleString()} ETB
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: SAVINGS TRACKER & "TELL IT HOW MUCH I AM SAVING" ================= */}
      {(activeTab === 'overview' || activeTab === 'savings') && (
        <div className="space-y-8 sm:space-y-10">
          {/* Main "Tell It How Much I Am Saving" Interactive Logger Card */}
          <div className="ticket-border bg-gradient-to-br from-[rgb(var(--c-surface))] to-[rgb(var(--c-surface2))] rounded-3xl p-6 sm:p-9 space-y-6 shadow-sm border-2 border-emerald-500/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgb(var(--c-border))]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-heading text-lg sm:text-xl font-bold text-[rgb(var(--c-text))]">
                    Tell The OS How Much You Saved
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-[rgb(var(--c-muted))] font-flourish">
                  Deposit your spare stipend, skipped cafeteria coffee, or allowances into your goals (+15 XP).
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-heading font-bold uppercase text-[rgb(var(--c-muted))] mr-1">
                  Quick Save:
                </span>
                {quickSavePresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleQuickSaveClick(preset)}
                    className="px-3 py-1.5 rounded-xl bg-[rgb(var(--c-bg))] border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-heading text-xs font-bold hover:bg-emerald-600 hover:text-white transition active:scale-95 shadow-2xs"
                  >
                    +{preset} ETB
                  </button>
                ))}
              </div>
            </div>

            {/* Savings Goals Grid (Track My Saves) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-[rgb(var(--c-text))] flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#4FA3A5]" />
                  <span>Your Savings Vault Targets</span>
                </h4>
                <button
                  onClick={() => setIsNewGoalModalOpen(true)}
                  className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Goal</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savingsGoals.map((goal) => {
                  const current = goal.currentAmount || 0;
                  const target = goal.targetAmount || 1;
                  const percent = Math.min(100, Math.round((current / target) * 100));
                  const remaining = Math.max(0, target - current);
                  const isCompleted = current >= target;

                  return (
                    <div
                      key={goal.id}
                      className={`ticket-border rounded-3xl p-6 bg-[rgb(var(--c-bg))] space-y-5 flex flex-col justify-between transition shadow-sm relative ${
                        isCompleted
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'hover:border-[#4FA3A5]'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] uppercase font-heading tracking-wider font-bold text-[rgb(var(--c-muted))]">
                              Goal Bucket
                            </div>
                            <h4 className="text-base sm:text-lg font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
                              {goal.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isCompleted && (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-heading font-bold flex items-center gap-1 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Achieved!
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500 transition"
                              title="Delete Goal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Numbers */}
                        <div className="mt-5 flex items-baseline justify-between">
                          <div>
                            <span className="text-2xl font-heading font-bold text-emerald-600 dark:text-emerald-400">
                              {current.toLocaleString()}
                            </span>
                            <span className="text-xs text-[rgb(var(--c-muted))]">
                              {' '}
                              / {target.toLocaleString()} ETB
                            </span>
                          </div>
                          <span className="text-sm font-heading font-bold text-[rgb(var(--c-primary))]">
                            {percent}%
                          </span>
                        </div>

                        {/* Progress Bar Track */}
                        <div className="w-full h-3 bg-[rgb(var(--c-surface2))] rounded-full overflow-hidden mt-2 p-0.5 border border-[rgb(var(--c-border))]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted
                                ? 'bg-emerald-500'
                                : 'bg-gradient-to-r from-emerald-500 via-[#4FA3A5] to-[#B6E63E]'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-[rgb(var(--c-muted))] font-flourish mt-2.5">
                          <span>
                            {remaining > 0
                              ? `${remaining.toLocaleString()} ETB remaining`
                              : 'Target 100% funded!'}
                          </span>
                          {goal.deadline && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Due {formatDisplayDate(goal.deadline)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Direct Deposit to this Goal */}
                      <button
                        onClick={() => openDepositModalForGoal(goal.id)}
                        className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading text-xs sm:text-sm font-bold shadow-xs active:scale-98 transition flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Deposit Savings To This Goal</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Savings Track Record / History Table */}
            <div className="pt-4 border-t border-[rgb(var(--c-border))] space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-[rgb(var(--c-text))] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>Savings Log &amp; Stash Track Record</span>
                </h4>
                <span className="text-xs text-[rgb(var(--c-muted))] font-flourish">
                  {savingsTransactions.length} stashes logged
                </span>
              </div>

              {savingsTransactions.length === 0 ? (
                <div className="text-center py-8 text-xs text-[rgb(var(--c-muted))] font-flourish">
                  You haven’t logged any savings stashes yet. Tell the OS whenever you put money aside!
                </div>
              ) : (
                <div className="space-y-3">
                  {savingsTransactions.map((tx) => {
                    const goal = savingsGoals.find((g) => g.id === tx.savingsGoalId);
                    return (
                      <div
                        key={tx.id}
                        className="p-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex items-center justify-between gap-3 shadow-2xs hover:border-emerald-500 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                            <PiggyBank className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                                +{tx.amount.toLocaleString()} ETB
                              </span>
                              {goal && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-heading font-bold">
                                  {goal.title}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[rgb(var(--c-muted))] mt-0.5">
                              {formatDisplayDate(tx.date)} • {tx.account.replace('_', ' ')}{' '}
                              {tx.notes && `• “${tx.notes}”`}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteTransaction(tx)}
                          className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500 transition"
                          title="Delete save record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: RECEIPT LEDGER & ALL TRANSACTIONS ================= */}
      {(activeTab === 'overview' || activeTab === 'ledger') && (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgb(var(--c-border))]">
            <div>
              <h3 className="font-heading text-base sm:text-lg font-bold text-[rgb(var(--c-text))]">
                Receipt Ledger &amp; Cashflow History
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-0.5">
                Detailed record of every student expense, savings deposit, and incoming allowance.
              </p>
            </div>

            {/* Filter Pills with Generous Spacing */}
            <div className="flex items-center gap-2 flex-wrap">
              {(['all', 'expense', 'saving', 'income'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setLedgerFilter(filter)}
                  className={`px-4 py-2 rounded-xl text-xs font-heading font-bold transition capitalize ${
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

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-xs text-[rgb(var(--c-muted))] font-flourish">
              No transactions match this filter. Use the buttons above to log expenses or savings!
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredTransactions.map((t) => {
                const isExpense = t.type === 'expense';
                const isSaving = t.type === 'saving';
                const isIncome = t.type === 'income';

                return (
                  <div
                    key={t.id}
                    className="p-4 sm:p-5 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] flex items-center justify-between gap-4 shadow-2xs hover:border-[rgb(var(--c-primary))] transition"
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

                    <div className="flex items-center gap-3.5 shrink-0">
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
                        onClick={() => handleDeleteTransaction(t)}
                        className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500 transition"
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

      {/* ================= MODAL 1: TELL IT HOW MUCH I AM SAVING ================= */}
      {isSavingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
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
                className="p-1.5 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] active:scale-95 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDepositSavings} className="space-y-5">
              <div>
                <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-2">
                  Amount Saved (ETB)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={savingsAmount}
                    onChange={(e) => setSavingsAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full px-5 py-3.5 text-base rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                    autoFocus
                    required
                  />
                  <span className="absolute right-4 top-3.5 font-heading text-xs font-bold text-[rgb(var(--c-muted))]">
                    ETB
                  </span>
                </div>

                {/* Quick Presets inside Modal */}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
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
                <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-2">
                  Deposit Into Savings Goal
                </label>
                <select
                  value={targetGoalId}
                  onChange={(e) => setTargetGoalId(e.target.value)}
                  className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
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
                <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-2">
                  Saved From Channel
                </label>
                <select
                  value={savingsAccount}
                  onChange={(e) => setSavingsAccount(e.target.value as any)}
                  className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="mobile_money">Telebirr Mobile Wallet</option>
                  <option value="bank">Commercial Bank of Ethiopia (CBE)</option>
                  <option value="cash">Cash in Pocket / Hand</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-2">
                  Memo / Why You Saved (Optional)
                </label>
                <input
                  type="text"
                  value={savingsNotes}
                  onChange={(e) => setSavingsNotes(e.target.value)}
                  placeholder="e.g. Cooked lunch at dorm instead of buying out"
                  className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading text-sm font-bold active:scale-98 transition shadow-md flex items-center justify-center gap-2"
              >
                <PiggyBank className="w-5 h-5" />
                <span>Confirm Savings (+15 XP)</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: LOG EXPENSE ================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
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
                className="p-1.5 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] active:scale-95 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-5">
              <div>
                <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-2">
                  Amount in ETB
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full px-5 py-3.5 text-base rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-bold focus:outline-none focus:ring-2 focus:ring-[#E5C04B]"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-2">
                    Category
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-2">
                    Paid Via
                  </label>
                  <select
                    value={expenseAccount}
                    onChange={(e) => setExpenseAccount(e.target.value as any)}
                    className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="cash">Cash in Pocket</option>
                    <option value="mobile_money">Telebirr Mobile</option>
                    <option value="bank">CBE Bank</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-2">
                  Memo / Note (Optional)
                </label>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="e.g. Applied Math tutorial photocopy &amp; pen"
                  className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-[#E5C04B] text-stone-950 font-heading text-sm font-bold shadow-md hover:opacity-90 active:scale-98 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>Inscribe Expense to Ledger (+5 XP)</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: CREATE NEW SAVINGS TARGET ================= */}
      {isNewGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
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
                className="p-1.5 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] active:scale-95 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-5">
              <div>
                <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-2">
                  Target Title
                </label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="e.g. Engineering Laptop Upgrade, Certification Exam"
                  className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-2">
                    Target Goal (ETB)
                  </label>
                  <input
                    type="number"
                    value={goalTargetAmount}
                    onChange={(e) => setGoalTargetAmount(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading text-[rgb(var(--c-muted))] uppercase font-bold mb-2">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-[#4FA3A5] text-white font-heading text-sm font-bold shadow-md hover:opacity-90 active:scale-98 transition flex items-center justify-center gap-2"
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
