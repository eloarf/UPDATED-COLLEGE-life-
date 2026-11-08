import React from 'react';
import { Compass } from 'lucide-react';

interface SettingsHeaderSectionProps {
  onRelaunchWizard: () => void;
}

export const SettingsHeaderSection: React.FC<SettingsHeaderSectionProps> = ({
  onRelaunchWizard,
}) => {
  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase font-heading tracking-widest text-[rgb(var(--c-muted))] font-bold">
            System Administration
          </div>
          <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
            Settings, Semesters &amp; Timetable
          </h2>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            100% on-device IndexedDB storage • Zero telemetry • Complete JSON portability
          </p>
        </div>

        <button
          onClick={onRelaunchWizard}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] text-xs font-heading font-bold transition active:scale-95 shrink-0 cursor-pointer"
        >
          <Compass className="w-4 h-4 text-[rgb(var(--c-primary))]" />
          <span>Relaunch Setup Wizard</span>
        </button>
      </div>
    </div>
  );
};
