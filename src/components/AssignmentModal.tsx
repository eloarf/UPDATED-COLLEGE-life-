import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, BookOpen, AlertCircle, Trash2, ExternalLink } from 'lucide-react';
import { Assignment } from '../types/aastu';
import { createGoogleCalendarUrl } from '../utils/calendarSync';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentToEdit?: Assignment | null;
  onSaveAssignment: (assignmentData: Omit<Assignment, 'id'> & { id?: string }) => void;
  onDeleteAssignment?: (id: string) => void;
}

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  assignmentToEdit,
  onSaveAssignment,
  onDeleteAssignment,
}) => {
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('MATH1007');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [weightPercentage, setWeightPercentage] = useState<number>(15);
  const [status, setStatus] = useState<Assignment['status']>('not_started');
  const [priority, setPriority] = useState<Assignment['priority']>('high');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (assignmentToEdit) {
      setTitle(assignmentToEdit.title);
      setCourseCode(assignmentToEdit.courseCode);
      setDueDate(assignmentToEdit.dueDate);
      setDueTime(assignmentToEdit.dueTime || '23:59');
      setWeightPercentage(assignmentToEdit.weightPercentage || 15);
      setStatus(assignmentToEdit.status);
      setPriority(assignmentToEdit.priority);
      setDescription(assignmentToEdit.description || '');
    } else {
      setTitle('');
      setCourseCode('MATH1007');
      // Default to 3 days from now
      const defaultDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
      setDueDate(defaultDate);
      setDueTime('23:59');
      setWeightPercentage(15);
      setStatus('not_started');
      setPriority('high');
      setDescription('');
    }
  }, [assignmentToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    onSaveAssignment({
      id: assignmentToEdit?.id,
      title: title.trim(),
      courseCode: courseCode.trim() || 'Coursework',
      dueDate,
      dueTime,
      weightPercentage: Number(weightPercentage) || 0,
      status,
      priority,
      description: description.trim() || undefined,
    });
    onClose();
  };

  const handleOpenGoogleCalendar = () => {
    if (!title.trim() || !dueDate) return;
    const url = createGoogleCalendarUrl({
      title: `[DUE] ${title} (${courseCode})`,
      details: `Course: ${courseCode}\nWeight: ${weightPercentage}%\nStatus: ${status}\n${description}`,
      dateStr: dueDate,
      timeStr: dueTime,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-6 text-[#c9d1d9] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#58a6ff]" />
              <span>{assignmentToEdit ? 'Edit Course Assignment' : 'Add Class Assignment & Due Date'}</span>
            </h2>
            <p className="text-xs text-[#8b949e] mt-0.5">
              Tracks continuous assessment deliverables, grade weights, and alerts.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8b949e] hover:text-white rounded-lg hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Assignment Title */}
          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1">
              Assignment Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Applied Math I: Problem Set 4 (Calculus & Series)"
              className="w-full px-3.5 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-sm focus:outline-none focus:border-[#58a6ff]"
              required
              autoFocus
            />
          </div>

          {/* Course & Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1">
                Course Code
              </label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="e.g. MATH1007 / CS50"
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#58a6ff]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1">
                Grade Weight (%)
              </label>
              <input
                type="number"
                value={weightPercentage}
                onChange={(e) => setWeightPercentage(Number(e.target.value))}
                min="0"
                max="100"
                placeholder="e.g. 15%"
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#58a6ff]" /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#58a6ff]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#58a6ff]" /> Due Time
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#58a6ff]"
                required
              />
            </div>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1">
                Submission Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs focus:outline-none focus:border-[#58a6ff]"
              >
                <option value="not_started">Not Started (Pending)</option>
                <option value="in_progress">In Progress (Drafting)</option>
                <option value="submitted">Submitted / Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs focus:outline-none focus:border-[#58a6ff]"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Description & Requirements */}
          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1">
              Instructions & Requirements (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Problems 1 to 15 on Chapter 7 worksheet, show step-by-step substitution..."
              className="w-full p-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs focus:outline-none focus:border-[#58a6ff] resize-none"
            />
          </div>

          {/* One-Click Google Calendar Quick Add */}
          {title && dueDate && (
            <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] flex items-center justify-between text-xs">
              <span className="text-[#8b949e]">Sync to external calendar:</span>
              <button
                type="button"
                onClick={handleOpenGoogleCalendar}
                className="text-[#58a6ff] hover:text-[#79b8ff] font-semibold flex items-center gap-1.5"
              >
                <span>Add to Google Calendar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#30363d]">
            {assignmentToEdit && onDeleteAssignment ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Delete this assignment?')) {
                    onDeleteAssignment(assignmentToEdit.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 text-xs font-semibold text-[#f85149] hover:bg-[#f85149]/10 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#8b949e] hover:text-white rounded-xl hover:bg-[#21262d] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-black bg-[#58a6ff] hover:bg-[#79b8ff] rounded-xl transition-colors shadow-sm"
              >
                {assignmentToEdit ? 'Save Assignment' : 'Add Assignment'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
