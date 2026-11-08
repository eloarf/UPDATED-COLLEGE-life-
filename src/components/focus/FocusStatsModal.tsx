import React from 'react';
import { BarChart3, X, Flame } from 'lucide-react';
import { Course, FocusSession } from '../../types';
import { FocusStats } from '../../utils/pomodoroEngine';
import { formatMinutes } from '../../utils/dateUtils';

interface FocusStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: FocusStats;
  focusSessions: FocusSession[];
  courses: Course[];
}

export const FocusStatsModal: React.FC<FocusStatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  focusSessions,
  courses,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#B6E63E]" />
            <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
              Study &amp; Focus Analytics
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aggregate Metrics Grid */}
        <div className="grid grid-cols-3 gap-2">
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
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading font-bold text-xs hover:bg-[rgb(var(--c-border))] transition cursor-pointer"
        >
          Close Analytics
        </button>
      </div>
    </div>
  );
};
