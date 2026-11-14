import {
  DailyCheckIn,
  JournalEntry,
  Habit,
  HabitLog,
  RestDay,
} from '../types';
import {
  WellbeingHistoryRecord,
  mergeCheckInsWithLegacyJournal,
  filterWellbeingRecords,
  computeWellbeingSummary,
} from './wellbeingEngine';
import {
  isHabitLogCompleted,
  isHabitScheduledForDate,
  calculateHabitDetailStats,
  getHabitTrackingMethod,
  getHabitUnitLabel,
  getWeekBounds,
} from './streakEngine';
import { addDaysToKey, getTodayKey, parseDayKey, formatDayKey } from './dateUtils';

export type WellbeingRangePreset = '7d' | '30d' | '90d' | 'all' | 'custom';

export const MIN_COHORT_SAMPLE_SIZE = 3;

export interface WellbeingDateBounds {
  preset: WellbeingRangePreset;
  startDate?: string;
  endDate: string;
  prevStartDate?: string;
  prevEndDate?: string;
}

export function getWellbeingDateBounds(
  preset: WellbeingRangePreset,
  referenceDateKey: string = getTodayKey(),
  customStart?: string,
  customEnd?: string
): WellbeingDateBounds {
  if (preset === '7d') {
    return {
      preset,
      startDate: addDaysToKey(referenceDateKey, -6),
      endDate: referenceDateKey,
      prevStartDate: addDaysToKey(referenceDateKey, -13),
      prevEndDate: addDaysToKey(referenceDateKey, -7),
    };
  }
  if (preset === '30d') {
    return {
      preset,
      startDate: addDaysToKey(referenceDateKey, -29),
      endDate: referenceDateKey,
      prevStartDate: addDaysToKey(referenceDateKey, -59),
      prevEndDate: addDaysToKey(referenceDateKey, -30),
    };
  }
  if (preset === '90d') {
    return {
      preset,
      startDate: addDaysToKey(referenceDateKey, -89),
      endDate: referenceDateKey,
      prevStartDate: addDaysToKey(referenceDateKey, -179),
      prevEndDate: addDaysToKey(referenceDateKey, -90),
    };
  }
  if (preset === 'custom') {
    let s = customStart || addDaysToKey(referenceDateKey, -29);
    let e = customEnd || referenceDateKey;
    if (s > e) {
      const tmp = s;
      s = e;
      e = tmp;
    }
    const d1 = parseDayKey(s);
    const d2 = parseDayKey(e);
    const spanDays = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const prevEndDate = addDaysToKey(s, -1);
    const prevStartDate = addDaysToKey(prevEndDate, -(spanDays - 1));
    return {
      preset,
      startDate: s,
      endDate: e,
      prevStartDate,
      prevEndDate,
    };
  }
  return {
    preset: 'all',
    startDate: undefined,
    endDate: referenceDateKey,
  };
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function avgOrNull(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return round1(sum / values.length);
}

export interface DailyWellbeingPoint {
  dateKey: string;
  moodScore?: number;
  energyScore?: number;
  stressScore?: number;
  emotions: string[];
  contextTags: string[];
  note?: string;
  journalEntryId?: string;
  source: 'checkin' | 'journal_legacy';
}

export interface RollupPeriodPoint {
  periodKey: string;
  label: string;
  daysLogged: number;
  avgMood: number | null;
  avgEnergy: number | null;
  avgStress: number | null;
}

export interface MoodDistributionBucket {
  score: 1 | 2 | 3 | 4 | 5;
  label: string;
  count: number;
  percentage: number;
}

export interface DayScoreHighlight {
  dateKey: string;
  score: number;
  note?: string;
}

export interface MoodAnalytics {
  dailyPoints: DailyWellbeingPoint[];
  weeklyRollups: RollupPeriodPoint[];
  monthlyRollups: RollupPeriodPoint[];
  avgMood: number | null;
  moodSampleSize: number;
  highestDay: DayScoreHighlight | null;
  lowestDay: DayScoreHighlight | null;
  distribution: MoodDistributionBucket[];
}

const MOOD_BUCKET_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Very low',
  2: 'Low',
  3: 'Okay',
  4: 'Good',
  5: 'Very good',
};

