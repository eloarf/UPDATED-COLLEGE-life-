import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { Project, ProjectMilestone, ProjectTask, Course } from '../types';
import { getTodayKey, formatDisplayDate, addDaysToKey } from '../utils/dateUtils';
import { awardXp, reverseXp, triggerLevelUpConfetti } from '../services/rpgService';
import { generateId } from '../utils/idGenerator';
import {
  Layers,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  FolderGit2,
} from 'lucide-react';

import { ProjectCard } from '../components/projects/ProjectCard';
import { ProjectDetailHero } from '../components/projects/ProjectDetailHero';
import { ProjectMilestonesSection } from '../components/projects/ProjectMilestonesSection';
import { ProjectKanbanBoard } from '../components/projects/ProjectKanbanBoard';
import { ProjectTeamSection } from '../components/projects/ProjectTeamSection';
import {
  CreateProjectModal,
  EditProjectModal,
  AddMilestoneModal,
  AddTaskModal,
  AddMemberModal,
  DeleteProjectModal,
} from '../components/projects/ProjectModals';

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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newId = generateId();
    await db.projects.add({
      id: newId,
      title: title.trim(),
      courseId: courseId || undefined,
      type: projectType,
      status: projectStatus,
      description: description.trim(),
      deadline: deadline || undefined,
      weight: weight === '' ? undefined : Number(weight),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const defaultMilestones = [
      'Problem Formulation & Architecture Design',
      'Sprint 1: Core Implementation & Prototype',
      'Testing, Benchmarking & Peer Review',
      'Final Artifact Packaging & Submission',
    ];

    for (let i = 0; i < defaultMilestones.length; i++) {
      await db.projectMilestones.add({
        id: generateId(),
        projectId: newId,
        title: defaultMilestones[i],
        isDone: false,
        order: i,
      });
    }

    await awardXp({
      source: 'project_creation',
      sourceId: newId,
      amount: 40,
      stat: 'teamwork',
    });

    showToast('Project commissioned! Default milestones generated.', 'success');
    setIsNewProjectModalOpen(false);
    setSelectedProjectId(newId);
  };

  const openEditModal = () => {
    if (!activeProject) return;
    setEditTitle(activeProject.title);
    setEditCourseId(activeProject.courseId || '');
    setEditType(activeProject.type);
    setEditStatus(activeProject.status);
    setEditDescription(activeProject.description || '');
    setEditDeadline(activeProject.deadline || '');
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
      updatedAt: new Date().toISOString(),
    });

    showToast('Project updated successfully.', 'success');
    setIsEditProjectModalOpen(false);
  };

  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete) return;
    const pId = projectToDelete.id;

    await db.projectMilestones.where('projectId').equals(pId).delete();
    await db.projectTasks.where('projectId').equals(pId).delete();
    await db.projectMembers.where('projectId').equals(pId).delete();
    await db.projects.delete(pId);

    showToast(`Project "${projectToDelete.title}" and assets deleted.`, 'info');
    setProjectToDelete(null);
    if (selectedProjectId === pId) {
      setSelectedProjectId(null);
    }
  };

  const handleUpdateStatus = async (newStatus: Project['status']) => {
    if (!activeProject) return;
    const oldStatus = activeProject.status;
    await db.projects.update(activeProject.id, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    if (!isCompleted(oldStatus) && isCompleted(newStatus)) {
      triggerLevelUpConfetti();
      await awardXp({
        source: 'project_completion',
        sourceId: activeProject.id,
        amount: 150,
        stat: 'teamwork',
      });
      showToast(`🏆 Project completed! +150 Teamwork XP awarded.`, 'success');
    } else {
      showToast(`Status updated to "${newStatus}".`, 'info');
    }
  };

  const handleToggleMilestone = async (m: ProjectMilestone) => {
    const nextDone = !m.isDone;
    await db.projectMilestones.update(m.id, { isDone: nextDone });

    if (nextDone) {
      await awardXp({
        source: 'milestone_done',
        sourceId: m.id,
        amount: 75,
        stat: 'teamwork',
      });
      showToast('Floor milestone completed! +75 Teamwork XP', 'success');
    } else {
      await reverseXp('milestone_done', m.id);
      showToast('Milestone reopened.', 'info');
    }
  };

  const handleDeleteMilestone = async (m: ProjectMilestone) => {
    await db.projectMilestones.delete(m.id);
    showToast('Milestone floor removed.', 'info');
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newMilestoneTitle.trim()) return;

    await db.projectMilestones.add({
      id: generateId(),
      projectId: activeProject.id,
      title: newMilestoneTitle.trim(),
      isDone: false,
      order: activeMilestones.length,
    });

    setNewMilestoneTitle('');
    setIsNewMilestoneModalOpen(false);
    showToast('New milestone floor established!', 'success');
  };

  const handleMoveTask = async (taskId: string, col: ProjectTask['column']) => {
    await db.projectTasks.update(taskId, { column: col });
    if (col === 'done') {
      await awardXp({
        source: 'project_task_done',
        sourceId: taskId,
        amount: 25,
        stat: 'creativity',
      });
      showToast('Subtask complete! +25 Creativity XP', 'success');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    await db.projectTasks.delete(taskId);
    showToast('Task removed from pipeline.', 'info');
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newTaskTitle.trim()) return;

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
    showToast('Task added to pipeline!', 'success');
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newMemberName.trim()) return;

    const colors = ['#4FA3A5', '#E07A5F', '#3D405B', '#81B29A', '#F2CC8F', '#9B5DE5'];
    const assignedColor = colors[activeMembers.length % colors.length];

    await db.projectMembers.add({
      id: generateId(),
      projectId: activeProject.id,
      name: newMemberName.trim(),
      role: newMemberRole.trim() || 'Contributor',
      contact: newMemberContact.trim() || undefined,
      color: assignedColor,
    });

    setNewMemberName('');
    setNewMemberRole('');
    setNewMemberContact('');
    setIsNewMemberModalOpen(false);
    showToast('Teammate enlisted to project guild!', 'success');
  };

  const handleCopyTelegramSummary = () => {
    if (!activeProject) return;
    const course = activeProject.courseId ? courseMap.get(activeProject.courseId) : undefined;
    const progress = getProjectProgress(activeProject.id);

    const doneFloors = activeMilestones.filter((m) => m.isDone).length;
    const doneTs = activeTasks.filter((t) => t.column === 'done').length;

    let text = `🚀 **PROJECT STATUS: ${activeProject.title.toUpperCase()}**\n`;
    if (course) text += `📚 Course: ${course.code} — ${course.name}\n`;
    text += `📊 Progress: ${progress}% cleared\n`;
    text += `🎯 Pipeline Stage: ${activeProject.status.toUpperCase()}\n`;
    if (activeProject.deadline) text += `⏰ Deadline: ${activeProject.deadline}\n`;
    text += `\n🏰 **Dungeon Floors:** ${doneFloors}/${activeMilestones.length} Cleared\n`;
    activeMilestones.forEach((m, idx) => {
      text += `  ${m.isDone ? '✅' : '⏳'} Floor ${idx + 1}: ${m.title}\n`;
    });

    text += `\n⚡ **Active Kanban Tasks:** ${doneTs}/${activeTasks.length} Done\n`;
    text += `👥 **Guild Team:** ${activeMembers.map((m) => m.name).join(', ') || 'Solo'}\n`;
    text += `\n_Generated from College Life OS (Local-first & Offline)_`;

    navigator.clipboard.writeText(text);
    showToast('Formatted summary copied to clipboard! Ready to paste into Telegram.', 'success');
  };

  // INDIVIDUAL PROJECT DETAIL VIEW
  if (activeProject) {
    const course = activeProject.courseId ? courseMap.get(activeProject.courseId) : undefined;
    const progress = getProjectProgress(activeProject.id);
    const isProjComplete = isCompleted(activeProject.status);

    return (
      <div className="space-y-6 pb-24 animate-pop">
        {/* Detail Hero Banner */}
        <ProjectDetailHero
          project={activeProject}
          course={course}
          progress={progress}
          isCompleted={isProjComplete}
          onBack={() => setSelectedProjectId(null)}
          onShareStatus={handleCopyTelegramSummary}
          onEdit={openEditModal}
          onDelete={() => setProjectToDelete(activeProject)}
          onUpdateStatus={handleUpdateStatus}
          renderStatusBadge={renderStatusBadge}
          getDeadlineBadge={getDeadlineBadge}
        />

        {/* Section 1: Dungeon Floors (Milestones) */}
        <ProjectMilestonesSection
          milestones={activeMilestones}
          onToggleMilestone={handleToggleMilestone}
          onDeleteMilestone={handleDeleteMilestone}
          onOpenAddMilestoneModal={() => setIsNewMilestoneModalOpen(true)}
        />

        {/* Section 2: Touch-Safe Execution Kanban Pipeline */}
        <ProjectKanbanBoard
          tasks={activeTasks}
          onMoveTask={handleMoveTask}
          onDeleteTask={handleDeleteTask}
          onOpenAddTaskModal={() => setIsNewTaskModalOpen(true)}
        />

        {/* Section 3: Guild Members (Teammates) */}
        <ProjectTeamSection
          members={activeMembers}
          onOpenAddMemberModal={() => setIsNewMemberModalOpen(true)}
          onDeleteMember={(id) => db.projectMembers.delete(id)}
        />

        {/* Modals for Detail View */}
        <EditProjectModal
          isOpen={isEditProjectModalOpen}
          onClose={() => setIsEditProjectModalOpen(false)}
          editTitle={editTitle}
          setEditTitle={setEditTitle}
          editCourseId={editCourseId}
          setEditCourseId={setEditCourseId}
          courses={courses}
          editType={editType}
          setEditType={setEditType}
          editStatus={editStatus}
          setEditStatus={setEditStatus}
          editDescription={editDescription}
          setEditDescription={setEditDescription}
          editDeadline={editDeadline}
          setEditDeadline={setEditDeadline}
          onSubmit={handleSaveEditProject}
        />

        <AddMilestoneModal
          isOpen={isNewMilestoneModalOpen}
          onClose={() => setIsNewMilestoneModalOpen(false)}
          title={newMilestoneTitle}
          setTitle={setNewMilestoneTitle}
          onSubmit={handleCreateMilestone}
        />

        <AddTaskModal
          isOpen={isNewTaskModalOpen}
          onClose={() => setIsNewTaskModalOpen(false)}
          title={newTaskTitle}
          setTitle={setNewTaskTitle}
          column={newTaskColumn}
          setColumn={setNewTaskColumn}
          onSubmit={handleCreateTask}
        />

        <AddMemberModal
          isOpen={isNewMemberModalOpen}
          onClose={() => setIsNewMemberModalOpen(false)}
          name={newMemberName}
          setName={setNewMemberName}
          role={newMemberRole}
          setRole={setNewMemberRole}
          contact={newMemberContact}
          setContact={setNewMemberContact}
          onSubmit={handleCreateMember}
        />

        <DeleteProjectModal
          project={projectToDelete}
          onCancel={() => setProjectToDelete(null)}
          onConfirm={handleConfirmDeleteProject}
        />
      </div>
    );
  }

  // OVERVIEW VIEW: ALL PROJECTS
  return (
    <div className="space-y-6 pb-24 animate-pop">
      {/* Overview Top Header Banner */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-heading uppercase tracking-wider text-[#4FA3A5] font-bold">
              <FolderGit2 className="w-4 h-4" />
              <span>Project Dungeons &amp; Team Quests</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))] mt-1">
              Academic Projects &amp; Lab Guilds
            </h1>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-0.5">
              Organize term assignments, group reports, capstones, and lab pipelines with clear milestones
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-2xl bg-[#4FA3A5] text-white font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Commission Project</span>
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 mt-4 border-t border-[rgb(var(--c-border))]/60">
          <div className="p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center">
            <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold block">
              In Progress
            </span>
            <span className="text-lg font-heading font-bold text-[#4FA3A5]">
              {inProgressProjects.length}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center">
            <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold block">
              Planning / Ideas
            </span>
            <span className="text-lg font-heading font-bold text-amber-500">
              {unstartedProjects.length}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center">
            <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold block">
              Completed
            </span>
            <span className="text-lg font-heading font-bold text-emerald-500">
              {completedProjects.length}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center">
            <span className="text-[10px] font-heading uppercase text-[rgb(var(--c-muted))] font-bold block">
              Total Dungeons
            </span>
            <span className="text-lg font-heading font-bold text-[rgb(var(--c-text))]">
              {projects.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'all', label: `All Projects (${projects.length})` },
          { key: 'in_progress', label: `In Progress (${inProgressProjects.length})` },
          { key: 'unstarted', label: `Planning (${unstartedProjects.length})` },
          { key: 'completed', label: `Completed (${completedProjects.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setOverviewTab(tab.key as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-heading font-bold whitespace-nowrap transition cursor-pointer ${
              overviewTab === tab.key
                ? 'bg-[#4FA3A5] text-white shadow-2xs'
                : 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-muted))] border border-[rgb(var(--c-border))] hover:border-[#4FA3A5]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Sections */}
      {projects.length === 0 ? (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-10 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#4FA3A5]/10 text-[#4FA3A5] flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))]">
            No Project Dungeons Commenced
          </h3>
          <p className="text-xs text-[rgb(var(--c-muted))] font-flourish max-w-sm mx-auto">
            Break down intimidating term projects into clear milestone floors and actionable kanban subtasks.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-2 px-5 py-2.5 rounded-2xl bg-[#4FA3A5] text-white font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Project</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: IN PROGRESS */}
          {(overviewTab === 'all' || overviewTab === 'in_progress') && inProgressProjects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
                <span>Active Expeditions ({inProgressProjects.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inProgressProjects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    course={p.courseId ? courseMap.get(p.courseId) : undefined}
                    progress={getProjectProgress(p.id)}
                    milestones={milestones}
                    tasks={projectTasks}
                    onSelectProject={setSelectedProjectId}
                    renderStatusBadge={renderStatusBadge}
                    getDeadlineBadge={getDeadlineBadge}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: UNSTARTED / PLANNING */}
          {(overviewTab === 'all' || overviewTab === 'unstarted') && unstartedProjects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
                <span>Planning &amp; Idea Stage ({unstartedProjects.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {unstartedProjects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    course={p.courseId ? courseMap.get(p.courseId) : undefined}
                    progress={getProjectProgress(p.id)}
                    milestones={milestones}
                    tasks={projectTasks}
                    onSelectProject={setSelectedProjectId}
                    renderStatusBadge={renderStatusBadge}
                    getDeadlineBadge={getDeadlineBadge}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: COMPLETED */}
          {(overviewTab === 'all' || overviewTab === 'completed') && completedProjects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-heading font-bold text-[rgb(var(--c-muted))] uppercase tracking-wider">
                <span>Completed Quests ({completedProjects.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedProjects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    course={p.courseId ? courseMap.get(p.courseId) : undefined}
                    progress={getProjectProgress(p.id)}
                    milestones={milestones}
                    tasks={projectTasks}
                    onSelectProject={setSelectedProjectId}
                    renderStatusBadge={renderStatusBadge}
                    getDeadlineBadge={getDeadlineBadge}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals for Overview */}
      <CreateProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        title={title}
        setTitle={setTitle}
        courseId={courseId}
        setCourseId={setCourseId}
        courses={courses}
        projectType={projectType}
        setProjectType={setProjectType}
        projectStatus={projectStatus}
        setProjectStatus={setProjectStatus}
        description={description}
        setDescription={setDescription}
        deadline={deadline}
        setDeadline={setDeadline}
        weight={weight}
        setWeight={setWeight}
        onSubmit={handleCreateProject}
      />

      <DeleteProjectModal
        project={projectToDelete}
        onCancel={() => setProjectToDelete(null)}
        onConfirm={handleConfirmDeleteProject}
      />
    </div>
  );
};
