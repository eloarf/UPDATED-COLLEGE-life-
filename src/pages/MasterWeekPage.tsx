import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { MasterWeekBlock, Course, ClassSession, DayOfWeek } from '../types';
import { DAY_NAMES, FULL_DAY_NAMES, getDayOfWeekIndex } from '../utils/dateUtils';
import { generateId } from '../utils/idGenerator';
import { CourseModal } from '../components/common/CourseModal';
import { PRESET_COURSE_NEON_COLORS, getContrastTextColor } from '../theme/themeUtils';
import {
  LayoutGrid,
  Plus,
  Clock,
  Laptop,
  Smartphone,
  Trash2,
  X,
  BookOpen,
  Edit2,
  Building,
  MapPin,
  Sparkles,
  Tag,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export const MasterWeekPage: React.FC = () => {
  const { showToast } = useUiStore();
  const [selectedDay, setSelectedDay] = useState<number>(getDayOfWeekIndex());
  const [activeFilter, setActiveFilter] = useState<'all' | 'classes' | 'routines'>('all');

  // Course Modal for creating or editing reusable courses
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);

  // Timeblock Modal (handles both routine blocks and class scheduling)
  const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState(false);
  const [entryKind, setEntryKind] = useState<'routine' | 'class'>('routine');

  // Form State: Routine
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineCategory, setRoutineCategory] = useState<string>('study');
  const [customCategory, setCustomCategory] = useState('');
  const [routineDay, setRoutineDay] = useState<number>(selectedDay);
  const [routineStartTime, setRoutineStartTime] = useState('18:00');
  const [routineEndTime, setRoutineEndTime] = useState('20:00');
  const [routineDayType, setRoutineDayType] = useState<'dorm' | 'home' | 'both'>('dorm');
  const [routineBlockNumber, setRoutineBlockNumber] = useState('');
  const [routineClassNumber, setRoutineClassNumber] = useState('');
  const [routineColor, setRoutineColor] = useState<string>(PRESET_COURSE_NEON_COLORS[0].hex);

  // Form State: Class
  const [classCourseId, setClassCourseId] = useState('');
  const [classDay, setClassDay] = useState<number>(selectedDay);
  const [classStartTime, setClassStartTime] = useState('08:30');
  const [classEndTime, setClassEndTime] = useState('10:20');
  const [classType, setClassType] = useState<'lecture' | 'lab' | 'tutorial' | 'other'>('lecture');
  const [classBuilding, setClassBuilding] = useState('');
  const [classRoom, setClassRoom] = useState('');

  // Delete confirmation
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'routine' | 'class';
    id: string;
    title: string;
  } | null>(null);

  // Dexie live queries
  const blocks = useLiveQuery(() => db.masterWeekBlocks.toArray()) || [];
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const sessions = useLiveQuery(() => db.classSessions.toArray()) || [];

  const courseMap = new Map<string, Course>();
  courses.forEach((c) => courseMap.set(c.id, c));

  // Open modal preselected to day
  const handleOpenAddModal = (kind: 'routine' | 'class') => {
    setEntryKind(kind);
    setRoutineDay(selectedDay);
    setClassDay(selectedDay);
    if (courses.length > 0 && !classCourseId) {
      setClassCourseId(courses[0].id);
      if (courses[0].building) setClassBuilding(courses[0].building);
      if (courses[0].room) setClassRoom(courses[0].room);
    }
    setIsAddBlockModalOpen(true);
  };

  const handleOpenNewCourse = () => {
    setCourseToEdit(null);
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourse = (course: Course) => {
    setCourseToEdit(course);
    setIsCourseModalOpen(true);
  };

  const handleCourseSaved = (saved: Course) => {
    setClassCourseId(saved.id);
    if (saved.building) setClassBuilding(saved.building);
    if (saved.room) setClassRoom(saved.room);
  };

  const handleSaveRoutineBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineTitle.trim()) {
      showToast('Please enter a timeblock title.', 'warning');
      return;
    }
    if (routineCategory === 'other' && !customCategory.trim()) {
      showToast('Please specify your custom category label.', 'warning');
      return;
    }

    const savedCategory = routineCategory === 'other' ? customCategory.trim() : routineCategory;

    await db.masterWeekBlocks.add({
      id: generateId(),
      title: routineTitle.trim(),
      category: savedCategory as any,
      customCategory: routineCategory === 'other' ? customCategory.trim() : undefined,
      dayOfWeek: routineDay as DayOfWeek,
      startTime: routineStartTime,
      endTime: routineEndTime,
      dayType: routineDayType,
      blockNumber: routineBlockNumber.trim() || undefined,
      classNumber: routineClassNumber.trim() || undefined,
      color: routineColor,
    });

    setRoutineTitle('');
    setCustomCategory('');
    setRoutineBlockNumber('');
    setRoutineClassNumber('');
    setIsAddBlockModalOpen(false);
    showToast('Routine timeblock registered in master week!', 'success');
  };

  const handleSaveClassSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classCourseId) {
      showToast('Please select or create a course.', 'warning');
      return;
    }

    await db.classSessions.add({
      id: generateId(),
      courseId: classCourseId,
      dayOfWeek: classDay as DayOfWeek,
      startTime: classStartTime,
      endTime: classEndTime,
      type: classType,
      building: classBuilding.trim() || undefined,
      room: classRoom.trim() || undefined,
      repeat: 'all',
    });

    setIsAddBlockModalOpen(false);
    showToast('Course session mapped to schedule!', 'success');
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'routine') {
      await db.masterWeekBlocks.delete(itemToDelete.id);
      showToast(`Removed timeblock “${itemToDelete.title}”.`, 'info');
    } else {
      await db.classSessions.delete(itemToDelete.id);
      showToast(`Removed class session “${itemToDelete.title}”.`, 'info');
    }
    setItemToDelete(null);
  };

  // Combine and sort day schedule items
  const dayClasses = sessions
    .filter((s) => s.dayOfWeek === selectedDay)
    .map((s) => {
      const course = courseMap.get(s.courseId);
      return {
        id: s.id,
        isClass: true as const,
        title: course ? `${course.code} — ${course.name}` : 'Course Lecture',
        courseCode: course?.code || 'CRS',
        courseName: course?.name || 'Class',
        color: course?.color || '#B6E63E',
        startTime: s.startTime,
        endTime: s.endTime,
        category: s.type,
        customLabel: s.type,
        building: s.building || course?.building,
        room: s.room || course?.room,
        dayType: 'both',
        course,
      };
    });

  const dayRoutines = blocks
    .filter((b) => b.dayOfWeek === selectedDay)
    .map((b) => ({
      id: b.id,
      isClass: false as const,
      title: b.title,
      courseCode: undefined,
      courseName: undefined,
      color: b.color || '#8B5A3C',
      startTime: b.startTime,
      endTime: b.endTime,
      category: b.category,
      customLabel: b.customCategory || b.category,
      building: b.blockNumber,
      room: b.classNumber,
      dayType: b.dayType,
      course: undefined,
    }));

  const allDayItems = [...dayClasses, ...dayRoutines].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  const displayedItems = allDayItems.filter((item) => {
    if (activeFilter === 'classes') return item.isClass;
    if (activeFilter === 'routines') return !item.isClass;
    return true;
  });

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* 1. Master Week Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#8B5A3C] font-bold">
              Integrated Academic &amp; Routine Architecture
            </div>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))]">
              Master Week Schedule
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Harmonize class lectures with non-class study, creative, and rest blocks. 12 vivid course neon tags stay synchronized.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenNewCourse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:bg-[rgb(var(--c-surface2))] active:scale-95 transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#8B5A3C]" />
              <span>New Course</span>
            </button>

            <button
              onClick={() => handleOpenAddModal('class')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:border-[#8B5A3C] active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5 text-[#8B5A3C]" />
              <span>Map Class</span>
            </button>

            <button
              onClick={() => handleOpenAddModal('routine')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8B5A3C] text-white font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Timeblock</span>
            </button>
          </div>
        </div>

        {/* Day Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 mt-5 overflow-x-auto pb-1 scrollbar-none">
          {DAY_NAMES.map((name, idx) => {
            const count = [...sessions, ...blocks].filter((x) => x.dayOfWeek === idx).length;
            const isSelected = selectedDay === idx;

            return (
              <button
                key={name}
                onClick={() => setSelectedDay(idx)}
                className={`flex-1 min-w-[50px] sm:min-w-[70px] py-2 rounded-2xl border text-xs font-heading font-bold transition flex flex-col items-center gap-0.5 active:scale-95 ${
                  isSelected
                    ? 'border-[#8B5A3C] bg-[#8B5A3C] text-white shadow-md'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] hover:border-[#8B5A3C]/40'
                }`}
              >
                <span>{name}</span>
                <span
                  className={`text-[9px] px-1.5 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'text-[rgb(var(--c-muted))]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Schedule Filters & Day Overview Card */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[rgb(var(--c-border))]">
          <div>
            <h3 className="font-heading text-base font-bold text-[rgb(var(--c-text))]">
              {FULL_DAY_NAMES[selectedDay]} Architecture
            </h3>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              {dayClasses.length} lectures/labs • {dayRoutines.length} routine &amp; focus blocks
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] self-start sm:self-auto">
            {(
              [
                { id: 'all', label: `All (${allDayItems.length})` },
                { id: 'classes', label: `Classes (${dayClasses.length})` },
                { id: 'routines', label: `Routines (${dayRoutines.length})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1 rounded-xl text-xs font-heading font-bold transition ${
                  activeFilter === f.id
                    ? 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] shadow-xs border border-[rgb(var(--c-border))]'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule Items List */}
        {displayedItems.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-dashed border-[rgb(var(--c-border))] space-y-3">
            <Clock className="w-8 h-8 text-[rgb(var(--c-muted))] mx-auto opacity-50" />
            <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))]">
              No sessions scheduled for {FULL_DAY_NAMES[selectedDay]}
            </div>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish max-w-sm mx-auto">
              Map your university lectures with building and class numbers, or add custom routine blocks for library, music, or workouts.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => handleOpenAddModal('class')}
                className="px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold hover:bg-[rgb(var(--c-surface2))]"
              >
                + Map Class
              </button>
              <button
                onClick={() => handleOpenAddModal('routine')}
                className="px-3.5 py-1.5 rounded-xl bg-[#8B5A3C] text-white text-xs font-heading font-bold shadow-xs hover:opacity-90"
              >
                + Add Routine Block
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedItems.map((item) => {
              const contrast = getContrastTextColor(item.color);
              const locations = [
                item.building && `Block ${item.building}`,
                item.room && `Class/Room ${item.room}`,
              ].filter(Boolean);

              return (
                <div
                  key={item.id}
                  className="ticket-border rounded-2xl p-4 bg-[rgb(var(--c-bg))] hover:border-[#8B5A3C]/50 transition space-y-2.5 relative group shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Left colored bar with contrast text */}
                      <div
                        className="w-3 self-stretch rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: item.color }}
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {item.isClass ? (
                            <span
                              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-2xs"
                              style={{ backgroundColor: item.color, color: contrast }}
                            >
                              {item.courseCode}
                            </span>
                          ) : (
                            <span
                              className="text-[10px] font-heading font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-white shadow-2xs"
                              style={{ backgroundColor: item.color }}
                            >
                              {item.customLabel}
                            </span>
                          )}

                          <span className="flex items-center gap-1 text-xs font-heading font-bold text-[#8B5A3C] dark:text-[#E5C04B]">
                            <Clock className="w-3.5 h-3.5" />
                            {item.startTime} – {item.endTime}
                          </span>

                          <span className="text-[10px] text-[rgb(var(--c-muted))] uppercase font-semibold">
                            • {item.isClass ? `${item.category} session` : `${item.dayType} mode`}
                          </span>
                        </div>

                        <div className="text-sm font-heading font-bold text-[rgb(var(--c-text))] truncate">
                          {item.title}
                        </div>

                        {locations.length > 0 && (
                          <div className="flex items-center gap-2 text-[11px] text-[rgb(var(--c-muted))] font-flourish mt-1">
                            <Building className="w-3.5 h-3.5 text-[#8B5A3C] shrink-0" />
                            <span>{locations.join(' • ')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {item.isClass && item.course && (
                        <button
                          onClick={() => handleOpenEditCourse(item.course!)}
                          className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-surface))] transition"
                          title="Edit course details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setItemToDelete({
                            type: item.isClass ? 'class' : 'routine',
                            id: item.id,
                            title: item.title,
                          })
                        }
                        className="p-1.5 rounded-lg text-[rgb(var(--c-muted))] hover:text-rose-500 hover:bg-[rgb(var(--c-surface))] transition"
                        title="Delete from schedule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Predefined Neon Course Palette Reference Strip */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 space-y-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-heading font-bold text-[rgb(var(--c-text))]">
            <Sparkles className="w-4 h-4 text-[#8B5A3C]" />
            <span>Grand Budapest Neon Palette (12 Vivid Synchronized Colors)</span>
          </div>
          <span className="text-[10px] text-[rgb(var(--c-muted))] font-mono">
            {courses.length} courses registered
          </span>
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-1">
          {PRESET_COURSE_NEON_COLORS.map((c) => (
            <div
              key={c.hex}
              title={c.name}
              className="h-6 rounded-lg flex items-center justify-center font-mono text-[9px] font-bold shadow-2xs border border-black/10"
              style={{ backgroundColor: c.hex, color: getContrastTextColor(c.hex) }}
            >
              Aa
            </div>
          ))}
        </div>
      </div>

      {/* ================= MODAL: ADD TIMEBLOCK / MAP CLASS ================= */}
      {isAddBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-lg bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-4">
              <div>
                <div className="text-[10px] uppercase font-heading font-bold text-[#8B5A3C]">
                  Schedule Entry Chamber
                </div>
                <div className="font-heading text-base font-bold text-[rgb(var(--c-text))]">
                  {entryKind === 'routine' ? 'Map Routine Timeblock' : 'Map University Class Session'}
                </div>
              </div>
              <button
                onClick={() => setIsAddBlockModalOpen(false)}
                className="p-1 rounded-xl text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Entry Kind Toggle */}
            <div className="flex items-center gap-2 p-1 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] mb-4">
              <button
                type="button"
                onClick={() => setEntryKind('routine')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-heading font-bold transition ${
                  entryKind === 'routine'
                    ? 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] shadow-xs border border-[rgb(var(--c-border))]'
                    : 'text-[rgb(var(--c-muted))]'
                }`}
              >
                Non-Class Routine Block
              </button>
              <button
                type="button"
                onClick={() => setEntryKind('class')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-heading font-bold transition ${
                  entryKind === 'class'
                    ? 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] shadow-xs border border-[rgb(var(--c-border))]'
                    : 'text-[rgb(var(--c-muted))]'
                }`}
              >
                University Course Class
              </button>
            </div>

            {/* FORM A: ROUTINE TIMEBLOCK */}
            {entryKind === 'routine' ? (
              <form onSubmit={handleSaveRoutineBlock} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Block Title
                  </label>
                  <input
                    type="text"
                    value={routineTitle}
                    onChange={(e) => setRoutineTitle(e.target.value)}
                    placeholder="e.g. Deep Study Session, Music Jam, Gym &amp; Run"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                      Day of Week
                    </label>
                    <select
                      value={routineDay}
                      onChange={(e) => setRoutineDay(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    >
                      {FULL_DAY_NAMES.map((name, i) => (
                        <option key={name} value={i}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                      Category
                    </label>
                    <select
                      value={routineCategory}
                      onChange={(e) => setRoutineCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    >
                      <option value="study">Study &amp; Library</option>
                      <option value="creative">Creative Studio &amp; Music</option>
                      <option value="health">Exercise &amp; Flow</option>
                      <option value="rest">Rest &amp; Social</option>
                      <option value="admin">Admin &amp; Chores</option>
                      <option value="other">✨ Other (User-Defined)...</option>
                    </select>
                  </div>
                </div>

                {/* Custom Category Input */}
                {routineCategory === 'other' && (
                  <div className="animate-pop p-3 rounded-xl bg-[rgb(var(--c-surface2))] border border-[#8B5A3C]/40 space-y-1">
                    <label className="block text-[11px] font-heading font-bold text-[#8B5A3C]">
                      Custom Category Name / Label
                    </label>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. Research Lab, Side Project, Language"
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                      required
                      autoFocus
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={routineStartTime}
                      onChange={(e) => setRoutineStartTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={routineEndTime}
                      onChange={(e) => setRoutineEndTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                      Block Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={routineBlockNumber}
                      onChange={(e) => setRoutineBlockNumber(e.target.value)}
                      placeholder="e.g. B59 / Library"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                      Class / Room Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={routineClassNumber}
                      onChange={(e) => setRoutineClassNumber(e.target.value)}
                      placeholder="e.g. Room 204 / 3rd Floor"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    />
                  </div>
                </div>

                {/* Day Type & Color */}
                <div>
                  <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                    Context Mode
                  </label>
                  <select
                    value={routineDayType}
                    onChange={(e) => setRoutineDayType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="dorm">Dorm Day (Phone-first)</option>
                    <option value="home">Home Day (PC &amp; Studio)</option>
                    <option value="both">Both / General</option>
                  </select>
                </div>

                {/* Color swatch selection from the 12 neon palette */}
                <div>
                  <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1.5">
                    Neon Accent Color
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_COURSE_NEON_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setRoutineColor(c.hex)}
                        className={`h-7 rounded-xl border-2 transition ${
                          routineColor === c.hex ? 'border-stone-900 dark:border-white scale-105 shadow-md' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-[#8B5A3C] text-white font-heading text-xs sm:text-sm font-bold shadow-md hover:opacity-90 active:scale-95 transition mt-2"
                >
                  Save Master Routine Timeblock
                </button>
              </form>
            ) : (
              /* FORM B: UNIVERSITY CLASS SESSION */
              <form onSubmit={handleSaveClassSession} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-heading font-bold text-[rgb(var(--c-muted))]">
                      Course
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenNewCourse}
                      className="text-[11px] font-heading font-bold text-[#8B5A3C] hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> New Course
                    </button>
                  </div>
                  <select
                    value={classCourseId}
                    onChange={(e) => {
                      setClassCourseId(e.target.value);
                      const c = courseMap.get(e.target.value);
                      if (c) {
                        if (c.building) setClassBuilding(c.building);
                        if (c.room) setClassRoom(c.room);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                      Day of Week
                    </label>
                    <select
                      value={classDay}
                      onChange={(e) => setClassDay(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    >
                      {FULL_DAY_NAMES.map((name, i) => (
                        <option key={name} value={i}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                      Session Type
                    </label>
                    <select
                      value={classType}
                      onChange={(e) => setClassType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    >
                      <option value="lecture">Lecture</option>
                      <option value="lab">Laboratory</option>
                      <option value="tutorial">Tutorial / Recitation</option>
                      <option value="other">Other / Workshop</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={classStartTime}
                      onChange={(e) => setClassStartTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={classEndTime}
                      onChange={(e) => setClassEndTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                      Block Number
                    </label>
                    <input
                      type="text"
                      value={classBuilding}
                      onChange={(e) => setClassBuilding(e.target.value)}
                      placeholder="e.g. Block 59 / ECE"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-1">
                      Class / Hall Number
                    </label>
                    <input
                      type="text"
                      value={classRoom}
                      onChange={(e) => setClassRoom(e.target.value)}
                      placeholder="e.g. Room 204 / Lab-C4"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-[#8B5A3C] text-white font-heading text-xs sm:text-sm font-bold shadow-md hover:opacity-90 active:scale-95 transition mt-2"
                >
                  Map Class to Master Week
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: COURSE CREATION & EDITING ================= */}
      <CourseModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        courseToEdit={courseToEdit}
        onCourseSaved={handleCourseSaved}
      />

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="w-full max-w-sm bg-[rgb(var(--c-surface))] border-2 border-rose-500/50 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <Trash2 className="w-5 h-5 shrink-0" />
              <div className="font-heading font-bold text-sm text-[rgb(var(--c-text))]">
                Remove From Schedule?
              </div>
            </div>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish leading-relaxed">
              Are you sure you want to remove <strong className="text-[rgb(var(--c-text))]">“{itemToDelete.title}”</strong>?
              {itemToDelete.type === 'class'
                ? ' This removes this scheduled session (the course itself remains safely in your registry).'
                : ' This removes this master routine timeblock.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--c-border))]">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-heading font-bold transition shadow-xs"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
