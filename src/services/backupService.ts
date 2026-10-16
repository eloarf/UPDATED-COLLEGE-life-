import { db } from '../db/db';
import { getTodayKey } from '../utils/dateUtils';
import {
  AppSettings,
  Course,
  ClassSession,
  ClassException,
  AttendanceRecord,
  GradeComponent,
  Task,
  Exam,
  ExamTopic,
  Project,
  ProjectMilestone,
  ProjectTask,
  ProjectMember,
  ProjectMeeting,
  FocusSession,
  Habit,
  HabitLog,
  JournalEntry,
  MasterWeekBlock,
  Transaction,
  Budget,
  SavingsGoal,
  CreativeProject,
  CreativeSession,
  ReadingItem,
  LearningTopic,
  XpEvent,
  Achievement,
  DailyQuest,
  RitualRun,
  Semester,
  RestDay,
} from '../types';

export const CURRENT_BACKUP_VERSION = 2;

export interface BackupData {
  version: number;
  exportedAt: string;
  data: {
    settings?: AppSettings[];
    courses?: Course[];
    classSessions?: ClassSession[];
    classExceptions?: ClassException[];
    attendance?: AttendanceRecord[];
    gradeComponents?: GradeComponent[];
    tasks?: Task[];
    exams?: Exam[];
    examTopics?: ExamTopic[];
    projects?: Project[];
    projectMilestones?: ProjectMilestone[];
    projectTasks?: ProjectTask[];
    projectMembers?: ProjectMember[];
    projectMeetings?: ProjectMeeting[];
    focusSessions?: FocusSession[];
    habits?: Habit[];
    habitLogs?: HabitLog[];
    journalEntries?: JournalEntry[];
    masterWeekBlocks?: MasterWeekBlock[];
    transactions?: Transaction[];
    budgets?: Budget[];
    savingsGoals?: SavingsGoal[];
    creativeProjects?: CreativeProject[];
    creativeSessions?: CreativeSession[];
    readingItems?: ReadingItem[];
    learningQueue?: LearningTopic[];
    xpEvents?: XpEvent[];
    achievementsUnlocked?: Achievement[];
    quests?: DailyQuest[];
    ritualRuns?: RitualRun[];
    semesters?: Semester[];
    restDays?: RestDay[];
  };
}

const ALL_TABLES = [
  db.settings,
  db.courses,
  db.classSessions,
  db.classExceptions,
  db.attendance,
  db.gradeComponents,
  db.tasks,
  db.exams,
  db.examTopics,
  db.projects,
  db.projectMilestones,
  db.projectTasks,
  db.projectMembers,
  db.projectMeetings,
  db.focusSessions,
  db.habits,
  db.habitLogs,
  db.journalEntries,
  db.masterWeekBlocks,
  db.transactions,
  db.budgets,
  db.savingsGoals,
  db.creativeProjects,
  db.creativeSessions,
  db.readingItems,
  db.learningQueue,
  db.xpEvents,
  db.achievementsUnlocked,
  db.quests,
  db.ritualRuns,
  db.semesters,
  db.restDays,
];

