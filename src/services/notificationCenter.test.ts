import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockNativeState = vi.hoisted(() => ({
  isNative: false,
  platform: 'web',
  schedule: vi.fn(async () => undefined),
  cancel: vi.fn(async () => undefined),
  getPending: vi.fn(async () => ({ notifications: [] as any[] })),
  getDeliveredNotifications: vi.fn(async () => ({ notifications: [] as any[] })),
  createChannel: vi.fn(async () => undefined),
  registerActionTypes: vi.fn(async () => undefined),
  addListener: vi.fn(async () => ({ remove: vi.fn() })),
  checkPermissions: vi.fn(async () => ({ display: 'granted', exact_alarm: 'granted' })),
  requestPermissions: vi.fn(async () => ({ display: 'granted', exact_alarm: 'granted' })),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mockNativeState.isNative,
    getPlatform: () => mockNativeState.platform,
  },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: mockNativeState.schedule,
    cancel: mockNativeState.cancel,
    getPending: mockNativeState.getPending,
    getDeliveredNotifications: mockNativeState.getDeliveredNotifications,
    createChannel: mockNativeState.createChannel,
    registerActionTypes: mockNativeState.registerActionTypes,
    addListener: mockNativeState.addListener,
    checkPermissions: mockNativeState.checkPermissions,
    requestPermissions: mockNativeState.requestPermissions,
  },
}));

import { db } from '../db/db';
import {
  reconcileAllReminders,
  syncNotificationCenter,
  isNotificationVisibleInCenter,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  clearReadNotifications,
  snoozeAppNotification,
  completeTaskFromNotification,
  cancelTaskReminder,
  cancelExamReminders,
  cancelProjectReminders,
  cancelGoalReminders,
  emitFocusNotification,
  createTestAppNotification,
} from './reminderEngine';
import { checkAchievementsTrigger } from './rpgService';
import { exportDatabaseToJson, validateBackupFile, restoreDatabase } from './backupService';
import {
  AcademicGoal,
  ClassException,
  ClassSession,
  Course,
  DEFAULT_NOTIFICATION_SETTINGS,
  Habit,
  HabitLog,
  Project,
  Task,
} from '../types';

async function clearAllNotificationTestTables() {
  await Promise.all([
    db.settings.clear(),
    db.courses.clear(),
    db.classSessions.clear(),
    db.classExceptions.clear(),
    db.exams.clear(),
    db.tasks.clear(),
    db.habits.clear(),
    db.habitLogs.clear(),
    db.restDays.clear(),
    db.debts.clear(),
    db.recurringTransactions.clear(),
    db.scheduledReminders.clear(),
    db.appNotifications.clear(),
    db.projects.clear(),
    db.academicGoals.clear(),
    db.xpEvents.clear(),
    db.achievementsUnlocked.clear(),
    db.focusSessions.clear(),
    db.journalEntries.clear(),
  ]);
}

