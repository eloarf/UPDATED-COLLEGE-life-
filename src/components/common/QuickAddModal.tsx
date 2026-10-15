import React, { useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { generateId } from '../../utils/idGenerator';
import { getTodayKey } from '../../utils/dateUtils';
import { awardXp, triggerLevelUpConfetti } from '../../services/rpgService';
import { X, CheckSquare, DollarSign, Clock, Feather, PiggyBank } from 'lucide-react';

export const QuickAddModal: React.FC = () => {
  const { isQuickAddOpen, setQuickAddOpen, showToast, setCurrentRoute } = useUiStore();
  const [activeTab, setActiveTab] = useState<'task' | 'expense' | 'note' | 'focus'>('task');

  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const savingsGoals = useLiveQuery(() => db.savingsGoals.toArray()) || [];

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [effort, setEffort] = useState<'small' | 'medium' | 'large'>('small');
  const [dueDate, setDueDate] = useState(getTodayKey());
  const [contextTag, setContextTag] = useState<'phone' | 'laptop' | 'any'>('any');

  // Expense & Savings form state
  const [moneyMode, setMoneyMode] = useState<'expense' | 'saving'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Cafeteria');
  const [targetGoalId, setTargetGoalId] = useState('');
  const [account, setAccount] = useState<'cash' | 'bank' | 'mobile_money'>('cash');
  const [expenseNote, setExpenseNote] = useState('');

  // Note form state
  const [journalContent, setJournalContent] = useState('');
  const [mood, setMood] = useState(4);

  if (!isQuickAddOpen) return null;

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const taskId = generateId();
    const now = new Date().toISOString();

    await db.tasks.add({
      id: taskId,
      title: taskTitle.trim(),
      courseId: courseId || undefined,
      priority,
      effort,
      dueDate,
      status: 'todo',
      contextTag,
      createdAt: now,
      updatedAt: now,
    });

    showToast('Task added to quest log!', 'success');
    setTaskTitle('');
    setQuickAddOpen(false);
  };

  const handleSaveMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) return;

    if (moneyMode === 'expense') {
      await db.transactions.add({
        id: generateId(),
        type: 'expense',
        amount: numericAmount,
        currency: 'ETB',
        category,
        account,
        date: getTodayKey(),
        notes: expenseNote,
      });

      await awardXp({
        source: 'expense',
        sourceId: generateId(),
        amount: 5,
        stat: 'discipline',
      });

      showToast(`Expense logged: ${numericAmount} ETB (+5 XP)!`, 'success');
    } else {
      // Savings deposit
      const goal = savingsGoals.find((g) => g.id === targetGoalId) || savingsGoals[0];
      if (goal) {
        await db.savingsGoals.update(goal.id, {
          currentAmount: (goal.currentAmount || 0) + numericAmount,
        });
      }

      await db.transactions.add({
        id: generateId(),
        type: 'saving',
        amount: numericAmount,
        currency: 'ETB',
        category: 'Savings Deposit',
        account,
        date: getTodayKey(),
        notes: expenseNote || (goal ? `Saved for ${goal.title}` : 'Savings buffer'),
        savingsGoalId: goal?.id,
      });

      await awardXp({
        source: 'saving_deposit',
        sourceId: generateId(),
        amount: 15,
        stat: 'discipline',
      });

      showToast(`Saved ${numericAmount} ETB (+15 XP)!`, 'success');
    }

    setAmount('');
    setExpenseNote('');
    setQuickAddOpen(false);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalContent.trim()) return;

    const words = journalContent.trim().split(/\s+/).length;
    await db.journalEntries.add({
      id: generateId(),
      date: getTodayKey(),
      moodScore: mood,
      energyScore: 3,
      content: journalContent.trim(),
      wordCount: words,
      tags: ['quick_note'],
      createdAt: new Date().toISOString(),
    });

    if (words >= 20) {
      await awardXp({
        source: 'journal',
        sourceId: generateId(),
        amount: 15,
        stat: 'creativity',
      });
      showToast('Journal entry saved (+15 XP)!', 'success');
    } else {
      showToast('Quick note saved in journal.', 'info');
    }

    setJournalContent('');
    setQuickAddOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
      <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5">
        {/* Header with generous spacing */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[rgb(var(--c-border))]">
          <div>
            <div className="font-heading text-[10px] tracking-widest text-[rgb(var(--c-primary))] font-bold uppercase">
              Fast Dispatch
            </div>
            <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
              Quick Concierge Add
            </h3>
          </div>
          <button
            onClick={() => setQuickAddOpen(false)}
            className="p-1.5 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] active:scale-95 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[rgb(var(--c-border))] gap-2 pb-1">
          <button
            onClick={() => setActiveTab('task')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-heading font-bold border-b-2 -mb-[1px] transition ${
              activeTab === 'task'
                ? 'border-[rgb(var(--c-primary))] text-[rgb(var(--c-primary))]'
                : 'border-transparent text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
            }`}
          >
            <CheckSquare className="w-4 h-4" /> Task
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-heading font-bold border-b-2 -mb-[1px] transition ${
              activeTab === 'expense'
                ? 'border-[rgb(var(--c-primary))] text-[rgb(var(--c-primary))]'
                : 'border-transparent text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
            }`}
          >
            <DollarSign className="w-4 h-4" /> Money
          </button>
          <button
            onClick={() => setActiveTab('note')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-heading font-bold border-b-2 -mb-[1px] transition ${
              activeTab === 'note'
                ? 'border-[rgb(var(--c-primary))] text-[rgb(var(--c-primary))]'
                : 'border-transparent text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
            }`}
          >
            <Feather className="w-4 h-4" /> Note
          </button>
          <button
            onClick={() => {
              setQuickAddOpen(false);
              setCurrentRoute('#/focus');
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))]"
          >
            <Clock className="w-4 h-4" /> Focus
          </button>
        </div>

        {/* Tab 1: Task */}
        {activeTab === 'task' && (
          <form onSubmit={handleSaveTask} className="space-y-4">
            <div>
              <label className="block text-[11px] font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                Task Title
              </label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Finish Calculus Problem Set 3"
                className="w-full px-4 py-2.5 text-xs rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary))]"
                autoFocus
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                  Course
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="">General / None</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                  Effort
                </label>
                <select
                  value={effort}
                  onChange={(e) => setEffort(e.target.value as any)}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="small">Small (10 XP)</option>
                  <option value="medium">Medium (25 XP)</option>
                  <option value="large">Large (50 XP)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                  Device
                </label>
                <select
                  value={contextTag}
                  onChange={(e) => setContextTag(e.target.value as any)}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="any">Anywhere</option>
                  <option value="phone">📱 Phone-ok</option>
                  <option value="laptop">💻 Laptop</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 rounded-2xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-98 transition shadow-md"
            >
              Dispatch Quest
            </button>
          </form>
        )}

        {/* Tab 2: Money (Expense or Savings) */}
        {activeTab === 'expense' && (
          <form onSubmit={handleSaveMoney} className="space-y-4">
            {/* Toggle between Expense and Save */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
              <button
                type="button"
                onClick={() => setMoneyMode('expense')}
                className={`py-2 rounded-xl text-xs font-heading font-bold transition ${
                  moneyMode === 'expense'
                    ? 'bg-[#E5C04B] text-stone-950 shadow-xs'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                Log Expense
              </button>
              <button
                type="button"
                onClick={() => setMoneyMode('saving')}
                className={`py-2 rounded-xl text-xs font-heading font-bold transition flex items-center justify-center gap-1.5 ${
                  moneyMode === 'saving'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                <PiggyBank className="w-3.5 h-3.5" />
                <span>Tell My Save</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                  Amount (ETB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full px-4 py-2.5 text-sm rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-bold"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                  Account
                </label>
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value as any)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="cash">Cash in Pocket</option>
                  <option value="mobile_money">Telebirr Mobile</option>
                  <option value="bank">CBE Bank</option>
                </select>
              </div>
            </div>

            {moneyMode === 'expense' ? (
              <div>
                <label className="block text-[11px] font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="Food & Cafeteria">Food &amp; Cafeteria</option>
                  <option value="Coffee & Snacks">Coffee &amp; Snacks</option>
                  <option value="Stationery & Prints">Stationery &amp; Prints</option>
                  <option value="Campus Transport">Campus Transport</option>
                  <option value="Internet & Mobile">Internet &amp; Mobile</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Books & Materials">Books &amp; Materials</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                  Target Savings Bucket
                </label>
                <select
                  value={targetGoalId}
                  onChange={(e) => setTargetGoalId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  {savingsGoals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title} ({g.currentAmount} / {g.targetAmount} ETB)
                    </option>
                  ))}
                  {savingsGoals.length === 0 && <option value="">General Emergency Buffer</option>}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                Note (Optional)
              </label>
              <input
                type="text"
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
                placeholder={moneyMode === 'expense' ? 'e.g. Lunch at cafeteria' : 'e.g. Saved remainder of allowance'}
                className="w-full px-4 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <button
              type="submit"
              className={`w-full py-3.5 rounded-2xl font-heading text-xs sm:text-sm font-bold shadow-md hover:opacity-90 active:scale-98 transition flex items-center justify-center gap-2 ${
                moneyMode === 'expense'
                  ? 'bg-[#E5C04B] text-stone-950'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {moneyMode === 'expense' ? 'Record Expense (+5 XP)' : 'Deposit to Savings (+15 XP)'}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setQuickAddOpen(false);
                  setCurrentRoute('#/finance');
                }}
                className="text-[11px] font-heading font-bold text-[rgb(var(--c-primary))] hover:underline inline-flex items-center gap-1"
              >
                <span>Open Full Finance &amp; Savings Page with Charts →</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Note / Journal */}
        {activeTab === 'note' && (
          <form onSubmit={handleSaveNote} className="space-y-4">
            <div>
              <label className="block text-[11px] font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                Journal Thought
              </label>
              <textarea
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                rows={4}
                placeholder="What occurred today? What are you grateful for?"
                className="w-full p-4 text-xs rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary))]"
                autoFocus
                required
              />
              <div className="text-[10px] text-[rgb(var(--c-muted))] text-right mt-1 font-flourish">
                Word count: {journalContent.trim() ? journalContent.trim().split(/\s+/).length : 0} (≥20 words awards 15 XP)
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-heading uppercase font-bold text-[rgb(var(--c-muted))] mb-1.5">
                Today's Mood: {['😞', '😐', '🙂', '😊', '🔥'][mood - 1]}
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={mood}
                onChange={(e) => setMood(parseInt(e.target.value, 10))}
                className="w-full accent-[rgb(var(--c-primary))]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-98 transition shadow-md"
            >
              Preserve Reflection
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
