import { describe, it, expect } from 'vitest';
import {
  POMODORO_PRESETS,
  getPhaseDurationSeconds,
  getNextPomodoroPhase,
  calculateRemainingSeconds,
  calculateFocusStats,
} from './pomodoroEngine';
import { DEFAULT_POMODORO_SETTINGS, FocusSession, Course } from '../types';

describe('pomodoroEngine', () => {
  it('correctly calculates phase duration in seconds', () => {
    const settings = {
      ...DEFAULT_POMODORO_SETTINGS,
      focusDurationMins: 30,
      focusDurationMinutes: 30,
      shortBreakMins: 7,
      shortBreakMinutes: 7,
      longBreakMins: 20,
      longBreakMinutes: 20,
    };
    expect(getPhaseDurationSeconds('work', settings)).toBe(1800);
    expect(getPhaseDurationSeconds('short_break', settings)).toBe(420);
    expect(getPhaseDurationSeconds('long_break', settings)).toBe(1200);
  });

  it('handles standard transitions through sessions and breaks', () => {
    const settings = {
      ...DEFAULT_POMODORO_SETTINGS,
      sessionsBeforeLongBreak: 4,
      cyclesPerSession: 2,
    };

    // Session 1 work -> Session 1 short break
    const t1 = getNextPomodoroPhase('work', 1, 1, settings);
    expect(t1.nextPhase).toBe('short_break');
    expect(t1.nextSession).toBe(1);
    expect(t1.isCycleCompleted).toBe(false);

    // Session 1 short break -> Session 2 work
    const t2 = getNextPomodoroPhase('short_break', 1, 1, settings);
    expect(t2.nextPhase).toBe('work');
    expect(t2.nextSession).toBe(2);

    // Session 4 work (reaches sessionsBeforeLongBreak) -> long break
    const t3 = getNextPomodoroPhase('work', 4, 1, settings);
    expect(t3.nextPhase).toBe('long_break');
    expect(t3.nextSession).toBe(4);

    // Long break complete -> Cycle 2 Session 1 work
    const t4 = getNextPomodoroPhase('long_break', 4, 1, settings);
    expect(t4.nextPhase).toBe('work');
    expect(t4.nextSession).toBe(1);
    expect(t4.nextCycle).toBe(2);
    expect(t4.isCycleCompleted).toBe(true);
    expect(t4.isAllCyclesCompleted).toBe(false);

    // Cycle 2 Long break complete -> All cycles completed
    const t5 = getNextPomodoroPhase('long_break', 4, 2, settings);
    expect(t5.isAllCyclesCompleted).toBe(true);
  });

  it('calculates remaining seconds accurately using timestamps', () => {
    const now = Date.now();
    const target = now + 120 * 1000; // 120 seconds in future
    const remaining = calculateRemainingSeconds(true, target, 0);
    expect(remaining).toBeGreaterThanOrEqual(119);
    expect(remaining).toBeLessThanOrEqual(121);

    // When paused, uses fallback
    expect(calculateRemainingSeconds(false, null, 45)).toBe(45);
  });

  it('computes daily, weekly, monthly, streak, and course statistics', () => {
    const now = new Date('2026-11-02T14:00:00Z');
    const courses: Course[] = [
      { id: 'c1', code: 'MATH101', name: 'Calculus I', creditHours: 4, credits: 4, color: '#3b82f6', targetGrade: 'A', term: 'Fall', createdAt: '2026-11-01', updatedAt: '2026-11-01' },
      { id: 'c2', code: 'CS102', name: 'Data Structures', creditHours: 4, credits: 4, color: '#10b981', targetGrade: 'A', term: 'Fall', createdAt: '2026-11-01', updatedAt: '2026-11-01' },
    ];

    const sessions: FocusSession[] = [
      {
        id: 's1',
        courseId: 'c1',
        mode: 'pomodoro',
        minutesFocused: 25,
        startedAt: '2026-11-02T10:00:00Z',
        completedAt: '2026-11-02T10:25:00Z',
      },
      {
        id: 's2',
        courseId: 'c1',
        mode: 'pomodoro',
        minutesFocused: 25,
        startedAt: '2026-11-02T11:00:00Z',
        completedAt: '2026-11-02T11:25:00Z',
      },
      {
        id: 's3',
        courseId: 'c2',
        mode: 'pomodoro',
        minutesFocused: 50,
        startedAt: '2026-11-01T14:00:00Z',
        completedAt: '2026-11-01T14:50:00Z',
      },
    ];

    const stats = calculateFocusStats(sessions, courses, now);
    expect(stats.dailyMinutes).toBe(50);
    expect(stats.weeklyMinutes).toBe(100);
    expect(stats.monthlyMinutes).toBe(100);
    expect(stats.totalCompletedSessions).toBe(3);
    expect(stats.averageSessionMinutes).toBe(33); // 100 / 3
    expect(stats.currentStreakDays).toBe(2); // Nov 2 and Nov 1
    expect(stats.courseBreakdown[0].courseCode).toBe('MATH101');
    expect(stats.courseBreakdown[0].minutes).toBe(50);
  });

  it('supports custom settings with independent minutes and seconds', () => {
    const customSettings: typeof DEFAULT_POMODORO_SETTINGS = {
      ...DEFAULT_POMODORO_SETTINGS,
      preset: 'custom',
      customWorkMinutes: 25,
      customWorkSeconds: 30,
      customShortBreakMinutes: 5,
      customShortBreakSeconds: 15,
      customLongBreakMinutes: 1,
      customLongBreakSeconds: 45,
    };

    expect(getPhaseDurationSeconds('work', customSettings)).toBe(25 * 60 + 30); // 1530s
    expect(getPhaseDurationSeconds('short_break', customSettings)).toBe(5 * 60 + 15); // 315s
    expect(getPhaseDurationSeconds('long_break', customSettings)).toBe(1 * 60 + 45); // 105s

    // Edge case: 30 seconds only
    const shortCustom: typeof DEFAULT_POMODORO_SETTINGS = {
      ...DEFAULT_POMODORO_SETTINGS,
      preset: 'custom',
      customWorkMinutes: 0,
      customWorkSeconds: 30,
    };
    expect(getPhaseDurationSeconds('work', shortCustom)).toBe(30);

    // Edge case: 1 hour 15 minutes
    const longCustom: typeof DEFAULT_POMODORO_SETTINGS = {
      ...DEFAULT_POMODORO_SETTINGS,
      preset: 'custom',
      customWorkMinutes: 75,
      customWorkSeconds: 0,
    };
    expect(getPhaseDurationSeconds('work', longCustom)).toBe(4500);
  });

  it('correctly credits early finished sessions with actual work time and ignores 0-min sessions', () => {
    const now = new Date('2026-11-02T14:00:00Z');
    const courses: Course[] = [
      { id: 'c1', code: 'MATH101', name: 'Calculus I', creditHours: 4, credits: 4, color: '#3b82f6', targetGrade: 'A', term: 'Fall', createdAt: '2026-11-01', updatedAt: '2026-11-01' },
    ];

    const sessions: FocusSession[] = [
      // 25m planned, finished early after 20 minutes
      {
        id: 's_early_1',
        courseId: 'c1',
        mode: 'custom',
        minutesFocused: 20,
        plannedMinutes: 25,
        actualMinutes: 20,
        plannedDurationSeconds: 1500,
        actualDurationSeconds: 1200,
        completionMethod: 'manual_finish',
        startedAt: '2026-11-02T10:00:00Z',
        completedAt: '2026-11-02T10:20:00Z',
      },
      // 50m planned, finished early after 37 minutes
      {
        id: 's_early_2',
        courseId: 'c1',
        mode: 'custom',
        minutesFocused: 37,
        plannedMinutes: 50,
        actualMinutes: 37,
        plannedDurationSeconds: 3000,
        actualDurationSeconds: 2220,
        completionMethod: 'manual_finish',
        startedAt: '2026-11-02T11:00:00Z',
        completedAt: '2026-11-02T11:37:00Z',
      },
      // Abandoned / 0 duration session -> should NOT be counted
      {
        id: 's_abandoned',
        courseId: 'c1',
        mode: 'custom',
        minutesFocused: 0,
        plannedMinutes: 25,
        actualMinutes: 0,
        plannedDurationSeconds: 1500,
        actualDurationSeconds: 0,
        completionMethod: 'manual_finish',
        startedAt: '2026-11-02T12:00:00Z',
        completedAt: '2026-11-02T12:00:00Z',
      },
    ];

    const stats = calculateFocusStats(sessions, courses, now);
    expect(stats.dailyMinutes).toBe(57); // 20 + 37
    expect(stats.totalCompletedSessions).toBe(2); // Abandoned session omitted
    expect(stats.averageSessionMinutes).toBe(29); // 57 / 2 = 28.5 -> 29
  });
});
