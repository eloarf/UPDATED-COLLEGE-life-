import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { Task, HabitLog, FocusSession, DailyPlan } from '../../types';
import { awardDailyShutdownXp } from '../../services/rpgService';
import { useUiStore } from '../../store/uiStore';
import { addDaysToKey, getTodayKey } from '../../utils/dateUtils';
import { generateId } from '../../utils/idGenerator';
import { Moon, CheckCircle2, ArrowRight, Sparkles, Feather, ShieldCheck } from 'lucide-react';

interface ShutdownModalProps {
  dateKey: string;
  onClose: () => void;
  onCompleted?: () => void;
}

export const ShutdownModal: React.FC<ShutdownModalProps> = ({
  dateKey,
  onClose,
  onCompleted,
}) => {
  const { showToast } = useUiStore();
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [unfinishedTasks, setUnfinishedTasks] = useState<Task[]>([]);
  const [focusMinutes, setFocusMinutes] = useState(0);
  const [habitsLoggedCount, setHabitsLoggedCount] = useState(0);
  const [reflection, setReflection] = useState('');
  const [isRolledAll, setIsRolledAll] = useState(false);
  const [loading, setLoading] = useState(true);

  const tomorrowKey = addDaysToKey(dateKey, 1);

  useEffect(() => {
    async function loadData() {
      // 1. Tasks
      const allTasks = await db.tasks.toArray();
      const done = allTasks.filter(
        (t) =>
          (t.completedAt && t.completedAt.slice(0, 10) === dateKey) ||
          (t.dueDate === dateKey && t.status === 'done')
      );
      const open = allTasks.filter((t) => t.dueDate === dateKey && t.status === 'todo');
      setCompletedTasks(done);
      setUnfinishedTasks(open);

      // 2. Focus Sessions
      const sessions = await db.focusSessions.toArray();
      const todaySessions = sessions.filter((s) => s.startedAt && s.startedAt.slice(0, 10) === dateKey);
      const totalMins = todaySessions.reduce((acc, s) => acc + (s.minutesFocused || s.actualMinutes || 0), 0);
      setFocusMinutes(totalMins);

      // 3. Habit logs
      const logs = await db.habitLogs.where('date').equals(dateKey).toArray();
      setHabitsLoggedCount(logs.filter((l) => (l.count || 0) > 0).length);

      // 4. Existing reflection / plan
      const plan = await db.dailyPlans.where('dateKey').equals(dateKey).first();
      if (plan?.note) {
        setReflection(plan.note);
      }

      setLoading(false);
    }

    loadData();
  }, [dateKey]);

  const handleRollOverSingle = async (taskId: string) => {
    await db.tasks.update(taskId, {
      dueDate: tomorrowKey,
      isOverdueRolledOver: true,
      updatedAt: new Date().toISOString(),
    });
    setUnfinishedTasks((prev) => prev.filter((t) => t.id !== taskId));
    showToast('Rolled over to tomorrow without penalty 🌿', 'info');
  };

  const handleRollOverAll = async () => {
    for (const t of unfinishedTasks) {
      await db.tasks.update(t.id, {
        dueDate: tomorrowKey,
        isOverdueRolledOver: true,
        updatedAt: new Date().toISOString(),
      });
    }
    setUnfinishedTasks([]);
    setIsRolledAll(true);
    showToast('All remaining tasks rolled over to tomorrow cleanly! ✨', 'success');
  };

  const handleCompleteShutdown = async () => {
    try {
      const nowIso = new Date().toISOString();
      const existing = await db.dailyPlans.where('dateKey').equals(dateKey).first();

      if (existing) {
        await db.dailyPlans.update(existing.id, {
          shutdownAt: nowIso,
          note: reflection.trim() || existing.note,
        });
      } else {
        await db.dailyPlans.add({
          id: generateId(),
          dateKey,
          priorityIds: [],
          createdAt: nowIso,
          shutdownAt: nowIso,
          note: reflection.trim() || undefined,
        });
      }

      // Record daily reflection if text provided
      if (reflection.trim()) {
        await db.dailyReflections.add({
          id: generateId(),
          dateKey,
          meaningfulAccomplishment: reflection.trim(),
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }

      // Award XP under daily shutdown cap
      await awardDailyShutdownXp(dateKey);

      showToast('🌙 Evening shutdown complete. Rest well, Scholar! (+25 XP)', 'success');
      onCompleted?.();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Could not complete shutdown ritual', 'danger');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg max-h-[90vh] bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))]/40 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded-lg bg-indigo-500/15 text-indigo-500">
                <Moon className="w-4 h-4" />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-500">
                Evening Shutdown
              </span>
            </div>
            <h2 className="text-lg font-heading font-bold text-[rgb(var(--c-text))]">
              Daily Shutdown & Reflection • {dateKey}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Conquered Today Highlights */}
          <div className="space-y-2">
            <h3 className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>What You Conquered Today</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))]/50 text-center">
                <span className="block font-mono font-bold text-lg text-[rgb(var(--c-primary))]">
                  {completedTasks.length}
                </span>
                <span className="text-[10px] text-[rgb(var(--c-muted))] uppercase font-semibold">
                  Tasks Done
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))]/50 text-center">
                <span className="block font-mono font-bold text-lg text-cyan-500">
                  {focusMinutes}m
                </span>
                <span className="text-[10px] text-[rgb(var(--c-muted))] uppercase font-semibold">
                  Deep Work
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))]/50 text-center">
                <span className="block font-mono font-bold text-lg text-emerald-500">
                  {habitsLoggedCount}
                </span>
                <span className="text-[10px] text-[rgb(var(--c-muted))] uppercase font-semibold">
                  Habits
                </span>
              </div>
            </div>

            {completedTasks.length > 0 && (
              <div className="space-y-1 pt-1 max-h-32 overflow-y-auto">
                {completedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="text-xs text-[rgb(var(--c-muted))] flex items-center space-x-2 py-1 border-b border-[rgb(var(--c-border))]/40"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="line-through truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unfinished Tasks - Forgiving Rollover */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Unfinished Tasks ({unfinishedTasks.length})</span>
              </h3>
              {unfinishedTasks.length > 1 && (
                <button
                  type="button"
                  onClick={handleRollOverAll}
                  className="text-xs font-bold text-[rgb(var(--c-primary))] hover:underline flex items-center space-x-1"
                >
                  <span>Roll over all</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {unfinishedTasks.length === 0 ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Zero pending tasks left on your plate for today! Clean slate.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {unfinishedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] flex items-center justify-between text-xs gap-2"
                  >
                    <span className="font-semibold text-[rgb(var(--c-text))] truncate">
                      {t.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRollOverSingle(t.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[11px] font-bold text-[rgb(var(--c-primary))] hover:bg-[rgb(var(--c-surface2))] transition-colors shrink-0 flex items-center space-x-1"
                    >
                      <span>Move to Tomorrow</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <p className="text-[11px] text-[rgb(var(--c-muted))] italic">
                  Rolled over tasks carry zero penalty or shame. Tomorrow offers fresh focus.
                </p>
              </div>
            )}
          </div>

          {/* Optional One-Line Reflection */}
          <div className="space-y-1.5">
            <label className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider flex items-center space-x-1.5">
              <Feather className="w-3.5 h-3.5" />
              <span>One Reflection Line (Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Grateful for completing the data structures lab early."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] placeholder:text-[rgb(var(--c-muted))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary))]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))]/30 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCompleteShutdown}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-heading font-bold text-xs shadow-md hover:bg-indigo-700 transition-all flex items-center space-x-1.5"
          >
            <Moon className="w-4 h-4" />
            <span>Complete Shutdown (+25 XP)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
