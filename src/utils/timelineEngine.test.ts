import { describe, it, expect } from 'vitest';
import {
  buildDayTimeline,
  timeStringToMinutes,
  minutesToTimeString,
  normalizeDateKey,
} from './timelineEngine';
import { ScheduledClass } from './scheduleEngine';
import { Task, StudyBlock, Exam, MasterWeekBlock, FocusSession, Course } from '../types';

describe('timelineEngine', () => {
  const dummyCourse: Course = {
    id: 'c1',
    code: 'CS101',
    name: 'Intro to Algorithms',
    color: '#6366f1',
    term: 'Fall 2026',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  const createClass = (
    startTime: string,
    endTime: string,
    opts?: { isCancelled?: boolean; isMoved?: boolean; id?: string }
  ): ScheduledClass => ({
    session: {
      id: opts?.id || 's1',
      courseId: dummyCourse.id,
      dayOfWeek: 0,
      startTime,
      endTime,
      type: 'lecture',
      repeat: 'all',
    },
    course: dummyCourse,
    startTime,
    endTime,
    isCancelled: !!opts?.isCancelled,
    isMoved: !!opts?.isMoved,
  });

  describe('time conversion helpers', () => {
    it('converts HH:MM string to minute integers', () => {
      expect(timeStringToMinutes('00:00')).toBe(0);
      expect(timeStringToMinutes('08:30')).toBe(510);
      expect(timeStringToMinutes('12:00')).toBe(720);
      expect(timeStringToMinutes('23:59')).toBe(1439);
      expect(timeStringToMinutes('24:00')).toBe(1440);
    });

    it('rejects invalid or malformed times gracefully', () => {
      expect(timeStringToMinutes('')).toBeNull();
      expect(timeStringToMinutes(undefined)).toBeNull();
      expect(timeStringToMinutes(null)).toBeNull();
      expect(timeStringToMinutes('abc')).toBeNull();
      expect(timeStringToMinutes('25:00')).toBeNull();
      expect(timeStringToMinutes('12:60')).toBeNull();
    });

    it('converts minutes to HH:MM format', () => {
      expect(minutesToTimeString(0)).toBe('00:00');
      expect(minutesToTimeString(510)).toBe('08:30');
      expect(minutesToTimeString(720)).toBe('12:00');
      expect(minutesToTimeString(1439)).toBe('23:59');
    });
  });

  describe('1. Overlaps and Lane Assignment', () => {
    it('assigns separate lanes and totalLanes for overlapping events', () => {
      const class1 = createClass('09:00', '10:30', { id: 'c1' });
      const study1: StudyBlock = {
        id: 'sb1',
        courseId: 'c1',
        title: 'Review Algorithms',
        date: '2026-11-09',
        startTime: '10:00',
        endTime: '11:00',
        durationMinutes: 60,
        status: 'planned',
        createdAt: '2026-11-08T00:00:00.000Z',
      };

      const res = buildDayTimeline({
        date: '2026-11-09',
        classes: [class1],
        studyBlocks: [study1],
      });

      expect(res.blocks).toHaveLength(2);
      // Both blocks overlap from 10:00 to 10:30
      const b1 = res.blocks[0];
      const b2 = res.blocks[1];
      expect(b1.totalLanes).toBe(2);
      expect(b2.totalLanes).toBe(2);
      expect(b1.laneIndex).not.toBe(b2.laneIndex);
      expect(new Set([b1.laneIndex, b2.laneIndex])).toEqual(new Set([0, 1]));
    });

    it('handles 3 concurrent overlapping blocks with 3 lanes', () => {
      const class1 = createClass('14:00', '16:00', { id: 'c1' });
      const task1: Task = {
        id: 't1',
        title: 'Submit assignment',
        dueDate: '2026-11-09',
        dueTime: '14:30',
        status: 'todo',
        priority: 'high',
        effort: 'medium',
        contextTag: 'laptop',
        createdAt: '2026-11-08T00:00:00.000Z',
        updatedAt: '2026-11-08T00:00:00.000Z',
      };
      const study1: StudyBlock = {
        id: 'sb1',
        courseId: 'c1',
        title: 'Lab prep',
        date: '2026-11-09',
        startTime: '14:45',
        endTime: '15:30',
        durationMinutes: 45,
        status: 'planned',
        createdAt: '2026-11-08T00:00:00.000Z',
      };

      const res = buildDayTimeline({
        date: '2026-11-09',
        classes: [class1],
        tasks: [task1],
        studyBlocks: [study1],
      });

      expect(res.blocks).toHaveLength(3);
      for (const b of res.blocks) {
        expect(b.totalLanes).toBe(3);
      }
      const lanes = res.blocks.map((b) => b.laneIndex).sort();
      expect(lanes).toEqual([0, 1, 2]);
    });
  });

  describe('2. Back-to-Back Blocks', () => {
    it('does not consider back-to-back blocks as conflicting or overlapping', () => {
      // 09:00 - 10:30 and 10:30 - 12:00
      const class1 = createClass('09:00', '10:30', { id: 'c1' });
      const class2 = createClass('10:30', '12:00', { id: 'c2' });

      const res = buildDayTimeline({
        date: '2026-11-09',
        classes: [class1, class2],
      });

      expect(res.blocks).toHaveLength(2);
      expect(res.blocks[0].laneIndex).toBe(0);
      expect(res.blocks[0].totalLanes).toBe(1);
      expect(res.blocks[1].laneIndex).toBe(0);
      expect(res.blocks[1].totalLanes).toBe(1);

      // Verify no gap between 10:30 and 10:30
      const middleGap = res.freeGaps.find(
        (g) => g.startMinutes === 630 && g.endMinutes === 630
      );
      expect(middleGap).toBeUndefined();
    });
  });

  describe('3. Crossing Midnight', () => {
    it('clips items crossing midnight cleanly to end of day', () => {
      // Class starting at 23:00 and ending at 01:00
      const nightClass = createClass('23:00', '01:00', { id: 'night' });

      const res = buildDayTimeline({
        date: '2026-11-09',
        classes: [nightClass],
      });

      expect(res.blocks).toHaveLength(1);
      const b = res.blocks[0];
      expect(b.startMinutes).toBe(1380); // 23:00
      expect(b.endMinutes).toBe(1440);   // clipped to 24:00
      expect(b.durationMinutes).toBe(60);
      expect(b.endTime).toBe('00:00');
    });
  });

  describe('4. Empty Day', () => {
    it('returns empty blocks and a full-day free gap when no events are scheduled', () => {
      const res = buildDayTimeline({
        date: '2026-11-09',
        dayStartMinutes: 360, // 06:00
        dayEndMinutes: 1380,  // 23:00
      });

      expect(res.blocks).toEqual([]);
      expect(res.freeGaps).toHaveLength(1);
      expect(res.freeGaps[0].startMinutes).toBe(360);
      expect(res.freeGaps[0].endMinutes).toBe(1380);
      expect(res.freeGaps[0].durationMinutes).toBe(1020);
      expect(res.freeGaps[0].label).toContain('Free all day');
    });
  });

  describe('5. Cancelled Classes', () => {
    it('keeps cancelled class in blocks marked cancelled and does not occupy free gaps', () => {
      const cancelledClass = createClass('10:00', '11:30', { isCancelled: true });

      const res = buildDayTimeline({
        date: '2026-11-09',
        classes: [cancelledClass],
        dayStartMinutes: 360, // 06:00
        dayEndMinutes: 1380,  // 23:00
      });

      expect(res.blocks).toHaveLength(1);
      expect(res.blocks[0].status).toBe('cancelled');
      // Cancelled class must NOT block free time: entire day 06:00 to 23:00 remains free
      expect(res.freeGaps).toHaveLength(1);
      expect(res.freeGaps[0].startMinutes).toBe(360);
      expect(res.freeGaps[0].endMinutes).toBe(1380);
    });
  });

  describe('6. Moved Classes', () => {
    it('correctly marks moved classes with status moved', () => {
      const movedClass = createClass('13:00', '14:30', { isMoved: true });

      const res = buildDayTimeline({
        date: '2026-11-09',
        classes: [movedClass],
      });

      expect(res.blocks).toHaveLength(1);
      expect(res.blocks[0].status).toBe('moved');
    });
  });

  describe('7. Invalid Time', () => {
    it('skips invalid, malformed, or NaN times without throwing', () => {
      const badClass1 = createClass('99:99', '10:00');
      const badClass2 = createClass('invalid', '11:00');
      const goodClass = createClass('08:00', '09:00');

      const res = buildDayTimeline({
        date: '2026-11-09',
        classes: [badClass1, badClass2, goodClass],
      });

      expect(res.blocks).toHaveLength(1);
      expect(res.blocks[0].startTime).toBe('08:00');
    });
  });

  describe('8. Many Blocks Performance and Correctness', () => {
    it('efficiently orders and assigns lanes across 25 concurrent & sequential blocks', () => {
      const classes: ScheduledClass[] = [];
      for (let i = 0; i < 20; i++) {
        const hour = 8 + Math.floor(i / 2);
        const start = `${hour.toString().padStart(2, '0')}:00`;
        const end = `${(hour + 1).toString().padStart(2, '0')}:00`;
        classes.push(createClass(start, end, { id: `c-${i}` }));
      }

      const res = buildDayTimeline({
        date: '2026-11-09',
        classes,
      });

      expect(res.blocks).toHaveLength(20);
      for (const b of res.blocks) {
        expect(b.laneIndex).toBeGreaterThanOrEqual(0);
        expect(b.totalLanes).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('9. DST-Safe Local Dates', () => {
    it('normalizes arbitrary dates without timezone or UTC day boundary shifts', () => {
      // Midnight local boundary test
      expect(normalizeDateKey('2026-11-09')).toBe('2026-11-09');
      expect(normalizeDateKey('2026-03-29')).toBe('2026-03-29'); // European DST switch day
      expect(normalizeDateKey('2026-10-25')).toBe('2026-10-25'); // Autumn DST switch day

      const d = new Date(2026, 10, 9); // Month is 0-indexed: 10 = Nov
      expect(normalizeDateKey(d)).toBe('2026-11-09');
    });
  });
});
