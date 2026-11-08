import React from 'react';
import { Clock, X } from 'lucide-react';
import { ClassException } from '../../types';
import { ScheduledClass } from '../../utils/scheduleEngine';
import { addDaysToKey } from '../../utils/dateUtils';

interface LobbyPostponeModalProps {
  postponeModalClass: ScheduledClass | null;
  setPostponeModalClass: (val: ScheduledClass | null) => void;
  postponeDate: string;
  setPostponeDate: (val: string) => void;
  postponeStartTime: string;
  setPostponeStartTime: (val: string) => void;
  postponeEndTime: string;
  setPostponeEndTime: (val: string) => void;
  postponeReason: string;
  setPostponeReason: (val: string) => void;
  todayKey: string;
  exceptions: ClassException[];
  handleSavePostponement: (e: React.FormEvent) => void;
  handleCancelPostponement: (sessionId: string, courseId: string) => void;
}

export const LobbyPostponeModal: React.FC<LobbyPostponeModalProps> = ({
  postponeModalClass,
  setPostponeModalClass,
  postponeDate,
  setPostponeDate,
  postponeStartTime,
  setPostponeStartTime,
  postponeEndTime,
  setPostponeEndTime,
  postponeReason,
  setPostponeReason,
  todayKey,
  exceptions,
  handleSavePostponement,
  handleCancelPostponement,
}) => {
  if (!postponeModalClass) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                Postpone Class Occurrence
              </h3>
              <div className="text-[11px] text-[rgb(var(--c-muted))]">
                {postponeModalClass.course.code} — {postponeModalClass.course.name}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPostponeModalClass(null)}
            className="p-1.5 rounded-xl hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200">
          Postponement applies <strong>only to today’s ({todayKey}) occurrence</strong>. Your standard recurring weekly timetable remains untouched.
        </div>

        <form onSubmit={handleSavePostponement} className="space-y-3.5">
          {/* Quick Date Presets */}
          <div>
            <label className="block text-[11px] font-heading uppercase font-bold text-[rgb(var(--c-text))] mb-1.5">
              Reschedule To:
            </label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setPostponeDate(todayKey)}
                className={`p-2 rounded-xl border text-xs font-heading font-bold transition text-center cursor-pointer ${
                  postponeDate === todayKey
                    ? 'border-amber-500 bg-amber-500/15 text-[rgb(var(--c-text))]'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:border-[rgb(var(--c-text))]'
                }`}
              >
                Later Today
              </button>
              <button
                type="button"
                onClick={() => setPostponeDate(addDaysToKey(todayKey, 1))}
                className={`p-2 rounded-xl border text-xs font-heading font-bold transition text-center cursor-pointer ${
                  postponeDate === addDaysToKey(todayKey, 1)
                    ? 'border-amber-500 bg-amber-500/15 text-[rgb(var(--c-text))]'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:border-[rgb(var(--c-text))]'
                }`}
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setPostponeDate(addDaysToKey(todayKey, 7))}
                className={`p-2 rounded-xl border text-xs font-heading font-bold transition text-center cursor-pointer ${
                  postponeDate === addDaysToKey(todayKey, 7)
                    ? 'border-amber-500 bg-amber-500/15 text-[rgb(var(--c-text))]'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:border-[rgb(var(--c-text))]'
                }`}
              >
                Next Week
              </button>
            </div>

            <input
              type="date"
              required
              min={todayKey}
              value={postponeDate}
              onChange={(e) => setPostponeDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs font-bold"
            />
          </div>

          {/* Time Pickers */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                New Start Time
              </label>
              <input
                type="time"
                required
                value={postponeStartTime}
                onChange={(e) => setPostponeStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs font-bold font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                New End Time
              </label>
              <input
                type="time"
                required
                value={postponeEndTime}
                onChange={(e) => setPostponeEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs font-bold font-mono"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
              Reason / Notes (Optional)
            </label>
            <input
              type="text"
              value={postponeReason}
              onChange={(e) => setPostponeReason(e.target.value)}
              placeholder="e.g. Instructor lab session reschedule, departmental shift"
              className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[rgb(var(--c-border))]">
            {exceptions.some((ex) => ex.sessionId === postponeModalClass.session.id && ex.date === todayKey) ? (
              <button
                type="button"
                onClick={() => handleCancelPostponement(postponeModalClass.session.id, postponeModalClass.course.id)}
                className="px-3 py-2 rounded-xl border border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs font-heading font-bold hover:bg-rose-500/10 transition cursor-pointer"
              >
                Revert to Schedule
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPostponeModalClass(null)}
                className="px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] text-xs font-heading font-bold hover:bg-[rgb(var(--c-surface2))] transition cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-heading font-bold text-xs shadow-md active:scale-95 transition cursor-pointer"
            >
              Save Postponement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
