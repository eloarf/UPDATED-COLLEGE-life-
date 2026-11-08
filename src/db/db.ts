import Dexie, { type Table } from 'dexie';
import LZString from 'lz-string';
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
  DailyReflection,
  AppSettings,
  FinancialAccount,
  DebtRecord,
  RecurringTransaction,
  AcademicGoal,
  ScheduledReminderRecord,
  StudyBlock,
  DismissedStudySuggestion,
  DEFAULT_NOTIFICATION_SETTINGS,
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
  financialAccounts!: Table<FinancialAccount, string>;
  debts!: Table<DebtRecord, string>;
  recurringTransactions!: Table<RecurringTransaction, string>;
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
  dailyReflections!: Table<DailyReflection, string>;
  academicGoals!: Table<AcademicGoal, string>;
  scheduledReminders!: Table<ScheduledReminderRecord, string>;
  studyBlocks!: Table<StudyBlock, string>;
  dismissedStudySuggestions!: Table<DismissedStudySuggestion, string>;

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

    this.version(3).stores({
      dailyReflections: 'id, dateKey',
    });

    this.version(4).stores({
      journalEntries: 'id, date, isPinned, isFavorite, deletedAt',
    });

    this.version(5).stores({
      financialAccounts: 'id, name, type, isDefault, isArchived',
      debts: 'id, type, status, dueDate',
      recurringTransactions: 'id, type, accountId, frequency, nextDueDate, isActive',
      transactions: 'id, type, date, category, accountId, toAccountId',
      budgets: 'id, category, period',
      savingsGoals: 'id, accountId',
    });

    this.version(6).stores({
      academicGoals: 'id, category, status, targetDate, semesterId',
    });

    this.version(7).stores({
      scheduledReminders: 'id, numericId, category, targetTime, entityId',
    });

    this.version(8).stores({
      studyBlocks: 'id, courseId, date, status',
      dismissedStudySuggestions: 'id, suggestionKey, dateKey',
    });
  }
}

export const db = new CollegeLifeOSDatabase();

// Lifecycle Handlers to prevent multi-tab database upgrade deadlock
db.on('versionchange', () => {
  console.warn('[CollegeLifeOS DB] Database version change detected from another tab or window.');
  // Flush emergency backup synchronously before closing connection
  saveEmergencyBackup(true).catch((err) => {
    console.warn('[CollegeLifeOS DB] Pre-close backup notice:', err);
  });
  db.close();
  // Auto-reconnect after a brief delay so subsequent actions don't fail permanently
  setTimeout(() => {
    if (!db.isOpen()) {
      db.open().catch((e) => console.warn('[CollegeLifeOS DB] Auto-reconnect notice:', e));
    }
  }, 1000);
  return false;
});

db.on('blocked', () => {
  console.warn('[CollegeLifeOS DB] Database upgrade blocked by an open connection in another tab.');
});

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
  appearanceMode: 'light',
  designStyle: 'editorial-retro',
  fontStyle: 'serif',
  layoutDensity: 'comfortable',
  cardBorderGlow: false,
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
  notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
};

// Storage Keys
export const LOCAL_EMERGENCY_KEY_V2 = 'college_os_emergency_backup_v2';
export const LOCAL_EMERGENCY_KEY_PREV = 'college_os_emergency_backup_prev';
export const LOCAL_EMERGENCY_KEY_META = 'college_os_emergency_backup_meta';
export const LOCAL_EMERGENCY_KEY_LEGACY = 'college_os_emergency_backup_v1';
// Backwards compatible export
export const LOCAL_EMERGENCY_KEY = LOCAL_EMERGENCY_KEY_V2;

export interface EmergencyBackupPayload {
  version: number;
  savedAt: string;
  totalRecords: number;
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
    financialAccounts?: FinancialAccount[];
    debts?: DebtRecord[];
    recurringTransactions?: RecurringTransaction[];
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
    dailyReflections?: DailyReflection[];
    academicGoals?: AcademicGoal[];
    scheduledReminders?: ScheduledReminderRecord[];
    studyBlocks?: StudyBlock[];
    dismissedStudySuggestions?: DismissedStudySuggestion[];
  };
}

