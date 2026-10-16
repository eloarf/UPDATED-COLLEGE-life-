import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { Task, Course } from '../types';
import { getTodayKey, formatDisplayDate, addDaysToKey } from '../utils/dateUtils';
import {
  awardXp,
  reverseXp,
  getQuestXpReward,
  reconcileXpLedger,
  triggerLevelUpConfetti,
} from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import {
  CheckSquare,
  Plus,
  Circle,
  CheckCircle2,
  Calendar,
  Clock,
  Smartphone,
  Laptop,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertCircle,
  X,
  ChevronLeft,
  ShieldCheck,
  Award,
} from 'lucide-react';

export const QuestsPage: React.FC = () => {
  const { showToast } = useUiStore();
  const todayKey = getTodayKey();

  const [activeTab, setActiveTab] = useState<'today' | 'by_day' | 'upcoming' | 'overdue' | 'done'>('today');
  const [selectedDay, setSelectedDay] = useState<string>(todayKey);
  const [quickInput, setQuickInput] = useState('');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  // Add Quest Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(todayKey);
  const [formCourseId, setFormCourseId] = useState('');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [formEffort, setFormEffort] = useState<'small' | 'medium' | 'large'>('medium');
  const [formDueTime, setFormDueTime] = useState('');
  const [formContextTag, setFormContextTag] = useState<'any' | 'phone' | 'laptop'>('any');
  const [formNotes, setFormNotes] = useState('');

  // Completion Confirmation State
  const [questToConfirm, setQuestToConfirm] = useState<Task | null>(null);
  // Undo Confirmation State
  const [questToUndo, setQuestToUndo] = useState<Task | null>(null);

  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];

  const courseMap = new Map<string, Course>();
  courses.forEach((c) => courseMap.set(c.id, c));

  // Filter tasks based on activeTab
  let filteredTasks = tasks;
  if (activeTab === 'today') {
    filteredTasks = tasks.filter((t) => t.status !== 'done' && (t.dueDate === todayKey || !t.dueDate));
  } else if (activeTab === 'by_day') {
    filteredTasks = tasks.filter((t) => t.dueDate === selectedDay);
  } else if (activeTab === 'upcoming') {
    filteredTasks = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate > todayKey);
  } else if (activeTab === 'overdue') {
    filteredTasks = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < todayKey);
  } else if (activeTab === 'done') {
    filteredTasks = tasks.filter((t) => t.status === 'done');
  }

  // Open Add Quest Modal initialized to the active tab's date
  const openAddModal = (initialDate?: string) => {
    const targetDate = initialDate || (activeTab === 'by_day' ? selectedDay : todayKey);
    setFormDate(targetDate);
    setFormTitle('');
    setFormCourseId('');
    setFormPriority('medium');
    setFormEffort('medium');
    setFormDueTime('');
    setFormContextTag('any');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  // Quick Add for today or selected day
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    const taskId = generateId();
    const now = new Date().toISOString();
    const targetDate = activeTab === 'by_day' ? selectedDay : todayKey;

    await db.tasks.add({
      id: taskId,
      title: quickInput.trim(),
      priority: 'medium',
      effort: 'medium',
      dueDate: targetDate,
      status: 'todo',
      contextTag: 'any',
      createdAt: now,
      updatedAt: now,
    });

    setQuickInput('');
    showToast(`Quest added for ${formatDisplayDate(targetDate)}! (+30 XP potential)`, 'success');
  };

  // Full Quest Form Submission
  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Please enter a quest title.', 'info');
      return;
    }

    const taskId = generateId();
    const now = new Date().toISOString();
    const potentialXp = getQuestXpReward({ effort: formEffort, priority: formPriority });

    await db.tasks.add({
      id: taskId,
      title: formTitle.trim(),
      dueDate: formDate || todayKey,
      dueTime: formDueTime.trim() || undefined,
      courseId: formCourseId || undefined,
      priority: formPriority,
      effort: formEffort,
      contextTag: formContextTag,
      notes: formNotes.trim() || undefined,
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    });

    setIsAddModalOpen(false);
    showToast(`Quest commissioned for ${formatDisplayDate(formDate || todayKey)} (+${potentialXp} XP on victory)!`, 'success');
  };

  // Quest Complete Click -> Opens confirmation modal
  const handleInitiateComplete = (task: Task) => {
    setQuestToConfirm(task);
  };

  // Confirm Completion -> Awards XP idempotently
  const handleConfirmComplete = async () => {
    if (!questToConfirm) return;
    const task = questToConfirm;
    const now = new Date().toISOString();
    const xpAmount = getQuestXpReward(task);

    // Update status to done
    await db.tasks.update(task.id, {
      status: 'done',
      completedAt: now,
      updatedAt: now,
    });

    // Award XP idempotently with safe state tracking
    const awarded = await awardXp({
      source: 'task',
      sourceId: task.id,
      amount: xpAmount,
      stat: 'discipline',
      dayKey: task.dueDate || todayKey,
    });

    if (awarded) {
      triggerLevelUpConfetti();
      showToast(`Quest completed! +${xpAmount} XP added to your ledger.`, 'success');
    } else {
      showToast(`Quest completed!`, 'success');
    }

    setQuestToConfirm(null);
  };

  // Undo Completion Click -> Opens confirmation modal
  const handleInitiateUndo = (task: Task) => {
    setQuestToUndo(task);
  };

  // Confirm Undo -> Reverses XP exactly once
  const handleConfirmUndo = async () => {
    if (!questToUndo) return;
    const task = questToUndo;
    const xpAmount = getQuestXpReward(task);

    await db.tasks.update(task.id, {
      status: 'todo',
      completedAt: undefined,
      updatedAt: new Date().toISOString(),
    });

    await reverseXp('task', task.id);
    showToast(`Quest returned to active ledger. -${xpAmount} XP reversed.`, 'info');
    setQuestToUndo(null);
  };

  // Delete Task -> Cleanly reverses XP if it was done
  const handleDeleteTask = async (task: Task) => {
    if (task.status === 'done') {
      await reverseXp('task', task.id);
    }
    await db.tasks.delete(task.id);
    showToast('Quest removed from ledger.', 'info');
  };

  // Reconcile XP Ledger
  const handleReconcile = async () => {
    const res = await reconcileXpLedger();
    if (res.reversedCount > 0) {
      showToast(`XP Ledger reconciled: removed ${res.reversedCount} orphaned awards. Current Total: ${res.reconciledTotalXp} XP`, 'success');
    } else {
      showToast(`XP Ledger verified: all ${res.totalValidEvents} events match completed quests (${res.reconciledTotalXp} XP total).`, 'info');
    }
  };

  // Change selected day for By Day tab
  const shiftSelectedDay = (days: number) => {
    setSelectedDay(addDaysToKey(selectedDay, days));
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#7A2E4A] font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>University Quest Log &amp; Ledger</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
              Daily Quests, Assignments &amp; Drills
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Ticket stub receipts • Verified XP payouts • Forgiving rollover (no shame alarms)
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleReconcile}
              className="px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:border-[#7A2E4A] font-heading text-xs font-semibold transition active:scale-95 flex items-center gap-1.5"
              title="Audit and verify XP ledger integrity against completed quests"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xs:inline">Verify XP</span>
            </button>
            <button
              onClick={() => openAddModal()}
              className="px-4 py-2.5 rounded-xl bg-[#7A2E4A] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Quest</span>
            </button>
          </div>
        </div>

        {/* Quick Add Bar */}
        <form onSubmit={handleQuickAdd} className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder={`Quick-add assignment or quest for ${activeTab === 'by_day' ? formatDisplayDate(selectedDay) : 'today'}... (Press Enter)`}
            className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] border border-[rgb(var(--c-border))] font-heading text-xs font-bold hover:bg-[#7A2E4A] hover:text-white active:scale-95 transition shadow-xs flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick</span>
          </button>
        </form>

        {/* Tabs */}
        <div className="flex items-center gap-2 mt-4 border-b border-[rgb(var(--c-border))] pb-1 overflow-x-auto scrollbar-none">
          {[
            { key: 'today', label: 'Today', count: tasks.filter((t) => t.status !== 'done' && (t.dueDate === todayKey || !t.dueDate)).length },
            { key: 'by_day', label: 'By Day', count: tasks.filter((t) => t.dueDate === selectedDay).length },
            { key: 'upcoming', label: 'Upcoming', count: tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate > todayKey).length },
            { key: 'overdue', label: 'Rolled Over', count: tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < todayKey).length },
            { key: 'done', label: 'Conquered', count: tasks.filter((t) => t.status === 'done').length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1.5 text-xs font-heading font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-[#7A2E4A] text-white shadow-xs'
                  : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))]'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-80 px-1.5 py-0.2 rounded-full bg-black/10">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* By Day Date Navigator Banner */}
        {activeTab === 'by_day' && (
          <div className="mt-3 p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftSelectedDay(-1)}
                className="p-1 rounded-lg border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface))] transition"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => e.target.value && setSelectedDay(e.target.value)}
                className="px-2.5 py-1 text-xs font-heading font-bold rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))]"
              />
              <button
                onClick={() => shiftSelectedDay(1)}
                className="p-1 rounded-lg border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface))] transition"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedDay(todayKey)}
                className="px-2 py-1 text-[11px] font-heading font-semibold text-[#7A2E4A] hover:underline"
              >
                Today
              </button>
            </div>
            <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
              Showing schedule for <span className="font-bold text-[rgb(var(--c-text))]">{formatDisplayDate(selectedDay)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-10 text-center space-y-3">
            <div className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              {activeTab === 'done'
                ? 'No conquered quests yet. Check off an active quest above to earn XP receipts!'
                : activeTab === 'by_day'
                ? `No quests logged for ${formatDisplayDate(selectedDay)}. Create one to keep your momentum!`
                : 'No active quests under this tab. Enjoy your university momentum or commission a new quest!'}
            </div>
            {activeTab !== 'done' && (
              <button
                onClick={() => openAddModal(activeTab === 'by_day' ? selectedDay : todayKey)}
                className="px-4 py-2 rounded-xl bg-[#7A2E4A] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Quest for {activeTab === 'by_day' ? formatDisplayDate(selectedDay) : 'Today'}</span>
              </button>
            )}
          </div>
        ) : (
          filteredTasks.map((task) => {
            const course = task.courseId ? courseMap.get(task.courseId) : null;
            const isDone = task.status === 'done';
            const isOverdue = task.dueDate && task.dueDate < todayKey && !isDone;
            const isExpanded = expandedTask === task.id;
            const xpReward = getQuestXpReward(task);

            return (
              <div
                key={task.id}
                className={`ticket-cutout ticket-border rounded-2xl p-3.5 bg-[rgb(var(--c-surface))] transition hover:border-[#7A2E4A] ${
                  isDone ? 'opacity-70 bg-[rgb(var(--c-surface2))]/40' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Toggle Button */}
                    <button
                      onClick={() => (isDone ? handleInitiateUndo(task) : handleInitiateComplete(task))}
                      className="mt-0.5 text-[#7A2E4A] shrink-0 hover:scale-110 active:scale-95 transition focus:outline-none"
                      title={isDone ? 'Undo completion (reverses XP)' : 'Confirm completion (+XP)'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="w-5 h-5 hover:text-emerald-600" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {course && (
                          <span
                            className="text-[9px] font-heading font-bold px-2 py-0.5 rounded-full text-stone-900 shadow-2xs"
                            style={{ backgroundColor: course.color }}
                          >
                            {course.code}
                          </span>
                        )}
                        <span
                          className={`text-xs font-bold font-heading ${
                            isDone ? 'line-through text-[rgb(var(--c-muted))]' : 'text-[rgb(var(--c-text))]'
                          }`}
                        >
                          {task.title}
                        </span>
                        {task.priority === 'high' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300">
                            High Priority (+10 XP)
                          </span>
                        )}
                        {isOverdue && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200">
                            Rolled over from {formatDisplayDate(task.dueDate!)}
                          </span>
                        )}
                        {isDone && task.completedAt && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                            Conquered
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[rgb(var(--c-muted))] mt-1.5 flex-wrap">
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#7A2E4A]" /> {formatDisplayDate(task.dueDate)}
                          </span>
                        )}
                        {task.dueTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {task.dueTime}
                          </span>
                        )}
                        {task.contextTag === 'laptop' && (
                          <span className="flex items-center gap-1">
                            <Laptop className="w-3 h-3" /> Needs Laptop
                          </span>
                        )}
                        {task.contextTag === 'phone' && (
                          <span className="flex items-center gap-1">
                            <Smartphone className="w-3 h-3" /> Phone-friendly
                          </span>
                        )}
                        <span className="text-[10px] font-heading font-bold text-[rgb(var(--c-xp))]">
                          +{xpReward} XP
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                      className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
                      title="Inspect details"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task)}
                      className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500 hover:bg-[rgb(var(--c-surface2))]"
                      title="Delete quest"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtasks / Notes Expansion */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-[rgb(var(--c-border))] space-y-2 text-xs">
                    {task.notes && (
                      <div className="p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] font-flourish whitespace-pre-wrap">
                        {task.notes}
                      </div>
                    )}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold">
                          Subtasks Checklist
                        </div>
                        {task.subtasks.map((st) => (
                          <div key={st.id} className="flex items-center gap-2 text-xs">
                            <span className={st.done ? 'text-emerald-500' : 'text-stone-400'}>
                              {st.done ? '✓' : '○'}
                            </span>
                            <span className={st.done ? 'line-through text-[rgb(var(--c-muted))]' : ''}>
                              {st.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Add Quest Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div>
                <div className="text-[10px] uppercase font-heading font-bold text-[#7A2E4A] tracking-wider">
                  Grand Concierge Ledger
                </div>
                <h3 className="text-lg font-heading font-bold text-[rgb(var(--c-text))]">
                  Commission New Quest
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuest} className="space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="block font-heading font-bold mb-1">
                  Quest Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Complete Circuit Analysis Lab Report 3"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
                />
              </div>

              {/* Day & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-heading font-bold mb-1">
                    Scheduled Day <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
                <div>
                  <label className="block font-heading font-bold mb-1">
                    Due Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={formDueTime}
                    onChange={(e) => setFormDueTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
              </div>

              {/* Course Selection */}
              <div>
                <label className="block font-heading font-bold mb-1">
                  Associated University Course (Optional)
                </label>
                <select
                  value={formCourseId}
                  onChange={(e) => setFormCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="">No Course (General Academic / Personal)</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Effort & XP Reward */}
              <div>
                <label className="block font-heading font-bold mb-1">
                  Effort &amp; Base XP Reward
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'small', label: 'Small', xp: '+15 XP', desc: 'Quick drill (<30m)' },
                    { value: 'medium', label: 'Medium', xp: '+30 XP', desc: 'Standard task (1-2h)' },
                    { value: 'large', label: 'Large', xp: '+60 XP', desc: 'Major assignment' },
                  ].map((eff) => (
                    <button
                      key={eff.value}
                      type="button"
                      onClick={() => setFormEffort(eff.value as any)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        formEffort === eff.value
                          ? 'border-[#7A2E4A] bg-[#7A2E4A]/10 text-[rgb(var(--c-text))] ring-1 ring-[#7A2E4A]'
                          : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))]'
                      }`}
                    >
                      <div className="font-heading font-bold text-xs">{eff.label}</div>
                      <div className="text-[10px] font-bold text-[rgb(var(--c-xp))]">{eff.xp}</div>
                      <div className="text-[9px] opacity-70 mt-0.5">{eff.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority & Device Context */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-heading font-bold mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority (+10 XP bonus)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-heading font-bold mb-1">Device Context</label>
                  <select
                    value={formContextTag}
                    onChange={(e) => setFormContextTag(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="any">Any Device (Flexible)</option>
                    <option value="phone">Phone-friendly (Dorm/Mobile)</option>
                    <option value="laptop">Needs Laptop (Studio/PC)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-heading font-bold mb-1">
                  Quest Notes / Submission Instructions
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Reference pages, rubric requirements, partner notes..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgb(var(--c-border))]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#7A2E4A] text-white font-heading font-bold hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Commission Quest (+{getQuestXpReward({ effort: formEffort, priority: formPriority })} XP)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Quest Completion Confirmation */}
      {questToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[#7A2E4A] rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#7A2E4A]/15 text-[#7A2E4A] flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-heading font-bold tracking-wider text-[#7A2E4A]">
                  Confirmation of Victory
                </div>
                <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                  Conquer This Quest?
                </h3>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2 text-xs">
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                {questToConfirm.title}
              </div>
              {questToConfirm.courseId && courseMap.get(questToConfirm.courseId) && (
                <div className="text-[11px] text-[rgb(var(--c-muted))]">
                  Course: <span className="font-bold text-[rgb(var(--c-text))]">{courseMap.get(questToConfirm.courseId)?.code}</span>
                </div>
              )}
              {questToConfirm.dueDate && (
                <div className="text-[11px] text-[rgb(var(--c-muted))]">
                  Scheduled Day: <span className="font-semibold">{formatDisplayDate(questToConfirm.dueDate)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[rgb(var(--c-border))] flex items-center justify-between">
                <span className="text-[11px] font-heading font-semibold text-[rgb(var(--c-muted))]">
                  Experience to Award:
                </span>
                <span className="font-heading font-bold text-sm text-[rgb(var(--c-xp))]">
                  +{getQuestXpReward(questToConfirm)} XP
                </span>
              </div>
            </div>

            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Are you sure you completed this quest? Confirming moves it to your Conquered ledger and permanently records the XP receipt.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuestToConfirm(null)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] text-xs font-heading"
              >
                Not yet
              </button>
              <button
                type="button"
                onClick={handleConfirmComplete}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-heading font-bold text-xs hover:bg-emerald-700 active:scale-95 transition shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Yes, Conquer &amp; Award +{getQuestXpReward(questToConfirm)} XP</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Undo Completion Confirmation */}
      {questToUndo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                  Re-open Conquered Quest?
                </h3>
                <p className="text-xs text-[rgb(var(--c-muted))]">
                  Reversing completion will retract the awarded experience.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs">
              <div className="font-heading font-bold text-[rgb(var(--c-text))]">
                {questToUndo.title}
              </div>
              <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">
                Will reverse -{getQuestXpReward(questToUndo)} XP from your ledger.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuestToUndo(null)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] text-xs font-heading"
              >
                Keep Conquered
              </button>
              <button
                type="button"
                onClick={handleConfirmUndo}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-heading font-bold text-xs hover:bg-rose-700 active:scale-95 transition shadow-xs"
              >
                Undo &amp; Reverse XP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
