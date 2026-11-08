import React from 'react';
import { Flame } from 'lucide-react';
import { Habit, HabitLog, RestDay } from '../../types';
import { calculateHabitStreak } from '../../utils/streakEngine';

interface LobbyHabitsSectionProps {
  habits: Habit[];
  habitLogs: HabitLog[];
  allHabitLogs: HabitLog[];
  restDays: RestDay[];
  todayKey: string;
  remainingTokens: number;
  handleToggleHabit: (habitId: string) => void;
  onNavigate: (route: string) => void;
}

export const LobbyHabitsSection: React.FC<LobbyHabitsSectionProps> = ({
  habits,
  habitLogs,
  allHabitLogs,
  restDays,
  todayKey,
  remainingTokens,
  handleToggleHabit,
  onNavigate,
}) => {
  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
        <div className="flex items-center gap-2 font-heading text-xs sm:text-sm font-bold text-[rgb(var(--c-text))]">
          <Flame className="w-4 h-4 text-rose-500" />
          <span>Habits Check-In</span>
          <span className="text-xs text-[rgb(var(--c-muted))] font-normal">
            ({remainingTokens} rest tokens remaining)
          </span>
        </div>
        <button
          onClick={() => onNavigate('#/habits')}
          className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] cursor-pointer"
        >
          Habit Tracker →
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="text-center py-4 text-xs text-[rgb(var(--c-muted))]">
          No habits created yet. Track reading, hydration, or sleep in Habit Tracker.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {habits.slice(0, 4).map((habit) => {
            const isStamped = habitLogs.some((l) => l.habitId === habit.id);
            const habitStreak = calculateHabitStreak(habit.id, allHabitLogs, restDays, todayKey);
            return (
              <button
                key={habit.id}
                onClick={() => handleToggleHabit(habit.id)}
                className={`min-h-[64px] p-3 rounded-xl border text-center transition active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  isStamped
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[rgb(var(--c-primary))]'
                }`}
              >
                <div className="text-xs font-heading leading-tight truncate max-w-full">
                  {habit.title}
                </div>
                <div className="text-[10px] text-[rgb(var(--c-muted))]">
                  {isStamped ? '✓ Done (+10 XP)' : `${habitStreak.currentStreak}d streak`}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
