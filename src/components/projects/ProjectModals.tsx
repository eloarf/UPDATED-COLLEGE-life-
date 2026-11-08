import React from 'react';
import { X, FolderGit2, Trash2 } from 'lucide-react';
import { Project, Course, ProjectTask } from '../../types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  setTitle: (t: string) => void;
  courseId: string;
  setCourseId: (c: string) => void;
  courses: Course[];
  projectType: Project['type'];
  setProjectType: (t: Project['type']) => void;
  projectStatus: Project['status'];
  setProjectStatus: (s: Project['status']) => void;
  description: string;
  setDescription: (d: string) => void;
  deadline: string;
  setDeadline: (dl: string) => void;
  weight: number | '';
  setWeight: (w: number | '') => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  title,
  setTitle,
  courseId,
  setCourseId,
  courses,
  projectType,
  setProjectType,
  projectStatus,
  setProjectStatus,
  description,
  setDescription,
  deadline,
  setDeadline,
  weight,
  setWeight,
  onSubmit,
}) => {
  if (!isOpen) return null;

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
            onClick={onClose}
            className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5">
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
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] text-xs font-heading cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#4FA3A5] text-white font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition cursor-pointer"
            >
              Construct Project Dungeon
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTitle: string;
  setEditTitle: (t: string) => void;
  editCourseId: string;
  setEditCourseId: (c: string) => void;
  courses: Course[];
  editType: Project['type'];
  setEditType: (t: Project['type']) => void;
  editStatus: Project['status'];
  setEditStatus: (s: Project['status']) => void;
  editDescription: string;
  setEditDescription: (d: string) => void;
  editDeadline: string;
  setEditDeadline: (dl: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  editTitle,
  setEditTitle,
  editCourseId,
  setEditCourseId,
  courses,
  editType,
  setEditType,
  editStatus,
  setEditStatus,
  editDescription,
  setEditDescription,
  editDeadline,
  setEditDeadline,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-primary))] rounded-3xl shadow-2xl p-6 text-[rgb(var(--c-text))] space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
          <div className="font-heading text-base font-bold text-[rgb(var(--c-text))]">
            Edit Project Details
          </div>
          <button onClick={onClose} className="cursor-pointer">
            <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5">
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
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#4FA3A5] text-white text-xs font-heading font-bold cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AddMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  setTitle: (t: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AddMilestoneModal: React.FC<AddMilestoneModalProps> = ({
  isOpen,
  onClose,
  title,
  setTitle,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-primary))] rounded-3xl shadow-2xl p-5 text-[rgb(var(--c-text))] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
          <div className="font-heading text-sm font-bold">Add Dungeon Floor Milestone</div>
          <button onClick={onClose} className="cursor-pointer">
            <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
              Milestone Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Floor 4: Final Benchmarking & Stress Testing"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
              required
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#4FA3A5] text-white text-xs font-heading font-bold cursor-pointer"
            >
              Add Floor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  setTitle: (t: string) => void;
  column: ProjectTask['column'];
  setColumn: (c: ProjectTask['column']) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  title,
  setTitle,
  column,
  setColumn,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-primary))] rounded-3xl shadow-2xl p-5 text-[rgb(var(--c-text))] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
          <div className="font-heading text-sm font-bold">Add Task to Pipeline</div>
          <button onClick={onClose} className="cursor-pointer">
            <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              value={column}
              onChange={(e) => setColumn(e.target.value as any)}
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
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#4FA3A5] text-white text-xs font-heading font-bold cursor-pointer"
            >
              Add to Pipeline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  setName: (n: string) => void;
  role: string;
  setRole: (r: string) => void;
  contact: string;
  setContact: (c: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  name,
  setName,
  role,
  setRole,
  contact,
  setContact,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-primary))] rounded-3xl shadow-2xl p-5 text-[rgb(var(--c-text))] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
          <div className="font-heading text-sm font-bold">Enlist Guild Teammate</div>
          <button onClick={onClose} className="cursor-pointer">
            <X className="w-4 h-4 text-[rgb(var(--c-muted))]" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
              Teammate Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={role}
              onChange={(e) => setRole(e.target.value)}
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
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. @henok_dev or phone"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#4FA3A5] text-white text-xs font-heading font-bold cursor-pointer"
            >
              Enlist Teammate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DeleteProjectModalProps {
  project: Project | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({
  project,
  onCancel,
  onConfirm,
}) => {
  if (!project) return null;

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
              This will delete &ldquo;{project.title}&rdquo; and its milestones.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading text-[rgb(var(--c-muted))] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-heading font-bold hover:bg-red-700 transition cursor-pointer"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
};
