import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import {
  Course,
  ClassSession,
  ClassException,
  Task,
  Exam,
  ExamTopic,
  GradeComponent,
  AttendanceRecord,
  FocusSession,
  StudyBlock,
  StudyPlannerSuggestion,
} from '../types';
import { getTodayKey, getCurrentTimeString } from '../utils/dateUtils';
import { getContrastTextColor } from '../theme/themeUtils';
import {
  calculateAttendanceStanding,
  saveAttendanceQuickMark,
  canMarkAttendance,
} from '../utils/attendanceEngine';
import {
  generateStudyPlan,
  getCourseStudyTime,
  acceptStudySuggestion,
  createDismissedSuggestion,
} from '../utils/studyPlannerEngine';
import { awardXp, triggerLevelUpConfetti } from '../services/rpgService';
import { CourseModal } from '../components/common/CourseModal';
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Award,
  CheckCircle2,
  X,
  AlertCircle,
  ExternalLink,
  Edit3,
  Plus,
  Trash2,
  Sparkles,
  Flame,
  FileText,
  TrendingUp,
} from 'lucide-react';

interface CourseHubPageProps {
  courseId: string;
}

const DAYS_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const CourseHubPage: React.FC<CourseHubPageProps> = ({ courseId }) => {
  const { showToast, setCurrentRoute } = useUiStore();
  const todayKey = getTodayKey();
  const currentTime = getCurrentTimeString();

  // Queries
  const course = useLiveQuery(() => db.courses.get(courseId), [courseId]);
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const sessions = useLiveQuery(
    () => db.classSessions.where('courseId').equals(courseId).toArray(),
    [courseId]
  ) || [];
  const exceptions = useLiveQuery(
    () => db.classExceptions.toArray(),
    []
  ) || [];
  const attendanceRecords = useLiveQuery(
    () => db.attendance.where('courseId').equals(courseId).toArray(),
    [courseId]
  ) || [];
  const tasks = useLiveQuery(
    () => db.tasks.where('courseId').equals(courseId).toArray(),
    [courseId]
  ) || [];
  const exams = useLiveQuery(
    () => db.exams.where('courseId').equals(courseId).toArray(),
    [courseId]
  ) || [];
  const allExamTopics = useLiveQuery(() => db.examTopics.toArray(), []) || [];
  const examIds = exams.map((e) => e.id);
  const examTopics = allExamTopics.filter((t) => examIds.includes(t.examId));

  const gradeComponents = useLiveQuery(
    () => db.gradeComponents.where('courseId').equals(courseId).toArray(),
    [courseId]
  ) || [];
  const focusSessions = useLiveQuery(
    () => db.focusSessions.where('courseId').equals(courseId).toArray(),
    [courseId]
  ) || [];
  const studyBlocks = useLiveQuery(
    () => db.studyBlocks.where('courseId').equals(courseId).toArray(),
    [courseId]
  ) || [];
  const dismissedSuggestions = useLiveQuery(
    () => db.dismissedStudySuggestions.toArray(),
    []
  ) || [];

  // Local state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [isNotesDirty, setIsNotesDirty] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingComponent, setIsAddingComponent] = useState(false);
  const [newComponentName, setNewComponentName] = useState('');
  const [newComponentWeight, setNewComponentWeight] = useState('20');
  const [newComponentMax, setNewComponentMax] = useState('100');
  const [newComponentEarned, setNewComponentEarned] = useState('');
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Sync initial notes from course
  useEffect(() => {
    if (course && course.notes !== undefined && !isNotesDirty) {
      setNotesText(course.notes || '');
    }
  }, [course?.notes, isNotesDirty]);

  // Debounced auto-save notes
  useEffect(() => {
    if (!isNotesDirty || !course) return;
    const timeout = setTimeout(async () => {
      try {
        await db.courses.update(course.id, {
          notes: notesText,
          updatedAt: new Date().toISOString(),
        });
        setIsNotesDirty(false);
      } catch (err) {
        console.warn('Could not auto-save notes:', err);
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [notesText, isNotesDirty, course]);

  // Handle missing course (friendly "Course Not Found" state)
  if (course === undefined) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="text-center font-mono text-xs text-[rgb(var(--c-muted))]">
          Locating module in archives...
        </div>
      </div>
    );
  }

  if (course === null) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] flex items-center justify-center text-[rgb(var(--c-muted))]">
          <BookOpen className="w-8 h-8 opacity-60" />
        </div>
        <h2 className="text-xl font-heading font-bold text-[rgb(var(--c-text))]">
          Course Not Found
        </h2>
        <p className="text-xs text-[rgb(var(--c-muted))] font-flourish max-w-sm mx-auto">
          The requested course module does not exist or may have been archived or removed from your registry.
        </p>
        <button
          onClick={() => setCurrentRoute('#/courses')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgb(var(--c-primary))] text-stone-950 font-heading text-xs font-bold shadow-xs hover:opacity-95 active:scale-95 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to All Courses</span>
        </button>
      </div>
    );
  }

  const contrast = getContrastTextColor(course.color || '#3b82f6');

  // Next class calculation
  const now = new Date();
  const currentDayOfWeek = (now.getDay() === 0 ? 6 : now.getDay() - 1);
  let nextSessionInfo: {
    session: ClassSession;
    dateStr: string;
    dayLabel: string;
    isToday: boolean;
  } | null = null;

  if (sessions.length > 0) {
    // Check today first
    const todaySessions = sessions
      .filter((s) => s.dayOfWeek === currentDayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const upcomingToday = todaySessions.find((s) => s.startTime > currentTime);
    if (upcomingToday) {
      nextSessionInfo = {
        session: upcomingToday,
        dateStr: todayKey,
        dayLabel: 'Today',
        isToday: true,
      };
    } else {
      // Find in upcoming days
      for (let offset = 1; offset <= 7; offset++) {
        const nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + offset);
        const nextDayOfWeek = (nextDate.getDay() === 0 ? 6 : nextDate.getDay() - 1);
        const daySession = sessions
          .filter((s) => s.dayOfWeek === nextDayOfWeek)
          .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

        if (daySession) {
          const y = nextDate.getFullYear();
          const m = String(nextDate.getMonth() + 1).padStart(2, '0');
          const d = String(nextDate.getDate()).padStart(2, '0');
          nextSessionInfo = {
            session: daySession,
            dateStr: `${y}-${m}-${d}`,
            dayLabel: offset === 1 ? 'Tomorrow' : DAYS_NAMES[nextDayOfWeek],
            isToday: false,
          };
          break;
        }
      }
    }
  }

  // Attendance standing with gentle wording
  const threshold = settings?.attendanceThresholdPercent || 80;
  const attendanceStanding = calculateAttendanceStanding(attendanceRecords, threshold);

  // Focus metrics
  const studyStats = getCourseStudyTime(course.id, focusSessions);

  // Study planner suggestions for this course
  const studySuggestions: StudyPlannerSuggestion[] = generateStudyPlan({
    currentDate: todayKey,
    daysToPlan: 7,
    courses: [course],
    classSessions: sessions,
    classExceptions: exceptions,
    exams,
    examTopics,
    existingStudyBlocks: studyBlocks,
    dismissedSuggestions,
    settings: {
      sleepStartTime: settings?.sleepStartTime || '23:00',
      sleepEndTime: settings?.sleepEndTime || '07:00',
      quietHours: settings?.notificationSettings?.quietHours,
    },
  }).filter((s) => s.courseId === course.id);

  // Grade standing
  let totalGradeWeight = 0;
  let earnedWeightedScore = 0;
  gradeComponents.forEach((c) => {
    if (c.isCompleted && c.earnedScore !== undefined && c.maxScore > 0) {
      totalGradeWeight += c.weight;
      earnedWeightedScore += (c.earnedScore / c.maxScore) * c.weight;
    }
  });
  const currentGradePercent =
    totalGradeWeight > 0 ? Math.round((earnedWeightedScore / totalGradeWeight) * 100) : null;

  // Actions
  const handleAttendanceMark = async (status: 'present' | 'late' | 'absent') => {
    const session = nextSessionInfo?.isToday ? nextSessionInfo.session : undefined;
    const res = await saveAttendanceQuickMark({
      courseId: course.id,
      date: todayKey,
      status,
      sessionId: session?.id,
      startTime: session?.startTime,
      allowToggle: true,
    });

    if (!res.success) {
      showToast(res.error || 'Attendance could not be logged.', 'danger');
      return;
    }

    if (res.action === 'toggled_off') {
      showToast('Attendance mark cleared.', 'info');
    } else {
      if (status === 'present') {
        await awardXp({
          source: 'attendance',
          sourceId: res.record?.id || course.id,
          amount: 10,
          stat: 'discipline',
        });
        triggerLevelUpConfetti();
      } else if (status === 'late') {
        await awardXp({
          source: 'attendance',
          sourceId: res.record?.id || course.id,
          amount: 5,
          stat: 'discipline',
        });
      }
      showToast(`Marked ${status} for today.`, 'success');
    }
  };

  const handleToggleTask = async (task: Task) => {
    const nextStatus = task.status === 'todo' ? 'done' : 'todo';
    await db.tasks.update(task.id, {
      status: nextStatus,
      completedAt: nextStatus === 'done' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    });

    if (nextStatus === 'done') {
      await awardXp({
        source: 'task',
        sourceId: task.id,
        amount: 15,
        stat: 'discipline',
      });
      triggerLevelUpConfetti();
      showToast(`Task completed! (+15 XP)`, 'success');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    await db.tasks.add({
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newTaskTitle.trim(),
      courseId: course.id,
      priority: 'medium',
      effort: 'medium',
      status: 'todo',
      dueDate: todayKey,
      contextTag: 'laptop',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setNewTaskTitle('');
    showToast('Task added to course docket.', 'success');
  };

  const handleToggleTopic = async (topic: ExamTopic) => {
    const isStudied = !topic.isStudied;
    await db.examTopics.update(topic.id, {
      isStudied,
      targetStudyDate: isStudied ? todayKey : undefined,
    });
    if (isStudied) {
      await awardXp({
        source: 'exam-topic',
        sourceId: topic.id,
        amount: 10,
        stat: 'knowledge',
      });
      triggerLevelUpConfetti();
      showToast('Topic marked studied! Spaced reviews queued.', 'success');
    }
  };

  const handleAcceptSuggestion = async (sug: StudyPlannerSuggestion) => {
    const block = acceptStudySuggestion(sug);
    await db.studyBlocks.add(block);
    showToast(`Study block scheduled for ${block.date} at ${block.startTime}.`, 'success');
  };

  const handleDismissSuggestion = async (sug: StudyPlannerSuggestion) => {
    const item = createDismissedSuggestion(sug.key.split('-')[0] + '-' + sug.key.split('-')[1], sug.date);
    await db.dismissedStudySuggestions.add(item);
    showToast('Suggestion dismissed for today.', 'info');
  };

  const handleAddGradeComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComponentName.trim()) return;

    const weight = parseFloat(newComponentWeight) || 0;
    const maxScore = parseFloat(newComponentMax) || 100;
    const earned = newComponentEarned ? parseFloat(newComponentEarned) : undefined;

    await db.gradeComponents.add({
      id: `gc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      courseId: course.id,
      name: newComponentName.trim(),
      weight,
      maxScore,
      earnedScore: earned,
      isCompleted: earned !== undefined,
    });

    setNewComponentName('');
    setNewComponentEarned('');
    setIsAddingComponent(false);
    showToast('Grade component saved.', 'success');
  };

  const handleDeleteGradeComponent = async (id: string) => {
    await db.gradeComponents.delete(id);
    showToast('Grade component removed.', 'info');
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;

    const existingLinks = course.links || [];
    const formattedUrl = newLinkUrl.startsWith('http') ? newLinkUrl : `https://${newLinkUrl}`;
    const updatedLinks = [...existingLinks, { title: newLinkTitle.trim(), url: formattedUrl }];

    await db.courses.update(course.id, {
      links: updatedLinks,
      updatedAt: new Date().toISOString(),
    });

    setNewLinkTitle('');
    setNewLinkUrl('');
    setIsAddingLink(false);
    showToast('Course link added.', 'success');
  };

  const todayRecord = attendanceRecords.find((r) => r.date === todayKey);
  const markEligibility = canMarkAttendance({
    date: todayKey,
    startTime: nextSessionInfo?.isToday ? nextSessionInfo.session.startTime : undefined,
  });

  return (
    <div className="space-y-4 pb-24 animate-pop">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentRoute('#/courses')}
          className="inline-flex items-center gap-1.5 text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))] transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Enrolled Courses</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-xs font-heading font-bold text-[rgb(var(--c-text))] hover:border-[rgb(var(--c-primary))] transition cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Module</span>
          </button>
        </div>
      </div>

      {/* Hero Module Passport Card */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 relative overflow-hidden shadow-xs">
        <div
          className="absolute top-0 left-0 right-0 h-2.5"
          style={{ backgroundColor: course.color || '#3b82f6' }}
        />

        <div className="pt-2 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md shadow-2xs"
                style={{ backgroundColor: course.color || '#3b82f6', color: contrast }}
              >
                {course.code}
              </span>
              <span className="text-[10px] uppercase font-heading font-bold tracking-wider text-[rgb(var(--c-muted))]">
                {course.term || 'Current Term'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))] break-words">
              {course.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[rgb(var(--c-muted))]">
              {course.creditHours && (
                <div className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
                  <span>{course.creditHours} Credit Hours</span>
                </div>
              )}
              {course.instructor && (
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
                  <span>{course.instructor}</span>
                </div>
              )}
              {(course.building || course.room) && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[rgb(var(--c-primary))]" />
                  <span>{[course.building, course.room].filter(Boolean).join(' • ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Focus / Stats Badge */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-[rgb(var(--c-border))]">
            <div className="text-left sm:text-right">
              <div className="text-[10px] font-heading font-bold uppercase tracking-wider text-[rgb(var(--c-muted))]">
                Total Focus Time
              </div>
              <div className="text-base font-mono font-bold text-[rgb(var(--c-text))] flex items-center gap-1 sm:justify-end">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>{studyStats.formattedTime}</span>
              </div>
              <div className="text-[10px] text-[rgb(var(--c-muted))]">
                {studyStats.sessionCount} logged sessions
              </div>
            </div>

            <button
              onClick={() => setCurrentRoute('#/focus')}
              className="px-3 py-1.5 rounded-xl bg-[rgb(var(--c-primary))] text-stone-950 font-heading text-xs font-bold hover:opacity-95 active:scale-95 transition cursor-pointer"
            >
              Start Focus Session
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Next Class & Attendance Quick-Mark */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Next Class & Quick-Mark */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-2 text-xs font-heading font-bold text-[rgb(var(--c-text))]">
              <Clock className="w-4 h-4 text-[rgb(var(--c-primary))]" />
              <span>Next Class Session</span>
            </div>
            {nextSessionInfo && (
              <span className="font-mono text-[11px] font-bold text-[rgb(var(--c-muted))]">
                {nextSessionInfo.dayLabel}
              </span>
            )}
          </div>

          {nextSessionInfo ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm font-bold text-[rgb(var(--c-text))]">
                    {nextSessionInfo.session.startTime} – {nextSessionInfo.session.endTime}
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-heading font-bold bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))]">
                    {nextSessionInfo.session.type}
                  </span>
                </div>
                {(nextSessionInfo.session.building || nextSessionInfo.session.room) && (
                  <div className="text-xs text-[rgb(var(--c-muted))] mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {[nextSessionInfo.session.building, nextSessionInfo.session.room]
                        .filter(Boolean)
                        .join(' • ')}
                    </span>
                  </div>
                )}
              </div>

              {/* One-Tap Quick Mark (Today only) */}
              <div className="pt-1">
                <div className="text-[11px] font-heading font-bold text-[rgb(var(--c-muted))] mb-2 flex items-center justify-between">
                  <span>Today's Attendance Quick-Mark</span>
                  {todayRecord && (
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                      Logged: {todayRecord.status}
                    </span>
                  )}
                </div>

                {!markEligibility.canMark ? (
                  <div className="p-2.5 rounded-xl bg-[rgb(var(--c-bg))] text-center text-xs text-[rgb(var(--c-muted))] font-flourish">
                    {markEligibility.reason}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAttendanceMark('present')}
                      className={`min-h-[36px] py-1.5 px-2 rounded-xl text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                        todayRecord?.status === 'present'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] hover:border-emerald-500'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Present</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAttendanceMark('late')}
                      className={`min-h-[36px] py-1.5 px-2 rounded-xl text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                        todayRecord?.status === 'late'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] hover:border-amber-500'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Late</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAttendanceMark('absent')}
                      className={`min-h-[36px] py-1.5 px-2 rounded-xl text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                        todayRecord?.status === 'absent'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-text))] hover:border-rose-500'
                      }`}
                    >
                      <X className="w-3.5 h-3.5 text-rose-400" />
                      <span>Absent</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-[rgb(var(--c-muted))] bg-[rgb(var(--c-bg))] rounded-xl font-flourish">
              No weekly class times registered for this course yet. Add sessions via your Timetable.
            </div>
          )}
        </div>

        {/* Attendance % vs Threshold (Gentle Non-Scolding Wording) */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-2 text-xs font-heading font-bold text-[rgb(var(--c-text))]">
              <TrendingUp className="w-4 h-4 text-[rgb(var(--c-primary))]" />
              <span>Attendance Standing</span>
            </div>
            <span className="font-mono text-xs font-bold text-[rgb(var(--c-muted))]">
              Goal: {threshold}%
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-heading font-bold ${
                  attendanceStanding.isAboveThreshold
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {attendanceStanding.ratePercent}%
              </span>
              <span className="text-xs text-[rgb(var(--c-muted))]">recorded attendance</span>
            </div>

            <div className="text-right text-[11px] font-mono text-[rgb(var(--c-muted))]">
              {attendanceStanding.presentCount}P • {attendanceStanding.lateCount}L • {attendanceStanding.absentCount}A
            </div>
          </div>

          {/* Gentle supportive banner */}
          <div
            className={`p-3 rounded-xl border text-xs font-flourish leading-relaxed ${
              attendanceStanding.isAboveThreshold
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
            }`}
          >
            {attendanceStanding.message}
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-[rgb(var(--c-bg))] overflow-hidden border border-[rgb(var(--c-border))]">
            <div
              className={`h-full transition-all duration-500 ${
                attendanceStanding.isAboveThreshold ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, attendanceStanding.ratePercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Weekly Times and Rooms Table */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2 text-xs font-heading font-bold text-[rgb(var(--c-text))]">
            <Calendar className="w-4 h-4 text-[rgb(var(--c-primary))]" />
            <span>Weekly Recurring Schedule</span>
          </div>
          <button
            onClick={() => setCurrentRoute('#/timetable')}
            className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] cursor-pointer"
          >
            Open Timetable →
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="p-4 text-center text-xs text-[rgb(var(--c-muted))] bg-[rgb(var(--c-bg))] rounded-xl font-flourish">
            No regular lecture sessions added yet for this course.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-xs text-[rgb(var(--c-text))]">
                    {DAYS_NAMES[s.dayOfWeek]}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-bold bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))]">
                    {s.type}
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-[rgb(var(--c-text))]">
                  {s.startTime} – {s.endTime}
                </div>
                {(s.building || s.room) && (
                  <div className="text-[11px] text-[rgb(var(--c-muted))] flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>{[s.building, s.room].filter(Boolean).join(' • ')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid: Upcoming Deadlines & Exam Countdown with Topic Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Deadlines & Tasks */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-2 text-xs font-heading font-bold text-[rgb(var(--c-text))]">
              <CheckCircle2 className="w-4 h-4 text-[rgb(var(--c-primary))]" />
              <span>Upcoming Deadlines &amp; Tasks</span>
            </div>
            <span className="text-[11px] font-mono text-[rgb(var(--c-muted))]">
              {tasks.filter((t) => t.status === 'todo').length} pending
            </span>
          </div>

          {/* Quick Task Add */}
          <form onSubmit={handleAddTask} className="flex gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add course task (e.g. Read Chapter 4)..."
              className="flex-1 px-3 py-1.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs font-heading text-[rgb(var(--c-text))] focus:outline-hidden focus:border-[rgb(var(--c-primary))]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-[rgb(var(--c-primary))] text-stone-950 font-heading text-xs font-bold shrink-0 hover:opacity-90 active:scale-95 transition cursor-pointer"
            >
              Add
            </button>
          </form>

          {tasks.length === 0 ? (
            <div className="p-4 text-center text-xs text-[rgb(var(--c-muted))] bg-[rgb(var(--c-bg))] rounded-xl font-flourish">
              No tasks logged for this module yet. All assignments clear.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {tasks.map((task) => {
                const isDone = task.status === 'done';
                return (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                      isDone
                        ? 'bg-[rgb(var(--c-bg))] border-[rgb(var(--c-border))] opacity-60'
                        : 'bg-[rgb(var(--c-surface))] border-[rgb(var(--c-border))] hover:border-[rgb(var(--c-primary))]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))]'
                        }`}
                      >
                        {isDone && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      <span
                        className={`text-xs font-heading font-medium truncate ${
                          isDone ? 'line-through text-[rgb(var(--c-muted))]' : 'text-[rgb(var(--c-text))]'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    {task.dueDate && (
                      <span className="font-mono text-[10px] text-[rgb(var(--c-muted))] shrink-0">
                        {task.dueDate}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Exam Countdown & Topic Progress */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-2 text-xs font-heading font-bold text-[rgb(var(--c-text))]">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Exams &amp; Topic Progress</span>
            </div>
            <button
              onClick={() => setCurrentRoute('#/exams')}
              className="text-xs font-heading font-bold text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-primary))] cursor-pointer"
            >
              Exams Vault →
            </button>
          </div>

          {exams.length === 0 ? (
            <div className="p-4 text-center text-xs text-[rgb(var(--c-muted))] bg-[rgb(var(--c-bg))] rounded-xl font-flourish">
              No exams scheduled for this course yet.
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map((exam) => {
                const topicsForExam = examTopics.filter((t) => t.examId === exam.id);
                const studiedCount = topicsForExam.filter((t) => t.isStudied).length;
                const progressPct =
                  topicsForExam.length > 0
                    ? Math.round((studiedCount / topicsForExam.length) * 100)
                    : 0;

                const daysRemaining = Math.round(
                  (new Date(exam.examDate).getTime() - new Date(todayKey).getTime()) /
                    (1000 * 60 * 60 * 24)
                );

                return (
                  <div
                    key={exam.id}
                    className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                          {exam.title}
                        </div>
                        <div className="text-[11px] text-[rgb(var(--c-muted))]">
                          {exam.examDate} • {exam.startTime} • Weight: {exam.weight}%
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold ${
                            daysRemaining <= 2
                              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                              : 'bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] border border-[rgb(var(--c-border))]'
                          }`}
                        >
                          {daysRemaining === 0
                            ? 'Today!'
                            : daysRemaining === 1
                            ? 'Tomorrow!'
                            : `${daysRemaining} days left`}
                        </span>
                      </div>
                    </div>

                    {/* Topic checklist */}
                    {topicsForExam.length > 0 && (
                      <div className="pt-2 border-t border-[rgb(var(--c-border))] space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-heading font-bold text-[rgb(var(--c-muted))]">
                          <span>Topics Mastery</span>
                          <span>
                            {studiedCount}/{topicsForExam.length} ({progressPct}%)
                          </span>
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {topicsForExam.map((topic) => (
                            <div
                              key={topic.id}
                              onClick={() => handleToggleTopic(topic)}
                              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[rgb(var(--c-surface))] cursor-pointer text-xs transition"
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                  topic.isStudied
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'border-[rgb(var(--c-border))]'
                                }`}
                              >
                                {topic.isStudied && <CheckCircle2 className="w-2.5 h-2.5" />}
                              </div>
                              <span
                                className={`truncate ${
                                  topic.isStudied
                                    ? 'line-through text-[rgb(var(--c-muted))]'
                                    : 'text-[rgb(var(--c-text))]'
                                }`}
                              >
                                {topic.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Grade Components & Current Standing */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2 text-xs font-heading font-bold text-[rgb(var(--c-text))]">
            <Award className="w-4 h-4 text-[rgb(var(--c-primary))]" />
            <span>Grade Components &amp; Standing</span>
          </div>

          <div className="flex items-center gap-3">
            {currentGradePercent !== null && (
              <span className="font-heading font-bold text-xs text-emerald-600 dark:text-emerald-400">
                Current Standing: {currentGradePercent}%
              </span>
            )}
            <button
              onClick={() => setIsAddingComponent(!isAddingComponent)}
              className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] hover:underline cursor-pointer"
            >
              {isAddingComponent ? 'Cancel' : '+ Add Component'}
            </button>
          </div>
        </div>

        {isAddingComponent && (
          <form
            onSubmit={handleAddGradeComponent}
            className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] space-y-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Component name (e.g. Midterm)"
                value={newComponentName}
                onChange={(e) => setNewComponentName(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-xs font-heading text-[rgb(var(--c-text))]"
              />
              <input
                type="number"
                placeholder="Weight % (e.g. 20)"
                value={newComponentWeight}
                onChange={(e) => setNewComponentWeight(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-xs font-heading text-[rgb(var(--c-text))]"
              />
              <input
                type="number"
                placeholder="Max Score (e.g. 100)"
                value={newComponentMax}
                onChange={(e) => setNewComponentMax(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-xs font-heading text-[rgb(var(--c-text))]"
              />
              <input
                type="number"
                placeholder="Earned (optional)"
                value={newComponentEarned}
                onChange={(e) => setNewComponentEarned(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-xs font-heading text-[rgb(var(--c-text))]"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-[rgb(var(--c-primary))] text-stone-950 font-heading text-xs font-bold hover:opacity-90 transition cursor-pointer"
            >
              Save Component
            </button>
          </form>
        )}

        {gradeComponents.length === 0 ? (
          <div className="p-4 text-center text-xs text-[rgb(var(--c-muted))] bg-[rgb(var(--c-bg))] rounded-xl font-flourish">
            No grading rubric components registered yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {gradeComponents.map((comp) => (
              <div
                key={comp.id}
                className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex items-start justify-between gap-2"
              >
                <div>
                  <div className="font-heading font-bold text-xs text-[rgb(var(--c-text))]">
                    {comp.name}
                  </div>
                  <div className="text-[11px] text-[rgb(var(--c-muted))]">
                    Weight: {comp.weight}% • Max: {comp.maxScore}
                  </div>
                  <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {comp.earnedScore !== undefined ? `Score: ${comp.earnedScore}/${comp.maxScore}` : 'Pending'}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteGradeComponent(comp.id)}
                  className="p-1 text-[rgb(var(--c-muted))] hover:text-rose-500 transition cursor-pointer"
                  title="Remove component"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Study Planner Suggestions for This Course */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
          <div className="flex items-center gap-2 text-xs font-heading font-bold text-[rgb(var(--c-text))]">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Study Planner Suggestions (Next 7 Days)</span>
          </div>
          <span className="text-[11px] font-heading text-[rgb(var(--c-muted))]">
            Pure Rules • Zero AI
          </span>
        </div>

        {studySuggestions.length === 0 ? (
          <div className="p-4 text-center text-xs text-[rgb(var(--c-muted))] bg-[rgb(var(--c-bg))] rounded-xl font-flourish">
            No study blocks currently suggested for this module. You are caught up!
          </div>
        ) : (
          <div className="space-y-2">
            {studySuggestions.map((sug) => (
              <div
                key={sug.key}
                className="p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[rgb(var(--c-text))]">
                      {sug.date} • {sug.startTime} – {sug.endTime} ({sug.durationMinutes}m)
                    </span>
                    {sug.isSpacedRevision && (
                      <span className="px-1.5 py-0.2 rounded font-heading font-bold text-[9px] bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                        {sug.revisionDayNumber}d Spaced Repetition
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                    {sug.title}
                  </div>
                  <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                    {sug.reason}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAcceptSuggestion(sug)}
                    className="px-3 py-1.5 rounded-xl bg-[rgb(var(--c-primary))] text-stone-950 font-heading text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition cursor-pointer"
                  >
                    Accept Block
                  </button>
                  <button
                    onClick={() => handleDismissSuggestion(sug)}
                    className="px-2.5 py-1.5 rounded-xl bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-[rgb(var(--c-muted))] hover:text-rose-500 text-xs font-heading font-bold active:scale-95 transition cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Notes (Additive field course.notes) & External Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Notes */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-2 text-xs font-heading font-bold text-[rgb(var(--c-text))]">
              <FileText className="w-4 h-4 text-[rgb(var(--c-primary))]" />
              <span>Quick Notes &amp; Syllabus Memo</span>
            </div>
            <span className="text-[10px] text-[rgb(var(--c-muted))] font-mono">
              {isNotesDirty ? 'Saving...' : 'Auto-saved'}
            </span>
          </div>

          <textarea
            value={notesText}
            onChange={(e) => {
              setNotesText(e.target.value);
              setIsNotesDirty(true);
            }}
            placeholder="Professor office hours, grading weight notes, lecture recording links, exam study hints..."
            rows={5}
            className="w-full p-3 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-xs font-heading text-[rgb(var(--c-text))] focus:outline-hidden focus:border-[rgb(var(--c-primary))] resize-none leading-relaxed"
          />
        </div>

        {/* Links */}
        <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--c-border))]">
            <div className="flex items-center gap-2 text-xs font-heading font-bold text-[rgb(var(--c-text))]">
              <ExternalLink className="w-4 h-4 text-[rgb(var(--c-primary))]" />
              <span>Course Portals &amp; Syllabi</span>
            </div>
            <button
              onClick={() => setIsAddingLink(!isAddingLink)}
              className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] hover:underline cursor-pointer"
            >
              {isAddingLink ? 'Cancel' : '+ Add Link'}
            </button>
          </div>

          {isAddingLink && (
            <form onSubmit={handleAddLink} className="space-y-2 p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))]">
              <input
                type="text"
                placeholder="Link title (e.g. Moodle / Lecture Slides)"
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-xs font-heading text-[rgb(var(--c-text))]"
              />
              <input
                type="text"
                placeholder="URL (e.g. https://moodle.university.edu)"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] text-xs font-heading text-[rgb(var(--c-text))]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-[rgb(var(--c-primary))] text-stone-950 font-heading text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                Save Link
              </button>
            </form>
          )}

          {(!course.links || course.links.length === 0) ? (
            <div className="p-4 text-center text-xs text-[rgb(var(--c-muted))] bg-[rgb(var(--c-bg))] rounded-xl font-flourish">
              No bookmarks added yet. Store LMS links, Google Drive folders, or syllabus URLs here.
            </div>
          ) : (
            <div className="space-y-1.5">
              {course.links.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] hover:border-[rgb(var(--c-primary))] flex items-center justify-between text-xs font-heading font-bold text-[rgb(var(--c-text))] transition group"
                >
                  <span className="truncate">{link.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[rgb(var(--c-muted))] group-hover:text-[rgb(var(--c-primary))] shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Course Modal */}
      {isEditModalOpen && (
        <CourseModal
          courseToEdit={course}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
};
