import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useUiStore } from '../store/uiStore';
import { getTodayKey, addDaysToKey, formatDayKey, parseDayKey, FULL_DAY_NAMES } from '../utils/dateUtils';
import { getClassesForDate, ScheduledClass } from '../utils/scheduleEngine';
import { buildDayTimeline, TimelineBlock, FreeGap, minutesToTimeString } from '../utils/timelineEngine';
import { saveAttendanceQuickMark } from '../utils/attendanceEngine';
import { NowIndicator } from '../components/timeline/NowIndicator';
import { PlanDayModal } from '../components/timeline/PlanDayModal';
import { ShutdownModal } from '../components/timeline/ShutdownModal';
import { TimelineBlockDetailModal } from '../components/timeline/TimelineBlockDetailModal';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Target,
  Moon,
  Clock,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';

export const TodayPage: React.FC = () => {
  const { showToast, setQuickAddOpen, setCurrentRoute } = useUiStore();
  const [selectedDateKey, setSelectedDateKey] = useState<string>(getTodayKey());
  const [selectedBlock, setSelectedBlock] = useState<TimelineBlock | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isShutdownModalOpen, setIsShutdownModalOpen] = useState(false);

  // Check URL query parameters for ritual deep links
  useEffect(() => {
    const hash = window.location.hash || '';
    if (hash.includes('ritual=plan') || hash.includes('plan=true')) {
      setIsPlanModalOpen(true);
    } else if (hash.includes('ritual=shutdown') || hash.includes('shutdown=true')) {
      setIsShutdownModalOpen(true);
    }
  }, []);

  // Reactive DB queries
  const coursesRaw = useLiveQuery(() => db.courses.toArray(), []);
  const classSessionsRaw = useLiveQuery(() => db.classSessions.toArray(), []);
  const classExceptionsRaw = useLiveQuery(() => db.classExceptions.toArray(), []);
  const semestersRaw = useLiveQuery(() => db.semesters.toArray(), []);
  const tasksRaw = useLiveQuery(() => db.tasks.toArray(), []);
  const studyBlocksRaw = useLiveQuery(() => db.studyBlocks.toArray(), []);
  const masterWeekBlocksRaw = useLiveQuery(() => db.masterWeekBlocks.toArray(), []);
  const examsRaw = useLiveQuery(() => db.exams.toArray(), []);
  const focusSessionsRaw = useLiveQuery(() => db.focusSessions.toArray(), []);
  const habitsRaw = useLiveQuery(() => db.habits.toArray(), []);
  const dailyPlan = useLiveQuery(
    () => db.dailyPlans.where('dateKey').equals(selectedDateKey).first(),
    [selectedDateKey]
  );

  const isLoading =
    coursesRaw === undefined ||
    classSessionsRaw === undefined ||
    tasksRaw === undefined;

  const courses = coursesRaw || [];
  const classSessions = classSessionsRaw || [];
  const classExceptions = classExceptionsRaw || [];
  const semesters = semestersRaw || [];
  const tasks = tasksRaw || [];
  const studyBlocks = studyBlocksRaw || [];
  const masterWeekBlocks = masterWeekBlocksRaw || [];
  const exams = examsRaw || [];
  const focusSessions = focusSessionsRaw || [];
  const habits = habitsRaw || [];

  const activeSemester = useMemo(
    () => semesters.find((s) => s.isActive) || semesters[0] || null,
    [semesters]
  );

  // Scheduled classes for selected date
  const scheduledClasses = useMemo(() => {
    return getClassesForDate(
      selectedDateKey,
      classSessions,
      classExceptions,
      activeSemester,
      courses
    );
  }, [selectedDateKey, classSessions, classExceptions, activeSemester, courses]);

  // Build timeline result
  const timeline = useMemo(() => {
    if (isLoading) return undefined;
    try {
      return buildDayTimeline({
        date: selectedDateKey,
        classes: scheduledClasses,
        tasks,
        studyBlocks,
        masterWeekBlocks,
        exams,
        focusSessions,
        courses,
        dayStartMinutes: 360,  // 06:00
        dayEndMinutes: 1380,   // 23:00
      });
    } catch (e) {
      console.error('[TodayPage] Failed to build timeline:', e);
      return null;
    }
  }, [
    isLoading,
    selectedDateKey,
    scheduledClasses,
    tasks,
    studyBlocks,
    masterWeekBlocks,
    exams,
    focusSessions,
    courses,
  ]);

  const isToday = selectedDateKey === getTodayKey();

  // Date Header Formatter
  const dateObj = parseDayKey(selectedDateKey);
  const dayName = FULL_DAY_NAMES[(dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1)];
  const formattedDateString = dateObj.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Hours array 06:00 through 23:00
  const hours = useMemo(() => {
    const list: number[] = [];
    for (let h = 6; h <= 23; h++) {
      list.push(h);
    }
    return list;
  }, []);

  const totalMinutes = 1380 - 360; // 1020 mins (17 hours)

  const handleQuickMarkAttendance = async (scheduledClass: ScheduledClass) => {
    try {
      const res = await saveAttendanceQuickMark({
        courseId: scheduledClass.course.id,
        date: selectedDateKey,
        status: 'present',
        sessionId: scheduledClass.session?.id,
        startTime: scheduledClass.startTime,
        isCancelled: scheduledClass.isCancelled,
        allowToggle: true,
      });

      if (res.success) {
        const msg =
          res.action === 'toggled_off'
            ? `Cleared attendance mark for ${scheduledClass.course.code}`
            : `Marked ${scheduledClass.course.code} as Present`;
        showToast(msg, 'success');
      } else {
        showToast(res.error || 'Could not save attendance.', 'warning');
      }
    } catch {
      showToast('Could not save attendance.', 'danger');
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Header & Day Switcher */}
      <div className="bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))]">
              Day Timeline
            </h1>
            {isToday ? (
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Today
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedDateKey(getTodayKey())}
                className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] border border-[rgb(var(--c-border))] transition-colors"
              >
                Jump to Today
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[rgb(var(--c-muted))] mt-0.5">
            {dayName}, {formattedDateString} • {timeline?.blocks.length || 0} scheduled blocks
          </p>
        </div>

        {/* Date Navigation Buttons & Ritual Launchers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Day switcher (< Today >) */}
          <div className="flex items-center rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] p-1">
            <button
              type="button"
              onClick={() => setSelectedDateKey(addDaysToKey(selectedDateKey, -1))}
              className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface))] transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 text-xs font-semibold text-[rgb(var(--c-text))] font-mono">
              {selectedDateKey}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDateKey(addDaysToKey(selectedDateKey, 1))}
              className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface))] transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Ritual Buttons */}
          <button
            type="button"
            onClick={() => setIsPlanModalOpen(true)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
            title="Plan your day priorities in under 60 seconds"
          >
            <Target className="w-3.5 h-3.5" />
            <span>{dailyPlan ? 'Edit Plan' : 'Plan Day'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsShutdownModalOpen(true)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-colors flex items-center gap-1.5"
            title="Evening Shutdown ritual with task rollover"
          >
            <Moon className="w-3.5 h-3.5" />
            <span>{dailyPlan?.shutdownAt ? 'Shutdown Done ✓' : 'Shutdown'}</span>
          </button>
        </div>
      </div>

      {/* Plan Priorities Banner (if already created for this day) */}
      {dailyPlan && dailyPlan.priorityIds && dailyPlan.priorityIds.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                Today's Committed Priorities ({dailyPlan.priorityIds.length}/3)
              </span>
              <div className="flex flex-wrap gap-2 mt-1">
                {dailyPlan.priorityIds.map((pid, idx) => {
                  if (pid.startsWith('custom:')) {
                    return (
                      <span
                        key={pid}
                        className="text-xs font-medium px-2 py-0.5 rounded-md bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))]"
                      >
                        🎯 {pid.replace('custom:', '')}
                      </span>
                    );
                  }
                  const t = tasks.find((item) => item.id === pid);
                  return (
                    <span
                      key={pid}
                      className={`text-xs font-medium px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${
                        t?.status === 'done'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 line-through'
                          : 'bg-[rgb(var(--c-surface))] border-[rgb(var(--c-border))] text-[rgb(var(--c-text))]'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3 text-amber-500" />
                      <span>{t ? t.title : `Priority ${idx + 1}`}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          {dailyPlan.note && (
            <p className="text-xs text-[rgb(var(--c-muted))] italic shrink-0">
              "{dailyPlan.note}"
            </p>
          )}
        </div>
      )}

      {/* Vertical Timeline Card */}
      <div className="bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl p-4 sm:p-6 shadow-xs overflow-hidden">
        {timeline === undefined ? (
          <div className="p-10 text-center space-y-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-[rgb(var(--c-surface2))] mx-auto" />
            <p className="text-xs font-mono text-[rgb(var(--c-muted))]">
              Loading your day timeline...
            </p>
          </div>
        ) : timeline === null ? (
          <div className="p-8 text-center text-rose-500 bg-rose-500/5 rounded-xl border border-rose-500/20">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm font-semibold">Could not render day timeline.</p>
          </div>
        ) : timeline.blocks.length === 0 ? (
          /* Empty Day State */
          <div className="p-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] mx-auto flex items-center justify-center">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                Wide open schedule for {dayName}
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))] max-w-sm mx-auto mt-1">
                No classes, exams, or timed tasks are scheduled. Take a well-deserved rest day or schedule a focused study block.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPlanModalOpen(true)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center gap-1.5"
              >
                <Target className="w-3.5 h-3.5" /> Plan Day Priorities
              </button>
              <button
                type="button"
                onClick={() => setQuickAddOpen(true)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface))] transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task / Event
              </button>
            </div>
          </div>
        ) : (
          /* Live Interactive Vertical Timeline 06:00 - 23:00 */
          <div className="relative min-h-[960px] select-none">
            {/* Hour grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {hours.map((hour) => {
                const hourFormatted = `${hour.toString().padStart(2, '0')}:00`;
                return (
                  <div key={hour} className="relative w-full border-t border-[rgb(var(--c-border))]/50 h-[56px] flex items-start">
                    <span className="text-[10px] font-mono font-medium text-[rgb(var(--c-muted))] -mt-2.5 bg-[rgb(var(--c-surface))] pr-2 shrink-0">
                      {hourFormatted}
                    </span>
                    <div className="flex-1 h-px bg-[rgb(var(--c-border))]/30 ml-2" />
                  </div>
                );
              })}
            </div>

            {/* Live Now Indicator (only updates itself every minute) */}
            <NowIndicator
              dateKey={selectedDateKey}
              dayStartMinutes={360}
              dayEndMinutes={1380}
            />

            {/* Free Gaps Banners */}
            <div className="absolute left-14 sm:left-18 right-2 inset-y-0 pointer-events-none">
              {timeline.freeGaps.map((gap) => {
                const topPercent = ((gap.startMinutes - 360) / totalMinutes) * 100;
                const heightPercent = (gap.durationMinutes / totalMinutes) * 100;

                // Only render gap label if slot is large enough (>= 30 mins)
                if (gap.durationMinutes < 30) return null;

                return (
                  <div
                    key={`gap-${gap.startMinutes}-${gap.endMinutes}`}
                    className="absolute left-0 right-0 border border-dashed border-[rgb(var(--c-border))]/80 rounded-xl flex items-center justify-center p-2 opacity-60 hover:opacity-100 transition-opacity"
                    style={{
                      top: `${topPercent}%`,
                      height: `${Math.max(28, (heightPercent / 100) * 960)}px`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-[rgb(var(--c-muted))] bg-[rgb(var(--c-surface))]/90 px-2.5 py-0.5 rounded-full border border-[rgb(var(--c-border))] shadow-2xs">
                      <Coffee className="w-3 h-3 text-emerald-500" />
                      <span>{gap.label}</span>
                      <span className="text-[10px] text-[rgb(var(--c-muted))]">
                        ({Math.floor(gap.durationMinutes / 60)}h {gap.durationMinutes % 60}m)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Timeline Blocks */}
            <div className="absolute left-14 sm:left-18 right-2 inset-y-0">
              {timeline.blocks.map((block) => {
                const topPercent = Math.max(0, ((block.startMinutes - 360) / totalMinutes) * 100);
                const heightPercent = Math.max(2.8, (block.durationMinutes / totalMinutes) * 100);
                const laneWidthPercent = 100 / (block.totalLanes || 1);
                const laneLeftPercent = (block.laneIndex || 0) * laneWidthPercent;

                const isCancelled = block.status === 'cancelled';
                const isMoved = block.status === 'moved';
                const isCompleted = block.status === 'completed';

                return (
                  <div
                    key={block.id}
                    onClick={() => setSelectedBlock(block)}
                    className={`absolute p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:z-30 hover:shadow-md flex flex-col justify-between overflow-hidden text-left ${
                      isCancelled
                        ? 'opacity-40 border-dashed border-rose-300 bg-rose-500/5 line-through'
                        : isMoved
                        ? 'border-amber-400/60 bg-amber-500/10'
                        : isCompleted
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'shadow-xs'
                    }`}
                    style={{
                      top: `${topPercent}%`,
                      height: `${Math.max(34, (heightPercent / 100) * 960)}px`,
                      left: `calc(${laneLeftPercent}% + 2px)`,
                      width: `calc(${laneWidthPercent}% - 4px)`,
                      borderColor: !isCancelled ? `${block.colour}60` : undefined,
                      backgroundColor: !isCancelled && !isCompleted ? `${block.colour}15` : undefined,
                    }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className="text-[10px] uppercase font-bold tracking-wider truncate font-heading"
                          style={{ color: block.colour }}
                        >
                          {block.kind}
                        </span>
                        <span className="text-[10px] font-mono text-[rgb(var(--c-muted))] shrink-0 font-medium">
                          {block.startTime}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-[rgb(var(--c-text))] leading-tight truncate">
                        {block.title}
                      </h4>
                      {block.subtitle && block.durationMinutes >= 45 && (
                        <p className="text-[11px] text-[rgb(var(--c-muted))] truncate mt-0.5">
                          {block.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Footer tags if block height permits */}
                    {block.durationMinutes >= 40 && (
                      <div className="flex items-center justify-between text-[10px] text-[rgb(var(--c-muted))] pt-1 border-t border-[rgb(var(--c-border))]/40">
                        <span className="truncate">{block.location || `${block.durationMinutes}m`}</span>
                        {isCompleted && (
                          <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </span>
                        )}
                        {isCancelled && (
                          <span className="text-rose-500 font-bold uppercase text-[9px]">
                            Cancelled
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <TimelineBlockDetailModal
        block={selectedBlock}
        onClose={() => setSelectedBlock(null)}
        onOpenQuickMark={handleQuickMarkAttendance}
      />

      {/* Plan My Day Modal */}
      {isPlanModalOpen && (
        <PlanDayModal
          isOpen={isPlanModalOpen}
          onClose={() => setIsPlanModalOpen(false)}
          dateKey={selectedDateKey}
          classes={scheduledClasses}
          courses={courses}
          tasks={tasks.filter((t) => t.dueDate === selectedDateKey || (!t.dueDate && t.status !== 'done'))}
          habits={habits}
          onPlanSaved={() => showToast('Daily plan committed! +20 XP', 'success')}
        />
      )}

      {/* Shutdown Modal */}
      {isShutdownModalOpen && (
        <ShutdownModal
          onClose={() => setIsShutdownModalOpen(false)}
          dateKey={selectedDateKey}
          onCompleted={() => showToast('Day successfully shut down! +25 XP', 'success')}
        />
      )}
    </div>
  );
};
