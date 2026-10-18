import {
  Task,
  Habit,
  HabitLog,
  RestDay,
  AttendanceRecord,
  FocusSession,
  Exam,
  CreativeProject,
  ReadingItem,
} from '../types';
import { ScheduledClass } from './scheduleEngine';
import { checkTimeClash, getDayOfWeekIndex, getTodayKey } from './dateUtils';

export interface DailyProgressResult {
  tasksCompleted: number;
  tasksPlanned: number;
  tasksItemPercent: number;
  habitsCompleted: number;
  habitsTotal: number;
  habitsPercent: number;
  classesAttended: number;
  classesScheduled: number;
  classesPercent: number;
  estimatedDurationPlannedMinutes: number;
  estimatedDurationCompletedMinutes: number;
  actualFocusMinutes: number;
  durationPercent: number;
  overallProgressPercent: number;
  isAllDone: boolean;
}

/**
 * Maps task effort string to reasonable estimated duration minutes.
 * small: 15m (quick admin, email, reading)
 * medium: 45m (standard problem set, lab prep)
 * large: 90m (heavy assignment, research paper, coding feature)
 */
export function getTaskEstimatedMinutes(effort: 'small' | 'medium' | 'large' | string = 'medium'): number {
  switch (effort) {
    case 'small':
      return 15;
    case 'large':
      return 90;
    case 'medium':
    default:
      return 45;
  }
}

/**
 * Calculates duration in minutes between two HH:MM strings.
 */
export function getDurationMinutes(start: string, end: string): number {
  if (!start || !end) return 50;
  const [h1, m1] = start.split(':').map((x) => parseInt(x, 10));
  const [h2, m2] = end.split(':').map((x) => parseInt(x, 10));
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 50;
  const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  return diff > 0 ? diff : 50;
}

/**
 * Pure function: Calculates comprehensive planned vs completed daily metrics.
 * Separates item-based completion from duration-weighted completion.
 */
