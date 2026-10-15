import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { Habit, HabitLog } from '../types';
import { getTodayKey, formatDisplayDate } from '../utils/dateUtils';
import { awardXp, reverseXp } from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import {
  Activity,
  Plus,
  Flame,
  Award,
  Sparkles,
  Shield,
  Trash2,
  X,
  Check,
} from 'lucide-react';

export const HabitsPage: React.FC = () => {
  const { showToast } = useUiStore();
  const todayKey = getTodayKey();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'study' | 'health' | 'creative' | 'mindset' | 'routine'>('health');
  const [minimumVersion, setMinimumVersion] = useState('');

  const habits = useLiveQuery(() => db.habits.toArray()) || [];
  const logs = useLiveQuery(() => db.habitLogs.toArray()) || [];

  const todayLogs = logs.filter((l) => l.date === todayKey);

  const handleToggleHabit = async (habit: Habit) => {
    const existing = todayLogs.find((l) => l.habitId === habit.id);

    if (existing) {
      await db.habitLogs.delete(existing.id);
      await db.habits.update(habit.id, {
        currentStreak: Math.max(0, habit.currentStreak - 1),
      });
      await reverseXp('habit', habit.id + '_' + todayKey);
      showToast('Habit stamp removed.', 'info');
    } else {
      await db.habitLogs.add({
        id: generateId(),
        habitId: habit.id,
        date: todayKey,
        count: 1,
        isPartial: false,
      });

      const nextStreak = habit.currentStreak + 1;
      await db.habits.update(habit.id, {
        currentStreak: nextStreak,
        bestStreak: Math.max(habit.bestStreak, nextStreak),
      });

      await awardXp({
        source: 'habit',
        sourceId: habit.id + '_' + todayKey,
        amount: 10,
        stat: habit.category === 'creative' ? 'creativity' : habit.category === 'health' ? 'vitality' : 'discipline',
      });

      showToast(`Habit stamped! +10 XP (Streak: ${nextStreak} days)`, 'success');
    }
  };

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await db.habits.add({
      id: generateId(),
      title: title.trim(),
      category,
      type: 'daily',
      targetCount: 1,
      minimumVersionText: minimumVersion.trim() || undefined,
      color: '#B6E63E',
      currentStreak: 0,
      bestStreak: 0,
      icon: 'Activity',
      graceDaysLeft: 2,
    });

    setTitle('');
    setMinimumVersion('');
    setIsAddModalOpen(false);
    showToast('New habit registered in passport!', 'success');
  };

  const handleDeleteHabit = async (id: string) => {
    await db.habits.delete(id);
    await db.habitLogs.where('habitId').equals(id).delete();
    showToast('Habit deleted.', 'info');
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#B6E63E] font-bold">
              Habit Passport &amp; Rituals
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              Forgiving Consistency Stamps
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              2 weekly rest tokens • Partial win minimum versions • Never resets to zero
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#B6E63E] text-stone-950 font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Habit</span>
          </button>
        </div>
      </div>

      {/* Habit Stamps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {habits.map((habit) => {
          const isDoneToday = todayLogs.some((l) => l.habitId === habit.id);

          return (
            <div
              key={habit.id}
              className={`ticket-border rounded-2xl p-4 bg-[rgb(var(--c-surface))] space-y-3 transition ${
                isDoneToday ? 'border-emerald-500 shadow-xs' : 'hover:border-[#B6E63E]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm shadow-xs transition ${
                      isDoneToday ? 'bg-emerald-500 text-white' : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))]'
                    }`}
                  >
                    {isDoneToday ? '✓' : <Flame className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      {habit.title}
                    </div>
                    <div className="text-[10px] text-[rgb(var(--c-muted))] capitalize">
                      {habit.category} • Best: {habit.bestStreak}d streak
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteHabit(habit.id)}
                  className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {habit.minimumVersionText && (
                <div className="p-2 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                  “Low-energy mini: {habit.minimumVersionText}”
                </div>
              )}

              <button
                onClick={() => handleToggleHabit(habit)}
                className={`w-full py-2 rounded-xl font-heading text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-98 ${
                  isDoneToday
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:bg-[#B6E63E] hover:text-stone-950'
                }`}
              >
                {isDoneToday ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Stamped Today! (+10 XP)</span>
                  </>
                ) : (
                  <span>Stamp Today's Rep (+10 XP)</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* New Habit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                Register New Habit Stamp
              </div>
              <button onClick={() => setIsAddModalOpen(false)}>
                <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
              </button>
            </div>

            <form onSubmit={handleAddHabit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Habit Name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Read 15 pages of textbook"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="health">Health &amp; Exercise</option>
                  <option value="study">University Study</option>
                  <option value="creative">Creative Flow &amp; Music</option>
                  <option value="mindset">Mindset &amp; Journal</option>
                  <option value="routine">Routine &amp; Sleep</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Minimum Viable Version (for low-energy days)
                </label>
                <input
                  type="text"
                  value={minimumVersion}
                  onChange={(e) => setMinimumVersion(e.target.value)}
                  placeholder="e.g. Read 2 pages / 5 pushups"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-2 rounded-xl bg-[#B6E63E] text-stone-950 font-heading text-xs font-bold"
              >
                Issue Habit Stamp
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
