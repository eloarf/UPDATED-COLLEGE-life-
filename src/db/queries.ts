import { db } from './db';
import {
  HabitLog,
  XpEvent,
  Transaction,
  Task,
  JournalEntry,
  FocusSession,
  AttendanceRecord,
} from '../types';
import { addDaysToKey, getTodayKey } from '../utils/dateUtils';

// ============================================================================
// 1. HABIT LOGS QUERIES
// ============================================================================

/**
 * Returns habit logs for a bounded date range [startDate, endDate] inclusive.
 */
export async function getHabitLogsForRange(
  startDate: string,
  endDate: string
): Promise<HabitLog[]> {
  if (!startDate || !endDate) return [];
  if (startDate > endDate) return [];
  return db.habitLogs.where('date').between(startDate, endDate, true, true).toArray();
}

/**
 * Returns habit logs for a specific single dateKey (e.g. today).
 */
export async function getHabitLogsForDate(date: string): Promise<HabitLog[]> {
  if (!date) return [];
  return db.habitLogs.where('date').equals(date).toArray();
}

/**
 * Returns habit logs within a bounded recent window (default: past 90 days),
 * sufficient for streak calculations without pulling unbounded years of history into memory.
 */
export async function getRecentHabitLogs(
  daysBack: number = 90,
  referenceDate: string = getTodayKey()
): Promise<HabitLog[]> {
  const startDate = addDaysToKey(referenceDate, -Math.abs(daysBack));
  return db.habitLogs.where('date').aboveOrEqual(startDate).toArray();
}

/**
 * Returns all logs for a specific habit ID.
 */
export async function getHabitLogsByHabitId(habitId: string): Promise<HabitLog[]> {
  if (!habitId) return [];
  return db.habitLogs.where('habitId').equals(habitId).toArray();
}

// ============================================================================
// 2. XP EVENTS QUERIES
// ============================================================================

/**
 * Computes total XP directly by summing event amounts without loading entire objects.
 */
export async function getTotalXp(): Promise<number> {
  const events = await db.xpEvents.toCollection().toArray();
  return events.reduce((sum, e) => sum + (e.amount || 0), 0);
}

/**
 * Returns bounded recent XP events ordered by timestamp descending.
 */
export async function getRecentXpEvents(limit: number = 50): Promise<XpEvent[]> {
  const all = await db.xpEvents.toArray();
  return all
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
    .slice(0, Math.max(1, limit));
}

/**
 * Returns XP events for a specific dayKey.
 */
export async function getXpEventsForDay(dayKey: string): Promise<XpEvent[]> {
  if (!dayKey) return [];
  return db.xpEvents.where('dayKey').equals(dayKey).toArray();
}

// ============================================================================
// 3. TRANSACTIONS QUERIES
// ============================================================================

/**
 * Returns transactions within a bounded date range [startDate, endDate] inclusive.
 */
export async function getTransactionsByDateRange(
  startDate: string,
  endDate: string
): Promise<Transaction[]> {
  if (!startDate || !endDate) return [];
  if (startDate > endDate) return [];
  return db.transactions.where('date').between(startDate, endDate, true, true).toArray();
}

/**
 * Returns transactions belonging to a specific account ID.
 */
export async function getTransactionsByAccount(accountId: string): Promise<Transaction[]> {
  if (!accountId) return [];
  return db.transactions.where('accountId').equals(accountId).toArray();
}

/**
 * Returns recent transactions up to a bounded limit.
 */
export async function getRecentTransactions(limit: number = 60): Promise<Transaction[]> {
  const all = await db.transactions.toArray();
  return all
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, Math.max(1, limit));
}

// ============================================================================
// 4. TASKS QUERIES
// ============================================================================

/**
 * Returns active (uncompleted) tasks.
 */
export async function getActiveTasks(): Promise<Task[]> {
  return db.tasks.where('status').equals('todo').toArray();
}

/**
 * Returns tasks by course ID.
 */
export async function getTasksByCourse(courseId: string): Promise<Task[]> {
  if (!courseId) return [];
  return db.tasks.where('courseId').equals(courseId).toArray();
}

/**
 * Returns tasks due within a bounded date range.
 */
export async function getTasksByDueDateRange(
  startDate: string,
  endDate: string
): Promise<Task[]> {
  if (!startDate || !endDate) return [];
  if (startDate > endDate) return [];
  return db.tasks.where('dueDate').between(startDate, endDate, true, true).toArray();
}

// ============================================================================
// 5. JOURNAL ENTRIES QUERIES (LIGHTWEIGHT SUMMARIES)
// ============================================================================

export type JournalEntrySummary = Omit<JournalEntry, 'content'> & {
  previewText?: string;
};

/**
 * Loads lightweight journal entry summaries for lists, feeds, and calendar dots,
 * stripping heavy essay text bodies to prevent memory pressure on mobile devices.
 */
export async function getJournalSummaries(): Promise<JournalEntrySummary[]> {
  const entries = await db.journalEntries.toArray();
  return entries.map((e) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { content, ...summary } = e;
    return {
      ...summary,
      previewText: content ? content.slice(0, 160) : '',
    };
  });
}

/**
 * Loads the full entry including essay text and prompts only for the currently active entry.
 */
export async function getJournalEntryById(id: string): Promise<JournalEntry | undefined> {
  if (!id) return undefined;
  return db.journalEntries.get(id);
}

/**
 * Returns full journal entries strictly for the selected day (avoids loading essay text for other days).
 */
export async function getJournalEntriesForDate(dateKey: string): Promise<JournalEntry[]> {
  if (!dateKey) return [];
  return db.journalEntries.where('date').equals(dateKey).toArray();
}

/**
 * Returns journal entries within a bounded date range.
 */
export async function getJournalEntriesByDateRange(
  startDate: string,
  endDate: string
): Promise<JournalEntry[]> {
  if (!startDate || !endDate) return [];
  if (startDate > endDate) return [];
  return db.journalEntries.where('date').between(startDate, endDate, true, true).toArray();
}

// ============================================================================
// 6. FOCUS SESSIONS QUERIES
// ============================================================================

/**
 * Returns focus sessions completed within a bounded timestamp range.
 */
export async function getFocusSessionsByDateRange(
  startIso: string,
  endIso: string
): Promise<FocusSession[]> {
  if (!startIso || !endIso) return [];
  if (startIso > endIso) return [];
  return db.focusSessions.where('completedAt').between(startIso, endIso, true, true).toArray();
}

/**
 * Returns recent focus sessions up to a bounded limit.
 */
export async function getRecentFocusSessions(limit: number = 30): Promise<FocusSession[]> {
  const all = await db.focusSessions.toArray();
  return all
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, Math.max(1, limit));
}

// ============================================================================
// 7. ATTENDANCE QUERIES
// ============================================================================

/**
 * Returns attendance records for a specific course.
 */
export async function getAttendanceByCourse(courseId: string): Promise<AttendanceRecord[]> {
  if (!courseId) return [];
  return db.attendance.where('courseId').equals(courseId).toArray();
}

/**
 * Returns attendance records for a bounded date range.
 */
export async function getAttendanceByDateRange(
  startDate: string,
  endDate: string
): Promise<AttendanceRecord[]> {
  if (!startDate || !endDate) return [];
  if (startDate > endDate) return [];
  return db.attendance.where('date').between(startDate, endDate, true, true).toArray();
}
