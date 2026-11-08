import React from 'react';
import {
  Download,
  Edit3,
  Trash2,
  X,
  Star,
  Sparkles,
} from 'lucide-react';
import { formatDisplayDate } from '../../utils/dateUtils';
import { formatLightweightMarkdown } from '../../utils/journalEngine';
import { JournalEntry } from '../../types';
import { JournalEntrySummary } from '../../db/queries';

const MOOD_ICONS = ['😞', '😐', '🙂', '😊', '🔥'];

interface ViewModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
  onEdit: (entry: JournalEntry) => void;
  onTrash: (entry: JournalEntry) => void;
  onExport: (entry: JournalEntry) => void;
}

export const JournalViewModal: React.FC<ViewModalProps> = ({
  entry,
  onClose,
  onEdit,
  onTrash,
  onExport,
}) => {
  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-primary))] rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] shrink-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-mono font-bold text-[rgb(var(--c-primary))]">
              {formatDisplayDate(entry.date)}
            </span>
            <span className="text-sm">{MOOD_ICONS[(entry.moodScore || 3) - 1] || '🙂'}</span>
            <span className="text-[11px] text-[rgb(var(--c-muted))] font-heading">
              Energy: {entry.energyScore}/5
            </span>
            {entry.isPinned && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-500 text-[10px] font-bold">
                Pinned
              </span>
            )}
            {entry.isFavorite && (
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onExport(entry)}
              className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] cursor-pointer"
              title="Export to .txt"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(entry)}
              className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))] cursor-pointer"
              title="Edit entry"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onTrash(entry)}
              className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-rose-500 cursor-pointer"
              title="Move to trash"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body with Markdown Rendering */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <h2 className="text-lg sm:text-xl font-heading font-bold text-[rgb(var(--c-text))]">
            {entry.title || 'Untitled Reflection'}
          </h2>

          {entry.promptQuestion && (
            <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs font-flourish italic text-[rgb(var(--c-muted))]">
              Prompt: “{entry.promptQuestion}”
            </div>
          )}

          <div
            className="text-sm font-flourish leading-relaxed space-y-2 pt-2 text-[rgb(var(--c-text))]"
            dangerouslySetInnerHTML={{
              __html: formatLightweightMarkdown(entry.content),
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-[rgb(var(--c-muted))] pt-3 border-t border-[rgb(var(--c-border))] shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {entry.tags?.map((t) => (
              <span key={t} className="text-[10px] font-heading font-bold text-[rgb(var(--c-primary))]">
                #{t}
              </span>
            ))}
          </div>
          <span className="font-flourish">
            {entry.wordCount || 0} words • Inscribed {new Date(entry.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
};

interface StructuredModalProps {
  isOpen: boolean;
  onClose: () => void;
  happened: string;
  onHappenedChange: (v: string) => void;
  mattered: string;
  onMatteredChange: (v: string) => void;
  next: string;
  onNextChange: (v: string) => void;
  onInsert: () => void;
}

export const JournalStructuredModal: React.FC<StructuredModalProps> = ({
  isOpen,
  onClose,
  happened,
  onHappenedChange,
  mattered,
  onMatteredChange,
  next,
  onNextChange,
  onInsert,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-primary))] rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2 font-heading font-bold text-sm text-[rgb(var(--c-primary))]">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>3-Part Daily Reflection</span>
          </div>
          <button onClick={onClose} className="cursor-pointer">
            <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-heading font-bold mb-1 text-[rgb(var(--c-text))]">
              1. What Happened?
            </label>
            <textarea
              value={happened}
              onChange={(e) => onHappenedChange(e.target.value)}
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
              value={mattered}
              onChange={(e) => onMatteredChange(e.target.value)}
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
              value={next}
              onChange={(e) => onNextChange(e.target.value)}
              placeholder="Tomorrow's focus, adjustments, immediate next action..."
              rows={2}
              className="w-full px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] text-xs font-heading cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onInsert}
            className="px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition cursor-pointer"
          >
            Insert into Entry
          </button>
        </div>
      </div>
    </div>
  );
};

interface DeleteModalProps {
  entry: JournalEntry | JournalEntrySummary | null;
  isPermanent: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const JournalDeleteModal: React.FC<DeleteModalProps> = ({
  entry,
  isPermanent,
  onCancel,
  onConfirm,
}) => {
  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-rose-500 rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
              {isPermanent ? 'Delete Entry Permanently?' : 'Move Entry to Trash?'}
            </h3>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              {isPermanent
                ? 'This cannot be undone. The entry will be purged from IndexedDB.'
                : 'You can restore this entry anytime from the Trash tab.'}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs font-heading font-semibold text-[rgb(var(--c-text))]">
          {entry.title || 'Untitled Entry'} ({entry.date})
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] text-xs font-heading cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-heading text-xs font-bold hover:bg-rose-700 active:scale-95 transition cursor-pointer"
          >
            {isPermanent ? 'Delete Forever' : 'Move to Trash'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthInput: string;
  onMonthInputChange: (v: string) => void;
  onExport: () => void;
}

export const JournalExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  monthInput,
  onMonthInputChange,
  onExport,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-primary))] rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2 font-heading font-bold text-sm text-[rgb(var(--c-text))]">
            <Download className="w-4 h-4 text-[rgb(var(--c-primary))]" />
            <span>Export Monthly Compendium</span>
          </div>
          <button onClick={onClose} className="cursor-pointer">
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
            value={monthInput}
            onChange={(e) => onMonthInputChange(e.target.value)}
            className="w-full px-3.5 py-2 text-xs font-heading font-semibold rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] text-xs font-heading cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onExport}
            className="px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .txt</span>
          </button>
        </div>
      </div>
    </div>
  );
};
