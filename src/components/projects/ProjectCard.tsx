import React from 'react';
import { Layers, CheckSquare, ChevronRight } from 'lucide-react';
import { Project, ProjectMilestone, ProjectTask, Course } from '../../types';

interface ProjectCardProps {
  project: Project;
  course: Course | undefined;
  progress: number;
  milestones: ProjectMilestone[];
  tasks: ProjectTask[];
  onSelectProject: (id: string) => void;
  renderStatusBadge: (status: Project['status']) => React.ReactNode;
  getDeadlineBadge: (deadline?: string) => React.ReactNode;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  course,
  progress,
  milestones,
  tasks,
  onSelectProject,
  renderStatusBadge,
  getDeadlineBadge,
}) => {
  const pMilestones = milestones.filter((m) => m.projectId === project.id);
  const pTasks = tasks.filter((t) => t.projectId === project.id);
  const doneMilestones = pMilestones.filter((m) => m.isDone).length;
  const doneTasks = pTasks.filter((t) => t.column === 'done').length;

  return (
    <div
      onClick={() => onSelectProject(project.id)}
      className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 cursor-pointer hover:border-[#4FA3A5] transition-all hover:shadow-xs group space-y-3 relative"
    >
      {/* Top Badges */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {course ? (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-heading font-bold text-white shadow-2xs"
              style={{ backgroundColor: course.color || '#4FA3A5' }}
            >
              {course.code}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-bold bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))]">
              General
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider bg-[#4FA3A5]/10 text-[#4FA3A5]">
            {project.type}
          </span>
          {renderStatusBadge(project.status)}
        </div>
        {getDeadlineBadge(project.deadline)}
      </div>

      {/* Title & Description */}
      <div>
        <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))] group-hover:text-[#4FA3A5] transition-colors">
          {project.title}
        </h3>
        {project.description && (
          <p className="text-xs text-[rgb(var(--c-muted))] line-clamp-2 mt-1 font-flourish">
            {project.description}
          </p>
        )}
      </div>

      {/* Progress Bar & Stats */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px] font-heading">
          <span className="text-[rgb(var(--c-muted))]">Dungeon Completion</span>
          <span className="font-bold text-[rgb(var(--c-text))]">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-[rgb(var(--c-bg))] rounded-full overflow-hidden border border-[rgb(var(--c-border))] p-0.2">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              progress === 100 ? 'bg-emerald-500' : 'bg-[#4FA3A5]'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Bottom Metadata & Navigation CTA */}
      <div className="flex items-center justify-between pt-2 border-t border-[rgb(var(--c-border))]/60 text-xs text-[rgb(var(--c-muted))]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-heading text-[11px]">
            <Layers className="w-3.5 h-3.5 text-[#4FA3A5]" />
            <span>{doneMilestones}/{pMilestones.length} Floors</span>
          </span>
          <span className="flex items-center gap-1 font-heading text-[11px]">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span>{doneTasks}/{pTasks.length} Tasks</span>
          </span>
          {project.weight && (
            <span className="text-[11px] font-heading text-[rgb(var(--c-muted))]">
              Weight: {project.weight}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 font-heading font-bold text-xs text-[#4FA3A5] group-hover:translate-x-1 transition-transform">
          <span>Open Detail</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