export interface EmergencyBackupMeta {
  exists: boolean;
  version?: number;
  savedAt?: string;
  totalRecords?: number;
  compressedBytes?: number;
  tableCounts?: Record<string, number>;
  source?: 'v2' | 'v1' | 'prev';
}

// In-memory cache to prevent unnecessary re-serialization and support sync flush on unload
let latestPayloadCache: EmergencyBackupPayload | null = null;
let emergencyBackupTimeout: ReturnType<typeof setTimeout> | null = null;
let isDirty = false;

/**
 * Attaches mutation hooks to all tables in the database.
 * Every create, update, and delete will mark the state dirty and schedule a debounced mirror save.
 */
function attachDatabaseHooks() {
  const allTables: Table<any, any>[] = [
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
    db.financialAccounts,
    db.debts,
    db.recurringTransactions,
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
    db.dailyReflections,
    db.academicGoals,
    db.studyBlocks,
    db.dismissedStudySuggestions,
  ];

  for (const table of allTables) {
    if (table && typeof table.hook === 'function') {
      try {
        table.hook('creating', () => {
          triggerDebouncedEmergencyMirror();
        });
        table.hook('updating', () => {
          triggerDebouncedEmergencyMirror();
        });
        table.hook('deleting', () => {
          triggerDebouncedEmergencyMirror();
        });
      } catch (err) {
        console.warn(`[CollegeLifeOS DB] Hook registration notice for table:`, err);
      }
    }
  }
}

// Register hooks immediately
attachDatabaseHooks();

/**
 * Triggers a debounced mirror save when data changes anywhere in the app.
 */
export function triggerDebouncedEmergencyMirror(debounceMs: number = 1500) {
  isDirty = true;
  if (emergencyBackupTimeout) {
    clearTimeout(emergencyBackupTimeout);
  }
  emergencyBackupTimeout = setTimeout(() => {
    saveEmergencyBackup(false);
  }, debounceMs);
}

/**
 * Safely decompress and parse a stored backup string.
 * Supports UTF-16 compressed, base64 compressed, and raw uncompressed JSON.
 */
export function deserializeEmergencyPayload(raw: string): EmergencyBackupPayload | null {
  if (!raw || typeof raw !== 'string') return null;

  // 1. Check if uncompressed JSON
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && parsed.data) {
        return parsed as EmergencyBackupPayload;
      }
    } catch {
      // Continue to try decompressing
    }
  }

  // 2. Try UTF-16 decompression (v2 primary)
  try {
    const decompressed = LZString.decompressFromUTF16(raw);
    if (decompressed) {
      const parsed = JSON.parse(decompressed);
      if (parsed && typeof parsed === 'object' && parsed.data) {
        return parsed as EmergencyBackupPayload;
      }
    }
  } catch {
    // Continue
  }

  // 3. Try standard LZ-string decompression
  try {
    const decompressed = LZString.decompress(raw);
    if (decompressed) {
      const parsed = JSON.parse(decompressed);
      if (parsed && typeof parsed === 'object' && parsed.data) {
        return parsed as EmergencyBackupPayload;
      }
    }
  } catch {
    // Fallback
  }

  return null;
}

/**
 * Loads the latest valid emergency payload across storage tiers (v2 -> legacy v1 -> rollback prev).
 */
