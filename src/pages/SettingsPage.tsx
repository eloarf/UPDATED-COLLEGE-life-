import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import {
  triggerBackupDownload,
  exportTasksToCsv,
  validateBackupFile,
  restoreDatabase,
  type ValidationSuccess,
} from '../services/backupService';
import {
  loadSection12Timetable,
  getDefaultSemesterDates,
  Section12Config,
} from '../db/starterPack';
import { Semester } from '../types';
import { generateId } from '../utils/idGenerator';
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
  Calendar,
  Plus,
  Edit2,
  CheckCircle,
  Clock,
  BookOpen,
  X,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { showToast } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const semesters = useLiveQuery(() => db.semesters.toArray()) || [];
  const courses = useLiveQuery(() => db.courses.toArray()) || [];

  const [userName, setUserName] = useState(settings?.userName || 'Scholar');
  const [universityName, setUniversityName] = useState(
    settings?.universityName || 'Addis Ababa Science & Technology University'
  );
  const [termName, setTermName] = useState(settings?.currentTermName || 'Year 1 - Semester I');
  const [targetCgpa, setTargetCgpa] = useState<number | string>(
    settings?.targetCgpa !== undefined && !isNaN(settings.targetCgpa) ? settings.targetCgpa : 3.85
  );
  const [bookGoal, setBookGoal] = useState<number | string>(
    settings?.yearlyBookGoal !== undefined && !isNaN(settings.yearlyBookGoal) ? settings.yearlyBookGoal : 40
  );

  const [soundEnabled, setSoundEnabled] = useState(settings?.soundEnabled ?? false);
  const [hapticsEnabled, setHapticsEnabled] = useState(settings?.hapticsEnabled ?? true);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Sync state when settings load
  useEffect(() => {
    if (settings) {
      if (settings.userName) setUserName(settings.userName);
      if (settings.universityName) setUniversityName(settings.universityName);
      if (settings.currentTermName) setTermName(settings.currentTermName);
      if (settings.targetCgpa !== undefined && !isNaN(settings.targetCgpa)) {
        setTargetCgpa(settings.targetCgpa);
      }
      if (settings.yearlyBookGoal !== undefined && !isNaN(settings.yearlyBookGoal)) {
        setBookGoal(settings.yearlyBookGoal);
      }
      if (settings.soundEnabled !== undefined) setSoundEnabled(settings.soundEnabled);
      if (settings.hapticsEnabled !== undefined) setHapticsEnabled(settings.hapticsEnabled);
    }
  }, [settings]);

  // Section 12 check
  const section12Codes = [
    'ANTH1002',
    'ENTR1006',
    'FLEN1003',
    'GEES1005',
    'MATH1007',
    'PHIL1009',
    'PSYC1011',
  ];
  const isSection12Loaded = courses.some((c) => section12Codes.includes(c.code));

  // Section 12 Modal State
  const [isSection12ModalOpen, setIsSection12ModalOpen] = useState(false);
  const [sec12SemName, setSec12SemName] = useState('Year 1 - Semester I');
  const [sec12StartDate, setSec12StartDate] = useState('');
  const [sec12EndDate, setSec12EndDate] = useState('');
  const [isLoadingSection12, setIsLoadingSection12] = useState(false);

  // Open Section 12 Modal with prefilled dates
  const handleOpenSection12Modal = () => {
    const defaults = getDefaultSemesterDates();
    setSec12SemName(settings?.currentTermName || 'Year 1 - Semester I');
    setSec12StartDate(defaults.startDate);
    setSec12EndDate(defaults.endDate);
    setIsSection12ModalOpen(true);
  };

  const handleRunLoadSection12 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sec12SemName.trim() || !sec12StartDate || !sec12EndDate) {
      showToast('Please provide semester name, start date, and end date.', 'warning');
      return;
    }

    if (sec12EndDate <= sec12StartDate) {
      showToast('End date must be strictly after start date.', 'danger');
      return;
    }

    setIsLoadingSection12(true);
    try {
      const res = await loadSection12Timetable({
        semesterName: sec12SemName.trim(),
        startDate: sec12StartDate,
        endDate: sec12EndDate,
      });

      if (res.success) {
        showToast(res.message, 'success');
        setIsSection12ModalOpen(false);
      } else {
        showToast(res.message, 'warning');
      }
    } catch (err: any) {
      showToast('Failed to load Section 12 timetable: ' + err.message, 'danger');
    } finally {
      setIsLoadingSection12(false);
    }
  };

  // Semester Management Modal State
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [semFormName, setSemFormName] = useState('');
  const [semFormStartDate, setSemFormStartDate] = useState('');
  const [semFormEndDate, setSemFormEndDate] = useState('');
  const [semFormError, setSemFormError] = useState('');

  const handleOpenAddSemester = () => {
    const defaults = getDefaultSemesterDates();
    setEditingSemester(null);
    setSemFormName('');
    setSemFormStartDate(defaults.startDate);
    setSemFormEndDate(defaults.endDate);
    setSemFormError('');
    setIsSemesterModalOpen(true);
  };

  const handleOpenEditSemester = (sem: Semester) => {
    setEditingSemester(sem);
    setSemFormName(sem.name);
    setSemFormStartDate(sem.startDate);
    setSemFormEndDate(sem.endDate);
    setSemFormError('');
    setIsSemesterModalOpen(true);
  };

  const handleSaveSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    setSemFormError('');

    const name = semFormName.trim();
    if (!name) {
      setSemFormError('Semester name is required.');
      return;
    }

    if (!semFormStartDate || !semFormEndDate) {
      setSemFormError('Start date and end date are required.');
      return;
    }

    if (semFormEndDate <= semFormStartDate) {
      setSemFormError('End date must be strictly after start date.');
      return;
    }

    // Validation: at most 400 days
    const startMs = new Date(semFormStartDate).getTime();
    const endMs = new Date(semFormEndDate).getTime();
    const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
    if (diffDays > 400) {
      setSemFormError(`Semester duration is ${diffDays} days. Maximum allowed is 400 days.`);
      return;
    }

    if (editingSemester) {
      // Update existing semester
      await db.semesters.update(editingSemester.id, {
        name,
        startDate: semFormStartDate,
        endDate: semFormEndDate,
      });

      // If active, keep currentTermName in sync
      if (editingSemester.isActive || settings?.activeSemesterId === editingSemester.id) {
        await db.settings.update('current_user', {
          currentTermName: name,
        });
      }
      showToast(`Semester "${name}" updated.`, 'success');
    } else {
      // Create new semester
      const newId = generateId();
      await db.semesters.add({
        id: newId,
        name,
        startDate: semFormStartDate,
        endDate: semFormEndDate,
        isActive: false,
      });
      showToast(`New semester "${name}" created.`, 'success');
    }

    setIsSemesterModalOpen(false);
  };

  const handleSetActiveSemester = async (semester: Semester) => {
    // Mark all as inactive then target as active
    await db.semesters.toCollection().modify((s) => {
      s.isActive = s.id === semester.id;
    });

    await db.settings.update('current_user', {
      activeSemesterId: semester.id,
      currentTermName: semester.name,
    });

    setTermName(semester.name);
    showToast(`Active semester switched to "${semester.name}".`, 'success');
  };

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

  // Safe restore preview state
  const [pendingRestore, setPendingRestore] = useState<{
    filename: string;
    validation: ValidationSuccess;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const filename = file.name;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const res = validateBackupFile(text);
        if (!res.valid) {
          showToast(`Backup rejected: ${res.error}`, 'danger');
          return;
        }
        setPendingRestore({ filename, validation: res });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown read error';
        showToast(`Could not read file: ${msg}`, 'danger');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    setIsRestoring(true);
    try {
      const res = await restoreDatabase(pendingRestore.validation.backup, 'replace');
      if (res.success) {
        showToast('🎉 Database restored successfully! All tables updated.', 'success');
        setPendingRestore(null);
      } else {
        showToast(res.message, 'danger');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Restore failed: ${msg}`, 'danger');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleWipeAllData = async () => {
    await Promise.all([
      db.courses.clear(),
      db.classSessions.clear(),
      db.classExceptions.clear(),
      db.attendance.clear(),
      db.semesters.clear(),
      db.restDays.clear(),
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
            Settings, Semesters &amp; Timetable
          </h2>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            100% on-device IndexedDB storage • Zero telemetry • Complete JSON portability
          </p>
        </div>
      </div>

      {/* TASK B: Section 12 Timetable Flow */}
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
              onClick={handleOpenSection12Modal}
              className="px-4 py-2.5 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load Section 12 Timetable</span>
            </button>
          )}
        </div>
      </div>

      {/* TASK A: Academic Semesters Management */}
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
            onClick={handleOpenAddSemester}
            className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:border-[rgb(var(--c-primary))] active:scale-95 transition"
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
              sem.id === settings?.activeSemesterId ||
              sem.name === settings?.currentTermName;

            const startFormatted = sem.startDate;
            const endFormatted = sem.endDate;

            // Duration in weeks
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
                      onClick={() => handleSetActiveSemester(sem)}
                      className="px-3 py-1.5 rounded-lg bg-[rgb(var(--c-surface2))] hover:bg-[rgb(var(--c-primary))] hover:text-[rgb(var(--c-on-primary))] text-[rgb(var(--c-text))] font-heading text-xs font-bold transition active:scale-95"
                    >
                      Set as Active
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEditSemester(sem)}
                    className="p-1.5 rounded-lg border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] transition active:scale-95"
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

      {/* Academic Identity Form */}
      <form
        onSubmit={handleSaveProfile}
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export Tasks CSV</span>
          </button>

          <button
            onClick={() => setIsConfirmDeleteOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-heading text-xs font-bold transition ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Wipe All Data</span>
          </button>
        </div>
      </div>

      {/* Section 12 Timetable Setup Modal */}
      {isSection12ModalOpen && (
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
                onClick={() => setIsSection12ModalOpen(false)}
                className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              This will create your 7 official modules (Social Anthropology, Entrepreneurship, Communicative English, Geography of Ethiopia, Math for Natural Science, Logic &amp; Critical Thinking, General Psychology) with designated instructors, colors, and 9 weekly lecture/tutorial periods in Building B59. Credit hours are left blank for you to enter.
            </p>

            <form onSubmit={handleRunLoadSection12} className="space-y-3">
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
                  onClick={() => setIsSection12ModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoadingSection12}
                  className="px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] text-xs font-heading font-bold transition shadow-xs hover:opacity-90 disabled:opacity-50"
                >
                  {isLoadingSection12 ? 'Creating Schedule...' : 'Confirm & Schedule Timetable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Semester Add / Edit Modal */}
      {isSemesterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <span className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                {editingSemester ? 'Edit Semester Schedule' : 'Create Academic Semester'}
              </span>
              <button
                onClick={() => setIsSemesterModalOpen(false)}
                className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
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

            <form onSubmit={handleSaveSemester} className="space-y-3">
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
                  onClick={() => setIsSemesterModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] text-xs font-heading font-bold transition shadow-xs hover:opacity-90"
                >
                  {editingSemester ? 'Save Changes' : 'Create Semester'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore Preview Modal */}
      {pendingRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-[rgb(var(--c-primary))]" />
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                Restore Database from Backup
              </div>
            </div>

            <div className="space-y-2 text-xs text-[rgb(var(--c-muted))] font-flourish">
              <div>
                File: <strong className="text-[rgb(var(--c-text))]">{pendingRestore.filename}</strong>
              </div>
              <div>
                Exported At:{' '}
                <strong className="text-[rgb(var(--c-text))]">
                  {new Date(pendingRestore.validation.backup.exportedAt).toLocaleString()}
                </strong>
              </div>
              <div>
                Total Records:{' '}
                <strong className="text-[rgb(var(--c-text))]">
                  {pendingRestore.validation.totalRecords}
                </strong>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-flourish">
              ⚠️ Restoring will overwrite existing data with the records from this backup file.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
              <button
                disabled={isRestoring}
                onClick={() => setPendingRestore(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
              >
                Cancel
              </button>
              <button
                disabled={isRestoring}
                onClick={handleConfirmRestore}
                className="px-3.5 py-1.5 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] text-xs font-heading font-bold transition shadow-xs hover:opacity-90"
              >
                {isRestoring ? 'Restoring Tables...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wipe All Data Confirmation Modal */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-rose-500/50 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                Wipe All App Data?
              </div>
            </div>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish leading-relaxed">
              This will clear all tables (courses, timetable, tasks, exams, habits, finances) in your local IndexedDB. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
              <button
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeAllData}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-heading font-bold transition shadow-xs"
              >
                Yes, Wipe Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
