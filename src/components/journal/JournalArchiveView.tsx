import React, { useState } from 'react';
import {
  CalendarDays,
  X,
  Search,
  Star,
  Pin,
  Feather,
  Plus,
  Download,
  ChevronRight,
} from 'lucide-react';
import { formatDisplayDate } from '../../utils/dateUtils';
import { JournalEntrySummary } from '../../db/queries';

const MOOD_ICONS = ['😞', '😐', '🙂', '😊', '🔥'];

interface JournalArchiveViewProps {
  entries: JournalEntrySummary[];
  activityStripDays: { dateKey: string; label: string; count: number; isToday: boolean }[];
  calendarFilterDate: string | null;
  onSelectCalendarFilterDate: (date: string | null) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onlyFavorites: boolean;
  onToggleOnlyFavorites: () => void;
  onlyPinned: boolean;
  onToggleOnlyPinned: () => void;
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  availableMonths: string[];
  selectedMoodFilter: number | 'all';
  onSelectMoodFilter: (mood: number | 'all') => void;
  allTags: string[];
  tagCounts: Record<string, number>;
  selectedTagFilter: string;
  onSelectTagFilter: (tag: string) => void;
  onSelectEntry: (entry: JournalEntrySummary) => void;
  onToggleFavorite: (entry: JournalEntrySummary, e: React.MouseEvent) => void;
  onTogglePin: (entry: JournalEntrySummary, e: React.MouseEvent) => void;
  onExportSingleEntry: (entry: JournalEntrySummary, e: React.MouseEvent) => void;
  onStartNewEntry: () => void;
}

const PAGE_SIZE = 30;

export const JournalArchiveView: React.FC<JournalArchiveViewProps> = ({
  entries,
  activityStripDays,
  calendarFilterDate,
  onSelectCalendarFilterDate,
  searchQuery,
  onSearchQueryChange,
  onlyFavorites,
  onToggleOnlyFavorites,
  onlyPinned,
  onToggleOnlyPinned,
  selectedMonth,
  onSelectMonth,
  availableMonths,
  selectedMoodFilter,
  onSelectMoodFilter,
  allTags,
  tagCounts,
  selectedTagFilter,
  onSelectTagFilter,
  onSelectEntry,
  onToggleFavorite,
  onTogglePin,
  onExportSingleEntry,
  onStartNewEntry,
}) => {
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  const visibleEntries = entries.slice(0, displayCount);
  const hasMore = entries.length > displayCount;

  return (
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
              onClick={() => onSelectCalendarFilterDate(null)}
              className="text-[11px] font-heading font-bold text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
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
                onClick={() => onSelectCalendarFilterDate(isSelected ? null : d.dateKey)}
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
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search entries, keywords, thoughts, tags, or prompts..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--c-primary))]"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchQueryChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Toggles: Starred & Pinned */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onToggleOnlyFavorites}
              className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                onlyFavorites
                  ? 'border-amber-400 bg-amber-400/20 text-amber-500'
                  : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-400' : ''}`} />
              <span>Starred</span>
            </button>

            <button
              onClick={onToggleOnlyPinned}
              className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold border transition flex items-center gap-1.5 cursor-pointer ${
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
              onChange={(e) => onSelectMonth(e.target.value)}
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
              onChange={(e) => onSelectMoodFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
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
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-[rgb(var(--c-border))]/50">
            <span className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))] mr-1">
              Tags:
            </span>
            <button
              onClick={() => onSelectTagFilter('all')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-heading font-bold transition cursor-pointer ${
                selectedTagFilter === 'all' ? 'bg-[rgb(var(--c-primary))] text-white' : 'bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))]'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onSelectTagFilter(selectedTagFilter === tag ? 'all' : tag)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-heading font-bold transition inline-flex items-center gap-1 cursor-pointer ${
                  selectedTagFilter === tag
                    ? 'bg-[rgb(var(--c-primary))] text-white shadow-xs'
                    : 'bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                <span>#{tag}</span>
                <span className="text-[9px] opacity-75 px-1 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
                  {tagCounts[tag] || 1}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Archive Entry Cards */}
      {entries.length === 0 ? (
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
            onClick={onStartNewEntry}
            className="mt-2 px-5 py-2.5 rounded-2xl bg-[rgb(var(--c-primary))] text-white font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>
              {searchQuery || selectedMonth !== 'all' || selectedMoodFilter !== 'all'
                ? "Start Today's Entry"
                : 'Add your first entry'}
            </span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleEntries.map((entry) => {
              const words = entry.wordCount || 0;
              const moodIdx = (entry.moodScore || 3) - 1;

              return (
                <div
                  key={entry.id}
                  onClick={() => onSelectEntry(entry)}
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
                          onClick={(e) => onToggleFavorite(entry, e)}
                          className="p-1 rounded-md hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] cursor-pointer"
                          title={entry.isFavorite ? 'Unstar' : 'Star'}
                        >
                          <Star className={`w-3.5 h-3.5 ${entry.isFavorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => onTogglePin(entry, e)}
                          className="p-1 rounded-md hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] cursor-pointer"
                          title={entry.isPinned ? 'Unpin' : 'Pin to top'}
                        >
                          <Pin className={`w-3.5 h-3.5 ${entry.isPinned ? 'text-indigo-400' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => onExportSingleEntry(entry, e)}
                          className="p-1 rounded-md hover:bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] cursor-pointer"
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
                    {entry.previewText && (
                      <p className="text-xs text-[rgb(var(--c-text))]/80 font-flourish line-clamp-3 mt-2 leading-relaxed">
                        {entry.previewText}
                      </p>
                    )}
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

          {/* Large list pagination: 30 items with "Show more" button */}
          {hasMore && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setDisplayCount((prev) => prev + PAGE_SIZE)}
                className="px-6 py-2.5 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:border-[rgb(var(--c-primary))] hover:text-[rgb(var(--c-primary))] shadow-xs transition active:scale-95 cursor-pointer"
              >
                Show more entries ({entries.length - displayCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
