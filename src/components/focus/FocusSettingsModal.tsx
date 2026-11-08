import React from 'react';
import { Settings2, X, Volume2, Vibrate, Bell } from 'lucide-react';
import { PomodoroSettings } from '../../types';
import {
  POMODORO_PRESETS,
  PomodoroPhase,
  formatDurationHuman,
} from '../../utils/pomodoroEngine';
import { playPomodoroChime, triggerHaptic, requestNotificationPermission } from '../../utils/pomodoroSound';

interface FocusSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PomodoroSettings;
  setSettings: React.Dispatch<React.SetStateAction<PomodoroSettings>>;
  onApplyPreset: (key: string) => void;
  isRunning: boolean;
  currentPhase: PomodoroPhase;
  setRemainingSeconds: (s: number) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'danger' | 'warning') => void;
}

export const FocusSettingsModal: React.FC<FocusSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  setSettings,
  onApplyPreset,
  isRunning,
  currentPhase,
  setRemainingSeconds,
  showToast,
}) => {
  if (!isOpen) return null;

  return (
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
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] cursor-pointer"
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
                onClick={() => onApplyPreset(key)}
                className={`p-2.5 rounded-xl border text-left transition text-xs cursor-pointer ${
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
              onClick={() => onApplyPreset('custom')}
              className={`p-2.5 rounded-xl border text-left transition text-xs cursor-pointer ${
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
              className="rounded text-[#B6E63E] focus:ring-[#B6E63E] w-4 h-4 cursor-pointer"
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
              className="rounded text-[#B6E63E] focus:ring-[#B6E63E] w-4 h-4 cursor-pointer"
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
              className="rounded text-[#B6E63E] focus:ring-[#B6E63E] w-4 h-4 cursor-pointer"
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
              className="rounded text-[#B6E63E] focus:ring-[#B6E63E] w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        <button
          onClick={() => {
            onClose();
            showToast('Pomodoro settings saved!', 'success');
          }}
          className="w-full py-3 rounded-2xl bg-[#B6E63E] text-stone-950 font-heading font-bold text-sm shadow-md active:scale-95 transition cursor-pointer"
        >
          Apply Settings
        </button>
      </div>
    </div>
  );
};
