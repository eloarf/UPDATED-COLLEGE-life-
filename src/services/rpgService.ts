import { db } from '../db/db';
import { generateId } from '../utils/idGenerator';
import { getTodayKey } from '../utils/dateUtils';
import { Achievement, DailyQuest, StatKey, XpEvent } from '../types';

export interface LevelThreshold {
  level: number;
  rankTitle: string;
  rankFamily: string;
  rankTier: string;
  subtitle: string;
  xpRequired: number; // XP to complete this level and advance
  cumulativeXp: number; // Cumulative XP needed from 0 to reach this level
}

export interface UserLevelInfo {
  level: number;
  currentLevelXp: number;
  xpNeededForNext: number;
  progressPercent: number;
  title: string;
  rankFamily: string;
  rankTier: string;
  subtitle: string;
  totalXp: number;
  nextRankTitle: string;
  isMaxLevel: boolean;
}

// XP scaling formula: steady, rewarding, non-trivial progression
export function getXpForNextLevel(level: number): number {
  if (level >= 50) return 999999;
  return 100 + 25 * (level - 1) + 3 * Math.pow(level - 1, 2);
}

// Pre-generated centralized definitions for all 50 levels
const RAW_RANK_DATA: Array<{
  family: string;
  tier: string;
  title: string;
  subtitle: string;
}> = [
  // Rookie Family (Levels 1 - 5)
  { family: 'Rookie', tier: 'V', title: 'Rookie 5', subtitle: 'Luggage Scout • First Arrival in the Lobby' },
  { family: 'Rookie', tier: 'IV', title: 'Rookie 4', subtitle: 'Elevator Cadet • Floor & Schedule Traversal' },
  { family: 'Rookie', tier: 'III', title: 'Rookie 3', subtitle: 'Lobby Attendant • Key Sorting & Syllabus Intake' },
  { family: 'Rookie', tier: 'II', title: 'Rookie 2', subtitle: 'Bellhop Junior • Routine Execution & Note Keeping' },
  { family: 'Rookie', tier: 'I', title: 'Rookie 1', subtitle: 'Doorperson First Class • Reliable Presence' },

  // Novice Family (Levels 6 - 10)
  { family: 'Novice', tier: 'V', title: 'Novice 5', subtitle: 'Courier Initiate • Daily Task Dispatcher' },
  { family: 'Novice', tier: 'IV', title: 'Novice 4', subtitle: 'Desk Clerk • Class Attendance Tracker' },
  { family: 'Novice', tier: 'III', title: 'Novice 3', subtitle: 'Suite Custodian • Study Space Architect' },
  { family: 'Novice', tier: 'II', title: 'Novice 2', subtitle: 'Brass Key Keeper • Morning Momentum Maker' },
  { family: 'Novice', tier: 'I', title: 'Novice 1', subtitle: 'Head Bellhop • Forgiving Habit Stamper' },

  // Scholar Family (Levels 11 - 15)
  { family: 'Scholar', tier: 'V', title: 'Scholar 5', subtitle: 'Library Scribe • Syllabus Explorer' },
  { family: 'Scholar', tier: 'IV', title: 'Scholar 4', subtitle: 'Archive Archivist • Lab Report Crafter' },
  { family: 'Scholar', tier: 'III', title: 'Scholar 3', subtitle: 'Research Assistant • Deep Focus Practitioner' },
  { family: 'Scholar', tier: 'II', title: 'Scholar 2', subtitle: 'Symposium Fellow • Midterm Tactician' },
  { family: 'Scholar', tier: 'I', title: 'Scholar 1', subtitle: 'Distinguished Scholar • 3.85 GPA Aspirant' },

  // Apprentice Concierge Family (Levels 16 - 20)
  { family: 'Apprentice', tier: 'V', title: 'Apprentice 5', subtitle: 'Silver Key Bearer • Weekly Review Architect' },
  { family: 'Apprentice', tier: 'IV', title: 'Apprentice 4', subtitle: 'Floor Steward • Pomodoro Flow Master' },
  { family: 'Apprentice', tier: 'III', title: 'Apprentice 3', subtitle: 'Protocol Liaison • Project Milestone Finisher' },
  { family: 'Apprentice', tier: 'II', title: 'Apprentice 2', subtitle: 'Salon Dispatcher • Campus Treasury Keeper' },
  { family: 'Apprentice', tier: 'I', title: 'Apprentice 1', subtitle: 'Associate Concierge • Unshakable Routine' },

  // Vanguard Family (Levels 21 - 25)
  { family: 'Vanguard', tier: 'V', title: 'Vanguard 5', subtitle: 'Night Overseer • Midnight Focus Commander' },
  { family: 'Vanguard', tier: 'IV', title: 'Vanguard 4', subtitle: 'Executive Warden • Milestone Strategist' },
  { family: 'Vanguard', tier: 'III', title: 'Vanguard 3', subtitle: 'Grand Tribune • Exam Boss Defeater' },
  { family: 'Vanguard', tier: 'II', title: 'Vanguard 2', subtitle: 'High Chancellor • Campus Rhythm Master' },
  { family: 'Vanguard', tier: 'I', title: 'Vanguard 1', subtitle: 'First Vanguard • Undefeated Streak' },

  // Elite Family (Levels 26 - 30)
  { family: 'Elite', tier: 'V', title: 'Elite 5', subtitle: 'Crossed Keys Initiate • High-Effort Conqueror' },
  { family: 'Elite', tier: 'IV', title: 'Elite 4', subtitle: 'Crossed Keys Adept • University Diplomat' },
  { family: 'Elite', tier: 'III', title: 'Elite 3', subtitle: 'Chancellery Envoy • Multi-Course Commander' },
  { family: 'Elite', tier: 'II', title: 'Elite 2', subtitle: 'Grand Overseer • Creative Studio Producer' },
  { family: 'Elite', tier: 'I', title: 'Elite 1', subtitle: 'Senior Concierge • Grand Budapest Veteran' },

  // Paragon Family (Levels 31 - 35)
  { family: 'Paragon', tier: 'V', title: 'Paragon 5', subtitle: 'Conservator of Knowledge • Syllabus Virtuoso' },
  { family: 'Paragon', tier: 'IV', title: 'Paragon 4', subtitle: 'Sovereign Prefect • Zero Procrastination' },
  { family: 'Paragon', tier: 'III', title: 'Paragon 3', subtitle: 'Grand Luminary • Peer Mentor & Leader' },
  { family: 'Paragon', tier: 'II', title: 'Paragon 2', subtitle: 'Master of Protocols • Academic Dynamo' },
  { family: 'Paragon', tier: 'I', title: 'Paragon 1', subtitle: 'Living Paragon • University Vanguard' },

  // Grandmaster Family (Levels 36 - 40)
  { family: 'Grandmaster', tier: 'V', title: 'Grandmaster 5', subtitle: 'Emerald Grandmaster • Resilient Scholar' },
  { family: 'Grandmaster', tier: 'IV', title: 'Grandmaster 4', subtitle: 'Sapphire Grandmaster • Flawless Attendance' },
  { family: 'Grandmaster', tier: 'III', title: 'Grandmaster 3', subtitle: 'Ruby Grandmaster • Exam Demolisher' },
  { family: 'Grandmaster', tier: 'II', title: 'Grandmaster 2', subtitle: 'Diamond Grandmaster • Unbroken Resolve' },
  { family: 'Grandmaster', tier: 'I', title: 'Grandmaster 1', subtitle: 'Crown Grandmaster • Order of the Keys' },

  // Master Family (Levels 41 - 50)
  { family: 'Master', tier: 'V', title: 'Master 5', subtitle: 'Grand Budapest Master V • Grand Architect' },
  { family: 'Master', tier: 'IV', title: 'Master 4', subtitle: 'Grand Budapest Master IV • Legendary Pacing' },
  { family: 'Master', tier: 'III', title: 'Master 3', subtitle: 'Grand Budapest Master III • Infinite Curiosity' },
  { family: 'Master', tier: 'II', title: 'Master 2', subtitle: 'Grand Budapest Master II • Pillar of Excellence' },
  { family: 'Master', tier: 'I', title: 'Master 1', subtitle: 'Grand Budapest Master I • Master of All Quests' },
  { family: 'Master', tier: 'High', title: 'High Master', subtitle: 'Exalted Order • Unrivaled Focus' },
  { family: 'Master', tier: 'Prime', title: 'Prime Master', subtitle: 'Prime Architect of the Grand Budapest' },
  { family: 'Master', tier: 'Supreme', title: 'Supreme Master', subtitle: 'Supreme Scholar of Science & Tech' },
  { family: 'Master', tier: 'Grand', title: 'Grand Budapest Master', subtitle: 'Peerless Legend of the Academy' },
  { family: 'Master', tier: 'Apex', title: 'Sovereign Master', subtitle: 'Eternal Sovereign of the Grand Budapest' },
];