export function computeMoodAnalytics(records: WellbeingHistoryRecord[]): MoodAnalytics {
  const chronological = [...records].sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const dailyPoints: DailyWellbeingPoint[] = chronological.map((r) => ({
    dateKey: r.dateKey,
    moodScore: typeof r.moodScore === 'number' ? r.moodScore : undefined,
    energyScore: typeof r.energyScore === 'number' ? r.energyScore : undefined,
    stressScore: typeof r.stressScore === 'number' ? r.stressScore : undefined,
    emotions: r.emotions || [],
    contextTags: r.contextTags || [],
    note: r.note,
    journalEntryId: r.journalEntryId,
    source: r.source,
  }));

  const moodRecords = dailyPoints.filter(
    (p): p is DailyWellbeingPoint & { moodScore: number } =>
      typeof p.moodScore === 'number' && p.moodScore >= 1 && p.moodScore <= 5
  );

  const avgMood = avgOrNull(moodRecords.map((r) => r.moodScore));

  let highestDay: DayScoreHighlight | null = null;
  let lowestDay: DayScoreHighlight | null = null;

  for (const r of moodRecords) {
    if (!highestDay || r.moodScore >= highestDay.score) {
      highestDay = { dateKey: r.dateKey, score: r.moodScore, note: r.note };
    }
    if (!lowestDay || r.moodScore <= lowestDay.score) {
      lowestDay = { dateKey: r.dateKey, score: r.moodScore, note: r.note };
    }
  }

  const distCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of moodRecords) {
    const rounded = Math.min(5, Math.max(1, Math.round(r.moodScore)));
    distCounts[rounded] += 1;
  }

  const distribution: MoodDistributionBucket[] = ([5, 4, 3, 2, 1] as const).map((score) => ({
    score,
    label: MOOD_BUCKET_LABELS[score],
    count: distCounts[score],
    percentage:
      moodRecords.length > 0 ? Math.round((distCounts[score] / moodRecords.length) * 100) : 0,
  }));

  // Weekly rollups (grouped by Monday week start)
  const weekBuckets = new Map<string, DailyWellbeingPoint[]>();
  const monthBuckets = new Map<string, DailyWellbeingPoint[]>();

  for (const p of dailyPoints) {
    const { mondayKey } = getWeekBounds(p.dateKey);
    const wList = weekBuckets.get(mondayKey) || [];
    wList.push(p);
    weekBuckets.set(mondayKey, wList);

    const monthKey = p.dateKey.slice(0, 7);
    const mList = monthBuckets.get(monthKey) || [];
    mList.push(p);
    monthBuckets.set(monthKey, mList);
  }

  const buildRollup = (
    buckets: Map<string, DailyWellbeingPoint[]>,
    labelFormatter: (key: string) => string
  ): RollupPeriodPoint[] =>
    Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodKey, items]) => ({
        periodKey,
        label: labelFormatter(periodKey),
        daysLogged: items.length,
        avgMood: avgOrNull(
          items.map((x) => x.moodScore).filter((v): v is number => typeof v === 'number')
        ),
        avgEnergy: avgOrNull(
          items.map((x) => x.energyScore).filter((v): v is number => typeof v === 'number')
        ),
        avgStress: avgOrNull(
          items.map((x) => x.stressScore).filter((v): v is number => typeof v === 'number')
        ),
      }));

  const weeklyRollups = buildRollup(weekBuckets, (k) => {
    const d = parseDayKey(k);
    return `Wk ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  });

  const monthlyRollups = buildRollup(monthBuckets, (k) => {
    const d = parseDayKey(`${k}-15`);
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  });

  return {
    dailyPoints,
    weeklyRollups,
    monthlyRollups,
    avgMood,
    moodSampleSize: moodRecords.length,
    highestDay,
    lowestDay,
    distribution,
  };
}

export interface EnergyStressAnalytics {
  avgEnergy: number | null;
  energySampleSize: number;
  avgStress: number | null;
  stressSampleSize: number;
  pairedSampleSize: number;
  bothHighDays: string[]; // energy >= 4 && stress >= 4 (moving high together)
  bothLowDays: string[]; // energy <= 2 && stress <= 2 (both low)
  energizedCalmDays: string[]; // energy >= 4 && stress <= 2 (inverse favorable)
  highStressLowEnergyDays: string[]; // stress >= 4 && energy <= 2 (inverse taxing)
  movingTogetherCount: number; // |energy - stress| <= 1
  divergingCount: number; // |energy - stress| >= 2
  summaryNote: string;
}

export function computeEnergyStressAnalytics(
  records: WellbeingHistoryRecord[]
): EnergyStressAnalytics {
  const chronological = [...records].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const energyVals: number[] = [];
  const stressVals: number[] = [];
  const bothHighDays: string[] = [];
  const bothLowDays: string[] = [];
  const energizedCalmDays: string[] = [];
  const highStressLowEnergyDays: string[] = [];
  let pairedSampleSize = 0;
  let movingTogetherCount = 0;
  let divergingCount = 0;

  for (const r of chronological) {
    if (typeof r.energyScore === 'number') energyVals.push(r.energyScore);
    if (typeof r.stressScore === 'number') stressVals.push(r.stressScore);

    if (typeof r.energyScore === 'number' && typeof r.stressScore === 'number') {
      pairedSampleSize++;
      const e = r.energyScore;
      const s = r.stressScore;

      if (e >= 4 && s >= 4) bothHighDays.push(r.dateKey);
      if (e <= 2 && s <= 2) bothLowDays.push(r.dateKey);
      if (e >= 4 && s <= 2) energizedCalmDays.push(r.dateKey);
      if (s >= 4 && e <= 2) highStressLowEnergyDays.push(r.dateKey);

      if (Math.abs(e - s) <= 1) {
        movingTogetherCount++;
      } else {
        divergingCount++;
      }
    }
  }

  let summaryNote = 'Not enough days with both energy and stress recorded yet.';
  if (pairedSampleSize >= 3) {
    if (divergingCount > movingTogetherCount) {
      summaryNote = `Across ${pairedSampleSize} paired days, energy and stress moved separately more often (${divergingCount} diverging vs ${movingTogetherCount} aligned days).`;
    } else if (movingTogetherCount > divergingCount) {
      summaryNote = `Across ${pairedSampleSize} paired days, energy and stress stayed within 1 point of each other on ${movingTogetherCount} days.`;
    } else {
      summaryNote = `Across ${pairedSampleSize} paired days, energy and stress aligned on ${movingTogetherCount} days and diverged on ${divergingCount} days.`;
    }
  } else if (pairedSampleSize > 0) {
    summaryNote = `Only ${pairedSampleSize} day${pairedSampleSize === 1 ? '' : 's'} have both energy and stress recorded so far; log at least 3 paired days to see clearer patterns.`;
  }

  return {
    avgEnergy: avgOrNull(energyVals),
    energySampleSize: energyVals.length,
    avgStress: avgOrNull(stressVals),
    stressSampleSize: stressVals.length,
    pairedSampleSize,
    bothHighDays,
    bothLowDays,
    energizedCalmDays,
    highStressLowEnergyDays,
    movingTogetherCount,
    divergingCount,
    summaryNote,
  };
}

export interface EmotionFrequencyRow {
  emotion: string;
  count: number;
  sharePercent: number;
}

export interface EmotionShiftRow {
  emotion: string;
  currentCount: number;
  previousCount: number;
  delta: number;
}

export interface EmotionPairRow {
  pair: [string, string];
  label: string;
  count: number;
  dayKeys: string[];
}

export interface EmotionTrendBucket {
  periodKey: string;
  label: string;
  totalDays: number;
  counts: Record<string, number>;
}

export interface EmotionAnalytics {
  totalDaysWithEmotions: number;
  topEmotions: EmotionFrequencyRow[];
  periodShifts: EmotionShiftRow[];
  commonPairs: EmotionPairRow[];
  overTime: EmotionTrendBucket[];
  trackedEmotionNames: string[];
  lowEnergySampleSize: number;
  lowEnergyEmotions: EmotionFrequencyRow[];
  highStressSampleSize: number;
  highStressEmotions: EmotionFrequencyRow[];
}

export function computeEmotionAnalytics(
  currentRecords: WellbeingHistoryRecord[],
  previousRecords: WellbeingHistoryRecord[] = []
): EmotionAnalytics {
  const emotionCounts = new Map<string, number>();
  const pairMap = new Map<string, { pair: [string, string]; dayKeys: string[] }>();
  let totalDaysWithEmotions = 0;

  const lowEnergyRecords = currentRecords.filter(
    (r) => typeof r.energyScore === 'number' && r.energyScore <= 2
  );
  const highStressRecords = currentRecords.filter(
    (r) => typeof r.stressScore === 'number' && r.stressScore >= 4
  );

  for (const r of currentRecords) {
    const uniqueEmotions = Array.from(
      new Set((r.emotions || []).map((e) => e.trim()).filter(Boolean))
    );
    if (uniqueEmotions.length > 0) {
      totalDaysWithEmotions++;
    }
    for (const em of uniqueEmotions) {
      emotionCounts.set(em, (emotionCounts.get(em) || 0) + 1);
    }
    if (uniqueEmotions.length >= 2) {
      const sorted = [...uniqueEmotions].sort((a, b) => a.localeCompare(b));
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const key = `${sorted[i]}|||${sorted[j]}`;
          const existing = pairMap.get(key) || {
            pair: [sorted[i], sorted[j]] as [string, string],
            dayKeys: [],
          };
          existing.dayKeys.push(r.dateKey);
          pairMap.set(key, existing);
        }
      }
    }
  }

  const denom = Math.max(1, currentRecords.length);
  const topEmotions: EmotionFrequencyRow[] = Array.from(emotionCounts.entries())
    .map(([emotion, count]) => ({
      emotion,
      count,
      sharePercent: Math.round((count / denom) * 100),
    }))
    .sort((a, b) => b.count - a.count || a.emotion.localeCompare(b.emotion));

  // Previous period shifts
  const prevCounts = new Map<string, number>();
  for (const r of previousRecords) {
    const uniqueEmotions = Array.from(
      new Set((r.emotions || []).map((e) => e.trim()).filter(Boolean))
    );
    for (const em of uniqueEmotions) {
      prevCounts.set(em, (prevCounts.get(em) || 0) + 1);
    }
  }

  const allEmotionKeys = new Set([...emotionCounts.keys(), ...prevCounts.keys()]);
  const periodShifts: EmotionShiftRow[] = Array.from(allEmotionKeys)
    .map((emotion) => {
      const cur = emotionCounts.get(emotion) || 0;
      const prev = prevCounts.get(emotion) || 0;
      return {
        emotion,
        currentCount: cur,
        previousCount: prev,
        delta: cur - prev,
      };
    })
    .filter((row) => row.currentCount > 0 || row.previousCount > 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.currentCount - a.currentCount);

  const commonPairs: EmotionPairRow[] = Array.from(pairMap.values())
    .filter((p) => p.dayKeys.length >= 2)
    .map((p) => ({
      pair: p.pair,
      label: `${p.pair[0]} + ${p.pair[1]}`,
      count: p.dayKeys.length,
      dayKeys: p.dayKeys.sort(),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  // Emotion frequency over time (weekly buckets)
  const trackedEmotionNames = topEmotions.slice(0, 5).map((e) => e.emotion);
  const weekMap = new Map<string, WellbeingHistoryRecord[]>();
  for (const r of currentRecords) {
    const { mondayKey } = getWeekBounds(r.dateKey);
    const list = weekMap.get(mondayKey) || [];
    list.push(r);
    weekMap.set(mondayKey, list);
  }

  const overTime: EmotionTrendBucket[] = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodKey, items]) => {
      const counts: Record<string, number> = {};
      for (const name of trackedEmotionNames) counts[name] = 0;
      for (const item of items) {
        const set = new Set((item.emotions || []).map((e) => e.trim()));
        for (const name of trackedEmotionNames) {
          if (set.has(name)) counts[name] += 1;
        }
      }
      const d = parseDayKey(periodKey);
      return {
        periodKey,
        label: `Wk ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        totalDays: items.length,
        counts,
      };
    });

  const countInSubset = (subset: WellbeingHistoryRecord[]): EmotionFrequencyRow[] => {
    const map = new Map<string, number>();
    for (const r of subset) {
      const uniq = new Set((r.emotions || []).map((e) => e.trim()).filter(Boolean));
      uniq.forEach((em) => map.set(em, (map.get(em) || 0) + 1));
    }
    const subDenom = Math.max(1, subset.length);
    return Array.from(map.entries())
      .map(([emotion, count]) => ({
        emotion,
        count,
        sharePercent: Math.round((count / subDenom) * 100),
      }))
      .sort((a, b) => b.count - a.count || a.emotion.localeCompare(b.emotion));
  };

  return {
    totalDaysWithEmotions,
    topEmotions,
    periodShifts,
    commonPairs,
    overTime,
    trackedEmotionNames,
    lowEnergySampleSize: lowEnergyRecords.length,
    lowEnergyEmotions: countInSubset(lowEnergyRecords),
    highStressSampleSize: highStressRecords.length,
    highStressEmotions: countInSubset(highStressRecords),
  };
}

