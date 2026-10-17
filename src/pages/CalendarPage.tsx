import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import {
  getTodayKey,
  formatDisplayDate,
  parseDayKey,
  getEthiopicDateString,
  DAY_NAMES,
  FULL_DAY_NAMES,
} from '../utils/dateUtils';
import {
  getClassesForDate,
  getSemesterWeekNumber,
  ScheduledClass,
} from '../utils/scheduleEngine';
import { calculateCourseAttendance } from '../utils/streakEngine';
import { generateId } from '../utils/idGenerator';
import { AttendanceRecord, ClassException, Course } from '../types';
import { getContrastTextColor } from '../theme/themeUtils';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldAlert,
  CheckSquare,
  Layers,
  MapPin,
  Building,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Calendar as CalendarIcon,
  X,
  Edit3,
  RotateCcw,
} from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const { setCurrentRoute, showToast } = useUiStore();
  const todayKey = getTodayKey();

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(todayKey);

  // One-day exception modal state
  const [exceptionModalClass, setExceptionModalClass] = useState<ScheduledClass | null>(null);
  const [exceptionAction, setExceptionAction] = useState<'cancelled' | 'moved'>('cancelled');
  const [exceptionReason, setExceptionReason] = useState('Instructor postponed class');
  const [exceptionNewStartTime, setExceptionNewStartTime] = useState('');
  const [exceptionNewEndTime, setExceptionNewEndTime] = useState('');
  const [exceptionNewRoom, setExceptionNewRoom] = useState('');

  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const semesters = useLiveQuery(() => db.semesters.toArray()) || [];
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const sessions = useLiveQuery(() => db.classSessions.toArray()) || [];
  const exceptions = useLiveQuery(() => db.classExceptions.toArray()) || [];
  const attendanceRecords = useLiveQuery(() => db.attendance.toArray()) || [];

  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const exams = useLiveQuery(() => db.exams.toArray()) || [];
  const milestones = useLiveQuery(() => db.projectMilestones.toArray()) || [];

  const activeSemester =
    semesters.find(
      (s) =>
        s.id === settings?.activeSemesterId ||
        s.isActive ||
        s.name === settings?.currentTermName
    ) || semesters[0] || null;

  // Compute month days
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const monthTitle = firstDayOfMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Starting offset: 0=Mon, ... 6=Sun
  const startDay = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
  const totalDays = lastDayOfMonth.getDate();

  const dayCells = [];
  for (let i = 0; i < startDay; i++) {
    dayCells.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dayCells.push(dStr);
  }

  // Selected Day Information
  const selectedDateObj = parseDayKey(selectedDayKey);
  const selectedDayIndex = selectedDateObj.getDay() === 0 ? 6 : selectedDateObj.getDay() - 1;
  const selectedDayName = FULL_DAY_NAMES[selectedDayIndex];

  // Schedule for selected day via scheduleEngine
  const dayClasses = getClassesForDate(
    selectedDayKey,
    sessions,
    exceptions,
    activeSemester,
    courses
  );

  const semesterWeekNumber = activeSemester?.startDate
    ? getSemesterWeekNumber(selectedDayKey, activeSemester.startDate)
    : 1;

  // Deadlines & Exams for selected day
  const dayTasks = tasks.filter((t) => t.dueDate === selectedDayKey);
  const dayExams = exams.filter((e) => e.examDate === selectedDayKey);
  const dayMilestones = milestones.filter((m) => m.dueDate === selectedDayKey);

  // Attendance for selected day
  const getAttendanceForClass = (courseId: string) => {
    return attendanceRecords.find(
      (r) => r.courseId === courseId && r.date === selectedDayKey
    );
  };

  const handleSetAttendance = async (
    courseId: string,
    status: 'present' | 'late' | 'absent'
  ) => {
    const existing = getAttendanceForClass(courseId);
    if (existing) {
      if (existing.status === status) {
        // Toggle off
        await db.attendance.delete(existing.id);
        showToast('Attendance mark cleared.', 'info');
      } else {
        await db.attendance.update(existing.id, {
          status,
          updatedAt: new Date().toISOString(),
        });
        showToast(`Attendance updated to ${status}.`, 'success');
      }
    } else {
      await db.attendance.add({
        id: generateId(),
        courseId,
        date: selectedDayKey,
        status,
        createdAt: new Date().toISOString(),
      });
      showToast(`Marked ${status} for ${selectedDayKey}.`, 'success');
    }
  };

  // Open Exception Modal
  const handleOpenExceptionModal = (
    c: ScheduledClass,
    action: 'cancelled' | 'moved'
  ) => {
    setExceptionModalClass(c);
    setExceptionAction(action);
    setExceptionReason(
      action === 'cancelled'
        ? 'Instructor cancelled / postponed class'
        : 'One-off hall or time change'
    );
    setExceptionNewStartTime(c.startTime);
    setExceptionNewEndTime(c.endTime);
    setExceptionNewRoom(c.room || '');
  };

  // Save Exception (One-day change)
  const handleSaveException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exceptionModalClass) return;

    // Check if exception already exists for this session on this day
    const existingEx = exceptions.find(
      (ex) =>
        ex.sessionId === exceptionModalClass.session.id && ex.date === selectedDayKey
    );

    if (existingEx) {
      await db.classExceptions.update(existingEx.id, {
        action: exceptionAction,
        reason: exceptionReason.trim(),
        newStartTime:
          exceptionAction === 'moved' ? exceptionNewStartTime : undefined,
        newEndTime:
          exceptionAction === 'moved' ? exceptionNewEndTime : undefined,
        newRoom: exceptionAction === 'moved' ? exceptionNewRoom.trim() : undefined,
      });
    } else {
      await db.classExceptions.add({
        id: generateId(),
        sessionId: exceptionModalClass.session.id,
        date: selectedDayKey,
        action: exceptionAction,
        reason: exceptionReason.trim(),
        newStartTime:
          exceptionAction === 'moved' ? exceptionNewStartTime : undefined,
        newEndTime:
          exceptionAction === 'moved' ? exceptionNewEndTime : undefined,
        newRoom: exceptionAction === 'moved' ? exceptionNewRoom.trim() : undefined,
      });
    }

    showToast(
      exceptionAction === 'cancelled'
        ? `Class cancelled for ${selectedDayKey}. Does not penalize streak.`
        : `Class rescheduled for ${selectedDayKey}.`,
      'success'
    );
    setExceptionModalClass(null);
  };

  // Clear Exception (Revert to regular)
  const handleClearException = async (sessionId: string) => {
    const target = exceptions.find(
      (ex) => ex.sessionId === sessionId && ex.date === selectedDayKey
    );
    if (target) {
      await db.classExceptions.delete(target.id);
      showToast(`Restored regular class schedule for ${selectedDayKey}.`, 'info');
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#BBA6E0] font-bold flex items-center gap-1.5">
              <span>Integrated Calendar Matrix</span>
              {activeSemester && (
                <>
                  <span>•</span>
                  <span>{activeSemester.name}</span>
                </>
              )}
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              Monthly Agenda &amp; Academic Timeline
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              {getEthiopicDateString(currentMonthDate)} • Unified classes, one-day changes &amp; attendance
            </p>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <button
              onClick={() => setCurrentMonthDate(new Date(year, month - 1, 1))}
              className="p-1.5 rounded-full border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] transition active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-heading font-bold px-3 py-1 rounded-xl bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] min-w-[120px] text-center">
              {monthTitle}
            </span>
            <button
              onClick={() => setCurrentMonthDate(new Date(year, month + 1, 1))}
              className="p-1.5 rounded-full border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] transition active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Month Calendar Grid */}
        <div className="mt-4">
          <div className="grid grid-cols-7 text-center font-heading text-[10px] uppercase tracking-wider text-[rgb(var(--c-muted))] font-bold pb-2 border-b border-[rgb(var(--c-border))]">
            {DAY_NAMES.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 pt-2">
            {dayCells.map((dayKey, idx) => {
              if (!dayKey) {
                return <div key={`empty-${idx}`} className="h-10 sm:h-12" />;
              }

              const isToday = dayKey === todayKey;
              const isSelected = dayKey === selectedDayKey;
              const hasTask = tasks.some((t) => t.dueDate === dayKey);
              const hasExam = exams.some((e) => e.examDate === dayKey);
              const dayNum = parseInt(dayKey.slice(8), 10);

              return (
                <button
                  key={dayKey}
                  onClick={() => setSelectedDayKey(dayKey)}
                  className={`h-10 sm:h-12 rounded-xl flex flex-col items-center justify-between p-1 transition active:scale-95 border cursor-pointer ${
                    isSelected
                      ? 'border-[#BBA6E0] bg-[#BBA6E0] text-stone-950 font-bold shadow-xs'
                      : isToday
                      ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] font-bold text-[rgb(var(--c-primary))]'
                      : 'border-transparent hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))]'
                  }`}
                >
                  <span className="text-xs">{dayNum}</span>
                  <div className="flex items-center gap-0.5">
                    {hasExam && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                    {hasTask && <span className="w-1.5 h-1.5 rounded-full bg-[#B6E63E]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Day Agenda Header */}
      <div className="flex items-center justify-between px-2">
        <div>
          <div className="text-[10px] font-heading font-bold uppercase text-[rgb(var(--c-muted))] tracking-wider">
            {formatDisplayDate(selectedDayKey)} • {selectedDayName}
          </div>
          <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))] flex items-center gap-2">
            <span>Agenda for {selectedDayKey}</span>
            {activeSemester && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] font-normal">
                Semester Week {semesterWeekNumber}
              </span>
            )}
          </div>
        </div>

        {selectedDayKey !== todayKey && (
          <button
            onClick={() => setSelectedDayKey(todayKey)}
            className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] hover:underline flex items-center gap-1"
          >
            <span>Jump to Today</span>
          </button>
        )}
      </div>

      {/* SECTION 1: Scheduled University Classes for Selected Day */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
          <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#4FA3A5]" />
            <span>University Classes &amp; Attendance ({dayClasses.length})</span>
          </div>
          <span className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            Postponed or cancelled classes do not break streaks
          </span>
        </div>

        {dayClasses.length === 0 ? (
          <div className="text-center py-8 text-xs text-[rgb(var(--c-muted))] font-flourish space-y-2">
            <div>No classes scheduled for {selectedDayName}.</div>
            <button
              onClick={() => setCurrentRoute('timetable')}
              className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] hover:underline"
            >
              Open Timetable Suite →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {dayClasses.map((item) => {
              const contrast = getContrastTextColor(item.course.color);
              const attendance = getAttendanceForClass(item.course.id);
              const courseAttendanceStats = calculateCourseAttendance(
                item.course.id,
                attendanceRecords,
                settings?.attendanceThresholdPercent || 80,
                selectedDayKey
              );

              return (
                <div
                  key={`${item.session.id}_${item.date}`}
                  className={`p-3.5 rounded-2xl border transition bg-[rgb(var(--c-bg))] space-y-2.5 ${
                    item.isCancelled
                      ? 'border-rose-500/40 opacity-75'
                      : item.isMoved
                      ? 'border-amber-500/50 shadow-2xs'
                      : 'border-[rgb(var(--c-border))] hover:border-[rgb(var(--c-primary))]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span
                        className="w-3 self-stretch rounded-full shrink-0 mt-0.5 shadow-2xs"
                        style={{ backgroundColor: item.course.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-2xs"
                            style={{
                              backgroundColor: item.course.color,
                              color: contrast,
                            }}
                          >
                            {item.course.code}
                          </span>
                          <span className="font-heading font-bold text-xs text-[rgb(var(--c-text))]">
                            {item.course.name}
                          </span>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-md border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))]">
                            {item.session.type}
                          </span>

                          {item.isCancelled && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/30 font-bold">
                              Class Cancelled Today
                            </span>
                          )}

                          {item.isMoved && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold">
                              Rescheduled / Moved
                            </span>
                          )}
                        </div>

                        {/* Timing and Location */}
                        <div className="flex items-center gap-3 text-xs text-[rgb(var(--c-muted))] mt-1 flex-wrap">
                          <span className="flex items-center gap-1 font-semibold text-[rgb(var(--c-primary))]">
                            <Clock className="w-3 h-3" />
                            {item.startTime} – {item.endTime}
                            {item.isMoved && (
                              <span className="text-[10px] text-[rgb(var(--c-muted))] line-through ml-1">
                                ({item.session.startTime}–{item.session.endTime})
                              </span>
                            )}
                          </span>

                          {(item.room || item.building) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[rgb(var(--c-primary))]" />
                              {[item.building, item.room].filter(Boolean).join(' • ')}
                            </span>
                          )}

                          {item.instructor && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-[rgb(var(--c-primary))]" />
                              {item.instructor}
                            </span>
                          )}
                        </div>

                        {item.exception?.reason && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-flourish mt-1">
                            Note: “{item.exception.reason}”
                          </div>
                        )}
                      </div>
                    </div>

                    {/* One-Day Change Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                      {item.isCancelled || item.isMoved ? (
                        <button
                          onClick={() => handleClearException(item.session.id)}
                          className="px-2.5 py-1 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] text-[11px] font-heading font-bold hover:bg-[rgb(var(--c-primary))] hover:text-[rgb(var(--c-on-primary))] transition flex items-center gap-1"
                          title="Reset to regular timetable schedule"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleOpenExceptionModal(item, 'cancelled')}
                            className="px-2 py-1 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-[11px] font-heading font-bold transition"
                            title="Mark as cancelled by instructor for today"
                          >
                            Cancel Today
                          </button>
                          <button
                            onClick={() => handleOpenExceptionModal(item, 'moved')}
                            className="px-2 py-1 rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-[11px] font-heading font-bold transition flex items-center gap-1"
                            title="Reschedule class time or room for today only"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Postpone</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Attendance Controls & Metrics */}
                  {!item.isCancelled && (
                    <div className="pt-2 border-t border-[rgb(var(--c-border))] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-heading font-bold uppercase text-[rgb(var(--c-muted))] mr-1">
                          Attendance:
                        </span>
                        <button
                          onClick={() => handleSetAttendance(item.course.id, 'present')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-heading font-bold transition flex items-center gap-1 ${
                            attendance?.status === 'present'
                              ? 'bg-emerald-500 text-white shadow-2xs'
                              : 'border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:border-emerald-500'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Present</span>
                        </button>

                        <button
                          onClick={() => handleSetAttendance(item.course.id, 'late')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-heading font-bold transition flex items-center gap-1 ${
                            attendance?.status === 'late'
                              ? 'bg-amber-500 text-stone-950 shadow-2xs'
                              : 'border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:border-amber-500'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>Late</span>
                        </button>

                        <button
                          onClick={() => handleSetAttendance(item.course.id, 'absent')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-heading font-bold transition flex items-center gap-1 ${
                            attendance?.status === 'absent'
                              ? 'bg-rose-500 text-white shadow-2xs'
                              : 'border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:border-rose-500'
                          }`}
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Absent</span>
                        </button>
                      </div>

                      <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish flex items-center gap-1.5 self-end sm:self-auto">
                        <span>
                          Term Record: {courseAttendanceStats.attendedCount} /{' '}
                          {courseAttendanceStats.totalRecorded} attended (
                          <strong
                            className={
                              courseAttendanceStats.isBelowThreshold
                                ? 'text-rose-500'
                                : 'text-emerald-500'
                            }
                          >
                            {courseAttendanceStats.percentage}%
                          </strong>
                          )
                        </span>
                        {courseAttendanceStats.isBelowThreshold && (
                          <span className="text-rose-500 flex items-center gap-0.5 font-bold">
                            <AlertTriangle className="w-3 h-3" /> Below 80%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Assignments & Milestones Due */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Due Tasks */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
            <div className="font-heading text-xs font-bold uppercase tracking-wider text-[rgb(var(--c-text))] flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-[#B6E63E]" />
              <span>Assignments Due ({dayTasks.length})</span>
            </div>
            <button
              onClick={() => setCurrentRoute('lobby')}
              className="text-[10px] font-heading font-bold text-[rgb(var(--c-primary))] hover:underline"
            >
              Tasks →
            </button>
          </div>

          {dayTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-[rgb(var(--c-muted))] font-flourish">
              No assignments due on this date.
            </div>
          ) : (
            <div className="space-y-1.5">
              {dayTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] flex items-center justify-between text-xs"
                >
                  <span className="font-heading font-bold text-[rgb(var(--c-text))] truncate">
                    {t.title}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[rgb(var(--c-muted))] shrink-0">
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Boss Battles / Exams */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
            <div className="font-heading text-xs font-bold uppercase tracking-wider text-[rgb(var(--c-text))] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span>Boss Battles &amp; Exams ({dayExams.length})</span>
            </div>
            <button
              onClick={() => setCurrentRoute('exams')}
              className="text-[10px] font-heading font-bold text-[rgb(var(--c-primary))] hover:underline"
            >
              Exams →
            </button>
          </div>

          {dayExams.length === 0 ? (
            <div className="py-6 text-center text-xs text-[rgb(var(--c-muted))] font-flourish">
              No exam boss battles scheduled.
            </div>
          ) : (
            <div className="space-y-1.5">
              {dayExams.map((e) => (
                <div
                  key={e.id}
                  className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-center justify-between text-xs"
                >
                  <span className="font-heading font-bold text-[rgb(var(--c-text))] truncate">
                    {e.title}
                  </span>
                  <span className="text-[10px] font-bold text-rose-500 shrink-0">
                    {e.weight}% Weight
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Exception Edit Modal (One-Day Change) */}
      {exceptionModalClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                {exceptionAction === 'cancelled'
                  ? 'Cancel Class for Selected Day'
                  : 'Postpone / Reschedule Class Period'}
              </div>
              <button
                onClick={() => setExceptionModalClass(null)}
                className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Modifying: <strong className="text-[rgb(var(--c-text))]">{exceptionModalClass.course.code} {exceptionModalClass.course.name}</strong> on {selectedDayKey}. This change applies only to this single day and preserves regular repeating weeks.
            </p>

            <form onSubmit={handleSaveException} className="space-y-3">
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Reason / Teacher Note
                </label>
                <input
                  type="text"
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  placeholder="e.g. Instructor postponed, Lab maintenance, Campus holiday"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              {exceptionAction === 'moved' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                        New Start Time
                      </label>
                      <input
                        type="time"
                        value={exceptionNewStartTime}
                        onChange={(e) => setExceptionNewStartTime(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                        New End Time
                      </label>
                      <input
                        type="time"
                        value={exceptionNewEndTime}
                        onChange={(e) => setExceptionNewEndTime(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                      New Temporary Room / Hall
                    </label>
                    <input
                      type="text"
                      value={exceptionNewRoom}
                      onChange={(e) => setExceptionNewRoom(e.target.value)}
                      placeholder="e.g. B59-1-008"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[rgb(var(--c-border))]">
                <button
                  type="button"
                  onClick={() => setExceptionModalClass(null)}
                  className="px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-1.5 rounded-xl text-xs font-heading font-bold transition shadow-xs ${
                    exceptionAction === 'cancelled'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] hover:opacity-90'
                  }`}
                >
                  {exceptionAction === 'cancelled' ? 'Confirm Cancellation' : 'Save Rescheduled Time'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
