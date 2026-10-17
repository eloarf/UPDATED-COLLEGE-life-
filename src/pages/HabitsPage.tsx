import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { Habit, HabitLog, RestDay } from '../types';
import { getTodayKey, addDaysToKey, formatDisplayDate } from '../utils/dateUtils';
import {
  calculateHabitStreak,
  getRemainingRestTokens,
  getWeekBounds,
  MAX_WEEKLY_REST_TOKENS,
} from '../utils/streakEngine';
import { awardXp, reverseXp } from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import { StreakCalendar } from '../components/habits/StreakCalendar';
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
  Calendar,
  Undo2,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';

export const HabitsPage: React.FC = () => {
  const { showToast } = useUiStore();
  const todayKey = getTodayKey();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('health');
  const [customCategory, setCustomCategory] = useState('');
  const [minimumVersion, setMinimumVersion] = useState('');
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);

  // Selected habit for visual calendar matrix
  const [selectedCalendarHabitId, setSelectedCalendarHabitId] = useState<string | null>(null);

  const habits = useLiveQuery(() => db.habits.toArray()) || [];
  const logs = useLiveQuery(() => db.habitLogs.toArray()) || [];
  const restDays = useLiveQuery(() => db.restDays.toArray()) || [];

  const todayLogs = logs.filter((l) => l.date === todayKey);
  const remainingTokens = getRemainingRestTokens(restDays, todayKey);
  const { mondayKey, sundayKey } = getWeekBounds(todayKey);

  // Default selected calendar habit to the first habit if none selected
  const activeCalendarHabit =
    habits.find((h) => h.id === selectedCalendarHabitId) || habits[0] || null;

  // Toggle Stamp Completion (Safe XP + Dynamic Streak)
  const handleToggleHabit = async (habit: Habit) => {
    const existing = todayLogs.find((l) => l.habitId === habit.id);

    if (existing) {
      // Undo stamp
      await db.habitLogs.delete(existing.id);
      await reverseXp('habit', habit.id + '_' + todayKey);

      // Recalculate streak
      const updatedLogs = logs.filter((l) => l.id !== existing.id);
      const newStreak = calculateHabitStreak(habit.id, updatedLogs, restDays, todayKey);
      await db.habits.update(habit.id, {
        currentStreak: newStreak.currentStreak,
        bestStreak: newStreak.bestStreak,
      });

      showToast('Habit stamp removed. -10 XP reversed.', 'info');
    } else {
      // Create stamp
      const newLogId = generateId();
      await db.habitLogs.add({
        id: newLogId,
        habitId: habit.id,
        date: todayKey,
        count: 1,
        isPartial: false,
      });

      // Recalculate streak
      const updatedLogs = [
        ...logs,
        { id: newLogId, habitId: habit.id, date: todayKey, count: 1, isPartial: false },
      ];
      const newStreak = calculateHabitStreak(habit.id, updatedLogs, restDays, todayKey);
      await db.habits.update(habit.id, {
        currentStreak: newStreak.currentStreak,
        bestStreak: newStreak.bestStreak,
      });

      const statKey =
        habit.category === 'creative'
          ? 'creativity'
          : habit.category === 'health'
          ? 'vitality'
          : 'discipline';

      await awardXp({
        source: 'habit',
        sourceId: habit.id + '_' + todayKey,
        amount: 10,
        stat: statKey,
      });

      showToast(`Habit stamped! +10 XP (Streak: ${newStreak.currentStreak} days)`, 'success');
    }
  };

  // Apply Rest Token to a specific dateKey (defaults to yesterday or today if missed)
  const handleApplyRestToken = async (habitId: string, targetDateKey: string = todayKey) => {
    if (remainingTokens <= 0) {
      showToast('No rest tokens remaining for this week (refills next Monday).', 'warning');
      return;
    }

    // Check if target is already completed or already has a token
    const isCompleted = logs.some(
      (l) => l.habitId === habitId && l.date === targetDateKey && (l.count > 0 || l.isPartial)
    );
    if (isCompleted) {
      showToast('This day is already stamped as completed!', 'info');
      return;
    }

    const existingToken = restDays.find(
      (r) => r.habitId === habitId && r.dateKey === targetDateKey
    );
    if (existingToken) {
      showToast('A rest token is already active for this day.', 'info');
      return;
    }

    await db.restDays.add({
      id: generateId(),
      habitId,
      dateKey: targetDateKey,
      createdAt: new Date().toISOString(),
    });

    // Update habit streak in db
    const updatedRestDays = [
      ...restDays,
      { id: generateId(), habitId, dateKey: targetDateKey, createdAt: '' },
    ];
    const newStreak = calculateHabitStreak(habitId, logs, updatedRestDays, todayKey);
    await db.habits.update(habitId, {
      currentStreak: newStreak.currentStreak,
      bestStreak: newStreak.bestStreak,
    });

    showToast(`Rest Token applied to ${targetDateKey}! Streak preserved.`, 'success');
  };

  // Remove / Undo Rest Token
  const handleRemoveRestToken = async (restDayId: string) => {
    const target = restDays.find((r) => r.id === restDayId);
    await db.restDays.delete(restDayId);

    if (target) {
      const updatedRestDays = restDays.filter((r) => r.id !== restDayId);
      const newStreak = calculateHabitStreak(target.habitId, logs, updatedRestDays, todayKey);
      await db.habits.update(target.habitId, {
        currentStreak: newStreak.currentStreak,
        bestStreak: newStreak.bestStreak,
      });
    }

    showToast('Rest token retrieved.', 'info');
  };

  // Create Habit
  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (category === 'other' && !customCategory.trim()) {
      showToast('Please specify your custom category name.', 'warning');
      return;
    }

    const savedCategory = category === 'other' ? customCategory.trim() : category;

    const newId = generateId();
    await db.habits.add({
      id: newId,
      title: title.trim(),
      category: savedCategory,
      customCategory: category === 'other' ? customCategory.trim() : undefined,
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
    setCategory('health');
    setCustomCategory('');
    setMinimumVersion('');
    setIsAddModalOpen(false);
    setSelectedCalendarHabitId(newId);
    showToast('New habit registered in passport!', 'success');
  };

  // Delete Habit
  const handleConfirmDeleteHabit = async () => {
    if (!habitToDelete) return;
    await db.habits.delete(habitToDelete.id);
    await db.habitLogs.where('habitId').equals(habitToDelete.id).delete();
    await db.restDays.where('habitId').equals(habitToDelete.id).delete();
    showToast(`Habit "${habitToDelete.title}" deleted.`, 'info');
    setHabitToDelete(null);
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
              2 weekly rest tokens (Monday–Sunday) • Partial win minimums • Date-based streak logic
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-heading text-xs font-bold flex items-center gap-1.5">
              <Shield className="w-4 h-4 fill-amber-500/20" />
              <span>{remainingTokens} / {MAX_WEEKLY_REST_TOKENS} Rest Tokens Left</span>
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
      </div>

      {/* Visual Streak Calendar Component */}
      {activeCalendarHabit ? (
        <div className="space-y-2">
          {/* Tab selector for multiple habits */}
          {habits.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-heading font-bold uppercase text-[rgb(var(--c-muted))] tracking-wider shrink-0 mr-1">
                Select Habit Matrix:
              </span>
              {habits.map((h) => {
                const isSelected = activeCalendarHabit.id === h.id;
                const hStreak = calculateHabitStreak(h.id, logs, restDays, todayKey);
                return (
                  <button
                    key={h.id}
                    onClick={() => setSelectedCalendarHabitId(h.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-heading font-bold transition shrink-0 flex items-center gap-1.5 border ${
                      isSelected
                        ? 'border-[#B6E63E] bg-[#B6E63E] text-stone-950 shadow-xs'
                        : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:border-[#B6E63E]'
                    }`}
                  >
                    <span>{h.title}</span>
                    <span className="text-[10px] opacity-80">({hStreak.currentStreak}d)</span>
                  </button>
                );
              })}
            </div>
          )}

          <StreakCalendar
            habit={activeCalendarHabit}
            logs={logs}
            restDays={restDays}
            onApplyRestToken={(dateKey) => handleApplyRestToken(activeCalendarHabit.id, dateKey)}
            onRemoveRestToken={handleRemoveRestToken}
          />
        </div>
      ) : null}

      {/* Habit Stamps Grid */}
      <div>
        <div className="font-heading text-xs font-bold uppercase tracking-wider text-[rgb(var(--c-muted))] mb-2 flex items-center justify-between">
          <span>Active Passport Stamps ({habits.length})</span>
          <span className="text-[10px] font-flourish">Tap to stamp today or use weekly rest token</span>
        </div>

        {habits.length === 0 ? (
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-12 text-center text-xs text-[rgb(var(--c-muted))] font-flourish space-y-3">
            <div>No habits in your passport yet.</div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#B6E63E] text-stone-950 font-heading text-xs font-bold shadow-xs hover:opacity-90 transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Your First Habit</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {habits.map((habit) => {
              const streak = calculateHabitStreak(habit.id, logs, restDays, todayKey);
              const isDoneToday = streak.isCompletedToday;
              const isRestToday = streak.isRestDayToday;
              const todayRestRecord = restDays.find(
                (r) => r.habitId === habit.id && r.dateKey === todayKey
              );

              return (
                <div
                  key={habit.id}
                  className={`ticket-border rounded-2xl p-4 bg-[rgb(var(--c-surface))] space-y-3 transition ${
                    isDoneToday
                      ? 'border-[#B6E63E] shadow-xs'
                      : isRestToday
                      ? 'border-amber-500/60 shadow-xs'
                      : 'hover:border-[#B6E63E]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm shadow-xs transition shrink-0 ${
                          isDoneToday
                            ? 'bg-[#B6E63E] text-stone-950'
                            : isRestToday
                            ? 'bg-amber-500 text-stone-950'
                            : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))]'
                        }`}
                      >
                        {isDoneToday ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : isRestToday ? (
                          <Shield className="w-4 h-4 fill-stone-950" />
                        ) : (
                          <Flame className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))] truncate">
                          {habit.title}
                        </div>
                        <div className="text-[10px] text-[rgb(var(--c-muted))] capitalize flex items-center gap-1.5 flex-wrap">
                          <span>{habit.customCategory || habit.category}</span>
                          <span>•</span>
                          <span className="font-bold text-[rgb(var(--c-text))]">
                            {streak.currentStreak}d streak
                          </span>
                          <span>•</span>
                          <span>Best: {streak.bestStreak}d</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setSelectedCalendarHabitId(habit.id)}
                        className={`p-1.5 rounded-lg text-xs font-heading transition ${
                          activeCalendarHabit?.id === habit.id
                            ? 'bg-[#B6E63E]/20 text-[#B6E63E]'
                            : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))]'
                        }`}
                        title="View monthly calendar grid"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setHabitToDelete(habit)}
                        className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500 hover:bg-[rgb(var(--c-surface2))] transition"
                        title="Delete habit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {habit.minimumVersionText && (
                    <div className="p-2 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                      “Low-energy mini: {habit.minimumVersionText}”
                    </div>
                  )}

                  {/* Stamp / Rest Button Bar */}
                  <div className="space-y-1.5">
                    <button
                      onClick={() => handleToggleHabit(habit)}
                      className={`w-full py-2 rounded-xl font-heading text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-98 ${
                        isDoneToday
                          ? 'bg-[#B6E63E] text-stone-950 shadow-xs'
                          : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:bg-[#B6E63E] hover:text-stone-950'
                      }`}
                    >
                      {isDoneToday ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Stamped Today! (+10 XP) • Tap to Undo</span>
                        </>
                      ) : (
                        <>
                          <Flame className="w-3.5 h-3.5 text-amber-500" />
                          <span>Stamp Today's Rep (+10 XP)</span>
                        </>
                      )}
                    </button>

                    {/* Rest Day Token Action */}
                    {!isDoneToday && (
                      <div className="flex items-center gap-1">
                        {isRestToday && todayRestRecord ? (
                          <button
                            onClick={() => handleRemoveRestToken(todayRestRecord.id)}
                            className="w-full py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-heading text-[11px] font-bold hover:bg-amber-500/20 transition flex items-center justify-center gap-1"
                          >
                            <Undo2 className="w-3 h-3" />
                            <span>Undo Today's Rest Token ({remainingTokens} left)</span>
                          </button>
                        ) : remainingTokens > 0 ? (
                          <button
                            onClick={() => handleApplyRestToken(habit.id, todayKey)}
                            className="w-full py-1.5 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-amber-600 hover:border-amber-500/40 font-heading text-[11px] transition flex items-center justify-center gap-1"
                          >
                            <Shield className="w-3 h-3 text-amber-500" />
                            <span>Use 1 Rest Token for Today ({remainingTokens} left this week)</span>
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Habit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                Register New Habit Stamp
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-4 h-4" />
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
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="health">Health &amp; Exercise</option>
                  <option value="study">University Study</option>
                  <option value="creative">Creative Flow &amp; Music</option>
                  <option value="mindset">Mindset &amp; Journal</option>
                  <option value="routine">Routine &amp; Sleep</option>
                  <option value="other">✨ Other (Custom Category)...</option>
                </select>
              </div>

              {category === 'other' && (
                <div className="animate-pop p-3 rounded-xl bg-[rgb(var(--c-surface2))] border border-[#B6E63E]/40 space-y-1">
                  <label className="block text-[11px] font-heading font-bold text-[#8B5A3C] dark:text-[#B6E63E]">
                    Your Custom Category Name
                  </label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g. Coding Lab, Spiritual, Language Practice"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                    autoFocus
                  />
                  <p className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
                    Saved to your habit passport and labeled on streak cards.
                  </p>
                </div>
              )}

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
                className="w-full mt-3 py-2 rounded-xl bg-[#B6E63E] text-stone-950 font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition"
              >
                Issue Habit Stamp
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {habitToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-rose-500/50 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <Trash2 className="w-5 h-5 shrink-0" />
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                Remove Habit Stamp?
              </div>
            </div>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish leading-relaxed">
              Are you sure you want to delete <strong className="text-[rgb(var(--c-text))]">“{habitToDelete.title}”</strong>? Its completion records and rest days will be cleaned up.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
              <button
                onClick={() => setHabitToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteHabit}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-heading font-bold transition shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
