import React from 'react';
import { Sparkles, CheckCircle, X } from 'lucide-react';

interface SettingsSection12CardProps {
  isSection12Loaded: boolean;
  onOpenModal: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  sec12SemName: string;
  setSec12SemName: (val: string) => void;
  sec12StartDate: string;
  setSec12StartDate: (val: string) => void;
  sec12EndDate: string;
  setSec12EndDate: (val: string) => void;
  isLoadingSection12: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const SettingsSection12Card: React.FC<SettingsSection12CardProps> = ({
  isSection12Loaded,
  onOpenModal,
  isModalOpen,
  onCloseModal,
  sec12SemName,
  setSec12SemName,
  sec12StartDate,
  setSec12StartDate,
  sec12EndDate,
  setSec12EndDate,
  isLoadingSection12,
  onSubmit,
}) => {
  return (
    <>
      <div className="ticket-border bg-gradient-to-r from-[rgb(var(--c-surface))] to-[rgb(var(--c-surface2))] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-heading text-xs font-bold uppercase text-[rgb(var(--c-primary))]">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Official Section 12 Timetable</span>
            {isSection12Loaded && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                ✓ Loaded &amp; Active
              </span>
            )}
          </div>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-1 max-w-xl">
            {isSection12Loaded
              ? 'Section 12 timetable is active with all 7 modules (Anthropology, Entrepreneurship, English, Geography, Math, Logic, Psychology) and 9 weekly lecture/tutorial periods in Building B59.'
              : 'One-click setup for the real Section 12 timetable. Asks for semester name and dates, then configures your 7 courses and 9 weekly classes without duplicate risk.'}
          </p>
        </div>

        <div className="shrink-0">
          {isSection12Loaded ? (
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] font-heading text-xs font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Section 12 Ready</span>
              </span>
              <p className="text-[10px] text-[rgb(var(--c-muted))] mt-1 text-center">
                Fully editable in Timetable
              </p>
            </div>
          ) : (
            <button
              onClick={onOpenModal}
              className="px-4 py-2.5 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load Section 12 Timetable</span>
            </button>
          )}
        </div>
      </div>

      {/* Section 12 Timetable Setup Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                  Load Section 12 Timetable
                </span>
              </div>
              <button
                onClick={onCloseModal}
                className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              This will create your 7 official modules (Social Anthropology, Entrepreneurship, Communicative English, Geography of Ethiopia, Math for Natural Science, Logic &amp; Critical Thinking, General Psychology) with designated instructors, colors, and 9 weekly lecture/tutorial periods in Building B59. Credit hours are left blank for you to enter.
            </p>

            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Academic Semester / Term Name
                </label>
                <input
                  type="text"
                  value={sec12SemName}
                  onChange={(e) => setSec12SemName(e.target.value)}
                  placeholder="e.g. Year 1 - Semester I"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    First Day (Monday)
                  </label>
                  <input
                    type="date"
                    value={sec12StartDate}
                    onChange={(e) => setSec12StartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Last Day (17 Weeks)
                  </label>
                  <input
                    type="date"
                    value={sec12EndDate}
                    onChange={(e) => setSec12EndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[rgb(var(--c-border))]">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-3.5 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoadingSection12}
                  className="px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] text-xs font-heading font-bold transition shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {isLoadingSection12 ? 'Creating Schedule...' : 'Confirm & Schedule Timetable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
