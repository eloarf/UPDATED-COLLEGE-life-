import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { ReadingItem, LearningTopic } from '../types';
import { awardXp, triggerLevelUpConfetti } from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import {
  Bookmark,
  Plus,
  BookOpen,
  CheckCircle,
  Circle,
  Sparkles,
  Award,
  ChevronRight,
  X,
  Trash2,
} from 'lucide-react';

export const LibraryPage: React.FC = () => {
  const { showToast } = useUiStore();
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const bookGoal = settings?.yearlyBookGoal || 40;

  const [activeShelf, setActiveShelf] = useState<'queue' | 'reading'>('queue');
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);

  // Book Form
  const [bookTitle, setBookTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState<number | string>(300);

  // Topic Form
  const [topicTitle, setTopicTitle] = useState('');
  const [topicNotes, setTopicNotes] = useState('');

  const books = useLiveQuery(() => db.readingItems.toArray()) || [];
  const topics = useLiveQuery(() => db.learningQueue.toArray()) || [];

  const finishedBooksCount = books.filter((b) => b.isFinished).length;
  const bookGoalPercent = Math.min(100, Math.round((finishedBooksCount / bookGoal) * 100));

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim()) return;

    await db.readingItems.add({
      id: generateId(),
      title: bookTitle.trim(),
      author: author.trim() || 'Unknown',
      totalPages: Number(totalPages) || 300,
      pagesRead: 0,
      isFinished: false,
    });

    setBookTitle('');
    setAuthor('');
    setIsAddBookOpen(false);
    showToast('Book shelved in library!', 'success');
  };

  const handleUpdateBookPages = async (book: ReadingItem, newPages: number) => {
    const validPages = Math.min(book.totalPages, Math.max(0, newPages));
    const isNowFinished = validPages >= book.totalPages;

    await db.readingItems.update(book.id, {
      pagesRead: validPages,
      isFinished: isNowFinished,
    });

    if (isNowFinished && !book.isFinished) {
      triggerLevelUpConfetti();
      await awardXp({
        source: 'book_finished',
        sourceId: book.id,
        amount: 150,
        stat: 'knowledge',
      });
      showToast(`📖 Book finished! +150 Knowledge XP awarded!`, 'success');
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) return;

    await db.learningQueue.add({
      id: generateId(),
      title: topicTitle.trim(),
      status: 'queued',
      notes: topicNotes.trim() || undefined,
      order: topics.length + 1,
    });

    setTopicTitle('');
    setTopicNotes('');
    setIsAddTopicOpen(false);
    showToast('Topic added to morning learning brief!', 'success');
  };

  const handleCompleteTopic = async (topic: LearningTopic) => {
    const isNowDone = topic.status !== 'done';
    await db.learningQueue.update(topic.id, {
      status: isNowDone ? 'done' : 'queued',
    });

    if (isNowDone) {
      await awardXp({
        source: 'learning_topic',
        sourceId: topic.id,
        amount: 20,
        stat: 'knowledge',
      });
      showToast('Morning brief conquered! +20 Knowledge XP', 'success');
    }
  };

  const handleDeleteBook = async (id: string) => {
    await db.readingItems.delete(id);
    showToast('Book removed from library.', 'info');
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#4FA3A5] font-bold">
              Alexandrian Library Suite
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              Learning Brief &amp; Reading Shelf
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Morning topic briefs • 40-book yearly goal • 150 XP per completed book
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveShelf('queue')}
              className={`px-3 py-1.5 rounded-full text-xs font-heading font-bold transition ${
                activeShelf === 'queue'
                  ? 'bg-[#4FA3A5] text-white shadow-xs'
                  : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))]'
              }`}
            >
              Morning Brief
            </button>
            <button
              onClick={() => setActiveShelf('reading')}
              className={`px-3 py-1.5 rounded-full text-xs font-heading font-bold transition ${
                activeShelf === 'reading'
                  ? 'bg-[#4FA3A5] text-white shadow-xs'
                  : 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))]'
              }`}
            >
              Reading Shelf
            </button>
          </div>
        </div>

        {/* Yearly Book Goal Ring Card */}
        {activeShelf === 'reading' && (
          <div className="p-3.5 mt-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-heading uppercase text-[#4FA3A5] font-bold">
                Yearly Book Goal
              </span>
              <div className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                {finishedBooksCount} of {bookGoal} Books Completed
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-heading font-bold text-[rgb(var(--c-primary))]">
                {bookGoalPercent}% Goal Met
              </span>
              <div className="w-24 h-1.5 bg-stone-200 dark:bg-stone-800 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-[#4FA3A5] transition-all duration-300"
                  style={{ width: `${bookGoalPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shelf 1: Morning Brief Learning Queue */}
      {activeShelf === 'queue' && (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
            <div className="font-heading text-xs uppercase font-bold text-[#4FA3A5]">
              Morning Curiosity Topics ({topics.filter((t) => t.status === 'done').length}/{topics.length} Done)
            </div>
            <button
              onClick={() => setIsAddTopicOpen(true)}
              className="text-xs font-heading font-bold text-[#4FA3A5] flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Queue Topic
            </button>
          </div>

          <div className="space-y-2">
            {topics.map((topic) => {
              const isDone = topic.status === 'done';
              return (
                <div
                  key={topic.id}
                  onClick={() => handleCompleteTopic(topic)}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 cursor-pointer transition active:scale-98 ${
                    isDone
                      ? 'border-emerald-500/50 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : topic.status === 'today'
                      ? 'border-[#4FA3A5] bg-[#4FA3A5]/10 shadow-xs'
                      : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {isDone ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className={`text-xs font-heading font-bold ${isDone ? 'line-through text-[rgb(var(--c-muted))]' : 'text-[rgb(var(--c-text))]'}`}>
                        {topic.title}
                      </div>
                      {topic.notes && (
                        <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish mt-0.5">
                          {topic.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-heading font-bold text-[rgb(var(--c-xp))]">
                    +20 XP
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shelf 2: Reading Shelf */}
      {activeShelf === 'reading' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-heading text-xs uppercase font-bold text-[rgb(var(--c-muted))]">
              Books on Chamber Shelf ({books.length})
            </div>
            <button
              onClick={() => setIsAddBookOpen(true)}
              className="px-3 py-1 rounded-full bg-[#4FA3A5] text-white font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95"
            >
              + Add Book
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {books.map((b) => (
              <div
                key={b.id}
                className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                      {b.title}
                    </h4>
                    <div className="text-xs text-[rgb(var(--c-muted))] font-flourish">
                      by {b.author}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteBook(b.id)}
                    className="text-[rgb(var(--c-muted))] hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-[rgb(var(--c-muted))] mb-1">
                    <span>
                      {b.pagesRead} of {b.totalPages} pages ({Math.round((b.pagesRead / b.totalPages) * 100)}%)
                    </span>
                    {b.isFinished && <span className="font-bold text-emerald-600">✓ Finished</span>}
                  </div>
                  <div className="w-full h-2 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4FA3A5] transition-all duration-300"
                      style={{ width: `${Math.min(100, (b.pagesRead / b.totalPages) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-[rgb(var(--c-border))] text-xs">
                  <span className="text-[10px] text-[rgb(var(--c-muted))]">Update page:</span>
                  <input
                    type="number"
                    value={isNaN(Number(b.pagesRead)) ? 0 : b.pagesRead}
                    onChange={(e) => handleUpdateBookPages(b, parseInt(e.target.value, 10) || 0)}
                    className="w-16 px-2 py-0.5 rounded border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                  <button
                    onClick={() => handleUpdateBookPages(b, b.pagesRead + 20)}
                    className="px-2 py-0.5 rounded bg-[rgb(var(--c-surface2))] text-[10px] font-heading font-bold hover:bg-[#4FA3A5] hover:text-white"
                  >
                    +20 pages
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Book Modal */}
      {isAddBookOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))] mb-3">
              <div className="font-heading text-xs font-bold text-[rgb(var(--c-text))]">
                Shelve New Book
              </div>
              <button onClick={() => setIsAddBookOpen(false)}>
                <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
              </button>
            </div>

            <form onSubmit={handleCreateBook} className="space-y-3">
              <div>
                <label className="block text-[10px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Book Title
                </label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="e.g. Sapiens: A Brief History of Humankind"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Author
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Yuval Noah Harari"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Total Page Count
                </label>
                <input
                  type="number"
                  value={totalPages === '' || isNaN(Number(totalPages)) ? '' : totalPages}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTotalPages(val === '' ? '' : isNaN(parseInt(val, 10)) ? '' : parseInt(val, 10));
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2 rounded-xl bg-[#4FA3A5] text-white font-heading text-xs font-bold"
              >
                Shelve Volume
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
