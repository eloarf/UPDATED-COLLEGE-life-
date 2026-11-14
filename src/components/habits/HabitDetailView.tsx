import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Edit2,
  Flame,
  Award,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Trash2,
  Clock,
  Target,
} from 'lucide-react';
import { Habit, HabitLog, RestDay } from '../../types';
import {
  calculateHabitDetailStats,
  getHabitTrackingMethod,
  getHabitUnitLabel,
  getHabitTargetValue,
  DEFAULT_HABIT_CATEGORIES,
} from '../../utils/streakEngine';
import { addDaysToKey, DAY_NAMES, formatDisplayDate, getTodayKey } from '../../utils/dateUtils';
import { StreakCalendar } from './StreakCalendar';

type HistoryRange = '7d' | '30d' | '90d' | 'all';

interface HabitDetailViewProps {
  habit: Habit;
  logs: HabitLog[];
  restDays: RestDay[];
  categories: { id: string; label: string }[];
  onBack: () => void;
  onEdit: (habit: Habit) => void;
  onApplyRestToken: (dateKey: string) => void;
  onRemoveRestToken: (restDayId: string) => void;
  onDeleteLog: (log: HabitLog) => void;
}

const METHOD_LABELS: Record<string, string> = {
  simple: 'Simple check-off',
  duration: 'Duration tracking',
  quantity: 'Quantity tracking',
  frequency: 'Frequency counter',
  avoidance: 'Avoidance / break habit',
};

