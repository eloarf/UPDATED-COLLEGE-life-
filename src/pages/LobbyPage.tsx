import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import {
  getTodayKey,
  getDayOfWeekIndex,
  getEthiopicDateString,
  getTimeGreeting,
  formatDisplayDate,
  addDaysToKey,
} from '../utils/dateUtils';
import {
  calculateLevelFromTotalXp,
  ensureDailyQuests,
  awardXp,
  reverseXp,
  getQuestXpReward,
  triggerLevelUpConfetti,
} from '../services/rpgService';
import { Task, DailyQuest, Semester, DailyReflection } from '../types';
import { getClassesForDate, getNextClass, NextClassResult, ScheduledClass } from '../utils/scheduleEngine';
import { reconcileAllReminders } from '../services/reminderEngine';
import {
  calculateDailyProgress,
  getUpNextItem,
  buildTodayTimeline,
  DailyProgressResult,
  UpNextResult,
} from '../utils/todayEngine';
import {
  calculateHabitStreak,
  getRemainingRestTokens,
  MAX_WEEKLY_REST_TOKENS,
} from '../utils/streakEngine';
import { generateId } from '../utils/idGenerator';
import {
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Calendar,
  ShieldAlert,
  Shield,
  Battery,
  Laptop,
  Smartphone,
  ChevronRight,
  Flame,
  Moon,
  Edit3,
  Check,
  Target,
  Plus,
  BookOpen,
  X,
  AlertCircle,
} from 'lucide-react';