export async function exportDatabaseToJson(): Promise<string> {
  const backup: BackupData = {
    version: CURRENT_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      settings: await db.settings.toArray(),
      courses: await db.courses.toArray(),
      classSessions: await db.classSessions.toArray(),
      classExceptions: await db.classExceptions.toArray(),
      attendance: await db.attendance.toArray(),
      gradeComponents: await db.gradeComponents.toArray(),
      tasks: await db.tasks.toArray(),
      exams: await db.exams.toArray(),
      examTopics: await db.examTopics.toArray(),
      projects: await db.projects.toArray(),
      projectMilestones: await db.projectMilestones.toArray(),
      projectTasks: await db.projectTasks.toArray(),
      projectMembers: await db.projectMembers.toArray(),
      projectMeetings: await db.projectMeetings.toArray(),
      focusSessions: await db.focusSessions.toArray(),
      habits: await db.habits.toArray(),
      habitLogs: await db.habitLogs.toArray(),
      journalEntries: await db.journalEntries.toArray(),
      masterWeekBlocks: await db.masterWeekBlocks.toArray(),
      transactions: await db.transactions.toArray(),
      budgets: await db.budgets.toArray(),
      savingsGoals: await db.savingsGoals.toArray(),
      creativeProjects: await db.creativeProjects.toArray(),
      creativeSessions: await db.creativeSessions.toArray(),
      readingItems: await db.readingItems.toArray(),
      learningQueue: await db.learningQueue.toArray(),
      xpEvents: await db.xpEvents.toArray(),
      achievementsUnlocked: await db.achievementsUnlocked.toArray(),
      quests: await db.quests.toArray(),
      ritualRuns: await db.ritualRuns.toArray(),
      semesters: await db.semesters.toArray(),
      restDays: await db.restDays.toArray(),
    },
  };

  return JSON.stringify(backup, null, 2);
}