export interface CohortGroupStats {
  label: string;
  count: number;
  moodCount: number;
  avgMood: number | null;
  energyCount: number;
  avgEnergy: number | null;
  stressCount: number;
  avgStress: number | null;
  dayKeys: string[];
}

export interface CohortComparisonResult {
  id: string;
  label: string;
  category: 'context' | 'habit' | 'journaling';
  withGroup: CohortGroupStats;
  withoutGroup: CohortGroupStats;
  moodDiff: number | null; // with - without
  energyDiff: number | null;
  stressDiff: number | null;
  minRequiredPerGroup: number;
  insufficientData: boolean;
  summaryText: string;
}

function summarizeGroup(label: string, records: WellbeingHistoryRecord[]): CohortGroupStats {
  const moodVals = records.map((r) => r.moodScore).filter((v): v is number => typeof v === 'number');
  const energyVals = records.map((r) => r.energyScore).filter((v): v is number => typeof v === 'number');
  const stressVals = records.map((r) => r.stressScore).filter((v): v is number => typeof v === 'number');

  return {
    label,
    count: records.length,
    moodCount: moodVals.length,
    avgMood: avgOrNull(moodVals),
    energyCount: energyVals.length,
    avgEnergy: avgOrNull(energyVals),
    stressCount: stressVals.length,
    avgStress: avgOrNull(stressVals),
    dayKeys: records.map((r) => r.dateKey).sort((a, b) => b.localeCompare(a)),
  };
}

