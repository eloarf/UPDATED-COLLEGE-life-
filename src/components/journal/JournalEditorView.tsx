import React from 'react';
import {
  ChevronLeft,
  RefreshCw,
  Check,
  Pin,
  Star,
  Maximize2,
  Minimize2,
  Sparkles,
  RotateCcw,
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
} from 'lucide-react';
import {
  PromptCategory,
  PromptItem,
  formatLightweightMarkdown,
  ReflectionTemplate,
} from '../../utils/journalEngine';
import { JournalPromptsTemplates } from './JournalPromptsTemplates';

const MOOD_ICONS = ['😞', '😐', '🙂', '😊', '🔥'];

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
  onReturnToArchive: () => void;
  onExplicitSave: () => void;
  showPromptsPanel: boolean;
  onToggleShowPromptsPanel: (show: boolean) => void;
  selectedPromptCategory: PromptCategory;
  onSelectPromptCategory: (cat: PromptCategory) => void;
  onShufflePrompt: () => void;
  activePrompt: PromptItem;
  onApplyPrompt: () => void;
  onApplyQuickTemplate: (tpl: ReflectionTemplate) => void;
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
  activeThemeAmbiance: { label: string; motif: string };
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
  onReturnToArchive,
  onExplicitSave,
  showPromptsPanel,
  onToggleShowPromptsPanel,
  selectedPromptCategory,
  onSelectPromptCategory,
  onShufflePrompt,
  activePrompt,
  onApplyPrompt,
  onApplyQuickTemplate,
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
  activeThemeAmbiance,
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
}) => {
  return (
    <div className={`space-y-4 animate-in fade-in duration-150 ${isZenMode ? 'max-w-3xl mx-auto' : ''}`}>
      {/* Zen & Autosave Header Strip */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] shadow-2xs gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onReturnToArchive}
            className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition cursor-pointer"
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
              onClick={() => onSetPreviewMode('write')}
              className={`px-2.5 py-1 rounded-lg text-xs font-heading font-bold transition cursor-pointer ${
                previewMode === 'write' ? 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-primary))] shadow-2xs' : 'text-[rgb(var(--c-muted))]'
              }`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onSetPreviewMode('preview')}
              className={`px-2.5 py-1 rounded-lg text-xs font-heading font-bold transition cursor-pointer ${
                previewMode === 'preview' ? 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-primary))] shadow-2xs' : 'text-[rgb(var(--c-muted))]'
              }`}
            >
              Preview
            </button>
          </div>

          {/* Pin & Star Toggles */}
          <button
            type="button"
            onClick={onTogglePinned}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              isPinned ? 'border-amber-400 bg-amber-400/15 text-amber-500' : 'border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
            }`}
            title={isPinned ? 'Pinned to top' : 'Pin to top of archive'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              isFavorite ? 'border-amber-400 bg-amber-400/15 text-amber-500 fill-amber-400' : 'border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
            }`}
            title={isFavorite ? 'Starred entry' : 'Add star to entry'}
          >
            <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400' : ''}`} />
          </button>

          {/* Zen / Distraction-free toggle */}
          <button
            type="button"
            onClick={onToggleZenMode}
            className="p-1.5 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition cursor-pointer"
            title={isZenMode ? 'Exit Zen Mode' : 'Distraction-Free Zen Mode'}
          >
            {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Done / Finish Button */}
          <button
            type="button"
            onClick={onExplicitSave}
            className="px-3.5 py-1.5 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-2xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Prompts & Templates Carousel */}
      <JournalPromptsTemplates
        showPromptsPanel={showPromptsPanel}
        onToggleShowPromptsPanel={onToggleShowPromptsPanel}
        selectedPromptCategory={selectedPromptCategory}
        onSelectPromptCategory={onSelectPromptCategory}
        onShufflePrompt={onShufflePrompt}
        activePrompt={activePrompt}
        onApplyPrompt={onApplyPrompt}
        onApplyQuickTemplate={onApplyQuickTemplate}
      />

      {/* Main Writing Canvas */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-8 shadow-xs space-y-4">
        {/* Title & Date Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-[rgb(var(--c-border))]">
          <div className="sm:col-span-2">
            <input
              type="text"
              value={entryTitle}
              onChange={(e) => onEntryTitleChange(e.target.value)}
              placeholder="Title of this entry (or leave quiet)..."
              className="w-full px-2 py-1.5 text-base sm:text-lg font-heading font-bold bg-transparent text-[rgb(var(--c-text))] placeholder:text-[rgb(var(--c-muted))]/60 focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Calendar className="w-4 h-4 text-[rgb(var(--c-muted))]" />
            <input
              type="date"
              value={entryDate}
              onChange={(e) => onEntryDateChange(e.target.value)}
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
                onClick={() => onToolbarFormat('bold')}
                className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                title="Bold (**text**)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToolbarFormat('italic')}
                className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                title="Italic (*text*)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToolbarFormat('h2')}
                className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                title="Heading (## text)"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToolbarFormat('h3')}
                className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                title="Subheading (### text)"
              >
                <Heading3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToolbarFormat('bullet')}
                className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                title="Bullet List (- item)"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToolbarFormat('quote')}
                className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                title="Blockquote (> quote)"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToolbarFormat('todo')}
                className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
                title="Checklist Item (- [ ] item)"
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-[rgb(var(--c-border))] mx-1" />

              {/* 3-Part Reflection Template Insert */}
              <button
                type="button"
                onClick={onOpenStructuredModal}
                className="px-2.5 py-1 rounded-lg hover:bg-[rgb(var(--c-surface))] text-[11px] font-heading font-bold text-[rgb(var(--c-primary))] flex items-center gap-1 shrink-0 cursor-pointer"
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
                  onClick={() => onSetScale('compact')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${textScale === 'compact' ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]' : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'}`}
                  title="Compact font size"
                >
                  A⁻
                </button>
                <button
                  type="button"
                  onClick={() => onSetScale('comfortable')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${textScale === 'comfortable' ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]' : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'}`}
                  title="Comfortable font size"
                >
                  A
                </button>
                <button
                  type="button"
                  onClick={() => onSetScale('large')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${textScale === 'large' ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))]' : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'}`}
                  title="Large comfortable font size"
                >
                  A⁺
                </button>
              </div>

              <button
                type="button"
                onClick={onToggleFont}
                className="px-2 py-1 rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] flex items-center gap-1 cursor-pointer"
                title={`Switch to ${fontFamilyChoice === 'serif' ? 'Clean Sans' : 'Literary Serif'}`}
              >
                <Type className="w-3 h-3" />
                <span>{fontFamilyChoice === 'serif' ? 'Serif' : 'Sans'}</span>
              </button>

              <button
                type="button"
                onClick={onTogglePaper}
                className={`px-2 py-1 rounded-lg border text-[10px] font-heading font-bold flex items-center gap-1 transition cursor-pointer ${
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
            onChange={(e) => onContentChange(e.target.value)}
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
                <span className="text-sm">{MOOD_ICONS[mood - 1] || '🙂'}</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={isNaN(mood) ? 3 : mood}
                  onChange={(e) => onMoodChange(parseInt(e.target.value, 10) || 3)}
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
                  onChange={(e) => onEnergyChange(parseInt(e.target.value, 10) || 3)}
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
                  onClick={() => onRemoveTag(tag)}
                  className="hover:text-rose-500 cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}

            <div className="flex items-center gap-1">
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
                className="px-2 py-0.5 text-[11px] rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none w-24"
              />
              {customTagInput && (
                <button
                  type="button"
                  onClick={() => onAddTag(customTagInput)}
                  className="px-2 py-0.5 rounded-lg bg-[rgb(var(--c-primary))] text-white text-[10px] font-heading font-bold cursor-pointer"
                >
                  Add
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
