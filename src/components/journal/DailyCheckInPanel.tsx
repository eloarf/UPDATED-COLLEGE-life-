import React, { useState, useEffect } from 'react';
import { Check, Plus, X, Sparkles, SlidersHorizontal, Link2 } from 'lucide-react';
import { DailyCheckIn } from '../../types';
import {
  MOOD_LEVELS,
  ENERGY_LEVELS,
  STRESS_LEVELS,
  DEFAULT_EMOTIONS,
  DAILY_CONTEXT_FACTORS,
  getScaleLabel,
} from '../../utils/wellbeingEngine';
import { DailyHabitsSummary } from '../../utils/streakEngine';
import { upsertDailyCheckIn } from '../../db/queries';
import { db } from '../../db/db';
import { formatDisplayDate } from '../../utils/dateUtils';
import { useUiStore } from '../../store/uiStore';

interface DailyCheckInPanelProps {
  dateKey: string;
  existingCheckIn?: DailyCheckIn;
  linkedJournalEntryId?: string;
  customEmotions: string[];
  onUpdateCustomEmotions: (nextList: string[]) => Promise<void>;
  dailyHabitsSummary?: DailyHabitsSummary;
  onSaved?: (saved: DailyCheckIn) => void;
  onClose?: () => void;
  showDateHeading?: boolean;
}

