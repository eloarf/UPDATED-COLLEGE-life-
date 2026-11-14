import React from 'react';
import { X, BookOpen, CheckCircle2, MinusCircle } from 'lucide-react';
import { DayInspectionDetail } from '../../utils/wellbeingInsightsEngine';
import { getScaleLabel } from '../../utils/wellbeingEngine';
import { formatDisplayDate } from '../../utils/dateUtils';

interface DayInspectionModalProps {
  title: string;
  subtitle?: string;
  days: DayInspectionDetail[];
  onClose: () => void;
  onOpenJournalEntry: (entryId: string) => void;
}

export const DayInspectionModal: React.FC<DayInspectionModalProps> = ({
  title,
  subtitle,
  days,
  onClose,
  onOpenJournalEntry,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[88vh] bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[rgb(var(--c-border))]">
          <div>
            <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[rgb(var(--c-muted))] mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] hover:text-[rgb(var(--c-text))] transition cursor-pointer"
            aria-label="Close inspection panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {days.length === 0 ? (
            <p className="text-xs text-[rgb(var(--c-muted))] py-6 text-center">
              No recorded days match this selection.
            </p>
          ) : (
            days.map((day) => (
              <div
                key={day.dateKey}
                className="p-4 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] space-y-2.5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                    {formatDisplayDate(day.dateKey)}{' '}
                    <span className="text-xs font-mono font-normal text-[rgb(var(--c-muted))] tabular-nums">
                      ({day.dateKey})
                    </span>
                  </div>
                  {day.wellbeing && (
                    <div className="text-xs font-mono tabular-nums text-[rgb(var(--c-muted))] flex flex-wrap gap-x-3">
                      {day.wellbeing.moodScore !== undefined && (
                        <span>
                          Mood <strong className="text-[rgb(var(--c-text))]">{day.wellbeing.moodScore}/5</strong> ({getScaleLabel('mood', day.wellbeing.moodScore)})
                        </span>
                      )}
                      {day.wellbeing.energyScore !== undefined && (
                        <span>
                          Energy <strong className="text-[rgb(var(--c-text))]">{day.wellbeing.energyScore}/5</strong>
                        </span>
                      )}
                      {day.wellbeing.stressScore !== undefined && (
                        <span>
                          Stress <strong className="text-[rgb(var(--c-text))]">{day.wellbeing.stressScore}/5</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {day.wellbeing && day.wellbeing.emotions.length > 0 && (
                  <p className="text-xs text-[rgb(var(--c-muted))]">
                    <span className="font-medium text-[rgb(var(--c-text))]">Emotions:</span>{' '}
                    {day.wellbeing.emotions.join(' · ')}
                  </p>
                )}

                {day.wellbeing && day.wellbeing.contextTags.length > 0 && (
                  <p className="text-xs text-[rgb(var(--c-muted))]">
                    <span className="font-medium text-[rgb(var(--c-text))]">Context:</span>{' '}
                    {day.wellbeing.contextTags.join(' · ')}
                  </p>
                )}

                {day.wellbeing?.note && (
                  <p className="text-xs text-[rgb(var(--c-text))] italic">
                    “{day.wellbeing.note}”
                  </p>
                )}

                {(day.completedHabits.length > 0 || day.skippedHabits.length > 0) && (
                  <div className="pt-2 border-t border-[rgb(var(--c-border))]/60 space-y-1 text-xs">
                    {day.completedHabits.length > 0 && (
                      <div className="flex items-start gap-1.5 text-[rgb(var(--c-text))]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          {day.completedHabits
                            .map((h) =>
                              h.value && h.unit ? `${h.title} (${h.value} ${h.unit})` : h.title
                            )
                            .join(' · ')}
                        </span>
                      </div>
                    )}
                    {day.skippedHabits.length > 0 && (
                      <div className="flex items-start gap-1.5 text-[rgb(var(--c-muted))]">
                        <MinusCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Skipped: {day.skippedHabits.map((h) => h.title).join(' · ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {day.journalEntries.length > 0 && (
                  <div className="pt-2 border-t border-[rgb(var(--c-border))]/60 space-y-1.5">
                    {day.journalEntries.map((je) => (
                      <div
                        key={je.id}
                        className="flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-[rgb(var(--c-text))] truncate">
                            {je.title}
                          </div>
                          {je.excerpt && (
                            <p className="text-[rgb(var(--c-muted))] line-clamp-2 mt-0.5">
                              {je.excerpt}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenJournalEntry(je.id);
                          }}
                          className="min-h-[36px] px-3 py-1.5 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-xs font-heading font-semibold text-[rgb(var(--c-primary))] hover:bg-[rgb(var(--c-surface2))] inline-flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Open</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
