import React, { useState, useMemo } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { FlashcardDeck, Flashcard } from '../types';
import { getTodayKey } from '../utils/dateUtils';
import { generateId } from '../utils/idGenerator';
import { awardXp } from '../services/rpgService';
import {
  createInitialFlashcardSchedule,
  getDueFlashcards,
  getDueFlashcardsCount,
  previewFlashcardRatings,
  reviewFlashcard,
  FlashcardRating,
} from '../utils/flashcardEngine';
import {
  Layers,
  Plus,
  Play,
  Edit2,
  Trash2,
  ChevronLeft,
  RotateCw,
  CheckCircle2,
  BookOpen,
  ShieldAlert,
  X,
  Sparkles,
} from 'lucide-react';

export const FlashcardsPage: React.FC = () => {
  const { showToast, setCurrentRoute } = useUiStore();
  const todayKey = getTodayKey();

  const decks = useLiveQuery(() => db.flashcardDecks.toArray()) || [];
  const cards = useLiveQuery(() => db.flashcards.toArray()) || [];
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const exams = useLiveQuery(() => db.exams.toArray()) || [];
  const examTopics = useLiveQuery(() => db.examTopics.toArray()) || [];

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewQueueIds, setReviewQueueIds] = useState<string[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedInSession, setReviewedInSession] = useState(0);

  // Deck modal state
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null);
  const [deckTitle, setDeckTitle] = useState('');
  const [deckDesc, setDeckDesc] = useState('');
  const [deckCourseId, setDeckCourseId] = useState('');
  const [deckExamTopicId, setDeckExamTopicId] = useState('');

  // Card modal state
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');

  const selectedDeck = decks.find((d) => d.id === selectedDeckId) || null;
  const totalDueCount = useMemo(() => getDueFlashcardsCount(cards, todayKey), [cards, todayKey]);

  const deckCards = useMemo(
    () => (selectedDeckId ? cards.filter((c) => c.deckId === selectedDeckId) : []),
    [cards, selectedDeckId]
  );

  const selectedDeckDueCards = useMemo(
    () => getDueFlashcards(deckCards, todayKey),
    [deckCards, todayKey]
  );

  // Exam topics filtered cleanly by selected course in modal (or all)
  const filteredExamTopics = useMemo(() => {
    if (!deckCourseId) return examTopics;
    const courseExamIds = new Set(
      exams.filter((e) => e.courseId === deckCourseId).map((e) => e.id)
    );
    return examTopics.filter((t) => courseExamIds.has(t.examId));
  }, [examTopics, exams, deckCourseId]);

  const activeReviewCard = useMemo(() => {
    if (!isReviewing || reviewQueueIds.length === 0) return null;
    const headId = reviewQueueIds[0];
    return cards.find((c) => c.id === headId) || null;
  }, [isReviewing, reviewQueueIds, cards]);

  const ratingPreviews = useMemo(() => {
    if (!activeReviewCard) return null;
    return previewFlashcardRatings(activeReviewCard, todayKey);
  }, [activeReviewCard, todayKey]);

  const openCreateDeck = () => {
    setEditingDeck(null);
    setDeckTitle('');
    setDeckDesc('');
    setDeckCourseId('');
    setDeckExamTopicId('');
    setIsDeckModalOpen(true);
  };

  const openEditDeck = (deck: FlashcardDeck) => {
    setEditingDeck(deck);
    setDeckTitle(deck.title);
    setDeckDesc(deck.description || '');
    setDeckCourseId(deck.courseId || '');
    setDeckExamTopicId(deck.examTopicId || '');
    setIsDeckModalOpen(true);
  };

  const handleSaveDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckTitle.trim()) return;
    const now = new Date().toISOString();

    if (editingDeck) {
      await db.flashcardDecks.update(editingDeck.id, {
        title: deckTitle.trim(),
        description: deckDesc.trim() || undefined,
        courseId: deckCourseId || undefined,
        examTopicId: deckExamTopicId || undefined,
        updatedAt: now,
      });
      showToast('Deck updated.', 'success');
    } else {
      const id = generateId();
      await db.flashcardDecks.add({
        id,
        title: deckTitle.trim(),
        description: deckDesc.trim() || undefined,
        courseId: deckCourseId || undefined,
        examTopicId: deckExamTopicId || undefined,
        createdAt: now,
        updatedAt: now,
      });
      setSelectedDeckId(id);
      showToast('Flashcard deck created!', 'success');
    }

    setIsDeckModalOpen(false);
  };

  const handleDeleteDeck = async (deck: FlashcardDeck) => {
    await db.flashcards.where('deckId').equals(deck.id).delete();
    await db.flashcardDecks.delete(deck.id);
    if (selectedDeckId === deck.id) {
      setSelectedDeckId(null);
      setIsReviewing(false);
    }
    showToast(`Deleted "${deck.title}".`, 'info');
  };

  const openCreateCard = () => {
    setEditingCard(null);
    setCardFront('');
    setCardBack('');
    setIsCardModalOpen(true);
  };

  const openEditCard = (card: Flashcard) => {
    setEditingCard(card);
    setCardFront(card.front);
    setCardBack(card.back);
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeckId || !cardFront.trim() || !cardBack.trim()) return;
    const now = new Date().toISOString();

    if (editingCard) {
      await db.flashcards.update(editingCard.id, {
        front: cardFront.trim(),
        back: cardBack.trim(),
        updatedAt: now,
      });
      showToast('Card updated.', 'success');
    } else {
      const sched = createInitialFlashcardSchedule(todayKey);
      await db.flashcards.add({
        id: generateId(),
        deckId: selectedDeckId,
        front: cardFront.trim(),
        back: cardBack.trim(),
        ...sched,
        createdAt: now,
        updatedAt: now,
      });
      showToast('Flashcard added to deck.', 'success');
    }

    setIsCardModalOpen(false);
  };

  const handleDeleteCard = async (card: Flashcard) => {
    await db.flashcards.delete(card.id);
    setReviewQueueIds((q) => q.filter((id) => id !== card.id));
    showToast('Card deleted.', 'info');
  };

  const startReviewSession = (targetDeckId?: string) => {
    const pool = targetDeckId ? cards.filter((c) => c.deckId === targetDeckId) : cards;
    const due = getDueFlashcards(pool, todayKey);
    if (due.length === 0) {
      showToast('No cards due today — nice work!', 'info');
      return;
    }
    setReviewQueueIds(due.map((c) => c.id));
    setIsFlipped(false);
    setReviewedInSession(0);
    setIsReviewing(true);
  };

  const handleRateCard = async (rating: FlashcardRating) => {
    if (!activeReviewCard) return;
    const updated = reviewFlashcard(activeReviewCard, rating, todayKey);
    await db.flashcards.put(updated);

    // Award XP once per card per calendar day under daily cap rules
    await awardXp({
      source: 'flashcard_review',
      sourceId: `fc_${activeReviewCard.id}_${todayKey}`,
      amount: 5,
      stat: 'knowledge',
      dayKey: todayKey,
    });

    setReviewedInSession((n) => n + 1);
    setIsFlipped(false);

    if (rating === 'again') {
      // Re-queue failed card at end of this review queue so user practices it before finishing
      setReviewQueueIds((prev) => {
        const rest = prev.slice(1);
        return [...rest, activeReviewCard.id];
      });
    } else {
      setReviewQueueIds((prev) => prev.slice(1));
    }
  };

  // Focused Review Mode
  if (isReviewing) {
    const remaining = reviewQueueIds.length;
    return (
      <div className="space-y-4 pb-20 animate-pop max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsReviewing(false)}
            className="flex items-center gap-1.5 text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Exit Review</span>
          </button>
          <span className="text-xs font-heading font-bold text-[rgb(var(--c-muted))]">
            {remaining > 0 ? `${remaining} card${remaining === 1 ? '' : 's'} remaining` : 'Session Complete'}
          </span>
        </div>

        {activeReviewCard && ratingPreviews ? (
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between text-[11px] font-heading font-bold text-[rgb(var(--c-muted))]">
              <span>
                {decks.find((d) => d.id === activeReviewCard.deckId)?.title || 'Flashcard Review'}
              </span>
              <span>
                Ease {activeReviewCard.easeFactor.toFixed(2)} • Interval {activeReviewCard.intervalDays}d
              </span>
            </div>

            <div
              onClick={() => setIsFlipped((f) => !f)}
              className="min-h-[210px] rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[rgb(var(--c-primary))] transition space-y-3"
            >
              <span className="text-[10px] uppercase tracking-widest font-heading font-bold text-[rgb(var(--c-primary))]">
                {isFlipped ? 'Answer' : 'Prompt — Tap to Reveal'}
              </span>
              <p className="text-base sm:text-lg font-heading font-bold text-[rgb(var(--c-text))] whitespace-pre-wrap">
                {isFlipped ? activeReviewCard.back : activeReviewCard.front}
              </p>
              {isFlipped && (
                <p className="text-xs text-[rgb(var(--c-muted))] font-flourish pt-2 border-t border-[rgb(var(--c-border))] w-full max-w-md">
                  Prompt: {activeReviewCard.front}
                </p>
              )}
            </div>

            {!isFlipped ? (
              <button
                onClick={() => setIsFlipped(true)}
                className="w-full py-3 rounded-2xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-98 transition"
              >
                <RotateCw className="w-4 h-4" />
                <span>Show Answer</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(
                  [
                    { key: 'again', label: 'Again', sub: ratingPreviews.again, cls: 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
                    { key: 'hard', label: 'Hard', sub: ratingPreviews.hard, cls: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300' },
                    { key: 'good', label: 'Good', sub: ratingPreviews.good, cls: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
                    { key: 'easy', label: 'Easy', sub: ratingPreviews.easy, cls: 'border-[rgb(var(--c-primary))]/50 bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))]' },
                  ] as const
                ).map((btn) => (
                  <button
                    key={btn.key}
                    onClick={() => handleRateCard(btn.key)}
                    className={`p-3 rounded-2xl border text-center hover:opacity-90 active:scale-95 transition ${btn.cls}`}
                  >
                    <div className="font-heading text-xs font-bold">{btn.label}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">{btn.sub}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-10 text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
            <div>
              <h3 className="text-lg font-heading font-bold text-[rgb(var(--c-text))]">
                Review Queue Settled
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-1">
                You completed {reviewedInSession} card review{reviewedInSession === 1 ? '' : 's'} offline with SM-2 scheduling.
              </p>
            </div>
            <button
              onClick={() => setIsReviewing(false)}
              className="px-5 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold"
            >
              Back to Decks
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase font-heading tracking-widest text-[rgb(var(--c-primary))] font-bold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Offline Spaced Repetition</span>
          </div>
          <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
            {selectedDeck ? selectedDeck.title : 'Flashcards & Memory Decks'}
          </h2>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            {selectedDeck
              ? `${deckCards.length} total cards • ${selectedDeckDueCards.length} due today`
              : `${decks.length} deck${decks.length === 1 ? '' : 's'} • ${totalDueCount} due across all courses today`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedDeck && (
            <button
              onClick={() => setSelectedDeckId(null)}
              className="px-3 py-1.5 rounded-full border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>All Decks</span>
            </button>
          )}

          {totalDueCount > 0 && !selectedDeck && (
            <button
              onClick={() => startReviewSession()}
              className="px-4 py-1.5 rounded-full bg-emerald-500 text-stone-950 font-heading text-xs font-bold flex items-center gap-1.5 shadow-xs hover:opacity-90 active:scale-95 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Review All Due ({totalDueCount})</span>
            </button>
          )}

          {selectedDeck ? (
            <>
              {selectedDeckDueCards.length > 0 && (
                <button
                  onClick={() => startReviewSession(selectedDeck.id)}
                  className="px-4 py-1.5 rounded-full bg-emerald-500 text-stone-950 font-heading text-xs font-bold flex items-center gap-1.5 shadow-xs hover:opacity-90"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Study Due ({selectedDeckDueCards.length})</span>
                </button>
              )}
              <button
                onClick={openCreateCard}
                className="px-4 py-1.5 rounded-full bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold flex items-center gap-1.5 shadow-xs hover:opacity-90"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Card</span>
              </button>
            </>
          ) : (
            <button
              onClick={openCreateDeck}
              className="px-4 py-1.5 rounded-full bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold flex items-center gap-1.5 shadow-xs hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Deck</span>
            </button>
          )}
        </div>
      </div>

      {/* Selected Deck Cards View */}
      {selectedDeck ? (
        deckCards.length === 0 ? (
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-12 text-center space-y-3">
            <Sparkles className="w-8 h-8 mx-auto text-[rgb(var(--c-primary))]" />
            <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
              This deck has no cards yet
            </div>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish max-w-md mx-auto">
              Add concise active-recall prompts and answers — spaced repetition intervals adapt automatically offline.
            </p>
            <button
              onClick={openCreateCard}
              className="px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add your first flashcard</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {deckCards.map((card) => {
              const isDue = !card.dueDate || card.dueDate <= todayKey;
              return (
                <div
                  key={card.id}
                  className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded-full ${
                          isDue
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {isDue ? 'Due Today' : `Due ${card.dueDate}`}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditCard(card)}
                          className="p-1 text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                          title="Edit card"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCard(card)}
                          className="p-1 text-[rgb(var(--c-muted))] hover:text-rose-500"
                          title="Delete card"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                      {card.front}
                    </div>
                    <div className="text-xs text-[rgb(var(--c-muted))] font-flourish line-clamp-3">
                      {card.back}
                    </div>
                  </div>
                  <div className="text-[10px] text-[rgb(var(--c-muted))] pt-2 border-t border-[rgb(var(--c-border))] flex justify-between">
                    <span>Reps: {card.repetitions}</span>
                    <span>Ease: {card.easeFactor.toFixed(2)} • Interval: {card.intervalDays}d</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : decks.length === 0 ? (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-12 text-center space-y-3">
          <Layers className="w-9 h-9 mx-auto text-[rgb(var(--c-primary))]" />
          <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
            No flashcard decks yet
          </div>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish max-w-md mx-auto">
            Organize decks by course and optionally link an exam topic for fast offline spaced repetition.
          </p>
          <button
            onClick={openCreateDeck}
            className="px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create your first deck</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {decks.map((deck) => {
            const list = cards.filter((c) => c.deckId === deck.id);
            const dueCount = getDueFlashcardsCount(list, todayKey);
            const course = courses.find((c) => c.id === deck.courseId);
            const topic = examTopics.find((t) => t.id === deck.examTopicId);

            return (
              <div
                key={deck.id}
                className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-[rgb(var(--c-primary))] transition"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => setSelectedDeckId(deck.id)}
                      className="text-left min-w-0 flex-1"
                    >
                      <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))] truncate hover:text-[rgb(var(--c-primary))]">
                        {deck.title}
                      </div>
                      {deck.description && (
                        <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish line-clamp-2 mt-0.5">
                          {deck.description}
                        </div>
                      )}
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditDeck(deck)}
                        className="p-1 text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                        title="Edit deck"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDeck(deck)}
                        className="p-1 text-[rgb(var(--c-muted))] hover:text-rose-500"
                        title="Delete deck"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-heading">
                    {course && (
                      <span
                        className="px-2 py-0.5 rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] inline-flex items-center gap-1"
                      >
                        <BookOpen className="w-2.5 h-2.5" style={{ color: course.color }} />
                        <span>{course.code}</span>
                      </span>
                    )}
                    {topic && (
                      <button
                        onClick={() => setCurrentRoute('#/exams')}
                        className="px-2 py-0.5 rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] inline-flex items-center gap-1"
                      >
                        <ShieldAlert className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[140px]">{topic.title}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[rgb(var(--c-border))]">
                  <button
                    onClick={() => setSelectedDeckId(deck.id)}
                    className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                  >
                    {list.length} card{list.length === 1 ? '' : 's'} • Manage →
                  </button>
                  {dueCount > 0 ? (
                    <button
                      onClick={() => {
                        setSelectedDeckId(deck.id);
                        startReviewSession(deck.id);
                      }}
                      className="px-3 py-1 rounded-xl bg-emerald-500 text-stone-950 font-heading text-[11px] font-bold flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{dueCount} due</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-heading font-bold text-emerald-600 dark:text-emerald-400">
                      Caught up
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Deck Modal */}
      {isDeckModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                {editingDeck ? 'Edit Flashcard Deck' : 'New Flashcard Deck'}
              </div>
              <button
                onClick={() => setIsDeckModalOpen(false)}
                className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDeck} className="space-y-3">
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Deck Title
                </label>
                <input
                  type="text"
                  value={deckTitle}
                  onChange={(e) => setDeckTitle(e.target.value)}
                  placeholder="e.g. Organic Chemistry Mechanisms"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Course (Optional)
                </label>
                <select
                  value={deckCourseId}
                  onChange={(e) => {
                    setDeckCourseId(e.target.value);
                    setDeckExamTopicId('');
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="">General / Unlinked</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {filteredExamTopics.length > 0 && (
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Linked Exam Topic (Optional)
                  </label>
                  <select
                    value={deckExamTopicId}
                    onChange={(e) => setDeckExamTopicId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="">None</option>
                    {filteredExamTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={deckDesc}
                  onChange={(e) => setDeckDesc(e.target.value)}
                  placeholder="Short focus scope..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90"
              >
                {editingDeck ? 'Save Deck' : 'Create Deck'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Card Modal */}
      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                {editingCard ? 'Edit Flashcard' : 'Add Flashcard'}
              </div>
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-3">
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Front (Question / Prompt)
                </label>
                <textarea
                  value={cardFront}
                  onChange={(e) => setCardFront(e.target.value)}
                  rows={3}
                  placeholder="What does the Master Theorem state?"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Back (Answer / Key Insight)
                </label>
                <textarea
                  value={cardBack}
                  onChange={(e) => setCardBack(e.target.value)}
                  rows={3}
                  placeholder="Asymptotic bounds for divide-and-conquer recurrences T(n) = aT(n/b) + f(n)..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90"
              >
                {editingCard ? 'Save Card' : 'Add to Deck'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
