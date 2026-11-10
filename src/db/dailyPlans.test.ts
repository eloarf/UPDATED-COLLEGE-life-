import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import { DailyPlan } from '../types';
import { awardDailyPlanXp, awardDailyShutdownXp, getDailySourceProgress } from '../services/rpgService';
import { exportDatabaseToJson, validateBackupFile, restoreDatabaseFromJson } from '../services/backupService';

describe('Chunk 4 - Daily Plans and Rituals Integration', () => {
  const dateKey = '2026-11-09';

  beforeEach(async () => {
    await db.dailyPlans.clear();
    await db.xpEvents.clear();
    await db.tasks.clear();
  });

  it('saves and replaces a daily plan on the same dateKey without duplicates', async () => {
    const plan1: DailyPlan = {
      id: 'plan-1',
      dateKey,
      priorityIds: ['task-1', 'task-2'],
      createdAt: '2026-11-09T08:00:00.000Z',
      note: 'Morning focus',
    };

    await db.dailyPlans.put(plan1);
    const count1 = await db.dailyPlans.where('dateKey').equals(dateKey).count();
    expect(count1).toBe(1);

    // Saving again replaces
    const plan2: DailyPlan = {
      id: 'plan-1',
      dateKey,
      priorityIds: ['task-1', 'task-2', 'task-3'],
      createdAt: '2026-11-09T08:00:00.000Z',
      note: 'Updated priorities',
    };

    await db.dailyPlans.put(plan2);
    const retrieved = await db.dailyPlans.where('dateKey').equals(dateKey).first();
    expect(retrieved?.priorityIds).toHaveLength(3);
    expect(retrieved?.note).toBe('Updated priorities');

    const totalPlans = await db.dailyPlans.where('dateKey').equals(dateKey).count();
    expect(totalPlans).toBe(1);
  });

  it('awards plan XP under daily caps idempotently', async () => {
    const firstAward = await awardDailyPlanXp(dateKey);
    expect(firstAward).toBe(true);

    // Second call on same date should be idempotent and return false
    const secondAward = await awardDailyPlanXp(dateKey);
    expect(secondAward).toBe(false);

    const progress = await getDailySourceProgress('daily_plan', dateKey);
    expect(progress.earned).toBe(20);
    expect(progress.isCapped).toBe(false);
  });

  it('awards shutdown XP under daily caps idempotently', async () => {
    const firstAward = await awardDailyShutdownXp(dateKey);
    expect(firstAward).toBe(true);

    // Duplicate shutdown award on same day returns false
    const secondAward = await awardDailyShutdownXp(dateKey);
    expect(secondAward).toBe(false);

    const progress = await getDailySourceProgress('daily_shutdown', dateKey);
    expect(progress.earned).toBe(25);
  });

  it('includes dailyPlans in backup export, validation, and restore', async () => {
    const plan: DailyPlan = {
      id: 'plan-backup-test',
      dateKey,
      priorityIds: ['task-alpha', 'task-beta'],
      createdAt: '2026-11-09T08:30:00.000Z',
      shutdownAt: '2026-11-09T21:15:00.000Z',
      note: 'Solid day of study',
    };

    await db.dailyPlans.put(plan);

    // Export
    const jsonStr = await exportDatabaseToJson();
    expect(jsonStr).toContain('plan-backup-test');
    expect(jsonStr).toContain('Solid day of study');

    // Validation
    const validation = validateBackupFile(jsonStr);
    expect(validation.valid).toBe(true);

    // Clear and restore
    await db.dailyPlans.clear();
    const countBefore = await db.dailyPlans.count();
    expect(countBefore).toBe(0);

    const restoreRes = await restoreDatabaseFromJson(jsonStr, 'replace');
    expect(restoreRes.success).toBe(true);

    const countAfter = await db.dailyPlans.count();
    expect(countAfter).toBe(1);

    const restoredPlan = await db.dailyPlans.get('plan-backup-test');
    expect(restoredPlan?.note).toBe('Solid day of study');
    expect(restoredPlan?.priorityIds).toEqual(['task-alpha', 'task-beta']);
    expect(restoredPlan?.shutdownAt).toBe('2026-11-09T21:15:00.000Z');
  });
});
