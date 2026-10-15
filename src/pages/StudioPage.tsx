import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { CreativeProject, CreativeSession } from '../types';
import { getTodayKey } from '../utils/dateUtils';
import { awardXp, triggerLevelUpConfetti } from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import {
  Music,
  Plus,
  Sparkles,
  BookOpen,
  CheckCircle,
  Play,
  RotateCcw,
  Clock,
  Feather,
  ChevronRight,
  X,
  Trash2,
} from 'lucide-react';

const DEFAULT_SONG_STAGES = ['Idea', 'Lyrics', 'Melody', 'Beat', 'Recording', 'Mix', 'Master', 'Release'];
const DEFAULT_BOOK_STAGES = ['Idea', 'Outline', 'Draft', 'Revise', 'Done'];

export const StudioPage: React.FC = () => {
  const { showToast } = useUiStore();
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'song' | 'beat' | 'ep' | 'book' | 'story' | 'other'>('song');
  const [linesWritten, setLinesWritten] = useState(0);

  const projects = useLiveQuery(() => db.creativeProjects.toArray()) || [];

  // Finish-first: sort projects by progress percent descending
  const sortedProjects = [...projects].sort((a, b) => b.progressPercent - a.progressPercent);
  const finishFirstProject = sortedProjects[0];

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const stages = (type === 'book' || type === 'story') ? DEFAULT_BOOK_STAGES : DEFAULT_SONG_STAGES;

    await db.creativeProjects.add({
      id: generateId(),
      title: title.trim(),
      type,
      currentStage: stages[0],
      stages,
      progressPercent: 12,
      linesWritten,
    });

    setTitle('');
    setIsNewProjectOpen(false);
    showToast('New creative production pipeline opened!', 'success');
  };

  const handleAdvanceStage = async (p: CreativeProject) => {
    const currentIdx = p.stages.indexOf(p.currentStage);
    if (currentIdx < p.stages.length - 1) {
      const nextStage = p.stages[currentIdx + 1];
      const nextPercent = Math.round(((currentIdx + 2) / p.stages.length) * 100);

      await db.creativeProjects.update(p.id, {
        currentStage: nextStage,
        progressPercent: nextPercent,
      });

      await awardXp({
        source: 'creative_stage',
        sourceId: `${p.id}_${nextStage}`,
        amount: 30,
        stat: 'creativity',
      });

      if (nextIdxIsLast(currentIdx + 1, p.stages.length)) {
        triggerLevelUpConfetti();
        await awardXp({
          source: 'creative_finish',
          sourceId: `${p.id}_finish`,
          amount: 150,
          stat: 'creativity',
        });
        showToast(`🎉 Masterpiece released! +180 Creativity XP awarded!`, 'success');
      } else {
        showToast(`Stage advanced to ${nextStage}! +30 XP`, 'success');
      }
    }
  };

  const nextIdxIsLast = (idx: number, len: number) => idx === len - 1;

  const handleDeleteProject = async (id: string) => {
    await db.creativeProjects.delete(id);
    showToast('Creative project deleted.', 'info');
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#BBA6E0] font-bold">
              Creative Atelier &amp; Studio Flow
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              Music, Beat &amp; Writing Pipelines
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              “Finish-First” priority view • 8-stage music release pipeline • Lines written tracker
            </p>
          </div>

          <button
            onClick={() => setIsNewProjectOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#BBA6E0] text-stone-950 font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Production</span>
          </button>
        </div>
      </div>

      {/* Finish First Spotlight Card */}
      {finishFirstProject && (
        <div className="ticket-border bg-gradient-to-r from-[rgb(var(--c-surface))] to-[rgb(var(--c-surface2))] rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-[rgb(var(--c-primary))] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Closest to Completion (Finish First!)
            </span>
            <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
              {finishFirstProject.progressPercent}% Ready
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                {finishFirstProject.title}
              </h3>
              <div className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-0.5">
                Current Stage: <span className="font-bold text-[rgb(var(--c-primary))]">{finishFirstProject.currentStage}</span> • Type: {finishFirstProject.type.toUpperCase()}
              </div>
            </div>

            <button
              onClick={() => handleAdvanceStage(finishFirstProject)}
              className="px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition flex items-center gap-1.5 shrink-0"
            >
              <span>Advance to Next Stage</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* All Studio Pipelines */}
      <div className="space-y-3">
        <div className="font-heading text-xs uppercase font-bold text-[rgb(var(--c-muted))]">
          Active Pipelines ({projects.length})
        </div>

        {projects.length === 0 ? (
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-10 text-center text-xs text-[rgb(var(--c-muted))] font-flourish">
            No creative pipelines opened. Capture that melody, EP idea, or fiction draft above!
          </div>
        ) : (
          projects.map((p) => (
            <div
              key={p.id}
              className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))] uppercase">
                      {p.type}
                    </span>
                    <h4 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
                      {p.title}
                    </h4>
                  </div>
                  {p.notes && (
                    <div className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-1">
                      {p.notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAdvanceStage(p)}
                    className="px-3 py-1 rounded-full bg-[#BBA6E0] text-stone-950 font-heading text-xs font-bold hover:opacity-90 active:scale-95"
                  >
                    + Stage ({p.currentStage})
                  </button>
                  <button
                    onClick={() => handleDeleteProject(p.id)}
                    className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Stage Progress Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                {p.stages.map((stage, idx) => {
                  const currentIdx = p.stages.indexOf(p.currentStage);
                  const isDone = idx < currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <div
                      key={stage}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-heading font-bold whitespace-nowrap transition border ${
                        isCurrent
                          ? 'bg-[#BBA6E0] text-stone-950 border-[#BBA6E0] shadow-xs'
                          : isDone
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] border-[rgb(var(--c-border))]'
                      }`}
                    >
                      {isDone ? '✓ ' : ''}
                      {stage}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Project Modal */}
      {isNewProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                New Creative Project
              </div>
              <button onClick={() => setIsNewProjectOpen(false)}>
                <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Ethiopian Jazz Lo-Fi Beat Tape"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Creative Medium
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="song">Song Single</option>
                  <option value="beat">Instrumental / Beat</option>
                  <option value="ep">EP / Album Project</option>
                  <option value="book">Non-Fiction / Guide</option>
                  <option value="story">Novel / Short Story</option>
                  <option value="other">Creative Other</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-2 rounded-xl bg-[#BBA6E0] text-stone-950 font-heading text-xs font-bold"
              >
                Launch Pipeline
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
