import { describe, it, expect } from 'vitest';
import {
  getDateRangeBounds,
  computeComparison,
  calculateComprehensiveStats,
} from './statisticsEngine';
import { Task, Habit, HabitLog, Course, FocusSession, Exam } from '../types';

describe('statisticsEngine', () => {
  it('correctly calculates week and month bounds', () => {
    const refDate = '2026-10-18'; // Sunday
    const weekBounds = getDateRangeBounds('week', refDate);

    expect(weekBounds.startDate).toBe('2026-10-12'); // Monday
    expect(weekBounds.endDate).toBe('2026-10-18'); // Sunday
    expect(weekBounds.prevStartDate).toBe('2026-10-05');
    expect(weekBounds.prevEndDate).toBe('2026-10-11');

    const monthBounds = getDateRangeBounds('month', refDate);
    expect(monthBounds.startDate).toBe('2026-10-01');
    expect(monthBounds.endDate).toBe('2026-10-31');
    expect(monthBounds.prevStartDate).toBe('2026-09-01');
    expect(monthBounds.prevEndDate).toBe('2026-09-30');
  });

  it('safely calculates metric comparisons without division by zero', () => {
    // Zero previous
    const compZeroPrev = computeComparison(5, 0, true);
    expect(compZeroPrev.delta).toBe(5);
    expect(compZeroPrev.percentChange).toBeNull();
    expect(compZeroPrev.formattedChange).toBe('+5 new');
    expect(compZeroPrev.isImprovement).toBe(true);

    // Standard increase
    const compInc = computeComparison(15, 10, true);
    expect(compInc.delta).toBe(5);
    expect(compInc.percentChange).toBe(50);
    expect(compInc.formattedChange).toBe('+50%');
    expect(compInc.isImprovement).toBe(true);

    // Lower is better (e.g. overdue tasks)
    const compOverdue = computeComparison(2, 5, false);
    expect(compOverdue.delta).toBe(-3);
    expect(compOverdue.isImprovement).toBe(true); // Decreased overdue is good
  });

  it('generates comprehensive period stats, insights, and Spotify Wrapped story cards', () => {
    const todayKey = '2026-10-18';

    const course: Course = {
      id: 'c1',
      code: 'MATH101',
      name: 'Calculus I',
      color: '#B6E63E',
      term: 'Term 1',
      createdAt: '',
      updatedAt: '',
    };

    const tasks: Task[] = [
      {
        id: 't1',
        title: 'Problem Set 1',
        effort: 'medium',
        dueDate: '2026-10-15',
        status: 'done',
        priority: 'high',
        contextTag: 'laptop',
        createdAt: '2026-10-14',
        updatedAt: '2026-10-15',
      },
      {
        id: 't2',
        title: 'Lab Report',
        effort: 'large',
        dueDate: '2026-10-16',
        status: 'done',
        priority: 'medium',
        contextTag: 'laptop',
        createdAt: '2026-10-14',
        updatedAt: '2026-10-16',
      },
      {
        id: 't3',
        title: 'Reading Reflection',
        effort: 'small',
        dueDate: '2026-10-17',
        status: 'todo',
        priority: 'low',
        contextTag: 'phone',
        createdAt: '2026-10-14',
        updatedAt: '2026-10-14',
      },
    ];

    const habits: Habit[] = [
      {
        id: 'h1',
        title: 'Morning Flow',
        category: 'wellness',
        type: 'daily',
        targetCount: 1,
        color: '#8EC5E8',
        currentStreak: 4,
        bestStreak: 7,
        icon: 'Flame',
        graceDaysLeft: 2,
      },
    ];

    const habitLogs: HabitLog[] = [
      { id: 'hl1', habitId: 'h1', date: '2026-10-15', count: 1, isPartial: false },
      { id: 'hl2', habitId: 'h1', date: '2026-10-16', count: 1, isPartial: false },
      { id: 'hl3', habitId: 'h1', date: '2026-10-17', count: 1, isPartial: false },
      { id: 'hl4', habitId: 'h1', date: '2026-10-18', count: 1, isPartial: false },
    ];

    const focusSessions: FocusSession[] = [
      {
        id: 'f1',
        courseId: 'c1',
        minutesFocused: 45,
        mode: '45/10',
        startedAt: '2026-10-15T10:00:00',
        completedAt: '2026-10-15T10:45:00',
      },
      {
        id: 'f2',
        courseId: 'c1',
        minutesFocused: 25,
        mode: '25/5',
        startedAt: '2026-10-16T14:00:00',
        completedAt: '2026-10-16T14:25:00',
      },
    ];

    const stats = calculateComprehensiveStats({
      rangeType: 'week',
      referenceDateKey: todayKey,
      tasks,
      habits,
      habitLogs,
      restDays: [],
      attendanceRecords: [],
      focusSessions,
      exams: [],
      gradeComponents: [],
      courses: [course],
    });

    expect(stats.tasksCompleted).toBe(2);
    expect(stats.tasksPlanned).toBe(3);
    expect(stats.taskCompletionRate).toBe(67);
    expect(stats.trackedFocusMinutes).toBe(70);
    expect(stats.focusSessionCount).toBe(2);
    expect(stats.focusByCourse[0].code).toBe('MATH101');
    expect(stats.focusByCourse[0].minutes).toBe(70);

    // Heatmap should have days
    expect(stats.heatmap.length).toBeGreaterThan(0);

    // Insights should be generated
    expect(stats.insights.length).toBeGreaterThan(0);

    // Spotify Wrapped cards should be generated
    expect(stats.wrappedCards.length).toBeGreaterThanOrEqual(4);
    expect(stats.wrappedCards[0].id).toBe('wrapped-overview');
  });
});
