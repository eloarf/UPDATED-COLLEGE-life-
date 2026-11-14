import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Edit3,
  BookOpen,
  HeartPulse,
} from 'lucide-react';
import { DailyCheckIn, JournalEntry } from '../../types';
import {
  mergeCheckInsWithLegacyJournal,
  filterWellbeingRecords,
  computeWellbeingSummary,
  computeWeeklyAndMonthlySummaries,
  getScaleLabel,
  DEFAULT_EMOTIONS,
  DAILY_CONTEXT_FACTORS,
  WellbeingHistoryRecord,
} from '../../utils/wellbeingEngine';
import { DailyHabitsSummary } from '../../utils/streakEngine';
import { addDaysToKey, formatDisplayDate, getTodayKey, DAY_NAMES } from '../../utils/dateUtils';
import { DailyCheckInPanel } from './DailyCheckInPanel';

interface CheckInHistoryViewProps {
  checkIns: DailyCheckIn[];
  journalEntries: JournalEntry[];
  customEmotions: string[];
  onUpdateCustomEmotions: (nextList: string[]) => Promise<void>;
  dailyHabitsSummary: DailyHabitsSummary;
  onOpenJournalEntryById: (entryId: string) => void;
  onOpenInsights?: () => void;
}

type RangePreset = '7d' | '30d' | '90d' | 'all';

const MOOD_CELL_TONES: Record<number, string> = {
  1: 'border-rose-400/60 bg-rose-500/15 text-[rgb(var(--c-text))]',
  2: 'border-amber-400/60 bg-amber-500/15 text-[rgb(var(--c-text))]',
  3: 'border-sky-400/60 bg-sky-500/15 text-[rgb(var(--c-text))]',
  4: 'border-emerald-400/60 bg-emerald-500/15 text-[rgb(var(--c-text))]',
  5: 'border-[#B6E63E] bg-[#B6E63E]/25 text-[rgb(var(--c-text))] font-bold',
};