/**
 * Pure comparator: evaluates a binary factor strictly across recorded wellbeing days
 * (never fabricates scores or counts unrecorded days as low/negative).
 * Requires at least MIN_COHORT_SAMPLE_SIZE (3) recorded days in BOTH cohorts before
 * presenting any comparative pattern.
 */
export function compareWellbeingCohorts(options: {
  id: string;
  label: string;
  category: 'context' | 'habit' | 'journaling';
  records: WellbeingHistoryRecord[];
  withLabel: string;
  withoutLabel: string;
  matcher: (record: WellbeingHistoryRecord) => boolean;
}): CohortComparisonResult {
  const { id, label, category, records, withLabel, withoutLabel, matcher } = options;

  const withRecs: WellbeingHistoryRecord[] = [];
  const withoutRecs: WellbeingHistoryRecord[] = [];

  for (const rec of records) {
    if (matcher(rec)) {
      withRecs.push(rec);
    } else {
      withoutRecs.push(rec);
    }
  }

  const withGroup = summarizeGroup(withLabel, withRecs);
  const withoutGroup = summarizeGroup(withoutLabel, withoutRecs);

  const moodDiff =
    withGroup.avgMood !== null && withoutGroup.avgMood !== null
      ? round1(withGroup.avgMood - withoutGroup.avgMood)
      : null;
  const energyDiff =
    withGroup.avgEnergy !== null && withoutGroup.avgEnergy !== null
      ? round1(withGroup.avgEnergy - withoutGroup.avgEnergy)
      : null;
  const stressDiff =
    withGroup.avgStress !== null && withoutGroup.avgStress !== null
      ? round1(withGroup.avgStress - withoutGroup.avgStress)
      : null;

  const insufficientData =
    withGroup.count < MIN_COHORT_SAMPLE_SIZE || withoutGroup.count < MIN_COHORT_SAMPLE_SIZE;

  let summaryText: string;
  if (records.length === 0) {
    summaryText = 'No wellbeing records available in this period yet.';
  } else if (insufficientData) {
    summaryText = `Insufficient sample size to compare reliably (${withGroup.count} days in "${withLabel}" vs ${withoutGroup.count} days in "${withoutLabel}"; at least ${MIN_COHORT_SAMPLE_SIZE} recorded days per group are needed).`;
  } else {
    const parts: string[] = [];
    if (moodDiff !== null) {
      parts.push(
        `average mood was ${withGroup.avgMood}/5 vs ${withoutGroup.avgMood}/5`
      );
    }
    if (energyDiff !== null && Math.abs(energyDiff) >= 0.3) {
      parts.push(
        `energy averaged ${withGroup.avgEnergy}/5 vs ${withoutGroup.avgEnergy}/5`
      );
    }
    if (stressDiff !== null && Math.abs(stressDiff) >= 0.3) {
      parts.push(
        `stress averaged ${withGroup.avgStress}/5 vs ${withoutGroup.avgStress}/5`
      );
    }
    const metricLine =
      parts.length > 0
        ? parts.join(', and ')
        : 'recorded mood, energy, and stress averages were similar';

    summaryText = `Across recorded days for "${withLabel}" (n=${withGroup.count}) compared with "${withoutLabel}" (n=${withoutGroup.count}), ${metricLine}. Recorded patterns reflect correlation in your data, not causation.`;
  }

  return {
    id,
    label,
    category,
    withGroup,
    withoutGroup,
    moodDiff,
    energyDiff,
    stressDiff,
    minRequiredPerGroup: MIN_COHORT_SAMPLE_SIZE,
    insufficientData,
    summaryText,
  };
}

