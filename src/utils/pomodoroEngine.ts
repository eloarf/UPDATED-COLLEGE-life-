// Pure Pomodoro Engine & Statistics logic (100% offline & testable)
import { PomodoroSettings, FocusSession, Course } from '../types';

export type PomodoroPhase = 'work' | 'short_break' | 'long_break';

export interface PomodoroTimerState {
  isRunning: boolean;
  targetEndTimestamp: number | null;
  remainingSeconds: number;
  currentPhase: PomodoroPhase;
  currentSessionIndex: number; // 1-based (e.g., session 1 of 4)
  currentCycleIndex: number; // 1-based (e.g., cycle 1 of 2)
  selectedCourseId: string;
  settings: PomodoroSettings;
  lastUpdated: number;
}

export const POMODORO_STORAGE_KEY = 'college_os_pomodoro_state_v2';

export const POMODORO_PRESETS: Record<string, { name: string; focus: number; shortBreak: number; longBreak: number; sessionsBeforeLongBreak: number; desc: string }> = {
  classic: {
    name: 'Classic Pomodoro',
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
    sessionsBeforeLongBreak: 4,
    desc: '25m focus • 5m rest • 15m deep recharge',
  },
  deep_work: {
    name: 'Deep Work',
    focus: 50,
    shortBreak: 10,
    longBreak: 20,
    sessionsBeforeLongBreak: 4,
    desc: '50m focus • 10m rest • 20m university block',
  },
  extended: {
    name: 'Extended Focus',
    focus: 90,
    shortBreak: 15,
    longBreak: 30,
    sessionsBeforeLongBreak: 3,
    desc: '90m ultradian rhythm • 15m rest • 30m break',
  },
};

/**
 * Formats a duration in seconds into human-readable string (e.g. "25m 30s", "1h 15m", "45s")
 */
