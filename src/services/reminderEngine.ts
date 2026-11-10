import { db } from '../db/db';
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  ScheduledReminderRecord,
  Task,
  Exam,
  Project,
  DebtRecord,
  RecurringTransaction,
  ClassSession,
  Course,
} from '../types';
import {
  stringToNotificationId,
  scheduleNativeLocalNotification,
  cancelNativeLocalNotifications,
  isNativeAndroid,
} from './notificationService';

export interface ReconciliationReport {
  timestamp: string;
  enabled: boolean;
  activeCount: number;
  classesScheduled: number;
  tasksScheduled: number;
  examsScheduled: number;
  habitsScheduled: number;
  financeScheduled: number;
  briefingsScheduled: number;
  canceledCount: number;
}

/**
 * Checks whether a given timestamp falls within user quiet hours.
 */
export function isInQuietHours(
  targetDate: Date,
  quietHours: { enabled: boolean; start: string; end: string }
): boolean {
  if (!quietHours.enabled) return false;

  const [startH, startM] = quietHours.start.split(':').map(Number);
  const [endH, endM] = quietHours.end.split(':').map(Number);

  const hour = targetDate.getHours();
  const minute = targetDate.getMinutes();
  const currentMinutes = hour * 60 + minute;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // e.g. 22:00 to 07:00 (spans midnight)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // e.g. 01:00 to 06:00
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}

/**
 * Adjusts a target notification date if it falls inside quiet hours.
 * If postponed past the actual event start, returns null (skip delivery).
 */
export function adjustForQuietHours(
  targetDate: Date,
  eventDate: Date,
  quietHours: { enabled: boolean; start: string; end: string; allowUrgentExams: boolean },
  isUrgent: boolean = false
): Date | null {
  if (!quietHours.enabled) return targetDate;
  if (isUrgent && quietHours.allowUrgentExams) return targetDate;

  if (!isInQuietHours(targetDate, quietHours)) {
    return targetDate;
  }

  // Postpone to quiet hours end + 5 minutes
  const [endH, endM] = quietHours.end.split(':').map(Number);
  const adjusted = new Date(targetDate);
  adjusted.setHours(endH, endM + 5, 0, 0);

  // If already past quiet hours end today, advance to tomorrow
  if (adjusted.getTime() <= targetDate.getTime()) {
    adjusted.setDate(adjusted.getDate() + 1);
  }

  // If adjusted notification time is already AFTER the event itself, skip it
  if (adjusted.getTime() >= eventDate.getTime()) {
    return null;
  }

  return adjusted;
}

/**
 * Helper to compute next date for a DayOfWeek (0=Sun, 1=Mon, ..., 6=Sat)
 */
function getNextDayOccurrence(dayOfWeek: number, timeStr: string, fromDate: Date = new Date()): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const target = new Date(fromDate);
  target.setHours(hours, minutes, 0, 0);

  const currentDay = target.getDay();
  let daysUntil = (dayOfWeek - currentDay + 7) % 7;

  // If it's today but the time has already passed, schedule for next week
  if (daysUntil === 0 && target.getTime() <= fromDate.getTime()) {
    daysUntil = 7;
  }

  target.setDate(target.getDate() + daysUntil);
  return target;
}

/**
 * Reconciles the authoritative College Life OS database with scheduled notifications.
 * Removes obsolete records, updates modified deadlines, and schedules upcoming reminders.
 */
