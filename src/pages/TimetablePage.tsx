import React, { useState } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { ClassSession, Course } from '../types';
import {
  DAY_NAMES,
  FULL_DAY_NAMES,
  getDayOfWeekIndex,
  getTodayKey,
  checkTimeClash,
} from '../utils/dateUtils';
import { encodeShareCode, decodeShareCode } from '../utils/shareCode';
import { generateId } from '../utils/idGenerator';
import {
  Calendar,
  Clock,
  Plus,
  Share2,
  Camera,
  AlertTriangle,
  MapPin,
  User,
  Trash2,
  Copy,
  X,
  Check,
} from 'lucide-react';

export const TimetablePage: React.FC = () => {
  const { showToast } = useUiStore();
  const [selectedDay, setSelectedDay] = useState<number>(getDayOfWeekIndex());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareInputCode, setShareInputCode] = useState('');

  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const sessions = useLiveQuery(() => db.classSessions.toArray()) || [];

  // Form State
  const [courseId, setCourseId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<number>(selectedDay);
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('10:20');
  const [type, setType] = useState<'lecture' | 'lab' | 'tutorial' | 'other'>('lecture');
  const [room, setRoom] = useState('');
  const [building, setBuilding] = useState('');

  // Course map
  const courseMap = new Map<string, Course>();
  courses.forEach((c) => courseMap.set(c.id, c));

  // Filter sessions
  const daySessions = sessions
    .filter((s) => s.dayOfWeek === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Detect clashes
  const clashes: string[] = [];
  for (let i = 0; i < daySessions.length; i++) {
    for (let j = i + 1; j < daySessions.length; j++) {
      if (checkTimeClash(daySessions[i].startTime, daySessions[i].endTime, daySessions[j].startTime, daySessions[j].endTime)) {
        clashes.push(daySessions[i].id);
        clashes.push(daySessions[j].id);
      }
    }
  }

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) {
      showToast('Please select a course for this lecture block.', 'warning');
      return;
    }

    await db.classSessions.add({
      id: generateId(),
      courseId,
      dayOfWeek: dayOfWeek as any,
      startTime,
      endTime,
      type,
      room,
      building,
      repeat: 'all',
    });

    showToast('Class scheduled successfully!', 'success');
    setIsAddModalOpen(false);
  };

  const handleDeleteSession = async (id: string) => {
    await db.classSessions.delete(id);
    showToast('Class session removed.', 'info');
  };

  const handleExportShareCode = () => {
    const payload = { courses, sessions };
    const code = encodeShareCode(payload);
    navigator.clipboard.writeText(code);
    showToast('Timetable share code copied to clipboard!', 'success');
  };

  const handleImportShareCode = async () => {
    if (!shareInputCode.trim()) return;
    const decoded = decodeShareCode<{ courses: Course[]; sessions: ClassSession[] }>(shareInputCode.trim());
    if (!decoded || !decoded.sessions) {
      showToast('Invalid or corrupted timetable share code.', 'danger');
      return;
    }

    if (decoded.courses?.length) await db.courses.bulkPut(decoded.courses);
    if (decoded.sessions?.length) await db.classSessions.bulkPut(decoded.sessions);

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
            <div className="text-[10px] uppercase font-heading tracking-widest text-[#4F7A0A] font-bold">
              Academic Schedule Suite
            </div>
            <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
              University Timetable & Rooms
            </h2>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
              Zero hardcoding • Conflict detection • Campus hall routing
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#B6E63E] text-stone-900 font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Class</span>
            </button>
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-text))] font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Code</span>
            </button>
            <button
              disabled
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] text-xs opacity-60 cursor-not-allowed"
              title="Screenshot OCR parsing coming in future version"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="text-[10px]">Photo OCR (Soon)</span>
            </button>
          </div>
        </div>

        {/* Day Selector Pills */}
        <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1 scrollbar-none">
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

      {/* Day Agenda View */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4">
        <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
          <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
            {FULL_DAY_NAMES[selectedDay]} Schedule
          </div>
          <div className="text-xs text-[rgb(var(--c-muted))] font-flourish">
            {daySessions.length} sessions scheduled
          </div>
        </div>

        {daySessions.length === 0 ? (
          <div className="text-center py-12 text-xs text-[rgb(var(--c-muted))] font-flourish space-y-2">
            <div>No academic lectures scheduled on {FULL_DAY_NAMES[selectedDay]}.</div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] underline"
            >
              + Add a lecture or lab session
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {daySessions.map((session) => {
              const course = courseMap.get(session.courseId);
              const isClashing = clashes.includes(session.id);
              const courseColor = course?.color || '#B6E63E';

              return (
                <div
                  key={session.id}
                  className={`ticket-cutout ticket-border rounded-2xl p-3.5 bg-[rgb(var(--c-bg))] flex items-start justify-between gap-3 relative transition hover:border-[rgb(var(--c-primary))] ${
                    isClashing ? 'ring-2 ring-rose-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span
                      className="w-3.5 self-stretch rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: courseColor }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                          {course ? `${course.code} — ${course.name}` : 'Unknown Course'}
                        </span>
                        <span className="text-[9px] uppercase px-2 py-0.2 rounded-full border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))]">
                          {session.type}
                        </span>
                        {isClashing && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Time Clash!
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[rgb(var(--c-muted))] mt-1 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-[rgb(var(--c-primary))]">
                          <Clock className="w-3 h-3" /> {session.startTime} – {session.endTime}
                        </span>
                        {session.room && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {session.room} {session.building && `(${session.building})`}
                          </span>
                        )}
                        {course?.instructor && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {course.instructor}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="p-1.5 text-[rgb(var(--c-muted))] hover:text-rose-500 rounded-lg hover:bg-[rgb(var(--c-surface2))] transition active:scale-95 shrink-0"
                    title="Remove class"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Class Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                Schedule University Lecture / Lab
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-3">
              <div>
                <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                  Course
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
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
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
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
                    Start Time
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
                    End Time
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Room / Hall
                  </label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="e.g. B59-2-005"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading text-[rgb(var(--c-muted))] mb-1">
                    Building
                  </label>
                  <input
                    type="text"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder="e.g. Block 59"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2 rounded-xl bg-[#B6E63E] text-stone-950 font-heading text-xs font-bold hover:opacity-90 active:scale-98 transition shadow-xs"
              >
                Save Academic Class
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Share / Import Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-pop">
          <div className="relative w-full max-w-md bg-[rgb(var(--c-surface))] border-2 border-[rgb(var(--c-border))] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[rgb(var(--c-border))] mb-3">
              <div className="font-heading text-sm font-bold text-[rgb(var(--c-text))]">
                Timetable Share & Sync Codes
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded-full text-[rgb(var(--c-muted))] hover:bg-[rgb(var(--c-surface2))]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-heading font-bold text-[rgb(var(--c-text))] mb-1">
                  1. Copy Your Timetable Share Code
                </label>
                <p className="text-[11px] text-[rgb(var(--c-muted))] mb-2">
                  Share this compressed text code with classmates so they can load your section's class times in one tap.
                </p>
                <button
                  onClick={handleExportShareCode}
                  className="w-full py-2 rounded-xl bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] font-heading font-bold flex items-center justify-center gap-1.5 active:scale-98 transition shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Compressed Share Code</span>
                </button>
              </div>

              <div className="pt-3 border-t border-[rgb(var(--c-border))]">
                <label className="block font-heading font-bold text-[rgb(var(--c-text))] mb-1">
                  2. Paste Classmate's Share Code
                </label>
                <textarea
                  value={shareInputCode}
                  onChange={(e) => setShareInputCode(e.target.value)}
                  placeholder="Paste LZ-compressed share code here..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] text-[rgb(var(--c-text))]"
                />
                <button
                  onClick={handleImportShareCode}
                  className="w-full mt-2 py-2 rounded-xl bg-[#B6E63E] text-stone-950 font-heading font-bold flex items-center justify-center gap-1.5 active:scale-98 transition shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Import Schedule</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
