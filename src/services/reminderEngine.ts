import { db } from '../db/db';
import {
  AppNotification,
  NotificationCategory,
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  ScheduledReminderRecord,
  Course,
} from '../types';
import {
  addDaysToKey,
  formatDayKey,
  getTodayKey,
  parseDayKey,
} from '../utils/dateUtils';
import { getHabitDayState, isHabitScheduledForDate } from '../utils/streakEngine';
import { awardXp } from './rpgService';
import {
  ANDROID_MAX_SCHEDULED_ALARMS,
  ACTION_TYPE_REMINDER,
  ACTION_TYPE_TASK,
  cancelNativeLocalNotifications,
  getDeliveredNativeNotificationIds,
  isNativeAndroid,
  registerNotificationEventCallbacks,
  scheduleNativeLocalNotification,
  stringToNotificationId,
  triggerTestNotification,
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
  goalsScheduled: number;
  canceledCount: number;
  nativeScheduledCount: number;
  cappedOverflowCount: number;
}

const CHANNEL_BY_REMINDER_CATEGORY: Record<string, string> = {
  classes: 'college_os_academic',
  tasks: 'college_os_tasks',
  exams: 'college_os_deadlines',
  habits: 'college_os_habits',
  finance: 'college_os_finance',
  briefings: 'college_os_briefings',
  goals: 'college_os_goals',
  focus: 'college_os_focus',
};

export function mapReminderCategoryToCenterCategory(
  category: ScheduledReminderRecord['category']
): NotificationCategory {
  switch (category) {
    case 'classes':
    case 'exams':
      return 'academics';
    case 'tasks':
      return 'tasks';
    case 'habits':
      return 'habits';
    case 'finance':
      return 'finance';
    case 'goals':
      return 'goals';
    case 'focus':
      return 'focus';
    case 'briefings':
    default:
      return 'briefings';
  }
}

/**
 * Normalizes College Life OS DayOfWeek (0=Mon..6=Sun) or legacy weekday string
 * into JS Date.getDay() index (0=Sun..6=Sat).
 */
export function resolveSessionJsDay(dayOfWeek: unknown): number | undefined {
  if (typeof dayOfWeek === 'number' && Number.isInteger(dayOfWeek) && dayOfWeek >= 0 && dayOfWeek <= 6) {
    return (dayOfWeek + 1) % 7;
  }

  const raw = String(dayOfWeek ?? '').trim().toLowerCase();
  if (/^[0-6]$/.test(raw)) {
    return (Number(raw) + 1) % 7;
  }

  const dayMap: Record<string, number> = {
    sunday: 0,
    sun: 0,
    monday: 1,
    mon: 1,
    tuesday: 2,
    tue: 2,
    wednesday: 3,
    wed: 3,
    thursday: 4,
    thu: 4,
    friday: 5,
    fri: 5,
    saturday: 6,
    sat: 6,
  };
  return dayMap[raw];
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
  }
  // e.g. 01:00 to 06:00
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
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
 * Helper to compute next date for a JS Date.getDay() index (0=Sun..6=Sat)
 */
function getNextDayOccurrence(jsDayOfWeek: number, timeStr: string, fromDate: Date = new Date()): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const target = new Date(fromDate);
  target.setHours(hours, minutes, 0, 0);

  const currentDay = target.getDay();
  let daysUntil = (jsDayOfWeek - currentDay + 7) % 7;

  // If it's today but the time has already passed, schedule for next week
  if (daysUntil === 0 && target.getTime() <= fromDate.getTime()) {
    daysUntil = 7;
  }

  target.setDate(target.getDate() + daysUntil);
  return target;
}

/**
 * Determines whether an AppNotification should be displayed in Notification Center right now.
 */
export function isNotificationVisibleInCenter(
  notification: AppNotification,
  nowMs: number = Date.now()
): boolean {
  if (notification.isDismissed || notification.isArchived) return false;
  if (notification.snoozedUntil) {
    const snoozeMs = new Date(notification.snoozedUntil).getTime();
    if (!Number.isNaN(snoozeMs) && snoozeMs > nowMs) return false;
  }
  if (notification.scheduledFor) {
    const schedMs = new Date(notification.scheduledFor).getTime();
    if (!Number.isNaN(schedMs) && schedMs > nowMs) return false;
  }
  return true;
}

async function materializeDueReminders(
  reminders: ScheduledReminderRecord[],
  now: Date
): Promise<number> {
  const nowMs = now.getTime();
  const existing = await db.appNotifications.toArray();
  const existingById = new Map(existing.map((n) => [n.id, n]));
  const toPut: AppNotification[] = [];

  for (const rem of reminders) {
    const targetMs = new Date(rem.targetTime).getTime();
    if (Number.isNaN(targetMs) || targetMs > nowMs) continue;

    const notifId = `notif-${rem.id}`;
    const prev = existingById.get(notifId);
    if (prev && (prev.isDismissed || prev.snoozedUntil)) continue;

    const centerCategory = mapReminderCategoryToCenterCategory(rem.category);
    const entry: AppNotification = {
      id: notifId,
      title: rem.title,
      description: rem.body,
      category: centerCategory,
      createdAt: prev?.createdAt || rem.targetTime,
      scheduledFor: rem.targetTime,
      deliveredAt: prev?.deliveredAt || now.toISOString(),
      isRead: prev?.isRead ?? false,
      isDismissed: prev?.isDismissed ?? false,
      priority: rem.category === 'exams' ? 'high' : 'normal',
      entityType: rem.category,
      entityId: rem.entityId,
      route: rem.route,
      actionType: rem.category === 'tasks' ? 'complete_task' : undefined,
      deliveryStatus: isNativeAndroid()
        ? prev?.deliveryStatus || 'delivered'
        : 'in_app_only',
      sourceReminderId: rem.id,
      numericId: rem.numericId,
      meta: rem.extra,
    };

    if (!prev || prev.title !== entry.title || prev.description !== entry.description) {
      toPut.push(entry);
    }
  }

  if (toPut.length > 0) {
    await db.appNotifications.bulkPut(toPut);
  }
  return toPut.length;
}

