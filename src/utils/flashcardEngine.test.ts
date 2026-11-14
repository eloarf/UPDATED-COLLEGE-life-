import { describe, it, expect } from 'vitest';
import {
  reviewFlashcard,
  getDueFlashcards,
  getDueFlashcardsCount,
  createInitialFlashcardSchedule,
  MIN_EASE_FACTOR,
  MAX_EASE_FACTOR,
} from './flashcardEngine';
import { Flashcard } from '../types';

function makeCard(overrides?: Partial<Flashcard>): Flashcard {
  const sched = createInitialFlashcardSchedule('2026-10-18');
  return {
    id: 'card-1',
    deckId: 'deck-1',
    front: 'What is Big-O of binary search?',
    back: 'O(log n)',
    createdAt: '2026-10-18T08:00:00Z',
    updatedAt: '2026-10-18T08:00:00Z',
    ...sched,
    ...overrides,
  };
}

describe('flashcardEngine (SM-2 spaced repetition)', () => {
  it('handles first review intervals for Hard, Good, Easy, and Again', () => {
    const base = makeCard();
    const today = '2026-10-18';

    const againCard = reviewFlashcard(base, 'again', today);
    expect(againCard.repetitions).toBe(0);
    expect(againCard.intervalDays).toBe(0);
    expect(againCard.dueDate).toBe(today);
    expect(againCard.lapsedCount).toBe(1);

    const hardCard = reviewFlashcard(base, 'hard', today);
    expect(hardCard.repetitions).toBe(1);
    expect(hardCard.intervalDays).toBe(1);
    expect(hardCard.dueDate).toBe('2026-10-19');

    const goodCard = reviewFlashcard(base, 'good', today);
    expect(goodCard.repetitions).toBe(1);
    expect(goodCard.intervalDays).toBe(1);
    expect(goodCard.dueDate).toBe('2026-10-19');

    const easyCard = reviewFlashcard(base, 'easy', today);
    expect(easyCard.repetitions).toBe(1);
    expect(easyCard.intervalDays).toBe(4);
    expect(easyCard.dueDate).toBe('2026-10-22');
  });

  it('progresses Hard/Good/Easy intervals across subsequent days and resets on Again', () => {
    const base = makeCard();
    // Day 1: Good -> 1d
    const r1 = reviewFlashcard(base, 'good', '2026-10-18');
    // Day 2: Good -> 6d
    const r2 = reviewFlashcard(r1, 'good', '2026-10-19');
    expect(r2.repetitions).toBe(2);
    expect(r2.intervalDays).toBe(6);
    expect(r2.dueDate).toBe('2026-10-25');

    // Day 8: Good -> ~15d (6 * 2.5)
    const r3 = reviewFlashcard(r2, 'good', '2026-10-25');
    expect(r3.repetitions).toBe(3);
    expect(r3.intervalDays).toBe(15);
    expect(r3.dueDate).toBe('2026-11-09');

    // Day 8: Easy grows faster than Hard
    const r3Easy = reviewFlashcard(r2, 'easy', '2026-10-25');
    const r3Hard = reviewFlashcard(r2, 'hard', '2026-10-25');
    expect(r3Easy.intervalDays).toBeGreaterThan(r3.intervalDays);
    expect(r3Hard.intervalDays).toBeLessThan(r3.intervalDays);

    // Lapsing resets progress
    const lapsed = reviewFlashcard(r3, 'again', '2026-11-09');
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.intervalDays).toBe(0);
    expect(lapsed.dueDate).toBe('2026-11-09');
    expect(lapsed.lapsedCount).toBe(1);
  });

  it('clamps ease factor within [MIN_EASE_FACTOR, MAX_EASE_FACTOR]', () => {
    let card = makeCard({ easeFactor: MIN_EASE_FACTOR + 0.05 });
    for (let i = 0; i < 10; i++) {
      card = reviewFlashcard(card, 'again', `2026-10-${10 + i}`);
    }
    expect(card.easeFactor).toBe(MIN_EASE_FACTOR);

    let easyCard = makeCard({ easeFactor: MAX_EASE_FACTOR - 0.05 });
    for (let i = 0; i < 10; i++) {
      easyCard = reviewFlashcard(easyCard, 'easy', `2026-10-${10 + i}`);
    }
    expect(easyCard.easeFactor).toBe(MAX_EASE_FACTOR);
  });

  it('prevents interval inflation on same-day repeat reviews while allowing recovery after Again', () => {
    const today = '2026-10-18';
    const card = makeCard({
      intervalDays: 6,
      repetitions: 2,
      dueDate: today,
      lastReviewedDate: '2026-10-12',
    });

    // Review once on today -> schedules intervalDays = 15
    const afterFirst = reviewFlashcard(card, 'good', today);
    expect(afterFirst.intervalDays).toBe(15);

    // Re-review on the SAME day -> should NOT jump again to 38+ days or increment repetitions
    const afterSameDay = reviewFlashcard(afterFirst, 'good', today);
    expect(afterSameDay.intervalDays).toBe(15);
    expect(afterSameDay.repetitions).toBe(3);

    // Recovery flow: card rated 'again' today, then 'good' today -> graduates to 1d
    const againToday = reviewFlashcard(card, 'again', today);
    expect(againToday.intervalDays).toBe(0);
    const recoveredToday = reviewFlashcard(againToday, 'good', today);
    expect(recoveredToday.intervalDays).toBe(1);
    expect(recoveredToday.dueDate).toBe('2026-10-19');
  });

  it('identifies overdue cards oldest-first and handles empty decks', () => {
    expect(getDueFlashcards([], '2026-10-18')).toEqual([]);
    expect(getDueFlashcardsCount([], '2026-10-18')).toBe(0);

    const cOverdueOld = makeCard({ id: 'old', dueDate: '2026-10-10' });
    const cOverdueRecent = makeCard({ id: 'recent', dueDate: '2026-10-17' });
    const cDueToday = makeCard({ id: 'today', dueDate: '2026-10-18' });
    const cFuture = makeCard({ id: 'future', dueDate: '2026-10-20' });

    const due = getDueFlashcards([cFuture, cDueToday, cOverdueRecent, cOverdueOld], '2026-10-18');
    expect(due.map((c) => c.id)).toEqual(['old', 'recent', 'today']);
    expect(getDueFlashcardsCount([cFuture, cDueToday, cOverdueRecent, cOverdueOld], '2026-10-18')).toBe(3);
  });
});
