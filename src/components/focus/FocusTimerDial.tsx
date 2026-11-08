import React from 'react';
import { Sparkles, Coffee, BarChart3, Settings2 } from 'lucide-react';
import { PomodoroPhase } from '../../utils/pomodoroEngine';
import { PomodoroSettings, Course } from '../../types';

interface FocusTimerDialProps {
  currentPhase: PomodoroPhase;
  phaseColor: string;
  formatPhaseTitle: (phase: PomodoroPhase) => string;
  currentSessionIndex: number;
  currentCycleIndex: number;
  settings: PomodoroSettings;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  selectedCourseId: string;
  onSelectCourseId: (id: string) => void;
  courses: Course[];
  isRunning: boolean;
  progressRatio: number;
  timeFormatted: string;
}

export const FocusTimerDial: React.FC<FocusTimerDialProps> = ({
  currentPhase,
  phaseColor,
  formatPhaseTitle,
  currentSessionIndex,
  currentCycleIndex,
  settings,
  onOpenStats,
  onOpenSettings,
  selectedCourseId,
  onSelectCourseId,
  courses,
  isRunning,
  progressRatio,
  timeFormatted,
}) => {
  return (
    <>
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
            onClick={onOpenStats}
            className="p-2 rounded-xl border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition active:scale-95 cursor-pointer"
            title="Study Statistics"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition active:scale-95 cursor-pointer"
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
          onChange={(e) => onSelectCourseId(e.target.value)}
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
          <div className="text-5xl sm:text-6xl font-heading font-bold tracking-tight text-[rgb(var(--c-text))] font-mono">
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
    </>
  );
};
