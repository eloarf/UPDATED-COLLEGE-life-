import React from 'react';
import { Calendar, Plus, Clock, Edit2, AlertTriangle, X } from 'lucide-react';
import { Semester } from '../../types';

interface SettingsSemestersSectionProps {
  semesters: Semester[];
  activeSemesterId?: string;
  currentTermName?: string;
  onSetActiveSemester: (sem: Semester) => void;
  onOpenAddSemester: () => void;
  onOpenEditSemester: (sem: Semester) => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  editingSemester: Semester | null;
  semFormName: string;
  setSemFormName: (val: string) => void;
  semFormStartDate: string;
  setSemFormStartDate: (val: string) => void;
  semFormEndDate: string;
  setSemFormEndDate: (val: string) => void;
  semFormError: string;
  onSaveSemester: (e: React.FormEvent) => void;
}

export const SettingsSemestersSection: React.FC<SettingsSemestersSectionProps> = ({
  semesters,
  activeSemesterId,
  currentTermName,
  onSetActiveSemester,
  onOpenAddSemester,
  onOpenEditSemester,
  isModalOpen,
  onCloseModal,
  editingSemester,
  semFormName,
  setSemFormName,
  semFormStartDate,
  setSemFormStartDate,
  semFormEndDate,
  setSemFormEndDate,
  semFormError,
  onSaveSemester,
}) => {
  return (
    <>
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[rgb(var(--c-border))]">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#BBA6E0] font-bold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Academic Calendar
            </div>
            <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
              Semester Management ({semesters.length})
            </h3>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Choose active semester, rename terms, or calibrate start and end dates.
            </p>
          </div>

          <button
            onClick={onOpenAddSemester}
            className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:border-[rgb(var(--c-primary))] active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Semester</span>
          </button>
        </div>

        {/* Semester List */}
        <div className="space-y-2.5">
          {semesters.map((sem) => {
            const isActive =
              sem.isActive ||
              sem.id === activeSemesterId ||
              sem.name === currentTermName;

            const startFormatted = sem.startDate;
            const endFormatted = sem.endDate;

            const diffDays = Math.round(
              (new Date(sem.endDate).getTime() - new Date(sem.startDate).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            const durationWeeks = Math.max(1, Math.round(diffDays / 7));

            return (
              <div
                key={sem.id}
                className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isActive
                    ? 'border-[#B6E63E] bg-[#B6E63E]/10 shadow-2xs'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading font-bold text-xs text-[rgb(var(--c-text))]">
                      {sem.name}
                    </span>
                    {isActive ? (
                      <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-[#B6E63E] text-stone-950 font-bold">
                        Active Term
                      </span>
                    ) : (
                      <span className="text-[9px] uppercase px-2 py-0.5 rounded-full border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))]">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[rgb(var(--c-muted))] font-flourish flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[rgb(var(--c-primary))]" />
                      {startFormatted} to {endFormatted}
                    </span>
                    <span>•</span>
                    <span>{durationWeeks} weeks ({diffDays} days)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!isActive && (
                    <button
                      onClick={() => onSetActiveSemester(sem)}
                      className="px-3 py-1.5 rounded-lg bg-[rgb(var(--c-surface2))] hover:bg-[rgb(var(--c-primary))] hover:text-[rgb(var(--c-on-primary))] text-[rgb(var(--c-text))] font-heading text-xs font-bold transition active:scale-95 cursor-pointer"
                    >
                      Set as Active
                    </button>
                  )}
                  <button
                    onClick={() => onOpenEditSemester(sem)}
                    className="p-1.5 rounded-lg border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] transition active:scale-95 cursor-pointer"
                    title="Edit semester dates or title"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Semester Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <span className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                {editingSemester ? 'Edit Semester Schedule' : 'Create Academic Semester'}
              </span>
              <button
                onClick={onCloseModal}
                className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {semFormError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{semFormError}</span>
              </div>
            )}

            <form onSubmit={onSaveSemester} className="space-y-3">
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Semester / Term Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={semFormName}
                  onChange={(e) => setSemFormName(e.target.value)}
                  placeholder="e.g. Year 1 - Semester I"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={semFormStartDate}
                    onChange={(e) => setSemFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={semFormEndDate}
                    onChange={(e) => setSemFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>
              </div>

              <p className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
                Validation: End date must be strictly after start date and at most 400 days in duration.
              </p>

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
                  className="px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] text-xs font-heading font-bold transition shadow-xs hover:opacity-90 cursor-pointer"
                >
                  {editingSemester ? 'Save Changes' : 'Create Semester'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
