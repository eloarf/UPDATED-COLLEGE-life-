import { ScheduledClass } from './scheduleEngine';
import { Task, StudyBlock, MasterWeekBlock, Exam, FocusSession, Course } from '../types';
import { getDayOfWeekIndex, getTodayKey } from './dateUtils';
import { getTaskEstimatedMinutes } from './todayEngine';

export type TimelineBlockKind = 'class' | 'task' | 'study' | 'masterWeek' | 'exam' | 'focus';
export type TimelineBlockStatus = 'normal' | 'cancelled' | 'moved' | 'completed';

export interface TimelineBlock {
  id: string;
  title: string;
  subtitle?: string;
  location?: string;
  startMinutes: number; // 0..1440 (minutes from 00:00)
  endMinutes: number;   // 0..1440
  startTime: string;    // 'HH:MM'
  endTime: string;      // 'HH:MM'
  durationMinutes: number;
  kind: TimelineBlockKind;
  colour: string;
  status: TimelineBlockStatus;
  laneIndex: number;    // 0-indexed column within overlap cluster
  totalLanes: number;   // Concurrent lanes in this cluster
  originalItem: any;
  isPast?: boolean;
}

export interface FreeGap {
  startMinutes: number;
  endMinutes: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  label: string;
}

export interface DayTimelineResult {
  dateKey: string;
  blocks: TimelineBlock[];
  freeGaps: FreeGap[];
  dayStartMinutes: number;
  dayEndMinutes: number;
  earliestBlockMinutes: number;
  latestBlockMinutes: number;
}

export interface TimelineEngineInput {
  date: string | Date;
  classes?: ScheduledClass[];
  tasks?: Task[];
  studyBlocks?: StudyBlock[];
  masterWeekBlocks?: MasterWeekBlock[];
  exams?: Exam[];
  focusSessions?: FocusSession[];
  courses?: Course[];
  dayStartMinutes?: number; // default 360 (06:00)
  dayEndMinutes?: number;   // default 1380 (23:00)
  currentMinutes?: number;  // optional now minutes for isPast check
}

/**
 * Validates and converts 'HH:MM' to minutes from 00:00 (0..1439).
 * Returns null if invalid.
 */
export function timeStringToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 24 || minutes < 0 || minutes > 59) {
    return null;
  }
  const total = hours * 60 + minutes;
  return Math.min(1440, Math.max(0, total));
}

/**
 * Formats minutes from 00:00 to 24-hour 'HH:MM' string.
 */
