import React from 'react';
import { Target } from 'lucide-react';
import { Course } from '../../types';

interface FocusActiveTaskBannerProps {
  activeFocusTask: { taskId?: string; taskTitle?: string; courseId?: string } | null;
  courses: Course[];
  onClearLink: () => void;
}

export const FocusActiveTaskBanner: React.FC<FocusActiveTaskBannerProps> = ({
  activeFocusTask,
  courses,
  onClearLink,
}) => {
  if (!activeFocusTask) return null;

  const linkedCourse = activeFocusTask.courseId
    ? courses.find((c) => c.id === activeFocusTask.courseId)
    : null;

  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 flex items-center justify-between gap-3 border-l-4 border-l-[#B6E63E] animate-pop">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-[#B6E63E]/20 text-[#B6E63E] flex items-center justify-center shrink-0">
          <Target className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-heading uppercase tracking-wider text-[rgb(var(--c-muted))]">
            Linked Task • {linkedCourse ? linkedCourse.code : 'General'}
          </div>
          <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))] truncate">
            {activeFocusTask.taskTitle}
          </div>
        </div>
      </div>
      <button
        onClick={onClearLink}
        className="text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] hover:text-rose-500 transition px-2 py-1 rounded-lg shrink-0 cursor-pointer"
      >
        Clear Link
      </button>
    </div>
  );
};
