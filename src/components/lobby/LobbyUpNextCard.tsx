import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { Task } from '../../types';
import { UpNextResult } from '../../utils/todayEngine';

interface LobbyUpNextCardProps {
  upNext: UpNextResult;
  tasks: Task[];
  onStartFocus: (item: { taskId: string; taskTitle: string; courseId?: string }) => void;
  onNavigate: (route: string) => void;
  onTaskClick: (task: Task) => void;
  onToggleHabit: (habitId: string) => void;
}

export const LobbyUpNextCard: React.FC<LobbyUpNextCardProps> = ({
  upNext,
  tasks,
  onStartFocus,
  onNavigate,
  onTaskClick,
  onToggleHabit,
}) => {
  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 shadow-xs border-l-4 border-l-[rgb(var(--c-primary))]">
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[rgb(var(--c-border))]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-heading uppercase font-bold text-[rgb(var(--c-primary))]">
            Up Next
          </span>
        </div>
        <span className="text-xs text-[rgb(var(--c-muted))]">
          {upNext.scheduledTime ? `Scheduled ${upNext.scheduledTime}` : upNext.category}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 flex-1">
          <h2 className="text-base sm:text-lg font-heading font-bold text-[rgb(var(--c-text))]">
            {upNext.title}
          </h2>
          {upNext.reason && (
            <p className="text-xs text-[rgb(var(--c-muted))]">
              {upNext.reason}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              onStartFocus({
                taskId: upNext.id.startsWith('task-') ? upNext.id.replace('task-', '') : upNext.id,
                taskTitle: upNext.title,
                courseId: upNext.courseId,
              });
              onNavigate('#/focus');
            }}
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[rgb(var(--c-primary))] text-xs font-heading font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Focus Session</span>
          </button>

          <button
            onClick={() => {
              if (upNext.actionType === 'navigate' && upNext.route) {
                onNavigate(upNext.route);
              } else if (upNext.actionType === 'complete_task' && upNext.taskId) {
                const targetTask = tasks.find((t) => t.id === upNext.taskId);
                if (targetTask) onTaskClick(targetTask);
              } else if (upNext.actionType === 'stamp_habit' && upNext.habitId) {
                onToggleHabit(upNext.habitId);
              } else {
                onNavigate(upNext.route || '#/tasks');
              }
            }}
            className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition flex items-center gap-1 cursor-pointer"
          >
            <span>{upNext.actionLabel}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
