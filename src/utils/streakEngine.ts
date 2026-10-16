import { Habit, HabitLog, RestDay, AttendanceRecord } from '../types';
import { parseDayKey, formatDayKey, addDaysToKey, getTodayKey } from './dateUtils';
import { ScheduledClass } from './scheduleEngine';

export const MAX_WEEKLY_REST_TOKENS = 2;

export interface StreakResult {
  currentStreak: number;
  bestStreak: number;
  isCompletedToday: boolean;
  isRestDayToday: boolean;
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
 * Pure function: Computes date-based streak for a habit from logs and rest tokens.
 * - Counts consecutive days ending today (or yesterday if today is not completed yet).
 * - Full logs and partial ("minimum version") logs both count as completed.
 * - Rest tokens bridge missed days without breaking the streak (+0 increment).
 * - Habits are daily trackers in College Life OS.
 */
export function calculateHabitStreak(
  habitId: string,
  logs: HabitLog[] = [],
  restDays: RestDay[] = [],
  referenceDateKey: string = getTodayKey()
): StreakResult {
  const habitLogs = logs.filter((l) => l.habitId === habitId);
  const completedDateSet = new Set<string>();

  for (const log of habitLogs) {
    if (log.count > 0 || log.isPartial) {
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

  // 1. Calculate Current Streak
  let currentStreak = 0;
  let cursorDate: string;

  if (isCompletedToday || isRestDayToday) {
    cursorDate = referenceDateKey;
  } else {
    // If today is not done yet, check if yesterday was done (forgiving until midnight)
    cursorDate = addDaysToKey(referenceDateKey, -1);
  }

  // Walk backwards day-by-day
  // Limit loop up to 1000 days to prevent infinite loop on edge cases
  for (let i = 0; i < 1000; i++) {
    if (completedDateSet.has(cursorDate)) {
      currentStreak += 1;
      cursorDate = addDaysToKey(cursorDate, -1);
    } else if (restDateSet.has(cursorDate)) {
      // Rest token maintains streak without incrementing
      cursorDate = addDaysToKey(cursorDate, -1);
    } else {
      break;
    }
  }

  // 2. Calculate Best Streak across historical records
  // Gather all historical dates
  const allRecordedDates = Array.from(new Set([...completedDateSet, ...restDateSet])).sort();
  let bestStreak = currentStreak;

  if (allRecordedDates.length > 0) {
    let runningStreak = 0;
    const earliestDate = allRecordedDates[0];
    const latestDate = referenceDateKey > allRecordedDates[allRecordedDates.length - 1]
      ? referenceDateKey
      : allRecordedDates[allRecordedDates.length - 1];

    let testDate = earliestDate;
    while (testDate <= latestDate) {
      if (completedDateSet.has(testDate)) {
        runningStreak += 1;
        if (runningStreak > bestStreak) {
          bestStreak = runningStreak;
        }
      } else if (restDateSet.has(testDate)) {
        // Rest token maintains current count
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
 * - Present and Late count as attended.
 * - Cancelled classes are NOT counted.
 * - Future classes are NOT counted.
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
  // Only count records up to reference date for this course
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
    // 'excused' records are not penalized
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