export const CheckInHistoryView: React.FC<CheckInHistoryViewProps> = ({
  checkIns,
  journalEntries,
  customEmotions,
  onUpdateCustomEmotions,
  dailyHabitsSummary,
  onOpenJournalEntryById,
  onOpenInsights,
}) => {
  const todayKey = getTodayKey();

  const [rangePreset, setRangePreset] = useState<RangePreset>('30d');
  const [emotionFilter, setEmotionFilter] = useState<string>('all');
  const [contextFilter, setContextFilter] = useState<string>('all');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [editingDateKey, setEditingDateKey] = useState<string | null>(null);

  // Merged non-double-counted history
  const allRecords = useMemo(
    () => mergeCheckInsWithLegacyJournal(checkIns, journalEntries),
    [checkIns, journalEntries]
  );

  const recordByDate = useMemo(() => {
    const map = new Map<string, WellbeingHistoryRecord>();
    allRecords.forEach((r) => map.set(r.dateKey, r));
    return map;
  }, [allRecords]);

  // Weekly & Monthly Summaries
  const { weekly, monthly } = useMemo(
    () => computeWeeklyAndMonthlySummaries(allRecords, todayKey),
    [allRecords, todayKey]
  );

  // Filtered records for selected range + emotion + context
  const startDateForRange = useMemo(() => {
    if (rangePreset === '7d') return addDaysToKey(todayKey, -6);
    if (rangePreset === '30d') return addDaysToKey(todayKey, -29);
    if (rangePreset === '90d') return addDaysToKey(todayKey, -89);
    return undefined;
  }, [rangePreset, todayKey]);

  const filteredRecords = useMemo(
    () =>
      filterWellbeingRecords(allRecords, {
        startDate: startDateForRange,
        endDate: todayKey,
        emotion: emotionFilter,
        contextTag: contextFilter,
      }),
    [allRecords, startDateForRange, todayKey, emotionFilter, contextFilter]
  );

  const rangeSummary = useMemo(
    () => computeWellbeingSummary(filteredRecords),
    [filteredRecords]
  );

  const allEmotionOptions = useMemo(() => {
    const fromHistory = allRecords.flatMap((r) => r.emotions || []);
    return Array.from(new Set([...DEFAULT_EMOTIONS, ...customEmotions, ...fromHistory]));
  }, [allRecords, customEmotions]);

  // Month Calendar Grid
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const monthTitle = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const calendarCells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) calendarCells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    calendarCells.push(
      `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    );
  }

  const editingExistingCheckIn = editingDateKey
    ? checkIns.find((c) => c.dateKey === editingDateKey)
    : undefined;

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Action & Weekly / Monthly Summaries */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
              Wellbeing &amp; Check-in History
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] mt-0.5">
              Track mood, energy, stress, emotions, and daily context over time.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {onOpenInsights && (
              <button
                type="button"
                onClick={onOpenInsights}
                className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] font-heading text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <HeartPulse className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
                <span>Wellbeing Insights</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditingDateKey(editingDateKey === todayKey ? null : todayKey)}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-90 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{recordByDate.has(todayKey) ? "Edit Today's Check-in" : 'New Check-in Today'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-[rgb(var(--c-border))]/60">
          {/* Weekly 7-day summary */}
          <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-heading font-bold text-[rgb(var(--c-text))]">
              <span>Last 7 Days</span>
              <span className="text-[11px] font-normal text-[rgb(var(--c-muted))]">
                {weekly.totalDaysLogged} {weekly.totalDaysLogged === 1 ? 'day' : 'days'} logged
              </span>
            </div>
            {weekly.totalDaysLogged === 0 ? (
              <p className="text-xs text-[rgb(var(--c-muted))]">No check-ins recorded this week yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[11px] text-[rgb(var(--c-muted))] block">Mood</span>
                  <span className="font-bold text-[rgb(var(--c-text))]">
                    {weekly.avgMood !== null ? `${weekly.avgMood}/5` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[rgb(var(--c-muted))] block">Energy</span>
                  <span className="font-bold text-[rgb(var(--c-text))]">
                    {weekly.avgEnergy !== null ? `${weekly.avgEnergy}/5` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[rgb(var(--c-muted))] block">Stress</span>
                  <span className="font-bold text-[rgb(var(--c-text))]">
                    {weekly.avgStress !== null ? `${weekly.avgStress}/5` : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Monthly 30-day summary */}
          <div className="p-3.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-1.5">
            <div className="flex items-center justify-between text-xs font-heading font-bold text-[rgb(var(--c-text))]">
              <span>Last 30 Days</span>
              <span className="text-[11px] font-normal text-[rgb(var(--c-muted))]">
                {monthly.totalDaysLogged} {monthly.totalDaysLogged === 1 ? 'day' : 'days'} logged
              </span>
            </div>
            {monthly.totalDaysLogged === 0 ? (
              <p className="text-xs text-[rgb(var(--c-muted))]">No check-ins recorded in the last 30 days.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[11px] text-[rgb(var(--c-muted))] block">Mood</span>
                  <span className="font-bold text-[rgb(var(--c-text))]">
                    {monthly.avgMood !== null ? `${monthly.avgMood}/5` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[rgb(var(--c-muted))] block">Energy</span>
                  <span className="font-bold text-[rgb(var(--c-text))]">
                    {monthly.avgEnergy !== null ? `${monthly.avgEnergy}/5` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[rgb(var(--c-muted))] block">Stress</span>
                  <span className="font-bold text-[rgb(var(--c-text))]">
                    {monthly.avgStress !== null ? `${monthly.avgStress}/5` : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline Editor when inspecting/creating a specific day's check-in */}
      {editingDateKey && (
        <DailyCheckInPanel
          dateKey={editingDateKey}
          existingCheckIn={editingExistingCheckIn}
          customEmotions={customEmotions}
          onUpdateCustomEmotions={onUpdateCustomEmotions}
          dailyHabitsSummary={editingDateKey === todayKey ? dailyHabitsSummary : undefined}
          showDateHeading
          onSaved={() => setEditingDateKey(null)}
          onClose={() => setEditingDateKey(null)}
        />
      )}

      {/* Calendar View with Daily Mood Indicators */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-heading font-bold text-[rgb(var(--c-text))]">
            <CalendarDays className="w-4 h-4 text-[rgb(var(--c-primary))]" />
            <span>Monthly Mood Calendar</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
              className="p-1.5 rounded-lg border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-heading font-bold px-2.5 min-w-[115px] text-center">
              {monthTitle}
            </span>
            <button
              type="button"
              onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
              className="p-1.5 rounded-lg border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold">
          {DAY_NAMES.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {calendarCells.map((dKey, idx) => {
            if (!dKey) return <div key={`blank-${idx}`} className="h-11 sm:h-12" />;
            const rec = recordByDate.get(dKey);
            const isToday = dKey === todayKey;
            const isFuture = dKey > todayKey;
            const isSelected = editingDateKey === dKey;
            const dayNum = parseInt(dKey.slice(8), 10);
            const moodInt = rec?.moodScore ? Math.round(rec.moodScore) : null;

            const tone = moodInt && MOOD_CELL_TONES[moodInt]
              ? MOOD_CELL_TONES[moodInt]
              : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]';

            return (
              <button
                key={dKey}
                type="button"
                disabled={isFuture}
                onClick={() => setEditingDateKey(dKey)}
                className={`h-11 sm:h-12 rounded-xl border p-1 flex flex-col items-center justify-between transition ${
                  isSelected ? 'ring-2 ring-[rgb(var(--c-primary))]' : ''
                } ${isToday && !isSelected ? 'ring-1 ring-[rgb(var(--c-primary))]' : ''} ${
                  isFuture
                    ? 'border-transparent opacity-35 cursor-default text-[rgb(var(--c-muted))]'
                    : `${tone} hover:border-[rgb(var(--c-primary))] cursor-pointer`
                }`}
                title={
                  rec
                    ? `${dKey}: Mood ${rec.moodScore ?? '—'}/5`
                    : isFuture
                    ? dKey
                    : `${dKey}: Tap to add check-in`
                }
              >
                <span className="text-[10px] font-mono leading-none self-start">{dayNum}</span>
                <span className="text-[10px] leading-none font-bold">
                  {rec?.moodScore ? `${rec.moodScore}/5` : rec ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[rgb(var(--c-border))]/50 text-[11px] text-[rgb(var(--c-muted))]">
          <span>Tap any day to inspect or update its check-in.</span>
          <div className="flex items-center gap-2 flex-wrap">
            <span>Mood scale:</span>
            <span>1 Very low</span>
            <span>·</span>
            <span>3 Okay</span>
            <span>·</span>
            <span>5 Very good</span>
          </div>
        </div>
      </div>

      {/* Filters & Emotion Frequency */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['7d', '30d', '90d', 'all'] as RangePreset[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setRangePreset(preset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold border transition cursor-pointer ${
                  rangePreset === preset
                    ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                {preset === 'all' ? 'All time' : `Last ${preset}`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={emotionFilter}
              onChange={(e) => setEmotionFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs font-heading font-semibold"
              aria-label="Filter by emotion"
            >
              <option value="all">All emotions</option>
              {allEmotionOptions.map((em) => (
                <option key={em} value={em}>
                  {em}
                </option>
              ))}
            </select>

            <select
              value={contextFilter}
              onChange={(e) => setContextFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs font-heading font-semibold"
              aria-label="Filter by context"
            >
              <option value="all">All context tags</option>
              {DAILY_CONTEXT_FACTORS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Emotion Frequency */}
        {rangeSummary.emotionFrequency.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[rgb(var(--c-border))]/50">
            <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
              Emotion frequency ({filteredRecords.length}{' '}
              {filteredRecords.length === 1 ? 'day' : 'days'})
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {rangeSummary.emotionFrequency.slice(0, 8).map((item) => (
                <button
                  key={item.emotion}
                  type="button"
                  onClick={() =>
                    setEmotionFilter(emotionFilter === item.emotion ? 'all' : item.emotion)
                  }
                  className={`p-2 rounded-xl border text-left text-xs transition cursor-pointer flex items-center justify-between ${
                    emotionFilter === item.emotion
                      ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] font-bold'
                      : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[rgb(var(--c-primary))]'
                  }`}
                >
                  <span className="truncate text-[rgb(var(--c-text))]">{item.emotion}</span>
                  <span className="text-[11px] font-mono text-[rgb(var(--c-muted))]">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Individual Check-in History List */}
      {filteredRecords.length === 0 ? (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
            No check-ins in this view yet
          </p>
          <p className="text-xs text-[rgb(var(--c-muted))]">
            Log a quick check-in to begin noticing mood, energy, and stress over time.
          </p>
          <button
            type="button"
            onClick={() => setEditingDateKey(todayKey)}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log your first check-in</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredRecords.map((rec) => (
            <div
              key={rec.id}
              className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      {formatDisplayDate(rec.dateKey)}
                    </span>
                    {rec.source === 'journal_legacy' && (
                      <span className="text-[11px] text-[rgb(var(--c-muted))]">
                        · From journal entry
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[rgb(var(--c-muted))] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {rec.moodScore !== undefined && (
                      <span>
                        Mood:{' '}
                        <strong className="text-[rgb(var(--c-text))]">
                          {rec.moodScore}/5 ({getScaleLabel('mood', rec.moodScore)})
                        </strong>
                      </span>
                    )}
                    {rec.energyScore !== undefined && (
                      <span>
                        Energy:{' '}
                        <strong className="text-[rgb(var(--c-text))]">
                          {rec.energyScore}/5 ({getScaleLabel('energy', rec.energyScore)})
                        </strong>
                      </span>
                    )}
                    {rec.stressScore !== undefined && (
                      <span>
                        Stress:{' '}
                        <strong className="text-[rgb(var(--c-text))]">
                          {rec.stressScore}/5 ({getScaleLabel('stress', rec.stressScore)})
                        </strong>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {rec.journalEntryId && (
                    <button
                      type="button"
                      onClick={() => onOpenJournalEntryById(rec.journalEntryId!)}
                      className="px-2.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-heading font-semibold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] inline-flex items-center gap-1 cursor-pointer"
                      title="Open linked journal entry"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Entry</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingDateKey(rec.dateKey)}
                    className="p-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] cursor-pointer"
                    title="Edit check-in"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {(rec.emotions.length > 0 || rec.contextTags.length > 0) && (
                <div className="text-xs text-[rgb(var(--c-muted))] space-y-1 pt-1">
                  {rec.emotions.length > 0 && (
                    <div>
                      <span className="font-medium text-[rgb(var(--c-text))]">Emotions:</span>{' '}
                      {rec.emotions.join(' · ')}
                    </div>
                  )}
                  {rec.contextTags.length > 0 && (
                    <div>
                      <span className="font-medium text-[rgb(var(--c-text))]">Context:</span>{' '}
                      {rec.contextTags.join(' · ')}
                    </div>
                  )}
                </div>
              )}

              {rec.note && (
                <p className="text-xs text-[rgb(var(--c-text))] pt-1 border-t border-[rgb(var(--c-border))]/40">
                  {rec.note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
