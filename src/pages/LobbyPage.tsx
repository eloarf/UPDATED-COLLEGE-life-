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
import { getClassesForDate, getNextClass, NextClassResult } from '../utils/scheduleEngine';
import {
  calculateDailyProgress,
  getUpNextItem,
  buildTodayTimeline,
  getTaskEstimatedMinutes,
  getDurationMinutes,
  DailyProgressResult,
  UpNextResult,
  TimelineItem,
} from '../utils/todayEngine';
import {
  calculateHabitStreak,
  getRemainingRestTokens,
  MAX_WEEKLY_REST_TOKENS,
} from '../utils/streakEngine';
import {
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Zap,
  Calendar,
  ShieldAlert,
  Shield,
  HardDrive,
  RefreshCw,
  Flame,
  Battery,
  Laptop,
  Smartphone,
  ChevronRight,
  BookOpen,
  PiggyBank,
  CreditCard,
  TrendingDown,
  Award,
  X,
  AlertCircle,
  Play,
  Moon,
  Sun,
  Edit3,
  Check,
  Music,
  Bookmark,
  Target,
  ArrowRight,
  Send,
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
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const savingsGoals = useLiveQuery(() => db.savingsGoals.toArray()) || [];
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

  // Shutdown Drawer
  const [isShutdownOpen, setIsShutdownOpen] = useState(false);
  const [shutdownWin, setShutdownWin] = useState('');
  const [shutdownTomorrowFocus, setShutdownTomorrowFocus] = useState('');

  // Confirmation modals state for XP integrity
  const [taskToConfirm, setTaskToConfirm] = useState<Task | null>(null);
  const [dailyQuestToConfirm, setDailyQuestToConfirm] = useState<DailyQuest | null>(null);

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

  // Daily Progress Calculation (Tasks + Habits + Classes + Duration)
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
  const todayTasks = tasks.filter((t) => t.dueDate === todayKey || t.priority === 'high');
  const unfinishedTasks = todayTasks.filter((t) => t.status !== 'done');
  const completedTodayTasks = tasks.filter((t) => t.status === 'done' && (t.completedAt?.startsWith(todayKey) || t.dueDate === todayKey));

  // Toggles
  const toggleLowEnergy = async () => {
    const newVal = !lowEnergy;
    setLowEnergy(newVal);
    await db.settings.update('current_user', { isLowEnergy: newVal });
    showToast(newVal ? 'Low-energy mode engaged: priorities condensed.' : 'Full power mode restored.', 'info');
  };

  const toggleDormDay = async () => {
    const newVal = !isDormDay;
    setIsDormDay(newVal);
    await db.settings.update('current_user', { isDormDay: newVal });
    showToast(newVal ? 'Dorm Day: Mobile-first schedule' : 'Home Day: PC & Studio power mode', 'info');
  };

  const handleSaveIntention = async () => {
    await db.settings.update('current_user', {
      dailyIntention: intentionInput.trim(),
      dailyIntentionDate: todayKey,
    });
    setIsEditingIntention(false);
    showToast('Daily focus intention anchored for today!', 'success');
  };

  // Start Focus Block from Up Next
  const handleStartFocusFromUpNext = (item: UpNextResult) => {
    setActiveFocusTask({
      taskId: item.id.startsWith('task-') ? item.id.replace('task-', '') : item.id,
      taskTitle: item.title,
      courseId: item.courseId,
    });
    setCurrentRoute('#/focus');
    showToast(`Focus session initialized for: ${item.title}`, 'info');
  };

  // Task click & confirmation
  const handleTaskClick = async (task: Task) => {
    if (task.status === 'done') {
      const xpAmount = getQuestXpReward(task);
      await db.tasks.update(task.id, {
        status: 'todo',
        completedAt: undefined,
        updatedAt: new Date().toISOString(),
      });
      await reverseXp('task', task.id);
      showToast(`Quest re-opened. -${xpAmount} XP reversed.`, 'info');
    } else {
      setTaskToConfirm(task);
    }
  };

  const handleConfirmTaskCompletion = async () => {
    if (!taskToConfirm) return;
    const task = taskToConfirm;
    const nowIso = new Date().toISOString();
    const xpAmount = getQuestXpReward(task);

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
      showToast(`Quest conquered! +${xpAmount} XP awarded to ledger`, 'success');
    }

    setTaskToConfirm(null);
  };

  const handleDailyQuestClick = (quest: DailyQuest) => {
    if (!quest.isDone) {
      setDailyQuestToConfirm(quest);
    }
  };

  const handleConfirmDailyQuest = async () => {
    if (!dailyQuestToConfirm) return;
    const quest = dailyQuestToConfirm;

    await db.quests.update(quest.id, { isDone: true });
    const awarded = await awardXp({
      source: 'daily_quest',
      sourceId: quest.id,
      amount: quest.xpReward,
      stat: quest.stat,
      dayKey: quest.dayKey,
    });

    if (awarded) {
      triggerLevelUpConfetti();
      showToast(`Daily quest completed! +${quest.xpReward} XP`, 'success');
    }

    setDailyQuestToConfirm(null);
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

      showToast('Habit check-in undone. -10 XP reversed.', 'info');
    } else {
      const newId = Math.random().toString();
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
    showToast('Task moved to tomorrow’s docket', 'info');
  };

  // Complete Shutdown flow
  const handleCompleteShutdown = async () => {
    const newRefl: DailyReflection = {
      id: todayReflection?.id || Math.random().toString(),
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
      showToast('Daily Shutdown completed! +25 XP awarded for intentional closure.', 'success');
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
    <div className="space-y-6 sm:space-y-8 pb-28 animate-pop">
      {/* 2.1 — PERSONALIZED DAILY COMMAND HEADER */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-7 shadow-xs relative overflow-hidden">
        {/* Top Controls & Status Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgb(var(--c-border))]/60">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-flourish text-[rgb(var(--c-primary))] font-semibold">
              {getEthiopicDateString()}
            </span>
            <span className="text-[rgb(var(--c-border))]">•</span>
            <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
              {formatDisplayDate(todayKey)}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <button
              onClick={toggleLowEnergy}
              className={`px-3 py-1.5 rounded-full text-xs font-heading font-bold border transition flex items-center gap-1.5 ${
                lowEnergy
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 border-amber-400 shadow-xs ring-2 ring-amber-400/40'
                  : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
              }`}
              title="Toggle Low Energy Day (minimum viable day)"
            >
              <Battery className="w-3.5 h-3.5" />
              <span>{lowEnergy ? 'Low Power: ON' : 'Full Power'}</span>
            </button>

            <button
              onClick={toggleDormDay}
              className="py-1.5 px-3 rounded-full text-xs font-heading font-bold border border-[#7A2E4A] bg-[#7A2E4A] text-white shadow-xs transition-all flex items-center gap-1.5"
              title="Switch between Dorm Day (phone only) and Home Day / PC Day"
            >
              {isDormDay ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
              <span>{isDormDay ? 'Dorm Day' : 'PC Day'}</span>
            </button>

            {/* Quick Link to Statistics & Wrapped */}
            <button
              onClick={() => setCurrentRoute('#/statistics')}
              className="py-1.5 px-3 rounded-full text-xs font-heading font-bold bg-[rgb(var(--c-surface2))] hover:bg-[rgb(var(--c-primary))] hover:text-stone-900 text-[rgb(var(--c-text))] border border-[rgb(var(--c-border))] transition flex items-center gap-1.5"
              title="Inspect Personal Analytics & Spotify Wrapped"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Statistics</span>
            </button>
          </div>
        </div>

        {/* Greeting & University Context */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))] tracking-wide">
              {getTimeGreeting(settings?.userName || 'Scholar')}
            </h1>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-0.5">
              {settings?.universityName || 'Addis Ababa Science & Technology University'} • {settings?.currentTermName}
            </p>
          </div>

          {/* Imminent Exam / Deadline Indicator */}
          {nextExam && (
            <button
              onClick={() => setCurrentRoute('#/exams')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-heading font-bold self-start sm:self-auto hover:bg-rose-500/20 transition"
              title="Next boss battle countdown"
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Next Exam: {nextExam.title} ({formatDisplayDate(nextExam.examDate)})</span>
            </button>
          )}
        </div>

        {/* User-Defined Daily Intention Statement */}
        <div className="mt-4 p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Target className="w-4 h-4 text-[rgb(var(--c-primary))] shrink-0" />
            {isEditingIntention ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={intentionInput}
                  onChange={(e) => setIntentionInput(e.target.value)}
                  placeholder="What is your single most important intention today?"
                  className="w-full px-2.5 py-1 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary))]"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveIntention()}
                />
                <button
                  onClick={handleSaveIntention}
                  className="px-2.5 py-1 rounded-xl bg-emerald-500 text-white font-heading font-bold text-[11px] shrink-0"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))] mr-1.5">
                  Today's Intention:
                </span>
                <span className="text-[rgb(var(--c-text))] font-medium italic">
                  {intentionInput || 'Set your focal intention for today...'}
                </span>
              </div>
            )}
          </div>

          {!isEditingIntention && (
            <button
              onClick={() => setIsEditingIntention(true)}
              className="text-[11px] font-heading font-semibold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] flex items-center gap-1 shrink-0 self-end sm:self-auto"
            >
              <Edit3 className="w-3 h-3" />
              <span>{intentionInput ? 'Change' : 'Set Focus'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2.2 — DAILY PROGRESS VISUALIZATION (Multi-Faceted & Exact) */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Central Circular Progress Ring */}
          <div className="flex items-center gap-5 shrink-0">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-[rgb(var(--c-border))]"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-[#B6E63E] transition-all duration-700 ease-out"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - (progress.overallProgressPercent / 100))}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl sm:text-2xl font-heading font-black text-[rgb(var(--c-text))]">
                  {progress.overallProgressPercent}%
                </span>
                <span className="text-[9px] uppercase font-heading font-bold text-[rgb(var(--c-muted))]">
                  Day Score
                </span>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-heading font-bold tracking-wider text-[rgb(var(--c-primary))]">
                Daily Workload Completion
              </div>
              <h3 className="text-base sm:text-lg font-heading font-bold text-[rgb(var(--c-text))]">
                {progress.isAllDone
                  ? '🌟 Day Mastered! Everything on docket finished.'
                  : progress.overallProgressPercent >= 60
                  ? 'Strong momentum! Deep in the zone.'
                  : 'Pacing through scheduled priorities.'}
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-0.5">
                Time-weighted completion: <strong className="text-[rgb(var(--c-text))]">{progress.durationPercent}%</strong> of planned minutes
              </p>
            </div>
          </div>

          {/* Exact Distinct Figures Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 border-t md:border-t-0 md:border-l border-[rgb(var(--c-border))] pt-4 md:pt-0 md:pl-6">
            {/* 1. Tasks */}
            <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-1">
              <div className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))]">
                Tasks Completed
              </div>
              <div className="text-lg font-heading font-bold text-[rgb(var(--c-text))]">
                {progress.tasksCompleted} <span className="text-xs font-normal text-[rgb(var(--c-muted))]">/ {progress.tasksPlanned}</span>
              </div>
              <div className="text-[10px] text-emerald-500 font-heading font-bold">
                {progress.tasksItemPercent}% completed
              </div>
            </div>

            {/* 2. Habits */}
            <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-1">
              <div className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))]">
                Habits Checked
              </div>
              <div className="text-lg font-heading font-bold text-[rgb(var(--c-text))]">
                {progress.habitsCompleted} <span className="text-xs font-normal text-[rgb(var(--c-muted))]">/ {progress.habitsTotal}</span>
              </div>
              <div className="text-[10px] text-rose-500 font-heading font-bold">
                {progress.habitsPercent}% checked
              </div>
            </div>

            {/* 3. Classes */}
            <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-1">
              <div className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))]">
                Lectures Attended
              </div>
              <div className="text-lg font-heading font-bold text-[rgb(var(--c-text))]">
                {progress.classesAttended} <span className="text-xs font-normal text-[rgb(var(--c-muted))]">/ {progress.classesScheduled}</span>
              </div>
              <div className="text-[10px] text-[rgb(var(--c-primary))] font-heading font-bold">
                {progress.classesPercent}% attended
              </div>
            </div>

            {/* 4. Duration Weighted */}
            <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-1">
              <div className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))]">
                Time Planned vs Done
              </div>
              <div className="text-lg font-heading font-bold text-[rgb(var(--c-text))]">
                {progress.estimatedDurationCompletedMinutes}m <span className="text-xs font-normal text-[rgb(var(--c-muted))]">/ {progress.estimatedDurationPlannedMinutes}m</span>
              </div>
              <div className="text-[10px] text-amber-500 font-heading font-bold">
                {progress.actualFocusMinutes}m focused study
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2.3 — THE MOST IMPORTANT SECTION: UP NEXT / WHAT SHOULD I DO NEXT? */}
      <div className="ticket-border bg-gradient-to-r from-[rgb(var(--c-surface))] to-[rgb(var(--c-surface2))] rounded-3xl p-6 sm:p-7 shadow-xs border-2 border-[rgb(var(--c-primary))]/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-[rgb(var(--c-border))]/60">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-heading uppercase font-bold tracking-wider text-[rgb(var(--c-primary))]">
              Focus Now • Your Next Move
            </span>
          </div>

          <span className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            Algorithmic priority: Commitments &gt; Overdue &gt; Imminent Exams &gt; High Priorities
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10px] font-heading font-bold px-2.5 py-0.5 rounded-full text-stone-950 uppercase tracking-wider shadow-2xs"
                style={{ backgroundColor: upNext.badgeColor || '#B6E63E' }}
              >
                {upNext.badgeText}
              </span>
              <span className="text-xs text-[rgb(var(--c-muted))] font-heading">
                {upNext.category}
              </span>
              {upNext.scheduledTime && (
                <>
                  <span className="text-[rgb(var(--c-border))]">•</span>
                  <span className="text-xs font-mono font-bold text-[rgb(var(--c-text))]">
                    {upNext.scheduledTime}
                  </span>
                </>
              )}
              {upNext.estimatedDuration && (
                <>
                  <span className="text-[rgb(var(--c-border))]">•</span>
                  <span className="text-xs text-[rgb(var(--c-muted))]">
                    Est. {upNext.estimatedDuration}
                  </span>
                </>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              {upNext.title}
            </h2>

            {upNext.subtitle && (
              <div className="text-xs text-[rgb(var(--c-muted))] font-heading font-semibold">
                {upNext.subtitle}
              </div>
            )}

            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish leading-relaxed">
              💡 <span className="font-medium text-[rgb(var(--c-text))]">{upNext.reason}</span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {/* Quick Start Focus Timer Button */}
            <button
              onClick={() => handleStartFocusFromUpNext(upNext)}
              className="px-4 py-2.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] hover:border-[#B6E63E] text-[rgb(var(--c-text))] font-heading text-xs font-bold transition flex items-center gap-2 shadow-2xs active:scale-95"
              title="Start a 25m Focus Block linked to this priority"
            >
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Start 25m Focus Session</span>
            </button>

            {/* Primary Action Button */}
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
              className="px-5 py-2.5 rounded-2xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>{upNext.actionLabel}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2.4 — SCHEDULE & TIMELINE (Chronological Day Stream) */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2 font-heading text-xs sm:text-sm font-bold uppercase text-[rgb(var(--c-primary))]">
            <Calendar className="w-4 h-4" />
            <span>Today’s Chronological Timeline</span>
          </div>

          <div className="flex items-center gap-2">
            {timeline.hasConflicts && (
              <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[10px] font-heading font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Conflict Detected
              </span>
            )}
            <button
              onClick={() => setCurrentRoute('#/timetable')}
              className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))]"
            >
              Full Timetable →
            </button>
          </div>
        </div>

        {timeline.items.length === 0 ? (
          <div className="p-6 text-center text-xs text-[rgb(var(--c-muted))] font-flourish rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
            No fixed lecture commitments or scheduled times on today's docket. Open window for deep coursework or reading.
          </div>
        ) : (
          <div className="space-y-3">
            {timeline.items.map((item) => {
              const isCurrent = item.status === 'current';
              const isPast = item.status === 'past';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.actionPayload?.type === 'class') setCurrentRoute('#/timetable');
                    else if (item.actionPayload?.type === 'exam') setCurrentRoute('#/exams');
                    else setCurrentRoute('#/tasks');
                  }}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                      : isPast
                      ? 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] opacity-60'
                      : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[rgb(var(--c-primary))]'
                  } ${item.isClash ? 'ring-2 ring-rose-500/40' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-2.5 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: item.color || '#B6E63E' }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[rgb(var(--c-text))]">
                          {item.startTime} – {item.endTime}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-stone-950 font-heading font-bold text-[9px] uppercase">
                            Now In Session
                          </span>
                        )}
                        {item.isClash && (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white font-heading font-bold text-[9px] uppercase">
                            Time Clash
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))] truncate mt-0.5">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[rgb(var(--c-muted))] truncate">
                        {item.subtitle} {item.location ? `• ${item.location}` : ''}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[rgb(var(--c-muted))] shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2.5 — TODAY'S HABITS PASSPORT */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2 font-heading text-xs sm:text-sm font-bold uppercase text-[rgb(var(--c-primary))] flex-wrap">
            <Flame className="w-4 h-4 text-rose-500" />
            <span>Today’s Habit Stamps</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-[10px] flex items-center gap-1">
              <Shield className="w-3 h-3" /> {remainingTokens} / {MAX_WEEKLY_REST_TOKENS} Rest Tokens
            </span>
          </div>
          <button
            onClick={() => setCurrentRoute('#/habits')}
            className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))]"
          >
            Habit Passport →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {habits.slice(0, 4).map((habit) => {
            const isStamped = habitLogs.some((l) => l.habitId === habit.id);
            const habitStreak = calculateHabitStreak(habit.id, allHabitLogs, restDays, todayKey);
            return (
              <button
                key={habit.id}
                onClick={() => handleToggleHabit(habit.id)}
                className={`p-4 rounded-2xl border text-center transition active:scale-95 flex flex-col items-center justify-center gap-2 cursor-pointer ${
                  isStamped
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[rgb(var(--c-primary))]'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                    isStamped ? 'bg-emerald-500 text-white' : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))]'
                  }`}
                >
                  {isStamped ? '✓' : habitStreak.currentStreak}
                </div>
                <div className="text-xs font-heading leading-tight truncate max-w-full">
                  {habit.title}
                </div>
                <div className="text-[10px] text-[rgb(var(--c-muted))]">
                  {isStamped ? 'Stamped (+10 XP)' : `${habitStreak.currentStreak} day streak`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2.6 & 2.7 — ACADEMIC PRIORITIES & CREATIVE FLOW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* Academic Priorities */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-2 font-heading text-xs font-bold uppercase text-[rgb(var(--c-primary))]">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Academic Priorities ({lowEnergy ? '2' : '3'})</span>
            </div>
            <button
              onClick={() => setCurrentRoute('#/tasks')}
              className="text-[11px] font-heading font-semibold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))]"
            >
              All Quests →
            </button>
          </div>

          <div className="space-y-2.5">
            {todayTasks.length === 0 ? (
              <div className="text-center py-8 text-xs text-[rgb(var(--c-muted))] font-flourish">
                No active assignments or quizzes due today! Clear docket.
              </div>
            ) : (
              todayTasks.slice(0, lowEnergy ? 2 : 3).map((task) => {
                const isLaptopOnly = task.contextTag === 'laptop';
                const isDimmed = isDormDay && isLaptopOnly;
                const isDone = task.status === 'done';
                const xpAmount = getQuestXpReward(task);

                return (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-3 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] transition ${
                      isDimmed ? 'opacity-50' : ''
                    }`}
                  >
                    <button
                      onClick={() => handleTaskClick(task)}
                      className="mt-0.5 text-[rgb(var(--c-primary))] shrink-0 hover:scale-110 active:scale-95 transition focus:outline-none"
                      title={isDone ? 'Undo completion (reverses XP)' : 'Confirm completion (+XP)'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="w-5 h-5 hover:text-emerald-600" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs font-semibold leading-tight ${
                          isDone ? 'line-through text-[rgb(var(--c-muted))]' : 'text-[rgb(var(--c-text))]'
                        }`}
                      >
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[rgb(var(--c-muted))] mt-1.5 flex-wrap">
                        <span className="capitalize">{task.effort} effort</span>
                        <span className="font-heading font-bold text-[rgb(var(--c-xp))]">+{xpAmount} XP</span>
                        {isLaptopOnly && <span>• 💻 Laptop</span>}
                        {task.dueTime && <span>• Due {task.dueTime}</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Creative Work & Personal Development */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-2 font-heading text-xs font-bold uppercase text-[rgb(var(--c-primary))]">
              <Music className="w-4 h-4 text-indigo-500" />
              <span>Studio &amp; Personal Development</span>
            </div>
            <button
              onClick={() => setCurrentRoute('#/studio')}
              className="text-[11px] font-heading font-semibold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))]"
            >
              Open Studio →
            </button>
          </div>

          <div className="space-y-2.5">
            {creativeProjects.length > 0 ? (
              creativeProjects.slice(0, 2).map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => setCurrentRoute('#/studio')}
                  className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] cursor-pointer hover:border-indigo-400 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      {proj.title}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-indigo-500">
                      {proj.progressPercent}%
                    </span>
                  </div>
                  <div className="text-[10px] text-[rgb(var(--c-muted))] mt-0.5">
                    Stage: {proj.currentStage} • Studio Project
                  </div>
                </div>
              ))
            ) : readingItems.length > 0 ? (
              readingItems.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  onClick={() => setCurrentRoute('#/library')}
                  className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] cursor-pointer hover:border-emerald-400 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-emerald-500 font-bold">
                      {item.pagesRead} pages read
                    </span>
                  </div>
                  <div className="text-[10px] text-[rgb(var(--c-muted))] mt-0.5">
                    {item.author} • Reading Queue
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-[rgb(var(--c-muted))] font-flourish">
                No active creative projects in pipeline. Open Studio to start a track, design, or writing piece!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2.8 — END-OF-DAY REFLECTION & SHUTDOWN TRIGGER */}
      <div className="ticket-border bg-gradient-to-r from-[rgb(var(--c-surface))] to-[rgb(var(--c-surface2))] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#7A2E4A]/20 text-[#7A2E4A] flex items-center justify-center shrink-0">
            <Moon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-heading font-bold tracking-wider text-[#7A2E4A]">
              Daily Shutdown Routine
            </div>
            <h3 className="text-sm sm:text-base font-heading font-bold text-[rgb(var(--c-text))]">
              {todayReflection ? 'Daily Shutdown Logged ✓' : 'Evening Review & Mental Reset'}
            </h3>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              {todayReflection
                ? `Saved: "${todayReflection.meaningfulAccomplishment}"`
                : 'Review finished items, roll over remaining work, and close the ledger with +25 XP.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsShutdownOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-[#7A2E4A] text-white font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>{todayReflection ? 'Update Shutdown' : 'Begin Daily Shutdown'}</span>
        </button>
      </div>

      {/* SHUTDOWN MODAL FLOW */}
      {isShutdownOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border-2 border-[#7A2E4A] rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2 font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                <Moon className="w-4 h-4 text-[#7A2E4A]" />
                <span>Evening Shutdown &amp; Mindful Closure</span>
              </div>
              <button
                onClick={() => setIsShutdownOpen(false)}
                className="text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Accomplishments review */}
            <div>
              <span className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] uppercase block mb-1.5">
                1. Conquered Today ({completedTodayTasks.length} Tasks Conquered)
              </span>
              {completedTodayTasks.length === 0 ? (
                <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
                  No tasks stamped complete today. A lighter day is totally normal.
                </p>
              ) : (
                <div className="space-y-1">
                  {completedTodayTasks.slice(0, 3).map((t) => (
                    <div key={t.id} className="text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
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
                <span className="text-xs font-heading font-bold text-amber-500 uppercase block mb-1.5">
                  2. Unfinished Priorities ({unfinishedTasks.length} Pending)
                </span>
                <div className="space-y-2">
                  {unfinishedTasks.slice(0, 3).map((t) => (
                    <div key={t.id} className="p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex items-center justify-between text-xs gap-2">
                      <span className="truncate flex-1 font-medium">{t.title}</span>
                      <button
                        onClick={() => handleRescheduleToTomorrow(t.id)}
                        className="text-[10px] px-2 py-1 rounded-md bg-[rgb(var(--c-surface2))] hover:bg-[rgb(var(--c-primary))] hover:text-stone-900 font-heading font-bold transition shrink-0"
                      >
                        Move to Tomorrow →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meaningful Accomplishment Note */}
            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] mb-1">
                3. What was your most meaningful win or lesson today?
              </label>
              <textarea
                value={shutdownWin}
                onChange={(e) => setShutdownWin(e.target.value)}
                placeholder="e.g. Mastered the limits section in Calculus; stayed disciplined during 45m block."
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-1 focus:ring-[#7A2E4A]"
              />
            </div>

            {/* Tomorrow's Anchor Intention */}
            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))] mb-1">
                4. Primary Focus for Tomorrow
              </label>
              <input
                type="text"
                value={shutdownTomorrowFocus}
                onChange={(e) => setShutdownTomorrowFocus(e.target.value)}
                placeholder="e.g. Physics Lab Prep + 2 Pomodoros on Chapter 3"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-1 focus:ring-[#7A2E4A]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
              <button
                type="button"
                onClick={() => setIsShutdownOpen(false)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] text-xs font-heading"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCompleteShutdown}
                className="px-5 py-2.5 rounded-xl bg-[#7A2E4A] text-white font-heading font-bold text-xs hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Shutdown &amp; Award +25 XP</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Completion Confirmation Modal */}
      {taskToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[#7A2E4A] rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#7A2E4A]/15 text-[#7A2E4A] flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-heading font-bold tracking-wider text-[#7A2E4A]">
                  Confirmation of Victory
                </div>
                <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                  Conquer Priority Quest?
                </h3>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-1.5 text-xs">
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                {taskToConfirm.title}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[rgb(var(--c-border))]">
                <span className="text-[11px] font-heading text-[rgb(var(--c-muted))]">
                  Experience to Award:
                </span>
                <span className="font-heading font-bold text-sm text-[rgb(var(--c-xp))]">
                  +{getQuestXpReward(taskToConfirm)} XP
                </span>
              </div>
            </div>

            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Are you sure you completed this quest? Confirming credits the XP receipt to your append-only ledger.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTaskToConfirm(null)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] text-xs font-heading"
              >
                Not yet
              </button>
              <button
                type="button"
                onClick={handleConfirmTaskCompletion}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-heading font-bold text-xs hover:bg-emerald-700 active:scale-95 transition shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm &amp; Award +{getQuestXpReward(taskToConfirm)} XP</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Quest Completion Confirmation Modal */}
      {dailyQuestToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-primary))] rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[rgb(var(--c-primary))]/15 text-[rgb(var(--c-primary))] flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-heading font-bold tracking-wider text-[rgb(var(--c-primary))]">
                  Daily Bonus Quest
                </div>
                <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                  Complete Daily Objective?
                </h3>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-1.5 text-xs">
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                {dailyQuestToConfirm.title}
              </div>
              <div className="text-[11px] text-[rgb(var(--c-muted))]">
                {dailyQuestToConfirm.description}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[rgb(var(--c-border))]">
                <span className="text-[11px] font-heading text-[rgb(var(--c-muted))]">
                  Reward:
                </span>
                <span className="font-heading font-bold text-sm text-[rgb(var(--c-xp))]">
                  +{dailyQuestToConfirm.xpReward} XP ({dailyQuestToConfirm.stat})
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDailyQuestToConfirm(null)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] text-xs font-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDailyQuest}
                className="px-5 py-2.5 rounded-xl bg-[rgb(var(--c-primary))] text-white font-heading font-bold text-xs hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm &amp; Award +{dailyQuestToConfirm.xpReward} XP</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
