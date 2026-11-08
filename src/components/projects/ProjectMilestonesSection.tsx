import React from 'react';
import { Compass, Plus, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { ProjectMilestone } from '../../types';

interface ProjectMilestonesSectionProps {
  milestones: ProjectMilestone[];
  onToggleMilestone: (m: ProjectMilestone) => void;
  onDeleteMilestone: (m: ProjectMilestone) => void;
  onOpenAddMilestoneModal: () => void;
}

export const ProjectMilestonesSection: React.FC<ProjectMilestonesSectionProps> = ({
  milestones,
  onToggleMilestone,
  onDeleteMilestone,
  onOpenAddMilestoneModal,
}) => {
  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#4FA3A5]/15 text-[#4FA3A5] flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
              Dungeon Floors &amp; Key Milestones
            </h3>
            <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
              Clear floors in sequence to progress through the dungeon (+75 Teamwork XP per floor)
            </p>
          </div>
        </div>
        <button
          onClick={onOpenAddMilestoneModal}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#4FA3A5] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-2xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Floor</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {milestones.length === 0 ? (
          <div className="p-4 text-center rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs text-[rgb(var(--c-muted))] font-flourish">
            No dungeon floor milestones defined yet. Click &quot;Add Floor&quot; to establish your deliverables.
          </div>
        ) : (
          milestones.map((m, idx) => (
            <div
              key={m.id}
              className={`flex items-center justify-between p-3.5 rounded-2xl border transition group ${
                m.isDone
                  ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[#4FA3A5]'
              }`}
            >
              <div
                onClick={() => onToggleMilestone(m)}
                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
              >
                {m.isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-stone-400 group-hover:text-[#4FA3A5] shrink-0 transition" />
                )}
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-xs sm:text-sm font-heading font-bold truncate ${
                      m.isDone ? 'line-through text-[rgb(var(--c-muted))]' : 'text-[rgb(var(--c-text))]'
                    }`}
                  >
                    {m.title}
                  </div>
                  <div className="text-[10px] text-[rgb(var(--c-muted))] font-heading">
                    Dungeon Floor #{idx + 1} {m.isDone ? '• Cleared' : '• In Progress'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-2 shrink-0">
                <span className="text-[10px] font-heading font-bold text-[rgb(var(--c-xp))]">
                  +75 XP
                </span>
                <button
                  onClick={() => onDeleteMilestone(m)}
                  className="p-1 text-[rgb(var(--c-muted))] hover:text-red-500 opacity-60 group-hover:opacity-100 transition cursor-pointer"
                  title="Delete Floor"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
