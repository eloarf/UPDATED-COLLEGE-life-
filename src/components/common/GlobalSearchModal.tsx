import React, { useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, X, CheckSquare, BookOpen, Layers, Feather } from 'lucide-react';

export const GlobalSearchModal: React.FC = () => {
  const { isSearchOpen, setSearchOpen, setCurrentRoute } = useUiStore();
  const [query, setQuery] = useState('');

  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const projects = useLiveQuery(() => db.projects.toArray()) || [];
  const journal = useLiveQuery(() => db.journalEntries.toArray()) || [];

  if (!isSearchOpen) return null;

  const q = query.toLowerCase().trim();

  const matchedTasks = q ? tasks.filter((t) => t.title.toLowerCase().includes(q) || (t.notes && t.notes.toLowerCase().includes(q))) : [];
  const matchedCourses = q ? courses.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || (c.instructor && c.instructor.toLowerCase().includes(q))) : [];
  const matchedProjects = q ? projects.filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) : [];
  const matchedJournal = q ? journal.filter((j) => j.content.toLowerCase().includes(q)) : [];

  const totalResults = matchedTasks.length + matchedCourses.length + matchedProjects.length + matchedJournal.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/50 backdrop-blur-xs animate-pop">
      <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-4 flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-2 pb-3 border-b border-[rgb(var(--c-border))]">
          <Search className="w-4 h-4 text-[rgb(var(--c-muted))]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, courses, projects, journal..."
            className="w-full bg-transparent text-sm text-[rgb(var(--c-text))] focus:outline-none placeholder:text-[rgb(var(--c-muted))]"
            autoFocus
          />
          <button
            onClick={() => setSearchOpen(false)}
            className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto py-3 space-y-4">
          {!q && (
            <div className="text-center py-8 text-xs text-[rgb(var(--c-muted))] font-flourish">
              Type keywords to locate coursework, assignments, or past journal thoughts.
            </div>
          )}

          {q && totalResults === 0 && (
            <div className="text-center py-8 text-xs text-[rgb(var(--c-muted))]">
              No entries found matching “{query}”.
            </div>
          )}

          {matchedCourses.length > 0 && (
            <div>
              <div className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
                Courses ({matchedCourses.length})
              </div>
              <div className="space-y-1">
                {matchedCourses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCurrentRoute('#/courses');
                      setSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-left text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
                      <span className="font-bold">{c.code}</span>
                      <span className="text-[rgb(var(--c-muted))] truncate">{c.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchedTasks.length > 0 && (
            <div>
              <div className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
                Quests & Tasks ({matchedTasks.length})
              </div>
              <div className="space-y-1">
                {matchedTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setCurrentRoute('#/tasks');
                      setSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-left text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckSquare className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
                      <span className="truncate">{t.title}</span>
                    </div>
                    <span className="text-[10px] text-[rgb(var(--c-muted))] shrink-0 ml-2">
                      {t.status === 'done' ? 'Completed' : t.dueDate || 'No due date'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchedProjects.length > 0 && (
            <div>
              <div className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
                Projects ({matchedProjects.length})
              </div>
              <div className="space-y-1">
                {matchedProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setCurrentRoute('#/projects');
                      setSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-left text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
                      <span className="truncate">{p.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchedJournal.length > 0 && (
            <div>
              <div className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider mb-1">
                Journal Entries ({matchedJournal.length})
              </div>
              <div className="space-y-1">
                {matchedJournal.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => {
                      setCurrentRoute('#/journal');
                      setSearchOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface2))] text-left text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Feather className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
                      <span className="truncate font-flourish">{j.content.slice(0, 50)}...</span>
                    </div>
                    <span className="text-[10px] text-[rgb(var(--c-muted))] shrink-0">{j.date}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
