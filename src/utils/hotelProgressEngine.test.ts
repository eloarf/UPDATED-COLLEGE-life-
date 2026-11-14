import { describe, it, expect } from 'vitest';
import { deriveHotelProgress } from './hotelProgressEngine';
import { HabitLog, RestDay, XpEvent, FocusSession, Task } from '../types';

describe('hotelProgressEngine (Derived Grand Hotel Progress)', () => {
  it('starts calmly on Floor 1 with zero records and never fails', () => {
    const progress = deriveHotelProgress({});
    expect(progress.consistentDays).toBe(0);
    expect(progress.unlockedCount).toBe(0);
    expect(progress.currentWing.floor).toBe(1);
    expect(progress.nextWing?.requiredDays).toBe(1);
  });

  it('counts minimum-version habit logs and rest tokens as consistent days', () => {
    const habitLogs: HabitLog[] = [
      { id: 'l1', habitId: 'h1', date: '2026-10-12', count: 1, isPartial: false },
      // Minimum-version day
      { id: 'l2', habitId: 'h1', date: '2026-10-13', count: 0, isPartial: true },
    ];
    const restDays: RestDay[] = [
      // Protected rest-token day
      { id: 'r1', habitId: 'h1', dateKey: '2026-10-14', createdAt: '' },
    ];
    const xpEvents: XpEvent[] = [
      { id: 'x1', source: 'habit', sourceId: 's1', amount: 60, stat: 'discipline', dayKey: '2026-10-12', timestamp: '' },
    ];

    const progress = deriveHotelProgress({ habitLogs, restDays, xpEvents });
    expect(progress.consistentDays).toBe(3);
    expect(progress.habitDays).toBe(2);
    expect(progress.restTokenDays).toBe(1);
    // Floor 1 (1d, 0 XP) + Floor 2 (3d, 50 XP) unlocked
    expect(progress.unlockedCount).toBe(2);
    expect(progress.currentWing.id).toBe('pastry-parlor');
  });

  it('derives progress from focus sessions and completed tasks and never loses rooms on missed days', () => {
    const focusSessions: FocusSession[] = [
      { id: 'f1', minutesFocused: 45, mode: '45/10', startedAt: '2026-10-10T09:00:00', completedAt: '2026-10-10T09:45:00' },
      { id: 'f2', minutesFocused: 25, mode: '25/5', startedAt: '2026-10-11T09:00:00', completedAt: '2026-10-11T09:25:00' },
    ];
    const tasks: Task[] = [
      {
        id: 't1',
        title: 'Problem set',
        effort: 'medium',
        priority: 'medium',
        status: 'done',
        contextTag: 'laptop',
        completedAt: '2026-10-12T18:00:00Z',
        createdAt: '',
        updatedAt: '',
      },
    ];
    const xpEvents: XpEvent[] = [
      { id: 'x1', source: 'focus', sourceId: 'f1', amount: 80, stat: 'knowledge', dayKey: '2026-10-10', timestamp: '' },
    ];

    const progressDay12 = deriveHotelProgress({ focusSessions, tasks, xpEvents });
    expect(progressDay12.consistentDays).toBe(3);
    expect(progressDay12.unlockedCount).toBe(2);

    // Passing time without new events never decreases unlocked wings
    const progressWeeksLater = deriveHotelProgress({ focusSessions, tasks, xpEvents });
    expect(progressWeeksLater.unlockedCount).toBe(progressDay12.unlockedCount);
    expect(progressWeeksLater.consistentDays).toBe(progressDay12.consistentDays);
  });
});