export function minutesToTimeString(minutes: number): string {
  const safeMinutes = Math.min(1440, Math.max(0, Math.round(minutes)));
  const h = Math.floor(safeMinutes / 60) % 24;
  const m = safeMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Normalizes an arbitrary Date or string to a local YYYY-MM-DD key without UTC offset shifts.
 */
export function normalizeDateKey(dateInput: string | Date): string {
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // Handle ISO string
    if (trimmed.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
  }
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    return getTodayKey();
  }
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Pure timeline engine: Aggregates schedule elements for a given date,
 * resolves overlaps with lane indices, clips crossing-midnight items,
 * and computes free gaps between occupied blocks.
 */
export function buildDayTimeline(input: TimelineEngineInput): DayTimelineResult {
  const dateKey = normalizeDateKey(input.date);
  const dayOfWeek = getDayOfWeekIndex(dateKey);
  const dayStartMinutes = input.dayStartMinutes ?? 360; // 06:00
  const dayEndMinutes = input.dayEndMinutes ?? 1380;     // 23:00

  const rawBlocks: Omit<TimelineBlock, 'laneIndex' | 'totalLanes'>[] = [];

  // Helper map for course lookups
  const courseMap = new Map<string, Course>();
  if (input.courses) {
    for (const c of input.courses) {
      courseMap.set(c.id, c);
    }
  }

  // 1. Process Classes
  if (input.classes && input.classes.length > 0) {
    for (const item of input.classes) {
      const startMin = timeStringToMinutes(item.startTime);
      const endMin = timeStringToMinutes(item.endTime);
      if (startMin === null || endMin === null) continue;

      let effectiveEnd = endMin;
      // Handle crossing midnight: if end <= start, clip to end of day
      if (effectiveEnd <= startMin) {
        effectiveEnd = 1440;
      }
      const clippedStart = Math.max(0, startMin);
      const clippedEnd = Math.min(1440, effectiveEnd);
      if (clippedEnd <= clippedStart) continue;

      const courseColor = item.course?.color || courseMap.get(item.session?.courseId)?.color || '#6366f1';
      const status: TimelineBlockStatus = item.isCancelled
        ? 'cancelled'
        : item.isMoved
        ? 'moved'
        : 'normal';

      const locationStr = [item.building, item.room].filter(Boolean).join(' ') || item.room || undefined;
      const subtitle = [
        item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'Class',
        locationStr,
        item.instructor,
      ]
        .filter(Boolean)
        .join(' • ');

      rawBlocks.push({
        id: `class-${item.session?.id || Math.random()}-${dateKey}`,
        title: `${item.course?.code || ''} ${item.course?.name || 'Class'}`.trim(),
        subtitle,
        location: locationStr,
        startMinutes: clippedStart,
        endMinutes: clippedEnd,
        startTime: item.startTime,
        endTime: minutesToTimeString(clippedEnd),
        durationMinutes: clippedEnd - clippedStart,
        kind: 'class',
        colour: courseColor,
        status,
        originalItem: item,
      });
    }
  }

  // 2. Process Study Blocks
  if (input.studyBlocks && input.studyBlocks.length > 0) {
    for (const sb of input.studyBlocks) {
      if (sb.date !== dateKey) continue;
      const startMin = timeStringToMinutes(sb.startTime);
      const endMin = timeStringToMinutes(sb.endTime);
      if (startMin === null || endMin === null) continue;

      let effectiveEnd = endMin;
      if (effectiveEnd <= startMin) effectiveEnd = 1440;
      const clippedStart = Math.max(0, startMin);
      const clippedEnd = Math.min(1440, effectiveEnd);
      if (clippedEnd <= clippedStart) continue;

      const course = courseMap.get(sb.courseId);
      const colour = course?.color || '#8b5cf6';
      const status: TimelineBlockStatus =
        sb.status === 'cancelled' ? 'cancelled' : sb.status === 'completed' ? 'completed' : 'normal';

      rawBlocks.push({
        id: `study-${sb.id}`,
        title: sb.title || 'Study Session',
        subtitle: sb.topicTitle ? `Topic: ${sb.topicTitle}` : (course?.code ? `Course: ${course.code}` : 'Study Block'),
        startMinutes: clippedStart,
        endMinutes: clippedEnd,
        startTime: sb.startTime,
        endTime: minutesToTimeString(clippedEnd),
        durationMinutes: clippedEnd - clippedStart,
        kind: 'study',
        colour,
        status,
        originalItem: sb,
      });
    }
  }

  // 3. Process Tasks with due times
  if (input.tasks && input.tasks.length > 0) {
    for (const task of input.tasks) {
      if (task.dueDate !== dateKey) continue;
      if (!task.dueTime) continue; // Skip tasks without designated time

      const startMin = timeStringToMinutes(task.dueTime);
      if (startMin === null) continue;

      const estMins = getTaskEstimatedMinutes(task.effort);
      const endMin = Math.min(1440, startMin + estMins);
      if (endMin <= startMin) continue;

      const course = task.courseId ? courseMap.get(task.courseId) : undefined;
      const colour = course?.color || '#f59e0b';
      const status: TimelineBlockStatus = task.status === 'done' ? 'completed' : 'normal';

      rawBlocks.push({
        id: `task-${task.id}`,
        title: task.title,
        subtitle: [
          course?.code,
          task.priority === 'high' ? 'High Priority' : undefined,
          task.isOverdueRolledOver ? 'Rolled over' : undefined,
        ].filter(Boolean).join(' • ') || 'Task Due',
        startMinutes: startMin,
        endMinutes: endMin,
        startTime: task.dueTime,
        endTime: minutesToTimeString(endMin),
        durationMinutes: endMin - startMin,
        kind: 'task',
        colour,
        status,
        originalItem: task,
      });
    }
  }

  // 4. Process Exams
  if (input.exams && input.exams.length > 0) {
    for (const exam of input.exams) {
      if (exam.examDate !== dateKey) continue;
      const startTimeStr = exam.startTime || '09:00';
      const startMin = timeStringToMinutes(startTimeStr);
      if (startMin === null) continue;

      const endMin = Math.min(1440, startMin + 120);

      const course = exam.courseId ? courseMap.get(exam.courseId) : undefined;
      const locationStr = exam.hall || undefined;

      rawBlocks.push({
        id: `exam-${exam.id}`,
        title: `Exam: ${exam.title || course?.name || 'Examination'}`,
        subtitle: [course?.code, locationStr, exam.weight ? `${exam.weight}% weight` : undefined]
          .filter(Boolean)
          .join(' • '),
        location: locationStr,
        startMinutes: startMin,
        endMinutes: endMin,
        startTime: startTimeStr,
        endTime: minutesToTimeString(endMin),
        durationMinutes: endMin - startMin,
        kind: 'exam',
        colour: '#ef4444',
        status: 'normal',
        originalItem: exam,
      });
    }
  }

  // 5. Process Master Week Blocks
  if (input.masterWeekBlocks && input.masterWeekBlocks.length > 0) {
    for (const mwb of input.masterWeekBlocks) {
      if (mwb.dayOfWeek !== dayOfWeek) continue;
      const startMin = timeStringToMinutes(mwb.startTime);
      const endMin = timeStringToMinutes(mwb.endTime);
      if (startMin === null || endMin === null) continue;

      let effectiveEnd = endMin;
      if (effectiveEnd <= startMin) effectiveEnd = 1440;
      const clippedStart = Math.max(0, startMin);
      const clippedEnd = Math.min(1440, effectiveEnd);
      if (clippedEnd <= clippedStart) continue;

      const course = mwb.courseId ? courseMap.get(mwb.courseId) : undefined;
      const colour = mwb.color || course?.color || '#10b981';

      rawBlocks.push({
        id: `masterweek-${mwb.id}`,
        title: mwb.title,
        subtitle: mwb.category ? `${mwb.category.toUpperCase()} • Routine` : 'Master Schedule',
        startMinutes: clippedStart,
        endMinutes: clippedEnd,
        startTime: mwb.startTime,
        endTime: minutesToTimeString(clippedEnd),
        durationMinutes: clippedEnd - clippedStart,
        kind: 'masterWeek',
        colour,
        status: 'normal',
        originalItem: mwb,
      });
    }
  }

  // 6. Process Focus Sessions
  if (input.focusSessions && input.focusSessions.length > 0) {
    for (const fs of input.focusSessions) {
      if (!fs.startedAt) continue;
      const sessionDate = fs.startedAt.slice(0, 10);
      if (sessionDate !== dateKey) continue;

      // Extract local HH:MM from ISO string or Date
      const startDate = new Date(fs.startedAt);
      if (isNaN(startDate.getTime())) continue;

      const startMin = startDate.getHours() * 60 + startDate.getMinutes();
      const duration = fs.minutesFocused || fs.actualMinutes || 25;
      const endMin = Math.min(1440, startMin + duration);
      if (endMin <= startMin) continue;

      const course = fs.courseId ? courseMap.get(fs.courseId) : undefined;

      rawBlocks.push({
        id: `focus-${fs.id}`,
        title: fs.notes || 'Focus Session',
        subtitle: `${duration}m Deep Work • ${course?.code || 'Self-study'}`,
        startMinutes: startMin,
        endMinutes: endMin,
        startTime: minutesToTimeString(startMin),
        endTime: minutesToTimeString(endMin),
        durationMinutes: endMin - startMin,
        kind: 'focus',
        colour: '#06b6d4',
        status: 'completed',
        originalItem: fs,
      });
    }
  }

  // Sort blocks chronologically: earlier start time first; if tied, longer duration first
  rawBlocks.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }
    return (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
  });

  // Assign lane index and total lanes to resolve overlapping blocks
  const blocksWithLanes: TimelineBlock[] = assignOverlapLanes(rawBlocks);

  // If currentMinutes is provided, flag isPast
  if (typeof input.currentMinutes === 'number') {
    for (const b of blocksWithLanes) {
      b.isPast = b.endMinutes <= input.currentMinutes;
    }
  }

  // Compute Free Gaps between busy, non-cancelled events
  const freeGaps = computeFreeGaps(blocksWithLanes, dayStartMinutes, dayEndMinutes);

  // Calculate earliest and latest block minutes
  let earliest = dayStartMinutes;
  let latest = dayEndMinutes;
  if (blocksWithLanes.length > 0) {
    const minStart = Math.min(...blocksWithLanes.map((b) => b.startMinutes));
    const maxEnd = Math.max(...blocksWithLanes.map((b) => b.endMinutes));
    earliest = Math.min(dayStartMinutes, minStart);
    latest = Math.max(dayEndMinutes, maxEnd);
  }

  return {
    dateKey,
    blocks: blocksWithLanes,
    freeGaps,
    dayStartMinutes,
    dayEndMinutes,
    earliestBlockMinutes: earliest,
    latestBlockMinutes: latest,
  };
}

