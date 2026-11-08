import React from 'react';
import { Feather, Plus, ChevronLeft, Trash2, Download, Lock } from 'lucide-react';
import { JournalStatistics } from '../../utils/journalEngine';

interface JournalHeaderStatsProps {
  isZenMode: boolean;
  activeView: 'archive' | 'editor' | 'trash';
  activeEntriesCount: number;
  trashEntriesCount: number;
  journalStats: JournalStatistics;
  onStartNewEntry: () => void;
  onReturnToArchive: () => void;
  onSelectView: (view: 'archive' | 'trash') => void;
  onOpenExportModal: () => void;
}

export const JournalHeaderStats: React.FC<JournalHeaderStatsProps> = ({
  isZenMode,
  activeView,
  activeEntriesCount,
  trashEntriesCount,
  journalStats,
  onStartNewEntry,
  onReturnToArchive,
  onSelectView,
  onOpenExportModal,
}) => {
  if (isZenMode) return null;

  return (
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
              onClick={onStartNewEntry}
              className="px-4 py-2.5 rounded-2xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
              title="Compose a fresh journal entry"
            >
              <Plus className="w-4 h-4" />
              <span>New Entry</span>
            </button>
          ) : (
            <button
              onClick={onReturnToArchive}
              className="px-4 py-2 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:border-[rgb(var(--c-primary))] active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Archive</span>
            </button>
          )}

          {/* View Switches: Archive vs Trash */}
          {activeView !== 'editor' && (
            <div className="flex items-center bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] p-1 rounded-2xl">
              <button
                onClick={() => onSelectView('archive')}
                className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition cursor-pointer ${
                  activeView === 'archive'
                    ? 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-primary))] shadow-2xs'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                Archive ({activeEntriesCount})
              </button>
              <button
                onClick={() => onSelectView('trash')}
                className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition flex items-center gap-1 cursor-pointer ${
                  activeView === 'trash'
                    ? 'bg-[rgb(var(--c-surface))] text-rose-500 shadow-2xs'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                <Trash2 className="w-3 h-3" />
                <span>Trash {trashEntriesCount > 0 ? `(${trashEntriesCount})` : ''}</span>
              </button>
            </div>
          )}

          {/* Export Modal Launcher */}
          <button
            onClick={onOpenExportModal}
            className="p-2.5 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] active:scale-95 transition cursor-pointer"
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
  );
};
