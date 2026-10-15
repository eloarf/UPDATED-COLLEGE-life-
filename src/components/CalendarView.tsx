import React, { useState, useMemo } from 'react';
import {
  DayOfWeek,
  TaskItem,
  Assignment,
  ExamItem,
  AASTUState,
} from '../types/aastu';
import { ExamSession } from '../types/study';
import { getTodayKey, toggleTaskInState, saveAASTUState } from '../utils/aastuStorage';
import { createGoogleCalendarUrl } from '../utils/calendarSync';
import { playTaskDoneChime } from '../utils/notifications';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Circle,
  Plus,
  Sparkles,
  ExternalLink,
  Flame,
  Filter,
  Eye,
  X,
  Play,
  Layers,
  MapPin,
  CalendarCheck,
  Palette,
} from 'lucide-react';

interface CalendarViewProps {
  aastuState: AASTUState;
  onUpdateState: (newState: AASTUState) => void;
  examSessions?: ExamSession[];
  onOpenAssignmentModal?: (initialDate?: string) => void;
  onOpenExamModal?: (initialDate?: string) => void;
  onOpenTaskModal?: (day: DayOfWeek) => void;
  onNavigateToSimulator?: () => void;
}

type EventFilterType = 'all' | 'assignments' | 'exams' | 'schedule' | 'practice';
type WesAndersonThemeMode = 'grand-budapest' | 'tenenbaum-dark';

const DAYS_SHORT: { key: DayOfWeek; label: string; fullName: string }[] = [
  { key: 'Mon', label: 'MON', fullName: 'Monday' },
  { key: 'Tue', label: 'TUE', fullName: 'Tuesday' },
  { key: 'Wed', label: 'WED', fullName: 'Wednesday' },
  { key: 'Thu', label: 'THU', fullName: 'Thursday' },
  { key: 'Fri', label: 'FRI', fullName: 'Friday' },
  { key: 'Sat', label: 'SAT', fullName: 'Saturday' },
  { key: 'Sun', label: 'SUN', fullName: 'Sunday' },
];

