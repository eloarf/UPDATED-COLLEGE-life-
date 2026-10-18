import {
  Task,
  Habit,
  HabitLog,
  RestDay,
  AttendanceRecord,
  FocusSession,
  Exam,
  GradeComponent,
  Course,
  CreativeSession,
  CreativeProject,
  ReadingItem,
  ProjectMilestone,
  Semester,
  JournalEntry,
} from '../types';
import {
  addDaysToKey,
  formatDayKey,
  getTodayKey,
  parseDayKey,
  FULL_DAY_NAMES,
  DAY_NAMES,
} from './dateUtils';

export type TimeRangeType = 'week' | 'month' | 'semester' | 'year' | 'all';

export interface DateRangeBounds {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string;
  prevStartDate: string;
  prevEndDate: string;
  prevLabel: string;
}

export interface MetricComparison {
  current: number;
  previous: number;
  delta: number;
  percentChange: number | null; // null if previous is 0 to avoid Infinity
  isImprovement: boolean;
  formattedChange: string;
}

export interface HabitStatistic {
  habitId: string;
  title: string;
  category: string;
  color: string;
  completedCount: number;
  scheduledCount: number;
  completionRate: number;
  currentStreak: number;
  bestStreak: number;
}

export interface HeatmapDay {
  dateKey: string;
  dayNum: number;
  dayOfWeek: number; // 0=Mon ... 6=Sun
  tasksCount: number;
  habitsCount: number;
  focusMinutes: number;
  classesAttended: number;
  creativeMinutes: number;
  compositeScore: number;
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
  isFuture: boolean;
  inPeriod: boolean;
}

export interface WrappedStoryCard {
  id: string;
  title: string;
  kicker: string;
  leadValue: string;
  leadSubtitle: string;
  supportingFacts: string[];
  themeColor: string; // Hex or CSS color
  bgGradient: string;
  nextStepRecommendation?: string;
  iconName: string;
}

export interface EvidenceInsight {
  id: string;
  title: string;
  observation: string;
  evidence: string;
  recommendation: string;
  type: 'positive' | 'warning' | 'neutral';
  category: 'habit' | 'focus' | 'academic' | 'workload';
}

export interface PersonalRecord {
  id: string;
  label: string;
  value: string;
  context: string;
  dateKey?: string;
}

export interface ComprehensivePeriodStats {
  bounds: DateRangeBounds;
  // Productivity
  tasksCompleted: number;
  tasksPlanned: number;
  taskCompletionRate: number;
  overdueTasks: number;
  tasksComparison: MetricComparison;
  taskRateComparison: MetricComparison;
  // Habits
  habitsCompletedCount: number;
  habitsScheduledCount: number;
  habitOverallRate: number;
  habitStats: HabitStatistic[];
  habitsComparison: MetricComparison;
  strongestHabit: HabitStatistic | null;
  // Focus & Deep Work
  trackedFocusMinutes: number;
  focusSessionCount: number;
  averageSessionMinutes: number;
  focusComparison: MetricComparison;
  focusByCourse: { courseId: string; code: string; name: string; color: string; minutes: number }[];
  focusByMode: { mode: string; minutes: number; count: number }[];
  // Creative & Personal
  creativeMinutes: number;
  creativeSessionCount: number;
  readingPagesRead: number;
  booksFinishedCount: number;
  milestonesCompletedCount: number;
  // Academics
  classesAttendedCount: number;
  classesRecordedCount: number;
  attendanceRate: number;
  examsDefeatedCount: number;
  // Active Days
  activeDays: number;
  totalDaysElapsed: number;
  activeDaysPercent: number;
  // Weekday Rhythm
  weekdayActivity: { dayName: string; dayIndex: number; tasks: number; habits: number; focusMins: number }[];
  peakDayName: string;
  // Personal records in period
  records: PersonalRecord[];
  // Heatmap
  heatmap: HeatmapDay[];
  // Insights
  insights: EvidenceInsight[];
  // Wrapped Story Cards
  wrappedCards: WrappedStoryCard[];
}

