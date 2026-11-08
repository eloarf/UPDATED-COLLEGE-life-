import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import {
  getTodayKey,
  getDayOfWeekIndex,
  addDaysToKey,
} from '../utils/dateUtils';
import {
  ensureDailyQuests,
  awardXp,
  reverseXp,
  getQuestXpReward,
  triggerLevelUpConfetti,
} from '../services/rpgService';
import { Task, DailyReflection } from '../types';
import { getClassesForDate, getNextClass, ScheduledClass } from '../utils/scheduleEngine';
import { reconcileAllReminders } from '../services/reminderEngine';
import {
  calculateDailyProgress,
  getUpNextItem,
  buildTodayTimeline,
  DailyProgressResult,
  UpNextResult,
} from '../utils/todayEngine';
import { saveAttendanceQuickMark } from '../utils/attendanceEngine';
import { getRemainingRestTokens, calculateHabitStreak } from '../utils/streakEngine';
import { generateId } from '../utils/idGenerator';
import {
  getTotalXp,
  getRecentHabitLogs,
  getAttendanceByDateRange,
  getFocusSessionsByDateRange,
} from '../db/queries';

import { LobbyHeroHeader } from '../components/lobby/LobbyHeroHeader';
import { LobbyUpNextCard } from '../components/lobby/LobbyUpNextCard';
import { LobbyTodayTasksSection } from '../components/lobby/LobbyTodayTasksSection';
import { LobbyClassesTimelineSection } from '../components/lobby/LobbyClassesTimelineSection';
import { LobbyHabitsSection } from '../components/lobby/LobbyHabitsSection';
import { LobbyShutdownSection } from '../components/lobby/LobbyShutdownSection';
import { LobbyPostponeModal } from '../components/lobby/LobbyPostponeModal';

