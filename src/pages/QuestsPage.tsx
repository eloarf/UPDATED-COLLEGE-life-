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
  Plus,
  Circle,
  CheckCircle2,
  Calendar,
  Clock,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Edit3,
  X,
  Search,
  Check,
} from 'lucide-react';

export const QuestsPage: React.FC = () => {
  const { showToast } = useUiStore();
  const todayKey = getTodayKey();

  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'by_day' | 'overdue' | 'done'>('today');
  const [selectedDay, setSelectedDay] = useState<string>(todayKey);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickInput, setQuickInput] = useState('');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  // Add Task Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(todayKey);
  const [formCourseId, setFormCourseId] = useState('');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [formEffort, setFormEffort] = useState<'small' | 'medium' | 'large'>('medium');
  const [formDueTime, setFormDueTime] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Edit Task Modal State
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState(todayKey);
  const [editCourseId, setEditCourseId] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editEffort, setEditEffort] = useState<'small' | 'medium' | 'large'>('medium');
  const [editDueTime, setEditDueTime] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Delete Confirmation State
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];

  const courseMap = new Map<string, Course>();
  courses.forEach((c) => courseMap.set(c.id, c));

  // Filter tasks based on activeTab and search query
  const filteredTasks = tasks.filter((t) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchNotes = t.notes?.toLowerCase().includes(q);
      const course = t.courseId ? courseMap.get(t.courseId) : null;
      const matchCourse = course ? (course.name.toLowerCase().includes(q) || course.code.toLowerCase().includes(q)) : false;
      if (!matchTitle && !matchNotes && !matchCourse) return false;
    }

    if (activeTab === 'today') {
      return t.status !== 'done' && (t.dueDate === todayKey || !t.dueDate);
    } else if (activeTab === 'upcoming') {
      return t.status !== 'done' && t.dueDate && t.dueDate > todayKey;
    } else if (activeTab === 'by_day') {
      return t.dueDate === selectedDay;
    } else if (activeTab === 'overdue') {
      return t.status !== 'done' && t.dueDate && t.dueDate < todayKey;
    } else if (activeTab === 'done') {
      return t.status === 'done';
    }
    return true;
  });

  // Open Add Task Modal
  const openAddModal = (initialDate?: string) => {
    const targetDate = initialDate || (activeTab === 'by_day' ? selectedDay : todayKey);
    setFormDate(targetDate);
    setFormTitle('');
    setFormCourseId('');
    setFormPriority('medium');
    setFormEffort('medium');
    setFormDueTime('');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  // Open Edit Task Modal
  const openEditModal = (task: Task) => {
    setTaskToEdit(task);
    setEditTitle(task.title);
    setEditDate(task.dueDate || todayKey);
    setEditCourseId(task.courseId || '');
    setEditPriority(task.priority || 'medium');
    setEditEffort(task.effort || 'medium');
    setEditDueTime(task.dueTime || '');
    setEditNotes(task.notes || '');
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
    showToast(`Task added for ${formatDisplayDate(targetDate)}`, 'success');
  };

  // Full Task Form Submission
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Please enter a task title.', 'info');
      return;
    }

    const taskId = generateId();
    const now = new Date().toISOString();

    await db.tasks.add({
      id: taskId,
      title: formTitle.trim(),
      dueDate: formDate || todayKey,
      dueTime: formDueTime.trim() || undefined,
      courseId: formCourseId || undefined,
      priority: formPriority,
      effort: formEffort,
      contextTag: 'any',
      notes: formNotes.trim() || undefined,
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    });

    setIsAddModalOpen(false);
    showToast(`Task created for ${formatDisplayDate(formDate || todayKey)}`, 'success');
  };

  // Save Task Edits
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToEdit || !editTitle.trim()) return;

    const now = new Date().toISOString();
    await db.tasks.update(taskToEdit.id, {
      title: editTitle.trim(),
      dueDate: editDate || todayKey,
      dueTime: editDueTime.trim() || undefined,
      courseId: editCourseId || undefined,
      priority: editPriority,
      effort: editEffort,
      notes: editNotes.trim() || undefined,
      updatedAt: now,
    });

    setTaskToEdit(null);
    showToast('Task updated successfully', 'success');
  };

  // Instant 1-Click Toggle: Direct, non-blocking with instant feedback
  const handleToggleTask = async (task: Task) => {
    const isDone = task.status === 'done';
    const now = new Date().toISOString();
    const xpAmount = getQuestXpReward(task);

    if (isDone) {
      // Reopen task
      await db.tasks.update(task.id, {
        status: 'todo',
        completedAt: undefined,
        updatedAt: now,
      });
      await reverseXp('task', task.id);
      showToast(`Task reopened (-${xpAmount} XP)`, 'info');
    } else {
      // Complete task
      await db.tasks.update(task.id, {
        status: 'done',
        completedAt: now,
        updatedAt: now,
      });
      const awarded = await awardXp({
        source: 'task',
        sourceId: task.id,
        amount: xpAmount,
        stat: 'discipline',
        dayKey: task.dueDate || todayKey,
      });
      if (awarded) {
        triggerLevelUpConfetti();
        showToast(`Task completed! +${xpAmount} XP`, 'success');
      } else {
        showToast('Task completed!', 'success');
      }
    }
  };

  // Delete Task
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    if (taskToDelete.status === 'done') {
      await reverseXp('task', taskToDelete.id);
    }
    await db.tasks.delete(taskToDelete.id);
    setTaskToDelete(null);
    showToast('Task deleted', 'info');
  };

  // Reconcile XP Ledger
  const handleReconcile = async () => {
    const res = await reconcileXpLedger();
    if (res.reversedCount > 0) {
      showToast(`XP Ledger synchronized (${res.reversedCount} orphaned entries corrected). Total: ${res.reconciledTotalXp} XP`, 'success');
    } else {
      showToast(`XP Ledger verified: all records intact (${res.reconciledTotalXp} XP total).`, 'info');
    }
  };

  // Change selected day for By Day tab
  const shiftSelectedDay = (days: number) => {
    setSelectedDay(addDaysToKey(selectedDay, days));
  };

  const todayCount = tasks.filter((t) => t.status !== 'done' && (t.dueDate === todayKey || !t.dueDate)).length;
  const upcomingCount = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate > todayKey).length;
  const overdueCount = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < todayKey).length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="space-y-4 pb-20 animate-pop max-w-4xl mx-auto">
      {/* Header & Controls */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))]">
              Tasks &amp; Assignments
            </h1>
            <p className="text-xs text-[rgb(var(--c-muted))] mt-0.5">
              Organize daily coursework, readings, and personal tasks with instant completion.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleReconcile}
              className="min-h-[44px] px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] text-xs font-heading font-semibold transition active:scale-95 flex items-center gap-1.5"
              title="Audit and verify XP ledger integrity"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden xs:inline">Verify XP</span>
            </button>
            <button
              onClick={() => openAddModal()}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7A2E4A] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Quick Add Bar & Search */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <form onSubmit={handleQuickAdd} className="sm:col-span-2 flex items-center gap-2">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder={`Quick add task for ${activeTab === 'by_day' ? formatDisplayDate(selectedDay) : 'today'}... (Press Enter)`}
              className="min-h-[44px] flex-1 px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] border border-[rgb(var(--c-border))] font-heading text-xs font-bold hover:bg-[#7A2E4A] hover:text-white active:scale-95 transition shadow-xs flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[rgb(var(--c-muted))] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks or courses..."
              className="min-h-[44px] w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 mt-4 border-b border-[rgb(var(--c-border))] pb-1 overflow-x-auto scrollbar-none">
          {[
            { key: 'today', label: 'Today', count: todayCount },
            { key: 'upcoming', label: 'Upcoming', count: upcomingCount },
            { key: 'by_day', label: 'By Day', count: tasks.filter((t) => t.dueDate === selectedDay).length },
            { key: 'overdue', label: 'Overdue', count: overdueCount },
            { key: 'done', label: 'Completed', count: doneCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`min-h-[40px] px-3 py-1.5 text-xs font-heading font-bold rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-[#7A2E4A] text-white shadow-xs'
                  : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))]'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-80 px-1.5 py-0.5 rounded-full bg-black/10">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* By Day Date Navigator Banner */}
        {activeTab === 'by_day' && (
          <div className="mt-3 p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftSelectedDay(-1)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface))] transition"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => e.target.value && setSelectedDay(e.target.value)}
                className="min-h-[40px] px-2.5 py-1 text-xs font-heading font-bold rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))]"
              />
              <button
                onClick={() => shiftSelectedDay(1)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-[rgb(var(--c-border))] hover:bg-[rgb(var(--c-surface))] transition"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedDay(todayKey)}
                className="min-h-[40px] px-3 py-1 text-xs font-heading font-semibold text-[#7A2E4A] hover:underline"
              >
                Today
              </button>
            </div>
            <div className="text-xs text-[rgb(var(--c-muted))]">
              Showing <span className="font-bold text-[rgb(var(--c-text))]">{formatDisplayDate(selectedDay)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="bg-[rgb(var(--c-surface))] rounded-2xl p-8 text-center space-y-3 border border-[rgb(var(--c-border))]">
            <p className="text-xs text-[rgb(var(--c-muted))]">
              {searchQuery
                ? `No tasks match "${searchQuery}".`
                : activeTab === 'done'
                ? 'No completed tasks yet. Tap the circle on any task to complete it!'
                : activeTab === 'by_day'
                ? `No tasks scheduled for ${formatDisplayDate(selectedDay)}.`
                : 'No active tasks in this view. All caught up!'}
            </p>
            {activeTab !== 'done' && !searchQuery && (
              <button
                onClick={() => openAddModal(activeTab === 'by_day' ? selectedDay : todayKey)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#7A2E4A] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Task</span>
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
                className={`rounded-2xl p-3.5 bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] transition hover:border-[#7A2E4A] ${
                  isDone ? 'opacity-70 bg-[rgb(var(--c-surface2))]/40' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Instant 1-Click Toggle: 44px touch target on mobile */}
                    <button
                      onClick={() => handleToggleTask(task)}
                      className="min-h-[44px] min-w-[44px] -m-2 flex items-center justify-center text-[#7A2E4A] shrink-0 transition active:scale-90 focus:outline-none"
                      title={isDone ? 'Click to reopen task' : 'Click to complete task (+XP)'}
                      aria-label={isDone ? 'Reopen task' : 'Complete task'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="w-5 h-5 text-[rgb(var(--c-muted))] hover:text-emerald-600" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {course && (
                          <span
                            className="text-[10px] font-heading font-bold px-2 py-0.5 rounded text-stone-900"
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
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            High Priority
                          </span>
                        )}
                        {isOverdue && (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            Overdue ({formatDisplayDate(task.dueDate!)})
                          </span>
                        )}
                      </div>

                      {/* Metadata Row */}
                      <div className="flex items-center gap-2 text-xs text-[rgb(var(--c-muted))] mt-1 flex-wrap">
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
                        <span>·</span>
                        <span className="text-[10px] font-heading font-bold text-[rgb(var(--c-xp))]">
                          +{xpReward} XP
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit, Delete, Expand */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(task)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[rgb(var(--c-muted))] hover:text-[#7A2E4A] hover:bg-[rgb(var(--c-surface2))]"
                      title="Edit task"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setTaskToDelete(task)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500 hover:bg-[rgb(var(--c-surface2))]"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {task.notes && (
                      <button
                        onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
                        title={isExpanded ? 'Hide notes' : 'View notes'}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Notes Expansion */}
                {isExpanded && task.notes && (
                  <div className="mt-2.5 pt-2.5 border-t border-[rgb(var(--c-border))] text-xs">
                    <div className="p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] whitespace-pre-wrap">
                      {task.notes}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Add Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5 sm:p-6 text-[rgb(var(--c-text))] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <h2 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                New Task
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-heading font-bold mb-1">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Complete Circuit Analysis Lab Report"
                  className="min-h-[44px] w-full px-3.5 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-heading font-bold mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="min-h-[44px] w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
                <div>
                  <label className="block font-heading font-bold mb-1">Due Time (Optional)</label>
                  <input
                    type="time"
                    value={formDueTime}
                    onChange={(e) => setFormDueTime(e.target.value)}
                    className="min-h-[44px] w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-heading font-bold mb-1">Course (Optional)</label>
                  <select
                    value={formCourseId}
                    onChange={(e) => setFormCourseId(e.target.value)}
                    className="min-h-[44px] w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="">General / Personal</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-heading font-bold mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="min-h-[44px] w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-heading font-bold mb-1">Notes / Instructions</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Reference page numbers, partner names, instructions..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgb(var(--c-border))]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#7A2E4A] text-white font-heading font-bold hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Task Modal */}
      {taskToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5 sm:p-6 text-[rgb(var(--c-text))] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <h2 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
                Edit Task
              </h2>
              <button
                onClick={() => setTaskToEdit(null)}
                className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-heading font-bold mb-1">
                  Task Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="min-h-[44px] w-full px-3.5 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-heading font-bold mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="min-h-[44px] w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
                <div>
                  <label className="block font-heading font-bold mb-1">Due Time</label>
                  <input
                    type="time"
                    value={editDueTime}
                    onChange={(e) => setEditDueTime(e.target.value)}
                    className="min-h-[44px] w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-heading font-bold mb-1">Course</label>
                  <select
                    value={editCourseId}
                    onChange={(e) => setEditCourseId(e.target.value)}
                    className="min-h-[44px] w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="">General / Personal</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-heading font-bold mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="min-h-[44px] w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-heading font-bold mb-1">Notes / Instructions</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgb(var(--c-border))]">
                <button
                  type="button"
                  onClick={() => setTaskToEdit(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#7A2E4A] text-white font-heading font-bold hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Confirmation */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5 text-[rgb(var(--c-text))] space-y-3">
            <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
              Delete Task?
            </h3>
            <p className="text-xs text-[rgb(var(--c-muted))]">
              Are you sure you want to delete <strong className="text-[rgb(var(--c-text))]">{taskToDelete.title}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] text-xs font-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="min-h-[40px] px-4 py-1.5 rounded-xl bg-rose-600 text-white font-heading font-bold text-xs hover:bg-rose-700 active:scale-95 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
