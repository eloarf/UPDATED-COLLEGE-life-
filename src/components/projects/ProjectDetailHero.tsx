import React from 'react';
import {
  ChevronLeft,
  Share2,
  Edit3,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Calendar,
} from 'lucide-react';
import { Project, Course } from '../../types';
import { formatDisplayDate } from '../../utils/dateUtils';

interface ProjectDetailHeroProps {
  project: Project;
  course: Course | undefined;
  progress: number;
  isCompleted: boolean;
  onBack: () => void;
  onShareStatus: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateStatus: (status: Project['status']) => void;
  renderStatusBadge: (status: Project['status']) => React.ReactNode;
  getDeadlineBadge: (dlDate?: string) => React.ReactNode;
}

export const ProjectDetailHero: React.FC<ProjectDetailHeroProps> = ({
  project,
  course,
  progress,
  isCompleted,
  onBack,
  onShareStatus,
  onEdit,
  onDelete,
  onUpdateStatus,
  renderStatusBadge,
  getDeadlineBadge,
}) => {
  return (
    <div className="space-y-4">
      {/* Navigation Breadcrumb & Back Button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] hover:border-[#4FA3A5] font-heading font-bold text-xs shadow-2xs hover:shadow-xs transition active:scale-95 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-[#4FA3A5]" />
          <span>← Back to All Projects</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onShareStatus}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-2xs cursor-pointer"
            title="Copy formatted status report for Telegram or WhatsApp group chat"
          >
            <Share2 className="w-3.5 h-3.5 text-[#4FA3A5]" />
            <span>Share Status</span>
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] transition cursor-pointer"
            title="Edit Project Details"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-full border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-100 transition cursor-pointer"
            title="Delete Project"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Project Hero Banner & Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {course ? (
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-heading font-bold text-white shadow-2xs"
                  style={{ backgroundColor: course.color || '#4FA3A5' }}
                >
                  {course.code} — {course.name}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-heading font-bold bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))]">
                  General Project
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider bg-[#4FA3A5]/10 text-[#4FA3A5]">
                {project.type} Project
              </span>
              {renderStatusBadge(project.status)}
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[rgb(var(--c-text))] pt-1">
              {project.title}
            </h1>
          </div>

          {/* Quick Completion / Reopen CTA */}
          <div className="shrink-0">
            {isCompleted ? (
              <button
                onClick={() => onUpdateStatus('active')}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:bg-[rgb(var(--c-bg))] transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-amber-500" />
                <span>Reopen Project</span>
              </button>
            ) : (
              <button
                onClick={() => onUpdateStatus('submitted')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading text-xs font-bold shadow-xs hover:shadow-sm active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Complete (+150 XP)</span>
              </button>
            )}
          </div>
        </div>

        {/* Project Description */}
        {project.description && (
          <div className="p-3.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs text-[rgb(var(--c-text))] font-flourish">
            {project.description}
          </div>
        )}

        {/* Pipeline Stepper: Idea -> Planning -> Active -> Review -> Completed */}
        <div className="pt-2">
          <div className="text-[11px] font-heading font-bold uppercase tracking-wider text-[rgb(var(--c-muted))] mb-2 flex items-center justify-between">
            <span>Pipeline Stage Progression</span>
            <span className="text-[#4FA3A5]">{progress}% Cleared</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {[
              { key: 'idea', label: '1. Idea' },
              { key: 'planning', label: '2. Planning' },
              { key: 'active', label: '3. In Progress' },
              { key: 'review', label: '4. Review' },
              { key: 'submitted', label: '5. Completed' },
            ].map((step) => {
              const isCurrent =
                project.status === step.key ||
                (step.key === 'submitted' && project.status === 'graded');
              return (
                <button
                  key={step.key}
                  onClick={() => onUpdateStatus(step.key as Project['status'])}
                  className={`py-2 px-1 text-center rounded-xl border text-[10px] sm:text-xs font-heading font-bold transition cursor-pointer truncate ${
                    isCurrent
                      ? 'border-[#4FA3A5] bg-[#4FA3A5] text-white shadow-xs ring-2 ring-[#4FA3A5]/30'
                      : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:border-[#4FA3A5]'
                  }`}
                >
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Bar & Key Stats */}
        <div className="space-y-1.5 pt-1">
          <div className="w-full h-2.5 bg-[rgb(var(--c-bg))] rounded-full overflow-hidden border border-[rgb(var(--c-border))] p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress === 100 ? 'bg-emerald-500' : 'bg-[#4FA3A5]'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-[rgb(var(--c-muted))] font-heading pt-1 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {project.deadline && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#4FA3A5]" />
                  <span>Deadline: {formatDisplayDate(project.deadline)}</span>
                </span>
              )}
              {project.weight && (
                <span>Academic Weight: {project.weight}% of Course Grade</span>
              )}
            </div>
            <div>{getDeadlineBadge(project.deadline)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
