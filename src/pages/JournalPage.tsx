import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { JournalEntry } from '../types';
import { getTodayKey, formatDisplayDate } from '../utils/dateUtils';
import { awardXp } from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import {
  Feather,
  Plus,
  Smile,
  Zap,
  Tag,
  Search,
  Lock,
  Calendar,
  Sparkles,
  Trash2,
} from 'lucide-react';

const PROMPTS = [
  'What is the single highest leverage task you conquered today?',
  'Where did you encounter resistance, and how did you navigate through it?',
  'What did you learn today about your engineering coursework or yourself?',
  'What are three specific things you feel genuine gratitude for right now?',
  'How will you set yourself up for calm momentum tomorrow?',
];

export const JournalPage: React.FC = () => {
  const { showToast } = useUiStore();
  const todayKey = getTodayKey();

  const [content, setContent] = useState('');
  const [mood, setMood] = useState(4);
  const [energy, setEnergy] = useState(3);
  const [promptIdx, setPromptIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const entries = useLiveQuery(() => db.journalEntries.toArray()) || [];
  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const filteredEntries = searchQuery
    ? sortedEntries.filter((e) => e.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : sortedEntries;

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const entryId = generateId();
    await db.journalEntries.add({
      id: entryId,
      date: todayKey,
      moodScore: mood,
      energyScore: energy,
      content: content.trim(),
      wordCount,
      tags: ['reflection'],
      promptQuestion: PROMPTS[promptIdx],
      createdAt: new Date().toISOString(),
    });

    if (wordCount >= 20) {
      await awardXp({
        source: 'journal_entry',
        sourceId: entryId,
        amount: 15,
        stat: 'creativity',
      });
      showToast('Journal entry preserved! +15 Creativity XP awarded', 'success');
    } else {
      showToast('Short note saved to diary.', 'info');
    }

    setContent('');
  };

  const handleDeleteEntry = async (id: string) => {
    await db.journalEntries.delete(id);
    showToast('Entry removed.', 'info');
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#7A2E4A] font-bold">
              Literary Salon &amp; Daily Ink
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              The Grand Budapest Journal
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Lined parchment aesthetic • Mood &amp; energy telemetry • ≥20 words yields 15 XP
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[rgb(var(--c-muted))] font-flourish flex items-center gap-1">
              <Lock className="w-3 h-3 text-[rgb(var(--c-muted))]" /> Local privacy
            </span>
          </div>
        </div>
      </div>

      {/* Editor Chamber */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-4">
        {/* Rotating prompt pill */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2 text-xs font-flourish font-semibold text-[rgb(var(--c-primary))]">
            <Feather className="w-3.5 h-3.5 shrink-0" />
            <span>“{PROMPTS[promptIdx]}”</span>
          </div>
          <button
            onClick={() => setPromptIdx((p) => (p + 1) % PROMPTS.length)}
            className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] underline shrink-0 ml-2"
          >
            Rotate Prompt
          </button>
        </div>

        <form onSubmit={handleSaveEntry} className="space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="Record thoughts, lectures, campus experiences, and gratitude..."
            className="w-full p-4 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-sm font-flourish leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-t border-[rgb(var(--c-border))] pt-3">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] mr-1.5">
                  Mood:
                </span>
                <span className="text-base">{['😞', '😐', '🙂', '😊', '🔥'][mood - 1]}</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={mood}
                  onChange={(e) => setMood(parseInt(e.target.value, 10))}
                  className="w-20 ml-2 accent-[#7A2E4A]"
                />
              </div>

              <div>
                <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] mr-1.5">
                  Energy:
                </span>
                <span className="text-xs font-bold text-[rgb(var(--c-primary))]">{energy}/5</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={energy}
                  onChange={(e) => setEnergy(parseInt(e.target.value, 10))}
                  className="w-20 ml-2 accent-[#7A2E4A]"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                {wordCount} words {wordCount >= 20 ? '(✓ 15 XP unlocked)' : '(need 20 for XP)'}
              </span>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#7A2E4A] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs"
              >
                Inscribe Entry
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Past Entries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-heading text-xs uppercase font-bold text-[rgb(var(--c-muted))]">
            Chronicle of Past Entries ({filteredEntries.length})
          </div>
          <div className="w-48">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter journal entries..."
              className="w-full px-3 py-1 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))]"
            />
          </div>
        </div>

        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-2 relative"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2">
                <span className="text-sm">{['😞', '😐', '🙂', '😊', '🔥'][entry.moodScore - 1]}</span>
                <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                  {formatDisplayDate(entry.date)}
                </span>
                <span className="text-[10px] text-[rgb(var(--c-muted))]">
                  • {entry.wordCount} words
                </span>
              </div>
              <button
                onClick={() => handleDeleteEntry(entry.id)}
                className="p-1 rounded-md text-[rgb(var(--c-muted))] hover:text-rose-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {entry.promptQuestion && (
              <div className="text-[11px] font-flourish text-[rgb(var(--c-primary))] italic">
                “{entry.promptQuestion}”
              </div>
            )}

            <p className="text-xs font-flourish text-[rgb(var(--c-text))] leading-relaxed whitespace-pre-wrap">
              {entry.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
