import { describe, it, expect } from 'vitest';
import {
  calculateHabitStreak,
  getRemainingRestTokens,
  calculateCourseAttendance,
  getHabitComebackState,
  isHabitScheduledForDate,
  getHabitDayState,
  calculateHabitDetailStats,
  getDailyHabitsSummary,
  isHabitLogCompleted,
} from './streakEngine';
import { Habit, HabitLog, RestDay, AttendanceRecord } from '../types';

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

  it('detects gentle back-on-track comeback state after a break without shaming language', () => {
    const habitId = 'h1';
    const logsAfterBreak: HabitLog[] = [
      { id: 'l1', habitId, date: '2026-10-10', count: 1, isPartial: false },
      // 3-day break on Oct 11, 12, 13
      { id: 'l2', habitId, date: '2026-10-14', count: 1, isPartial: true },
    ];
    const comeback = getHabitComebackState(habitId, logsAfterBreak, [], '2026-10-14');
    expect(comeback.state).toBe('back_on_track');
    expect(comeback.hadRecentBreak).toBe(true);
    expect(comeback.message?.toLowerCase()).toContain('back on track');

    // Before logging today after a break -> gentle restart prompt
    const restart = getHabitComebackState(
      habitId,
      [{ id: 'l1', habitId, date: '2026-10-10', count: 1, isPartial: false }],
      [],
      '2026-10-14'
    );
    expect(restart.state).toBe('gentle_restart');
    expect(restart.message?.toLowerCase()).toContain('minimum version');
  });

  it('respects weekday and interval schedules so unscheduled days never break streaks', () => {
    // 2026-10-12 is Monday (0), 2026-10-14 is Wednesday (2), 2026-10-16 is Friday (4)
    const mwfHabit: Habit = {
      id: 'h-mwf',
      title: 'Gym',
      category: 'health',
      type: 'daily',
      targetCount: 1,
      color: '#B6E63E',
      currentStreak: 0,
      bestStreak: 0,
      icon: 'Activity',
      graceDaysLeft: 2,
      recurrence: 'weekdays',
      scheduledDays: [0, 2, 4],
    };

    expect(isHabitScheduledForDate(mwfHabit, '2026-10-12')).toBe(true); // Mon
    expect(isHabitScheduledForDate(mwfHabit, '2026-10-13')).toBe(false); // Tue

    const mwfLogs: HabitLog[] = [
      { id: 'l1', habitId: 'h-mwf', date: '2026-10-12', count: 1, isPartial: false, status: 'completed' },
      { id: 'l2', habitId: 'h-mwf', date: '2026-10-14', count: 1, isPartial: false, status: 'completed' },
      { id: 'l3', habitId: 'h-mwf', date: '2026-10-16', count: 1, isPartial: false, status: 'completed' },
    ];

    const streak = calculateHabitStreak('h-mwf', mwfLogs, [], '2026-10-16', mwfHabit);
    expect(streak.currentStreak).toBe(3);
    expect(streak.bestStreak).toBe(3);

    // Interval habit: every 2 days starting 2026-10-10
    const intervalHabit: Habit = {
      ...mwfHabit,
      id: 'h-int',
      recurrence: 'interval',
      intervalDays: 2,
      scheduleStartDate: '2026-10-10',
    };
    expect(isHabitScheduledForDate(intervalHabit, '2026-10-10')).toBe(true);
    expect(isHabitScheduledForDate(intervalHabit, '2026-10-11')).toBe(false);
    expect(isHabitScheduledForDate(intervalHabit, '2026-10-12')).toBe(true);
  });

  it('treats skipped logs as non-completed and distinguishes partial/completed/skipped/unscheduled states', () => {
    const durationHabit: Habit = {
      id: 'h-read',
      title: 'Deep Reading',
      category: 'study',
      type: 'minutes',
      targetCount: 30,
      trackingMethod: 'duration',
      unit: 'min',
      targetValue: 30,
      color: '#B6E63E',
      currentStreak: 0,
      bestStreak: 0,
      icon: 'Activity',
      graceDaysLeft: 2,
      recurrence: 'daily',
    };

    const logs: HabitLog[] = [
      { id: 'l1', habitId: 'h-read', date: '2026-10-14', count: 1, isPartial: false, value: 35, status: 'completed' },
      { id: 'l2', habitId: 'h-read', date: '2026-10-15', count: 1, isPartial: true, value: 15, status: 'partial' },
      { id: 'l3', habitId: 'h-read', date: '2026-10-16', count: 0, isPartial: false, status: 'skipped' },
    ];

    expect(isHabitLogCompleted(logs[2])).toBe(false);
    expect(getHabitDayState(durationHabit, logs, [], '2026-10-14', '2026-10-16').state).toBe('completed');
    expect(getHabitDayState(durationHabit, logs, [], '2026-10-15', '2026-10-16').state).toBe('partial');
    expect(getHabitDayState(durationHabit, logs, [], '2026-10-16', '2026-10-16').state).toBe('skipped');

    const detail = calculateHabitDetailStats(durationHabit, logs, [], {
      startDate: '2026-10-14',
      endDate: '2026-10-16',
      referenceDateKey: '2026-10-16',
    });
    expect(detail.totalCompletions).toBe(2);
    expect(detail.totalValue).toBe(50);
    expect(detail.averageValue).toBe(25);
    expect(detail.targetHitCount).toBe(1);

    const summary = getDailyHabitsSummary([durationHabit], logs, [], '2026-10-16');
    expect(summary.scheduledTodayCount).toBe(1);
    expect(summary.skippedCount).toBe(1);
    expect(summary.completedCount).toBe(0);
  });
});
