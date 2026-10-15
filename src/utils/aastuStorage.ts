import {
  AASTUState,
  DayOfWeek,
  TaskItem,
  Assignment,
  ExamItem,
  JournalEntry,
  StreakData,
} from '../types/aastu';
import { DEFAULT_SCHEDULES, INITIAL_ASSIGNMENTS, INITIAL_EXAMS } from '../data/defaultSchedules';

const STORAGE_KEY = 'aastu_4_0_os_state_v2';

export function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getTodayDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[new Date().getDay()];
}

export function loadAASTUState(): AASTUState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaultState: AASTUState = {
        schedules: DEFAULT_SCHEDULES,
        assignments: INITIAL_ASSIGNMENTS,
        exams: INITIAL_EXAMS,
        journals: {},
        completedTasks: {},
        shiftedTasks: {},
        freezesUsed: 0,
        monthHistory: {},
        streaks: { classes: 0, running: 0, music: 0, journal: 0, perfect: 0 },
        notificationsEnabled: true,
        audioAlertsEnabled: true,
        lastActiveDate: getTodayKey(),
      };
      saveAASTUState(defaultState);
      return defaultState;
    }
    const parsed: AASTUState = JSON.parse(raw);

    // Merge in defaults if fields are missing
    if (!parsed.schedules || Object.keys(parsed.schedules).length === 0) {
      parsed.schedules = DEFAULT_SCHEDULES;
    }
    if (!parsed.assignments) parsed.assignments = INITIAL_ASSIGNMENTS;
    if (!parsed.exams) parsed.exams = INITIAL_EXAMS;
    if (!parsed.journals) parsed.journals = {};
    if (!parsed.completedTasks) parsed.completedTasks = {};
    if (!parsed.shiftedTasks) parsed.shiftedTasks = {};
    if (!parsed.monthHistory) parsed.monthHistory = {};
    if (parsed.freezesUsed === undefined) parsed.freezesUsed = 0;
    if (!parsed.streaks) {
      parsed.streaks = { classes: 0, running: 0, music: 0, journal: 0, perfect: 0 };
    }

    return parsed;
  } catch (e) {
    console.error('Failed to load state from localStorage:', e);
    return {
      schedules: DEFAULT_SCHEDULES,
      assignments: INITIAL_ASSIGNMENTS,
      exams: INITIAL_EXAMS,
      journals: {},
      completedTasks: {},
      shiftedTasks: {},
      freezesUsed: 0,
      monthHistory: {},
      streaks: { classes: 0, running: 0, music: 0, journal: 0, perfect: 0 },
      notificationsEnabled: true,
      audioAlertsEnabled: true,
    };
  }
}

export function saveAASTUState(state: AASTUState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}

/**
 * Calculates current streaks across all categories
 */
export function calculateUpdatedStreaks(state: AASTUState, todayKey: string): StreakData {
  const cats = { classes: 0, running: 0, music: 0, journal: 0 };
  const allDays: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  allDays.forEach((day) => {
    (state.schedules[day] || []).forEach((task) => {
      const key = `${todayKey}-${day}-${task.id}`;
      if (state.completedTasks[key] && cats[task.category as keyof typeof cats] !== undefined) {
        cats[task.category as keyof typeof cats]++;
      }
    });
  });

  // Calculate perfect streak across monthHistory
  let perfectStreak = 0;
  const historyEntries = Object.entries(state.monthHistory)
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA)); // latest first

  for (const [, record] of historyEntries) {
    if (record.percent === 100 || record.frozen) {
      perfectStreak++;
    } else {
      break;
    }
  }

  // Today check
  const todayRecord = state.monthHistory[todayKey];
  if (todayRecord && todayRecord.percent === 100) {
    perfectStreak = Math.max(perfectStreak, 1);
  }

  return {
    classes: cats.classes,
    running: cats.running,
    music: cats.music,
    journal: cats.journal,
    perfect: perfectStreak,
  };
}

/**
 * Toggles a task completion state and recalibrates progress and streaks
 */
