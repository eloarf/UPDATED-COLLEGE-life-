import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { awardXp, triggerLevelUpConfetti } from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import {
  PomodoroSettings,
  DEFAULT_POMODORO_SETTINGS,
} from '../types';
import {
  PomodoroPhase,
  POMODORO_PRESETS,
  POMODORO_STORAGE_KEY,
  getPhaseDurationSeconds,
  getNextPomodoroPhase,
  calculateFocusStats,
} from '../utils/pomodoroEngine';

const formatPhaseTitle = (phase: PomodoroPhase): string => {
  switch (phase) {
    case 'work': return 'Deep Work';
    case 'short_break': return 'Short Break';
    case 'long_break': return 'Long Break';
    default: return 'Focus';
  }
};

const getPhaseThemeColor = (phase: PomodoroPhase): string => {
  switch (phase) {
    case 'work': return '#B6E63E';
    case 'short_break': return '#38BDF8';
    case 'long_break': return '#C084FC';
    default: return '#B6E63E';
  }
};
import {
  playPomodoroChime,
  triggerHaptic,
  sendLocalNotification,
} from '../utils/pomodoroSound';

import { FocusActiveTaskBanner } from '../components/focus/FocusActiveTaskBanner';
import { FocusTimerDial } from '../components/focus/FocusTimerDial';
import { FocusTimerControls } from '../components/focus/FocusTimerControls';
import { FocusPresetsSelector } from '../components/focus/FocusPresetsSelector';
import { FocusStatsSummaryBar } from '../components/focus/FocusStatsSummaryBar';
import { FocusSettingsModal } from '../components/focus/FocusSettingsModal';
import { FocusStatsModal } from '../components/focus/FocusStatsModal';