export function calculateDailyProgress(params: {
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  restDays: RestDay[];
  scheduledClasses: ScheduledClass[];
  attendanceRecords: AttendanceRecord[];
  focusSessions: FocusSession[];
  todayKey?: string;
}): DailyProgressResult {
  const {
    tasks = [],
    habits = [],
    habitLogs = [],
    restDays = [],
    scheduledClasses = [],
    attendanceRecords = [],
    focusSessions = [],
    todayKey = getTodayKey(),
  } = params;

  // 1. Tasks: planned for today vs completed
  const plannedTasks = tasks.filter((t) => t.dueDate === todayKey);
  const completedPlannedTasks = plannedTasks.filter((t) => t.status === 'done');
  // Also include tasks completed today even if not originally given today's due date
  const completedOtherTodayTasks = tasks.filter(
    (t) => t.dueDate !== todayKey && t.status === 'done' && t.completedAt?.startsWith(todayKey)
  );

  const totalCompletedTasks = completedPlannedTasks.length + completedOtherTodayTasks.length;
  const effectiveTasksPlanned = Math.max(plannedTasks.length, totalCompletedTasks);
  const tasksItemPercent =
    effectiveTasksPlanned > 0
      ? Math.round((totalCompletedTasks / effectiveTasksPlanned) * 100)
      : 100;

  // 2. Habits: completed or rest-tokened today
  const activeHabits = habits;
  const habitLogsToday = habitLogs.filter((l) => l.date === todayKey && (l.count > 0 || l.isPartial));
  const restDaysToday = restDays.filter((r) => r.dateKey === todayKey);

  let habitsCompletedCount = 0;
  activeHabits.forEach((habit) => {
    const isLogged = habitLogsToday.some((l) => l.habitId === habit.id);
    const isRested = restDaysToday.some((r) => r.habitId === habit.id);
    if (isLogged || isRested) {
      habitsCompletedCount += 1;
    }
  });

  const habitsTotal = activeHabits.length;
  const habitsPercent =
    habitsTotal > 0 ? Math.round((habitsCompletedCount / habitsTotal) * 100) : 100;

  // 3. Classes: non-cancelled classes scheduled for today
  const nonCancelledClasses = scheduledClasses.filter((c) => !c.isCancelled);
  const attendedClassesCount = nonCancelledClasses.filter((c) => {
    const rec = attendanceRecords.find(
      (a) => a.courseId === c.course.id && a.date === todayKey
    );
    return rec?.status === 'present' || rec?.status === 'late';
  }).length;

  const classesScheduled = nonCancelledClasses.length;
  const classesPercent =
    classesScheduled > 0 ? Math.round((attendedClassesCount / classesScheduled) * 100) : 100;

  // 4. Duration-Weighted Calculation
  let plannedMinutes = 0;
  let completedMinutes = 0;

  // Tasks duration
  plannedTasks.forEach((t) => {
    const mins = getTaskEstimatedMinutes(t.effort);
    plannedMinutes += mins;
    if (t.status === 'done') {
      completedMinutes += mins;
    }
  });
  completedOtherTodayTasks.forEach((t) => {
    const mins = getTaskEstimatedMinutes(t.effort);
    completedMinutes += mins;
    plannedMinutes += mins; // Include unexpected completed work in denominator
  });

  // Classes duration
  nonCancelledClasses.forEach((c) => {
    const classMins = getDurationMinutes(c.startTime, c.endTime);
    plannedMinutes += classMins;
    const isAttended = attendanceRecords.some(
      (a) => a.courseId === c.course.id && a.date === todayKey && (a.status === 'present' || a.status === 'late')
    );
    if (isAttended) {
      completedMinutes += classMins;
    }
  });

  // Tracked focus time today
  const actualFocusMinutes = focusSessions
    .filter((s) => s.completedAt?.startsWith(todayKey))
    .reduce((acc, curr) => acc + (curr.minutesFocused || 0), 0);

  const durationPercent =
    plannedMinutes > 0
      ? Math.min(100, Math.round((completedMinutes / plannedMinutes) * 100))
      : 100;

  // 5. Overall Compound Progress
  let overallProgressPercent = 0;
  if (plannedMinutes > 0) {
    // 60% duration weighted + 40% habit discipline
    overallProgressPercent = Math.min(
      100,
      Math.round(durationPercent * 0.65 + habitsPercent * 0.35)
    );
  } else if (effectiveTasksPlanned > 0 || habitsTotal > 0 || classesScheduled > 0) {
    const metrics: number[] = [];
    if (effectiveTasksPlanned > 0) metrics.push(tasksItemPercent);
    if (habitsTotal > 0) metrics.push(habitsPercent);
    if (classesScheduled > 0) metrics.push(classesPercent);
    const sum = metrics.reduce((a, b) => a + b, 0);
    overallProgressPercent = Math.round(sum / metrics.length);
  } else {
    overallProgressPercent = 100;
  }

  const isAllDone =
    (effectiveTasksPlanned === 0 || totalCompletedTasks >= effectiveTasksPlanned) &&
    (habitsTotal === 0 || habitsCompletedCount >= habitsTotal) &&
    (classesScheduled === 0 || attendedClassesCount >= classesScheduled);

  return {
    tasksCompleted: totalCompletedTasks,
    tasksPlanned: effectiveTasksPlanned,
    tasksItemPercent,
    habitsCompleted: habitsCompletedCount,
    habitsTotal,
    habitsPercent,
    classesAttended: attendedClassesCount,
    classesScheduled,
    classesPercent,
    estimatedDurationPlannedMinutes: plannedMinutes,
    estimatedDurationCompletedMinutes: completedMinutes,
    actualFocusMinutes,
    durationPercent,
    overallProgressPercent,
    isAllDone,
  };
}

export interface UpNextResult {
  id: string;
  type:
    | 'class_in_progress'
    | 'class_imminent'
    | 'class_upcoming'
    | 'overdue_task'
    | 'urgent_exam'
    | 'priority_task'
    | 'habit_check'
    | 'creative_project'
    | 'reading'
    | 'all_complete';
  title: string;
  subtitle: string;
  category: string;
  badgeText: string;
  badgeColor?: string;
  scheduledTime?: string;
  estimatedDuration?: string;
  reason: string;
  actionLabel: string;
  actionType: 'focus' | 'complete_task' | 'stamp_habit' | 'navigate' | 'reflection';
  route: string;
  courseId?: string;
  taskId?: string;
  habitId?: string;
  accentColor?: string;
}

