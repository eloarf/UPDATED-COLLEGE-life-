import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { Project, ProjectMilestone, ProjectTask, ProjectMember, Course } from '../types';
import { getTodayKey, formatDisplayDate, addDaysToKey } from '../utils/dateUtils';
import { awardXp, reverseXp, triggerLevelUpConfetti } from '../services/rpgService';
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
  ChevronLeft,
  X,
  MessageSquare,
  Compass,
  Calendar,
  Award,
  AlertCircle,
  Trash2,
  Edit3,
  Flag,
  ArrowRight,
  TrendingUp,
  FolderGit2,
  CheckSquare,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const { showToast } = useUiStore();
  const todayKey = getTodayKey();

  // Navigation State: null = Project Overview, string = Individual Project Detail
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Overview Filter State
  const [overviewTab, setOverviewTab] = useState<'all' | 'in_progress' | 'unstarted' | 'completed'>('all');

  // Modals
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isNewMilestoneModalOpen, setIsNewMilestoneModalOpen] = useState(false);
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // New Project Form State
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [projectType, setProjectType] = useState<Project['type']>('group');
  const [projectStatus, setProjectStatus] = useState<Project['status']>('active');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(getTodayKey());
  const [weight, setWeight] = useState<number | ''>(20);

  // Edit Project Form State
  const [editTitle, setEditTitle] = useState('');
  const [editCourseId, setEditCourseId] = useState('');
  const [editType, setEditType] = useState<Project['type']>('group');
  const [editStatus, setEditStatus] = useState<Project['status']>('active');
  const [editDescription, setEditDescription] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editWeight, setEditWeight] = useState<number | ''>('');

  // Task & Milestone inputs
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskColumn, setNewTaskColumn] = useState<'backlog' | 'todo' | 'doing' | 'review' | 'done'>('todo');
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberContact, setNewMemberContact] = useState('');

  // Live queries
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const projects = useLiveQuery(() => db.projects.toArray()) || [];
  const milestones = useLiveQuery(() => db.projectMilestones.toArray()) || [];
  const projectTasks = useLiveQuery(() => db.projectTasks.toArray()) || [];
  const members = useLiveQuery(() => db.projectMembers.toArray()) || [];

  const courseMap = new Map<string, Course>();
  courses.forEach((c) => courseMap.set(c.id, c));

  // Determine active project for detail view
  const activeProject = selectedProjectId ? projects.find((p) => p.id === selectedProjectId) || null : null;

  const activeMilestones = activeProject
    ? milestones.filter((m) => m.projectId === activeProject.id).sort((a, b) => a.order - b.order)
    : [];

  const activeTasks = activeProject
    ? projectTasks.filter((t) => t.projectId === activeProject.id)
    : [];

  const activeMembers = activeProject
    ? members.filter((m) => m.projectId === activeProject.id)
    : [];

  // Helper to categorize projects
  const isUnstarted = (status: Project['status']) => status === 'idea' || status === 'planning';
  const isInProgress = (status: Project['status']) => status === 'active' || status === 'review';
  const isCompleted = (status: Project['status']) => status === 'submitted' || status === 'graded';

  const unstartedProjects = projects.filter((p) => isUnstarted(p.status));
  const inProgressProjects = projects.filter((p) => isInProgress(p.status));
  const completedProjects = projects.filter((p) => isCompleted(p.status));

  // Helper: calculate project progress percentage (0 - 100)
  const getProjectProgress = (projId: string) => {
    const projMilestones = milestones.filter((m) => m.projectId === projId);
    const projTasksList = projectTasks.filter((t) => t.projectId === projId);

    const totalItems = projMilestones.length + projTasksList.length;
    if (totalItems === 0) {
      const p = projects.find((item) => item.id === projId);
      if (p && isCompleted(p.status)) return 100;
      if (p && p.status === 'active') return 25;
      return 0;
    }

    const doneMilestones = projMilestones.filter((m) => m.isDone).length;
    const doneTasks = projTasksList.filter((t) => t.column === 'done').length;

    return Math.round(((doneMilestones + doneTasks) / totalItems) * 100);
  };

  // Helper: get relative deadline description
  const getDeadlineBadge = (dlDate?: string) => {
    if (!dlDate) return null;
    const today = new Date(todayKey).getTime();
    const target = new Date(dlDate).getTime();
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-heading font-bold text-red-600 bg-red-100 dark:bg-red-950/50 px-2 py-0.5 rounded-full">
          <AlertCircle className="w-3 h-3" /> Overdue by {Math.abs(diffDays)}d
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-heading font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
          <Clock className="w-3 h-3" /> Due Today!
        </span>
      );
    }
    if (diffDays === 1) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-heading font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
          <Clock className="w-3 h-3" /> Due Tomorrow
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-heading text-[rgb(var(--c-muted))] bg-[rgb(var(--c-surface2))] px-2 py-0.5 rounded-full">
        <Calendar className="w-3 h-3 text-[#4FA3A5]" /> {diffDays}d remaining ({formatDisplayDate(dlDate)})
      </span>
    );
  };

  // Status Badge Styling Helper
  const renderStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'idea':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700">Idea</span>;
      case 'planning':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800">Planning</span>;
      case 'active':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 border border-sky-300 dark:border-sky-800">In Progress</span>;
      case 'review':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-800">In Review</span>;
      case 'submitted':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">Submitted</span>;
      case 'graded':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-bold bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 border border-emerald-400">Graded</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-bold bg-stone-100 text-stone-700">{status}</span>;
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setTitle('');
    setCourseId('');
    setProjectType('group');
    setProjectStatus('active');
    setDescription('');
    setDeadline(addDaysToKey(getTodayKey(), 14));
    setWeight(20);
    setIsNewProjectModalOpen(true);
  };

  // Handle Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const projId = generateId();
    const now = new Date().toISOString();

    await db.projects.add({
      id: projId,
      title: title.trim(),
      courseId: courseId || undefined,
      type: projectType,
      description: description.trim(),
      status: projectStatus,
      startDate: todayKey,
      deadline: deadline || undefined,
      weight: typeof weight === 'number' ? weight : undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Create 3 structured starter milestones
    await db.projectMilestones.bulkPut([
      { id: generateId(), projectId: projId, title: 'Floor 1: Specifications & Architecture Design', isDone: false, order: 1 },
      { id: generateId(), projectId: projId, title: 'Floor 2: Core Engineering & Implementation', isDone: false, order: 2 },
      { id: generateId(), projectId: projId, title: 'Floor 3: Final Testing & Presentation', isDone: false, order: 3 },
    ]);

    setIsNewProjectModalOpen(false);
    setSelectedProjectId(projId);
    showToast('New project established! Navigated to detail view.', 'success');
  };

  // Handle Update Status for Active Project
  const handleUpdateStatus = async (newStatus: Project['status']) => {
    if (!activeProject) return;
    const now = new Date().toISOString();
    await db.projects.update(activeProject.id, {
      status: newStatus,
      updatedAt: now,
    });

    if (isCompleted(newStatus) && !isCompleted(activeProject.status)) {
      await awardXp({
        source: 'project_completion',
        sourceId: activeProject.id,
        amount: 150,
        stat: 'teamwork',
      });
      triggerLevelUpConfetti();
      showToast('Project completed! +150 Teamwork XP awarded!', 'success');
    } else {
      showToast(`Project moved to ${newStatus.toUpperCase()}`, 'info');
    }
  };

  // Toggle Milestone Completion
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
    } else {
      await reverseXp('project_milestone', milestone.id);
      showToast('Milestone returned to pending. -75 XP reversed.', 'info');
    }
  };

  // Add Milestone
  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim() || !activeProject) return;

    const nextOrder = activeMilestones.length + 1;
    await db.projectMilestones.add({
      id: generateId(),
      projectId: activeProject.id,
      title: newMilestoneTitle.trim(),
      isDone: false,
      order: nextOrder,
    });

    setNewMilestoneTitle('');
    setIsNewMilestoneModalOpen(false);
    showToast('New dungeon floor milestone added!', 'success');
  };

  // Delete Milestone
  const handleDeleteMilestone = async (milestone: ProjectMilestone) => {
    if (milestone.isDone) {
      await reverseXp('project_milestone', milestone.id);
    }
    await db.projectMilestones.delete(milestone.id);
    showToast('Milestone removed.', 'info');
  };

  // Move Task in Pipeline
  const handleMoveTask = async (taskId: string, targetCol: 'backlog' | 'todo' | 'doing' | 'review' | 'done') => {
    await db.projectTasks.update(taskId, { column: targetCol });
    showToast(`Task moved to ${targetCol.toUpperCase()}`, 'info');
  };

  // Create Task
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
    showToast('Task added to project pipeline.', 'success');
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    await db.projectTasks.delete(taskId);
    showToast('Task removed from pipeline.', 'info');
  };

  // Add Member
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !activeProject) return;

    await db.projectMembers.add({
      id: generateId(),
      projectId: activeProject.id,
      name: newMemberName.trim(),
      role: newMemberRole.trim() || 'Contributor',
      contact: newMemberContact.trim() || undefined,
      color: '#4FA3A5',
    });

    setNewMemberName('');
    setNewMemberRole('');
    setNewMemberContact('');
    setIsNewMemberModalOpen(false);
    showToast('Team guild member enlisted!', 'success');
  };

  // Delete Project
  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;
    const projId = projectToDelete.id;

    // Delete related items
    const relMilestones = await db.projectMilestones.where('projectId').equals(projId).toArray();
    for (const m of relMilestones) {
      if (m.isDone) await reverseXp('project_milestone', m.id);
    }
    if (isCompleted(projectToDelete.status)) {
      await reverseXp('project_completion', projId);
    }

    await db.projectMilestones.where('projectId').equals(projId).delete();
    await db.projectTasks.where('projectId').equals(projId).delete();
    await db.projectMembers.where('projectId').equals(projId).delete();
    await db.projects.delete(projId);

    setProjectToDelete(null);
    if (selectedProjectId === projId) {
      setSelectedProjectId(null);
    }
    showToast('Project deleted.', 'info');
  };

  // Copy Telegram Summary
  const handleCopyTelegramSummary = () => {
    if (!activeProject) return;
    const doneTasks = activeTasks.filter((t) => t.column === 'done').map((t) => `• ${t.title}`).join('\n');
    const inProgress = activeTasks.filter((t) => t.column === 'doing').map((t) => `• ${t.title}`).join('\n');
    const nextSteps = activeTasks.filter((t) => t.column === 'todo').map((t) => `• ${t.title}`).join('\n');
    const clearedFloors = activeMilestones.filter((m) => m.isDone).map((m) => `✓ ${m.title}`).join('\n');
    const remainingFloors = activeMilestones.filter((m) => !m.isDone).map((m) => `⏳ ${m.title}`).join('\n');

    const text =
      `📢 *${activeProject.title} — Status Update*\n` +
      `📌 Status: ${activeProject.status.toUpperCase()} | Progress: ${getProjectProgress(activeProject.id)}%\n` +
      `📅 Deadline: ${activeProject.deadline || 'TBA'}\n\n` +
      (clearedFloors ? `🏆 *Cleared Milestones:*\n${clearedFloors}\n\n` : '') +
      (remainingFloors ? `🎯 *Pending Milestones:*\n${remainingFloors}\n\n` : '') +
      `⚡ *Currently Doing:*\n${inProgress || 'None in active work'}\n\n` +
      `✅ *Completed Tasks:*\n${doneTasks || 'None yet'}\n\n` +
      `📋 *Next Queue:*\n${nextSteps || 'None'}\n\n` +
      `Generated via College Life OS`;

    navigator.clipboard.writeText(text);
    showToast('Telegram / WhatsApp update copied to clipboard!', 'success');
  };

  // Open Edit Modal for Active Project
  const openEditModal = () => {
    if (!activeProject) return;
    setEditTitle(activeProject.title);
    setEditCourseId(activeProject.courseId || '');
    setEditType(activeProject.type);
    setEditStatus(activeProject.status);
    setEditDescription(activeProject.description || '');
    setEditDeadline(activeProject.deadline || '');
    setEditWeight(activeProject.weight ?? '');
    setIsEditProjectModalOpen(true);
  };

  const handleSaveEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !editTitle.trim()) return;

    await db.projects.update(activeProject.id, {
      title: editTitle.trim(),
      courseId: editCourseId || undefined,
      type: editType,
      status: editStatus,
      description: editDescription.trim(),
      deadline: editDeadline || undefined,
      weight: typeof editWeight === 'number' ? editWeight : undefined,
      updatedAt: new Date().toISOString(),
    });

    setIsEditProjectModalOpen(false);
    showToast('Project details updated.', 'success');
  };

  // Render Project Card for Overview
  const renderProjectCard = (p: Project) => {
    const course = p.courseId ? courseMap.get(p.courseId) : undefined;
    const progress = getProjectProgress(p.id);
    const pMilestones = milestones.filter((m) => m.projectId === p.id);
    const pTasks = projectTasks.filter((t) => t.projectId === p.id);
    const doneMilestones = pMilestones.filter((m) => m.isDone).length;
    const doneTasks = pTasks.filter((t) => t.column === 'done').length;

    return (
      <div
        key={p.id}
        onClick={() => setSelectedProjectId(p.id)}
        className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 cursor-pointer hover:border-[#4FA3A5] transition-all hover:shadow-xs group space-y-3 relative"
      >
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {course ? (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-heading font-bold text-white shadow-2xs"
                style={{ backgroundColor: course.color || '#4FA3A5' }}
              >
                {course.code}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-bold bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))]">
                General
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider bg-[#4FA3A5]/10 text-[#4FA3A5]">
              {p.type}
            </span>
            {renderStatusBadge(p.status)}
          </div>
          {getDeadlineBadge(p.deadline)}
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))] group-hover:text-[#4FA3A5] transition-colors">
            {p.title}
          </h3>
          {p.description && (
            <p className="text-xs text-[rgb(var(--c-muted))] line-clamp-2 mt-1 font-flourish">
              {p.description}
            </p>
          )}
        </div>

        {/* Progress Bar & Stats */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-heading">
            <span className="text-[rgb(var(--c-muted))]">Dungeon Completion</span>
            <span className="font-bold text-[rgb(var(--c-text))]">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-[rgb(var(--c-bg))] rounded-full overflow-hidden border border-[rgb(var(--c-border))] p-0.2">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress === 100 ? 'bg-emerald-500' : 'bg-[#4FA3A5]'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Bottom Metadata & Navigation CTA */}
        <div className="flex items-center justify-between pt-2 border-t border-[rgb(var(--c-border))]/60 text-xs text-[rgb(var(--c-muted))]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-heading text-[11px]">
              <Layers className="w-3.5 h-3.5 text-[#4FA3A5]" />
              <span>{doneMilestones}/{pMilestones.length} Floors</span>
            </span>
            <span className="flex items-center gap-1 font-heading text-[11px]">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>{doneTasks}/{pTasks.length} Tasks</span>
            </span>
            {p.weight && (
              <span className="text-[11px] font-heading text-[rgb(var(--c-muted))]">
                Weight: {p.weight}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 font-heading font-bold text-xs text-[#4FA3A5] group-hover:translate-x-1 transition-transform">
            <span>Open Detail</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // VIEW: INDIVIDUAL PROJECT DETAIL
  // ==========================================
  if (activeProject) {
    const course = activeProject.courseId ? courseMap.get(activeProject.courseId) : undefined;
    const progress = getProjectProgress(activeProject.id);
    const isProjComplete = isCompleted(activeProject.status);

    return (
      <div className="space-y-6 pb-24 animate-pop">
        {/* Navigation Breadcrumb & Back Button */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => setSelectedProjectId(null)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] hover:border-[#4FA3A5] font-heading font-bold text-xs shadow-2xs hover:shadow-xs transition active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-[#4FA3A5]" />
            <span>← Back to All Projects</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTelegramSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-2xs cursor-pointer"
              title="Copy formatted status report for Telegram or WhatsApp group chat"
            >
              <Share2 className="w-3.5 h-3.5 text-[#4FA3A5]" />
              <span>Share Status</span>
            </button>
            <button
              onClick={openEditModal}
              className="p-1.5 rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] transition cursor-pointer"
              title="Edit Project Details"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setProjectToDelete(activeProject)}
              className="p-1.5 rounded-full border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-600 hover:bg-red-100 transition cursor-pointer"
              title="Delete Project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Project Hero Banner & Header */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {course ? (
                  <span
                    className="px-2.5 py-0.5 rounded-full text-xs font-heading font-bold text-white shadow-2xs"
                    style={{ backgroundColor: course.color || '#4FA3A5' }}
                  >
                    {course.code} — {course.name}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-heading font-bold bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))]">
                    General Project
                  </span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-heading font-bold uppercase tracking-wider bg-[#4FA3A5]/10 text-[#4FA3A5]">
                  {activeProject.type} Project
                </span>
                {renderStatusBadge(activeProject.status)}
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[rgb(var(--c-text))] pt-1">
                {activeProject.title}
              </h1>
            </div>

            {/* Quick Completion / Reopen CTA */}
            <div className="shrink-0">
              {isProjComplete ? (
                <button
                  onClick={() => handleUpdateStatus('active')}
                  className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:bg-[rgb(var(--c-bg))] transition flex items-center gap-1.5"
                >
                  <RotateIcon />
                  <span>Reopen Project</span>
                </button>
              ) : (
                <button
                  onClick={() => handleUpdateStatus('submitted')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-heading text-xs font-bold shadow-xs hover:shadow-sm active:scale-95 transition flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Complete (+150 XP)</span>
                </button>
              )}
            </div>
          </div>

          {/* Project Description */}
          {activeProject.description && (
            <div className="p-3.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs text-[rgb(var(--c-text))] font-flourish">
              {activeProject.description}
            </div>
          )}

          {/* Pipeline Stepper: Idea -> Planning -> Active -> Review -> Completed */}
          <div className="pt-2">
            <div className="text-[11px] font-heading font-bold uppercase tracking-wider text-[rgb(var(--c-muted))] mb-2 flex items-center justify-between">
              <span>Pipeline Stage Progression</span>
              <span className="text-[#4FA3A5]">{progress}% Cleared</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {[
                { key: 'idea', label: '1. Idea' },
                { key: 'planning', label: '2. Planning' },
                { key: 'active', label: '3. In Progress' },
                { key: 'review', label: '4. Review' },
                { key: 'submitted', label: '5. Completed' },
              ].map((step) => {
                const isCurrent = activeProject.status === step.key || (step.key === 'submitted' && activeProject.status === 'graded');
                return (
                  <button
                    key={step.key}
                    onClick={() => handleUpdateStatus(step.key as Project['status'])}
                    className={`py-2 px-1 text-center rounded-xl border text-[10px] sm:text-xs font-heading font-bold transition cursor-pointer truncate ${
                      isCurrent
                        ? 'border-[#4FA3A5] bg-[#4FA3A5] text-white shadow-xs ring-2 ring-[#4FA3A5]/30'
                        : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:border-[#4FA3A5]'
                    }`}
                  >
                    {step.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress Bar & Key Stats */}
          <div className="space-y-1.5 pt-1">
            <div className="w-full h-2.5 bg-[rgb(var(--c-bg))] rounded-full overflow-hidden border border-[rgb(var(--c-border))] p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress === 100 ? 'bg-emerald-500' : 'bg-[#4FA3A5]'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-[rgb(var(--c-muted))] font-heading pt-1 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                {activeProject.deadline && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#4FA3A5]" />
                    <span>Deadline: {formatDisplayDate(activeProject.deadline)}</span>
                  </span>
                )}
                {activeProject.weight && (
                  <span>Academic Weight: {activeProject.weight}% of Course Grade</span>
                )}
              </div>
              <div>{getDeadlineBadge(activeProject.deadline)}</div>
            </div>
          </div>
        </div>

        {/* Section 1: Dungeon Floors (Milestones) */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#4FA3A5]/15 text-[#4FA3A5] flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                  Dungeon Floors &amp; Key Milestones
                </h3>
                <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                  Clear floors in sequence to progress through the dungeon (+75 Teamwork XP per floor)
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsNewMilestoneModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#4FA3A5] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Floor</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {activeMilestones.length === 0 ? (
              <div className="p-4 text-center rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs text-[rgb(var(--c-muted))] font-flourish">
                No dungeon floor milestones defined yet. Click &quot;Add Floor&quot; to establish your deliverables.
              </div>
            ) : (
              activeMilestones.map((m, idx) => (
                <div
                  key={m.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition group ${
                    m.isDone
                      ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[#4FA3A5]'
                  }`}
                >
                  <div
                    onClick={() => handleToggleMilestone(m)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    {m.isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-stone-400 group-hover:text-[#4FA3A5] shrink-0 transition" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs sm:text-sm font-heading font-bold truncate ${
                          m.isDone ? 'line-through text-[rgb(var(--c-muted))]' : 'text-[rgb(var(--c-text))]'
                        }`}
                      >
                        {m.title}
                      </div>
                      <div className="text-[10px] text-[rgb(var(--c-muted))] font-heading">
                        Dungeon Floor #{idx + 1} {m.isDone ? '• Cleared' : '• In Progress'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-2 shrink-0">
                    <span className="text-[10px] font-heading font-bold text-[rgb(var(--c-xp))]">
                      +75 XP
                    </span>
                    <button
                      onClick={() => handleDeleteMilestone(m)}
                      className="p-1 text-[rgb(var(--c-muted))] hover:text-red-500 opacity-60 group-hover:opacity-100 transition cursor-pointer"
                      title="Delete Floor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 2: Touch-Safe Execution Kanban Pipeline */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#4FA3A5]/15 text-[#4FA3A5] flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                  Execution Pipeline Kanban
                </h3>
                <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                  Move granular subtasks across the four pipeline stations
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#4FA3A5] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {(['todo', 'doing', 'review', 'done'] as const).map((col) => {
              const colTasks = activeTasks.filter((t) => t.column === col);
              const colLabels: Record<string, string> = {
                todo: 'To Do',
                doing: 'In Progress',
                review: 'Review',
                done: 'Done',
              };

              return (
                <div
                  key={col}
                  className="p-3.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2.5 flex flex-col min-h-[160px]"
                >
                  <div className="flex items-center justify-between text-xs font-heading font-bold uppercase tracking-wider text-[rgb(var(--c-muted))]">
                    <span>{colLabels[col]}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[10px] text-[rgb(var(--c-text))]">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1">
                    {colTasks.length === 0 ? (
                      <div className="h-full min-h-[60px] flex items-center justify-center text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                        Empty station
                      </div>
                    ) : (
                      colTasks.map((t) => (
                        <div
                          key={t.id}
                          className="p-2.5 rounded-xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                              {t.title}
                            </span>
                            <button
                              onClick={() => handleDeleteTask(t.id)}
                              className="text-[rgb(var(--c-muted))] hover:text-red-500 p-0.5 transition cursor-pointer"
                              title="Delete task"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Quick Move Buttons */}
                          <div className="flex items-center justify-between pt-1 border-t border-[rgb(var(--c-border))]/60 text-[9px] text-[rgb(var(--c-muted))]">
                            <span className="font-heading">Move:</span>
                            <div className="flex gap-1 flex-wrap">
                              {col !== 'todo' && (
                                <button
                                  onClick={() => handleMoveTask(t.id, 'todo')}
                                  className="px-1.5 py-0.5 rounded bg-[rgb(var(--c-surface2))] hover:bg-[#4FA3A5] hover:text-white transition cursor-pointer"
                                >
                                  To Do
                                </button>
                              )}
                              {col !== 'doing' && (
                                <button
                                  onClick={() => handleMoveTask(t.id, 'doing')}
                                  className="px-1.5 py-0.5 rounded bg-[rgb(var(--c-surface2))] hover:bg-[#4FA3A5] hover:text-white transition cursor-pointer"
                                >
                                  Doing
                                </button>
                              )}
                              {col !== 'review' && (
                                <button
                                  onClick={() => handleMoveTask(t.id, 'review')}
                                  className="px-1.5 py-0.5 rounded bg-[rgb(var(--c-surface2))] hover:bg-purple-600 hover:text-white transition cursor-pointer"
                                >
                                  Review
                                </button>
                              )}
                              {col !== 'done' && (
                                <button
                                  onClick={() => handleMoveTask(t.id, 'done')}
                                  className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-600 hover:text-white transition cursor-pointer font-bold"
                                >
                                  Done
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Guild Members (Teammates) */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#4FA3A5]/15 text-[#4FA3A5] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                  Guild Companions &amp; Team Members
                </h3>
                <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                  Assigned teammates, contacts and guild roles
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsNewMemberModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:border-[#4FA3A5] transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Teammate</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {activeMembers.length === 0 ? (
              <div className="sm:col-span-3 p-4 text-center rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs text-[rgb(var(--c-muted))] font-flourish">
                Solo expedition or no comrades logged yet. Add your team members above!
              </div>
            ) : (
              activeMembers.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold text-xs text-white shrink-0"
                      style={{ backgroundColor: m.color || '#4FA3A5' }}
                    >
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))] truncate">
                        {m.name}
                      </div>
                      <div className="text-[10px] text-[rgb(var(--c-muted))] truncate">
                        {m.role} {m.contact ? `• ${m.contact}` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => db.projectMembers.delete(m.id)}
                    className="text-[rgb(var(--c-muted))] hover:text-red-500 p-1 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modals for Detail View */}
        {renderDetailModals()}
      </div>
    );
  }

  // ==========================================
  // VIEW: PROJECT OVERVIEW (DEFAULT)
  // ==========================================
  return (
    <div className="space-y-6 pb-24 animate-pop">
      {/* Overview Top Header Banner */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#4FA3A5] font-bold flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              <span>Project Management Command &amp; Dungeons</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-[rgb(var(--c-text))] tracking-wide">
              Academic Projects &amp; Guild Endeavors
            </h1>
            <p className="text-xs sm:text-sm text-[rgb(var(--c-muted))] font-flourish">
              Track multi-stage milestones, Kanban execution pipelines &amp; group team deliverables
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#4FA3A5] hover:opacity-95 text-white font-heading text-xs font-bold shadow-xs hover:shadow-sm active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Project</span>
            </button>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[rgb(var(--c-border))]/60">
          <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
            <div className="text-[10px] font-heading text-[rgb(var(--c-muted))] uppercase font-bold">
              Total Endeavors
            </div>
            <div className="text-xl font-heading font-bold text-[rgb(var(--c-text))] mt-0.5">
              {projects.length}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
            <div className="text-[10px] font-heading text-sky-600 dark:text-sky-400 uppercase font-bold">
              In Progress
            </div>
            <div className="text-xl font-heading font-bold text-sky-600 dark:text-sky-400 mt-0.5">
              {inProgressProjects.length}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
            <div className="text-[10px] font-heading text-amber-600 dark:text-amber-400 uppercase font-bold">
              Unstarted / Planning
            </div>
            <div className="text-xl font-heading font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {unstartedProjects.length}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
            <div className="text-[10px] font-heading text-emerald-600 dark:text-emerald-400 uppercase font-bold">
              Completed
            </div>
            <div className="text-xl font-heading font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {completedProjects.length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'all', label: `All Projects (${projects.length})` },
          { key: 'in_progress', label: `In Progress (${inProgressProjects.length})` },
          { key: 'unstarted', label: `Unstarted (${unstartedProjects.length})` },
          { key: 'completed', label: `Completed (${completedProjects.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setOverviewTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-heading font-bold border transition whitespace-nowrap cursor-pointer ${
              overviewTab === tab.key
                ? 'border-[#4FA3A5] bg-[#4FA3A5] text-white shadow-xs'
                : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] hover:border-[#4FA3A5]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Sections */}
      {projects.length === 0 ? (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#4FA3A5]/15 text-[#4FA3A5] mx-auto flex items-center justify-center">
            <FolderGit2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
              No Projects Registered Yet
            </h3>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish max-w-sm mx-auto mt-1">
              Create your first team dungeon, research proposal, or engineering term assignment.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-2xl bg-[#4FA3A5] text-white font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition"
          >
            + Create First Project
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: IN PROGRESS / PENDING */}
          {(overviewTab === 'all' || overviewTab === 'in_progress') && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-sky-500 animate-pulse" />
                  <h2 className="text-sm font-heading font-bold uppercase tracking-wider text-[rgb(var(--c-text))]">
                    In Progress &amp; Active Dungeons
                  </h2>
                </div>
                <span className="text-xs font-heading font-bold text-sky-600 dark:text-sky-400">
                  {inProgressProjects.length} active
                </span>
              </div>

              {inProgressProjects.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-center text-xs text-[rgb(var(--c-muted))] font-flourish">
                  No active projects currently underway.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inProgressProjects.map(renderProjectCard)}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: UNSTARTED / PLANNING */}
          {(overviewTab === 'all' || overviewTab === 'unstarted') && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <h2 className="text-sm font-heading font-bold uppercase tracking-wider text-[rgb(var(--c-text))]">
                    Unstarted &amp; Planning Phase
                  </h2>
                </div>
                <span className="text-xs font-heading font-bold text-amber-600 dark:text-amber-400">
                  {unstartedProjects.length} queued
                </span>
              </div>

              {unstartedProjects.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-center text-xs text-[rgb(var(--c-muted))] font-flourish">
                  No unstarted or planning projects.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {unstartedProjects.map(renderProjectCard)}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: COMPLETED */}
          {(overviewTab === 'all' || overviewTab === 'completed') && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <h2 className="text-sm font-heading font-bold uppercase tracking-wider text-[rgb(var(--c-text))]">
                    Completed &amp; Submitted Archives
                  </h2>
                </div>
                <span className="text-xs font-heading font-bold text-emerald-600 dark:text-emerald-400">
                  {completedProjects.length} completed
                </span>
              </div>

              {completedProjects.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-center text-xs text-[rgb(var(--c-muted))] font-flourish">
                  No completed projects yet. Advance tasks to clear projects!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedProjects.map(renderProjectCard)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      {isNewProjectModalOpen && renderCreateModal()}

      {/* Delete Confirmation Modal */}
      {projectToDelete && renderDeleteModal()}
    </div>
  );

  // ==========================================
  // HELPER MODAL RENDERERS
  // ==========================================
  function renderCreateModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-primary))] rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#4FA3A5]/15 text-[#4FA3A5] flex items-center justify-center">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-[rgb(var(--c-text))]">
                  Commission New Project
                </h3>
                <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                  Establish objectives, academic affiliation and pipeline
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsNewProjectModalOpen(false)}
              className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateProject} className="space-y-3.5">
            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                Project Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Autonomous Line-Follower Rover"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:border-[#4FA3A5] focus:outline-none"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                  Course
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:border-[#4FA3A5] focus:outline-none"
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
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                  Project Type
                </label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:border-[#4FA3A5] focus:outline-none"
                >
                  <option value="group">Group Project</option>
                  <option value="assignment">Term Assignment</option>
                  <option value="lab">Lab Project</option>
                  <option value="research">Research Proposal</option>
                  <option value="final">Final Capstone</option>
                  <option value="design">Design Studio</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                  Initial Status
                </label>
                <select
                  value={projectStatus}
                  onChange={(e) => setProjectStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:border-[#4FA3A5] focus:outline-none"
                >
                  <option value="planning">Planning (Unstarted)</option>
                  <option value="idea">Idea (Unstarted)</option>
                  <option value="active">Active (In Progress)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                  Submission Deadline
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:border-[#4FA3A5] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                Description &amp; Deliverables
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Core objectives, system architecture, expected deliverables..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:border-[#4FA3A5] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                Academic Weight (% of final course grade)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={weight === '' || isNaN(Number(weight)) ? '' : weight}
                onChange={(e) => {
                  const val = e.target.value;
                  setWeight(val === '' ? '' : isNaN(Number(val)) ? '' : Number(val));
                }}
                placeholder="e.g. 25"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:border-[#4FA3A5] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[rgb(var(--c-border))]">
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] text-xs font-heading"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#4FA3A5] text-white font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition"
              >
                Construct Project Dungeon
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderDeleteModal() {
    if (!projectToDelete) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-red-400 rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-[rgb(var(--c-text))]">
                Delete Project?
              </h3>
              <p className="text-xs text-[rgb(var(--c-muted))]">
                This will delete &ldquo;{projectToDelete.title}&rdquo; and its milestones.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setProjectToDelete(null)}
              className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading text-[rgb(var(--c-muted))]"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDeleteProject}
              className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-heading font-bold hover:bg-red-700 transition"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderDetailModals() {
    return (
      <>
        {/* Edit Project Modal */}
        {isEditProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-primary))] rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
                <div className="font-heading text-base font-bold text-[rgb(var(--c-text))]">
                  Edit Project Details
                </div>
                <button onClick={() => setIsEditProjectModalOpen(false)}>
                  <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
                </button>
              </div>

              <form onSubmit={handleSaveEditProject} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                      Course
                    </label>
                    <select
                      value={editCourseId}
                      onChange={(e) => setEditCourseId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    >
                      <option value="">General Project</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                      Type
                    </label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    >
                      <option value="group">Group Project</option>
                      <option value="assignment">Assignment</option>
                      <option value="lab">Lab</option>
                      <option value="research">Research</option>
                      <option value="final">Final Capstone</option>
                      <option value="design">Design Studio</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                      Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    >
                      <option value="idea">Idea</option>
                      <option value="planning">Planning</option>
                      <option value="active">Active</option>
                      <option value="review">Review</option>
                      <option value="submitted">Submitted</option>
                      <option value="graded">Graded</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
                  <button
                    type="button"
                    onClick={() => setIsEditProjectModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#4FA3A5] text-white text-xs font-heading font-bold"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Milestone Modal */}
        {isNewMilestoneModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-primary))] rounded-3xl shadow-2xl p-5 text-[rgb(var(--c-text))] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
                <div className="font-heading text-sm font-bold">Add Dungeon Floor Milestone</div>
                <button onClick={() => setIsNewMilestoneModalOpen(false)}>
                  <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
                </button>
              </div>

              <form onSubmit={handleCreateMilestone} className="space-y-3">
                <div>
                  <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Milestone Title *
                  </label>
                  <input
                    type="text"
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    placeholder="e.g. Floor 4: Final Benchmarking & Stress Testing"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewMilestoneModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#4FA3A5] text-white text-xs font-heading font-bold"
                  >
                    Add Floor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Task Modal */}
        {isNewTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-primary))] rounded-3xl shadow-2xl p-5 text-[rgb(var(--c-text))] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
                <div className="font-heading text-sm font-bold">Add Task to Pipeline</div>
                <button onClick={() => setIsNewTaskModalOpen(false)}>
                  <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3">
                <div>
                  <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g. Solder motor driver pin headers"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Pipeline Station
                  </label>
                  <select
                    value={newTaskColumn}
                    onChange={(e) => setNewTaskColumn(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="todo">To Do</option>
                    <option value="doing">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewTaskModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#4FA3A5] text-white text-xs font-heading font-bold"
                  >
                    Add to Pipeline
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {isNewMemberModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-primary))] rounded-3xl shadow-2xl p-5 text-[rgb(var(--c-text))] space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
                <div className="font-heading text-sm font-bold">Enlist Guild Teammate</div>
                <button onClick={() => setIsNewMemberModalOpen(false)}>
                  <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
                </button>
              </div>

              <form onSubmit={handleCreateMember} className="space-y-3">
                <div>
                  <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Teammate Name *
                  </label>
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="e.g. Henok"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Guild Role
                  </label>
                  <input
                    type="text"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    placeholder="e.g. Hardware & Soldering"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Contact / Telegram Handle
                  </label>
                  <input
                    type="text"
                    value={newMemberContact}
                    onChange={(e) => setNewMemberContact(e.target.value)}
                    placeholder="e.g. @henok_dev or phone"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewMemberModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#4FA3A5] text-white text-xs font-heading font-bold"
                  >
                    Enlist Teammate
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {projectToDelete && renderDeleteModal()}
      </>
    );
  }
};

function RotateIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  );
}
