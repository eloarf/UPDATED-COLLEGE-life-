import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { Project, ProjectMilestone, ProjectTask, ProjectMember, Course } from '../types';
import { getTodayKey, formatDisplayDate } from '../utils/dateUtils';
import { awardXp, triggerLevelUpConfetti } from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import {
  Layers,
  Plus,
  Share2,
  Users,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Copy,
  ChevronRight,
  X,
  MessageSquare,
  Compass,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const { showToast } = useUiStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(getTodayKey());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskColumn, setNewTaskColumn] = useState<'backlog' | 'todo' | 'doing' | 'review' | 'done'>('todo');

  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const projects = useLiveQuery(() => db.projects.toArray()) || [];
  const milestones = useLiveQuery(() => db.projectMilestones.toArray()) || [];
  const projectTasks = useLiveQuery(() => db.projectTasks.toArray()) || [];
  const members = useLiveQuery(() => db.projectMembers.toArray()) || [];

  const courseMap = new Map<string, Course>();
  courses.forEach((c) => courseMap.set(c.id, c));

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const activeMilestones = activeProject
    ? milestones.filter((m) => m.projectId === activeProject.id).sort((a, b) => a.order - b.order)
    : [];

  const activeTasks = activeProject
    ? projectTasks.filter((t) => t.projectId === activeProject.id)
    : [];

  const activeMembers = activeProject
    ? members.filter((m) => m.projectId === activeProject.id)
    : [];

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const projId = generateId();
    const now = new Date().toISOString();

    await db.projects.add({
      id: projId,
      title: title.trim(),
      courseId: courseId || undefined,
      type: 'group',
      description: description.trim(),
      status: 'active',
      startDate: getTodayKey(),
      deadline,
      createdAt: now,
      updatedAt: now,
    });

    // Add 3 default dungeon floor milestones
    await db.projectMilestones.bulkPut([
      { id: generateId(), projectId: projId, title: 'Floor 1: Requirements & System Architecture', isDone: false, order: 1 },
      { id: generateId(), projectId: projId, title: 'Floor 2: Implementation & Core Module Integration', isDone: false, order: 2 },
      { id: generateId(), projectId: projId, title: 'Floor 3: Final Testing & Presentation Deck', isDone: false, order: 3 },
    ]);

    setSelectedProjectId(projId);
    showToast('New project dungeon constructed!', 'success');
    setIsNewProjectModalOpen(false);
  };

  const handleToggleMilestone = async (milestone: ProjectMilestone) => {
    const isNowDone = !milestone.isDone;
    await db.projectMilestones.update(milestone.id, { isDone: isNowDone });

    if (isNowDone) {
      await awardXp({
        source: 'project_milestone',
        sourceId: milestone.id,
        amount: 75,
        stat: 'teamwork',
      });
      triggerLevelUpConfetti();
      showToast('Dungeon floor cleared! +75 Teamwork XP', 'success');
    }
  };

  const handleMoveTask = async (taskId: string, targetCol: 'backlog' | 'todo' | 'doing' | 'review' | 'done') => {
    await db.projectTasks.update(taskId, { column: targetCol });
    showToast(`Task moved to ${targetCol.toUpperCase()}`, 'info');
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !activeProject) return;

    await db.projectTasks.add({
      id: generateId(),
      projectId: activeProject.id,
      title: newTaskTitle.trim(),
      column: newTaskColumn,
      priority: 'medium',
      createdAt: new Date().toISOString(),
    });

    setNewTaskTitle('');
    setIsNewTaskModalOpen(false);
    showToast('Task placed into dungeon pipeline.', 'success');
  };

  const handleCopyTelegramSummary = () => {
    if (!activeProject) return;
    const doneTasks = activeTasks.filter((t) => t.column === 'done').map((t) => `• ${t.title}`).join('\n');
    const inProgress = activeTasks.filter((t) => t.column === 'doing').map((t) => `• ${t.title}`).join('\n');
    const nextSteps = activeTasks.filter((t) => t.column === 'todo').map((t) => `• ${t.title}`).join('\n');

    const text = `📢 *${activeProject.title} — Status Update*\n` +
      `📅 Deadline: ${activeProject.deadline || 'TBA'}\n\n` +
      `✅ *Done recently:*\n${doneTasks || 'None yet'}\n\n` +
      `⚡ *Currently Doing:*\n${inProgress || 'None'}\n\n` +
      `🎯 *Next Steps:*\n${nextSteps || 'None'}\n\n` +
      `Generated via College Life OS`;

    navigator.clipboard.writeText(text);
    showToast('Telegram / WhatsApp update copied to clipboard!', 'success');
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#4FA3A5] font-bold flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>Dungeon Architecture Hub</span>
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              School Projects &amp; Team Dungeons
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Milestone dungeon floors • Touch-safe Kanban • One-tap Telegram updates
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#4FA3A5] text-white font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </button>
            {activeProject && (
              <button
                onClick={handleCopyTelegramSummary}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition"
                title="Copy plain-text summary to paste into group chat"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Copy Update</span>
              </button>
            )}
          </div>
        </div>

        {/* Project Selector Pills */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
          {projects.map((p) => {
            const isSelected = activeProject?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-heading font-bold transition whitespace-nowrap ${
                  isSelected
                    ? 'border-[#4FA3A5] bg-[#4FA3A5] text-white shadow-xs'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] hover:border-[#4FA3A5]'
                }`}
              >
                {p.title}
              </button>
            );
          })}
        </div>
      </div>

      {activeProject ? (
        <div className="space-y-4">
          {/* Dungeon Map: Milestones (Floors) */}
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
              <div className="font-heading text-xs uppercase font-bold text-[#4FA3A5]">
                Dungeon Floors (Milestones)
              </div>
              <div className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
                {activeMilestones.filter((m) => m.isDone).length} of {activeMilestones.length} floors cleared
              </div>
            </div>

            <div className="space-y-2">
              {activeMilestones.map((m, idx) => (
                <div
                  key={m.id}
                  onClick={() => handleToggleMilestone(m)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition active:scale-98 ${
                    m.isDone
                      ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[#4FA3A5]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {m.isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-stone-400 shrink-0" />
                    )}
                    <div>
                      <div className={`text-xs font-heading font-bold ${m.isDone ? 'line-through text-[rgb(var(--c-muted))]' : 'text-[rgb(var(--c-text))]'}`}>
                        {m.title}
                      </div>
                      <div className="text-[10px] text-[rgb(var(--c-muted))]">
                        Dungeon Floor #{idx + 1}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-heading font-bold text-[rgb(var(--c-xp))]">
                    +75 XP
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Kanban Board with Fallback Move Buttons */}
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
              <div className="font-heading text-xs uppercase font-bold text-[rgb(var(--c-text))]">
                Pipeline Kanban (Touch-Safe)
              </div>
              <button
                onClick={() => setIsNewTaskModalOpen(true)}
                className="text-xs font-heading font-bold text-[#4FA3A5] flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {(['todo', 'doing', 'review', 'done'] as const).map((col) => {
                const colTasks = activeTasks.filter((t) => t.column === col);
                return (
                  <div
                    key={col}
                    className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2 flex flex-col min-h-[140px]"
                  >
                    <div className="flex items-center justify-between text-[11px] font-heading font-bold uppercase text-[rgb(var(--c-muted))]">
                      <span>{col}</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-[rgb(var(--c-surface2))] text-[10px]">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      {colTasks.map((t) => (
                        <div
                          key={t.id}
                          className="p-2 rounded-lg bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] shadow-2xs space-y-1"
                        >
                          <div className="text-xs font-semibold text-[rgb(var(--c-text))]">
                            {t.title}
                          </div>
                          {/* Non-drag fallback quick-move menu */}
                          <div className="flex items-center justify-between pt-1 border-t border-[rgb(var(--c-border))] text-[9px] text-[rgb(var(--c-muted))]">
                            <span>Move to:</span>
                            <div className="flex gap-1">
                              {col !== 'doing' && (
                                <button
                                  onClick={() => handleMoveTask(t.id, 'doing')}
                                  className="px-1 py-0.2 rounded bg-[rgb(var(--c-surface2))] hover:text-[#4FA3A5]"
                                >
                                  Doing
                                </button>
                              )}
                              {col !== 'done' && (
                                <button
                                  onClick={() => handleMoveTask(t.id, 'done')}
                                  className="px-1 py-0.2 rounded bg-emerald-100 text-emerald-800"
                                >
                                  Done
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-12 text-center text-xs text-[rgb(var(--c-muted))] font-flourish">
          No projects registered. Create your first engineering team project or research paper above!
        </div>
      )}

      {/* New Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                New Project Dungeon
              </div>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-4 h-4" />
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
                  placeholder="e.g. Autonomous Line-Follower Rover"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Course (Optional)
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="">General Project / Extracurricular</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Objectives, deliverables, and team responsibilities..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Submission Deadline
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-2 rounded-xl bg-[#4FA3A5] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-98 transition shadow-xs"
              >
                Construct Project Dungeon
              </button>
            </form>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-4">
            <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))] mb-3">
              <div className="font-heading text-xs font-bold text-[rgb(var(--c-text))]">
                Add Project Task
              </div>
              <button onClick={() => setIsNewTaskModalOpen(false)}>
                <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-[10px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Solder motor driver pin header"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Initial Column
                </label>
                <select
                  value={newTaskColumn}
                  onChange={(e) => setNewTaskColumn(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="todo">To Do</option>
                  <option value="doing">Doing</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2 rounded-xl bg-[#4FA3A5] text-white font-heading text-xs font-bold"
              >
                Add to Pipeline
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