/**
 * Calculates start and end bounds for the selected time range, along with previous equivalent period.
 */
export function getDateRangeBounds(
  rangeType: TimeRangeType,
  referenceDateKey: string = getTodayKey(),
  activeSemester?: Semester | null
): DateRangeBounds {
  const refDate = parseDayKey(referenceDateKey);
  const year = refDate.getFullYear();
  const month = refDate.getMonth();

  if (rangeType === 'week') {
    // Current Monday to Sunday
    const day = refDate.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(refDate);
    mon.setDate(refDate.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);

    const prevMon = new Date(mon);
    prevMon.setDate(mon.getDate() - 7);
    const prevSun = new Date(sun);
    prevSun.setDate(sun.getDate() - 7);

    return {
      startDate: formatDayKey(mon),
      endDate: formatDayKey(sun),
      label: 'This Week',
      prevStartDate: formatDayKey(prevMon),
      prevEndDate: formatDayKey(prevSun),
      prevLabel: 'Last Week',
    };
  }

  if (rangeType === 'month') {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const prevFirstDay = new Date(year, month - 1, 1);
    const prevLastDay = new Date(year, month, 0);

    const monthName = firstDay.toLocaleDateString('en-US', { month: 'long' });
    const prevMonthName = prevFirstDay.toLocaleDateString('en-US', { month: 'long' });

    return {
      startDate: formatDayKey(firstDay),
      endDate: formatDayKey(lastDay),
      label: `This Month (${monthName})`,
      prevStartDate: formatDayKey(prevFirstDay),
      prevEndDate: formatDayKey(prevLastDay),
      prevLabel: `Last Month (${prevMonthName})`,
    };
  }

  if (rangeType === 'semester') {
    if (activeSemester?.startDate && activeSemester?.endDate) {
      const sStart = activeSemester.startDate;
      const sEnd = activeSemester.endDate;
      const durationMs = parseDayKey(sEnd).getTime() - parseDayKey(sStart).getTime();
      const prevEnd = addDaysToKey(sStart, -1);
      const prevDays = Math.round(durationMs / (1000 * 60 * 60 * 24));
      const prevStart = addDaysToKey(prevEnd, -prevDays);

      return {
        startDate: sStart,
        endDate: sEnd,
        label: activeSemester.name || 'Current Semester',
        prevStartDate: prevStart,
        prevEndDate: prevEnd,
        prevLabel: 'Previous Term',
      };
    }

    // Fallback: 17 weeks
    const firstDay = addDaysToKey(referenceDateKey, -119);
    return {
      startDate: firstDay,
      endDate: referenceDateKey,
      label: 'Semester Term',
      prevStartDate: addDaysToKey(firstDay, -119),
      prevEndDate: addDaysToKey(firstDay, -1),
      prevLabel: 'Previous Term',
    };
  }

  if (rangeType === 'year') {
    const startYear = `${year}-01-01`;
    const endYear = `${year}-12-31`;
    const prevStartYear = `${year - 1}-01-01`;
    const prevEndYear = `${year - 1}-12-31`;

    return {
      startDate: startYear,
      endDate: endYear,
      label: `Year ${year}`,
      prevStartDate: prevStartYear,
      prevEndDate: prevEndYear,
      prevLabel: `Year ${year - 1}`,
    };
  }

  // 'all'
  return {
    startDate: '2025-01-01',
    endDate: referenceDateKey,
    label: 'All Time',
    prevStartDate: '2024-01-01',
    prevEndDate: '2024-12-31',
    prevLabel: 'Preceding Era',
  };
}

/**
 * Safely computes delta and percent change between current and previous values.
 */
export function computeComparison(current: number, previous: number, higherIsBetter = true): MetricComparison {
  const delta = current - previous;
  let percentChange: number | null = null;
  let formattedChange = '';

  if (previous > 0) {
    percentChange = Math.round(((current - previous) / previous) * 100);
    formattedChange = `${percentChange >= 0 ? '+' : ''}${percentChange}%`;
  } else if (current > 0) {
    percentChange = null;
    formattedChange = `+${current} new`;
  } else {
    percentChange = 0;
    formattedChange = '0%';
  }

  const isImprovement = higherIsBetter ? delta >= 0 : delta <= 0;

  return {
    current,
    previous,
    delta,
    percentChange,
    isImprovement,
    formattedChange,
  };
}

