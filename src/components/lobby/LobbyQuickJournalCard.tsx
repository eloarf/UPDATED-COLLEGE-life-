import React, { useState } from 'react';
import { db } from '../../db/db';
import { awardXp } from '../../services/rpgService';
import { getPromptForCategory } from '../../utils/journalEngine';
import { generateId } from '../../utils/idGenerator';
import { useUiStore } from '../../store/uiStore';
import { Feather, ArrowRight, Check } from 'lucide-react';

interface LobbyQuickJournalCardProps {
  todayKey: string;
  onNavigate: (route: string) => void;
}

const QUICK_MOODS = [
  { score: 1, label: 'Low', emoji: '😔' },
  { score: 2, label: 'Flat', emoji: '😐' },
  { score: 3, label: 'Okay', emoji: '🙂' },
  { score: 4, label: 'Good', emoji: '😊' },
  { score: 5, label: 'Bright', emoji: '✨' },
];

export const LobbyQuickJournalCard: React.FC<LobbyQuickJournalCardProps> = ({
  todayKey,
  onNavigate,
}) => {
  const { showToast } = useUiStore();
  const promptObj = getPromptForCategory('reflection', new Date().getDate());
  const [moodScore, setMoodScore] = useState(4);
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) {
      showToast('Write a quick line before saving.', 'info');
      return;
    }

    setSaving(true);
    try {
      const id = generateId();
      const now = new Date().toISOString();
      const words = noteText.trim().split(/\s+/).length;

      await db.journalEntries.add({
        id,
        title: `1-Minute Check-In (${todayKey})`,
        date: todayKey,
        moodScore,
        energyScore: moodScore,
        content: noteText.trim(),
        wordCount: words,
        tags: ['quick-checkin'],
        promptQuestion: promptObj.prompt,
        createdAt: now,
        updatedAt: now,
      });

      await awardXp({
        source: 'journal_entry',
        sourceId: `quick_${todayKey}`,
        amount: 10,
        stat: 'creativity',
        dayKey: todayKey,
      });

      setNoteText('');
      showToast('1-minute reflection saved!', 'success');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveQuickNote} className="space-y-3 pt-1">
      <div className="p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs font-flourish text-[rgb(var(--c-text))]">
        “{promptObj.prompt}”
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] font-heading font-bold text-[rgb(var(--c-muted))]">
          Mood:
        </span>
        <div className="flex items-center gap-1.5">
          {QUICK_MOODS.map((m) => (
            <button
              key={m.score}
              type="button"
              onClick={() => setMoodScore(m.score)}
              className={`px-2.5 py-1 rounded-lg border text-xs transition cursor-pointer ${
                moodScore === m.score
                  ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] font-bold text-[rgb(var(--c-text))]'
                  : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))]'
              }`}
              title={m.label}
            >
              <span>{m.emoji}</span>
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        rows={2}
        placeholder="Jot down 1–2 sentences..."
        className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary))]"
      />

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onNavigate('#/journal')}
          className="text-xs font-heading font-semibold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] inline-flex items-center gap-1 cursor-pointer"
        >
          <Feather className="w-3.5 h-3.5" />
          <span>Full Journal Editor</span>
          <ArrowRight className="w-3 h-3" />
        </button>

        <button
          type="submit"
          disabled={saving}
          className="px-3.5 py-1.5 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving...' : 'Save 1-Min Note'}</span>
        </button>
      </div>
    </form>
  );
};