export const LEVEL_THRESHOLDS: LevelThreshold[] = (() => {
  const list: LevelThreshold[] = [];
  let cum = 0;
  for (let l = 1; l <= 50; l++) {
    const raw = RAW_RANK_DATA[l - 1] || {
      family: 'Master',
      tier: 'Apex',
      title: `Master Lv.${l}`,
      subtitle: 'Legendary Scholar of the House',
    };
    const req = getXpForNextLevel(l);
    list.push({
      level: l,
      rankTitle: raw.title,
      rankFamily: raw.family,
      rankTier: raw.tier,
      subtitle: raw.subtitle,
      xpRequired: req,
      cumulativeXp: cum,
    });
    cum += req;
  }
  return list;
})();

export function getAllLevelThresholds(): LevelThreshold[] {
  return LEVEL_THRESHOLDS;
}

export function getLevelThreshold(level: number): LevelThreshold {
  const clamped = Math.max(1, Math.min(50, level));
  return LEVEL_THRESHOLDS[clamped - 1] || LEVEL_THRESHOLDS[0];
}

export function getCumulativeXpForLevel(targetLevel: number): number {
  const threshold = getLevelThreshold(targetLevel);
  return threshold.cumulativeXp;
}

export function calculateLevelFromTotalXp(totalXp: number): UserLevelInfo {
  const safeTotalXp = Math.max(0, isNaN(totalXp) ? 0 : totalXp);
  let currentLevel = 1;

  for (let l = 1; l <= 50; l++) {
    const th = LEVEL_THRESHOLDS[l - 1];
    if (l === 50) {
      currentLevel = 50;
      break;
    }
    const nextTh = LEVEL_THRESHOLDS[l];
    if (safeTotalXp < nextTh.cumulativeXp) {
      currentLevel = l;
      break;
    }
  }

  const currentTh = LEVEL_THRESHOLDS[currentLevel - 1];
  const nextTh = currentLevel < 50 ? LEVEL_THRESHOLDS[currentLevel] : null;

  const currentLevelXp = safeTotalXp - currentTh.cumulativeXp;
  const xpNeeded = currentTh.xpRequired;
  const progressPercent =
    currentLevel >= 50
      ? 100
      : Math.min(100, Math.max(0, Math.round((currentLevelXp / xpNeeded) * 100)));

  return {
    level: currentLevel,
    currentLevelXp,
    xpNeededForNext: xpNeeded,
    progressPercent,
    title: currentTh.rankTitle,
    rankFamily: currentTh.rankFamily,
    rankTier: currentTh.rankTier,
    subtitle: currentTh.subtitle,
    totalXp: safeTotalXp,
    nextRankTitle: nextTh ? nextTh.rankTitle : 'Maximum Rank Attained',
    isMaxLevel: currentLevel >= 50,
  };
}

