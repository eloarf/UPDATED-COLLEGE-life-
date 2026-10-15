import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, Tag, Flag, AlertCircle, Trash2 } from 'lucide-react';
import { TaskItem, TaskCategory, DayOfWeek } from '../types/aastu';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: DayOfWeek;
  taskToEdit?: TaskItem | null;
  onSaveTask: (taskData: Omit<TaskItem, 'id'> & { id?: string }) => void;
  onDeleteTask?: (taskId: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  day,
  taskToEdit,
  onSaveTask,
  onDeleteTask,
}) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('10:20');
  const [category, setCategory] = useState<TaskCategory>('study');
  const [location, setLocation] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [shiftable, setShiftable] = useState(false);
  const [shiftedTime, setShiftedTime] = useState('18:00 - 18:45');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      const [start, end] = taskToEdit.time.split('-').map((s) => s.trim());
      setStartTime(start || '08:30');
      setEndTime(end || '10:20');
      setCategory(taskToEdit.category);
      setLocation(taskToEdit.location || '');
      setPriority(taskToEdit.priority || 'medium');
      setShiftable(!!taskToEdit.shiftable);
      setShiftedTime(taskToEdit.shiftedTime || '18:00 - 18:45');
      setNotes(taskToEdit.notes || '');
    } else {
      setTitle('');
      setStartTime('10:30');
      setEndTime('12:00');
      setCategory('study');
      setLocation('');
      setPriority('medium');
      setShiftable(false);
      setShiftedTime('18:00 - 18:45');
      setNotes('');
    }
  }, [taskToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSaveTask({
      id: taskToEdit?.id,
      title: title.trim(),
      time: `${startTime} - ${endTime}`,
      category,
      location: location.trim() || undefined,
      priority,
      shiftable,
      shiftedTime: shiftable ? shiftedTime : undefined,
      notes: notes.trim() || undefined,
      day,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-6 text-[#c9d1d9] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>{taskToEdit ? 'Edit Schedule Task' : 'Add Custom Task'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#21262d] border border-[#30363d] text-[#58a6ff]">
                {day}
              </span>
            </h2>
            <p className="text-xs text-[#8b949e] mt-0.5">
              Customize your daily execution flow, time slots, and locations.
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
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1">
              Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Applied Math I Problem Set / Library Sprint"
              className="w-full px-3.5 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-sm focus:outline-none focus:border-[#58a6ff]"
              required
              autoFocus
            />
          </div>

          {/* Time & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Start & End Time
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#58a6ff]"
                  required
                />
                <span className="text-xs text-[#8b949e]">-</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2.5 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#58a6ff]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Room / Location (Optional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. B59-2-005 / Library"
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs focus:outline-none focus:border-[#58a6ff]"
              >
                <option value="classes">Class Attendance (Cyan)</option>
                <option value="study">Deep Study / STEM (Blue)</option>
                <option value="code">CS50 / Software (Indigo)</option>
                <option value="running">Morning Run / Exercise (Green)</option>
                <option value="music">Music Production / FL Studio (Purple)</option>
                <option value="journal">Daily Journal & Writing (Orange)</option>
                <option value="custom">Custom Milestone (Teal)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5" /> Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs focus:outline-none focus:border-[#58a6ff]"
              >
                <option value="high">High Priority (Urgent / Core)</option>
                <option value="medium">Medium Priority (Standard)</option>
                <option value="low">Low Priority (Optional)</option>
              </select>
            </div>
          </div>

          {/* Shiftable Option */}
          <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shiftable}
                  onChange={(e) => setShiftable(e.target.checked)}
                  className="rounded"
                />
                <span>Allow Time Shifting (e.g. Morning to Evening)</span>
              </label>
              <span className="text-[10px] text-[#8b949e]">Flexible Task</span>
            </div>

            {shiftable && (
              <div className="pt-1">
                <label className="block text-[11px] text-[#8b949e] mb-1">
                  Shifted Slot Time:
                </label>
                <input
                  type="text"
                  value={shiftedTime}
                  onChange={(e) => setShiftedTime(e.target.value)}
                  placeholder="e.g. 18:00 - 18:45"
                  className="w-full px-2.5 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg text-white text-xs font-mono focus:outline-none focus:border-[#58a6ff]"
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-1">
              Task Notes & Focus Strategy (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Focus on Chapter 4 limit proofs or 808 drum compression..."
              className="w-full p-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-white text-xs focus:outline-none focus:border-[#58a6ff] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#30363d]">
            {taskToEdit && onDeleteTask ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Delete this task from schedule?')) {
                    onDeleteTask(taskToEdit.id);
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
                {taskToEdit ? 'Save Changes' : 'Add to Schedule'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