export const FocusPage: React.FC = () => {
  const { showToast, activeFocusTask, setActiveFocusTask } = useUiStore();

  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const focusSessions = useLiveQuery(() => db.focusSessions.toArray()) || [];

  // Load initial settings
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    try {
      const saved = localStorage.getItem('college_os_pomodoro_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_POMODORO_SETTINGS;
  });

  // Timer Core State
  const [currentPhase, setCurrentPhase] = useState<PomodoroPhase>('work');
  const [currentSessionIndex, setCurrentSessionIndex] = useState(1);
  const [currentCycleIndex, setCurrentCycleIndex] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getPhaseDurationSeconds('work', settings)
  );
  const [selectedCourseId, setSelectedCourseId] = useState(activeFocusTask?.courseId || '');

  // UI Panels
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // References for timestamp resilient timing
  const targetEndTimestampRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const pauseCountRef = useRef<number>(0);
  const isSavingRef = useRef<boolean>(false);

  // Sync activeFocusTask course
  useEffect(() => {
    if (activeFocusTask?.courseId) {
      setSelectedCourseId(activeFocusTask.courseId);
    }
  }, [activeFocusTask]);

  // Restore state from localStorage on first mount
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(POMODORO_STORAGE_KEY);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved && typeof saved === 'object') {
          if (saved.settings) setSettings(saved.settings);
          if (saved.currentPhase) setCurrentPhase(saved.currentPhase);
          if (typeof saved.currentSessionIndex === 'number') setCurrentSessionIndex(saved.currentSessionIndex);
          if (typeof saved.currentCycleIndex === 'number') setCurrentCycleIndex(saved.currentCycleIndex);
          if (saved.selectedCourseId) setSelectedCourseId(saved.selectedCourseId);

          if (saved.isRunning && saved.targetEndTimestamp) {
            const now = Date.now();
            if (now >= saved.targetEndTimestamp) {
              setRemainingSeconds(0);
              targetEndTimestampRef.current = null;
              setIsRunning(false);
            } else {
              targetEndTimestampRef.current = saved.targetEndTimestamp;
              setRemainingSeconds(Math.ceil((saved.targetEndTimestamp - now) / 1000));
              setIsRunning(true);
            }
          } else if (typeof saved.remainingSeconds === 'number') {
            setRemainingSeconds(saved.remainingSeconds);
            setIsRunning(false);
          }
        }
      }
    } catch (err) {
      console.warn('Could not restore Pomodoro state:', err);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      const snapshot = {
        isRunning,
        targetEndTimestamp: targetEndTimestampRef.current,
        remainingSeconds,
        currentPhase,
        currentSessionIndex,
        currentCycleIndex,
        selectedCourseId,
        settings,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(snapshot));
      localStorage.setItem('college_os_pomodoro_settings', JSON.stringify(settings));
    } catch {}
  }, [
    isRunning,
    remainingSeconds,
    currentPhase,
    currentSessionIndex,
    currentCycleIndex,
    selectedCourseId,
    settings,
  ]);

  // Screen Wake Lock API
  const acquireWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {}
  };

  const releaseWakeLock = () => {
    try {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {}
  };

  // Phase transition logic
  const handlePhaseComplete = async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    setIsRunning(false);
    targetEndTimestampRef.current = null;
    releaseWakeLock();

    const completedPhase = currentPhase;
    const completedSessionIndex = currentSessionIndex;
    const completedCycleIndex = currentCycleIndex;

    // Record completed work session in Dexie
    if (completedPhase === 'work') {
      const actualMinutes = Math.max(1, Math.round(totalPhaseSeconds / 60));
      const sessionId = generateId();
      const now = new Date().toISOString();

      await db.focusSessions.add({
        id: sessionId,
        courseId: selectedCourseId || undefined,
        taskId: activeFocusTask?.taskId || undefined,
        mode: settings.preset === 'custom' ? 'custom' : `${actualMinutes}min`,
        minutesFocused: actualMinutes,
        plannedMinutes: actualMinutes,
        actualMinutes,
        plannedDurationSeconds: totalPhaseSeconds,
        actualDurationSeconds: totalPhaseSeconds,
        pauseCount: pauseCountRef.current,
        completionMethod: 'completed',
        sessionType: 'work',
        startedAt: new Date(Date.now() - totalPhaseSeconds * 1000).toISOString(),
        completedAt: now,
        notes: activeFocusTask?.taskTitle ? `Focus on: ${activeFocusTask.taskTitle}` : undefined,
      });

      // Award XP for deep work
      const xpEarned = actualMinutes >= 45 ? 60 : actualMinutes >= 25 ? 35 : 15;
      await awardXp({
        source: 'focus_session',
        sourceId: sessionId,
        amount: xpEarned,
        stat: 'discipline',
      });
      triggerLevelUpConfetti();
      showToast(`🎯 Focus session complete! +${xpEarned} XP awarded`, 'success');
    }

    // Audio chime & haptic feedback
    if (settings.soundEnabled) {
      playPomodoroChime(completedPhase === 'work' ? 'work_complete' : 'break_complete');
    }
    if (settings.vibrationEnabled) {
      triggerHaptic(
        completedPhase === 'work'
          ? [200, 100, 200, 100, 400]
          : [150, 80, 150]
      );
    }
    if (settings.notificationsEnabled) {
      sendLocalNotification(
        completedPhase === 'work' ? 'Focus Session Complete! 🏆' : 'Break Finished! ⚡',
        completedPhase === 'work'
          ? 'Great work! Take a breath and transition to your rest break.'
          : 'Break is up. Return to flow when you are ready to focus.'
      );
    }

    // Advance to next phase
    const next = getNextPomodoroPhase(
      completedPhase,
      completedSessionIndex,
      completedCycleIndex,
      settings
    );

    setCurrentPhase(next.nextPhase);
    setCurrentSessionIndex(next.nextSession);
    setCurrentCycleIndex(next.nextCycle);
    pauseCountRef.current = 0;

    const nextDuration = getPhaseDurationSeconds(next.nextPhase, settings);
    setRemainingSeconds(nextDuration);

    isSavingRef.current = false;

    // Auto-transition if enabled
    if (settings.autoTransition) {
      targetEndTimestampRef.current = Date.now() + nextDuration * 1000;
      setIsRunning(true);
    }
  };

  // Timer Tick Engine using Timestamps (impervious to throttling & sleep)
  useEffect(() => {
    let interval: any = null;

    if (isRunning && targetEndTimestampRef.current) {
      acquireWakeLock();

      const checkTime = () => {
        if (!targetEndTimestampRef.current) return;
        const now = Date.now();
        const diff = Math.max(0, Math.ceil((targetEndTimestampRef.current - now) / 1000));
        setRemainingSeconds(diff);

        if (diff <= 0) {
          handlePhaseComplete();
        }
      };

      interval = setInterval(checkTime, 500);

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          checkTime();
          acquireWakeLock();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      releaseWakeLock();
    }
  }, [isRunning, currentPhase, currentSessionIndex, currentCycleIndex, settings]);

  // Start timer
  const handleStartTimer = () => {
    targetEndTimestampRef.current = Date.now() + remainingSeconds * 1000;
    setIsRunning(true);
  };

  // Pause timer
  const handlePauseTimer = () => {
    setIsRunning(false);
    targetEndTimestampRef.current = null;
    pauseCountRef.current += 1;
    releaseWakeLock();
  };

  // Restart current phase
  const handleRestartPhase = () => {
    setIsRunning(false);
    targetEndTimestampRef.current = null;
    pauseCountRef.current = 0;
    releaseWakeLock();
    const dur = getPhaseDurationSeconds(currentPhase, settings);
    setRemainingSeconds(dur);
  };

  // Skip current phase
  const handleSkipPhase = () => {
    setIsRunning(false);
    targetEndTimestampRef.current = null;
    pauseCountRef.current = 0;
    releaseWakeLock();

    const next = getNextPomodoroPhase(currentPhase, currentSessionIndex, currentCycleIndex, settings);
    setCurrentPhase(next.nextPhase);
    setCurrentSessionIndex(next.nextSession);
    setCurrentCycleIndex(next.nextCycle);
    setRemainingSeconds(getPhaseDurationSeconds(next.nextPhase, settings));

    showToast(`Skipped to ${formatPhaseTitle(next.nextPhase)}`, 'info');
  };

  // Early Completion of Deep Work / Focus Session
  const handleFinishSessionEarly = async () => {
    if (isSavingRef.current || currentPhase !== 'work') return;
    isSavingRef.current = true;

    setIsRunning(false);
    targetEndTimestampRef.current = null;
    releaseWakeLock();

    const totalPlannedSeconds = totalPhaseSeconds;
    const actualElapsedSeconds = Math.max(0, totalPlannedSeconds - remainingSeconds);

    if (actualElapsedSeconds < 15) {
      showToast('Session cancelled (less than 15s elapsed, not recorded)', 'info');
      isSavingRef.current = false;
      handleRestartPhase();
      return;
    }

    const actualMinutes = Math.max(1, Math.round(actualElapsedSeconds / 60));
    const plannedMinutes = Math.max(1, Math.round(totalPlannedSeconds / 60));
    const sessionId = generateId();
    const now = new Date().toISOString();

    if (settings.soundEnabled) {
      playPomodoroChime('work_complete');
    }
    if (settings.vibrationEnabled) {
      triggerHaptic([200, 100, 200, 100, 300]);
    }

    await db.focusSessions.add({
      id: sessionId,
      courseId: selectedCourseId || undefined,
      taskId: activeFocusTask?.taskId || undefined,
      mode: settings.preset === 'custom' ? 'custom' : `${plannedMinutes}min`,
      minutesFocused: actualMinutes,
      plannedMinutes,
      actualMinutes,
      plannedDurationSeconds: totalPlannedSeconds,
      actualDurationSeconds: actualElapsedSeconds,
      pauseCount: pauseCountRef.current,
      completionMethod: 'manual_finish',
      sessionType: 'work',
      startedAt: new Date(Date.now() - actualElapsedSeconds * 1000).toISOString(),
      completedAt: now,
      notes: activeFocusTask?.taskTitle ? `Focus on: ${activeFocusTask.taskTitle}` : undefined,
    });

    const xpEarned = Math.max(10, Math.round(actualMinutes * 1.2));
    await awardXp({
      source: 'focus_session',
      sourceId: sessionId,
      amount: xpEarned,
      stat: 'discipline',
    });
    triggerLevelUpConfetti();
    showToast(`🏆 Focus logged early: ${actualMinutes}m worked (+${xpEarned} XP)`, 'success');

    // Advance to next break phase
    const next = getNextPomodoroPhase(currentPhase, currentSessionIndex, currentCycleIndex, settings);
    setCurrentPhase(next.nextPhase);
    setCurrentSessionIndex(next.nextSession);
    setCurrentCycleIndex(next.nextCycle);
    pauseCountRef.current = 0;

    const nextDuration = getPhaseDurationSeconds(next.nextPhase, settings);
    setRemainingSeconds(nextDuration);

    isSavingRef.current = false;
  };

  const applyPreset = (presetKey: string) => {
    if (isRunning) return;
    const p = POMODORO_PRESETS[presetKey];
    if (p) {
      const newSettings: PomodoroSettings = {
        ...settings,
        preset: presetKey as any,
        focusDurationMinutes: p.focus,
        shortBreakMinutes: p.shortBreak,
        longBreakMinutes: p.longBreak,
      };
      setSettings(newSettings);
      setRemainingSeconds(getPhaseDurationSeconds(currentPhase, newSettings));
      showToast(`Applied preset: ${p.name}`, 'info');
    } else if (presetKey === 'custom') {
      setSettings((prev) => ({ ...prev, preset: 'custom' }));
    }
  };

  // Calculations for current dial
  const totalPhaseSeconds = useMemo(() => {
    return getPhaseDurationSeconds(currentPhase, settings);
  }, [currentPhase, settings]);

  const progressRatio = Math.max(0, Math.min(1, 1 - remainingSeconds / (totalPhaseSeconds || 1)));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const timeFormatted = formatTime(remainingSeconds);
  const phaseColor = getPhaseThemeColor(currentPhase);

  // Statistics
  const stats = useMemo(() => {
    return calculateFocusStats(focusSessions, courses);
  }, [focusSessions, courses]);

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-24 animate-pop">
      {/* Linked Task Banner */}
      <FocusActiveTaskBanner
        activeFocusTask={activeFocusTask}
        courses={courses}
        onClearLink={() => setActiveFocusTask(null)}
      />

      {/* Main Dial Card */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-8 text-center flex flex-col items-center justify-center relative overflow-hidden">
        <FocusTimerDial
          currentPhase={currentPhase}
          phaseColor={phaseColor}
          formatPhaseTitle={formatPhaseTitle}
          currentSessionIndex={currentSessionIndex}
          currentCycleIndex={currentCycleIndex}
          settings={settings}
          onOpenStats={() => setIsStatsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          selectedCourseId={selectedCourseId}
          onSelectCourseId={setSelectedCourseId}
          courses={courses}
          isRunning={isRunning}
          progressRatio={progressRatio}
          timeFormatted={timeFormatted}
        />

        <FocusTimerControls
          isRunning={isRunning}
          currentPhase={currentPhase}
          remainingSeconds={remainingSeconds}
          totalPhaseSeconds={totalPhaseSeconds}
          onRestartPhase={handleRestartPhase}
          onStartTimer={handleStartTimer}
          onPauseTimer={handlePauseTimer}
          onSkipPhase={handleSkipPhase}
          onFinishEarly={handleFinishSessionEarly}
        />

        <FocusPresetsSelector
          settings={settings}
          onApplyPreset={applyPreset}
          isRunning={isRunning}
        />
      </div>

      {/* Mini Today Summary Bar */}
      <FocusStatsSummaryBar
        dailyMinutes={stats.dailyMinutes}
        totalCompletedSessions={stats.totalCompletedSessions}
        currentStreakDays={stats.currentStreakDays}
      />

      {/* SETTINGS MODAL */}
      <FocusSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        setSettings={setSettings}
        onApplyPreset={applyPreset}
        isRunning={isRunning}
        currentPhase={currentPhase}
        setRemainingSeconds={setRemainingSeconds}
        showToast={showToast}
      />

      {/* STATISTICS MODAL */}
      <FocusStatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
        focusSessions={focusSessions}
        courses={courses}
      />
    </div>
  );
};