export function getQuestXpReward(task: { effort?: string; priority?: string }): number {
  let base = 30;
  if (task.effort === 'small') base = 15;
  else if (task.effort === 'medium') base = 30;
  else if (task.effort === 'large') base = 60;

  if (task.priority === 'high') base += 10;
  return base;
}

export interface DailyXpCapConfig {
  cap: number;
  softThreshold: number;
}

export const SOURCE_DAILY_XP_CAPS: Record<string, DailyXpCapConfig> = {
  daily_shutdown: { cap: 35, softThreshold: 25 },
  daily_plan: { cap: 35, softThreshold: 20 },
  habit_complete: { cap: 150, softThreshold: 100 },
  task_complete: { cap: 300, softThreshold: 200 },
  focus_session: { cap: 250, softThreshold: 180 },
  attendance_mark: { cap: 100, softThreshold: 75 },
  journal_entry: { cap: 80, softThreshold: 50 },
  flashcard_review: { cap: 80, softThreshold: 50 },
  goal_and_milestone: { cap: 150, softThreshold: 100 },
  creative_work: { cap: 120, softThreshold: 80 },
  setup_and_logs: { cap: 60, softThreshold: 40 },
  default: { cap: 250, softThreshold: 180 },
};

const SOURCE_ALIAS_MAP: Record<string, string> = {
  task: 'task_complete',
  task_complete: 'task_complete',
  habit: 'habit_complete',
  habit_complete: 'habit_complete',
  focus: 'focus_session',
  focus_session: 'focus_session',
  attendance: 'attendance_mark',
  attendance_mark: 'attendance_mark',
  ritual: 'daily_shutdown',
  daily_shutdown: 'daily_shutdown',
  daily_plan: 'daily_plan',
  journal_entry: 'journal_entry',
  flashcard: 'flashcard_review',
  flashcard_review: 'flashcard_review',
  goal_created: 'setup_and_logs',
  book_added: 'setup_and_logs',
  finance_tx: 'setup_and_logs',
  finance_debt: 'setup_and_logs',
  finance_goal: 'setup_and_logs',
  course_resource: 'setup_and_logs',
  course_topic: 'setup_and_logs',
  exam_topic: 'setup_and_logs',
  project_created: 'setup_and_logs',
  milestone_done: 'goal_and_milestone',
  goal_completed: 'goal_and_milestone',
  exam_defeated: 'goal_and_milestone',
  book_finished: 'goal_and_milestone',
  course_grade: 'goal_and_milestone',
  project_task: 'goal_and_milestone',
  studio_session: 'creative_work',
  creative_milestone: 'creative_work',
};

