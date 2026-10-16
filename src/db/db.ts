import Dexie, { type Table } from 'dexie';
import {
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
  AppSettings,
  DEFAULT_ACCOUNT_BALANCES,
  DEFAULT_DEPARTMENTS,
} from '../types';

export class CollegeLifeOSDatabase extends Dexie {
  settings!: Table<AppSettings, string>;
  courses!: Table<Course, string>;
  classSessions!: Table<ClassSession, string>;
  classExceptions!: Table<ClassException, string>;
  attendance!: Table<AttendanceRecord, string>;
  gradeComponents!: Table<GradeComponent, string>;
  tasks!: Table<Task, string>;
  exams!: Table<Exam, string>;
  examTopics!: Table<ExamTopic, string>;
  projects!: Table<Project, string>;
  projectMilestones!: Table<ProjectMilestone, string>;
  projectTasks!: Table<ProjectTask, string>;
  projectMembers!: Table<ProjectMember, string>;
  projectMeetings!: Table<ProjectMeeting, string>;
  focusSessions!: Table<FocusSession, string>;
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  journalEntries!: Table<JournalEntry, string>;
  masterWeekBlocks!: Table<MasterWeekBlock, string>;
  transactions!: Table<Transaction, string>;
  budgets!: Table<Budget, string>;
  savingsGoals!: Table<SavingsGoal, string>;
  creativeProjects!: Table<CreativeProject, string>;
  creativeSessions!: Table<CreativeSession, string>;
  readingItems!: Table<ReadingItem, string>;
  learningQueue!: Table<LearningTopic, string>;
  xpEvents!: Table<XpEvent, string>;
  achievementsUnlocked!: Table<Achievement, string>;
  quests!: Table<DailyQuest, string>;
  ritualRuns!: Table<RitualRun, string>;
  semesters!: Table<Semester, string>;
  restDays!: Table<RestDay, string>;

  constructor() {
    super('CollegeLifeOSDB');
    this.version(1).stores({
      settings: 'id',
      courses: 'id, code, name, term',
      classSessions: 'id, courseId, dayOfWeek, startTime, endTime',
      classExceptions: 'id, sessionId, date',
      attendance: 'id, courseId, date',
      gradeComponents: 'id, courseId',
      tasks: 'id, courseId, status, dueDate, priority, contextTag',
      exams: 'id, courseId, examDate',
      examTopics: 'id, examId, isStudied',
      projects: 'id, courseId, status, deadline',
      projectMilestones: 'id, projectId, order',
      projectTasks: 'id, projectId, column',
      projectMembers: 'id, projectId',
      projectMeetings: 'id, projectId, date',
      focusSessions: 'id, courseId, projectId, completedAt',
      habits: 'id, category, type',
      habitLogs: 'id, habitId, date',
      journalEntries: 'id, date',
      masterWeekBlocks: 'id, dayOfWeek, dayType',
      transactions: 'id, type, date, category',
      budgets: 'id, category',
      savingsGoals: 'id',
      creativeProjects: 'id, type, currentStage',
      creativeSessions: 'id, creativeProjectId, date',
      readingItems: 'id, isFinished',
      learningQueue: 'id, status, order',
      xpEvents: 'id, source, sourceId, dayKey, stat, timestamp',
      achievementsUnlocked: 'id, category, isUnlocked',
      quests: 'id, dayKey, isDone',
      ritualRuns: 'id, type, date',
    });

    this.version(2).stores({
      semesters: 'id, name, startDate, endDate',
      restDays: 'id, habitId, dateKey',
      courses: 'id, code, name, term, semesterId',
      classSessions: 'id, courseId, semesterId, dayOfWeek, startTime, endTime',
    }).upgrade(async (tx) => {
      // Additive upgrade: create default semester and link existing courses and sessions
      const settingsTable = tx.table<AppSettings, string>('settings');
      const coursesTable = tx.table<Course, string>('courses');
      const sessionsTable = tx.table<ClassSession, string>('classSessions');
      const semestersTable = tx.table<Semester, string>('semesters');

      const currentUser = await settingsTable.get('current_user');
      const termName = currentUser?.currentTermName || 'Year 1 - Semester I';

      const now = new Date();
      const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const startMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 12, 0, 0);
      const startStr = `${startMon.getFullYear()}-${String(startMon.getMonth() + 1).padStart(2, '0')}-${String(startMon.getDate()).padStart(2, '0')}`;
      
      const endSun = new Date(startMon);
      endSun.setDate(endSun.getDate() + 17 * 7 - 1);
      const endStr = `${endSun.getFullYear()}-${String(endSun.getMonth() + 1).padStart(2, '0')}-${String(endSun.getDate()).padStart(2, '0')}`;

      const defaultSemesterId = 'sem-default-term';
      await semestersTable.put({
        id: defaultSemesterId,
        name: termName,
        startDate: startStr,
        endDate: endStr,
        isActive: true,
      });

      await settingsTable.update('current_user', {
        activeSemesterId: defaultSemesterId,
      });

      await coursesTable.toCollection().modify((c) => {
        if (!c.semesterId) {
          c.semesterId = defaultSemesterId;
        }
      });

      await sessionsTable.toCollection().modify((s) => {
        if (!s.semesterId) {
          s.semesterId = defaultSemesterId;
        }
      });
    });
  }
}

