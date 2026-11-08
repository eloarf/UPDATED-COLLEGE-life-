import { AttendanceRecord } from '../types';
import { getTodayKey, getCurrentTimeString } from './dateUtils';
import { db } from '../db/db';
import { generateId } from './idGenerator';

export type AttendanceQuickStatus = 'present' | 'late' | 'absent';

export interface CanMarkAttendanceResult {
  canMark: boolean;
  reason?: string;
}

/**
 * Pure function: Checks whether an attendance record can be marked for a class.
 * Rule: Cancelled and future classes cannot be marked.
 */
export function canMarkAttendance({
  date,
  startTime,
  isCancelled = false,
  todayKey = getTodayKey(),
  currentTime = getCurrentTimeString(),
}: {
  date: string;
  startTime?: string;
  isCancelled?: boolean;
  todayKey?: string;
  currentTime?: string;
}): CanMarkAttendanceResult {
  if (isCancelled) {
    return {
      canMark: false,
      reason: 'Cancelled classes cannot be marked.',
    };
  }

  // Future date check
  if (date > todayKey) {
    return {
      canMark: false,
      reason: 'Future classes cannot be marked in advance.',
    };
  }

  // Same day before class start check
  if (date === todayKey && startTime && currentTime < startTime) {
    return {
      canMark: false,
      reason: `Class has not started yet (scheduled for ${startTime}).`,
    };
  }

  return { canMark: true };
}

export interface AttendanceStanding {
  totalLogged: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  ratePercent: number;
  isAboveThreshold: boolean;
  thresholdPercent: number;
  message: string;
}

/**
 * Pure function: Computes attendance statistics and gentle non-scolding feedback
 */
export function calculateAttendanceStanding(
  records: AttendanceRecord[],
  thresholdPercent: number = 80
): AttendanceStanding {
  if (!records || records.length === 0) {
    return {
      totalLogged: 0,
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      excusedCount: 0,
      ratePercent: 100,
      isAboveThreshold: true,
      thresholdPercent,
      message: 'No attendance records logged yet. Your standing is fresh.',
    };
  }

  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let excusedCount = 0;

  for (const r of records) {
    if (r.status === 'present') presentCount++;
    else if (r.status === 'late') lateCount++;
    else if (r.status === 'absent') absentCount++;
    else if (r.status === 'excused') excusedCount++;
  }

  const countableTotal = presentCount + lateCount + absentCount;
  if (countableTotal === 0) {
    return {
      totalLogged: records.length,
      presentCount,
      lateCount,
      absentCount,
      excusedCount,
      ratePercent: 100,
      isAboveThreshold: true,
      thresholdPercent,
      message: 'All recorded sessions excused. Standing is clear.',
    };
  }

  // Count late as 0.75 or 0.5 attendance credit
  const weightedScore = presentCount + lateCount * 0.75;
  const ratePercent = Math.round((weightedScore / countableTotal) * 100);
  const isAboveThreshold = ratePercent >= thresholdPercent;

  let message: string;
  if (isAboveThreshold) {
    message = `Healthy standing (${ratePercent}% vs ${thresholdPercent}% required). Keep up the rhythm.`;
  } else {
    // Gentle wording: supportive and forward-looking, never punitive or scolding
    message = `Needs attention (${ratePercent}% vs ${thresholdPercent}% target). You are just a couple of attended classes away from your goal.`;
  }

  return {
    totalLogged: records.length,
    presentCount,
    lateCount,
    absentCount,
    excusedCount,
    ratePercent,
    isAboveThreshold,
    thresholdPercent,
    message,
  };
}

/**
 * Performs one-tap quick-mark for attendance in Dexie database.
 * Rule: One record per class per date (saving again replaces).
 * Returns the updated record or null if toggled off.
 */
export async function saveAttendanceQuickMark({
  courseId,
  date,
  status,
  sessionId,
  startTime,
  isCancelled,
  allowToggle = true,
}: {
  courseId: string;
  date: string;
  status: AttendanceQuickStatus;
  sessionId?: string;
  startTime?: string;
  isCancelled?: boolean;
  allowToggle?: boolean;
}): Promise<{ success: boolean; record?: AttendanceRecord; action: 'created' | 'updated' | 'toggled_off' | 'blocked'; error?: string }> {
  // Validate eligibility
  const check = canMarkAttendance({ date, startTime, isCancelled });
  if (!check.canMark) {
    return { success: false, action: 'blocked', error: check.reason };
  }

  // Find existing record for this course on this date
  const existing = await db.attendance
    .where('courseId')
    .equals(courseId)
    .filter((r) => r.date === date && (!sessionId || !r.sessionId || r.sessionId === sessionId))
    .first();

  const nowIso = new Date().toISOString();

  if (existing) {
    if (allowToggle && existing.status === status) {
      // Toggle off / clear mark
      await db.attendance.delete(existing.id);
      return { success: true, action: 'toggled_off' };
    }

    // Saving again replaces the record
    await db.attendance.update(existing.id, {
      status,
      sessionId: sessionId || existing.sessionId,
      updatedAt: nowIso,
    });

    const updated = await db.attendance.get(existing.id);
    return { success: true, record: updated, action: 'updated' };
  }

  // Create new record
  const newId = generateId();
  const newRecord: AttendanceRecord = {
    id: newId,
    courseId,
    sessionId,
    date,
    status,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  await db.attendance.add(newRecord);
  return { success: true, record: newRecord, action: 'created' };
}
