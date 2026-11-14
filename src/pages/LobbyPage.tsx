import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import {
  getTodayKey,
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
import { getClassesForDate, ScheduledClass } from '../utils/scheduleEngine';
import { reconcileAllReminders } from '../services/reminderEngine';
import {
  calculateDailyProgress,
  buildTodayTimeline,
  getDoThisNext,
  getNextTimelineItems,
  getDailyInsightSentence,
} from '../utils/todayEngine';
import { buildDayTimeline } from '../utils/timelineEngine';
import { saveAttendanceQuickMark } from '../utils/attendanceEngine';
import { getRemainingRestTokens, calculateHabitStreak } from '../utils/streakEngine';
import { getDueFlashcardsCount } from '../utils/flashcardEngine';
import { deriveHotelProgress } from '../utils/hotelProgressEngine';
import { generateId } from '../utils/idGenerator';
import {
  getRecentHabitLogs,
  getAttendanceByDateRange,
} from '../db/queries';
import {
  Sparkles,
  Layers,
  Feather,
  CheckSquare,
  Calendar,
  Flame,
  Building2,
  Moon,
  Compass,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

import { LobbyHeroHeader } from '../components/lobby/LobbyHeroHeader';
import { LobbyDoThisNextCard } from '../components/lobby/LobbyDoThisNextCard';
import { LobbyTopTimelinePreview } from '../components/lobby/LobbyTopTimelinePreview';
import { CollapsibleLobbySection } from '../components/lobby/CollapsibleLobbySection';
import { LobbyQuickJournalCard } from '../components/lobby/LobbyQuickJournalCard';
import { LobbyHotelProgressCard } from '../components/lobby/LobbyHotelProgressCard';
import { LobbyTodayTasksSection } from '../components/lobby/LobbyTodayTasksSection';
import { LobbyClassesTimelineSection } from '../components/lobby/LobbyClassesTimelineSection';
import { LobbyHabitsSection } from '../components/lobby/LobbyHabitsSection';
import { LobbyShutdownSection } from '../components/lobby/LobbyShutdownSection';
import { LobbyPostponeModal } from '../components/lobby/LobbyPostponeModal';

const DEFAULT_LOBBY_SECTIONS: Record<string, boolean> = {
  tasks: true,
  habits: true,
  quick_journal: true,
  flashcards: true,
  hotel_progress: false,
  classes: false,
  overview: false,
  shutdown: false,
};

export const LobbyPage: React.FC = () => {
  const { setCurrentRoute, showToast, setActiveFocusTask } = useUiStore();
  const todayKey = getTodayKey();

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
  const studyBlocksToday = useLiveQuery(() => db.studyBlocks.where('date').equals(todayKey).toArray()) || [];
  const masterWeekBlocks = useLiveQuery(() => db.masterWeekBlocks.toArray()) || [];
  const allFocusSessions = useLiveQuery(() => db.focusSessions.toArray()) || [];
  const attendanceRecords = useLiveQuery(() => getAttendanceByDateRange(todayKey, todayKey)) || [];
  const flashcards = useLiveQuery(() => db.flashcards.toArray()) || [];
  const xpEvents = useLiveQuery(() => db.xpEvents.toArray()) || [];
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

  const sectionStates: Record<string, boolean> = useMemo(
    () => ({
      ...DEFAULT_LOBBY_SECTIONS,
      ...(settings?.lobbySectionStates || {}),
    }),
    [settings?.lobbySectionStates]
  );

  const handleToggleSection = async (sectionId: string) => {
    const nextOpen = !sectionStates[sectionId];
    const nextMap = {
      ...sectionStates,
      [sectionId]: nextOpen,
    };
    await db.settings.update('current_user', {
      lobbySectionStates: nextMap,
    });
  };

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
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const focusSessionsToday = useMemo(
    () => allFocusSessions.filter((s) => (s.completedAt || s.startedAt || '').startsWith(todayKey)),
    [allFocusSessions, todayKey]
  );

  const remainingTokens = getRemainingRestTokens(restDays, todayKey);
  const dueFlashcardsCount = useMemo(
    () => getDueFlashcardsCount(flashcards, todayKey),
    [flashcards, todayKey]
  );

  // Block 1: "Do this next" pure selector
  const doThisNext = useMemo(() => {
    return getDoThisNext({
      now,
      todayKey,
      scheduledClasses: scheduledClassesToday,
      tasks,
      habits,
      habitLogs,
      restDays,
    });
  }, [now, todayKey, scheduledClassesToday, tasks, habits, habitLogs, restDays]);

  // Full day timeline engine for Block 2 (next 3 items) & gaps
  const dayTimeline = useMemo(() => {
    return buildDayTimeline({
      date: todayKey,
      classes: scheduledClassesToday,
      tasks,
      studyBlocks: studyBlocksToday,
      masterWeekBlocks,
      exams,
      focusSessions: focusSessionsToday,
      courses,
      currentMinutes: nowMinutes,
    });
  }, [todayKey, scheduledClassesToday, tasks, studyBlocksToday, masterWeekBlocks, exams, focusSessionsToday, courses, nowMinutes]);

  const nextThreeTimelineItems = useMemo(
    () => getNextTimelineItems(dayTimeline.blocks, nowMinutes, 3),
    [dayTimeline.blocks, nowMinutes]
  );

  const dailyProgress = useMemo(() => {
    return calculateDailyProgress({
      tasks,
      habits,
      habitLogs,
      restDays,
      scheduledClasses: scheduledClassesToday,
      attendanceRecords,
      focusSessions: focusSessionsToday,
      todayKey,
    });
  }, [tasks, habits, habitLogs, restDays, scheduledClassesToday, attendanceRecords, focusSessionsToday, todayKey]);

  const nextUpcomingGap = useMemo(() => {
    return dayTimeline.freeGaps.find((g) => g.endMinutes > nowMinutes) || null;
  }, [dayTimeline.freeGaps, nowMinutes]);

  const streakHighlightsCount = useMemo(
    () => habits.filter((h) => calculateHabitStreak(h.id, allHabitLogs, restDays, todayKey).currentStreak > 0).length,
    [habits, allHabitLogs, restDays, todayKey]
  );

  // Block 3: One insight sentence
  const dailyInsightSentence = useMemo(() => {
    return getDailyInsightSentence({
      dailyProgress,
      nextGapMinutes: nextUpcomingGap ? nextUpcomingGap.durationMinutes : null,
      focusMinutesToday: dailyProgress.actualFocusMinutes,
      streakHighlightsCount,
    });
  }, [dailyProgress, nextUpcomingGap, streakHighlightsCount]);

  // Chronological Today Timeline for Classes section
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

  // Derived visible progress (Grand Hotel wings)
  const hotelProgress = useMemo(() => {
    return deriveHotelProgress({
      habitLogs: allHabitLogs,
      restDays,
      focusSessions: allFocusSessions,
      tasks,
      xpEvents,
    });
  }, [allHabitLogs, restDays, allFocusSessions, tasks, xpEvents]);

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

    reconcileAllReminders().catch(() => {});
    showToast(`Class postponed to ${postponeDate} at ${postponeStartTime}. Notifications updated.`, 'success');
    setPostponeModalClass(null);
  };

  // Cancel Postponement
  const handleCancelPostponement = async (sessionId: string, courseId: string) => {
    const target = exceptions.find(
      (ex) => ex.sessionId === sessionId && ex.date === todayKey
    );
    if (target) {
      await db.classExceptions.delete(target.id);
    }

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
      isOverdueRolledOver: true,
      updatedAt: new Date().toISOString(),
    });
    showToast('Task rolled over to tomorrow', 'info');
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
    <div className="space-y-4 sm:space-y-5 pb-24 animate-pop max-w-4xl mx-auto">
      {/* ===================================================================== */}
      {/* TOP OF LOBBY: EXACTLY THREE FOCUSED BLOCKS                            */}
      {/* ===================================================================== */}

      {/* BLOCK 1: Do this next */}
      <LobbyDoThisNextCard
        item={doThisNext}
        tasks={tasks}
        onStartFocus={setActiveFocusTask}
        onNavigate={setCurrentRoute}
        onTaskClick={handleTaskClick}
        onToggleHabit={handleToggleHabit}
      />

      {/* BLOCK 2: Next 3 items of today's timeline */}
      <LobbyTopTimelinePreview
        items={nextThreeTimelineItems}
        isAllDone={dailyProgress.isAllDone}
        onNavigate={setCurrentRoute}
      />

      {/* BLOCK 3: One insight sentence (+ calm All Done badge when clear) */}
      <div
        className={`ticket-border rounded-2xl px-4 py-3 shadow-xs flex items-center justify-between gap-3 ${
          dailyProgress.isAllDone
            ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-500/40'
            : 'bg-[rgb(var(--c-surface))]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {dailyProgress.isAllDone ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          <p className="text-xs font-flourish text-[rgb(var(--c-text))] leading-snug">
            {dailyInsightSentence}
          </p>
        </div>
        {dailyProgress.isAllDone && (
          <span className="text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
            All done
          </span>
        )}
      </div>

      {/* ===================================================================== */}
      {/* COLLAPSIBLE SECTIONS BELOW (OPEN/CLOSED REMEMBERED PER SECTION)        */}
      {/* ===================================================================== */}

      {/* 1. Today's Tasks */}
      <CollapsibleLobbySection
        id="tasks"
        title="Today's Tasks"
        summary={`${unfinishedTasks.length} open`}
        icon={<CheckSquare className="w-4 h-4 text-[#7A2E4A]" />}
        isOpen={!!sectionStates.tasks}
        onToggle={handleToggleSection}
      >
        <LobbyTodayTasksSection
          todayTasks={todayTasks}
          lowEnergy={lowEnergy}
          quickTaskTitle={quickTaskTitle}
          setQuickTaskTitle={setQuickTaskTitle}
          handleQuickAddTask={handleQuickAddTask}
          handleTaskClick={handleTaskClick}
          onNavigate={setCurrentRoute}
        />
      </CollapsibleLobbySection>

      {/* 2. Habits Check-In */}
      <CollapsibleLobbySection
        id="habits"
        title="Habits Check-In"
        summary={`${remainingTokens} rest left`}
        icon={<Flame className="w-4 h-4 text-rose-500" />}
        isOpen={!!sectionStates.habits}
        onToggle={handleToggleSection}
      >
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
      </CollapsibleLobbySection>

      {/* 3. 1-Minute Quick Journal */}
      <CollapsibleLobbySection
        id="quick_journal"
        title="1-Minute Quick Journal"
        summary="Prompt + 1-tap mood"
        icon={<Feather className="w-4 h-4 text-[rgb(var(--c-primary))]" />}
        isOpen={!!sectionStates.quick_journal}
        onToggle={handleToggleSection}
      >
        <LobbyQuickJournalCard todayKey={todayKey} onNavigate={setCurrentRoute} />
      </CollapsibleLobbySection>

      {/* 4. Flashcards Due */}
      <CollapsibleLobbySection
        id="flashcards"
        title="Flashcards Spaced Repetition"
        summary={dueFlashcardsCount > 0 ? `${dueFlashcardsCount} due today` : 'Caught up'}
        icon={<Layers className="w-4 h-4 text-emerald-500" />}
        isOpen={!!sectionStates.flashcards}
        onToggle={handleToggleSection}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            {dueFlashcardsCount > 0
              ? `You have ${dueFlashcardsCount} flashcard${dueFlashcardsCount === 1 ? '' : 's'} ready for review today.`
              : flashcards.length === 0
              ? 'Create your first offline flashcard deck linked to a course or exam topic.'
              : 'All due flashcards reviewed for today!'}
          </div>
          <button
            onClick={() => setCurrentRoute('#/flashcards')}
            className="px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer hover:opacity-90"
          >
            <span>{dueFlashcardsCount > 0 ? `Review Due (${dueFlashcardsCount})` : 'Open Flashcards'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </CollapsibleLobbySection>

      {/* 5. Today's Classes & Schedule */}
      <CollapsibleLobbySection
        id="classes"
        title="Today's Classes & Schedule"
        summary={`${scheduledClassesToday.length} scheduled`}
        icon={<Calendar className="w-4 h-4 text-[rgb(var(--c-primary))]" />}
        isOpen={!!sectionStates.classes}
        onToggle={handleToggleSection}
      >
        <LobbyClassesTimelineSection
          timeline={timeline}
          todayKey={todayKey}
          attendanceRecords={attendanceRecords}
          handleSetAttendance={handleSetAttendance}
          handleOpenPostponeModal={handleOpenPostponeModal}
          onNavigate={setCurrentRoute}
        />
      </CollapsibleLobbySection>

      {/* 6. Visible, Forgiving Progress — Grand Hotel (optional Settings toggle) */}
      {settings?.showVisibleProgress !== false && (
        <CollapsibleLobbySection
          id="hotel_progress"
          title="The Grand Hotel"
          summary={`${hotelProgress.unlockedCount}/${hotelProgress.totalWings} wings • ${hotelProgress.consistentDays}d`}
          icon={<Building2 className="w-4 h-4 text-[#E5C04B]" />}
          isOpen={!!sectionStates.hotel_progress}
          onToggle={handleToggleSection}
        >
          <LobbyHotelProgressCard progress={hotelProgress} />
        </CollapsibleLobbySection>
      )}

      {/* 7. Daily Intention & Modes */}
      <CollapsibleLobbySection
        id="overview"
        title="Daily Intention & Energy Modes"
        summary={lowEnergy ? 'Low-Energy On' : isDormDay ? 'Dorm Mode' : 'Desk Mode'}
        icon={<Compass className="w-4 h-4 text-[rgb(var(--c-primary))]" />}
        isOpen={!!sectionStates.overview}
        onToggle={handleToggleSection}
      >
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
      </CollapsibleLobbySection>

      {/* 8. Evening Shutdown */}
      <CollapsibleLobbySection
        id="shutdown"
        title="Evening Shutdown Ritual"
        summary={todayReflection ? 'Logged today ✓' : 'Reflect & roll over tasks'}
        icon={<Moon className="w-4 h-4 text-[#7A2E4A]" />}
        isOpen={!!sectionStates.shutdown}
        onToggle={handleToggleSection}
      >
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
      </CollapsibleLobbySection>

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
