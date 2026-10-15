import React, { useState, useEffect, useCallback } from 'react';
import { Flashcard } from '../types/study';
import {
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Bookmark,
  CheckCircle2,
  Sparkles,
  Layers,
  LayoutGrid,
} from 'lucide-react';

interface FlashcardsViewProps {
  flashcards: Flashcard[];
  subjectTitle: string;
  onUpdateFlashcards?: (updated: Flashcard[]) => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  flashcards: initialCards,
  subjectTitle,
}) => {
  const [cards, setCards] = useState<Flashcard[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewMode, setViewMode] = useState<'focus' | 'grid'>('focus');
  const [filterTopic, setFilterTopic] = useState<string>('all');

  useEffect(() => {
    setCards(initialCards);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [initialCards]);

  const topics = Array.from(new Set(initialCards.map((c) => c.topic)));
  const filteredCards =
    filterTopic === 'all' ? cards : cards.filter((c) => c.topic === filterTopic);

  const currentCard = filteredCards[currentIndex] || filteredCards[0];

  const handleNext = useCallback(() => {
    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, filteredCards.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (viewMode !== 'focus') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, handleFlip, handleNext, handlePrev]);

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleRateCard = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentCard) return;
    const updated = cards.map((c) =>
      c.id === currentCard.id ? { ...c, userRating: rating } : c
    );
    setCards(updated);
    if (currentIndex < filteredCards.length - 1) {
      handleNext();
    }
  };

  const handleToggleBookmark = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = cards.map((c) =>
      c.id === id ? { ...c, isBookmarked: !c.isBookmarked } : c
    );
    setCards(updated);
  };

  if (!filteredCards || filteredCards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-slate-400">
        <Layers className="w-12 h-12 mx-auto text-slate-600 mb-3" />
        <h3 className="text-base font-semibold text-slate-200">No Flashcards In Deck</h3>
        <p className="text-xs text-slate-500 mt-1">Upload schoolwork or select another topic filter.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{subjectTitle}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{cards.length} Total Cards</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
            Active Recall Flashcards
          </h2>
        </div>

        {/* View mode toggle & Topic filter */}
        <div className="flex items-center gap-2.5">
          {topics.length > 1 && (
            <select
              value={filterTopic}
              onChange={(e) => {
                setFilterTopic(e.target.value);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Topics ({initialCards.length})</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center p-1 bg-slate-900 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('focus')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'focus'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Focus Mode"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Grid Overview"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleShuffle}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
            title="Shuffle deck"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Shuffle</span>
          </button>
        </div>
      </div>

      {viewMode === 'focus' ? (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Card Meta & Progress */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums text-slate-300 font-semibold">
                Card {currentIndex + 1} of {filteredCards.length}
              </span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{currentCard.topic}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize text-slate-500">{currentCard.difficulty}</span>
            </div>

            <button
              onClick={() => handleToggleBookmark(currentCard.id)}
              className={`p-1.5 rounded-md transition-colors ${
                currentCard.isBookmarked
                  ? 'text-amber-400 bg-amber-500/10'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Bookmark card"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / filteredCards.length) * 100}%`,
              }}
            />
          </div>

          {/* 3D Flip Card */}
          <div
            onClick={handleFlip}
            className="perspective-1000 min-h-[340px] cursor-pointer select-none"
          >
            <div
              className={`relative w-full min-h-[340px] rounded-2xl border transition-all duration-500 transform-style-3d shadow-xl ${
                isFlipped ? 'rotate-y-180 border-indigo-500/40' : 'border-slate-800'
              } bg-slate-900/90 hover:border-slate-700`}
            >
              {/* FRONT SIDE */}
              <div
                className={`absolute inset-0 p-8 flex flex-col justify-between backface-hidden ${
                  isFlipped ? 'pointer-events-none' : ''
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium tracking-wide text-indigo-400">PROMPT / CONCEPT</span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <RotateCw className="w-3 h-3" /> Click card or Spacebar to reveal
                  </span>
                </div>

                <div className="my-auto py-6">
                  <p className="text-xl sm:text-2xl font-bold text-slate-100 leading-snug text-balance">
                    {currentCard.front}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs text-slate-400">
                  <span>Topic: {currentCard.topic}</span>
                  <span className="text-indigo-400 font-medium">Flip to inspect answer →</span>
                </div>
              </div>

              {/* BACK SIDE */}
              <div
                className={`absolute inset-0 p-8 flex flex-col justify-between backface-hidden rotate-y-180 bg-slate-900 ${
                  !isFlipped ? 'pointer-events-none' : ''
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium tracking-wide text-emerald-400">
                    VERIFIED ANSWER & EXPLANATION
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <RotateCw className="w-3 h-3" /> Click to flip back
                  </span>
                </div>

                <div className="my-auto py-4 space-y-4">
                  <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-normal">
                    {currentCard.back}
                  </p>

                  {currentCard.memoryTip && (
                    <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-start gap-2.5 text-xs text-indigo-200">
                      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-indigo-300 font-semibold block mb-0.5">
                          Memory Anchor / Retention Tip:
                        </strong>
                        <span>{currentCard.memoryTip}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Topic: {currentCard.topic}</span>
                  <span className="text-slate-500 font-mono tabular-nums">
                    Rigor: {currentCard.difficulty}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation & Spaced Repetition Rating */}
          <div className="space-y-4">
            {isFlipped ? (
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                <p className="text-xs text-slate-400 text-center">
                  How well did you recall this concept?
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleRateCard('again')}
                    className="py-2 text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors"
                  >
                    Again (1)
                  </button>
                  <button
                    onClick={() => handleRateCard('hard')}
                    className="py-2 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors"
                  >
                    Hard (2)
                  </button>
                  <button
                    onClick={() => handleRateCard('good')}
                    className="py-2 text-xs font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors"
                  >
                    Good (3)
                  </button>
                  <button
                    onClick={() => handleRateCard('easy')}
                    className="py-2 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors"
                  >
                    Easy (4)
                  </button>
                </div>
              </div>
            ) : null}

            {/* Previous / Next buttons */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous (←)</span>
              </button>

              <button
                onClick={handleFlip}
                className="px-5 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{isFlipped ? 'Show Prompt' : 'Flip to Answer (Space)'}</span>
              </button>

              <button
                onClick={handleNext}
                disabled={currentIndex === filteredCards.length - 1}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 rounded-lg transition-colors"
              >
                <span>Next (→)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Grid Overview */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((card, idx) => (
            <div
              key={card.id}
              onClick={() => {
                setCurrentIndex(idx);
                setViewMode('focus');
                setIsFlipped(false);
              }}
              className="p-4 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl cursor-pointer transition-all flex flex-col justify-between group space-y-3"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                  <span>Card {idx + 1}</span>
                  <span className="capitalize">{card.difficulty}</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 line-clamp-3">
                  {card.front}
                </h4>
              </div>

              <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                <span className="truncate max-w-[180px]">{card.topic}</span>
                <span className="text-indigo-400 text-[11px]">Inspect →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
