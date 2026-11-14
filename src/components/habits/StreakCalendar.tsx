import React, { useState } from 'react';
import { Habit, HabitLog, RestDay } from '../../types';
import {
  calculateHabitStreak,
  getHabitDayState,
  getHabitTrackingMethod,
  getHabitUnitLabel,
  getRemainingRestTokens,
  getWeekBounds,
  MAX_WEEKLY_REST_TOKENS,
} from '../../utils/streakEngine';
import {
  getTodayKey,
  DAY_NAMES,
} from '../../utils/dateUtils';
import {
  Flame,
  Shield,
  ChevronLeft,
  ChevronRight,
  Check,
  Calendar as CalendarIcon,
  Info,
  Minus,
} from 'lucide-react';

interface StreakCalendarProps {
  habit: Habit;
  logs: HabitLog[];
  restDays: RestDay[];
  onApplyRestToken?: (dateKey: string) => void;
  onRemoveRestToken?: (restDayId: string) => void;
  rangeStart?: string;
  rangeEnd?: string;
}

export const StreakCalendar: React.FC<StreakCalendarProps> = ({
  habit,
  logs,
  restDays,
  onApplyRestToken,
  onRemoveRestToken,
  rangeStart,
  rangeEnd,
}) => {
  const todayKey = getTodayKey();
  const [viewDate, setViewDate] = useState(() => new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const monthTitle = firstDayOfMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Calculate grid offsets: 0 = Mon .. 6 = Sun
  const startDay = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
  const totalDays = lastDayOfMonth.getDate();

  const dayCells: (string | null)[] = [];
  for (let i = 0; i < startDay; i++) {
    dayCells.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dayCells.push(dStr);
  }

  const streak = calculateHabitStreak(habit.id, logs, restDays, todayKey, habit);
  const remainingTokens = getRemainingRestTokens(restDays, todayKey);
  const { mondayKey, sundayKey } = getWeekBounds(todayKey);
  const method = getHabitTrackingMethod(habit);
  const unitLabel = getHabitUnitLabel(habit);

  // Month stats
  let monthCompletedCount = 0;
  let monthPartialCount = 0;
  let monthRestCount = 0;
  let monthSkippedCount = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const info = getHabitDayState(habit, logs, restDays, dStr, todayKey);
    if (info.state === 'completed') monthCompletedCount++;
    else if (info.state === 'partial') monthPartialCount++;
    else if (info.state === 'rested') monthRestCount++;
    else if (info.state === 'skipped') monthSkippedCount++;
  }

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleCellClick = (dateKey: string) => {
    if (dateKey > todayKey) return;

    const info = getHabitDayState(habit, logs, restDays, dateKey, todayKey);
    if (info.restDay) {
      if (onRemoveRestToken) {
        onRemoveRestToken(info.restDay.id);
      }
      return;
    }

    if (info.state !== 'completed' && info.state !== 'partial' && info.state !== 'unscheduled') {
      if (remainingTokens > 0 && onApplyRestToken) {
        onApplyRestToken(dateKey);
      }
    }
  };

  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgb(var(--c-border))]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-heading tracking-widest text-[#B6E63E] font-bold flex items-center gap-1">
              <CalendarIcon className="w-3 h-3" />
              Streak Matrix
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-bold">
              {habit.title}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <div className="flex items-center gap-1 text-sm font-heading font-bold text-[rgb(var(--c-text))]">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>{streak.currentStreak} day streak</span>
            </div>
            <div className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Best: <strong className="text-[rgb(var(--c-text))]">{streak.bestStreak}d</strong>
            </div>
          </div>
        </div>

        {/* Month Navigation & Rest Token Pill */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-heading font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>
              {remainingTokens} / {MAX_WEEKLY_REST_TOKENS} Rest Tokens
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] transition active:scale-95 text-[rgb(var(--c-text))]"
              title="Previous month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-heading font-bold px-2.5 py-1 rounded-lg bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] min-w-[110px] text-center">
              {monthTitle}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] transition active:scale-95 text-[rgb(var(--c-text))]"
              title="Next month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Labels (Mon - Sun) */}
      <div className="grid grid-cols-7 text-center font-heading text-[10px] uppercase tracking-wider text-[rgb(var(--c-muted))] font-bold pb-1">
        {DAY_NAMES.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {dayCells.map((dayKey, idx) => {
          if (!dayKey) {
            return <div key={`empty-${idx}`} className="h-11 sm:h-13 rounded-xl" />;
          }

          const isToday = dayKey === todayKey;
          const isFuture = dayKey > todayKey;
          const dayNum = parseInt(dayKey.slice(8), 10);
          const isInCurrentWeek = dayKey >= mondayKey && dayKey <= sundayKey;
          const info = getHabitDayState(habit, logs, restDays, dayKey, todayKey);
          const logVal = info.log?.value;

          const outOfRange =
            (rangeStart && dayKey < rangeStart) || (rangeEnd && dayKey > rangeEnd);

          let cellClass =
            'border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]';

          if (info.state === 'completed') {
            cellClass =
              'border-[#B6E63E] bg-[#B6E63E]/20 text-emerald-700 dark:text-[#B6E63E] font-bold shadow-xs';
          } else if (info.state === 'partial') {
            cellClass =
              'border-lime-500/60 bg-lime-500/15 text-lime-700 dark:text-lime-300 font-bold';
          } else if (info.state === 'rested') {
            cellClass =
              'border-amber-500/50 bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold';
          } else if (info.state === 'skipped') {
            cellClass =
              'border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))]/70 text-[rgb(var(--c-muted))]';
          } else if (info.state === 'unscheduled') {
            cellClass =
              'border-dashed border-[rgb(var(--c-border))]/60 bg-transparent text-[rgb(var(--c-muted))]/60';
          } else if (isToday) {
            cellClass =
              'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))] font-bold';
          } else if (isFuture) {
            cellClass =
              'border-transparent bg-transparent text-[rgb(var(--c-muted))]/40 opacity-40 cursor-default';
          }

          const shortMeasureLabel =
            typeof logVal === 'number' && logVal > 0 && (method === 'duration' || method === 'quantity' || method === 'frequency')
              ? `${logVal}${unitLabel === 'min' ? 'm' : unitLabel === 'hours' || unitLabel === 'hr' ? 'h' : ''}`
              : null;

          let bottomLabel = '';
          if (info.state === 'completed') {
            bottomLabel = shortMeasureLabel || 'Done';
          } else if (info.state === 'partial') {
            bottomLabel = shortMeasureLabel || 'Mini';
          } else if (info.state === 'rested') {
            bottomLabel = 'Rest';
          } else if (info.state === 'skipped') {
            bottomLabel = 'Skip';
          } else if (info.state === 'unscheduled' && !isFuture) {
            bottomLabel = 'Off';
          }

          const titleText =
            info.state === 'completed'
              ? `${dayKey}: Completed${shortMeasureLabel ? ` (${logVal} ${unitLabel})` : ''}`
              : info.state === 'partial'
              ? `${dayKey}: Partial / minimum${shortMeasureLabel ? ` (${logVal} ${unitLabel})` : ''}`
              : info.state === 'rested'
              ? `${dayKey}: Rest Token applied (Tap to remove)`
              : info.state === 'skipped'
              ? `${dayKey}: Skipped cleanly`
              : info.state === 'unscheduled'
              ? `${dayKey}: Off-schedule day`
              : !isFuture && isInCurrentWeek && remainingTokens > 0
              ? `${dayKey}: Tap to apply Rest Token (${remainingTokens} left)`
              : `${dayKey}`;

          return (
            <button
              type="button"
              key={dayKey}
              disabled={isFuture || info.state === 'unscheduled'}
              onClick={() => handleCellClick(dayKey)}
              className={`h-11 sm:h-13 rounded-xl p-1 flex flex-col items-center justify-between transition-all relative group ${cellClass} ${
                outOfRange ? 'opacity-45' : ''
              } ${
                !isFuture && info.state !== 'unscheduled'
                  ? 'active:scale-95 hover:border-[rgb(var(--c-primary))] cursor-pointer'
                  : 'cursor-default'
              }`}
              title={titleText}
            >
              <div className="w-full flex items-center justify-between text-[10px]">
                <span className="font-mono">{dayNum}</span>
                {isToday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--c-primary))]" />
                )}
              </div>

              <div className="flex items-center justify-center my-auto">
                {info.state === 'completed' ? (
                  <div className="w-5 h-5 rounded-full bg-[#B6E63E] text-stone-950 flex items-center justify-center shadow-2xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                ) : info.state === 'partial' ? (
                  <div className="w-5 h-5 rounded-full bg-lime-400/70 text-stone-950 flex items-center justify-center shadow-2xs">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </div>
                ) : info.state === 'rested' ? (
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shadow-2xs">
                    <Shield className="w-3 h-3 fill-stone-950" />
                  </div>
                ) : info.state === 'skipped' ? (
                  <div className="w-4 h-4 rounded-full bg-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] flex items-center justify-center">
                    <Minus className="w-2.5 h-2.5" />
                  </div>
                ) : info.state === 'unscheduled' ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--c-border))]" />
                ) : !isFuture ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-[rgb(var(--c-muted))]/30 group-hover:bg-amber-400 transition" />
                ) : null}
              </div>

              <div className="text-[8px] uppercase tracking-tighter opacity-85 leading-none truncate max-w-full">
                {bottomLabel}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend & Monthly Summary */}
      <div className="pt-3 border-t border-[rgb(var(--c-border))] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[rgb(var(--c-muted))] font-flourish">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#B6E63E] inline-block shadow-2xs" />
            <span>Done ({monthCompletedCount}d)</span>
          </div>
          {monthPartialCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-lime-400/70 inline-block" />
              <span>Partial ({monthPartialCount}d)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-2xs" />
            <span>Rest ({monthRestCount}d)</span>
          </div>
          {monthSkippedCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[rgb(var(--c-border))] inline-block" />
              <span>Skipped ({monthSkippedCount}d)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border border-dashed border-[rgb(var(--c-border))] inline-block" />
            <span>Off-day</span>
          </div>
        </div>

        <div className="text-[11px] text-[rgb(var(--c-muted))] flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Tap any scheduled day to apply or remove a Rest Token.</span>
        </div>
      </div>
    </div>
  );
};