export function loadLatestEmergencyPayload(): { payload: EmergencyBackupPayload; source: 'v2' | 'v1' | 'prev' } | null {
  if (typeof localStorage === 'undefined') return null;

  // Tier 1: Primary compressed snapshot (v2)
  try {
    const rawV2 = localStorage.getItem(LOCAL_EMERGENCY_KEY_V2);
    if (rawV2) {
      const payload = deserializeEmergencyPayload(rawV2);
      if (payload && payload.totalRecords > 0) {
        return { payload, source: 'v2' };
      }
    }
  } catch (err) {
    console.warn('[CollegeLifeOS DB] Reading v2 mirror notice:', err);
  }

  // Tier 2: Legacy uncompressed snapshot (v1)
  try {
    const rawV1 = localStorage.getItem(LOCAL_EMERGENCY_KEY_LEGACY);
    if (rawV1) {
      const payload = deserializeEmergencyPayload(rawV1);
      if (payload && payload.totalRecords > 0) {
        return { payload, source: 'v1' };
      }
    }
  } catch (err) {
    console.warn('[CollegeLifeOS DB] Reading legacy v1 mirror notice:', err);
  }

  // Tier 3: Rollback slot (prev)
  try {
    const rawPrev = localStorage.getItem(LOCAL_EMERGENCY_KEY_PREV);
    if (rawPrev) {
      const payload = deserializeEmergencyPayload(rawPrev);
      if (payload && payload.totalRecords > 0) {
        return { payload, source: 'prev' };
      }
    }
  } catch (err) {
    console.warn('[CollegeLifeOS DB] Reading rollback mirror notice:', err);
  }

  return null;
}

/**
 * Saves a serialized, compressed emergency snapshot of all tables into localStorage.
 * CRITICAL SAFETY RULES:
 * 1. Never overwrites a populated existing backup with an empty or reset state (prevents accidental data destruction).
 * 2. Compresses using LZ-string UTF-16 to guarantee fits within storage quotas.
 * 3. Keeps a rollback snapshot (LOCAL_EMERGENCY_KEY_PREV) prior to every overwrite.
 */