export interface HabitConsistencyDayPoint {
  dateKey: string;
  scheduledCount: number;
  completedCount: number;
  partialCount: number;
  ratePercent: number | null;
}

export interface HabitComparisonItem {
  habitId: string;
  title: string;
  category: string;
  status: string;
  trackingMethod: string;
  unit: string;
  completionPercentage: number;
  weeklyConsistency: number;
  monthlyConsistency: number;
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  scheduledDaysEvaluated: number;
  averageValue: number | null;
}

export interface HabitInsightsSummary {
  dailyTrend: HabitConsistencyDayPoint[];
  periodConsistencyPercent: number | null;
  weeklyConsistencyPercent: number | null;
  monthlyConsistencyPercent: number | null;
  individualHabits: HabitComparisonItem[];
  consistencyVsWellbeing: CohortComparisonResult | null;
}

export function computeHabitInsights(options: {
  habits: Habit[];
  logs: HabitLog[];
  restDays: RestDay[];
  records: WellbeingHistoryRecord[];
  startDate?: string;
  endDate: string;
}): HabitInsightsSummary {
  const { habits, logs, restDays, records, endDate } = options;
  const activeOrHistoricalHabits = habits.filter((h) => h.status !== 'archived');

  // Determine window start for daily trend (default last 30 days if all time)
  let windowStart = options.startDate;
  if (!windowStart) {
    const earliestLog = logs.map((l) => l.date).sort()[0];
    const thirtyAgo = addDaysToKey(endDate, -29);
    windowStart = earliestLog && earliestLog < thirtyAgo ? earliestLog : thirtyAgo;
    // Cap daily chart span at 120 days if 'all' is very long
    const minCap = addDaysToKey(endDate, -119);
    if (windowStart < minCap) windowStart = minCap;
  }

  const dailyTrend: HabitConsistencyDayPoint[] = [];
  const rateByDate = new Map<string, number>();

  let cur = windowStart;
  let safety = 0;
  let totalScheduledInPeriod = 0;
  let totalCompletedInPeriod = 0;

  while (cur <= endDate && safety < 400) {
    safety++;
    let scheduled = 0;
    let completed = 0;
    let partial = 0;

    for (const habit of activeOrHistoricalHabits) {
      if (habit.status === 'paused') continue;
      const log = logs.find((l) => l.habitId === habit.id && l.date === cur);
      const isRest = restDays.some((r) => r.habitId === habit.id && r.dateKey === cur);
      const isSched = isHabitScheduledForDate({ ...habit, status: 'active' }, cur);
      const done = isHabitLogCompleted(log);

      if (done) {
        scheduled++;
        completed++;
        if (log?.isPartial || log?.status === 'partial') partial++;
      } else if (isSched && !isRest) {
        scheduled++;
      }
    }

    const ratePercent = scheduled > 0 ? Math.round((completed / scheduled) * 100) : null;
    if (ratePercent !== null) {
      rateByDate.set(cur, ratePercent);
      totalScheduledInPeriod += scheduled;
      totalCompletedInPeriod += completed;
    }

    dailyTrend.push({
      dateKey: cur,
      scheduledCount: scheduled,
      completedCount: completed,
      partialCount: partial,
      ratePercent,
    });

    cur = addDaysToKey(cur, 1);
  }

  const computeRollingHabitRate = (days: number): number | null => {
    const rollStart = addDaysToKey(endDate, -(days - 1));
    let sched = 0;
    let done = 0;
    for (const pt of dailyTrend) {
      if (pt.dateKey >= rollStart && pt.dateKey <= endDate) {
        sched += pt.scheduledCount;
        done += pt.completedCount;
      }
    }
    if (sched === 0) return null;
    return Math.round((done / sched) * 100);
  };

  const individualHabits: HabitComparisonItem[] = activeOrHistoricalHabits
    .map((h) => {
      const detail = calculateHabitDetailStats(h, logs, restDays, {
        startDate: options.startDate || addDaysToKey(endDate, -29),
        endDate,
        referenceDateKey: endDate,
      });
      return {
        habitId: h.id,
        title: h.title,
        category: h.customCategory || h.category || 'routine',
        status: h.status || 'active',
        trackingMethod: getHabitTrackingMethod(h),
        unit: getHabitUnitLabel(h),
        completionPercentage: detail.completionPercentage,
        weeklyConsistency: detail.weeklyConsistency,
        monthlyConsistency: detail.monthlyConsistency,
        currentStreak: detail.currentStreak,
        bestStreak: detail.bestStreak,
        totalCompletions: detail.totalCompletions,
        scheduledDaysEvaluated: detail.scheduledDaysEvaluated,
        averageValue: detail.averageValue,
      };
    })
    .sort(
      (a, b) =>
        b.completionPercentage - a.completionPercentage ||
        b.currentStreak - a.currentStreak ||
        a.title.localeCompare(b.title)
    );

  // Compare wellbeing on high habit consistency days (>= 75%) vs lower (< 75%), only on days with scheduled habits
  const recordsWithHabits = records.filter((r) => rateByDate.has(r.dateKey));
  const consistencyVsWellbeing =
    recordsWithHabits.length > 0 && activeOrHistoricalHabits.length > 0
      ? compareWellbeingCohorts({
          id: 'habit-consistency-high-vs-low',
          label: 'Higher habit completion days (≥75%) vs Lower (<75%)',
          category: 'habit',
          records: recordsWithHabits,
          withLabel: '≥75% habits done',
          withoutLabel: '<75% habits done',
          matcher: (rec) => (rateByDate.get(rec.dateKey) ?? 0) >= 75,
        })
      : null;

  return {
    dailyTrend,
    periodConsistencyPercent:
      totalScheduledInPeriod > 0
        ? Math.round((totalCompletedInPeriod / totalScheduledInPeriod) * 100)
        : null,
    weeklyConsistencyPercent: computeRollingHabitRate(7),
    monthlyConsistencyPercent: computeRollingHabitRate(30),
    individualHabits,
    consistencyVsWellbeing,
  };
}

