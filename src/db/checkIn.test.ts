import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import { getCheckInByDate, getCheckInsByDateRange, upsertDailyCheckIn, deleteDailyCheckIn } from './queries';
import { exportDatabaseToJson, validateBackupFile, restoreDatabaseFromJson } from '../services/backupService';

describe('Daily Check-In Persistence (Part 2)', () => {
  beforeEach(async () => {
    await db.dailyCheckIns.clear();
    await db.journalEntries.clear();
  });

  it('creates a standalone check-in without requiring a journal entry and upserts cleanly by dateKey', async () => {
    const saved1 = await upsertDailyCheckIn({
      dateKey: '2026-11-12',
      moodScore: 3,
      energyScore: 2,
      stressScore: 4,
      emotions: ['Overwhelmed', 'Tired'],
      contextTags: ['Academic workload'],
      note: 'Busy midterm week',
    });

    expect(saved1.moodScore).toBe(3);
    expect(saved1.emotions).toEqual(['Overwhelmed', 'Tired']);
    expect(saved1.journalEntryId).toBeUndefined();

    // Update same date -> replaces/updates existing record rather than creating duplicate
    const saved2 = await upsertDailyCheckIn({
      dateKey: '2026-11-12',
      moodScore: 4,
      stressScore: 2,
      emotions: ['Calm', 'Tired'],
      journalEntryId: 'j-12',
    });

    expect(saved2.id).toBe(saved1.id);
    expect(saved2.moodScore).toBe(4);
    expect(saved2.energyScore).toBe(2); // preserved from prior save
    expect(saved2.stressScore).toBe(2);
    expect(saved2.journalEntryId).toBe('j-12');

    const rowsForDay = await db.dailyCheckIns.where('dateKey').equals('2026-11-12').toArray();
    expect(rowsForDay).toHaveLength(1);
    expect((await getCheckInByDate('2026-11-12'))?.id).toBe(saved1.id);
  });

  it('queries check-ins by date range, supports deletion, and round-trips through backup export/restore', async () => {
    const ci1 = await upsertDailyCheckIn({
      dateKey: '2026-11-10',
      moodScore: 5,
      emotions: ['Happy', 'Grateful'],
      contextTags: ['Exercise'],
    });
    const ci2 = await upsertDailyCheckIn({
      dateKey: '2026-11-12',
      moodScore: 3,
      stressScore: 3,
      emotions: ['Calm'],
    });

    const range = await getCheckInsByDateRange('2026-11-09', '2026-11-11');
    expect(range).toHaveLength(1);
    expect(range[0].id).toBe(ci1.id);

    const backupJson = await exportDatabaseToJson();
    expect(validateBackupFile(backupJson).valid).toBe(true);

    await deleteDailyCheckIn(ci2.id);
    expect(await getCheckInByDate('2026-11-12')).toBeUndefined();

    await restoreDatabaseFromJson(backupJson, 'replace');
    expect((await getCheckInByDate('2026-11-12'))?.moodScore).toBe(3);
  });
});