export async function saveEmergencyBackup(immediate: boolean = false): Promise<boolean> {
  const performSave = async (): Promise<boolean> => {
    try {
      if (typeof localStorage === 'undefined') return false;

      if (!db.isOpen()) {
        try {
          await db.open();
        } catch (openErr) {
          console.warn('[CollegeLifeOS DB] Database open in emergency save notice:', openErr);
          return false;
        }
      }

      // Read current state of all 33 tables
      const [
        settings,
        courses,
        classSessions,
        classExceptions,
        attendance,
        gradeComponents,
        tasks,
        exams,
        examTopics,
        projects,
        projectMilestones,
        projectTasks,
        projectMembers,
        projectMeetings,
        focusSessions,
        habits,
        habitLogs,
        journalEntries,
        masterWeekBlocks,
        transactions,
        budgets,
        savingsGoals,
        financialAccounts,
        debts,
        recurringTransactions,
        creativeProjects,
        creativeSessions,
        readingItems,
        learningQueue,
        xpEvents,
        achievementsUnlocked,
        quests,
        ritualRuns,
        semesters,
        restDays,
        dailyReflections,
        academicGoals,
        studyBlocks,
        dismissedStudySuggestions,
      ] = await Promise.all([
        db.settings.toArray().catch(() => []),
        db.courses.toArray().catch(() => []),
        db.classSessions.toArray().catch(() => []),
        db.classExceptions.toArray().catch(() => []),
        db.attendance.toArray().catch(() => []),
        db.gradeComponents.toArray().catch(() => []),
        db.tasks.toArray().catch(() => []),
        db.exams.toArray().catch(() => []),
        db.examTopics.toArray().catch(() => []),
        db.projects.toArray().catch(() => []),
        db.projectMilestones.toArray().catch(() => []),
        db.projectTasks.toArray().catch(() => []),
        db.projectMembers.toArray().catch(() => []),
        db.projectMeetings.toArray().catch(() => []),
        db.focusSessions.toArray().catch(() => []),
        db.habits.toArray().catch(() => []),
        db.habitLogs.toArray().catch(() => []),
        db.journalEntries.toArray().catch(() => []),
        db.masterWeekBlocks.toArray().catch(() => []),
        db.transactions.toArray().catch(() => []),
        db.budgets.toArray().catch(() => []),
        db.savingsGoals.toArray().catch(() => []),
        db.financialAccounts.toArray().catch(() => []),
        db.debts.toArray().catch(() => []),
        db.recurringTransactions.toArray().catch(() => []),
        db.creativeProjects.toArray().catch(() => []),
        db.creativeSessions.toArray().catch(() => []),
        db.readingItems.toArray().catch(() => []),
        db.learningQueue.toArray().catch(() => []),
        db.xpEvents.toArray().catch(() => []),
        db.achievementsUnlocked.toArray().catch(() => []),
        db.quests.toArray().catch(() => []),
        db.ritualRuns.toArray().catch(() => []),
        db.semesters.toArray().catch(() => []),
        db.restDays.toArray().catch(() => []),
        db.dailyReflections.toArray().catch(() => []),
        db.academicGoals.toArray().catch(() => []),
        db.studyBlocks.toArray().catch(() => []),
        db.dismissedStudySuggestions.toArray().catch(() => []),
      ]);

      const tableCounts: Record<string, number> = {
        settings: settings.length,
        courses: courses.length,
        classSessions: classSessions.length,
        classExceptions: classExceptions.length,
        attendance: attendance.length,
        gradeComponents: gradeComponents.length,
        tasks: tasks.length,
        exams: exams.length,
        examTopics: examTopics.length,
        projects: projects.length,
        projectMilestones: projectMilestones.length,
        projectTasks: projectTasks.length,
        projectMembers: projectMembers.length,
        projectMeetings: projectMeetings.length,
        focusSessions: focusSessions.length,
        habits: habits.length,
        habitLogs: habitLogs.length,
        journalEntries: journalEntries.length,
        masterWeekBlocks: masterWeekBlocks.length,
        transactions: transactions.length,
        budgets: budgets.length,
        savingsGoals: savingsGoals.length,
        financialAccounts: financialAccounts.length,
        debts: debts.length,
        recurringTransactions: recurringTransactions.length,
        creativeProjects: creativeProjects.length,
        creativeSessions: creativeSessions.length,
        readingItems: readingItems.length,
        learningQueue: learningQueue.length,
        xpEvents: xpEvents.length,
        achievementsUnlocked: achievementsUnlocked.length,
        quests: quests.length,
        ritualRuns: ritualRuns.length,
        semesters: semesters.length,
        restDays: restDays.length,
        dailyReflections: dailyReflections.length,
        academicGoals: academicGoals.length,
        studyBlocks: studyBlocks.length,
        dismissedStudySuggestions: dismissedStudySuggestions.length,
      };

      const totalRecords = Object.values(tableCounts).reduce((a, b) => a + b, 0);

      // Check existing backup
      const existing = loadLatestEmergencyPayload();
      const existingTotal = existing?.payload?.totalRecords || 0;

      // ANTI-DATA-LOSS GUARD:
      // If current database has almost no records (e.g. 0 or only default settings = 1),
      // but existing mirror has many records from earlier work, NEVER destroy the existing backup!
      if (totalRecords <= 1 && existingTotal > 1) {
        console.warn(
          `[CollegeLifeOS DB] Prevented destructive overwrite of emergency mirror! DB currently has ${totalRecords} records, but existing backup has ${existingTotal} records.`
        );
        // Instead of overwriting, trigger recovery of missing records
        checkAndRestoreFromEmergencyBackup(false).catch((e) => {
          console.warn('[CollegeLifeOS DB] Auto-recovery trigger notice:', e);
        });
        return false;
      }

      if (totalRecords === 0) return false;

      const payload: EmergencyBackupPayload = {
        version: 5,
        savedAt: new Date().toISOString(),
        totalRecords,
        data: {
          settings,
          courses,
          classSessions,
          classExceptions,
          attendance,
          gradeComponents,
          tasks,
          exams,
          examTopics,
          projects,
          projectMilestones,
          projectTasks,
          projectMembers,
          projectMeetings,
          focusSessions,
          habits,
          habitLogs,
          journalEntries,
          masterWeekBlocks,
          transactions,
          budgets,
          savingsGoals,
          financialAccounts,
          debts,
          recurringTransactions,
          creativeProjects,
          creativeSessions,
          readingItems,
          learningQueue,
          xpEvents,
          achievementsUnlocked,
          quests,
          ritualRuns,
          semesters,
          restDays,
          dailyReflections,
          academicGoals,
          studyBlocks,
          dismissedStudySuggestions,
        },
      };

      latestPayloadCache = payload;
      const json = JSON.stringify(payload);
      const compressed = LZString.compressToUTF16(json);

      // Save rollback slot of current backup before replacing
      const currentStoredV2 = localStorage.getItem(LOCAL_EMERGENCY_KEY_V2);
      if (currentStoredV2 && currentStoredV2 !== compressed) {
        try {
          localStorage.setItem(LOCAL_EMERGENCY_KEY_PREV, currentStoredV2);
        } catch {
          // If quota tight, ignore rollback slot
        }
      }

      // Write primary compressed snapshot
      localStorage.setItem(LOCAL_EMERGENCY_KEY_V2, compressed);

      // Write lightweight metadata for fast UI inspection
      const meta: EmergencyBackupMeta = {
        exists: true,
        version: 4,
        savedAt: payload.savedAt,
        totalRecords,
        compressedBytes: compressed.length * 2,
        tableCounts,
        source: 'v2',
      };
      localStorage.setItem(LOCAL_EMERGENCY_KEY_META, JSON.stringify(meta));
      isDirty = false;
      return true;
    } catch (err) {
      console.warn('[CollegeLifeOS DB] Emergency backup save notice:', err);
      return false;
    }
  };

  if (immediate) {
    if (emergencyBackupTimeout) clearTimeout(emergencyBackupTimeout);
    return await performSave();
  }

  if (emergencyBackupTimeout) clearTimeout(emergencyBackupTimeout);
  emergencyBackupTimeout = setTimeout(() => {
    performSave();
  }, 1500);

  return true;
}

