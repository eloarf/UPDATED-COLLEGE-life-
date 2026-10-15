import React, { useState, useEffect } from 'react';
import {
  DayOfWeek,
  TaskItem,
  Assignment,
  ExamItem,
  JournalEntry,
  NotificationAlert,
  StreakData,
  AASTUState,
} from '../types/aastu';
import {
  getTodayKey,
  getTodayDayOfWeek,
  toggleTaskInState,
  toggleShiftTaskInState,
  saveTaskToDaySchedule,
  deleteTaskFromDaySchedule,
  useStreakFreezeInState,
  resetToSection12Defaults,
  saveAASTUState,
} from '../utils/aastuStorage';
import { playTaskDoneChime, playAlertChime, scanAndGenerateAlerts } from '../utils/notifications';
import { generateIcsCalendar, downloadIcsFile, createGoogleCalendarUrl } from '../utils/calendarSync';
import { TaskModal } from './TaskModal';
import { AssignmentModal } from './AssignmentModal';
import { ExamModal } from './ExamModal';
import { CalendarView } from './CalendarView';
import {
  Flame,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Edit2,
  Trash2,
  Share2,
  Download,
  Snowflake,
  Volume2,
  VolumeX,
  BookOpen,
  ArrowRight,
  TrendingUp,
  MapPin,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Award,
  Bell,
  X,
  FileText,
  AlertTriangle,
  Play,
  Heart,
} from 'lucide-react';

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  classes: { bg: 'bg-[#58a6ff]/10', text: 'text-[#58a6ff]', border: 'border-[#58a6ff]/30', label: 'Class' },
  study: { bg: 'bg-[#bc8cff]/10', text: 'text-[#bc8cff]', border: 'border-[#bc8cff]/30', label: 'Study' },
  code: { bg: 'bg-[#58a6ff]/10', text: 'text-[#58a6ff]', border: 'border-[#58a6ff]/30', label: 'Code' },
  running: { bg: 'bg-[#3fb950]/10', text: 'text-[#3fb950]', border: 'border-[#3fb950]/30', label: 'Fitness' },
  music: { bg: 'bg-[#bc8cff]/10', text: 'text-[#bc8cff]', border: 'border-[#bc8cff]/30', label: 'Music' },
  journal: { bg: 'bg-[#d29922]/10', text: 'text-[#d29922]', border: 'border-[#d29922]/30', label: 'Journal' },
  custom: { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700', label: 'Task' },
};

interface AASTUTrackerViewProps {
  aastuState: AASTUState;
  onUpdateState: (newState: AASTUState) => void;
  onNavigateToSimulator?: () => void;
}