export function toggleTaskInState(
  state: AASTUState,
  day: DayOfWeek,
  taskId: string,
  dateKey = getTodayKey()
): { newState: AASTUState; isCompletedNow: boolean } {
  const key = `${dateKey}-${day}-${taskId}`;
  const isDone = !state.completedTasks[key];
  state.completedTasks[key] = isDone;

  // Recalculate day completion percentage
  const currentDayTasks = state.schedules[day] || [];
  let completedCount = 0;
  currentDayTasks.forEach((t) => {
    const k = `${dateKey}-${day}-${t.id}`;
    if (state.completedTasks[k]) completedCount++;
  });

  const total = currentDayTasks.length || 1;
  const percent = Math.round((completedCount / total) * 100);

  if (!state.monthHistory[dateKey]) {
    state.monthHistory[dateKey] = { percent: 0, completedCount: 0, totalCount: total };
  }
  state.monthHistory[dateKey].percent = percent;
  state.monthHistory[dateKey].completedCount = completedCount;
  state.monthHistory[dateKey].totalCount = total;

  state.streaks = calculateUpdatedStreaks(state, dateKey);
  saveAASTUState(state);

  return { newState: { ...state }, isCompletedNow: isDone };
}

/**
 * Shifts a task to evening / alternate slot
 */
export function toggleShiftTaskInState(state: AASTUState, taskId: string): AASTUState {
  state.shiftedTasks[taskId] = !state.shiftedTasks[taskId];
  saveAASTUState(state);
  return { ...state };
}

/**
 * Adds or edits a task on a day's schedule
 */
export function saveTaskToDaySchedule(
  state: AASTUState,
  day: DayOfWeek,
  taskData: Omit<TaskItem, 'id'> & { id?: string }
): AASTUState {
  const daySchedule = state.schedules[day] || [];
  const taskId = taskData.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const taskItem: TaskItem = {
    ...taskData,
    id: taskId,
    day: day,
  };

  const existingIdx = daySchedule.findIndex((t) => t.id === taskId);
  if (existingIdx >= 0) {
    daySchedule[existingIdx] = taskItem;
  } else {
    daySchedule.push(taskItem);
  }

  state.schedules[day] = daySchedule;
  saveAASTUState(state);
  return { ...state };
}

/**
 * Deletes a task from a day's schedule
 */
export function deleteTaskFromDaySchedule(
  state: AASTUState,
  day: DayOfWeek,
  taskId: string
): AASTUState {
  state.schedules[day] = (state.schedules[day] || []).filter((t) => t.id !== taskId);
  saveAASTUState(state);
  return { ...state };
}

/**
 * Activates a streak freeze for a day (maximum 3 per month)
 */
export function useStreakFreezeInState(
  state: AASTUState,
  dateKey = getTodayKey()
): { success: boolean; message: string; newState: AASTUState } {
  if (state.freezesUsed >= 3) {
    return {
      success: false,
      message: 'Monthly limit reached (3 / 3 Freezes already used this month).',
      newState: state,
    };
  }

  if (!state.monthHistory[dateKey]) {
    state.monthHistory[dateKey] = { percent: 0, completedCount: 0, totalCount: 0 };
  }

  if (state.monthHistory[dateKey].frozen) {
    return {
      success: false,
      message: 'Streak freeze is already active for this day.',
      newState: state,
    };
  }

  state.freezesUsed++;
  state.monthHistory[dateKey].frozen = true;
  state.streaks = calculateUpdatedStreaks(state, dateKey);
  saveAASTUState(state);

  return {
    success: true,
    message: 'Streak freeze activated! Your streak is safely preserved.',
    newState: { ...state },
  };
}

/**
 * Resets schedule to pristine Section 12 defaults
 */
export function resetToSection12Defaults(): AASTUState {
  const defaultState: AASTUState = {
    schedules: DEFAULT_SCHEDULES,
    assignments: INITIAL_ASSIGNMENTS,
    exams: INITIAL_EXAMS,
    journals: {},
    completedTasks: {},
    shiftedTasks: {},
    freezesUsed: 0,
    monthHistory: {},
    streaks: { classes: 0, running: 0, music: 0, journal: 0, perfect: 0 },
    notificationsEnabled: true,
    audioAlertsEnabled: true,
    lastActiveDate: getTodayKey(),
  };
  saveAASTUState(defaultState);
  return defaultState;
}
