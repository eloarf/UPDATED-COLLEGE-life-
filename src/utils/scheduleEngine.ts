import { ClassSession, ClassException, Course, Semester, DayOfWeek } from '../types';
import { parseDayKey, formatDayKey, addDaysToKey, getTodayKey } from './dateUtils';

export interface ScheduledClass {
  session: ClassSession;
  course: Course;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  room?: string;
  building?: string;
  instructor?: string;
  isCancelled: boolean;
  isMoved: boolean;
  exception?: ClassException;
}

export interface NextClassResult {
  scheduledClass: ScheduledClass;
  status: 'in_progress' | 'upcoming';
  minutesUntilStart: number;
}

export interface ScheduleConflict {
  existingSession: ClassSession;
  existingCourse?: Course;
  dayOfWeek: number;
  conflictingRange: string;
  message: string;
}

/**
 * Validates HH:MM time format
 */
export function isValidTime(timeStr?: string): boolean {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const match = timeStr.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return !!match;
}

/**
 * Checks whether two time intervals [startA, endA] and [startB, endB] overlap.
 * Back-to-back classes (e.g. 08:30-10:20 and 10:20-12:20) do NOT conflict.
 */
export function timesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  if (!isValidTime(startA) || !isValidTime(endA) || !isValidTime(startB) || !isValidTime(endB)) {
    return false;
  }
  return startA < endB && endA > startB;
}

/**
 * Computes week number of a date relative to semester start date.
 * Weeks run Monday-to-Sunday, starting with the week that contains the semester start date (Week 1).
 */
export function getSemesterWeekNumber(dateKey: string, semesterStartDate: string): number {
  const targetDate = parseDayKey(dateKey);
  const semStart = parseDayKey(semesterStartDate);

  // Find Monday of the week containing semester start date (noon local)
  const semDay = semStart.getDay() === 0 ? 6 : semStart.getDay() - 1;
  const semMonday = new Date(semStart.getFullYear(), semStart.getMonth(), semStart.getDate() - semDay, 12, 0, 0);

  // Find Monday of the week containing target date (noon local)
  const targetDay = targetDate.getDay() === 0 ? 6 : targetDate.getDay() - 1;
  const targetMonday = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() - targetDay, 12, 0, 0);

  const diffMs = targetMonday.getTime() - semMonday.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const weekOffset = Math.floor(diffDays / 7);
  return weekOffset + 1;
}

/**
 * Returns all scheduled classes for a given dateKey, fully applying exceptions and semester constraints.
 * Sorted chronologically by start time.
 */
export function getClassesForDate(
  dateKey: string,
  sessions: ClassSession[],
  exceptions: ClassException[] = [],
  semester?: Semester | null,
  courses: Course[] = []
): ScheduledClass[] {
  if (!dateKey) return [];

  // Check semester boundary
  if (semester && semester.startDate && semester.endDate) {
    if (dateKey < semester.startDate || dateKey > semester.endDate) {
      return [];
    }
  }

  const targetDate = parseDayKey(dateKey);
  const targetDayOfWeek = (targetDate.getDay() === 0 ? 6 : targetDate.getDay() - 1) as DayOfWeek;

  // Build course lookup map
  const courseMap = new Map<string, Course>();
  for (const c of courses) {
    courseMap.set(c.id, c);
  }

  // Calculate week number if semester start exists
  const weekNumber = semester?.startDate ? getSemesterWeekNumber(dateKey, semester.startDate) : 1;

  // Build exceptions map: key is sessionId -> latest exception for this date
  const exceptionMap = new Map<string, ClassException>();
  for (const ex of exceptions) {
    if (ex.date === dateKey) {
      exceptionMap.set(ex.sessionId, ex);
    }
  }

  const results: ScheduledClass[] = [];

  for (const session of sessions) {
    // 1. Course must exist (skip orphan sessions safely)
    const course = courseMap.get(session.courseId);
    if (!course) continue;

    // 2. Validate session times
    if (!isValidTime(session.startTime) || !isValidTime(session.endTime)) {
      continue;
    }

    // 3. Weekday matching
    if (session.dayOfWeek !== targetDayOfWeek) {
      continue;
    }

    // 4. Repeat rule matching ("all" = every week, "odd" = 1,3,5..., "even" = 2,4,6...)
    if (session.repeat === 'odd' && weekNumber % 2 === 0) {
      continue;
    }
    if (session.repeat === 'even' && weekNumber % 2 !== 0) {
      continue;
    }

    // 5. Apply exception if present
    const ex = exceptionMap.get(session.id);
    const isCancelled = ex?.action === 'cancelled';
    const isMoved = ex?.action === 'moved';

    const effectiveStartTime = isMoved && ex.newStartTime && isValidTime(ex.newStartTime)
      ? ex.newStartTime
      : session.startTime;

    const effectiveEndTime = isMoved && ex.newEndTime && isValidTime(ex.newEndTime)
      ? ex.newEndTime
      : session.endTime;

    const effectiveRoom = isMoved && ex.newRoom
      ? ex.newRoom
      : session.room;

    results.push({
      session,
      course,
      date: dateKey,
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      room: effectiveRoom,
      building: session.building,
      instructor: session.instructor || course.instructor,
      isCancelled,
      isMoved,
      exception: ex,
    });
  }

  // Sort by startTime
  results.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return results;
}

