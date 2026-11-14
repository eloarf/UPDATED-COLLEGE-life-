import {
  Habit,
  HabitLog,
  RestDay,
  AttendanceRecord,
  DayOfWeek,
} from '../types';
import {
  parseDayKey,
  formatDayKey,
  addDaysToKey,
  getTodayKey,
  getDayOfWeekIndex,
} from './dateUtils';

export const MAX_WEEKLY_REST_TOKENS = 2;

export const DEFAULT_HABIT_CATEGORIES: { id: string; label: string }[] = [
  { id: 'health', label: 'Health & Exercise' },
  { id: 'study', label: 'University Study' },
  { id: 'creative', label: 'Creative Flow' },
  { id: 'mindset', label: 'Mindset & Reflection' },
  { id: 'routine', label: 'Routine & Sleep' },
];

export interface StreakResult {
  currentStreak: number;
  bestStreak: number;
  isCompletedToday: boolean;
  isRestDayToday: boolean;
}

export type HabitDayVisualState =
  | 'completed'
  | 'partial'
  | 'rested'
  | 'skipped'
  | 'unscheduled'
  | 'pending'
  | 'missed';

export interface HabitScheduleOptions {
  recurrence?: Habit['recurrence'];
  scheduledDays?: DayOfWeek[];
  weeklyTargetCount?: number;
  intervalDays?: number;
  scheduleStartDate?: string;
  status?: Habit['status'];
}

/**
 * Returns true if the habit log represents an executed completion (full or partial/minimum),
 * explicitly ignoring skipped logs or zero counts.
 */
export function isHabitLogCompleted(log?: HabitLog | null): boolean {
  if (!log) return false;
  if (log.status === 'skipped') return false;
  return log.count > 0 || log.isPartial || log.status === 'completed' || log.status === 'partial';
}

/**
 * Normalizes a Habit's tracking method for backward compatibility with older records.
 */
export function getHabitTrackingMethod(
  habit?: Pick<Habit, 'trackingMethod' | 'type'> | null
): NonNullable<Habit['trackingMethod']> {
  if (!habit) return 'simple';
  if (habit.trackingMethod) return habit.trackingMethod;
  if (habit.type === 'minutes') return 'duration';
  return 'simple';
}

/**
 * Returns default unit label for a habit tracking method.
 */
export function getHabitUnitLabel(habit?: Pick<Habit, 'trackingMethod' | 'type' | 'unit'> | null): string {
  if (!habit) return '';
  if (habit.unit && habit.unit.trim()) return habit.unit.trim();
  const method = getHabitTrackingMethod(habit);
  if (method === 'duration') return 'min';
  if (method === 'frequency') return 'sessions';
  if (method === 'quantity') return 'units';
  return '';
}

/**
 * Returns optional target numeric value for measurable habits (or null when no target is enforced).
 */
export function getHabitTargetValue(
  habit?: Pick<Habit, 'trackingMethod' | 'type' | 'targetValue' | 'targetCount'> | null
): number | null {
  if (!habit) return null;
  const method = getHabitTrackingMethod(habit);
  if (method === 'simple' || method === 'avoidance') return null;
  if (typeof habit.targetValue === 'number' && habit.targetValue > 0) {
    return habit.targetValue;
  }
  if (typeof habit.targetCount === 'number' && habit.targetCount > 0) {
    if (method === 'frequency' || habit.type === 'minutes') {
      return habit.targetCount;
    }
  }
  return null;
}

/**
 * Determines whether a habit is scheduled for a given YYYY-MM-DD date.
 * - Paused or archived habits return false unless evaluated purely by historical logs.
 * - 'daily' and 'weekly_target' habits are available every day.
 * - 'weekdays' habits check getDayOfWeekIndex(dateKey) against scheduledDays (0=Mon..6=Sun).
 * - 'interval' habits repeat every N days from scheduleStartDate.
 */
