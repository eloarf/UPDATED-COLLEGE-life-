import { Flashcard } from '../types';
import { addDaysToKey, getTodayKey } from './dateUtils';

export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy';

export const MIN_EASE_FACTOR = 1.3;
export const MAX_EASE_FACTOR = 2.8;
export const DEFAULT_EASE_FACTOR = 2.5;

export function clampEaseFactor(ef: number): number {
  if (!Number.isFinite(ef)) return DEFAULT_EASE_FACTOR;
  return Math.round(Math.min(MAX_EASE_FACTOR, Math.max(MIN_EASE_FACTOR, ef)) * 100) / 100;
}

export function createInitialFlashcardSchedule(todayKey: string = getTodayKey()): Pick<
  Flashcard,
  'easeFactor' | 'intervalDays' | 'repetitions' | 'dueDate' | 'lapsedCount'
> {
  return {
    easeFactor: DEFAULT_EASE_FACTOR,
    intervalDays: 0,
    repetitions: 0,
    dueDate: todayKey,
    lapsedCount: 0,
  };
}

/**
 * Pure SM-2 spaced repetition scheduler.
 * - First review: Again -> 0d (re-queue today), Hard -> 1d, Good -> 1d, Easy -> 4d
 * - Again: resets repetitions & intervalDays to 0, keeps card due today, bumps lapsedCount, reduces easeFactor
 * - Same-day review protection: if already reviewed today AND already graduated (intervalDays >= 1),
 *   avoids compounding intervalDays repeatedly within the same calendar day.
 */
export function reviewFlashcard(
  card: Flashcard,
  rating: FlashcardRating,
  reviewDateKey: string = getTodayKey()
): Flashcard {
  const currentEf = clampEaseFactor(card.easeFactor ?? DEFAULT_EASE_FACTOR);
  const currentInterval = Math.max(0, card.intervalDays ?? 0);
  const currentReps = Math.max(0, card.repetitions ?? 0);
  const isSameDayRepeatAfterSuccess =
    card.lastReviewedDate === reviewDateKey && currentInterval >= 1 && currentReps >= 1;

  if (rating === 'again') {
    const nextEf = clampEaseFactor(currentEf - 0.2);
    return {
      ...card,
      easeFactor: nextEf,
      intervalDays: 0,
      repetitions: 0,
      dueDate: reviewDateKey,
      lastReviewedDate: reviewDateKey,
      lapsedCount: (card.lapsedCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  // Handle same-day re-study of an already-scheduled card without inflating intervals
  if (isSameDayRepeatAfterSuccess) {
    const efDelta = rating === 'hard' ? -0.1 : rating === 'easy' ? 0.05 : 0;
    const nextEf = clampEaseFactor(currentEf + efDelta);
    return {
      ...card,
      easeFactor: nextEf,
      intervalDays: currentInterval,
      repetitions: currentReps,
      dueDate: addDaysToKey(reviewDateKey, currentInterval),
      lastReviewedDate: reviewDateKey,
      updatedAt: new Date().toISOString(),
    };
  }

  let nextEf = currentEf;
  let nextInterval = 1;
  const nextReps = currentReps + 1;

  if (rating === 'hard') {
    nextEf = clampEaseFactor(currentEf - 0.15);
    if (currentReps === 0) {
      nextInterval = 1;
    } else if (currentReps === 1) {
      nextInterval = 2;
    } else {
      nextInterval = Math.max(currentInterval + 1, Math.round(currentInterval * 1.2));
    }
  } else if (rating === 'good') {
    nextEf = clampEaseFactor(currentEf);
    if (currentReps === 0) {
      nextInterval = 1;
    } else if (currentReps === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.max(currentInterval + 1, Math.round(currentInterval * currentEf));
    }
  } else if (rating === 'easy') {
    nextEf = clampEaseFactor(currentEf + 0.15);
    if (currentReps === 0) {
      nextInterval = 4;
    } else if (currentReps === 1) {
      nextInterval = 8;
    } else {
      nextInterval = Math.max(currentInterval + 2, Math.round(currentInterval * nextEf * 1.3));
    }
  }

  return {
    ...card,
    easeFactor: nextEf,
    intervalDays: nextInterval,
    repetitions: nextReps,
    dueDate: addDaysToKey(reviewDateKey, nextInterval),
    lastReviewedDate: reviewDateKey,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Returns cards due on or before `dateKey`, with most overdue cards first.
 */
export function getDueFlashcards(cards: Flashcard[] = [], dateKey: string = getTodayKey()): Flashcard[] {
  return cards
    .filter((c) => !c.dueDate || c.dueDate <= dateKey)
    .sort((a, b) => {
      const dueCmp = (a.dueDate || '').localeCompare(b.dueDate || '');
      if (dueCmp !== 0) return dueCmp;
      return (a.repetitions || 0) - (b.repetitions || 0);
    });
}

export function getDueFlashcardsCount(cards: Flashcard[] = [], dateKey: string = getTodayKey()): number {
  return getDueFlashcards(cards, dateKey).length;
}

export function formatIntervalLabel(intervalDays: number): string {
  if (intervalDays <= 0) return 'Again today';
  if (intervalDays === 1) return '1 day';
  if (intervalDays < 30) return `${intervalDays} days`;
  const months = Math.round((intervalDays / 30) * 10) / 10;
  return months === 1 ? '1 month' : `${months} months`;
}

export function previewFlashcardRatings(
  card: Flashcard,
  dateKey: string = getTodayKey()
): Record<FlashcardRating, string> {
  return {
    again: formatIntervalLabel(reviewFlashcard(card, 'again', dateKey).intervalDays),
    hard: formatIntervalLabel(reviewFlashcard(card, 'hard', dateKey).intervalDays),
    good: formatIntervalLabel(reviewFlashcard(card, 'good', dateKey).intervalDays),
    easy: formatIntervalLabel(reviewFlashcard(card, 'easy', dateKey).intervalDays),
  };
}