/**
 * Checks for and recovers from the local emergency snapshot if data was lost or missing.
 * Performs a table-by-table non-destructive merge:
 * - If a local table has 0 records and backup has records: restores all records for that table.
 * - If a local table has records: checks for missing IDs from the backup and inserts them.
 * - If force is true: replaces/restores all records.
 */
export async function checkAndRestoreFromEmergencyBackup(
  force: boolean = false
): Promise<{ restored: boolean; count: number; details: Record<string, number> }> {
  try {
    if (typeof localStorage === 'undefined') return { restored: false, count: 0, details: {} };

    const mirror = loadLatestEmergencyPayload();
    if (!mirror || !mirror.payload || !mirror.payload.data) {
      return { restored: false, count: 0, details: {} };
    }

    const payload = mirror.payload;
    const d = payload.data;
    if (payload.totalRecords <= 0) {
      return { restored: false, count: 0, details: {} };
    }

    if (!db.isOpen()) {
      await db.open();
    }

    let restoredCount = 0;
    const details: Record<string, number> = {};

    const tableDefs: { name: string; table: Table<any, any>; records?: any[] }[] = [
      { name: 'settings', table: db.settings, records: d.settings },
      { name: 'courses', table: db.courses, records: d.courses },
      { name: 'classSessions', table: db.classSessions, records: d.classSessions },
      { name: 'classExceptions', table: db.classExceptions, records: d.classExceptions },
      { name: 'attendance', table: db.attendance, records: d.attendance },
      { name: 'gradeComponents', table: db.gradeComponents, records: d.gradeComponents },
      { name: 'tasks', table: db.tasks, records: d.tasks },
      { name: 'exams', table: db.exams, records: d.exams },
      { name: 'examTopics', table: db.examTopics, records: d.examTopics },
      { name: 'projects', table: db.projects, records: d.projects },
      { name: 'projectMilestones', table: db.projectMilestones, records: d.projectMilestones },
      { name: 'projectTasks', table: db.projectTasks, records: d.projectTasks },
      { name: 'projectMembers', table: db.projectMembers, records: d.projectMembers },
      { name: 'projectMeetings', table: db.projectMeetings, records: d.projectMeetings },
      { name: 'focusSessions', table: db.focusSessions, records: d.focusSessions },
      { name: 'habits', table: db.habits, records: d.habits },
      { name: 'habitLogs', table: db.habitLogs, records: d.habitLogs },
      { name: 'journalEntries', table: db.journalEntries, records: d.journalEntries },
      { name: 'masterWeekBlocks', table: db.masterWeekBlocks, records: d.masterWeekBlocks },
      { name: 'transactions', table: db.transactions, records: d.transactions },
      { name: 'budgets', table: db.budgets, records: d.budgets },
      { name: 'savingsGoals', table: db.savingsGoals, records: d.savingsGoals },
      { name: 'financialAccounts', table: db.financialAccounts, records: d.financialAccounts },
      { name: 'debts', table: db.debts, records: d.debts },
      { name: 'recurringTransactions', table: db.recurringTransactions, records: d.recurringTransactions },
      { name: 'creativeProjects', table: db.creativeProjects, records: d.creativeProjects },
      { name: 'creativeSessions', table: db.creativeSessions, records: d.creativeSessions },
      { name: 'readingItems', table: db.readingItems, records: d.readingItems },
      { name: 'learningQueue', table: db.learningQueue, records: d.learningQueue },
      { name: 'xpEvents', table: db.xpEvents, records: d.xpEvents },
      { name: 'achievementsUnlocked', table: db.achievementsUnlocked, records: d.achievementsUnlocked },
      { name: 'quests', table: db.quests, records: d.quests },
      { name: 'ritualRuns', table: db.ritualRuns, records: d.ritualRuns },
      { name: 'semesters', table: db.semesters, records: d.semesters },
      { name: 'restDays', table: db.restDays, records: d.restDays },
      { name: 'dailyReflections', table: db.dailyReflections, records: d.dailyReflections },
      { name: 'academicGoals', table: db.academicGoals, records: d.academicGoals },
      { name: 'studyBlocks', table: db.studyBlocks, records: d.studyBlocks },
      { name: 'dismissedStudySuggestions', table: db.dismissedStudySuggestions, records: d.dismissedStudySuggestions },
    ];

    for (const { name, table, records } of tableDefs) {
      if (!records || records.length === 0) continue;

      try {
        const localCount = await table.count();

        if (force) {
          // Force restore: put all records
          await table.bulkPut(records);
          restoredCount += records.length;
          details[name] = records.length;
        } else if (localCount === 0) {
          // Table was empty in local DB: restore all records from mirror
          await table.bulkPut(records);
          restoredCount += records.length;
          details[name] = records.length;
        } else {
          // Table has records: non-destructive merge (find missing IDs only)
          const localKeys = new Set(await table.toCollection().primaryKeys());
          const missing = records.filter((r) => r.id && !localKeys.has(r.id));
          if (missing.length > 0) {
            await table.bulkPut(missing);
            restoredCount += missing.length;
            details[name] = missing.length;
          }
        }
      } catch (tableErr) {
        console.warn(`[CollegeLifeOS DB] Restore notice for table ${name}:`, tableErr);
      }
    }

    if (restoredCount > 0) {
      console.log(
        `[CollegeLifeOS DB] Successfully restored ${restoredCount} items from emergency mirror (${mirror.source}):`,
        details
      );
      return { restored: true, count: restoredCount, details };
    }

    return { restored: false, count: 0, details: {} };
  } catch (err) {
    console.warn('[CollegeLifeOS DB] Emergency restore check notice:', err);
    return { restored: false, count: 0, details: {} };
  }
}

