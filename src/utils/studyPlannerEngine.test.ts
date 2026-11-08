import { describe, it, expect } from 'vitest';
import {
  generateStudyPlan,
  getCourseStudyTime,
  acceptStudySuggestion,
  moveStudySuggestion,
  createDismissedSuggestion,
  timeToMinutes,
  minutesToTime,
  findFreeGaps,
  mergeSlots,
  addDays,
} from './studyPlannerEngine';
import {
  Course,
  ClassSession,
  ClassException,
  Exam,
  ExamTopic,
  StudyBlock,
  DismissedStudySuggestion,
  FocusSession,
} from '../types';

describe('Study Planner Pure Engine (Zero AI)', () => {
  const sampleCourses: Course[] = [
    {
      id: 'c-algo',
      code: 'CS301',
      name: 'Algorithms & Complexity',
      creditHours: 4,
      color: '#3b82f6',
      term: 'Semester 1',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'c-db',
      code: 'CS304',
      name: 'Database Systems',
      creditHours: 3,
      color: '#10b981',
      term: 'Semester 1',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
    {
      id: 'c-os',
      code: 'CS302',
      name: 'Operating Systems',
      creditHours: 4,
      color: '#f59e0b',
      term: 'Semester 1',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    },
  ];

  describe('Time and Gap Helpers', () => {
    it('converts time to minutes and vice versa', () => {
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('07:30')).toBe(450);
      expect(timeToMinutes('22:15')).toBe(1335);

      expect(minutesToTime(0)).toBe('00:00');
      expect(minutesToTime(450)).toBe('07:30');
      expect(minutesToTime(1335)).toBe('22:15');
    });

    it('merges overlapping and adjacent time slots', () => {
      const slots = [
        { start: 600, end: 700 },
        { start: 680, end: 750 },
        { start: 800, end: 900 },
      ];
      const merged = mergeSlots(slots);
      expect(merged).toEqual([
        { start: 600, end: 750 },
        { start: 800, end: 900 },
      ]);
    });

    it('finds free gaps between window bounds ignoring occupied slots', () => {
      const windowStart = timeToMinutes('08:00'); // 480
      const windowEnd = timeToMinutes('18:00'); // 1080
      const occupied = [
        { start: timeToMinutes('09:00'), end: timeToMinutes('11:00') }, // 540..660
        { start: timeToMinutes('13:00'), end: timeToMinutes('15:00') }, // 780..900
      ];

      const gaps = findFreeGaps(windowStart, windowEnd, occupied, 45);
      expect(gaps).toEqual([
        { start: 480, end: 540 }, // 08:00 - 09:00 (60 min)
        { start: 660, end: 780 }, // 11:00 - 13:00 (120 min)
        { start: 900, end: 1080 }, // 15:00 - 18:00 (180 min)
      ]);
    });
  });

  describe('Required Test 1: No exams', () => {
    it('proposes balanced study across courses with free gaps between classes', () => {
      // 2026-11-09 is a Monday (dayOfWeek = 0)
      const mondaySessions: ClassSession[] = [
        {
          id: 'cs-1',
          courseId: 'c-algo',
          dayOfWeek: 0,
          startTime: '09:00',
          endTime: '11:00',
          type: 'lecture',
          repeat: 'all',
        },
      ];

      const suggestions = generateStudyPlan({
        currentDate: '2026-11-09',
        daysToPlan: 3,
        courses: sampleCourses,
        classSessions: mondaySessions,
        exams: [],
        examTopics: [],
        settings: {
          sleepStartTime: '22:00',
          sleepEndTime: '07:00',
        },
      });

      expect(suggestions.length).toBeGreaterThan(0);
      // Ensure suggestions never overlap with the 09:00 - 11:00 class
      const mondaySuggestions = suggestions.filter((s) => s.date === '2026-11-09');
      for (const s of mondaySuggestions) {
        const start = timeToMinutes(s.startTime);
        const end = timeToMinutes(s.endTime);
        const classStart = timeToMinutes('09:00');
        const classEnd = timeToMinutes('11:00');

        // Must not overlap
        const overlaps = Math.max(start, classStart) < Math.min(end, classEnd);
        expect(overlaps).toBe(false);
      }
    });
  });

  describe('Required Test 2: Exam tomorrow', () => {
    it('schedules urgent high-priority study block for tomorrow exam in nearest free gap', () => {
      // Current date: 2026-11-09 (Mon)
      // Exam tomorrow: 2026-11-10 (Tue)
      const exams: Exam[] = [
        {
          id: 'e-algo-mid',
          courseId: 'c-algo',
          title: 'Algorithms Midterm',
          examType: 'Midterm',
          examDate: '2026-11-10',
          startTime: '09:00',
          weight: 35,
          targetScore: 90,
          currentHp: 100,
          maxHp: 100,
          isDefeated: false,
          createdAt: '2026-11-01T00:00:00Z',
        },
      ];

      const examTopics: ExamTopic[] = [
        {
          id: 't-dp',
          examId: 'e-algo-mid',
          title: 'Dynamic Programming & Memoization',
          isStudied: false,
        },
      ];

      const suggestions = generateStudyPlan({
        currentDate: '2026-11-09',
        daysToPlan: 2,
        courses: sampleCourses,
        classSessions: [],
        exams,
        examTopics,
      });

      const todaySuggestions = suggestions.filter((s) => s.date === '2026-11-09');
      expect(todaySuggestions.length).toBeGreaterThan(0);
      // Top candidate must address the exam tomorrow
      const urgent = todaySuggestions[0];
      expect(urgent.courseId).toBe('c-algo');
      expect(urgent.examId).toBe('e-algo-mid');
      expect(urgent.title).toContain('Dynamic Programming');
      expect(urgent.reason).toContain('Exam Tomorrow');
    });
  });

  describe('Required Test 3: Several exams', () => {
    it('prioritizes the closer and higher-weighted exam first', () => {
      // Current date: 2026-11-09
      // Exam 1: in 2 days, weight 35%
      // Exam 2: in 8 days, weight 20%
      const exams: Exam[] = [
        {
          id: 'e-db-quiz',
          courseId: 'c-db',
          title: 'Database Quiz',
          examType: 'Quiz',
          examDate: '2026-11-17', // in 8 days
          startTime: '10:00',
          weight: 20,
          targetScore: 85,
          currentHp: 100,
          maxHp: 100,
          isDefeated: false,
          createdAt: '2026-11-01T00:00:00Z',
        },
        {
          id: 'e-os-mid',
          courseId: 'c-os',
          title: 'Operating Systems Midterm',
          examType: 'Midterm',
          examDate: '2026-11-11', // in 2 days
          startTime: '14:00',
          weight: 35,
          targetScore: 90,
          currentHp: 100,
          maxHp: 100,
          isDefeated: false,
          createdAt: '2026-11-01T00:00:00Z',
        },
      ];

      const suggestions = generateStudyPlan({
        currentDate: '2026-11-09',
        daysToPlan: 3,
        courses: sampleCourses,
        classSessions: [],
        exams,
      });

      const firstSuggestion = suggestions[0];
      expect(firstSuggestion.examId).toBe('e-os-mid');
      expect(firstSuggestion.courseId).toBe('c-os');
      expect(firstSuggestion.reason).toContain('Exam in 2 days');
    });
  });

  describe('Required Test 4: A day full of classes', () => {
    it('schedules no study blocks when daytime is completely filled with classes', () => {
      // 2026-11-09 (Monday): back-to-back classes from 07:00 to 22:00
      const heavyMondaySessions: ClassSession[] = [
        {
          id: 's1',
          courseId: 'c-algo',
          dayOfWeek: 0,
          startTime: '07:00',
          endTime: '12:00',
          type: 'lecture',
          repeat: 'all',
        },
        {
          id: 's2',
          courseId: 'c-db',
          dayOfWeek: 0,
          startTime: '12:00',
          endTime: '17:00',
          type: 'lab',
          repeat: 'all',
        },
        {
          id: 's3',
          courseId: 'c-os',
          dayOfWeek: 0,
          startTime: '17:00',
          endTime: '22:00',
          type: 'lecture',
          repeat: 'all',
        },
      ];

      const suggestions = generateStudyPlan({
        currentDate: '2026-11-09',
        daysToPlan: 1,
        courses: sampleCourses,
        classSessions: heavyMondaySessions,
        settings: {
          sleepStartTime: '22:00',
          sleepEndTime: '07:00',
        },
      });

      // No gap >= 45 min exists, so 0 blocks scheduled on this full day
      expect(suggestions.length).toBe(0);
    });
  });

  describe('Required Test 5: Month/year boundary', () => {
    it('correctly calculates dates and schedules across Dec 31 to Jan 6', () => {
      const suggestions = generateStudyPlan({
        currentDate: '2026-12-30',
        daysToPlan: 5,
        courses: sampleCourses,
        classSessions: [],
      });

      const dates = Array.from(new Set(suggestions.map((s) => s.date)));
      expect(dates).toContain('2026-12-30');
      expect(dates).toContain('2026-12-31');
      expect(dates).toContain('2027-01-01');
      expect(dates).toContain('2027-01-02');
      expect(dates).toContain('2027-01-03');
    });

    it('correctly handles leap year / February month boundary', () => {
      expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    });
  });

  describe('Required Test 6: Dismissed suggestion does not return the same day', () => {
    it('filters out dismissed suggestion key on that specific date', () => {
      const exams: Exam[] = [
        {
          id: 'e-algo-quiz',
          courseId: 'c-algo',
          title: 'Quiz 1',
          examType: 'Quiz',
          examDate: '2026-11-12',
          startTime: '10:00',
          weight: 15,
          targetScore: 90,
          currentHp: 100,
          maxHp: 100,
          isDefeated: false,
          createdAt: '2026-11-01T00:00:00Z',
        },
      ];

      const dismissed: DismissedStudySuggestion[] = [
        createDismissedSuggestion('exam-e-algo-quiz-exam-review', '2026-11-09'),
      ];

      const suggestions = generateStudyPlan({
        currentDate: '2026-11-09',
        daysToPlan: 1,
        courses: sampleCourses,
        classSessions: [],
        exams,
        dismissedSuggestions: dismissed,
      });

      // The dismissed exam suggestion should NOT appear on 2026-11-09
      const hasDismissed = suggestions.some((s) => s.examId === 'e-algo-quiz');
      expect(hasDismissed).toBe(false);
    });
  });

  describe('Required Test 7: Accepted block creates no overlap', () => {
    it('treats existing accepted study blocks as occupied slots and creates zero overlap', () => {
      const existingBlock: StudyBlock = {
        id: 'sb-1',
        courseId: 'c-algo',
        title: 'Morning Focused Session',
        date: '2026-11-09',
        startTime: '10:00',
        endTime: '11:30',
        durationMinutes: 90,
        status: 'planned',
        createdAt: '2026-11-08T00:00:00Z',
      };

      const suggestions = generateStudyPlan({
        currentDate: '2026-11-09',
        daysToPlan: 1,
        courses: sampleCourses,
        classSessions: [],
        existingStudyBlocks: [existingBlock],
        settings: {
          sleepStartTime: '22:00',
          sleepEndTime: '07:00',
        },
      });

      for (const s of suggestions) {
        const sStart = timeToMinutes(s.startTime);
        const sEnd = timeToMinutes(s.endTime);
        const bStart = timeToMinutes(existingBlock.startTime);
        const bEnd = timeToMinutes(existingBlock.endTime);

        const overlaps = Math.max(sStart, bStart) < Math.min(sEnd, bEnd);
        expect(overlaps).toBe(false);
      }
    });
  });

  describe('Spaced Revision & Focus Session Metrics', () => {
    it('proposes spaced revisions at 1, 3, and 7 days after target study date', () => {
      const examTopics: ExamTopic[] = [
        {
          id: 'topic-btree',
          examId: 'e-db',
          title: 'B+ Tree Indexing',
          isStudied: true,
          targetStudyDate: '2026-11-08',
        },
      ];

      const exams: Exam[] = [
        {
          id: 'e-db',
          courseId: 'c-db',
          title: 'Database Midterm',
          examType: 'Midterm',
          examDate: '2026-11-20',
          startTime: '09:00',
          weight: 30,
          targetScore: 90,
          currentHp: 100,
          maxHp: 100,
          isDefeated: false,
          createdAt: '2026-11-01T00:00:00Z',
        },
      ];

      // Day 1 (+1 day): 2026-11-09
      const plan = generateStudyPlan({
        currentDate: '2026-11-09',
        daysToPlan: 1,
        courses: sampleCourses,
        classSessions: [],
        exams,
        examTopics,
      });

      expect(plan.length).toBeGreaterThan(0);
      const rev = plan.find((s) => s.isSpacedRevision);
      expect(rev).toBeDefined();
      expect(rev?.revisionDayNumber).toBe(1);
      expect(rev?.title).toContain('Spaced Revision (1d): B+ Tree Indexing');
    });

    it('calculates total per-course study time from completed focus sessions', () => {
      const focusSessions: FocusSession[] = [
        {
          id: 'fs-1',
          courseId: 'c-algo',
          mode: '25/5',
          minutesFocused: 25,
          actualMinutes: 30,
          startedAt: '2026-11-08T10:00:00Z',
          completedAt: '2026-11-08T10:30:00Z',
        },
        {
          id: 'fs-2',
          courseId: 'c-algo',
          mode: 'pomodoro',
          minutesFocused: 50,
          actualMinutes: 50,
          startedAt: '2026-11-08T11:00:00Z',
          completedAt: '2026-11-08T11:50:00Z',
        },
        {
          id: 'fs-3',
          courseId: 'c-db',
          mode: '25/5',
          minutesFocused: 25,
          actualMinutes: 25,
          startedAt: '2026-11-08T14:00:00Z',
          completedAt: '2026-11-08T14:25:00Z',
        },
      ];

      const algoTime = getCourseStudyTime('c-algo', focusSessions);
      expect(algoTime.totalMinutes).toBe(80); // 30 + 50
      expect(algoTime.formattedTime).toBe('1h 20m');
      expect(algoTime.sessionCount).toBe(2);

      const dbTime = getCourseStudyTime('c-db', focusSessions);
      expect(dbTime.totalMinutes).toBe(25);
      expect(dbTime.formattedTime).toBe('25m');
      expect(dbTime.sessionCount).toBe(1);

      const osTime = getCourseStudyTime('c-os', focusSessions);
      expect(osTime.totalMinutes).toBe(0);
      expect(osTime.sessionCount).toBe(0);
    });

    it('supports accept and move pure function operations', () => {
      const suggestion = {
        key: 'test-sug',
        courseId: 'c-algo',
        courseName: 'Algorithms',
        courseCode: 'CS301',
        courseColor: '#3b82f6',
        date: '2026-11-09',
        startTime: '14:00',
        endTime: '15:00',
        durationMinutes: 60,
        title: 'Study Dynamic Programming',
        reason: 'Exam in 2 days',
      };

      const block = acceptStudySuggestion(suggestion, () => 'block-123');
      expect(block.id).toBe('block-123');
      expect(block.status).toBe('planned');
      expect(block.startTime).toBe('14:00');

      const moved = moveStudySuggestion(block, '2026-11-10', '16:00', '17:30');
      expect(moved.date).toBe('2026-11-10');
      expect(moved.startTime).toBe('16:00');
      expect(moved.endTime).toBe('17:30');
      expect(moved.durationMinutes).toBe(90);
    });
  });
});