export function isHabitScheduledForDate(
  habit: HabitScheduleOptions | undefined | null,
  dateKey: string
): boolean {
  if (!habit) return true;
  if (habit.status === 'paused' || habit.status === 'archived') return false;

  const recurrence = habit.recurrence || 'daily';
  if (recurrence === 'daily' || recurrence === 'weekly_target') {
    return true;
  }

  if (recurrence === 'weekdays') {
    const days = habit.scheduledDays;
    if (!days || days.length === 0) return true;
    const dow = getDayOfWeekIndex(dateKey);
    return days.includes(dow);
  }

  if (recurrence === 'interval') {
    const interval = Math.max(1, habit.intervalDays || 2);
    const anchor = habit.scheduleStartDate || dateKey;
    if (dateKey < anchor) return false;
    const d1 = parseDayKey(anchor);
    const d2 = parseDayKey(dateKey);
    const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays % interval === 0;
  }

  return true;
}

/**
 * Computes day-by-day visual & logical state for a habit on a given dateKey.
 */
export function getHabitDayState(
  habit: Habit,
  logs: HabitLog[] = [],
  restDays: RestDay[] = [],
  dateKey: string,
  referenceDateKey: string = getTodayKey()
): {
  state: HabitDayVisualState;
  log?: HabitLog;
  restDay?: RestDay;
} {
  const log = logs.find((l) => l.habitId === habit.id && l.date === dateKey);
  const restDay = restDays.find((r) => r.habitId === habit.id && r.dateKey === dateKey);

  if (log) {
    if (log.status === 'skipped') {
      return { state: 'skipped', log, restDay };
    }
    if (isHabitLogCompleted(log)) {
      const target = getHabitTargetValue(habit);
      const isPartial =
        log.status === 'partial' ||
        log.isPartial ||
        (target !== null && typeof log.value === 'number' && log.value > 0 && log.value < target);
      return { state: isPartial ? 'partial' : 'completed', log, restDay };
    }
  }

  if (restDay) {
    return { state: 'rested', restDay };
  }

  if (!isHabitScheduledForDate(habit, dateKey)) {
    return { state: 'unscheduled' };
  }

  if (dateKey >= referenceDateKey) {
    return { state: 'pending' };
  }

  return { state: 'missed' };
}

/**
 * Returns Monday and Sunday dayKeys for the week (Monday-Sunday) containing the given reference date.
 */
export function getWeekBounds(referenceDateKey: string = getTodayKey()): { mondayKey: string; sundayKey: string } {
  const d = parseDayKey(referenceDateKey);
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1; // 0=Mon, 6=Sun
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day, 12, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return {
    mondayKey: formatDayKey(monday),
    sundayKey: formatDayKey(sunday),
  };
}

/**
 * Returns how many rest tokens the user has remaining for the current week (refills on Monday).
 */
export function getRemainingRestTokens(restDays: RestDay[] = [], referenceDateKey: string = getTodayKey()): number {
  const { mondayKey, sundayKey } = getWeekBounds(referenceDateKey);
  const usedThisWeek = restDays.filter((r) => r.dateKey >= mondayKey && r.dateKey <= sundayKey).length;
  return Math.max(0, MAX_WEEKLY_REST_TOKENS - usedThisWeek);
}

/**
 * Helper to check if a specific dateKey is unscheduled for schedule-aware habits.
 */
function isScheduleRestExempt(habit: HabitScheduleOptions | undefined, dateKey: string): boolean {
  if (!habit) return false;
  if (habit.status === 'paused' || habit.status === 'archived') return false;
  const recurrence = habit.recurrence || 'daily';
  if (recurrence === 'weekdays' || recurrence === 'interval') {
    return !isHabitScheduledForDate(habit, dateKey);
  }
  return false;
}

/**
 * Pure function: Computes date-based streak for a habit from logs, rest tokens, and optional schedule.
 * - Counts consecutive scheduled days ending today (or yesterday if today is not completed yet).
 * - Full logs and partial ("minimum version") logs both count as completed.
 * - Skipped logs (`status === 'skipped'`) do not increment streak.
 * - Rest tokens bridge missed scheduled days without breaking the streak (+0 increment).
 * - When `habit` schedule options are supplied, unscheduled days (for weekdays/interval habits)
 *   never break the streak and do not increment it.
 */