describe('Complete Notification System & Notification Center', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockNativeState.isNative = false;
    mockNativeState.platform = 'web';
    await clearAllNotificationTestTables();

    await db.settings.put({
      id: 'current_user',
      userName: 'Scholar',
      universityName: 'Campus',
      currentTermName: 'Fall',
      targetCgpa: 3.9,
      yearlyBookGoal: 12,
      isLowEnergy: false,
      isDormDay: false,
      soundEnabled: true,
      hapticsEnabled: false,
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
          enabled: true,
          start: '22:00',
          end: '07:00',
          allowUrgentExams: true,
        },
        categories: {
          ...DEFAULT_NOTIFICATION_SETTINGS.categories,
          habits: { ...DEFAULT_NOTIFICATION_SETTINGS.categories.habits, enabled: true },
          dailyBriefing: { ...DEFAULT_NOTIFICATION_SETTINGS.categories.dailyBriefing, enabled: false },
          weeklyReview: { ...DEFAULT_NOTIFICATION_SETTINGS.categories.weeklyReview, enabled: false },
          planMyDay: { time: '08:00', enabled: false },
          shutdownRitual: { time: '21:00', enabled: false },
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if ((globalThis as any).__restoreWindowUndefined) {
      delete (globalThis as any).window;
      delete (globalThis as any).__restoreWindowUndefined;
    }
  });

  it('respects class exceptions (cancelled & moved) and habit recurrence/completion state', async () => {
    const course: Course = {
      id: 'c-phys',
      code: 'PHYS101',
      name: 'Physics',
      color: '#2563EB',
      credits: 4,
      term: 'Fall',
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    };
    await db.courses.put(course);

    const sessions: ClassSession[] = [
      {
        id: 'sess-cancelled',
        courseId: 'c-phys',
        dayOfWeek: 0, // Mon 2026-11-16
        startTime: '09:00',
        endTime: '10:30',
        type: 'lecture',
        repeat: 'all',
      },
      {
        id: 'sess-moved',
        courseId: 'c-phys',
        dayOfWeek: 1, // Tue 2026-11-17 -> moved to Thu 2026-11-19 at 14:00
        startTime: '10:00',
        endTime: '11:30',
        type: 'lab',
        repeat: 'all',
      },
    ];
    await db.classSessions.bulkPut(sessions);

    const exceptions: ClassException[] = [
      { id: 'ex-1', sessionId: 'sess-cancelled', date: '2026-11-16', action: 'cancelled' },
      {
        id: 'ex-2',
        sessionId: 'sess-moved',
        date: '2026-11-17',
        action: 'moved',
        newDate: '2026-11-19',
        newStartTime: '14:00',
        newRoom: 'Lab 4B',
      },
    ];
    await db.classExceptions.bulkPut(exceptions);

    // Scheduled habit already completed today (2026-11-15) -> should skip today and schedule next day
    const habit: Habit = {
      id: 'h-read',
      title: 'Read 10 pages',
      category: 'study',
      type: 'daily',
      targetCount: 1,
      recurrence: 'daily',
      color: '#0D9488',
      currentStreak: 2,
      bestStreak: 2,
      icon: 'Book',
      graceDaysLeft: 2,
      status: 'active',
    };
    const doneToday: HabitLog = {
      id: 'hl-today',
      habitId: 'h-read',
      date: '2026-11-15',
      count: 1,
      isPartial: false,
      status: 'completed',
    };
    await db.habits.put(habit);
    await db.habitLogs.put(doneToday);

    const report = await reconcileAllReminders(new Date('2026-11-15T10:00:00'));
    expect(report.classesScheduled).toBe(1);
    expect(report.habitsScheduled).toBe(1);

    const reminders = await db.scheduledReminders.toArray();
    expect(reminders.some((r) => r.entityId === 'sess-cancelled')).toBe(false);
    const movedRem = reminders.find((r) => r.entityId === 'sess-moved');
    expect(movedRem?.id).toBe('class-sess-moved-2026-11-19-rescheduled');
    expect(movedRem?.body).toContain('Lab 4B');

    const habitRem = reminders.find((r) => r.category === 'habits');
    expect(habitRem).toBeDefined();
    expect(habitRem?.targetTime.startsWith('2026-11-16')).toBe(true);
  });

  it('schedules goals & projects, avoids duplicates on restarts, and cleans up on edits/cancellations', async () => {
    const goal: AcademicGoal = {
      id: 'g-1',
      title: 'Finish Thesis Outline',
      category: 'academic',
      targetDate: '2026-11-20',
      progressPercent: 40,
      status: 'active',
      createdAt: '2026-11-01T00:00:00Z',
    };
    const project: Project = {
      id: 'p-1',
      title: 'Robotics Capstone',
      type: 'final',
      description: 'Autonomous rover',
      status: 'active',
      deadline: '2026-11-18',
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    };
    await db.academicGoals.put(goal);
    await db.projects.put(project);

    const now = new Date('2026-11-15T08:00:00');
    const first = await reconcileAllReminders(now);
    const second = await reconcileAllReminders(now);

    expect(first.goalsScheduled).toBe(2); // 3d + 1d
    expect(first.activeCount).toBe(second.activeCount);
    expect(await db.scheduledReminders.count()).toBe(first.activeCount);

    await cancelGoalReminders('g-1');
    await cancelProjectReminders('p-1');
    expect((await db.scheduledReminders.toArray()).some((r) => r.entityId === 'g-1')).toBe(false);
    expect((await db.scheduledReminders.toArray()).some((r) => r.entityId === 'p-1')).toBe(false);
  });

  it('surfaces due reminders + overdue tasks into Notification Center and supports read/dismiss/snooze/complete-task', async () => {
    const overdueTask: Task = {
      id: 't-overdue',
      title: 'Submit Lab 3',
      priority: 'high',
      effort: 'medium',
      dueDate: '2026-11-14',
      dueTime: '17:00',
      status: 'todo',
      contextTag: 'laptop',
      createdAt: '2026-11-10T10:00:00Z',
      updatedAt: '2026-11-10T10:00:00Z',
    };
    const upcomingTask: Task = {
      id: 't-future',
      title: 'Read Chapter 4',
      priority: 'medium',
      effort: 'small',
      dueDate: '2026-11-17',
      dueTime: '15:00',
      status: 'todo',
      contextTag: 'any',
      createdAt: '2026-11-10T10:00:00Z',
      updatedAt: '2026-11-10T10:00:00Z',
    };
    await db.tasks.bulkPut([overdueTask, upcomingTask]);

    // First reconcile on Nov 15 morning -> schedules t-future for Nov 16 15:00 (1d lead)
    await reconcileAllReminders(new Date('2026-11-15T08:00:00'));
    // Sync Notification Center on Nov 15 -> surfaces t-overdue immediately
    const sync1 = await syncNotificationCenter(new Date('2026-11-15T09:00:00'));
    expect(sync1.overdueCount).toBe(1);

    const overdueNotif = await db.appNotifications.get('overdue-task-t-overdue');
    expect(overdueNotif).toBeDefined();
    expect(overdueNotif?.isRead).toBe(false);

    // Sync again on Nov 16 16:00 -> t-future reminder becomes due and materializes
    await syncNotificationCenter(new Date('2026-11-16T16:00:00'));
    const futureDueNotif = await db.appNotifications.get('notif-task-t-future');
    expect(futureDueNotif).toBeDefined();
    expect(isNotificationVisibleInCenter(futureDueNotif!, new Date('2026-11-16T16:01:00').getTime())).toBe(true);

    // Mark read & test snooze hides from center until snooze elapses
    await markNotificationRead(futureDueNotif!.id);
    expect((await db.appNotifications.get(futureDueNotif!.id))?.isRead).toBe(true);

    await snoozeAppNotification(futureDueNotif!.id, 30);
    const snoozed = await db.appNotifications.get(futureDueNotif!.id);
    expect(isNotificationVisibleInCenter(snoozed!, Date.now())).toBe(false);

    // Complete overdue task directly from notification -> updates task, awards XP once, cancels notices
    const completed = await completeTaskFromNotification(overdueNotif!);
    expect(completed).toBe(true);
    const reloadedTask = await db.tasks.get('t-overdue');
    expect(reloadedTask?.status).toBe('done');
    expect((await db.xpEvents.where('sourceId').equals('t-overdue').toArray()).length).toBe(1);
    expect((await db.appNotifications.get('overdue-task-t-overdue'))?.isDismissed).toBe(true);

    // Dismiss & clear read checks
    await dismissNotification(futureDueNotif!.id);
    expect((await db.appNotifications.get(futureDueNotif!.id))?.isDismissed).toBe(true);
    await markAllNotificationsRead();
    await clearReadNotifications();
    await cancelTaskReminder('t-future');
    await cancelExamReminders('non-existent');
  });

  it('caps native Android alarms at 50 and never calls browser window.Notification APIs in web mode', async () => {
    const windowNotifSpy = vi.fn();
    (globalThis as any).Notification = windowNotifSpy;

    // Create 60 todo tasks in the future so expectedReminders > 50
    const tasks: Task[] = Array.from({ length: 60 }, (_, idx) => ({
      id: `bulk-task-${idx}`,
      title: `Assignment ${idx + 1}`,
      priority: 'medium',
      effort: 'small',
      dueDate: '2026-11-25',
      dueTime: `${String(8 + (idx % 12)).padStart(2, '0')}:00`,
      status: 'todo',
      contextTag: 'any',
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    }));
    await db.tasks.bulkPut(tasks);

    // Enable mocked native Android container (isNativeAndroid requires window defined)
    if (typeof (globalThis as any).window === 'undefined') {
      (globalThis as any).window = globalThis;
      (globalThis as any).__restoreWindowUndefined = true;
    }
    mockNativeState.isNative = true;
    mockNativeState.platform = 'android';

    const report = await reconcileAllReminders(new Date('2026-11-15T09:00:00'));
    expect(report.activeCount).toBe(60);
    expect(report.nativeScheduledCount).toBe(50);
    expect(report.cappedOverflowCount).toBe(10);
    expect(mockNativeState.schedule).toHaveBeenCalledTimes(50);

    // Focus completion + Achievement unlock + Test alert
    const focusNotif = await emitFocusNotification({ phase: 'work', minutes: 25, taskTitle: 'Linear Algebra' });
    expect(focusNotif).not.toBeNull();
    expect(focusNotif?.category).toBe('focus');

    // Break notification skipped when notifyBreakEnd is false
    const settings = await db.settings.get('current_user');
    await db.settings.put({
      ...settings!,
      notificationSettings: {
        ...settings!.notificationSettings!,
        categories: {
          ...settings!.notificationSettings!.categories,
          focus: { enabled: true, notifyBreakEnd: false },
        },
      },
    });
    expect(await emitFocusNotification({ phase: 'short_break', minutes: 5 })).toBeNull();

    // Achievement notification
    await db.achievementsUnlocked.put({
      id: 'ach_first_steps',
      title: 'First Steps',
      description: 'Completed first task',
      icon: 'CheckCircle',
      category: 'academic',
      isUnlocked: false,
    });
    await db.tasks.put({
      id: 'done-1',
      title: 'Done Task',
      priority: 'low',
      effort: 'small',
      status: 'done',
      contextTag: 'any',
      createdAt: '2026-11-15T00:00:00Z',
      updatedAt: '2026-11-15T00:00:00Z',
    });
    await checkAchievementsTrigger();
    const achNotif = await db.appNotifications.get('ach-ach_first_steps');
    expect(achNotif).toBeDefined();
    expect(achNotif?.route).toBe('#/levels');

    // Switch back to Web/PWA mode for test alert & verify zero browser Notification API calls
    mockNativeState.isNative = false;
    mockNativeState.platform = 'web';
    const testRes = await createTestAppNotification();
    expect(testRes.success).toBe(true);
    expect(testRes.notification.deliveryStatus).toBe('in_app_only');
    expect(windowNotifSpy).not.toHaveBeenCalled();

    delete (globalThis as any).Notification;
  });

  it('exports, validates, and restores scheduledReminders and appNotifications in backup JSON', async () => {
    await db.appNotifications.put({
      id: 'notif-backup-1',
      title: 'Backup Test Alert',
      description: 'Verify persistence across export and restore.',
      category: 'academics',
      createdAt: '2026-11-15T10:00:00Z',
      isRead: false,
      isDismissed: false,
      priority: 'normal',
      deliveryStatus: 'in_app_only',
    });
    await db.scheduledReminders.put({
      id: 'rem-backup-1',
      numericId: 123456,
      title: 'Upcoming Class',
      body: 'Starts in 30 mins',
      targetTime: '2026-11-20T08:30:00Z',
      category: 'classes',
      route: '#/timetable',
      createdAt: '2026-11-15T10:00:00Z',
    });

    const json = await exportDatabaseToJson();
    const validation = validateBackupFile(json);
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;

    expect(validation.tableCounts.appNotifications).toBe(1);
    expect(validation.tableCounts.scheduledReminders).toBe(1);

    await clearAllNotificationTestTables();
    expect(await db.appNotifications.count()).toBe(0);

    const restored = await restoreDatabase(validation.backup, 'replace');
    expect(restored.success).toBe(true);
    expect((await db.appNotifications.get('notif-backup-1'))?.title).toBe('Backup Test Alert');
    expect((await db.scheduledReminders.get('rem-backup-1'))?.numericId).toBe(123456);
  });
});
