import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import { DailyPlan, Task } from '../types';
import { awardDailyShutdownXp, awardDailyPlanXp, getDailySourceXp } from '../services/rpgService';
import { exportDatabaseToJson, restoreDatabaseFromJson } from '../services/backupService';
import { addDaysToKey } from '../utils/dateUtils';

describe('DailyPlan & Ritual Flows (Chunk 4)', () => {
  const testDate = '2026-11-09';

  beforeEach(async () => {
    await db.dailyPlans.clear();
    await db.tasks.clear();
    await db.xpEvents.clear();
  });

  it('saves daily plan with priorityIds and enforces one plan per dateKey', async () => {
    const plan1: DailyPlan = {
      id: 'plan-1',
      dateKey: testDate,
      priorityIds: ['t1', 't2'],
      createdAt: '2026-11-09T08:00:00.000Z',
    };

    await db.dailyPlans.add(plan1);
    let stored = await db.dailyPlans.where('dateKey').equals(testDate).toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].priorityIds).toEqual(['t1', 't2']);

    // Saving again replaces the plan
    const plan2: DailyPlan = {
      id: 'plan-2',
      dateKey: testDate,
      priorityIds: ['t2', 't3', 'custom:Review Slides'],
      createdAt: '2026-11-09T08:30:00.000Z',
    };

    await db.dailyPlans.where('dateKey').equals(testDate).delete();
    await db.dailyPlans.add(plan2);

    stored = await db.dailyPlans.where('dateKey').equals(testDate).toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].priorityIds).toEqual(['t2', 't3', 'custom:Review Slides']);
  });

  it('updates shutdownAt timestamp and reflection note upon shutdown completion', async () => {
    const plan: DailyPlan = {
      id: 'plan-shutdown-test',
      dateKey: testDate,
      priorityIds: ['t1'],
      createdAt: '2026-11-09T08:00:00.000Z',
    };
    await db.dailyPlans.add(plan);

    const shutdownTime = '2026-11-09T21:30:00.000Z';
    const note = 'Solid productivity day despite afternoon fatigue.';

    await db.dailyPlans.update(plan.id, {
      shutdownAt: shutdownTime,
      note,
    });

    const updated = await db.dailyPlans.get(plan.id);
    expect(updated?.shutdownAt).toBe(shutdownTime);
    expect(updated?.note).toBe(note);
  });

  it('rolls over unfinished tasks to tomorrow with forgiving isOverdueRolledOver wording', async () => {
    const tomorrow = addDaysToKey(testDate, 1);
    const task: Task = {
      id: 'task-rollover',
      title: 'Problem Set 4',
      dueDate: testDate,
      status: 'todo',
      priority: 'high',
      effort: 'large',
      contextTag: 'laptop',
      createdAt: '2026-11-08T00:00:00.000Z',
      updatedAt: '2026-11-08T00:00:00.000Z',
    };

    await db.tasks.add(task);

    // Roll over to tomorrow
    await db.tasks.update(task.id, {
      dueDate: tomorrow,
      isOverdueRolledOver: true,
      updatedAt: new Date().toISOString(),
    });

    const updatedTask = await db.tasks.get(task.id);
    expect(updatedTask?.dueDate).toBe('2026-11-10');
    expect(updatedTask?.isOverdueRolledOver).toBe(true);
  });

  it('awards small XP bonus for daily shutdown, enforces idempotency, and respects daily cap', async () => {
    // First award succeeds
    const firstAward = await awardDailyShutdownXp(testDate);
    expect(firstAward).toBe(true);

    const xpEarned = await getDailySourceXp('daily_shutdown', testDate);
    expect(xpEarned).toBe(25);

    // Second award on the same date is rejected idempotently
    const duplicateAward = await awardDailyShutdownXp(testDate);
    expect(duplicateAward).toBe(false);

    const xpAfterDuplicate = await getDailySourceXp('daily_shutdown', testDate);
    expect(xpAfterDuplicate).toBe(25);
  });

  it('includes dailyPlans in backup export, validation, and restore', async () => {
    const plan: DailyPlan = {
      id: 'plan-backup-1',
      dateKey: '2026-11-09',
      priorityIds: ['t1', 't2'],
      createdAt: '2026-11-09T07:45:00.000Z',
      shutdownAt: '2026-11-09T22:00:00.000Z',
      note: 'Backup verification plan',
    };
    await db.dailyPlans.add(plan);

    const jsonBackup = await exportDatabaseToJson();
    const parsed = JSON.parse(jsonBackup);

    expect(parsed.data.dailyPlans).toBeDefined();
    expect(parsed.data.dailyPlans).toHaveLength(1);
    expect(parsed.data.dailyPlans[0].id).toBe('plan-backup-1');

    // Clear and restore
    await db.dailyPlans.clear();
    expect(await db.dailyPlans.count()).toBe(0);

    const restoreRes = await restoreDatabaseFromJson(jsonBackup, 'replace');
    expect(restoreRes.success).toBe(true);

    const restoredPlans = await db.dailyPlans.toArray();
    expect(restoredPlans).toHaveLength(1);
    expect(restoredPlans[0].note).toBe('Backup verification plan');
  });
});