/**
 * Assigns laneIndex and totalLanes to overlapping blocks using interval graph coloring.
 * Non-overlapping blocks receive laneIndex 0 and totalLanes 1.
 */
function assignOverlapLanes(
  items: Omit<TimelineBlock, 'laneIndex' | 'totalLanes'>[]
): TimelineBlock[] {
  if (items.length === 0) return [];

  // 1. Partition into connected overlap clusters
  // Two blocks overlap if startA < endB && endA > startB (back-to-back do not overlap)
  const clusters: Array<typeof items> = [];
  let currentCluster: typeof items = [];
  let clusterMaxEnd = -1;

  for (const item of items) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterMaxEnd = item.endMinutes;
    } else if (item.startMinutes < clusterMaxEnd) {
      // Overlaps with current cluster
      currentCluster.push(item);
      clusterMaxEnd = Math.max(clusterMaxEnd, item.endMinutes);
    } else {
      // Disjoint / back-to-back: start new cluster
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterMaxEnd = item.endMinutes;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // 2. Assign laneIndex greedy coloring within each cluster
  const result: TimelineBlock[] = [];

  for (const cluster of clusters) {
    if (cluster.length === 1) {
      result.push({
        ...cluster[0],
        laneIndex: 0,
        totalLanes: 1,
      });
      continue;
    }

    // Lane end times tracking: laneEnds[laneIndex] = endMinutes of current occupant
    const laneEnds: number[] = [];
    const clusterAssigned: { block: typeof items[0]; lane: number }[] = [];

    for (const block of cluster) {
      // Find the first lane that is free by block.startMinutes
      let assignedLane = -1;
      for (let i = 0; i < laneEnds.length; i++) {
        if (laneEnds[i] <= block.startMinutes) {
          assignedLane = i;
          laneEnds[i] = block.endMinutes;
          break;
        }
      }
      if (assignedLane === -1) {
        // Need a new lane
        assignedLane = laneEnds.length;
        laneEnds.push(block.endMinutes);
      }
      clusterAssigned.push({ block, lane: assignedLane });
    }

    const totalLanesInCluster = laneEnds.length;
    for (const ca of clusterAssigned) {
      result.push({
        ...ca.block,
        laneIndex: ca.lane,
        totalLanes: totalLanesInCluster,
      });
    }
  }

  return result;
}

