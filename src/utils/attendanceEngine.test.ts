import { describe, it, expect } from 'vitest';
import {
  canMarkAttendance,
  calculateAttendanceStanding,
} from './attendanceEngine';
import { AttendanceRecord } from '../types';

describe('Attendance Engine (Quick-Mark & Standing)', () => {
  describe('canMarkAttendance', () => {
    const today = '2026-11-09';

    it('blocks future dates', () => {
      const res = canMarkAttendance({
        date: '2026-11-10',
        todayKey: today,
        currentTime: '14:00',
        startTime: '09:00',
      });
      expect(res.canMark).toBe(false);
      expect(res.reason).toContain('Future classes cannot be marked');
    });

    it('blocks cancelled classes', () => {
      const res = canMarkAttendance({
        date: today,
        isCancelled: true,
        todayKey: today,
        currentTime: '14:00',
        startTime: '09:00',
      });
      expect(res.canMark).toBe(false);
      expect(res.reason).toContain('Cancelled classes cannot be marked');
    });

    it('blocks today classes that have not started yet', () => {
      const res = canMarkAttendance({
        date: today,
        isCancelled: false,
        todayKey: today,
        currentTime: '08:30',
        startTime: '09:00',
      });
      expect(res.canMark).toBe(false);
      expect(res.reason).toContain('Class has not started yet');
    });

    it('allows today classes once start time has arrived or passed', () => {
      const res = canMarkAttendance({
        date: today,
        isCancelled: false,
        todayKey: today,
        currentTime: '09:05',
        startTime: '09:00',
      });
      expect(res.canMark).toBe(true);
    });

    it('allows past dates', () => {
      const res = canMarkAttendance({
        date: '2026-11-05',
        isCancelled: false,
        todayKey: today,
        currentTime: '10:00',
        startTime: '09:00',
      });
      expect(res.canMark).toBe(true);
    });
  });

  describe('calculateAttendanceStanding', () => {
    it('returns 100% and fresh message when no records exist', () => {
      const standing = calculateAttendanceStanding([], 80);
      expect(standing.ratePercent).toBe(100);
      expect(standing.isAboveThreshold).toBe(true);
      expect(standing.message).toContain('No attendance records logged yet');
    });

    it('calculates healthy standing with gentle non-scolding wording when above threshold', () => {
      const records: AttendanceRecord[] = [
        { id: '1', courseId: 'c1', date: '2026-11-01', status: 'present' },
        { id: '2', courseId: 'c1', date: '2026-11-02', status: 'present' },
        { id: '3', courseId: 'c1', date: '2026-11-03', status: 'present' },
        { id: '4', courseId: 'c1', date: '2026-11-04', status: 'absent' },
      ]; // 3 out of 4 = 75%? Let's check: 3 / 4 = 75%, below 80%
      const standing = calculateAttendanceStanding(records, 80);
      expect(standing.ratePercent).toBe(75);
      expect(standing.isAboveThreshold).toBe(false);
      // Verify gentle wording: never punitive, supportive
      expect(standing.message).toContain('Needs attention');
      expect(standing.message).toContain('couple of attended classes away from your goal');
    });

    it('generates healthy message when above threshold', () => {
      const records: AttendanceRecord[] = [
        { id: '1', courseId: 'c1', date: '2026-11-01', status: 'present' },
        { id: '2', courseId: 'c1', date: '2026-11-02', status: 'present' },
        { id: '3', courseId: 'c1', date: '2026-11-03', status: 'present' },
        { id: '4', courseId: 'c1', date: '2026-11-04', status: 'present' },
      ];
      const standing = calculateAttendanceStanding(records, 80);
      expect(standing.ratePercent).toBe(100);
      expect(standing.isAboveThreshold).toBe(true);
      expect(standing.message).toContain('Healthy standing');
      expect(standing.message).toContain('Keep up the rhythm');
    });

    it('credits late attendance partially', () => {
      const records: AttendanceRecord[] = [
        { id: '1', courseId: 'c1', date: '2026-11-01', status: 'present' },
        { id: '2', courseId: 'c1', date: '2026-11-02', status: 'late' },
      ];
      const standing = calculateAttendanceStanding(records, 80);
      // 1 + 0.75 = 1.75 / 2 = 87.5% -> 88%
      expect(standing.ratePercent).toBe(88);
      expect(standing.isAboveThreshold).toBe(true);
    });
  });
});