/**
 * Reconciles the authoritative College Life OS database with scheduled notifications.
 * Removes obsolete records, updates modified deadlines, caps native alarms to 50,
 * and schedules upcoming reminders.
 */
export async function reconcileAllReminders(nowDate?: Date): Promise<ReconciliationReport> {
  const settings = await db.settings.get('current_user');
  const notifSettings: NotificationSettings =
    settings?.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;

  const now = nowDate ? new Date(nowDate) : new Date();
  const existingRecords = await db.scheduledReminders.toArray();
  const expectedReminders: ScheduledReminderRecord[] = [];

  // If master toggle is disabled, cancel all pending alarms & remove un-triggered future records
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
      goalsScheduled: 0,
      canceledCount: existingRecords.length,
      nativeScheduledCount: 0,
      cappedOverflowCount: 0,
    };
  }

  // First surface any reminders whose targetTime elapsed while the app was closed
  await materializeDueReminders(existingRecords, now);

  let classesCount = 0;
  let tasksCount = 0;
  let examsCount = 0;
  let habitsCount = 0;
  let financeCount = 0;
  let briefingsCount = 0;
  let goalsCount = 0;

  const [courses, sessions, exceptions, tasks, allExams, projects, debts, recurring, academicGoals] =
    await Promise.all([
      db.courses.toArray(),
      db.classSessions.toArray(),
      db.classExceptions.toArray(),
      db.tasks.where('status').equals('todo').toArray(),
      db.exams.toArray(),
      db.projects.toArray(),
      db.debts.toArray(),
      db.recurringTransactions.toArray(),
      db.academicGoals.toArray(),
    ]);

  const courseMap = new Map<string, Course>(courses.map((c) => [c.id, c]));

  // =========================================================================
  // 1. CLASSES & ACADEMIC EVENTS
  // =========================================================================
  if (notifSettings.categories.classes.enabled) {
    const leadMins = notifSettings.categories.classes.leadTimeMinutes || 30;

    for (const session of sessions) {
      const course = courseMap.get(session.courseId);
      if (!course) continue;

      const jsDayNum = resolveSessionJsDay(session.dayOfWeek);
      if (jsDayNum === undefined) continue;

      const classStart = getNextDayOccurrence(jsDayNum, session.startTime, now);
      const dateKey = formatDayKey(classStart);

      const ex = exceptions.find((e) => e.sessionId === session.id && e.date === dateKey);
      if (ex) {
        if (ex.action === 'cancelled') continue;
        if (ex.action === 'moved' && ex.newDate && ex.newDate !== dateKey) {
          continue;
        }
      }

      const effectiveStartTime = ex?.action === 'moved' && ex.newStartTime ? ex.newStartTime : session.startTime;
      const effectiveClassStart =
        ex?.action === 'moved' && ex.newStartTime
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
      expectedReminders.push({
        id: stableId,
        numericId: stringToNotificationId(stableId),
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

    // Schedule reminders for moved/rescheduled classes on their target dates
    for (const ex of exceptions) {
      if (ex.action === 'moved' && ex.newDate) {
        const session = sessions.find((s) => s.id === ex.sessionId);
        if (!session) continue;
        const course = courseMap.get(session.courseId);
        if (!course) continue;

        const effectiveTime = ex.newStartTime || session.startTime;
        const [h, m] = effectiveTime.split(':').map((x) => parseInt(x, 10));
        const rescheduledStart = new Date(
          `${ex.newDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
        );
        if (Number.isNaN(rescheduledStart.getTime())) continue;

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
        expectedReminders.push({
          id: stableId,
          numericId: stringToNotificationId(stableId),
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
    const leadRule = notifSettings.categories.tasks.defaultLeadTime || '1d';
    const defTime = notifSettings.categories.tasks.defaultTime || '09:00';

    for (const task of tasks) {
      if (!task.dueDate) continue;

      const timePart = task.dueTime || defTime;
      const dueDateTime = new Date(`${task.dueDate}T${timePart}:00`);
      if (Number.isNaN(dueDateTime.getTime())) continue;

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

      expectedReminders.push({
        id: stableId,
        numericId: stringToNotificationId(stableId),
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
  // 3. EXAMS & PROJECTS
  // =========================================================================
  if (notifSettings.categories.exams.enabled) {
    const exams = allExams.filter((e) => !e.isDefeated);
    const configuredLeadDays =
      Array.isArray(notifSettings.categories.exams.leadDays) &&
      notifSettings.categories.exams.leadDays.length > 0
        ? notifSettings.categories.exams.leadDays
        : [3, 1];

    for (const exam of exams) {
      if (!exam.examDate) continue;
      const examTime = exam.startTime || '09:00';
      const examDateObj = new Date(`${exam.examDate}T${examTime}:00`);
      if (Number.isNaN(examDateObj.getTime())) continue;

      const course = courseMap.get(exam.courseId);
      const courseLabel = course ? `${course.code}: ` : '';

      for (const leadDay of configuredLeadDays) {
        if (leadDay <= 0) continue;
        const tMinus = new Date(examDateObj.getTime() - leadDay * 24 * 60 * 60 * 1000);
        tMinus.setHours(9, 0, 0, 0);
        if (tMinus.getTime() > now.getTime()) {
          const adjusted = adjustForQuietHours(tMinus, examDateObj, notifSettings.quietHours, true);
          if (adjusted) {
            const id = `exam-${exam.id}-${leadDay}d`;
            expectedReminders.push({
              id,
              numericId: stringToNotificationId(id),
              title:
                leadDay === 1
                  ? `Exam Tomorrow: ${courseLabel}${exam.title}`
                  : `Exam in ${leadDay} Days: ${courseLabel}${exam.title}`,
              body: `Scheduled for ${exam.examDate} at ${exam.startTime}. Hall: ${exam.hall || 'TBA'}.`,
              targetTime: adjusted.toISOString(),
              category: 'exams',
              route: '#/exams',
              entityId: exam.id,
              createdAt: now.toISOString(),
            });
            examsCount++;
          }
        }
      }

      if (notifSettings.categories.exams.notifyOnExamMorning) {
        const morningDate = new Date(`${exam.examDate}T07:00:00`);
        if (morningDate.getTime() > now.getTime() && morningDate.getTime() < examDateObj.getTime()) {
          const id = `exam-${exam.id}-morning`;
          expectedReminders.push({
            id,
            numericId: stringToNotificationId(id),
            title: `Exam Today: ${courseLabel}${exam.title}`,
            body: `Begins at ${exam.startTime} in ${exam.hall || 'designated hall'}.`,
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

    for (const proj of projects) {
      if (!proj.deadline || proj.status === 'submitted' || proj.status === 'graded') continue;
      const projDate = new Date(`${proj.deadline}T17:00:00`);
      if (Number.isNaN(projDate.getTime())) continue;

      const tMinus1 = new Date(projDate.getTime() - 24 * 60 * 60 * 1000);
      tMinus1.setHours(10, 0, 0, 0);
      if (tMinus1.getTime() > now.getTime()) {
        const adjustedProj = adjustForQuietHours(tMinus1, projDate, notifSettings.quietHours, false);
        if (!adjustedProj) continue;
        const id = `project-${proj.id}-1d`;
        expectedReminders.push({
          id,
          numericId: stringToNotificationId(id),
          title: `Project Due Tomorrow: ${proj.title}`,
          body: `Submission deadline is ${proj.deadline}. Status: ${proj.status.toUpperCase()}.`,
          targetTime: adjustedProj.toISOString(),
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
  // 4. ACADEMIC GOALS
  // =========================================================================
  if (notifSettings.categories.goals?.enabled !== false) {
    const goalLeadDays =
      notifSettings.categories.goals?.leadDays && notifSettings.categories.goals.leadDays.length > 0
        ? notifSettings.categories.goals.leadDays
        : [3, 1];

    for (const goal of academicGoals) {
      if (!goal.targetDate || goal.status === 'completed' || goal.status === 'paused') continue;
      const targetEndOfDay = new Date(`${goal.targetDate}T18:00:00`);
      if (Number.isNaN(targetEndOfDay.getTime())) continue;

      for (const leadDay of goalLeadDays) {
        const trigger = new Date(targetEndOfDay.getTime() - leadDay * 24 * 60 * 60 * 1000);
        trigger.setHours(9, 0, 0, 0);
        if (trigger.getTime() <= now.getTime()) continue;

        const adjusted = adjustForQuietHours(
          trigger,
          targetEndOfDay,
          notifSettings.quietHours,
          false
        );
        if (!adjusted) continue;

        const id = `goal-${goal.id}-${leadDay}d`;
        expectedReminders.push({
          id,
          numericId: stringToNotificationId(id),
          title:
            leadDay === 1
              ? `Goal Target Tomorrow: ${goal.title}`
              : `Goal Target in ${leadDay} Days: ${goal.title}`,
          body: `Target date: ${goal.targetDate}. Progress: ${goal.progressPercent}%`,
          targetTime: adjusted.toISOString(),
          category: 'goals',
          route: '#/goals',
          entityId: goal.id,
          createdAt: now.toISOString(),
        });
        goalsCount++;
      }
    }
  }

  // =========================================================================
  // 5. HABITS LOGGING (Recurrence & completion-aware)
  // =========================================================================
  const habitRepeatMode = notifSettings.categories.habits.repeatMode ?? 'scheduled_only';
  if (notifSettings.categories.habits.enabled && habitRepeatMode !== 'off') {
    const [allHabits, allHabitLogs, allRestDays] = await Promise.all([
      db.habits.toArray(),
      db.habitLogs.toArray(),
      db.restDays.toArray(),
    ]);
    const activeHabits = allHabits.filter((h) => !h.status || h.status === 'active');

    if (activeHabits.length > 0) {
      const habitTime = notifSettings.categories.habits.defaultTime || '20:00';
      const [hHour, hMin] = habitTime.split(':').map(Number);
      const todayKey = formatDayKey(now);

      for (let offset = 0; offset <= 7; offset++) {
        const checkDateKey = addDaysToKey(todayKey, offset);
        const candidateDate = parseDayKey(checkDateKey);
        candidateDate.setHours(hHour, hMin, 0, 0);
        if (candidateDate.getTime() <= now.getTime()) continue;

        const habitsForDay =
          habitRepeatMode === 'daily'
            ? activeHabits
            : activeHabits.filter((h) => isHabitScheduledForDate(h, checkDateKey));

        if (habitsForDay.length === 0) continue;

        const pendingHabits = habitsForDay.filter((h) => {
          const dayState = getHabitDayState(h, allHabitLogs, allRestDays, checkDateKey, todayKey);
          return dayState.state !== 'completed' && dayState.state !== 'partial' && dayState.state !== 'rested';
        });

        if (pendingHabits.length === 0) continue;

        const endOfDay = new Date(candidateDate);
        endOfDay.setHours(23, 59, 0, 0);
        const adjusted = adjustForQuietHours(candidateDate, endOfDay, notifSettings.quietHours, false);
        if (!adjusted) continue;

        const id = 'habit-daily-checkin';
        expectedReminders.push({
          id,
          numericId: stringToNotificationId(id),
          title:
            pendingHabits.length === 1
              ? `Habit Check-in: ${pendingHabits[0].title}`
              : `Daily Habit Check-in (${pendingHabits.length} remaining)`,
          body: 'Take 2 minutes to log your habits for the day.',
          targetTime: adjusted.toISOString(),
          category: 'habits',
          route: '#/habits',
          createdAt: now.toISOString(),
        });
        habitsCount++;
        break;
      }
    }
  }

  // =========================================================================
  // 6. FINANCE & PAYMENT DUE DATES
  // =========================================================================
  if (notifSettings.categories.finance.enabled) {
    for (const debt of debts) {
      if (debt.status === 'settled' || !debt.dueDate) continue;
      if (debt.type !== 'owe' && debt.type !== 'payable') continue;

      const debtDate = new Date(`${debt.dueDate}T10:00:00`);
      if (Number.isNaN(debtDate.getTime())) continue;

      const trigger = new Date(debtDate.getTime() - 24 * 60 * 60 * 1000);
      trigger.setHours(10, 0, 0, 0);
      if (trigger.getTime() <= now.getTime()) continue;

      const adjusted = adjustForQuietHours(trigger, debtDate, notifSettings.quietHours, false);
      if (!adjusted) continue;

      const person = debt.personName || debt.person || 'creditor';
      const amount = debt.remainingAmount || debt.amount || 0;
      const id = `debt-${debt.id}`;

      expectedReminders.push({
        id,
        numericId: stringToNotificationId(id),
        title: `Payment Due Tomorrow: ${person}`,
        body: `Due date: ${debt.dueDate}. Remaining payment: ${amount} ETB.`,
        targetTime: adjusted.toISOString(),
        category: 'finance',
        route: '#/finance',
        entityId: debt.id,
        createdAt: now.toISOString(),
      });
      financeCount++;
    }

    for (const rec of recurring) {
      if (rec.isActive === false || !rec.nextDueDate) continue;
      const recDate = new Date(`${rec.nextDueDate}T10:00:00`);
      if (Number.isNaN(recDate.getTime())) continue;

      const trigger = new Date(recDate.getTime() - 24 * 60 * 60 * 1000);
      trigger.setHours(10, 0, 0, 0);
      if (trigger.getTime() <= now.getTime()) continue;

      const adjusted = adjustForQuietHours(trigger, recDate, notifSettings.quietHours, false);
      if (!adjusted) continue;

      const id = `recurring-${rec.id}`;
      expectedReminders.push({
        id,
        numericId: stringToNotificationId(id),
        title: `Upcoming Expense: ${rec.title || 'Recurring Bill'}`,
        body: `${rec.amount} ETB scheduled for ${rec.nextDueDate}.`,
        targetTime: adjusted.toISOString(),
        category: 'finance',
        route: '#/finance',
        entityId: rec.id,
        createdAt: now.toISOString(),
      });
      financeCount++;
    }
  }

  // =========================================================================
  // 7. DAILY BRIEFING, WEEKLY REVIEW & RITUALS
  // =========================================================================
  if (notifSettings.categories.dailyBriefing.enabled) {
    const briefTime = notifSettings.categories.dailyBriefing.time || '07:30';
    const [bHour, bMin] = briefTime.split(':').map(Number);
    const briefTarget = new Date(now);
    briefTarget.setHours(bHour, bMin, 0, 0);
    if (briefTarget.getTime() <= now.getTime()) {
      briefTarget.setDate(briefTarget.getDate() + 1);
    }

    if (!isInQuietHours(briefTarget, notifSettings.quietHours)) {
      const id = 'briefing-morning-daily';
      expectedReminders.push({
        id,
        numericId: stringToNotificationId(id),
        title: `Morning Briefing — ${settings?.userName || 'Scholar'}`,
        body: 'Check your schedule, lectures, and priorities for today.',
        targetTime: briefTarget.toISOString(),
        category: 'briefings',
        route: '#/',
        createdAt: now.toISOString(),
      });
      briefingsCount++;
    }
  }

  if (notifSettings.categories.weeklyReview.enabled) {
    const wDay = notifSettings.categories.weeklyReview.dayOfWeek ?? 0;
    const wTime = notifSettings.categories.weeklyReview.time || '19:00';
    const weeklyTarget = getNextDayOccurrence(wDay, wTime, now);

    if (!isInQuietHours(weeklyTarget, notifSettings.quietHours)) {
      const id = 'review-weekly-audit';
      expectedReminders.push({
        id,
        numericId: stringToNotificationId(id),
        title: 'Weekly Academic Audit',
        body: 'Take 5 minutes to review completed coursework and calibrate next week.',
        targetTime: weeklyTarget.toISOString(),
        category: 'briefings',
        route: '#/rituals',
        createdAt: now.toISOString(),
      });
      briefingsCount++;
    }
  }

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
        title: 'Plan Your Day',
        body: "Pick 1-3 priorities for today's focus and review your lecture blocks.",
        targetTime: planTarget.toISOString(),
        category: 'briefings',
        route: '#/today?ritual=plan',
        createdAt: now.toISOString(),
      });
      briefingsCount++;
    }
  }

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
        title: 'Evening Shutdown & Reflection',
        body: 'Close your day: review finished tasks and roll over unfinished ones.',
        targetTime: shutTarget.toISOString(),
        category: 'briefings',
        route: '#/today?ritual=shutdown',
        createdAt: now.toISOString(),
      });
      briefingsCount++;
    }
  }

  // =========================================================================
  // PRIORITIZATION & ANDROID 50-ALARM CAP RECONCILIATION
  // =========================================================================
  expectedReminders.sort(
    (a, b) => new Date(a.targetTime).getTime() - new Date(b.targetTime).getTime()
  );

  const nativeWindowIds = new Set(
    expectedReminders.slice(0, ANDROID_MAX_SCHEDULED_ALARMS).map((r) => r.id)
  );
  const nativeScheduledCount = nativeWindowIds.size;
  const cappedOverflowCount = Math.max(0, expectedReminders.length - nativeScheduledCount);

  const existingMap = new Map<string, ScheduledReminderRecord>(
    existingRecords.map((r) => [r.id, r])
  );
  const expectedMap = new Map<string, ScheduledReminderRecord>(
    expectedReminders.map((r) => [r.id, r])
  );

  // 1. Identify stale reminders or demoted overflow alarms to cancel natively
  const toCancelNativeIds: number[] = [];
  const toRemoveDbKeys: string[] = [];
  for (const [key, oldRecord] of existingMap.entries()) {
    const isStillExpected = expectedMap.has(key);
    const isPast = new Date(oldRecord.targetTime).getTime() <= now.getTime();
    const demotedOutOfCap = isStillExpected && !nativeWindowIds.has(key);

    if (!isStillExpected || isPast) {
      toCancelNativeIds.push(oldRecord.numericId);
      toRemoveDbKeys.push(key);
    } else if (demotedOutOfCap) {
      toCancelNativeIds.push(oldRecord.numericId);
    }
  }

  if (toCancelNativeIds.length > 0) {
    await cancelNativeLocalNotifications(toCancelNativeIds);
  }
  if (toRemoveDbKeys.length > 0) {
    await db.scheduledReminders.bulkDelete(toRemoveDbKeys);
  }

  // 2. Schedule new/updated reminders within Android's 50-alarm window
  const toSaveRecords: ScheduledReminderRecord[] = [];
  for (const [key, newRecord] of expectedMap.entries()) {
    const shouldScheduleNatively = nativeWindowIds.has(key);
    const old = existingMap.get(key);
    const wasNativelyScheduled = old?.extra?.nativeScheduled !== false;
    const hasChanged =
      !old ||
      old.targetTime !== newRecord.targetTime ||
      old.title !== newRecord.title ||
      old.body !== newRecord.body ||
      wasNativelyScheduled !== shouldScheduleNatively;

    if (hasChanged) {
      if (shouldScheduleNatively) {
        const channelId = CHANNEL_BY_REMINDER_CATEGORY[newRecord.category] || 'college_os_academic';
        await scheduleNativeLocalNotification({
          id: newRecord.numericId,
          title: newRecord.title,
          body: newRecord.body,
          at: new Date(newRecord.targetTime),
          channelId,
          route: newRecord.route,
          actionTypeId: newRecord.category === 'tasks' ? ACTION_TYPE_TASK : ACTION_TYPE_REMINDER,
          extra: {
            reminderId: newRecord.id,
            category: newRecord.category,
            entityId: newRecord.entityId,
          },
        });
      }

      toSaveRecords.push({
        ...newRecord,
        extra: {
          ...(newRecord.extra || {}),
          nativeScheduled: shouldScheduleNatively,
        },
      });
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
    goalsScheduled: goalsCount,
    canceledCount: toRemoveDbKeys.length,
    nativeScheduledCount,
    cappedOverflowCount,
  };
}

/**
 * Synchronizes due scheduled reminders, overdue tasks, and native delivery statuses
 * into the persistent in-app Notification Center (`db.appNotifications`).
 */
export async function syncNotificationCenter(nowDate?: Date): Promise<{
  surfacedCount: number;
  overdueCount: number;
}> {
  const now = nowDate ? new Date(nowDate) : new Date();
  const todayKey = formatDayKey(now);

  const settings = await db.settings.get('current_user');
  const notifSettings: NotificationSettings =
    settings?.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;

  const [reminders, existingNotifications, tasks, courses] = await Promise.all([
    db.scheduledReminders.toArray(),
    db.appNotifications.toArray(),
    db.tasks.toArray(),
    db.courses.toArray(),
  ]);

  const surfacedCount = await materializeDueReminders(reminders, now);

  // Sync overdue tasks & clean up overdue notices when tasks complete or get deleted
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const existingById = new Map(existingNotifications.map((n) => [n.id, n]));
  const courseMap = new Map(courses.map((c) => [c.id, c]));

  let overdueCount = 0;
  const overdueToPut: AppNotification[] = [];
  const staleTaskNotifIds: string[] = [];

  for (const n of existingNotifications) {
    if (n.entityType === 'tasks' || n.entityType === 'task') {
      if (!n.entityId) continue;
      const task = taskMap.get(n.entityId);
      if (!task || task.status === 'done') {
        staleTaskNotifIds.push(n.id);
      }
    }
  }

  if (notifSettings.enabled && notifSettings.categories.tasks.overdueReminders !== false) {
    for (const task of tasks) {
      if (task.status !== 'todo' || !task.dueDate) continue;

      const isOverdue =
        task.dueDate < todayKey ||
        (task.dueDate === todayKey &&
          Boolean(task.dueTime) &&
          new Date(`${task.dueDate}T${task.dueTime}:00`).getTime() < now.getTime());

      const notifId = `overdue-task-${task.id}`;
      const prev = existingById.get(notifId);

      if (!isOverdue) {
        if (prev && !prev.isDismissed) staleTaskNotifIds.push(notifId);
        continue;
      }

      if (prev?.isDismissed) continue;

      overdueCount++;
      const course = task.courseId ? courseMap.get(task.courseId) : null;
      const courseTag = course ? `[${course.code}] ` : '';

      if (!prev) {
        overdueToPut.push({
          id: notifId,
          title: `Overdue Task: ${courseTag}${task.title}`,
          description: `Was due ${task.dueDate}${task.dueTime ? ` at ${task.dueTime}` : ''}. Complete or reschedule when ready.`,
          category: 'tasks',
          createdAt: now.toISOString(),
          scheduledFor: now.toISOString(),
          deliveredAt: now.toISOString(),
          isRead: false,
          isDismissed: false,
          priority: task.priority === 'high' ? 'high' : 'normal',
          entityType: 'task',
          entityId: task.id,
          route: '#/tasks',
          actionType: 'complete_task',
          deliveryStatus: 'in_app_only',
          numericId: stringToNotificationId(notifId),
        });
      }
    }
  }

  if (overdueToPut.length > 0) {
    await db.appNotifications.bulkPut(overdueToPut);
  }
  if (staleTaskNotifIds.length > 0) {
    await db.appNotifications.bulkDelete(staleTaskNotifIds);
  }

  // Reconcile native Android delivered tray notifications
  if (isNativeAndroid()) {
    const deliveredIds = new Set(await getDeliveredNativeNotificationIds());
    if (deliveredIds.size > 0) {
      const updated = await db.appNotifications.toArray();
      const deliveredToUpdate: AppNotification[] = [];
      for (const n of updated) {
        if (n.numericId && deliveredIds.has(n.numericId) && n.deliveryStatus !== 'delivered') {
          deliveredToUpdate.push({
            ...n,
            deliveryStatus: 'delivered',
            deliveredAt: n.deliveredAt || now.toISOString(),
          });
        }
      }
      if (deliveredToUpdate.length > 0) {
        await db.appNotifications.bulkPut(deliveredToUpdate);
      }
    }
  }

  return { surfacedCount, overdueCount };
}

/**
 * Emits a Focus / Pomodoro completion notification into the Notification Center
 * and triggers a native Android local notification (respecting quiet hours & zero browser Push).
 */
export async function emitFocusNotification(params: {
  phase: 'work' | 'short_break' | 'long_break';
  minutes: number;
  courseId?: string;
  taskTitle?: string;
}): Promise<AppNotification | null> {
  const settings = await db.settings.get('current_user');
  const notifSettings: NotificationSettings =
    settings?.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;

  if (notifSettings.categories.focus?.enabled === false) return null;
  if (params.phase !== 'work' && notifSettings.categories.focus?.notifyBreakEnd === false) {
    return null;
  }

  const now = new Date();
  const inQuietHours = isInQuietHours(now, notifSettings.quietHours);
  const title =
    params.phase === 'work'
      ? `Focus Session Complete (${params.minutes}m)`
      : params.phase === 'long_break'
      ? 'Long Break Finished'
      : 'Short Break Finished';

  const body =
    params.phase === 'work'
      ? params.taskTitle
        ? `Completed ${params.minutes}m focus on "${params.taskTitle}". Take a breather.`
        : `Completed ${params.minutes}m of deep focus. Time for a short break.`
      : 'Break is complete. Ready when you want to start your next block.';

  const id = `focus-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`;
  const numericId = stringToNotificationId(id);
  const shouldDeliverNatively = isNativeAndroid() && notifSettings.enabled && !inQuietHours;

  const record: AppNotification = {
    id,
    title,
    description: body,
    category: 'focus',
    createdAt: now.toISOString(),
    scheduledFor: now.toISOString(),
    deliveredAt: now.toISOString(),
    isRead: false,
    isDismissed: false,
    priority: 'normal',
    entityType: 'focus',
    entityId: params.courseId,
    route: '#/focus',
    deliveryStatus: shouldDeliverNatively ? 'delivered' : 'in_app_only',
    numericId,
  };

  await db.appNotifications.put(record);

  if (shouldDeliverNatively) {
    await scheduleNativeLocalNotification({
      id: numericId,
      title,
      body,
      at: new Date(Date.now() + 250),
      channelId: 'college_os_focus',
      route: '#/focus',
      actionTypeId: ACTION_TYPE_REMINDER,
      extra: {
        notificationId: id,
        category: 'focus',
      },
    });
  }

  return record;
}

/**
 * Generates an offline test notification both in Notification Center and (if APK) Android shade.
 */
export async function createTestAppNotification(): Promise<{
  success: boolean;
  message: string;
  notification: AppNotification;
}> {
  const now = new Date();
  const id = `test-notification-${now.getTime()}`;
  const numericId = stringToNotificationId(id);

  const notification: AppNotification = {
    id,
    title: 'College Life OS — Test Alert',
    description: isNativeAndroid()
      ? 'Android local notifications and in-app Notification Center are active.'
      : 'Notification Center is active. Native Android shade alerts activate automatically in the APK build.',
    category: 'academics',
    createdAt: now.toISOString(),
    scheduledFor: now.toISOString(),
    deliveredAt: now.toISOString(),
    isRead: false,
    isDismissed: false,
    priority: 'normal',
    entityType: 'test',
    route: '#/notification-settings',
    deliveryStatus: isNativeAndroid() ? 'scheduled' : 'in_app_only',
    numericId,
  };

  await db.appNotifications.put(notification);
  const nativeRes = await triggerTestNotification(2);

  return {
    success: nativeRes.success,
    message: nativeRes.message,
    notification,
  };
}

export async function markNotificationRead(id: string): Promise<void> {
  await db.appNotifications.update(id, { isRead: true });
}

export async function markAllNotificationsRead(): Promise<void> {
  const all = await db.appNotifications.toArray();
  const unread = all.filter((n) => !n.isRead && !n.isDismissed).map((n) => ({ ...n, isRead: true }));
  if (unread.length > 0) {
    await db.appNotifications.bulkPut(unread);
  }
}

export async function dismissNotification(id: string): Promise<void> {
  const n = await db.appNotifications.get(id);
  if (!n) return;
  if (n.numericId) {
    await cancelNativeLocalNotifications([n.numericId]);
  }
  await db.appNotifications.update(id, { isDismissed: true, isRead: true });
}

export async function clearReadNotifications(): Promise<void> {
  const all = await db.appNotifications.toArray();
  const readActive = all
    .filter((n) => n.isRead && !n.isDismissed)
    .map((n) => ({ ...n, isDismissed: true }));
  if (readActive.length > 0) {
    await db.appNotifications.bulkPut(readActive);
  }
}

/**
 * Snoozes a pending scheduled reminder by native numericId.
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
    channelId: CHANNEL_BY_REMINDER_CATEGORY[reminder.category] || 'college_os_tasks',
    route: reminder.route,
    actionTypeId: reminder.category === 'tasks' ? ACTION_TYPE_TASK : ACTION_TYPE_REMINDER,
    extra: {
      reminderId: reminder.id,
      category: reminder.category,
      entityId: reminder.entityId,
    },
  });

  await db.scheduledReminders.put(reminder);
  return true;
}

/**
 * Snoozes an AppNotification in the Notification Center and reschedules native OS delivery.
 */
export async function snoozeAppNotification(
  notificationId: string,
  minutes?: number
): Promise<boolean> {
  const notification = await db.appNotifications.get(notificationId);
  if (!notification) return false;

  const settings = await db.settings.get('current_user');
  const defaultSnooze = settings?.notificationSettings?.snoozeDurationMinutes || 10;
  const snoozeMins = Math.max(1, minutes ?? defaultSnooze);
  const snoozeAt = new Date(Date.now() + snoozeMins * 60 * 1000);
  const numericId = notification.numericId || stringToNotificationId(notification.id);

  await db.appNotifications.update(notification.id, {
    isRead: true,
    scheduledFor: snoozeAt.toISOString(),
    snoozedUntil: snoozeAt.toISOString(),
    numericId,
    deliveryStatus: isNativeAndroid() ? 'scheduled' : 'in_app_only',
  });

  if (notification.sourceReminderId) {
    const rem = await db.scheduledReminders.get(notification.sourceReminderId);
    if (rem) {
      await snoozeReminder(rem.numericId, snoozeMins);
      return true;
    }
  }

  await scheduleNativeLocalNotification({
    id: numericId,
    title: `[Snoozed] ${notification.title}`,
    body: notification.description,
    at: snoozeAt,
    channelId:
      notification.category === 'focus'
        ? 'college_os_focus'
        : notification.category === 'goals'
        ? 'college_os_goals'
        : 'college_os_tasks',
    route: notification.route || '#/',
    actionTypeId: notification.actionType === 'complete_task' ? ACTION_TYPE_TASK : ACTION_TYPE_REMINDER,
    extra: {
      notificationId: notification.id,
      entityId: notification.entityId,
      category: notification.category,
    },
  });

  return true;
}

/**
 * Completes a task directly from an in-app or Android shade notification.
 */
export async function completeTaskFromNotification(
  notification: AppNotification
): Promise<boolean> {
  if (!notification.entityId) return false;
  const task = await db.tasks.get(notification.entityId);
  const nowIso = new Date().toISOString();

  if (task && task.status !== 'done') {
    await db.tasks.update(task.id, {
      status: 'done',
      completedAt: nowIso,
      updatedAt: nowIso,
    });
    const xpAmount = task.priority === 'high' ? 40 : task.priority === 'medium' ? 25 : 15;
    await awardXp({
      source: 'task',
      sourceId: task.id,
      amount: xpAmount,
      stat: 'discipline',
    }).catch(console.warn);
  }

  await cancelTaskReminder(notification.entityId);
  await db.appNotifications.update(notification.id, {
    isRead: true,
    isDismissed: true,
  });

  return true;
}

/**
 * Lifecycle hook called when a task is completed or deleted to instantly clear its alarm.
 */
export async function cancelTaskReminder(taskId: string): Promise<void> {
  const stableId = `task-${taskId}`;
  const overdueId = `overdue-task-${taskId}`;
  const numericIds = [
    stringToNotificationId(stableId),
    stringToNotificationId(overdueId),
  ];
  await cancelNativeLocalNotifications(numericIds);
  await db.scheduledReminders.delete(stableId);

  const related = (await db.appNotifications.toArray()).filter(
    (n) => n.entityId === taskId || n.id === `notif-${stableId}` || n.id === overdueId
  );
  if (related.length > 0) {
    await db.appNotifications.bulkPut(
      related.map((n) => ({
        ...n,
        isRead: true,
        isDismissed: true,
        deliveryStatus: 'cancelled' as const,
      }))
    );
  }
}

/**
 * Lifecycle hook called when an exam is deleted or defeated.
 */
export async function cancelExamReminders(examId: string): Promise<void> {
  const scheduled = (await db.scheduledReminders.toArray()).filter(
    (r) => r.entityId === examId || r.id.startsWith(`exam-${examId}-`)
  );
  const fallbackIds = [
    `exam-${examId}-3d`,
    `exam-${examId}-1d`,
    `exam-${examId}-morning`,
  ];
  const allReminderKeys = Array.from(new Set([...scheduled.map((s) => s.id), ...fallbackIds]));
  const numericIds = allReminderKeys.map((k) => stringToNotificationId(k));

  await cancelNativeLocalNotifications(numericIds);
  await db.scheduledReminders.bulkDelete(allReminderKeys);

  const pendingNotifs = (await db.appNotifications.toArray()).filter(
    (n) => n.entityId === examId && !n.isDismissed
  );
  if (pendingNotifs.length > 0) {
    await db.appNotifications.bulkPut(
      pendingNotifs.map((n) => ({
        ...n,
        isDismissed: true,
        deliveryStatus: 'cancelled' as const,
      }))
    );
  }
}

/**
 * Lifecycle hook called when a project is submitted/graded or deleted.
 */
export async function cancelProjectReminders(projectId: string): Promise<void> {
  const stableId = `project-${projectId}-1d`;
  await cancelNativeLocalNotifications([stringToNotificationId(stableId)]);
  await db.scheduledReminders.delete(stableId);

  const pendingNotifs = (await db.appNotifications.toArray()).filter(
    (n) => n.entityId === projectId && !n.isDismissed
  );
  if (pendingNotifs.length > 0) {
    await db.appNotifications.bulkPut(
      pendingNotifs.map((n) => ({
        ...n,
        isDismissed: true,
        deliveryStatus: 'cancelled' as const,
      }))
    );
  }
}

/**
 * Lifecycle hook called when an academic goal is completed, paused, or deleted.
 */
export async function cancelGoalReminders(goalId: string): Promise<void> {
  const scheduled = (await db.scheduledReminders.toArray()).filter(
    (r) => r.entityId === goalId || r.id.startsWith(`goal-${goalId}-`)
  );
  const allKeys = Array.from(
    new Set([
      ...scheduled.map((s) => s.id),
      `goal-${goalId}-3d`,
      `goal-${goalId}-1d`,
    ])
  );
  await cancelNativeLocalNotifications(allKeys.map((k) => stringToNotificationId(k)));
  await db.scheduledReminders.bulkDelete(allKeys);

  const pendingNotifs = (await db.appNotifications.toArray()).filter(
    (n) => n.entityId === goalId && !n.isDismissed
  );
  if (pendingNotifs.length > 0) {
    await db.appNotifications.bulkPut(
      pendingNotifs.map((n) => ({
        ...n,
        isDismissed: true,
        deliveryStatus: 'cancelled' as const,
      }))
    );
  }
}

/**
 * Connects native Android notification listeners (received & action buttons)
 * back to Notification Center & task state.
 */
export function registerReminderActionHandlers(
  onNavigate?: (route: string) => void
): void {
  registerNotificationEventCallbacks({
    onReceived: async ({ id, extra }) => {
      const notifId = extra?.notificationId || (extra?.reminderId ? `notif-${extra.reminderId}` : null);
      if (notifId) {
        const existing = await db.appNotifications.get(notifId);
        if (existing) {
          await db.appNotifications.update(notifId, {
            deliveryStatus: 'delivered',
            deliveredAt: new Date().toISOString(),
          });
          return;
        }
      }

      const byNum = (await db.appNotifications.toArray()).find((n) => n.numericId === id);
      if (byNum) {
        await db.appNotifications.update(byNum.id, {
          deliveryStatus: 'delivered',
          deliveredAt: new Date().toISOString(),
        });
      } else {
        await syncNotificationCenter();
      }
    },
    onActionPerformed: async ({ actionId, id, extra }) => {
      const candidateId =
        extra?.notificationId || (extra?.reminderId ? `notif-${extra.reminderId}` : undefined);
      let notif = candidateId ? await db.appNotifications.get(candidateId) : undefined;
      if (!notif) {
        notif = (await db.appNotifications.toArray()).find((n) => n.numericId === id);
      }

      if (actionId === 'complete_task') {
        if (notif) {
          await completeTaskFromNotification(notif);
        } else if (extra?.entityId) {
          await completeTaskFromNotification({
            id: candidateId || `task-${extra.entityId}`,
            title: 'Task',
            description: '',
            category: 'tasks',
            createdAt: new Date().toISOString(),
            isRead: true,
            isDismissed: true,
            priority: 'normal',
            entityId: extra.entityId,
            deliveryStatus: 'delivered',
          });
        }
        return;
      }

      if (actionId === 'snooze') {
        if (notif) {
          await snoozeAppNotification(notif.id);
        } else {
          await snoozeReminder(id);
        }
        return;
      }

      if (actionId === 'dismiss') {
        if (notif) {
          await dismissNotification(notif.id);
        }
        return;
      }

      // Default tap action
      if (notif) {
        await markNotificationRead(notif.id);
      }
      const route = extra?.route || notif?.route;
      if (route) {
        if (onNavigate) {
          onNavigate(route);
        } else if (typeof window !== 'undefined') {
          window.location.hash = route;
        }
      }
    },
  });
}
