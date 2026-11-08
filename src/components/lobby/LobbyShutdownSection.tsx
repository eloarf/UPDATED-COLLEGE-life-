import React from 'react';
import { Moon, X, Check, CheckCircle2 } from 'lucide-react';
import { Task, DailyReflection } from '../../types';

interface LobbyShutdownSectionProps {
  isShutdownOpen: boolean;
  setIsShutdownOpen: (val: boolean) => void;
  todayReflection: DailyReflection | null;
  completedTodayTasks: Task[];
  unfinishedTasks: Task[];
  shutdownWin: string;
  setShutdownWin: (val: string) => void;
  shutdownTomorrowFocus: string;
  setShutdownTomorrowFocus: (val: string) => void;
  handleRescheduleToTomorrow: (taskId: string) => void;
  handleCompleteShutdown: () => void;
}

export const LobbyShutdownSection: React.FC<LobbyShutdownSectionProps> = ({
  isShutdownOpen,
  setIsShutdownOpen,
  todayReflection,
  completedTodayTasks,
  unfinishedTasks,
  shutdownWin,
  setShutdownWin,
  shutdownTomorrowFocus,
  setShutdownTomorrowFocus,
  handleRescheduleToTomorrow,
  handleCompleteShutdown,
}) => {
  return (
    <>
      {/* EVENING SHUTDOWN CARD */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#7A2E4A]/15 text-[#7A2E4A] flex items-center justify-center shrink-0">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
              {todayReflection ? 'Daily Shutdown Logged ✓' : 'Evening Shutdown'}
            </h3>
            <p className="text-xs text-[rgb(var(--c-muted))]">
              {todayReflection
                ? `Logged: "${todayReflection.meaningfulAccomplishment}"`
                : 'Review completed tasks, roll over pending items, and earn +25 XP.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsShutdownOpen(true)}
          className="min-h-[40px] px-4 py-2 rounded-xl bg-[#7A2E4A] text-white font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>{todayReflection ? 'Update Shutdown' : 'Begin Shutdown'}</span>
        </button>
      </div>

      {/* SHUTDOWN MODAL */}
      {isShutdownOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5 sm:p-6 text-[rgb(var(--c-text))] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2 font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                <Moon className="w-4 h-4 text-[#7A2E4A]" />
                <span>Evening Shutdown</span>
              </div>
              <button
                onClick={() => setIsShutdownOpen(false)}
                className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Accomplishments review */}
            <div>
              <span className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] uppercase block mb-1">
                Completed Today ({completedTodayTasks.length} tasks)
              </span>
              {completedTodayTasks.length === 0 ? (
                <p className="text-xs text-[rgb(var(--c-muted))]">
                  No tasks stamped complete today. A lighter day is completely fine!
                </p>
              ) : (
                <div className="space-y-1">
                  {completedTodayTasks.slice(0, 4).map((t) => (
                    <div key={t.id} className="text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unfinished Work Handling */}
            {unfinishedTasks.length > 0 && (
              <div>
                <span className="text-xs font-heading font-bold text-amber-600 dark:text-amber-400 uppercase block mb-1">
                  Pending Tasks ({unfinishedTasks.length})
                </span>
                <div className="space-y-1.5">
                  {unfinishedTasks.slice(0, 3).map((t) => (
                    <div key={t.id} className="p-2 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex items-center justify-between text-xs gap-2">
                      <span className="truncate flex-1">{t.title}</span>
                      <button
                        onClick={() => handleRescheduleToTomorrow(t.id)}
                        className="min-h-[32px] text-[11px] px-2.5 py-1 rounded-lg bg-[rgb(var(--c-surface2))] hover:bg-[rgb(var(--c-primary))] hover:text-stone-900 font-heading font-bold transition shrink-0 cursor-pointer"
                      >
                        Tomorrow →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meaningful Accomplishment Note */}
            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] mb-1">
                What was your most meaningful win or lesson today?
              </label>
              <textarea
                value={shutdownWin}
                onChange={(e) => setShutdownWin(e.target.value)}
                placeholder="e.g. Mastered the limits section in Calculus; stayed focused during study block."
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-1 focus:ring-[#7A2E4A]"
              />
            </div>

            {/* Tomorrow's Anchor Intention */}
            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] mb-1">
                Primary Focus for Tomorrow
              </label>
              <input
                type="text"
                value={shutdownTomorrowFocus}
                onChange={(e) => setShutdownTomorrowFocus(e.target.value)}
                placeholder="e.g. Physics Lab Prep + Chapter 3 readings"
                className="min-h-[40px] w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-1 focus:ring-[#7A2E4A]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
              <button
                type="button"
                onClick={() => setIsShutdownOpen(false)}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] text-xs font-heading cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteShutdown}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-[#7A2E4A] text-white font-heading font-bold text-xs hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Shutdown (+25 XP)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