/**
 * Pure function: Determines the single most impactful next action to eliminate decision fatigue.
 * Grounded strictly in actual university schedules, overdue tasks, exam deadlines, and habit streaks.
 */
export function getUpNextItem(params: {
  now?: Date;
  todayKey?: string;
  scheduledClasses: ScheduledClass[];
  tasks: Task[];
  exams: Exam[];
  habits: Habit[];
  habitLogs: HabitLog[];
  restDays: RestDay[];
  attendanceRecords: AttendanceRecord[];
  creativeProjects?: CreativeProject[];
  readingItems?: ReadingItem[];
}): UpNextResult {
  const {
    now = new Date(),
    todayKey = getTodayKey(),
    scheduledClasses = [],
    tasks = [],
    exams = [],
    habits = [],
    habitLogs = [],
    restDays = [],
    attendanceRecords = [],
    creativeProjects = [],
    readingItems = [],
  } = params;

  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;
  const nowTotalMinutes = currentHours * 60 + currentMinutes;

  // 1. Check for class in progress or starting within 45 minutes
  const activeClasses = scheduledClasses.filter((c) => !c.isCancelled);
  for (const c of activeClasses) {
    const [sh, sm] = c.startTime.split(':').map((x) => parseInt(x, 10));
    const [eh, em] = c.endTime.split(':').map((x) => parseInt(x, 10));
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;

    if (nowTotalMinutes >= startMins && nowTotalMinutes <= endMins) {
      // In progress
      const isAttended = attendanceRecords.some(
        (a) => a.courseId === c.course.id && a.date === todayKey && (a.status === 'present' || a.status === 'late')
      );
      return {
        id: `class-${c.session.id}`,
        type: 'class_in_progress',
        title: `${c.course.code} — ${c.course.name}`,
        subtitle: `${(c.type || c.session?.type || 'class').toUpperCase()} • ${c.room || 'Room TBA'}${c.building ? ` (${c.building})` : ''}`,
        category: 'Academic Commitment',
        badgeText: 'In Progress Now',
        badgeColor: '#E5C04B',
        scheduledTime: `${c.startTime} - ${c.endTime}`,
        estimatedDuration: `${getDurationMinutes(c.startTime, c.endTime)}m`,
        reason: isAttended
          ? 'Class currently in session. Follow along with course notes.'
          : 'Lecture in progress. Confirm your attendance record.',
        actionLabel: isAttended ? 'View Timetable' : 'Mark Present',
        actionType: 'navigate',
        route: '#/timetable',
        courseId: c.course.id,
        accentColor: c.course.color,
      };
    }

    if (startMins > nowTotalMinutes && startMins - nowTotalMinutes <= 45) {
      // Starts within 45 minutes
      const diff = startMins - nowTotalMinutes;
      return {
        id: `class-${c.session.id}`,
        type: 'class_imminent',
        title: `${c.course.code} — ${c.course.name}`,
        subtitle: `${c.room || 'Room TBA'}${c.building ? ` (${c.building})` : ''} • Starts in ${diff}m`,
        category: 'Upcoming Lecture',
        badgeText: `Starts in ${diff}m`,
        badgeColor: '#F6A8BE',
        scheduledTime: c.startTime,
        estimatedDuration: `${getDurationMinutes(c.startTime, c.endTime)}m`,
        reason: `Begins at ${c.startTime}. Prepare binder, lecture slides, and head toward ${c.building || 'hall'}.`,
        actionLabel: 'Open Timetable',
        actionType: 'navigate',
        route: '#/timetable',
        courseId: c.course.id,
        accentColor: c.course.color,
      };
    }
  }

  // 2. Check for overdue tasks
  const overdueTasks = tasks
    .filter((t) => t.status === 'todo' && t.dueDate && t.dueDate < todayKey)
    .sort((a, b) => {
      // Priority first (high > medium > low), then earliest due date
      const pMap = { high: 0, medium: 1, low: 2 };
      const pDiff = (pMap[a.priority] || 1) - (pMap[b.priority] || 1);
      if (pDiff !== 0) return pDiff;
      return (a.dueDate || '').localeCompare(b.dueDate || '');
    });

  if (overdueTasks.length > 0) {
    const topOverdue = overdueTasks[0];
    return {
      id: topOverdue.id,
      type: 'overdue_task',
      title: topOverdue.title,
      subtitle: `Was due ${topOverdue.dueDate} • ${topOverdue.effort} effort`,
      category: 'Overdue Recovery',
      badgeText: 'Past Due',
      badgeColor: '#E06C75',
      scheduledTime: topOverdue.dueTime || undefined,
      estimatedDuration: `${getTaskEstimatedMinutes(topOverdue.effort)}m`,
      reason: 'Overdue assignment. Conquering this now halts syllabus debt and restores momentum.',
      actionLabel: 'Start Focus',
      actionType: 'focus',
      route: '#/focus',
      taskId: topOverdue.id,
      courseId: topOverdue.courseId,
      accentColor: '#E06C75',
    };
  }

  // 3. Urgent Exam in the next 7 days
  const sevenDaysAwayKey = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const imminentExams = exams
    .filter((e) => !e.isDefeated && e.examDate >= todayKey && e.examDate <= sevenDaysAwayKey)
    .sort((a, b) => a.examDate.localeCompare(b.examDate));

  if (imminentExams.length > 0) {
    const topExam = imminentExams[0];
    const diffDays = Math.max(0, Math.round((new Date(topExam.examDate).getTime() - new Date(todayKey).getTime()) / (1000 * 60 * 60 * 24)));
    return {
      id: topExam.id,
      type: 'urgent_exam',
      title: `${topExam.title} (${topExam.examType})`,
      subtitle: diffDays === 0 ? 'Today!' : `Exam in ${diffDays} day${diffDays === 1 ? '' : 's'} • Weight: ${topExam.weight}%`,
      category: 'Exam Preparedness',
      badgeText: diffDays === 0 ? 'Exam Today' : `${diffDays}d to Boss Battle`,
      badgeColor: '#D19A66',
      scheduledTime: topExam.startTime,
      estimatedDuration: '45m study',
      reason: `High stakes assessment on ${topExam.examDate}. Complete a 45m deep focus block on remaining topics.`,
      actionLabel: 'Focus on Exam',
      actionType: 'focus',
      route: '#/exams',
      courseId: topExam.courseId,
      accentColor: '#D19A66',
    };
  }

  // 4. Tasks due today
  const todayTodoTasks = tasks
    .filter((t) => t.status === 'todo' && t.dueDate === todayKey)
    .sort((a, b) => {
      const pMap = { high: 0, medium: 1, low: 2 };
      const pDiff = (pMap[a.priority] || 1) - (pMap[b.priority] || 1);
      if (pDiff !== 0) return pDiff;
      if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime);
      return 0;
    });

  if (todayTodoTasks.length > 0) {
    const topTask = todayTodoTasks[0];
    return {
      id: topTask.id,
      type: 'priority_task',
      title: topTask.title,
      subtitle: `${topTask.priority.toUpperCase()} priority • ~${getTaskEstimatedMinutes(topTask.effort)}m block`,
      category: 'Today’s Workload',
      badgeText: topTask.dueTime ? `Due ${topTask.dueTime}` : 'Due Today',
      badgeColor: '#B6E63E',
      scheduledTime: topTask.dueTime,
      estimatedDuration: `${getTaskEstimatedMinutes(topTask.effort)}m`,
      reason: topTask.priority === 'high'
        ? 'Core academic priority due today. Lock in a focused session.'
        : 'Planned assignment for today. Clear it early to open your evening.',
      actionLabel: 'Start Focus',
      actionType: 'focus',
      route: '#/focus',
      taskId: topTask.id,
      courseId: topTask.courseId,
      accentColor: '#B6E63E',
    };
  }

  // 5. Uncompleted core habits to protect streak
  const unstampedHabits = habits
    .filter((h) => {
      const isStamped = habitLogs.some((l) => l.habitId === h.id && l.date === todayKey && (l.count > 0 || l.isPartial));
      const isRested = restDays.some((r) => r.habitId === h.id && r.dateKey === todayKey);
      return !isStamped && !isRested;
    })
    .sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0));

  if (unstampedHabits.length > 0) {
    const topHabit = unstampedHabits[0];
    return {
      id: topHabit.id,
      type: 'habit_check',
      title: topHabit.title,
      subtitle: topHabit.currentStreak > 0 ? `Protect ${topHabit.currentStreak}-day streak!` : 'Build daily consistency',
      category: 'Habit Passport',
      badgeText: `${topHabit.currentStreak}d Streak`,
      badgeColor: '#B6E63E',
      estimatedDuration: '5-15m',
      reason: topHabit.minimumVersionText
        ? `Minimum version: "${topHabit.minimumVersionText}". Keep your discipline intact.`
        : 'Checkpoint for vitality and discipline. Take a moment to log completion.',
      actionLabel: 'Stamp Complete',
      actionType: 'stamp_habit',
      route: '#/habits',
      habitId: topHabit.id,
      accentColor: topHabit.color || '#B6E63E',
    };
  }

  // 6. Next upcoming class later today
  const futureClasses = activeClasses
    .filter((c) => {
      const [sh, sm] = c.startTime.split(':').map((x) => parseInt(x, 10));
      return sh * 60 + sm > nowTotalMinutes;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (futureClasses.length > 0) {
    const nextClass = futureClasses[0];
    return {
      id: `class-${nextClass.session.id}`,
      type: 'class_upcoming',
      title: `${nextClass.course.code} — ${nextClass.course.name}`,
      subtitle: `${(nextClass.type || nextClass.session?.type || 'class').toUpperCase()} • ${nextClass.startTime} in ${nextClass.room || 'Hall TBA'}`,
      category: 'Upcoming Commitment',
      badgeText: `At ${nextClass.startTime}`,
      badgeColor: '#8EC5E8',
      scheduledTime: nextClass.startTime,
      estimatedDuration: `${getDurationMinutes(nextClass.startTime, nextClass.endTime)}m`,
      reason: `Next class on your timetable is at ${nextClass.startTime}. Free window for revision or reading.`,
      actionLabel: 'Review Course',
      actionType: 'navigate',
      route: '#/timetable',
      courseId: nextClass.course.id,
      accentColor: nextClass.course.color,
    };
  }

  // 7. Creative Work or Reading Queue
  const activeCreative = creativeProjects.find((p) => p.progressPercent < 100);
  if (activeCreative) {
    return {
      id: activeCreative.id,
      type: 'creative_project',
      title: activeCreative.title,
      subtitle: `Stage: ${activeCreative.currentStage} • ${activeCreative.progressPercent}% finished`,
      category: 'Creative Flow & Studio',
      badgeText: 'Studio Project',
      badgeColor: '#BBA6E0',
      estimatedDuration: '30m flow',
      reason: 'Academic obligations are clear. Make room for creative expression and music practice.',
      actionLabel: 'Open Studio',
      actionType: 'navigate',
      route: '#/studio',
      accentColor: '#BBA6E0',
    };
  }

  const activeBook = readingItems.find((b) => !b.isFinished);
  if (activeBook) {
    return {
      id: activeBook.id,
      type: 'reading',
      title: activeBook.title,
      subtitle: `By ${activeBook.author} • Page ${activeBook.pagesRead} of ${activeBook.totalPages}`,
      category: 'Reading Vault',
      badgeText: `${activeBook.pagesRead}/${activeBook.totalPages} pgs`,
      badgeColor: '#8FD3B6',
      estimatedDuration: '20 pgs',
      reason: 'Quiet reading window. Advance 20 pages toward your yearly reading goal.',
      actionLabel: 'Open Library',
      actionType: 'navigate',
      route: '#/library',
      accentColor: '#8FD3B6',
    };
  }

  // 8. All planned commitments complete!
  return {
    id: 'day-conquered',
    type: 'all_complete',
    title: 'Daily Dashboard Conquered!',
    subtitle: 'All planned tasks and timetable commitments completed for today',
    category: 'Daily Accomplishment',
    badgeText: '100% Victorious',
    badgeColor: '#B6E63E',
    reason: 'Outstanding execution. Review your achievements or wind down with evening reflection.',
    actionLabel: 'Evening Reflection',
    actionType: 'reflection',
    route: '#/journal',
    accentColor: '#B6E63E',
  };
}

export interface TimelineItem {
  id: string;
  kind: 'class' | 'exam' | 'task' | 'routine';
  title: string;
  subtitle?: string;
  startTime: string; // HH:MM
  endTime?: string; // HH:MM
  location?: string;
  color?: string;
  status: 'past' | 'current' | 'upcoming';
  isClash?: boolean;
  isCancelled?: boolean;
  actionPayload?: {
    type: string;
    id: string;
    courseId?: string;
  };
}

/**
 * Builds chronological daily timeline with conflict detection and live status marker.
 */
export function buildTodayTimeline(params: {
  currentTime?: string;
  scheduledClasses: ScheduledClass[];
  examsToday: Exam[];
  tasksWithTime: Task[];
}): { items: TimelineItem[]; hasConflicts: boolean } {
  const {
    currentTime = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
    scheduledClasses = [],
    examsToday = [],
    tasksWithTime = [],
  } = params;

  const rawItems: TimelineItem[] = [];

  // Add scheduled classes
  scheduledClasses.forEach((c) => {
    rawItems.push({
      id: `class-${c.session.id}`,
      kind: 'class',
      title: `${c.course.code} — ${c.course.name}`,
      subtitle: `${(c.type || c.session?.type || 'class').toUpperCase()}${c.instructor ? ` • ${c.instructor}` : ''}`,
      startTime: c.startTime,
      endTime: c.endTime,
      location: [c.room, c.building].filter(Boolean).join(' • ') || 'Hall TBA',
      color: c.course.color,
      status:
        currentTime < c.startTime ? 'upcoming' : currentTime > c.endTime ? 'past' : 'current',
      isCancelled: c.isCancelled,
      actionPayload: {
        type: 'class',
        id: c.session.id,
        courseId: c.course.id,
      },
    });
  });

  // Add today's exams
  examsToday.forEach((e) => {
    const endHour = parseInt(e.startTime.slice(0, 2), 10) + 2;
    const endStr = `${String(Math.min(23, endHour)).padStart(2, '0')}:${e.startTime.slice(3, 5)}`;
    rawItems.push({
      id: `exam-${e.id}`,
      kind: 'exam',
      title: `${e.title} (${e.examType})`,
      subtitle: `Weight: ${e.weight}% • Boss HP: ${e.currentHp}%`,
      startTime: e.startTime,
      endTime: endStr,
      location: e.hall || 'Examination Hall',
      color: '#E06C75',
      status: currentTime < e.startTime ? 'upcoming' : currentTime > endStr ? 'past' : 'current',
      actionPayload: {
        type: 'exam',
        id: e.id,
        courseId: e.courseId,
      },
    });
  });

  // Add scheduled tasks with due times
  tasksWithTime.forEach((t) => {
    if (t.dueTime) {
      const [th, tm] = t.dueTime.split(':').map((x) => parseInt(x, 10));
      const endMins = th * 60 + tm + getTaskEstimatedMinutes(t.effort);
      const endH = Math.floor(endMins / 60);
      const endM = endMins % 60;
      const endStr = `${String(Math.min(23, endH)).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      rawItems.push({
        id: `task-${t.id}`,
        kind: 'task',
        title: t.title,
        subtitle: `${t.priority.toUpperCase()} Priority • ${t.effort} effort${t.status === 'done' ? ' (Completed)' : ''}`,
        startTime: t.dueTime,
        endTime: endStr,
        location: t.contextTag === 'laptop' ? 'Laptop / Desk' : 'Anywhere',
        color: t.status === 'done' ? '#B6E63E' : '#8EC5E8',
        status: currentTime < t.dueTime ? 'upcoming' : currentTime > endStr ? 'past' : 'current',
        actionPayload: {
          type: 'task',
          id: t.id,
          courseId: t.courseId,
        },
      });
    }
  });

  // Sort chronologically by start time
  rawItems.sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Detect time clashes between non-cancelled items
  let hasConflicts = false;
  for (let i = 0; i < rawItems.length; i++) {
    const itemA = rawItems[i];
    if (itemA.isCancelled || !itemA.endTime) continue;

    for (let j = i + 1; j < rawItems.length; j++) {
      const itemB = rawItems[j];
      if (itemB.isCancelled || !itemB.endTime) continue;

      if (checkTimeClash(itemA.startTime, itemA.endTime, itemB.startTime, itemB.endTime)) {
        itemA.isClash = true;
        itemB.isClash = true;
        hasConflicts = true;
      }
    }
  }

  return { items: rawItems, hasConflicts };
}
