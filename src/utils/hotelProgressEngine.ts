import { FocusSession, HabitLog, RestDay, Task, XpEvent } from '../types';

export interface HotelWingUnlock {
  id: string;
  floor: number;
  name: string;
  subtitle: string;
  requiredDays: number;
  requiredXp: number;
  accentColor: string;
  isUnlocked: boolean;
  progressPercent: number;
}

export interface HotelProgressState {
  consistentDays: number;
  habitDays: number;
  restTokenDays: number;
  studyDays: number;
  totalXp: number;
  unlockedCount: number;
  totalWings: number;
  currentWing: HotelWingUnlock;
  nextWing: HotelWingUnlock | null;
  wings: HotelWingUnlock[];
}

const HOTEL_WING_BLUEPRINT: Array<Omit<HotelWingUnlock, 'isUnlocked' | 'progressPercent'>> = [
  {
    id: 'lobby-concierge',
    floor: 1,
    name: 'The Arrival Lobby',
    subtitle: 'First steady day logged — your brass concierge key is on the desk.',
    requiredDays: 1,
    requiredXp: 0,
    accentColor: '#F6A8BE',
  },
  {
    id: 'pastry-parlor',
    floor: 2,
    name: 'Mendl’s Tea & Reading Salon',
    subtitle: 'Warm study corner unlocked after 3 consistent days.',
    requiredDays: 3,
    requiredXp: 50,
    accentColor: '#E5C04B',
  },
  {
    id: 'mezzanine-library',
    floor: 3,
    name: 'Mezzanine Archive',
    subtitle: 'Quiet shelves illuminated after 7 consistent days.',
    requiredDays: 7,
    requiredXp: 150,
    accentColor: '#8EC5E8',
  },
  {
    id: 'botanical-conservatory',
    floor: 4,
    name: 'Glass Conservatory',
    subtitle: 'Thriving routines & protected rest days at 14 consistent days.',
    requiredDays: 14,
    requiredXp: 350,
    accentColor: '#B6E63E',
  },
  {
    id: 'observatory-suite',
    floor: 5,
    name: 'Alpine Observatory',
    subtitle: 'Clear semester vision reached at 21 consistent days.',
    requiredDays: 21,
    requiredXp: 600,
    accentColor: '#BBA6E0',
  },
  {
    id: 'grand-ballroom',
    floor: 6,
    name: 'Grand Rose Ballroom',
    subtitle: 'A month of steady, compassionate craft (30 consistent days).',
    requiredDays: 30,
    requiredXp: 1000,
    accentColor: '#F6A8BE',
  },
  {
    id: 'belvedere-terrace',
    floor: 7,
    name: 'Belvedere Summit Terrace',
    subtitle: 'Deep academic rhythm across 45 consistent days.',
    requiredDays: 45,
    requiredXp: 1600,
    accentColor: '#E5C04B',
  },
  {
    id: 'belltower-penthouse',
    floor: 8,
    name: 'The Grand Belltower',
    subtitle: 'Cornerstone resident of the Grand Budapest (60 consistent days).',
    requiredDays: 60,
    requiredXp: 2400,
    accentColor: '#B6E63E',
  },
];

/**
 * Pure derivation: Derives visible Grand Hotel progress strictly from historical
 * activity records (habits including minimum-version logs, rest tokens, focus sessions,
 * completed tasks, and XP events). Cannot drift, reset on missed days, or shame the user.
 */
export function deriveHotelProgress(params: {
  habitLogs?: HabitLog[];
  restDays?: RestDay[];
  focusSessions?: FocusSession[];
  tasks?: Task[];
  xpEvents?: XpEvent[];
}): HotelProgressState {
  const {
    habitLogs = [],
    restDays = [],
    focusSessions = [],
    tasks = [],
    xpEvents = [],
  } = params;

  const habitDateSet = new Set<string>();
  for (const log of habitLogs) {
    if (log.date && log.status !== 'skipped' && (log.count > 0 || log.isPartial)) {
      habitDateSet.add(log.date.slice(0, 10));
    }
  }

  const restDateSet = new Set<string>();
  for (const r of restDays) {
    if (r.dateKey) {
      restDateSet.add(r.dateKey.slice(0, 10));
    }
  }

  const studyDateSet = new Set<string>();
  for (const fs of focusSessions) {
    if ((fs.minutesFocused || fs.actualMinutes || 0) > 0) {
      const dk = (fs.completedAt || fs.startedAt || '').slice(0, 10);
      if (dk) studyDateSet.add(dk);
    }
  }
  for (const t of tasks) {
    if (t.status === 'done') {
      const dk = (t.completedAt || t.dueDate || '').slice(0, 10);
      if (dk) studyDateSet.add(dk);
    }
  }

  // Union of all active or rest-protected days (monotonically derived)
  const consistentDateSet = new Set<string>([
    ...habitDateSet,
    ...restDateSet,
    ...studyDateSet,
  ]);

  const consistentDays = consistentDateSet.size;
  const totalXp = Math.max(
    0,
    xpEvents.reduce((sum, e) => sum + (e.amount || 0), 0)
  );

  const wings: HotelWingUnlock[] = HOTEL_WING_BLUEPRINT.map((blueprint) => {
    const daysRatio =
      blueprint.requiredDays > 0
        ? Math.min(1, consistentDays / blueprint.requiredDays)
        : 1;
    const xpRatio =
      blueprint.requiredXp > 0
        ? Math.min(1, totalXp / blueprint.requiredXp)
        : 1;
    const isUnlocked =
      consistentDays >= blueprint.requiredDays && totalXp >= blueprint.requiredXp;

    const progressPercent = isUnlocked
      ? 100
      : Math.round(((daysRatio + xpRatio) / 2) * 100);

    return {
      ...blueprint,
      isUnlocked,
      progressPercent,
    };
  });

  const unlockedWings = wings.filter((w) => w.isUnlocked);
  const currentWing = unlockedWings[unlockedWings.length - 1] || wings[0];
  const nextWing = wings.find((w) => !w.isUnlocked) || null;

  return {
    consistentDays,
    habitDays: habitDateSet.size,
    restTokenDays: restDateSet.size,
    studyDays: studyDateSet.size,
    totalXp,
    unlockedCount: unlockedWings.length,
    totalWings: wings.length,
    currentWing,
    nextWing,
    wings,
  };
}
