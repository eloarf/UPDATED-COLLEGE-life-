import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import { JournalEntry } from '../types';
import { getJournalEntriesForDate, getJournalSummaries } from './queries';
import { selectTodayJournalEntry } from '../utils/journalEngine';
import { exportDatabaseToJson, validateBackupFile, restoreDatabaseFromJson } from '../services/backupService';

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

describe('Journal Revamp Part 1 - Writing, Resumption, Trash & Backup', () => {
  const todayKey = '2026-11-12';

  beforeEach(async () => {
    await db.journalEntries.clear();
    await db.dailyCheckIns.clear();
  });

  it('creates an entry without requiring a title, autosaves updates, and resumes without duplicates', async () => {
    const nowIso = '2026-11-12T09:00:00.000Z';
    const entry: JournalEntry = {
      id: 'journal-today-1',
      date: todayKey,
      moodScore: 4,
      energyScore: 3,
      content: 'First draft paragraph without a title.',
      wordCount: countWords('First draft paragraph without a title.'),
      tags: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await db.journalEntries.put(entry);

    // Simulate debounced autosave editing the same entry
    const updatedContent = 'First draft paragraph without a title. Added evening reflection.';
    await db.journalEntries.put({
      ...entry,
      content: updatedContent,
      wordCount: countWords(updatedContent),
      updatedAt: '2026-11-12T20:15:00.000Z',
    });

    const todayEntries = await getJournalEntriesForDate(todayKey);
    expect(todayEntries).toHaveLength(1);

    const resumed = selectTodayJournalEntry(todayEntries, todayKey);
    expect(resumed?.id).toBe('journal-today-1');
    expect(resumed?.content).toContain('Added evening reflection.');
    expect(resumed?.title).toBeUndefined();
  });

  it('supports editing historical entries, soft-deleting to trash, restoring, and permanent deletion', async () => {
    const oldEntry: JournalEntry = {
      id: 'hist-1',
      title: 'Midterm week notes',
      date: '2026-10-20',
      moodScore: 3,
      energyScore: 2,
      content: 'Studying graph theory.',
      wordCount: 3,
      tags: ['exam'],
      isFavorite: true,
      isPinned: true,
      createdAt: '2026-10-20T18:00:00.000Z',
      updatedAt: '2026-10-20T18:00:00.000Z',
    };

    await db.journalEntries.put(oldEntry);

    // Edit historical entry
    await db.journalEntries.put({
      ...oldEntry,
      content: 'Studying graph theory and shortest paths.',
      wordCount: 6,
      updatedAt: '2026-11-12T10:00:00.000Z',
    });

    let loaded = await db.journalEntries.get('hist-1');
    expect(loaded?.content).toContain('shortest paths');
    expect(loaded?.isFavorite).toBe(true);
    expect(loaded?.isPinned).toBe(true);

    // Soft delete (Trash)
    await db.journalEntries.update('hist-1', { deletedAt: '2026-11-12T10:05:00.000Z' });
    const summariesWhileTrashed = await getJournalSummaries();
    expect(summariesWhileTrashed.find((s) => s.id === 'hist-1')?.deletedAt).toBeTruthy();

    // Restore from Trash
    await db.journalEntries.update('hist-1', { deletedAt: undefined });
    loaded = await db.journalEntries.get('hist-1');
    expect(loaded?.deletedAt).toBeUndefined();

    // Permanent delete
    await db.journalEntries.delete('hist-1');
    expect(await db.journalEntries.get('hist-1')).toBeUndefined();
  });

  it('preserves journal entries across JSON backup export, validation, and restore', async () => {
    await db.journalEntries.put({
      id: 'backup-entry-1',
      title: 'Archive check',
      date: '2026-11-01',
      moodScore: 5,
      energyScore: 4,
      content: 'Preserved content',
      wordCount: 2,
      tags: ['calm'],
      createdAt: '2026-11-01T12:00:00.000Z',
    });

    const json = await exportDatabaseToJson();
    const validation = validateBackupFile(json);
    expect(validation.valid).toBe(true);

    await db.journalEntries.clear();
    expect(await db.journalEntries.count()).toBe(0);

    await restoreDatabaseFromJson(json, 'replace');
    const restored = await db.journalEntries.get('backup-entry-1');
    expect(restored?.content).toBe('Preserved content');
    expect(restored?.tags).toEqual(['calm']);
  });
});