/**
 * Computes unallocated free time intervals between active (non-cancelled) blocks
 * within the day window [dayStartMinutes, dayEndMinutes].
 */
function computeFreeGaps(
  blocks: TimelineBlock[],
  dayStartMinutes: number,
  dayEndMinutes: number
): FreeGap[] {
  // Only non-cancelled blocks occupy time
  const busyBlocks = blocks.filter((b) => b.status !== 'cancelled');

  if (busyBlocks.length === 0) {
    const duration = dayEndMinutes - dayStartMinutes;
    if (duration >= 15) {
      return [
        {
          startMinutes: dayStartMinutes,
          endMinutes: dayEndMinutes,
          startTime: minutesToTimeString(dayStartMinutes),
          endTime: minutesToTimeString(dayEndMinutes),
          durationMinutes: duration,
          label: `Free all day until ${minutesToTimeString(dayEndMinutes)}`,
        },
      ];
    }
    return [];
  }

  // Merge overlapping and contiguous busy intervals
  const intervals: { start: number; end: number }[] = [];
  const sorted = [...busyBlocks].sort((a, b) => a.startMinutes - b.startMinutes);

  for (const block of sorted) {
    const start = Math.max(dayStartMinutes, block.startMinutes);
    const end = Math.min(dayEndMinutes, block.endMinutes);
    if (end <= start) continue;

    if (intervals.length === 0) {
      intervals.push({ start, end });
    } else {
      const last = intervals[intervals.length - 1];
      if (start <= last.end) {
        // Overlap or touch: merge
        last.end = Math.max(last.end, end);
      } else {
        intervals.push({ start, end });
      }
    }
  }

  const gaps: FreeGap[] = [];
  let pointer = dayStartMinutes;

  for (const interval of intervals) {
    if (interval.start > pointer) {
      const gapDuration = interval.start - pointer;
      if (gapDuration >= 15) {
        const gapStart = pointer;
        const gapEnd = interval.start;
        gaps.push({
          startMinutes: gapStart,
          endMinutes: gapEnd,
          startTime: minutesToTimeString(gapStart),
          endTime: minutesToTimeString(gapEnd),
          durationMinutes: gapDuration,
          label: `Free until ${minutesToTimeString(gapEnd)}`,
        });
      }
    }
    pointer = Math.max(pointer, interval.end);
  }

  // Final gap from last interval to dayEndMinutes
  if (pointer < dayEndMinutes) {
    const gapDuration = dayEndMinutes - pointer;
    if (gapDuration >= 15) {
      gaps.push({
        startMinutes: pointer,
        endMinutes: dayEndMinutes,
        startTime: minutesToTimeString(pointer),
        endTime: minutesToTimeString(dayEndMinutes),
        durationMinutes: gapDuration,
        label: `Free evening until ${minutesToTimeString(dayEndMinutes)}`,
      });
    }
  }

  return gaps;
}
