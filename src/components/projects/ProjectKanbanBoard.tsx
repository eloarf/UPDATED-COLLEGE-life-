import React from 'react';
import { Layers, Plus, X } from 'lucide-react';
import { ProjectTask } from '../../types';

interface ProjectKanbanBoardProps {
  tasks: ProjectTask[];
  onMoveTask: (taskId: string, column: ProjectTask['column']) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenAddTaskModal: () => void;
}

export const ProjectKanbanBoard: React.FC<ProjectKanbanBoardProps> = ({
  tasks,
  onMoveTask,
  onDeleteTask,
  onOpenAddTaskModal,
}) => {
  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#4FA3A5]/15 text-[#4FA3A5] flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
              Execution Pipeline Kanban
            </h3>
            <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
              Move granular subtasks across the four pipeline stations
            </p>
          </div>
        </div>
        <button
          onClick={onOpenAddTaskModal}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#4FA3A5] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-2xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Task</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {(['todo', 'doing', 'review', 'done'] as const).map((col) => {
          const colTasks = tasks.filter((t) => t.column === col);
          const colLabels: Record<string, string> = {
            todo: 'To Do',
            doing: 'In Progress',
            review: 'Review',
            done: 'Done',
          };

          return (
            <div
              key={col}
              className="p-3.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2.5 flex flex-col min-h-[160px]"
            >
              <div className="flex items-center justify-between text-xs font-heading font-bold uppercase tracking-wider text-[rgb(var(--c-muted))]">
                <span>{colLabels[col]}</span>
                <span className="px-2 py-0.5 rounded-full bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[10px] text-[rgb(var(--c-text))]">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-2 flex-1">
                {colTasks.length === 0 ? (
                  <div className="h-full min-h-[60px] flex items-center justify-center text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                    Empty station
                  </div>
                ) : (
                  colTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                          {t.title}
                        </span>
                        <button
                          onClick={() => onDeleteTask(t.id)}
                          className="text-[rgb(var(--c-muted))] hover:text-red-500 p-0.5 transition cursor-pointer"
                          title="Delete task"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Quick Move Buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-[rgb(var(--c-border))]/60 text-[9px] text-[rgb(var(--c-muted))]">
                        <span className="font-heading">Move:</span>
                        <div className="flex gap-1 flex-wrap">
                          {col !== 'todo' && (
                            <button
                              onClick={() => onMoveTask(t.id, 'todo')}
                              className="px-1.5 py-0.5 rounded bg-[rgb(var(--c-surface2))] hover:bg-[#4FA3A5] hover:text-white transition cursor-pointer"
                            >
                              To Do
                            </button>
                          )}
                          {col !== 'doing' && (
                            <button
                              onClick={() => onMoveTask(t.id, 'doing')}
                              className="px-1.5 py-0.5 rounded bg-[rgb(var(--c-surface2))] hover:bg-[#4FA3A5] hover:text-white transition cursor-pointer"
                            >
                              Doing
                            </button>
                          )}
                          {col !== 'review' && (
                            <button
                              onClick={() => onMoveTask(t.id, 'review')}
                              className="px-1.5 py-0.5 rounded bg-[rgb(var(--c-surface2))] hover:bg-purple-600 hover:text-white transition cursor-pointer"
                            >
                              Review
                            </button>
                          )}
                          {col !== 'done' && (
                            <button
                              onClick={() => onMoveTask(t.id, 'done')}
                              className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-600 hover:text-white transition cursor-pointer font-bold"
                            >
                              Done
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
