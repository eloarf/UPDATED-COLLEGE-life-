import React, { useState, useEffect, useCallback } from 'react';
import {
  db,
  getEmergencyBackupMeta,
  restoreFromEmergencyMirror,
  saveEmergencyBackup,
  checkStoragePersistence,
  requestPersistentStorage,
  type EmergencyBackupMeta,
} from '../db/db';
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
import { NotificationSettingsSection } from '../components/settings/NotificationSettingsSection';
import {
  applyAppearanceMode,
  applyDesignStyle,
  applyReduceAnimations,
  APPEARANCE_MODES,
  DESIGN_STYLES,
  AppearanceMode,
  DesignStyle,
} from '../theme/themeUtils';

import { SettingsHeaderSection } from '../components/settings/SettingsHeaderSection';
import { SettingsSection12Card } from '../components/settings/SettingsSection12Card';
import { SettingsSemestersSection } from '../components/settings/SettingsSemestersSection';
import { SettingsAppearanceSection } from '../components/settings/SettingsAppearanceSection';
import { SettingsProfileSection } from '../components/settings/SettingsProfileSection';
import { SettingsDataSection } from '../components/settings/SettingsDataSection';

export const SettingsPage: React.FC = () => {
  const { showToast, setOnboardingOpen } = useUiStore();
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
  const [reduceAnimations, setReduceAnimations] = useState(settings?.reduceAnimations ?? false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const currentAppearanceMode: AppearanceMode = settings?.appearanceMode || 'light';
  const currentDesignStyle: DesignStyle = settings?.designStyle || 'editorial-retro';

  const handleSelectAppearanceMode = async (mode: AppearanceMode) => {
    applyAppearanceMode(mode);
    await db.settings.update('current_user', { appearanceMode: mode });
    const match = APPEARANCE_MODES.find((m) => m.id === mode);
    showToast(`Appearance Mode: ${match?.name || mode}`, 'info');
  };

  const handleSelectDesignStyle = async (style: DesignStyle) => {
    applyDesignStyle(style);
    await db.settings.update('current_user', { designStyle: style });
    const match = DESIGN_STYLES.find((s) => s.id === style);
    showToast(`Design Style: ${match?.name || style}`, 'success');
  };

  const handleToggleReduceAnimations = async () => {
    const nextVal = !reduceAnimations;
    setReduceAnimations(nextVal);
    applyReduceAnimations(nextVal);
    await db.settings.update('current_user', { reduceAnimations: nextVal });
    showToast(nextVal ? 'Reduced motion enabled' : 'Standard motion restored', 'info');
  };

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
      if (settings.reduceAnimations !== undefined) setReduceAnimations(settings.reduceAnimations);
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

  const handleOpenSection12Modal = () => {
    const defaults = getDefaultSemesterDates();
    setSec12SemName(settings?.currentTermName || 'Year 1 - Semester I');
    setSec12StartDate(defaults.startDate);
    setSec12EndDate(defaults.endDate);
    setIsSection12ModalOpen(true);
  };

  const handleRunLoadSection12 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sec12StartDate || !sec12EndDate) {
      showToast('Please specify valid start and end dates', 'danger');
      return;
    }

    if (new Date(sec12EndDate) <= new Date(sec12StartDate)) {
      showToast('Semester end date must be after the start date', 'danger');
      return;
    }

    setIsLoadingSection12(true);
    try {
      const cfg: Section12Config = {
        semesterName: sec12SemName.trim() || 'Year 1 - Semester I',
        startDate: sec12StartDate,
        endDate: sec12EndDate,
      };

      const result = await loadSection12Timetable(cfg);
      if (result.success) {
        showToast(result.message, 'success');
        setIsSection12ModalOpen(false);
      } else {
        showToast(result.message, 'danger');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load timetable';
      showToast(msg, 'danger');
    } finally {
      setIsLoadingSection12(false);
    }
  };

  // Semesters Management State
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

  const handleSetActiveSemester = async (sem: Semester) => {
    for (const s of semesters) {
      await db.semesters.update(s.id, { isActive: s.id === sem.id });
    }
    await db.settings.update('current_user', {
      activeSemesterId: sem.id,
      currentTermName: sem.name,
    });
    showToast(`Active term switched to: ${sem.name}`, 'success');
  };

  const handleSaveSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    setSemFormError('');

    if (!semFormName.trim()) {
      setSemFormError('Semester title is required.');
      return;
    }
    if (!semFormStartDate || !semFormEndDate) {
      setSemFormError('Start and end dates are required.');
      return;
    }

    const start = new Date(semFormStartDate);
    const end = new Date(semFormEndDate);

    if (end <= start) {
      setSemFormError('End date must be strictly after start date.');
      return;
    }

    const durationDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (durationDays > 400) {
      setSemFormError('Semester duration cannot exceed 400 days.');
      return;
    }

    try {
      if (editingSemester) {
        await db.semesters.update(editingSemester.id, {
          name: semFormName.trim(),
          startDate: semFormStartDate,
          endDate: semFormEndDate,
        });

        if (settings?.activeSemesterId === editingSemester.id || editingSemester.isActive) {
          await db.settings.update('current_user', {
            currentTermName: semFormName.trim(),
          });
        }

        showToast(`Semester "${semFormName.trim()}" updated successfully.`, 'success');
      } else {
        const newId = generateId();
        const isFirst = semesters.length === 0;

        await db.semesters.add({
          id: newId,
          name: semFormName.trim(),
          startDate: semFormStartDate,
          endDate: semFormEndDate,
          isActive: isFirst,
        });

        if (isFirst) {
          await db.settings.update('current_user', {
            activeSemesterId: newId,
            currentTermName: semFormName.trim(),
          });
        }

        showToast(`Semester "${semFormName.trim()}" created.`, 'success');
      }

      setIsSemesterModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database error';
      setSemFormError(`Save failed: ${msg}`);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedCgpa = typeof targetCgpa === 'string' ? parseFloat(targetCgpa) : targetCgpa;
    const parsedBookGoal = typeof bookGoal === 'string' ? parseInt(bookGoal, 10) : bookGoal;

    const safeCgpa = isNaN(parsedCgpa) ? 3.85 : Math.max(0, Math.min(4.0, parsedCgpa));
    const safeBookGoal = isNaN(parsedBookGoal) ? 40 : Math.max(0, parsedBookGoal);

    await db.settings.update('current_user', {
      userName: userName.trim() || 'Scholar',
      universityName: universityName.trim() || 'University',
      currentTermName: termName.trim() || 'Year 1 - Semester I',
      targetCgpa: safeCgpa,
      yearlyBookGoal: safeBookGoal,
      soundEnabled,
      hapticsEnabled,
    });

    showToast('Academic profile calibrated & saved.', 'success');
  };

  // Storage Durability & Reliability Vault
  const [persistenceInfo, setPersistenceInfo] = useState<{
    isPersisted: boolean;
    usage?: number;
    quota?: number;
  }>({ isPersisted: false });

  const [mirrorMeta, setMirrorMeta] = useState<EmergencyBackupMeta>({
    exists: false,
    savedAt: undefined,
    totalRecords: 0,
  });

  const [isSyncingMirror, setIsSyncingMirror] = useState(false);
  const [isMirrorRestoring, setIsMirrorRestoring] = useState(false);

  const refreshDurabilityState = useCallback(async () => {
    try {
      const p = await checkStoragePersistence();
      setPersistenceInfo(p);
      const m = getEmergencyBackupMeta();
      setMirrorMeta(m);
    } catch (e) {
      console.warn('Storage check notice:', e);
    }
  }, []);

  useEffect(() => {
    refreshDurabilityState();
  }, [refreshDurabilityState]);

  const handleProtectStorage = async () => {
    const granted = await requestPersistentStorage();
    if (granted) {
      showToast('Browser granted storage persistence protection!', 'success');
    } else {
      showToast('Persistence could not be granted. Add app to home screen.', 'info');
    }
    refreshDurabilityState();
  };

  const handleForceMirrorSync = async () => {
    setIsSyncingMirror(true);
    try {
      const ok = await saveEmergencyBackup(true);
      if (ok) {
        showToast('Emergency mirror synchronized successfully.', 'success');
      } else {
        showToast('Mirror sync deferred (storage quota full or empty).', 'info');
      }
      refreshDurabilityState();
    } catch {
      showToast('Failed to sync emergency mirror.', 'danger');
    } finally {
      setIsSyncingMirror(false);
    }
  };

  const handleRestoreFromMirror = async () => {
    if (!mirrorMeta.exists) {
      showToast('No emergency mirror found to restore.', 'danger');
      return;
    }
    setIsMirrorRestoring(true);
    try {
      const res = await restoreFromEmergencyMirror();
      if (res.success) {
        showToast(`Recovered ${res.count} records from local mirror!`, 'success');
      } else {
        showToast(res.message, 'info');
      }
    } catch {
      showToast('Failed to recover from emergency mirror.', 'danger');
    } finally {
      setIsMirrorRestoring(false);
    }
  };

  // Backups & Restores
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{
    filename: string;
    validation: ValidationSuccess;
  } | null>(null);

  const handleDownloadBackup = async () => {
    setIsExportingBackup(true);
    try {
      await triggerBackupDownload();
      showToast('Complete backup exported as JSON file.', 'success');
    } catch {
      showToast('Failed to export backup.', 'danger');
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleExportTasks = async () => {
    try {
      await exportTasksToCsv();
      showToast('Exported tasks to CSV.', 'success');
    } catch {
      showToast('Failed to export tasks CSV.', 'danger');
    }
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const validation = validateBackupFile(text);
      if (!validation.valid) {
        showToast(`Invalid backup file: ${validation.error}`, 'danger');
        return;
      }
      setPendingRestore({
        filename: file.name,
        validation: validation as ValidationSuccess,
      });
    } catch {
      showToast('Failed to read or parse JSON file.', 'danger');
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestore) return;
    setIsRestoring(true);
    try {
      const result = await restoreDatabase(pendingRestore.validation.backup);
      if (result.success) {
        showToast(result.message, 'success');
        setPendingRestore(null);
      } else {
        showToast(result.message, 'danger');
      }
    } catch {
      showToast('Unexpected failure during database restore.', 'danger');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleWipeAllData = async () => {
    try {
      await db.courses.clear();
      await db.classSessions.clear();
      await db.classExceptions.clear();
      await db.attendance.clear();
      await db.tasks.clear();
      await db.exams.clear();
      await db.examTopics.clear();
      await db.projects.clear();
      await db.projectMilestones.clear();
      await db.projectTasks.clear();
      await db.projectMembers.clear();
      await db.projectMeetings.clear();
      await db.focusSessions.clear();
      await db.habits.clear();
      await db.habitLogs.clear();
      await db.restDays.clear();
      await db.journalEntries.clear();
      await db.dailyReflections.clear();
      await db.transactions.clear();
      await db.financialAccounts.clear();
      await db.budgets.clear();
      await db.savingsGoals.clear();
      await db.debts.clear();
      await db.recurringTransactions.clear();
      await db.creativeProjects.clear();
      await db.readingItems.clear();
      await db.quests.clear();
      await db.xpEvents.clear();
      await db.semesters.clear();

      setIsConfirmDeleteOpen(false);
      showToast('All local database records wiped clean.', 'info');
    } catch {
      showToast('Failed to wipe data.', 'danger');
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* 1. Header & Setup Wizard Relaunch */}
      <SettingsHeaderSection onRelaunchWizard={() => setOnboardingOpen(true)} />

      {/* 2. Official Section 12 Timetable Flow */}
      <SettingsSection12Card
        isSection12Loaded={isSection12Loaded}
        onOpenModal={handleOpenSection12Modal}
        isModalOpen={isSection12ModalOpen}
        onCloseModal={() => setIsSection12ModalOpen(false)}
        sec12SemName={sec12SemName}
        setSec12SemName={setSec12SemName}
        sec12StartDate={sec12StartDate}
        setSec12StartDate={setSec12StartDate}
        sec12EndDate={sec12EndDate}
        setSec12EndDate={setSec12EndDate}
        isLoadingSection12={isLoadingSection12}
        onSubmit={handleRunLoadSection12}
      />

      {/* 3. Academic Semesters Management */}
      <SettingsSemestersSection
        semesters={semesters}
        activeSemesterId={settings?.activeSemesterId}
        currentTermName={settings?.currentTermName}
        onSetActiveSemester={handleSetActiveSemester}
        onOpenAddSemester={handleOpenAddSemester}
        onOpenEditSemester={handleOpenEditSemester}
        isModalOpen={isSemesterModalOpen}
        onCloseModal={() => setIsSemesterModalOpen(false)}
        editingSemester={editingSemester}
        semFormName={semFormName}
        setSemFormName={setSemFormName}
        semFormStartDate={semFormStartDate}
        setSemFormStartDate={setSemFormStartDate}
        semFormEndDate={semFormEndDate}
        setSemFormEndDate={setSemFormEndDate}
        semFormError={semFormError}
        onSaveSemester={handleSaveSemester}
      />

      {/* 4. Visual Architecture & Reduced Motion */}
      <SettingsAppearanceSection
        currentAppearanceMode={currentAppearanceMode}
        onSelectAppearanceMode={handleSelectAppearanceMode}
        currentDesignStyle={currentDesignStyle}
        onSelectDesignStyle={handleSelectDesignStyle}
        reduceAnimations={reduceAnimations}
        onToggleReduceAnimations={handleToggleReduceAnimations}
      />

      {/* 5. Academic Identity Form */}
      <SettingsProfileSection
        userName={userName}
        setUserName={setUserName}
        termName={termName}
        setTermName={setTermName}
        universityName={universityName}
        setUniversityName={setUniversityName}
        targetCgpa={targetCgpa}
        setTargetCgpa={setTargetCgpa}
        bookGoal={bookGoal}
        setBookGoal={setBookGoal}
        hapticsEnabled={hapticsEnabled}
        setHapticsEnabled={setHapticsEnabled}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onSubmit={handleSaveProfile}
      />

      {/* 6. Notifications */}
      <NotificationSettingsSection />

      {/* 7. Storage Durability & Reliability Vault */}
      <SettingsDataSection
        persistenceInfo={persistenceInfo}
        onProtectStorage={handleProtectStorage}
        mirrorMeta={mirrorMeta}
        isSyncingMirror={isSyncingMirror}
        onForceMirrorSync={handleForceMirrorSync}
        isMirrorRestoring={isMirrorRestoring}
        onRestoreFromMirror={handleRestoreFromMirror}
        lastBackupDate={settings?.lastBackupDate}
        isExportingBackup={isExportingBackup}
        onDownloadBackup={handleDownloadBackup}
        onFileRestore={handleFileRestore}
        onExportTasks={handleExportTasks}
        isConfirmDeleteOpen={isConfirmDeleteOpen}
        setIsConfirmDeleteOpen={setIsConfirmDeleteOpen}
        onWipeAllData={handleWipeAllData}
        pendingRestore={pendingRestore}
        setPendingRestore={setPendingRestore}
        isRestoring={isRestoring}
        onConfirmRestore={handleConfirmRestore}
      />
    </div>
  );
};
