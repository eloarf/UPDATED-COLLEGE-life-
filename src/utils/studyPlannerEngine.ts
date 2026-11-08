import {
  Course,
  ClassSession,
  ClassException,
  Exam,
  ExamTopic,
  StudyBlock,
  DismissedStudySuggestion,
  StudyPlannerSuggestion,
  FocusSession,
  DayOfWeek,
} from '../types';

export interface StudyPlannerQuietHours {
  enabled: boolean;
  start: string; // "22:00"
  end: string;   // "07:00"
}

export interface StudyPlannerSettings {
  sleepStartTime?: string; // default: "23:00"
  sleepEndTime?: string;   // default: "07:00"
  quietHours?: StudyPlannerQuietHours;
  minBlockMinutes?: number; // default: 45
  maxBlockMinutes?: number; // default: 60
}

export interface GenerateStudyPlanInput {
  currentDate: string; // YYYY-MM-DD
  daysToPlan?: number; // default: 7
  courses: Course[];
  classSessions: ClassSession[];
  classExceptions?: ClassException[];
  exams?: Exam[];
  examTopics?: ExamTopic[];
  existingStudyBlocks?: StudyBlock[];
  dismissedSuggestions?: DismissedStudySuggestion[];
  settings?: StudyPlannerSettings;
  focusSessions?: FocusSession[];
}

export interface TimeSlot {
  start: number; // minutes from midnight (0..1440)
  end: number;
}

/**
 * Converts "HH:MM" to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10));
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

/**
 * Converts minutes from midnight to "HH:MM"
 */
export function minutesToTime(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(1439, Math.floor(totalMinutes)));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formats a Date object as "YYYY-MM-DD" in local time
 */
export function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses "YYYY-MM-DD" to Date at local midnight
 */
