import React from 'react';
import { Trash2 } from 'lucide-react';
import { JournalEntry } from '../../types';
import { JournalEntrySummary } from '../../db/queries';

interface JournalTrashViewProps {
  trashEntries: (JournalEntry | JournalEntrySummary)[];
  onEmptyTrash: () => void;
  onRestoreFromTrash: (entry: JournalEntry | JournalEntrySummary) => void;
  onRequestPermanentDelete: (entry: JournalEntry | JournalEntrySummary) => void;
}

export const JournalTrashView: React.FC<JournalTrashViewProps> = ({
  trashEntries,
  onEmptyTrash,
  onRestoreFromTrash,
  onRequestPermanentDelete,
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2 font-heading text-sm font-bold text-rose-500">
            <Trash2 className="w-4 h-4" />
            <span>Discarded Journal Entries ({trashEntries.length})</span>
          </div>

          {trashEntries.length > 0 && (
            <button
              onClick={onEmptyTrash}
              className="px-3.5 py-1.5 rounded-xl border border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white font-heading text-xs font-bold transition cursor-pointer"
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
                    onClick={() => onRestoreFromTrash(entry)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-heading text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
                  >
                    Restore Entry
                  </button>
                  <button
                    onClick={() => onRequestPermanentDelete(entry)}
                    className="px-3 py-1.5 rounded-xl border border-rose-500/50 text-rose-500 hover:bg-rose-500 hover:text-white font-heading text-xs font-bold transition cursor-pointer"
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
  );
};
