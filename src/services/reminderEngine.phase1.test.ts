import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/db';
import { reconcileAllReminders } from './reminderEngine';
import { Course, ClassSession, DEFAULT_NOTIFICATION_SETTINGS } from '../types';

describe('Phase 1 - Reminder Engine Defects Reproduction & Validation', () => {
  beforeEach(async () => {
    await db.settings.clear();
    await db.courses.clear();
    await db.classSessions.clear();
    await db.classExceptions.clear();
    await db.exams.clear();
    await db.tasks.clear();
    await db.habits.clear();
    await db.debts.clear();
    await db.recurringTransactions.clear();
    await db.scheduledReminders.clear();
    await db.projects.clear();

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
        categories: {
          ...DEFAULT_NOTIFICATION_SETTINGS.categories,
          exams: { ...DEFAULT_NOTIFICATION_SETTINGS.categories.exams, enabled: false }, // disable exams to isolate class loop
        },
      },
    });
  });

  it('1a. reproduces that class sessions are NEVER scheduled because dayOfWeek is numeric (0..6) but dayMap expects string names', async () => {
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

    // Call reconcileAllReminders with exams disabled
    const report = await reconcileAllReminders();
    console.log('Class scheduling report:', report);
    // Because dayMap['0'] is undefined, classesScheduled is 0!
    expect(report.classesScheduled).toBe(0);
  });

  it('1b. reproduces that db.exams.where("isDefeated") throws SchemaError', async () => {
    let thrownError: any = null;
    try {
      await db.exams.where('isDefeated').equals(0 as any).toArray();
    } catch (err) {
      thrownError = err;
    }
    expect(thrownError).not.toBeNull();
    expect(thrownError.name).toBe('SchemaError');
  });
});