export function calculateHabitStreak(
  habitId: string,
  logs: HabitLog[] = [],
  restDays: RestDay[] = [],
  referenceDateKey: string = getTodayKey(),
  habit?: HabitScheduleOptions
): StreakResult {
  const habitLogs = logs.filter((l) => l.habitId === habitId);
  const completedDateSet = new Set<string>();

  for (const log of habitLogs) {
    if (isHabitLogCompleted(log)) {
      completedDateSet.add(log.date);
    }
  }

  const restDateSet = new Set<string>();
  for (const r of restDays) {
    if (r.habitId === habitId && !completedDateSet.has(r.dateKey)) {
      restDateSet.add(r.dateKey);
    }
  }

  const isCompletedToday = completedDateSet.has(referenceDateKey);
  const isRestDayToday = restDateSet.has(referenceDateKey);

  // Determine earliest historical activity so schedule-exempt walking can stop cleanly
  const allRecordedDates = Array.from(new Set([...completedDateSet, ...restDateSet])).sort();
  const earliestRecorded = allRecordedDates[0];

  // 1. Calculate Current Streak
  let currentStreak = 0;
  let cursorDate: string;

  if (isCompletedToday || isRestDayToday) {
    cursorDate = referenceDateKey;
  } else {
    // Forgiving until midnight: start checking from yesterday
    cursorDate = addDaysToKey(referenceDateKey, -1);
  }

  for (let i = 0; i < 1000; i++) {
    if (completedDateSet.has(cursorDate)) {
      currentStreak += 1;
      cursorDate = addDaysToKey(cursorDate, -1);
    } else if (restDateSet.has(cursorDate)) {
      // Rest token maintains streak without incrementing
      cursorDate = addDaysToKey(cursorDate, -1);
    } else if (isScheduleRestExempt(habit, cursorDate)) {
      // Unscheduled days pass over without breaking streak, stopping once before earliest log
      if (!earliestRecorded || cursorDate < earliestRecorded) {
        break;
      }
      cursorDate = addDaysToKey(cursorDate, -1);
    } else {
      break;
    }
  }

  // 2. Calculate Best Streak across historical records
  let bestStreak = currentStreak;

  if (allRecordedDates.length > 0) {
    let runningStreak = 0;
    const earliestDate = allRecordedDates[0];
    const latestDate =
      referenceDateKey > allRecordedDates[allRecordedDates.length - 1]
        ? referenceDateKey
        : allRecordedDates[allRecordedDates.length - 1];

    let testDate = earliestDate;
    while (testDate <= latestDate) {
      if (completedDateSet.has(testDate)) {
        runningStreak += 1;
        if (runningStreak > bestStreak) {
          bestStreak = runningStreak;
        }
      } else if (restDateSet.has(testDate) || isScheduleRestExempt(habit, testDate)) {
        // Maintains current count without resetting
      } else {
        runningStreak = 0;
      }
      testDate = addDaysToKey(testDate, 1);
    }
  }

  return {
    currentStreak,
    bestStreak,
    isCompletedToday,
    isRestDayToday,
  };
}

/**
 * Pure function: Computes course attendance metrics.
 */
export function calculateCourseAttendance(
  courseId: string,
  attendanceRecords: AttendanceRecord[] = [],
  thresholdPercent: number = 80,
  referenceDateKey: string = getTodayKey()
): {
  attendedCount: number;
  absentCount: number;
  totalRecorded: number;
  percentage: number;
  isBelowThreshold: boolean;
} {
  const courseRecords = attendanceRecords.filter(
    (r) => r.courseId === courseId && r.date <= referenceDateKey
  );

  let attendedCount = 0;
  let absentCount = 0;

  for (const r of courseRecords) {
    if (r.status === 'present' || r.status === 'late') {
      attendedCount += 1;
    } else if (r.status === 'absent') {
      absentCount += 1;
    }
  }

  const totalRecorded = attendedCount + absentCount;
  const percentage = totalRecorded > 0 ? Math.round((attendedCount / totalRecorded) * 100) : 100;
  const isBelowThreshold = totalRecorded > 0 && percentage < thresholdPercent;

  return {
    attendedCount,
    absentCount,
    totalRecorded,
    percentage,
    isBelowThreshold,
  };
}

