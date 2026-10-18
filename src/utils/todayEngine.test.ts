import { describe, it, expect } from 'vitest';
import {
  calculateDailyProgress,
  getUpNextItem,
  buildTodayTimeline,
  getTaskEstimatedMinutes,
} from './todayEngine';
import { Task, Habit, HabitLog, RestDay, AttendanceRecord, FocusSession, Exam } from '../types';
import { ScheduledClass } from './scheduleEngine';

describe('todayEngine', () => {
  it('correctly maps effort levels to minutes', () => {
    expect(getTaskEstimatedMinutes('small')).toBe(15);
    expect(getTaskEstimatedMinutes('medium')).toBe(45);
    expect(getTaskEstimatedMinutes('large')).toBe(90);
    expect(getTaskEstimatedMinutes('unknown')).toBe(45);
  });

  it('calculates item-based and duration-weighted progress separately', () => {
    const todayKey = '2026-10-18';

    const tasks: Task[] = [
      {
        id: 't1',
        title: 'Small email',
        effort: 'small', // 15m
        status: 'done',
        dueDate: todayKey,
        priority: 'low',
        contextTag: 'phone',
        createdAt: todayKey,
        updatedAt: todayKey,
      },
      {
        id: 't2',
        title: 'Large research paper',
        effort: 'large', // 90m
        status: 'todo',
        dueDate: todayKey,
        priority: 'high',
        contextTag: 'laptop',
        createdAt: todayKey,
        updatedAt: todayKey,
      },
    ];

    const habits: Habit[] = [
      {
        id: 'h1',
        title: 'Morning stretch',
        category: 'health',
        type: 'daily',
        targetCount: 1,
        color: '#fff',
        currentStreak: 2,
        bestStreak: 5,
        icon: 'Activity',
        graceDaysLeft: 2,
      },
    ];

    const habitLogs: HabitLog[] = [
      { id: 'hl1', habitId: 'h1', date: todayKey, count: 1, isPartial: false },
    ];

    const res = calculateDailyProgress({
      tasks,
      habits,
      habitLogs,
      restDays: [],
      scheduledClasses: [],
      attendanceRecords: [],
      focusSessions: [],
      todayKey,
    });

    // 1 of 2 tasks completed = 50%
    expect(res.tasksCompleted).toBe(1);
    expect(res.tasksPlanned).toBe(2);
    expect(res.tasksItemPercent).toBe(50);

    // Habit: 1 of 1 done = 100%
    expect(res.habitsPercent).toBe(100);

    // Duration: 15m done out of 105m planned = ~14%
    expect(res.estimatedDurationCompletedMinutes).toBe(15);
    expect(res.estimatedDurationPlannedMinutes).toBe(105);
    expect(res.durationPercent).toBe(14);
  });

  it('prioritizes imminent classes and overdue tasks in getUpNextItem', () => {
    const todayKey = '2026-10-18';
    const fakeNow = new Date('2026-10-18T09:40:00'); // 9:40 AM

    const upcomingClass: ScheduledClass = {
      date: todayKey,
      session: {
        id: 'sess-1',
        courseId: 'c1',
        dayOfWeek: 6,
        startTime: '10:00',
        endTime: '11:50',
        type: 'lecture',
        room: 'B59-1-008',
        repeat: 'all',
      },
      course: {
        id: 'c1',
        code: 'GEES1005',
        name: 'Geography',
        color: '#9B51E0',
        term: 'Year 1 - Semester I',
        createdAt: '',
        updatedAt: '',
      },
      startTime: '10:00',
      endTime: '11:50',
      type: 'lecture',
      room: 'B59-1-008',
      isMoved: false,
      isCancelled: false,
    };

    const overdueTask: Task = {
      id: 't-overdue',
      title: 'Lab Report 1',
      effort: 'medium',
      dueDate: '2026-10-17', // Yesterday
      priority: 'high',
      status: 'todo',
      contextTag: 'laptop',
      createdAt: '',
      updatedAt: '',
    };

    // Imminent class (starts in 20 mins) should take precedence over overdue task
    const nextItem = getUpNextItem({
      now: fakeNow,
      todayKey,
      scheduledClasses: [upcomingClass],
      tasks: [overdueTask],
      exams: [],
      habits: [],
      habitLogs: [],
      restDays: [],
      attendanceRecords: [],
    });

    expect(nextItem.type).toBe('class_imminent');
    expect(nextItem.title).toContain('GEES1005');

    // If no imminent class, overdue task takes top spot
    const nextItem2 = getUpNextItem({
      now: new Date('2026-10-18T13:00:00'), // afternoon
      todayKey,
      scheduledClasses: [],
      tasks: [overdueTask],
      exams: [],
      habits: [],
      habitLogs: [],
      restDays: [],
      attendanceRecords: [],
    });

    expect(nextItem2.type).toBe('overdue_task');
    expect(nextItem2.title).toBe('Lab Report 1');
  });

  it('detects scheduling conflicts in buildTodayTimeline', () => {
    const scheduledClasses: ScheduledClass[] = [
      {
        date: '2026-10-18',
        session: {
          id: 's1',
          courseId: 'c1',
          dayOfWeek: 0,
          startTime: '10:00',
          endTime: '12:00',
          type: 'lecture',
          repeat: 'all',
        },
        course: { id: 'c1', code: 'MATH1', name: 'Math', color: '#111', term: '', createdAt: '', updatedAt: '' },
        startTime: '10:00',
        endTime: '12:00',
        type: 'lecture',
        isCancelled: false,
        isMoved: false,
      },
      {
        date: '2026-10-18',
        session: {
          id: 's2',
          courseId: 'c2',
          dayOfWeek: 0,
          startTime: '11:30', // Overlaps with 10:00-12:00
          endTime: '13:00',
          type: 'tutorial',
          repeat: 'all',
        },
        course: { id: 'c2', code: 'PHYS1', name: 'Physics', color: '#222', term: '', createdAt: '', updatedAt: '' },
        startTime: '11:30',
        endTime: '13:00',
        type: 'tutorial',
        isCancelled: false,
        isMoved: false,
      },
    ];

    const timeline = buildTodayTimeline({
      currentTime: '09:00',
      scheduledClasses,
      examsToday: [],
      tasksWithTime: [],
    });

    expect(timeline.hasConflicts).toBe(true);
    expect(timeline.items[0].isClash).toBe(true);
    expect(timeline.items[1].isClash).toBe(true);
  });
});