/**
 * Manually triggered restore from the emergency mirror (e.g. from Settings UI).
 */
export async function restoreFromEmergencyMirror(
  force: boolean = false
): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const res = await checkAndRestoreFromEmergencyBackup(force);
    if (res.restored) {
      return {
        success: true,
        count: res.count,
        message: `Restored ${res.count} records across ${Object.keys(res.details).length} categories!`,
      };
    }
    return {
      success: false,
      count: 0,
      message: 'No missing records found in the local mirror. Your database is already complete.',
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, count: 0, message: `Mirror restore failed: ${msg}` };
  }
}

/**
 * Returns emergency backup metadata for diagnostics in the UI.
 */
export function getEmergencyBackupMeta(): EmergencyBackupMeta {
  if (typeof localStorage === 'undefined') return { exists: false };

  try {
    // 1. Try lightweight meta key first
    const rawMeta = localStorage.getItem(LOCAL_EMERGENCY_KEY_META);
    if (rawMeta) {
      const parsed = JSON.parse(rawMeta);
      if (parsed && parsed.exists) {
        return parsed as EmergencyBackupMeta;
      }
    }

    // 2. Fall back to loading payload directly
    const mirror = loadLatestEmergencyPayload();
    if (mirror) {
      const rawStored = localStorage.getItem(
        mirror.source === 'v2'
          ? LOCAL_EMERGENCY_KEY_V2
          : mirror.source === 'v1'
          ? LOCAL_EMERGENCY_KEY_LEGACY
          : LOCAL_EMERGENCY_KEY_PREV
      );
      return {
        exists: true,
        version: mirror.payload.version,
        savedAt: mirror.payload.savedAt,
        totalRecords: mirror.payload.totalRecords,
        compressedBytes: (rawStored?.length || 0) * 2,
        source: mirror.source,
      };
    }

    return { exists: false };
  } catch {
    return { exists: false };
  }
}

