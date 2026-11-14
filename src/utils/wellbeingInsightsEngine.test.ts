import { describe, it, expect } from 'vitest';
import {
  getWellbeingDateBounds,
  computeMoodAnalytics,
  computeEnergyStressAnalytics,
  computeEmotionAnalytics,
  computeHabitInsights,
  compareWellbeingCohorts,
  buildAnalyticalComparisons,
  buildPeriodComparisonReport,
  buildDayInspectionDetails,
  MIN_COHORT_SAMPLE_SIZE,
} from './wellbeingInsightsEngine';
import { mergeCheckInsWithLegacyJournal, WellbeingHistoryRecord } from './wellbeingEngine';
import { DailyCheckIn, JournalEntry, Habit, HabitLog, RestDay } from '../types';

function makeRecord(overrides: Partial<WellbeingHistoryRecord> & { dateKey: string }): WellbeingHistoryRecord {
  return {
    id: `rec-${overrides.dateKey}`,
    emotions: [],
    contextTags: [],
    source: 'checkin',
    createdAt: `${overrides.dateKey}T12:00:00.000Z`,
    updatedAt: `${overrides.dateKey}T12:00:00.000Z`,
    ...overrides,
  };
}

describe('wellbeingInsightsEngine', () => {
  describe('getWellbeingDateBounds', () => {
    it('computes 7d, 30d, 90d, all, and normalizes reversed custom dates', () => {
      const b7 = getWellbeingDateBounds('7d', '2026-11-15');
      expect(b7.startDate).toBe('2026-11-09');
      expect(b7.endDate).toBe('2026-11-15');
      expect(b7.prevStartDate).toBe('2026-11-02');
      expect(b7.prevEndDate).toBe('2026-11-08');

      const b30 = getWellbeingDateBounds('30d', '2026-11-15');
      expect(b30.startDate).toBe('2026-10-17');
      expect(b30.prevEndDate).toBe('2026-10-16');

      const bAll = getWellbeingDateBounds('all', '2026-11-15');
      expect(bAll.startDate).toBeUndefined();
      expect(bAll.endDate).toBe('2026-11-15');

      const bCustom = getWellbeingDateBounds('custom', '2026-11-15', '2026-11-12', '2026-11-08');
      expect(bCustom.startDate).toBe('2026-11-08');
      expect(bCustom.endDate).toBe('2026-11-12');
      expect(bCustom.prevStartDate).toBe('2026-11-03');
      expect(bCustom.prevEndDate).toBe('2026-11-07');
    });
  });

  describe('computeMoodAnalytics', () => {
    it('computes averages without inventing values for unrecorded days, finds highs/lows, distribution, and rollups', () => {
      const records: WellbeingHistoryRecord[] = [
        makeRecord({ dateKey: '2026-10-28', moodScore: 2, energyScore: 2, stressScore: 4, note: 'Tired day' }),
        makeRecord({ dateKey: '2026-11-03', moodScore: 5, energyScore: 5, stressScore: 1, note: 'Great focus' }),
        makeRecord({ dateKey: '2026-11-04', moodScore: 4, energyScore: 4, stressScore: 2 }),
        // Record with energy/stress only, no mood -> must NOT be counted as 0 in moodSampleSize
        makeRecord({ dateKey: '2026-11-05', energyScore: 3, stressScore: 3 }),
      ];

      const res = computeMoodAnalytics(records);
      expect(res.moodSampleSize).toBe(3);
      expect(res.avgMood).toBe(3.7); // (2+5+4)/3 = 3.666 -> 3.7
      expect(res.highestDay?.dateKey).toBe('2026-11-03');
      expect(res.highestDay?.score).toBe(5);
      expect(res.lowestDay?.dateKey).toBe('2026-10-28');
      expect(res.lowestDay?.score).toBe(2);

      const bucket5 = res.distribution.find((d) => d.score === 5);
      expect(bucket5?.count).toBe(1);
      expect(bucket5?.percentage).toBe(33);

      expect(res.monthlyRollups.map((m) => m.periodKey)).toEqual(['2026-10', '2026-11']);
      expect(res.weeklyRollups.length).toBe(2);
    });
  });

  describe('computeEnergyStressAnalytics', () => {
    it('identifies co-movement and divergence patterns across paired days', () => {
      const records: WellbeingHistoryRecord[] = [
        makeRecord({ dateKey: '2026-11-01', energyScore: 5, stressScore: 4 }), // bothHigh + movingTogether (diff=1)
        makeRecord({ dateKey: '2026-11-02', energyScore: 4, stressScore: 1 }), // energizedCalm + diverging (diff=3)
        makeRecord({ dateKey: '2026-11-03', energyScore: 1, stressScore: 5 }), // highStressLowEnergy + diverging (diff=4)
        makeRecord({ dateKey: '2026-11-04', energyScore: 2, stressScore: 2 }), // bothLow + movingTogether (diff=0)
        makeRecord({ dateKey: '2026-11-05', energyScore: 5, stressScore: 2 }), // energizedCalm + diverging (diff=3)
      ];

      const res = computeEnergyStressAnalytics(records);
      expect(res.pairedSampleSize).toBe(5);
      expect(res.bothHighDays).toEqual(['2026-11-01']);
      expect(res.bothLowDays).toEqual(['2026-11-04']);
      expect(res.energizedCalmDays).toEqual(['2026-11-02', '2026-11-05']);
      expect(res.highStressLowEnergyDays).toEqual(['2026-11-03']);
      expect(res.movingTogetherCount).toBe(2);
      expect(res.divergingCount).toBe(3);
      expect(res.summaryNote).toContain('moved separately more often');
    });

    it('explicitly flags small sample sizes (< 3 paired days)', () => {
      const res = computeEnergyStressAnalytics([
        makeRecord({ dateKey: '2026-11-01', energyScore: 4, stressScore: 2 }),
      ]);
      expect(res.pairedSampleSize).toBe(1);
      expect(res.summaryNote).toContain('at least 3 paired days');
    });
  });

  describe('computeEmotionAnalytics', () => {
    it('tracks frequencies, shifts vs previous period, pairs, low-energy and high-stress emotions', () => {
      const current: WellbeingHistoryRecord[] = [
        makeRecord({
          dateKey: '2026-11-02',
          energyScore: 2,
          stressScore: 4,
          emotions: ['Tired', 'Overwhelmed'],
        }),
        makeRecord({
          dateKey: '2026-11-03',
          energyScore: 1,
          stressScore: 5,
          emotions: ['Tired', 'Overwhelmed', 'Anxious'],
        }),
        makeRecord({
          dateKey: '2026-11-04',
          energyScore: 5,
          stressScore: 2,
          emotions: ['Calm', 'Focused'],
        }),
      ];

      const previous: WellbeingHistoryRecord[] = [
        makeRecord({ dateKey: '2026-10-28', emotions: ['Calm'] }),
        makeRecord({ dateKey: '2026-10-29', emotions: ['Calm'] }),
      ];

      const res = computeEmotionAnalytics(current, previous);
      expect(res.totalDaysWithEmotions).toBe(3);
      expect(res.topEmotions[0]).toEqual({ emotion: 'Overwhelmed', count: 2, sharePercent: 67 });
      expect(res.commonPairs[0].label).toBe('Overwhelmed + Tired');
      expect(res.commonPairs[0].count).toBe(2);

      const calmShift = res.periodShifts.find((s) => s.emotion === 'Calm');
      expect(calmShift).toEqual({
        emotion: 'Calm',
        currentCount: 1,
        previousCount: 2,
        delta: -1,
      });

      expect(res.lowEnergySampleSize).toBe(2);
      expect(res.lowEnergyEmotions.map((e) => e.emotion)).toContain('Tired');
      expect(res.highStressSampleSize).toBe(2);
      expect(res.highStressEmotions.map((e) => e.emotion)).toContain('Overwhelmed');
      expect(res.overTime.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Cohort Comparisons & Non-Causal Guardrails', () => {
    it('flags insufficient data when either cohort has fewer than MIN_COHORT_SAMPLE_SIZE (3) recorded days', () => {
      const records: WellbeingHistoryRecord[] = [
        makeRecord({ dateKey: '2026-11-01', moodScore: 5, contextTags: ['Exercise'] }),
        makeRecord({ dateKey: '2026-11-02', moodScore: 5, contextTags: ['Exercise'] }),
        makeRecord({ dateKey: '2026-11-03', moodScore: 3 }),
        makeRecord({ dateKey: '2026-11-04', moodScore: 3 }),
        makeRecord({ dateKey: '2026-11-05', moodScore: 3 }),
      ];

      const res = compareWellbeingCohorts({
        id: 'ctx-exercise',
        label: 'Exercise',
        category: 'context',
        records,
        withLabel: 'With Exercise',
        withoutLabel: 'Without Exercise',
        matcher: (r) => r.contextTags.includes('Exercise'),
      });

      expect(MIN_COHORT_SAMPLE_SIZE).toBe(3);
      expect(res.withGroup.count).toBe(2);
      expect(res.withoutGroup.count).toBe(3);
      expect(res.insufficientData).toBe(true);
      expect(res.summaryText).toContain('Insufficient sample size');
    });

    it('reports sample sizes and non-causal language when both cohorts meet minimum threshold', () => {
      const records: WellbeingHistoryRecord[] = [
        makeRecord({ dateKey: '2026-11-01', moodScore: 5, energyScore: 5, stressScore: 2, contextTags: ['Exercise'] }),
        makeRecord({ dateKey: '2026-11-02', moodScore: 4, energyScore: 4, stressScore: 2, contextTags: ['Exercise'] }),
        makeRecord({ dateKey: '2026-11-03', moodScore: 5, energyScore: 4, stressScore: 1, contextTags: ['Exercise'] }),
        makeRecord({ dateKey: '2026-11-04', moodScore: 3, energyScore: 2, stressScore: 4 }),
        makeRecord({ dateKey: '2026-11-05', moodScore: 3, energyScore: 3, stressScore: 4 }),
        makeRecord({ dateKey: '2026-11-06', moodScore: 2, energyScore: 2, stressScore: 5 }),
      ];

      const res = compareWellbeingCohorts({
        id: 'ctx-exercise',
        label: 'Exercise',
        category: 'context',
        records,
        withLabel: 'With Exercise',
        withoutLabel: 'Without Exercise',
        matcher: (r) => r.contextTags.includes('Exercise'),
      });

      expect(res.insufficientData).toBe(false);
      expect(res.withGroup.count).toBe(3);
      expect(res.withoutGroup.count).toBe(3);
      expect(res.withGroup.avgMood).toBe(4.7);
      expect(res.withoutGroup.avgMood).toBe(2.7);
      expect(res.moodDiff).toBe(2);
      expect(res.summaryText).toContain('n=3');
      expect(res.summaryText).toContain('correlation in your data, not causation');
    });

    it('builds journal, context, and habit comparisons together cleanly', () => {
      const checkIns: DailyCheckIn[] = [
        {
          id: 'ci-1',
          dateKey: '2026-11-01',
          moodScore: 4,
          energyScore: 4,
          stressScore: 2,
          emotions: ['Calm'],
          contextTags: ['Guitar practice'],
          createdAt: '2026-11-01T10:00:00Z',
          updatedAt: '2026-11-01T10:00:00Z',
        },
        {
          id: 'ci-2',
          dateKey: '2026-11-02',
          moodScore: 3,
          energyScore: 3,
          stressScore: 3,
          emotions: [],
          contextTags: [],
          createdAt: '2026-11-02T10:00:00Z',
          updatedAt: '2026-11-02T10:00:00Z',
        },
      ];
      const journalEntries: JournalEntry[] = [
        {
          id: 'je-1',
          date: '2026-11-01',
          moodScore: 4,
          energyScore: 4,
          content: 'Practiced chords.',
          wordCount: 2,
          tags: [],
          createdAt: '2026-11-01T10:00:00Z',
        },
      ];
      const habits: Habit[] = [
        {
          id: 'h-1',
          title: 'Guitar',
          category: 'creative',
          type: 'daily',
          targetCount: 1,
          color: '#7A2E4A',
          currentStreak: 1,
          bestStreak: 1,
          icon: 'Music',
          graceDaysLeft: 2,
          status: 'active',
        },
      ];
      const habitLogs: HabitLog[] = [
        { id: 'hl-1', habitId: 'h-1', date: '2026-11-01', count: 1, isPartial: false, status: 'completed' },
      ];

      const records = mergeCheckInsWithLegacyJournal(checkIns, journalEntries);
      const comps = buildAnalyticalComparisons({ records, habits, habitLogs, journalEntries });

      expect(comps.find((c) => c.id === 'journal-days')).toBeDefined();
      expect(comps.find((c) => c.id === 'context-Guitar practice')).toBeDefined();
      expect(comps.find((c) => c.id === 'habit-h-1')).toBeDefined();
    });
  });

  describe('computeHabitInsights, Period Reports & Day Inspection', () => {
    const habits: Habit[] = [
      {
        id: 'h-run',
        title: 'Morning Run',
        category: 'health',
        type: 'minutes',
        trackingMethod: 'duration',
        unit: 'min',
        targetValue: 20,
        targetCount: 1,
        recurrence: 'daily',
        color: '#2E7D32',
        currentStreak: 0,
        bestStreak: 0,
        icon: 'Activity',
        graceDaysLeft: 2,
        status: 'active',
      },
    ];

    const logs: HabitLog[] = [
      { id: 'l1', habitId: 'h-run', date: '2026-11-08', count: 1, isPartial: false, value: 25, unit: 'min', status: 'completed' },
      { id: 'l2', habitId: 'h-run', date: '2026-11-09', count: 1, isPartial: false, value: 30, unit: 'min', status: 'completed' },
      { id: 'l3', habitId: 'h-run', date: '2026-11-10', count: 1, isPartial: false, value: 20, unit: 'min', status: 'completed' },
      { id: 'l4', habitId: 'h-run', date: '2026-11-12', count: 0, isPartial: false, status: 'skipped' },
    ];
    const restDays: RestDay[] = [];

    it('computes measurable habit averages, daily rates, and comparison vs wellbeing', () => {
      const records: WellbeingHistoryRecord[] = [
        makeRecord({ dateKey: '2026-11-08', moodScore: 5, energyScore: 4, stressScore: 1 }),
        makeRecord({ dateKey: '2026-11-09', moodScore: 4, energyScore: 4, stressScore: 2 }),
        makeRecord({ dateKey: '2026-11-10', moodScore: 4, energyScore: 5, stressScore: 2 }),
        makeRecord({ dateKey: '2026-11-11', moodScore: 2, energyScore: 2, stressScore: 4 }),
        makeRecord({ dateKey: '2026-11-12', moodScore: 3, energyScore: 2, stressScore: 4 }),
        makeRecord({ dateKey: '2026-11-13', moodScore: 2, energyScore: 2, stressScore: 5 }),
      ];

      const summary = computeHabitInsights({
        habits,
        logs,
        restDays,
        records,
        startDate: '2026-11-08',
        endDate: '2026-11-14',
      });

      expect(summary.dailyTrend.length).toBe(7);
      expect(summary.periodConsistencyPercent).toBe(43); // 3 / 7
      expect(summary.individualHabits[0].averageValue).toBe(25); // (25+30+20)/3
      expect(summary.consistencyVsWellbeing).not.toBeNull();
      expect(summary.consistencyVsWellbeing?.insufficientData).toBe(false);
      expect(summary.consistencyVsWellbeing?.withGroup.avgMood).toBe(4.3);
      expect(summary.consistencyVsWellbeing?.withoutGroup.avgMood).toBe(2.3);
    });

    it('builds weekly & monthly period summaries with deltas and day inspection details', () => {
      const checkIns: DailyCheckIn[] = [
        { id: 'c1', dateKey: '2026-11-02', moodScore: 2, energyScore: 2, stressScore: 4, emotions: ['Tired'], contextTags: [], createdAt: '', updatedAt: '' },
        { id: 'c2', dateKey: '2026-11-03', moodScore: 2, energyScore: 2, stressScore: 4, emotions: ['Tired'], contextTags: [], createdAt: '', updatedAt: '' },
        { id: 'c3', dateKey: '2026-11-09', moodScore: 4, energyScore: 4, stressScore: 2, emotions: ['Calm'], contextTags: [], createdAt: '', updatedAt: '' },
        { id: 'c4', dateKey: '2026-11-10', moodScore: 5, energyScore: 4, stressScore: 2, emotions: ['Calm'], contextTags: [], createdAt: '', updatedAt: '' },
      ];
      const journals: JournalEntry[] = [
        {
          id: 'j-10',
          title: 'Evening reflection',
          date: '2026-11-10',
          moodScore: 5,
          energyScore: 4,
          content: 'Felt steady all day.',
          wordCount: 4,
          tags: [],
          createdAt: '2026-11-10T21:00:00Z',
        },
      ];

      const report = buildPeriodComparisonReport({
        checkIns,
        journalEntries: journals,
        habits,
        habitLogs: logs,
        restDays,
        referenceDateKey: '2026-11-14',
      });

      expect(report.weekly.daysLogged).toBe(2);
      expect(report.weekly.avgMood).toBe(4.5);
      expect(report.weekly.moodDelta).toBe(2.5);
      expect(report.weekly.observations.some((o) => o.includes('Average mood increased'))).toBe(true);

      const records = mergeCheckInsWithLegacyJournal(checkIns, journals);
      const inspected = buildDayInspectionDetails({
        dateKeys: ['2026-11-10', '2026-11-12'],
        records,
        journalEntries: journals,
        habits,
        habitLogs: logs,
      });

      expect(inspected[0].dateKey).toBe('2026-11-12');
      expect(inspected[0].skippedHabits[0].title).toBe('Morning Run');
      expect(inspected[1].dateKey).toBe('2026-11-10');
      expect(inspected[1].journalEntries[0].title).toBe('Evening reflection');
      expect(inspected[1].completedHabits[0]).toMatchObject({ title: 'Morning Run', value: 20, unit: 'min' });
    });
  });
});