export function buildAnalyticalComparisons(options: {
  records: WellbeingHistoryRecord[];
  habits: Habit[];
  habitLogs: HabitLog[];
  journalEntries: JournalEntry[];
}): CohortComparisonResult[] {
  const { records, habits, habitLogs, journalEntries } = options;
  if (records.length === 0) return [];

  const comparisons: CohortComparisonResult[] = [];

  // 1. Days when journaling occurred vs days without journal text
  const journaledDates = new Set(
    journalEntries
      .filter((j) => !j.deletedAt && (j.content.trim().length > 0 || (j.title || '').trim().length > 0))
      .map((j) => j.date)
  );
  comparisons.push(
    compareWellbeingCohorts({
      id: 'journal-days',
      label: 'Days with a journal entry',
      category: 'journaling',
      records,
      withLabel: 'Journaled',
      withoutLabel: 'No journal entry',
      matcher: (rec) => journaledDates.has(rec.dateKey),
    })
  );

  // 2. Context tags present across user records (prioritize key tags)
  const tagCounts = new Map<string, number>();
  for (const r of records) {
    for (const tag of r.contextTags || []) {
      const clean = tag.trim();
      if (clean) tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
    }
  }
  const orderedTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);

  for (const tag of orderedTags) {
    const targetLower = tag.toLowerCase();
    comparisons.push(
      compareWellbeingCohorts({
        id: `context-${tag}`,
        label: tag,
        category: 'context',
        records,
        withLabel: `With ${tag}`,
        withoutLabel: `Without ${tag}`,
        matcher: (rec) =>
          (rec.contextTags || []).some((t) => t.trim().toLowerCase() === targetLower),
      })
    );
  }

  // 3. Individual habits logged vs not logged on recorded wellbeing days
  for (const habit of habits.filter((h) => h.status !== 'archived')) {
    const doneDates = new Set(
      habitLogs
        .filter((l) => l.habitId === habit.id && isHabitLogCompleted(l))
        .map((l) => l.date)
    );
    comparisons.push(
      compareWellbeingCohorts({
        id: `habit-${habit.id}`,
        label: `Habit: ${habit.title}`,
        category: 'habit',
        records,
        withLabel: `Completed ${habit.title}`,
        withoutLabel: `Did not log ${habit.title}`,
        matcher: (rec) => doneDates.has(rec.dateKey),
      })
    );
  }

  return comparisons;
}