/**
 * Checks storage persistence and quota metrics from navigator.storage.
 */
export async function checkStoragePersistence(): Promise<{
  isPersisted: boolean;
  quota?: number;
  usage?: number;
}> {
  let isPersisted = false;
  let quota: number | undefined;
  let usage: number | undefined;

  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      if (navigator.storage.persisted) {
        isPersisted = await navigator.storage.persisted();
      }
      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        quota = estimate.quota;
        usage = estimate.usage;
      }
    } catch (err) {
      console.warn('[CollegeLifeOS DB] Storage estimate notice:', err);
    }
  }

  return { isPersisted, quota, usage };
}

/**
 * Explicitly requests persistent storage from the browser.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const persisted = await navigator.storage.persist();
      await db.settings.update('current_user', { storageProtected: persisted });
      return persisted;
    } catch (err) {
      console.warn('[CollegeLifeOS DB] Request persistent storage notice:', err);
      return false;
    }
  }
  return false;
}

/**
 * Initialize base settings and verify database integrity on startup.
 * Guarantees zero silent save failures and auto-recovers any missing data.
 */
export async function initializeDatabase(): Promise<{
  recovered: boolean;
  recoveredCount: number;
  details?: Record<string, number>;
}> {
  try {
    if (!db.isOpen()) {
      await db.open();
    }
  } catch (openErr) {
    console.error('[CollegeLifeOS DB] Dexie open notice, attempting recovery:', openErr);
  }

  // 1. Check for emergency recovery (non-destructive merge of missing records)
  const recovery = await checkAndRestoreFromEmergencyBackup(false);

  // 2. Base Settings initialization
  try {
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
  } catch (settingsErr) {
    console.warn('[CollegeLifeOS DB] Settings check notice:', settingsErr);
  }

  // 3. Ensure an active semester exists
  try {
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
  } catch (semErr) {
    console.warn('[CollegeLifeOS DB] Semester check notice:', semErr);
  }

  // 4. Request / check storage persistence
  if (typeof navigator !== 'undefined' && navigator.storage) {
    try {
      const persisted = navigator.storage.persisted
        ? await navigator.storage.persisted()
        : false;
      if (persisted) {
        await db.settings.update('current_user', { storageProtected: true });
      } else if (navigator.storage.persist) {
        const granted = await navigator.storage.persist();
        await db.settings.update('current_user', { storageProtected: granted });
      }
    } catch {
      // Ignore
    }
  }

  // 5. Keep emergency mirror updated if not recovered or if records changed
  saveEmergencyBackup(false);

  return {
    recovered: recovery.restored,
    recoveredCount: recovery.count,
    details: recovery.details,
  };
}
