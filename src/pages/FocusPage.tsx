import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { formatMinutes, getTodayKey } from '../utils/dateUtils';
import { awardXp, triggerLevelUpConfetti } from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Zap,
  BookOpen,
  Award,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';

export const FocusPage: React.FC = () => {
  const { showToast } = useUiStore();
  const todayKey = getTodayKey();

  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const focusSessions = useLiveQuery(() => db.focusSessions.toArray()) || [];

  // State
  const [selectedDurationMins, setSelectedDurationMins] = useState(25);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);

  // References for timestamp-based timing
  const targetEndTimestampRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Mode buttons
  const modes = [
    { label: '25 / 5', mins: 25, desc: 'Classic Pomodoro' },
    { label: '45 / 10', mins: 45, desc: 'Deep University Block' },
    { label: '15 / 3', mins: 15, desc: 'Low-Energy Sprint' },
    { label: '2 Min', mins: 2, desc: 'Overcome Inertia' },
  ];

  // Today's total focused minutes
  const todayFocusMinutes = focusSessions
    .filter((s) => s.completedAt.startsWith(todayKey))
    .reduce((acc, curr) => acc + curr.minutesFocused, 0);

  // Screen Wake Lock API helper
  const acquireWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      // Graceful fallback
    }
  };

  const releaseWakeLock = () => {
    try {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      // Graceful fallback
    }
  };

  // Timestamp-based timing ticker
  useEffect(() => {
    let interval: any = null;

    if (isRunning && targetEndTimestampRef.current) {
      acquireWakeLock();

      const updateRemaining = () => {
        if (!targetEndTimestampRef.current) return;
        const now = Date.now();
        const diff = Math.max(0, Math.round((targetEndTimestampRef.current - now) / 1000));
        setRemainingSeconds(diff);

        if (diff <= 0) {
          handleSessionComplete();
        }
      };

      interval = setInterval(updateRemaining, 500);

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          updateRemaining();
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
  }, [isRunning]);

  const handleStartTimer = () => {
    targetEndTimestampRef.current = Date.now() + remainingSeconds * 1000;
    setIsRunning(true);
    showToast('Focus session started. Screen wake locked.', 'info');
  };

  const handlePauseTimer = () => {
    setIsRunning(false);
    targetEndTimestampRef.current = null;
    releaseWakeLock();
  };

  const handleResetTimer = (mins: number = selectedDurationMins) => {
    setIsRunning(false);
    targetEndTimestampRef.current = null;
    setSelectedDurationMins(mins);
    setRemainingSeconds(mins * 60);
    releaseWakeLock();
  };

  const handleSessionComplete = async () => {
    setIsRunning(false);
    targetEndTimestampRef.current = null;
    releaseWakeLock();

    const now = new Date().toISOString();
    const sessionId = generateId();

    await db.focusSessions.add({
      id: sessionId,
      courseId: selectedCourseId || undefined,
      mode: `${selectedDurationMins}min` as any,
      minutesFocused: selectedDurationMins,
      startedAt: new Date(Date.now() - selectedDurationMins * 60000).toISOString(),
      completedAt: now,
    });

    const xpToAward = selectedDurationMins + 10; // 1 XP per min + 10 completion bonus
    await awardXp({
      source: 'focus_session',
      sourceId: sessionId,
      amount: xpToAward,
      stat: 'knowledge',
    });

    triggerLevelUpConfetti();
    showToast(`🎉 Focus block complete! ${selectedDurationMins} focused minutes logged (+${xpToAward} XP)!`, 'success');
    setRemainingSeconds(selectedDurationMins * 60);
  };

  // Dial formatting
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressRatio = (selectedDurationMins * 60 - remainingSeconds) / (selectedDurationMins * 60);

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#B6E63E] font-bold">
              Monastic Deep Work Chamber
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              Timestamped Focus Timer
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Survives browser sleep • Screen wake lock • 1 XP per focused minute
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-primary))]">
              Today: {formatMinutes(todayFocusMinutes)} Focused
            </span>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {modes.map((m) => (
            <button
              key={m.label}
              onClick={() => handleResetTimer(m.mins)}
              disabled={isRunning}
              className={`p-2.5 rounded-xl border text-center transition active:scale-95 ${
                selectedDurationMins === m.mins
                  ? 'border-[#B6E63E] bg-[#B6E63E] text-stone-950 font-bold shadow-xs'
                  : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] hover:border-[#B6E63E]'
              } ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="text-xs font-heading font-bold">{m.label}</div>
              <div className="text-[10px] opacity-75">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Grand Dial Card */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-8 text-center flex flex-col items-center justify-center space-y-6">
        {/* Course Assignment */}
        <div className="w-full max-w-xs">
          <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] uppercase mb-1">
            Focus Module / Purpose
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            disabled={isRunning}
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
          >
            <option value="">General University Work</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Big Dial */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Circular SVG Ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke="currentColor"
              strokeWidth="8"
              className="text-[rgb(var(--c-surface2))]"
              fill="transparent"
            />
            <circle
              cx="128"
              cy="128"
              r="110"
              stroke="#B6E63E"
              strokeWidth="10"
              strokeDasharray={2 * Math.PI * 110}
              strokeDashoffset={2 * Math.PI * 110 * (1 - progressRatio)}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-300"
            />
          </svg>

          {/* Time Digits in Center */}
          <div className="absolute flex flex-col items-center">
            <div className="text-5xl font-heading font-bold tracking-tight text-[rgb(var(--c-text))]">
              {timeFormatted}
            </div>
            <div className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-1">
              {isRunning ? 'Flow in progress...' : 'Ready to engage'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleResetTimer(selectedDurationMins)}
            className="p-3 rounded-full border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] active:scale-90 transition"
            title="Reset Dial"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {isRunning ? (
            <button
              onClick={handlePauseTimer}
              className="px-8 py-3 rounded-full bg-amber-500 text-stone-950 font-heading text-sm font-bold shadow-lg hover:opacity-90 active:scale-95 transition flex items-center gap-2"
            >
              <Pause className="w-5 h-5 fill-current" />
              <span>Pause Block</span>
            </button>
          ) : (
            <button
              onClick={handleStartTimer}
              className="px-8 py-3 rounded-full bg-[#B6E63E] text-stone-950 font-heading text-sm font-bold shadow-lg hover:opacity-90 active:scale-95 transition flex items-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Engage Flow</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