export const HabitDetailView: React.FC<HabitDetailViewProps> = ({
  habit,
  logs,
  restDays,
  categories,
  onBack,
  onEdit,
  onApplyRestToken,
  onRemoveRestToken,
  onDeleteLog,
}) => {
  const todayKey = getTodayKey();
  const [range, setRange] = useState<HistoryRange>('30d');

  const { startDate, endDate } = useMemo(() => {
    const end = todayKey;
    if (range === '7d') return { startDate: addDaysToKey(end, -6), endDate: end };
    if (range === '30d') return { startDate: addDaysToKey(end, -29), endDate: end };
    if (range === '90d') return { startDate: addDaysToKey(end, -89), endDate: end };

    const habitDates = logs
      .filter((l) => l.habitId === habit.id)
      .map((l) => l.date)
      .sort();
    return {
      startDate: habitDates[0] || addDaysToKey(end, -29),
      endDate: end,
    };
  }, [range, todayKey, logs, habit.id]);

  const stats = useMemo(
    () =>
      calculateHabitDetailStats(habit, logs, restDays, {
        startDate,
        endDate,
        referenceDateKey: todayKey,
      }),
    [habit, logs, restDays, startDate, endDate, todayKey]
  );

  const method = getHabitTrackingMethod(habit);
  const unitLabel = getHabitUnitLabel(habit);
  const targetVal = getHabitTargetValue(habit);
  const isMeasurable = method === 'duration' || method === 'quantity' || method === 'frequency';

  const categoryLabel = useMemo(() => {
    if (!habit.category || habit.category === 'uncategorized') return 'Uncategorized';
    if (habit.customCategory) return habit.customCategory;
    const allCats = [...DEFAULT_HABIT_CATEGORIES, ...categories];
    return allCats.find((c) => c.id === habit.category)?.label || habit.category;
  }, [habit.category, habit.customCategory, categories]);

  const scheduleSummary = useMemo(() => {
    const rec = habit.recurrence || 'daily';
    if (rec === 'daily') return 'Every day';
    if (rec === 'weekdays') {
      const days = (habit.scheduledDays || [])
        .slice()
        .sort((a, b) => a - b)
        .map((d) => DAY_NAMES[d] || '');
      return days.length > 0 ? `Days: ${days.join(', ')}` : 'Selected weekdays';
    }
    if (rec === 'weekly_target') {
      return `${habit.weeklyTargetCount || habit.targetCount || 3} days / week`;
    }
    if (rec === 'interval') {
      return `Every ${habit.intervalDays || 2} days`;
    }
    return 'Every day';
  }, [habit]);

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header Bar */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-heading font-bold text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Habits</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(habit)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Habit</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-[rgb(var(--c-surface2))] text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
                {categoryLabel}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-[10px] font-heading text-[rgb(var(--c-muted))]">
                {METHOD_LABELS[method] || method}
              </span>
              {habit.status && habit.status !== 'active' && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-heading font-bold capitalize">
                  {habit.status}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))]">
              {habit.title}
            </h2>
            {habit.description && (
              <p className="text-xs text-[rgb(var(--c-muted))] font-flourish leading-relaxed">
                {habit.description}
              </p>
            )}
            <div className="text-xs text-[rgb(var(--c-muted))] flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {scheduleSummary}
              </span>
              {targetVal !== null && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" />
                    Target: {targetVal} {unitLabel}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1 bg-[rgb(var(--c-bg))] p-1 rounded-xl border border-[rgb(var(--c-border))] self-start">
            {([
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: '90d', label: '90D' },
              { id: 'all', label: 'All' },
            ] as { id: HistoryRange; label: string }[]).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRange(opt.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-heading font-bold transition cursor-pointer ${
                  range === opt.id
                    ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-3.5">
          <div className="text-[11px] font-heading text-[rgb(var(--c-muted))] flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Current Streak</span>
          </div>
          <div className="text-xl font-heading font-bold text-[rgb(var(--c-text))] mt-1">
            {stats.currentStreak}d
          </div>
          <div className="text-[11px] text-[rgb(var(--c-muted))]">
            Best: {stats.bestStreak}d
          </div>
        </div>

        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-3.5">
          <div className="text-[11px] font-heading text-[rgb(var(--c-muted))] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Total Logged</span>
          </div>
          <div className="text-xl font-heading font-bold text-[rgb(var(--c-text))] mt-1">
            {stats.totalCompletions}
          </div>
          <div className="text-[11px] text-[rgb(var(--c-muted))]">
            All-time completions
          </div>
        </div>

        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-3.5">
          <div className="text-[11px] font-heading text-[rgb(var(--c-muted))] flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
            <span>Range Rate ({range.toUpperCase()})</span>
          </div>
          <div className="text-xl font-heading font-bold text-[rgb(var(--c-text))] mt-1">
            {stats.completionPercentage}%
          </div>
          <div className="text-[11px] text-[rgb(var(--c-muted))]">
            {stats.scheduledDaysEvaluated} scheduled days
          </div>
        </div>

        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-3.5">
          <div className="text-[11px] font-heading text-[rgb(var(--c-muted))] flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-violet-500" />
            <span>Consistency</span>
          </div>
          <div className="text-xl font-heading font-bold text-[rgb(var(--c-text))] mt-1">
            {stats.weeklyConsistency}%
          </div>
          <div className="text-[11px] text-[rgb(var(--c-muted))]">
            7d · {stats.monthlyConsistency}% 30d
          </div>
        </div>
      </div>

      {/* Measurable Value Summary (when duration/quantity/frequency) */}
      {isMeasurable && (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[rgb(var(--c-surface2))] flex items-center justify-center text-[rgb(var(--c-primary))]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                Measured Progress ({range.toUpperCase()})
              </div>
              <div className="text-[11px] text-[rgb(var(--c-muted))]">
                Total logged: <strong className="text-[rgb(var(--c-text))]">{stats.totalValue} {unitLabel}</strong>
                {stats.averageValue !== null && (
                  <>
                    {' '}· Avg per active day:{' '}
                    <strong className="text-[rgb(var(--c-text))]">{stats.averageValue} {unitLabel}</strong>
                  </>
                )}
              </div>
            </div>
          </div>
          {targetVal !== null && (
            <div className="px-3 py-1.5 rounded-xl bg-[#B6E63E]/15 border border-[#B6E63E]/40 text-xs font-heading font-bold text-emerald-700 dark:text-[#B6E63E]">
              Target reached {stats.targetHitCount} time{stats.targetHitCount === 1 ? '' : 's'}
            </div>
          )}
        </div>
      )}

      {/* Visual Monthly Calendar */}
      <StreakCalendar
        habit={habit}
        logs={logs}
        restDays={restDays}
        onApplyRestToken={onApplyRestToken}
        onRemoveRestToken={onRemoveRestToken}
        rangeStart={startDate}
        rangeEnd={endDate}
      />

      {/* Recent Logs Feed */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
            Logging History ({stats.recentLogs.length})
          </h3>
          <span className="text-[11px] text-[rgb(var(--c-muted))]">
            {formatDisplayDate(startDate)} — {formatDisplayDate(endDate)}
          </span>
        </div>

        {stats.recentLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-[rgb(var(--c-muted))] font-flourish">
            No logs recorded in this date range yet.
          </div>
        ) : (
          <div className="divide-y divide-[rgb(var(--c-border))]">
            {stats.recentLogs.map((log) => {
              const isSkipped = log.status === 'skipped';
              const isPartial = log.status === 'partial' || log.isPartial;
              const val = typeof log.value === 'number' ? log.value : log.count;

              return (
                <div
                  key={log.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-bold text-[rgb(var(--c-text))]">
                        {formatDisplayDate(log.date)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-heading font-bold ${
                          isSkipped
                            ? 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))]'
                            : isPartial
                            ? 'bg-lime-500/15 text-lime-700 dark:text-lime-300'
                            : 'bg-[#B6E63E]/20 text-emerald-700 dark:text-[#B6E63E]'
                        }`}
                      >
                        {isSkipped ? 'Skipped' : isPartial ? 'Partial / Mini' : 'Completed'}
                      </span>
                      {!isSkipped && isMeasurable && val > 0 && (
                        <span className="text-[11px] font-mono text-[rgb(var(--c-text))]">
                          {val} {log.unit || unitLabel}
                        </span>
                      )}
                    </div>
                    {log.note && (
                      <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish truncate">
                        {log.note}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteLog(log)}
                    className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500 hover:bg-[rgb(var(--c-surface2))] transition cursor-pointer shrink-0"
                    title="Remove this log entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
