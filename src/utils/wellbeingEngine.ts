import { DailyCheckIn, JournalEntry } from '../types';
import { addDaysToKey, getTodayKey } from './dateUtils';

export interface ScaleLevelDescriptor {
  score: 1 | 2 | 3 | 4 | 5;
  label: string;
  shortLabel: string;
}

export const MOOD_LEVELS: ScaleLevelDescriptor[] = [
  { score: 1, label: 'Very low', shortLabel: 'Very low' },
  { score: 2, label: 'Low', shortLabel: 'Low' },
  { score: 3, label: 'Okay / neutral', shortLabel: 'Okay' },
  { score: 4, label: 'Good', shortLabel: 'Good' },
  { score: 5, label: 'Very good', shortLabel: 'Very good' },
];

export const ENERGY_LEVELS: ScaleLevelDescriptor[] = [
  { score: 1, label: 'Completely drained', shortLabel: 'Drained' },
  { score: 2, label: 'Low energy', shortLabel: 'Low' },
  { score: 3, label: 'Moderate', shortLabel: 'Moderate' },
  { score: 4, label: 'Energized', shortLabel: 'Energized' },
  { score: 5, label: 'Very energized', shortLabel: 'Very high' },
];

export const STRESS_LEVELS: ScaleLevelDescriptor[] = [
  { score: 1, label: 'Very calm', shortLabel: 'Very calm' },
  { score: 2, label: 'Slightly stressed', shortLabel: 'Slight' },
  { score: 3, label: 'Moderate stress', shortLabel: 'Moderate' },
  { score: 4, label: 'High stress', shortLabel: 'High' },
  { score: 5, label: 'Extremely stressed', shortLabel: 'Extreme' },
];

export const DEFAULT_EMOTIONS: string[] = [
  'Happy',
  'Content',
  'Calm',
  'Excited',
  'Motivated',
  'Grateful',
  'Hopeful',
  'Anxious',
  'Sad',
  'Lonely',
  'Frustrated',
  'Angry',
  'Overwhelmed',
  'Bored',
  'Tired',
  'Confused',
];

export const DAILY_CONTEXT_FACTORS: string[] = [
  'Sleep quality',
  'Exercise',
  'Academic workload',
  'Social interaction',
  'Time alone',
  'Creative activity',
  'Physical environment',
  'Rest and relaxation',
];

export function getScaleLabel(
  scale: 'mood' | 'energy' | 'stress',
  score?: number
): string {
  if (!score || score < 1 || score > 5) return 'Not rated';
  const rounded = Math.round(score) as 1 | 2 | 3 | 4 | 5;
  const list =
    scale === 'mood'
      ? MOOD_LEVELS
      : scale === 'energy'
      ? ENERGY_LEVELS
      : STRESS_LEVELS;
  return list.find((item) => item.score === rounded)?.label || 'Not rated';
}