export async function reconcileAllReminders(): Promise<ReconciliationReport> {
  const settings = await db.settings.get('current_user');
  const notifSettings: NotificationSettings =
    settings?.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;

  const now = new Date();
  const existingRecords = await db.scheduledReminders.toArray();
  const expectedReminders: ScheduledReminderRecord[] = [];

  // If master toggle is disabled, cancel all pending reminders
  if (!notifSettings.enabled) {
    if (existingRecords.length > 0) {
      await cancelNativeLocalNotifications(existingRecords.map((r) => r.numericId));
      await db.scheduledReminders.clear();
    }
    return {
      timestamp: now.toISOString(),
      enabled: false,
      activeCount: 0,
      classesScheduled: 0,
      tasksScheduled: 0,
      examsScheduled: 0,
      habitsScheduled: 0,
      financeScheduled: 0,
      briefingsScheduled: 0,
      canceledCount: existingRecords.length,
    };
  }

  let classesCount = 0;
  let tasksCount = 0;
  let examsCount = 0;
  let habitsCount = 0;
  let financeCount = 0;
  let briefingsCount = 0;

  // =========================================================================
  // 1. CLASSES & ACADEMIC EVENTS
  // =========================================================================
  if (notifSettings.categories.classes.enabled) {
    const sessions = await db.classSessions.toArray();
    const courses = await db.courses.toArray();
    const exceptions = await db.classExceptions.toArray();
    const courseMap = new Map<string, Course>(courses.map((c) => [c.id, c]));

    const leadMins = notifSettings.categories.classes.leadTimeMinutes || 30;

    for (const session of sessions) {
      const course = courseMap.get(session.courseId);
      if (!course) continue;

      // Map DayOfWeek ('monday' -> 1, etc.)
      const dayMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      const dayNum = dayMap[String(session.dayOfWeek).toLowerCase()];
      if (dayNum === undefined) continue;

      const classStart = getNextDayOccurrence(dayNum, session.startTime, now);
      const dateKey = classStart.toISOString().split('T')[0];

      // Check if class is canceled or postponed on this specific date
      const ex = exceptions.find(
        (e) => e.sessionId === session.id && e.date === dateKey
      );
      if (ex) {
        if (ex.action === 'cancelled') continue;
        if (ex.action === 'moved' && ex.newDate && ex.newDate !== dateKey) {
          // Postponed away to another date -> skip notification on original date
          continue;
        }
      }

      const effectiveStartTime = ex?.action === 'moved' && ex.newStartTime ? ex.newStartTime : session.startTime;
      const effectiveClassStart = ex?.action === 'moved' && ex.newStartTime
        ? (() => {
            const [h, m] = ex.newStartTime.split(':').map((x) => parseInt(x, 10));
            const d = new Date(classStart);
            d.setHours(h, m, 0, 0);
            return d;
          })()
        : classStart;

      const triggerTime = new Date(effectiveClassStart.getTime() - leadMins * 60 * 1000);
      if (triggerTime.getTime() <= now.getTime()) continue;

      const adjustedTrigger = adjustForQuietHours(
        triggerTime,
        effectiveClassStart,
        notifSettings.quietHours,
        false
      );
      if (!adjustedTrigger) continue;

      const stableId = `class-${session.id}-${dateKey}`;
      const numericId = stringToNotificationId(stableId);

      expectedReminders.push({
        id: stableId,
        numericId,
        title: `Upcoming: ${course.code} - ${course.name}`,
        body: `Class starts at ${effectiveStartTime} in ${ex?.newRoom || session.room || 'campus'}. Starts in ${leadMins} mins.`,
        targetTime: adjustedTrigger.toISOString(),
        category: 'classes',
        route: '#/timetable',
        entityId: session.id,
        createdAt: now.toISOString(),
      });
      classesCount++;
    }

    // Schedule reminders for postponed/rescheduled classes on their target dates
    for (const ex of exceptions) {
      if (ex.action === 'moved' && ex.newDate) {
        const session = sessions.find((s) => s.id === ex.sessionId);
        if (!session) continue;
        const course = courseMap.get(session.courseId);
        if (!course) continue;

        const effectiveTime = ex.newStartTime || session.startTime;
        const [h, m] = effectiveTime.split(':').map((x) => parseInt(x, 10));
        const rescheduledStart = new Date(`${ex.newDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);

        const triggerTime = new Date(rescheduledStart.getTime() - leadMins * 60 * 1000);
        if (triggerTime.getTime() <= now.getTime()) continue;

        const adjustedTrigger = adjustForQuietHours(
          triggerTime,
          rescheduledStart,
          notifSettings.quietHours,
          false
        );
        if (!adjustedTrigger) continue;

        const stableId = `class-${session.id}-${ex.newDate}-rescheduled`;
        const numericId = stringToNotificationId(stableId);

        expectedReminders.push({
          id: stableId,
          numericId,
          title: `Rescheduled: ${course.code} - ${course.name}`,
          body: `Rescheduled class starts at ${effectiveTime} in ${ex.newRoom || session.room || 'campus'}. Starts in ${leadMins} mins.`,
          targetTime: adjustedTrigger.toISOString(),
          category: 'classes',
          route: '#/timetable',
          entityId: session.id,
          createdAt: now.toISOString(),
        });
        classesCount++;
      }
    }
  }

  // =========================================================================
  // 2. TASKS & ASSIGNMENTS
  // =========================================================================
  if (notifSettings.categories.tasks.enabled) {
    const tasks = await db.tasks.where('status').equals('todo').toArray();
    const courses = await db.courses.toArray();
    const courseMap = new Map<string, Course>(courses.map((c) => [c.id, c]));

    const leadRule = notifSettings.categories.tasks.defaultLeadTime || '1d';
    const defTime = notifSettings.categories.tasks.defaultTime || '09:00';

    for (const task of tasks) {
      if (!task.dueDate) continue;

      const timePart = task.dueTime || defTime;
      const dueDateTime = new Date(`${task.dueDate}T${timePart}:00`);
      if (isNaN(dueDateTime.getTime())) continue;

      let triggerTime: Date;
      if (leadRule === '1d') {
        triggerTime = new Date(dueDateTime.getTime() - 24 * 60 * 60 * 1000);
      } else if (leadRule === '1h') {
        triggerTime = new Date(dueDateTime.getTime() - 60 * 60 * 1000);
      } else {
        triggerTime = new Date(dueDateTime.getTime());
      }

      if (triggerTime.getTime() <= now.getTime()) continue;

      const adjusted = adjustForQuietHours(
        triggerTime,
        dueDateTime,
        notifSettings.quietHours,
        task.priority === 'high'
      );
      if (!adjusted) continue;

      const course = task.courseId ? courseMap.get(task.courseId) : null;
      const courseTag = course ? `[${course.code}] ` : '';
      const stableId = `task-${task.id}`;
      const numericId = stringToNotificationId(stableId);

      expectedReminders.push({
        id: stableId,
        numericId,
        title: `Task Due: ${courseTag}${task.title}`,
        body: `Priority: ${task.priority.toUpperCase()}. Due ${task.dueDate}${task.dueTime ? ` at ${task.dueTime}` : ''}.`,
        targetTime: adjusted.toISOString(),
        category: 'tasks',
        route: '#/tasks',
        entityId: task.id,
        createdAt: now.toISOString(),
      });
      tasksCount++;
    }
  }

  // =========================================================================
  // 3. EXAMS & MAJOR DEADLINES
  // =========================================================================
  if (notifSettings.categories.exams.enabled) {
    const exams = await db.exams.where('isDefeated').equals(0 as any).toArray();
    const courses = await db.courses.toArray();
    const courseMap = new Map<string, Course>(courses.map((c) => [c.id, c]));

    for (const exam of exams) {
      if (!exam.examDate) continue;
      const examTime = exam.startTime || '09:00';
      const examDateObj = new Date(`${exam.examDate}T${examTime}:00`);
      if (isNaN(examDateObj.getTime())) continue;

      const course = courseMap.get(exam.courseId);
      const courseLabel = course ? `${course.code}: ` : '';

      // 3 Days Lead
      const tMinus3 = new Date(examDateObj.getTime() - 3 * 24 * 60 * 60 * 1000);
      tMinus3.setHours(9, 0, 0, 0);
      if (tMinus3.getTime() > now.getTime()) {
        const adjusted3 = adjustForQuietHours(tMinus3, examDateObj, notifSettings.quietHours, true);
        if (adjusted3) {
          const id = `exam-${exam.id}-3d`;
          expectedReminders.push({
            id,
            numericId: stringToNotificationId(id),
            title: `Exam in 3 Days: ${courseLabel}${exam.title}`,
            body: `Scheduled for ${exam.examDate} at ${exam.startTime}. Hall: ${exam.hall || 'TBA'}. Target: ${exam.targetScore}%.`,
            targetTime: adjusted3.toISOString(),
            category: 'exams',
            route: '#/exams',
            entityId: exam.id,
            createdAt: now.toISOString(),
          });
          examsCount++;
        }
      }

      // 1 Day Lead
      const tMinus1 = new Date(examDateObj.getTime() - 1 * 24 * 60 * 60 * 1000);
      tMinus1.setHours(9, 0, 0, 0);
      if (tMinus1.getTime() > now.getTime()) {
        const adjusted1 = adjustForQuietHours(tMinus1, examDateObj, notifSettings.quietHours, true);
        if (adjusted1) {
          const id = `exam-${exam.id}-1d`;
          expectedReminders.push({
            id,
            numericId: stringToNotificationId(id),
            title: `Exam Tomorrow: ${courseLabel}${exam.title}`,
            body: `Final review reminder! ${exam.examType} starts at ${exam.startTime} in ${exam.hall || 'campus'}.`,
            targetTime: adjusted1.toISOString(),
            category: 'exams',
            route: '#/exams',
            entityId: exam.id,
            createdAt: now.toISOString(),
          });
          examsCount++;
        }
      }

      // Exam Morning Lead
      if (notifSettings.categories.exams.notifyOnExamMorning) {
        const morningDate = new Date(`${exam.examDate}T07:00:00`);
        if (morningDate.getTime() > now.getTime() && morningDate.getTime() < examDateObj.getTime()) {
          const id = `exam-${exam.id}-morning`;
          expectedReminders.push({
            id,
            numericId: stringToNotificationId(id),
            title: `Exam Today: ${courseLabel}${exam.title}`,
            body: `Begins at ${exam.startTime} in ${exam.hall || 'designated hall'}. Bring required stationery & ID!`,
            targetTime: morningDate.toISOString(),
            category: 'exams',
            route: '#/exams',
            entityId: exam.id,
            createdAt: now.toISOString(),
          });
          examsCount++;
        }
      }
    }

    // Projects Deadlines
    const projects = await db.projects.toArray();
    for (const proj of projects) {
      if (!proj.deadline || proj.status === 'submitted' || proj.status === 'graded') continue;
      const projDate = new Date(`${proj.deadline}T17:00:00`);
      if (isNaN(projDate.getTime())) continue;

      const tMinus1 = new Date(projDate.getTime() - 24 * 60 * 60 * 1000);
      tMinus1.setHours(10, 0, 0, 0);
      if (tMinus1.getTime() > now.getTime()) {
        const id = `project-${proj.id}-1d`;
        expectedReminders.push({
          id,
          numericId: stringToNotificationId(id),
          title: `Project Due Tomorrow: ${proj.title}`,
          body: `Submission deadline is ${proj.deadline}. Status: ${proj.status.toUpperCase()}.`,
          targetTime: tMinus1.toISOString(),
          category: 'exams',
          route: '#/projects',
          entityId: proj.id,
          createdAt: now.toISOString(),
        });
        examsCount++;
      }
    }
  }

  // =========================================================================
  // 4. HABITS LOGGING
  // =========================================================================
  if (notifSettings.categories.habits.enabled) {
    const habitTime = notifSettings.categories.habits.defaultTime || '20:00';
    const [hHour, hMin] = habitTime.split(':').map(Number);
    const habitTarget = new Date(now);
    habitTarget.setHours(hHour, hMin, 0, 0);
    if (habitTarget.getTime() <= now.getTime()) {
      habitTarget.setDate(habitTarget.getDate() + 1);
    }

    const id = 'habit-daily-checkin';
    expectedReminders.push({
      id,
      numericId: stringToNotificationId(id),
      title: 'Daily Habit Check-in 🌿',
      body: 'Take 2 minutes to log your study, health, and focus rituals to keep your streaks alive.',
      targetTime: habitTarget.toISOString(),
      category: 'habits',
      route: '#/habits',
      createdAt: now.toISOString(),
    });
    habitsCount++;
  }

  // =========================================================================
  // 5. FINANCE & PAYMENT DUE DATES
  // =========================================================================
  if (notifSettings.categories.finance.enabled) {
    const debts = await db.debts.toArray();
    for (const debt of debts) {
      if (debt.status === 'settled' || !debt.dueDate) continue;
      if (debt.type !== 'owe' && debt.type !== 'payable') continue;

      const debtDate = new Date(`${debt.dueDate}T10:00:00`);
      if (isNaN(debtDate.getTime())) continue;

      const trigger = new Date(debtDate.getTime() - 24 * 60 * 60 * 1000);
      trigger.setHours(10, 0, 0, 0);
      if (trigger.getTime() <= now.getTime()) continue;

      const person = debt.personName || debt.person || 'creditor';
      const amount = debt.remainingAmount || debt.amount || 0;
      const id = `debt-${debt.id}`;

      expectedReminders.push({
        id,
        numericId: stringToNotificationId(id),
        title: `Payment Due Tomorrow: ${person}`,
        body: `Due date: ${debt.dueDate}. Remaining payment: ${amount} ETB.`,
        targetTime: trigger.toISOString(),
        category: 'finance',
        route: '#/finance',
        entityId: debt.id,
        createdAt: now.toISOString(),
      });
      financeCount++;
    }

    const recurring = await db.recurringTransactions.toArray();
    for (const rec of recurring) {
      if (rec.isActive === false || !rec.nextDueDate) continue;
      const recDate = new Date(`${rec.nextDueDate}T10:00:00`);
      if (isNaN(recDate.getTime())) continue;

      const trigger = new Date(recDate.getTime() - 24 * 60 * 60 * 1000);
      trigger.setHours(10, 0, 0, 0);
      if (trigger.getTime() <= now.getTime()) continue;

      const id = `recurring-${rec.id}`;
      expectedReminders.push({
        id,
        numericId: stringToNotificationId(id),
        title: `Upcoming Expense: ${rec.title || 'Recurring Bill'}`,
        body: `${rec.amount} ETB scheduled for ${rec.nextDueDate}.`,
        targetTime: trigger.toISOString(),
        category: 'finance',
        route: '#/finance',
        entityId: rec.id,
        createdAt: now.toISOString(),
      });
      financeCount++;
    }
  }

  // =========================================================================
  // 6. DAILY BRIEFING & WEEKLY REVIEW
  // =========================================================================
  if (notifSettings.categories.dailyBriefing.enabled) {
    const briefTime = notifSettings.categories.dailyBriefing.time || '07:30';
    const [bHour, bMin] = briefTime.split(':').map(Number);
    const briefTarget = new Date(now);
    briefTarget.setHours(bHour, bMin, 0, 0);
    if (briefTarget.getTime() <= now.getTime()) {
      briefTarget.setDate(briefTarget.getDate() + 1);
    }

    const id = 'briefing-morning-daily';
    expectedReminders.push({
      id,
      numericId: stringToNotificationId(id),
      title: `Morning Briefing — ${settings?.userName || 'Scholar'} ☀️`,
      body: 'Check your schedule, lectures, and quest priorities for today.',
      targetTime: briefTarget.toISOString(),
      category: 'briefings',
      route: '#/',
      createdAt: now.toISOString(),
    });
    briefingsCount++;
  }

  if (notifSettings.categories.weeklyReview.enabled) {
    const wDay = notifSettings.categories.weeklyReview.dayOfWeek ?? 0;
    const wTime = notifSettings.categories.weeklyReview.time || '19:00';
    const weeklyTarget = getNextDayOccurrence(wDay, wTime, now);

    const id = 'review-weekly-audit';
    expectedReminders.push({
      id,
      numericId: stringToNotificationId(id),
      title: 'Weekly Academic Audit 📋',
      body: 'Take 5 minutes to review completed coursework, log study XP, and calibrate next week.',
      targetTime: weeklyTarget.toISOString(),
      category: 'briefings',
      route: '#/week',
      createdAt: now.toISOString(),
    });
    briefingsCount++;
  }

  // 7. Plan My Day Ritual
  if (notifSettings.categories.planMyDay?.enabled) {
    const planTime = notifSettings.categories.planMyDay.time || '08:00';
    const [pHour, pMin] = planTime.split(':').map(Number);
    const planTarget = new Date(now);
    planTarget.setHours(pHour, pMin, 0, 0);
    if (planTarget.getTime() <= now.getTime()) {
      planTarget.setDate(planTarget.getDate() + 1);
    }

    if (!isInQuietHours(planTarget, notifSettings.quietHours)) {
      const id = 'ritual-plan-my-day';
      expectedReminders.push({
        id,
        numericId: stringToNotificationId(id),
        title: 'Plan Your Day 🎯',
        body: "Pick 1-3 priorities for today's focus and review your lecture blocks.",
        targetTime: planTarget.toISOString(),
        category: 'briefings',
        route: '#/today?ritual=plan',
        createdAt: now.toISOString(),
      });
      briefingsCount++;
    }
  }

  // 8. Shutdown Ritual
  if (notifSettings.categories.shutdownRitual?.enabled) {
    const shutTime = notifSettings.categories.shutdownRitual.time || '21:00';
    const [sHour, sMin] = shutTime.split(':').map(Number);
    const shutTarget = new Date(now);
    shutTarget.setHours(sHour, sMin, 0, 0);
    if (shutTarget.getTime() <= now.getTime()) {
      shutTarget.setDate(shutTarget.getDate() + 1);
    }

    if (!isInQuietHours(shutTarget, notifSettings.quietHours)) {
      const id = 'ritual-daily-shutdown';
      expectedReminders.push({
        id,
        numericId: stringToNotificationId(id),
        title: 'Evening Shutdown & Reflection 🌙',
        body: 'Close your day: celebrate finished tasks, roll over unfinished ones, and collect XP.',
        targetTime: shutTarget.toISOString(),
        category: 'briefings',
        route: '#/today?ritual=shutdown',
        createdAt: now.toISOString(),
      });
      briefingsCount++;
    }
  }

  // =========================================================================
  // RECONCILIATION DIFFERENCING
  // =========================================================================
  const existingMap = new Map<string, ScheduledReminderRecord>(
    existingRecords.map((r) => [r.id, r])
  );
  const expectedMap = new Map<string, ScheduledReminderRecord>(
    expectedReminders.map((r) => [r.id, r])
  );

  // 1. Identify stale reminders to cancel
  const toCancelIds: number[] = [];
  const toRemoveKeys: string[] = [];
  for (const [key, oldRecord] of existingMap.entries()) {
    const isStillExpected = expectedMap.has(key);
    const isPast = new Date(oldRecord.targetTime).getTime() <= now.getTime();

    if (!isStillExpected || isPast) {
      toCancelIds.push(oldRecord.numericId);
      toRemoveKeys.push(key);
    }
  }

  if (toCancelIds.length > 0) {
    await cancelNativeLocalNotifications(toCancelIds);
    await db.scheduledReminders.bulkDelete(toRemoveKeys);
  }

  // 2. Identify new or updated reminders to schedule
  const channelMap: Record<string, string> = {
    classes: 'college_os_academic',
    tasks: 'college_os_tasks',
    exams: 'college_os_deadlines',
    habits: 'college_os_habits',
    finance: 'college_os_finance',
    briefings: 'college_os_briefings',
  };

  const toSaveRecords: ScheduledReminderRecord[] = [];
  for (const [key, newRecord] of expectedMap.entries()) {
    const old = existingMap.get(key);
    const hasChanged = !old || old.targetTime !== newRecord.targetTime || old.title !== newRecord.title;

    if (hasChanged) {
      const channelId = channelMap[newRecord.category] || 'college_os_academic';
      await scheduleNativeLocalNotification({
        id: newRecord.numericId,
        title: newRecord.title,
        body: newRecord.body,
        at: new Date(newRecord.targetTime),
        channelId,
        route: newRecord.route,
        extra: {
          reminderId: newRecord.id,
          category: newRecord.category,
          entityId: newRecord.entityId,
        },
      });
      toSaveRecords.push(newRecord);
    }
  }

  if (toSaveRecords.length > 0) {
    await db.scheduledReminders.bulkPut(toSaveRecords);
  }

  // Save last reconciled timestamp
  await db.settings.update('current_user', {
    'notificationSettings.lastReconciledAt': now.toISOString(),
  } as any);

  return {
    timestamp: now.toISOString(),
    enabled: true,
    activeCount: expectedReminders.length,
    classesScheduled: classesCount,
    tasksScheduled: tasksCount,
    examsScheduled: examsCount,
    habitsScheduled: habitsCount,
    financeScheduled: financeCount,
    briefingsScheduled: briefingsCount,
    canceledCount: toCancelIds.length,
  };
}

/**
 * Snoozes an active notification by rescheduling it for N minutes into the future.
 */
export async function snoozeReminder(
  numericId: number,
  minutes: number = 10
): Promise<boolean> {
  const reminder = await db.scheduledReminders.where('numericId').equals(numericId).first();
  if (!reminder) return false;

  const snoozedAt = new Date(Date.now() + Math.max(1, minutes) * 60 * 1000);
  reminder.targetTime = snoozedAt.toISOString();

  await scheduleNativeLocalNotification({
    id: reminder.numericId,
    title: `[Snoozed] ${reminder.title}`,
    body: reminder.body,
    at: snoozedAt,
    channelId: 'college_os_tasks',
    route: reminder.route,
  });

  await db.scheduledReminders.put(reminder);
  return true;
}

/**
 * Lifecycle hook called when a task is completed or deleted to instantly clear its alarm.
 */
export async function cancelTaskReminder(taskId: string): Promise<void> {
  const stableId = `task-${taskId}`;
  const numericId = stringToNotificationId(stableId);
  await cancelNativeLocalNotifications([numericId]);
  await db.scheduledReminders.delete(stableId);
}

/**
 * Lifecycle hook called when an exam is deleted or defeated.
 */
export async function cancelExamReminders(examId: string): Promise<void> {
  const ids = [
    stringToNotificationId(`exam-${examId}-3d`),
    stringToNotificationId(`exam-${examId}-1d`),
    stringToNotificationId(`exam-${examId}-morning`),
  ];
  await cancelNativeLocalNotifications(ids);
  await db.scheduledReminders.bulkDelete([
    `exam-${examId}-3d`,
    `exam-${examId}-1d`,
    `exam-${examId}-morning`,
  ]);
}