export const CalendarView: React.FC<CalendarViewProps> = ({
  aastuState,
  onUpdateState,
  examSessions = [],
  onOpenAssignmentModal,
  onOpenExamModal,
  onOpenTaskModal,
  onNavigateToSimulator,
}) => {
  const today = useMemo(() => new Date(), []);
  const todayDateStr = getTodayKey();

  // Navigation State
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayDateStr);
  const [filterType, setFilterType] = useState<EventFilterType>('all');
  const [themeMode, setThemeMode] = useState<WesAndersonThemeMode>('grand-budapest');
  const [isDayInspectorOpen, setIsDayInspectorOpen] = useState<boolean>(false);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDateStr(todayDateStr);
  };

  // Month metadata
  const monthName = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).toLocaleString('default', { month: 'long' });
  }, [currentYear, currentMonth]);

  // Calendar Grid Calculation
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInCurrentMonth = lastDayOfMonth.getDate();

    // Day of week: 0 = Sun, 1 = Mon ... We want Monday as start (0)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes 6

    const daysFromPrevMonth = startDayOfWeek;
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

    const grid: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      dayOfWeek: DayOfWeek;
    }[] = [];

    // 1. Prev month padding days
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, d);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(
        d
      ).padStart(2, '0')}`;
      const dayIdx = prevDate.getDay() === 0 ? 6 : prevDate.getDay() - 1;
      grid.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        dayOfWeek: DAYS_SHORT[dayIdx].key,
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const curDate = new Date(currentYear, currentMonth, d);
      const dayIdx = curDate.getDay() === 0 ? 6 : curDate.getDay() - 1;
      grid.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        dayOfWeek: DAYS_SHORT[dayIdx].key,
      });
    }

    // 3. Next month padding days to complete full 35 or 42 grid cells
    const remainingCells = (7 - (grid.length % 7)) % 7;
    const totalNeeded = grid.length + remainingCells < 35 ? 35 - grid.length : remainingCells;
    for (let d = 1; d <= totalNeeded; d++) {
      const nextDate = new Date(currentYear, currentMonth + 1, d);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(
        d
      ).padStart(2, '0')}`;
      const dayIdx = nextDate.getDay() === 0 ? 6 : nextDate.getDay() - 1;
      grid.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        dayOfWeek: DAYS_SHORT[dayIdx].key,
      });
    }

    return grid;
  }, [currentYear, currentMonth]);

  // Index Assignments by Date
  const assignmentsByDate = useMemo(() => {
    const map: Record<string, Assignment[]> = {};
    aastuState.assignments.forEach((asg) => {
      if (!map[asg.dueDate]) map[asg.dueDate] = [];
      map[asg.dueDate].push(asg);
    });
    return map;
  }, [aastuState.assignments]);

  // Index Exams by Date
  const examsByDate = useMemo(() => {
    const map: Record<string, ExamItem[]> = {};
    aastuState.exams.forEach((exam) => {
      if (!map[exam.examDate]) map[exam.examDate] = [];
      map[exam.examDate].push(exam);
    });
    return map;
  }, [aastuState.exams]);

  // Index Completed Simulator Sessions by Date
  const sessionsByDate = useMemo(() => {
    const map: Record<string, ExamSession[]> = {};
    examSessions.forEach((session) => {
      if (session.completed_at) {
        const d = new Date(session.completed_at);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`;
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(session);
      }
    });
    return map;
  }, [examSessions]);

  // Monthly Overview Metrics
  const monthlyMetrics = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthAssignments = aastuState.assignments.filter((a) => a.dueDate.startsWith(prefix));
    const monthExams = aastuState.exams.filter((e) => e.examDate.startsWith(prefix));
    const totalWeight =
      monthAssignments.reduce((acc, a) => acc + (a.weightPercentage || 0), 0) +
      monthExams.reduce((acc, e) => acc + (e.weightPercentage || 0), 0);
    const submittedCount = monthAssignments.filter((a) => a.status === 'submitted').length;

    // Find busiest day in the month
    const dayCounts: Record<string, number> = {};
    monthAssignments.forEach((a) => {
      dayCounts[a.dueDate] = (dayCounts[a.dueDate] || 0) + 1;
    });
    monthExams.forEach((e) => {
      dayCounts[e.examDate] = (dayCounts[e.examDate] || 0) + 2; // exams weight double
    });

    let peakDay: string | null = null;
    let maxCount = 0;
    Object.entries(dayCounts).forEach(([d, count]) => {
      if (count > maxCount) {
        maxCount = count;
        peakDay = d;
      }
    });

    return {
      totalDeadlines: monthAssignments.length + monthExams.length,
      assignmentsCount: monthAssignments.length,
      examsCount: monthExams.length,
      totalWeight,
      submittedCount,
      peakDay,
      peakCount: maxCount,
    };
  }, [currentYear, currentMonth, aastuState.assignments, aastuState.exams]);

  // Selected Day Details for Inspector
  const selectedDayInfo = useMemo(() => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeekIdx = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1;
    const dayOfWeek: DayOfWeek = DAYS_SHORT[dayOfWeekIdx].key;

    const dayTasks = aastuState.schedules[dayOfWeek] || [];
    const dayAssignments = assignmentsByDate[selectedDateStr] || [];
    const dayExams = examsByDate[selectedDateStr] || [];
    const daySessions = sessionsByDate[selectedDateStr] || [];

    let completedTasksCount = 0;
    dayTasks.forEach((t) => {
      const k = `${selectedDateStr}-${dayOfWeek}-${t.id}`;
      if (aastuState.completedTasks[k]) completedTasksCount++;
    });

    return {
      dateStr: selectedDateStr,
      dateObj,
      formattedDate: dateObj.toLocaleDateString('default', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      dayOfWeek,
      tasks: dayTasks,
      completedTasksCount,
      assignments: dayAssignments,
      exams: dayExams,
      sessions: daySessions,
    };
  }, [
    selectedDateStr,
    aastuState.schedules,
    aastuState.completedTasks,
    assignmentsByDate,
    examsByDate,
    sessionsByDate,
  ]);

  // Toggle Task Completion on Selected Date
  const handleToggleTaskForDate = (taskId: string, day: DayOfWeek) => {
    const { newState, isCompletedNow } = toggleTaskInState(
      aastuState,
      day,
      taskId,
      selectedDateStr
    );
    if (isCompletedNow && aastuState.audioAlertsEnabled) {
      playTaskDoneChime();
    }
    onUpdateState(newState);
  };

  // Toggle Assignment Status
  const handleToggleAssignmentStatus = (id: string) => {
    const updated = aastuState.assignments.map((a) => {
      if (a.id === id) {
        const nextStatus: Assignment['status'] =
          a.status === 'submitted' ? 'in_progress' : 'submitted';
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

  // Wes Anderson Theme Styling Classes
  const isDarkTheme = themeMode === 'tenenbaum-dark';

  const themeClasses = {
    container: isDarkTheme
      ? 'bg-[#1e1713] text-[#ebd5c1] border-[#423226]'
      : 'bg-[#fbf7ee] text-[#4a3528] border-[#e4d4be]',
    headerBg: isDarkTheme
      ? 'bg-[#291f1a] border-[#423226]'
      : 'bg-[#f4ebe0] border-[#decbb4]',
    cardBg: isDarkTheme
      ? 'bg-[#241b16] border-[#3d2e23]'
      : 'bg-[#ffffff] border-[#ebdcc8]',
    subtleBorder: isDarkTheme ? 'border-[#382a20]' : 'border-[#ebdcc8]',
    accentBrownText: isDarkTheme ? 'text-[#ebd5c1]' : 'text-[#4a3528]',
    mutedBrownText: isDarkTheme ? 'text-[#a98f7e]' : 'text-[#8c6f5d]',
    pinkBadge: 'bg-[#fce7f3] text-[#9d174d] border-[#f472b6]/60',
    brownBadge: 'bg-[#ede5dc] text-[#5c3e29] border-[#cbb39d]',
    mintBadge: 'bg-[#d1fae5] text-[#065f46] border-[#6ee7b7]/60',
    mustardBadge: 'bg-[#fef9c3] text-[#854d0e] border-[#facc15]/60',
    blueBadge: 'bg-[#e0f2fe] text-[#0369a1] border-[#7dd3fc]/60',
    peachBadge: 'bg-[#ffedd5] text-[#9a3412] border-[#fdba74]/60',
  };

  return (
    <div
      className={`rounded-3xl border shadow-xl p-4 sm:p-6 lg:p-8 space-y-6 transition-colors duration-200 font-sans ${themeClasses.container}`}
    >
      {/* WES ANDERSON CHAPTER TITLE BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-dashed border-[#decbb4]/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-serif uppercase tracking-widest text-[#9c7860]">
            <span>~ Part III: Chronological Archive &amp; Syllabus ~</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight mt-1 flex items-center gap-2.5">
            <span>The Academic Repertoire</span>
            <span className="text-xs font-sans font-bold px-2.5 py-0.5 rounded-full bg-[#fce7f3] text-[#9d174d] border border-[#f472b6]/60 shadow-sm">
              Wes Anderson Palette
            </span>
          </h2>
          <p className={`text-xs mt-1 font-serif italic ${themeClasses.mutedBrownText}`}>
            &ldquo;A meticulously arranged monthly grid for scholar deadlines, university timetables, and high-stakes examination radars.&rdquo;
          </p>
        </div>

        {/* Action Controls & Wes Anderson Style Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Palette Mode Selector */}
          <button
            onClick={() =>
              setThemeMode(themeMode === 'grand-budapest' ? 'tenenbaum-dark' : 'grand-budapest')
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 shadow-sm ${
              themeMode === 'grand-budapest'
                ? 'bg-[#ffffff] text-[#5c3e29] border-[#cbb39d] hover:bg-[#f4ebe0]'
                : 'bg-[#33241d] text-[#fce7f3] border-[#5e4334] hover:bg-[#402e25]'
            }`}
            title="Toggle Grand Budapest Cream vs. Tenenbaum Velvet Palette"
          >
            <Palette className="w-3.5 h-3.5 text-[#f472b6]" />
            <span>{themeMode === 'grand-budapest' ? 'Grand Budapest Cream' : 'Velvet Espresso'}</span>
          </button>

          {/* Jump to Today */}
          <button
            onClick={handleJumpToday}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-sm ${
              isDarkTheme
                ? 'bg-[#2b1f19] text-[#ebd5c1] border-[#4a362a] hover:border-[#f472b6]'
                : 'bg-white text-[#4a3528] border-[#decbb4] hover:border-[#f472b6]'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 text-[#f472b6]" />
            <span>Today</span>
          </button>

          {/* Add Assignment Shortcut */}
          {onOpenAssignmentModal && (
            <button
              onClick={() => onOpenAssignmentModal(selectedDateStr)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#fce7f3] text-[#9d174d] border border-[#f472b6]/70 hover:bg-[#fbcfe8] transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Deadline</span>
            </button>
          )}

          {/* Add Exam Shortcut */}
          {onOpenExamModal && (
            <button
              onClick={() => onOpenExamModal(selectedDateStr)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#ffedd5] text-[#9a3412] border border-[#fdba74]/70 hover:bg-[#fed7aa] transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Add Exam</span>
            </button>
          )}
        </div>
      </div>

      {/* MONTHLY WORKLOAD & DEADLINE STRESS METER */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Total Deadlines */}
        <div
          className={`p-3.5 rounded-2xl border shadow-sm flex flex-col justify-between ${themeClasses.cardBg}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-serif uppercase tracking-wider font-bold text-[#8c6f5d]">
              Deliverables
            </span>
            <span className="w-2 h-2 rounded-full bg-[#f472b6]" />
          </div>
          <div className="mt-1">
            <div className="text-2xl font-serif font-black text-[#9d174d]">
              {monthlyMetrics.totalDeadlines}
            </div>
            <div className="text-[10px] text-[#8c6f5d] mt-0.5">
              {monthlyMetrics.submittedCount} submitted ({monthlyMetrics.assignmentsCount} assignments,{' '}
              {monthlyMetrics.examsCount} exams)
            </div>
          </div>
        </div>

        {/* Metric 2: Academic Weight At Risk */}
        <div
          className={`p-3.5 rounded-2xl border shadow-sm flex flex-col justify-between ${themeClasses.cardBg}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-serif uppercase tracking-wider font-bold text-[#8c6f5d]">
              Grade Weight
            </span>
            <span className="w-2 h-2 rounded-full bg-[#facc15]" />
          </div>
          <div className="mt-1">
            <div className="text-2xl font-serif font-black text-[#854d0e]">
              {monthlyMetrics.totalWeight}%
            </div>
            <div className="text-[10px] text-[#8c6f5d] mt-0.5">
              Total coursework &amp; exam grade contribution
            </div>
          </div>
        </div>

        {/* Metric 3: Examination Days */}
        <div
          className={`p-3.5 rounded-2xl border shadow-sm flex flex-col justify-between ${themeClasses.cardBg}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-serif uppercase tracking-wider font-bold text-[#8c6f5d]">
              Finals &amp; Midterms
            </span>
            <span className="w-2 h-2 rounded-full bg-[#fdba74]" />
          </div>
          <div className="mt-1">
            <div className="text-2xl font-serif font-black text-[#9a3412]">
              {monthlyMetrics.examsCount}
            </div>
            <div className="text-[10px] text-[#8c6f5d] mt-0.5">
              Scheduled high-stakes examination dates
            </div>
          </div>
        </div>

        {/* Metric 4: Peak Workload Day */}
        <div
          className={`p-3.5 rounded-2xl border shadow-sm flex flex-col justify-between ${themeClasses.cardBg}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-serif uppercase tracking-wider font-bold text-[#8c6f5d]">
              Peak Stress Alert
            </span>
            <span className="w-2 h-2 rounded-full bg-[#6ee7b7]" />
          </div>
          <div className="mt-1">
            <div className="text-sm font-serif font-black text-[#065f46] truncate">
              {monthlyMetrics.peakDay ? monthlyMetrics.peakDay : 'Equally Distributed'}
            </div>
            <div className="text-[10px] text-[#8c6f5d] mt-0.5">
              {monthlyMetrics.peakCount > 0
                ? `${monthlyMetrics.peakCount} stacked events on this day`
                : 'No concentration risks detected'}
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR & MONTH NAVIGATOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Month Navigation Title */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className={`p-2 rounded-xl border transition-colors ${
              isDarkTheme
                ? 'bg-[#291f1a] border-[#423226] text-[#ebd5c1] hover:bg-[#382a20]'
                : 'bg-white border-[#decbb4] text-[#4a3528] hover:bg-[#f4ebe0]'
            }`}
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            className={`px-4 py-1.5 rounded-xl border text-center font-serif font-bold text-base sm:text-lg min-w-[200px] shadow-sm ${
              isDarkTheme
                ? 'bg-[#241b16] border-[#423226] text-[#fce7f3]'
                : 'bg-white border-[#decbb4] text-[#5c3e29]'
            }`}
          >
            <span>
              {monthName} {currentYear}
            </span>
          </div>

          <button
            onClick={handleNextMonth}
            className={`p-2 rounded-xl border transition-colors ${
              isDarkTheme
                ? 'bg-[#291f1a] border-[#423226] text-[#ebd5c1] hover:bg-[#382a20]'
                : 'bg-white border-[#decbb4] text-[#4a3528] hover:bg-[#f4ebe0]'
            }`}
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Event Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[11px] font-serif font-bold uppercase tracking-wider text-[#8c6f5d] mr-1 hidden sm:inline">
            Filter:
          </span>

          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
              filterType === 'all'
                ? 'bg-[#5c3e29] text-white border-[#5c3e29] shadow-sm'
                : 'bg-transparent text-[#8c6f5d] border-transparent hover:border-[#decbb4]'
            }`}
          >
            All Events
          </button>

          <button
            onClick={() => setFilterType('assignments')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 ${
              filterType === 'assignments'
                ? 'bg-[#fce7f3] text-[#9d174d] border-[#f472b6] shadow-sm font-black'
                : 'bg-transparent text-[#9d174d] border-transparent hover:border-[#f472b6]/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#f472b6]" />
            <span>Assignments</span>
          </button>

          <button
            onClick={() => setFilterType('exams')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 ${
              filterType === 'exams'
                ? 'bg-[#ffedd5] text-[#9a3412] border-[#fdba74] shadow-sm font-black'
                : 'bg-transparent text-[#9a3412] border-transparent hover:border-[#fdba74]/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#fdba74]" />
            <span>Exams</span>
          </button>

          <button
            onClick={() => setFilterType('schedule')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1 ${
              filterType === 'schedule'
                ? 'bg-[#e0f2fe] text-[#0369a1] border-[#7dd3fc] shadow-sm font-black'
                : 'bg-transparent text-[#0369a1] border-transparent hover:border-[#7dd3fc]/40'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#7dd3fc]" />
            <span>Timetable</span>
          </button>
        </div>
      </div>

      {/* MONTHLY CALENDAR GRID */}
      <div className="space-y-1">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center pb-1">
          {DAYS_SHORT.map((day) => (
            <div
              key={day.key}
              className={`py-1.5 rounded-xl font-serif text-[11px] sm:text-xs font-bold tracking-wider uppercase ${
                day.key === 'Sat' || day.key === 'Sun'
                  ? 'text-[#9d174d] bg-[#fce7f3]/50'
                  : isDarkTheme
                    ? 'text-[#a98f7e] bg-[#291f1a]'
                    : 'text-[#8c6f5d] bg-[#f4ebe0]'
              }`}
            >
              <span>{day.label}</span>
            </div>
          ))}
        </div>

        {/* Calendar Cells Matrix */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarGrid.map((cell) => {
            const isToday = cell.dateStr === todayDateStr;
            const isSelected = cell.dateStr === selectedDateStr;

            // Events for this date
            const dayAssignments = assignmentsByDate[cell.dateStr] || [];
            const dayExams = examsByDate[cell.dateStr] || [];
            const daySessions = sessionsByDate[cell.dateStr] || [];
            const dayTasks = aastuState.schedules[cell.dayOfWeek] || [];

            // Filter logic
            const showAssignments = filterType === 'all' || filterType === 'assignments';
            const showExams = filterType === 'all' || filterType === 'exams';
            const showSchedule = filterType === 'all' || filterType === 'schedule';
            const showPractice = filterType === 'all' || filterType === 'practice';

            const filteredAssignments = showAssignments ? dayAssignments : [];
            const filteredExams = showExams ? dayExams : [];
            const filteredSessions = showPractice ? daySessions : [];
            const filteredTasks = showSchedule ? dayTasks : [];

            const hasHighStakesExam = dayExams.length > 0;
            const hasDueAssignment = dayAssignments.some((a) => a.status !== 'submitted');

            // Count completed tasks for that date
            let completedTasksCount = 0;
            dayTasks.forEach((t) => {
              const k = `${cell.dateStr}-${cell.dayOfWeek}-${t.id}`;
              if (aastuState.completedTasks[k]) completedTasksCount++;
            });
            const allDayTasksDone = dayTasks.length > 0 && completedTasksCount === dayTasks.length;

            return (
              <div
                key={cell.dateStr}
                onClick={() => {
                  setSelectedDateStr(cell.dateStr);
                  setIsDayInspectorOpen(true);
                }}
                className={`min-h-[96px] sm:min-h-[118px] p-1.5 sm:p-2 rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between relative group ${
                  isSelected
                    ? isDarkTheme
                      ? 'bg-[#33241d] border-[#f472b6] shadow-md ring-2 ring-[#f472b6]/40'
                      : 'bg-[#fff5f8] border-[#f472b6] shadow-md ring-2 ring-[#f472b6]/50'
                    : isToday
                      ? isDarkTheme
                        ? 'bg-[#291e17] border-[#e8c468] shadow-sm'
                        : 'bg-[#fffdf7] border-[#e8c468] shadow-sm'
                      : cell.isCurrentMonth
                        ? isDarkTheme
                          ? 'bg-[#241b16] border-[#3d2e23] hover:border-[#c4a287]'
                          : 'bg-[#ffffff] border-[#ebdcc8] hover:border-[#cbb39d]'
                        : isDarkTheme
                          ? 'bg-[#1a1410]/50 border-[#2b1f18] opacity-40 hover:opacity-75'
                          : 'bg-[#f8f3ea]/50 border-[#eee3d5] opacity-50 hover:opacity-85'
                }`}
              >
                {/* Cell Header: Day Number + Status Dots */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-serif font-bold w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                      isToday
                        ? 'bg-[#f472b6] text-white font-black shadow-sm'
                        : isSelected
                          ? 'bg-[#5c3e29] text-white font-bold'
                          : cell.isCurrentMonth
                            ? isDarkTheme
                              ? 'text-[#ebd5c1]'
                              : 'text-[#4a3528]'
                            : 'text-[#a98f7e]'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {/* Visual deadline alerts & flags */}
                  <div className="flex items-center gap-1">
                    {hasHighStakesExam && (
                      <span
                        className="w-2 h-2 rounded-full bg-[#f97316] animate-pulse"
                        title="Exam Day"
                      />
                    )}
                    {hasDueAssignment && (
                      <span
                        className="w-2 h-2 rounded-full bg-[#ec4899]"
                        title="Assignment Due"
                      />
                    )}
                    {allDayTasksDone && (
                      <span
                        className="w-2 h-2 rounded-full bg-[#10b981]"
                        title="All tasks completed"
                      />
                    )}
                  </div>
                </div>

                {/* Event Chips List */}
                <div className="space-y-1 my-1 overflow-hidden">
                  {/* 1. Exams (Peach / Terracotta chip) */}
                  {filteredExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="px-1.5 py-0.5 rounded-md text-[10px] font-sans font-bold bg-[#ffedd5] text-[#9a3412] border border-[#fdba74] truncate flex items-center gap-1 shadow-xs"
                      title={`[EXAM] ${exam.title} (${exam.courseCode}) @ ${exam.examTime}`}
                    >
                      <Award className="w-2.5 h-2.5 shrink-0 text-[#ea580c]" />
                      <span className="truncate">{exam.courseCode} Exam</span>
                    </div>
                  ))}

                  {/* 2. Assignments (Bubblegum Pink chip) */}
                  {filteredAssignments.map((asg) => {
                    const isDone = asg.status === 'submitted';
                    return (
                      <div
                        key={asg.id}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-sans font-bold border truncate flex items-center gap-1 shadow-xs ${
                          isDone
                            ? 'bg-[#f1f5f9] text-[#64748b] border-[#cbd5e1] line-through opacity-70'
                            : 'bg-[#fce7f3] text-[#9d174d] border-[#f472b6]'
                        }`}
                        title={`[DUE] ${asg.title} (${asg.courseCode}) - ${asg.weightPercentage || 0}%`}
                      >
                        <Clock className="w-2.5 h-2.5 shrink-0 text-[#db2777]" />
                        <span className="truncate">{asg.courseCode}: {asg.title}</span>
                      </div>
                    );
                  })}

                  {/* 3. Completed Practice Sessions (Mint / Sage chip) */}
                  {filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      className="px-1.5 py-0.5 rounded-md text-[10px] font-sans font-bold bg-[#d1fae5] text-[#065f46] border border-[#6ee7b7] truncate flex items-center gap-1"
                      title={`[PRACTICE] ${session.title}: ${session.letter_grade || 'Score'} (${session.score_percentage}%)`}
                    >
                      <Sparkles className="w-2.5 h-2.5 shrink-0 text-[#059669]" />
                      <span className="truncate">{session.letter_grade || 'Drill'} ({session.score_percentage}%)</span>
                    </div>
                  ))}

                  {/* 4. Daily Schedule summary badge if there are tasks and no major deadline chips */}
                  {filteredTasks.length > 0 &&
                    filteredAssignments.length === 0 &&
                    filteredExams.length === 0 && (
                      <div
                        className={`text-[9px] px-1 py-0.5 rounded text-center truncate font-mono ${
                          allDayTasksDone
                            ? 'bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0]'
                            : isDarkTheme
                              ? 'bg-[#2f221a] text-[#cbb39d]'
                              : 'bg-[#f4ebe0] text-[#785b48]'
                        }`}
                      >
                        {completedTasksCount}/{filteredTasks.length} tasks
                      </div>
                    )}
                </div>

                {/* Bottom Card Footer: Day of week hint */}
                <div className="flex items-center justify-between text-[9px] font-mono text-[#a98f7e] pt-0.5">
                  <span className="uppercase">{cell.dayOfWeek}</span>
                  {dayAssignments.length + dayExams.length > 2 && (
                    <span className="text-[#db2777] font-bold">
                      +{dayAssignments.length + dayExams.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DAY INSPECTOR MODAL / EXPANDED DRAWER */}
      {isDayInspectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`relative w-full max-w-2xl rounded-3xl border shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto ${
              isDarkTheme
                ? 'bg-[#241b16] border-[#4a362a] text-[#ebd5c1]'
                : 'bg-[#fbf7ee] border-[#decbb4] text-[#4a3528]'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-dashed border-[#decbb4]/80">
              <div>
                <span className="text-[11px] font-serif uppercase tracking-widest text-[#9c7860] font-bold">
                  ~ Daily Timetable &amp; Deadlines ~
                </span>
                <h3 className="text-xl font-serif font-black mt-0.5 flex items-center gap-2">
                  <span>{selectedDayInfo.formattedDate}</span>
                  {selectedDayInfo.dateStr === todayDateStr && (
                    <span className="text-xs font-sans font-bold px-2 py-0.5 rounded-full bg-[#f472b6] text-white">
                      Today
                    </span>
                  )}
                </h3>
              </div>
              <button
                onClick={() => setIsDayInspectorOpen(false)}
                className={`p-1.5 rounded-xl border transition-colors ${
                  isDarkTheme
                    ? 'border-[#423226] text-[#a98f7e] hover:text-white hover:bg-[#382a20]'
                    : 'border-[#decbb4] text-[#8c6f5d] hover:text-[#4a3528] hover:bg-[#f4ebe0]'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Row */}
            <div className="flex items-center gap-2 flex-wrap pb-1">
              {onOpenAssignmentModal && (
                <button
                  onClick={() => {
                    setIsDayInspectorOpen(false);
                    onOpenAssignmentModal(selectedDayInfo.dateStr);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#fce7f3] text-[#9d174d] border border-[#f472b6] hover:bg-[#fbcfe8] transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Assignment to Date</span>
                </button>
              )}

              {onOpenExamModal && (
                <button
                  onClick={() => {
                    setIsDayInspectorOpen(false);
                    onOpenExamModal(selectedDayInfo.dateStr);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#ffedd5] text-[#9a3412] border border-[#fdba74] hover:bg-[#fed7aa] transition-colors flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Register Exam on Date</span>
                </button>
              )}

              {onOpenTaskModal && (
                <button
                  onClick={() => {
                    setIsDayInspectorOpen(false);
                    onOpenTaskModal(selectedDayInfo.dayOfWeek);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                    isDarkTheme
                      ? 'bg-[#2f221a] text-[#ebd5c1] border-[#4a362a] hover:bg-[#3d2d23]'
                      : 'bg-white text-[#5c3e29] border-[#decbb4] hover:bg-[#f4ebe0]'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 text-[#5c3e29]" />
                  <span>Add {selectedDayInfo.dayOfWeek} Schedule Block</span>
                </button>
              )}
            </div>

            {/* SECTION 1: ASSIGNMENTS DUE ON THIS DATE */}
            {selectedDayInfo.assignments.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#9d174d] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#f472b6]" />
                    <span>Assignments Due Today ({selectedDayInfo.assignments.length})</span>
                  </h4>
                </div>

                <div className="space-y-2">
                  {selectedDayInfo.assignments.map((asg) => {
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
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                          isSubmitted
                            ? 'bg-[#f8fafc]/50 border-slate-200 opacity-60'
                            : 'bg-[#fce7f3]/40 border-[#f472b6]/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            onClick={() => handleToggleAssignmentStatus(asg.id)}
                            className="text-[#9d174d] hover:text-[#059669] transition-colors"
                          >
                            {isSubmitted ? (
                              <CheckCircle2 className="w-5 h-5 text-[#059669]" />
                            ) : (
                              <Circle className="w-5 h-5 text-[#f472b6]" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#fce7f3] text-[#9d174d] border border-[#f472b6]">
                                {asg.courseCode}
                              </span>
                              <span
                                className={`text-sm font-bold ${
                                  isSubmitted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {asg.title}
                              </span>
                            </div>
                            <div className="text-xs text-[#8c6f5d] mt-0.5 flex items-center gap-2">
                              <span>Due at {asg.dueTime}</span>
                              {asg.weightPercentage && (
                                <span className="font-semibold text-[#9d174d]">
                                  • {asg.weightPercentage}% of Grade
                                </span>
                              )}
                              <span>• Priority: {asg.priority}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={gcalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg border border-[#f472b6]/40 text-[#9d174d] hover:bg-[#fce7f3]"
                            title="Add to Google Calendar"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 2: EXAMS ON THIS DATE */}
            {selectedDayInfo.exams.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#9a3412] flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#ea580c]" />
                  <span>Scheduled Examinations ({selectedDayInfo.exams.length})</span>
                </h4>

                <div className="space-y-2">
                  {selectedDayInfo.exams.map((exam) => (
                    <div
                      key={exam.id}
                      className="p-4 rounded-2xl bg-[#ffedd5]/50 border border-[#fdba74] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#ffedd5] text-[#9a3412] border border-[#fdba74]">
                          {exam.courseCode}
                        </span>
                        <span className="text-xs font-bold text-[#ea580c]">
                          {exam.weightPercentage}% of Final Grade
                        </span>
                      </div>

                      <div>
                        <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                          {exam.title}
                        </h5>
                        <div className="flex items-center gap-3 text-xs text-[#8c6f5d] mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {exam.examTime} ({exam.durationMinutes} mins)
                            </span>
                          </span>
                          {exam.room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>Room {exam.room}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Launch practice test */}
                      {onNavigateToSimulator && (
                        <button
                          onClick={() => {
                            setIsDayInspectorOpen(false);
                            onNavigateToSimulator();
                          }}
                          className="w-full py-1.5 px-3 rounded-xl bg-[#9a3412] text-white text-xs font-bold hover:bg-[#9a3412]/90 transition-colors flex items-center justify-center gap-1.5 mt-2"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Simulate Exam Drill for {exam.courseCode}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 3: RECURRING TIMETABLE / CLASSES FOR THIS DAY */}
            <div className="space-y-2 pt-1 border-t border-dashed border-[#decbb4]/80">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-[#5c3e29] dark:text-[#ebd5c1] flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#5c3e29]" />
                  <span>
                    {selectedDayInfo.dayOfWeek}&apos;s Class &amp; Study Routine (
                    {selectedDayInfo.completedTasksCount} / {selectedDayInfo.tasks.length} Completed)
                  </span>
                </h4>
              </div>

              {selectedDayInfo.tasks.length === 0 ? (
                <p className="text-xs text-[#8c6f5d] italic py-2">
                  No routine tasks scheduled for {selectedDayInfo.dayOfWeek}.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {selectedDayInfo.tasks.map((task) => {
                    const isDoneKey = `${selectedDayInfo.dateStr}-${selectedDayInfo.dayOfWeek}-${task.id}`;
                    const isDone = !!aastuState.completedTasks[isDoneKey];

                    return (
                      <div
                        key={task.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                          isDone
                            ? 'bg-[#d1fae5]/30 border-[#a7f3d0] opacity-70'
                            : isDarkTheme
                              ? 'bg-[#291f1a] border-[#3d2e23]'
                              : 'bg-white border-[#ebdcc8]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <button
                            onClick={() =>
                              handleToggleTaskForDate(task.id, selectedDayInfo.dayOfWeek)
                            }
                            className="text-[#8c6f5d] hover:text-[#059669] transition-colors"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                            ) : (
                              <Circle className="w-4 h-4 text-[#a98f7e]" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-[#ebd5c1]/40 text-[#5c3e29] dark:text-[#ebd5c1]">
                                {task.time}
                              </span>
                              <span
                                className={`text-xs font-semibold ${
                                  isDone ? 'line-through text-[#8c6f5d]' : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {task.title}
                              </span>
                            </div>
                            {task.location && (
                              <span className="text-[11px] text-[#8c6f5d] flex items-center gap-1 mt-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                <span>{task.location}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-2 border-t border-[#decbb4]/80">
              <button
                onClick={() => setIsDayInspectorOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  isDarkTheme
                    ? 'bg-[#2f221a] text-[#ebd5c1] border-[#4a362a] hover:bg-[#3d2d23]'
                    : 'bg-white text-[#5c3e29] border-[#decbb4] hover:bg-[#f4ebe0]'
                }`}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