export const DAILY_CAP_DISPLAY_SOURCES: Array<{ source: string; label: string }> = [
  { source: 'task_complete', label: 'Tasks & Quests' },
  { source: 'habit_complete', label: 'Daily Habits' },
  { source: 'focus_session', label: 'Focus Study' },
  { source: 'attendance_mark', label: 'Class Attendance' },
  { source: 'flashcard_review', label: 'Flashcard Reviews' },
  { source: 'journal_entry', label: 'Journal Reflections' },
  { source: 'daily_plan', label: 'Plan My Day' },
  { source: 'daily_shutdown', label: 'Evening Shutdown' },
];

export function getCanonicalXpSource(source: string): string {
  return SOURCE_ALIAS_MAP[source] || source;
}

export function getSourceCapConfig(source: string): DailyXpCapConfig {
  const canonical = getCanonicalXpSource(source);
  return SOURCE_DAILY_XP_CAPS[canonical] || SOURCE_DAILY_XP_CAPS.default;
}

export async function getDailySourceXp(source: string, dayKey: string = getTodayKey()): Promise<number> {
  const canonical = getCanonicalXpSource(source);
  const events = await db.xpEvents
    .where('dayKey')
    .equals(dayKey)
    .filter((e) => getCanonicalXpSource(e.source) === canonical)
    .toArray();
  return events.reduce((sum, e) => sum + (e.amount || 0), 0);
}

export async function getDailySourceProgress(source: string, dayKey: string = getTodayKey()): Promise<{
  source: string;
  earned: number;
  cap: number;
  softThreshold: number;
  percent: number;
  isCapped: boolean;
}> {
  const canonical = getCanonicalXpSource(source);
  const config = getSourceCapConfig(canonical);
  const earned = await getDailySourceXp(canonical, dayKey);
  const percent = Math.min(100, Math.round((earned / config.cap) * 100));
  return {
    source: canonical,
    earned,
    cap: config.cap,
    softThreshold: config.softThreshold,
    percent,
    isCapped: earned >= config.cap,
  };
}

export async function awardXp(params: {
  source: string;
  sourceId: string;
  amount: number;
  stat: StatKey;
  dayKey?: string;
}): Promise<boolean> {
  const dayKey = params.dayKey || getTodayKey();

  // 1. Idempotency check: see if source + sourceId already exists
  const existing = await db.xpEvents
    .where('source')
    .equals(params.source)
    .filter((e) => e.sourceId === params.sourceId)
    .first();

  if (existing) {
    return false; // Already awarded
  }

  // 2. Check per-day caps & diminishing returns
  const capConfig = getSourceCapConfig(params.source);
  const alreadyEarnedToday = await getDailySourceXp(params.source, dayKey);

  if (alreadyEarnedToday >= capConfig.cap) {
    return false; // Cap reached for today
  }

  let finalAmount = params.amount;
  // Apply diminishing returns (50% reduction) if past soft threshold
  if (alreadyEarnedToday >= capConfig.softThreshold) {
    finalAmount = Math.max(1, Math.floor(params.amount * 0.5));
  }

  // Ensure award does not exceed remaining cap room
  const remainingRoom = capConfig.cap - alreadyEarnedToday;
  finalAmount = Math.min(finalAmount, remainingRoom);

  if (finalAmount <= 0) {
    return false;
  }

  const event: XpEvent = {
    id: generateId(),
    source: params.source,
    sourceId: params.sourceId,
    amount: finalAmount,
    stat: params.stat,
    dayKey,
    timestamp: new Date().toISOString(),
  };

  await db.xpEvents.add(event);

  // Trigger sound / haptic if enabled
  const settings = await db.settings.get('current_user');
  if (settings?.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(30);
    } catch {
      // Ignore
    }
  }

  // Check achievements
  await checkAchievementsTrigger();

  return true;
}

