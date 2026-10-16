import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { useUiStore } from '../../store/uiStore';
import { Course } from '../../types';
import { generateId } from '../../utils/idGenerator';
import { PRESET_COURSE_NEON_COLORS, getContrastTextColor } from '../../theme/themeUtils';
import {
  X,
  BookOpen,
  MapPin,
  Building,
  User,
  Award,
  Trash2,
  Check,
  Sparkles,
} from 'lucide-react';

interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseToEdit?: Course | null;
  onCourseSaved?: (course: Course) => void;
}

export const CourseModal: React.FC<CourseModalProps> = ({
  isOpen,
  onClose,
  courseToEdit,
  onCourseSaved,
}) => {
  const { showToast } = useUiStore();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [instructor, setInstructor] = useState('');
  const [credits, setCredits] = useState(3);
  const [term, setTerm] = useState('Year 1 - Semester I');
  const [color, setColor] = useState(PRESET_COURSE_NEON_COLORS[0].hex);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (courseToEdit) {
      setName(courseToEdit.name || '');
      setCode(courseToEdit.code || '');
      setBuilding(courseToEdit.building || '');
      setRoom(courseToEdit.room || '');
      setInstructor(courseToEdit.instructor || '');
      setCredits(courseToEdit.creditHours || 3);
      setTerm(courseToEdit.term || 'Year 1 - Semester I');
      setColor(courseToEdit.color || PRESET_COURSE_NEON_COLORS[0].hex);
      setConfirmDelete(false);
    } else {
      setName('');
      setCode('');
      setBuilding('');
      setRoom('');
      setInstructor('');
      setCredits(3);
      setTerm('Year 1 - Semester I');
      // Pick a random vibrant neon color on open
      const randomColor =
        PRESET_COURSE_NEON_COLORS[Math.floor(Math.random() * PRESET_COURSE_NEON_COLORS.length)].hex;
      setColor(randomColor);
      setConfirmDelete(false);
    }
  }, [courseToEdit, isOpen]);

  if (!isOpen) return null;

  const selectedColorObj =
    PRESET_COURSE_NEON_COLORS.find((c) => c.hex.toLowerCase() === color.toLowerCase()) ||
    PRESET_COURSE_NEON_COLORS[0];
  const textColor = getContrastTextColor(color);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter a course title.', 'warning');
      return;
    }
    if (!code.trim()) {
      showToast('Please enter a course code (e.g. MATH1011).', 'warning');
      return;
    }

    const now = new Date().toISOString();
    const formattedCode = code.trim().toUpperCase();
    const formattedName = name.trim();

    if (courseToEdit) {
      const updatedCourse: Course = {
        ...courseToEdit,
        name: formattedName,
        code: formattedCode,
        building: building.trim(),
        room: room.trim(),
        instructor: instructor.trim(),
        creditHours: credits,
        term,
        color,
        updatedAt: now,
      };

      await db.courses.put(updatedCourse);
      showToast(`Updated course "${formattedName}"`, 'success');
      onCourseSaved?.(updatedCourse);
    } else {
      const newCourse: Course = {
        id: generateId(),
        name: formattedName,
        code: formattedCode,
        building: building.trim(),
        room: room.trim(),
        instructor: instructor.trim(),
        creditHours: credits,
        term,
        color,
        createdAt: now,
        updatedAt: now,
      };

      await db.courses.add(newCourse);
      showToast(`Added course "${formattedName}" to registry!`, 'success');
      onCourseSaved?.(newCourse);
    }

    onClose();
  };

  const handleDelete = async () => {
    if (!courseToEdit) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    await db.courses.delete(courseToEdit.id);
    showToast(`Removed course "${courseToEdit.name}"`, 'info');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-pop overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Neon Accent Header Ribbon */}
        <div
          className="h-2 w-full transition-colors duration-300"
          style={{ backgroundColor: color }}
        />

        {/* Header */}
        <div className="p-4 sm:p-5 pb-3 border-b border-[rgb(var(--c-border))] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs transition-colors duration-300"
              style={{ backgroundColor: color, color: textColor }}
            >
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading text-sm sm:text-base font-bold text-[rgb(var(--c-text))]">
                {courseToEdit ? 'Edit University Course' : 'Create Individual Course'}
              </h3>
              <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                Schedules, rooms, and neon color tags update instantly across the app.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))] transition active:scale-95"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Live Preview Card */}
          <div className="p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-heading tracking-wider text-[rgb(var(--c-muted))] font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[rgb(var(--c-primary))]" />
                Live Schedule Badge Preview
              </span>
              <span className="text-[10px] font-heading font-bold opacity-80" style={{ color }}>
                ● {selectedColorObj.name}
              </span>
            </div>

            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-xl p-3 flex items-start justify-between gap-3 relative overflow-hidden">
              <div
                className="absolute top-0 left-0 bottom-0 w-1.5"
                style={{ backgroundColor: color }}
              />
              <div className="pl-2 space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-2xs transition-colors"
                    style={{ backgroundColor: color, color: textColor }}
                  >
                    {code.trim() ? code.trim().toUpperCase() : 'CODE101'}
                  </span>
                  <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))] truncate">
                    {name.trim() ? name.trim() : 'Editable Course Title'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[rgb(var(--c-muted))] flex-wrap">
                  {(building.trim() || room.trim()) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[rgb(var(--c-primary))]" />
                      {[building.trim(), room.trim()].filter(Boolean).join(' • ')}
                    </span>
                  )}
                  {instructor.trim() && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-[rgb(var(--c-primary))]" />
                      {instructor.trim()}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Award className="w-3 h-3 text-[rgb(var(--c-primary))]" />
                    {credits} Credit Hours
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Editable Course Title */}
          <div>
            <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-text))] mb-1">
              Course Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Applied Mathematics I"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary))] font-medium transition"
              required
              autoFocus
            />
          </div>

          {/* Course Code & Credit Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-text))] mb-1">
                Course Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. MATH1011"
                className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary))] font-bold uppercase transition"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-text))] mb-1">
                Credit Hours
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={credits}
                onChange={(e) => setCredits(parseInt(e.target.value, 10) || 3)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary))] transition"
              />
            </div>
          </div>

          {/* Location Fields: Block Number & Class Number / Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-text))] mb-1 flex items-center gap-1">
                <Building className="w-3 h-3 text-[rgb(var(--c-muted))]" />
                Block Number / Building
              </label>
              <input
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="e.g. Block 59"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary))] transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-text))] mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[rgb(var(--c-muted))]" />
                Class Number / Room / Hall
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. Room 2-005 or Lab C4"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary))] transition"
              />
            </div>
          </div>

          {/* Lecturer & Term */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-text))] mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-[rgb(var(--c-muted))]" />
                Lecturer / Instructor
              </label>
              <input
                type="text"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                placeholder="e.g. Dr. Tadesse"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary))] transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-text))] mb-1">
                Academic Term
              </label>
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="e.g. Year 1 - Semester I"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary))] transition"
              />
            </div>
          </div>

          {/* 12 Predefined Bright Neon Colors Picker */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-heading font-bold text-[rgb(var(--c-text))]">
                Course Neon Color Tag (12 Vibrant Options)
              </label>
              <span className="text-[10px] font-heading font-semibold text-[rgb(var(--c-muted))]">
                Selected: <strong className="text-[rgb(var(--c-text))]">{selectedColorObj.name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-2.5 p-3 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
              {PRESET_COURSE_NEON_COLORS.map((neonOption) => {
                const isSelected = color.toLowerCase() === neonOption.hex.toLowerCase();
                const contrast = getContrastTextColor(neonOption.hex);

                return (
                  <button
                    key={neonOption.hex}
                    type="button"
                    onClick={() => setColor(neonOption.hex)}
                    title={`${neonOption.name} (${neonOption.hex})`}
                    className={`group relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-95 ${
                      isSelected
                        ? 'border-stone-900 dark:border-white shadow-md scale-105 bg-[rgb(var(--c-surface))] ring-2 ring-stone-900/30 dark:ring-white/30'
                        : 'border-transparent hover:bg-[rgb(var(--c-surface))] hover:scale-102'
                    }`}
                  >
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-sm flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ backgroundColor: neonOption.hex }}
                    >
                      {isSelected && (
                        <Check className="w-4 h-4 font-black" style={{ color: contrast }} />
                      )}
                    </div>
                    <span className="text-[9px] font-heading font-bold mt-1 text-[rgb(var(--c-text))] truncate max-w-full text-center leading-tight">
                      {neonOption.name.split(' ')[1] || neonOption.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[rgb(var(--c-border))] flex items-center justify-between gap-3">
            {courseToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className={`px-3 py-2 rounded-xl text-xs font-heading font-bold transition flex items-center gap-1.5 ${
                  confirmDelete
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'text-rose-500 hover:bg-rose-500/10'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmDelete ? 'Confirm Delete?' : 'Delete Course'}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl font-heading text-xs font-bold shadow-md hover:opacity-95 active:scale-95 transition flex items-center gap-1.5"
                style={{ backgroundColor: color, color: textColor }}
              >
                <Check className="w-3.5 h-3.5" />
                <span>{courseToEdit ? 'Save Changes' : 'Create Course'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
