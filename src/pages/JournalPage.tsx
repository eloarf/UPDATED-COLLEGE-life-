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
  selectTodayJournalEntry,
} from '../utils/journalEngine';
import { getDailyHabitsSummary } from '../utils/streakEngine';
import {
  getJournalSummaries,
  getJournalEntriesForDate,
  getJournalEntryById,
  JournalEntrySummary,
} from '../db/queries';

import { JournalHeaderStats, JournalTabView } from '../components/journal/JournalHeaderStats';
import { JournalArchiveView } from '../components/journal/JournalArchiveView';
import { JournalEditorView } from '../components/journal/JournalEditorView';
import { JournalTrashView } from '../components/journal/JournalTrashView';
import { CheckInHistoryView } from '../components/journal/CheckInHistoryView';
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

const MOOD_EMOJIS = ['😞 Very low', '😐 Low', '🙂 Okay', '😊 Good', '✨ Very good'];

export const JournalPage: React.FC = () => {
  const { showToast, setCurrentRoute, currentRoute } = useUiStore();
  const todayKey = getTodayKey();
  const currentMonthKey = todayKey.slice(0, 7);

  // Active user settings (for custom emotions)
  const userSettings = useLiveQuery(() => db.settings.get('current_user'));
  const customEmotions = userSettings?.customEmotions || [];

  const handleUpdateCustomEmotions = async (nextList: string[]) => {
    const clean = Array.from(new Set(nextList.map((e) => e.trim()).filter(Boolean)));
    await db.settings.update('current_user', { customEmotions: clean });
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

  // Default landing view opens immediately into Today's writing canvas
  const [activeView, setActiveView] = useState<JournalTabView>('editor');
  const [isZenMode, setIsZenMode] = useState(false);
  const [previewMode, setPreviewMode] = useState<'write' | 'preview'>('write');

  // Currently editing entry ID (null means fresh draft for entryDate)
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
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [selectedPromptCategory, setSelectedPromptCategory] = useState<PromptCategory>('reflection');
  const [promptIndex, setPromptIndex] = useState(0);
  const [appliedPromptQuestion, setAppliedPromptQuestion] = useState<string | undefined>(undefined);

  // Structured Reflection Modal
  const [isStructuredModalOpen, setIsStructuredModalOpen] = useState(false);
  const [structHappened, setStructHappened] = useState('');
  const [structMattered, setStructMattered] = useState('');
  const [structNext, setStructNext] = useState('');

  // Autosave State
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'failed'>('saved');
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  const suppressDirtyOnceRef = useRef(false);
  const hasHydratedTodayRef = useRef(false);

  // Textarea Ref
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Archive Search & Filter State (250ms debounced query)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<number | 'all'>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [calendarFilterDate, setCalendarFilterDate] = useState<string | null>(null);
  const [selectedDayEntries, setSelectedDayEntries] = useState<JournalEntry[] | null>(null);

  // Live Queries
  const summariesRaw = useLiveQuery(() => getJournalSummaries()) || [];
  const allCheckIns = useLiveQuery(() => db.dailyCheckIns.toArray()) || [];
  const allJournalEntriesForHistory = useLiveQuery(() => db.journalEntries.toArray()) || [];
  const habits = useLiveQuery(() => db.habits.toArray()) || [];
  const habitLogs = useLiveQuery(() => db.habitLogs.toArray()) || [];
  const restDays = useLiveQuery(() => db.restDays.toArray()) || [];

  const dailyHabitsSummary = useMemo(
    () => getDailyHabitsSummary(habits, habitLogs, restDays, todayKey),
    [habits, habitLogs, restDays, todayKey]
  );

  // Hydrate Today's existing entry once on mount so reopening Journal restores today's draft cleanly without duplicates
  const hydrateTodayEntry = useCallback(async () => {
    const todayRows = await getJournalEntriesForDate(todayKey);
    const existingToday = selectTodayJournalEntry(todayRows, todayKey);
    suppressDirtyOnceRef.current = true;
    isDirtyRef.current = false;

    if (existingToday) {
      activeEntryIdRef.current = existingToday.id;
      setActiveEntryId(existingToday.id);
      setEntryTitle(existingToday.title || '');
      setContent(existingToday.content || '');
      setEntryDate(existingToday.date || todayKey);
      setMood(isNaN(existingToday.moodScore) ? 4 : existingToday.moodScore);
      setEnergy(isNaN(existingToday.energyScore) ? 3 : existingToday.energyScore);
      setIsPinned(!!existingToday.isPinned);
      setIsFavorite(!!existingToday.isFavorite);
      setActiveTags(Array.isArray(existingToday.tags) ? existingToday.tags : []);
      setAppliedPromptQuestion(existingToday.promptQuestion);
      setAutosaveStatus('saved');
      const stamp = existingToday.updatedAt || existingToday.createdAt;
      if (stamp) {
        setLastSavedTimestamp(new Date(stamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    } else {
      activeEntryIdRef.current = null;
      setActiveEntryId(null);
      setEntryTitle('');
      setContent('');
      setEntryDate(todayKey);
      setMood(4);
      setEnergy(3);
      setIsPinned(false);
      setIsFavorite(false);
      setActiveTags([]);
      setAppliedPromptQuestion(undefined);
      setAutosaveStatus('saved');
      setLastSavedTimestamp(null);
    }
  }, [todayKey]);

  useEffect(() => {
    if (hasHydratedTodayRef.current) return;
    hasHydratedTodayRef.current = true;
    hydrateTodayEntry();
  }, [hydrateTodayEntry]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load full entry text only when a specific day is selected in the archive strip
  useEffect(() => {
    let active = true;
    if (!calendarFilterDate) {
      setSelectedDayEntries(null);
      return;
    }
    getJournalEntriesForDate(calendarFilterDate).then((rows) => {
      if (active) setSelectedDayEntries(rows.filter((e) => !e.deletedAt));
    });
    return () => {
      active = false;
    };
  }, [calendarFilterDate, summariesRaw.length]);

  // Modals & Confirmation States
  const [entryToView, setEntryToView] = useState<JournalEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | JournalEntrySummary | null>(null);
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportMonthInput, setExportMonthInput] = useState(currentMonthKey);

  // Support deep link #/journal?entry=<id> from Wellbeing Insights Day Inspection
  useEffect(() => {
    const queryIdx = currentRoute.indexOf('?');
    if (queryIdx === -1) return;
    const params = new URLSearchParams(currentRoute.slice(queryIdx + 1));
    const requestedEntryId = params.get('entry');
    if (!requestedEntryId) return;
    getJournalEntryById(requestedEntryId).then((full) => {
      if (full && !full.deletedAt) {
        setEntryToView(full);
      }
    });
  }, [currentRoute]);

  // Separate active entries from trash
  const activeEntries = useMemo(() => summariesRaw.filter((e) => !e.deletedAt), [summariesRaw]);
  const trashEntries = useMemo(
    () =>
      summariesRaw
        .filter((e) => !!e.deletedAt)
        .sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || '')),
    [summariesRaw]
  );

  // Sorted active entries: Pinned first, then newest date first
  const sortedEntries = useMemo(() => {
    return [...activeEntries].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const dDiff = b.date.localeCompare(a.date);
      if (dDiff !== 0) return dDiff;
      return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
    });
  }, [activeEntries]);

  const journalStats = useMemo(
    () => calculateJournalStats(summariesRaw as any, todayKey),
    [summariesRaw, todayKey]
  );

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

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    activeEntries.forEach((e) => {
      if (e.date && e.date.length >= 7) {
        months.add(e.date.slice(0, 7));
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [activeEntries]);

  const filteredEntries = useMemo(() => {
    return sortedEntries.filter((entry) => {
      if (onlyFavorites && !entry.isFavorite) return false;
      if (onlyPinned && !entry.isPinned) return false;
      if (calendarFilterDate && entry.date !== calendarFilterDate) return false;
      if (selectedMonth !== 'all' && !entry.date.startsWith(selectedMonth)) return false;
      if (selectedMoodFilter !== 'all' && entry.moodScore !== selectedMoodFilter) return false;
      if (selectedTagFilter !== 'all' && (!entry.tags || !entry.tags.includes(selectedTagFilter)))
        return false;

      if (debouncedSearchQuery.trim()) {
        const q = debouncedSearchQuery.toLowerCase();
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
    debouncedSearchQuery,
  ]);

  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  const activePrompt = useMemo(
    () => getPromptForCategory(selectedPromptCategory, promptIndex),
    [selectedPromptCategory, promptIndex]
  );

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

  // Associated Check-in for the active editor date and the viewed entry modal
  const editorDateCheckIn = useMemo(
    () => allCheckIns.find((c) => c.dateKey === entryDate),
    [allCheckIns, entryDate]
  );

  const viewModalCheckIn = useMemo(() => {
    if (!entryToView) return null;
    if (entryToView.checkInId) {
      const byId = allCheckIns.find((c) => c.id === entryToView.checkInId);
      if (byId) return byId;
    }
    return allCheckIns.find((c) => c.dateKey === entryToView.date) || null;
  }, [entryToView, allCheckIns]);

  // Autosave Function
  const executeAutosave = useCallback(async () => {
    if (!content.trim() && !entryTitle.trim()) {
      setAutosaveStatus('saved');
      isDirtyRef.current = false;
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
          content,
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
            content,
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
          content,
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

      if (currentWords >= 20 && activeEntryIdRef.current) {
        awardXp({
          source: 'journal_entry',
          sourceId: activeEntryIdRef.current,
          amount: 15,
          stat: 'creativity',
          dayKey: entryDate,
        }).catch(() => {});
      }

      setAutosaveStatus('saved');
      setLastSavedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
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

    if (suppressDirtyOnceRef.current) {
      suppressDirtyOnceRef.current = false;
      return;
    }

    if (!content.trim() && !entryTitle.trim()) return;

    isDirtyRef.current = true;
    setAutosaveStatus('unsaved');
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);

    autosaveTimeoutRef.current = setTimeout(() => {
      executeAutosave();
    }, 800);

    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [
    content,
    entryTitle,
    entryDate,
    mood,
    energy,
    activeTags,
    appliedPromptQuestion,
    isPinned,
    isFavorite,
    activeView,
    executeAutosave,
  ]);

  // Lifecycle flush (ensures drafts aren't lost on background/tab close on Android & Web)
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

  // Navigation / Switching Actions
  const handleSelectView = async (nextView: JournalTabView) => {
    if (activeView === 'editor' && isDirtyRef.current) {
      await executeAutosave();
    }
    setActiveView(nextView);
    setIsZenMode(false);
  };

  const handleStartNewSeparateNote = async () => {
    if (isDirtyRef.current) {
      await executeAutosave();
    }
    suppressDirtyOnceRef.current = true;
    isDirtyRef.current = false;
    activeEntryIdRef.current = null;
    setActiveEntryId(null);
    setEntryTitle('');
    setContent('');
    setEntryDate(todayKey);
    setMood(4);
    setEnergy(3);
    setIsPinned(false);
    setIsFavorite(false);
    setActiveTags([]);
    setAppliedPromptQuestion(undefined);
    setAutosaveStatus('saved');
    setLastSavedTimestamp(null);
    setPreviewMode('write');
    setActiveView('editor');
  };

  const handleEditEntry = async (entryOrSummary: { id: string }) => {
    if (isDirtyRef.current) {
      await executeAutosave();
    }
    const full = await getJournalEntryById(entryOrSummary.id);
    if (!full) return;

    suppressDirtyOnceRef.current = true;
    isDirtyRef.current = false;
    activeEntryIdRef.current = full.id;
    setActiveEntryId(full.id);
    setEntryTitle(full.title || '');
    setContent(full.content || '');
    setEntryDate(full.date || todayKey);
    setMood(isNaN(full.moodScore) ? 4 : full.moodScore);
    setEnergy(isNaN(full.energyScore) ? 3 : full.energyScore);
    setIsPinned(!!full.isPinned);
    setIsFavorite(!!full.isFavorite);
    setActiveTags(Array.isArray(full.tags) ? full.tags : []);
    setAppliedPromptQuestion(full.promptQuestion);
    setAutosaveStatus('saved');
    const stamp = full.updatedAt || full.createdAt;
    setLastSavedTimestamp(
      stamp ? new Date(stamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
    );
    setPreviewMode('write');
    setActiveView('editor');
  };

  const handleSelectEntryToView = async (summary: JournalEntrySummary) => {
    const full = await getJournalEntryById(summary.id);
    if (full) {
      setEntryToView(full);
    }
  };

  const handleOpenJournalById = async (entryId: string) => {
    const full = await getJournalEntryById(entryId);
    if (full && !full.deletedAt) {
      setEntryToView(full);
    } else {
      showToast('Linked journal entry is no longer available.', 'info');
    }
  };

  const handleSaveNow = async () => {
    if (!content.trim() && !entryTitle.trim()) {
      showToast('Write a line before saving.', 'info');
      return;
    }
    await executeAutosave();
    showToast('Entry saved.', 'success');
  };

  const handleApplyPrompt = () => {
    setAppliedPromptQuestion(activePrompt.prompt);
    showToast(`Prompt added: ${activePrompt.categoryLabel}`, 'info');
  };

  const handleApplyQuickTemplate = (tpl: ReflectionTemplate) => {
    setContent((prev) => (prev ? `${prev}\n\n${tpl.content}` : tpl.content));
    showToast(`Template "${tpl.name}" inserted`, 'success');
  };

  const handleInsertStructuredReflection = () => {
    const formatted = buildStructuredReflectionContent({
      happened: structHappened,
      mattered: structMattered,
      next: structNext,
    });

    if (formatted) {
      setContent((prev) => (prev ? `${prev}\n\n${formatted}` : formatted));
      showToast('3-part reflection inserted', 'success');
    }
    setIsStructuredModalOpen(false);
    setStructHappened('');
    setStructMattered('');
    setStructNext('');
  };

  const handleToolbarFormat = (type: 'bold' | 'italic' | 'h2' | 'h3' | 'quote' | 'bullet' | 'todo') => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd, value } = textareaRef.current;
    const { updatedText, newCursorStart, newCursorEnd } = insertFormattingSyntax(
      value,
      selectionStart,
      selectionEnd,
      type
    );

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
      await hydrateTodayEntry();
      setActiveView('archive');
    }
    setEntryToDelete(null);
  };

  const handleRestoreFromTrash = async (entry: JournalEntry | JournalEntrySummary) => {
    const full = await db.journalEntries.get(entry.id);
    if (!full) return;
    const copy = { ...full };
    delete copy.deletedAt;
    copy.updatedAt = new Date().toISOString();
    await db.journalEntries.put(copy);
    showToast(`Entry "${entry.title || entry.date}" restored.`, 'success');
  };

  const handlePermanentDelete = async (entryId: string) => {
    await db.journalEntries.delete(entryId);
    showToast('Entry permanently deleted.', 'info');
    setEntryToDelete(null);
  };

  const handleEmptyTrash = async () => {
    for (const e of trashEntries) {
      await db.journalEntries.delete(e.id);
    }
    showToast(`Removed ${trashEntries.length} discarded entries.`, 'info');
    setActiveView('archive');
  };

  const handleTogglePinCard = async (entry: JournalEntrySummary, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !entry.isPinned;
    await db.journalEntries.update(entry.id, {
      isPinned: newVal,
      updatedAt: new Date().toISOString(),
    });
    showToast(newVal ? 'Entry pinned to top' : 'Entry unpinned', 'info');
  };

  const handleToggleFavoriteCard = async (entry: JournalEntrySummary, e: React.MouseEvent) => {
    e.stopPropagation();
    const newVal = !entry.isFavorite;
    await db.journalEntries.update(entry.id, {
      isFavorite: newVal,
      updatedAt: new Date().toISOString(),
    });
    showToast(newVal ? 'Starred entry' : 'Removed star', 'info');
  };

  const handleExportSingleEntry = async (
    entryOrSummary: { id: string; date: string; title?: string },
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();
    const full = await db.journalEntries.get(entryOrSummary.id);
    if (!full) return;

    const titleLine = full.title ? `Title: ${full.title}\n` : '';
    const moodStr = MOOD_EMOJIS[full.moodScore - 1] || 'Okay';
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
College Life OS — Private Local Archive (Offline)
Exported on: ${new Date().toLocaleString()}
`;

    const sanitized = (full.title || full.date).replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadTextFile(`journal_${full.date}_${sanitized}.txt`, text);
    showToast('Entry exported as .txt file.', 'success');
  };

  const handleExportMonth = async () => {
    const monthKey = exportMonthInput.trim();
    if (!monthKey) return;

    const all = await db.journalEntries.toArray();
    const monthEntries = all
      .filter((e) => !e.deletedAt && e.date.startsWith(monthKey))
      .sort((a, b) => b.date.localeCompare(a.date));

    if (monthEntries.length === 0) {
      showToast(`No journal entries found for ${monthKey}.`, 'info');
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
      const moodStr = MOOD_EMOJIS[entry.moodScore - 1] || 'Okay';
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
    <div
      className={`space-y-4 pb-28 sm:pb-24 animate-pop ${
        isZenMode ? 'fixed inset-0 z-50 bg-[rgb(var(--c-bg))] p-4 sm:p-8 overflow-y-auto' : ''
      }`}
    >
      {/* 1. Calm Top Navigation */}
      <JournalHeaderStats
        isZenMode={isZenMode}
        activeView={activeView}
        activeEntriesCount={activeEntries.length}
        trashEntriesCount={trashEntries.length}
        checkInsCount={allCheckIns.length}
        onStartNewSeparateNote={handleStartNewSeparateNote}
        onSelectView={handleSelectView}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenInsights={() => setCurrentRoute('#/wellbeing')}
      />

      {/* 2. Default Today Writing View */}
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
          onStartNewSeparateNote={handleStartNewSeparateNote}
          onSaveNow={handleSaveNow}
          isEditingHistorical={entryDate !== todayKey}
          onReturnToToday={hydrateTodayEntry}
          selectedPromptCategory={selectedPromptCategory}
          onSelectPromptCategory={(cat) => {
            setSelectedPromptCategory(cat);
            setPromptIndex(0);
          }}
          onShufflePrompt={() => setPromptIndex((i) => i + 1)}
          activePrompt={activePrompt}
          onApplyPrompt={handleApplyPrompt}
          onApplyQuickTemplate={handleApplyQuickTemplate}
          appliedPromptQuestion={appliedPromptQuestion}
          onClearAppliedPrompt={() => setAppliedPromptQuestion(undefined)}
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
          activeEntryId={activeEntryId}
          todayCheckIn={editorDateCheckIn}
          customEmotions={customEmotions}
          onUpdateCustomEmotions={handleUpdateCustomEmotions}
          dailyHabitsSummary={dailyHabitsSummary}
        />
      )}

      {/* 3. Entries (History) View */}
      {activeView === 'archive' && (
        <div className="space-y-4">
          {calendarFilterDate && selectedDayEntries && selectedDayEntries.length > 0 && (
            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-heading font-bold text-[rgb(var(--c-primary))]">
                <span>
                  Entries for {formatDisplayDate(calendarFilterDate)} ({selectedDayEntries.length})
                </span>
                <button
                  type="button"
                  onClick={() => setCalendarFilterDate(null)}
                  className="text-xs text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                >
                  Show All Days
                </button>
              </div>
              {selectedDayEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setEntryToView(entry)}
                  className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] cursor-pointer hover:border-[rgb(var(--c-primary))] space-y-1"
                >
                  <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                    {entry.title || 'Untitled entry'}
                  </div>
                  <p className="text-xs text-[rgb(var(--c-muted))] font-flourish whitespace-pre-wrap line-clamp-3">
                    {entry.content}
                  </p>
                </div>
              ))}
            </div>
          )}

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
            onStartNewEntry={handleStartNewSeparateNote}
          />
        </div>
      )}

      {/* 4. Check-ins (Mood & Wellbeing History) View */}
      {activeView === 'checkins' && (
        <CheckInHistoryView
          checkIns={allCheckIns}
          journalEntries={allJournalEntriesForHistory}
          customEmotions={customEmotions}
          onUpdateCustomEmotions={handleUpdateCustomEmotions}
          dailyHabitsSummary={dailyHabitsSummary}
          onOpenJournalEntryById={handleOpenJournalById}
          onOpenInsights={() => setCurrentRoute('#/wellbeing')}
        />
      )}

      {/* 5. Trash View */}
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

      {/* 6. View Detail Modal */}
      <JournalViewModal
        entry={entryToView}
        associatedCheckIn={viewModalCheckIn}
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

      {/* 7. Structured Reflection Modal */}
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

      {/* 8. Delete Confirmation Modal */}
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

      {/* 9. Export Month Modal */}
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
