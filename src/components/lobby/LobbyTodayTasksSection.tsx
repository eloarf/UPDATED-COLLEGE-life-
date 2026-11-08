import React from 'react';
import { CheckCircle2, Circle, Plus } from 'lucide-react';
import { Task } from '../../types';
import { getQuestXpReward } from '../../services/rpgService';

interface LobbyTodayTasksSectionProps {
  todayTasks: Task[];
  lowEnergy: boolean;
  quickTaskTitle: string;
  setQuickTaskTitle: (val: string) => void;
  handleQuickAddTask: (e: React.FormEvent) => void;
  handleTaskClick: (task: Task) => void;
  onNavigate: (route: string) => void;
}

export const LobbyTodayTasksSection: React.FC<LobbyTodayTasksSectionProps> = ({
  todayTasks,
  lowEnergy,
  quickTaskTitle,
  setQuickTaskTitle,
  handleQuickAddTask,
  handleTaskClick,
  onNavigate,
}) => {
  const pendingCount = todayTasks.filter((t) => t.status !== 'done').length;

  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
            Today's Tasks ({pendingCount} pending)
          </h2>
        </div>
        <button
          onClick={() => onNavigate('#/tasks')}
          className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] cursor-pointer"
        >
          All Tasks →
        </button>
      </div>

      {/* Inline Quick Add */}
      <form onSubmit={handleQuickAddTask} className="flex items-center gap-2">
        <input
          type="text"
          value={quickTaskTitle}
          onChange={(e) => setQuickTaskTitle(e.target.value)}
          placeholder="Add a task for today... (Press Enter)"
          className="min-h-[40px] flex-1 px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
        />
        <button
          type="submit"
          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#7A2E4A] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shrink-0 flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </form>

      {/* Task List */}
      <div className="space-y-1.5">
        {todayTasks.length === 0 ? (
          <div className="text-center py-6 text-xs text-[rgb(var(--c-muted))]">
            No tasks scheduled for today. Type above to quickly capture one!
          </div>
        ) : (
          todayTasks.slice(0, lowEnergy ? 3 : 5).map((task) => {
            const isDone = task.status === 'done';
            const xpReward = getQuestXpReward(task);

            return (
              <div
                key={task.id}
                className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] transition ${
                  isDone ? 'opacity-60' : 'hover:border-[#7A2E4A]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Instant 1-Click Toggle: 44px touch target on mobile */}
                  <button
                    onClick={() => handleTaskClick(task)}
                    className="min-h-[40px] min-w-[40px] -m-1.5 flex items-center justify-center text-[#7A2E4A] shrink-0 transition active:scale-90 focus:outline-none cursor-pointer"
                    title={isDone ? 'Click to reopen' : 'Click to complete'}
                    aria-label={isDone ? 'Reopen task' : 'Complete task'}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                    ) : (
                      <Circle className="w-5 h-5 text-[rgb(var(--c-muted))] hover:text-emerald-600" />
                    )}
                  </button>
                  <span
                    className={`text-xs font-medium truncate ${
                      isDone ? 'line-through text-[rgb(var(--c-muted))]' : 'text-[rgb(var(--c-text))]'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-xs text-[rgb(var(--c-muted))]">
                  {task.dueTime && (
                    <span className="text-[11px] font-mono">{task.dueTime}</span>
                  )}
                  <span className="text-[10px] font-heading font-bold text-[rgb(var(--c-xp))]">
                    +{xpReward} XP
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
