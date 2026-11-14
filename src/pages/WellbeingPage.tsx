import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useUiStore } from '../store/uiStore';
import {
  mergeCheckInsWithLegacyJournal,
  filterWellbeingRecords,
} from '../utils/wellbeingEngine';
import {
  WellbeingRangePreset,
  getWellbeingDateBounds,
  computeMoodAnalytics,
  computeEnergyStressAnalytics,
  computeEmotionAnalytics,
  computeHabitInsights,
  buildAnalyticalComparisons,
  buildPeriodComparisonReport,
  buildDayInspectionDetails,
  CohortComparisonResult,
} from '../utils/wellbeingInsightsEngine';
import { getTodayKey, addDaysToKey, formatDisplayDate } from '../utils/dateUtils';
import { TrendSvgChart } from '../components/wellbeing/TrendSvgChart';
import { DayInspectionModal } from '../components/wellbeing/DayInspectionModal';
import {
  Activity,
  BarChart3,
  BookOpen,
  Calendar,
  Flame,
  Info,
  Scale,
} from 'lucide-react';

type TrendGranularity = 'daily' | 'weekly' | 'monthly';

export const WellbeingPage: React.FC = () => {
  const { setCurrentRoute } = useUiStore();
  const todayKey = getTodayKey();

  const [rangePreset, setRangePreset] = useState<WellbeingRangePreset>('30d');
  const [customStart, setCustomStart] = useState<string>(addDaysToKey(todayKey, -29));
  const [customEnd, setCustomEnd] = useState<string>(todayKey);
  const [moodGranularity, setMoodGranularity] = useState<TrendGranularity>('daily');
  const [selectedComparisonId, setSelectedComparisonId] = useState<string>('');
  const [inspectModal, setInspectModal] = useState<{
    title: string;
    subtitle?: string;
    dateKeys: string[];
  } | null>(null);

  const checkInsRaw = useLiveQuery(() => db.dailyCheckIns.toArray(), []);
  const journalRaw = useLiveQuery(() => db.journalEntries.toArray(), []);
  const habitsRaw = useLiveQuery(() => db.habits.toArray(), []);
  const habitLogsRaw = useLiveQuery(() => db.habitLogs.toArray(), []);
  const restDaysRaw = useLiveQuery(() => db.restDays.toArray(), []);

  const isLoading =
    checkInsRaw === undefined ||
    journalRaw === undefined ||
    habitsRaw === undefined ||
    habitLogsRaw === undefined ||
    restDaysRaw === undefined;

  const checkIns = checkInsRaw || [];
  const journalEntries = journalRaw || [];
  const habits = habitsRaw || [];
  const habitLogs = habitLogsRaw || [];
  const restDays = restDaysRaw || [];

  const allRecords = useMemo(
    () => mergeCheckInsWithLegacyJournal(checkIns, journalEntries),
    [checkIns, journalEntries]
  );

  const bounds = useMemo(
    () => getWellbeingDateBounds(rangePreset, todayKey, customStart, customEnd),
    [rangePreset, todayKey, customStart, customEnd]
  );

  const periodRecords = useMemo(
    () =>
      filterWellbeingRecords(allRecords, {
        startDate: bounds.startDate,
        endDate: bounds.endDate,
      }),
    [allRecords, bounds.startDate, bounds.endDate]
  );

  const previousPeriodRecords = useMemo(() => {
    if (!bounds.prevStartDate || !bounds.prevEndDate) return [];
    return filterWellbeingRecords(allRecords, {
      startDate: bounds.prevStartDate,
      endDate: bounds.prevEndDate,
    });
  }, [allRecords, bounds.prevStartDate, bounds.prevEndDate]);

  const moodAnalytics = useMemo(
    () => computeMoodAnalytics(periodRecords),
    [periodRecords]
  );

  const energyStress = useMemo(
    () => computeEnergyStressAnalytics(periodRecords),
    [periodRecords]
  );

  const emotionAnalytics = useMemo(
    () => computeEmotionAnalytics(periodRecords, previousPeriodRecords),
    [periodRecords, previousPeriodRecords]
  );

  const habitInsights = useMemo(
    () =>
      computeHabitInsights({
        habits,
        logs: habitLogs,
        restDays,
        records: periodRecords,
        startDate: bounds.startDate,
        endDate: bounds.endDate,
      }),
    [habits, habitLogs, restDays, periodRecords, bounds.startDate, bounds.endDate]
  );

  const comparisons = useMemo(
    () =>
      buildAnalyticalComparisons({
        records: periodRecords,
        habits,
        habitLogs,
        journalEntries,
      }),
    [periodRecords, habits, habitLogs, journalEntries]
  );

  const activeComparison: CohortComparisonResult | null = useMemo(() => {
    if (comparisons.length === 0) return null;
    return (
      comparisons.find((c) => c.id === selectedComparisonId) ||
      comparisons.find((c) => !c.insufficientData) ||
      comparisons[0]
    );
  }, [comparisons, selectedComparisonId]);

  const periodReport = useMemo(
    () =>
      buildPeriodComparisonReport({
        checkIns,
        journalEntries,
        habits,
        habitLogs,
        restDays,
        referenceDateKey: todayKey,
      }),
    [checkIns, journalEntries, habits, habitLogs, restDays, todayKey]
  );

  const inspectDaysDetail = useMemo(() => {
    if (!inspectModal) return [];
    return buildDayInspectionDetails({
      dateKeys: inspectModal.dateKeys,
      records: allRecords,
      journalEntries,
      habits,
      habitLogs,
    });
  }, [inspectModal, allRecords, journalEntries, habits, habitLogs]);

  const openInspectDates = (title: string, subtitle: string, dateKeys: string[]) => {
    if (!dateKeys.length) return;
    setInspectModal({ title, subtitle, dateKeys });
  };

  const openJournalEntryById = (entryId: string) => {
    setCurrentRoute(`#/journal?entry=${encodeURIComponent(entryId)}`);
  };

  // Mood chart series based on granularity
  const moodChartData = useMemo(() => {
    if (moodGranularity === 'weekly') {
      const pts = moodAnalytics.weeklyRollups;
      return {
        labels: pts.map((p) => p.label),
        rawKeys: pts.map((p) => p.periodKey),
        series: [
          {
            id: 'mood',
            label: 'Weekly Avg Mood',
            color: 'rgb(var(--c-primary))',
            values: pts.map((p) => p.avgMood),
          },
        ],
        clickable: false,
      };
    }
    if (moodGranularity === 'monthly') {
      const pts = moodAnalytics.monthlyRollups;
      return {
        labels: pts.map((p) => p.label),
        rawKeys: pts.map((p) => p.periodKey),
        series: [
          {
            id: 'mood',
            label: 'Monthly Avg Mood',
            color: 'rgb(var(--c-primary))',
            values: pts.map((p) => p.avgMood),
          },
        ],
        clickable: false,
      };
    }
    const pts = moodAnalytics.dailyPoints;
    return {
      labels: pts.map((p) => p.dateKey.slice(5)),
      rawKeys: pts.map((p) => p.dateKey),
      series: [
        {
          id: 'mood',
          label: 'Mood (1–5)',
          color: 'rgb(var(--c-primary))',
          values: pts.map((p) => p.moodScore),
        },
      ],
      clickable: true,
    };
  }, [moodGranularity, moodAnalytics]);

  const energyStressChartData = useMemo(() => {
    const pts = moodAnalytics.dailyPoints;
    return {
      labels: pts.map((p) => p.dateKey.slice(5)),
      rawKeys: pts.map((p) => p.dateKey),
      series: [
        {
          id: 'mood',
          label: 'Mood',
          color: 'rgb(var(--c-primary))',
          values: pts.map((p) => p.moodScore),
        },
        {
          id: 'energy',
          label: 'Energy',
          color: '#16A34A',
          values: pts.map((p) => p.energyScore),
        },
        {
          id: 'stress',
          label: 'Stress',
          color: '#DC2626',
          values: pts.map((p) => p.stressScore),
        },
      ],
    };
  }, [moodAnalytics.dailyPoints]);

  const habitTrendChartData = useMemo(() => {
    const pts = habitInsights.dailyTrend.filter((p) => p.ratePercent !== null);
    return {
      labels: pts.map((p) => p.dateKey.slice(5)),
      rawKeys: pts.map((p) => p.dateKey),
      series: [
        {
          id: 'habit-rate',
          label: 'Scheduled Habits Completed (%)',
          color: '#16A34A',
          values: pts.map((p) => p.ratePercent),
        },
      ],
    };
  }, [habitInsights.dailyTrend]);

  const formatDelta = (val: number | null, suffix: string = '') => {
    if (val === null) return null;
    if (val === 0) return `No change vs prior`;
    return `${val > 0 ? '+' : ''}${val}${suffix} vs prior`;
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Header & Range Controls */}
      <div className="bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))]">
              Wellbeing Insights
            </h1>
            <p className="text-xs sm:text-sm text-[rgb(var(--c-muted))] max-w-2xl">
              Personal patterns connecting your journal entries, mood check-ins, energy, stress, emotions, and habits using only recorded days.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentRoute('#/journal')}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-heading font-semibold text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] transition inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
              <span>Open Journal</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentRoute('#/habits')}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-heading font-semibold text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] transition inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span>Open Habits</span>
            </button>
          </div>
        </div>

        {/* Date Range Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[rgb(var(--c-border))]">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Date range selector">
            {(
              [
                { id: '7d', label: '7 days' },
                { id: '30d', label: '30 days' },
                { id: '90d', label: '90 days' },
                { id: 'all', label: 'All time' },
                { id: 'custom', label: 'Custom' },
              ] as { id: WellbeingRangePreset; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRangePreset(opt.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition whitespace-nowrap cursor-pointer ${
                  rangePreset === opt.id
                    ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]'
                    : 'border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {rangePreset === 'custom' ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="inline-flex items-center gap-1.5 text-[rgb(var(--c-muted))]">
                <span>From</span>
                <input
                  type="date"
                  value={customStart}
                  max={todayKey}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-mono text-xs"
                />
              </label>
              <label className="inline-flex items-center gap-1.5 text-[rgb(var(--c-muted))]">
                <span>To</span>
                <input
                  type="date"
                  value={customEnd}
                  max={todayKey}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-mono text-xs"
                />
              </label>
            </div>
          ) : (
            <div className="text-xs text-[rgb(var(--c-muted))] font-mono tabular-nums">
              {periodRecords.length} recorded {periodRecords.length === 1 ? 'day' : 'days'} in range
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] animate-pulse"
            />
          ))}
        </div>
      ) : allRecords.length === 0 && habits.length === 0 ? (
        /* Global Empty State */
        <div className="bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl p-8 sm:p-12 text-center space-y-4">
          <BarChart3 className="w-8 h-8 text-[rgb(var(--c-muted))] mx-auto" />
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
              No wellbeing or habit history recorded yet
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] leading-relaxed">
              Log a quick check-in or journal entry in Journal, or track a habit in Habits. Insights appear automatically from your real recorded data without inventing scores.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setCurrentRoute('#/journal')}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 cursor-pointer"
            >
              Go to Journal
            </button>
            <button
              type="button"
              onClick={() => setCurrentRoute('#/habits')}
              className="min-h-[44px] px-5 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:border-[rgb(var(--c-primary))] cursor-pointer"
            >
              Go to Habits
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Weekly & Monthly Period Summaries */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-label="Weekly and monthly summaries">
            {[periodReport.weekly, periodReport.monthly].map((snap) => (
              <div
                key={snap.label}
                className="bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-baseline justify-between gap-2 pb-2.5 border-b border-[rgb(var(--c-border))]">
                  <div>
                    <h2 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                      {snap.label} Summary
                    </h2>
                    <div className="text-[11px] font-mono text-[rgb(var(--c-muted))] tabular-nums mt-0.5">
                      {snap.startDate} to {snap.endDate} · {snap.daysLogged} recorded {snap.daysLogged === 1 ? 'day' : 'days'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="text-[11px] text-[rgb(var(--c-muted))]">Avg Mood</div>
                    <div className="text-lg font-heading font-bold font-mono tabular-nums text-[rgb(var(--c-text))]">
                      {snap.avgMood !== null ? `${snap.avgMood}/5` : '—'}
                    </div>
                    {formatDelta(snap.moodDelta) && (
                      <div className="text-[11px] text-[rgb(var(--c-muted))] font-mono tabular-nums">
                        {formatDelta(snap.moodDelta)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] text-[rgb(var(--c-muted))]">Avg Energy</div>
                    <div className="text-lg font-heading font-bold font-mono tabular-nums text-[rgb(var(--c-text))]">
                      {snap.avgEnergy !== null ? `${snap.avgEnergy}/5` : '—'}
                    </div>
                    {formatDelta(snap.energyDelta) && (
                      <div className="text-[11px] text-[rgb(var(--c-muted))] font-mono tabular-nums">
                        {formatDelta(snap.energyDelta)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] text-[rgb(var(--c-muted))]">Avg Stress</div>
                    <div className="text-lg font-heading font-bold font-mono tabular-nums text-[rgb(var(--c-text))]">
                      {snap.avgStress !== null ? `${snap.avgStress}/5` : '—'}
                    </div>
                    {formatDelta(snap.stressDelta) && (
                      <div className="text-[11px] text-[rgb(var(--c-muted))] font-mono tabular-nums">
                        {formatDelta(snap.stressDelta)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] text-[rgb(var(--c-muted))]">Habits</div>
                    <div className="text-lg font-heading font-bold font-mono tabular-nums text-[rgb(var(--c-text))]">
                      {snap.habitConsistencyPercent !== null ? `${snap.habitConsistencyPercent}%` : '—'}
                    </div>
                    {formatDelta(snap.habitConsistencyDelta, '%') && (
                      <div className="text-[11px] text-[rgb(var(--c-muted))] font-mono tabular-nums">
                        {formatDelta(snap.habitConsistencyDelta, '%')}
                      </div>
                    )}
                  </div>
                </div>

                {snap.topEmotions.length > 0 && (
                  <div className="text-xs text-[rgb(var(--c-muted))]">
                    <span className="font-medium text-[rgb(var(--c-text))]">Top emotions:</span>{' '}
                    {snap.topEmotions.map((e) => `${e.emotion} (${e.count})`).join(' · ')}
                  </div>
                )}

                <ul className="space-y-1 pt-2 border-t border-[rgb(var(--c-border))]/60 text-xs text-[rgb(var(--c-muted))]">
                  {snap.observations.map((obs, i) => (
                    <li key={i}>• {obs}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          {/* Range Empty Banner if user picked narrow window with 0 wellbeing records */}
          {periodRecords.length === 0 ? (
            <div className="bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl p-6 text-center space-y-2">
              <p className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                No mood or check-in records found in the selected range
              </p>
              <p className="text-xs text-[rgb(var(--c-muted))]">
                Try expanding the date range above to "90 days" or "All time", or log today&apos;s check-in in Journal.
              </p>
            </div>
          ) : (
            <>
              {/* 2. Mood Trends & Distribution */}
              <section className="bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                      Mood Trends &amp; Distribution
                    </h2>
                    <p className="text-xs text-[rgb(var(--c-muted))] font-mono tabular-nums mt-0.5">
                      Average {moodAnalytics.avgMood !== null ? `${moodAnalytics.avgMood}/5` : '—'} across {moodAnalytics.moodSampleSize} recorded {moodAnalytics.moodSampleSize === 1 ? 'day' : 'days'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] self-start">
                    {(['daily', 'weekly', 'monthly'] as TrendGranularity[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setMoodGranularity(g)}
                        className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-heading font-bold capitalize transition cursor-pointer ${
                          moodGranularity === g
                            ? 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-primary))] shadow-2xs'
                            : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {moodAnalytics.moodSampleSize === 0 ? (
                  <p className="text-xs text-[rgb(var(--c-muted))] py-4">
                    No mood scores (1–5) recorded in this date window.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <TrendSvgChart
                        labels={moodChartData.labels}
                        rawKeys={moodChartData.rawKeys}
                        series={moodChartData.series}
                        yMin={1}
                        yMax={5}
                        onSelectDateKey={
                          moodChartData.clickable
                            ? (dateKey) =>
                                openInspectDates(
                                  `Recorded Day: ${formatDisplayDate(dateKey)}`,
                                  'All wellbeing, journal, and habit logs recorded on this date.',
                                  [dateKey]
                                )
                            : undefined
                        }
                      />
                    </div>

                    <div className="space-y-4">
                      {/* High / Low Recorded Days */}
                      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
                        {moodAnalytics.highestDay && (
                          <button
                            type="button"
                            onClick={() =>
                              openInspectDates(
                                'Highest Recorded Mood Day',
                                `${formatDisplayDate(moodAnalytics.highestDay!.dateKey)} (${moodAnalytics.highestDay!.score}/5)`,
                                [moodAnalytics.highestDay!.dateKey]
                              )
                            }
                            className="p-3 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-left hover:border-[rgb(var(--c-primary))] transition cursor-pointer"
                          >
                            <div className="text-[11px] text-[rgb(var(--c-muted))]">Highest Recorded Day</div>
                            <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))] font-mono tabular-nums mt-0.5">
                              {moodAnalytics.highestDay.score}/5 · {formatDisplayDate(moodAnalytics.highestDay.dateKey)}
                            </div>
                          </button>
                        )}
                        {moodAnalytics.lowestDay && (
                          <button
                            type="button"
                            onClick={() =>
                              openInspectDates(
                                'Lowest Recorded Mood Day',
                                `${formatDisplayDate(moodAnalytics.lowestDay!.dateKey)} (${moodAnalytics.lowestDay!.score}/5)`,
                                [moodAnalytics.lowestDay!.dateKey]
                              )
                            }
                            className="p-3 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-left hover:border-[rgb(var(--c-primary))] transition cursor-pointer"
                          >
                            <div className="text-[11px] text-[rgb(var(--c-muted))]">Lowest Recorded Day</div>
                            <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))] font-mono tabular-nums mt-0.5">
                              {moodAnalytics.lowestDay.score}/5 · {formatDisplayDate(moodAnalytics.lowestDay.dateKey)}
                            </div>
                          </button>
                        )}
                      </div>

                      {/* Mood Distribution */}
                      <div className="space-y-2 pt-2 border-t border-[rgb(var(--c-border))]/60">
                        <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                          Mood Distribution
                        </div>
                        <div className="space-y-1.5">
                          {moodAnalytics.distribution.map((bucket) => (
                            <div key={bucket.score} className="space-y-0.5 text-xs">
                              <div className="flex items-center justify-between text-[rgb(var(--c-muted))]">
                                <span>
                                  {bucket.score} · {bucket.label}
                                </span>
                                <span className="font-mono tabular-nums">
                                  {bucket.count} ({bucket.percentage}%)
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-[rgb(var(--c-surface2))] overflow-hidden">
                                <div
                                  className="h-full bg-[rgb(var(--c-primary))] rounded-full transition-all"
                                  style={{ width: `${bucket.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* 3. Energy vs Stress Comparison */}
              <section className="bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                      Mood, Energy &amp; Stress Dynamics
                    </h2>
                    <p className="text-xs text-[rgb(var(--c-muted))] mt-0.5">
                      {energyStress.summaryNote}
                    </p>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-[rgb(var(--c-muted))]">
                    Energy avg {energyStress.avgEnergy !== null ? `${energyStress.avgEnergy}/5` : '—'} (n={energyStress.energySampleSize}) · Stress avg {energyStress.avgStress !== null ? `${energyStress.avgStress}/5` : '—'} (n={energyStress.stressSampleSize})
                  </div>
                </div>

                {energyStress.energySampleSize === 0 && energyStress.stressSampleSize === 0 ? (
                  <p className="text-xs text-[rgb(var(--c-muted))]">
                    Record energy and stress check-ins in Journal to compare how they move together or diverge.
                  </p>
                ) : (
                  <>
                    <TrendSvgChart
                      labels={energyStressChartData.labels}
                      rawKeys={energyStressChartData.rawKeys}
                      series={energyStressChartData.series}
                      yMin={1}
                      yMax={5}
                      onSelectDateKey={(dateKey) =>
                        openInspectDates(
                          `Recorded Day: ${formatDisplayDate(dateKey)}`,
                          'Mood, energy, stress, emotions, and habits logged on this day.',
                          [dateKey]
                        )
                      }
                    />

                    {energyStress.pairedSampleSize > 0 && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[rgb(var(--c-border))]/60">
                        <button
                          type="button"
                          disabled={energyStress.energizedCalmDays.length === 0}
                          onClick={() =>
                            openInspectDates(
                              'High Energy & Low Stress Days',
                              'Days with energy ≥ 4 and stress ≤ 2.',
                              energyStress.energizedCalmDays
                            )
                          }
                          className="p-3 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-left hover:border-[rgb(var(--c-primary))] disabled:opacity-60 cursor-pointer transition"
                        >
                          <div className="text-[11px] text-[rgb(var(--c-muted))]">Energized &amp; Calm</div>
                          <div className="text-base font-heading font-bold font-mono tabular-nums text-[rgb(var(--c-text))] mt-0.5">
                            {energyStress.energizedCalmDays.length} days
                          </div>
                          <div className="text-[11px] text-[rgb(var(--c-muted))]">Energy ≥4, Stress ≤2</div>
                        </button>

                        <button
                          type="button"
                          disabled={energyStress.bothHighDays.length === 0}
                          onClick={() =>
                            openInspectDates(
                              'High Energy & High Stress Days',
                              'Days where energy and stress moved high together (both ≥ 4).',
                              energyStress.bothHighDays
                            )
                          }
                          className="p-3 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-left hover:border-[rgb(var(--c-primary))] disabled:opacity-60 cursor-pointer transition"
                        >
                          <div className="text-[11px] text-[rgb(var(--c-muted))]">High Energy &amp; High Stress</div>
                          <div className="text-base font-heading font-bold font-mono tabular-nums text-[rgb(var(--c-text))] mt-0.5">
                            {energyStress.bothHighDays.length} days
                          </div>
                          <div className="text-[11px] text-[rgb(var(--c-muted))]">Moved high together (≥4)</div>
                        </button>

                        <button
                          type="button"
                          disabled={energyStress.highStressLowEnergyDays.length === 0}
                          onClick={() =>
                            openInspectDates(
                              'High Stress & Low Energy Days',
                              'Days with stress ≥ 4 and energy ≤ 2.',
                              energyStress.highStressLowEnergyDays
                            )
                          }
                          className="p-3 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-left hover:border-[rgb(var(--c-primary))] disabled:opacity-60 cursor-pointer transition"
                        >
                          <div className="text-[11px] text-[rgb(var(--c-muted))]">High Stress &amp; Low Energy</div>
                          <div className="text-base font-heading font-bold font-mono tabular-nums text-[rgb(var(--c-text))] mt-0.5">
                            {energyStress.highStressLowEnergyDays.length} days
                          </div>
                          <div className="text-[11px] text-[rgb(var(--c-muted))]">Stress ≥4, Energy ≤2</div>
                        </button>

                        <div className="p-3 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))]">
                          <div className="text-[11px] text-[rgb(var(--c-muted))]">Divergent vs Aligned</div>
                          <div className="text-base font-heading font-bold font-mono tabular-nums text-[rgb(var(--c-text))] mt-0.5">
                            {energyStress.divergingCount} / {energyStress.movingTogetherCount}
                          </div>
                          <div className="text-[11px] text-[rgb(var(--c-muted))]">
                            n={energyStress.pairedSampleSize} paired days
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* 4. Emotions Analytics */}
              <section className="bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                      Emotional Patterns &amp; Co-Occurrences
                    </h2>
                    <p className="text-xs text-[rgb(var(--c-muted))] mt-0.5">
                      Frequency across {emotionAnalytics.totalDaysWithEmotions} check-in days with selected emotions
                    </p>
                  </div>
                </div>

                {emotionAnalytics.topEmotions.length === 0 ? (
                  <p className="text-xs text-[rgb(var(--c-muted))]">
                    No emotions recorded in this period yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Top Emotions */}
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                        Most Frequent Emotions
                      </h3>
                      <div className="space-y-2">
                        {emotionAnalytics.topEmotions.slice(0, 7).map((item) => (
                          <div key={item.emotion} className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-[rgb(var(--c-text))]">{item.emotion}</span>
                              <span className="font-mono tabular-nums text-[rgb(var(--c-muted))]">
                                {item.count}d ({item.sharePercent}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[rgb(var(--c-surface2))] overflow-hidden">
                              <div
                                className="h-full bg-[rgb(var(--c-primary))] rounded-full"
                                style={{ width: `${Math.min(100, item.sharePercent)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Common Combinations & Shifts */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                          Common Emotion Combinations
                        </h3>
                        {emotionAnalytics.commonPairs.length === 0 ? (
                          <p className="text-xs text-[rgb(var(--c-muted))]">
                            Log multiple emotions per check-in over at least 2 days to reveal recurring combinations.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {emotionAnalytics.commonPairs.slice(0, 5).map((pair) => (
                              <button
                                key={pair.label}
                                type="button"
                                onClick={() =>
                                  openInspectDates(
                                    `Days with ${pair.label}`,
                                    `Recorded on ${pair.count} days in this period.`,
                                    pair.dayKeys
                                  )
                                }
                                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs hover:border-[rgb(var(--c-primary))] transition cursor-pointer text-left"
                              >
                                <span className="font-medium text-[rgb(var(--c-text))] truncate">{pair.label}</span>
                                <span className="font-mono tabular-nums text-[rgb(var(--c-muted))] shrink-0 ml-2">
                                  {pair.count}d
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {previousPeriodRecords.length > 0 && emotionAnalytics.periodShifts.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-[rgb(var(--c-border))]/60">
                          <h3 className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                            Changes vs Prior Period
                          </h3>
                          <div className="space-y-1 text-xs">
                            {emotionAnalytics.periodShifts.slice(0, 4).map((shift) => (
                              <div key={shift.emotion} className="flex items-center justify-between text-[rgb(var(--c-muted))]">
                                <span className="text-[rgb(var(--c-text))]">{shift.emotion}</span>
                                <span className="font-mono tabular-nums">
                                  {shift.previousCount} → {shift.currentCount} ({shift.delta > 0 ? `+${shift.delta}` : shift.delta})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Low-Energy & High-Stress Emotions + Over Time */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                          Emotions on Low-Energy Days (≤ 2/5)
                        </h3>
                        {emotionAnalytics.lowEnergySampleSize === 0 ? (
                          <p className="text-xs text-[rgb(var(--c-muted))]">
                            No low-energy days (≤ 2/5) recorded in this range.
                          </p>
                        ) : emotionAnalytics.lowEnergyEmotions.length === 0 ? (
                          <p className="text-xs text-[rgb(var(--c-muted))]">
                            {emotionAnalytics.lowEnergySampleSize} low-energy day(s) recorded, without emotion tags attached.
                          </p>
                        ) : (
                          <div className="space-y-1 text-xs">
                            <p className="text-[11px] text-[rgb(var(--c-muted))] font-mono tabular-nums">
                              Sample: n={emotionAnalytics.lowEnergySampleSize} low-energy days
                            </p>
                            {emotionAnalytics.lowEnergyEmotions.slice(0, 4).map((row) => (
                              <div key={row.emotion} className="flex items-center justify-between">
                                <span className="text-[rgb(var(--c-text))]">{row.emotion}</span>
                                <span className="font-mono tabular-nums text-[rgb(var(--c-muted))]">
                                  {row.count} of {emotionAnalytics.lowEnergySampleSize} ({row.sharePercent}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {emotionAnalytics.overTime.length > 1 && (
                        <div className="space-y-2 pt-2 border-t border-[rgb(var(--c-border))]/60">
                          <h3 className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                            Weekly Emotion Frequency
                          </h3>
                          <div className="space-y-1.5 text-[11px]">
                            {emotionAnalytics.overTime.slice(-4).map((bucket) => {
                              const topInBucket = emotionAnalytics.trackedEmotionNames
                                .map((name) => `${name} (${bucket.counts[name] || 0})`)
                                .slice(0, 3)
                                .join(' · ');
                              return (
                                <div key={bucket.periodKey} className="flex items-baseline justify-between gap-2">
                                  <span className="font-mono text-[rgb(var(--c-muted))] shrink-0">{bucket.label}</span>
                                  <span className="text-[rgb(var(--c-text))] text-right truncate">{topInBucket}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {/* 5. Habits Consistency & Habit-vs-Wellbeing */}
          <section className="bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <h2 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                  Habit Consistency &amp; Wellbeing Comparison
                </h2>
                <p className="text-xs text-[rgb(var(--c-muted))] mt-0.5">
                  Weekly {habitInsights.weeklyConsistencyPercent !== null ? `${habitInsights.weeklyConsistencyPercent}%` : '—'} · Monthly {habitInsights.monthlyConsistencyPercent !== null ? `${habitInsights.monthlyConsistencyPercent}%` : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentRoute('#/habits')}
                className="text-xs font-heading font-semibold text-[rgb(var(--c-primary))] hover:underline self-start cursor-pointer"
              >
                Manage habits →
              </button>
            </div>

            {habitInsights.individualHabits.length === 0 ? (
              <p className="text-xs text-[rgb(var(--c-muted))]">
                No habits configured yet. Add habits to track completion trends alongside your mood and energy.
              </p>
            ) : (
              <div className="space-y-5">
                {habitTrendChartData.labels.length >= 2 && (
                  <TrendSvgChart
                    labels={habitTrendChartData.labels}
                    rawKeys={habitTrendChartData.rawKeys}
                    series={habitTrendChartData.series}
                    yMin={0}
                    yMax={100}
                    ySuffix="%"
                    height={170}
                    onSelectDateKey={(dateKey) =>
                      openInspectDates(
                        `Habit & Wellbeing Log: ${formatDisplayDate(dateKey)}`,
                        'Scheduled habits and check-in data recorded for this day.',
                        [dateKey]
                      )
                    }
                  />
                )}

                {/* Individual Habit Comparisons */}
                <div className="space-y-2">
                  <h3 className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                    Individual Habit Consistency (7d / 30d / Streaks)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[rgb(var(--c-border))] text-[11px] text-[rgb(var(--c-muted))]">
                          <th className="py-2 pr-3 font-medium">Habit</th>
                          <th className="py-2 px-3 font-medium text-right">Range</th>
                          <th className="py-2 px-3 font-medium text-right">7d</th>
                          <th className="py-2 px-3 font-medium text-right">30d</th>
                          <th className="py-2 pl-3 font-medium text-right">Streak / Avg</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgb(var(--c-border))]/60">
                        {habitInsights.individualHabits.map((h) => (
                          <tr key={h.habitId}>
                            <td className="py-2.5 pr-3 font-medium text-[rgb(var(--c-text))]">
                              {h.title}
                              <span className="text-[11px] text-[rgb(var(--c-muted))] font-normal ml-2">
                                {h.status === 'paused' ? '(paused)' : ''}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[rgb(var(--c-text))]">
                              {h.completionPercentage}%
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[rgb(var(--c-muted))]">
                              {h.weeklyConsistency}%
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[rgb(var(--c-muted))]">
                              {h.monthlyConsistency}%
                            </td>
                            <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-[rgb(var(--c-muted))]">
                              <span className="inline-flex items-center gap-1 text-[rgb(var(--c-text))]">
                                <Flame className="w-3 h-3 text-amber-500" />
                                {h.currentStreak}d
                              </span>
                              {h.averageValue !== null && h.unit && (
                                <span className="ml-2">
                                  · {h.averageValue} {h.unit}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* High Habit Completion Days vs Lower Days */}
                {habitInsights.consistencyVsWellbeing && (
                  <div className="p-4 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                        Habit Consistency vs Mood, Energy &amp; Stress
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-[rgb(var(--c-muted))]">
                        n={habitInsights.consistencyVsWellbeing.withGroup.count} (≥75%) vs n={habitInsights.consistencyVsWellbeing.withoutGroup.count} (&lt;75%)
                      </span>
                    </div>
                    <p className="text-xs text-[rgb(var(--c-muted))] leading-relaxed">
                      {habitInsights.consistencyVsWellbeing.summaryText}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 6. Genuine Analytical Comparisons Investigator */}
          <section className="bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[rgb(var(--c-primary))]" />
                  <h2 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                    Compare Factors Against Mood, Energy &amp; Stress
                  </h2>
                </div>
                <p className="text-xs text-[rgb(var(--c-muted))]">
                  Inspect how recorded days differ when a context factor, habit, or journal entry is present versus absent. Unrecorded days are never counted.
                </p>
              </div>
            </div>

            {comparisons.length === 0 ? (
              <p className="text-xs text-[rgb(var(--c-muted))]">
                Record a few daily check-ins with context tags, habits, or journal entries to run comparisons.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Comparison factor selector">
                  {comparisons.map((comp) => {
                    const isSelected = activeComparison?.id === comp.id;
                    return (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => setSelectedComparisonId(comp.id)}
                        className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-heading font-semibold transition cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]'
                            : 'border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))]'
                        }`}
                      >
                        {comp.label}{' '}
                        <span className="font-mono text-[11px] opacity-80">
                          ({comp.withGroup.count}/{comp.withoutGroup.count})
                        </span>
                      </button>
                    );
                  })}
                </div>

                {activeComparison && (
                  <div className="p-4 sm:p-5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[activeComparison.withGroup, activeComparison.withoutGroup].map((grp) => (
                        <div
                          key={grp.label}
                          className="p-3.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] space-y-2.5"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                              {grp.label}
                            </h3>
                            <span className="text-[11px] font-mono tabular-nums text-[rgb(var(--c-muted))]">
                              n={grp.count} {grp.count === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <div className="text-[11px] text-[rgb(var(--c-muted))]">Mood</div>
                              <div className="font-heading font-bold font-mono tabular-nums text-[rgb(var(--c-text))]">
                                {grp.avgMood !== null ? `${grp.avgMood}/5` : '—'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-[rgb(var(--c-muted))]">Energy</div>
                              <div className="font-heading font-bold font-mono tabular-nums text-[rgb(var(--c-text))]">
                                {grp.avgEnergy !== null ? `${grp.avgEnergy}/5` : '—'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] text-[rgb(var(--c-muted))]">Stress</div>
                              <div className="font-heading font-bold font-mono tabular-nums text-[rgb(var(--c-text))]">
                                {grp.avgStress !== null ? `${grp.avgStress}/5` : '—'}
                              </div>
                            </div>
                          </div>
                          {grp.dayKeys.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                openInspectDates(
                                  `${grp.label} (${grp.count} days)`,
                                  'Underlying recorded days included in this comparison group.',
                                  grp.dayKeys
                                )
                              }
                              className="text-[11px] font-heading font-semibold text-[rgb(var(--c-primary))] hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Calendar className="w-3 h-3" />
                              <span>Inspect {grp.count} recorded {grp.count === 1 ? 'day' : 'days'}</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-start gap-2.5 text-xs text-[rgb(var(--c-muted))] pt-2 border-t border-[rgb(var(--c-border))]/60 leading-relaxed">
                      <Info className="w-4 h-4 shrink-0 text-[rgb(var(--c-primary))] mt-0.5" />
                      <div>
                        <p className="text-[rgb(var(--c-text))]">{activeComparison.summaryText}</p>
                        {activeComparison.insufficientData && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                            Small sample notice: at least {activeComparison.minRequiredPerGroup} recorded days in each group are needed before drawing patterns.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}

      {inspectModal && (
        <DayInspectionModal
          title={inspectModal.title}
          subtitle={inspectModal.subtitle}
          days={inspectDaysDetail}
          onClose={() => setInspectModal(null)}
          onOpenJournalEntry={openJournalEntryById}
        />
      )}
    </div>
  );
};