/**
 * Returns the class in progress or the next non-cancelled class within 14 days.
 */
export function getNextClass(
  now: Date,
  sessions: ClassSession[],
  exceptions: ClassException[] = [],
  semester?: Semester | null,
  courses: Course[] = []
): NextClassResult | null {
  const todayKey = formatDayKey(now);
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // 1. Check classes today
  const todayClasses = getClassesForDate(todayKey, sessions, exceptions, semester, courses);

  // Check if any active class is currently in progress
  for (const c of todayClasses) {
    if (c.isCancelled) continue;
    if (nowTime >= c.startTime && nowTime < c.endTime) {
      return {
        scheduledClass: c,
        status: 'in_progress',
        minutesUntilStart: 0,
      };
    }
  }

  // Check upcoming classes today
  for (const c of todayClasses) {
    if (c.isCancelled) continue;
    if (c.startTime > nowTime) {
      const [ch, cm] = c.startTime.split(':').map((v) => parseInt(v, 10));
      const minsDiff = (ch * 60 + cm) - (now.getHours() * 60 + now.getMinutes());
      return {
        scheduledClass: c,
        status: 'upcoming',
        minutesUntilStart: Math.max(0, minsDiff),
      };
    }
  }

  // 2. Scan next 14 days
  for (let d = 1; d <= 14; d++) {
    const nextDateKey = addDaysToKey(todayKey, d);
    const dayClasses = getClassesForDate(nextDateKey, sessions, exceptions, semester, courses);
    for (const c of dayClasses) {
      if (!c.isCancelled) {
        const [ch, cm] = c.startTime.split(':').map((v) => parseInt(v, 10));
        const minsDiff = d * 1440 + (ch * 60 + cm) - (now.getHours() * 60 + now.getMinutes());
        return {
          scheduledClass: c,
          status: 'upcoming',
          minutesUntilStart: Math.max(0, minsDiff),
        };
      }
    }
  }

  return null;
}

/**
 * Finds time conflicts between a candidate session/time and existing sessions.
 * Ignores the session itself when editing (excludeSessionId).
 */
export function findConflicts(
  candidate: {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    repeat?: 'all' | 'odd' | 'even';
    excludeSessionId?: string;
  },
  existingSessions: ClassSession[],
  courses: Course[] = []
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  if (!isValidTime(candidate.startTime) || !isValidTime(candidate.endTime)) {
    return conflicts;
  }

  const courseMap = new Map<string, Course>();
  for (const c of courses) {
    courseMap.set(c.id, c);
  }

  const candidateRepeat = candidate.repeat || 'all';

  for (const existing of existingSessions) {
    if (candidate.excludeSessionId && existing.id === candidate.excludeSessionId) {
      continue;
    }

    if (existing.dayOfWeek !== candidate.dayOfWeek) {
      continue;
    }

    // Check repeat overlap: "all" conflicts with anything, "odd" conflicts with "all" or "odd", etc.
    const existingRepeat = existing.repeat || 'all';
    const repeatOverlap =
      candidateRepeat === 'all' ||
      existingRepeat === 'all' ||
      candidateRepeat === existingRepeat;

    if (!repeatOverlap) {
      continue;
    }

    if (timesOverlap(candidate.startTime, candidate.endTime, existing.startTime, existing.endTime)) {
      const course = courseMap.get(existing.courseId);
      const courseLabel = course ? `${course.code} - ${course.name}` : 'Unknown Course';
      conflicts.push({
        existingSession: existing,
        existingCourse: course,
        dayOfWeek: existing.dayOfWeek,
        conflictingRange: `${existing.startTime} - ${existing.endTime}`,
        message: `Overlaps with ${courseLabel} (${existing.startTime} - ${existing.endTime})`,
      });
    }
  }

  return conflicts;
}
