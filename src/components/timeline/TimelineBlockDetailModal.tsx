import React from 'react';
import { TimelineBlock } from '../../utils/timelineEngine';
import { useUiStore } from '../../store/uiStore';
import { X, Clock, MapPin, Calendar, CheckCircle2, Play, AlertCircle } from 'lucide-react';

interface TimelineBlockDetailModalProps {
  block: TimelineBlock | null;
  onClose: () => void;
  onOpenQuickMark?: (scheduledClass: any) => void;
}

export const TimelineBlockDetailModal: React.FC<TimelineBlockDetailModalProps> = ({
  block,
  onClose,
  onOpenQuickMark,
}) => {
  const { setCurrentRoute } = useUiStore();

  if (!block) return null;

  const kindLabels: Record<string, string> = {
    class: 'Academic Class',
    study: 'Study Block',
    task: 'Due Task',
    exam: 'Examination',
    masterWeek: 'Master Routine',
    focus: 'Focus Session',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header with Kind color indicator */}
        <div
          className="p-4 sm:p-5 border-b border-[rgb(var(--c-border))] flex items-center justify-between"
          style={{ backgroundColor: `${block.colour}15` }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: block.colour }}
            />
            <span
              className="text-xs font-bold uppercase tracking-wider truncate"
              style={{ color: block.colour }}
            >
              {kindLabels[block.kind] || 'Schedule Item'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface))] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          <div>
            <h3 className="text-lg font-heading font-bold text-[rgb(var(--c-text))] leading-snug">
              {block.title}
            </h3>
            {block.subtitle && (
              <p className="text-xs text-[rgb(var(--c-muted))] mt-1">
                {block.subtitle}
              </p>
            )}
          </div>

          {/* Details list */}
          <div className="space-y-2 text-xs bg-[rgb(var(--c-surface2))] p-3.5 rounded-xl border border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-2 text-[rgb(var(--c-text))]">
              <Clock className="w-4 h-4 text-[rgb(var(--c-muted))] shrink-0" />
              <span className="font-mono font-medium">
                {block.startTime} — {block.endTime}
              </span>
              <span className="text-[rgb(var(--c-muted))]">
                ({block.durationMinutes} minutes)
              </span>
            </div>

            {block.location && (
              <div className="flex items-center gap-2 text-[rgb(var(--c-text))]">
                <MapPin className="w-4 h-4 text-[rgb(var(--c-muted))] shrink-0" />
                <span>{block.location}</span>
              </div>
            )}

            {block.status !== 'normal' && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="capitalize font-semibold text-amber-600">
                  Status: {block.status}
                </span>
              </div>
            )}
          </div>

          {/* Quick Actions based on kind */}
          <div className="flex flex-wrap gap-2 pt-2">
            {block.kind === 'class' && block.originalItem && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenQuickMark) onOpenQuickMark(block.originalItem);
                  }}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[rgb(var(--c-primary))] text-white hover:opacity-90 transition-opacity flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Attendance
                </button>
                {block.originalItem.course?.id && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setCurrentRoute(`#/courses/${block.originalItem.course.id}`);
                    }}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface))] transition-colors"
                  >
                    Course Hub
                  </button>
                )}
              </>
            )}

            {block.kind === 'study' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setCurrentRoute('#/focus');
                }}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Start Focus Timer
              </button>
            )}

            {block.kind === 'task' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setCurrentRoute('#/tasks');
                }}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> View in Tasks
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
