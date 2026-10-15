import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { Course } from '../types';
import { CourseModal } from '../components/common/CourseModal';
import { getContrastTextColor } from '../theme/themeUtils';
import {
  BookOpen,
  Plus,
  User,
  MapPin,
  Building,
  Award,
  Trash2,
  Edit2,
  CheckCircle,
} from 'lucide-react';

export const CoursesPage: React.FC = () => {
  const { showToast, setCurrentRoute } = useUiStore();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const courseTasks = selectedCourse ? tasks.filter((t) => t.courseId === selectedCourse.id) : [];

  const handleOpenAddModal = () => {
    setEditingCourse(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (course: Course) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };

  const handleCourseSaved = (saved: Course) => {
    setSelectedCourseId(saved.id);
  };

  const handleDeleteCourse = async (id: string, name: string) => {
    await db.courses.delete(id);
    showToast(`Course "${name}" removed from database.`, 'info');
    if (selectedCourseId === id) setSelectedCourseId(null);
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#8B5A3C] font-bold">
              Course Registry & Tag Vault
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              Enrolled Modules & Syllabi
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Vivid neon course colors follow each module across your timetable, tasks, and GPA.
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
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
          const contrast = getContrastTextColor(course.color);
          const locationParts = [course.building, course.room].filter(Boolean);

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
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-2xs"
                      style={{ backgroundColor: course.color, color: contrast }}
                    >
                      {course.code}
                    </span>
                  </div>
                  <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))] truncate">
                    {course.name}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditModal(course);
                    }}
                    className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface2))] transition active:scale-95"
                    title="Edit course"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCourse(course.id, course.name);
                    }}
                    className="p-1 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500 hover:bg-[rgb(var(--c-surface2))] transition active:scale-95"
                    title="Delete course"
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
                {locationParts.length > 0 && (
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#8B5A3C]" />
                    <span>{locationParts.join(' • ')}</span>
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
                className="w-4 h-12 rounded-full shrink-0 shadow-xs"
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
                onClick={() => handleOpenEditModal(selectedCourse)}
                className="px-3 py-1 rounded-full border border-[rgb(var(--c-border))] text-xs font-heading font-bold hover:bg-[rgb(var(--c-surface2))] flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit Course</span>
              </button>
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
                Primary Lecture Room / Block
              </span>
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))] mt-0.5 truncate">
                {[selectedCourse.building, selectedCourse.room].filter(Boolean).join(' • ') || 'Campus Hall'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared Course Creation & Edit Modal */}
      <CourseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCourse(null);
        }}
        courseToEdit={editingCourse}
        onCourseSaved={handleCourseSaved}
      />
    </div>
  );
};
