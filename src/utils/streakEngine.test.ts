import { describe, it, expect } from 'vitest';
import {
  calculateHabitStreak,
  getRemainingRestTokens,
  calculateCourseAttendance,
  MAX_WEEKLY_REST_TOKENS,
} from './streakEngine';
import { HabitLog, RestDay, AttendanceRecord } from '../types';

describe('streakEngine', () => {
  it('manages 2 weekly rest tokens per week refilling on Mondays', () => {
    // Current week Monday 2026-10-12 to Sunday 2026-10-18
    const restDays: RestDay[] = [
      { id: 'r1', habitId: 'h1', dateKey: '2026-10-13', createdAt: '' }, // Tuesday
    ];

    expect(getRemainingRestTokens(restDays, '2026-10-14')).toBe(1);

    // Another token used on Thursday
    const restDays2: RestDay[] = [
      ...restDays,
      { id: 'r2', habitId: 'h1', dateKey: '2026-10-15', createdAt: '' },
    ];
    expect(getRemainingRestTokens(restDays2, '2026-10-16')).toBe(0);

    // Next week Monday 2026-10-19 -> refills to 2
    expect(getRemainingRestTokens(restDays2, '2026-10-19')).toBe(2);
  });

  it('calculates consecutive habit streaks and handles missed days without token', () => {
    const habitId = 'h1';
    // 3 days in a row: 2026-10-14, 2026-10-15, 2026-10-16
    const logs: HabitLog[] = [
      { id: 'l1', habitId, date: '2026-10-14', count: 1, isPartial: false },
      { id: 'l2', habitId, date: '2026-10-15', count: 1, isPartial: false },
      { id: 'l3', habitId, date: '2026-10-16', count: 1, isPartial: false },
    ];

    const result = calculateHabitStreak(habitId, logs, [], '2026-10-16');
    expect(result.currentStreak).toBe(3);
    expect(result.bestStreak).toBe(3);
    expect(result.isCompletedToday).toBe(true);

    // Missed day: on 2026-10-18 without log or token on 2026-10-17
    const brokenStreak = calculateHabitStreak(habitId, logs, [], '2026-10-18');
    expect(brokenStreak.currentStreak).toBe(0);
    expect(brokenStreak.bestStreak).toBe(3);
  });

  it('bridges missed days with rest token without breaking streak', () => {
    const habitId = 'h1';
    // Completed day 1 (2026-10-14), missed day 2 (2026-10-15) covered with token, completed day 3 (2026-10-16)
    const logs: HabitLog[] = [
      { id: 'l1', habitId, date: '2026-10-14', count: 1, isPartial: false },
      { id: 'l3', habitId, date: '2026-10-16', count: 1, isPartial: false },
    ];
    const restDays: RestDay[] = [
      { id: 'r1', habitId, dateKey: '2026-10-15', createdAt: '' },
    ];

    const result = calculateHabitStreak(habitId, logs, restDays, '2026-10-16');
    // Streak is maintained: 2 completed days connected by rest token
    expect(result.currentStreak).toBe(2);
    expect(result.bestStreak).toBe(2);
  });

  it('recalculates streak when a log is undone', () => {
    const habitId = 'h1';
    const logs: HabitLog[] = [
      { id: 'l1', habitId, date: '2026-10-15', count: 1, isPartial: false },
      { id: 'l2', habitId, date: '2026-10-16', count: 1, isPartial: false },
    ];
    const streakBefore = calculateHabitStreak(habitId, logs, [], '2026-10-16');
    expect(streakBefore.currentStreak).toBe(2);

    // Undo stamp for 2026-10-16
    const logsAfterUndo = [logs[0]];
    const streakAfter = calculateHabitStreak(habitId, logsAfterUndo, [], '2026-10-16');
    // Today not completed, yesterday completed -> current streak is 1
    expect(streakAfter.currentStreak).toBe(1);
    expect(streakAfter.isCompletedToday).toBe(false);
  });

  it('calculates course attendance and flags below threshold', () => {
    const courseId = 'course-psyc1011';
    const records: AttendanceRecord[] = [
      { id: 'a1', courseId, date: '2026-10-05', status: 'present' },
      { id: 'a2', courseId, date: '2026-10-12', status: 'present' },
      { id: 'a3', courseId, date: '2026-10-19', status: 'late' }, // Late counts as attended
      { id: 'a4', courseId, date: '2026-10-26', status: 'absent' },
    ];

    const stats = calculateCourseAttendance(courseId, records, 80, '2026-10-26');
    expect(stats.totalRecorded).toBe(4);
    expect(stats.attendedCount).toBe(3);
    expect(stats.absentCount).toBe(1);
    expect(stats.percentage).toBe(75);
    expect(stats.isBelowThreshold).toBe(true); // 75% < 80%
  });
});