export interface HabitComebackState {
  state: 'steady' | 'back_on_track' | 'gentle_restart';
  hadRecentBreak: boolean;
  message?: string;
}

/**
 * Pure function: Detects whether a user recently returned after a break or has room
 * for a gentle minimum-version restart — never using shaming language.
 */
export function getHabitComebackState(
  habitId: string,
  logs: HabitLog[] = [],
  restDays: RestDay[] = [],
  referenceDateKey: string = getTodayKey(),
  habit?: HabitScheduleOptions
): HabitComebackState {
  const streak = calculateHabitStreak(habitId, logs, restDays, referenceDateKey, habit);
  const completedDates = logs
    .filter((l) => l.habitId === habitId && isHabitLogCompleted(l) && l.date <= referenceDateKey)
    .map((l) => l.date)
    .sort();

  if (completedDates.length === 0) {
    return { state: 'steady', hadRecentBreak: false };
  }

  const completedSet = new Set(completedDates);
  const restSet = new Set(
    restDays.filter((r) => r.habitId === habitId).map((r) => r.dateKey)
  );

  if (streak.currentStreak >= 1 && streak.currentStreak <= 3) {
    const startOfStreak = addDaysToKey(
      streak.isCompletedToday || streak.isRestDayToday
        ? referenceDateKey
        : addDaysToKey(referenceDateKey, -1),
      -(streak.currentStreak - 1)
    );
    const dayBeforeStreak = addDaysToKey(startOfStreak, -1);
    const twoDaysBefore = addDaysToKey(startOfStreak, -2);
    const hadEarlierActivity = completedDates.some((d) => d < twoDaysBefore);
    const hadBreak =
      hadEarlierActivity &&
      !completedSet.has(dayBeforeStreak) &&
      !restSet.has(dayBeforeStreak) &&
      !isScheduleRestExempt(habit, dayBeforeStreak) &&
      !completedSet.has(twoDaysBefore) &&
      !restSet.has(twoDaysBefore) &&
      !isScheduleRestExempt(habit, twoDaysBefore);

    if (hadBreak) {
      return {
        state: 'back_on_track',
        hadRecentBreak: true,
        message: 'Back on track — one steady day at a time.',
      };
    }
  }

  if (streak.currentStreak === 0 && !streak.isCompletedToday && !streak.isRestDayToday) {
    const yesterday = addDaysToKey(referenceDateKey, -1);
    if (completedDates.some((d) => d < yesterday)) {
      return {
        state: 'gentle_restart',
        hadRecentBreak: true,
        message: 'Ready when you are — even the 2-minute minimum version counts.',
      };
    }
  }

  return { state: 'steady', hadRecentBreak: false };
}

export interface HabitDetailStats {
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  scheduledDaysEvaluated: number;
  completionPercentage: number;
  weeklyConsistency: number;
  monthlyConsistency: number;
  totalValue: number;
  averageValue: number | null;
  targetHitCount: number;
  recentLogs: HabitLog[];
}

/**
 * Pure function: Computes comprehensive detail statistics and date-range metrics for a single habit.
 */
