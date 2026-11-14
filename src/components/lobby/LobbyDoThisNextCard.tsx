import React from 'react';
import { DoThisNextResult } from '../../utils/todayEngine';
import { Task } from '../../types';
import { Play, CheckCircle2, Flame, Calendar, ArrowRight, Sparkles } from 'lucide-react';

interface LobbyDoThisNextCardProps {
  item: DoThisNextResult;
  tasks: Task[];
  onStartFocus: (task: Task | null) => void;
  onNavigate: (route: string) => void;
  onTaskClick: (task: Task) => void;
  onToggleHabit: (habitId: string) => void;
}

export const LobbyDoThisNextCard: React.FC<LobbyDoThisNextCardProps> = ({
  item,
  tasks,
  onStartFocus,
  onNavigate,
  onTaskClick,
  onToggleHabit,
}) => {
  const isAllClear = item.kind === 'all_clear';

  const handlePrimaryAction = () => {
    if (item.actionType === 'complete_task' && item.taskId) {
      const target = tasks.find((t) => t.id === item.taskId);
      if (target) {
        onTaskClick(target);
        return;
      }
    }
    if (item.actionType === 'stamp_habit' && item.habitId) {
      onToggleHabit(item.habitId);
      return;
    }
    if (item.actionType === 'focus') {
      const target = item.taskId ? tasks.find((t) => t.id === item.taskId) || null : null;
      onStartFocus(target);
      onNavigate('#/focus');
      return;
    }
    onNavigate(item.route || '#/today');
  };

  return (
    <div
      className={`ticket-border rounded-2xl p-4 sm:p-5 shadow-xs transition-colors ${
        isAllClear
          ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-500/40'
          : 'bg-[rgb(var(--c-surface))]'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest font-heading font-bold text-[rgb(var(--c-primary))]">
              Do this next
            </span>
            <span
              className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-md text-stone-950"
              style={{ backgroundColor: item.accentColor || '#B6E63E' }}
            >
              {item.badgeText}
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-heading font-bold text-[rgb(var(--c-text))] truncate">
            {item.title}
          </h2>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            {item.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAllClear ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-heading text-xs font-bold">
              <Sparkles className="w-4 h-4" />
              <span>All Clear</span>
            </div>
          ) : (
            <button
              onClick={handlePrimaryAction}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              {item.actionType === 'focus' && <Play className="w-3.5 h-3.5 fill-current" />}
              {item.actionType === 'complete_task' && <CheckCircle2 className="w-3.5 h-3.5" />}
              {item.actionType === 'stamp_habit' && <Flame className="w-3.5 h-3.5" />}
              {item.actionType === 'navigate' && <Calendar className="w-3.5 h-3.5" />}
              <span>{item.actionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