export function parseDateKey(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Adds days to a date string and returns formatted "YYYY-MM-DD".
 * Properly handles month and year boundaries.
 */
export function addDays(dateStr: string, days: number): string {
  const d = parseDateKey(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
}

/**
 * Calculates days difference between two dates (target - current).
 */
export function diffDays(currentDateStr: string, targetDateStr: string): number {
  const c = parseDateKey(currentDateStr).getTime();
  const t = parseDateKey(targetDateStr).getTime();
  return Math.round((t - c) / (1000 * 60 * 60 * 24));
}

/**
 * Given occupied slots, returns merged non-overlapping sorted slots.
 */
export function mergeSlots(slots: TimeSlot[]): TimeSlot[] {
  if (slots.length <= 1) return [...slots];
  const sorted = [...slots].sort((a, b) => a.start - b.start);
  const result: TimeSlot[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = result[result.length - 1];
    const curr = sorted[i];

    if (curr.start <= prev.end) {
      prev.end = Math.max(prev.end, curr.end);
    } else {
      result.push(curr);
    }
  }

  return result;
}

/**
 * Finds free gaps between windowStart and windowEnd not covered by occupied slots.
 */
export function findFreeGaps(
  windowStart: number,
  windowEnd: number,
  occupiedSlots: TimeSlot[],
  minDuration: number = 45
): TimeSlot[] {
  if (windowStart >= windowEnd) return [];

  const merged = mergeSlots(
    occupiedSlots
      .map((s) => ({
        start: Math.max(windowStart, s.start),
        end: Math.min(windowEnd, s.end),
      }))
      .filter((s) => s.end > s.start)
  );

  const gaps: TimeSlot[] = [];
  let currentPointer = windowStart;

  for (const slot of merged) {
    if (slot.start > currentPointer) {
      const gapDuration = slot.start - currentPointer;
      if (gapDuration >= minDuration) {
        gaps.push({ start: currentPointer, end: slot.start });
      }
    }
    currentPointer = Math.max(currentPointer, slot.end);
  }

  if (windowEnd > currentPointer) {
    const gapDuration = windowEnd - currentPointer;
    if (gapDuration >= minDuration) {
      gaps.push({ start: currentPointer, end: windowEnd });
    }
  }

  return gaps;
}

/**
 * Pure function: calculates total focused minutes and formatted string for a course
 */
export function getCourseStudyTime(
  courseId: string,
  focusSessions: FocusSession[] = []
): { totalMinutes: number; formattedTime: string; sessionCount: number } {
  const courseSessions = focusSessions.filter((s) => s.courseId === courseId);
  const totalMinutes = courseSessions.reduce(
    (acc, s) => acc + (s.actualMinutes ?? s.minutesFocused ?? 0),
    0
  );

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const formattedTime =
    hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim() : `${mins}m`;

  return {
    totalMinutes,
    formattedTime,
    sessionCount: courseSessions.length,
  };
}

/**
 * Pure function: generates study suggestions for the next 7 days based on deterministic rules.
 */
export function generateStudyPlan(input: GenerateStudyPlanInput): StudyPlannerSuggestion[] {
  const {
    currentDate,
    daysToPlan = 7,
    courses,
    classSessions,
    classExceptions = [],
    exams = [],
    examTopics = [],
    existingStudyBlocks = [],
    dismissedSuggestions = [],
    settings = {},
  } = input;

  if (!courses || courses.length === 0) return [];

  const sleepStartTimeStr = settings.sleepStartTime || '23:00';
  const sleepEndTimeStr = settings.sleepEndTime || '07:00';
  const sleepStart = timeToMinutes(sleepStartTimeStr);
  const sleepEnd = timeToMinutes(sleepEndTimeStr);

  const quietHours = settings.quietHours;
  const quietStart = quietHours?.enabled ? timeToMinutes(quietHours.start) : sleepStart;
  const quietEnd = quietHours?.enabled ? timeToMinutes(quietHours.end) : sleepEnd;

  // Study window: starts after morning sleep/quiet hours, ends before night quiet hours/sleep
  // E.g., if sleep ends at 07:00 and quiet hours end at 07:00 -> windowStart is 07:00.
  // If night quiet hours starts at 22:00 and sleep starts at 23:00 -> windowEnd is 22:00.
  const windowStart = Math.max(sleepEnd, quietHours?.enabled ? quietEnd : sleepEnd);
  const windowEnd = Math.min(sleepStart, quietHours?.enabled ? quietStart : sleepStart);

  const minBlockMinutes = settings.minBlockMinutes || 45;
  const maxBlockMinutes = settings.maxBlockMinutes || 60;

  const suggestions: StudyPlannerSuggestion[] = [];
  const dismissedKeysSet = new Set(
    dismissedSuggestions.map((d) => `${d.suggestionKey}::${d.dateKey}`)
  );

  // Helper map for courses
  const courseMap = new Map<string, Course>();
  courses.forEach((c) => courseMap.set(c.id, c));

  // Build spaced revision items
  // Spaced revisions: 1, 3, and 7 days after topic studied date
  interface SpacedRevisionNeed {
    topic: ExamTopic;
    courseId: string;
    dueDateKey: string;
    intervalDay: number;
  }
  const spacedRevisionNeeds: SpacedRevisionNeed[] = [];

  for (const topic of examTopics) {
    if (topic.isStudied && topic.targetStudyDate) {
      const exam = exams.find((e) => e.id === topic.examId);
      const courseId = exam ? exam.courseId : courses[0]?.id;
      if (courseId) {
        [1, 3, 7].forEach((interval) => {
          const revDate = addDays(topic.targetStudyDate!, interval);
          spacedRevisionNeeds.push({
            topic,
            courseId,
            dueDateKey: revDate,
            intervalDay: interval,
          });
        });
      }
    }
  }

  // Iterate over each day in the planning horizon
  for (let dayOffset = 0; dayOffset < daysToPlan; dayOffset++) {
    const targetDateKey = addDays(currentDate, dayOffset);
    const targetDateObj = parseDateKey(targetDateKey);
    const dayOfWeek = (targetDateObj.getDay() === 0 ? 6 : targetDateObj.getDay() - 1) as DayOfWeek;

    // 1. Gather all occupied slots on targetDateKey
    const occupiedSlots: TimeSlot[] = [];

    // 1a. Classes on this dayOfWeek
    const daySessions = classSessions.filter((s) => s.dayOfWeek === dayOfWeek);
    for (const session of daySessions) {
      const exception = classExceptions.find(
        (e) => e.sessionId === session.id && e.date === targetDateKey
      );
      if (exception) {
        if (exception.action === 'cancelled') {
          // Class is cancelled on this date -> slot is free
          continue;
        } else if (exception.action === 'moved' && exception.newStartTime && exception.newEndTime) {
          // Moved to new time on this date
          occupiedSlots.push({
            start: timeToMinutes(exception.newStartTime),
            end: timeToMinutes(exception.newEndTime),
          });
          continue;
        }
      }
      // Standard session
      occupiedSlots.push({
        start: timeToMinutes(session.startTime),
        end: timeToMinutes(session.endTime),
      });
    }

    // Also check for sessions moved INTO this date
    const movedInExceptions = classExceptions.filter(
      (e) => e.action === 'moved' && e.newDate === targetDateKey && e.newStartTime && e.newEndTime
    );
    for (const ex of movedInExceptions) {
      occupiedSlots.push({
        start: timeToMinutes(ex.newStartTime!),
        end: timeToMinutes(ex.newEndTime!),
      });
    }

    // 1b. Existing accepted / planned study blocks on this date
    const dayBlocks = existingStudyBlocks.filter(
      (b) => b.date === targetDateKey && b.status !== 'cancelled'
    );
    for (const b of dayBlocks) {
      occupiedSlots.push({
        start: timeToMinutes(b.startTime),
        end: timeToMinutes(b.endTime),
      });
    }

    // 1c. Find free gaps on this date
    const gaps = findFreeGaps(windowStart, windowEnd, occupiedSlots, minBlockMinutes);
    if (gaps.length === 0) continue;

    // 2. Identify candidates to schedule for this date
    // Priority Tier A: Spaced Revisions due on targetDateKey
    const dueRevisions = spacedRevisionNeeds.filter((r) => r.dueDateKey === targetDateKey);

    // Priority Tier B: Exams upcoming (sorted by urgency, weight, credits)
    const upcomingExams = exams
      .filter((exam) => {
        const daysToExam = diffDays(targetDateKey, exam.examDate);
        return daysToExam >= 0 && daysToExam <= 21; // Within 3 weeks
      })
      .map((exam) => {
        const daysToExam = diffDays(targetDateKey, exam.examDate);
        const course = courseMap.get(exam.courseId);
        const credits = course?.creditHours || course?.credits || 3;
        // Priority formula: urgency dominates, then weight and credits
        const urgencyScore = (25 - Math.min(25, daysToExam)) * 15;
        const weightScore = (exam.weight || 20) * 2;
        const creditsScore = credits * 5;
        const score = urgencyScore + weightScore + creditsScore;

        return {
          exam,
          course,
          daysToExam,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);

    // Track slots used within the gaps
    let gapIndex = 0;
    let currentSlotStart = gaps[0]?.start ?? 0;

    // Allocate study suggestions into available gaps
    while (gapIndex < gaps.length) {
      const currentGap = gaps[gapIndex];
      const remainingGapMinutes = currentGap.end - currentSlotStart;

      if (remainingGapMinutes < minBlockMinutes) {
        gapIndex++;
        if (gapIndex < gaps.length) {
          currentSlotStart = gaps[gapIndex].start;
        }
        continue;
      }

      const blockDuration = Math.min(maxBlockMinutes, remainingGapMinutes);
      const slotEnd = currentSlotStart + blockDuration;
      const startTimeStr = minutesToTime(currentSlotStart);
      const endTimeStr = minutesToTime(slotEnd);

      // Determine candidate item for this slot
      let suggestionCandidate: StudyPlannerSuggestion | null = null;

      // 1. Check for due spaced revision
      if (dueRevisions.length > 0) {
        const rev = dueRevisions.shift()!;
        const course = courseMap.get(rev.courseId);
        const suggestionKey = `rev-${rev.topic.id}-${rev.intervalDay}`;
        if (!dismissedKeysSet.has(`${suggestionKey}::${targetDateKey}`)) {
          suggestionCandidate = {
            key: `${suggestionKey}-${targetDateKey}-${startTimeStr}`,
            courseId: rev.courseId,
            courseName: course?.name || 'Course',
            courseCode: course?.code || 'REV',
            courseColor: course?.color || '#3b82f6',
            date: targetDateKey,
            startTime: startTimeStr,
            endTime: endTimeStr,
            durationMinutes: blockDuration,
            title: `Spaced Revision (${rev.intervalDay}d): ${rev.topic.title}`,
            reason: `${rev.intervalDay}-day spaced repetition review to lock in memory retention`,
            topicId: rev.topic.id,
            topicTitle: rev.topic.title,
            isSpacedRevision: true,
            revisionDayNumber: rev.intervalDay,
          };
        }
      }

      // 2. Check for exam preparation
      if (!suggestionCandidate && upcomingExams.length > 0) {
        for (const item of upcomingExams) {
          const { exam, course, daysToExam } = item;
          // Look for unstudied topics for this exam
          const unstudiedTopic = examTopics.find(
            (t) => t.examId === exam.id && !t.isStudied
          );

          const topicPart = unstudiedTopic ? unstudiedTopic.id : 'exam-review';
          const suggestionKey = `exam-${exam.id}-${topicPart}`;

          if (!dismissedKeysSet.has(`${suggestionKey}::${targetDateKey}`)) {
            const urgencyLabel =
              daysToExam === 0
                ? 'Exam Today'
                : daysToExam === 1
                ? 'Exam Tomorrow'
                : `Exam in ${daysToExam} days`;

            const title = unstudiedTopic
              ? `Study ${unstudiedTopic.title} • ${course?.code || exam.title}`
              : `Review for ${exam.title} (${urgencyLabel})`;

            const reason = `${urgencyLabel} (${exam.weight}% weight). ${
              unstudiedTopic ? 'Cover core syllabus topic.' : 'Synthesize and practice key concepts.'
            }`;

            suggestionCandidate = {
              key: `${suggestionKey}-${targetDateKey}-${startTimeStr}`,
              courseId: exam.courseId,
              courseName: course?.name || exam.title,
              courseCode: course?.code || 'EXAM',
              courseColor: course?.color || '#f59e0b',
              date: targetDateKey,
              startTime: startTimeStr,
              endTime: endTimeStr,
              durationMinutes: blockDuration,
              title,
              reason,
              examId: exam.id,
              examTitle: exam.title,
              topicId: unstudiedTopic?.id,
              topicTitle: unstudiedTopic?.title,
            };
            break;
          }
        }
      }

      // 3. Fallback: General balanced course study based on course credit hours
      if (!suggestionCandidate && courses.length > 0) {
        // Rotate through courses evenly across days
        const courseIdx = (dayOffset + suggestions.length) % courses.length;
        const course = courses[courseIdx];
        const suggestionKey = `course-${course.id}-prep`;

        if (!dismissedKeysSet.has(`${suggestionKey}::${targetDateKey}`)) {
          suggestionCandidate = {
            key: `${suggestionKey}-${targetDateKey}-${startTimeStr}`,
            courseId: course.id,
            courseName: course.name,
            courseCode: course.code,
            courseColor: course.color,
            date: targetDateKey,
            startTime: startTimeStr,
            endTime: endTimeStr,
            durationMinutes: blockDuration,
            title: `Focus Block • ${course.code} (${course.name})`,
            reason: `Dedicated deep work window to stay ahead on weekly readings and problem sets`,
          };
        }
      }

      if (suggestionCandidate) {
        suggestions.push(suggestionCandidate);
        // Advance currentSlotStart with a small 15m buffer or adjacent
        currentSlotStart = slotEnd + 15;
      } else {
        // No candidate available, advance past this slot
        currentSlotStart = slotEnd + 15;
      }

      // Maximum 2 study blocks suggested per day to avoid cognitive fatigue
      const blocksToday = suggestions.filter((s) => s.date === targetDateKey).length;
      if (blocksToday >= 2) {
        break; // Move to next day
      }
    }
  }

  return suggestions;
}

/**
 * Pure function: converts a suggestion into an accepted StudyBlock ready for database insertion
 */
export function acceptStudySuggestion(
  suggestion: StudyPlannerSuggestion,
  idGenerator: () => string = () => `sb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
): StudyBlock {
  return {
    id: idGenerator(),
    courseId: suggestion.courseId,
    title: suggestion.title,
    date: suggestion.date,
    startTime: suggestion.startTime,
    endTime: suggestion.endTime,
    durationMinutes: suggestion.durationMinutes,
    status: 'planned',
    topicId: suggestion.topicId,
    topicTitle: suggestion.topicTitle,
    examId: suggestion.examId,
    examTitle: suggestion.examTitle,
    isSpacedRevision: suggestion.isSpacedRevision,
    revisionDayNumber: suggestion.revisionDayNumber,
    notes: suggestion.reason,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Pure function: moves an existing StudyBlock to a new date and time
 */
export function moveStudySuggestion(
  block: StudyBlock,
  newDate: string,
  newStartTime: string,
  newEndTime: string
): StudyBlock {
  const duration = timeToMinutes(newEndTime) - timeToMinutes(newStartTime);
  return {
    ...block,
    date: newDate,
    startTime: newStartTime,
    endTime: newEndTime,
    durationMinutes: duration > 0 ? duration : block.durationMinutes,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Pure function: creates a DismissedStudySuggestion record
 */
export function createDismissedSuggestion(
  suggestionKey: string,
  dateKey: string,
  idGenerator: () => string = () => `dss-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
): DismissedStudySuggestion {
  return {
    id: idGenerator(),
    suggestionKey,
    dateKey,
    dismissedAt: new Date().toISOString(),
  };
}
