import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import {
  getHabitLogsForRange,
  getHabitLogsForDate,
  getRecentHabitLogs,
  getTransactionsByDateRange,
  getTasksByDueDateRange,
  getActiveTasks,
  getJournalSummaries,
  getJournalEntryById,
  getJournalEntriesByDateRange,
  getFocusSessionsByDateRange,
  getAttendanceByDateRange,
  getTotalXp,
} from './queries';
import { HabitLog, Transaction, Task, JournalEntry, FocusSession, AttendanceRecord, XpEvent } from '../types';

describe('Bounded Query Helpers (src/db/queries.ts)', () => {
  beforeEach(async () => {
    await db.habitLogs.clear();
    await db.transactions.clear();
    await db.tasks.clear();
    await db.journalEntries.clear();
    await db.focusSessions.clear();
    await db.attendance.clear();
    await db.xpEvents.clear();
  });

  describe('Habit Logs Queries', () => {
    it('returns empty array when no habit logs exist or range is reversed', async () => {
      const empty = await getHabitLogsForRange('2026-11-01', '2026-11-30');
      expect(empty).toEqual([]);

      const reversed = await getHabitLogsForRange('2026-12-01', '2026-11-01');
      expect(reversed).toEqual([]);
    });

    it('correctly handles month and year boundary date ranges', async () => {
      const logs: HabitLog[] = [
        { id: 'hl-1', habitId: 'h-1', date: '2025-12-31', count: 1, isPartial: false },
        { id: 'hl-2', habitId: 'h-1', date: '2026-01-01', count: 1, isPartial: false },
        { id: 'hl-3', habitId: 'h-1', date: '2026-01-31', count: 1, isPartial: false },
        { id: 'hl-4', habitId: 'h-1', date: '2026-02-01', count: 1, isPartial: false },
      ];
      await db.habitLogs.bulkPut(logs);

      // Year boundary: 2025-12-30 to 2026-01-02
      const yearBoundary = await getHabitLogsForRange('2025-12-30', '2026-01-02');
      expect(yearBoundary.map((l) => l.date)).toEqual(['2025-12-31', '2026-01-01']);

      // Month boundary: 2026-01-31 to 2026-02-01
      const monthBoundary = await getHabitLogsForRange('2026-01-31', '2026-02-05');
      expect(monthBoundary.map((l) => l.date)).toEqual(['2026-01-31', '2026-02-01']);
    });

    it('queries single date logs accurately', async () => {
      await db.habitLogs.put({ id: 'hl-today', habitId: 'h-1', date: '2026-11-06', count: 1, isPartial: false });
      const today = await getHabitLogsForDate('2026-11-06');
      expect(today.length).toBe(1);
      expect(today[0].id).toBe('hl-today');

      const tomorrow = await getHabitLogsForDate('2026-11-07');
      expect(tomorrow).toEqual([]);
    });
  });

  describe('Transactions Queries', () => {
    it('retrieves transactions across month boundaries', async () => {
      const txs: Transaction[] = [
        { id: 'tx-1', amount: 50, type: 'expense', category: 'food', date: '2026-01-31', notes: 'Dinner' },
        { id: 'tx-2', amount: 200, type: 'income', category: 'stipend', date: '2026-02-01', notes: 'Monthly stipend' },
        { id: 'tx-3', amount: 15, type: 'expense', category: 'transit', date: '2026-02-15', notes: 'Bus pass' },
      ];
      await db.transactions.bulkPut(txs);

      const res = await getTransactionsByDateRange('2026-01-25', '2026-02-05');
      expect(res.map((t) => t.id)).toEqual(['tx-1', 'tx-2']);
    });

    it('returns empty array when start or end is invalid', async () => {
      expect(await getTransactionsByDateRange('', '2026-02-01')).toEqual([]);
    });
  });

  describe('Tasks Queries', () => {
    it('filters active tasks and due date ranges accurately', async () => {
      const tasks: Task[] = [
        { id: 't-1', title: 'Task 1', status: 'todo', dueDate: '2026-11-10', priority: 'high', effort: 'medium', contextTag: 'any', createdAt: '2026-11-01', updatedAt: '2026-11-01' },
        { id: 't-2', title: 'Task 2', status: 'done', dueDate: '2026-11-12', priority: 'medium', effort: 'small', contextTag: 'laptop', createdAt: '2026-11-01', updatedAt: '2026-11-01' },
        { id: 't-3', title: 'Task 3', status: 'todo', dueDate: '2026-11-20', priority: 'low', effort: 'large', contextTag: 'phone', createdAt: '2026-11-01', updatedAt: '2026-11-01' },
      ];
      await db.tasks.bulkPut(tasks);

      const active = await getActiveTasks();
      expect(active.map((t) => t.id).sort()).toEqual(['t-1', 't-3']);

      const dueRange = await getTasksByDueDateRange('2026-11-09', '2026-11-15');
      expect(dueRange.map((t) => t.id).sort()).toEqual(['t-1', 't-2']);
    });
  });

  describe('Journal Summaries (Lightweight memory footprint)', () => {
    it('omits large content text in summaries, loads full text on getJournalEntryById', async () => {
      const bigEssay = 'A'.repeat(50000); // 50 KB of text
      const entry: JournalEntry = {
        id: 'j-1',
        title: 'Reflections on Architecture',
        content: bigEssay,
        date: '2026-11-06',
        moodScore: 4,
        energyScore: 3,
        wordCount: 1200,
        tags: ['academic', 'design'],
        createdAt: '2026-11-06T10:00:00Z',
        updatedAt: '2026-11-06T10:00:00Z',
      };
      await db.journalEntries.put(entry);

      const summaries = await getJournalSummaries();
      expect(summaries.length).toBe(1);
      expect((summaries[0] as any).content).toBeUndefined();
      expect(summaries[0].title).toBe('Reflections on Architecture');
      expect(summaries[0].wordCount).toBe(1200);

      const fullEntry = await getJournalEntryById('j-1');
      expect(fullEntry).toBeDefined();
      expect(fullEntry?.content).toBe(bigEssay);
    });
  });

  describe('Focus Sessions & Attendance Queries', () => {
    it('handles focus session range and attendance date range', async () => {
      const sess: FocusSession = {
        id: 'fs-1',
        mode: '25/5',
        minutesFocused: 25,
        startedAt: '2026-11-06T14:05:00.000Z',
        completedAt: '2026-11-06T14:30:00.000Z',
      };
      await db.focusSessions.put(sess);

      const found = await getFocusSessionsByDateRange('2026-11-06T00:00:00.000Z', '2026-11-06T23:59:59.000Z');
      expect(found.length).toBe(1);

      const att: AttendanceRecord = {
        id: 'att-1',
        courseId: 'c-1',
        sessionId: 's-1',
        date: '2026-11-06',
        status: 'present',
      };
      await db.attendance.put(att);

      const attRecords = await getAttendanceByDateRange('2026-11-01', '2026-11-10');
      expect(attRecords.length).toBe(1);
    });
  });

  describe('XP Events Total Calculation', () => {
    it('accurately sums total XP without loading full objects into component state', async () => {
      const events: XpEvent[] = [
        { id: 'xp-1', amount: 50, source: 'task', sourceId: 't-1', stat: 'discipline', dayKey: '2026-11-06', timestamp: '2026-11-06T10:00:00Z' },
        { id: 'xp-2', amount: 100, source: 'exam', sourceId: 'e-1', stat: 'knowledge', dayKey: '2026-11-06', timestamp: '2026-11-06T11:00:00Z' },
      ];
      await db.xpEvents.bulkPut(events);

      const total = await getTotalXp();
      expect(total).toBe(150);
    });
  });
});
