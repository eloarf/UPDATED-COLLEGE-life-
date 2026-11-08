import React from 'react';

interface SettingsProfileSectionProps {
  userName: string;
  setUserName: (val: string) => void;
  termName: string;
  setTermName: (val: string) => void;
  universityName: string;
  setUniversityName: (val: string) => void;
  targetCgpa: number | string;
  setTargetCgpa: (val: number | string) => void;
  bookGoal: number | string;
  setBookGoal: (val: number | string) => void;
  hapticsEnabled: boolean;
  setHapticsEnabled: (val: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const SettingsProfileSection: React.FC<SettingsProfileSectionProps> = ({
  userName,
  setUserName,
  termName,
  setTermName,
  universityName,
  setUniversityName,
  targetCgpa,
  setTargetCgpa,
  bookGoal,
  setBookGoal,
  hapticsEnabled,
  setHapticsEnabled,
  soundEnabled,
  setSoundEnabled,
  onSubmit,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-4"
    >
      <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))] pb-2 border-b border-[rgb(var(--c-border))]">
        Academic Identity &amp; Goals
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
            Student / Preferred Name
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
            Current Academic Term
          </label>
          <input
            type="text"
            value={termName}
            onChange={(e) => setTermName(e.target.value)}
            placeholder="e.g. Year 1 - Semester I"
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
            University Institution
          </label>
          <input
            type="text"
            value={universityName}
            onChange={(e) => setUniversityName(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
            Target CGPA (Department Placement)
          </label>
          <input
            type="number"
            step="0.01"
            value={targetCgpa === '' || isNaN(Number(targetCgpa)) ? '' : targetCgpa}
            onChange={(e) => {
              const val = e.target.value;
              setTargetCgpa(val === '' ? '' : isNaN(parseFloat(val)) ? '' : parseFloat(val));
            }}
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
            Yearly Book Goal
          </label>
          <input
            type="number"
            value={bookGoal === '' || isNaN(Number(bookGoal)) ? '' : bookGoal}
            onChange={(e) => {
              const val = e.target.value;
              setBookGoal(val === '' ? '' : isNaN(parseInt(val, 10)) ? '' : parseInt(val, 10));
            }}
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
          />
        </div>
      </div>

      {/* Sensory Toggles */}
      <div className="pt-2 border-t border-[rgb(var(--c-border))] flex items-center gap-6 flex-wrap">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={hapticsEnabled}
            onChange={(e) => setHapticsEnabled(e.target.checked)}
            className="accent-[rgb(var(--c-primary))]"
          />
          <span>Haptic Vibrations (on task &amp; habit stamps)</span>
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
            className="accent-[rgb(var(--c-primary))]"
          />
          <span>Audio Bells (Off by default)</span>
        </label>
      </div>

      <button
        type="submit"
        className="px-5 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs cursor-pointer"
      >
        Save Identity Settings
      </button>
    </form>
  );
};