export interface PeriodMetricsSnapshot {
  label: string;
  startDate: string;
  endDate: string;
  daysLogged: number;
  avgMood: number | null;
  avgEnergy: number | null;
  avgStress: number | null;
  moodDelta: number | null;
  energyDelta: number | null;
  stressDelta: number | null;
  habitConsistencyPercent: number | null;
  habitConsistencyDelta: number | null;
  topEmotions: { emotion: string; count: number }[];
  observations: string[];
}

export interface PeriodComparisonReport {
  weekly: PeriodMetricsSnapshot;
  monthly: PeriodMetricsSnapshot;
}

function calculateHabitRateForWindow(
  habits: Habit[],
  logs: HabitLog[],
  restDays: RestDay[],
  startDate: string,
  endDate: string
): number | null {
  const active = habits.filter((h) => h.status !== 'paused' && h.status !== 'archived');
  if (active.length === 0) return null;

  let scheduled = 0;
  let completed = 0;
  let cur = startDate;
  let safety = 0;

  while (cur <= endDate && safety < 120) {
    safety++;
    for (const habit of active) {
      const log = logs.find((l) => l.habitId === habit.id && l.date === cur);
      const isRest = restDays.some((r) => r.habitId === habit.id && r.dateKey === cur);
      const isSched = isHabitScheduledForDate({ ...habit, status: 'active' }, cur);
      if (isHabitLogCompleted(log)) {
        scheduled++;
        completed++;
      } else if (isSched && !isRest) {
        scheduled++;
      }
    }
    cur = addDaysToKey(cur, 1);
  }

  if (scheduled === 0) return null;
  return Math.round((completed / scheduled) * 100);
}

function buildSnapshotForWindow(options: {
  label: string;
  records: WellbeingHistoryRecord[];
  habits: Habit[];
  habitLogs: HabitLog[];
  restDays: RestDay[];
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
}): PeriodMetricsSnapshot {
  const {
    label,
    records,
    habits,
    habitLogs,
    restDays,
    startDate,
    endDate,
    prevStartDate,
    prevEndDate,
  } = options;

  const curRecords = filterWellbeingRecords(records, { startDate, endDate });
  const prevRecords = filterWellbeingRecords(records, {
    startDate: prevStartDate,
    endDate: prevEndDate,
  });

  const curSummary = computeWellbeingSummary(curRecords);
  const prevSummary = computeWellbeingSummary(prevRecords);

  const curHabitRate = calculateHabitRateForWindow(
    habits,
    habitLogs,
    restDays,
    startDate,
    endDate
  );
  const prevHabitRate = calculateHabitRateForWindow(
    habits,
    habitLogs,
    restDays,
    prevStartDate,
    prevEndDate
  );

  const moodDelta =
    curSummary.avgMood !== null && prevSummary.avgMood !== null
      ? round1(curSummary.avgMood - prevSummary.avgMood)
      : null;
  const energyDelta =
    curSummary.avgEnergy !== null && prevSummary.avgEnergy !== null
      ? round1(curSummary.avgEnergy - prevSummary.avgEnergy)
      : null;
  const stressDelta =
    curSummary.avgStress !== null && prevSummary.avgStress !== null
      ? round1(curSummary.avgStress - prevSummary.avgStress)
      : null;
  const habitConsistencyDelta =
    curHabitRate !== null && prevHabitRate !== null ? curHabitRate - prevHabitRate : null;

  const observations: string[] = [];

  if (curSummary.totalDaysLogged === 0) {
    observations.push(`No mood or check-in entries recorded between ${startDate} and ${endDate}.`);
  } else {
    observations.push(
      `${curSummary.totalDaysLogged} day${curSummary.totalDaysLogged === 1 ? '' : 's'} with wellbeing data logged in this window.`
    );
  }

  if (moodDelta !== null && Math.abs(moodDelta) >= 0.3 && prevSummary.totalDaysLogged >= 2) {
    observations.push(
      `Average mood ${moodDelta > 0 ? 'increased' : 'decreased'} by ${Math.abs(moodDelta)} points vs the prior period (${prevSummary.avgMood} → ${curSummary.avgMood}).`
    );
  }
  if (energyDelta !== null && Math.abs(energyDelta) >= 0.3 && prevSummary.totalDaysLogged >= 2) {
    observations.push(
      `Average energy ${energyDelta > 0 ? 'rose' : 'dipped'} by ${Math.abs(energyDelta)} points vs the prior period (${prevSummary.avgEnergy} → ${curSummary.avgEnergy}).`
    );
  }
  if (stressDelta !== null && Math.abs(stressDelta) >= 0.3 && prevSummary.totalDaysLogged >= 2) {
    observations.push(
      `Average stress was ${stressDelta > 0 ? 'higher' : 'lower'} by ${Math.abs(stressDelta)} points vs the prior period (${prevSummary.avgStress} → ${curSummary.avgStress}).`
    );
  }
  if (habitConsistencyDelta !== null && Math.abs(habitConsistencyDelta) >= 5) {
    observations.push(
      `Scheduled habit completion changed by ${habitConsistencyDelta > 0 ? '+' : ''}${habitConsistencyDelta}% compared with the prior period.`
    );
  }
  if (curSummary.emotionFrequency.length > 0) {
    const top = curSummary.emotionFrequency[0];
    observations.push(
      `Most frequently recorded emotion: ${top.emotion} (${top.count} day${top.count === 1 ? '' : 's'}).`
    );
  }

  return {
    label,
    startDate,
    endDate,
    daysLogged: curSummary.totalDaysLogged,
    avgMood: curSummary.avgMood,
    avgEnergy: curSummary.avgEnergy,
    avgStress: curSummary.avgStress,
    moodDelta,
    energyDelta,
    stressDelta,
    habitConsistencyPercent: curHabitRate,
    habitConsistencyDelta,
    topEmotions: curSummary.emotionFrequency.slice(0, 3),
    observations: observations.slice(0, 4),
  };
}

