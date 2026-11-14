import { describe, it, expect } from 'vitest';
import {
  calculateDailyProgress,
  getUpNextItem,
  getDoThisNext,
  getNextTimelineItems,
  getDailyInsightSentence,
  buildTodayTimeline,
  getTaskEstimatedMinutes,
} from './todayEngine';
import { buildDayTimeline } from './timelineEngine';
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

  describe('getDoThisNext chooser (Lobby Focus)', () => {
    const todayKey = '2026-10-18';
    const baseCourse = {
      id: 'c1',
      code: 'CS101',
      name: 'Algorithms',
      color: '#B6E63E',
      term: 'Term 1',
      createdAt: '',
      updatedAt: '',
    };

    const makeClass = (id: string, startTime: string, endTime: string, opts?: { isCancelled?: boolean; isPostponed?: boolean }): ScheduledClass => ({
      date: todayKey,
      session: {
        id,
        courseId: 'c1',
        dayOfWeek: 6,
        startTime,
        endTime,
        type: 'lecture',
        room: 'Hall A',
        repeat: 'all',
      },
      course: baseCourse,
      startTime,
      endTime,
      type: 'lecture',
      room: 'Hall A',
      isCancelled: opts?.isCancelled ?? false,
      isPostponed: opts?.isPostponed ?? false,
      isMoved: false,
    });

    const makeTask = (id: string, title: string, overrides?: Partial<Task>): Task => ({
      id,
      title,
      effort: 'medium',
      priority: 'medium',
      status: 'todo',
      contextTag: 'laptop',
      createdAt: todayKey,
      updatedAt: todayKey,
      ...overrides,
    });

    const makeHabit = (id: string, title: string): Habit => ({
      id,
      title,
      category: 'study',
      type: 'daily',
      targetCount: 1,
      color: '#8EC5E8',
      currentStreak: 0,
      bestStreak: 0,
      icon: 'Flame',
      graceDaysLeft: 2,
    });

    it('branch 1: picks class in progress over upcoming classes, tasks, and habits', () => {
      const res = getDoThisNext({
        now: new Date('2026-10-18T10:30:00'),
        todayKey,
        scheduledClasses: [makeClass('s1', '10:00', '11:30')],
        tasks: [makeTask('t1', 'Urgent essay', { dueDate: todayKey, priority: 'high' })],
        habits: [makeHabit('h1', 'Hydrate')],
        habitLogs: [],
        restDays: [],
      });
      expect(res.kind).toBe('class_in_progress');
      expect(res.title).toContain('CS101');
    });

    it('skips cancelled, postponed, and finished classes', () => {
      const res = getDoThisNext({
        now: new Date('2026-10-18T12:00:00'),
        todayKey,
        scheduledClasses: [
          makeClass('s-finished', '09:00', '11:00'),
          makeClass('s-cancelled', '11:30', '13:00', { isCancelled: true }),
          makeClass('s-postponed', '12:15', '13:30', { isPostponed: true }),
        ],
        tasks: [makeTask('t1', 'Finish lab notes', { dueDate: todayKey })],
        habits: [],
        habitLogs: [],
        restDays: [],
      });
      expect(res.kind).toBe('task_due_today');
      expect(res.title).toBe('Finish lab notes');
    });

    it('branch 2: picks next class starting within 90 minutes and ignores classes > 90m away', () => {
      // Exactly 90 minutes away (10:00 -> 11:30)
      const within90 = getDoThisNext({
        now: new Date('2026-10-18T10:00:00'),
        todayKey,
        scheduledClasses: [makeClass('s1', '11:30', '12:30')],
        tasks: [makeTask('t1', 'Read chapter', { dueDate: todayKey })],
        habits: [],
        habitLogs: [],
        restDays: [],
      });
      expect(within90.kind).toBe('class_soon');
      expect(within90.badgeText).toBe('In 90m');

      // 95 minutes away -> falls through to task due today
      const beyond90 = getDoThisNext({
        now: new Date('2026-10-18T10:00:00'),
        todayKey,
        scheduledClasses: [makeClass('s1', '11:35', '12:35')],
        tasks: [makeTask('t1', 'Read chapter', { dueDate: todayKey })],
        habits: [],
        habitLogs: [],
        restDays: [],
      });
      expect(beyond90.kind).toBe('task_due_today');
    });

    it('branch 3: resolves ties for tasks due today by priority then dueTime', () => {
      const res = getDoThisNext({
        now: new Date('2026-10-18T08:00:00'),
        todayKey,
        scheduledClasses: [],
        tasks: [
          makeTask('t-low', 'Low morning', { dueDate: todayKey, priority: 'low', dueTime: '09:00' }),
          makeTask('t-high-late', 'High later', { dueDate: todayKey, priority: 'high', dueTime: '18:00' }),
          makeTask('t-high-early', 'High earlier', { dueDate: todayKey, priority: 'high', dueTime: '11:00' }),
        ],
        habits: [],
        habitLogs: [],
        restDays: [],
      });
      expect(res.kind).toBe('task_due_today');
      expect(res.id).toBe('t-high-early');
    });

    it('branch 4: picks task due soonest when nothing is due today', () => {
      const res = getDoThisNext({
        now: new Date('2026-10-18T08:00:00'),
        todayKey,
        scheduledClasses: [],
        tasks: [
          makeTask('t-later', 'Final project', { dueDate: '2026-10-25', priority: 'high' }),
          makeTask('t-soon', 'Quiz prep', { dueDate: '2026-10-19', priority: 'low' }),
          makeTask('t-undated', 'Someday task', { priority: 'high' }),
        ],
        habits: [makeHabit('h1', 'Stretch')],
        habitLogs: [],
        restDays: [],
      });
      expect(res.kind).toBe('task_due_soonest');
      expect(res.id).toBe('t-soon');
    });

    it('branch 5: picks pending habit not yet completed or rested today', () => {
      const res = getDoThisNext({
        now: new Date('2026-10-18T14:00:00'),
        todayKey,
        scheduledClasses: [],
        tasks: [makeTask('t-done', 'Done task', { dueDate: todayKey, status: 'done' })],
        habits: [makeHabit('h-done', 'Done Habit'), makeHabit('h-open', 'Evening Walk')],
        habitLogs: [{ id: 'l1', habitId: 'h-done', date: todayKey, count: 1, isPartial: false }],
        restDays: [],
      });
      expect(res.kind).toBe('habit_pending');
      expect(res.habitId).toBe('h-open');
    });

    it('branch 6: returns All clear when there is nothing left to do', () => {
      const res = getDoThisNext({
        now: new Date('2026-10-18T21:00:00'),
        todayKey,
        scheduledClasses: [makeClass('s-past', '09:00', '10:00')],
        tasks: [makeTask('t-done', 'Finished task', { dueDate: todayKey, status: 'done' })],
        habits: [makeHabit('h1', 'Rested habit')],
        habitLogs: [],
        restDays: [{ id: 'r1', habitId: 'h1', dateKey: todayKey, createdAt: '' }],
      });
      expect(res.kind).toBe('all_clear');
      expect(res.title).toBe('All clear');
    });

    it('returns next 3 timeline items and a single insight sentence', () => {
      const timeline = buildDayTimeline({
        date: todayKey,
        classes: [
          makeClass('s1', '08:00', '09:00'),
          makeClass('s2', '10:00', '11:00'),
          makeClass('s3', '12:00', '13:00'),
          makeClass('s4', '14:00', '15:00'),
          makeClass('s5', '16:00', '17:00'),
        ],
      });
      const next3 = getNextTimelineItems(timeline.blocks, 9 * 60 + 30, 3);
      expect(next3).toHaveLength(3);
      expect(next3[0].startTime).toBe('10:00');
      expect(next3[2].startTime).toBe('14:00');

      const sentence = getDailyInsightSentence({
        dailyProgress: calculateDailyProgress({
          tasks: [makeTask('t1', 'Open Task', { dueDate: todayKey })],
          habits: [],
          habitLogs: [],
          restDays: [],
          scheduledClasses: [],
          attendanceRecords: [],
          focusSessions: [],
          todayKey,
        }),
        nextGapMinutes: 60,
        focusMinutesToday: 0,
      });
      expect(sentence).toContain('60-minute');
    });
  });
});
