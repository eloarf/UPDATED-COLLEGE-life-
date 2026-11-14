import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db/db';
import {
  awardXp,
  reverseXp,
  awardDailyShutdownXp,
  awardDailyPlanXp,
  getDailySourceXp,
  getDailySourceProgress,
  calculateLevelFromTotalXp,
} from './rpgService';

describe('rpgService - XP Fairness & Daily Rituals', () => {
  beforeEach(async () => {
    await db.xpEvents.clear();
  });

  it('awards XP idempotently: duplicate award returns false and does not double XP', () => {
    return (async () => {
      const res1 = await awardXp({
        source: 'task_complete',
        sourceId: 'task-101',
        amount: 30,
        stat: 'knowledge',
        dayKey: '2026-11-09',
      });
      expect(res1).toBe(true);

      // Duplicate attempt with identical source and sourceId
      const res2 = await awardXp({
        source: 'task_complete',
        sourceId: 'task-101',
        amount: 30,
        stat: 'knowledge',
        dayKey: '2026-11-09',
      });
      expect(res2).toBe(false);

      const events = await db.xpEvents.toArray();
      expect(events).toHaveLength(1);
      expect(events[0].amount).toBe(30);
    })();
  });

  it('enforces daily cap per XP source', () => {
    return (async () => {
      // Habit complete cap is 150 (soft threshold 100)
      // Award 50 x 2 = 100
      await awardXp({ source: 'habit_complete', sourceId: 'h1', amount: 50, stat: 'discipline', dayKey: '2026-11-09' });
      await awardXp({ source: 'habit_complete', sourceId: 'h2', amount: 50, stat: 'discipline', dayKey: '2026-11-09' });

      // Past soft threshold (100): next 50 gets diminished to 25
      const res3 = await awardXp({ source: 'habit_complete', sourceId: 'h3', amount: 50, stat: 'discipline', dayKey: '2026-11-09' });
      expect(res3).toBe(true);

      const totalAfter3 = await getDailySourceXp('habit_complete', '2026-11-09');
      expect(totalAfter3).toBe(125); // 100 + 25

      // Next award: remaining room is 150 - 125 = 25
      const res4 = await awardXp({ source: 'habit_complete', sourceId: 'h4', amount: 50, stat: 'discipline', dayKey: '2026-11-09' });
      expect(res4).toBe(true);
      const totalAfter4 = await getDailySourceXp('habit_complete', '2026-11-09');
      expect(totalAfter4).toBe(150); // Capped at exactly 150

      // Now at cap (150): subsequent award must be rejected (false)
      const res5 = await awardXp({ source: 'habit_complete', sourceId: 'h5', amount: 50, stat: 'discipline', dayKey: '2026-11-09' });
      expect(res5).toBe(false);

      const progress = await getDailySourceProgress('habit_complete', '2026-11-09');
      expect(progress.isCapped).toBe(true);
      expect(progress.earned).toBe(150);
      expect(progress.cap).toBe(150);
      expect(progress.percent).toBe(100);
    })();
  });

  it('supports reversal after reaching cap, restoring cap room', () => {
    return (async () => {
      await awardXp({ source: 'daily_plan', sourceId: 'plan-2026-11-09', amount: 35, stat: 'knowledge', dayKey: '2026-11-09' });
      let earned = await getDailySourceXp('daily_plan', '2026-11-09');
      expect(earned).toBe(35);

      // Reversing frees up the room
      const reversed = await reverseXp('daily_plan', 'plan-2026-11-09');
      expect(reversed).toBe(true);

      earned = await getDailySourceXp('daily_plan', '2026-11-09');
      expect(earned).toBe(0);

      // Can now award again
      const reAward = await awardXp({ source: 'daily_plan', sourceId: 'plan-2026-11-09-new', amount: 20, stat: 'knowledge', dayKey: '2026-11-09' });
      expect(reAward).toBe(true);
      expect(await getDailySourceXp('daily_plan', '2026-11-09')).toBe(20);
    })();
  });

  it('resets cap across midnight rollover (different dayKey)', () => {
    return (async () => {
      // Day 1 fills cap (daily_shutdown cap = 35)
      await awardXp({ source: 'daily_shutdown', sourceId: 'shutdown-day1', amount: 35, stat: 'discipline', dayKey: '2026-11-09' });
      expect(await getDailySourceXp('daily_shutdown', '2026-11-09')).toBe(35);

      // Day 1 rejects further awards
      expect(await awardXp({ source: 'daily_shutdown', sourceId: 'extra-day1', amount: 10, stat: 'discipline', dayKey: '2026-11-09' })).toBe(false);

      // Day 2 has fresh cap room!
      const day2Award = await awardXp({ source: 'daily_shutdown', sourceId: 'shutdown-day2', amount: 25, stat: 'discipline', dayKey: '2026-11-10' });
      expect(day2Award).toBe(true);
      expect(await getDailySourceXp('daily_shutdown', '2026-11-10')).toBe(25);
    })();
  });

  it('awards daily shutdown and plan rituals correctly', () => {
    return (async () => {
      const planRes = await awardDailyPlanXp('2026-11-09');
      expect(planRes).toBe(true);

      const shutRes = await awardDailyShutdownXp('2026-11-09');
      expect(shutRes).toBe(true);

      // Repeating either on the same day returns false (idempotent)
      expect(await awardDailyPlanXp('2026-11-09')).toBe(false);
      expect(await awardDailyShutdownXp('2026-11-09')).toBe(false);
    })();
  });

  it('calculates level progression stably and monotonically from total XP', () => {
    const l1 = calculateLevelFromTotalXp(0);
    expect(l1.level).toBe(1);
    expect(l1.progressPercent).toBe(0);

    const l2 = calculateLevelFromTotalXp(120);
    expect(l2.level).toBeGreaterThanOrEqual(2);
    expect(l2.totalXp).toBe(120);
  });

  it('shares daily caps across normalized source aliases while preserving reversal', async () => {
    // 'task' and 'task_complete' both count against the 300 XP task cap
    await awardXp({
      source: 'task',
      sourceId: 't-big-1',
      amount: 300,
      stat: 'discipline',
      dayKey: '2026-11-11',
    });

    const cappedSecond = await awardXp({
      source: 'task_complete',
      sourceId: 't-big-2',
      amount: 30,
      stat: 'discipline',
      dayKey: '2026-11-11',
    });
    expect(cappedSecond).toBe(false);

    // Reversal removes the event cleanly using its stored source string
    const reversed = await reverseXp('task', 't-big-1');
    expect(reversed).toBe(true);

    const afterReversal = await awardXp({
      source: 'task_complete',
      sourceId: 't-big-2',
      amount: 30,
      stat: 'discipline',
      dayKey: '2026-11-11',
    });
    expect(afterReversal).toBe(true);
  });
});