export const DailyCheckInPanel: React.FC<DailyCheckInPanelProps> = ({
  dateKey,
  existingCheckIn,
  linkedJournalEntryId,
  customEmotions,
  onUpdateCustomEmotions,
  dailyHabitsSummary,
  onSaved,
  onClose,
  showDateHeading = false,
}) => {
  const { showToast } = useUiStore();

  const [moodScore, setMoodScore] = useState<number | undefined>(existingCheckIn?.moodScore);
  const [energyScore, setEnergyScore] = useState<number | undefined>(existingCheckIn?.energyScore);
  const [stressScore, setStressScore] = useState<number | undefined>(existingCheckIn?.stressScore);
  const [emotions, setEmotions] = useState<string[]>(existingCheckIn?.emotions || []);
  const [contextTags, setContextTags] = useState<string[]>(existingCheckIn?.contextTags || []);
  const [note, setNote] = useState<string>(existingCheckIn?.note || '');
  const [linkToJournal, setLinkToJournal] = useState<boolean>(
    existingCheckIn?.journalEntryId ? true : !!linkedJournalEntryId
  );

  const [showManageEmotions, setShowManageEmotions] = useState(false);
  const [newEmotionInput, setNewEmotionInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Sync form when dateKey or existingCheckIn changes
  useEffect(() => {
    setMoodScore(existingCheckIn?.moodScore);
    setEnergyScore(existingCheckIn?.energyScore);
    setStressScore(existingCheckIn?.stressScore);
    setEmotions(existingCheckIn?.emotions || []);
    setContextTags(existingCheckIn?.contextTags || []);
    setNote(existingCheckIn?.note || '');
    setLinkToJournal(existingCheckIn?.journalEntryId ? true : !!linkedJournalEntryId);
    setSavedNotice(null);
  }, [dateKey, existingCheckIn?.id, existingCheckIn?.updatedAt, linkedJournalEntryId]);

  const allEmotions = React.useMemo(() => {
    const merged = [...DEFAULT_EMOTIONS, ...customEmotions];
    return Array.from(new Set(merged));
  }, [customEmotions]);

  const toggleEmotion = (label: string) => {
    setEmotions((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const toggleContext = (tag: string) => {
    setContextTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomEmotion = async () => {
    const clean = newEmotionInput.trim();
    if (!clean) return;
    const exists = allEmotions.some((e) => e.toLowerCase() === clean.toLowerCase());
    if (!exists) {
      await onUpdateCustomEmotions([...customEmotions, clean]);
    }
    if (!emotions.includes(clean)) {
      setEmotions((prev) => [...prev, clean]);
    }
    setNewEmotionInput('');
  };

  const handleRemoveCustomEmotion = async (label: string) => {
    await onUpdateCustomEmotions(customEmotions.filter((e) => e !== label));
    setEmotions((prev) => prev.filter((e) => e !== label));
  };

  const handleSaveCheckIn = async () => {
    if (
      moodScore === undefined &&
      energyScore === undefined &&
      stressScore === undefined &&
      emotions.length === 0 &&
      contextTags.length === 0 &&
      !note.trim()
    ) {
      showToast('Select at least one check-in measure or note to save.', 'info');
      return;
    }

    setIsSaving(true);
    try {
      const targetEntryId = linkToJournal
        ? linkedJournalEntryId || existingCheckIn?.journalEntryId
        : undefined;

      const saved = await upsertDailyCheckIn({
        dateKey,
        moodScore,
        energyScore,
        stressScore,
        emotions,
        contextTags,
        note,
        journalEntryId: targetEntryId,
      });

      if (targetEntryId) {
        const entryUpdates: Record<string, any> = {
          checkInId: saved.id,
          updatedAt: new Date().toISOString(),
        };
        if (typeof moodScore === 'number') entryUpdates.moodScore = moodScore;
        if (typeof energyScore === 'number') entryUpdates.energyScore = energyScore;
        await db.journalEntries.update(targetEntryId, entryUpdates);
      }

      setSavedNotice(`Saved for ${formatDisplayDate(dateKey)}`);
      showToast('Daily check-in saved.', 'success');
      onSaved?.(saved);
    } finally {
      setIsSaving(false);
    }
  };

  const renderScaleRow = (
    title: string,
    scaleKey: 'mood' | 'energy' | 'stress',
    levels: typeof MOOD_LEVELS,
    value: number | undefined,
    onChange: (val: number | undefined) => void
  ) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">{title}</span>
        <span className="text-xs text-[rgb(var(--c-muted))] font-medium">
          {value ? `${value}/5 · ${getScaleLabel(scaleKey, value)}` : 'Optional'}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {levels.map((lvl) => {
          const isSelected = value === lvl.score;
          return (
            <button
              key={lvl.score}
              type="button"
              onClick={() => onChange(isSelected ? undefined : lvl.score)}
              aria-pressed={isSelected}
              className={`min-h-[44px] px-1.5 py-2 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                isSelected
                  ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-bold shadow-2xs'
                  : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:border-[rgb(var(--c-primary))] hover:text-[rgb(var(--c-text))]'
              }`}
              title={`${lvl.score}: ${lvl.label}`}
            >
              <span className="text-xs font-heading font-bold leading-none">{lvl.score}</span>
              <span className="text-[10px] leading-tight line-clamp-1">{lvl.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
            Daily Check-in {showDateHeading ? `· ${formatDisplayDate(dateKey)}` : ''}
          </h3>
          <p className="text-xs text-[rgb(var(--c-muted))] mt-0.5">
            Quick, optional snapshot of how today feels. Independent from writing.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] transition cursor-pointer"
            aria-label="Close check-in"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Three separate 1-5 scales */}
      <div className="space-y-4">
        {renderScaleRow('Mood', 'mood', MOOD_LEVELS, moodScore, setMoodScore)}
        {renderScaleRow('Energy', 'energy', ENERGY_LEVELS, energyScore, setEnergyScore)}
        {renderScaleRow('Stress', 'stress', STRESS_LEVELS, stressScore, setStressScore)}
      </div>

      {/* Multi-select Emotions */}
      <div className="space-y-2 pt-2 border-t border-[rgb(var(--c-border))]/60">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
            Emotions (select any that fit)
          </span>
          <button
            type="button"
            onClick={() => setShowManageEmotions((v) => !v)}
            className="text-[11px] font-heading font-semibold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] inline-flex items-center gap-1 cursor-pointer"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{showManageEmotions ? 'Done managing' : 'Custom emotions'}</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {allEmotions.map((emotion) => {
            const selected = emotions.includes(emotion);
            return (
              <button
                key={emotion}
                type="button"
                onClick={() => toggleEmotion(emotion)}
                aria-pressed={selected}
                className={`px-3 py-1.5 rounded-xl border text-xs transition cursor-pointer ${
                  selected
                    ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-bold'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))]'
                }`}
              >
                {emotion}
              </button>
            );
          })}
        </div>

        {showManageEmotions && (
          <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newEmotionInput}
                onChange={(e) => setNewEmotionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomEmotion();
                  }
                }}
                placeholder="Add custom emotion label..."
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary))]"
              />
              <button
                type="button"
                onClick={handleAddCustomEmotion}
                className="min-h-[40px] px-3 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] text-xs font-heading font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
            {customEmotions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {customEmotions.map((ce) => (
                  <span
                    key={ce}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[rgb(var(--c-surface2))] text-xs text-[rgb(var(--c-text))]"
                  >
                    <span>{ce}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomEmotion(ce)}
                      className="text-[rgb(var(--c-muted))] hover:text-rose-500 cursor-pointer"
                      aria-label={`Remove ${ce}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Optional Daily Context */}
      <div className="space-y-2 pt-2 border-t border-[rgb(var(--c-border))]/60">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
            Daily context (optional)
          </span>
          <span className="text-[11px] text-[rgb(var(--c-muted))]">
            Helpful backdrop alongside your day
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DAILY_CONTEXT_FACTORS.map((factor) => {
            const selected = contextTags.includes(factor);
            return (
              <button
                key={factor}
                type="button"
                onClick={() => toggleContext(factor)}
                aria-pressed={selected}
                className={`px-3 py-1.5 rounded-xl border text-xs transition cursor-pointer ${
                  selected
                    ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-bold'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))]'
                }`}
              >
                {factor}
              </button>
            );
          })}
        </div>
      </div>

      {/* Optional short note */}
      <div className="space-y-1.5">
        <label className="block text-xs font-heading font-bold text-[rgb(var(--c-text))]">
          Short check-in note (optional)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything brief you want to remember about how today felt..."
          className="w-full px-3 py-2 text-sm rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary))]"
        />
      </div>

      {/* Habit completion summary (read-only informational connection) */}
      {dailyHabitsSummary && dailyHabitsSummary.scheduledTodayCount > 0 && (
        <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]/70 text-xs text-[rgb(var(--c-muted))] flex items-center justify-between gap-2 flex-wrap">
          <span>
            Today&apos;s habits:{' '}
            <strong className="text-[rgb(var(--c-text))]">
              {dailyHabitsSummary.completedCount + dailyHabitsSummary.partialCount} of{' '}
              {dailyHabitsSummary.scheduledTodayCount}
            </strong>{' '}
            scheduled completed
            {dailyHabitsSummary.restedCount > 0
              ? ` · ${dailyHabitsSummary.restedCount} rest`
              : ''}
          </span>
          <a
            href="#/habits"
            className="text-[11px] font-heading font-semibold text-[rgb(var(--c-primary))] hover:underline"
          >
            View Habits
          </a>
        </div>
      )}

      {/* Optional journal link + Save */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[rgb(var(--c-border))]/60">
        {linkedJournalEntryId ? (
          <label className="inline-flex items-center gap-2 text-xs text-[rgb(var(--c-muted))] cursor-pointer">
            <input
              type="checkbox"
              checked={linkToJournal}
              onChange={(e) => setLinkToJournal(e.target.checked)}
              className="rounded accent-[rgb(var(--c-primary))]"
            />
            <Link2 className="w-3.5 h-3.5" />
            <span>Link this check-in to today&apos;s journal entry</span>
          </label>
        ) : (
          <span className="text-xs text-[rgb(var(--c-muted))]">
            {savedNotice ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                {savedNotice}
              </span>
            ) : existingCheckIn ? (
              'Updating your check-in for this day'
            ) : (
              'Saved independently of journal entries'
            )}
          </span>
        )}

        <button
          type="button"
          onClick={handleSaveCheckIn}
          disabled={isSaving}
          className="min-h-[44px] px-5 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition cursor-pointer disabled:opacity-60"
        >
          <Check className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : existingCheckIn ? 'Update Check-in' : 'Save Check-in'}</span>
        </button>
      </div>
    </div>
  );
};
