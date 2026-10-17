import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { ClassSession, Course, Semester, DayOfWeek } from '../types';
import {
  DAY_NAMES,
  FULL_DAY_NAMES,
  getDayOfWeekIndex,
  getTodayKey,
} from '../utils/dateUtils';
import {
  findConflicts,
  getSemesterWeekNumber,
  isValidTime,
  ScheduleConflict,
} from '../utils/scheduleEngine';
import { encodeShareCode, decodeShareCode } from '../utils/shareCode';
import { generateId } from '../utils/idGenerator';
import { CourseModal } from '../components/common/CourseModal';
import { getContrastTextColor } from '../theme/themeUtils';
import {
  Calendar,
  Clock,
  Plus,
  Share2,
  AlertTriangle,
  MapPin,
  Building,
  User,
  Trash2,
  Edit2,
  Sparkles,
  Repeat,
  X,
  Check,
  BookOpen,
} from 'lucide-react';

export const TimetablePage: React.FC = () => {
  const { showToast, setCurrentRoute } = useUiStore();
  const todayKey = getTodayKey();
  const [selectedDay, setSelectedDay] = useState<number>(getDayOfWeekIndex());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareInputCode, setShareInputCode] = useState('');

  // Course Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const semesters = useLiveQuery(() => db.semesters.toArray()) || [];
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const sessions = useLiveQuery(() => db.classSessions.toArray()) || [];

  const activeSemester =
    semesters.find(
      (s) =>
        s.id === settings?.activeSemesterId ||
        s.isActive ||
        s.name === settings?.currentTermName
    ) || semesters[0] || null;

  // Form State for Class Session
  const [courseId, setCourseId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<number>(selectedDay);
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('10:20');
  const [type, setType] = useState<'lecture' | 'lab' | 'tutorial' | 'other'>('lecture');
  const [room, setRoom] = useState('');
  const [building, setBuilding] = useState('');
  const [repeat, setRepeat] = useState<'all' | 'odd' | 'even'>('all');

  // Course map
  const courseMap = new Map<string, Course>();
  courses.forEach((c) => courseMap.set(c.id, c));

  // Current week number in semester
  const currentWeekNumber = activeSemester?.startDate
    ? getSemesterWeekNumber(todayKey, activeSemester.startDate)
    : 1;

  // Filter sessions for selected day
  const daySessions = sessions
    .filter((s) => s.dayOfWeek === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Detect time clashes among day sessions using scheduleEngine
  const clashes: string[] = [];
  for (let i = 0; i < daySessions.length; i++) {
    for (let j = i + 1; j < daySessions.length; j++) {
      const a = daySessions[i];
      const b = daySessions[j];
      const repeatOverlap =
        (a.repeat || 'all') === 'all' ||
        (b.repeat || 'all') === 'all' ||
        a.repeat === b.repeat;

      if (repeatOverlap && a.startTime < b.endTime && a.endTime > b.startTime) {
        clashes.push(a.id);
        clashes.push(b.id);
      }
    }
  }

  // Live conflict checking for the modal form
  const modalConflicts: ScheduleConflict[] = isAddModalOpen
    ? findConflicts(
        {
          dayOfWeek: dayOfWeek as DayOfWeek,
          startTime,
          endTime,
          repeat,
          excludeSessionId: editingSession?.id,
        },
        sessions,
        courses
      )
    : [];

  const handleOpenAddSession = () => {
    setEditingSession(null);
    setCourseId(courses[0]?.id || '');
    setDayOfWeek(selectedDay);
    setStartTime('08:30');
    setEndTime('10:20');
    setType('lecture');
    setRoom('');
    setBuilding('');
    setRepeat('all');
    setIsAddModalOpen(true);
  };

  const handleOpenEditSession = (session: ClassSession) => {
    setEditingSession(session);
    setCourseId(session.courseId);
    setDayOfWeek(session.dayOfWeek);
    setStartTime(session.startTime);
    setEndTime(session.endTime);
    setType(session.type);
    setRoom(session.room || '');
    setBuilding(session.building || '');
    setRepeat(session.repeat || 'all');
    setIsAddModalOpen(true);
  };

  const handleSelectCourse = (selectedId: string) => {
    setCourseId(selectedId);
    const selectedCourse = courseMap.get(selectedId);
    if (selectedCourse) {
      if (selectedCourse.building && !building) setBuilding(selectedCourse.building);
      if (selectedCourse.room && !room) setRoom(selectedCourse.room);
    }
  };

  const handleOpenAddCourse = () => {
    setEditingCourse(null);
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourse = (course: Course) => {
    setEditingCourse(course);
    setIsCourseModalOpen(true);
  };

  const handleCourseSaved = (savedCourse: Course) => {
    if (isAddModalOpen) {
      setCourseId(savedCourse.id);
      if (savedCourse.building && !building) setBuilding(savedCourse.building);
      if (savedCourse.room && !room) setRoom(savedCourse.room);
    }
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) {
      showToast('Please select a course for this class period.', 'warning');
      return;
    }

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      showToast('Please specify valid start and end times (HH:MM).', 'warning');
      return;
    }

    if (endTime <= startTime) {
      showToast('End time must be after start time.', 'danger');
      return;
    }

    const semesterId = activeSemester?.id || 'sem-active-term';

    if (editingSession) {
      await db.classSessions.update(editingSession.id, {
        courseId,
        semesterId,
        dayOfWeek: dayOfWeek as DayOfWeek,
        startTime,
        endTime,
        type,
        room: room.trim() || undefined,
        building: building.trim() || undefined,
        repeat,
      });
      showToast('Class session updated successfully!', 'success');
    } else {
      await db.classSessions.add({
        id: generateId(),
        courseId,
        semesterId,
        dayOfWeek: dayOfWeek as DayOfWeek,
        startTime,
        endTime,
        type,
        room: room.trim() || undefined,
        building: building.trim() || undefined,
        repeat,
      });
      showToast('Class scheduled successfully!', 'success');
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteSession = async (id: string) => {
    await db.classSessions.delete(id);
    showToast('Class session removed from timetable.', 'info');
  };

  const handleExportShareCode = () => {
    const payload = { courses, sessions, semester: activeSemester };
    const code = encodeShareCode(payload);
    navigator.clipboard.writeText(code);
    showToast('Timetable share code copied to clipboard!', 'success');
  };

  const handleImportShareCode = async () => {
    if (!shareInputCode.trim()) return;
    const decoded = decodeShareCode<{
      courses: Course[];
      sessions: ClassSession[];
      semester?: Semester;
    }>(shareInputCode.trim());
    if (!decoded || !decoded.sessions) {
      showToast('Invalid or corrupted timetable share code.', 'danger');
      return;
    }

    if (decoded.courses?.length) await db.courses.bulkPut(decoded.courses);
    if (decoded.sessions?.length) await db.classSessions.bulkPut(decoded.sessions);
    if (decoded.semester) await db.semesters.put(decoded.semester);

    showToast(`Imported ${decoded.sessions.length} class sessions successfully!`, 'success');
    setIsShareModalOpen(false);
    setShareInputCode('');
  };

  return (
    <div className="space-y-4 pb-20 animate-pop">
      {/* Header */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#4F7A0A] font-bold flex items-center gap-1.5">
              <span>Academic Schedule Suite</span>
              {activeSemester && (
                <>
                  <span>•</span>
                  <span className="text-[rgb(var(--c-primary))]">
                    {activeSemester.name} (Week {currentWeekNumber})
                  </span>
                </>
              )}
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              University Timetable &amp; Rooms
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Single source of truth • Repeat patterns • Conflict checking • B59 Hall routing
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenAddCourse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:border-[#CCFF00] hover:bg-[#CCFF00]/10 active:scale-95 transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#4F7A0A]" />
              <span>+ Add Course</span>
            </button>
            <button
              onClick={handleOpenAddSession}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#B6E63E] text-stone-900 font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Class</span>
            </button>
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Code</span>
            </button>
          </div>
        </div>

        {/* Courses Neon Bar */}
        <div className="mt-4 pt-3 border-t border-[rgb(var(--c-border))]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-heading font-bold tracking-wider text-[rgb(var(--c-muted))] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#4F7A0A]" />
              Enrolled Modules ({courses.length})
            </span>
            <span className="text-[10px] text-[rgb(var(--c-muted))] font-flourish">
              Tap any course to edit instructor, room, or neon tag
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {courses.map((course) => {
              const contrast = getContrastTextColor(course.color);
              const locationStr = [course.building, course.room].filter(Boolean).join(' • ');

              return (
                <button
                  key={course.id}
                  onClick={() => handleOpenEditCourse(course)}
                  className="group flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] hover:border-[rgb(var(--c-text))] transition active:scale-95 shrink-0"
                  title={`Edit ${course.name} (${course.code})`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs group-hover:scale-125 transition-transform"
                    style={{ backgroundColor: course.color }}
                  />
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md transition-colors"
                    style={{ backgroundColor: course.color, color: contrast }}
                  >
                    {course.code}
                  </span>
                  <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))] max-w-[120px] sm:max-w-[160px] truncate">
                    {course.name}
                  </span>
                  {locationStr && (
                    <span className="text-[10px] text-[rgb(var(--c-muted))] hidden sm:inline">
                      ({locationStr})
                    </span>
                  )}
                  <Edit2 className="w-3 h-3 text-[rgb(var(--c-muted))] group-hover:text-[rgb(var(--c-text))] ml-0.5" />
                </button>
              );
            })}

            <button
              onClick={handleOpenAddCourse}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-[rgb(var(--c-border))] hover:border-[#4F7A0A] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] text-xs font-heading font-bold transition active:scale-95 shrink-0"
            >
              <Plus className="w-3 h-3" />
              <span>+ Add Course</span>
            </button>
          </div>
        </div>

        {/* Day Selector Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-none">
          {DAY_NAMES.map((name, idx) => {
            const isToday = idx === getDayOfWeekIndex();
            const isSelected = selectedDay === idx;
            const countForDay = sessions.filter((s) => s.dayOfWeek === idx).length;

            return (
              <button
                key={name}
                onClick={() => setSelectedDay(idx)}
                className={`flex-1 min-w-[50px] py-2 px-1 rounded-2xl border text-center transition active:scale-95 ${
                  isSelected
                    ? 'border-[#4F7A0A] bg-[#B6E63E] text-stone-950 font-bold shadow-xs'
                    : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] hover:border-[#4F7A0A]'
                }`}
              >
                <div className="text-[11px] font-heading">{name}</div>
                <div className="text-[9px] opacity-75">
                  {isToday ? 'Today' : `${countForDay} classes`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Schedule View */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4">
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
          <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
            {FULL_DAY_NAMES[selectedDay]} Classes
          </div>
          <div className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            {daySessions.length} weekly sessions scheduled
          </div>
        </div>

        {daySessions.length === 0 ? (
          <div className="text-center py-12 text-xs text-[rgb(var(--c-muted))] font-flourish space-y-3">
            <div>No classes scheduled on {FULL_DAY_NAMES[selectedDay]}.</div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={handleOpenAddSession}
                className="px-3.5 py-1.5 rounded-full bg-[#B6E63E] text-stone-950 text-xs font-heading font-bold shadow-xs hover:opacity-90 transition"
              >
                + Schedule a Class
              </button>
              {courses.length === 0 && (
                <button
                  onClick={() => setCurrentRoute('settings')}
                  className="px-3.5 py-1.5 rounded-full border border-[rgb(var(--c-border))] text-xs font-heading font-bold hover:bg-[rgb(var(--c-surface2))] transition"
                >
                  ⚡ Load Section 12 Timetable
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {daySessions.map((session) => {
              const course = courseMap.get(session.courseId);
              const isClashing = clashes.includes(session.id);
              const courseColor = course?.color || '#CCFF00';
              const contrastColor = getContrastTextColor(courseColor);
              const displayBlock = session.building || course?.building;
              const displayRoom = session.room || course?.room;
              const locationParts = [displayBlock, displayRoom].filter(Boolean);
              const repeatLabel =
                session.repeat === 'odd'
                  ? 'Odd Weeks'
                  : session.repeat === 'even'
                  ? 'Even Weeks'
                  : 'Every Week';

              return (
                <div
                  key={session.id}
                  className={`ticket-cutout ticket-border rounded-2xl p-3.5 bg-[rgb(var(--c-bg))] flex items-start justify-between gap-3 relative transition hover:border-[rgb(var(--c-primary))] ${
                    isClashing ? 'ring-2 ring-rose-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span
                      className="w-3.5 self-stretch rounded-full shrink-0 mt-0.5 shadow-2xs"
                      style={{ backgroundColor: courseColor }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {course && (
                          <span
                            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shadow-2xs"
                            style={{ backgroundColor: courseColor, color: contrastColor }}
                          >
                            {course.code}
                          </span>
                        )}
                        <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                          {course ? course.name : 'Unassigned Course'}
                        </span>
                        <span className="text-[9px] uppercase px-2 py-0.2 rounded-full border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] font-medium">
                          {session.type}
                        </span>
                        {session.repeat && session.repeat !== 'all' && (
                          <span className="text-[9px] px-2 py-0.2 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/30 font-bold flex items-center gap-1">
                            <Repeat className="w-2.5 h-2.5" />
                            {repeatLabel}
                          </span>
                        )}
                        {isClashing && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Time Clash!
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[rgb(var(--c-muted))] mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-[rgb(var(--c-primary))]">
                          <Clock className="w-3 h-3" /> {session.startTime} – {session.endTime}
                        </span>
                        {locationParts.length > 0 && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[rgb(var(--c-primary))]" />
                            {locationParts.join(' • ')}
                          </span>
                        )}
                        {(session.instructor || course?.instructor) && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-[rgb(var(--c-primary))]" />
                            {session.instructor || course?.instructor}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditSession(session)}
                      className="p-1.5 text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] rounded-lg hover:bg-[rgb(var(--c-surface2))] transition active:scale-95"
                      title="Edit class schedule, room or repeat rule"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="p-1.5 text-[rgb(var(--c-muted))] hover:text-rose-500 rounded-lg hover:bg-[rgb(var(--c-surface2))] transition active:scale-95"
                      title="Remove class session from timetable"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Class Session Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                {editingSession ? 'Edit Class Session' : 'Schedule University Lecture / Lab'}
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Conflict Warning Box */}
            {modalConflicts.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Schedule Conflict Warning</span>
                </div>
                {modalConflicts.map((c, i) => (
                  <div key={i} className="pl-5 text-[11px] font-flourish">
                    • {c.message}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSaveSession} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-heading font-bold text-[rgb(var(--c-muted))]">
                    Course <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenAddCourse}
                    className="text-[11px] font-heading font-bold text-[rgb(var(--c-primary))] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ New Course</span>
                  </button>
                </div>
                <select
                  value={courseId}
                  onChange={(e) => handleSelectCourse(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--c-primary))]"
                  required
                >
                  <option value="">Select a Course...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Day of Week
                  </label>
                  <select
                    value={isNaN(dayOfWeek) ? 0 : dayOfWeek}
                    onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    {DAY_NAMES.map((name, i) => (
                      <option key={name} value={i}>
                        {FULL_DAY_NAMES[i]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Session Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  >
                    <option value="lecture">Lecture</option>
                    <option value="lab">Lab Practical</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="other">Seminar / Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Start Time (24h)
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    End Time (24h)
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                    required
                  />
                </div>
              </div>

              {/* Repeat Rule Selector */}
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1 flex items-center gap-1">
                  <Repeat className="w-3 h-3 text-[rgb(var(--c-muted))]" />
                  Repeat Schedule
                </label>
                <select
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value as any)}
                  className="w-full px-2 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                >
                  <option value="all">Every Week (Standard)</option>
                  <option value="odd">Odd Weeks Only (Week 1, 3, 5...)</option>
                  <option value="even">Even Weeks Only (Week 2, 4, 6...)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1 flex items-center gap-1">
                    <Building className="w-3 h-3 text-[rgb(var(--c-muted))]" />
                    Building / Block
                  </label>
                  <input
                    type="text"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder="e.g. B59"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[rgb(var(--c-muted))]" />
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="e.g. B59-2-006"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[rgb(var(--c-border))]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#B6E63E] text-stone-950 font-heading text-xs font-bold hover:opacity-90 active:scale-98 transition shadow-xs"
                >
                  {editingSession ? 'Update Class Session' : 'Save Academic Class Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share / Import Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))]">
              <span className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                Timetable Code Portability
              </span>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))] mb-1">
                Export Timetable to Peer
              </div>
              <p className="text-[11px] text-[rgb(var(--c-muted))] font-flourish mb-2">
                Generate a compressed text code containing your registered courses and class periods.
              </p>
              <button
                onClick={handleExportShareCode}
                className="w-full py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading text-xs font-bold hover:opacity-90 transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Copy Timetable Code to Clipboard</span>
              </button>
            </div>

            <div className="pt-3 border-t border-[rgb(var(--c-border))]">
              <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))] mb-1">
                Import Timetable Code
              </div>
              <textarea
                value={shareInputCode}
                onChange={(e) => setShareInputCode(e.target.value)}
                placeholder="Paste code from classmate here..."
                rows={3}
                className="w-full p-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] font-mono text-[rgb(var(--c-text))]"
              />
              <button
                onClick={handleImportShareCode}
                className="w-full mt-2 py-2 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] hover:bg-[rgb(var(--c-text))] hover:text-[rgb(var(--c-bg))] text-xs font-heading font-bold transition"
              >
                Import &amp; Merge Classes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Modal */}
      <CourseModal
        isOpen={isCourseModalOpen}
        courseToEdit={editingCourse}
        onClose={() => setIsCourseModalOpen(false)}
        onCourseSaved={handleCourseSaved}
      />
    </div>
  );
};
