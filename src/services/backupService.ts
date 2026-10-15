import { db } from '../db/db';
import { getTodayKey } from '../utils/dateUtils';

export interface BackupData {
  version: number;
  exportedAt: string;
  data: {
    settings: any[];
    courses: any[];
    classSessions: any[];
    classExceptions: any[];
    attendance: any[];
    gradeComponents: any[];
    tasks: any[];
    exams: any[];
    examTopics: any[];
    projects: any[];
    projectMilestones: any[];
    projectTasks: any[];
    projectMembers: any[];
    projectMeetings: any[];
    focusSessions: any[];
    habits: any[];
    habitLogs: any[];
    journalEntries: any[];
    masterWeekBlocks: any[];
    transactions: any[];
    budgets: any[];
    savingsGoals: any[];
    creativeProjects: any[];
    creativeSessions: any[];
    readingItems: any[];
    learningQueue: any[];
    xpEvents: any[];
    achievementsUnlocked: any[];
    quests: any[];
    ritualRuns: any[];
  };
}

export async function exportDatabaseToJson(): Promise<string> {
  const backup: BackupData = {
    version: 1,
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

export async function restoreDatabaseFromJson(jsonString: string, mode: 'replace' | 'merge'): Promise<{ success: boolean; message: string }> {
  try {
    const parsed: BackupData = JSON.parse(jsonString);
    if (!parsed || !parsed.data) {
      return { success: false, message: 'Invalid backup file structure.' };
    }

    if (mode === 'replace') {
      // Automatic safety snapshot download before replacing
      const snapshot = await exportDatabaseToJson();
      downloadFile(snapshot, `pre-restore-safety-snapshot-${Date.now()}.json`);

      // Clear existing tables
      await Promise.all([
        db.settings.clear(),
        db.courses.clear(),
        db.classSessions.clear(),
        db.classExceptions.clear(),
        db.attendance.clear(),
        db.gradeComponents.clear(),
        db.tasks.clear(),
        db.exams.clear(),
        db.examTopics.clear(),
        db.projects.clear(),
        db.projectMilestones.clear(),
        db.projectTasks.clear(),
        db.projectMembers.clear(),
        db.projectMeetings.clear(),
        db.focusSessions.clear(),
        db.habits.clear(),
        db.habitLogs.clear(),
        db.journalEntries.clear(),
        db.masterWeekBlocks.clear(),
        db.transactions.clear(),
        db.budgets.clear(),
        db.savingsGoals.clear(),
        db.creativeProjects.clear(),
        db.creativeSessions.clear(),
        db.readingItems.clear(),
        db.learningQueue.clear(),
        db.xpEvents.clear(),
        db.achievementsUnlocked.clear(),
        db.quests.clear(),
        db.ritualRuns.clear(),
      ]);
    }

    // Populate data
    const d = parsed.data;
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

    return { success: true, message: 'Database restored successfully!' };
  } catch (err: any) {
    return { success: false, message: `Restore error: ${err.message || 'unknown error'}` };
  }
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
