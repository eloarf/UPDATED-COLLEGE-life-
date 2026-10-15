import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import {
  triggerBackupDownload,
  restoreDatabaseFromJson,
  exportTasksToCsv,
} from '../services/backupService';
import { loadStarterPackData } from '../db/starterPack';
import {
  Settings,
  HardDrive,
  Download,
  Upload,
  Sparkles,
  Shield,
  Volume2,
  VolumeX,
  Vibrate,
  AlertTriangle,
  RotateCcw,
  Check,
  FileSpreadsheet,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { showToast } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));

  const [userName, setUserName] = useState(settings?.userName || 'Scholar');
  const [universityName, setUniversityName] = useState(settings?.universityName || 'Addis Ababa Science & Technology University');
  const [termName, setTermName] = useState(settings?.currentTermName || 'Year 1 - Semester II');
  const [targetCgpa, setTargetCgpa] = useState(settings?.targetCgpa || 3.85);
  const [bookGoal, setBookGoal] = useState(settings?.yearlyBookGoal || 40);

  const [soundEnabled, setSoundEnabled] = useState(settings?.soundEnabled ?? false);
  const [hapticsEnabled, setHapticsEnabled] = useState(settings?.hapticsEnabled ?? true);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.settings.update('current_user', {
      userName: userName.trim(),
      universityName: universityName.trim(),
      currentTermName: termName.trim(),
      targetCgpa: parseFloat(targetCgpa.toString()) || 3.85,
      yearlyBookGoal: parseInt(bookGoal.toString(), 10) || 40,
      soundEnabled,
      hapticsEnabled,
    });
    showToast('Settings saved successfully!', 'success');
  };

  const handleLoadStarterPack = async () => {
    try {
      await loadStarterPackData();
      showToast('🎉 Starter pack loaded with courses, timetable, habits & targets!', 'success');
    } catch (err: any) {
      showToast('Failed to load starter pack: ' + err.message, 'danger');
    }
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const res = await restoreDatabaseFromJson(text, 'replace');
      if (res.success) {
        showToast('Backup restored successfully!', 'success');
      } else {
        showToast(res.message, 'danger');
      }
    };
    reader.readAsText(file);
  };

  const handleWipeAllData = async () => {
    await Promise.all([
      db.courses.clear(),
      db.classSessions.clear(),
      db.tasks.clear(),
      db.exams.clear(),
      db.examTopics.clear(),
      db.projects.clear(),
      db.projectMilestones.clear(),
      db.projectTasks.clear(),
      db.focusSessions.clear(),
      db.habits.clear(),
      db.habitLogs.clear(),
      db.journalEntries.clear(),
      db.masterWeekBlocks.clear(),
      db.transactions.clear(),
      db.readingItems.clear(),
      db.learningQueue.clear(),
      db.xpEvents.clear(),
    ]);
    setIsConfirmDeleteOpen(false);
    showToast('All database tables cleared. Starting fresh.', 'info');
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div>
          <div className="text-[10px] uppercase font-heading tracking-widest text-[rgb(var(--c-muted))] font-bold">
            System Administration
          </div>
          <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
            Settings, Data &amp; Storage Backup
          </h2>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            100% on-device IndexedDB storage • Zero telemetry • Complete JSON portability
          </p>
        </div>
      </div>

      {/* Starter Pack Loader */}
      <div className="ticket-border bg-gradient-to-r from-[rgb(var(--c-surface))] to-[rgb(var(--c-surface2))] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 font-heading text-xs font-bold uppercase text-[rgb(var(--c-primary))]">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Load Starter Pack</span>
          </div>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-1">
            Instantly populate 5 engineering courses, sample timetable, habit stamps, learning brief, and 3.85 CGPA target.
          </p>
        </div>

        <button
          onClick={handleLoadStarterPack}
          className="px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs shrink-0"
        >
          Load Starter Pack Data
        </button>
      </div>

      {/* Academic Profile Form */}
      <form onSubmit={handleSaveProfile} className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-4">
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
              value={targetCgpa}
              onChange={(e) => setTargetCgpa(parseFloat(e.target.value))}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
              Yearly Book Goal
            </label>
            <input
              type="number"
              value={bookGoal}
              onChange={(e) => setBookGoal(parseInt(e.target.value, 10))}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
            />
          </div>
        </div>

        {/* Sensory Toggles */}
        <div className="pt-2 border-t border-[rgb(var(--c-border))] flex items-center gap-6">
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
          className="px-5 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs"
        >
          Save Identity Settings
        </button>
      </form>

      {/* Backup & Portability Vault */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-3">
        <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))] pb-2 border-b border-[rgb(var(--c-border))]">
          Database Backup &amp; CSV Export
        </div>

        <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
          Your data lives locally in this browser. Export a JSON backup periodically so you never lose your timetable or notes.
        </p>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            onClick={triggerBackupDownload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON Backup</span>
          </button>

          <label className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Restore from JSON</span>
            <input type="file" accept=".json" onChange={handleFileRestore} className="hidden" />
          </label>

          <button
            onClick={exportTasksToCsv}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:bg-[rgb(var(--c-surface2))] active:scale-95 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Tasks CSV</span>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-4 rounded-2xl border border-rose-300 dark:border-rose-950 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-heading font-bold text-rose-700 dark:text-rose-400">
            Wipe Local Data
          </div>
          <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
            Clears tasks, timetable, and courses. Automatically prompts for a safety backup before clearing.
          </div>
        </div>

        <button
          onClick={() => setIsConfirmDeleteOpen(true)}
          className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-heading text-xs font-bold hover:bg-rose-700 active:scale-95 shrink-0"
        >
          Clear All Data
        </button>
      </div>

      {/* Confirm Wipe Modal */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-rose-500 rounded-2xl p-5 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
              Are you completely sure?
            </h3>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              This will erase all courses, assignments, and exam progress from this browser. Make sure you have downloaded a JSON backup!
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="flex-1 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeAllData}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-heading font-bold"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
