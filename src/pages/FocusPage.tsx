import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { formatMinutes } from '../utils/dateUtils';
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
  calculateRemainingSeconds,
  calculateFocusStats,
  formatDurationHuman,
} from '../utils/pomodoroEngine';
import {
  playPomodoroChime,
  triggerHaptic,
  requestNotificationPermission,
  sendLocalNotification,
} from '../utils/pomodoroSound';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Settings2,
  BarChart3,
  Flame,
  Volume2,
  VolumeX,
  Vibrate,
  Bell,
  CheckCircle2,
  Sparkles,
  Zap,
  BookOpen,
  X,
  Coffee,
  Check,
} from 'lucide-react';

export const FocusPage: React.FC = () => {
  const { showToast, activeFocusTask, setActiveFocusTask } = useUiStore();

  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const focusSessions = useLiveQuery(() => db.focusSessions.toArray()) || [];
  const appSettings = useLiveQuery(() => db.settings.get('current_user'));

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
              // Timer finished while app was suspended / closed!
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

    // Filter out accidental clicks or zero-duration sessions
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

    // Feedback
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

    const xpToAward = actualMinutes + 5;
    await awardXp({
      source: 'focus_session',
      sourceId: sessionId,
      amount: xpToAward,
      stat: 'knowledge',
    });

    triggerLevelUpConfetti();

    showToast(
      `🎉 Finished early! Recorded ${actualMinutes}m actual focus (planned ${plannedMinutes}m) • +${xpToAward} XP!`,
      'success'
    );

    // Reset pause count
    pauseCountRef.current = 0;

    // Transition to break
    const next = getNextPomodoroPhase(currentPhase, currentSessionIndex, currentCycleIndex, settings);
    setCurrentPhase(next.nextPhase);
    setCurrentSessionIndex(next.nextSession);
    setCurrentCycleIndex(next.nextCycle);

    const nextDuration = getPhaseDurationSeconds(next.nextPhase, settings);
    setRemainingSeconds(nextDuration);

    isSavingRef.current = false;

    if (next.isAllCyclesCompleted) {
      showToast('🏆 Master Study Session Complete! All cycles finished.', 'success');
    } else if (settings.autoTransition) {
      targetEndTimestampRef.current = Date.now() + nextDuration * 1000;
      setIsRunning(true);
      showToast(`Auto-transitioning to ${formatPhaseTitle(next.nextPhase)}...`, 'info');
    }
  };

  // Handle phase full countdown completion
  const handlePhaseComplete = async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    setIsRunning(false);
    targetEndTimestampRef.current = null;
    releaseWakeLock();

    // Feedback
    if (settings.soundEnabled) {
      playPomodoroChime(currentPhase === 'work' ? 'work_complete' : 'break_complete');
    }
    if (settings.vibrationEnabled) {
      triggerHaptic(currentPhase === 'work' ? [200, 100, 200, 100, 300] : [150, 80, 150]);
    }

    if (currentPhase === 'work') {
      const plannedSeconds = totalPhaseSeconds;
      const actualMinutes = Math.max(1, Math.round(plannedSeconds / 60));
      const now = new Date().toISOString();
      const sessionId = generateId();

      await db.focusSessions.add({
        id: sessionId,
        courseId: selectedCourseId || undefined,
        taskId: activeFocusTask?.taskId || undefined,
        mode: settings.preset === 'custom' ? 'custom' : `${actualMinutes}min`,
        minutesFocused: actualMinutes,
        plannedMinutes: actualMinutes,
        actualMinutes,
        plannedDurationSeconds: plannedSeconds,
        actualDurationSeconds: plannedSeconds,
        pauseCount: pauseCountRef.current,
        completionMethod: 'completed',
        sessionType: 'work',
        startedAt: new Date(Date.now() - plannedSeconds * 1000).toISOString(),
        completedAt: now,
        notes: activeFocusTask?.taskTitle ? `Focus on: ${activeFocusTask.taskTitle}` : undefined,
      });

      pauseCountRef.current = 0;

      const xpToAward = actualMinutes + 10;
      await awardXp({
        source: 'focus_session',
        sourceId: sessionId,
        amount: xpToAward,
        stat: 'knowledge',
      });

      triggerLevelUpConfetti();

      if (settings.notificationsEnabled) {
        sendLocalNotification(
          '🎯 Focus Session Completed!',
          `Great work! You finished ${actualMinutes} minutes of focus (+${xpToAward} XP). Time for a well-deserved break!`
        );
      }

      showToast(`🎯 Focus session complete! +${xpToAward} XP earned!`, 'success');
    } else {
      if (settings.notificationsEnabled) {
        sendLocalNotification(
          '☕ Break Finished',
          'Break is over! Ready to resume your focus flow?'
        );
      }
      showToast('☕ Break ended. Ready for the next focus session!', 'info');
    }

    // Determine next phase
    const next = getNextPomodoroPhase(currentPhase, currentSessionIndex, currentCycleIndex, settings);
    setCurrentPhase(next.nextPhase);
    setCurrentSessionIndex(next.nextSession);
    setCurrentCycleIndex(next.nextCycle);

    const nextDuration = getPhaseDurationSeconds(next.nextPhase, settings);
    setRemainingSeconds(nextDuration);

    isSavingRef.current = false;

    if (next.isAllCyclesCompleted) {
      showToast('🏆 Master Study Session Complete! All cycles finished.', 'success');
    } else if (settings.autoTransition) {
      // Auto-start next phase
      targetEndTimestampRef.current = Date.now() + nextDuration * 1000;
      setIsRunning(true);
      showToast(`Auto-transitioning to ${formatPhaseTitle(next.nextPhase)}...`, 'info');
    }
  };

  const formatPhaseTitle = (phase: PomodoroPhase) => {
    switch (phase) {
      case 'work':
        return 'Focus Session';
      case 'short_break':
        return 'Short Break';
      case 'long_break':
        return 'Long Break';
    }
  };

  // Preset Selection
  const applyPreset = (presetKey: string) => {
    if (presetKey === 'custom') {
      setSettings((prev) => ({ ...prev, preset: 'custom' }));
      return;
    }
    const p = POMODORO_PRESETS[presetKey];
    if (p) {
      const updated: PomodoroSettings = {
        ...settings,
        preset: presetKey as any,
        focusDurationMinutes: p.focus,
        shortBreakMinutes: p.shortBreak,
        longBreakMinutes: p.longBreak,
        sessionsBeforeLongBreak: p.sessionsBeforeLongBreak,
      };
      setSettings(updated);
      if (!isRunning) {
        setRemainingSeconds(getPhaseDurationSeconds(currentPhase, updated));
      }
      showToast(`Applied "${p.name}" preset`, 'info');
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    return calculateFocusStats(focusSessions, courses);
  }, [focusSessions, courses]);

  // Dial calculations
  const totalPhaseSeconds = getPhaseDurationSeconds(currentPhase, settings);
  const progressRatio = Math.max(0, Math.min(1, (totalPhaseSeconds - remainingSeconds) / totalPhaseSeconds));

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const phaseColor =
    currentPhase === 'work'
      ? '#B6E63E'
      : currentPhase === 'short_break'
      ? '#38bdf8'
      : '#a855f7';

  return (
    <div className="space-y-4 pb-24 animate-pop max-w-2xl mx-auto">
      {/* Linked Task Banner */}
      {activeFocusTask?.taskTitle && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-heading font-bold text-amber-600 dark:text-amber-400 block">
                Session Linked To Task
              </span>
              <div className="font-heading font-bold text-xs truncate">
                {activeFocusTask.taskTitle}
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveFocusTask(null)}
            className="text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] hover:text-rose-500 transition px-2 py-1 rounded-lg shrink-0"
          >
            Clear Link
          </button>
        </div>
      )}

      {/* Main Dial Card */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-8 text-center flex flex-col items-center justify-center relative overflow-hidden">
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${phaseColor}20`,
                color: phaseColor,
                border: `1px solid ${phaseColor}40`,
              }}
            >
              {currentPhase === 'work' ? (
                <Sparkles className="w-3.5 h-3.5" />
              ) : (
                <Coffee className="w-3.5 h-3.5" />
              )}
              {formatPhaseTitle(currentPhase)}
            </span>
            <span className="text-xs font-heading text-[rgb(var(--c-muted))]">
              Session {currentSessionIndex}/{settings.sessionsBeforeLongBreak} • Cycle {currentCycleIndex}/{settings.cyclesPerSession}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsStatsOpen(true)}
              className="p-2 rounded-xl border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition active:scale-95"
              title="Study Statistics"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition active:scale-95"
              title="Customize Timer"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Course Assignment Dropdown */}
        <div className="w-full max-w-xs mb-4">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            disabled={isRunning}
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:border-[#B6E63E]"
          >
            <option value="">General Academic Work</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Circular Dial */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center my-2">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="40%"
              stroke="currentColor"
              strokeWidth="8"
              className="text-[rgb(var(--c-surface2))]"
              fill="transparent"
            />
            <circle
              cx="50%"
              cy="50%"
              r="40%"
              stroke={phaseColor}
              strokeWidth="10"
              strokeDasharray={2 * Math.PI * 115}
              strokeDashoffset={2 * Math.PI * 115 * (1 - progressRatio)}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-300"
            />
          </svg>

          {/* Time Digits in Center */}
          <div className="absolute flex flex-col items-center">
            <div className="text-5xl sm:text-6xl font-heading font-bold tracking-tight text-[rgb(var(--c-text))]">
              {timeFormatted}
            </div>
            <div className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-1">
              {isRunning
                ? currentPhase === 'work'
                  ? 'Focus flow locked • Screen awake'
                  : 'Resting & regenerating...'
                : 'Paused • Press Play to engage'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleRestartPhase}
            className="p-3 rounded-2xl border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] active:scale-90 transition"
            title="Restart Current Phase"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {isRunning ? (
            <button
              onClick={handlePauseTimer}
              className="px-8 py-3.5 rounded-2xl bg-amber-500 text-stone-950 font-heading text-sm font-bold shadow-lg hover:opacity-95 active:scale-95 transition flex items-center gap-2 cursor-pointer"
            >
              <Pause className="w-5 h-5 fill-current" />
              <span>Pause Block</span>
            </button>
          ) : (
            <button
              onClick={handleStartTimer}
              className="px-8 py-3.5 rounded-2xl bg-[#B6E63E] text-stone-950 font-heading text-sm font-bold shadow-lg hover:opacity-95 active:scale-95 transition flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{remainingSeconds === totalPhaseSeconds ? 'Start Flow' : 'Resume Flow'}</span>
            </button>
          )}

          <button
            onClick={handleSkipPhase}
            className="p-3 rounded-2xl border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] active:scale-90 transition"
            title="Skip to Next Phase"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Early Finish Action (Critical Bug Fix: records actual elapsed work time) */}
        {currentPhase === 'work' && remainingSeconds < totalPhaseSeconds && (
          <div className="w-full flex justify-center mt-3">
            <button
              onClick={handleFinishSessionEarly}
              className="px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading text-xs font-bold shadow-md active:scale-95 transition flex items-center gap-2 cursor-pointer"
              title="Finish work early and record actual elapsed minutes"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>
                Finish Session Early ({Math.max(1, Math.round((totalPhaseSeconds - remainingSeconds) / 60))}m worked)
              </span>
            </button>
          </div>
        )}

        {/* Quick Presets Strip */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-md mt-6 pt-5 border-t border-[rgb(var(--c-border))]">
          {Object.entries(POMODORO_PRESETS).map(([key, p]) => {
            const isSelected = settings.preset === key;
            return (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                disabled={isRunning}
                className={`p-2 rounded-xl text-center border transition text-xs active:scale-95 ${
                  isSelected
                    ? 'border-[#B6E63E] bg-[#B6E63E]/10 text-[rgb(var(--c-text))] font-bold'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:border-[rgb(var(--c-text))]'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="font-heading font-bold">{p.focus}m / {p.shortBreak}m</div>
                <div className="text-[10px] opacity-75 truncate">{p.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mini Today Summary Bar */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3.5 rounded-2xl ticket-border bg-[rgb(var(--c-surface))] text-center">
          <div className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))]">Today's Focus</div>
          <div className="text-base font-heading font-bold text-[#B6E63E] mt-0.5">
            {formatMinutes(stats.dailyMinutes)}
          </div>
        </div>
        <div className="p-3.5 rounded-2xl ticket-border bg-[rgb(var(--c-surface))] text-center">
          <div className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))]">Sessions Done</div>
          <div className="text-base font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
            {stats.totalCompletedSessions}
          </div>
        </div>
        <div className="p-3.5 rounded-2xl ticket-border bg-[rgb(var(--c-surface))] text-center">
          <div className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))] flex items-center justify-center gap-1">
            <Flame className="w-3 h-3 text-amber-500" />
            <span>Streak</span>
          </div>
          <div className="text-base font-heading font-bold text-amber-500 mt-0.5">
            {stats.currentStreakDays} {stats.currentStreakDays === 1 ? 'day' : 'days'}
          </div>
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-[#B6E63E]" />
                <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                  Pomodoro Customization
                </h3>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Presets Radio */}
            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] uppercase mb-2">
                Preset Selection
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(POMODORO_PRESETS).map(([key, p]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key)}
                    className={`p-2.5 rounded-xl border text-left transition text-xs ${
                      settings.preset === key
                        ? 'border-[#B6E63E] bg-[#B6E63E]/15 font-bold text-[rgb(var(--c-text))]'
                        : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))]'
                    }`}
                  >
                    <div className="font-heading">{p.name}</div>
                    <div className="text-[10px] opacity-75">{p.focus}m / {p.shortBreak}m / {p.longBreak}m</div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => applyPreset('custom')}
                  className={`p-2.5 rounded-xl border text-left transition text-xs ${
                    settings.preset === 'custom'
                      ? 'border-[#B6E63E] bg-[#B6E63E]/15 font-bold text-[rgb(var(--c-text))]'
                      : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))]'
                  }`}
                >
                  <div className="font-heading">Custom Settings</div>
                  <div className="text-[10px] opacity-75">Tailored durations</div>
                </button>
              </div>
            </div>

            {/* Durations Configuration */}
            <div className="space-y-4 pt-2 border-t border-[rgb(var(--c-border))]">
              {/* Work / Focus Session */}
              <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                    🎯 Focus / Work Duration
                  </span>
                  <span className="text-xs font-mono font-bold text-[#B6E63E] bg-[#B6E63E]/10 px-2 py-0.5 rounded-md">
                    {formatDurationHuman(
                      (settings.preset === 'custom'
                        ? (settings.customWorkMinutes ?? 25)
                        : (settings.focusDurationMinutes ?? 25)) * 60 +
                      (settings.preset === 'custom' ? (settings.customWorkSeconds ?? 0) : 0)
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-heading text-[rgb(var(--c-muted))] mb-1">
                      Minutes
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="180"
                      value={settings.preset === 'custom' ? (settings.customWorkMinutes ?? 25) : (settings.focusDurationMinutes ?? 25)}
                      onChange={(e) => {
                        const m = Math.max(0, Math.min(180, parseInt(e.target.value) || 0));
                        const s = settings.customWorkSeconds ?? 0;
                        const total = Math.max(5, m * 60 + s);
                        setSettings((prev) => ({
                          ...prev,
                          preset: 'custom',
                          customWorkMinutes: m,
                          customWorkSeconds: s,
                          focusDurationMinutes: m,
                        }));
                        if (!isRunning && currentPhase === 'work') setRemainingSeconds(total);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-heading text-[rgb(var(--c-muted))] mb-1">
                      Seconds
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={settings.preset === 'custom' ? (settings.customWorkSeconds ?? 0) : 0}
                      onChange={(e) => {
                        const s = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                        const m = settings.customWorkMinutes ?? settings.focusDurationMinutes ?? 25;
                        const total = Math.max(5, m * 60 + s);
                        setSettings((prev) => ({
                          ...prev,
                          preset: 'custom',
                          customWorkMinutes: m,
                          customWorkSeconds: s,
                        }));
                        if (!isRunning && currentPhase === 'work') setRemainingSeconds(total);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] text-sm font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Short Break */}
              <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                    ☕ Short Break Duration
                  </span>
                  <span className="text-xs font-mono font-bold text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-md">
                    {formatDurationHuman(
                      (settings.preset === 'custom'
                        ? (settings.customShortBreakMinutes ?? 5)
                        : (settings.shortBreakMinutes ?? 5)) * 60 +
                      (settings.preset === 'custom' ? (settings.customShortBreakSeconds ?? 0) : 0)
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-heading text-[rgb(var(--c-muted))] mb-1">
                      Minutes
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={settings.preset === 'custom' ? (settings.customShortBreakMinutes ?? 5) : (settings.shortBreakMinutes ?? 5)}
                      onChange={(e) => {
                        const m = Math.max(0, Math.min(60, parseInt(e.target.value) || 0));
                        const s = settings.customShortBreakSeconds ?? 0;
                        const total = Math.max(5, m * 60 + s);
                        setSettings((prev) => ({
                          ...prev,
                          preset: 'custom',
                          customShortBreakMinutes: m,
                          customShortBreakSeconds: s,
                          shortBreakMinutes: m,
                        }));
                        if (!isRunning && currentPhase === 'short_break') setRemainingSeconds(total);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-heading text-[rgb(var(--c-muted))] mb-1">
                      Seconds
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={settings.preset === 'custom' ? (settings.customShortBreakSeconds ?? 0) : 0}
                      onChange={(e) => {
                        const s = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                        const m = settings.customShortBreakMinutes ?? settings.shortBreakMinutes ?? 5;
                        const total = Math.max(5, m * 60 + s);
                        setSettings((prev) => ({
                          ...prev,
                          preset: 'custom',
                          customShortBreakMinutes: m,
                          customShortBreakSeconds: s,
                        }));
                        if (!isRunning && currentPhase === 'short_break') setRemainingSeconds(total);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] text-sm font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Long Break */}
              <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                    🌿 Long Break Duration
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-md">
                    {formatDurationHuman(
                      (settings.preset === 'custom'
                        ? (settings.customLongBreakMinutes ?? 15)
                        : (settings.longBreakMinutes ?? 15)) * 60 +
                      (settings.preset === 'custom' ? (settings.customLongBreakSeconds ?? 0) : 0)
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-heading text-[rgb(var(--c-muted))] mb-1">
                      Minutes
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={settings.preset === 'custom' ? (settings.customLongBreakMinutes ?? 15) : (settings.longBreakMinutes ?? 15)}
                      onChange={(e) => {
                        const m = Math.max(0, Math.min(90, parseInt(e.target.value) || 0));
                        const s = settings.customLongBreakSeconds ?? 0;
                        const total = Math.max(5, m * 60 + s);
                        setSettings((prev) => ({
                          ...prev,
                          preset: 'custom',
                          customLongBreakMinutes: m,
                          customLongBreakSeconds: s,
                          longBreakMinutes: m,
                        }));
                        if (!isRunning && currentPhase === 'long_break') setRemainingSeconds(total);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-heading text-[rgb(var(--c-muted))] mb-1">
                      Seconds
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={settings.preset === 'custom' ? (settings.customLongBreakSeconds ?? 0) : 0}
                      onChange={(e) => {
                        const s = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                        const m = settings.customLongBreakMinutes ?? settings.longBreakMinutes ?? 15;
                        const total = Math.max(5, m * 60 + s);
                        setSettings((prev) => ({
                          ...prev,
                          preset: 'custom',
                          customLongBreakMinutes: m,
                          customLongBreakSeconds: s,
                        }));
                        if (!isRunning && currentPhase === 'long_break') setRemainingSeconds(total);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] text-sm font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Sessions Before Long Break & Cycles */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Sessions Before Long Break
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={settings.sessionsBeforeLongBreak}
                    onChange={(e) => {
                      const v = Math.max(1, parseInt(e.target.value) || 4);
                      setSettings((prev) => ({ ...prev, sessionsBeforeLongBreak: v }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Cycles Per Session
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.cyclesPerSession}
                    onChange={(e) => {
                      const v = Math.max(1, parseInt(e.target.value) || 2);
                      setSettings((prev) => ({ ...prev, cyclesPerSession: v }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-sm font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2.5 pt-2 border-t border-[rgb(var(--c-border))]">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] cursor-pointer">
                <div>
                  <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                    Auto-Transition Sessions
                  </div>
                  <div className="text-[10px] text-[rgb(var(--c-muted))]">
                    Automatically launch break or work when timer hits zero
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoTransition}
                  onChange={(e) => setSettings((prev) => ({ ...prev, autoTransition: e.target.checked }))}
                  className="rounded text-[#B6E63E] focus:ring-[#B6E63E] w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] cursor-pointer">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-[#B6E63E]" />
                  <div>
                    <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Sound Chime
                    </div>
                    <div className="text-[10px] text-[rgb(var(--c-muted))]">
                      Synthesized offline audio chime at session end
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSettings((prev) => ({ ...prev, soundEnabled: checked }));
                    if (checked) playPomodoroChime('work_complete');
                  }}
                  className="rounded text-[#B6E63E] focus:ring-[#B6E63E] w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] cursor-pointer">
                <div className="flex items-center gap-2">
                  <Vibrate className="w-4 h-4 text-[#B6E63E]" />
                  <div>
                    <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Vibration Haptics
                    </div>
                    <div className="text-[10px] text-[rgb(var(--c-muted))]">
                      Device vibration pulse when session completes
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.vibrationEnabled}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSettings((prev) => ({ ...prev, vibrationEnabled: checked }));
                    if (checked) triggerHaptic([100]);
                  }}
                  className="rounded text-[#B6E63E] focus:ring-[#B6E63E] w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] cursor-pointer">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#B6E63E]" />
                  <div>
                    <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      Push / System Notifications
                    </div>
                    <div className="text-[10px] text-[rgb(var(--c-muted))]">
                      Background alerts when timer runs in background
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    if (checked) {
                      const granted = await requestNotificationPermission();
                      if (!granted) {
                        showToast('Notification permission not granted by browser/system.', 'warning');
                      }
                    }
                    setSettings((prev) => ({ ...prev, notificationsEnabled: checked }));
                  }}
                  className="rounded text-[#B6E63E] focus:ring-[#B6E63E] w-4 h-4"
                />
              </label>
            </div>

            <button
              onClick={() => {
                setIsSettingsOpen(false);
                showToast('Pomodoro settings saved!', 'success');
              }}
              className="w-full py-3 rounded-2xl bg-[#B6E63E] text-stone-950 font-heading font-bold text-sm shadow-md active:scale-95 transition"
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}

      {/* STATISTICS DRAWER / MODAL */}
      {isStatsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#B6E63E]" />
                <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                  Study & Focus Analytics
                </h3>
              </div>
              <button
                onClick={() => setIsStatsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center">
                <div className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))]">Today</div>
                <div className="text-sm font-heading font-bold text-[#B6E63E] mt-0.5">
                  {formatMinutes(stats.dailyMinutes)}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center">
                <div className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))]">7-Day Total</div>
                <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
                  {formatMinutes(stats.weeklyMinutes)}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center">
                <div className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))]">30-Day Total</div>
                <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
                  {formatMinutes(stats.monthlyMinutes)}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center">
                <div className="text-[10px] uppercase font-heading text-[rgb(var(--c-muted))]">Avg Session</div>
                <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
                  {stats.averageSessionMinutes}m
                </div>
              </div>
            </div>

            {/* Streak & Sessions Card */}
            <div className="p-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                    Current Study Streak
                  </div>
                  <div className="text-[11px] text-[rgb(var(--c-muted))]">
                    {stats.currentStreakDays > 0
                      ? `${stats.currentStreakDays} consecutive active study days`
                      : 'Complete a session today to start your streak!'}
                  </div>
                </div>
              </div>
              <div className="text-xl font-heading font-bold text-amber-500">
                {stats.currentStreakDays}d
              </div>
            </div>

            {/* Course Breakdown */}
            <div>
              <div className="text-xs font-heading font-bold uppercase text-[rgb(var(--c-text))] mb-2 flex items-center justify-between">
                <span>Focus Time by Course</span>
                <span className="text-[10px] text-[rgb(var(--c-muted))] lowercase font-normal">
                  {stats.totalCompletedSessions} total sessions
                </span>
              </div>
              {stats.courseBreakdown.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center text-xs text-[rgb(var(--c-muted))]">
                  No focus sessions recorded yet. Engage your first session above!
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {stats.courseBreakdown.map((item) => {
                    const ratio = stats.totalFocusedMinutes > 0
                      ? Math.round((item.minutes / stats.totalFocusedMinutes) * 100)
                      : 0;
                    return (
                      <div
                        key={item.courseId}
                        className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-heading font-bold text-[rgb(var(--c-text))]">
                            {item.courseCode} — {item.courseName}
                          </span>
                          <span className="font-heading font-bold text-[#B6E63E]">
                            {formatMinutes(item.minutes)} ({ratio}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[rgb(var(--c-surface2))] overflow-hidden">
                          <div
                            className="h-full bg-[#B6E63E] rounded-full transition-all duration-500"
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-[rgb(var(--c-muted))]">
                          {item.sessionCount} {item.sessionCount === 1 ? 'block' : 'blocks'} completed
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Focus History */}
            <div>
              <div className="text-xs font-heading font-bold uppercase text-[rgb(var(--c-text))] mb-2 flex items-center justify-between">
                <span>Recent Focus Sessions</span>
                <span className="text-[10px] text-[rgb(var(--c-muted))] font-normal">
                  Last 8 entries
                </span>
              </div>
              {focusSessions.length === 0 ? (
                <div className="p-3 text-center text-xs text-[rgb(var(--c-muted))] bg-[rgb(var(--c-bg))] rounded-xl border border-[rgb(var(--c-border))]">
                  No session logs recorded yet.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {focusSessions
                    .slice()
                    .reverse()
                    .slice(0, 8)
                    .map((sess) => {
                      const course = courses.find((c) => c.id === sess.courseId);
                      const actualM = sess.actualMinutes ?? sess.minutesFocused ?? 0;
                      const plannedM = sess.plannedMinutes;
                      const isEarly = sess.completionMethod === 'manual_finish';

                      return (
                        <div
                          key={sess.id}
                          className="p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-heading font-bold text-[rgb(var(--c-text))] truncate">
                              {course ? `${course.code} — ${course.name}` : 'General University Focus'}
                            </div>
                            <div className="text-[10px] text-[rgb(var(--c-muted))] flex items-center gap-2 mt-0.5">
                              <span>
                                {sess.completedAt ? new Date(sess.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                              </span>
                              {sess.pauseCount ? (
                                <span>• {sess.pauseCount} pause{sess.pauseCount === 1 ? '' : 's'}</span>
                              ) : null}
                              {sess.notes && (
                                <span className="truncate max-w-[120px]">• {sess.notes}</span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-heading font-bold text-[#B6E63E]">
                              {actualM}m active
                            </div>
                            <span
                              className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-bold uppercase mt-0.5 ${
                                isEarly
                                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                  : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                              }`}
                            >
                              {isEarly ? (plannedM ? `Early (${actualM}/${plannedM}m)` : 'Early Finish') : 'Full Session'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <button
              onClick={() => setIsStatsOpen(false)}
              className="w-full py-2.5 rounded-2xl bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading font-bold text-xs hover:bg-[rgb(var(--c-border))] transition cursor-pointer"
            >
              Close Analytics
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
