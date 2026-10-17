import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import {
  getTodayKey,
  getDayOfWeekIndex,
  getEthiopicDateString,
  getTimeGreeting,
  formatDisplayDate,
} from '../utils/dateUtils';
import {
  calculateLevelFromTotalXp,
  ensureDailyQuests,
  awardXp,
  reverseXp,
  getQuestXpReward,
  triggerLevelUpConfetti,
} from '../services/rpgService';
import { Task, DailyQuest, Semester } from '../types';
import { getNextClass, NextClassResult } from '../utils/scheduleEngine';
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
} from 'lucide-react';

export const LobbyPage: React.FC = () => {
  const { setCurrentRoute, showToast, setQuickAddOpen } = useUiStore();
  const todayKey = getTodayKey();
  const dayIndex = getDayOfWeekIndex();

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

  const todayExpense = transactions
    .filter((t) => t.type === 'expense' && t.date === todayKey)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalSaved = savingsGoals.reduce((acc, curr) => acc + (curr.currentAmount || 0), 0);

  const totalXp = xpEvents.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const heroInfo = calculateLevelFromTotalXp(totalXp);

  const [lowEnergy, setLowEnergy] = useState(false);
  const [isDormDay, setIsDormDay] = useState(true);

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
    }
  }, [settings]);

  const activeSemester =
    semesters.find(
      (s) =>
        s.id === settings?.activeSemesterId ||
        s.isActive ||
        s.name === settings?.currentTermName
    ) || semesters[0] || null;

  const nextClassInfo: NextClassResult | null = getNextClass(
    new Date(),
    sessions,
    exceptions,
    activeSemester,
    courses
  );

  const remainingTokens = getRemainingRestTokens(restDays, todayKey);

  // Today's priorities
  const todayTasks = tasks.filter((t) => t.dueDate === todayKey || t.priority === 'high');
  const topPriorities = todayTasks.slice(0, lowEnergy ? 2 : 3);

  // Next Exam
  const upcomingExams = exams
    .filter((e) => e.examDate >= todayKey && !e.isDefeated)
    .sort((a, b) => a.examDate.localeCompare(b.examDate));
  const nextExam = upcomingExams[0];

  const handleTaskClick = async (task: Task) => {
    if (task.status === 'done') {
      // Undo completion
      const xpAmount = getQuestXpReward(task);
      await db.tasks.update(task.id, {
        status: 'todo',
        completedAt: undefined,
        updatedAt: new Date().toISOString(),
      });
      await reverseXp('task', task.id);
      showToast(`Quest re-opened. -${xpAmount} XP reversed.`, 'info');
    } else {
      // Require confirmation step before completing and awarding XP
      setTaskToConfirm(task);
    }
  };

  const handleConfirmTaskCompletion = async () => {
    if (!taskToConfirm) return;
    const task = taskToConfirm;
    const now = new Date().toISOString();
    const xpAmount = getQuestXpReward(task);

    await db.tasks.update(task.id, {
      status: 'done',
      completedAt: now,
      updatedAt: now,
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

  return (
    <div className="space-y-6 sm:space-y-8 pb-28 animate-pop">
      {/* Grand Arch Welcome Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-7 text-center relative overflow-hidden shadow-xs">
        {/* Top Controls Row - Cleanly separated so it never overlaps greeting or date */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgb(var(--c-border))]/60">
          <div className="text-xs font-flourish text-[rgb(var(--c-primary))] font-semibold text-left">
            {getEthiopicDateString()}
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
              className={`py-1.5 rounded-full text-xs font-heading font-bold border transition-all flex items-center justify-center gap-1.5 ${
                !isDormDay
                  ? 'min-w-[115px] px-3.5 bg-[#7A2E4A] text-white border-[#7A2E4A] shadow-xs ring-2 ring-[#7A2E4A]/30'
                  : 'min-w-[95px] px-3 bg-[#7A2E4A] text-white border-[#7A2E4A] shadow-xs ring-2 ring-[#7A2E4A]/30'
              }`}
              title="Switch between Dorm Day (phone only) and Home Day / PC Day"
            >
              {isDormDay ? <Smartphone className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
              <span>{isDormDay ? 'Dorm Day' : 'PC Day'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Greeting - Navigates to Levels Page */}
        <div className="mt-4 text-center">
          <button
            onClick={() => setCurrentRoute('#/levels')}
            className="group inline-flex items-center justify-center gap-1.5 hover:opacity-90 transition-all focus:outline-none cursor-pointer"
            title="Open XP & Levels Progression"
          >
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))] tracking-wide group-hover:text-[rgb(var(--c-primary))] transition-colors">
              {getTimeGreeting(settings?.userName || 'Scholar')}
            </h2>
            <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[rgb(var(--c-primary))]" />
          </button>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-0.5">
            {settings?.universityName || 'Addis Ababa Science & Technology University'} • {settings?.currentTermName}
          </p>
        </div>

        {/* Level XP Bar - Interactive Button navigating to Levels Page */}
        <div className="mt-4 max-w-sm mx-auto">
          <button
            onClick={() => setCurrentRoute('#/levels')}
            className="w-full text-left p-3 rounded-2xl bg-[rgb(var(--c-surface2))]/60 border border-[rgb(var(--c-border))] hover:border-[rgb(var(--c-primary))] transition-all group focus:outline-none cursor-pointer shadow-2xs hover:shadow-xs"
            title="Inspect full Levels Progression and Rank System"
          >
            <div className="flex items-center justify-between text-xs font-heading font-bold mb-1.5">
              <span className="text-[rgb(var(--c-primary))] flex items-center gap-1.5 group-hover:underline">
                <Award className="w-3.5 h-3.5" />
                <span>Level {heroInfo.level} — {heroInfo.title}</span>
              </span>
              <span className="text-[rgb(var(--c-muted))] text-[11px]">
                {heroInfo.currentLevelXp} / {heroInfo.xpNeededForNext} XP ({heroInfo.progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-[rgb(var(--c-bg))] rounded-full overflow-hidden p-0.5 border border-[rgb(var(--c-border))]">
              <div
                className="h-full bg-[rgb(var(--c-xp))] rounded-full transition-all duration-500 group-hover:brightness-110"
                style={{ width: `${heroInfo.progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[10px] text-[rgb(var(--c-muted))] font-heading">
              <span>Next: {heroInfo.nextRankTitle}</span>
              <span className="text-[rgb(var(--c-primary))] font-bold flex items-center gap-0.5">
                XP &amp; Levels Page <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Next Class Ticket Stub (Schedule Engine) */}
      {nextClassInfo ? (
        <div
          onClick={() => setCurrentRoute('#/timetable')}
          className="ticket-cutout ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 cursor-pointer hover:border-[rgb(var(--c-primary))] transition group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className="w-3 h-10 rounded-full shrink-0"
                style={{ backgroundColor: nextClassInfo.scheduledClass.course.color || '#B6E63E' }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-[rgb(var(--c-primary))]">
                    {nextClassInfo.status === 'in_progress' ? '● In Progress Now' : 'Next Academic Session'}
                  </span>
                  {nextClassInfo.status === 'upcoming' && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] font-mono font-bold">
                      {nextClassInfo.scheduledClass.date === todayKey
                        ? `Starts in ${nextClassInfo.minutesUntilStart}m`
                        : `${nextClassInfo.scheduledClass.date}`}
                    </span>
                  )}
                </div>
                <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))] group-hover:text-[rgb(var(--c-primary))] transition truncate">
                  {nextClassInfo.scheduledClass.course.code} — {nextClassInfo.scheduledClass.course.name}
                </div>
                <div className="text-xs text-[rgb(var(--c-muted))] flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 font-semibold">
                    <Clock className="w-3 h-3 text-[rgb(var(--c-primary))]" /> {nextClassInfo.scheduledClass.startTime} – {nextClassInfo.scheduledClass.endTime}
                  </span>
                  {(nextClassInfo.scheduledClass.room || nextClassInfo.scheduledClass.building) && (
                    <>
                      <span>•</span>
                      <span>
                        {[nextClassInfo.scheduledClass.building, nextClassInfo.scheduledClass.room].filter(Boolean).join(' • ')}
                      </span>
                    </>
                  )}
                  {nextClassInfo.scheduledClass.instructor && (
                    <>
                      <span>•</span>
                      <span>{nextClassInfo.scheduledClass.instructor}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[rgb(var(--c-muted))] group-hover:translate-x-1 transition shrink-0" />
          </div>
        </div>
      ) : (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-3.5 text-center text-xs text-[rgb(var(--c-muted))] flex items-center justify-between gap-3">
          <span>✨ No classes scheduled in the immediate horizon. Time for deep focus or creative flow.</span>
          <button
            onClick={() => setCurrentRoute('#/timetable')}
            className="text-[11px] font-heading font-bold text-[rgb(var(--c-primary))] hover:underline shrink-0"
          >
            View Timetable →
          </button>
        </div>
      )}

      {/* Main Grid: Priorities & Quests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* Today's Top Priorities */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-2 font-heading text-xs font-bold uppercase text-[rgb(var(--c-primary))]">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Today’s {lowEnergy ? '2 Essential' : '3'} Priorities</span>
            </div>
            <button
              onClick={() => setCurrentRoute('#/tasks')}
              className="text-[11px] font-heading font-semibold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))]"
            >
              All Quests →
            </button>
          </div>

          <div className="space-y-2.5">
            {topPriorities.length === 0 ? (
              <div className="text-center py-8 text-xs text-[rgb(var(--c-muted))] font-flourish">
                All scheduled priorities conquerable or clear! Quick add a new assignment anytime.
              </div>
            ) : (
              topPriorities.map((task) => {
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
                        {isLaptopOnly && <span>• 💻 Needs Laptop</span>}
                        {task.dueTime && <span>• Due {task.dueTime}</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Daily Quests (RPG Rewards) */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-2 font-heading text-xs font-bold uppercase text-[rgb(var(--c-primary))]">
              <Sparkles className="w-4 h-4 text-[rgb(var(--c-xp))]" />
              <span>Daily Quests (RPG Rewards)</span>
            </div>
            <button
              onClick={() => ensureDailyQuests()}
              className="text-[11px] font-heading font-semibold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] flex items-center gap-1"
              title="Reroll quests once daily"
            >
              <RefreshCw className="w-3 h-3" /> Reroll
            </button>
          </div>

          <div className="space-y-2">
            {quests.map((quest) => (
              <div
                key={quest.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button
                    onClick={() => handleDailyQuestClick(quest)}
                    className="shrink-0 text-[rgb(var(--c-primary))] hover:scale-110 active:scale-95 transition"
                    title={quest.isDone ? 'Completed' : 'Complete daily quest'}
                  >
                    {quest.isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                    ) : (
                      <Circle className="w-4 h-4 text-[rgb(var(--c-muted))] hover:text-emerald-600" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-heading font-bold truncate ${quest.isDone ? 'line-through text-[rgb(var(--c-muted))]' : 'text-[rgb(var(--c-text))]'}`}>
                      {quest.title}
                    </div>
                    <div className="text-[10px] text-[rgb(var(--c-muted))] truncate">
                      {quest.description}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] font-heading font-bold text-[rgb(var(--c-xp))] px-2 py-0.5 rounded-full bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] shrink-0">
                  +{quest.xpReward} XP
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Habit Stamps */}
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
                className={`p-4 rounded-2xl border text-center transition active:scale-95 flex flex-col items-center justify-center gap-2 ${
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

      {/* Campus Treasury & Wealth OS Preview Card */}
      <div className="ticket-border bg-gradient-to-r from-[rgb(var(--c-surface))] to-[rgb(var(--c-surface2))] rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E5C04B]/20 text-[#E5C04B] flex items-center justify-center shrink-0 shadow-xs">
              <PiggyBank className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-heading font-bold tracking-widest text-[#E5C04B]">
                Student Treasury
              </div>
              <h3 className="text-base sm:text-lg font-heading font-bold text-[rgb(var(--c-text))]">
                Campus Finance &amp; Savings Vault
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
                Today Spent: <span className="font-bold text-rose-500">{todayExpense.toLocaleString()} ETB</span> • Vault Stash: <span className="font-bold text-emerald-600 dark:text-emerald-400">{totalSaved.toLocaleString()} ETB</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setCurrentRoute('#/finance')}
              className="px-4 py-2.5 rounded-2xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition flex items-center gap-1.5"
            >
              <span>View Spending Charts &amp; Saves</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Countdown Chambers: Next Boss Battle Exam & Monthly Reset */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
        {nextExam && (
          <div
            onClick={() => setCurrentRoute('#/exams')}
            className="ticket-border bg-gradient-to-br from-[rgb(var(--c-surface))] to-[rgb(var(--c-surface2))] rounded-2xl p-4 cursor-pointer hover:border-[rgb(var(--c-primary))] transition group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Upcoming Boss Battle
              </span>
              <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                {formatDisplayDate(nextExam.examDate)}
              </span>
            </div>
            <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))] group-hover:text-[rgb(var(--c-primary))] transition">
              {nextExam.title}
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-[10px] text-[rgb(var(--c-muted))] mb-0.5">
                <span>Boss HP (Syllabus remaining)</span>
                <span>{nextExam.currentHp}%</span>
              </div>
              <div className="w-full h-1.5 bg-rose-200 dark:bg-rose-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 transition-all duration-300"
                  style={{ width: `${nextExam.currentHp}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div
          onClick={() => setCurrentRoute('#/rituals')}
          className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 cursor-pointer hover:border-[rgb(var(--c-primary))] transition group"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-[rgb(var(--c-primary))] flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" /> Monthly Reset Day
            </span>
            <span className="text-xs font-heading font-bold text-[rgb(var(--c-muted))]">
              After Exams
            </span>
          </div>
          <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))] group-hover:text-[rgb(var(--c-primary))] transition">
            Clean slate, backup export, and GPA audit
          </div>
          <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish mt-1">
            Clear inbox, review term targets, and award yourself 150 XP.
          </p>
        </div>
      </div>

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
