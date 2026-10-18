import React, { useState, useMemo, useEffect, useRef } from 'react';
import { db } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUiStore } from '../store/uiStore';
import { getTodayKey, formatDisplayDate } from '../utils/dateUtils';
import {
  calculateComprehensiveStats,
  TimeRangeType,
  ComprehensivePeriodStats,
  WrappedStoryCard,
  HeatmapDay,
  EvidenceInsight,
} from '../utils/statisticsEngine';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Activity,
  GraduationCap,
  Music,
  BookOpen,
  Award,
  Zap,
  Calendar,
  Layers,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  RotateCcw,
  Share2,
  X,
  Flame,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Target,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

export const StatisticsPage: React.FC = () => {
  const { showToast, setCurrentRoute } = useUiStore();
  const todayKey = getTodayKey();

  // Queries for all relevant life data
  const settings = useLiveQuery(() => db.settings.get('current_user'));
  const semesters = useLiveQuery(() => db.semesters.toArray()) || [];
  const courses = useLiveQuery(() => db.courses.toArray()) || [];
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const habits = useLiveQuery(() => db.habits.toArray()) || [];
  const habitLogs = useLiveQuery(() => db.habitLogs.toArray()) || [];
  const restDays = useLiveQuery(() => db.restDays.toArray()) || [];
  const attendanceRecords = useLiveQuery(() => db.attendance.toArray()) || [];
  const focusSessions = useLiveQuery(() => db.focusSessions.toArray()) || [];
  const exams = useLiveQuery(() => db.exams.toArray()) || [];
  const gradeComponents = useLiveQuery(() => db.gradeComponents.toArray()) || [];
  const creativeSessions = useLiveQuery(() => db.creativeSessions.toArray()) || [];
  const creativeProjects = useLiveQuery(() => db.creativeProjects.toArray()) || [];
  const readingItems = useLiveQuery(() => db.readingItems.toArray()) || [];
  const projectMilestones = useLiveQuery(() => db.projectMilestones.toArray()) || [];
  const journalEntries = useLiveQuery(() => db.journalEntries.toArray()) || [];

  const activeSemester =
    semesters.find(
      (s) =>
        s.id === settings?.activeSemesterId ||
        s.isActive ||
        s.name === settings?.currentTermName
    ) || semesters[0] || null;

  // Time Range State
  const [selectedRange, setSelectedRange] = useState<TimeRangeType>('week');
  const [activeTab, setActiveTab] = useState<'overview' | 'focus' | 'tasks' | 'habits' | 'academics' | 'creative'>('overview');

  // Heatmap hover/selected day tooltip
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<HeatmapDay | null>(null);

  // Wrapped Story Deck State
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [wrappedIndex, setWrappedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const storyTimerRef = useRef<any>(null);

  // Calculate comprehensive statistics
  const stats: ComprehensivePeriodStats = useMemo(() => {
    return calculateComprehensiveStats({
      rangeType: selectedRange,
      referenceDateKey: todayKey,
      activeSemester,
      tasks,
      habits,
      habitLogs,
      restDays,
      attendanceRecords,
      focusSessions,
      exams,
      gradeComponents,
      courses,
      creativeSessions,
      creativeProjects,
      readingItems,
      projectMilestones,
      journalEntries,
    });
  }, [
    selectedRange,
    todayKey,
    activeSemester,
    tasks,
    habits,
    habitLogs,
    restDays,
    attendanceRecords,
    focusSessions,
    exams,
    gradeComponents,
    courses,
    creativeSessions,
    creativeProjects,
    readingItems,
    projectMilestones,
    journalEntries,
  ]);

  // Story progression ticker
  useEffect(() => {
    if (!isWrappedOpen || isPaused) return;

    storyTimerRef.current = setTimeout(() => {
      if (wrappedIndex < stats.wrappedCards.length - 1) {
        setWrappedIndex((prev) => prev + 1);
      } else {
        setIsPaused(true);
      }
    }, 6000);

    return () => clearTimeout(storyTimerRef.current);
  }, [isWrappedOpen, isPaused, wrappedIndex, stats.wrappedCards.length]);

  const handleLaunchWrapped = (index: number = 0) => {
    setWrappedIndex(index);
    setIsPaused(false);
    setIsWrappedOpen(true);
  };

  const handleCloseWrapped = () => {
    setIsWrappedOpen(false);
    clearTimeout(storyTimerRef.current);
  };

  const handlePrevStory = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (wrappedIndex > 0) {
      setWrappedIndex((prev) => prev - 1);
    }
  };

  const handleNextStory = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (wrappedIndex < stats.wrappedCards.length - 1) {
      setWrappedIndex((prev) => prev + 1);
    } else {
      setIsWrappedOpen(false);
    }
  };

  const handleShareSummary = () => {
    if (navigator.clipboard) {
      const summaryText = `🎓 College Life OS — ${stats.bounds.label} Wrapped\n` +
        `• Conquered ${stats.tasksCompleted} tasks (${stats.taskCompletionRate}% rate)\n` +
        `• Logged ${(stats.trackedFocusMinutes / 60).toFixed(1)} hrs deep study\n` +
        `• Habit consistency: ${stats.habitOverallRate}%\n` +
        `• Peak rhythm: ${stats.peakDayName}s`;
      navigator.clipboard.writeText(summaryText);
      showToast('Summary copied to clipboard!', 'success');
    } else {
      showToast('Stats summary ready!', 'info');
    }
  };

  const currentStoryCard = stats.wrappedCards[wrappedIndex] || stats.wrappedCards[0];

  return (
    <div className="space-y-6 sm:space-y-8 pb-28 animate-pop">
      {/* Top Header & Range Controls */}
      <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-heading uppercase tracking-wider text-[rgb(var(--c-primary))] font-bold">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Personal Life Analytics &amp; Wrapped</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-[rgb(var(--c-text))] mt-1">
              Your University Trajectory
            </h1>
            <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-0.5">
              Period: <span className="font-bold text-[rgb(var(--c-text))]">{stats.bounds.label}</span> ({formatDisplayDate(stats.bounds.startDate)} – {formatDisplayDate(stats.bounds.endDate)})
            </p>
          </div>

          {/* Time Range Pills & Wrapped Launcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] p-1 rounded-2xl">
              {(['week', 'month', 'semester', 'year', 'all'] as TimeRangeType[]).map((r) => {
                const labels: Record<TimeRangeType, string> = {
                  week: 'Week',
                  month: 'Month',
                  semester: 'Term',
                  year: 'Year',
                  all: 'All Time',
                };
                return (
                  <button
                    key={r}
                    onClick={() => setSelectedRange(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition active:scale-95 ${
                      selectedRange === r
                        ? 'bg-[rgb(var(--c-primary))] text-[rgb(var(--c-on-primary))] shadow-xs'
                        : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                    }`}
                  >
                    {labels[r]}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handleLaunchWrapped(0)}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 text-white font-heading font-bold text-xs shadow-md hover:opacity-95 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              title="Launch Spotify Wrapped Story Deck"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
              <span>Launch {stats.bounds.label} Wrapped</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-5 mt-4 border-t border-[rgb(var(--c-border))]/60">
          {[
            { id: 'overview', label: 'Overview & Momentum', icon: Zap },
            { id: 'focus', label: 'Deep Work & Focus', icon: Clock },
            { id: 'tasks', label: 'Quests & Productivity', icon: CheckCircle2 },
            { id: 'habits', label: 'Habits Consistency', icon: Activity },
            { id: 'academics', label: 'Academics & Timetable', icon: GraduationCap },
            { id: 'creative', label: 'Creative & Studio', icon: Music },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-heading font-bold transition shrink-0 ${
                  isActive
                    ? 'bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-primary))] shadow-2xs border border-[rgb(var(--c-border))]'
                    : 'text-[rgb(var(--c-muted))] hover:text-[rgb(var(--c-text))]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW & MOMENTUM */}
      {activeTab === 'overview' && (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
          {/* Top 4 Metric Comparison Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Tasks Conquered */}
            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-[rgb(var(--c-muted))] font-heading">
                <span>Tasks Conquered</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-heading font-bold text-[rgb(var(--c-text))] mt-1.5">
                {stats.tasksCompleted}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-heading font-semibold">
                {stats.tasksComparison.percentChange !== null ? (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
                    stats.tasksComparison.isImprovement ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {stats.tasksComparison.isImprovement ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stats.tasksComparison.formattedChange}
                  </span>
                ) : (
                  <span className="text-[rgb(var(--c-muted))]">{stats.tasksComparison.formattedChange}</span>
                )}
                <span className="text-[rgb(var(--c-muted))] text-[10px]">vs {stats.bounds.prevLabel}</span>
              </div>
            </div>

            {/* 2. Tracked Focus */}
            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-[rgb(var(--c-muted))] font-heading">
                <span>Deep Work Focus</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-heading font-bold text-[rgb(var(--c-text))] mt-1.5">
                {(stats.trackedFocusMinutes / 60).toFixed(1)} <span className="text-sm font-normal text-[rgb(var(--c-muted))]">hrs</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-heading font-semibold">
                {stats.focusComparison.percentChange !== null ? (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
                    stats.focusComparison.isImprovement ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {stats.focusComparison.isImprovement ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stats.focusComparison.formattedChange}
                  </span>
                ) : (
                  <span className="text-[rgb(var(--c-muted))]">{stats.focusComparison.formattedChange}</span>
                )}
                <span className="text-[rgb(var(--c-muted))] text-[10px]">vs {stats.bounds.prevLabel}</span>
              </div>
            </div>

            {/* 3. Habit Consistency */}
            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-[rgb(var(--c-muted))] font-heading">
                <span>Habit Consistency</span>
                <Activity className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-heading font-bold text-[rgb(var(--c-text))] mt-1.5">
                {stats.habitOverallRate}%
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-heading font-semibold">
                {stats.habitsComparison.percentChange !== null ? (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
                    stats.habitsComparison.isImprovement ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {stats.habitsComparison.isImprovement ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stats.habitsComparison.formattedChange}
                  </span>
                ) : (
                  <span className="text-[rgb(var(--c-muted))]">{stats.habitsComparison.formattedChange}</span>
                )}
                <span className="text-[rgb(var(--c-muted))] text-[10px]">vs {stats.bounds.prevLabel}</span>
              </div>
            </div>

            {/* 4. Active Campus Days */}
            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-[rgb(var(--c-muted))] font-heading">
                <span>Active Operating Days</span>
                <Calendar className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-heading font-bold text-[rgb(var(--c-text))] mt-1.5">
                {stats.activeDays} <span className="text-sm font-normal text-[rgb(var(--c-muted))]">/ {stats.totalDaysElapsed}d</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-heading text-[rgb(var(--c-muted))]">
                <span className="text-[rgb(var(--c-primary))] font-bold">{stats.activeDaysPercent}% momentum</span>
                <span>• Peak: {stats.peakDayName}s</span>
              </div>
            </div>
          </div>

          {/* Activity Heatmap Grid */}
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-[rgb(var(--c-border))]">
              <div>
                <h3 className="text-sm sm:text-base font-heading font-bold text-[rgb(var(--c-text))] flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Consistency &amp; Engagement Heatmap</span>
                </h3>
                <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
                  Composite intensity: Tasks conquered + Habits checked + Focus hours + Lecture attendance
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-1.5 text-[10px] text-[rgb(var(--c-muted))] font-heading">
                <span>Inactive</span>
                <span className="w-2.5 h-2.5 rounded-sm bg-[rgb(var(--c-surface2))]" />
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-300 dark:bg-emerald-900" />
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 dark:bg-emerald-600" />
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 dark:bg-[#B6E63E] ring-1 ring-[#B6E63E]" />
                <span>Peak Flow</span>
              </div>
            </div>

            {/* Heatmap Grid View */}
            <div className="overflow-x-auto pb-2">
              <div className="inline-grid grid-rows-7 grid-flow-col gap-1.5 min-w-full">
                {stats.heatmap.map((day) => {
                  const levelClasses = [
                    'bg-[rgb(var(--c-surface2))] border border-[rgb(var(--c-border))]/60 opacity-60',
                    'bg-emerald-200 dark:bg-emerald-950/80 border border-emerald-400/40 text-emerald-900 dark:text-emerald-300',
                    'bg-emerald-400/70 dark:bg-emerald-700/80 border border-emerald-500 text-white',
                    'bg-emerald-600 dark:bg-emerald-500 border border-emerald-400 text-white shadow-xs',
                    'bg-emerald-500 dark:bg-[#B6E63E] text-stone-950 font-bold border-2 border-emerald-300 dark:border-white shadow-xs',
                  ];

                  const isSelected = selectedHeatmapDay?.dateKey === day.dateKey;

                  return (
                    <button
                      key={day.dateKey}
                      onClick={() => setSelectedHeatmapDay(day)}
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md transition-all flex items-center justify-center text-[9px] cursor-pointer hover:scale-115 hover:z-10 focus:outline-none ${
                        levelClasses[day.level]
                      } ${day.isToday ? 'ring-2 ring-[rgb(var(--c-primary))] font-bold' : ''} ${
                        isSelected ? 'scale-120 z-20 ring-2 ring-amber-400' : ''
                      }`}
                      title={`${day.dateKey}: Composite Score ${day.compositeScore}`}
                    >
                      {day.dayNum}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Inspector */}
            {selectedHeatmapDay && (
              <div className="mt-4 p-3.5 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
                <div>
                  <span className="font-heading font-bold text-[rgb(var(--c-text))]">
                    {formatDisplayDate(selectedHeatmapDay.dateKey)}
                  </span>
                  <span className="text-[rgb(var(--c-muted))] ml-2">
                    Composite Score: <strong className="text-[rgb(var(--c-primary))]">+{selectedHeatmapDay.compositeScore} pts</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[rgb(var(--c-muted))] flex-wrap">
                  <span>✅ {selectedHeatmapDay.tasksCount} Tasks</span>
                  <span>🔥 {selectedHeatmapDay.habitsCount} Habits</span>
                  <span>⏱️ {selectedHeatmapDay.focusMinutes}m Study</span>
                  <span>🏛️ {selectedHeatmapDay.classesAttended} Classes</span>
                  <button
                    onClick={() => setSelectedHeatmapDay(null)}
                    className="text-rose-500 font-heading font-bold text-xs hover:underline ml-2"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Evidence-Based Coaching Insights */}
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-5 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2 font-heading text-xs sm:text-sm font-bold uppercase text-[rgb(var(--c-primary))]">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Evidence-Based Pattern Insights</span>
              </div>
              <span className="text-[11px] text-[rgb(var(--c-muted))] font-flourish">
                Derived from {stats.totalDaysElapsed} days of actual history
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.insights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-4 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] space-y-2 hover:border-[rgb(var(--c-primary))] transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-heading font-bold tracking-wider text-[rgb(var(--c-primary))]">
                      {insight.category}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${
                      insight.type === 'positive' ? 'bg-emerald-500' : insight.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                  </div>
                  <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))] group-hover:text-[rgb(var(--c-primary))] transition">
                    {insight.title}
                  </div>
                  <p className="text-xs text-[rgb(var(--c-muted))] leading-relaxed">
                    {insight.observation}
                  </p>
                  <div className="pt-2 border-t border-[rgb(var(--c-border))]/60 text-[11px]">
                    <span className="font-heading font-bold text-[rgb(var(--c-text))] block mb-0.5">
                      Recommended Action:
                    </span>
                    <p className="text-[rgb(var(--c-muted))] font-flourish">
                      {insight.recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Personal Records & Milestones */}
          <div className="ticket-border bg-gradient-to-r from-[rgb(var(--c-surface))] to-[rgb(var(--c-surface2))] rounded-3xl p-5 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[rgb(var(--c-border))]">
              <div className="flex items-center gap-2 font-heading text-xs sm:text-sm font-bold uppercase text-[rgb(var(--c-primary))]">
                <Award className="w-4 h-4 text-[#E5C04B]" />
                <span>Hall of Personal Records ({stats.bounds.label})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {stats.records.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center space-y-1"
                >
                  <div className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))]">
                    {rec.label}
                  </div>
                  <div className="text-lg font-heading font-bold text-[rgb(var(--c-primary))]">
                    {rec.value}
                  </div>
                  <div className="text-[11px] text-[rgb(var(--c-muted))] font-flourish truncate">
                    {rec.context}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEEP WORK & FOCUS */}
      {activeTab === 'focus' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[rgb(var(--c-border))]">
              <div>
                <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Deep Work Allocation by Course</span>
                </h3>
                <p className="text-xs text-[rgb(var(--c-muted))] font-flourish mt-0.5">
                  Tracked across {stats.focusSessionCount} sessions • Average session: {stats.averageSessionMinutes} minutes
                </p>
              </div>
              <button
                onClick={() => setCurrentRoute('#/focus')}
                className="px-3.5 py-1.5 rounded-xl bg-[#B6E63E] text-stone-950 font-heading text-xs font-bold hover:opacity-90 active:scale-95 transition"
              >
                Open Focus Timer →
              </button>
            </div>

            {stats.focusByCourse.length === 0 ? (
              <div className="text-center py-10 text-xs text-[rgb(var(--c-muted))] font-flourish">
                No focus blocks recorded in this period. Start a 25m or 45m session from the Focus page!
              </div>
            ) : (
              <div className="space-y-3.5">
                {stats.focusByCourse.map((item) => {
                  const sharePercent = stats.trackedFocusMinutes > 0
                    ? Math.round((item.minutes / stats.trackedFocusMinutes) * 100)
                    : 0;

                  return (
                    <div key={item.courseId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-heading font-bold">
                        <span className="flex items-center gap-2 text-[rgb(var(--c-text))]">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span>{item.code} — {item.name}</span>
                        </span>
                        <span className="text-[rgb(var(--c-muted))] font-mono">
                          {item.minutes}m ({sharePercent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] overflow-hidden p-0.5">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${sharePercent}%`,
                            backgroundColor: item.color || '#B6E63E',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Focus Modes Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.focusByMode.map((m) => (
              <div key={m.mode} className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 text-center">
                <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                  {m.mode}
                </div>
                <div className="text-xl font-heading font-bold text-[rgb(var(--c-primary))] mt-1">
                  {m.minutes}m
                </div>
                <div className="text-[10px] text-[rgb(var(--c-muted))] mt-0.5 font-flourish">
                  {m.count} completed sessions
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TASKS & PRODUCTIVITY */}
      {activeTab === 'tasks' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {/* Completion Ratio Arc */}
            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 shadow-xs flex flex-col items-center justify-center text-center">
              <h3 className="text-xs font-heading uppercase tracking-wider text-[rgb(var(--c-primary))] font-bold mb-4">
                Task Completion Ratio
              </h3>

              {/* Circular Gauge */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-[rgb(var(--c-border))]"
                    strokeWidth="9"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-emerald-500 transition-all duration-700 ease-out"
                    strokeWidth="9"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - (stats.taskCompletionRate / 100))}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-heading font-bold text-[rgb(var(--c-text))]">
                    {stats.taskCompletionRate}%
                  </span>
                  <span className="text-[10px] text-[rgb(var(--c-muted))] font-heading">Conquered</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 mt-4 text-xs font-heading font-bold">
                <div>
                  <span className="text-[rgb(var(--c-muted))] text-[10px] block">Planned</span>
                  <span className="text-[rgb(var(--c-text))]">{stats.tasksPlanned}</span>
                </div>
                <div>
                  <span className="text-[rgb(var(--c-muted))] text-[10px] block">Completed</span>
                  <span className="text-emerald-500">{stats.tasksCompleted}</span>
                </div>
                <div>
                  <span className="text-[rgb(var(--c-muted))] text-[10px] block">Overdue</span>
                  <span className="text-rose-500">{stats.overdueTasks}</span>
                </div>
              </div>
            </div>

            {/* Weekday Rhythm Breakdown */}
            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 shadow-xs">
              <h3 className="text-xs font-heading uppercase tracking-wider text-[rgb(var(--c-primary))] font-bold mb-4">
                Productivity by Day of the Week
              </h3>

              <div className="space-y-2.5">
                {stats.weekdayActivity.map((w) => {
                  const maxTasks = Math.max(...stats.weekdayActivity.map((x) => x.tasks), 1);
                  const barWidth = Math.round((w.tasks / maxTasks) * 100);

                  return (
                    <div key={w.dayName} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs font-heading">
                        <span className="font-bold text-[rgb(var(--c-text))]">{w.dayName}</span>
                        <span className="text-[rgb(var(--c-muted))] font-mono text-[11px]">
                          {w.tasks} tasks • {w.focusMins}m study
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HABITS CONSISTENCY */}
      {activeTab === 'habits' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[rgb(var(--c-border))]">
              <div>
                <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))] flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>Habit Passport Scorecards</span>
                </h3>
                <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
                  Overall adherence: {stats.habitOverallRate}% • Total check-ins: {stats.habitsCompletedCount}
                </p>
              </div>
              <button
                onClick={() => setCurrentRoute('#/habits')}
                className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] hover:underline"
              >
                Open Habit Passport →
              </button>
            </div>

            {stats.habitStats.length === 0 ? (
              <div className="text-center py-10 text-xs text-[rgb(var(--c-muted))] font-flourish">
                No habits configured yet. Add your daily rituals on the Habits page!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stats.habitStats.map((h) => (
                  <div
                    key={h.habitId}
                    className="p-4 rounded-2xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-bg))] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-heading font-bold text-[rgb(var(--c-text))] truncate">
                        {h.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgb(var(--c-surface2))] text-[rgb(var(--c-muted))] font-heading">
                        {h.category}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[rgb(var(--c-muted))] pt-1">
                      <span>Rate: <strong className="text-[rgb(var(--c-text))]">{h.completionRate}%</strong></span>
                      <span>Streak: <strong className="text-rose-500">{h.currentStreak}d</strong> (Best {h.bestStreak}d)</span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border))] overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${h.completionRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: ACADEMICS & TIMETABLE */}
      {activeTab === 'academics' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[rgb(var(--c-border))]">
              <div>
                <h3 className="text-base font-heading font-bold text-[rgb(var(--c-text))] flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[rgb(var(--c-primary))]" />
                  <span>Academic Standing &amp; Class Attendance</span>
                </h3>
                <p className="text-xs text-[rgb(var(--c-muted))] font-flourish">
                  Overall lecture attendance: <strong className="text-emerald-500">{stats.attendanceRate}%</strong> ({stats.classesAttendedCount} / {stats.classesRecordedCount} recorded sessions)
                </p>
              </div>
              <button
                onClick={() => setCurrentRoute('#/grades')}
                className="text-xs font-heading font-bold text-[rgb(var(--c-primary))] hover:underline"
              >
                Grades &amp; GPA Sandbox →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center">
                <div className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))]">
                  Boss Battles Defeated
                </div>
                <div className="text-2xl font-heading font-bold text-emerald-500 mt-1">
                  {stats.examsDefeatedCount}
                </div>
                <div className="text-[10px] text-[rgb(var(--c-muted))] mt-0.5">
                  Exams &amp; Lab Practicals
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center">
                <div className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))]">
                  Target CGPA
                </div>
                <div className="text-2xl font-heading font-bold text-[rgb(var(--c-primary))] mt-1">
                  {settings?.targetCgpa ? settings.targetCgpa.toFixed(2) : '3.85'}
                </div>
                <div className="text-[10px] text-[rgb(var(--c-muted))] mt-0.5">
                  Department Placement Target
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[rgb(var(--c-bg))] border border-[rgb(var(--c-border))] text-center">
                <div className="text-[10px] uppercase font-heading font-bold text-[rgb(var(--c-muted))]">
                  Enrolled Courses
                </div>
                <div className="text-2xl font-heading font-bold text-[rgb(var(--c-text))] mt-1">
                  {courses.length}
                </div>
                <div className="text-[10px] text-[rgb(var(--c-muted))] mt-0.5">
                  Active this semester
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: CREATIVE & STUDIO */}
      {activeTab === 'creative' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 text-center">
              <Music className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
              <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                Studio Creative Flow
              </div>
              <div className="text-xl font-heading font-bold text-[rgb(var(--c-primary))] mt-1">
                {stats.creativeMinutes}m
              </div>
              <div className="text-[10px] text-[rgb(var(--c-muted))] mt-0.5">
                {stats.creativeSessionCount} sessions logged
              </div>
            </div>

            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 text-center">
              <BookOpen className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                Pages Read
              </div>
              <div className="text-xl font-heading font-bold text-[rgb(var(--c-primary))] mt-1">
                {stats.readingPagesRead}
              </div>
              <div className="text-[10px] text-[rgb(var(--c-muted))] mt-0.5">
                {stats.booksFinishedCount} books completed
              </div>
            </div>

            <div className="ticket-border bg-[rgb(var(--c-surface))] rounded-2xl p-4 text-center">
              <Layers className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <div className="text-xs font-heading font-bold text-[rgb(var(--c-text))]">
                Milestones Conquered
              </div>
              <div className="text-xl font-heading font-bold text-[rgb(var(--c-primary))] mt-1">
                {stats.milestonesCompletedCount}
              </div>
              <div className="text-[10px] text-[rgb(var(--c-muted))] mt-0.5">
                Dungeon milestones completed
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SPOTIFY WRAPPED FULLSCREEN STORY DECK MODAL */}
      {isWrappedOpen && currentStoryCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className={`relative w-full max-w-md h-[88vh] max-h-[720px] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between text-white p-6 sm:p-8 bg-gradient-to-b ${currentStoryCard.bgGradient} transition-all duration-300 select-none`}
            style={{
              boxShadow: `0 0 50px ${currentStoryCard.themeColor}33`,
              border: `2px solid ${currentStoryCard.themeColor}44`,
            }}
          >
            {/* Top Progress Bars (One per card) */}
            <div className="flex items-center gap-1.5 w-full pt-1">
              {stats.wrappedCards.map((card, i) => (
                <div
                  key={card.id}
                  className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden"
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      i < wrappedIndex
                        ? 'w-full bg-white'
                        : i === wrappedIndex
                        ? 'w-full bg-white animate-pulse'
                        : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Top Bar with Title, Pause & Close */}
            <div className="flex items-center justify-between mt-3 text-white/80">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-xs">
                  {stats.bounds.label} Wrapped • {wrappedIndex + 1}/{stats.wrappedCards.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition active:scale-90"
                  title={isPaused ? 'Resume autoplay' : 'Pause'}
                >
                  {isPaused ? <Play className="w-4 h-4 text-white" /> : <Pause className="w-4 h-4 text-white" />}
                </button>
                <button
                  onClick={handleCloseWrapped}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition active:scale-90"
                  title="Close Wrapped"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Main Interactive Tap Zones (Left = Prev, Right = Next) */}
            <div className="my-auto py-6 space-y-6">
              {/* Kicker Tag */}
              <div className="inline-block">
                <span
                  className="text-[11px] font-heading font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-xs"
                  style={{ backgroundColor: currentStoryCard.themeColor, color: '#0A0A0A' }}
                >
                  {currentStoryCard.kicker}
                </span>
              </div>

              {/* Title & Massive Lead Value */}
              <div>
                <h2 className="text-xl sm:text-2xl font-heading font-bold text-white tracking-wide">
                  {currentStoryCard.title}
                </h2>
                <div
                  className="text-4xl sm:text-5xl font-heading font-black tracking-tight mt-3 text-white drop-shadow-md"
                  style={{ textShadow: `0 0 25px ${currentStoryCard.themeColor}88` }}
                >
                  {currentStoryCard.leadValue}
                </div>
                <p className="text-sm text-white/80 font-medium mt-1">
                  {currentStoryCard.leadSubtitle}
                </p>
              </div>

              {/* Supporting Facts Pill List */}
              <div className="space-y-2 pt-2">
                {currentStoryCard.supportingFacts.map((fact, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-heading font-semibold text-white/95"
                  >
                    {fact}
                  </div>
                ))}
              </div>

              {/* Next Step Recommendation */}
              {currentStoryCard.nextStepRecommendation && (
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs text-white/90">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-amber-300 block mb-0.5">
                    Actionable Strategy
                  </span>
                  {currentStoryCard.nextStepRecommendation}
                </div>
              )}
            </div>

            {/* Tap Navigation Zones (Absolute invisible click targets) */}
            <div
              onClick={handlePrevStory}
              className="absolute left-0 top-16 bottom-20 w-1/3 cursor-pointer z-10"
              title="Previous slide"
            />
            <div
              onClick={handleNextStory}
              className="absolute right-0 top-16 bottom-20 w-2/3 cursor-pointer z-10"
              title="Next slide"
            />

            {/* Bottom Actions Bar */}
            <div className="relative z-20 flex items-center justify-between pt-4 border-t border-white/15">
              <button
                onClick={() => setWrappedIndex(0)}
                className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white font-heading font-bold transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Replay
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleShareSummary}
                  className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-heading font-bold transition flex items-center gap-1.5 active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>

                {wrappedIndex < stats.wrappedCards.length - 1 ? (
                  <button
                    onClick={handleNextStory}
                    className="px-4 py-2 rounded-xl bg-white text-stone-950 text-xs font-heading font-bold transition flex items-center gap-1 shadow-md hover:opacity-90 active:scale-95"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleCloseWrapped}
                    className="px-4 py-2 rounded-xl bg-emerald-400 text-stone-950 text-xs font-heading font-bold transition shadow-md hover:opacity-90 active:scale-95"
                  >
                    Finish Wrapped
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