export const db = new CollegeLifeOSDatabase();

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'current_user',
  userName: 'Scholar',
  universityName: 'Addis Ababa Science & Technology University',
  currentTermName: 'Year 1 - Semester I',
  targetCgpa: 3.85,
  yearlyBookGoal: 40,
  isLowEnergy: false,
  isDormDay: true,
  soundEnabled: false,
  hapticsEnabled: true,
  showXpPopups: true,
  backupReminderDays: 14,
  theme: 'pink-lobby',
  pageAccents: {},
  storageProtected: false,
  gradingScale: [
    { letter: 'A+', gpa: 4.0, minPercent: 90 },
    { letter: 'A', gpa: 4.0, minPercent: 85 },
    { letter: 'A-', gpa: 3.75, minPercent: 80 },
    { letter: 'B+', gpa: 3.5, minPercent: 75 },
    { letter: 'B', gpa: 3.0, minPercent: 70 },
    { letter: 'B-', gpa: 2.75, minPercent: 65 },
    { letter: 'C+', gpa: 2.5, minPercent: 60 },
    { letter: 'C', gpa: 2.0, minPercent: 50 },
    { letter: 'C-', gpa: 1.75, minPercent: 45 },
    { letter: 'D', gpa: 1.0, minPercent: 40 },
    { letter: 'Fx', gpa: 0.0, minPercent: 30 },
    { letter: 'F', gpa: 0.0, minPercent: 0 },
  ],
  attendanceThresholdPercent: 80,
  accountBalances: DEFAULT_ACCOUNT_BALANCES,
  departmentOptions: DEFAULT_DEPARTMENTS,
};

// Initialize base settings if not exists
export async function initializeDatabase() {
  const existing = await db.settings.get('current_user');
  if (!existing) {
    await db.settings.put(DEFAULT_SETTINGS);
  } else {
    const updates: Partial<AppSettings> = {};
    if (!existing.accountBalances) {
      updates.accountBalances = DEFAULT_ACCOUNT_BALANCES;
    }
    if (!existing.departmentOptions || existing.departmentOptions.length === 0) {
      updates.departmentOptions = DEFAULT_DEPARTMENTS;
    }
    if (Object.keys(updates).length > 0) {
      await db.settings.update('current_user', updates);
    }
  }

  // Ensure an active semester exists
  const semCount = await db.semesters.count();
  if (semCount === 0) {
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const startMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 12, 0, 0);
    const startStr = `${startMon.getFullYear()}-${String(startMon.getMonth() + 1).padStart(2, '0')}-${String(startMon.getDate()).padStart(2, '0')}`;
    const endSun = new Date(startMon);
    endSun.setDate(endSun.getDate() + 17 * 7 - 1);
    const endStr = `${endSun.getFullYear()}-${String(endSun.getMonth() + 1).padStart(2, '0')}-${String(endSun.getDate()).padStart(2, '0')}`;

    const defaultSemesterId = 'sem-active-term';
    await db.semesters.put({
      id: defaultSemesterId,
      name: 'Year 1 - Semester I',
      startDate: startStr,
      endDate: endStr,
      isActive: true,
    });
    await db.settings.update('current_user', {
      activeSemesterId: defaultSemesterId,
      currentTermName: 'Year 1 - Semester I',
    });
  }

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      await db.settings.update('current_user', { storageProtected: isPersisted });
    } catch {
      // Ignore
    }
  }
}
