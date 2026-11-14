import React, { useState } from 'react';
import {
  RefreshCw,
  Check,
  Pin,
  Star,
  Maximize2,
  Minimize2,
  Sparkles,
  Calendar,
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  Quote,
  CheckSquare,
  Type,
  Tag,
  X,
  SlidersHorizontal,
  HeartHandshake,
  Lightbulb,
  Plus,
} from 'lucide-react';
import {
  PromptCategory,
  PromptItem,
  formatLightweightMarkdown,
  ReflectionTemplate,
} from '../../utils/journalEngine';
import { JournalPromptsTemplates } from './JournalPromptsTemplates';
import { DailyCheckInPanel } from './DailyCheckInPanel';
import { DailyCheckIn } from '../../types';
import { DailyHabitsSummary } from '../../utils/streakEngine';
import { formatDisplayDate } from '../../utils/dateUtils';
import { getScaleLabel } from '../../utils/wellbeingEngine';

interface JournalEditorViewProps {
  isZenMode: boolean;
  onToggleZenMode: () => void;
  autosaveStatus: 'saved' | 'saving' | 'unsaved' | 'failed';
  lastSavedTimestamp: string | null;
  previewMode: 'write' | 'preview';
  onSetPreviewMode: (m: 'write' | 'preview') => void;
  isPinned: boolean;
  onTogglePinned: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onStartNewSeparateNote: () => void;
  onSaveNow: () => void;
  isEditingHistorical: boolean;
  onReturnToToday: () => void;
  selectedPromptCategory: PromptCategory;
  onSelectPromptCategory: (cat: PromptCategory) => void;
  onShufflePrompt: () => void;
  activePrompt: PromptItem;
  onApplyPrompt: () => void;
  onApplyQuickTemplate: (tpl: ReflectionTemplate) => void;
  appliedPromptQuestion?: string;
  onClearAppliedPrompt: () => void;
  entryTitle: string;
  onEntryTitleChange: (title: string) => void;
  entryDate: string;
  onEntryDateChange: (date: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  content: string;
  onContentChange: (content: string) => void;
  onToolbarFormat: (type: 'bold' | 'italic' | 'h2' | 'h3' | 'quote' | 'bullet' | 'todo') => void;
  onOpenStructuredModal: () => void;
  textScale: 'compact' | 'comfortable' | 'large';
  onSetScale: (scale: 'compact' | 'comfortable' | 'large') => void;
  fontFamilyChoice: 'serif' | 'sans';
  onToggleFont: () => void;
  paperTexture: boolean;
  onTogglePaper: () => void;
  mood: number;
  onMoodChange: (m: number) => void;
  energy: number;
  onEnergyChange: (e: number) => void;
  wordCount: number;
  activeTags: string[];
  onRemoveTag: (tag: string) => void;
  customTagInput: string;
  onCustomTagInputChange: (v: string) => void;
  onAddTag: (tag: string) => void;
  // Part 2 Check-in integration props
  activeEntryId: string | null;
  todayCheckIn?: DailyCheckIn;
  customEmotions: string[];
  onUpdateCustomEmotions: (nextList: string[]) => Promise<void>;
  dailyHabitsSummary: DailyHabitsSummary;
}

export const JournalEditorView: React.FC<JournalEditorViewProps> = ({
  isZenMode,
  onToggleZenMode,
  autosaveStatus,
  lastSavedTimestamp,
  previewMode,
  onSetPreviewMode,
  isPinned,
  onTogglePinned,
  isFavorite,
  onToggleFavorite,
  onStartNewSeparateNote,
  onSaveNow,
  isEditingHistorical,
  onReturnToToday,
  selectedPromptCategory,
  onSelectPromptCategory,
  onShufflePrompt,
  activePrompt,
  onApplyPrompt,
  onApplyQuickTemplate,
  appliedPromptQuestion,
  onClearAppliedPrompt,
  entryTitle,
  onEntryTitleChange,
  entryDate,
  onEntryDateChange,
  textareaRef,
  content,
  onContentChange,
  onToolbarFormat,
  onOpenStructuredModal,
  textScale,
  onSetScale,
  fontFamilyChoice,
  onToggleFont,
  paperTexture,
  onTogglePaper,
  mood,
  onMoodChange,
  energy,
  onEnergyChange,
  wordCount,
  activeTags,
  onRemoveTag,
  customTagInput,
  onCustomTagInputChange,
  onAddTag,
  activeEntryId,
  todayCheckIn,
  customEmotions,
  onUpdateCustomEmotions,
  dailyHabitsSummary,
}) => {
  // Progressive disclosure drawers — collapsed by default so writing canvas is visual focus
  const [openDrawer, setOpenDrawer] = useState<'none' | 'checkin' | 'prompts' | 'tools'>('none');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const toggleDrawer = (drawer: 'checkin' | 'prompts' | 'tools') => {
    setOpenDrawer((prev) => (prev === drawer ? 'none' : drawer));
  };

  const formattedDateHeading = formatDisplayDate(entryDate);

  return (
    <div className={`space-y-4 animate-in fade-in duration-150 ${isZenMode ? 'max-w-3xl mx-auto' : ''}`}>
      {/* Primary Spacious Writing Surface */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xs space-y-3">
        {/* Clean Date + Minimal Autosave Status */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg sm:text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              {formattedDateHeading}
            </h2>
            {isEditingHistorical && (
              <button
                type="button"
                onClick={onReturnToToday}
                className="text-xs font-heading font-semibold text-[rgb(var(--c-primary))] hover:underline cursor-pointer"
              >
                Return to today
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            {autosaveStatus === 'saving' && (
              <span className="text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
            {autosaveStatus === 'saved' && (
              <span className="text-[rgb(var(--c-muted))] inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{lastSavedTimestamp ? `Saved ${lastSavedTimestamp}` : 'Saved'}</span>
              </span>
            )}
            {autosaveStatus === 'unsaved' && (
              <span className="text-[rgb(var(--c-muted))]">Saving soon...</span>
            )}
            {autosaveStatus === 'failed' && (
              <button
                type="button"
                onClick={onSaveNow}
                className="text-rose-500 font-semibold underline cursor-pointer"
              >
                Save failed · Retry
              </button>
            )}

            {isZenMode && (
              <button
                type="button"
                onClick={onToggleZenMode}
                className="px-2.5 py-1 rounded-lg border border-[rgb(var(--c-border))] text-xs font-heading font-semibold text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] inline-flex items-center gap-1 cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Zen</span>
              </button>
            )}
          </div>
        </div>

        {/* Optional Prompt Banner (only shown if user deliberately chose a prompt) */}
        {appliedPromptQuestion && (
          <div className="flex items-start justify-between gap-2 px-3 py-2 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]/70 text-xs font-flourish text-[rgb(var(--c-muted))]">
            <span>Prompt: “{appliedPromptQuestion}”</span>
            <button
              type="button"
              onClick={onClearAppliedPrompt}
              className="text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer shrink-0"
              aria-label="Clear prompt"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Optional Title Input */}
        <input
          type="text"
          value={entryTitle}
          onChange={(e) => onEntryTitleChange(e.target.value)}
          placeholder="Optional title..."
          aria-label="Optional journal entry title"
          className="w-full px-1 py-1 text-base sm:text-lg font-heading font-semibold bg-transparent text-[rgb(var(--c-text))] placeholder:text-[rgb(var(--c-muted))]/55 border-b border-[rgb(var(--c-border))]/50 focus:border-[rgb(var(--c-primary))] focus:outline-none transition-colors"
        />

        {/* Immediate Distraction-Free Writing Area */}
        {previewMode === 'write' ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Write whatever is on your mind..."
            aria-label="Journal entry content"
            rows={12}
            inputMode="text"
            autoCapitalize="sentences"
            autoCorrect="on"
            spellCheck={true}
            className={`w-full px-1 py-2 sm:p-3 bg-transparent text-[rgb(var(--c-text))] leading-relaxed focus:outline-none resize-y min-h-[42vh] sm:min-h-[360px] scroll-mb-24 journal-canvas ${
              textScale === 'compact'
                ? 'journal-scale-compact'
                : textScale === 'large'
                ? 'journal-scale-large'
                : 'journal-scale-comfortable'
            } ${fontFamilyChoice === 'serif' ? 'journal-serif-mode' : 'journal-sans-mode'} ${
              paperTexture
                ? 'journal-paper-texture rounded-2xl p-3 sm:p-5 border border-[rgb(var(--c-border))]/50'
                : ''
            }`}
          />
        ) : (
          <div
            className={`w-full p-3 sm:p-5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] min-h-[42vh] sm:min-h-[360px] text-[rgb(var(--c-text))] overflow-y-auto leading-relaxed ${
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
                '<p class="text-[rgb(var(--c-muted))] italic">Nothing written yet.</p>',
            }}
          />
        )}

        {/* Progressive Disclosure Bar (compact, clearly named controls) */}
        <div className="pt-3 border-t border-[rgb(var(--c-border))]/60 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => toggleDrawer('checkin')}
              aria-expanded={openDrawer === 'checkin'}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-heading font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                openDrawer === 'checkin'
                  ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))]'
                  : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))]'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Check-in</span>
              {todayCheckIn && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-label="Check-in recorded" />
              )}
            </button>

            <button
              type="button"
              onClick={() => toggleDrawer('prompts')}
              aria-expanded={openDrawer === 'prompts'}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-heading font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                openDrawer === 'prompts'
                  ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))]'
                  : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))]'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Prompts</span>
            </button>

            <button
              type="button"
              onClick={() => toggleDrawer('tools')}
              aria-expanded={openDrawer === 'tools'}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-heading font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                openDrawer === 'tools'
                  ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))]'
                  : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Writing tools</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-[rgb(var(--c-muted))]">
            <span>{wordCount} words</span>
            {(content.trim() || entryTitle.trim()) && (
              <button
                type="button"
                onClick={onStartNewSeparateNote}
                className="px-2.5 py-1 rounded-lg border border-[rgb(var(--c-border))] hover:border-[rgb(var(--c-primary))] text-[11px] font-heading font-semibold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] inline-flex items-center gap-1 cursor-pointer"
                title="Start another separate note"
              >
                <Plus className="w-3 h-3" />
                <span>New note</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progressive Drawer 1: Daily Check-in (Part 2) */}
      {openDrawer === 'checkin' && (
        <DailyCheckInPanel
          dateKey={entryDate}
          existingCheckIn={todayCheckIn}
          linkedJournalEntryId={activeEntryId || undefined}
          customEmotions={customEmotions}
          onUpdateCustomEmotions={onUpdateCustomEmotions}
          dailyHabitsSummary={dailyHabitsSummary}
          onClose={() => setOpenDrawer('none')}
        />
      )}

      {/* Progressive Drawer 2: Prompts & Templates */}
      {openDrawer === 'prompts' && (
        <div className="space-y-3">
          <JournalPromptsTemplates
            showPromptsPanel={true}
            onToggleShowPromptsPanel={() => setOpenDrawer('none')}
            selectedPromptCategory={selectedPromptCategory}
            onSelectPromptCategory={onSelectPromptCategory}
            onShufflePrompt={onShufflePrompt}
            activePrompt={activePrompt}
            onApplyPrompt={onApplyPrompt}
            onApplyQuickTemplate={onApplyQuickTemplate}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onOpenStructuredModal}
              className="px-3.5 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-xs font-heading font-bold text-[rgb(var(--c-primary))] inline-flex items-center gap-1.5 hover:border-[rgb(var(--c-primary))] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Insert 3-Part Reflection</span>
            </button>
          </div>
        </div>
      )}

      {/* Progressive Drawer 3: Writing Tools (Formatting, Typography, Tags, Quick Mood/Energy, Date, Pin/Star, Zen) */}
      {openDrawer === 'tools' && (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
          {/* Row 1: Formatting & Mode */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => onToolbarFormat('bold')}
                className="p-2 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onToolbarFormat('italic')}
                className="p-2 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onToolbarFormat('h2')}
                className="p-2 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                title="Heading"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onToolbarFormat('h3')}
                className="p-2 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                title="Subheading"
              >
                <Heading3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onToolbarFormat('bullet')}
                className="p-2 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                title="Bullet list"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onToolbarFormat('quote')}
                className="p-2 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                title="Quote"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onToolbarFormat('todo')}
                className="p-2 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                title="Checklist item"
              >
                <CheckSquare className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => onSetPreviewMode('write')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-heading font-bold cursor-pointer ${
                    previewMode === 'write'
                      ? 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-primary))]'
                      : 'text-[rgb(var(--c-muted))]'
                  }`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onSetPreviewMode('preview')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-heading font-bold cursor-pointer ${
                    previewMode === 'preview'
                      ? 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-primary))]'
                      : 'text-[rgb(var(--c-muted))]'
                  }`}
                >
                  Preview
                </button>
              </div>

              <button
                type="button"
                onClick={onTogglePinned}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isPinned
                    ? 'border-amber-400 bg-amber-400/15 text-amber-500'
                    : 'border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
                title={isPinned ? 'Unpin entry' : 'Pin entry'}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onToggleFavorite}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  isFavorite
                    ? 'border-amber-400 bg-amber-400/15 text-amber-500'
                    : 'border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
                title={isFavorite ? 'Remove star' : 'Star entry'}
              >
                <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onToggleZenMode}
                className="p-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                title={isZenMode ? 'Exit Zen Mode' : 'Zen Mode'}
              >
                {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Row 2: Typography Preferences & Entry Date */}
          <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-[rgb(var(--c-border))]/50">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-[rgb(var(--c-bg))] rounded-xl border border-[rgb(var(--c-border))] p-0.5 text-xs font-heading font-bold">
                <button
                  type="button"
                  onClick={() => onSetScale('compact')}
                  className={`px-2 py-1 rounded-lg cursor-pointer ${
                    textScale === 'compact'
                      ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]'
                      : 'text-[rgb(var(--c-muted))]'
                  }`}
                >
                  A⁻
                </button>
                <button
                  type="button"
                  onClick={() => onSetScale('comfortable')}
                  className={`px-2 py-1 rounded-lg cursor-pointer ${
                    textScale === 'comfortable'
                      ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]'
                      : 'text-[rgb(var(--c-muted))]'
                  }`}
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => onSetScale('large')}
                  className={`px-2 py-1 rounded-lg cursor-pointer ${
                    textScale === 'large'
                      ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]'
                      : 'text-[rgb(var(--c-muted))]'
                  }`}
                >
                  A⁺
                </button>
              </div>

              <button
                type="button"
                onClick={onToggleFont}
                className="px-2.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-heading font-semibold text-[rgb(var(--c-text))] inline-flex items-center gap-1 cursor-pointer"
              >
                <Type className="w-3.5 h-3.5" />
                <span>{fontFamilyChoice === 'serif' ? 'Serif' : 'Sans'}</span>
              </button>

              <button
                type="button"
                onClick={onTogglePaper}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-heading font-semibold cursor-pointer ${
                  paperTexture
                    ? 'border-[rgb(var(--c-primary))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))]'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))]'
                }`}
              >
                Paper texture
              </button>
            </div>

            <div className="flex items-center gap-2">
              {showDatePicker ? (
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => onEntryDateChange(e.target.value)}
                  className="px-3 py-1.5 text-xs font-heading rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="px-2.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Change date ({entryDate})</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 3: Legacy Mood/Energy sliders (preserved cleanly) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[rgb(var(--c-border))]/50 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-heading font-bold text-[rgb(var(--c-muted))]">
                Entry Mood: <strong className="text-[rgb(var(--c-text))]">{getScaleLabel('mood', mood)}</strong>
              </span>
              <input
                type="range"
                min={1}
                max={5}
                value={isNaN(mood) ? 3 : mood}
                onChange={(e) => onMoodChange(parseInt(e.target.value, 10) || 3)}
                className="w-28 accent-[rgb(var(--c-primary))]"
                aria-label="Entry mood"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="font-heading font-bold text-[rgb(var(--c-muted))]">
                Entry Energy: <strong className="text-[rgb(var(--c-text))]">{getScaleLabel('energy', energy)}</strong>
              </span>
              <input
                type="range"
                min={1}
                max={5}
                value={isNaN(energy) ? 3 : energy}
                onChange={(e) => onEnergyChange(parseInt(e.target.value, 10) || 3)}
                className="w-28 accent-[rgb(var(--c-primary))]"
                aria-label="Entry energy"
              />
            </div>
          </div>

          {/* Row 4: Tags Editor */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[rgb(var(--c-border))]/50">
            <Tag className="w-3.5 h-3.5 text-[rgb(var(--c-muted))] shrink-0" />
            {activeTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-semibold"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => onRemoveTag(tag)}
                  className="text-[rgb(var(--c-muted))] hover:text-rose-500 cursor-pointer"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => onCustomTagInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddTag(customTagInput);
                  }
                }}
                placeholder="+ Add tag..."
                className="px-2.5 py-1 text-xs rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none w-28"
              />
              {customTagInput.trim() && (
                <button
                  type="button"
                  onClick={() => onAddTag(customTagInput)}
                  className="px-2.5 py-1 rounded-lg bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] text-xs font-heading font-bold cursor-pointer"
                >
                  Add
                </button>
              )}
            </div>
          </div>

          {/* Explicit Save Button */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onSaveNow}
              className="px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 cursor-pointer"
            >
              Save entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
