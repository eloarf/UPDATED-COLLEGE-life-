import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import {
  exportDatabaseToJson,
  validateBackupFile,
  restoreDatabaseFromJson,
} from '../services/backupService';
import { createInitialFlashcardSchedule } from '../utils/flashcardEngine';

describe('Flashcards DB & Backup Integration', () => {
  beforeEach(async () => {
    await db.flashcardDecks.clear();
    await db.flashcards.clear();
  });

  it('persists decks and cards and roundtrips them cleanly through backup export/validate/restore', async () => {
    const now = new Date().toISOString();
    await db.flashcardDecks.put({
      id: 'deck-1',
      title: 'Organic Chemistry Mechanisms',
      courseId: 'chem-201',
      examTopicId: 'topic-sn2',
      createdAt: now,
      updatedAt: now,
    });

    await db.flashcards.put({
      id: 'fc-1',
      deckId: 'deck-1',
      front: 'SN2 stereochemistry outcome?',
      back: 'Backside attack with Walden inversion.',
      createdAt: now,
      updatedAt: now,
      ...createInitialFlashcardSchedule('2026-10-18'),
    });

    const json = await exportDatabaseToJson();
    const validation = validateBackupFile(json);
    expect(validation.valid).toBe(true);
    if (!validation.valid) return;

    expect(validation.tableCounts.flashcardDecks).toBe(1);
    expect(validation.tableCounts.flashcards).toBe(1);

    // Clear and restore
    await db.flashcardDecks.clear();
    await db.flashcards.clear();
    expect(await db.flashcardDecks.count()).toBe(0);

    const restoreRes = await restoreDatabaseFromJson(json, 'replace');
    expect(restoreRes.success).toBe(true);

    const decks = await db.flashcardDecks.toArray();
    const cards = await db.flashcards.toArray();
    expect(decks).toHaveLength(1);
    expect(decks[0].examTopicId).toBe('topic-sn2');
    expect(cards).toHaveLength(1);
    expect(cards[0].front).toContain('SN2');
  });
});