export async function reverseXp(source: string, sourceId: string): Promise<boolean> {
  const existing = await db.xpEvents
    .where('source')
    .equals(source)
    .filter((e) => e.sourceId === sourceId)
    .first();

  if (existing) {
    await db.xpEvents.delete(existing.id);
    return true;
  }
  return false;
}

/**
 * Awards daily shutdown XP (+25 discipline XP) under daily cap.
 */
export async function awardDailyShutdownXp(dateKey: string = getTodayKey()): Promise<boolean> {
  return awardXp({
    source: 'daily_shutdown',
    sourceId: `shutdown-${dateKey}`,
    amount: 25,
    stat: 'discipline',
    dayKey: dateKey,
  });
}

/**
 * Awards daily planning XP (+20 intellect XP) under daily cap.
 */
export async function awardDailyPlanXp(dateKey: string = getTodayKey()): Promise<boolean> {
  return awardXp({
    source: 'daily_plan',
    sourceId: `plan-${dateKey}`,
    amount: 20,
    stat: 'knowledge',
    dayKey: dateKey,
  });
}

export async function reconcileXpLedger(): Promise<{
  reversedCount: number;
  totalValidEvents: number;
  reconciledTotalXp: number;
}> {
  const allEvents = await db.xpEvents.toArray();
  const allTasks = await db.tasks.toArray();
  const taskMap = new Map(allTasks.map((t) => [t.id, t]));

  let reversedCount = 0;
  // Remove orphaned task events where task no longer exists or is not done
  for (const event of allEvents) {
    if (event.source === 'task') {
      const task = taskMap.get(event.sourceId);
      if (!task || task.status !== 'done') {
        await db.xpEvents.delete(event.id);
        reversedCount++;
      }
    }
  }

  // Deduplicate any repeated events for same source + sourceId
  const remaining = await db.xpEvents.toArray();
  const seen = new Set<string>();
  for (const event of remaining) {
    const key = `${event.source}__${event.sourceId}`;
    if (seen.has(key)) {
      await db.xpEvents.delete(event.id);
      reversedCount++;
    } else {
      seen.add(key);
    }
  }

  const finalEvents = await db.xpEvents.toArray();
  const reconciledTotalXp = Math.max(0, finalEvents.reduce((acc, e) => acc + (e.amount || 0), 0));

  return {
    reversedCount,
    totalValidEvents: finalEvents.length,
    reconciledTotalXp,
  };
}

export async function triggerLevelUpConfetti() {
  if (typeof window === 'undefined') return;
  const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isReduced) return;

  try {
    const settings = await db.settings.get('current_user');
    if (settings?.reduceAnimations) return;

    const confettiModule = await import('canvas-confetti');
    const confetti = confettiModule.default || confettiModule;
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.65 },
      colors: ['#F6A8BE', '#B6E63E', '#8B5A3C', '#7A2E4A', '#E8C9A0'],
    });
  } catch {
    // Graceful fallback
  }
}