export function downloadFile(content: string, filename: string, type: string = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function triggerBackupDownload() {
  const json = await exportDatabaseToJson();
  const filename = `college-life-os-backup-${getTodayKey()}.json`;
  downloadFile(json, filename, 'application/json');

  await db.settings.update('current_user', {
    lastBackupDate: new Date().toISOString(),
  });
}

export interface ValidationSuccess {
  valid: true;
  version: number;
  exportedAt: string;
  tableCounts: Record<string, number>;
  totalRecords: number;
  backup: BackupData;
}

export interface ValidationFailure {
  valid: false;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validates a backup JSON string prior to any database operation.
 * Guarantees proper JSON structure, numeric version, array format, and non-empty string IDs for every record.
 */
export function validateBackupFile(jsonString: string): ValidationResult {
  if (!jsonString || typeof jsonString !== 'string' || !jsonString.trim()) {
    return { valid: false, error: 'The provided file is empty.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON format';
    return { valid: false, error: `Invalid JSON file: ${msg}` };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, error: 'Backup root must be a valid JSON object.' };
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.version !== 'number') {
    return { valid: false, error: 'Backup is missing a valid numeric "version" field.' };
  }

  if (obj.version > CURRENT_BACKUP_VERSION) {
    return {
      valid: false,
      error: `This backup was created with schema version ${obj.version}, but this app only supports up to version ${CURRENT_BACKUP_VERSION}. Please update the app before restoring this file.`,
    };
  }

  if (typeof obj.data !== 'object' || obj.data === null || Array.isArray(obj.data)) {
    return { valid: false, error: 'Backup is missing a valid "data" table map.' };
  }

  const data = obj.data as Record<string, unknown>;
  const tableCounts: Record<string, number> = {};
  let totalRecords = 0;

  for (const [tableName, records] of Object.entries(data)) {
    if (!Array.isArray(records)) {
      return { valid: false, error: `Table "${tableName}" is corrupted (expected an array of records).` };
    }

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      if (typeof rec !== 'object' || rec === null || Array.isArray(rec)) {
        return { valid: false, error: `Table "${tableName}" record #${i + 1} is not a valid object.` };
      }
      const item = rec as Record<string, unknown>;
      if (typeof item.id !== 'string' || !item.id.trim()) {
        return {
          valid: false,
          error: `Table "${tableName}" record #${i + 1} lacks a required string "id".`,
        };
      }
    }

    tableCounts[tableName] = records.length;
    totalRecords += records.length;
  }

  return {
    valid: true,
    version: obj.version,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    tableCounts,
    totalRecords,
    backup: obj as unknown as BackupData,
  };
}

/**
 * Restores the database from a validated backup payload.
 * Runs atomically inside a single Dexie transaction.
 * In 'replace' mode, triggers a safety snapshot download first.
 */
export async function restoreDatabase(
  backup: BackupData,
  mode: 'replace' | 'merge' = 'replace'
): Promise<{ success: boolean; message: string }> {
  try {
    if (!backup || !backup.data) {
      return { success: false, message: 'Invalid backup payload.' };
    }

    if (mode === 'replace') {
      // 1. Download automated safety snapshot before clearing
      try {
        const snapshot = await exportDatabaseToJson();
        downloadFile(snapshot, `pre-restore-safety-snapshot-${getTodayKey()}-${Date.now()}.json`);
      } catch (snapshotErr) {
        console.warn('Safety snapshot notice:', snapshotErr);
      }

      // 2. All-or-nothing atomic replace inside ONE Dexie transaction
      await db.transaction('rw', ALL_TABLES, async () => {
        // Clear all 30 tables
        await Promise.all(ALL_TABLES.map((table) => table.clear()));

        // Populate validated records
        const d = backup.data;
        if (d.settings?.length) await db.settings.bulkPut(d.settings);
        if (d.courses?.length) await db.courses.bulkPut(d.courses);
        if (d.classSessions?.length) await db.classSessions.bulkPut(d.classSessions);
        if (d.classExceptions?.length) await db.classExceptions.bulkPut(d.classExceptions);
        if (d.attendance?.length) await db.attendance.bulkPut(d.attendance);
        if (d.gradeComponents?.length) await db.gradeComponents.bulkPut(d.gradeComponents);
        if (d.tasks?.length) await db.tasks.bulkPut(d.tasks);
        if (d.exams?.length) await db.exams.bulkPut(d.exams);
        if (d.examTopics?.length) await db.examTopics.bulkPut(d.examTopics);
        if (d.projects?.length) await db.projects.bulkPut(d.projects);
        if (d.projectMilestones?.length) await db.projectMilestones.bulkPut(d.projectMilestones);
        if (d.projectTasks?.length) await db.projectTasks.bulkPut(d.projectTasks);
        if (d.projectMembers?.length) await db.projectMembers.bulkPut(d.projectMembers);
        if (d.projectMeetings?.length) await db.projectMeetings.bulkPut(d.projectMeetings);
        if (d.focusSessions?.length) await db.focusSessions.bulkPut(d.focusSessions);
        if (d.habits?.length) await db.habits.bulkPut(d.habits);
        if (d.habitLogs?.length) await db.habitLogs.bulkPut(d.habitLogs);
        if (d.journalEntries?.length) await db.journalEntries.bulkPut(d.journalEntries);
        if (d.masterWeekBlocks?.length) await db.masterWeekBlocks.bulkPut(d.masterWeekBlocks);
        if (d.transactions?.length) await db.transactions.bulkPut(d.transactions);
        if (d.budgets?.length) await db.budgets.bulkPut(d.budgets);
        if (d.savingsGoals?.length) await db.savingsGoals.bulkPut(d.savingsGoals);
        if (d.creativeProjects?.length) await db.creativeProjects.bulkPut(d.creativeProjects);
        if (d.creativeSessions?.length) await db.creativeSessions.bulkPut(d.creativeSessions);
        if (d.readingItems?.length) await db.readingItems.bulkPut(d.readingItems);
        if (d.learningQueue?.length) await db.learningQueue.bulkPut(d.learningQueue);
        if (d.xpEvents?.length) await db.xpEvents.bulkPut(d.xpEvents);
        if (d.achievementsUnlocked?.length) await db.achievementsUnlocked.bulkPut(d.achievementsUnlocked);
        if (d.quests?.length) await db.quests.bulkPut(d.quests);
        if (d.ritualRuns?.length) await db.ritualRuns.bulkPut(d.ritualRuns);
        if (d.semesters?.length) await db.semesters.bulkPut(d.semesters);
        if (d.restDays?.length) await db.restDays.bulkPut(d.restDays);
      });
    } else {
      // Merge mode
      await db.transaction('rw', ALL_TABLES, async () => {
        const d = backup.data;
        if (d.settings?.length) await db.settings.bulkPut(d.settings);
        if (d.courses?.length) await db.courses.bulkPut(d.courses);
        if (d.classSessions?.length) await db.classSessions.bulkPut(d.classSessions);
        if (d.classExceptions?.length) await db.classExceptions.bulkPut(d.classExceptions);
        if (d.attendance?.length) await db.attendance.bulkPut(d.attendance);
        if (d.gradeComponents?.length) await db.gradeComponents.bulkPut(d.gradeComponents);
        if (d.tasks?.length) await db.tasks.bulkPut(d.tasks);
        if (d.exams?.length) await db.exams.bulkPut(d.exams);
        if (d.examTopics?.length) await db.examTopics.bulkPut(d.examTopics);
        if (d.projects?.length) await db.projects.bulkPut(d.projects);
        if (d.projectMilestones?.length) await db.projectMilestones.bulkPut(d.projectMilestones);
        if (d.projectTasks?.length) await db.projectTasks.bulkPut(d.projectTasks);
        if (d.projectMembers?.length) await db.projectMembers.bulkPut(d.projectMembers);
        if (d.projectMeetings?.length) await db.projectMeetings.bulkPut(d.projectMeetings);
        if (d.focusSessions?.length) await db.focusSessions.bulkPut(d.focusSessions);
        if (d.habits?.length) await db.habits.bulkPut(d.habits);
        if (d.habitLogs?.length) await db.habitLogs.bulkPut(d.habitLogs);
        if (d.journalEntries?.length) await db.journalEntries.bulkPut(d.journalEntries);
        if (d.masterWeekBlocks?.length) await db.masterWeekBlocks.bulkPut(d.masterWeekBlocks);
        if (d.transactions?.length) await db.transactions.bulkPut(d.transactions);
        if (d.budgets?.length) await db.budgets.bulkPut(d.budgets);
        if (d.savingsGoals?.length) await db.savingsGoals.bulkPut(d.savingsGoals);
        if (d.creativeProjects?.length) await db.creativeProjects.bulkPut(d.creativeProjects);
        if (d.creativeSessions?.length) await db.creativeSessions.bulkPut(d.creativeSessions);
        if (d.readingItems?.length) await db.readingItems.bulkPut(d.readingItems);
        if (d.learningQueue?.length) await db.learningQueue.bulkPut(d.learningQueue);
        if (d.xpEvents?.length) await db.xpEvents.bulkPut(d.xpEvents);
        if (d.achievementsUnlocked?.length) await db.achievementsUnlocked.bulkPut(d.achievementsUnlocked);
        if (d.quests?.length) await db.quests.bulkPut(d.quests);
        if (d.ritualRuns?.length) await db.ritualRuns.bulkPut(d.ritualRuns);
        if (d.semesters?.length) await db.semesters.bulkPut(d.semesters);
        if (d.restDays?.length) await db.restDays.bulkPut(d.restDays);
      });
    }

    return { success: true, message: 'Database restored successfully!' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown restore error';
    return { success: false, message: `Restore error: ${errorMsg}` };
  }
}

/**
 * Backward compatibility alias
 */
export async function restoreDatabaseFromJson(
  jsonString: string,
  mode: 'replace' | 'merge' = 'replace'
): Promise<{ success: boolean; message: string }> {
  const validation = validateBackupFile(jsonString);
  if (!validation.valid) {
    return { success: false, message: validation.error };
  }
  return restoreDatabase(validation.backup, mode);
}

export async function exportTasksToCsv() {
  const tasks = await db.tasks.toArray();
  const headers = ['ID', 'Title', 'CourseID', 'Priority', 'Effort', 'DueDate', 'DueTime', 'Status', 'Notes'];
  const rows = tasks.map((t) => [
    t.id,
    `"${t.title.replace(/"/g, '""')}"`,
    t.courseId || '',
    t.priority,
    t.effort,
    t.dueDate || '',
    t.dueTime || '',
    t.status,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(csv, `college-tasks-${getTodayKey()}.csv`, 'text/csv');
}