/**
 * Pure calculation engine for the comprehensive Statistics experience.
 */
export function calculateComprehensiveStats(params: {
  rangeType: TimeRangeType;
  referenceDateKey?: string;
  activeSemester?: Semester | null;
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  restDays: RestDay[];
  attendanceRecords: AttendanceRecord[];
  focusSessions: FocusSession[];
  exams: Exam[];
  gradeComponents: GradeComponent[];
  courses: Course[];
  creativeSessions?: CreativeSession[];
  creativeProjects?: CreativeProject[];
  readingItems?: ReadingItem[];
  projectMilestones?: ProjectMilestone[];
  journalEntries?: JournalEntry[];
}): ComprehensivePeriodStats {
  const {
    rangeType,
    referenceDateKey = getTodayKey(),
    activeSemester = null,
    tasks = [],
    habits = [],
    habitLogs = [],
    restDays = [],
    attendanceRecords = [],
    focusSessions = [],
    exams = [],
    gradeComponents = [],
    courses = [],
    creativeSessions = [],
    creativeProjects = [],
    readingItems = [],
    projectMilestones = [],
    journalEntries = [],
  } = params;

  const bounds = getDateRangeBounds(rangeType, referenceDateKey, activeSemester);
  const { startDate, endDate, prevStartDate, prevEndDate } = bounds;

  // Filter helper
  const inRange = (d?: string) => !!d && d >= startDate && d <= endDate;
  const inPrevRange = (d?: string) => !!d && d >= prevStartDate && d <= prevEndDate;

  // 1. Productivity: Tasks
  const tasksCompleted = tasks.filter(
    (t) => t.status === 'done' && (inRange(t.completedAt?.slice(0, 10)) || inRange(t.dueDate))
  ).length;

  const tasksPlanned = tasks.filter((t) => inRange(t.dueDate)).length;
  const taskCompletionRate =
    tasksPlanned > 0 ? Math.round((tasksCompleted / tasksPlanned) * 100) : tasksCompleted > 0 ? 100 : 0;

  const overdueTasks = tasks.filter(
    (t) => t.status === 'todo' && t.dueDate && t.dueDate < referenceDateKey && inRange(t.dueDate)
  ).length;

  // Previous tasks for comparison
  const prevTasksCompleted = tasks.filter(
    (t) => t.status === 'done' && (inPrevRange(t.completedAt?.slice(0, 10)) || inPrevRange(t.dueDate))
  ).length;
  const prevTasksPlanned = tasks.filter((t) => inPrevRange(t.dueDate)).length;
  const prevTaskRate = prevTasksPlanned > 0 ? Math.round((prevTasksCompleted / prevTasksPlanned) * 100) : 0;

  const tasksComparison = computeComparison(tasksCompleted, prevTasksCompleted, true);
  const taskRateComparison = computeComparison(taskCompletionRate, prevTaskRate, true);

  // 2. Habits
  const rangeLogs = habitLogs.filter((l) => inRange(l.date) && (l.count > 0 || l.isPartial));
  const habitsCompletedCount = rangeLogs.length;

  // Calculate total days elapsed in period up to referenceDateKey
  const effStart = parseDayKey(startDate);
  const effEnd = parseDayKey(endDate > referenceDateKey ? referenceDateKey : endDate);
  const totalDaysElapsed = Math.max(
    1,
    Math.round((effEnd.getTime() - effStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  const habitsScheduledCount = habits.length * totalDaysElapsed;
  const habitOverallRate =
    habitsScheduledCount > 0 ? Math.round((habitsCompletedCount / habitsScheduledCount) * 100) : 0;

  const prevRangeLogs = habitLogs.filter((l) => inPrevRange(l.date) && (l.count > 0 || l.isPartial));
  const prevHabitsCompleted = prevRangeLogs.length;
  const habitsComparison = computeComparison(habitsCompletedCount, prevHabitsCompleted, true);

  // Individual habit stats
  const habitStats: HabitStatistic[] = habits.map((h) => {
    const hLogs = rangeLogs.filter((l) => l.habitId === h.id);
    const completed = hLogs.length;
    const rate = totalDaysElapsed > 0 ? Math.round((completed / totalDaysElapsed) * 100) : 0;
    return {
      habitId: h.id,
      title: h.title,
      category: h.category,
      color: h.color || '#B6E63E',
      completedCount: completed,
      scheduledCount: totalDaysElapsed,
      completionRate: Math.min(100, rate),
      currentStreak: h.currentStreak || 0,
      bestStreak: h.bestStreak || 0,
    };
  });
  habitStats.sort((a, b) => b.completionRate - a.completionRate);
  const strongestHabit = habitStats[0] || null;

  // 3. Focus & Deep Work
  const rangeFocusSessions = focusSessions.filter((s) => inRange(s.completedAt?.slice(0, 10)));
  const trackedFocusMinutes = rangeFocusSessions.reduce((acc, curr) => acc + (curr.minutesFocused || 0), 0);
  const focusSessionCount = rangeFocusSessions.length;
  const averageSessionMinutes =
    focusSessionCount > 0 ? Math.round(trackedFocusMinutes / focusSessionCount) : 0;

  const prevFocusMinutes = focusSessions
    .filter((s) => inPrevRange(s.completedAt?.slice(0, 10)))
    .reduce((acc, curr) => acc + (curr.minutesFocused || 0), 0);
  const focusComparison = computeComparison(trackedFocusMinutes, prevFocusMinutes, true);

  // Focus by course
  const courseMap = new Map<string, Course>();
  courses.forEach((c) => courseMap.set(c.id, c));

  const focusCourseMap = new Map<string, number>();
  rangeFocusSessions.forEach((s) => {
    const cId = s.courseId || 'general';
    focusCourseMap.set(cId, (focusCourseMap.get(cId) || 0) + (s.minutesFocused || 0));
  });

  const focusByCourse = Array.from(focusCourseMap.entries()).map(([cId, minutes]) => {
    const c = courseMap.get(cId);
    return {
      courseId: cId,
      code: c?.code || (cId === 'general' ? 'General' : 'Elective'),
      name: c?.name || (cId === 'general' ? 'General Academic' : 'Study Project'),
      color: c?.color || '#B6E63E',
      minutes,
    };
  });
  focusByCourse.sort((a, b) => b.minutes - a.minutes);

  // Focus by mode
  const modeMap = new Map<string, { minutes: number; count: number }>();
  rangeFocusSessions.forEach((s) => {
    const mode = s.mode || 'custom';
    const curr = modeMap.get(mode) || { minutes: 0, count: 0 };
    curr.minutes += s.minutesFocused || 0;
    curr.count += 1;
    modeMap.set(mode, curr);
  });
  const focusByMode = Array.from(modeMap.entries()).map(([mode, data]) => ({
    mode,
    minutes: data.minutes,
    count: data.count,
  }));

  // 4. Creative & Personal
  const rangeCreativeSessions = creativeSessions.filter((s) => inRange(s.date));
  const creativeMinutes = rangeCreativeSessions.reduce((acc, curr) => acc + (curr.minutes || 0), 0);
  const creativeSessionCount = rangeCreativeSessions.length;

  const readingPagesRead = readingItems.reduce((acc, curr) => acc + (curr.pagesRead || 0), 0);
  const booksFinishedCount = readingItems.filter((b) => b.isFinished).length;

  const milestonesCompletedCount = projectMilestones.filter(
    (m) => m.isDone && inRange(m.dueDate)
  ).length;

  // 5. Academics: Attendance & Exams
  const rangeAttendance = attendanceRecords.filter((a) => inRange(a.date));
  const classesAttendedCount = rangeAttendance.filter(
    (a) => a.status === 'present' || a.status === 'late'
  ).length;
  const classesRecordedCount = rangeAttendance.length;
  const attendanceRate =
    classesRecordedCount > 0 ? Math.round((classesAttendedCount / classesRecordedCount) * 100) : 100;

  const examsDefeatedCount = exams.filter((e) => inRange(e.examDate) && e.isDefeated).length;

  // 6. Active Days
  const activeDateSet = new Set<string>();
  tasks
    .filter((t) => t.status === 'done' && (inRange(t.completedAt?.slice(0, 10)) || inRange(t.dueDate)))
    .forEach((t) => activeDateSet.add(t.completedAt?.slice(0, 10) || t.dueDate || ''));

  rangeLogs.forEach((l) => activeDateSet.add(l.date));
  rangeFocusSessions.forEach((s) => activeDateSet.add(s.completedAt?.slice(0, 10) || ''));
  rangeCreativeSessions.forEach((s) => activeDateSet.add(s.date));
  journalEntries.filter((j) => inRange(j.date)).forEach((j) => activeDateSet.add(j.date));
  activeDateSet.delete('');

  const activeDays = activeDateSet.size;
  const activeDaysPercent =
    totalDaysElapsed > 0 ? Math.min(100, Math.round((activeDays / totalDaysElapsed) * 100)) : 0;

  // 7. Weekday Rhythm
  const weekdayTotals = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
    dayName: FULL_DAY_NAMES[i],
    shortName: DAY_NAMES[i],
    dayIndex: i,
    tasks: 0,
    habits: 0,
    focusMins: 0,
  }));

  // Attribute tasks to weekday
  tasks
    .filter((t) => t.status === 'done' && (inRange(t.completedAt?.slice(0, 10)) || inRange(t.dueDate)))
    .forEach((t) => {
      const dKey = t.completedAt?.slice(0, 10) || t.dueDate;
      if (dKey) {
        const wIdx = parseDayKey(dKey).getDay();
        const normIdx = wIdx === 0 ? 6 : wIdx - 1;
        weekdayTotals[normIdx].tasks += 1;
      }
    });

  // Attribute habits to weekday
  rangeLogs.forEach((l) => {
    const wIdx = parseDayKey(l.date).getDay();
    const normIdx = wIdx === 0 ? 6 : wIdx - 1;
    weekdayTotals[normIdx].habits += 1;
  });

  // Attribute focus minutes to weekday
  rangeFocusSessions.forEach((s) => {
    const dKey = s.completedAt?.slice(0, 10);
    if (dKey) {
      const wIdx = parseDayKey(dKey).getDay();
      const normIdx = wIdx === 0 ? 6 : wIdx - 1;
      weekdayTotals[normIdx].focusMins += s.minutesFocused || 0;
    }
  });

  // Peak weekday
  let peakIndex = 0;
  let peakScore = -1;
  weekdayTotals.forEach((wt, idx) => {
    const score = wt.tasks * 2 + wt.habits + Math.floor(wt.focusMins / 30);
    if (score > peakScore) {
      peakScore = score;
      peakIndex = idx;
    }
  });
  const peakDayName = FULL_DAY_NAMES[peakIndex];

  // 8. Personal Records in Period
  const records: PersonalRecord[] = [];
  // Longest habit streak
  let maxBestStreak = 0;
  let maxStreakHabit = '';
  habits.forEach((h) => {
    if (h.bestStreak > maxBestStreak) {
      maxBestStreak = h.bestStreak;
      maxStreakHabit = h.title;
    }
  });
  if (maxBestStreak > 0) {
    records.push({
      id: 'rec-streak',
      label: 'Longest Habit Streak',
      value: `${maxBestStreak} Days`,
      context: `Achieved in ${maxStreakHabit}`,
    });
  }

  // Longest single focus session
  let maxSingleFocus = 0;
  rangeFocusSessions.forEach((s) => {
    if (s.minutesFocused > maxSingleFocus) {
      maxSingleFocus = s.minutesFocused;
    }
  });
  if (maxSingleFocus > 0) {
    records.push({
      id: 'rec-focus',
      label: 'Deepest Focus Sprint',
      value: `${maxSingleFocus}m`,
      context: 'Longest continuous recorded block',
    });
  }

  records.push({
    id: 'rec-activedays',
    label: 'Consistency Velocity',
    value: `${activeDays} / ${totalDaysElapsed}d`,
    context: `${activeDaysPercent}% of period spent actively executing`,
  });

  // 9. Activity Heatmap
  const heatmap: HeatmapDay[] = [];
  const heatmapDaysCount = Math.min(
    126,
    Math.max(
      28,
      Math.round(
        (parseDayKey(endDate).getTime() - parseDayKey(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
    )
  );

  // Construct day by day
  let curKey = startDate;
  for (let i = 0; i < heatmapDaysCount; i++) {
    if (curKey > endDate) break;

    const dObj = parseDayKey(curKey);
    const dayOfWeek = dObj.getDay() === 0 ? 6 : dObj.getDay() - 1;
    const isToday = curKey === referenceDateKey;
    const isFuture = curKey > referenceDateKey;

    const dayTasks = tasks.filter(
      (t) => t.status === 'done' && (t.completedAt?.startsWith(curKey) || t.dueDate === curKey)
    ).length;

    const dayHabits = habitLogs.filter((l) => l.date === curKey && (l.count > 0 || l.isPartial)).length;

    const dayFocus = focusSessions
      .filter((s) => s.completedAt?.startsWith(curKey))
      .reduce((a, b) => a + (b.minutesFocused || 0), 0);

    const dayAttended = attendanceRecords.filter(
      (a) => a.date === curKey && (a.status === 'present' || a.status === 'late')
    ).length;

    const dayCreative = creativeSessions
      .filter((s) => s.date === curKey)
      .reduce((a, b) => a + (b.minutes || 0), 0);

    const compositeScore =
      dayTasks * 2 + dayHabits * 1.5 + Math.min(6, Math.floor(dayFocus / 25)) + dayAttended * 2 + Math.floor(dayCreative / 30);

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (compositeScore >= 9) level = 4;
    else if (compositeScore >= 6) level = 3;
    else if (compositeScore >= 3) level = 2;
    else if (compositeScore > 0) level = 1;

    heatmap.push({
      dateKey: curKey,
      dayNum: dObj.getDate(),
      dayOfWeek,
      tasksCount: dayTasks,
      habitsCount: dayHabits,
      focusMinutes: dayFocus,
      classesAttended: dayAttended,
      creativeMinutes: dayCreative,
      compositeScore,
      level,
      isToday,
      isFuture,
      inPeriod: true,
    });

    curKey = addDaysToKey(curKey, 1);
  }

  // 10. Evidence-based Insights
  const insights: EvidenceInsight[] = [];

  // Insight A: Peak weekday
  if (weekdayTotals[peakIndex].tasks + weekdayTotals[peakIndex].habits > 0) {
    insights.push({
      id: 'ins-peak-day',
      title: `${peakDayName} Power Rhythm`,
      observation: `You recorded your highest completion velocity on ${peakDayName}s with ${weekdayTotals[peakIndex].tasks} tasks and ${weekdayTotals[peakIndex].habits} habit stamps.`,
      evidence: `${peakDayName} accounts for ${Math.round(
        ((weekdayTotals[peakIndex].tasks + weekdayTotals[peakIndex].habits) /
          Math.max(1, tasksCompleted + habitsCompletedCount)) *
          100
      )}% of your recorded weekly output.`,
      recommendation: `Schedule your hardest problem sets and deepest focus sessions on ${peakDayName} morning.`,
      type: 'positive',
      category: 'focus',
    });
  }

  // Insight B: Overdue workload vs completion
  if (overdueTasks > 0) {
    insights.push({
      id: 'ins-overdue',
      title: 'Backlog Friction Alert',
      observation: `You have ${overdueTasks} overdue assignment${overdueTasks === 1 ? '' : 's'} remaining from this period.`,
      evidence: `Completion rate is currently ${taskCompletionRate}% of planned work.`,
      recommendation: 'Use the Today page "Up Next" recovery action to knock out the oldest task or reschedule it to a realistic date.',
      type: 'warning',
      category: 'workload',
    });
  } else if (tasksCompleted > 0) {
    insights.push({
      id: 'ins-clean-backlog',
      title: 'Pristine Academic Registry',
      observation: 'Zero overdue tasks pending in this period.',
      evidence: `All ${tasksCompleted} planned assignments finished on schedule.`,
      recommendation: 'Maintain your advance prep buffer for upcoming midterm review.',
      type: 'positive',
      category: 'workload',
    });
  }

  // Insight C: Habit consistency
  if (strongestHabit && strongestHabit.completedCount > 0) {
    insights.push({
      id: 'ins-habit-strength',
      title: `Anchor Habit: ${strongestHabit.title}`,
      observation: `${strongestHabit.title} is your most dependable routine at ${strongestHabit.completionRate}% execution.`,
      evidence: `${strongestHabit.completedCount} stamps across ${totalDaysElapsed} days (Streak: ${strongestHabit.currentStreak}d).`,
      recommendation: `Pair your newer, lower-streak habits directly alongside ${strongestHabit.title} using habit-stacking.`,
      type: 'positive',
      category: 'habit',
    });
  }

  // Insight D: Focus allocation
  if (focusByCourse.length > 0) {
    const topCourse = focusByCourse[0];
    const topPct = Math.round((topCourse.minutes / Math.max(1, trackedFocusMinutes)) * 100);
    insights.push({
      id: 'ins-focus-alloc',
      title: `${topCourse.code} Deep Study Bias`,
      observation: `${topCourse.code} received the lion's share of your focus timer minutes (${topCourse.minutes}m, ${topPct}%).`,
      evidence: `${topCourse.name} consumed ${topCourse.minutes} minutes of dedicated focus time.`,
      recommendation:
        focusByCourse.length > 1
          ? `Ensure second-priority modules like ${focusByCourse[1].code} get at least one 45m block this week.`
          : 'Expand focus tracking to include your other enrolled timetable courses.',
      type: 'neutral',
      category: 'academic',
    });
  }

  // 11. Wrapped Story Cards
  const wrappedCards: WrappedStoryCard[] = [];

  // Card 1: The Period at a Glance
  wrappedCards.push({
    id: 'wrapped-overview',
    title: 'Your University Era',
    kicker: bounds.label.toUpperCase(),
    leadValue: `${activeDays} Active Days`,
    leadSubtitle: `Across ${totalDaysElapsed} days in ${bounds.label}`,
    supportingFacts: [
      `🎯 ${tasksCompleted} Academic quests conquered`,
      `🔥 ${habitsCompletedCount} Habit stamps sealed in passport`,
      `⏱️ ${trackedFocusMinutes}m Tracked in deep focus sessions`,
      `🏛️ ${attendanceRate}% Timetable attendance rate`,
    ],
    themeColor: '#B6E63E',
    bgGradient: 'from-[#3A1F2D] via-[#24141E] to-[#150A11]',
    nextStepRecommendation: 'Keep your momentum rolling into the next chapter.',
    iconName: 'Sparkles',
  });

  // Card 2: Your Consistency Rhythm
  wrappedCards.push({
    id: 'wrapped-consistency',
    title: 'The Discipline Matrix',
    kicker: 'HABIT CONTINUITY',
    leadValue: `${habitOverallRate}% Consistency`,
    leadSubtitle: `${habitsCompletedCount} habit stamps across ${habits.length} routines`,
    supportingFacts: [
      `⚡ ${activeDaysPercent}% Of days had verified productive execution`,
      `🛡️ Rest tokens protected your streaks on demanding exam days`,
      `📅 Most dependable day of the week: ${peakDayName}`,
    ],
    themeColor: '#F6A8BE',
    bgGradient: 'from-[#4A1D2F] via-[#2F121E] to-[#1A0A10]',
    iconName: 'Flame',
  });

  // Card 3: Academic Era
  const topCourse = focusByCourse[0];
  wrappedCards.push({
    id: 'wrapped-academics',
    title: 'The Scholar Ledger',
    kicker: 'ACADEMIC MASTERY',
    leadValue: `${attendanceRate}% Attendance`,
    leadSubtitle: `${classesAttendedCount} university lectures & tutorials attended`,
    supportingFacts: [
      topCourse ? `📚 Primary study focus: ${topCourse.code} (${topCourse.minutes}m)` : '📚 All timetable modules registered',
      `⚔️ ${examsDefeatedCount} Boss battle exams defeated`,
      `✅ ${taskCompletionRate}% Planned assignment completion rate`,
    ],
    themeColor: '#8EC5E8',
    bgGradient: 'from-[#162B3D] via-[#101F2C] to-[#0A131C]',
    iconName: 'BookOpen',
  });

  // Card 4: Creative & Personal Era
  wrappedCards.push({
    id: 'wrapped-creative',
    title: 'Creative Vault & Flow',
    kicker: 'BEYOND PRODUCTIVITY',
    leadValue: `${creativeMinutes}m Flow State`,
    leadSubtitle: `${creativeSessionCount} studio & writing sessions logged`,
    supportingFacts: [
      `📖 ${readingPagesRead} Pages turned in reading queue`,
      `🏆 ${booksFinishedCount} Complete volumes shelved`,
      `🎨 ${creativeProjects.length} Personal & creative projects underway`,
    ],
    themeColor: '#BBA6E0',
    bgGradient: 'from-[#2F1F4A] via-[#1D132E] to-[#0E0917]',
    iconName: 'Music',
  });

  // Card 5: Your Strongest Habit
  if (strongestHabit) {
    wrappedCards.push({
      id: 'wrapped-strongest-habit',
      title: 'Your Unshakable Anchor',
      kicker: 'STRONGEST ROUTINE',
      leadValue: strongestHabit.title,
      leadSubtitle: `${strongestHabit.completionRate}% completion rate in this period`,
      supportingFacts: [
        `🔥 Current streak: ${strongestHabit.currentStreak} days`,
        `⭐ All-time best streak: ${strongestHabit.bestStreak} days`,
        `📌 Category: ${strongestHabit.category}`,
      ],
      themeColor: '#B6E63E',
      bgGradient: 'from-[#2C3B1A] via-[#1A2410] to-[#0C1208]',
      iconName: 'Award',
    });
  }

  // Card 6: Peak Power Day
  wrappedCards.push({
    id: 'wrapped-peak-day',
    title: `${peakDayName} Powerhouse`,
    kicker: 'PEAK MOMENTUM',
    leadValue: peakDayName,
    leadSubtitle: 'Your most productive day of the week',
    supportingFacts: [
      `📈 ${weekdayTotals[peakIndex].tasks} Tasks completed on ${peakDayName}s`,
      `⏱️ ${weekdayTotals[peakIndex].focusMins} Minutes of tracked study on ${peakDayName}s`,
      `✨ Energy peaks earlier in the day for maximum retention`,
    ],
    themeColor: '#E5C04B',
    bgGradient: 'from-[#3D3216] via-[#261F0E] to-[#141007]',
    iconName: 'Zap',
  });

  return {
    bounds,
    tasksCompleted,
    tasksPlanned,
    taskCompletionRate,
    overdueTasks,
    tasksComparison,
    taskRateComparison,
    habitsCompletedCount,
    habitsScheduledCount,
    habitOverallRate,
    habitStats,
    habitsComparison,
    strongestHabit,
    trackedFocusMinutes,
    focusSessionCount,
    averageSessionMinutes,
    focusComparison,
    focusByCourse,
    focusByMode,
    creativeMinutes,
    creativeSessionCount,
    readingPagesRead,
    booksFinishedCount,
    milestonesCompletedCount,
    classesAttendedCount,
    classesRecordedCount,
    attendanceRate,
    examsDefeatedCount,
    activeDays,
    totalDaysElapsed,
    activeDaysPercent,
    weekdayActivity: weekdayTotals,
    peakDayName,
    records,
    heatmap,
    insights,
    wrappedCards,
  };
}