export const LobbyPage: React.FC = () => {
  const { setCurrentRoute, showToast, setActiveFocusTask } = useUiStore();
  const todayKey = getTodayKey();
  const dayIndex = getDayOfWeekIndex();

  // Bounded & indexed database queries
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const semesters = useLiveQuery(() => db.semesters.toArray()) || [];
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const sessions = useLiveQuery(() => db.classSessions.toArray()) || [];
  const exceptions = useLiveQuery(() => db.classExceptions.toArray()) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const exams = useLiveQuery(() => db.exams.toArray()) || [];
  const habits = useLiveQuery(() => db.habits.toArray()) || [];
  const allHabitLogs = useLiveQuery(() => getRecentHabitLogs(90, todayKey)) || [];
  const habitLogs = useLiveQuery(() => db.habitLogs.where('date').equals(todayKey).toArray()) || [];
  const restDays = useLiveQuery(() => db.restDays.toArray()) || [];
  const totalXp = useLiveQuery(() => getTotalXp()) || 0;
  const quests = useLiveQuery(() => db.quests.where('dayKey').equals(todayKey).toArray()) || [];
  const focusSessions = useLiveQuery(() => getFocusSessionsByDateRange(todayKey, todayKey)) || [];
  const attendanceRecords = useLiveQuery(() => getAttendanceByDateRange(todayKey, todayKey)) || [];
  const creativeProjects = useLiveQuery(() => db.creativeProjects.toArray()) || [];
  const readingItems = useLiveQuery(() => db.readingItems.toArray()) || [];
  const reflections = useLiveQuery(() => db.dailyReflections.where('dateKey').equals(todayKey).toArray()) || [];

  const todayReflection = reflections[0] || null;

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

  const remainingTokens = getRemainingRestTokens(restDays, todayKey);

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

  // Instant 1-Click Task Toggle
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
    status: 'present' | 'late' | 'absent' | 'postponed',
    sessionId?: string,
    startTime?: string,
    isCancelled?: boolean
  ) => {
    if (status === 'postponed') {
      const existing = attendanceRecords.find(
        (r) => r.courseId === courseId && r.date === todayKey
      );
      if (existing) {
        await db.attendance.update(existing.id, {
          status: 'postponed',
          updatedAt: new Date().toISOString(),
        });
        showToast('Marked postponed.', 'info');
      } else {
        await db.attendance.add({
          id: generateId(),
          courseId,
          sessionId,
          date: todayKey,
          status: 'postponed',
          createdAt: new Date().toISOString(),
        });
        showToast('Marked postponed.', 'info');
      }
      return;
    }

    const res = await saveAttendanceQuickMark({
      courseId,
      date: todayKey,
      status: status as 'present' | 'late' | 'absent',
      sessionId,
      startTime,
      isCancelled,
      allowToggle: true,
    });

    if (!res.success) {
      showToast(res.error || 'Cannot mark attendance.', 'danger');
      return;
    }

    if (res.action === 'toggled_off') {
      showToast('Attendance mark cleared.', 'info');
    } else {
      if (status === 'present') {
        await awardXp({
          source: 'attendance',
          sourceId: res.record?.id || courseId,
          amount: 10,
          stat: 'discipline',
        });
        triggerLevelUpConfetti();
      } else if (status === 'late') {
        await awardXp({
          source: 'attendance',
          sourceId: res.record?.id || courseId,
          amount: 5,
          stat: 'discipline',
        });
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
      <LobbyHeroHeader
        todayKey={todayKey}
        settings={settings}
        lowEnergy={lowEnergy}
        toggleLowEnergy={toggleLowEnergy}
        isDormDay={isDormDay}
        toggleDormDay={toggleDormDay}
        nextExam={nextExam}
        isEditingIntention={isEditingIntention}
        setIsEditingIntention={setIsEditingIntention}
        intentionInput={intentionInput}
        setIntentionInput={setIntentionInput}
        handleSaveIntention={handleSaveIntention}
        onNavigate={setCurrentRoute}
      />

      {/* 2. UP NEXT PRIORITY CARD */}
      <LobbyUpNextCard
        upNext={upNext}
        tasks={tasks}
        onStartFocus={setActiveFocusTask}
        onNavigate={setCurrentRoute}
        onTaskClick={handleTaskClick}
        onToggleHabit={handleToggleHabit}
      />

      {/* 3. TODAY'S TASKS & QUICK-ADD */}
      <LobbyTodayTasksSection
        todayTasks={todayTasks}
        lowEnergy={lowEnergy}
        quickTaskTitle={quickTaskTitle}
        setQuickTaskTitle={setQuickTaskTitle}
        handleQuickAddTask={handleQuickAddTask}
        handleTaskClick={handleTaskClick}
        onNavigate={setCurrentRoute}
      />

      {/* 4. TODAY'S CLASSES & TIMELINE */}
      <LobbyClassesTimelineSection
        timeline={timeline}
        todayKey={todayKey}
        attendanceRecords={attendanceRecords}
        handleSetAttendance={handleSetAttendance}
        handleOpenPostponeModal={handleOpenPostponeModal}
        onNavigate={setCurrentRoute}
      />

      {/* 5. TODAY'S HABITS */}
      <LobbyHabitsSection
        habits={habits}
        habitLogs={habitLogs}
        allHabitLogs={allHabitLogs}
        restDays={restDays}
        todayKey={todayKey}
        remainingTokens={remainingTokens}
        handleToggleHabit={handleToggleHabit}
        onNavigate={setCurrentRoute}
      />

      {/* 6. EVENING SHUTDOWN CARD & MODAL */}
      <LobbyShutdownSection
        isShutdownOpen={isShutdownOpen}
        setIsShutdownOpen={setIsShutdownOpen}
        todayReflection={todayReflection}
        completedTodayTasks={completedTodayTasks}
        unfinishedTasks={unfinishedTasks}
        shutdownWin={shutdownWin}
        setShutdownWin={setShutdownWin}
        shutdownTomorrowFocus={shutdownTomorrowFocus}
        setShutdownTomorrowFocus={setShutdownTomorrowFocus}
        handleRescheduleToTomorrow={handleRescheduleToTomorrow}
        handleCompleteShutdown={handleCompleteShutdown}
      />

      {/* CLASS POSTPONEMENT MODAL */}
      <LobbyPostponeModal
        postponeModalClass={postponeModalClass}
        setPostponeModalClass={setPostponeModalClass}
        postponeDate={postponeDate}
        setPostponeDate={setPostponeDate}
        postponeStartTime={postponeStartTime}
        setPostponeStartTime={setPostponeStartTime}
        postponeEndTime={postponeEndTime}
        setPostponeEndTime={setPostponeEndTime}
        postponeReason={postponeReason}
        setPostponeReason={setPostponeReason}
        todayKey={todayKey}
        exceptions={exceptions}
        handleSavePostponement={handleSavePostponement}
        handleCancelPostponement={handleCancelPostponement}
      />
    </div>
  );
};
