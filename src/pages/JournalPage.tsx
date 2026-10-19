import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { JournalEntry } from '../types';
import { getTodayKey, formatDisplayDate, addDaysToKey, parseDayKey } from '../utils/dateUtils';
import { awardXp } from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import {
  CATEGORIZED_PROMPTS,
  PromptCategory,
  getPromptForCategory,
  formatLightweightMarkdown,
  insertFormattingSyntax,
  calculateJournalStats,
  buildStructuredReflectionContent,
} from '../utils/journalEngine';
import { THEMES } from '../theme/themeUtils';
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
  Star,
  Pin,
  Maximize2,
  Minimize2,
  RotateCcw,
  BookOpen,
  Bold,
  Italic,
  Heading2,
  Heading3,
  Quote,
  List,
  CheckSquare,
  HelpCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Archive,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Type,
  Palette,
} from 'lucide-react';

// Offline text download helper
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

const MOOD_EMOJIS = ['😞 Melancholy', '😐 Neutral', '🙂 Pleasant', '😊 Serene', '🔥 High Vitality'];
const MOOD_ICONS = ['😞', '😐', '🙂', '😊', '🔥'];

const THEME_AMBIANCE_LABELS: Record<string, { label: string; motif: string }> = {
  'gothic-romance': { label: 'Gothic Romance • Antique Parchment & Ink', motif: '❦' },
  'pink-neon-dream': { label: 'Pink Neon Dream • Ultraviolet Bloom', motif: '✧' },
  'halloween-after-dark': { label: 'Halloween After Dark • Spectral Library', motif: '✦' },
  'cyberpunk-grid': { label: 'Cyberpunk Grid • Terminal Deck Log', motif: '⌗' },
  'emerald-arcana': { label: 'Emerald Arcana • Grimoire Foliage', motif: '🌿' },
  'oceanic-abyss': { label: 'Oceanic Abyss • Bioluminescent Depth', motif: '≋' },
  'solar-flare': { label: 'Solar Flare • Radiant Flare Studio', motif: '☼' },
  'celestial-starlight': { label: 'Celestial Starlight • Astral Observatory', motif: '★' },
  'dark-academia': { label: 'Dark Academia • Mahogany Study Desk', motif: '📜' },
  'tokyo-vaporwave': { label: 'Tokyo Sunset Vaporwave • Retro Horizon', motif: '░' },
  'arctic-frost': { label: 'Arctic Frost • Crystalline Alpine Focus', motif: '❄' },
  'forest-moss': { label: 'Forest Moss Sanctuary • Ancient Grove', motif: '🍃' },
  'pink-lobby': { label: 'Pink Lobby • Storybook Concierge', motif: '🗝' },
  'matcha-cream': { label: 'Matcha Cream • Botanical Tea Parlor', motif: '🍵' },
  'blush-cocoa': { label: 'Blush & Cocoa • Patisserie Suite', motif: '🌸' },
  'chocolate-lime': { label: 'Chocolate Lime • Espresso Woodgrain', motif: '☕' },
  'midnight-plum': { label: 'Midnight Plum • Velvet Amethyst', motif: '🌙' },
  'burgundy-velvet': { label: 'Burgundy Velvet • Grand Theatre Wine', motif: '🍷' },
};

