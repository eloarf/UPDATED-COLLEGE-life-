import React, { useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { generateId } from '../../utils/idGenerator';
import { getTodayKey } from '../../utils/dateUtils';
import { awardXp } from '../../services/rpgService';
import { X, CheckSquare, DollarSign, BookOpen, Clock, Feather } from 'lucide-react';

export const QuickAddModal: React.FC = () => {
  const { isQuickAddOpen, setQuickAddOpen, showToast, setCurrentRoute } = useUiStore();
  const [activeTab, setActiveTab] = useState<'task' | 'expense' | 'note' | 'focus'>('task');

  const courses = useLiveQuery(() => db.courses.toArray()) || [];

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [effort, setEffort] = useState<'small' | 'medium' | 'large'>('small');
  const [dueDate, setDueDate] = useState(getTodayKey());
  const [contextTag, setContextTag] = useState<'phone' | 'laptop' | 'any'>('any');

  // Expense form state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food & Meals');
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

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) return;

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

    showToast('Expense recorded in Wallet (+5 XP)!', 'success');
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
      <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
          <div className="font-heading text-sm font-bold tracking-wider text-[rgb(var(--c-primary))] uppercase">
            ⚡ Quick Concierge Dispatch
          </div>
          <button
            onClick={() => setQuickAddOpen(false)}
            className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[rgb(var(--c-border))] gap-1 mb-4">
          <button
            onClick={() => setActiveTab('task')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold border-b-2 -mb-[1px] transition ${
              activeTab === 'task'
                ? 'border-[rgb(var(--c-primary))] text-[rgb(var(--c-primary))]'
                : 'border-transparent text-[rgb(var(--c-muted))]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" /> Task
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold border-b-2 -mb-[1px] transition ${
              activeTab === 'expense'
                ? 'border-[rgb(var(--c-primary))] text-[rgb(var(--c-primary))]'
                : 'border-transparent text-[rgb(var(--c-muted))]'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" /> Expense
          </button>
          <button
            onClick={() => setActiveTab('note')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold border-b-2 -mb-[1px] transition ${
              activeTab === 'note'
                ? 'border-[rgb(var(--c-primary))] text-[rgb(var(--c-primary))]'
                : 'border-transparent text-[rgb(var(--c-muted))]'
            }`}
          >
            <Feather className="w-3.5 h-3.5" /> Note
          </button>
          <button
            onClick={() => {
              setQuickAddOpen(false);
              setCurrentRoute('#/focus');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))]"
          >
            <Clock className="w-3.5 h-3.5" /> Focus
          </button>
        </div>

        {/* Tab 1: Task */}
        {activeTab === 'task' && (
          <form onSubmit={handleSaveTask} className="space-y-3">
            <div>
              <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                Task Title
              </label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Finish Calculus Problem Set 3"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary))]"
                autoFocus
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Course
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
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
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Effort
                </label>
                <select
                  value={effort}
                  onChange={(e) => setEffort(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="small">Small (10 XP)</option>
                  <option value="medium">Medium (25 XP)</option>
                  <option value="large">Large (50 XP)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Device
                </label>
                <select
                  value={contextTag}
                  onChange={(e) => setContextTag(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="any">Anywhere</option>
                  <option value="phone">📱 Phone-ok</option>
                  <option value="laptop">💻 Laptop</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-98 transition shadow-xs"
            >
              Dispatch Quest
            </button>
          </form>
        )}

        {/* Tab 2: Expense */}
        {activeTab === 'expense' && (
          <form onSubmit={handleSaveExpense} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Amount (ETB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="150"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Account
                </label>
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value as any)}
                  className="w-full px-2 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="cash">Cash in Pocket</option>
                  <option value="mobile_money">Telebirr / Mobile</option>
                  <option value="bank">CBE / Bank</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              >
                <option value="Food & Meals">Food & Meals</option>
                <option value="Coffee & Snacks">Coffee & Tea</option>
                <option value="Stationery & Prints">Stationery & Printouts</option>
                <option value="Transport">Campus Transport</option>
                <option value="Personal & Health">Personal Care</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                Note (Optional)
              </label>
              <input
                type="text"
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
                placeholder="e.g. Lunch at campus cafeteria"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-98 transition shadow-xs"
            >
              Record Expense (+5 XP)
            </button>
          </form>
        )}

        {/* Tab 3: Note / Journal */}
        {activeTab === 'note' && (
          <form onSubmit={handleSaveNote} className="space-y-3">
            <div>
              <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                Journal Reflection / Thought
              </label>
              <textarea
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                rows={4}
                placeholder="What occurred today? What are you grateful for?"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                autoFocus
                required
              />
              <div className="text-[10px] text-[rgb(var(--c-muted))] text-right mt-1">
                Word count: {journalContent.trim() ? journalContent.trim().split(/\s+/).length : 0} (≥20 words awards 15 XP)
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
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
              className="w-full mt-2 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-98 transition shadow-xs"
            >
              Preserve Reflection
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
