import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { Course } from '../types';
import { generateId } from '../utils/idGenerator';
import {
  BookOpen,
  Plus,
  User,
  MapPin,
  Award,
  Calendar,
  Trash2,
  Edit2,
  X,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';

const PRESET_COLORS = [
  '#A6D938', // lime
  '#F6A8BE', // pink
  '#8B5A3C', // milk chocolate
  '#9B2D4F', // burgundy
  '#E8C9A0', // cashew
  '#8FD3B6', // mint
  '#BBA6E0', // lavender
  '#8EC5E8', // sky
  '#F5B58A', // peach
  '#E5C04B', // mustard
  '#4FA3A5', // teal
  '#D96C8F', // rose
];

export const CoursesPage: React.FC = () => {
  const { showToast, setCurrentRoute } = useUiStore();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [credits, setCredits] = useState(3);
  const [instructor, setInstructor] = useState('');
  const [room, setRoom] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [term, setTerm] = useState('Year 1 - Semester II');

  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const courseTasks = selectedCourse ? tasks.filter((t) => t.courseId === selectedCourse.id) : [];

  const handleOpenModal = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setCode(course.code);
      setName(course.name);
      setCredits(course.creditHours);
      setInstructor(course.instructor || '');
      setRoom(course.room || '');
      setColor(course.color);
      setTerm(course.term);
    } else {
      setEditingCourse(null);
      setCode('');
      setName('');
      setCredits(3);
      setInstructor('');
      setRoom('');
      setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
      setTerm('Year 1 - Semester II');
    }
    setIsModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    const now = new Date().toISOString();

    if (editingCourse) {
      await db.courses.update(editingCourse.id, {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        creditHours: credits,
        instructor: instructor.trim(),
        room: room.trim(),
        color,
        term,
        updatedAt: now,
      });
      showToast('Course updated successfully!', 'success');
    } else {
      const newId = generateId();
      await db.courses.add({
        id: newId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        creditHours: credits,
        instructor: instructor.trim(),
        room: room.trim(),
        color,
        term,
        createdAt: now,
        updatedAt: now,
      });
      setSelectedCourseId(newId);
      showToast('New course added to syllabus registry!', 'success');
    }

    setIsModalOpen(false);
  };

  const handleDeleteCourse = async (id: string) => {
    await db.courses.delete(id);
    showToast('Course removed from database.', 'info');
    if (selectedCourseId === id) setSelectedCourseId(null);
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#8B5A3C] font-bold">
              Course Registry &amp; Tag Vault
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              Enrolled Modules &amp; Syllabi
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Single-source course colors follow each module across your timetable, tasks, and GPA.
            </p>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#8B5A3C] text-white font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {/* Luggage Tag Course Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {courses.map((course) => {
          const isSelected = selectedCourse?.id === course.id;
          return (
            <div
              key={course.id}
              onClick={() => setSelectedCourseId(course.id)}
              className={`luggage-tag ticket-border rounded-2xl p-4 cursor-pointer transition relative group bg-[rgb(var(--c-surface))] ${
                isSelected ? 'ring-2 ring-[#8B5A3C] shadow-md' : 'hover:border-[#8B5A3C]'
              }`}
            >
              {/* Colored ribbon strip */}
              <div
                className="absolute top-0 left-0 right-0 h-2.5 rounded-t-xl"
                style={{ backgroundColor: course.color }}
              />

              <div className="pt-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))] group-hover:text-[#8B5A3C] transition">
                    {course.code}
                  </div>
                  <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))] truncate max-w-[200px]">
                    {course.name}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenModal(course);
                    }}
                    className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))]"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCourse(course.id);
                    }}
                    className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500 hover:bg-[rgb(var(--c-surface2))]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-1 text-xs text-[rgb(var(--c-muted))]">
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#8B5A3C]" />
                  <span>{course.creditHours} Credit Hours</span>
                </div>
                {course.instructor && (
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-[#8B5A3C]" />
                    <span>{course.instructor}</span>
                  </div>
                )}
                {course.room && (
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#8B5A3C]" />
                    <span>{course.room}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Course Deep Detail Inspector */}
      {selectedCourse && (
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-3">
              <span
                className="w-4 h-12 rounded-full shrink-0"
                style={{ backgroundColor: selectedCourse.color }}
              />
              <div>
                <div className="text-xs font-heading uppercase tracking-wider text-[#8B5A3C] font-bold">
                  {selectedCourse.code} Module Overview
                </div>
                <h3 className="text-base sm:text-lg font-heading font-bold text-[rgb(var(--c-text))]">
                  {selectedCourse.name}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentRoute('#/tasks')}
                className="px-3 py-1 rounded-full border border-[rgb(var(--c-border))] text-xs font-heading hover:bg-[rgb(var(--c-surface2))]"
              >
                View Quests ({courseTasks.length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))]">
              <span className="text-[10px] font-heading text-[rgb(var(--c-muted))] uppercase">
                Academic Weight
              </span>
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))] mt-0.5">
                {selectedCourse.creditHours} Credit Units
              </div>
            </div>
            <div className="p-3 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))]">
              <span className="text-[10px] font-heading text-[rgb(var(--c-muted))] uppercase">
                Assigned Lecturer
              </span>
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))] mt-0.5 truncate">
                {selectedCourse.instructor || 'Staff Assigned'}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))]">
              <span className="text-[10px] font-heading text-[rgb(var(--c-muted))] uppercase">
                Primary Lecture Room
              </span>
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))] mt-0.5 truncate">
                {selectedCourse.room || 'Block 59 / B60'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                {editingCourse ? 'Edit Academic Course' : 'Register New University Course'}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Course Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. MATH1011"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Credit Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={credits}
                    onChange={(e) => setCredits(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Course Title
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Applied Mathematics I"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Lecturer / Instructor
                  </label>
                  <input
                    type="text"
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    placeholder="e.g. Dr. Tadesse"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Hall / Room
                  </label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="e.g. B59-2-005"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
              </div>

              {/* Color Swatch Picker */}
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1.5">
                  Universal Course Color Tag
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition transform active:scale-90 flex items-center justify-center ${
                        color === c ? 'ring-2 ring-stone-900 ring-offset-2 scale-110 shadow-xs' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <span className="text-[10px] text-stone-900 font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-2 rounded-xl bg-[#8B5A3C] text-white font-heading text-xs font-bold hover:opacity-90 active:scale-98 transition shadow-xs"
              >
                {editingCourse ? 'Save Changes' : 'Enroll Module'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