export const LobbyPage: React.FC = () => {
  const { setCurrentRoute, showToast, setActiveFocusTask } = useUiStore();
  const todayKey = getTodayKey();
  const dayIndex = getDayOfWeekIndex();

  // Database queries
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const semesters = useLiveQuery(() => db.semesters.toArray()) || [];
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const sessions = useLiveQuery(() => db.classSessions.toArray()) || [];
  const exceptions = useLiveQuery(() => db.classExceptions.toArray()) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const exams = useLiveQuery(() => db.exams.toArray()) || [];
  const habits = useLiveQuery(() => db.habits.toArray()) || [];
  const allHabitLogs = useLiveQuery(() => db.habitLogs.toArray()) || [];
  const habitLogs = useLiveQuery(() => db.habitLogs.where('date').equals(todayKey).toArray()) || [];
  const restDays = useLiveQuery(() => db.restDays.toArray()) || [];
  const xpEvents = useLiveQuery(() => db.xpEvents.toArray()) || [];
  const quests = useLiveQuery(() => db.quests.where('dayKey').equals(todayKey).toArray()) || [];
  const focusSessions = useLiveQuery(() => db.focusSessions.toArray()) || [];
  const attendanceRecords = useLiveQuery(() => db.attendance.toArray()) || [];
  const creativeProjects = useLiveQuery(() => db.creativeProjects.toArray()) || [];
  const readingItems = useLiveQuery(() => db.readingItems.toArray()) || [];
  const reflections = useLiveQuery(() => db.dailyReflections.where('dateKey').equals(todayKey).toArray()) || [];

  const todayReflection = reflections[0] || null;

  // Level calculations
  const totalXp = xpEvents.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const heroInfo = calculateLevelFromTotalXp(totalXp);

  // Modes
  const [lowEnergy, setLowEnergy] = useState(false);
  const [isDormDay, setIsDormDay] = useState(true);

  // Daily Intention editing
  const [isEditingIntention, setIsEditingIntention] = useState(false);
  const [intentionInput, setIntentionInput] = useState('');

  // Inline Quick Add Task for Today
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  // Shutdown Drawer / Modal
  const [isShutdownOpen, setIsShutdownOpen] = useState(false);
  const [shutdownWin, setShutdownWin] = useState('');
  const [shutdownTomorrowFocus, setShutdownTomorrowFocus] = useState('');

  // Class Postponement Modal state
  const [postponeModalClass, setPostponeModalClass] = useState<ScheduledClass | null>(null);
  const [postponeDate, setPostponeDate] = useState<string>('');
  const [postponeStartTime, setPostponeStartTime] = useState<string>('');
  const [postponeEndTime, setPostponeEndTime] = useState<string>('');
  const [postponeReason, setPostponeReason] = useState<string>('');

  useEffect(() => {
    ensureDailyQuests();
  }, [todayKey]);

  useEffect(() => {
    if (settings) {
      setLowEnergy(settings.isLowEnergy);
      setIsDormDay(settings.isDormDay);
      if (settings.dailyIntentionDate === todayKey && settings.dailyIntention) {
        setIntentionInput(settings.dailyIntention);
      } else {
        setIntentionInput('');
      }
    }
  }, [settings, todayKey]);

  const activeSemester =
    semesters.find(
      (s) =>
        s.id === settings?.activeSemesterId ||
        s.isActive ||
        s.name === settings?.currentTermName
    ) || semesters[0] || null;

  // Scheduled classes today from scheduleEngine
  const scheduledClassesToday = useMemo(() => {
    return getClassesForDate(todayKey, sessions, exceptions, activeSemester, courses);
  }, [todayKey, sessions, exceptions, activeSemester, courses]);

  // Current time representation
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Next Class info
  const nextClassInfo: NextClassResult | null = getNextClass(
    now,
    sessions,
    exceptions,
    activeSemester,
    courses
  );

  const remainingTokens = getRemainingRestTokens(restDays, todayKey);

  // Daily Progress Calculation
  const progress: DailyProgressResult = useMemo(() => {
    return calculateDailyProgress({
      todayKey,
      tasks,
      habits,
      habitLogs,
      restDays,
      scheduledClasses: scheduledClassesToday,
      attendanceRecords,
      focusSessions,
    });
  }, [todayKey, tasks, habits, habitLogs, restDays, scheduledClassesToday, attendanceRecords, focusSessions]);

  // Up Next Recommendation Live
  const upNext: UpNextResult = useMemo(() => {
    return getUpNextItem({
      now,
      todayKey,
      scheduledClasses: scheduledClassesToday,
      tasks,
      exams,
      habits,
      habitLogs,
      restDays,
      attendanceRecords,
      creativeProjects,
      readingItems,
    });
  }, [now, todayKey, scheduledClassesToday, tasks, exams, habits, habitLogs, restDays, attendanceRecords, creativeProjects, readingItems]);

  // Chronological Today Timeline with Clash Detection
  const timeline = useMemo(() => {
    const examsToday = exams.filter((e) => e.examDate === todayKey);
    const tasksWithTime = tasks.filter((t) => t.dueDate === todayKey && t.dueTime);
    return buildTodayTimeline({
      currentTime: currentTimeStr,
      scheduledClasses: scheduledClassesToday,
      examsToday,
      tasksWithTime,
    });
  }, [currentTimeStr, scheduledClassesToday, exams, tasks, todayKey]);

  // Upcoming Exams & Deadlines
  const upcomingExams = exams
    .filter((e) => e.examDate >= todayKey && !e.isDefeated)
    .sort((a, b) => a.examDate.localeCompare(b.examDate));
  const nextExam = upcomingExams[0];

  // Today's active tasks
  const todayTasks = tasks.filter((t) => t.dueDate === todayKey || (!t.dueDate && t.status !== 'done') || t.priority === 'high');
  const unfinishedTasks = todayTasks.filter((t) => t.status !== 'done');
  const completedTodayTasks = tasks.filter((t) => t.status === 'done' && (t.completedAt?.startsWith(todayKey) || t.dueDate === todayKey));

  // Toggles
  const toggleLowEnergy = async () => {
    const newVal = !lowEnergy;
    setLowEnergy(newVal);
    await db.settings.update('current_user', { isLowEnergy: newVal });
    showToast(newVal ? 'Low-energy mode active: priorities condensed.' : 'Normal mode restored.', 'info');
  };

  const toggleDormDay = async () => {
    const newVal = !isDormDay;
    setIsDormDay(newVal);
    await db.settings.update('current_user', { isDormDay: newVal });
    showToast(newVal ? 'Dorm Mode: Mobile-friendly view' : 'Desk Mode: Full studio view', 'info');
  };

  const handleSaveIntention = async () => {
    await db.settings.update('current_user', {
      dailyIntention: intentionInput.trim(),
      dailyIntentionDate: todayKey,
    });
    setIsEditingIntention(false);
    showToast('Daily focus intention saved', 'success');
  };

  // Instant 1-Click Task Toggle: No blocking modals!
  const handleTaskClick = async (task: Task) => {
    const isDone = task.status === 'done';
    const nowIso = new Date().toISOString();
    const xpAmount = getQuestXpReward(task);

    if (isDone) {
      await db.tasks.update(task.id, {
        status: 'todo',
        completedAt: undefined,
        updatedAt: nowIso,
      });
      await reverseXp('task', task.id);
      showToast(`Task reopened (-${xpAmount} XP)`, 'info');
    } else {
      await db.tasks.update(task.id, {
        status: 'done',
        completedAt: nowIso,
        updatedAt: nowIso,
      });
      const awarded = await awardXp({
        source: 'task',
        sourceId: task.id,
        amount: xpAmount,
        stat: 'discipline',
        dayKey: task.dueDate || todayKey,
      });
      if (awarded) {
        triggerLevelUpConfetti();
        showToast(`Task completed! +${xpAmount} XP`, 'success');
      } else {
        showToast('Task completed!', 'success');
      }
    }
  };

  // Inline Quick Add Task for Today
  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    const taskId = generateId();
    const nowIso = new Date().toISOString();

    await db.tasks.add({
      id: taskId,
      title: quickTaskTitle.trim(),
      priority: 'medium',
      effort: 'medium',
      dueDate: todayKey,
      status: 'todo',
      contextTag: 'any',
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    setQuickTaskTitle('');
    showToast('Task added for today', 'success');
  };

  // Set / toggle attendance directly on Home Page
  const handleSetAttendance = async (
    courseId: string,
    status: 'present' | 'absent' | 'postponed',
    sessionId?: string
  ) => {
    const existing = attendanceRecords.find(
      (r) => r.courseId === courseId && r.date === todayKey
    );

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
        if (status === 'present') {
          await awardXp({
            source: 'attendance',
            sourceId: existing.id,
            amount: 10,
            stat: 'discipline',
          });
          triggerLevelUpConfetti();
        }
        showToast(`Attendance updated to ${status}.`, 'success');
      }
    } else {
      const recId = generateId();
      await db.attendance.add({
        id: recId,
        courseId,
        sessionId,
        date: todayKey,
        status,
        createdAt: new Date().toISOString(),
      });
      if (status === 'present') {
        await awardXp({
          source: 'attendance',
          sourceId: recId,
          amount: 10,
          stat: 'discipline',
        });
        triggerLevelUpConfetti();
      }
      showToast(`Marked ${status} for today.`, 'success');
    }
  };

  // Open Postponement Modal
  const handleOpenPostponeModal = (c: ScheduledClass) => {
    setPostponeModalClass(c);
    setPostponeDate(c.postponedToDate || addDaysToKey(todayKey, 1));
    setPostponeStartTime(c.postponedToTime || c.startTime);
    setPostponeEndTime(c.endTime);
    setPostponeReason(c.exception?.reason || 'Class rescheduled / postponed');
  };

  // Save Postponement
  const handleSavePostponement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postponeModalClass) return;

    const existingEx = exceptions.find(
      (ex) => ex.sessionId === postponeModalClass.session.id && ex.date === todayKey
    );

    if (existingEx) {
      await db.classExceptions.update(existingEx.id, {
        action: 'moved',
        reason: postponeReason.trim(),
        newDate: postponeDate,
        newStartTime: postponeStartTime,
        newEndTime: postponeEndTime,
        newRoom: postponeModalClass.room,
      });
    } else {
      await db.classExceptions.add({
        id: generateId(),
        sessionId: postponeModalClass.session.id,
        date: todayKey,
        action: 'moved',
        reason: postponeReason.trim(),
        newDate: postponeDate,
        newStartTime: postponeStartTime,
        newEndTime: postponeEndTime,
        newRoom: postponeModalClass.room,
        createdAt: new Date().toISOString(),
      });
    }

    // Set attendance status to postponed for today's occurrence
    const existingAtt = attendanceRecords.find(
      (r) => r.courseId === postponeModalClass.course.id && r.date === todayKey
    );
    if (existingAtt) {
      await db.attendance.update(existingAtt.id, {
        status: 'postponed',
        notes: `Postponed to ${postponeDate} at ${postponeStartTime}`,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await db.attendance.add({
        id: generateId(),
        courseId: postponeModalClass.course.id,
        sessionId: postponeModalClass.session.id,
        date: todayKey,
        status: 'postponed',
        notes: `Postponed to ${postponeDate} at ${postponeStartTime}`,
        createdAt: new Date().toISOString(),
      });
    }

    // Reconcile reminders so notification cancels for today and schedules on new date
    reconcileAllReminders().catch(() => {});

    showToast(`Class postponed to ${postponeDate} at ${postponeStartTime}. Notifications updated.`, 'success');
    setPostponeModalClass(null);
  };

  // Cancel Postponement (reverts back to original recurring timetable)
  const handleCancelPostponement = async (sessionId: string, courseId: string) => {
    const target = exceptions.find(
      (ex) => ex.sessionId === sessionId && ex.date === todayKey
    );
    if (target) {
      await db.classExceptions.delete(target.id);
    }

    // Clear 'postponed' attendance mark
    const att = attendanceRecords.find(
      (r) => r.courseId === courseId && r.date === todayKey && r.status === 'postponed'
    );
    if (att) {
      await db.attendance.delete(att.id);
    }

    reconcileAllReminders().catch(() => {});
    showToast('Postponement cancelled. Restored normal timetable schedule.', 'info');
    setPostponeModalClass(null);
  };

  // Toggle habit
  const handleToggleHabit = async (habitId: string) => {
    const existingLog = habitLogs.find((l) => l.habitId === habitId);
    if (existingLog) {
      await db.habitLogs.delete(existingLog.id);
      await reverseXp('habit', habitId + '_' + todayKey);

      const updatedLogs = allHabitLogs.filter((l) => l.id !== existingLog.id);
      const newStreak = calculateHabitStreak(habitId, updatedLogs, restDays, todayKey);
      await db.habits.update(habitId, {
        currentStreak: newStreak.currentStreak,
        bestStreak: newStreak.bestStreak,
      });

      showToast('Habit check-in undone (-10 XP)', 'info');
    } else {
      const newId = generateId();
      await db.habitLogs.add({
        id: newId,
        habitId,
        date: todayKey,
        count: 1,
        isPartial: false,
      });

      const updatedLogs = [
        ...allHabitLogs,
        { id: newId, habitId, date: todayKey, count: 1, isPartial: false },
      ];
      const newStreak = calculateHabitStreak(habitId, updatedLogs, restDays, todayKey);
      await db.habits.update(habitId, {
        currentStreak: newStreak.currentStreak,
        bestStreak: newStreak.bestStreak,
      });

      await awardXp({
        source: 'habit',
        sourceId: habitId + '_' + todayKey,
        amount: 10,
        stat: 'vitality',
      });
      showToast(`Habit stamped! +10 XP (${newStreak.currentStreak}d streak)`, 'success');
    }
  };

  // Reschedule task to tomorrow
  const handleRescheduleToTomorrow = async (taskId: string) => {
    const tomorrowKey = addDaysToKey(todayKey, 1);
    await db.tasks.update(taskId, {
      dueDate: tomorrowKey,
      updatedAt: new Date().toISOString(),
    });
    showToast('Task moved to tomorrow', 'info');
  };

  // Complete Shutdown flow
  const handleCompleteShutdown = async () => {
    const newRefl: DailyReflection = {
      id: todayReflection?.id || generateId(),
      dateKey: todayKey,
      meaningfulAccomplishment: shutdownWin.trim() || 'Conquered today with intention and focus.',
      tomorrowImprovement: shutdownTomorrowFocus.trim(),
      completedTaskCount: completedTodayTasks.length,
      createdAt: todayReflection?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (todayReflection?.id) {
      await db.dailyReflections.update(todayReflection.id, newRefl);
    } else {
      await db.dailyReflections.add(newRefl);
      await awardXp({
        source: 'ritual',
        sourceId: `shutdown_${todayKey}`,
        amount: 25,
        stat: 'discipline',
        dayKey: todayKey,
      });
      showToast('Daily Shutdown completed! +25 XP', 'success');
    }

    if (shutdownTomorrowFocus.trim()) {
      await db.settings.update('current_user', {
        dailyIntention: shutdownTomorrowFocus.trim(),
        dailyIntentionDate: addDaysToKey(todayKey, 1),
      });
    }

    setIsShutdownOpen(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 animate-pop max-w-4xl mx-auto">
      {/* 1. CLEAN TODAY HEADER */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2 text-xs text-[rgb(var(--c-muted))]">
            <span className="font-semibold text-[rgb(var(--c-text))]">{formatDisplayDate(todayKey)}</span>
            <span>·</span>
            <span>{getEthiopicDateString()}</span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={toggleLowEnergy}
              className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-heading font-bold border transition flex items-center gap-1.5 ${
                lowEnergy
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-amber-400'
                  : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
              }`}
              title="Toggle Low Energy Mode (shows priority tasks only)"
            >
              <Battery className="w-3.5 h-3.5" />
              <span>{lowEnergy ? 'Low Energy: On' : 'Low Energy'}</span>
            </button>

            <button
              onClick={toggleDormDay}
              className="min-h-[36px] px-3 py-1 rounded-xl text-xs font-heading font-bold border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition flex items-center gap-1.5"
              title="Toggle view between Dorm/Phone and Desk/PC mode"
            >
              {isDormDay ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
              <span>{isDormDay ? 'Dorm Mode' : 'Desk Mode'}</span>
            </button>

            <button
              onClick={() => setCurrentRoute('#/statistics')}
              className="min-h-[36px] px-3 py-1 rounded-xl text-xs font-heading font-semibold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition flex items-center gap-1"
              title="View Statistics & Analytics"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Stats</span>
            </button>
          </div>
        </div>

        {/* Greeting & Imminent Exam */}
        <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))]">
              {getTimeGreeting(settings?.userName || 'Scholar')}
            </h1>
            <p className="text-xs text-[rgb(var(--c-muted))] mt-0.5">
              {settings?.universityName || 'Addis Ababa Science & Technology University'} · {settings?.currentTermName || 'Semester'}
            </p>
          </div>

          {nextExam && (
            <button
              onClick={() => setCurrentRoute('#/exams')}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-heading font-bold self-start sm:self-auto hover:bg-rose-500/20 transition"
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Next Exam: {nextExam.title} ({formatDisplayDate(nextExam.examDate)})</span>
            </button>
          )}
        </div>

        {/* Daily Focus Intention */}
        <div className="mt-3.5 p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Target className="w-4 h-4 text-[rgb(var(--c-primary))] shrink-0" />
            {isEditingIntention ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={intentionInput}
                  onChange={(e) => setIntentionInput(e.target.value)}
                  placeholder="What is your primary focus for today?"
                  className="min-h-[36px] w-full px-2.5 py-1 text-xs rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary))]"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveIntention()}
                />
                <button
                  onClick={handleSaveIntention}
                  className="min-h-[36px] px-3 py-1 rounded-lg bg-emerald-600 text-white font-heading font-bold text-xs shrink-0"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))] mr-1.5">
                  Today's Focus:
                </span>
                <span className="text-[rgb(var(--c-text))] font-medium">
                  {intentionInput || 'Tap "Set Focus" to anchor your primary goal for today...'}
                </span>
              </div>
            )}
          </div>

          {!isEditingIntention && (
            <button
              onClick={() => setIsEditingIntention(true)}
              className="text-xs font-heading font-semibold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] flex items-center gap-1 shrink-0 self-end sm:self-auto"
            >
              <Edit3 className="w-3 h-3" />
              <span>{intentionInput ? 'Edit' : 'Set Focus'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. UP NEXT PRIORITY CARD */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 shadow-xs border-l-4 border-l-[rgb(var(--c-primary))]">
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-heading uppercase font-bold text-[rgb(var(--c-primary))]">
              Up Next
            </span>
          </div>
          <span className="text-xs text-[rgb(var(--c-muted))]">
            {upNext.scheduledTime ? `Scheduled ${upNext.scheduledTime}` : upNext.category}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 flex-1">
            <h2 className="text-base sm:text-lg font-heading font-bold text-[rgb(var(--c-text))]">
              {upNext.title}
            </h2>
            {upNext.reason && (
              <p className="text-xs text-[rgb(var(--c-muted))]">
                {upNext.reason}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setActiveFocusTask({
                  taskId: upNext.id.startsWith('task-') ? upNext.id.replace('task-', '') : upNext.id,
                  taskTitle: upNext.title,
                  courseId: upNext.courseId,
                });
                setCurrentRoute('#/focus');
              }}
              className="min-h-[40px] px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[rgb(var(--c-primary))] text-xs font-heading font-bold flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Focus Session</span>
            </button>

            <button
              onClick={() => {
                if (upNext.actionType === 'navigate' && upNext.route) {
                  setCurrentRoute(upNext.route);
                } else if (upNext.actionType === 'complete_task' && upNext.taskId) {
                  const targetTask = tasks.find((t) => t.id === upNext.taskId);
                  if (targetTask) handleTaskClick(targetTask);
                } else if (upNext.actionType === 'stamp_habit' && upNext.habitId) {
                  handleToggleHabit(upNext.habitId);
                } else {
                  setCurrentRoute(upNext.route || '#/tasks');
                }
              }}
              className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition flex items-center gap-1"
            >
              <span>{upNext.actionLabel}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. TODAY'S TASKS & QUICK-ADD */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
              Today's Tasks ({todayTasks.filter((t) => t.status !== 'done').length} pending)
            </h2>
          </div>
          <button
            onClick={() => setCurrentRoute('#/tasks')}
            className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))]"
          >
            All Tasks →
          </button>
        </div>

        {/* Inline Quick Add */}
        <form onSubmit={handleQuickAddTask} className="flex items-center gap-2">
          <input
            type="text"
            value={quickTaskTitle}
            onChange={(e) => setQuickTaskTitle(e.target.value)}
            placeholder="Add a task for today... (Press Enter)"
            className="min-h-[40px] flex-1 px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
          />
          <button
            type="submit"
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#7A2E4A] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shrink-0 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        </form>

        {/* Task List */}
        <div className="space-y-1.5">
          {todayTasks.length === 0 ? (
            <div className="text-center py-6 text-xs text-[rgb(var(--c-muted))]">
              No tasks scheduled for today. Type above to quickly capture one!
            </div>
          ) : (
            todayTasks.slice(0, lowEnergy ? 3 : 5).map((task) => {
              const isDone = task.status === 'done';
              const xpReward = getQuestXpReward(task);

              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] transition ${
                    isDone ? 'opacity-60' : 'hover:border-[#7A2E4A]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Instant 1-Click Toggle: 44px touch target on mobile */}
                    <button
                      onClick={() => handleTaskClick(task)}
                      className="min-h-[40px] min-w-[40px] -m-1.5 flex items-center justify-center text-[#7A2E4A] shrink-0 transition active:scale-90 focus:outline-none"
                      title={isDone ? 'Click to reopen' : 'Click to complete'}
                      aria-label={isDone ? 'Reopen task' : 'Complete task'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="w-5 h-5 text-[rgb(var(--c-muted))] hover:text-emerald-600" />
                      )}
                    </button>
                    <span
                      className={`text-xs font-medium truncate ${
                        isDone ? 'line-through text-[rgb(var(--c-muted))]' : 'text-[rgb(var(--c-text))]'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-xs text-[rgb(var(--c-muted))]">
                    {task.dueTime && (
                      <span className="text-[11px] font-mono">{task.dueTime}</span>
                    )}
                    <span className="text-[10px] font-heading font-bold text-[rgb(var(--c-xp))]">
                      +{xpReward} XP
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. TODAY'S CLASSES & TIMELINE */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2 font-heading text-xs sm:text-sm font-bold text-[rgb(var(--c-text))]">
            <Calendar className="w-4 h-4 text-[rgb(var(--c-primary))]" />
            <span>Today's Classes &amp; Schedule</span>
          </div>

          <button
            onClick={() => setCurrentRoute('#/timetable')}
            className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))]"
          >
            Timetable →
          </button>
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
                                  : attendance.status === 'absent'
                                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40'
                                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                              }`}
                            >
                              {attendance.status === 'present'
                                ? '✓ Present'
                                : attendance.status === 'absent'
                                ? '✗ Absent'
                                : '↷ Postponed'}
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))] truncate">
                          {item.title}
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
                          if (item.actionPayload?.type === 'exam') setCurrentRoute('#/exams');
                          else setCurrentRoute('#/tasks');
                        }}
                        className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))]"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Interactive Class Attendance Controls directly on Home Page */}
                  {isClass && (
                    <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-[rgb(var(--c-border))]">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.courseId) handleSetAttendance(item.courseId, 'present', item.sessionId);
                        }}
                        className={`min-h-[32px] px-3 py-1 rounded-xl text-xs font-heading font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                          attendance?.status === 'present'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:border-emerald-500 hover:text-emerald-500'
                        }`}
                        title={attendance?.status === 'present' ? 'Click to clear present mark' : 'Mark Present'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Present</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (item.courseId) handleSetAttendance(item.courseId, 'absent', item.sessionId);
                        }}
                        className={`min-h-[32px] px-3 py-1 rounded-xl text-xs font-heading font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                          attendance?.status === 'absent'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:border-rose-500 hover:text-rose-500'
                        }`}
                        title={attendance?.status === 'absent' ? 'Click to clear absent mark' : 'Mark Absent'}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Absent</span>
                      </button>

                      {item.scheduledClass && (
                        <button
                          type="button"
                          onClick={() => handleOpenPostponeModal(item.scheduledClass!)}
                          className={`min-h-[32px] px-3 py-1 rounded-xl text-xs font-heading font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                            item.isPostponed || attendance?.status === 'postponed'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:border-amber-500 hover:text-amber-500'
                          }`}
                          title="Postpone / Reschedule occurrence to another date & time"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>{item.isPostponed ? 'Postponed' : 'Postpone'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setCurrentRoute('#/timetable')}
                        className="ml-auto p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))]"
                        title="View Full Timetable"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. TODAY'S HABITS */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2 font-heading text-xs sm:text-sm font-bold text-[rgb(var(--c-text))]">
            <Flame className="w-4 h-4 text-rose-500" />
            <span>Habits Check-In</span>
            <span className="text-xs text-[rgb(var(--c-muted))] font-normal">
              ({remainingTokens} rest tokens remaining)
            </span>
          </div>
          <button
            onClick={() => setCurrentRoute('#/habits')}
            className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))]"
          >
            Habit Tracker →
          </button>
        </div>

        {habits.length === 0 ? (
          <div className="text-center py-4 text-xs text-[rgb(var(--c-muted))]">
            No habits created yet. Track reading, hydration, or sleep in Habit Tracker.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {habits.slice(0, 4).map((habit) => {
              const isStamped = habitLogs.some((l) => l.habitId === habit.id);
              const habitStreak = calculateHabitStreak(habit.id, allHabitLogs, restDays, todayKey);
              return (
                <button
                  key={habit.id}
                  onClick={() => handleToggleHabit(habit.id)}
                  className={`min-h-[64px] p-3 rounded-xl border text-center transition active:scale-95 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    isStamped
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[rgb(var(--c-primary))]'
                  }`}
                >
                  <div className="text-xs font-heading leading-tight truncate max-w-full">
                    {habit.title}
                  </div>
                  <div className="text-[10px] text-[rgb(var(--c-muted))]">
                    {isStamped ? '✓ Done (+10 XP)' : `${habitStreak.currentStreak}d streak`}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. EVENING SHUTDOWN CARD */}
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
                className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
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
                        className="min-h-[32px] text-[11px] px-2.5 py-1 rounded-lg bg-[rgb(var(--c-surface2))] hover:bg-[rgb(var(--c-primary))] hover:text-stone-900 font-heading font-bold transition shrink-0"
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
                className="min-h-[40px] px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] text-xs font-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteShutdown}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-[#7A2E4A] text-white font-heading font-bold text-xs hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Shutdown (+25 XP)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLASS POSTPONEMENT MODAL */}
      {postponeModalClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[rgb(var(--c-surface))] ticket-border rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-heading font-bold text-base text-[rgb(var(--c-text))]">
                    Postpone Class Occurrence
                  </h3>
                  <div className="text-[11px] text-[rgb(var(--c-muted))]">
                    {postponeModalClass.course.code} — {postponeModalClass.course.name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPostponeModalClass(null)}
                className="p-1.5 rounded-xl hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200">
              Postponement applies <strong>only to today’s ({todayKey}) occurrence</strong>. Your standard recurring weekly timetable remains untouched.
            </div>

            <form onSubmit={handleSavePostponement} className="space-y-3.5">
              {/* Quick Date Presets */}
              <div>
                <label className="block text-[11px] font-heading uppercase font-bold text-[rgb(var(--c-text))] mb-1.5">
                  Reschedule To:
                </label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setPostponeDate(todayKey)}
                    className={`p-2 rounded-xl border text-xs font-heading font-bold transition text-center ${
                      postponeDate === todayKey
                        ? 'border-amber-500 bg-amber-500/15 text-[rgb(var(--c-text))]'
                        : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:border-[rgb(var(--c-text))]'
                    }`}
                  >
                    Later Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostponeDate(addDaysToKey(todayKey, 1))}
                    className={`p-2 rounded-xl border text-xs font-heading font-bold transition text-center ${
                      postponeDate === addDaysToKey(todayKey, 1)
                        ? 'border-amber-500 bg-amber-500/15 text-[rgb(var(--c-text))]'
                        : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:border-[rgb(var(--c-text))]'
                    }`}
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostponeDate(addDaysToKey(todayKey, 7))}
                    className={`p-2 rounded-xl border text-xs font-heading font-bold transition text-center ${
                      postponeDate === addDaysToKey(todayKey, 7)
                        ? 'border-amber-500 bg-amber-500/15 text-[rgb(var(--c-text))]'
                        : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:border-[rgb(var(--c-text))]'
                    }`}
                  >
                    Next Week
                  </button>
                </div>

                <input
                  type="date"
                  required
                  min={todayKey}
                  value={postponeDate}
                  onChange={(e) => setPostponeDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs font-bold"
                />
              </div>

              {/* Time Pickers */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    New Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={postponeStartTime}
                    onChange={(e) => setPostponeStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    New End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={postponeEndTime}
                    onChange={(e) => setPostponeEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs font-bold font-mono"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Reason / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={postponeReason}
                  onChange={(e) => setPostponeReason(e.target.value)}
                  placeholder="e.g. Instructor lab session reschedule, departmental shift"
                  className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-[rgb(var(--c-border))]">
                {exceptions.some((ex) => ex.sessionId === postponeModalClass.session.id && ex.date === todayKey) ? (
                  <button
                    type="button"
                    onClick={() => handleCancelPostponement(postponeModalClass.session.id, postponeModalClass.course.id)}
                    className="px-3 py-2 rounded-xl border border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs font-heading font-bold hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    Revert to Schedule
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPostponeModalClass(null)}
                    className="px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] text-xs font-heading font-bold hover:bg-[rgb(var(--c-surface2))] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-heading font-bold text-xs shadow-md active:scale-95 transition cursor-pointer"
                >
                  Save Postponement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
