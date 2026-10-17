import { describe, it, expect } from 'vitest';
import {
  timesOverlap,
  isValidTime,
  getSemesterWeekNumber,
  findConflicts,
  getClassesForDate,
  getNextClass,
} from './scheduleEngine';
import { Course, ClassSession, ClassException, Semester } from '../types';

describe('scheduleEngine', () => {
  it('validates times properly and checks overlaps', () => {
    expect(isValidTime('08:30')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
    expect(isValidTime('25:00')).toBe(false);
    expect(isValidTime('invalid')).toBe(false);

    // Overlapping times
    expect(timesOverlap('08:30', '10:20', '09:00', '11:00')).toBe(true);
    expect(timesOverlap('08:30', '10:20', '08:00', '09:00')).toBe(true);

    // Back-to-back classes do NOT overlap
    expect(timesOverlap('08:30', '10:20', '10:20', '12:20')).toBe(false);
    expect(timesOverlap('10:20', '12:20', '08:30', '10:20')).toBe(false);
  });

  it('calculates semester week numbers relative to semester start', () => {
    // Suppose semester starts on Monday 2026-10-12
    const semStart = '2026-10-12';
    expect(getSemesterWeekNumber('2026-10-12', semStart)).toBe(1);
    expect(getSemesterWeekNumber('2026-10-16', semStart)).toBe(1); // Friday same week
    expect(getSemesterWeekNumber('2026-10-18', semStart)).toBe(1); // Sunday same week
    expect(getSemesterWeekNumber('2026-10-19', semStart)).toBe(2); // Next Monday is Week 2
    expect(getSemesterWeekNumber('2026-10-26', semStart)).toBe(3); // Week 3
  });

  it('finds conflicts between overlapping sessions with repeat rules', () => {
    const course: Course = {
      id: 'c1',
      code: 'MATH1007',
      name: 'Mathematics',
      color: '#0D9488',
      term: 'Year 1 - Semester I',
      createdAt: '',
      updatedAt: '',
    };

    const existingSessions: ClassSession[] = [
      {
        id: 's1',
        courseId: 'c1',
        dayOfWeek: 0, // Monday
        startTime: '08:30',
        endTime: '10:20',
        type: 'lecture',
        repeat: 'all',
      },
    ];

    // Conflict on same day and overlapping time
    const conflicts = findConflicts(
      {
        dayOfWeek: 0,
        startTime: '09:00',
        endTime: '10:00',
        repeat: 'all',
      },
      existingSessions,
      [course]
    );
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].existingSession.id).toBe('s1');

    // No conflict on different day
    const noConflictDay = findConflicts(
      {
        dayOfWeek: 1, // Tuesday
        startTime: '08:30',
        endTime: '10:20',
        repeat: 'all',
      },
      existingSessions,
      [course]
    );
    expect(noConflictDay.length).toBe(0);

    // No conflict when excluding own session during edit
    const noConflictSelf = findConflicts(
      {
        dayOfWeek: 0,
        startTime: '08:30',
        endTime: '10:20',
        repeat: 'all',
        excludeSessionId: 's1',
      },
      existingSessions,
      [course]
    );
    expect(noConflictSelf.length).toBe(0);
  });

  it('applies repeat rules (odd/even) and class exceptions (cancelled/moved)', () => {
    const course: Course = {
      id: 'c1',
      code: 'PSYC1011',
      name: 'General Psychology',
      color: '#4F46E5',
      term: 'Year 1 - Semester I',
      createdAt: '',
      updatedAt: '',
    };

    const semester: Semester = {
      id: 'sem1',
      name: 'Year 1 - Semester I',
      startDate: '2026-10-12', // Monday Week 1
      endDate: '2027-02-15',
      isActive: true,
    };

    const sessions: ClassSession[] = [
      {
        id: 's1',
        courseId: 'c1',
        dayOfWeek: 0, // Monday
        startTime: '08:30',
        endTime: '10:20',
        type: 'lecture',
        room: 'B59-2-006',
        building: 'B59',
        repeat: 'odd', // Only on odd weeks (1, 3, 5...)
      },
    ];

    // Week 1 (Monday 2026-10-12) -> should show up
    const week1Classes = getClassesForDate('2026-10-12', sessions, [], semester, [course]);
    expect(week1Classes.length).toBe(1);
    expect(week1Classes[0].startTime).toBe('08:30');
    expect(week1Classes[0].isCancelled).toBe(false);

    // Week 2 (Monday 2026-10-19) -> even week, should NOT show up
    const week2Classes = getClassesForDate('2026-10-19', sessions, [], semester, [course]);
    expect(week2Classes.length).toBe(0);

    // Apply exception: Cancelled on 2026-10-12
    const cancelException: ClassException = {
      id: 'ex1',
      sessionId: 's1',
      date: '2026-10-12',
      action: 'cancelled',
      reason: 'Teacher postponed',
    };
    const cancelledResults = getClassesForDate(
      '2026-10-12',
      sessions,
      [cancelException],
      semester,
      [course]
    );
    expect(cancelledResults.length).toBe(1);
    expect(cancelledResults[0].isCancelled).toBe(true);

    // Apply exception: Moved time & room on 2026-10-12
    const moveException: ClassException = {
      id: 'ex2',
      sessionId: 's1',
      date: '2026-10-12',
      action: 'moved',
      newStartTime: '11:00',
      newEndTime: '12:50',
      newRoom: 'B59-1-008',
    };
    const movedResults = getClassesForDate(
      '2026-10-12',
      sessions,
      [moveException],
      semester,
      [course]
    );
    expect(movedResults.length).toBe(1);
    expect(movedResults[0].isMoved).toBe(true);
    expect(movedResults[0].startTime).toBe('11:00');
    expect(movedResults[0].endTime).toBe('12:50');
    expect(movedResults[0].room).toBe('B59-1-008');
  });
});