export const AASTUTrackerView: React.FC<AASTUTrackerViewProps> = ({
  aastuState,
  onUpdateState,
  onNavigateToSimulator,
}) => {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getTodayDayOfWeek());
  const todayKey = getTodayKey();
  const currentActualDay = getTodayDayOfWeek();

  // Modals state
  const [taskModalState, setTaskModalState] = useState<{
    isOpen: boolean;
    day: DayOfWeek;
    taskToEdit?: TaskItem | null;
  }>({
    isOpen: false,
    day: selectedDay,
  });

  const [assignmentModalState, setAssignmentModalState] = useState<{
    isOpen: boolean;
    assignmentToEdit?: Assignment | null;
  }>({
    isOpen: false,
  });

  const [examModalState, setExamModalState] = useState<{
    isOpen: boolean;
    examToEdit?: ExamItem | null;
  }>({
    isOpen: false,
  });

  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [journalForm, setJournalForm] = useState<JournalEntry>({
    date: todayKey,
    timestamp: Date.now(),
    wins: '',
    challenges: '',
    musicProgress: '',
    gratitude: '',
    focusRating: 4,
  });

  const [notifications, setNotifications] = useState<NotificationAlert[]>([]);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [activeTabSub, setActiveTabSub] = useState<'schedule' | 'assignments' | 'exams' | 'calendar'>(
    'schedule'
  );
  const [freezeStatusMessage, setFreezeStatusMessage] = useState<string | null>(null);

  // Check notifications on mount and updates
  useEffect(() => {
    const alerts = scanAndGenerateAlerts(aastuState);
    setNotifications(alerts);
  }, [aastuState]);

  // Load existing journal for today if present
  useEffect(() => {
    if (aastuState.journals[todayKey]) {
      setJournalForm(aastuState.journals[todayKey]);
    }
  }, [todayKey, aastuState.journals]);

  const currentTasks = aastuState.schedules[selectedDay] || [];

  // Completed percentage for current viewed day
  let completedCountForSelected = 0;
  currentTasks.forEach((t) => {
    const k = `${todayKey}-${selectedDay}-${t.id}`;
    if (aastuState.completedTasks[k]) completedCountForSelected++;
  });
  const dayProgressPercent =
    currentTasks.length > 0 ? Math.round((completedCountForSelected / currentTasks.length) * 100) : 0;

  // Toggle Task Completion
  const handleToggleTask = (taskId: string) => {
    const { newState, isCompletedNow } = toggleTaskInState(
      aastuState,
      selectedDay,
      taskId,
      todayKey
    );
    if (isCompletedNow && aastuState.audioAlertsEnabled) {
      playTaskDoneChime();
    }
    onUpdateState(newState);
  };

  // Toggle Shift Task (e.g. shift morning run to evening)
  const handleToggleShift = (taskId: string) => {
    const newState = toggleShiftTaskInState(aastuState, taskId);
    onUpdateState(newState);
  };

  // Save Task
  const handleSaveTask = (taskData: Omit<TaskItem, 'id'> & { id?: string }) => {
    const newState = saveTaskToDaySchedule(aastuState, selectedDay, taskData);
    onUpdateState(newState);
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    const newState = deleteTaskFromDaySchedule(aastuState, selectedDay, taskId);
    onUpdateState(newState);
  };

  // Streak Freeze Action
  const handleUseStreakFreeze = () => {
    const result = useStreakFreezeInState(aastuState, todayKey);
    setFreezeStatusMessage(result.message);
    if (result.success) {
      onUpdateState(result.newState);
    }
    setTimeout(() => setFreezeStatusMessage(null), 4000);
  };

  // Save Assignment
  const handleSaveAssignment = (assignmentData: Omit<Assignment, 'id'> & { id?: string }) => {
    const updatedAssignments = [...aastuState.assignments];
    const id = assignmentData.id || `asg-${Date.now()}`;
    const newAsg: Assignment = {
      ...assignmentData,
      id,
    };
    const idx = updatedAssignments.findIndex((a) => a.id === id);
    if (idx >= 0) {
      updatedAssignments[idx] = newAsg;
    } else {
      updatedAssignments.push(newAsg);
    }
    const newState = { ...aastuState, assignments: updatedAssignments };
    saveAASTUState(newState);
    onUpdateState(newState);
  };

  const handleDeleteAssignment = (id: string) => {
    const updated = aastuState.assignments.filter((a) => a.id !== id);
    const newState = { ...aastuState, assignments: updated };
    saveAASTUState(newState);
    onUpdateState(newState);
  };

  const handleToggleAssignmentStatus = (id: string) => {
    const updated = aastuState.assignments.map((a) => {
      if (a.id === id) {
        const nextStatus: Assignment['status'] =
          a.status === 'submitted'
            ? 'in_progress'
            : a.status === 'in_progress'
              ? 'submitted'
              : 'in_progress';
        return { ...a, status: nextStatus };
      }
      return a;
    });
    const newState = { ...aastuState, assignments: updated };
    saveAASTUState(newState);
    onUpdateState(newState);
    if (aastuState.audioAlertsEnabled) {
      playTaskDoneChime();
    }
  };

  // Save Exam
  const handleSaveExam = (examData: Omit<ExamItem, 'id'> & { id?: string }) => {
    const updatedExams = [...aastuState.exams];
    const id = examData.id || `exam-${Date.now()}`;
    const newExam: ExamItem = {
      ...examData,
      id,
    };
    const idx = updatedExams.findIndex((e) => e.id === id);
    if (idx >= 0) {
      updatedExams[idx] = newExam;
    } else {
      updatedExams.push(newExam);
    }
    const newState = { ...aastuState, exams: updatedExams };
    saveAASTUState(newState);
    onUpdateState(newState);
  };

  const handleDeleteExam = (id: string) => {
    const updated = aastuState.exams.filter((e) => e.id !== id);
    const newState = { ...aastuState, exams: updated };
    saveAASTUState(newState);
    onUpdateState(newState);
  };

  const handleToggleExamTopic = (examId: string, topicId: string) => {
    const updated = aastuState.exams.map((exam) => {
      if (exam.id === examId) {
        const updatedTopics = exam.syllabusTopics.map((t) =>
          t.id === topicId ? { ...t, completed: !t.completed } : t
        );
        const compCount = updatedTopics.filter((t) => t.completed).length;
        const readiness = updatedTopics.length > 0 ? Math.round((compCount / updatedTopics.length) * 100) : 0;
        return {
          ...exam,
          syllabusTopics: updatedTopics,
          readinessScore: readiness,
        };
      }
      return exam;
    });
    const newState = { ...aastuState, exams: updated };
    saveAASTUState(newState);
    onUpdateState(newState);
  };

  // Save Journal
  const handleSaveJournal = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedJournals = {
      ...aastuState.journals,
      [todayKey]: {
        ...journalForm,
        date: todayKey,
        timestamp: Date.now(),
      },
    };
    const newState = {
      ...aastuState,
      journals: updatedJournals,
      streaks: {
        ...aastuState.streaks,
        journal: (aastuState.streaks.journal || 0) + 1,
      },
    };
    saveAASTUState(newState);
    onUpdateState(newState);
    setIsJournalOpen(false);
    if (aastuState.audioAlertsEnabled) {
      playTaskDoneChime();
    }
  };

  // Toggle Audio
  const handleToggleAudio = () => {
    const newState = { ...aastuState, audioAlertsEnabled: !aastuState.audioAlertsEnabled };
    saveAASTUState(newState);
    onUpdateState(newState);
  };

  // Reset to Section 12 Defaults
  const handleResetDefaults = () => {
    if (window.confirm('Reset schedule to original pristine AASTU Section 12 timetable?')) {
      const resetState = resetToSection12Defaults();
      onUpdateState(resetState);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 space-y-6 text-[#c9d1d9]">
      {/* Top Header Banner & Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#30363d] gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>AASTU 4.0 & Creative OS</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#21262d] border border-[#30363d] text-[#58a6ff]">
              Academic Execution Engine
            </span>
          </div>
          <p className="text-xs text-[#8b949e] mt-1">
            Synchronized University Timetable, Habit Tracking, Streak Defense & Calendar Automation
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
              className="px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-xs font-medium text-[#c9d1d9] hover:text-white hover:border-[#58a6ff] transition-colors flex items-center gap-1.5 relative"
            >
              <Bell className="w-3.5 h-3.5 text-[#58a6ff]" />
              <span>Alerts</span>
              {notifications.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#f85149] animate-pulse" />
              )}
            </button>

            {showNotificationsMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-4 z-50 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Execution Alerts ({notifications.length})
                  </span>
                  <button
                    onClick={() => setShowNotificationsMenu(false)}
                    className="text-[#8b949e] hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-[#8b949e] py-2 text-center">
                    All caught up! No impending deadlines or conflicts.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2 rounded-lg text-xs border ${
                          n.priority === 'urgent'
                            ? 'bg-[#f85149]/10 border-[#f85149]/30 text-[#f85149]'
                            : n.priority === 'warning'
                              ? 'bg-[#d29922]/10 border-[#d29922]/30 text-[#d29922]'
                              : 'bg-[#58a6ff]/10 border-[#58a6ff]/30 text-[#58a6ff]'
                        }`}
                      >
                        <p className="font-semibold">{n.title}</p>
                        <p className="text-[11px] text-[#c9d1d9] mt-0.5">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleToggleAudio}
            title={aastuState.audioAlertsEnabled ? 'Sound alerts enabled' : 'Sound muted'}
            className="p-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#30363d] transition-colors"
          >
            {aastuState.audioAlertsEnabled ? (
              <Volume2 className="w-4 h-4 text-[#3fb950]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#8b949e]" />
            )}
          </button>

          {/* Calendar Sync / Download ICS */}
          <button
            onClick={() => downloadIcsFile(aastuState)}
            className="px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-xs font-medium text-[#c9d1d9] hover:text-white hover:border-[#58a6ff] transition-colors flex items-center gap-1.5"
            title="Download iCalendar .ics for Google Calendar or Apple Calendar"
          >
            <Download className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>Export .ics</span>
          </button>

          {/* Quick Journal Button */}
          <button
            onClick={() => setIsJournalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#d29922]/40 text-xs font-semibold text-[#d29922] hover:bg-[#d29922]/10 transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Daily Journal</span>
          </button>

          {/* Reset Defaults */}
          <button
            onClick={handleResetDefaults}
            className="p-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#30363d] transition-colors"
            title="Reset schedule to Section 12 defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* STREAK GRID: Classes, Running, Music, Journal, Perfect Day */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 text-center relative overflow-hidden group hover:border-[#58a6ff]/40 transition-colors">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#8b949e] mb-1">
            Classes
          </div>
          <div className="text-2xl font-black text-[#58a6ff]">
            {aastuState.streaks.classes || 0}
            <span className="text-xs font-normal text-[#8b949e] ml-1">days</span>
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Lecture & Tutorial presence</div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 text-center relative overflow-hidden group hover:border-[#3fb950]/40 transition-colors">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#8b949e] mb-1">
            Running
          </div>
          <div className="text-2xl font-black text-[#3fb950]">
            {aastuState.streaks.running || 0}
            <span className="text-xs font-normal text-[#8b949e] ml-1">runs</span>
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Morning sprint & fitness</div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 text-center relative overflow-hidden group hover:border-[#bc8cff]/40 transition-colors">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#8b949e] mb-1">
            Music
          </div>
          <div className="text-2xl font-black text-[#bc8cff]">
            {aastuState.streaks.music || 0}
            <span className="text-xs font-normal text-[#8b949e] ml-1">sessions</span>
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Arrangement & harmony</div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 text-center relative overflow-hidden group hover:border-[#d29922]/40 transition-colors">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#8b949e] mb-1">
            Journal
          </div>
          <div className="text-2xl font-black text-[#d29922]">
            {aastuState.streaks.journal || 0}
            <span className="text-xs font-normal text-[#8b949e] ml-1">entries</span>
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">Daily reflection writing</div>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3.5 text-center relative overflow-hidden group hover:border-[#f0883e]/50 transition-colors col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#8b949e] mb-1 flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5 text-[#f0883e]" />
            <span>Perfect Day</span>
          </div>
          <div className="text-2xl font-black text-[#f0883e]">
            {aastuState.streaks.perfect || 0}
            <span className="text-xs font-normal text-[#8b949e] ml-1">streak</span>
          </div>
          <div className="text-[10px] text-[#8b949e] mt-1">100% daily compliance</div>
        </div>
      </div>

      {/* SUB-TABS: Weekly Schedule vs Assignments vs Exams */}
      <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTabSub('schedule')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTabSub === 'schedule'
                ? 'bg-[#21262d] text-white border border-[#30363d]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>Weekly Schedule</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#161b22] text-[#8b949e]">
              {currentTasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTabSub('assignments')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTabSub === 'assignments'
                ? 'bg-[#21262d] text-white border border-[#30363d]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#bc8cff]" />
            <span>Assignments</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#161b22] text-[#8b949e]">
              {aastuState.assignments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTabSub('exams')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTabSub === 'exams'
                ? 'bg-[#21262d] text-white border border-[#30363d]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-[#f85149]" />
            <span>Exams & Readiness</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#161b22] text-[#8b949e]">
              {aastuState.exams.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTabSub('calendar')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeTabSub === 'calendar'
                ? 'bg-[#fce7f3] text-[#9d174d] border border-[#f472b6] font-bold shadow-xs'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#f472b6]" />
            <span>Monthly Calendar</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#f472b6]/20 text-[#9d174d] font-bold">
              Wes Anderson
            </span>
          </button>
        </div>

        {/* Launch Exam Simulator Bridge */}
        {onNavigateToSimulator && (
          <button
            onClick={onNavigateToSimulator}
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Open Exam Simulator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* TAB 1: SCHEDULE VIEW */}
      {activeTabSub === 'schedule' && (
        <div className="space-y-5">
          {/* Day Selector Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {DAYS.map((day) => {
              const isToday = day === currentActualDay;
              const isSelected = day === selectedDay;
              const taskCount = (aastuState.schedules[day] || []).length;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border ${
                    isSelected
                      ? 'bg-[#58a6ff] text-black border-[#58a6ff] shadow-md shadow-[#58a6ff]/20 font-black'
                      : isToday
                        ? 'bg-[#161b22] text-[#58a6ff] border-[#58a6ff]/50'
                        : 'bg-[#161b22] text-[#c9d1d9] border-[#30363d] hover:border-[#8b949e]'
                  }`}
                >
                  <span>{day}</span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" title="Today" />
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-black/20 text-black font-semibold'
                        : 'bg-[#21262d] text-[#8b949e]'
                    }`}
                  >
                    {taskCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Schedule 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Task Checklist */}
            <div className="lg:col-span-2 space-y-3">
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{selectedDay}&apos;s Execution Schedule</span>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-[#21262d] text-[#8b949e]">
                        {completedCountForSelected} / {currentTasks.length} done
                      </span>
                    </h2>
                    <p className="text-xs text-[#8b949e] mt-0.5">
                      Check off completed modules. Shift tasks when life demands flexible rescheduling.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setTaskModalState({
                        isOpen: true,
                        day: selectedDay,
                        taskToEdit: null,
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#21262d] border border-[#30363d] text-xs font-semibold text-white hover:border-[#58a6ff] transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#58a6ff]" />
                    <span>Add Task</span>
                  </button>
                </div>

                {/* Task List Items */}
                {currentTasks.length === 0 ? (
                  <div className="py-12 text-center text-[#8b949e] text-xs">
                    No tasks scheduled for {selectedDay}. Click &quot;Add Task&quot; above to create one.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {currentTasks.map((task) => {
                      const isDoneKey = `${todayKey}-${selectedDay}-${task.id}`;
                      const isDone = !!aastuState.completedTasks[isDoneKey];
                      const isShifted = !!aastuState.shiftedTasks[task.id];
                      const catStyle = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.custom;

                      return (
                        <div
                          key={task.id}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group ${
                            isDone
                              ? 'bg-[#161b22]/50 border-[#30363d]/50 opacity-60'
                              : 'bg-[#0d1117] border-[#30363d] hover:border-[#58a6ff]/40 shadow-sm'
                          }`}
                        >
                          {/* Checkbox & Time & Title */}
                          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                            <button
                              onClick={() => handleToggleTask(task.id)}
                              className="mt-0.5 sm:mt-0 text-[#8b949e] hover:text-[#3fb950] transition-colors shrink-0"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-5 h-5 text-[#3fb950]" />
                              ) : (
                                <Circle className="w-5 h-5 hover:text-[#58a6ff]" />
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-xs font-mono font-medium px-2 py-0.5 rounded ${
                                    isShifted
                                      ? 'bg-[#d29922]/15 text-[#d29922] line-through'
                                      : 'bg-[#21262d] text-[#c9d1d9]'
                                  }`}
                                >
                                  {task.time}
                                </span>

                                {isShifted && task.shiftedTime && (
                                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#3fb950]/15 text-[#3fb950] flex items-center gap-1">
                                    <span>→ {task.shiftedTime}</span>
                                    <span className="text-[10px] text-[#8b949e]">(Shifted)</span>
                                  </span>
                                )}

                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                                >
                                  {catStyle.label}
                                </span>

                                {task.location && (
                                  <span className="text-xs text-[#8b949e] flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-[#58a6ff]" />
                                    <span>{task.location}</span>
                                  </span>
                                )}
                              </div>

                              <div className="mt-1">
                                <span
                                  className={`text-sm font-semibold ${
                                    isDone ? 'line-through text-[#8b949e]' : 'text-white'
                                  }`}
                                >
                                  {task.title}
                                </span>
                              </div>

                              {task.notes && (
                                <p className="text-xs text-[#8b949e] mt-0.5 line-clamp-1">
                                  {task.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right Controls: Shiftable Button + Edit/Delete */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {task.shiftable && (
                              <button
                                onClick={() => handleToggleShift(task.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                                  isShifted
                                    ? 'bg-[#d29922]/20 border border-[#d29922]/40 text-[#d29922]'
                                    : 'bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9]'
                                }`}
                                title="Shift task to alternate time window"
                              >
                                <span>{isShifted ? 'Undo Shift' : 'Shift 6 PM'}</span>
                              </button>
                            )}

                            <button
                              onClick={() =>
                                setTaskModalState({
                                  isOpen: true,
                                  day: selectedDay,
                                  taskToEdit: task,
                                })
                              }
                              className="p-1.5 text-[#8b949e] hover:text-white rounded-lg hover:bg-[#21262d] transition-colors"
                              title="Edit task"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1.5 text-[#8b949e] hover:text-[#f85149] rounded-lg hover:bg-[#21262d] transition-colors"
                              title="Delete task"
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
            </div>

            {/* Right Col: Day Completion Stats & Streak Defense & Heatmap */}
            <div className="space-y-4">
              {/* Daily Progress Gauge */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {selectedDay} Compliance
                  </h3>
                  <span className="text-sm font-black text-[#58a6ff]">
                    {dayProgressPercent}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#21262d] h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      dayProgressPercent === 100
                        ? 'bg-[#3fb950]'
                        : dayProgressPercent >= 60
                          ? 'bg-[#58a6ff]'
                          : 'bg-[#d29922]'
                    }`}
                    style={{ width: `${dayProgressPercent}%` }}
                  />
                </div>

                <div className="text-xs text-[#8b949e] space-y-1.5">
                  <div className="flex justify-between">
                    <span>Tasks Completed:</span>
                    <span className="font-semibold text-white">
                      {completedCountForSelected} / {currentTasks.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span
                      className={`font-semibold ${
                        dayProgressPercent === 100
                          ? 'text-[#3fb950]'
                          : dayProgressPercent >= 50
                            ? 'text-[#58a6ff]'
                            : 'text-[#d29922]'
                      }`}
                    >
                      {dayProgressPercent === 100
                        ? '★ Perfect Day Achieved'
                        : dayProgressPercent >= 50
                          ? 'Good Velocity'
                          : 'In Progress'}
                    </span>
                  </div>
                </div>

                {/* Streak Freeze Defense Card */}
                <div className="pt-3 border-t border-[#30363d] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <Snowflake className="w-3.5 h-3.5 text-[#58a6ff]" />
                      <span>Streak Freeze Defense</span>
                    </span>
                    <span className="text-[#8b949e]">
                      {3 - (aastuState.freezesUsed || 0)} left this month
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8b949e]">
                    Protect your active streak from resetting during emergencies or illness.
                  </p>
                  <button
                    onClick={handleUseStreakFreeze}
                    disabled={aastuState.freezesUsed >= 3}
                    className="w-full py-2 px-3 rounded-lg bg-[#21262d] border border-[#30363d] hover:border-[#58a6ff] text-xs font-semibold text-[#58a6ff] hover:bg-[#58a6ff]/10 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Snowflake className="w-3.5 h-3.5" />
                    <span>Freeze Day ({3 - (aastuState.freezesUsed || 0)} remaining)</span>
                  </button>
                  {freezeStatusMessage && (
                    <p className="text-xs text-center text-[#58a6ff] animate-in fade-in">
                      {freezeStatusMessage}
                    </p>
                  )}
                </div>
              </div>

              {/* Monthly Completion Calendar Heatmap */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#58a6ff]" />
                    <span>Consistency Trajectory</span>
                  </h3>
                  <span className="text-[10px] text-[#8b949e]">Last 14 Days</span>
                </div>

                {/* Grid of days */}
                <div className="grid grid-cols-7 gap-1.5 pt-1">
                  {Array.from({ length: 14 }).map((_, i) => {
                    const d = new Date(Date.now() - (13 - i) * 86400000);
                    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
                      d.getDate()
                    ).padStart(2, '0')}`;
                    const rec = aastuState.monthHistory[k];
                    const isFrozen = rec?.frozen;
                    const pct = rec?.percent || 0;

                    let bgClass = 'bg-[#21262d] text-[#8b949e]';
                    if (isFrozen) {
                      bgClass = 'bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/40';
                    } else if (pct === 100) {
                      bgClass = 'bg-[#3fb950] text-black font-black';
                    } else if (pct >= 60) {
                      bgClass = 'bg-[#58a6ff]/60 text-white';
                    } else if (pct > 0) {
                      bgClass = 'bg-[#d29922]/40 text-[#d29922]';
                    }

                    return (
                      <div
                        key={k}
                        className={`h-9 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold ${bgClass}`}
                        title={`${k}: ${isFrozen ? 'Frozen' : `${pct}% completed`}`}
                      >
                        <span>{d.getDate()}</span>
                        {isFrozen && <span className="text-[8px]">❄️</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#8b949e] pt-1">
                  <span>Less Active</span>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-[#21262d]" />
                    <span className="w-2.5 h-2.5 rounded bg-[#d29922]/40" />
                    <span className="w-2.5 h-2.5 rounded bg-[#58a6ff]/60" />
                    <span className="w-2.5 h-2.5 rounded bg-[#3fb950]" />
                  </div>
                  <span>100% Perfect</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ASSIGNMENTS TRACKER */}
      {activeTabSub === 'assignments' && (
        <div className="space-y-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#30363d] gap-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>University Assignment Pipeline</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-[#21262d] text-[#bc8cff]">
                    {aastuState.assignments.filter((a) => a.status === 'submitted').length} /{' '}
                    {aastuState.assignments.length} Submitted
                  </span>
                </h2>
                <p className="text-xs text-[#8b949e] mt-0.5">
                  Track course deliverables, deadlines, and weight percentages. One-click sync to Google Calendar.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadIcsFile(aastuState)}
                  className="px-3 py-1.5 rounded-lg bg-[#21262d] border border-[#30363d] text-xs font-semibold text-[#58a6ff] hover:border-[#58a6ff] transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Sync to Calendar</span>
                </button>

                <button
                  onClick={() =>
                    setAssignmentModalState({
                      isOpen: true,
                      assignmentToEdit: null,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#58a6ff] text-black text-xs font-bold hover:bg-[#58a6ff]/90 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Assignment</span>
                </button>
              </div>
            </div>

            {/* Assignment Cards List */}
            {aastuState.assignments.length === 0 ? (
              <div className="py-12 text-center text-[#8b949e] text-xs">
                No assignments recorded yet. Click &quot;Add Assignment&quot; to log your problem sets and reports.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {aastuState.assignments.map((asg) => {
                  const isSubmitted = asg.status === 'submitted';
                  const gcalUrl = createGoogleCalendarUrl({
                    title: `[DUE] ${asg.title} (${asg.courseCode})`,
                    dateStr: asg.dueDate,
                    timeStr: asg.dueTime,
                    details: `Course: ${asg.courseCode}\nWeight: ${asg.weightPercentage || 0}%\n${asg.description || ''}`,
                    durationMinutes: 60,
                  });

                  return (
                    <div
                      key={asg.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        isSubmitted
                          ? 'bg-[#161b22]/40 border-[#30363d]/40 opacity-70'
                          : 'bg-[#0d1117] border-[#30363d] hover:border-[#bc8cff]/50'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#bc8cff]/15 text-[#bc8cff] border border-[#bc8cff]/30">
                            {asg.courseCode}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              asg.priority === 'high'
                                ? 'bg-[#f85149]/20 text-[#f85149]'
                                : asg.priority === 'medium'
                                  ? 'bg-[#d29922]/20 text-[#d29922]'
                                  : 'bg-[#58a6ff]/20 text-[#58a6ff]'
                            }`}
                          >
                            {asg.priority} priority
                          </span>
                        </div>

                        <h4
                          className={`text-sm font-bold ${
                            isSubmitted ? 'line-through text-[#8b949e]' : 'text-white'
                          }`}
                        >
                          {asg.title}
                        </h4>

                        {asg.description && (
                          <p className="text-xs text-[#8b949e] line-clamp-2">{asg.description}</p>
                        )}

                        <div className="pt-2 border-t border-[#30363d] flex items-center justify-between text-xs text-[#8b949e]">
                          <span className="flex items-center gap-1 text-[#c9d1d9]">
                            <Calendar className="w-3.5 h-3.5 text-[#58a6ff]" />
                            <span>
                              {asg.dueDate} @ {asg.dueTime}
                            </span>
                          </span>
                          {asg.weightPercentage && (
                            <span className="font-semibold text-white">
                              {asg.weightPercentage}% of Grade
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom action row */}
                      <div className="pt-3 mt-3 border-t border-[#30363d] flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleToggleAssignmentStatus(asg.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                            isSubmitted
                              ? 'bg-[#3fb950]/20 text-[#3fb950] border border-[#3fb950]/30'
                              : 'bg-[#21262d] text-[#c9d1d9] hover:text-white border border-[#30363d]'
                          }`}
                        >
                          {isSubmitted ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Submitted</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-3.5 h-3.5" />
                              <span>Mark Done</span>
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1">
                          <a
                            href={gcalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-[#8b949e] hover:text-[#58a6ff] rounded hover:bg-[#21262d]"
                            title="Add deadline to Google Calendar"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() =>
                              setAssignmentModalState({
                                isOpen: true,
                                assignmentToEdit: asg,
                              })
                            }
                            className="p-1.5 text-[#8b949e] hover:text-white rounded hover:bg-[#21262d]"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteAssignment(asg.id)}
                            className="p-1.5 text-[#8b949e] hover:text-[#f85149] rounded hover:bg-[#21262d]"
                            title="Delete"
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
        </div>
      )}

      {/* TAB 3: EXAMS & READINESS TRACKER */}
      {activeTabSub === 'exams' && (
        <div className="space-y-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#30363d] gap-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Exam Schedule & Syllabus Readiness</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-[#21262d] text-[#f85149]">
                    {aastuState.exams.length} Upcoming Exams
                  </span>
                </h2>
                <p className="text-xs text-[#8b949e] mt-0.5">
                  Track midterm and final exam schedules, room assignments, and topic completion scores.
                </p>
              </div>

              <button
                onClick={() =>
                  setExamModalState({
                    isOpen: true,
                    examToEdit: null,
                  })
                }
                className="px-3 py-1.5 rounded-lg bg-[#f85149] text-white text-xs font-bold hover:bg-[#f85149]/90 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Exam</span>
              </button>
            </div>

            {/* Exam Cards List */}
            {aastuState.exams.length === 0 ? (
              <div className="py-12 text-center text-[#8b949e] text-xs">
                No exams registered yet. Click &quot;Add Exam&quot; to log your Midterms and Finals.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aastuState.exams.map((exam) => {
                  const daysLeft = Math.ceil(
                    (new Date(exam.examDate).getTime() - Date.now()) / 86400000
                  );

                  return (
                    <div
                      key={exam.id}
                      className="p-5 rounded-2xl bg-[#0d1117] border border-[#30363d] hover:border-[#f85149]/40 transition-all space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-[#f85149]/15 text-[#f85149] border border-[#f85149]/30">
                          {exam.courseCode}
                        </span>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ${
                              daysLeft <= 3
                                ? 'bg-[#f85149]/20 text-[#f85149]'
                                : daysLeft <= 7
                                  ? 'bg-[#d29922]/20 text-[#d29922]'
                                  : 'bg-[#58a6ff]/20 text-[#58a6ff]'
                            }`}
                          >
                            {daysLeft > 0 ? `${daysLeft} days away` : 'Exam Day!'}
                          </span>

                          <button
                            onClick={() =>
                              setExamModalState({
                                isOpen: true,
                                examToEdit: exam,
                              })
                            }
                            className="p-1 text-[#8b949e] hover:text-white rounded hover:bg-[#21262d]"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteExam(exam.id)}
                            className="p-1 text-[#8b949e] hover:text-[#f85149] rounded hover:bg-[#21262d]"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-white">{exam.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-[#8b949e] mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[#58a6ff]" />
                            <span>
                              {exam.examDate} @ {exam.examTime}
                            </span>
                          </span>
                          {exam.room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#58a6ff]" />
                              <span>Room {exam.room}</span>
                            </span>
                          )}
                          {exam.weightPercentage && (
                            <span className="font-semibold text-white">
                              {exam.weightPercentage}% of Grade
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Syllabus Readiness Progress Bar */}
                      <div className="space-y-1.5 pt-2 border-t border-[#30363d]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#c9d1d9]">Syllabus Readiness</span>
                          <span className="font-bold text-[#58a6ff]">
                            {exam.readinessScore}% Mastered
                          </span>
                        </div>
                        <div className="w-full bg-[#21262d] h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#58a6ff] to-[#3fb950] rounded-full transition-all duration-300"
                            style={{ width: `${exam.readinessScore}%` }}
                          />
                        </div>
                      </div>

                      {/* Syllabus checklist topics */}
                      {exam.syllabusTopics && exam.syllabusTopics.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-[#8b949e]">
                            Core Exam Syllabus Units
                          </div>
                          <div className="space-y-1">
                            {exam.syllabusTopics.map((topic) => (
                              <button
                                key={topic.id}
                                onClick={() => handleToggleExamTopic(exam.id, topic.id)}
                                className="w-full flex items-center gap-2 p-2 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-[#58a6ff]/40 text-left transition-colors group"
                              >
                                {topic.completed ? (
                                  <CheckCircle2 className="w-4 h-4 text-[#3fb950] shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-[#8b949e] group-hover:text-[#58a6ff] shrink-0" />
                                )}
                                <span
                                  className={`text-xs ${
                                    topic.completed ? 'line-through text-[#8b949e]' : 'text-slate-200'
                                  }`}
                                >
                                  {topic.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Launch practice test for this exam course */}
                      {onNavigateToSimulator && (
                        <button
                          onClick={onNavigateToSimulator}
                          className="w-full py-2 px-3 rounded-lg bg-[#21262d] border border-[#30363d] hover:border-indigo-500 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Simulate Exam for {exam.courseCode}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: WES ANDERSON PASTEL MONTHLY CALENDAR VIEW */}
      {activeTabSub === 'calendar' && (
        <CalendarView
          aastuState={aastuState}
          onUpdateState={onUpdateState}
          onOpenAssignmentModal={(initialDate) =>
            setAssignmentModalState({
              isOpen: true,
              assignmentToEdit: initialDate ? ({ dueDate: initialDate } as any) : null,
            })
          }
          onOpenExamModal={(initialDate) =>
            setExamModalState({
              isOpen: true,
              examToEdit: initialDate ? ({ examDate: initialDate } as any) : null,
            })
          }
          onOpenTaskModal={(day) =>
            setTaskModalState({
              isOpen: true,
              day,
              taskToEdit: null,
            })
          }
          onNavigateToSimulator={onNavigateToSimulator}
        />
      )}

      {/* MODAL: Daily Reflection Journal */}
      {isJournalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-6 text-[#c9d1d9] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Daily Creative Reflection & Journal</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#d29922]/20 text-[#d29922]">
                    {todayKey}
                  </span>
                </h2>
                <p className="text-xs text-[#8b949e] mt-0.5">
                  15-minute evening debrief: capture study wins, friction points, and music progress.
                </p>
              </div>
              <button
                onClick={() => setIsJournalOpen(false)}
                className="p-1.5 text-[#8b949e] hover:text-white rounded-lg hover:bg-[#21262d] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJournal} className="space-y-4">
              {/* Focus Rating 1-5 */}
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  Today&apos;s Focus & Discipline Rating (1 - 5)
                </label>
                <div className="flex items-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setJournalForm({ ...journalForm, focusRating: star })}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        journalForm.focusRating === star
                          ? 'bg-[#d29922] text-black border-[#d29922] font-black'
                          : 'bg-[#0d1117] text-[#c9d1d9] border-[#30363d] hover:border-[#8b949e]'
                      }`}
                    >
                      {star} ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Wins */}
              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  1. Academic & Daily Wins (What worked well today?)
                </label>
                <textarea
                  rows={2}
                  value={journalForm.wins}
                  onChange={(e) => setJournalForm({ ...journalForm, wins: e.target.value })}
                  placeholder="Finished Calculus problem set, attended Psychology lecture on time..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d29922] resize-none"
                />
              </div>

              {/* Challenges */}
              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  2. Friction & Challenges (What slowed you down?)
                </label>
                <textarea
                  rows={2}
                  value={journalForm.challenges}
                  onChange={(e) => setJournalForm({ ...journalForm, challenges: e.target.value })}
                  placeholder="Need better timing on afternoon library session, distraction during physics..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d29922] resize-none"
                />
              </div>

              {/* Music Progress */}
              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  3. Creative Music Study Analysis (Harmony / arrangement notes)
                </label>
                <textarea
                  rows={2}
                  value={journalForm.musicProgress}
                  onChange={(e) => setJournalForm({ ...journalForm, musicProgress: e.target.value })}
                  placeholder="Analyzed harmonic minor chords in piano intro, checked drum groove tempo..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#bc8cff] resize-none"
                />
              </div>

              {/* Gratitude */}
              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  4. Gratitude & Mindset Anchor
                </label>
                <input
                  type="text"
                  value={journalForm.gratitude}
                  onChange={(e) => setJournalForm({ ...journalForm, gratitude: e.target.value })}
                  placeholder="Grateful for good health, campus friends, energy for morning run..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3fb950]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setIsJournalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8b949e] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#d29922] text-black text-xs font-bold hover:bg-[#d29922]/90 transition-colors"
                >
                  Save Reflection (+1 Streak)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={taskModalState.isOpen}
        onClose={() => setTaskModalState({ isOpen: false, day: selectedDay })}
        day={taskModalState.day}
        taskToEdit={taskModalState.taskToEdit}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
      />

      {/* Assignment Modal */}
      <AssignmentModal
        isOpen={assignmentModalState.isOpen}
        onClose={() => setAssignmentModalState({ isOpen: false })}
        assignmentToEdit={assignmentModalState.assignmentToEdit}
        onSaveAssignment={handleSaveAssignment}
        onDeleteAssignment={handleDeleteAssignment}
      />

      {/* Exam Modal */}
      <ExamModal
        isOpen={examModalState.isOpen}
        onClose={() => setExamModalState({ isOpen: false })}
        examToEdit={examModalState.examToEdit}
        onSaveExam={handleSaveExam}
        onDeleteExam={handleDeleteExam}
      />
    </div>
  );
};
