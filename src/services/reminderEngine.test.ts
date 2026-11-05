import { describe, it, expect } from 'vitest';
import {
  isInQuietHours,
  adjustForQuietHours,
} from './reminderEngine';
import {
  stringToNotificationId,
  isNativeAndroid,
} from './notificationService';

describe('Local Notification Foundation & Reminder Engine', () => {
  describe('stringToNotificationId (Stable Hashing)', () => {
    it('produces deterministic positive 31-bit integers', () => {
      const id1 = stringToNotificationId('task-uuid-12345');
      const id2 = stringToNotificationId('task-uuid-12345');
      expect(id1).toBe(id2);
      expect(id1).toBeGreaterThan(0);
      expect(id1).toBeLessThanOrEqual(2147483647);
    });

    it('generates distinct IDs for different keys', () => {
      const idTask = stringToNotificationId('task-abc');
      const idExam = stringToNotificationId('exam-xyz');
      const idClass = stringToNotificationId('class-math101-mon-0900');

      expect(idTask).not.toBe(idExam);
      expect(idTask).not.toBe(idClass);
    });
  });

  describe('isNativeAndroid (Platform Isolation)', () => {
    it('returns false in web/node test environment', () => {
      expect(isNativeAndroid()).toBe(false);
    });
  });

  describe('Quiet Hours Intelligence', () => {
    const quietConfig = {
      enabled: true,
      start: '22:00',
      end: '07:00',
    };

    it('identifies timestamps inside quiet hours spanning midnight', () => {
      // 23:30 is inside (after 22:00)
      const lateNight = new Date('2026-11-04T23:30:00');
      expect(isInQuietHours(lateNight, quietConfig)).toBe(true);

      // 04:15 is inside (before 07:00)
      const earlyMorning = new Date('2026-11-04T04:15:00');
      expect(isInQuietHours(earlyMorning, quietConfig)).toBe(true);

      // 14:00 is outside quiet hours
      const afternoon = new Date('2026-11-04T14:00:00');
      expect(isInQuietHours(afternoon, quietConfig)).toBe(false);

      // 08:30 is outside quiet hours
      const morning = new Date('2026-11-04T08:30:00');
      expect(isInQuietHours(morning, quietConfig)).toBe(false);
    });

    it('adjusts notification timestamp to end of quiet hours', () => {
      const fullConfig = {
        enabled: true,
        start: '22:00',
        end: '07:00',
        allowUrgentExams: true,
      };

      const lateNightTrigger = new Date('2026-11-04T23:00:00');
      const eventNextDay = new Date('2026-11-05T09:00:00');

      const adjusted = adjustForQuietHours(lateNightTrigger, eventNextDay, fullConfig, false);
      expect(adjusted).not.toBeNull();
      // Should be postponed to 07:05 on next morning
      expect(adjusted?.getHours()).toBe(7);
      expect(adjusted?.getMinutes()).toBe(5);
    });

    it('allows urgent exam alarms to bypass quiet hours when allowed', () => {
      const fullConfig = {
        enabled: true,
        start: '22:00',
        end: '07:00',
        allowUrgentExams: true,
      };

      const earlyAlarm = new Date('2026-11-04T06:30:00');
      const examDate = new Date('2026-11-04T08:00:00');

      // Urgent exam should NOT be modified
      const res = adjustForQuietHours(earlyAlarm, examDate, fullConfig, true);
      expect(res?.getTime()).toBe(earlyAlarm.getTime());
    });

    it('skips notification if postponed time is after event start', () => {
      const fullConfig = {
        enabled: true,
        start: '22:00',
        end: '07:00',
        allowUrgentExams: false,
      };

      // Class at 06:30 am
      const earlyTrigger = new Date('2026-11-04T06:00:00');
      const eventDate = new Date('2026-11-04T06:30:00');

      // Postponing to 07:05 would be after the class starts (06:30), so it should return null
      const res = adjustForQuietHours(earlyTrigger, eventDate, fullConfig, false);
      expect(res).toBeNull();
    });
  });
});