export async function checkAchievementsTrigger() {
  const totalEvents = await db.xpEvents.count();
  const tasksDone = await db.tasks.where('status').equals('done').count();
  const allExams = await db.exams.toArray();
  const examsDefeated = allExams.filter((e) => e.isDefeated).length;
  const focusCount = await db.focusSessions.count();
  const journalCount = await db.journalEntries.count();

  const toUnlock: string[] = [];

  if (tasksDone >= 1) toUnlock.push('ach_first_steps');
  if (tasksDone >= 25) toUnlock.push('ach_task_master');
  if (totalEvents >= 10) toUnlock.push('ach_xp_seeker');
  if (examsDefeated >= 1) toUnlock.push('ach_boss_slayer');
  if (focusCount >= 3) toUnlock.push('ach_deep_focus');
  if (journalCount >= 5) toUnlock.push('ach_wordsmith');

  for (const id of toUnlock) {
    const ach = await db.achievementsUnlocked.get(id);
    if (ach && !ach.isUnlocked) {
      await db.achievementsUnlocked.update(id, {
        isUnlocked: true,
        unlockedAt: new Date().toISOString(),
      });
      triggerLevelUpConfetti();
    }
  }
}

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: 'ach_first_steps', title: 'First Steps', description: 'Complete your first task in College Life OS.', icon: 'CheckCircle', category: 'academic', isUnlocked: false },
  { id: 'ach_streak_7', title: 'Week of Resolve', description: 'Maintain any habit streak for 7 consecutive days.', icon: 'Flame', category: 'focus', isUnlocked: false },
  { id: 'ach_streak_30', title: 'Grand Resident', description: 'Reach a 30-day streak in habits or class attendance.', icon: 'Award', category: 'focus', isUnlocked: false },
  { id: 'ach_boss_slayer', title: 'Boss Slayer', description: 'Defeat your first university exam boss.', icon: 'ShieldAlert', category: 'academic', isUnlocked: false },
  { id: 'ach_dungeon_crawler', title: 'Dungeon Crawler', description: 'Complete your first project milestone.', icon: 'Compass', category: 'academic', isUnlocked: false },
  { id: 'ach_bookworm', title: 'Bookworm', description: 'Finish reading 5 books on your shelf.', icon: 'BookOpen', category: 'creativity', isUnlocked: false },
  { id: 'ach_wordsmith', title: 'Wordsmith', description: 'Write 30 reflective journal entries.', icon: 'Feather', category: 'creativity', isUnlocked: false },
  { id: 'ach_backup_hero', title: 'Backup Hero', description: 'Export a safety JSON backup of your database.', icon: 'HardDrive', category: 'meta', isUnlocked: false },
  { id: 'ach_theme_collector', title: 'Grand Hotelier', description: 'Experiment with all six storybook color themes.', icon: 'Palette', category: 'meta', isUnlocked: false },
  { id: 'ach_comeback_kid', title: 'Comeback Kid', description: 'Return and complete tasks after 3 days away with grace.', icon: 'Smile', category: 'focus', isUnlocked: false },
  { id: 'ach_finisher', title: 'Finisher', description: 'Bring a creative project or song to final Release.', icon: 'Sparkles', category: 'creativity', isUnlocked: false },
  { id: 'ach_deep_focus', title: 'Deep Focus Hour', description: 'Accumulate 60 minutes of uninterrupted study flow.', icon: 'Clock', category: 'focus', isUnlocked: false },
  { id: 'ach_task_master', title: 'Quarter Century', description: 'Conquer 25 assignments and quest tasks.', icon: 'CheckSquare', category: 'academic', isUnlocked: false },
  { id: 'ach_budget_keeper', title: 'Vault Keeper', description: 'Track university budget expenses for an entire month.', icon: 'CreditCard', category: 'rituals', isUnlocked: false },
  { id: 'ach_ritual_master', title: 'Weekly Architect', description: 'Complete a guided Sunday Weekly Review ritual.', icon: 'RefreshCw', category: 'rituals', isUnlocked: false },
];

export async function ensureDailyQuests(): Promise<DailyQuest[]> {
  const todayKey = getTodayKey();
  const existing = await db.quests.where('dayKey').equals(todayKey).toArray();

  if (existing.length > 0) {
    return existing;
  }

  const quests: DailyQuest[] = [
    {
      id: generateId(),
      title: "Conquer Today's Top Priority",
      description: 'Check off your most urgent assignment or class task.',
      xpReward: 35,
      stat: 'discipline',
      isDone: false,
      dayKey: todayKey,
      type: 'priority',
    },
    {
      id: generateId(),
      title: '25 Minutes of Unbroken Focus',
      description: 'Start and complete a 25/5 Pomodoro study block.',
      xpReward: 30,
      stat: 'knowledge',
      isDone: false,
      dayKey: todayKey,
      type: 'focus',
    },
    {
      id: generateId(),
      title: 'Daily Reflection & Habit Stamp',
      description: 'Log in your journal or mark 2 daily habits done.',
      xpReward: 25,
      stat: 'vitality',
      isDone: false,
      dayKey: todayKey,
      type: 'habit',
    },
  ];

  await db.quests.bulkPut(quests);
  return quests;
}
