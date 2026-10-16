import { db } from './db';
import { generateId } from '../utils/idGenerator';
import { getTodayKey, addDaysToKey, parseDayKey, formatDayKey } from '../utils/dateUtils';
import { Course, ClassSession, Semester } from '../types';

export interface Section12Config {
  semesterName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

/**
 * Returns default semester dates: this week's Monday, 17 weeks long.
 */
export function getDefaultSemesterDates(): { startDate: string; endDate: string } {
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Mon, 6=Sun
  const startMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 12, 0, 0);
  const startDate = formatDayKey(startMon);

  const endSun = new Date(startMon);
  endSun.setDate(endSun.getDate() + 17 * 7 - 1);
  const endDate = formatDayKey(endSun);

  return { startDate, endDate };
}

/**
 * Loads the real Section 12 timetable.
 * Checks for existing courses to strictly prevent duplicate runs.
 * Leaves credit hours empty. Does not invent fake courses, tasks, or exams.
 */
export async function loadSection12Timetable(config?: Partial<Section12Config>): Promise<{ success: boolean; message: string }> {
  // Check if Section 12 courses already exist
  const existingCourses = await db.courses.toArray();
  const section12Codes = ['ANTH1002', 'ENTR1006', 'FLEN1003', 'GEES1005', 'MATH1007', 'PHIL1009', 'PSYC1011'];
  const hasExistingSection12 = existingCourses.some((c) => section12Codes.includes(c.code));

  if (hasExistingSection12) {
    return {
      success: false,
      message: 'Section 12 timetable is already loaded. Existing courses and classes were preserved to prevent duplicates.',
    };
  }

  const defaults = getDefaultSemesterDates();
  const semesterName = config?.semesterName?.trim() || 'Year 1 - Semester I';
  const startDate = config?.startDate || defaults.startDate;
  const endDate = config?.endDate || defaults.endDate;

  const now = new Date().toISOString();
  const semesterId = generateId();

  // 1. Create Semester Record
  const newSemester: Semester = {
    id: semesterId,
    name: semesterName,
    startDate,
    endDate,
    isActive: true,
  };

  // Mark any other semesters as inactive
  await db.semesters.toCollection().modify((s) => {
    s.isActive = false;
  });
  await db.semesters.put(newSemester);

  // Update Settings
  await db.settings.update('current_user', {
    activeSemesterId: semesterId,
    currentTermName: semesterName,
  });

  // 2. Exact 7 Courses for Section 12
  const courseDefs = [
    {
      code: 'ANTH1002',
      name: 'Social Anthropology',
      instructor: 'Lemma, Adugna',
      color: '#2563EB', // Blue
    },
    {
      code: 'ENTR1006',
      name: 'Entrepreneurship',
      instructor: 'Elham, Derese',
      color: '#EA580C', // Orange
    },
    {
      code: 'FLEN1003',
      name: 'Communicative English Language Skills I',
      instructor: 'Fantahun, Alemu',
      color: '#16A34A', // Green
    },
    {
      code: 'GEES1005',
      name: 'Geography of Ethiopia and The Horn',
      instructor: 'Adugna, Endalew',
      color: '#9333EA', // Purple
    },
    {
      code: 'MATH1007',
      name: 'Mathematics for Natural Science',
      instructor: 'Anwar, Seid',
      color: '#0D9488', // Teal
    },
    {
      code: 'PHIL1009',
      name: 'Logic and Critical Thinking',
      instructor: 'Addisalem, Bekele',
      color: '#DB2777', // Pink
    },
    {
      code: 'PSYC1011',
      name: 'General Psychology',
      instructor: 'Mihret, Abraham',
      color: '#4F46E5', // Indigo
    },
  ];

  const courseIdMap: Record<string, string> = {};
  const coursesToInsert: Course[] = [];

  for (const c of courseDefs) {
    const id = generateId();
    courseIdMap[c.code] = id;
    coursesToInsert.push({
      id,
      code: c.code,
      name: c.name,
      creditHours: undefined, // Leave credit hours empty as requested
      instructor: c.instructor,
      color: c.color,
      term: semesterName,
      semesterId,
      createdAt: now,
      updatedAt: now,
    });
  }

  await db.courses.bulkPut(coursesToInsert);

  // 3. Exact 9 Weekly Class Sessions (24-hour time, dayOfWeek 0=Mon..4=Fri, repeat: 'all')
  const sessionDefs = [
    // Monday
    {
      code: 'PSYC1011',
      dayOfWeek: 0 as const,
      startTime: '08:30',
      endTime: '10:20',
      type: 'lecture' as const,
      room: 'B59-2-006',
      building: 'B59',
    },
    {
      code: 'ANTH1002',
      dayOfWeek: 0 as const,
      startTime: '13:30',
      endTime: '15:20',
      type: 'lecture' as const,
      room: 'B59-3-010',
      building: 'B59',
    },
    // Tuesday
    {
      code: 'GEES1005',
      dayOfWeek: 1 as const,
      startTime: '10:30',
      endTime: '12:20',
      type: 'lecture' as const,
      room: 'B59-1-008',
      building: 'B59',
    },
    {
      code: 'MATH1007',
      dayOfWeek: 1 as const,
      startTime: '14:00',
      endTime: '16:50',
      type: 'tutorial' as const,
      room: 'B59-2-005',
      building: 'B59',
    },
    // Wednesday
    {
      code: 'ENTR1006',
      dayOfWeek: 2 as const,
      startTime: '10:30',
      endTime: '12:20',
      type: 'lecture' as const,
      room: 'B59-4-008',
      building: 'B59',
    },
    // Thursday
    {
      code: 'FLEN1003',
      dayOfWeek: 3 as const,
      startTime: '10:30',
      endTime: '12:20',
      type: 'lecture' as const,
      room: 'B59-2-002',
      building: 'B59',
    },
    {
      code: 'PHIL1009',
      dayOfWeek: 3 as const,
      startTime: '13:30',
      endTime: '15:20',
      type: 'lecture' as const,
      room: 'B59-2-003',
      building: 'B59',
    },
    // Friday
    {
      code: 'MATH1007',
      dayOfWeek: 4 as const,
      startTime: '08:30',
      endTime: '10:20',
      type: 'lecture' as const,
      room: 'B59-1-007',
      building: 'B59',
    },
    {
      code: 'FLEN1003',
      dayOfWeek: 4 as const,
      startTime: '14:00',
      endTime: '16:50',
      type: 'tutorial' as const,
      room: 'B59-4-008',
      building: 'B59',
    },
  ];

  const sessionsToInsert: ClassSession[] = sessionDefs.map((s) => ({
    id: generateId(),
    courseId: courseIdMap[s.code],
    semesterId,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    type: s.type,
    room: s.room,
    building: s.building,
    repeat: 'all',
  }));

  await db.classSessions.bulkPut(sessionsToInsert);

  return {
    success: true,
    message: `Section 12 timetable loaded! 7 courses and 9 weekly classes scheduled for ${semesterName}.`,
  };
}

/**
 * Backward compatibility helper
 */
export async function loadStarterPackData(): Promise<{ success: boolean; message: string }> {
  return loadSection12Timetable();
}
