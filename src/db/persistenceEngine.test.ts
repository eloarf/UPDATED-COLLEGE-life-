import { describe, it, expect, beforeEach } from 'vitest';
import LZString from 'lz-string';
import {
  deserializeEmergencyPayload,
  LOCAL_EMERGENCY_KEY_V2,
  LOCAL_EMERGENCY_KEY_LEGACY,
  LOCAL_EMERGENCY_KEY_PREV,
  EmergencyBackupPayload,
} from './db';

describe('Persistence Engine - Emergency Mirror & Safety Tests', () => {
  const samplePayload: EmergencyBackupPayload = {
    version: 4,
    savedAt: '2026-10-20T04:00:00.000Z',
    totalRecords: 5,
    data: {
      settings: [{ id: 'current_user', userName: 'Scholar' } as any],
      tasks: [
        { id: 'task-1', title: 'Study Thermodynamics', status: 'todo' } as any,
        { id: 'task-2', title: 'Complete Lab Report', status: 'done' } as any,
      ],
      journalEntries: [
        { id: 'journal-1', title: 'Midterm Reflection', content: 'Today was productive.' } as any,
      ],
      courses: [
        { id: 'course-1', code: 'MATH1007', name: 'Math for Natural Science' } as any,
      ],
    },
  };

  it('correctly compresses and decompresses UTF-16 payload', () => {
    const json = JSON.stringify(samplePayload);
    const compressed = LZString.compressToUTF16(json);
    expect(compressed.length).toBeLessThan(json.length);

    const restored = deserializeEmergencyPayload(compressed);
    expect(restored).not.toBeNull();
    expect(restored?.version).toBe(4);
    expect(restored?.totalRecords).toBe(5);
    expect(restored?.data.tasks?.length).toBe(2);
    expect(restored?.data.journalEntries?.length).toBe(1);
    expect(restored?.data.courses?.length).toBe(1);
  });

  it('maintains backwards compatibility with uncompressed raw JSON backups (v1 format)', () => {
    const rawJson = JSON.stringify(samplePayload);
    const restored = deserializeEmergencyPayload(rawJson);
    expect(restored).not.toBeNull();
    expect(restored?.version).toBe(4);
    expect(restored?.totalRecords).toBe(5);
    expect(restored?.data.tasks?.[0].title).toBe('Study Thermodynamics');
  });

  it('gracefully handles empty, invalid, or corrupted mirror strings without throwing', () => {
    expect(deserializeEmergencyPayload('')).toBeNull();
    expect(deserializeEmergencyPayload('invalid-garbled-data-###')).toBeNull();
    expect(deserializeEmergencyPayload('{ bad json: 123 }')).toBeNull();
  });

  it('verifies that compressed UTF-16 payload reduces storage usage by over 50%', () => {
    const largeTaskArray = Array.from({ length: 50 }, (_, i) => ({
      id: `task-${i}`,
      title: `Academic Assignment Quest #${i}: Detailed study notes and exam preparation guidelines for engineering syllabus`,
      status: i % 2 === 0 ? 'todo' : 'done',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const bigPayload: EmergencyBackupPayload = {
      version: 4,
      savedAt: new Date().toISOString(),
      totalRecords: largeTaskArray.length,
      data: {
        tasks: largeTaskArray as any,
      },
    };

    const rawJson = JSON.stringify(bigPayload);
    const compressed = LZString.compressToUTF16(rawJson);

    expect(compressed.length).toBeLessThan(rawJson.length * 0.5);
    const restored = deserializeEmergencyPayload(compressed);
    expect(restored?.data.tasks?.length).toBe(50);
  });
});
