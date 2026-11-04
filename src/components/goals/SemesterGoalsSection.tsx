import React, { useState } from 'react';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../../store/uiStore';
import { AcademicGoal, GoalMilestone, Course } from '../../types';
import { generateId } from '../../utils/idGenerator';
import { getTodayKey, formatDisplayDate } from '../../utils/dateUtils';
import {
  calculateGoalProgress,
  calculateGoalsSummary,
  GOAL_CATEGORIES,
} from '../../utils/goalsEngine';
import {
  awardXp,
  triggerLevelUpConfetti,
} from '../../services/rpgService';
import {
  Plus,
  Target,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  Trash2,
  Edit3,
  X,
  Search,
  Check,
  Flag,
  Sparkles,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react';

export const SemesterGoalsSection: React.FC = () => {
  const { showToast } = useUiStore();
  const todayKey = getTodayKey();

  const goals = useLiveQuery(() => db.academicGoals.toArray()) || [];
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const courseMap = new Map<string, Course>();
  courses.forEach((c) => courseMap.set(c.id, c));

  const [categoryFilter, setCategoryFilter] = useState<'all' | AcademicGoal['category']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<string>>(new Set());

  // Inline milestone input: { [goalId]: text }
  const [inlineMilestoneInput, setInlineMilestoneInput] = useState<Record<string, string>>({});

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<AcademicGoal | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<AcademicGoal['category']>('academic');
  const [formCourseId, setFormCourseId] = useState('');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formMilestones, setFormMilestones] = useState<{ id: string; title: string; isCompleted: boolean }[]>([]);
  const [newMilestoneText, setNewMilestoneText] = useState('');

  // Delete State
  const [goalToDelete, setGoalToDelete] = useState<AcademicGoal | null>(null);

  // Summary Metrics
  const summary = calculateGoalsSummary(goals);

  // Filtered Goals
  const filteredGoals = goals.filter((g) => {
    if (categoryFilter !== 'all' && g.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && g.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = g.title.toLowerCase().includes(q);
      const matchNotes = g.notes?.toLowerCase().includes(q);
      const course = g.courseId ? courseMap.get(g.courseId) : null;
      const matchCourse = course ? (course.name.toLowerCase().includes(q) || course.code.toLowerCase().includes(q)) : false;
      if (!matchTitle && !matchNotes && !matchCourse) return false;
    }
    return true;
  });

  const toggleExpand = (goalId: string) => {
    setExpandedGoalIds((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };

  const openAddModal = () => {
    setEditingGoal(null);
    setFormTitle('');
    setFormCategory('academic');
    setFormCourseId('');
    setFormTargetDate('');
    setFormNotes('');
    setFormMilestones([
      { id: generateId(), title: '', isCompleted: false },
    ]);
    setNewMilestoneText('');
    setIsModalOpen(true);
  };

  const openEditModal = (goal: AcademicGoal) => {
    setEditingGoal(goal);
    setFormTitle(goal.title);
    setFormCategory(goal.category);
    setFormCourseId(goal.courseId || '');
    setFormTargetDate(goal.targetDate || '');
    setFormNotes(goal.notes || '');
    setFormMilestones(
      goal.milestones
        ? goal.milestones.map((m) => ({
            id: m.id,
            title: m.title,
            isCompleted: m.isCompleted ?? !!m.completed,
          }))
        : []
    );
    setNewMilestoneText('');
    setIsModalOpen(true);
  };

  const handleAddMilestoneToForm = () => {
    if (!newMilestoneText.trim()) return;
    setFormMilestones((prev) => [
      ...prev,
      { id: generateId(), title: newMilestoneText.trim(), isCompleted: false },
    ]);
    setNewMilestoneText('');
  };

  const handleRemoveMilestoneFromForm = (id: string) => {
    setFormMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Please provide a goal title.', 'warning');
      return;
    }

    // Filter out blank milestones
    const validMilestones: GoalMilestone[] = formMilestones
      .filter((m) => m.title.trim())
      .map((m) => ({
        id: m.id || generateId(),
        title: m.title.trim(),
        isCompleted: !!m.isCompleted,
        completed: !!m.isCompleted,
      }));

    if (newMilestoneText.trim()) {
      validMilestones.push({
        id: generateId(),
        title: newMilestoneText.trim(),
        isCompleted: false,
        completed: false,
      });
    }

    const progress = calculateGoalProgress(validMilestones, editingGoal?.status);
    const now = new Date().toISOString();

    if (editingGoal) {
      await db.academicGoals.update(editingGoal.id, {
        title: formTitle.trim(),
        category: formCategory,
        courseId: formCourseId || undefined,
        targetDate: formTargetDate || undefined,
        notes: formNotes.trim() || undefined,
        milestones: validMilestones,
        progressPercent: progress,
        updatedAt: now,
      });
      showToast('Goal updated successfully!', 'success');
    } else {
      const newGoal: AcademicGoal = {
        id: generateId(),
        title: formTitle.trim(),
        category: formCategory,
        courseId: formCourseId || undefined,
        targetDate: formTargetDate || undefined,
        progressPercent: progress,
        status: 'active',
        milestones: validMilestones,
        notes: formNotes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      await db.academicGoals.add(newGoal);
      showToast('New semester goal created!', 'success');
    }

    setIsModalOpen(false);
  };

  // Milestone check / uncheck directly on goal card
  const handleToggleMilestone = async (goal: AcademicGoal, milestoneId: string) => {
    const currentMilestones = goal.milestones || [];
    const updatedMilestones = currentMilestones.map((m) => {
      if (m.id === milestoneId) {
        const nextState = !(m.isCompleted ?? m.completed);
        return { ...m, isCompleted: nextState, completed: nextState };
      }
      return m;
    });

    const toggledItem = updatedMilestones.find((m) => m.id === milestoneId);
    const progress = calculateGoalProgress(updatedMilestones, goal.status);
    const allDone = updatedMilestones.length > 0 && updatedMilestones.every((m) => m.isCompleted ?? m.completed);
    const newStatus = allDone ? 'completed' : (goal.status === 'completed' ? 'active' : goal.status);

    await db.academicGoals.update(goal.id, {
      milestones: updatedMilestones,
      progressPercent: progress,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    if (toggledItem?.isCompleted) {
      await awardXp({
        source: 'academic_milestone',
        sourceId: `${goal.id}_${milestoneId}`,
        amount: 25,
        stat: 'knowledge',
      });
      showToast('🎉 Milestone completed! +25 XP', 'success');

      if (allDone && goal.status !== 'completed') {
        await awardXp({
          source: 'academic_goal',
          sourceId: goal.id,
          amount: 100,
          stat: 'knowledge',
        });
        triggerLevelUpConfetti();
        showToast('🏆 Mastered Goal Achieved! +100 XP', 'success');
      }
    }
  };

  // Add inline milestone from card
  const handleAddInlineMilestone = async (goal: AcademicGoal) => {
    const text = (inlineMilestoneInput[goal.id] || '').trim();
    if (!text) return;

    const newMilestone: GoalMilestone = {
      id: generateId(),
      title: text,
      isCompleted: false,
      completed: false,
    };
    const updatedMilestones = [...(goal.milestones || []), newMilestone];
    const progress = calculateGoalProgress(updatedMilestones, goal.status);

    await db.academicGoals.update(goal.id, {
      milestones: updatedMilestones,
      progressPercent: progress,
      updatedAt: new Date().toISOString(),
    });

    setInlineMilestoneInput((prev) => ({ ...prev, [goal.id]: '' }));
    showToast('Milestone added!', 'success');
  };

  // Toggle goal status between active & completed
  const handleToggleGoalStatus = async (goal: AcademicGoal) => {
    const nextStatus = goal.status === 'completed' ? 'active' : 'completed';
    const nextProgress = nextStatus === 'completed' ? 100 : calculateGoalProgress(goal.milestones);

    await db.academicGoals.update(goal.id, {
      status: nextStatus,
      progressPercent: nextProgress,
      updatedAt: new Date().toISOString(),
    });

    if (nextStatus === 'completed') {
      await awardXp({
        source: 'academic_goal',
        sourceId: goal.id,
        amount: 100,
        stat: 'knowledge',
      });
      triggerLevelUpConfetti();
      showToast('🏆 Goal marked completed! +100 XP', 'success');
    } else {
      showToast('Goal reopened to active progress.', 'info');
    }
  };

  const handleConfirmDelete = async () => {
    if (!goalToDelete) return;
    await db.academicGoals.delete(goalToDelete.id);
    showToast('Goal removed.', 'info');
    setGoalToDelete(null);
  };

  return (
    <div className="space-y-4">
      {/* 4 Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-3.5 sm:p-4 text-center">
          <div className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
            Total Goals
          </div>
          <div className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))] mt-1">
            {summary.totalGoals}
          </div>
          <div className="text-[10px] text-[rgb(var(--c-muted))] mt-0.5">
            Semester roadmap
          </div>
        </div>

        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-3.5 sm:p-4 text-center">
          <div className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
            Active
          </div>
          <div className="text-xl sm:text-2xl font-heading font-bold text-amber-600 dark:text-amber-400 mt-1">
            {summary.activeGoals}
          </div>
          <div className="text-[10px] text-[rgb(var(--c-muted))] mt-0.5">
            In motion
          </div>
        </div>

        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-3.5 sm:p-4 text-center">
          <div className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
            Milestones Done
          </div>
          <div className="text-xl sm:text-2xl font-heading font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {summary.completedMilestones} <span className="text-xs text-[rgb(var(--c-muted))]">/ {summary.totalMilestones}</span>
          </div>
          <div className="text-[10px] text-[rgb(var(--c-muted))] mt-0.5">
            Checklist steps
          </div>
        </div>

        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-3.5 sm:p-4 text-center">
          <div className="text-[10px] font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
            Avg Progress
          </div>
          <div className="text-xl sm:text-2xl font-heading font-bold text-[#7A2E4A] dark:text-pink-400 mt-1">
            {summary.averageProgressPercent}%
          </div>
          <div className="text-[10px] text-[rgb(var(--c-muted))] mt-0.5">
            Completion rate
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`min-h-[36px] px-3 py-1 text-xs font-heading font-bold rounded-xl transition whitespace-nowrap ${
                categoryFilter === 'all'
                  ? 'bg-[#7A2E4A] text-white shadow-xs'
                  : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))]'
              }`}
            >
              All Categories
            </button>
            {GOAL_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`min-h-[36px] px-3 py-1 text-xs font-heading font-bold rounded-xl transition whitespace-nowrap ${
                  categoryFilter === cat.id
                    ? 'bg-[#7A2E4A] text-white shadow-xs'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="min-h-[36px] px-2.5 py-1 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-heading"
            >
              <option value="all">All Status</option>
              <option value="in_progress">Active Only</option>
              <option value="completed">Completed Only</option>
            </select>

            <button
              onClick={openAddModal}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-[#7A2E4A] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Goal</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[rgb(var(--c-muted))] absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search goals, milestones, or linked courses..."
            className="min-h-[40px] w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
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

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[rgb(var(--c-surface2))] flex items-center justify-center mx-auto text-[#7A2E4A]">
            <Target className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
              {searchQuery ? 'No matching semester goals' : 'No Semester Goals Yet'}
            </h3>
            <p className="text-xs text-[rgb(var(--c-muted))] max-w-md mx-auto">
              Set clear milestones for your semester GPA, career applications, reading lists, or major personal projects.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-[#7A2E4A] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Goal</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGoals.map((goal) => {
            const isCompleted = goal.status === 'completed';
            const course = goal.courseId ? courseMap.get(goal.courseId) : null;
            const catMeta = GOAL_CATEGORIES.find((c) => c.id === goal.category) || GOAL_CATEGORIES[0];
            const isExpanded = expandedGoalIds.has(goal.id);
            const totalMilestones = goal.milestones?.length || 0;
            const completedCount = goal.milestones?.filter((m) => m.isCompleted ?? m.completed).length || 0;

            return (
              <div
                key={goal.id}
                className={`ticket-border rounded-2xl p-4 sm:p-5 bg-[rgb(var(--c-surface))] transition hover:border-[#7A2E4A] space-y-3 ${
                  isCompleted ? 'opacity-80 bg-[rgb(var(--c-surface2))]/30' : ''
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-heading font-bold px-2 py-0.5 rounded-full border ${catMeta.badgeClass}`}>
                        {catMeta.label}
                      </span>

                      {course && (
                        <span className="text-[10px] font-heading font-semibold px-2 py-0.5 rounded-full bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] border border-[rgb(var(--c-border))] flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-[#7A2E4A]" />
                          <span>{course.code || course.name}</span>
                        </span>
                      )}

                      {goal.targetDate && (
                        <span className="text-[10px] text-[rgb(var(--c-muted))] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[rgb(var(--c-muted))]" />
                          <span>Target: {formatDisplayDate(goal.targetDate)}</span>
                        </span>
                      )}
                    </div>

                    <h3 className={`text-base font-heading font-bold text-[rgb(var(--c-text))] ${isCompleted ? 'line-through opacity-75' : ''}`}>
                      {goal.title}
                    </h3>

                    {goal.notes && (
                      <p className="text-xs text-[rgb(var(--c-muted))] line-clamp-2">
                        {goal.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleGoalStatus(goal)}
                      className={`min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-[rgb(var(--c-border))] transition ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                          : 'bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-emerald-600'
                      }`}
                      title={isCompleted ? 'Reopen goal' : 'Mark goal complete (+100 XP)'}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEditModal(goal)}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition"
                      title="Edit Goal"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setGoalToDelete(goal)}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-rose-600 transition"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-heading font-bold text-[rgb(var(--c-muted))] text-[11px]">
                      Progress
                    </span>
                    <span className="font-heading font-bold text-[rgb(var(--c-text))] text-[11px]">
                      {goal.progressPercent}% ({completedCount}/{totalMilestones} Milestones)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[rgb(var(--c-surface2))] overflow-hidden">
                    <div
                      className="h-full bg-[#7A2E4A] dark:bg-pink-400 transition-all duration-300 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, goal.progressPercent))}%` }}
                    />
                  </div>
                </div>

                {/* Milestone Checklist Container */}
                <div className="pt-1">
                  <button
                    onClick={() => toggleExpand(goal.id)}
                    className="flex items-center justify-between w-full py-1 text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition"
                  >
                    <span className="flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5 text-[#7A2E4A]" />
                      <span>Milestones ({totalMilestones})</span>
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {/* Expanded Milestone Items */}
                  {isExpanded && (
                    <div className="mt-2 pl-1 space-y-2 pt-2 border-t border-[rgb(var(--c-border))] animate-in fade-in duration-150">
                      {goal.milestones && goal.milestones.length > 0 ? (
                        goal.milestones.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-[rgb(var(--c-bg))] transition text-xs"
                          >
                            <button
                              onClick={() => handleToggleMilestone(goal, m.id)}
                              className="flex items-center gap-2 flex-1 text-left min-w-0"
                            >
                              {(m.isCompleted ?? m.completed) ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-[rgb(var(--c-muted))] shrink-0" />
                              )}
                              <span className={`truncate ${(m.isCompleted ?? m.completed) ? 'line-through text-[rgb(var(--c-muted))]' : 'text-[rgb(var(--c-text))]'}`}>
                                {m.title}
                              </span>
                            </button>
                            {(m.isCompleted ?? m.completed) && (
                              <span className="text-[10px] text-emerald-600 font-bold shrink-0">
                                +25 XP
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-[rgb(var(--c-muted))] py-1 italic">
                          No milestones added yet. Add key steps below.
                        </p>
                      )}

                      {/* Quick inline milestone add */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          value={inlineMilestoneInput[goal.id] || ''}
                          onChange={(e) =>
                            setInlineMilestoneInput((prev) => ({ ...prev, [goal.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddInlineMilestone(goal);
                            }
                          }}
                          placeholder="Add milestone step... (Press Enter)"
                          className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-1 focus:ring-[#7A2E4A]"
                        />
                        <button
                          onClick={() => handleAddInlineMilestone(goal)}
                          className="px-2.5 py-1 text-xs font-heading font-bold rounded-lg bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] border border-[rgb(var(--c-border))] hover:bg-[#7A2E4A] hover:text-white transition"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5 text-[rgb(var(--c-text))] my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <h3 className="text-base font-heading font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-[#7A2E4A]" />
                <span>{editingGoal ? 'Edit Semester Goal' : 'New Semester Goal'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4 pt-3 text-xs">
              <div>
                <label className="block font-heading font-bold mb-1">
                  Goal Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Maintain 3.8+ GPA / Complete Thesis Proposal"
                  className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-heading font-bold mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    {GOAL_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-heading font-bold mb-1">Linked Course (Optional)</label>
                  <select
                    value={formCourseId}
                    onChange={(e) => setFormCourseId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="">None (Personal / General)</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code ? `${c.code} - ${c.name}` : c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-heading font-bold mb-1">Target Completion Date (Optional)</label>
                <input
                  type="date"
                  value={formTargetDate}
                  onChange={(e) => setFormTargetDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
              </div>

              {/* Milestones Editor */}
              <div className="space-y-2">
                <label className="block font-heading font-bold">
                  Milestones Checklist
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {formMilestones.map((m, idx) => (
                    <div key={m.id} className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[rgb(var(--c-muted))] w-4">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={m.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormMilestones((prev) =>
                            prev.map((item) => (item.id === m.id ? { ...item, title: val } : item))
                          );
                        }}
                        placeholder="Milestone title..."
                        className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveMilestoneFromForm(m.id)}
                        className="p-1 text-rose-500 hover:text-rose-700 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={newMilestoneText}
                    onChange={(e) => setNewMilestoneText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMilestoneToForm();
                      }
                    }}
                    placeholder="Add new milestone... (Press Enter or Add)"
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                  <button
                    type="button"
                    onClick={handleAddMilestoneToForm}
                    className="px-3 py-1.5 rounded-xl bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] border border-[rgb(var(--c-border))] font-heading font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-heading font-bold mb-1">Notes &amp; Strategy</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Key resources, study plan, or motivation notes..."
                  className="w-full px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[#7A2E4A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgb(var(--c-border))]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[40px] px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-5 py-2 rounded-xl bg-[#7A2E4A] text-white font-heading font-bold hover:opacity-90 active:scale-95 transition shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingGoal ? 'Save Changes' : 'Create Goal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Goal Modal */}
      {goalToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5 text-[rgb(var(--c-text))] space-y-3">
            <h3 className="text-base font-heading font-bold">
              Delete Goal?
            </h3>
            <p className="text-xs text-[rgb(var(--c-muted))]">
              Are you sure you want to delete <strong className="text-[rgb(var(--c-text))]">{goalToDelete.title}</strong>? All milestone records for this goal will be removed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                className="min-h-[36px] px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] text-xs font-heading"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="min-h-[36px] px-4 py-1.5 rounded-xl bg-rose-600 text-white font-heading font-bold text-xs hover:bg-rose-700 active:scale-95 transition"
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
