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
} from '../services/rpgService';
import {
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Zap,
  Calendar,
  ShieldAlert,
  HardDrive,
  RefreshCw,
  Flame,
  Battery,
  Laptop,
  Smartphone,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

export const LobbyPage: React.FC = () => {
  const { setCurrentRoute, showToast } = useUiStore();
  const todayKey = getTodayKey();
  const dayIndex = getDayOfWeekIndex();

  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const sessions = useLiveQuery(() => db.classSessions.toArray()) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const exams = useLiveQuery(() => db.exams.toArray()) || [];
  const habits = useLiveQuery(() => db.habits.toArray()) || [];
  const habitLogs = useLiveQuery(() => db.habitLogs.where('date').equals(todayKey).toArray()) || [];
  const xpEvents = useLiveQuery(() => db.xpEvents.toArray()) || [];
  const quests = useLiveQuery(() => db.quests.where('dayKey').equals(todayKey).toArray()) || [];

  const totalXp = xpEvents.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const heroInfo = calculateLevelFromTotalXp(totalXp);

  const [lowEnergy, setLowEnergy] = useState(false);
  const [isDormDay, setIsDormDay] = useState(true);

  useEffect(() => {
    ensureDailyQuests();
  }, [todayKey]);

  useEffect(() => {
    if (settings) {
      setLowEnergy(settings.isLowEnergy);
      setIsDormDay(settings.isDormDay);
    }
  }, [settings]);

  // Today's classes
  const todaySessions = sessions
    .filter((s) => s.dayOfWeek === dayIndex)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const nowTime = new Date().toTimeString().slice(0, 5);
  const nextSession = todaySessions.find((s) => s.endTime >= nowTime) || todaySessions[0];
  const nextCourse = nextSession ? courses.find((c) => c.id === nextSession.courseId) : null;

  // Today's priorities
  const todayTasks = tasks.filter((t) => t.dueDate === todayKey || t.priority === 'high');
  const topPriorities = todayTasks.slice(0, lowEnergy ? 2 : 3);

  // Next Exam
  const upcomingExams = exams
    .filter((e) => e.examDate >= todayKey && !e.isDefeated)
    .sort((a, b) => a.examDate.localeCompare(b.examDate));
  const nextExam = upcomingExams[0];

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const isNowDone = currentStatus !== 'done';
    const newStatus = isNowDone ? 'done' : 'todo';

    await db.tasks.update(taskId, {
      status: newStatus,
      completedAt: isNowDone ? new Date().toISOString() : undefined,
    });

    if (isNowDone) {
      await awardXp({
        source: 'task',
        sourceId: taskId,
        amount: 25,
        stat: 'discipline',
      });
      showToast('Quest checked off! +25 XP', 'success');
    } else {
      await reverseXp('task', taskId);
      showToast('Task re-opened.', 'info');
    }
  };

  const handleToggleHabit = async (habitId: string) => {
    const existingLog = habitLogs.find((l) => l.habitId === habitId);
    if (existingLog) {
      await db.habitLogs.delete(existingLog.id);
      await reverseXp('habit', habitId + '_' + todayKey);
      showToast('Habit check-in undone.', 'info');
    } else {
      await db.habitLogs.add({
        id: Math.random().toString(),
        habitId,
        date: todayKey,
        count: 1,
        isPartial: false,
      });
      await awardXp({
        source: 'habit',
        sourceId: habitId + '_' + todayKey,
        amount: 10,
        stat: 'vitality',
      });
      showToast('Habit stamped! +10 XP', 'success');
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
    <div className="space-y-4 pb-20 animate-pop">
      {/* Grand Arch Welcome Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-6 text-center relative overflow-hidden">
        {/* Storybook Flourish Corner */}
        <div className="absolute top-2 left-3 text-[10px] uppercase font-heading tracking-widest text-[rgb(var(--c-muted))]">
          Concierge Suite • Addis Ababa
        </div>
        <div className="absolute top-2 right-3 flex items-center gap-1.5">
          <button
            onClick={toggleLowEnergy}
            className={`px-2 py-0.5 rounded-full text-[10px] font-heading font-bold border transition flex items-center gap-1 ${
              lowEnergy
                ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-300'
                : 'border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))]'
            }`}
            title="Toggle Low Energy Day (minimum viable day)"
          >
            <Battery className="w-3 h-3" />
            <span>{lowEnergy ? 'Low Energy' : 'Full Power'}</span>
          </button>
          <button
            onClick={toggleDormDay}
            className="px-2 py-0.5 rounded-full text-[10px] font-heading font-bold border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] transition flex items-center gap-1"
            title="Switch between Dorm Day (phone only) and Home Day (PC available)"
          >
            {isDormDay ? <Smartphone className="w-3 h-3" /> : <Laptop className="w-3 h-3" />}
            <span>{isDormDay ? 'Dorm Day' : 'Home Day'}</span>
          </button>
        </div>

        <div className="mt-3">
          <div className="text-xs font-flourish text-[rgb(var(--c-primary))] font-semibold">
            {getEthiopicDateString()}
          </div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))] tracking-wide mt-1">
            {getTimeGreeting(settings?.userName || 'Scholar')}
          </h2>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-0.5">
            {settings?.universityName || 'Addis Ababa Science & Technology University'} • {settings?.currentTermName}
          </p>
        </div>

        {/* Level XP Bar */}
        <div className="mt-4 max-w-sm mx-auto">
          <div className="flex items-center justify-between text-xs font-heading font-bold mb-1">
            <span className="text-[rgb(var(--c-primary))]">
              Level {heroInfo.level} — {heroInfo.title}
            </span>
            <span className="text-[rgb(var(--c-muted))]">
              {heroInfo.currentLevelXp} / {heroInfo.xpNeededForNext} XP
            </span>
          </div>
          <div className="w-full h-2.5 bg-[rgb(var(--c-surface2))] rounded-full overflow-hidden p-0.5 border border-[rgb(var(--c-border))]">
            <div
              className="h-full bg-[rgb(var(--c-xp))] rounded-full transition-all duration-500"
              style={{ width: `${heroInfo.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Next Class Ticket Stub */}
      {nextSession && nextCourse ? (
        <div
          onClick={() => setCurrentRoute('#/timetable')}
          className="ticket-cutout ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 cursor-pointer hover:border-[rgb(var(--c-primary))] transition group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className="w-3 h-10 rounded-full shrink-0"
                style={{ backgroundColor: nextCourse.color || '#B6E63E' }}
              />
              <div>
                <div className="text-[10px] font-heading font-bold uppercase tracking-wider text-[rgb(var(--c-primary))]">
                  Next Academic Session
                </div>
                <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))] group-hover:text-[rgb(var(--c-primary))] transition truncate">
                  {nextCourse.code} — {nextCourse.name}
                </div>
                <div className="text-xs text-[rgb(var(--c-muted))] flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 font-semibold">
                    <Clock className="w-3 h-3 text-[rgb(var(--c-primary))]" /> {nextSession.startTime} – {nextSession.endTime}
                  </span>
                  <span>•</span>
                  <span>Room: {nextSession.room || 'TBA'}</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[rgb(var(--c-muted))] group-hover:translate-x-1 transition" />
          </div>
        </div>
      ) : (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-3.5 text-center text-xs text-[rgb(var(--c-muted))]">
          ✨ No upcoming lectures for the remainder of today. Time for deep focus or creative flow.
        </div>
      )}

      {/* Main Grid: Priorities & Quests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Top Priorities */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-1.5 font-heading text-xs font-bold uppercase text-[rgb(var(--c-primary))]">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Today’s {lowEnergy ? '2 Essential' : '3'} Priorities</span>
            </div>
            <button
              onClick={() => setCurrentRoute('#/tasks')}
              className="text-[10px] font-heading text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))]"
            >
              All Quests →
            </button>
          </div>

          <div className="space-y-2">
            {topPriorities.length === 0 ? (
              <div className="text-center py-6 text-xs text-[rgb(var(--c-muted))] font-flourish">
                All scheduled priorities conquerable or clear! Quick add a new assignment anytime.
              </div>
            ) : (
              topPriorities.map((task) => {
                const isLaptopOnly = task.contextTag === 'laptop';
                const isDimmed = isDormDay && isLaptopOnly;
                const isDone = task.status === 'done';

                return (
                  <div
                    key={task.id}
                    className={`flex items-start gap-2.5 p-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] transition ${
                      isDimmed ? 'opacity-50' : ''
                    }`}
                  >
                    <button
                      onClick={() => handleToggleTask(task.id, task.status)}
                      className="mt-0.5 text-[rgb(var(--c-primary))] shrink-0 hover:scale-110 active:scale-95 transition"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100" />
                      ) : (
                        <Circle className="w-4 h-4" />
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
                      <div className="flex items-center gap-1.5 text-[10px] text-[rgb(var(--c-muted))] mt-1">
                        <span className="capitalize">{task.effort} effort</span>
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
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-1.5 font-heading text-xs font-bold uppercase text-[rgb(var(--c-primary))]">
              <Sparkles className="w-3.5 h-3.5 text-[rgb(var(--c-xp))]" />
              <span>Daily Quests (Auto-Rewarding)</span>
            </div>
            <button
              onClick={() => ensureDailyQuests()}
              className="text-[10px] font-heading text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] flex items-center gap-0.5"
              title="Reroll quests once daily"
            >
              <RefreshCw className="w-2.5 h-2.5" /> Reroll
            </button>
          </div>

          <div className="space-y-2">
            {quests.map((quest) => (
              <div
                key={quest.id}
                className="flex items-center justify-between p-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))]"
              >
                <div>
                  <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                    {quest.title}
                  </div>
                  <div className="text-[10px] text-[rgb(var(--c-muted))]">
                    {quest.description}
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
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-1.5 font-heading text-xs font-bold uppercase text-[rgb(var(--c-primary))]">
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>Today’s Habit Stamps (Forgiving Streaks)</span>
          </div>
          <button
            onClick={() => setCurrentRoute('#/habits')}
            className="text-[10px] font-heading text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))]"
          >
            Habit Passport →
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {habits.slice(0, 4).map((habit) => {
            const isStamped = habitLogs.some((l) => l.habitId === habit.id);
            return (
              <button
                key={habit.id}
                onClick={() => handleToggleHabit(habit.id)}
                className={`p-3 rounded-2xl border text-center transition active:scale-95 flex flex-col items-center justify-center gap-1 ${
                  isStamped
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-bold shadow-xs'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[rgb(var(--c-primary))]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                    isStamped ? 'bg-emerald-500 text-white' : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))]'
                  }`}
                >
                  {isStamped ? '✓' : habit.currentStreak}
                </div>
                <div className="text-[11px] font-heading leading-tight truncate max-w-full">
                  {habit.title}
                </div>
                <div className="text-[9px] text-[rgb(var(--c-muted))]">
                  {isStamped ? 'Stamped (+10 XP)' : `${habit.currentStreak} day streak`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Countdown Chambers: Next Boss Battle Exam & Monthly Reset */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    </div>
  );
};
