import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import { Habit, HabitLog } from '../types';
import { calculateHabitStreak, calculateHabitDetailStats } from '../utils/streakEngine';
import { exportDatabaseToJson, validateBackupFile, restoreDatabaseFromJson } from '../services/backupService';

describe('Habits Tracking Upgrade Integration (Part 3)', () => {
  beforeEach(async () => {
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.restDays.clear();
  });

  it('supports multiple tracking methods and editing schedule without mutating historical logs', async () => {
    const habit: Habit = {
      id: 'h-study',
      title: 'Deep Focus',
      category: 'study',
      type: 'minutes',
      targetCount: 45,
      trackingMethod: 'duration',
      unit: 'min',
      targetValue: 45,
      recurrence: 'daily',
      status: 'active',
      sortOrder: 0,
      color: '#B6E63E',
      currentStreak: 0,
      bestStreak: 0,
      icon: 'Activity',
      graceDaysLeft: 2,
    };

    await db.habits.add(habit);

    const log1: HabitLog = {
      id: 'log-1',
      habitId: 'h-study',
      date: '2026-11-10',
      count: 1,
      isPartial: true,
      value: 20,
      unit: 'min',
      status: 'partial',
    };
    const log2: HabitLog = {
      id: 'log-2',
      habitId: 'h-study',
      date: '2026-11-11',
      count: 1,
      isPartial: false,
      value: 50,
      unit: 'min',
      status: 'completed',
    };

    await db.habitLogs.bulkAdd([log1, log2]);

    // Edit habit schedule to weekdays only; historical logs must remain untouched
    await db.habits.update('h-study', {
      recurrence: 'weekdays',
      scheduledDays: [0, 1, 2],
      targetValue: 60,
    });

    const allLogs = await db.habitLogs.where('habitId').equals('h-study').toArray();
    expect(allLogs).toHaveLength(2);
    expect(allLogs.find((l) => l.id === 'log-1')?.value).toBe(20);
    expect(allLogs.find((l) => l.id === 'log-2')?.value).toBe(50);

    const updatedHabit = (await db.habits.get('h-study'))!;
    const streak = calculateHabitStreak('h-study', allLogs, [], '2026-11-11', updatedHabit);
    expect(streak.currentStreak).toBe(2);

    const detail = calculateHabitDetailStats(updatedHabit, allLogs, [], {
      startDate: '2026-11-10',
      endDate: '2026-11-11',
      referenceDateKey: '2026-11-11',
    });
    expect(detail.totalValue).toBe(70);
    expect(detail.averageValue).toBe(35);
  });

  it('persists paused/archived habits, sortOrder, and frequency/avoidance logs across backup & restore', async () => {
    await db.habits.bulkAdd([
      {
        id: 'h-freq',
        title: 'Hydrate',
        category: 'health',
        type: 'daily',
        targetCount: 4,
        trackingMethod: 'frequency',
        unit: 'glasses',
        targetValue: 4,
        status: 'active',
        sortOrder: 1,
        color: '#B6E63E',
        currentStreak: 0,
        bestStreak: 0,
        icon: 'Activity',
        graceDaysLeft: 2,
      },
      {
        id: 'h-avoid',
        title: 'Late night doomscrolling',
        category: 'routine',
        type: 'daily',
        targetCount: 1,
        trackingMethod: 'avoidance',
        status: 'paused',
        sortOrder: 0,
        color: '#B6E63E',
        currentStreak: 0,
        bestStreak: 0,
        icon: 'Activity',
        graceDaysLeft: 2,
      },
    ]);

    await db.habitLogs.add({
      id: 'log-freq-1',
      habitId: 'h-freq',
      date: '2026-11-12',
      count: 3,
      value: 3,
      unit: 'glasses',
      isPartial: true,
      status: 'partial',
    });

    const json = await exportDatabaseToJson();
    expect(validateBackupFile(json).valid).toBe(true);

    await db.habits.clear();
    await db.habitLogs.clear();

    await restoreDatabaseFromJson(json, 'replace');
    const restoredFreq = await db.habits.get('h-freq');
    const restoredAvoid = await db.habits.get('h-avoid');
    const restoredLog = await db.habitLogs.get('log-freq-1');

    expect(restoredFreq?.trackingMethod).toBe('frequency');
    expect(restoredFreq?.sortOrder).toBe(1);
    expect(restoredAvoid?.status).toBe('paused');
    expect(restoredLog?.value).toBe(3);
    expect(restoredLog?.status).toBe('partial');
  });
});
