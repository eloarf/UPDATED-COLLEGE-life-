import { db } from '../db/db';
import { generateId } from '../utils/idGenerator';
import { getTodayKey } from '../utils/dateUtils';
import { Achievement, DailyQuest, StatKey, XpEvent } from '../types';
import confetti from 'canvas-confetti';

export function getXpForNextLevel(level: number): number {
  if (level >= 50) return 999999;
  return 100 + 20 * (level - 1) + 2 * Math.pow(level - 1, 2);
}

export function getCumulativeXpForLevel(targetLevel: number): number {
  let sum = 0;
  for (let l = 1; l < targetLevel; l++) {
    sum += getXpForNextLevel(l);
  }
  return sum;
}

export function calculateLevelFromTotalXp(totalXp: number): {
  level: number;
  currentLevelXp: number;
  xpNeededForNext: number;
  progressPercent: number;
  title: string;
} {
  let currentLevel = 1;
  let remainingXp = Math.max(0, totalXp);

  while (currentLevel < 50) {
    const cost = getXpForNextLevel(currentLevel);
    if (remainingXp >= cost) {
      remainingXp -= cost;
      currentLevel++;
    } else {
      break;
    }
  }

  const xpNeeded = getXpForNextLevel(currentLevel);
  const progressPercent = currentLevel >= 50 ? 100 : Math.min(100, Math.round((remainingXp / xpNeeded) * 100));

  let title = 'Lobby Initiate';
  if (currentLevel >= 50) title = 'Legend of the House';
  else if (currentLevel >= 40) title = 'Grand Concierge';
  else if (currentLevel >= 30) title = 'Head Concierge';
  else if (currentLevel >= 20) title = 'Concierge';
  else if (currentLevel >= 15) title = 'Scholar';
  else if (currentLevel >= 10) title = 'Porter';
  else if (currentLevel >= 5) title = 'Bellhop';

  return {
    level: currentLevel,
    currentLevelXp: remainingXp,
    xpNeededForNext: xpNeeded,
    progressPercent,
    title,
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

  // Idempotency check: see if source + sourceId already exists
  const existing = await db.xpEvents
    .where('source')
    .equals(params.source)
    .filter((e) => e.sourceId === params.sourceId)
    .first();

  if (existing) {
    return false; // Already awarded
  }

  const event: XpEvent = {
    id: generateId(),
    source: params.source,
    sourceId: params.sourceId,
    amount: params.amount,
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

export async function reverseXp(source: string, sourceId: string) {
  const existing = await db.xpEvents
    .where('source')
    .equals(source)
    .filter((e) => e.sourceId === sourceId)
    .first();

  if (existing) {
    await db.xpEvents.delete(existing.id);
  }
}

export function triggerLevelUpConfetti() {
  if (typeof window === 'undefined') return;
  const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isReduced) return;

  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.65 },
    colors: ['#F6A8BE', '#B6E63E', '#8B5A3C', '#7A2E4A', '#E8C9A0'],
  });
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