export interface WellbeingHistoryRecord {
  id: string;
  dateKey: string;
  source: 'checkin' | 'journal_legacy';
  moodScore?: number;
  energyScore?: number;
  stressScore?: number;
  emotions: string[];
  contextTags: string[];
  note?: string;
  journalEntryId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Pure helper: Combines dedicated DailyCheckIn records with historical JournalEntry mood/energy
 * records for days that do not yet have a dedicated check-in.
 * Guarantees each dateKey is counted at most once (no double counting).
 */
export function mergeCheckInsWithLegacyJournal(
  checkIns: DailyCheckIn[] = [],
  journalEntries: JournalEntry[] = []
): WellbeingHistoryRecord[] {
  const byDate = new Map<string, WellbeingHistoryRecord>();

  // 1. Dedicated DailyCheckIns take priority (deduped cleanly if duplicate rows exist)
  const sortedCheckIns = [...checkIns].sort((a, b) =>
    (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)
  );

  for (const ci of sortedCheckIns) {
    if (!ci.dateKey || byDate.has(ci.dateKey)) continue;
    byDate.set(ci.dateKey, {
      id: ci.id,
      dateKey: ci.dateKey,
      source: 'checkin',
      moodScore: ci.moodScore,
      energyScore: ci.energyScore,
      stressScore: ci.stressScore,
      emotions: Array.isArray(ci.emotions) ? ci.emotions : [],
      contextTags: Array.isArray(ci.contextTags) ? ci.contextTags : [],
      note: ci.note,
      journalEntryId: ci.journalEntryId,
      createdAt: ci.createdAt,
      updatedAt: ci.updatedAt || ci.createdAt,
    });
  }

  // 2. Backfill days where an active JournalEntry recorded mood/energy but no DailyCheckIn exists
  const activeJournals = journalEntries
    .filter((j) => !j.deletedAt && j.date && (j.moodScore > 0 || j.energyScore > 0))
    .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));

  for (const j of activeJournals) {
    if (byDate.has(j.date)) continue;
    // Also skip if another check-in already links to this journal entry
    const alreadyLinked = Array.from(byDate.values()).some((r) => r.journalEntryId === j.id);
    if (alreadyLinked) continue;

    byDate.set(j.date, {
      id: `legacy-${j.id}`,
      dateKey: j.date,
      source: 'journal_legacy',
      moodScore: j.moodScore >= 1 && j.moodScore <= 5 ? j.moodScore : undefined,
      energyScore: j.energyScore >= 1 && j.energyScore <= 5 ? j.energyScore : undefined,
      stressScore: undefined,
      emotions: [],
      contextTags: [],
      note: undefined,
      journalEntryId: j.id,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt || j.createdAt,
    });
  }

  return Array.from(byDate.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

export interface WellbeingFilterOptions {
  startDate?: string;
  endDate?: string;
  emotion?: string;
  contextTag?: string;
}

export function filterWellbeingRecords(
  records: WellbeingHistoryRecord[],
  options: WellbeingFilterOptions = {}
): WellbeingHistoryRecord[] {
  const { startDate, endDate, emotion, contextTag } = options;
  return records.filter((rec) => {
    if (startDate && rec.dateKey < startDate) return false;
    if (endDate && rec.dateKey > endDate) return false;
    if (emotion && emotion !== 'all') {
      const target = emotion.toLowerCase();
      if (!rec.emotions.some((e) => e.toLowerCase() === target)) return false;
    }
    if (contextTag && contextTag !== 'all') {
      const target = contextTag.toLowerCase();
      if (!rec.contextTags.some((t) => t.toLowerCase() === target)) return false;
    }
    return true;
  });
}

export interface EmotionFrequencyItem {
  emotion: string;
  count: number;
}

export interface ContextFrequencyItem {
  tag: string;
  count: number;
}

export interface WellbeingPeriodSummary {
  totalDaysLogged: number;
  dedicatedCheckInsCount: number;
  avgMood: number | null;
  avgEnergy: number | null;
  avgStress: number | null;
  emotionFrequency: EmotionFrequencyItem[];
  contextFrequency: ContextFrequencyItem[];
}

export function computeWellbeingSummary(
  records: WellbeingHistoryRecord[]
): WellbeingPeriodSummary {
  if (records.length === 0) {
    return {
      totalDaysLogged: 0,
      dedicatedCheckInsCount: 0,
      avgMood: null,
      avgEnergy: null,
      avgStress: null,
      emotionFrequency: [],
      contextFrequency: [],
    };
  }

  let moodSum = 0;
  let moodCount = 0;
  let energySum = 0;
  let energyCount = 0;
  let stressSum = 0;
  let stressCount = 0;
  let dedicatedCheckInsCount = 0;

  const emotionMap = new Map<string, number>();
  const contextMap = new Map<string, number>();

  for (const r of records) {
    if (r.source === 'checkin') dedicatedCheckInsCount++;
    if (typeof r.moodScore === 'number' && r.moodScore >= 1 && r.moodScore <= 5) {
      moodSum += r.moodScore;
      moodCount++;
    }
    if (typeof r.energyScore === 'number' && r.energyScore >= 1 && r.energyScore <= 5) {
      energySum += r.energyScore;
      energyCount++;
    }
    if (typeof r.stressScore === 'number' && r.stressScore >= 1 && r.stressScore <= 5) {
      stressSum += r.stressScore;
      stressCount++;
    }

    for (const em of r.emotions || []) {
      const clean = em.trim();
      if (!clean) continue;
      emotionMap.set(clean, (emotionMap.get(clean) || 0) + 1);
    }

    for (const tag of r.contextTags || []) {
      const clean = tag.trim();
      if (!clean) continue;
      contextMap.set(clean, (contextMap.get(clean) || 0) + 1);
    }
  }

  const emotionFrequency: EmotionFrequencyItem[] = Array.from(emotionMap.entries())
    .map(([emotion, count]) => ({ emotion, count }))
    .sort((a, b) => b.count - a.count || a.emotion.localeCompare(b.emotion));

  const contextFrequency: ContextFrequencyItem[] = Array.from(contextMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  return {
    totalDaysLogged: records.length,
    dedicatedCheckInsCount,
    avgMood: moodCount > 0 ? Math.round((moodSum / moodCount) * 10) / 10 : null,
    avgEnergy: energyCount > 0 ? Math.round((energySum / energyCount) * 10) / 10 : null,
    avgStress: stressCount > 0 ? Math.round((stressSum / stressCount) * 10) / 10 : null,
    emotionFrequency,
    contextFrequency,
  };
}

/**
 * Computes both rolling 7-day (weekly) and 30-day (monthly) summaries cleanly.
 */
export function computeWeeklyAndMonthlySummaries(
  records: WellbeingHistoryRecord[],
  referenceDateKey: string = getTodayKey()
): {
  weekly: WellbeingPeriodSummary;
  monthly: WellbeingPeriodSummary;
} {
  const weekStart = addDaysToKey(referenceDateKey, -6);
  const monthStart = addDaysToKey(referenceDateKey, -29);

  const weeklyRecords = filterWellbeingRecords(records, {
    startDate: weekStart,
    endDate: referenceDateKey,
  });
  const monthlyRecords = filterWellbeingRecords(records, {
    startDate: monthStart,
    endDate: referenceDateKey,
  });

  return {
    weekly: computeWellbeingSummary(weeklyRecords),
    monthly: computeWellbeingSummary(monthlyRecords),
  };
}
