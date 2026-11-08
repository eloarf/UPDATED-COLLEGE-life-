import React from 'react';
import { RotateCcw, Pause, Play, SkipForward, CheckCircle2 } from 'lucide-react';
import { PomodoroPhase } from '../../utils/pomodoroEngine';

interface FocusTimerControlsProps {
  isRunning: boolean;
  currentPhase: PomodoroPhase;
  remainingSeconds: number;
  totalPhaseSeconds: number;
  onRestartPhase: () => void;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onSkipPhase: () => void;
  onFinishEarly: () => void;
}

export const FocusTimerControls: React.FC<FocusTimerControlsProps> = ({
  isRunning,
  currentPhase,
  remainingSeconds,
  totalPhaseSeconds,
  onRestartPhase,
  onStartTimer,
  onPauseTimer,
  onSkipPhase,
  onFinishEarly,
}) => {
  const elapsedMinutes = Math.max(1, Math.round((totalPhaseSeconds - remainingSeconds) / 60));

  return (
    <>
      {/* Controls */}
      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={onRestartPhase}
          className="p-3 rounded-2xl border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] active:scale-90 transition cursor-pointer"
          title="Restart Current Phase"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        {isRunning ? (
          <button
            onClick={onPauseTimer}
            className="px-8 py-3.5 rounded-2xl bg-amber-500 text-stone-950 font-heading text-sm font-bold shadow-lg hover:opacity-95 active:scale-95 transition flex items-center gap-2 cursor-pointer"
          >
            <Pause className="w-5 h-5 fill-current" />
            <span>Pause Block</span>
          </button>
        ) : (
          <button
            onClick={onStartTimer}
            className="px-8 py-3.5 rounded-2xl bg-[#B6E63E] text-stone-950 font-heading text-sm font-bold shadow-lg hover:opacity-95 active:scale-95 transition flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{remainingSeconds === totalPhaseSeconds ? 'Start Flow' : 'Resume Flow'}</span>
          </button>
        )}

        <button
          onClick={onSkipPhase}
          className="p-3 rounded-2xl border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] active:scale-90 transition cursor-pointer"
          title="Skip to Next Phase"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Early Finish Action (records actual elapsed work time) */}
      {currentPhase === 'work' && remainingSeconds < totalPhaseSeconds && (
        <div className="w-full flex justify-center mt-3">
          <button
            onClick={onFinishEarly}
            className="px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading text-xs font-bold shadow-md active:scale-95 transition flex items-center gap-2 cursor-pointer"
            title="Finish work early and record actual elapsed minutes"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>
              Finish Session Early ({elapsedMinutes}m worked)
            </span>
          </button>
        </div>
      )}
    </>
  );
};
