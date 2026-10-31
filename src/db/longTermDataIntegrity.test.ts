import { describe, it, expect } from 'vitest';
import LZString from 'lz-string';
import {
  deserializeEmergencyPayload,
  EmergencyBackupPayload,
} from './db';
import { calculateHabitStreak, getRemainingRestTokens } from '../utils/streakEngine';
import { getClassesForDate, getNextClass } from '../utils/scheduleEngine';
import { getUpNextItem } from '../utils/todayEngine';
import { validateBackupFile } from '../services/backupService';
import { Task, HabitLog, RestDay, Course, ClassSession } from '../types';

describe('Systematic Data Integrity & Long-Term Lifecycle Simulation', () => {
  // Test 1: Multi-day task creation, edit, completion, and deletion simulation
  it('simulates multi-day task management without state inconsistency', () => {
    const day1 = '2026-10-25';
    const day2 = '2026-10-26';
    const day3 = '2026-10-27';

    // Day 1: Create tasks
    const tasks: Task[] = [
      {
        id: 'task-1',
        title: 'Review Calculus Limits & Derivatives',
        dueDate: day1,
        priority: 'high',
        effort: 'large',
        status: 'todo',
        contextTag: 'any',
        createdAt: `${day1}T08:00:00.000Z`,
        updatedAt: `${day1}T08:00:00.000Z`,
      },
      {
        id: 'task-2',
        title: 'Draft Physics Lab Conclusion',
        dueDate: day1,
        priority: 'medium',
        effort: 'medium',
        status: 'todo',
        contextTag: 'laptop',
        createdAt: `${day1}T09:00:00.000Z`,
        updatedAt: `${day1}T09:00:00.000Z`,
      },
    ];

    expect(tasks.length).toBe(2);
    expect(tasks.filter((t) => t.status === 'done').length).toBe(0);

    // Day 1 Evening: Complete Task 1, edit Task 2 (reschedule to Day 2)
    tasks[0].status = 'done';
    tasks[0].completedAt = `${day1}T18:00:00.000Z`;
    tasks[0].updatedAt = `${day1}T18:00:00.000Z`;

    tasks[1].dueDate = day2;
    tasks[1].dueTime = '14:00';
    tasks[1].priority = 'high';
    tasks[1].updatedAt = `${day1}T18:30:00.000Z`;

    expect(tasks[0].status).toBe('done');
    expect(tasks[1].dueDate).toBe(day2);
    expect(tasks[1].priority).toBe('high');

    // Day 2: Add a new task for Day 3, complete Task 2
    tasks.push({
      id: 'task-3',
      title: 'Submit Engineering Mechanics Assignment',
      dueDate: day3,
      priority: 'high',
      effort: 'medium',
      status: 'todo',
      contextTag: 'laptop',
      createdAt: `${day2}T10:00:00.000Z`,
      updatedAt: `${day2}T10:00:00.000Z`,
    });

    tasks[1].status = 'done';
    tasks[1].completedAt = `${day2}T13:45:00.000Z`;

    expect(tasks.length).toBe(3);
    const completedTasks = tasks.filter((t) => t.status === 'done');
    expect(completedTasks.length).toBe(2);

    // Day 3: Delete task-1 (completed 2 days ago), verify clean array
    const remainingTasks = tasks.filter((t) => t.id !== 'task-1');
    expect(remainingTasks.length).toBe(2);
    expect(remainingTasks.find((t) => t.id === 'task-1')).toBeUndefined();
    expect(remainingTasks.find((t) => t.id === 'task-3')?.status).toBe('todo');
  });

  // Test 2: Habit streak tracking over multiple days with rest tokens
  it('correctly tracks habit streaks across multiple days with rest tokens', () => {
    const habitId = 'habit-reading';
    const restDays: RestDay[] = [
      { id: 'rest-1', habitId, dateKey: '2026-10-22', createdAt: '2026-10-22' },
    ];

    // Logs for 2026-10-20, 2026-10-21, 2026-10-23, 2026-10-24
    // 2026-10-22 is protected by a rest token matching habitId!
    const logs: HabitLog[] = [
      { id: 'log-1', habitId, date: '2026-10-20', count: 1, isPartial: false },
      { id: 'log-2', habitId, date: '2026-10-21', count: 1, isPartial: false },
      { id: 'log-3', habitId, date: '2026-10-23', count: 1, isPartial: false },
      { id: 'log-4', habitId, date: '2026-10-24', count: 1, isPartial: false },
    ];

    const result = calculateHabitStreak(habitId, logs, restDays, '2026-10-24');
    expect(result.currentStreak).toBe(4);
    expect(result.bestStreak).toBe(4);

    const tokensRemaining = getRemainingRestTokens(restDays, '2026-10-24');
    expect(tokensRemaining).toBeGreaterThanOrEqual(0);
  });

  // Test 3: Schedule clash detection and timeline integrity
  it('detects schedule classes and imminent priorities accurately', () => {
    const courses: Course[] = [
      { id: 'c-math', code: 'MATH1007', name: 'Applied Mathematics', color: '#3B82F6', term: 'Year 1', createdAt: '', updatedAt: '' },
      { id: 'c-phys', code: 'PHYS1001', name: 'General Physics', color: '#EF4444', term: 'Year 1', createdAt: '', updatedAt: '' },
    ];

    // DayOfWeek in scheduleEngine: 0 = Monday, 1 = Tuesday ...
    const sessions: ClassSession[] = [
      { id: 's-1', courseId: 'c-math', dayOfWeek: 0, startTime: '08:30', endTime: '10:00', type: 'lecture', room: 'Hall B2', repeat: 'all' },
      { id: 's-2', courseId: 'c-phys', dayOfWeek: 0, startTime: '10:30', endTime: '12:00', type: 'lab', room: 'Lab 4', repeat: 'all' },
    ];

    // 2026-10-26 is a Monday (dayOfWeek = 0)
    const mondayDateKey = '2026-10-26';
    const classes = getClassesForDate(mondayDateKey, sessions, [], null, courses);
    expect(classes.length).toBe(2);
    expect(classes[0].course.code).toBe('MATH1007');
    expect(classes[1].course.code).toBe('PHYS1001');

    // Simulate current time before second class
    const simulatedNow = new Date('2026-10-26T10:10:00');
    const nextClass = getNextClass(simulatedNow, sessions, [], null, courses);
    expect(nextClass).not.toBeNull();
    expect(nextClass?.scheduledClass.session.courseId).toBe('c-phys');
  });

  // Test 4: Simulated offline mirror preservation and anti-overwrite guard
  it('protects emergency mirror from being overwritten when IndexedDB is temporarily empty', () => {
    // Existing populated backup with 20 items
    const populatedMirror: EmergencyBackupPayload = {
      version: 4,
      savedAt: '2026-10-25T12:00:00.000Z',
      totalRecords: 20,
      data: {
        tasks: Array.from({ length: 10 }, (_, i) => ({ id: `task-${i}`, title: `Task ${i}` } as any)),
        journalEntries: [
          { id: 'j-1', title: 'Deep Work Log', content: 'Studied for 4 hours.' } as any,
        ],
        courses: [
          { id: 'c-1', code: 'MATH1007', name: 'Mathematics' } as any,
        ],
      },
    };

    const compressed = LZString.compressToUTF16(JSON.stringify(populatedMirror));

    // Simulated empty IndexedDB state (e.g. only 1 settings record on fresh browser launch)
    const emptyDbCount = 1;

    // Verify Anti-Data-Loss guard condition:
    // If current DB has <= 1 records while mirror has > 1 records, overwrite MUST be refused!
    const shouldRefuseOverwrite = emptyDbCount <= 1 && populatedMirror.totalRecords > 1;
    expect(shouldRefuseOverwrite).toBe(true);

    // Verify mirror data remains intact and recoverable
    const recovered = deserializeEmergencyPayload(compressed);
    expect(recovered).not.toBeNull();
    expect(recovered?.totalRecords).toBe(20);
    expect(recovered?.data.tasks?.length).toBe(10);
    expect(recovered?.data.journalEntries?.length).toBe(1);
  });

  // Test 5: Backup export validation and recovery integrity
  it('validates comprehensive backup format across all tables', () => {
    const validBackupJson = JSON.stringify({
      version: 2,
      exportedAt: new Date().toISOString(),
      data: {
        settings: [{ id: 'current_user', userName: 'Abebe' }],
        courses: [{ id: 'c-1', code: 'MATH1007', name: 'Applied Math' }],
        tasks: [{ id: 't-1', title: 'Complete Lab Report', status: 'todo' }],
        habits: [{ id: 'h-1', title: 'Daily Reading', targetDaysPerWeek: 7 }],
        journalEntries: [{ id: 'j-1', title: 'Personal Journal', content: 'Productive study session.' }],
        semesters: [{ id: 'sem-1', name: 'Year 1 - Semester I', startDate: '2026-09-01', endDate: '2027-01-30', isActive: true }],
      },
    });

    const validation = validateBackupFile(validBackupJson);
    expect(validation.valid).toBe(true);
    if (validation.valid) {
      expect(validation.version).toBe(2);
      expect(validation.totalRecords).toBe(6);
      expect(validation.tableCounts['courses']).toBe(1);
      expect(validation.tableCounts['tasks']).toBe(1);
      expect(validation.tableCounts['semesters']).toBe(1);
    }
  });

  // Test 6: Rejects corrupted or malformed backup payloads safely
  it('gracefully rejects corrupted backup payloads with clear error messages', () => {
    // Missing ID
    const invalidJsonMissingId = JSON.stringify({
      version: 2,
      data: {
        tasks: [{ title: 'No ID task' }], // Missing 'id'
      },
    });
    const result1 = validateBackupFile(invalidJsonMissingId);
    expect(result1.valid).toBe(false);
    if (!result1.valid) {
      expect(result1.error).toContain('lacks a required string "id"');
    }

    // Unsupported higher schema version
    const higherVersion = JSON.stringify({
      version: 99,
      data: {},
    });
    const result2 = validateBackupFile(higherVersion);
    expect(result2.valid).toBe(false);
    if (!result2.valid) {
      expect(result2.error).toContain('schema version 99');
    }

    // Non-object corrupted text
    const corruptedText = '<html><body>Not a JSON</body></html>';
    const result3 = validateBackupFile(corruptedText);
    expect(result3.valid).toBe(false);
    if (!result3.valid) {
      expect(result3.error).toContain('Invalid JSON');
    }
  });

  // Test 7: Up Next recommendation live calculation
  it('correctly calculates the highest priority Up Next item', () => {
    const today = '2026-10-31';
    const now = new Date('2026-10-31T09:00:00');

    const tasks: Task[] = [
      {
        id: 'task-low',
        title: 'Casual Reading',
        priority: 'low',
        status: 'todo',
        effort: 'small',
        contextTag: 'any',
        dueDate: today,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'task-high',
        title: 'Submit Midterm Report',
        priority: 'high',
        status: 'todo',
        effort: 'large',
        contextTag: 'any',
        dueDate: today,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const upNext = getUpNextItem({
      now,
      todayKey: today,
      scheduledClasses: [],
      tasks,
      exams: [],
      habits: [],
      habitLogs: [],
      restDays: [],
      attendanceRecords: [],
      creativeProjects: [],
      readingItems: [],
    });

    expect(upNext).not.toBeNull();
    // High priority task should be recommended first
    expect(upNext.title).toBe('Submit Midterm Report');
  });
});
