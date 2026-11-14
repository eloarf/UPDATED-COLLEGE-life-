import React from 'react';
import { Flame, Shield, Plus } from 'lucide-react';
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
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-heading text-xs font-bold text-[rgb(var(--c-muted))]">
          <Shield className="w-3.5 h-3.5 text-amber-500" />
          <span>{remainingTokens} rest tokens left this week</span>
        </div>
        <button
          onClick={() => onNavigate('#/habits')}
          className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] cursor-pointer"
        >
          Habit Tracker →
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="text-center py-5 text-xs text-[rgb(var(--c-muted))] space-y-2.5">
          <div>No habits added yet.</div>
          <button
            onClick={() => onNavigate('#/habits')}
            className="px-3.5 py-1.5 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add your first habit</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {habits.slice(0, 4).map((habit) => {
            const todayLog = habitLogs.find((l) => l.habitId === habit.id);
            const isStamped = !!todayLog;
            const habitStreak = calculateHabitStreak(habit.id, allHabitLogs, restDays, todayKey);
            return (
              <button
                key={habit.id}
                onClick={() => handleToggleHabit(habit.id)}
                className={`min-h-[70px] p-3 rounded-xl border text-center transition active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                  isStamped
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[rgb(var(--c-primary))]'
                }`}
              >
                <div className="flex items-center gap-1 max-w-full">
                  <Flame className="w-3 h-3 text-rose-500 shrink-0" />
                  <span className="text-xs font-heading leading-tight truncate">
                    {habit.title}
                  </span>
                </div>
                <div className="text-[10px] text-[rgb(var(--c-muted))]">
                  {isStamped
                    ? todayLog?.isPartial
                      ? '✓ Mini done'
                      : '✓ Done (+10 XP)'
                    : `${habitStreak.currentStreak}d • ${remainingTokens} rest`}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
