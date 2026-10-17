import React, { useState, useMemo } from 'react';
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
  Download,
  Edit3,
  Eye,
  FileText,
  X,
  Filter,
  Check,
  CalendarDays,
} from 'lucide-react';

const PROMPTS = [
  'What is the single highest leverage task you conquered today?',
  'Where did you encounter resistance, and how did you navigate through it?',
  'What did you learn today about your engineering coursework or yourself?',
  'What are three specific things you feel genuine gratitude for right now?',
  'How will you set yourself up for calm momentum tomorrow?',
  'What moment brought genuine curiosity or intellectual joy today?',
];

// Offline plain-text download helper
function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export const JournalPage: React.FC = () => {
  const { showToast } = useUiStore();
  const todayKey = getTodayKey();
  const currentMonthKey = todayKey.slice(0, 7); // YYYY-MM

  // Editor Form State (New entry)
  const [entryTitle, setEntryTitle] = useState('');
  const [content, setContent] = useState('');
  const [entryDate, setEntryDate] = useState(todayKey);
  const [mood, setMood] = useState(4);
  const [energy, setEnergy] = useState(3);
  const [promptIdx, setPromptIdx] = useState(0);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or 'YYYY-MM'
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<number | 'all'>('all');

  // Modal states: Edit, View Detail, Delete Confirmation, Export Month Modal
  const [entryToEdit, setEntryToEdit] = useState<JournalEntry | null>(null);
  const [entryToView, setEntryToView] = useState<JournalEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  const [isExportMonthModalOpen, setIsExportMonthModalOpen] = useState(false);
  const [exportMonthInput, setExportMonthInput] = useState(currentMonthKey);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editMood, setEditMood] = useState(4);
  const [editEnergy, setEditEnergy] = useState(3);

  // Dexie live queries
  const entries = useLiveQuery(() => db.journalEntries.toArray()) || [];
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  // Unique months available in entries
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    entries.forEach((e) => {
      if (e.date && e.date.length >= 7) {
        months.add(e.date.slice(0, 7));
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return sortedEntries.filter((entry) => {
      // Month filter
      if (selectedMonth !== 'all' && !entry.date.startsWith(selectedMonth)) {
        return false;
      }
      // Mood filter
      if (selectedMoodFilter !== 'all' && entry.moodScore !== selectedMoodFilter) {
        return false;
      }
      // Search query (title and content)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesContent = entry.content.toLowerCase().includes(query);
        const matchesTitle = entry.title?.toLowerCase().includes(query);
        const matchesPrompt = entry.promptQuestion?.toLowerCase().includes(query);
        if (!matchesContent && !matchesTitle && !matchesPrompt) return false;
      }
      return true;
    });
  }, [sortedEntries, selectedMonth, selectedMoodFilter, searchQuery]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  // Handlers
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      showToast('Please compose journal content before saving.', 'warning');
      return;
    }

    const entryId = generateId();
    await db.journalEntries.add({
      id: entryId,
      title: entryTitle.trim() || undefined,
      date: entryDate,
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
      showToast('Journal entry preserved in parchment! +15 Creativity XP', 'success');
    } else {
      showToast('Short note saved to diary.', 'info');
    }

    setEntryTitle('');
    setContent('');
    setEntryDate(todayKey);
  };

  const handleOpenEdit = (entry: JournalEntry) => {
    setEntryToEdit(entry);
    setEditTitle(entry.title || '');
    setEditContent(entry.content);
    setEditMood(entry.moodScore);
    setEditEnergy(entry.energyScore);
  };

  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryToEdit || !editContent.trim()) return;

    const count = editContent.trim().split(/\s+/).length;
    await db.journalEntries.update(entryToEdit.id, {
      title: editTitle.trim() || undefined,
      content: editContent.trim(),
      moodScore: editMood,
      energyScore: editEnergy,
      wordCount: count,
      updatedAt: new Date().toISOString(),
    });

    showToast('Journal entry revised.', 'success');
    setEntryToEdit(null);
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    await db.journalEntries.delete(entryToDelete.id);
    showToast('Entry removed from journal chronicle.', 'info');
    setEntryToDelete(null);
  };

  // Export single entry as plain-text file
  const handleExportSingleEntry = (entry: JournalEntry) => {
    const titleLine = entry.title ? `Title: ${entry.title}\n` : '';
    const moodEmojis = ['😞 Melancholy', '😐 Neutral', '🙂 Pleasant', '😊 Serene', '🔥 High Vitality'];
    const moodStr = moodEmojis[entry.moodScore - 1] || 'Neutral';
    const promptLine = entry.promptQuestion ? `Prompt: “${entry.promptQuestion}”\n` : '';

    const text = `======================================================================
THE GRAND BUDAPEST JOURNAL — ENTRY
======================================================================
Date: ${entry.date} (${formatDisplayDate(entry.date)})
${titleLine}Mood: ${moodStr} (${entry.moodScore}/5)
Energy Level: ${entry.energyScore}/5
Word Count: ${entry.wordCount}
${promptLine}======================================================================

${entry.content}

----------------------------------------------------------------------
College Life OS — Private Local Archive
Exported on: ${new Date().toLocaleString()}
`;

    const sanitized = (entry.title || entry.date).replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadTextFile(`journal_${entry.date}_${sanitized}.txt`, text);
    showToast('Entry exported as plain-text file.', 'success');
  };

  // Export all entries in a given month into one combined text file
  const handleExportMonth = () => {
    const monthKey = exportMonthInput.trim();
    if (!monthKey) {
      showToast('Please select a month to export.', 'warning');
      return;
    }

    const monthEntries = sortedEntries.filter((e) => e.date.startsWith(monthKey));

    if (monthEntries.length === 0) {
      showToast(`No journal entries found for month ${monthKey}.`, 'info');
      setIsExportMonthModalOpen(false);
      return;
    }

    const moodEmojis = ['😞 Melancholy', '😐 Neutral', '🙂 Pleasant', '😊 Serene', '🔥 High Vitality'];

    let fileContent = `======================================================================
THE GRAND BUDAPEST JOURNAL — MONTHLY COMPENDIUM
Month: ${monthKey}
Total Entries: ${monthEntries.length}
Generated: ${new Date().toLocaleString()}
======================================================================\n\n`;

    monthEntries.forEach((entry, idx) => {
      const titleLine = entry.title ? `Title: ${entry.title}\n` : '';
      const moodStr = moodEmojis[entry.moodScore - 1] || 'Neutral';
      const promptLine = entry.promptQuestion ? `Prompt: “${entry.promptQuestion}”\n` : '';

      fileContent += `----------------------------------------------------------------------
[Entry #${idx + 1}] — Date: ${entry.date} (${formatDisplayDate(entry.date)})
${titleLine}Mood: ${moodStr} | Energy: ${entry.energyScore}/5 | Words: ${entry.wordCount}
${promptLine}----------------------------------------------------------------------

${entry.content}

\n\n`;
    });

    fileContent += `======================================================================
End of Archive for ${monthKey} — Stored in College Life OS
======================================================================\n`;

    downloadTextFile(`journal_archive_${monthKey}.txt`, fileContent);
    showToast(`Exported ${monthEntries.length} entries for ${monthKey}!`, 'success');
    setIsExportMonthModalOpen(false);
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* 1. Literary Salon Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#7A2E4A] font-bold">
              Literary Salon &amp; Daily Ink
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))]">
              The Grand Budapest Journal
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Lined parchment aesthetic • Mood &amp; energy telemetry • Offline .txt exports for single entries or whole months
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsExportMonthModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:border-[#7A2E4A] active:scale-95 transition"
              title="Export all entries from a chosen month into one readable text file"
            >
              <Download className="w-3.5 h-3.5 text-[#7A2E4A]" />
              <span>Export Month</span>
            </button>

            <span className="text-[10px] text-[rgb(var(--c-muted))] font-flourish flex items-center gap-1 px-2.5 py-1 rounded-full bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
              <Lock className="w-3 h-3 text-emerald-600" /> 100% Local Privacy
            </span>
          </div>
        </div>
      </div>

      {/* 2. Editor Chamber */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-4 shadow-sm">
        {/* Rotating prompt pill */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2 text-xs font-flourish font-semibold text-[rgb(var(--c-primary))]">
            <Feather className="w-3.5 h-3.5 shrink-0" />
            <span>“{PROMPTS[promptIdx]}”</span>
          </div>
          <button
            type="button"
            onClick={() => setPromptIdx((p) => (p + 1) % PROMPTS.length)}
            className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] underline shrink-0 ml-2"
          >
            Rotate Prompt
          </button>
        </div>

        <form onSubmit={handleSaveEntry} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={entryTitle}
                onChange={(e) => setEntryTitle(e.target.value)}
                placeholder="Entry Title (optional, e.g. Statics Midterm Reflection)"
                className="w-full px-3.5 py-2 text-xs font-heading font-semibold rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-1 focus:ring-[#7A2E4A]"
              />
            </div>
            <div>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-heading rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="Record thoughts, lectures, campus experiences, and gratitude..."
            className="w-full p-4 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-sm font-flourish leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-t border-[rgb(var(--c-border))] pt-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] mr-1.5 font-bold">
                  Mood:
                </span>
                <span className="text-base">{['😞', '😐', '🙂', '😊', '🔥'][mood - 1]}</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={isNaN(mood) ? 3 : mood}
                  onChange={(e) => setMood(parseInt(e.target.value, 10) || 3)}
                  className="w-20 ml-2 accent-[#7A2E4A]"
                />
              </div>

              <div>
                <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] mr-1.5 font-bold">
                  Energy:
                </span>
                <span className="text-xs font-bold text-[rgb(var(--c-primary))]">{(isNaN(energy) ? 3 : energy)}/5</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={isNaN(energy) ? 3 : energy}
                  onChange={(e) => setEnergy(parseInt(e.target.value, 10) || 3)}
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

      {/* 3. Chronicle Search & Filter Bar */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="font-heading text-xs uppercase font-bold text-[rgb(var(--c-text))] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#7A2E4A]" />
            <span>Chronicle of Past Entries ({filteredEntries.length} of {entries.length})</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[rgb(var(--c-muted))]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search text or titles..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Month Filter Selector */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-heading"
            >
              <option value="all">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Mood Filter */}
            <select
              value={selectedMoodFilter}
              onChange={(e) =>
                setSelectedMoodFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))
              }
              className="px-2.5 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-heading"
            >
              <option value="all">All Moods</option>
              <option value="5">🔥 High Energy</option>
              <option value="4">😊 Serene</option>
              <option value="3">🙂 Pleasant</option>
              <option value="2">😐 Neutral</option>
              <option value="1">😞 Melancholy</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Past Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-8 text-center text-xs text-[rgb(var(--c-muted))] font-flourish">
          {searchQuery || selectedMonth !== 'all' || selectedMoodFilter !== 'all'
            ? 'No entries match your search and filter criteria.'
            : 'No journal reflections inked yet. Compose your first memory above!'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-3 relative shadow-2xs hover:border-[#7A2E4A]/40 transition"
            >
              <div className="flex items-start justify-between gap-3 pb-2 border-b border-[rgb(var(--c-border))]">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-base" title={`Mood: ${entry.moodScore}/5`}>
                    {['😞', '😐', '🙂', '😊', '🔥'][entry.moodScore - 1]}
                  </span>
                  <div>
                    <div className="text-xs sm:text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                      {entry.title || formatDisplayDate(entry.date)}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[rgb(var(--c-muted))] font-flourish">
                      <span>{entry.date}</span>
                      <span>•</span>
                      <span>{entry.wordCount} words</span>
                      <span>•</span>
                      <span>Energy {entry.energyScore}/5</span>
                      {entry.updatedAt && <span>• (edited)</span>}
                    </div>
                  </div>
                </div>

                {/* Card Action Controls: View, Edit, Export .txt, Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEntryToView(entry)}
                    className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] transition"
                    title="Read full entry"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleExportSingleEntry(entry)}
                    className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[#7A2E4A] hover:bg-[rgb(var(--c-surface2))] transition"
                    title="Export as plain-text (.txt)"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(entry)}
                    className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] transition"
                    title="Edit entry"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setEntryToDelete(entry)}
                    className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500 hover:bg-[rgb(var(--c-surface2))] transition"
                    title="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {entry.promptQuestion && (
                <div className="text-[11px] font-flourish text-[rgb(var(--c-primary))] italic bg-[rgb(var(--c-bg))] px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))]">
                  “{entry.promptQuestion}”
                </div>
              )}

              <p className="text-xs sm:text-sm font-flourish text-[rgb(var(--c-text))] leading-relaxed whitespace-pre-wrap">
                {entry.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ================= MODAL: EDIT ENTRY ================= */}
      {entryToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-4">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                Revise Journal Entry ({entryToEdit.date})
              </div>
              <button
                onClick={() => setEntryToEdit(null)}
                className="p-1 rounded-xl text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEntry} className="space-y-4">
              <div>
                <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Reflections on Engineering Physics"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                  Journal Content
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  className="w-full p-3 text-xs sm:text-sm font-flourish rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Mood: {['😞', '😐', '🙂', '😊', '🔥'][(isNaN(editMood) ? 3 : editMood) - 1] || '🙂'}
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={isNaN(editMood) ? 3 : editMood}
                    onChange={(e) => setEditMood(parseInt(e.target.value, 10) || 3)}
                    className="w-full accent-[#7A2E4A]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Energy: {isNaN(editEnergy) ? 3 : editEnergy}/5
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={isNaN(editEnergy) ? 3 : editEnergy}
                    onChange={(e) => setEditEnergy(parseInt(e.target.value, 10) || 3)}
                    className="w-full accent-[#7A2E4A]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
                <button
                  type="button"
                  onClick={() => setEntryToEdit(null)}
                  className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7A2E4A] text-white text-xs font-heading font-bold hover:opacity-90 active:scale-95 transition shadow-xs"
                >
                  Save Revisions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW ENTRY DETAIL ================= */}
      {entryToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {['😞', '😐', '🙂', '😊', '🔥'][entryToView.moodScore - 1]}
                </span>
                <div>
                  <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                    {entryToView.title || 'Journal Entry'}
                  </div>
                  <div className="text-[10px] text-[rgb(var(--c-muted))]">
                    {entryToView.date} ({formatDisplayDate(entryToView.date)}) • {entryToView.wordCount} words
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEntryToView(null)}
                className="p-1 rounded-xl text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {entryToView.promptQuestion && (
              <div className="p-3 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-xs font-flourish text-[rgb(var(--c-primary))] italic">
                “{entryToView.promptQuestion}”
              </div>
            )}

            <div className="p-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-sm font-flourish text-[rgb(var(--c-text))] leading-relaxed whitespace-pre-wrap">
              {entryToView.content}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[rgb(var(--c-border))]">
              <button
                onClick={() => handleExportSingleEntry(entryToView)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <Download className="w-3.5 h-3.5 text-[#7A2E4A]" />
                <span>Export as .txt</span>
              </button>

              <button
                onClick={() => setEntryToView(null)}
                className="px-4 py-1.5 rounded-xl bg-[#7A2E4A] text-white text-xs font-heading font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EXPORT MONTH ================= */}
      {isExportMonthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2 font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                <Download className="w-4 h-4 text-[#7A2E4A]" />
                <span>Export Monthly Chronicle</span>
              </div>
              <button onClick={() => setIsExportMonthModalOpen(false)}>
                <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
              </button>
            </div>

            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Select the month you wish to compile into a single downloadable .txt archive. Works completely offline.
            </p>

            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                Month (YYYY-MM)
              </label>
              <input
                type="month"
                value={exportMonthInput}
                onChange={(e) => setExportMonthInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-heading"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
              <button
                type="button"
                onClick={() => setIsExportMonthModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportMonth}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#7A2E4A] text-white text-xs font-heading font-bold hover:opacity-90 active:scale-95 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-rose-500/50 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <Trash2 className="w-5 h-5 shrink-0" />
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                Erase Journal Entry?
              </div>
            </div>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish leading-relaxed">
              Are you sure you want to delete the entry for{' '}
              <strong className="text-[rgb(var(--c-text))]">
                {entryToDelete.title ? `“${entryToDelete.title}” (${entryToDelete.date})` : entryToDelete.date}
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
              <button
                onClick={() => setEntryToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-heading font-bold transition shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
