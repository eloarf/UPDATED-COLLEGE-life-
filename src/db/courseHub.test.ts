import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import {
  saveAttendanceQuickMark,
  canMarkAttendance,
  calculateAttendanceStanding,
} from '../utils/attendanceEngine';
import {
  exportDatabaseToJson,
  validateBackupFile,
  restoreDatabase,
} from '../services/backupService';
import { Course, AttendanceRecord, StudyBlock, DismissedStudySuggestion } from '../types';

describe('Course Hub & Study Planner Data Integration (Chunk 5)', () => {
  beforeEach(async () => {
    await db.courses.clear();
    await db.classSessions.clear();
    await db.attendance.clear();
    await db.studyBlocks.clear();
    await db.dismissedStudySuggestions.clear();
  });

  describe('Task 1 & Task 4: Additive Course Notes & Hub Persistence', () => {
    it('persists and updates additive course notes field without breaking existing courses', async () => {
      const course: Course = {
        id: 'course-arch',
        code: 'CS401',
        name: 'Computer Architecture',
        creditHours: 4,
        color: '#8B5A3C',
        term: 'Year 2 - Sem 1',
        notes: 'Prof office hours: Tue/Thu 14:00. Midterm covers pipelining.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.courses.add(course);
      const loaded = await db.courses.get('course-arch');
      expect(loaded).toBeDefined();
      expect(loaded?.notes).toBe('Prof office hours: Tue/Thu 14:00. Midterm covers pipelining.');

      // Update notes
      await db.courses.update('course-arch', {
        notes: 'Updated notes: Final exam date changed to Dec 18.',
      });

      const updated = await db.courses.get('course-arch');
      expect(updated?.notes).toBe('Updated notes: Final exam date changed to Dec 18.');
    });

    it('returns undefined for non-existent or deleted course id (friendly missing state test)', async () => {
      const missing = await db.courses.get('non-existent-course-id');
      expect(missing).toBeUndefined();
    });
  });

  describe('Task 2: Attendance Quick-Mark in Database', () => {
    it('saves one attendance record per class per date, and saving again replaces the status', async () => {
      const date = '2026-11-08';
      const courseId = 'course-arch';

      // Mark Present
      const res1 = await saveAttendanceQuickMark({
        courseId,
        date,
        status: 'present',
        allowToggle: false,
      });

      expect(res1.success).toBe(true);
      expect(res1.action).toBe('created');
      expect(res1.record?.status).toBe('present');

      let records = await db.attendance.where('courseId').equals(courseId).toArray();
      expect(records.length).toBe(1);
      expect(records[0].status).toBe('present');

      // Saving again with 'late' replaces the status (still exactly 1 record)
      const res2 = await saveAttendanceQuickMark({
        courseId,
        date,
        status: 'late',
        allowToggle: false,
      });

      expect(res2.success).toBe(true);
      expect(res2.action).toBe('updated');
      expect(res2.record?.status).toBe('late');

      records = await db.attendance.where('courseId').equals(courseId).toArray();
      expect(records.length).toBe(1);
      expect(records[0].status).toBe('late');

      // Saving again with 'absent' replaces the status
      const res3 = await saveAttendanceQuickMark({
        courseId,
        date,
        status: 'absent',
        allowToggle: false,
      });

      expect(res3.success).toBe(true);
      expect(res3.action).toBe('updated');
      expect(res3.record?.status).toBe('absent');

      records = await db.attendance.where('courseId').equals(courseId).toArray();
      expect(records.length).toBe(1);
      expect(records[0].status).toBe('absent');
    });

    it('blocks marking future and cancelled classes', async () => {
      const futureRes = await saveAttendanceQuickMark({
        courseId: 'course-arch',
        date: '2099-01-01',
        status: 'present',
      });
      expect(futureRes.success).toBe(false);
      expect(futureRes.action).toBe('blocked');
      expect(futureRes.error).toContain('Future classes cannot be marked');

      const cancelledRes = await saveAttendanceQuickMark({
        courseId: 'course-arch',
        date: '2026-11-09',
        status: 'present',
        isCancelled: true,
      });
      expect(cancelledRes.success).toBe(false);
      expect(cancelledRes.action).toBe('blocked');
      expect(cancelledRes.error).toContain('Cancelled classes cannot be marked');
    });
  });

  describe('Task 4: Additive Tables Backup & Restore', () => {
    it('exports, validates, and restores studyBlocks and dismissedStudySuggestions', async () => {
      const block: StudyBlock = {
        id: 'sb-test-1',
        courseId: 'c-test',
        title: 'Review Cache Coherence',
        date: '2026-11-10',
        startTime: '14:00',
        endTime: '15:00',
        durationMinutes: 60,
        status: 'planned',
        createdAt: new Date().toISOString(),
      };

      const dismissed: DismissedStudySuggestion = {
        id: 'dss-test-1',
        suggestionKey: 'exam-e1-topic1',
        dateKey: '2026-11-10',
        dismissedAt: new Date().toISOString(),
      };

      await db.studyBlocks.add(block);
      await db.dismissedStudySuggestions.add(dismissed);

      // Export JSON
      const json = await exportDatabaseToJson();
      expect(json).toContain('sb-test-1');
      expect(json).toContain('dss-test-1');

      // Validate JSON
      const validation = validateBackupFile(json);
      expect(validation.valid).toBe(true);
      if (validation.valid) {
        expect(validation.tableCounts['studyBlocks']).toBe(1);
        expect(validation.tableCounts['dismissedStudySuggestions']).toBe(1);

        // Clear and restore
        await db.studyBlocks.clear();
        await db.dismissedStudySuggestions.clear();
        expect(await db.studyBlocks.count()).toBe(0);

        const restoreRes = await restoreDatabase(validation.backup, 'replace');
        expect(restoreRes.success).toBe(true);

        const restoredBlock = await db.studyBlocks.get('sb-test-1');
        expect(restoredBlock).toBeDefined();
        expect(restoredBlock?.title).toBe('Review Cache Coherence');

        const restoredDismissed = await db.dismissedStudySuggestions.get('dss-test-1');
        expect(restoredDismissed).toBeDefined();
        expect(restoredDismissed?.suggestionKey).toBe('exam-e1-topic1');
      }
    });
  });
});
