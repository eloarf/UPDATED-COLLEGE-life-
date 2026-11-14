import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/db';
import { reconcileAllReminders, resolveSessionJsDay } from './reminderEngine';
import { Course, ClassSession, Exam, DEFAULT_NOTIFICATION_SETTINGS } from '../types';

describe('Reminder Engine Defect Fixes Verification', () => {
  beforeEach(async () => {
    await db.settings.clear();
    await db.courses.clear();
    await db.classSessions.clear();
    await db.classExceptions.clear();
    await db.exams.clear();
    await db.tasks.clear();
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.restDays.clear();
    await db.debts.clear();
    await db.recurringTransactions.clear();
    await db.scheduledReminders.clear();
    await db.appNotifications.clear();
    await db.projects.clear();
    await db.academicGoals.clear();

    await db.settings.put({
      id: 'current_user',
      userName: 'Scholar',
      universityName: 'Campus',
      currentTermName: 'Term 1',
      targetCgpa: 4.0,
      yearlyBookGoal: 10,
      isLowEnergy: false,
      isDormDay: false,
      soundEnabled: true,
      hapticsEnabled: true,
      showXpPopups: true,
      backupReminderDays: 7,
      theme: 'default',
      pageAccents: {},
      storageProtected: false,
      gradingScale: [],
      attendanceThresholdPercent: 75,
      notificationSettings: {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        enabled: true,
        quietHours: {
          ...DEFAULT_NOTIFICATION_SETTINGS.quietHours,
          enabled: false,
        },
        categories: {
          ...DEFAULT_NOTIFICATION_SETTINGS.categories,
          exams: { ...DEFAULT_NOTIFICATION_SETTINGS.categories.exams, enabled: true },
        },
      },
    });
  });

  it('1a. schedules class sessions reliably when dayOfWeek is numeric (0=Mon..6=Sun)', async () => {
    expect(resolveSessionJsDay(0)).toBe(1); // Monday -> JS 1
    expect(resolveSessionJsDay(6)).toBe(0); // Sunday -> JS 0

    const course: Course = {
      id: 'c-1',
      code: 'CS101',
      name: 'Computer Science',
      color: '#4F46E5',
      targetGrade: 'A',
      credits: 4,
      term: 'Term 1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.courses.put(course);

    const session: ClassSession = {
      id: 's-1',
      courseId: 'c-1',
      dayOfWeek: 0, // Monday in College Life OS
      startTime: '10:00',
      endTime: '11:30',
      type: 'lecture',
      repeat: 'all',
      room: 'Hall B',
    };
    await db.classSessions.put(session);

    // Fix verification: fixed date at Sunday 2026-11-15 09:00 local -> Monday 2026-11-16 09:30 trigger
    const report = await reconcileAllReminders(new Date('2026-11-15T09:00:00'));
    expect(report.classesScheduled).toBe(1);

    const saved = await db.scheduledReminders.toArray();
    const classReminder = saved.find((r) => r.category === 'classes');
    expect(classReminder).toBeDefined();
    expect(classReminder?.id).toBe('class-s-1-2026-11-16');
    expect(classReminder?.title).toContain('CS101');
  });

  it('1b. reconciles active exams cleanly without SchemaError and skips defeated exams', async () => {
    const course: Course = {
      id: 'c-1',
      code: 'MATH201',
      name: 'Linear Algebra',
      color: '#10B981',
      credits: 3,
      term: 'Term 1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.courses.put(course);

    const activeExam: Exam = {
      id: 'ex-active',
      courseId: 'c-1',
      title: 'Midterm Exam',
      examType: 'Midterm',
      examDate: '2026-11-20',
      startTime: '14:00',
      hall: 'Room 302',
      weight: 30,
      targetScore: 90,
      currentHp: 100,
      maxHp: 100,
      isDefeated: false,
      createdAt: new Date().toISOString(),
    };

    const defeatedExam: Exam = {
      id: 'ex-defeated',
      courseId: 'c-1',
      title: 'Quiz 1',
      examType: 'Quiz',
      examDate: '2026-11-20',
      startTime: '10:00',
      hall: 'Room 101',
      weight: 10,
      targetScore: 90,
      currentHp: 0,
      maxHp: 100,
      isDefeated: true,
      createdAt: new Date().toISOString(),
    };

    await db.exams.bulkPut([activeExam, defeatedExam]);

    // Previously threw SchemaError on boolean index query; now succeeds cleanly
    const report = await reconcileAllReminders(new Date('2026-11-16T08:00:00'));
    expect(report.examsScheduled).toBeGreaterThanOrEqual(3); // 3d, 1d, morning

    const reminders = await db.scheduledReminders.toArray();
    expect(reminders.some((r) => r.entityId === 'ex-active')).toBe(true);
    expect(reminders.some((r) => r.entityId === 'ex-defeated')).toBe(false);
  });
});
