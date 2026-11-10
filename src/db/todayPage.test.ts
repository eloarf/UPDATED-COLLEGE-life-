import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import { generateId } from '../utils/idGenerator';
import { addDaysToKey, getTodayKey } from '../utils/dateUtils';
import { awardDailyPlanXp, awardDailyShutdownXp } from '../services/rpgService';
import { DailyPlan, Task } from '../types';

describe('Today & Daily Rituals (Plan My Day & Shutdown)', () => {
  beforeEach(async () => {
    await db.dailyPlans.clear();
    await db.tasks.clear();
    await db.xpEvents.clear();
  });

  it('saves and retrieves dailyPlans by dateKey', async () => {
    const todayKey = '2026-11-09';
    const plan: DailyPlan = {
      id: generateId(),
      dateKey: todayKey,
      priorityIds: ['task-1', 'task-2'],
      note: 'Focus on algorithms and database design',
      createdAt: new Date().toISOString(),
    };

    await db.dailyPlans.put(plan);

    const fetched = await db.dailyPlans.where('dateKey').equals(todayKey).first();
    expect(fetched).toBeDefined();
    expect(fetched?.priorityIds).toEqual(['task-1', 'task-2']);
    expect(fetched?.note).toBe('Focus on algorithms and database design');
  });

  it('saving plan again for the same date replaces the record without duplication', async () => {
    const todayKey = '2026-11-09';
    const plan1: DailyPlan = {
      id: 'plan-day-1',
      dateKey: todayKey,
      priorityIds: ['task-1'],
      createdAt: '2026-11-09T08:00:00.000Z',
    };
    await db.dailyPlans.put(plan1);

    // Save again with new priorities
    const plan2: DailyPlan = {
      id: 'plan-day-1',
      dateKey: todayKey,
      priorityIds: ['task-1', 'task-3'],
      note: 'Updated plan',
      createdAt: '2026-11-09T08:00:00.000Z',
    };
    await db.dailyPlans.put(plan2);

    const allForDate = await db.dailyPlans.where('dateKey').equals(todayKey).toArray();
    expect(allForDate).toHaveLength(1);
    expect(allForDate[0].priorityIds).toEqual(['task-1', 'task-3']);
    expect(allForDate[0].note).toBe('Updated plan');
  });

  it('records evening shutdown timestamp and awards +25 XP bonus', async () => {
    const todayKey = '2026-11-09';
    const plan: DailyPlan = {
      id: 'plan-day-1',
      dateKey: todayKey,
      priorityIds: ['task-1'],
      createdAt: '2026-11-09T08:00:00.000Z',
    };
    await db.dailyPlans.put(plan);

    // Perform shutdown
    const shutdownTime = new Date().toISOString();
    await db.dailyPlans.update('plan-day-1', {
      shutdownAt: shutdownTime,
      note: 'Great progress today, ready for good rest',
    });

    const awarded = await awardDailyShutdownXp(todayKey);
    expect(awarded).toBe(true);

    const updatedPlan = await db.dailyPlans.get('plan-day-1');
    expect(updatedPlan?.shutdownAt).toBe(shutdownTime);
    expect(updatedPlan?.note).toBe('Great progress today, ready for good rest');

    const xpEvents = await db.xpEvents.where('source').equals('daily_shutdown').toArray();
    expect(xpEvents).toHaveLength(1);
    expect(xpEvents[0].amount).toBe(25);
    expect(xpEvents[0].stat).toBe('discipline');
  });

  it('rolls over unfinished tasks to tomorrow with forgiving status', async () => {
    const todayKey = '2026-11-09';
    const tomorrowKey = addDaysToKey(todayKey, 1);

    const task: Task = {
      id: 'task-rollover',
      title: 'Lab Report Drafting',
      dueDate: todayKey,
      status: 'todo',
      priority: 'high',
      effort: 'medium',
      contextTag: 'laptop',
      createdAt: '2026-11-08T00:00:00.000Z',
      updatedAt: '2026-11-08T00:00:00.000Z',
    };
    await db.tasks.add(task);

    // Roll over to tomorrow
    await db.tasks.update(task.id, {
      dueDate: tomorrowKey,
      isOverdueRolledOver: true,
      updatedAt: new Date().toISOString(),
    });

    const rolled = await db.tasks.get('task-rollover');
    expect(rolled?.dueDate).toBe(tomorrowKey);
    expect(rolled?.isOverdueRolledOver).toBe(true);
    expect(rolled?.status).toBe('todo');
  });
});
