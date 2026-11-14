import React from 'react';
import { Feather, Plus, Trash2, Download, HeartPulse } from 'lucide-react';

export type JournalTabView = 'editor' | 'archive' | 'checkins' | 'trash';

interface JournalHeaderStatsProps {
  isZenMode: boolean;
  activeView: JournalTabView;
  activeEntriesCount: number;
  trashEntriesCount: number;
  checkInsCount: number;
  onStartNewSeparateNote: () => void;
  onSelectView: (view: JournalTabView) => void;
  onOpenExportModal: () => void;
  onOpenInsights?: () => void;
}

export const JournalHeaderStats: React.FC<JournalHeaderStatsProps> = ({
  isZenMode,
  activeView,
  activeEntriesCount,
  trashEntriesCount,
  checkInsCount,
  onStartNewSeparateNote,
  onSelectView,
  onOpenExportModal,
  onOpenInsights,
}) => {
  if (isZenMode) return null;

  return (
    <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Feather className="w-4 h-4 text-[rgb(var(--c-primary))] shrink-0" />
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-heading font-bold text-[rgb(var(--c-text))]">
              Journal
            </h1>
            <span className="text-xs text-[rgb(var(--c-muted))]">
              Private &amp; offline
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div
            role="tablist"
            aria-label="Journal views"
            className="flex items-center bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] p-1 rounded-xl overflow-x-auto no-scrollbar"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'editor'}
              onClick={() => onSelectView('editor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition cursor-pointer shrink-0 ${
                activeView === 'editor'
                  ? 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-primary))] shadow-2xs'
                  : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'archive'}
              onClick={() => onSelectView('archive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition cursor-pointer shrink-0 ${
                activeView === 'archive'
                  ? 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-primary))] shadow-2xs'
                  : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
              }`}
            >
              Entries ({activeEntriesCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'checkins'}
              onClick={() => onSelectView('checkins')}
              className={`px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition cursor-pointer shrink-0 ${
                activeView === 'checkins'
                  ? 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-primary))] shadow-2xs'
                  : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
              }`}
            >
              Check-ins ({checkInsCount})
            </button>
            {(trashEntriesCount > 0 || activeView === 'trash') && (
              <button
                type="button"
                role="tab"
                aria-selected={activeView === 'trash'}
                onClick={() => onSelectView('trash')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-heading font-bold transition inline-flex items-center gap-1 cursor-pointer shrink-0 ${
                  activeView === 'trash'
                    ? 'bg-[rgb(var(--c-surface))] text-rose-500 shadow-2xs'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                <Trash2 className="w-3 h-3" />
                <span>Trash ({trashEntriesCount})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {activeView !== 'editor' && (
              <button
                type="button"
                onClick={onStartNewSeparateNote}
                className="px-3 py-1.5 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 transition inline-flex items-center gap-1 cursor-pointer"
                title="Start a separate journal entry"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New note</span>
              </button>
            )}
            {onOpenInsights && (
              <button
                type="button"
                onClick={onOpenInsights}
                className="px-2.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-xs font-heading font-semibold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] hover:border-[rgb(var(--c-primary))] transition inline-flex items-center gap-1 cursor-pointer"
                title="Open Wellbeing Insights"
              >
                <HeartPulse className="w-3.5 h-3.5" />
                <span>Insights</span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenExportModal}
              className="p-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] hover:border-[rgb(var(--c-primary))] transition cursor-pointer"
              title="Export entries to .txt"
              aria-label="Export entries"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