export const JournalPage: React.FC = () => {
  const { showToast } = useUiStore();
  const todayKey = getTodayKey();
  const currentMonthKey = todayKey.slice(0, 7);

  // Active user theme from DB
  const userSettings = useLiveQuery(() => db.settings.get('current_user'));
  const currentThemeId = userSettings?.theme || 'pink-lobby';
  const activeThemeMeta = THEMES.find((t) => t.id === currentThemeId) || THEMES[0];
  const activeThemeAmbiance = THEME_AMBIANCE_LABELS[currentThemeId] || {
    label: `${activeThemeMeta.name} • Private Writing Canvas`,
    motif: '✦',
  };

  // Typography & Canvas Scaling (persisted locally for reader comfort)
  const [textScale, setTextScale] = useState<'compact' | 'comfortable' | 'large'>(() => {
    return (localStorage.getItem('college_os_journal_scale') as any) || 'comfortable';
  });
  const [fontFamilyChoice, setFontFamilyChoice] = useState<'serif' | 'sans'>(() => {
    return (localStorage.getItem('college_os_journal_font') as any) || 'serif';
  });
  const [paperTexture, setPaperTexture] = useState<boolean>(() => {
    return localStorage.getItem('college_os_journal_paper') === 'true';
  });

  const handleSetScale = (scale: 'compact' | 'comfortable' | 'large') => {
    setTextScale(scale);
    localStorage.setItem('college_os_journal_scale', scale);
  };

  const handleToggleFont = () => {
    const next = fontFamilyChoice === 'serif' ? 'sans' : 'serif';
    setFontFamilyChoice(next);
    localStorage.setItem('college_os_journal_font', next);
  };

  const handleTogglePaper = () => {
    const next = !paperTexture;
    setPaperTexture(next);
    localStorage.setItem('college_os_journal_paper', String(next));
  };

  // View mode: 'archive' | 'editor' | 'trash'
  const [activeView, setActiveView] = useState<'archive' | 'editor' | 'trash'>('archive');
  const [isZenMode, setIsZenMode] = useState(false);
  const [previewMode, setPreviewMode] = useState<'write' | 'preview'>('write');

  // Currently editing entry ID (null means a brand-new draft entry)
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

  // Editor Form Fields
  const [entryTitle, setEntryTitle] = useState('');
  const [content, setContent] = useState('');
  const [entryDate, setEntryDate] = useState(todayKey);
  const [mood, setMood] = useState(4);
  const [energy, setEnergy] = useState(3);
  const [isPinned, setIsPinned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>(['reflection']);
  const [customTagInput, setCustomTagInput] = useState('');
  const [selectedPromptCategory, setSelectedPromptCategory] = useState<PromptCategory>('reflection');
  const [promptIndex, setPromptIndex] = useState(0);
  const [showPromptsPanel, setShowPromptsPanel] = useState(true);
  const [appliedPromptQuestion, setAppliedPromptQuestion] = useState<string | undefined>(undefined);

  // Structured Reflection Modal
  const [isStructuredModalOpen, setIsStructuredModalOpen] = useState(false);
  const [structHappened, setStructHappened] = useState('');
  const [structMattered, setStructMattered] = useState('');
  const [structNext, setStructNext] = useState('');

  // Autosave Telemetry: 'saved' | 'saving' | 'unsaved' | 'failed'
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'failed'>('saved');
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);
  const autosaveTimeoutRef = useRef<any>(null);
  const isDirtyRef = useRef(false);

  // Content Textarea Ref for cursor insertion
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Archive Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<number | 'all'>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [calendarFilterDate, setCalendarFilterDate] = useState<string | null>(null);

  // Modals & Confirmation States
  const [entryToView, setEntryToView] = useState<JournalEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportMonthInput, setExportMonthInput] = useState(currentMonthKey);

  // Dexie live queries
  const allEntriesRaw = useLiveQuery(() => db.journalEntries.toArray()) || [];

  // Separate active entries from trash
  const activeEntries = useMemo(() => {
    return allEntriesRaw.filter((e) => !e.deletedAt);
  }, [allEntriesRaw]);

  const trashEntries = useMemo(() => {
    return allEntriesRaw.filter((e) => !!e.deletedAt).sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
  }, [allEntriesRaw]);

  // Sorted active entries: Pinned entries float first, then newest date first
  const sortedEntries = useMemo(() => {
    return [...activeEntries].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.date.localeCompare(a.date);
    });
  }, [activeEntries]);

  // Overall honest journal stats
  const journalStats = useMemo(() => {
    return calculateJournalStats(allEntriesRaw, todayKey);
  }, [allEntriesRaw, todayKey]);

  // Months available
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    activeEntries.forEach((e) => {
      if (e.date && e.date.length >= 7) {
        months.add(e.date.slice(0, 7));
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [activeEntries]);

  // Filtered Archive entries
  const filteredEntries = useMemo(() => {
    return sortedEntries.filter((entry) => {
      if (onlyFavorites && !entry.isFavorite) return false;
      if (onlyPinned && !entry.isPinned) return false;
      if (calendarFilterDate && entry.date !== calendarFilterDate) return false;
      if (selectedMonth !== 'all' && !entry.date.startsWith(selectedMonth)) return false;
      if (selectedMoodFilter !== 'all' && entry.moodScore !== selectedMoodFilter) return false;
      if (selectedTagFilter !== 'all' && (!entry.tags || !entry.tags.includes(selectedTagFilter))) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesContent = entry.content.toLowerCase().includes(q);
        const matchesTitle = entry.title?.toLowerCase().includes(q);
        const matchesPrompt = entry.promptQuestion?.toLowerCase().includes(q);
        const matchesTag = entry.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesContent && !matchesTitle && !matchesPrompt && !matchesTag) return false;
      }
      return true;
    });
  }, [
    sortedEntries,
    onlyFavorites,
    onlyPinned,
    calendarFilterDate,
    selectedMonth,
    selectedMoodFilter,
    selectedTagFilter,
    searchQuery,
  ]);

  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  const activePrompt = useMemo(() => {
    return getPromptForCategory(selectedPromptCategory, promptIndex);
  }, [selectedPromptCategory, promptIndex]);

  // 14-day activity strip
  const activityStripDays = useMemo(() => {
    const days: { dateKey: string; label: string; count: number; isToday: boolean }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dKey = addDaysToKey(todayKey, -i);
      const parsed = parseDayKey(dKey);
      const count = journalStats.recentEntriesByDate[dKey] || 0;
      days.push({
        dateKey: dKey,
        label: parsed.toLocaleDateString('en-US', { weekday: 'narrow' }),
        count,
        isToday: dKey === todayKey,
      });
    }
    return days;
  }, [todayKey, journalStats.recentEntriesByDate]);

  // Autosave Function
  const executeAutosave = useCallback(async () => {
    if (!content.trim() && !entryTitle.trim()) {
      setAutosaveStatus('saved');
      return;
    }

    try {
      setAutosaveStatus('saving');
      const nowIso = new Date().toISOString();
      const currentWords = content.trim() ? content.trim().split(/\s+/).length : 0;

      if (activeEntryId) {
        // Update existing entry
        await db.journalEntries.update(activeEntryId, {
          title: entryTitle.trim() || undefined,
          date: entryDate,
          content: content.trim(),
          moodScore: mood,
          energyScore: energy,
          wordCount: currentWords,
          tags: activeTags,
          promptQuestion: appliedPromptQuestion,
          isPinned,
          isFavorite,
          updatedAt: nowIso,
        });
      } else {
        // Create new entry and establish ID
        const newId = generateId();
        setActiveEntryId(newId);
        await db.journalEntries.add({
          id: newId,
          title: entryTitle.trim() || undefined,
          date: entryDate,
          content: content.trim(),
          moodScore: mood,
          energyScore: energy,
          wordCount: currentWords,
          tags: activeTags,
          promptQuestion: appliedPromptQuestion,
          isPinned,
          isFavorite,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }

      setAutosaveStatus('saved');
      setLastSavedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      isDirtyRef.current = false;
    } catch (err) {
      console.error('Autosave error:', err);
      setAutosaveStatus('failed');
    }
  }, [
    activeEntryId,
    entryTitle,
    content,
    entryDate,
    mood,
    energy,
    activeTags,
    appliedPromptQuestion,
    isPinned,
    isFavorite,
  ]);

  // Trigger debounced autosave on field changes
  useEffect(() => {
    if (activeView !== 'editor') return;
    if (!content.trim() && !entryTitle.trim()) return;

    isDirtyRef.current = true;
    setAutosaveStatus('unsaved');
    clearTimeout(autosaveTimeoutRef.current);

    autosaveTimeoutRef.current = setTimeout(() => {
      executeAutosave();
    }, 800);

    return () => clearTimeout(autosaveTimeoutRef.current);
  }, [content, entryTitle, entryDate, mood, energy, activeTags, isPinned, isFavorite, activeView, executeAutosave]);

  // Safe navigation warning if unsaved
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Action: Start Brand-New Entry
  const handleStartNewEntry = () => {
    // Flush previous autosave if pending
    if (isDirtyRef.current) {
      executeAutosave();
    }
    setActiveEntryId(null);
    setEntryTitle('');
    setContent('');
    setEntryDate(todayKey);
    setMood(4);
    setEnergy(3);
    setIsPinned(false);
    setIsFavorite(false);
    setActiveTags(['reflection']);
    setAppliedPromptQuestion(undefined);
    setAutosaveStatus('saved');
    setLastSavedTimestamp(null);
    setPreviewMode('write');
    setActiveView('editor');
  };

  // Action: Open Existing Entry in Editor
  const handleEditEntry = (entry: JournalEntry) => {
    if (isDirtyRef.current) {
      executeAutosave();
    }
    setActiveEntryId(entry.id);
    setEntryTitle(entry.title || '');
    setContent(entry.content || '');
    setEntryDate(entry.date || todayKey);
    setMood(isNaN(entry.moodScore) ? 4 : entry.moodScore);
    setEnergy(isNaN(entry.energyScore) ? 3 : entry.energyScore);
    setIsPinned(!!entry.isPinned);
    setIsFavorite(!!entry.isFavorite);
    setActiveTags(entry.tags && entry.tags.length > 0 ? entry.tags : ['reflection']);
    setAppliedPromptQuestion(entry.promptQuestion);
    setAutosaveStatus('saved');
    setLastSavedTimestamp(null);
    setPreviewMode('write');
    setActiveView('editor');
  };

  // Action: Return from Editor to Archive
  const handleReturnToArchive = async () => {
    if (isDirtyRef.current) {
      await executeAutosave();
    }
    setActiveView('archive');
    setIsZenMode(false);
  };

  // Action: Explicit Manual Save / Finish
  const handleExplicitSave = async () => {
    if (!content.trim() && !entryTitle.trim()) {
      showToast('Please compose some thoughts or an entry title.', 'warning');
      return;
    }

    await executeAutosave();

    if (wordCount >= 20) {
      await awardXp({
        source: 'journal_entry',
        sourceId: activeEntryId || generateId(),
        amount: 15,
        stat: 'creativity',
      });
      showToast('Journal entry inscribed in local vault! +15 Creativity XP', 'success');
    } else {
      showToast('Journal draft securely preserved.', 'info');
    }

    setActiveView('archive');
    setIsZenMode(false);
  };

  // Action: Apply Prompt into Current Entry
  const handleApplyPrompt = () => {
    setAppliedPromptQuestion(activePrompt.prompt);
    if (!entryTitle.trim()) {
      setEntryTitle(activePrompt.prompt);
    }
    showToast(`Prompt applied: "${activePrompt.categoryLabel}"`, 'info');
  };

  // Action: Apply Structured Reflection
  const handleInsertStructuredReflection = () => {
    const formatted = buildStructuredReflectionContent({
      happened: structHappened,
      mattered: structMattered,
      next: structNext,
    });

    if (formatted) {
      setContent((prev) => (prev ? `${prev}\n\n${formatted}` : formatted));
      showToast('Structured reflection inserted into editor!', 'success');
    }
    setIsStructuredModalOpen(false);
    setStructHappened('');
    setStructMattered('');
    setStructNext('');
  };

  // Action: Format Toolbar syntax insertion
  const handleToolbarFormat = (type: 'bold' | 'italic' | 'h2' | 'h3' | 'quote' | 'bullet' | 'todo') => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd, value } = textareaRef.current;
    const { updatedText, newCursorStart, newCursorEnd } = insertFormattingSyntax(value, selectionStart, selectionEnd, type);

    setContent(updatedText);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorStart, newCursorEnd);
      }
    }, 0);
  };

  // Action: Add Custom Tag
  const handleAddTag = (tagToAdd: string) => {
    const cleaned = tagToAdd.trim().replace(/^#/, '').toLowerCase();
    if (!cleaned) return;
    if (!activeTags.includes(cleaned)) {
      setActiveTags([...activeTags, cleaned]);
    }
    setCustomTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setActiveTags(activeTags.filter((t) => t !== tagToRemove));
  };

  // Action: Soft-Delete (Move to Trash)
  const handleMoveToTrash = async (entry: JournalEntry) => {
    const nowIso = new Date().toISOString();
    await db.journalEntries.update(entry.id, {
      deletedAt: nowIso,
      updatedAt: nowIso,
    });

    // Provide instant undo toast
    showToast(`Entry "${entry.title || entry.date}" moved to trash.`, 'info');

    if (activeView === 'editor' && activeEntryId === entry.id) {
      setActiveView('archive');
    }
    setEntryToDelete(null);
  };

  // Action: Restore from Trash
  const handleRestoreFromTrash = async (entry: JournalEntry) => {
    await db.journalEntries.update(entry.id, {
      deletedAt: undefined,
      updatedAt: new Date().toISOString(),
    });
    showToast(`Entry "${entry.title || entry.date}" restored to chronicle.`, 'success');
  };

  // Action: Permanent Delete
  const handlePermanentDelete = async (entryId: string) => {
    await db.journalEntries.delete(entryId);
    showToast('Entry permanently deleted from storage.', 'info');
    setEntryToDelete(null);
  };

  // Action: Empty Trash
  const handleEmptyTrash = async () => {
    for (const e of trashEntries) {
      await db.journalEntries.delete(e.id);
    }
    showToast(`Permanently cleared ${trashEntries.length} discarded entries.`, 'info');
    setActiveView('archive');
  };

  // Action: Toggle Pin / Favorite directly on card
  const handleTogglePinCard = async (entry: JournalEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !entry.isPinned;
    await db.journalEntries.update(entry.id, {
      isPinned: newVal,
      updatedAt: new Date().toISOString(),
    });
    showToast(newVal ? 'Entry pinned to top of archive' : 'Entry unpinned', 'info');
  };

  const handleToggleFavoriteCard = async (entry: JournalEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !entry.isFavorite;
    await db.journalEntries.update(entry.id, {
      isFavorite: newVal,
      updatedAt: new Date().toISOString(),
    });
    showToast(newVal ? 'Added to starred entries' : 'Removed from starred entries', 'info');
  };

  // Single Entry Export
  const handleExportSingleEntry = (entry: JournalEntry, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const titleLine = entry.title ? `Title: ${entry.title}\n` : '';
    const moodStr = MOOD_EMOJIS[entry.moodScore - 1] || 'Neutral';
    const promptLine = entry.promptQuestion ? `Prompt: “${entry.promptQuestion}”\n` : '';
    const tagsLine = entry.tags?.length ? `Tags: #${entry.tags.join(' #')}\n` : '';

    const text = `======================================================================
COLLEGE LIFE OS — PRIVATE JOURNAL CHRONICLE
======================================================================
Date: ${entry.date} (${formatDisplayDate(entry.date)})
${titleLine}Mood: ${moodStr} (${entry.moodScore}/5)
Energy Level: ${entry.energyScore}/5
Word Count: ${entry.wordCount || 0}
${tagsLine}${promptLine}======================================================================

${entry.content}

----------------------------------------------------------------------
College Life OS — Private Local Archive (No external cloud leakage)
Exported on: ${new Date().toLocaleString()}
`;

    const sanitized = (entry.title || entry.date).replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadTextFile(`journal_${entry.date}_${sanitized}.txt`, text);
    showToast('Entry exported as plain-text file.', 'success');
  };

  // Monthly Export
  const handleExportMonth = () => {
    const monthKey = exportMonthInput.trim();
    if (!monthKey) return;

    const monthEntries = sortedEntries.filter((e) => e.date.startsWith(monthKey));
    if (monthEntries.length === 0) {
      showToast(`No journal entries found for month ${monthKey}.`, 'info');
      setIsExportModalOpen(false);
      return;
    }

    let fileContent = `======================================================================
COLLEGE LIFE OS — JOURNAL COMPENDIUM
Month: ${monthKey}
Total Entries: ${monthEntries.length}
Generated: ${new Date().toLocaleString()}
======================================================================\n\n`;

    monthEntries.forEach((entry, idx) => {
      const titleLine = entry.title ? `Title: ${entry.title}\n` : '';
      const moodStr = MOOD_EMOJIS[entry.moodScore - 1] || 'Neutral';
      const promptLine = entry.promptQuestion ? `Prompt: “${entry.promptQuestion}”\n` : '';

      fileContent += `----------------------------------------------------------------------
[Entry #${idx + 1}] — Date: ${entry.date} (${formatDisplayDate(entry.date)})
${titleLine}Mood: ${moodStr} | Energy: ${entry.energyScore}/5 | Words: ${entry.wordCount || 0}
${promptLine}----------------------------------------------------------------------

${entry.content}

\n\n`;
    });

    fileContent += `======================================================================
End of Archive for ${monthKey}
======================================================================\n`;

    downloadTextFile(`journal_archive_${monthKey}.txt`, fileContent);
    showToast(`Exported ${monthEntries.length} entries for ${monthKey}!`, 'success');
    setIsExportModalOpen(false);
  };

  return (
    <div className={`space-y-5 pb-24 animate-pop ${isZenMode ? 'fixed inset-0 z-50 bg-[rgb(var(--c-bg))] p-4 sm:p-8 overflow-y-auto' : ''}`}>
      {/* 1. TOP HEADER & CONTROLS */}
      {!isZenMode && (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-heading uppercase tracking-wider text-[rgb(var(--c-primary))] font-bold">
                <Feather className="w-4 h-4 text-[rgb(var(--c-primary))]" />
                <span>Personal Writing Space &amp; Chronicle</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))] mt-1">
                The Student Journal
              </h1>
              <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-0.5">
                Private offline ink • Markdown formatting • Continuous autosave • Zero guilt metrics
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {activeView !== 'editor' ? (
                <button
                  onClick={handleStartNewEntry}
                  className="px-4 py-2.5 rounded-2xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                  title="Compose a fresh journal entry"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Entry</span>
                </button>
              ) : (
                <button
                  onClick={handleReturnToArchive}
                  className="px-4 py-2 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:border-[rgb(var(--c-primary))] active:scale-95 transition flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Archive</span>
                </button>
              )}

              {/* View Switches: Archive vs Trash */}
              {activeView !== 'editor' && (
                <div className="flex items-center bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] p-1 rounded-2xl">
                  <button
                    onClick={() => setActiveView('archive')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition ${
                      activeView === 'archive'
                        ? 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-primary))] shadow-2xs'
                        : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                    }`}
                  >
                    Archive ({activeEntries.length})
                  </button>
                  <button
                    onClick={() => setActiveView('trash')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition flex items-center gap-1 ${
                      activeView === 'trash'
                        ? 'bg-[rgb(var(--c-surface))] text-rose-500 shadow-2xs'
                        : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Trash {trashEntries.length > 0 ? `(${trashEntries.length})` : ''}</span>
                  </button>
                </div>
              )}

              {/* Export Modal Launcher */}
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="p-2.5 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] active:scale-95 transition"
                title="Export monthly compilation"
              >
                <Download className="w-4 h-4 text-[rgb(var(--c-primary))]" />
              </button>

              <span className="text-[10px] text-[rgb(var(--c-muted))] font-flourish flex items-center gap-1 px-3 py-1.5 rounded-full bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
                <Lock className="w-3 h-3 text-emerald-600" /> Local &amp; Private
              </span>
            </div>
          </div>

          {/* Honest Period Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t border-[rgb(var(--c-border))]/60">
            <div className="p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center">
              <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold block">
                Penned This Week
              </span>
              <span className="text-base sm:text-lg font-heading font-bold text-[rgb(var(--c-primary))]">
                {journalStats.entriesThisWeekCount} <span className="text-xs font-normal text-[rgb(var(--c-muted))]">entries</span>
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center">
              <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold block">
                Active Days (30d)
              </span>
              <span className="text-base sm:text-lg font-heading font-bold text-emerald-600 dark:text-emerald-400">
                {journalStats.activeDaysLast30} <span className="text-xs font-normal text-[rgb(var(--c-muted))]">days</span>
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center">
              <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold block">
                Total Words Written
              </span>
              <span className="text-base sm:text-lg font-heading font-bold text-[rgb(var(--c-text))]">
                {journalStats.totalWordsWritten.toLocaleString()}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center">
              <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold block">
                Starred Gems
              </span>
              <span className="text-base sm:text-lg font-heading font-bold text-amber-500">
                {journalStats.favoriteEntriesCount} <span className="text-xs font-normal text-[rgb(var(--c-muted))]">favorites</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. WRITING EXPERIENCE (DISTRACTION-FREE & AUTOSAVING EDITOR) */}
      {activeView === 'editor' && (
        <div className={`space-y-4 animate-in fade-in duration-150 ${isZenMode ? 'max-w-3xl mx-auto' : ''}`}>
          {/* Zen & Autosave Header Strip */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] shadow-2xs gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={handleReturnToArchive}
                className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition"
                title="Return to archive"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 text-xs">
                {autosaveStatus === 'saving' && (
                  <span className="text-amber-500 font-heading font-bold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
                  </span>
                )}
                {autosaveStatus === 'saved' && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-heading font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved {lastSavedTimestamp ? `at ${lastSavedTimestamp}` : ''}</span>
                  </span>
                )}
                {autosaveStatus === 'unsaved' && (
                  <span className="text-[rgb(var(--c-muted))] font-heading text-[11px]">
                    Unsaved changes...
                  </span>
                )}
                {autosaveStatus === 'failed' && (
                  <span className="text-rose-500 font-heading font-bold text-[11px]">
                    Autosave failed
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Write vs Preview Toggle */}
              <div className="flex items-center bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPreviewMode('write')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-heading font-bold transition ${
                    previewMode === 'write' ? 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-primary))] shadow-2xs' : 'text-[rgb(var(--c-muted))]'
                  }`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('preview')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-heading font-bold transition ${
                    previewMode === 'preview' ? 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-primary))] shadow-2xs' : 'text-[rgb(var(--c-muted))]'
                  }`}
                >
                  Preview
                </button>
              </div>

              {/* Pin & Star Toggles */}
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={`p-1.5 rounded-xl border transition ${
                  isPinned ? 'border-amber-400 bg-amber-400/15 text-amber-500' : 'border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
                title={isPinned ? 'Pinned to top' : 'Pin to top of archive'}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsFavorite(!isFavorite)}
                className={`p-1.5 rounded-xl border transition ${
                  isFavorite ? 'border-amber-400 bg-amber-400/15 text-amber-500 fill-amber-400' : 'border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
                title={isFavorite ? 'Starred entry' : 'Add star to entry'}
              >
                <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400' : ''}`} />
              </button>

              {/* Zen / Distraction-free toggle */}
              <button
                type="button"
                onClick={() => setIsZenMode(!isZenMode)}
                className="p-1.5 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition"
                title={isZenMode ? 'Exit Zen Mode' : 'Distraction-Free Zen Mode'}
              >
                {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Done / Finish Button */}
              <button
                type="button"
                onClick={handleExplicitSave}
                className="px-3.5 py-1.5 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>

          {/* Optional Prompt Carousel Header */}
          {showPromptsPanel && (
            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {(
                    [
                      'reflection',
                      'gratitude',
                      'university',
                      'creativity',
                      'relationships',
                      'ambitions',
                      'difficult_days',
                    ] as PromptCategory[]
                  ).map((cat) => {
                    const isSel = selectedPromptCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedPromptCategory(cat);
                          setPromptIndex(0);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-heading font-bold whitespace-nowrap transition ${
                          isSel
                            ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]'
                            : 'bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                        }`}
                      >
                        {cat.replace('_', ' ').toUpperCase()}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setPromptIndex((i) => i + 1)}
                    className="text-[11px] font-heading font-bold text-[rgb(var(--c-primary))] hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Shuffle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPromptsPanel(false)}
                    className="text-[11px] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] ml-1"
                  >
                    Hide
                  </button>
                </div>
              </div>

              {/* Prompt Text & Action */}
              <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))] block">
                      {activePrompt.categoryLabel} Prompt
                    </span>
                    <p className="font-flourish italic text-[rgb(var(--c-text))] text-sm">
                      “{activePrompt.prompt}”
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyPrompt}
                  className="px-3 py-1.5 rounded-xl border border-[rgb(var(--c-primary))] text-[rgb(var(--c-primary))] hover:bg-[rgb(var(--c-primary))] hover:text-white font-heading text-xs font-bold transition shrink-0 self-start sm:self-auto"
                >
                  Use as Topic
                </button>
              </div>
            </div>
          )}

          {!showPromptsPanel && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowPromptsPanel(true)}
                className="text-xs text-[rgb(var(--c-primary))] font-heading font-semibold hover:underline inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Show Writing Prompts
              </button>
            </div>
          )}

          {/* Main Writing Canvas */}
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-8 shadow-xs space-y-4">
            {/* Title & Date Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={entryTitle}
                  onChange={(e) => setEntryTitle(e.target.value)}
                  placeholder="Title of this entry (or leave quiet)..."
                  className="w-full px-2 py-1.5 text-base sm:text-lg font-heading font-bold bg-transparent text-[rgb(var(--c-text))] placeholder:text-[rgb(var(--c-muted))]/60 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Calendar className="w-4 h-4 text-[rgb(var(--c-muted))]" />
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="px-3 py-1 text-xs font-heading font-semibold rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>
            </div>

            {/* Markdown Formatting & Typography Toolbar */}
            {previewMode === 'write' && (
              <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex-wrap">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => handleToolbarFormat('bold')}
                    className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                    title="Bold (**text**)"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarFormat('italic')}
                    className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                    title="Italic (*text*)"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarFormat('h2')}
                    className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                    title="Heading (## text)"
                  >
                    <Heading2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarFormat('h3')}
                    className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                    title="Subheading (### text)"
                  >
                    <Heading3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarFormat('bullet')}
                    className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                    title="Bullet List (- item)"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarFormat('quote')}
                    className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                    title="Blockquote (> quote)"
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToolbarFormat('todo')}
                    className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                    title="Checklist Item (- [ ] item)"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4 w-px bg-[rgb(var(--c-border))] mx-1" />

                  {/* 3-Part Reflection Template Insert */}
                  <button
                    type="button"
                    onClick={() => setIsStructuredModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg hover:bg-[rgb(var(--c-surface))] text-[11px] font-heading font-bold text-[rgb(var(--c-primary))] flex items-center gap-1 shrink-0"
                    title="Insert 3-question reflection (What happened, what mattered, what next)"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>3-Part Reflection</span>
                  </button>
                </div>

                {/* Typography & Readability Controls (Scale, Serif/Sans, Paper Texture) */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto pt-1 sm:pt-0">
                  <div className="flex items-center bg-[rgb(var(--c-surface))] rounded-lg border border-[rgb(var(--c-border))] p-0.5 text-[10px] font-heading font-bold">
                    <button
                      type="button"
                      onClick={() => handleSetScale('compact')}
                      className={`px-1.5 py-0.5 rounded ${textScale === 'compact' ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]' : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'}`}
                      title="Compact font size"
                    >
                      A⁻
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetScale('comfortable')}
                      className={`px-1.5 py-0.5 rounded ${textScale === 'comfortable' ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]' : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'}`}
                      title="Comfortable font size"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetScale('large')}
                      className={`px-1.5 py-0.5 rounded ${textScale === 'large' ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]' : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'}`}
                      title="Large comfortable font size"
                    >
                      A⁺
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleFont}
                    className="px-2 py-1 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] flex items-center gap-1"
                    title={`Switch to ${fontFamilyChoice === 'serif' ? 'Clean Sans' : 'Literary Serif'}`}
                  >
                    <Type className="w-3 h-3" />
                    <span>{fontFamilyChoice === 'serif' ? 'Serif' : 'Sans'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTogglePaper}
                    className={`px-2 py-1 rounded-lg border text-[10px] font-heading font-bold flex items-center gap-1 transition ${
                      paperTexture
                        ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))]'
                        : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                    }`}
                    title="Toggle subtle stationery paper texture"
                  >
                    <span>Paper</span>
                  </button>
                </div>
              </div>
            )}

            {/* Subtle Theme Ambiance Header Strip */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]/60 text-xs">
              <span className="text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] flex items-center gap-1.5">
                <span className="text-[rgb(var(--c-primary))]">{activeThemeAmbiance.motif}</span>
                <span>{activeThemeAmbiance.label}</span>
              </span>
              <span className="text-[10px] font-heading text-[rgb(var(--c-muted))] font-semibold">
                Private &amp; Offline
              </span>
            </div>

            {/* Editor Canvas or Formatted Live Preview */}
            {previewMode === 'write' ? (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Let your thoughts unfold freely here... (Markdown supported: **bold**, *italics*, ## headers, - lists, > quotes)"
                rows={12}
                inputMode="text"
                autoCapitalize="sentences"
                autoCorrect="on"
                spellCheck={true}
                className={`w-full p-3 sm:p-5 bg-transparent text-[rgb(var(--c-text))] leading-relaxed focus:outline-none resize-y min-h-[300px] journal-canvas ${
                  textScale === 'compact'
                    ? 'journal-scale-compact'
                    : textScale === 'large'
                    ? 'journal-scale-large'
                    : 'journal-scale-comfortable'
                } ${fontFamilyChoice === 'serif' ? 'journal-serif-mode' : 'journal-sans-mode'} ${
                  paperTexture ? 'journal-paper-texture rounded-2xl border border-[rgb(var(--c-border))]/60 shadow-inner' : ''
                }`}
                autoFocus
              />
            ) : (
              <div
                className={`w-full p-4 sm:p-6 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] min-h-[300px] text-[rgb(var(--c-text))] overflow-y-auto leading-relaxed ${
                  textScale === 'compact'
                    ? 'journal-scale-compact'
                    : textScale === 'large'
                    ? 'journal-scale-large'
                    : 'journal-scale-comfortable'
                } ${fontFamilyChoice === 'serif' ? 'journal-serif-mode' : 'journal-sans-mode'} ${
                  paperTexture ? 'journal-paper-texture' : ''
                }`}
                dangerouslySetInnerHTML={{
                  __html:
                    formatLightweightMarkdown(content) ||
                    '<p class="text-[rgb(var(--c-muted))] italic">Nothing to preview yet. Switch to Edit to write...</p>',
                }}
              />
            )}

            {/* Bottom Meta Bar: Mood, Energy, Tags, Word Count */}
            <div className="pt-4 border-t border-[rgb(var(--c-border))] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                {/* Mood & Energy */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold">
                      Mood:
                    </span>
                    <span className="text-sm">{MOOD_ICONS[mood - 1]}</span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={isNaN(mood) ? 3 : mood}
                      onChange={(e) => setMood(parseInt(e.target.value, 10) || 3)}
                      className="w-20 ml-1.5 accent-[rgb(var(--c-primary))]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold">
                      Energy:
                    </span>
                    <span className="text-xs font-bold text-[rgb(var(--c-primary))] font-mono">{energy}/5</span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={isNaN(energy) ? 3 : energy}
                      onChange={(e) => setEnergy(parseInt(e.target.value, 10) || 3)}
                      className="w-20 ml-1.5 accent-[rgb(var(--c-primary))]"
                    />
                  </div>
                </div>

                {/* Word Count & XP Milestone */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                    {wordCount} words {wordCount >= 20 ? '• 🎯 15 Creativity XP' : '• (20 words for XP)'}
                  </span>
                </div>
              </div>

              {/* Tags Editor */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <Tag className="w-3.5 h-3.5 text-[rgb(var(--c-muted))] shrink-0" />
                {activeTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))] font-heading text-[10px] font-bold"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-rose-500"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}

                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(customTagInput);
                      }
                    }}
                    placeholder="+ Add tag..."
                    className="px-2 py-0.5 text-[11px] rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none w-24"
                  />
                  {customTagInput && (
                    <button
                      type="button"
                      onClick={() => handleAddTag(customTagInput)}
                      className="px-2 py-0.5 rounded-lg bg-[rgb(var(--c-primary))] text-white text-[10px] font-heading font-bold"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ARCHIVE VIEW & SEARCH */}
      {activeView === 'archive' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Calendar Activity Strip (14-Day Presence) */}
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2 text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                <CalendarDays className="w-4 h-4 text-[rgb(var(--c-primary))]" />
                <span>Writing Consistency Strip</span>
              </div>
              {calendarFilterDate && (
                <button
                  onClick={() => setCalendarFilterDate(null)}
                  className="text-[11px] font-heading font-bold text-rose-500 hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear Day Filter ({calendarFilterDate})
                </button>
              )}
            </div>

            <div className="grid grid-cols-14 gap-1 sm:gap-2">
              {activityStripDays.map((d) => {
                const isSelected = calendarFilterDate === d.dateKey;
                const hasEntries = d.count > 0;

                return (
                  <button
                    key={d.dateKey}
                    onClick={() => setCalendarFilterDate(isSelected ? null : d.dateKey)}
                    className={`py-2 px-0.5 rounded-xl text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] shadow-xs font-bold scale-105'
                        : hasEntries
                        ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                        : 'bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:border-[rgb(var(--c-primary))]'
                    } ${d.isToday && !isSelected ? 'ring-2 ring-[rgb(var(--c-primary))]' : ''}`}
                    title={`${d.dateKey}: ${d.count} entries`}
                  >
                    <span className="text-[9px] uppercase font-heading font-semibold">{d.label}</span>
                    <span className={`w-2 h-2 rounded-full ${hasEntries ? 'bg-emerald-500' : 'bg-transparent'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Filters Chamber */}
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[rgb(var(--c-muted))] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search entries, keywords, thoughts, tags, or prompts..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary))]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Toggles: Starred & Pinned */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setOnlyFavorites(!onlyFavorites)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold border transition flex items-center gap-1.5 ${
                    onlyFavorites
                      ? 'border-amber-400 bg-amber-400/20 text-amber-500'
                      : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-400' : ''}`} />
                  <span>Starred</span>
                </button>

                <button
                  onClick={() => setOnlyPinned(!onlyPinned)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold border transition flex items-center gap-1.5 ${
                    onlyPinned
                      ? 'border-indigo-400 bg-indigo-400/20 text-indigo-400'
                      : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                  }`}
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>Pinned</span>
                </button>

                {/* Month Filter Dropdown */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs font-heading font-semibold"
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
                  onChange={(e) => setSelectedMoodFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
                  className="px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] text-xs font-heading font-semibold"
                >
                  <option value="all">All Moods</option>
                  <option value={5}>🔥 High Vitality</option>
                  <option value={4}>😊 Serene</option>
                  <option value={3}>🙂 Pleasant</option>
                  <option value={2}>😐 Neutral</option>
                  <option value={1}>😞 Melancholy</option>
                </select>
              </div>
            </div>

            {/* Tag Filter Pills */}
            {journalStats.allTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-[rgb(var(--c-border))]/50">
                <span className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))] mr-1">
                  Tags:
                </span>
                <button
                  onClick={() => setSelectedTagFilter('all')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-heading font-bold transition ${
                    selectedTagFilter === 'all' ? 'bg-[rgb(var(--c-primary))] text-white' : 'bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))]'
                  }`}
                >
                  All
                </button>
                {journalStats.allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTagFilter(selectedTagFilter === tag ? 'all' : tag)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-heading font-bold transition ${
                      selectedTagFilter === tag
                        ? 'bg-[rgb(var(--c-primary))] text-white'
                        : 'bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Archive Entry Cards */}
          {filteredEntries.length === 0 ? (
            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-10 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))] flex items-center justify-center mx-auto">
                <Feather className="w-6 h-6" />
              </div>
              <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                No Journal Entries Match
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))] font-flourish max-w-sm mx-auto">
                {searchQuery || selectedMonth !== 'all' || selectedMoodFilter !== 'all'
                  ? 'Try clearing your search query or adjusting your filters.'
                  : 'Your journal chronicle is awaiting its first inscription. Tap New Entry to begin.'}
              </p>
              <button
                onClick={handleStartNewEntry}
                className="mt-2 px-5 py-2.5 rounded-2xl bg-[rgb(var(--c-primary))] text-white font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Start Today's Entry</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEntries.map((entry) => {
                const words = entry.wordCount || (entry.content ? entry.content.trim().split(/\s+/).length : 0);
                const moodIdx = entry.moodScore - 1;

                return (
                  <div
                    key={entry.id}
                    onClick={() => setEntryToView(entry)}
                    className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 shadow-xs hover:border-[rgb(var(--c-primary))] transition cursor-pointer flex flex-col justify-between gap-3 group relative overflow-hidden"
                  >
                    {/* Top entry meta */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-mono font-bold text-[rgb(var(--c-primary))]">
                            {formatDisplayDate(entry.date)}
                          </span>
                          <span className="text-xs">{MOOD_ICONS[moodIdx] || '🙂'}</span>
                          {entry.isPinned && (
                            <span className="px-2 py-0.2 rounded-md bg-indigo-500/15 text-indigo-500 font-heading text-[9px] font-bold uppercase flex items-center gap-1">
                              <Pin className="w-2.5 h-2.5" /> Pinned
                            </span>
                          )}
                          {entry.isFavorite && (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          )}
                        </div>

                        {/* Quick card actions */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavoriteCard(entry, e)}
                            className="p-1 rounded-md hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))]"
                            title={entry.isFavorite ? 'Unstar' : 'Star'}
                          >
                            <Star className={`w-3.5 h-3.5 ${entry.isFavorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleTogglePinCard(entry, e)}
                            className="p-1 rounded-md hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))]"
                            title={entry.isPinned ? 'Unpin' : 'Pin to top'}
                          >
                            <Pin className={`w-3.5 h-3.5 ${entry.isPinned ? 'text-indigo-400' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleExportSingleEntry(entry, e)}
                            className="p-1 rounded-md hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))]"
                            title="Export entry to .txt"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm sm:text-base font-heading font-bold text-[rgb(var(--c-text))] group-hover:text-[rgb(var(--c-primary))] transition line-clamp-1">
                        {entry.title || 'Untitled Reflection'}
                      </h3>

                      {/* Prompt badge if applied */}
                      {entry.promptQuestion && (
                        <div className="text-[11px] font-flourish italic text-[rgb(var(--c-muted))] mt-1 line-clamp-1">
                          “{entry.promptQuestion}”
                        </div>
                      )}

                      {/* Content Preview Snippet */}
                      <p className="text-xs text-[rgb(var(--c-text))]/80 font-flourish line-clamp-3 mt-2 leading-relaxed">
                        {entry.content}
                      </p>
                    </div>

                    {/* Bottom tag & word telemetry */}
                    <div className="flex items-center justify-between text-[11px] text-[rgb(var(--c-muted))] pt-3 border-t border-[rgb(var(--c-border))]/60">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {entry.tags?.slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))]">
                            #{t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <span>{words} words</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-[rgb(var(--c-primary))]" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. TRASH VIEW (SAFE RECOVERY FROM ACCIDENTAL DELETION) */}
      {activeView === 'trash' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2 font-heading text-sm font-bold text-rose-500">
                <Trash2 className="w-4 h-4" />
                <span>Discarded Journal Entries ({trashEntries.length})</span>
              </div>

              {trashEntries.length > 0 && (
                <button
                  onClick={handleEmptyTrash}
                  className="px-3.5 py-1.5 rounded-xl border border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white font-heading text-xs font-bold transition"
                >
                  Empty Trash
                </button>
              )}
            </div>

            {trashEntries.length === 0 ? (
              <div className="text-center py-12 text-xs text-[rgb(var(--c-muted))] font-flourish">
                Trash is currently empty. No discarded journal entries found.
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {trashEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                        {entry.title || 'Untitled Entry'}
                      </div>
                      <div className="text-[11px] text-[rgb(var(--c-muted))] mt-0.5">
                        Date: {entry.date} • Discarded on {entry.deletedAt ? new Date(entry.deletedAt).toLocaleDateString() : 'recently'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleRestoreFromTrash(entry)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-heading text-xs font-bold hover:bg-emerald-700 transition"
                      >
                        Restore Entry
                      </button>
                      <button
                        onClick={() => {
                          setEntryToDelete(entry);
                          setIsPermanentDelete(true);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-rose-500/50 text-rose-500 hover:bg-rose-500 hover:text-white font-heading text-xs font-bold transition"
                      >
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. VIEW ENTRY DETAIL MODAL */}
      {entryToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-primary))] rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] shrink-0">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-xs font-mono font-bold text-[rgb(var(--c-primary))]">
                  {formatDisplayDate(entryToView.date)}
                </span>
                <span className="text-sm">{MOOD_ICONS[entryToView.moodScore - 1] || '🙂'}</span>
                <span className="text-[11px] text-[rgb(var(--c-muted))] font-heading">
                  Energy: {entryToView.energyScore}/5
                </span>
                {entryToView.isPinned && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-500 text-[10px] font-bold">
                    Pinned
                  </span>
                )}
                {entryToView.isFavorite && (
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleExportSingleEntry(entryToView)}
                  className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))]"
                  title="Export to .txt"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const e = entryToView;
                    setEntryToView(null);
                    handleEditEntry(e);
                  }}
                  className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))]"
                  title="Edit entry"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const e = entryToView;
                    setEntryToView(null);
                    setEntryToDelete(e);
                    setIsPermanentDelete(false);
                  }}
                  className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-rose-500"
                  title="Move to trash"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEntryToView(null)}
                  className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Body with Markdown Rendering */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <h2 className="text-lg sm:text-xl font-heading font-bold text-[rgb(var(--c-text))]">
                {entryToView.title || 'Untitled Reflection'}
              </h2>

              {entryToView.promptQuestion && (
                <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs font-flourish italic text-[rgb(var(--c-muted))]">
                  Prompt: “{entryToView.promptQuestion}”
                </div>
              )}

              <div
                className="text-sm font-flourish leading-relaxed space-y-2 pt-2 text-[rgb(var(--c-text))]"
                dangerouslySetInnerHTML={{
                  __html: formatLightweightMarkdown(entryToView.content),
                }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-[rgb(var(--c-muted))] pt-3 border-t border-[rgb(var(--c-border))] shrink-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {entryToView.tags?.map((t) => (
                  <span key={t} className="text-[10px] font-heading font-bold text-[rgb(var(--c-primary))]">
                    #{t}
                  </span>
                ))}
              </div>
              <span className="font-flourish">
                {entryToView.wordCount || 0} words • Inscribed {new Date(entryToView.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 6. STRUCTURED REFLECTION MODAL */}
      {isStructuredModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-primary))] rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2 font-heading font-bold text-sm text-[rgb(var(--c-primary))]">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>3-Part Daily Reflection</span>
              </div>
              <button onClick={() => setIsStructuredModalOpen(false)}>
                <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-heading font-bold mb-1 text-[rgb(var(--c-text))]">
                  1. What Happened?
                </label>
                <textarea
                  value={structHappened}
                  onChange={(e) => setStructHappened(e.target.value)}
                  placeholder="Key events, lectures, meetings, problem sets..."
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-heading font-bold mb-1 text-[rgb(var(--c-text))]">
                  2. What Mattered Most?
                </label>
                <textarea
                  value={structMattered}
                  onChange={(e) => setStructMattered(e.target.value)}
                  placeholder="Insights, emotional pivots, lessons, realizations..."
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-heading font-bold mb-1 text-[rgb(var(--c-text))]">
                  3. What Do I Want To Do Next?
                </label>
                <textarea
                  value={structNext}
                  onChange={(e) => setStructNext(e.target.value)}
                  placeholder="Tomorrow's focus, adjustments, immediate next action..."
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
              <button
                type="button"
                onClick={() => setIsStructuredModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] text-xs font-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertStructuredReflection}
                className="px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition"
              >
                Insert into Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. DELETE / TRASH CONFIRMATION MODAL */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-rose-500 rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                  {isPermanentDelete ? 'Delete Entry Permanently?' : 'Move Entry to Trash?'}
                </h3>
                <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
                  {isPermanentDelete
                    ? 'This cannot be undone. The entry will be purged from IndexedDB.'
                    : 'You can restore this entry anytime from the Trash tab.'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs font-heading font-semibold text-[rgb(var(--c-text))]">
              {entryToDelete.title || 'Untitled Entry'} ({entryToDelete.date})
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] text-xs font-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isPermanentDelete) {
                    handlePermanentDelete(entryToDelete.id);
                  } else {
                    handleMoveToTrash(entryToDelete);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-heading text-xs font-bold hover:bg-rose-700 active:scale-95 transition"
              >
                {isPermanentDelete ? 'Delete Forever' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. EXPORT MONTH MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-primary))] rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2 font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                <Download className="w-4 h-4 text-[rgb(var(--c-primary))]" />
                <span>Export Monthly Compendium</span>
              </div>
              <button onClick={() => setIsExportModalOpen(false)}>
                <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
              </button>
            </div>

            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Generates a single, clean plain-text archive containing all journal entries for the chosen month.
            </p>

            <div>
              <label className="block text-[11px] font-heading font-bold uppercase text-[rgb(var(--c-muted))] mb-1.5">
                Target Month (YYYY-MM)
              </label>
              <input
                type="month"
                value={exportMonthInput}
                onChange={(e) => setExportMonthInput(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-heading font-semibold rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] text-xs font-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportMonth}
                className="px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .txt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
