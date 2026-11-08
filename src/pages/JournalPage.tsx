import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { db, saveEmergencyBackup } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { JournalEntry } from '../types';
import { getTodayKey, formatDisplayDate, addDaysToKey, parseDayKey } from '../utils/dateUtils';
import { awardXp } from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import {
  PromptCategory,
  getPromptForCategory,
  insertFormattingSyntax,
  calculateJournalStats,
  buildStructuredReflectionContent,
  ReflectionTemplate,
} from '../utils/journalEngine';
import { THEMES } from '../theme/themeUtils';
import { getJournalSummaries, JournalEntrySummary } from '../db/queries';

import { JournalHeaderStats } from '../components/journal/JournalHeaderStats';
import { JournalArchiveView } from '../components/journal/JournalArchiveView';
import { JournalEditorView } from '../components/journal/JournalEditorView';
import { JournalTrashView } from '../components/journal/JournalTrashView';
import {
  JournalViewModal,
  JournalStructuredModal,
  JournalDeleteModal,
  JournalExportModal,
} from '../components/journal/JournalModals';

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

  // Typography & Canvas Scaling
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

  // Currently editing entry ID (null means brand-new draft)
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const activeEntryIdRef = useRef<string | null>(null);

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

  // Autosave Telemetry
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'failed'>('saved');
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);
  const autosaveTimeoutRef = useRef<any>(null);
  const isDirtyRef = useRef(false);

  // Content Textarea Ref
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
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | JournalEntrySummary | null>(null);
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportMonthInput, setExportMonthInput] = useState(currentMonthKey);

  // Bounded & lightweight queries: Load summaries without full text bodies for archive list
  const summariesRaw = useLiveQuery(() => getJournalSummaries()) || [];

  // Separate active entries from trash
  const activeEntries = useMemo(() => {
    return summariesRaw.filter((e) => !e.deletedAt);
  }, [summariesRaw]);

  const trashEntries = useMemo(() => {
    return summariesRaw
      .filter((e) => !!e.deletedAt)
      .sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
  }, [summariesRaw]);

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
    return calculateJournalStats(summariesRaw as any, todayKey);
  }, [summariesRaw, todayKey]);

  // Tag frequency counts for badge display
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activeEntries.forEach((e) => {
      e.tags?.forEach((t) => {
        const cleaned = t.trim().toLowerCase();
        if (cleaned) counts[cleaned] = (counts[cleaned] || 0) + 1;
      });
    });
    return counts;
  }, [activeEntries]);

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
        const matchesSnippet = entry.previewText?.toLowerCase().includes(q);
        const matchesTitle = entry.title?.toLowerCase().includes(q);
        const matchesPrompt = entry.promptQuestion?.toLowerCase().includes(q);
        const matchesTag = entry.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesSnippet && !matchesTitle && !matchesPrompt && !matchesTag) return false;
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
      const currentTargetId = activeEntryIdRef.current || activeEntryId;

      if (currentTargetId) {
        const updatedCount = await db.journalEntries.update(currentTargetId, {
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

        if (updatedCount === 0) {
          await db.journalEntries.put({
            id: currentTargetId,
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
      } else {
        const newId = generateId();
        activeEntryIdRef.current = newId;
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
      saveEmergencyBackup();
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

  // Debounced autosave
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

  // Lifecycle flush
  useEffect(() => {
    const handleFlush = () => {
      if (isDirtyRef.current) {
        executeAutosave();
      }
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        executeAutosave();
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && isDirtyRef.current) {
        executeAutosave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleFlush);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleFlush);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [executeAutosave]);

  // Actions
  const handleStartNewEntry = () => {
    if (isDirtyRef.current) {
      executeAutosave();
    }
    activeEntryIdRef.current = null;
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

  const handleEditEntry = async (entryOrSummary: { id: string }) => {
    if (isDirtyRef.current) {
      executeAutosave();
    }
    const full = await db.journalEntries.get(entryOrSummary.id);
    if (!full) return;

    activeEntryIdRef.current = full.id;
    setActiveEntryId(full.id);
    setEntryTitle(full.title || '');
    setContent(full.content || '');
    setEntryDate(full.date || todayKey);
    setMood(isNaN(full.moodScore) ? 4 : full.moodScore);
    setEnergy(isNaN(full.energyScore) ? 3 : full.energyScore);
    setIsPinned(!!full.isPinned);
    setIsFavorite(!!full.isFavorite);
    setActiveTags(full.tags && full.tags.length > 0 ? full.tags : ['reflection']);
    setAppliedPromptQuestion(full.promptQuestion);
    setAutosaveStatus('saved');
    setLastSavedTimestamp(null);
    setPreviewMode('write');
    setActiveView('editor');
  };

  const handleSelectEntryToView = async (summary: JournalEntrySummary) => {
    const full = await db.journalEntries.get(summary.id);
    if (full) {
      setEntryToView(full);
    }
  };

  const handleReturnToArchive = async () => {
    if (isDirtyRef.current) {
      await executeAutosave();
    }
    setActiveView('archive');
    setIsZenMode(false);
  };

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

  const handleApplyPrompt = () => {
    setAppliedPromptQuestion(activePrompt.prompt);
    if (!entryTitle.trim()) {
      setEntryTitle(activePrompt.prompt);
    }
    showToast(`Prompt applied: "${activePrompt.categoryLabel}"`, 'info');
  };

  const handleApplyQuickTemplate = (tpl: ReflectionTemplate) => {
    setContent((prev) => (prev ? `${prev}\n\n${tpl.content}` : tpl.content));
    if (!entryTitle.trim()) {
      setEntryTitle(tpl.name);
    }
    showToast(`Template "${tpl.name}" applied!`, 'success');
  };

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

  const handleMoveToTrash = async (entry: { id: string; title?: string; date: string }) => {
    const nowIso = new Date().toISOString();
    await db.journalEntries.update(entry.id, {
      deletedAt: nowIso,
      updatedAt: nowIso,
    });

    showToast(`Entry "${entry.title || entry.date}" moved to trash.`, 'info');
    if (activeView === 'editor' && activeEntryId === entry.id) {
      setActiveView('archive');
    }
    setEntryToDelete(null);
  };

  const handleRestoreFromTrash = async (entry: JournalEntry | JournalEntrySummary) => {
    const copy = { ...entry };
    delete copy.deletedAt;
    copy.updatedAt = new Date().toISOString();
    await db.journalEntries.put(copy as any);
    showToast(`Entry "${entry.title || entry.date}" restored to chronicle.`, 'success');
  };

  const handlePermanentDelete = async (entryId: string) => {
    await db.journalEntries.delete(entryId);
    showToast('Entry permanently deleted from storage.', 'info');
    setEntryToDelete(null);
  };

  const handleEmptyTrash = async () => {
    for (const e of trashEntries) {
      await db.journalEntries.delete(e.id);
    }
    showToast(`Permanently cleared ${trashEntries.length} discarded entries.`, 'info');
    setActiveView('archive');
  };

  const handleTogglePinCard = async (entry: JournalEntrySummary, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !entry.isPinned;
    await db.journalEntries.update(entry.id, {
      isPinned: newVal,
      updatedAt: new Date().toISOString(),
    });
    showToast(newVal ? 'Entry pinned to top of archive' : 'Entry unpinned', 'info');
  };

  const handleToggleFavoriteCard = async (entry: JournalEntrySummary, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !entry.isFavorite;
    await db.journalEntries.update(entry.id, {
      isFavorite: newVal,
      updatedAt: new Date().toISOString(),
    });
    showToast(newVal ? 'Added to starred entries' : 'Removed from starred entries', 'info');
  };

  const handleExportSingleEntry = async (entryOrSummary: { id: string; date: string; title?: string }, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const full = await db.journalEntries.get(entryOrSummary.id);
    if (!full) return;

    const titleLine = full.title ? `Title: ${full.title}\n` : '';
    const moodStr = MOOD_EMOJIS[full.moodScore - 1] || 'Neutral';
    const promptLine = full.promptQuestion ? `Prompt: “${full.promptQuestion}”\n` : '';
    const tagsLine = full.tags?.length ? `Tags: #${full.tags.join(' #')}\n` : '';

    const text = `======================================================================
COLLEGE LIFE OS — PRIVATE JOURNAL CHRONICLE
======================================================================
Date: ${full.date} (${formatDisplayDate(full.date)})
${titleLine}Mood: ${moodStr} (${full.moodScore}/5)
Energy Level: ${full.energyScore}/5
Word Count: ${full.wordCount || 0}
${tagsLine}${promptLine}======================================================================

${full.content}

----------------------------------------------------------------------
College Life OS — Private Local Archive (No external cloud leakage)
Exported on: ${new Date().toLocaleString()}
`;

    const sanitized = (full.title || full.date).replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadTextFile(`journal_${full.date}_${sanitized}.txt`, text);
    showToast('Entry exported as plain-text file.', 'success');
  };

  const handleExportMonth = async () => {
    const monthKey = exportMonthInput.trim();
    if (!monthKey) return;

    const all = await db.journalEntries.toArray();
    const monthEntries = all
      .filter((e) => !e.deletedAt && e.date.startsWith(monthKey))
      .sort((a, b) => b.date.localeCompare(a.date));

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
      {/* 1. Header & Stats */}
      <JournalHeaderStats
        isZenMode={isZenMode}
        activeView={activeView}
        activeEntriesCount={activeEntries.length}
        trashEntriesCount={trashEntries.length}
        journalStats={journalStats}
        onStartNewEntry={handleStartNewEntry}
        onReturnToArchive={handleReturnToArchive}
        onSelectView={setActiveView}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      {/* 2. Editor View */}
      {activeView === 'editor' && (
        <JournalEditorView
          isZenMode={isZenMode}
          onToggleZenMode={() => setIsZenMode(!isZenMode)}
          autosaveStatus={autosaveStatus}
          lastSavedTimestamp={lastSavedTimestamp}
          previewMode={previewMode}
          onSetPreviewMode={setPreviewMode}
          isPinned={isPinned}
          onTogglePinned={() => setIsPinned(!isPinned)}
          isFavorite={isFavorite}
          onToggleFavorite={() => setIsFavorite(!isFavorite)}
          onReturnToArchive={handleReturnToArchive}
          onExplicitSave={handleExplicitSave}
          showPromptsPanel={showPromptsPanel}
          onToggleShowPromptsPanel={setShowPromptsPanel}
          selectedPromptCategory={selectedPromptCategory}
          onSelectPromptCategory={(cat) => {
            setSelectedPromptCategory(cat);
            setPromptIndex(0);
          }}
          onShufflePrompt={() => setPromptIndex((i) => i + 1)}
          activePrompt={activePrompt}
          onApplyPrompt={handleApplyPrompt}
          onApplyQuickTemplate={handleApplyQuickTemplate}
          entryTitle={entryTitle}
          onEntryTitleChange={setEntryTitle}
          entryDate={entryDate}
          onEntryDateChange={setEntryDate}
          textareaRef={textareaRef}
          content={content}
          onContentChange={setContent}
          onToolbarFormat={handleToolbarFormat}
          onOpenStructuredModal={() => setIsStructuredModalOpen(true)}
          textScale={textScale}
          onSetScale={handleSetScale}
          fontFamilyChoice={fontFamilyChoice}
          onToggleFont={handleToggleFont}
          paperTexture={paperTexture}
          onTogglePaper={handleTogglePaper}
          activeThemeAmbiance={activeThemeAmbiance}
          mood={mood}
          onMoodChange={setMood}
          energy={energy}
          onEnergyChange={setEnergy}
          wordCount={wordCount}
          activeTags={activeTags}
          onRemoveTag={handleRemoveTag}
          customTagInput={customTagInput}
          onCustomTagInputChange={setCustomTagInput}
          onAddTag={handleAddTag}
        />
      )}

      {/* 3. Archive View */}
      {activeView === 'archive' && (
        <JournalArchiveView
          entries={filteredEntries}
          activityStripDays={activityStripDays}
          calendarFilterDate={calendarFilterDate}
          onSelectCalendarFilterDate={setCalendarFilterDate}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onlyFavorites={onlyFavorites}
          onToggleOnlyFavorites={() => setOnlyFavorites(!onlyFavorites)}
          onlyPinned={onlyPinned}
          onToggleOnlyPinned={() => setOnlyPinned(!onlyPinned)}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          availableMonths={availableMonths}
          selectedMoodFilter={selectedMoodFilter}
          onSelectMoodFilter={setSelectedMoodFilter}
          allTags={journalStats.allTags}
          tagCounts={tagCounts}
          selectedTagFilter={selectedTagFilter}
          onSelectTagFilter={setSelectedTagFilter}
          onSelectEntry={handleSelectEntryToView}
          onToggleFavorite={handleToggleFavoriteCard}
          onTogglePin={handleTogglePinCard}
          onExportSingleEntry={handleExportSingleEntry}
          onStartNewEntry={handleStartNewEntry}
        />
      )}

      {/* 4. Trash View */}
      {activeView === 'trash' && (
        <JournalTrashView
          trashEntries={trashEntries}
          onEmptyTrash={handleEmptyTrash}
          onRestoreFromTrash={handleRestoreFromTrash}
          onRequestPermanentDelete={(entry) => {
            setEntryToDelete(entry);
            setIsPermanentDelete(true);
          }}
        />
      )}

      {/* 5. View Detail Modal */}
      <JournalViewModal
        entry={entryToView}
        onClose={() => setEntryToView(null)}
        onEdit={(e) => {
          setEntryToView(null);
          handleEditEntry(e);
        }}
        onTrash={(e) => {
          setEntryToView(null);
          setEntryToDelete(e);
          setIsPermanentDelete(false);
        }}
        onExport={(e) => handleExportSingleEntry(e)}
      />

      {/* 6. Structured Reflection Modal */}
      <JournalStructuredModal
        isOpen={isStructuredModalOpen}
        onClose={() => setIsStructuredModalOpen(false)}
        happened={structHappened}
        onHappenedChange={setStructHappened}
        mattered={structMattered}
        onMatteredChange={setStructMattered}
        next={structNext}
        onNextChange={setStructNext}
        onInsert={handleInsertStructuredReflection}
      />

      {/* 7. Delete Modal */}
      <JournalDeleteModal
        entry={entryToDelete}
        isPermanent={isPermanentDelete}
        onCancel={() => setEntryToDelete(null)}
        onConfirm={() => {
          if (!entryToDelete) return;
          if (isPermanentDelete) {
            handlePermanentDelete(entryToDelete.id);
          } else {
            handleMoveToTrash(entryToDelete);
          }
        }}
      />

      {/* 8. Export Month Modal */}
      <JournalExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        monthInput={exportMonthInput}
        onMonthInputChange={setExportMonthInput}
        onExport={handleExportMonth}
      />
    </div>
  );
};
