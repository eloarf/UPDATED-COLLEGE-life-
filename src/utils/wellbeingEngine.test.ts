import { describe, it, expect } from 'vitest';
import {
  MOOD_LEVELS,
  ENERGY_LEVELS,
  STRESS_LEVELS,
  DEFAULT_EMOTIONS,
  DAILY_CONTEXT_FACTORS,
  getScaleLabel,
  mergeCheckInsWithLegacyJournal,
  filterWellbeingRecords,
  computeWellbeingSummary,
  computeWeeklyAndMonthlySummaries,
} from './wellbeingEngine';
import { DailyCheckIn, JournalEntry } from '../types';

describe('wellbeingEngine', () => {
  it('provides descriptive scale labels for Mood, Energy, and Stress (1-5)', () => {
    expect(MOOD_LEVELS).toHaveLength(5);
    expect(ENERGY_LEVELS).toHaveLength(5);
    expect(STRESS_LEVELS).toHaveLength(5);

    expect(getScaleLabel('mood', 1)).toBe('Very low');
    expect(getScaleLabel('mood', 3)).toBe('Okay / neutral');
    expect(getScaleLabel('energy', 1)).toBe('Completely drained');
    expect(getScaleLabel('energy', 5)).toBe('Very energized');
    expect(getScaleLabel('stress', 1)).toBe('Very calm');
    expect(getScaleLabel('stress', 5)).toBe('Extremely stressed');
    expect(getScaleLabel('mood', undefined)).toBe('Not rated');
  });

  it('includes all 16 default emotions and 8 daily context factors', () => {
    expect(DEFAULT_EMOTIONS.length).toBeGreaterThanOrEqual(16);
    expect(DEFAULT_EMOTIONS).toContain('Happy');
    expect(DEFAULT_EMOTIONS).toContain('Overwhelmed');
    expect(DEFAULT_EMOTIONS).toContain('Confused');

    expect(DAILY_CONTEXT_FACTORS).toContain('Sleep quality');
    expect(DAILY_CONTEXT_FACTORS).toContain('Academic workload');
    expect(DAILY_CONTEXT_FACTORS).toContain('Rest and relaxation');
  });

  it('merges dedicated check-ins with legacy journal mood/energy without double counting dates', () => {
    const checkIns: DailyCheckIn[] = [
      {
        id: 'ci-1',
        dateKey: '2026-11-10',
        moodScore: 4,
        energyScore: 3,
        stressScore: 2,
        emotions: ['Calm', 'Motivated'],
        contextTags: ['Sleep quality'],
        journalEntryId: 'j-10',
        createdAt: '2026-11-10T09:00:00Z',
        updatedAt: '2026-11-10T09:00:00Z',
      },
    ];

    const journals: JournalEntry[] = [
      // Same day & linked -> should NOT double count
      {
        id: 'j-10',
        date: '2026-11-10',
        moodScore: 2,
        energyScore: 2,
        content: 'Evening journal',
        wordCount: 2,
        tags: [],
        createdAt: '2026-11-10T21:00:00Z',
      },
      // Historical entry without dedicated check-in -> backfilled cleanly
      {
        id: 'j-08',
        date: '2026-11-08',
        moodScore: 5,
        energyScore: 4,
        content: 'Great weekend',
        wordCount: 2,
        tags: [],
        createdAt: '2026-11-08T18:00:00Z',
      },
      // Trashed journal -> ignored
      {
        id: 'j-07-trash',
        date: '2026-11-07',
        moodScore: 1,
        energyScore: 1,
        content: 'Deleted',
        wordCount: 1,
        tags: [],
        createdAt: '2026-11-07T18:00:00Z',
        deletedAt: '2026-11-07T19:00:00Z',
      },
    ];

    const merged = mergeCheckInsWithLegacyJournal(checkIns, journals);
    expect(merged).toHaveLength(2);
    expect(merged[0].dateKey).toBe('2026-11-10');
    expect(merged[0].source).toBe('checkin');
    expect(merged[0].moodScore).toBe(4);
    expect(merged[0].stressScore).toBe(2);

    expect(merged[1].dateKey).toBe('2026-11-08');
    expect(merged[1].source).toBe('journal_legacy');
    expect(merged[1].moodScore).toBe(5);
    expect(merged[1].stressScore).toBeUndefined();
  });

  it('filters records by date range, emotion, and context tag, and computes summaries', () => {
    const checkIns: DailyCheckIn[] = [
      {
        id: 'c1',
        dateKey: '2026-11-12',
        moodScore: 4,
        energyScore: 4,
        stressScore: 2,
        emotions: ['Calm', 'Happy'],
        contextTags: ['Exercise', 'Sleep quality'],
        createdAt: '2026-11-12T08:00:00Z',
        updatedAt: '2026-11-12T08:00:00Z',
      },
      {
        id: 'c2',
        dateKey: '2026-11-11',
        moodScore: 2,
        energyScore: 2,
        stressScore: 4,
        emotions: ['Anxious', 'Tired'],
        contextTags: ['Academic workload'],
        createdAt: '2026-11-11T08:00:00Z',
        updatedAt: '2026-11-11T08:00:00Z',
      },
      {
        id: 'c3',
        dateKey: '2026-10-20',
        moodScore: 5,
        energyScore: 5,
        stressScore: 1,
        emotions: ['Happy'],
        contextTags: ['Rest and relaxation'],
        createdAt: '2026-10-20T08:00:00Z',
        updatedAt: '2026-10-20T08:00:00Z',
      },
    ];

    const records = mergeCheckInsWithLegacyJournal(checkIns, []);
    const filteredEmotion = filterWellbeingRecords(records, { emotion: 'Happy' });
    expect(filteredEmotion).toHaveLength(2);

    const filteredContext = filterWellbeingRecords(records, { contextTag: 'Academic workload' });
    expect(filteredContext).toHaveLength(1);
    expect(filteredContext[0].dateKey).toBe('2026-11-11');

    const { weekly, monthly } = computeWeeklyAndMonthlySummaries(records, '2026-11-12');
    expect(weekly.totalDaysLogged).toBe(2);
    expect(weekly.avgMood).toBe(3); // (4+2)/2
    expect(weekly.avgStress).toBe(3); // (2+4)/2

    expect(monthly.totalDaysLogged).toBe(3);
    expect(monthly.emotionFrequency[0]).toEqual({ emotion: 'Happy', count: 2 });

    const empty = computeWellbeingSummary([]);
    expect(empty.totalDaysLogged).toBe(0);
    expect(empty.avgMood).toBeNull();
  });
});