export function calculateHabitDetailStats(
  habit: Habit,
  logs: HabitLog[] = [],
  restDays: RestDay[] = [],
  options: {
    startDate?: string;
    endDate?: string;
    referenceDateKey?: string;
  } = {}
): HabitDetailStats {
  const referenceDateKey = options.referenceDateKey || getTodayKey();
  const endDate = options.endDate || referenceDateKey;
  const startDate = options.startDate || addDaysToKey(endDate, -29);

  const streak = calculateHabitStreak(habit.id, logs, restDays, referenceDateKey, habit);
  const allHabitLogs = logs.filter((l) => l.habitId === habit.id);

  const completedInAllTime = allHabitLogs.filter((l) => isHabitLogCompleted(l));
  const totalCompletions = completedInAllTime.length;

  const calculateWindowRate = (winStart: string, winEnd: string): {
    completed: number;
    scheduled: number;
    percent: number;
  } => {
    let scheduled = 0;
    let completed = 0;
    const logByDate = new Map<string, HabitLog>();
    allHabitLogs.forEach((l) => logByDate.set(l.date, l));
    const restSet = new Set(restDays.filter((r) => r.habitId === habit.id).map((r) => r.dateKey));

    let cur = winStart;
    let safety = 0;
    while (cur <= winEnd && safety < 2000) {
      safety++;
      const log = logByDate.get(cur);
      const isDone = isHabitLogCompleted(log);
      const isRest = restSet.has(cur);
      const isSched = isHabitScheduledForDate({ ...habit, status: 'active' }, cur);

      if (isDone) {
        completed++;
        scheduled++;
      } else if (isSched && !isRest) {
        scheduled++;
      }
      cur = addDaysToKey(cur, 1);
    }

    const percent = scheduled > 0 ? Math.min(100, Math.round((completed / scheduled) * 100)) : 0;
    return { completed, scheduled, percent };
  };

  const rangeRate = calculateWindowRate(startDate, endDate);
  const weekRate = calculateWindowRate(addDaysToKey(referenceDateKey, -6), referenceDateKey);
  const monthRate = calculateWindowRate(addDaysToKey(referenceDateKey, -29), referenceDateKey);

  // Measurable values & target progress within selected range
  const rangeCompletedLogs = allHabitLogs.filter(
    (l) => l.date >= startDate && l.date <= endDate && isHabitLogCompleted(l)
  );
  const target = getHabitTargetValue(habit);

  let totalValue = 0;
  let valueLogCount = 0;
  let targetHitCount = 0;

  for (const l of rangeCompletedLogs) {
    const val = typeof l.value === 'number' ? l.value : l.count;
    if (typeof val === 'number' && val > 0) {
      totalValue += val;
      valueLogCount++;
      if (target !== null && val >= target) {
        targetHitCount++;
      }
    }
  }

  const recentLogs = allHabitLogs
    .filter((l) => l.date >= startDate && l.date <= endDate)
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    currentStreak: streak.currentStreak,
    bestStreak: streak.bestStreak,
    totalCompletions,
    scheduledDaysEvaluated: rangeRate.scheduled,
    completionPercentage: rangeRate.percent,
    weeklyConsistency: weekRate.percent,
    monthlyConsistency: monthRate.percent,
    totalValue,
    averageValue: valueLogCount > 0 ? Math.round((totalValue / valueLogCount) * 10) / 10 : null,
    targetHitCount,
    recentLogs,
  };
}

export interface DailyHabitsSummary {
  activeTotal: number;
  scheduledTodayCount: number;
  completedCount: number;
  partialCount: number;
  skippedCount: number;
  restedCount: number;
  pendingCount: number;
}

/**
 * Pure helper: Summarizes today's scheduled habit completion counts for HabitsPage and Journal Check-in.
 */
export function getDailyHabitsSummary(
  habits: Habit[] = [],
  logs: HabitLog[] = [],
  restDays: RestDay[] = [],
  todayKey: string = getTodayKey()
): DailyHabitsSummary {
  const activeHabits = habits.filter((h) => h.status !== 'paused' && h.status !== 'archived');
  let scheduledTodayCount = 0;
  let completedCount = 0;
  let partialCount = 0;
  let skippedCount = 0;
  let restedCount = 0;
  let pendingCount = 0;

  for (const habit of activeHabits) {
    const dayState = getHabitDayState(habit, logs, restDays, todayKey, todayKey);
    if (dayState.state === 'unscheduled') continue;
    scheduledTodayCount++;
    if (dayState.state === 'completed') completedCount++;
    else if (dayState.state === 'partial') partialCount++;
    else if (dayState.state === 'skipped') skippedCount++;
    else if (dayState.state === 'rested') restedCount++;
    else pendingCount++;
  }

  return {
    activeTotal: activeHabits.length,
    scheduledTodayCount,
    completedCount,
    partialCount,
    skippedCount,
    restedCount,
    pendingCount,
  };
}
