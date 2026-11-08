import React from 'react';
import { POMODORO_PRESETS } from '../../utils/pomodoroEngine';
import { PomodoroSettings } from '../../types';

interface FocusPresetsSelectorProps {
  settings: PomodoroSettings;
  onApplyPreset: (key: string) => void;
  isRunning: boolean;
}

export const FocusPresetsSelector: React.FC<FocusPresetsSelectorProps> = ({
  settings,
  onApplyPreset,
  isRunning,
}) => {
  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-md mt-6 pt-5 border-t border-[rgb(var(--c-border))]">
      {Object.entries(POMODORO_PRESETS).map(([key, p]) => {
        const isSelected = settings.preset === key;
        return (
          <button
            key={key}
            onClick={() => onApplyPreset(key)}
            disabled={isRunning}
            className={`p-2 rounded-xl text-center border transition text-xs active:scale-95 cursor-pointer ${
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
  );
};