export function buildPeriodComparisonReport(options: {
  checkIns: DailyCheckIn[];
  journalEntries: JournalEntry[];
  habits: Habit[];
  habitLogs: HabitLog[];
  restDays: RestDay[];
  referenceDateKey?: string;
}): PeriodComparisonReport {
  const referenceDateKey = options.referenceDateKey || getTodayKey();
  const records = mergeCheckInsWithLegacyJournal(options.checkIns, options.journalEntries);

  const weekly = buildSnapshotForWindow({
    label: 'Last 7 days',
    records,
    habits: options.habits,
    habitLogs: options.habitLogs,
    restDays: options.restDays,
    startDate: addDaysToKey(referenceDateKey, -6),
    endDate: referenceDateKey,
    prevStartDate: addDaysToKey(referenceDateKey, -13),
    prevEndDate: addDaysToKey(referenceDateKey, -7),
  });

  const monthly = buildSnapshotForWindow({
    label: 'Last 30 days',
    records,
    habits: options.habits,
    habitLogs: options.habitLogs,
    restDays: options.restDays,
    startDate: addDaysToKey(referenceDateKey, -29),
    endDate: referenceDateKey,
    prevStartDate: addDaysToKey(referenceDateKey, -59),
    prevEndDate: addDaysToKey(referenceDateKey, -30),
  });

  return { weekly, monthly };
}

export interface DayInspectionDetail {
  dateKey: string;
  wellbeing?: WellbeingHistoryRecord;
  journalEntries: {
    id: string;
    title: string;
    excerpt: string;
    wordCount: number;
  }[];
  completedHabits: { habitId: string; title: string; value?: number; unit?: string }[];
  skippedHabits: { habitId: string; title: string }[];
}

export function buildDayInspectionDetails(options: {
  dateKeys: string[];
  records: WellbeingHistoryRecord[];
  journalEntries: JournalEntry[];
  habits: Habit[];
  habitLogs: HabitLog[];
}): DayInspectionDetail[] {
  const { dateKeys, records, journalEntries, habits, habitLogs } = options;
  const recordMap = new Map<string, WellbeingHistoryRecord>(records.map((r) => [r.dateKey, r]));
  const habitMap = new Map<string, Habit>(habits.map((h) => [h.id, h]));

  return [...dateKeys]
    .sort((a, b) => b.localeCompare(a))
    .map((dateKey) => {
      const wellbeing = recordMap.get(dateKey);
      const dayJournals = journalEntries
        .filter((j) => !j.deletedAt && j.date === dateKey)
        .map((j) => ({
          id: j.id,
          title: j.title?.trim() || 'Journal Entry',
          excerpt: j.content.trim().slice(0, 140),
          wordCount: j.wordCount || 0,
        }));

      const dayLogs = habitLogs.filter((l) => l.date === dateKey);
      const completedHabits: DayInspectionDetail['completedHabits'] = [];
      const skippedHabits: DayInspectionDetail['skippedHabits'] = [];

      for (const log of dayLogs) {
        const habit = habitMap.get(log.habitId);
        if (!habit) continue;
        if (log.status === 'skipped') {
          skippedHabits.push({ habitId: habit.id, title: habit.title });
        } else if (isHabitLogCompleted(log)) {
          completedHabits.push({
            habitId: habit.id,
            title: habit.title,
            value: log.value,
            unit: log.unit || getHabitUnitLabel(habit),
          });
        }
      }

      return {
        dateKey,
        wellbeing,
        journalEntries: dayJournals,
        completedHabits,
        skippedHabits,
      };
    });
}

export { formatDayKey };