export function formatDurationHuman(seconds: number): string {
  if (seconds <= 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const remSec = seconds % 3600;
  const mins = Math.floor(remSec / 60);
  const secs = remSec % 60;

  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Get duration in seconds for a given phase and settings.
 * Supports presets and independent minutes + seconds in custom mode.
 */
export function getPhaseDurationSeconds(phase: PomodoroPhase, settings: PomodoroSettings): number {
  if (settings.preset === 'custom') {
    switch (phase) {
      case 'work': {
        const m = Math.max(0, settings.customWorkMinutes ?? settings.focusDurationMinutes ?? settings.focusDurationMins ?? 25);
        const s = Math.max(0, Math.min(59, settings.customWorkSeconds ?? 0));
        const total = m * 60 + s;
        return Math.max(5, total); // Minimum 5 seconds
      }
      case 'short_break': {
        const m = Math.max(0, settings.customShortBreakMinutes ?? settings.shortBreakMinutes ?? settings.shortBreakMins ?? 5);
        const s = Math.max(0, Math.min(59, settings.customShortBreakSeconds ?? 0));
        const total = m * 60 + s;
        return Math.max(5, total);
      }
      case 'long_break': {
        const m = Math.max(0, settings.customLongBreakMinutes ?? settings.longBreakMinutes ?? settings.longBreakMins ?? 15);
        const s = Math.max(0, Math.min(59, settings.customLongBreakSeconds ?? 0));
        const total = m * 60 + s;
        return Math.max(5, total);
      }
    }
  }

  // Standard presets
  const focus = settings.focusDurationMinutes ?? settings.focusDurationMins ?? 25;
  const shortBreak = settings.shortBreakMinutes ?? settings.shortBreakMins ?? 5;
  const longBreak = settings.longBreakMinutes ?? settings.longBreakMins ?? 15;

  switch (phase) {
    case 'work':
      return Math.max(1, focus) * 60;
    case 'short_break':
      return Math.max(1, shortBreak) * 60;
    case 'long_break':
      return Math.max(1, longBreak) * 60;
  }
}

/**
 * Transition to next phase and update session/cycle indices
 */
export function getNextPomodoroPhase(
  currentPhase: PomodoroPhase,
  currentSession: number,
  currentCycle: number,
  settings: PomodoroSettings
): {
  nextPhase: PomodoroPhase;
  nextSession: number;
  nextCycle: number;
  isCycleCompleted: boolean;
  isAllCyclesCompleted: boolean;
} {
  if (currentPhase === 'work') {
    // Check if this was the last work session before a long break
    if (currentSession >= settings.sessionsBeforeLongBreak) {
      return {
        nextPhase: 'long_break',
        nextSession: currentSession,
        nextCycle: currentCycle,
        isCycleCompleted: false,
        isAllCyclesCompleted: false,
      };
    } else {
      return {
        nextPhase: 'short_break',
        nextSession: currentSession,
        nextCycle: currentCycle,
        isCycleCompleted: false,
        isAllCyclesCompleted: false,
      };
    }
  }

  // Completing a short break -> Advance to next work session
  if (currentPhase === 'short_break') {
    return {
      nextPhase: 'work',
      nextSession: currentSession + 1,
      nextCycle: currentCycle,
      isCycleCompleted: false,
      isAllCyclesCompleted: false,
    };
  }

  // Completing a long break -> End of a full cycle
  const maxCycles = settings.totalCycles ?? settings.cyclesPerSession ?? 2;
  const nextCycle = currentCycle + 1;
  const isAllCycles = nextCycle > maxCycles;

  return {
    nextPhase: 'work',
    nextSession: 1,
    nextCycle: isAllCycles ? 1 : nextCycle,
    isCycleCompleted: true,
    isAllCyclesCompleted: isAllCycles,
  };
}

/**
 * Compute the actual remaining seconds from target timestamp resilient to sleep/backgrounding
 */
export function calculateRemainingSeconds(
  isRunning: boolean,
  targetEndTimestamp: number | null,
  fallbackSeconds: number
): number {
  if (!isRunning || !targetEndTimestamp) {
    return fallbackSeconds;
  }
  const now = Date.now();
  const diff = Math.max(0, Math.ceil((targetEndTimestamp - now) / 1000));
  return diff;
}

// -------------------------------------------------------------
// STATISTICS CALCULATIONS
// -------------------------------------------------------------

export interface FocusStats {
  dailyMinutes: number;
  weeklyMinutes: number;
  monthlyMinutes: number;
  totalCompletedSessions: number;
  totalFocusedMinutes: number;
  averageSessionMinutes: number;
  currentStreakDays: number;
  courseBreakdown: { courseId: string; courseName: string; courseCode: string; minutes: number; sessionCount: number }[];
}

export function calculateFocusStats(
  sessions: FocusSession[],
  courses: Course[],
  referenceDate: Date = new Date()
): FocusStats {
  const refIso = referenceDate.toISOString();
  const todayKey = refIso.substring(0, 10);

  // 7 days window (including today)
  const oneWeekAgo = new Date(referenceDate);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
  oneWeekAgo.setHours(0, 0, 0, 0);

  // 30 days window
  const oneMonthAgo = new Date(referenceDate);
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 29);
  oneMonthAgo.setHours(0, 0, 0, 0);

  let dailyMinutes = 0;
  let weeklyMinutes = 0;
  let monthlyMinutes = 0;
  let totalFocusedMinutes = 0;

  const courseMap: Record<string, { minutes: number; count: number }> = {};
  const validSessions = sessions.filter((s) => {
    const mins = s.actualMinutes ?? s.minutesFocused ?? 0;
    return mins > 0;
  });

  validSessions.forEach((s) => {
    const mins = s.actualMinutes ?? s.minutesFocused ?? 0;
    totalFocusedMinutes += mins;

    const sDate = s.completedAt ? new Date(s.completedAt) : new Date(s.startedAt);

    if (s.completedAt?.startsWith(todayKey) || s.startedAt?.startsWith(todayKey)) {
      dailyMinutes += mins;
    }
    if (sDate >= oneWeekAgo) {
      weeklyMinutes += mins;
    }
    if (sDate >= oneMonthAgo) {
      monthlyMinutes += mins;
    }

    const cId = s.courseId || 'general';
    if (!courseMap[cId]) {
      courseMap[cId] = { minutes: 0, count: 0 };
    }
    courseMap[cId].minutes += mins;
    courseMap[cId].count += 1;
  });

  const totalCompletedSessions = validSessions.length;
  const averageSessionMinutes = totalCompletedSessions > 0
    ? Math.round(totalFocusedMinutes / totalCompletedSessions)
    : 0;

  // Streak calculation (consecutive active days backwards from today)
  const activeDaysSet = new Set<string>();
  validSessions.forEach((s) => {
    if (s.completedAt) {
      activeDaysSet.add(s.completedAt.substring(0, 10));
    }
  });

  let currentStreakDays = 0;
  const checkDay = new Date(referenceDate);

  // Check if today is active, or if yesterday was active (if user hasn't studied today yet)
  const checkTodayKey = checkDay.toISOString().substring(0, 10);
  const studiedToday = activeDaysSet.has(checkTodayKey);

  if (!studiedToday) {
    checkDay.setDate(checkDay.getDate() - 1);
  }

  while (true) {
    const k = checkDay.toISOString().substring(0, 10);
    if (activeDaysSet.has(k)) {
      currentStreakDays++;
      checkDay.setDate(checkDay.getDate() - 1);
    } else {
      break;
    }
  }

  // Course breakdown
  const coursesById = new Map<string, Course>();
  courses.forEach((c) => coursesById.set(c.id, c));

  const courseBreakdown = Object.entries(courseMap)
    .map(([cId, data]) => {
      if (cId === 'general') {
        return {
          courseId: 'general',
          courseName: 'General University Work',
          courseCode: 'GENERAL',
          minutes: data.minutes,
          sessionCount: data.count,
        };
      }
      const c = coursesById.get(cId);
      return {
        courseId: cId,
        courseName: c ? c.name : 'Unknown Course',
        courseCode: c ? c.code : 'COURSE',
        minutes: data.minutes,
        sessionCount: data.count,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);

  return {
    dailyMinutes,
    weeklyMinutes,
    monthlyMinutes,
    totalCompletedSessions,
    totalFocusedMinutes,
    averageSessionMinutes,
    currentStreakDays,
    courseBreakdown,
  };
}
