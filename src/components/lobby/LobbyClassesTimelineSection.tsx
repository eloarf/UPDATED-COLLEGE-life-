import { Calendar, ChevronRight, CheckCircle2, X, Clock, AlertCircle } from 'lucide-react';
import { AttendanceRecord } from '../../types';
import { ScheduledClass } from '../../utils/scheduleEngine';
import { TimelineItem } from '../../utils/todayEngine';
import { canMarkAttendance } from '../../utils/attendanceEngine';

interface LobbyClassesTimelineSectionProps {
  timeline: { items: TimelineItem[]; hasConflicts: boolean };
  todayKey: string;
  attendanceRecords: AttendanceRecord[];
  handleSetAttendance: (
    courseId: string,
    status: 'present' | 'late' | 'absent' | 'postponed',
    sessionId?: string,
    startTime?: string,
    isCancelled?: boolean
  ) => void;
  handleOpenPostponeModal: (sc: ScheduledClass) => void;
  onNavigate: (route: string) => void;
}

export const LobbyClassesTimelineSection: React.FC<LobbyClassesTimelineSectionProps> = ({
  timeline,
  todayKey,
  attendanceRecords,
  handleSetAttendance,
  handleOpenPostponeModal,
  onNavigate,
}) => {
  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
        <div className="flex items-center gap-2 font-heading text-xs sm:text-sm font-bold text-[rgb(var(--c-text))]">
          <Calendar className="w-4 h-4 text-[rgb(var(--c-primary))]" />
          <span>Today's Classes &amp; Schedule</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('#/today')}
            className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] hover:underline cursor-pointer"
          >
            Timeline →
          </button>
          <span className="text-[rgb(var(--c-border))]">·</span>
          <button
            onClick={() => onNavigate('#/timetable')}
            className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] cursor-pointer"
          >
            Timetable →
          </button>
        </div>
      </div>

      {timeline.items.length === 0 ? (
        <div className="p-4 text-center text-xs text-[rgb(var(--c-muted))] rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
          No scheduled lectures or exams on today's docket. Open window for focused self-study.
        </div>
      ) : (
        <div className="space-y-2">
          {timeline.items.map((item) => {
            const isCurrent = item.status === 'current';
            const isPast = item.status === 'past';
            const isClass = item.kind === 'class';
            const attendance = isClass && item.courseId
              ? attendanceRecords.find((a) => a.courseId === item.courseId && a.date === todayKey)
              : null;

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition ${
                  isCurrent
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                    : isPast
                    ? 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] opacity-75'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[rgb(var(--c-primary))]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span
                      className="w-2 h-8 rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: item.color || '#B6E63E' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="font-mono text-xs font-bold text-[rgb(var(--c-text))]">
                          {item.startTime} – {item.endTime}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-stone-950 font-heading font-bold text-[9px] uppercase">
                            Now
                          </span>
                        )}
                        {item.isPostponed && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-heading font-bold text-[9px] uppercase border border-amber-500/30">
                            Postponed to {item.postponedToDate} {item.postponedToTime || ''}
                          </span>
                        )}
                        {item.isRescheduledOccurrence && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400 font-heading font-bold text-[9px] uppercase border border-purple-500/30">
                            Rescheduled from {item.rescheduledFromDate}
                          </span>
                        )}
                        {attendance && (
                          <span
                            className={`px-1.5 py-0.2 rounded font-heading font-bold text-[9px] uppercase border ${
                              attendance.status === 'present'
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                                : attendance.status === 'late'
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                                : attendance.status === 'absent'
                                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40'
                                : 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/40'
                            }`}
                          >
                            {attendance.status === 'present'
                              ? '✓ Present'
                              : attendance.status === 'late'
                              ? '⏱ Late'
                              : attendance.status === 'absent'
                              ? '✗ Absent'
                              : '↷ Postponed'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.courseId) onNavigate(`#/courses/${item.courseId}`);
                            else if (item.actionPayload?.type === 'exam') onNavigate('#/exams');
                            else onNavigate('#/timetable');
                          }}
                          className="text-xs font-heading font-bold text-[rgb(var(--c-text))] hover:text-[rgb(var(--c-primary))] truncate text-left cursor-pointer"
                          title="Open Course Hub"
                        >
                          {item.title}
                        </button>
                        {item.courseId && (
                          <button
                            type="button"
                            onClick={() => onNavigate(`#/courses/${item.courseId}`)}
                            className="text-[10px] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] shrink-0 font-heading font-bold"
                            title="Open Course Hub"
                          >
                            Hub →
                          </button>
                        )}
                      </div>
                      {item.location && (
                        <div className="text-[11px] text-[rgb(var(--c-muted))] truncate mt-0.5">
                          {item.location}
                        </div>
                      )}
                    </div>
                  </div>

                  {!isClass && (
                    <button
                      onClick={() => {
                        if (item.actionPayload?.type === 'exam') onNavigate('#/exams');
                        else onNavigate('#/tasks');
                      }}
                      className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Interactive Class Attendance Controls directly on Home Page */}
                {isClass && (() => {
                  const eligibility = canMarkAttendance({
                    date: todayKey,
                    startTime: item.startTime,
                    isCancelled: item.isCancelled,
                  });

                  return (
                    <div className="mt-2.5 pt-2 border-t border-[rgb(var(--c-border))]">
                      {!eligibility.canMark ? (
                        <div className="flex items-center justify-between text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                          <span>{eligibility.reason}</span>
                          {item.scheduledClass && (
                            <button
                              type="button"
                              onClick={() => handleOpenPostponeModal(item.scheduledClass!)}
                              className="text-xs font-heading font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                            >
                              Postpone class
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (item.courseId) {
                                handleSetAttendance(item.courseId, 'present', item.sessionId, item.startTime, item.isCancelled);
                              }
                            }}
                            className={`min-h-[30px] px-2.5 py-1 rounded-xl text-xs font-heading font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                              attendance?.status === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:border-emerald-500 hover:text-emerald-500'
                            }`}
                            title={attendance?.status === 'present' ? 'Click to clear present mark' : 'Mark Present (1-tap)'}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (item.courseId) {
                                handleSetAttendance(item.courseId, 'late', item.sessionId, item.startTime, item.isCancelled);
                              }
                            }}
                            className={`min-h-[30px] px-2.5 py-1 rounded-xl text-xs font-heading font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                              attendance?.status === 'late'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:border-amber-500 hover:text-amber-500'
                            }`}
                            title={attendance?.status === 'late' ? 'Click to clear late mark' : 'Mark Late (1-tap)'}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Late</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (item.courseId) {
                                handleSetAttendance(item.courseId, 'absent', item.sessionId, item.startTime, item.isCancelled);
                              }
                            }}
                            className={`min-h-[30px] px-2.5 py-1 rounded-xl text-xs font-heading font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                              attendance?.status === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:border-rose-500 hover:text-rose-500'
                            }`}
                            title={attendance?.status === 'absent' ? 'Click to clear absent mark' : 'Mark Absent (1-tap)'}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Absent</span>
                          </button>

                          {item.scheduledClass && (
                            <button
                              type="button"
                              onClick={() => handleOpenPostponeModal(item.scheduledClass!)}
                              className={`min-h-[30px] px-2.5 py-1 rounded-xl text-xs font-heading font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                                item.isPostponed || attendance?.status === 'postponed'
                                  ? 'bg-purple-600 text-white shadow-xs'
                                  : 'bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:border-purple-500 hover:text-purple-500'
                              }`}
                              title="Postpone / Reschedule occurrence"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{item.isPostponed ? 'Postponed' : 'Postpone'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (item.courseId) onNavigate(`#/courses/${item.courseId}`);
                              else onNavigate('#/timetable');
                            }}
                            className="ml-auto p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] cursor-pointer"
                            title="Course Hub"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

