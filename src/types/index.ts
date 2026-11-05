export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun

export interface Semester {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isActive?: boolean;
}

export interface RestDay {
  id: string;
  habitId: string;
  dateKey: string; // YYYY-MM-DD
  createdAt: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  creditHours?: number;
  credits?: number;
  instructor?: string;
  room?: string; // Class number / Hall
  building?: string; // Block number
  color: string;
  term: string;
  semesterId?: string;
  links?: { title: string; url: string }[];
  targetGrade?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSession {
  id: string;
  courseId: string;
  semesterId?: string;
  dayOfWeek: DayOfWeek; // 0=Mon ... 6=Sun
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  type: 'lecture' | 'lab' | 'tutorial' | 'other';
  room?: string;
  building?: string;
  instructor?: string;
  repeat: 'all' | 'odd' | 'even';
}

export interface ClassException {
  id: string;
  sessionId: string;
  date: string; // YYYY-MM-DD
  action: 'cancelled' | 'moved';
  reason?: string;
  newDate?: string; // YYYY-MM-DD for multi-day postponement
  newStartTime?: string;
  newEndTime?: string;
  newRoom?: string;
  createdAt?: string;
}

export interface AttendanceRecord {
  id: string;
  courseId: string;
  sessionId?: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'late' | 'excused' | 'postponed';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GradeComponent {
  id: string;
  courseId: string;
  name: string;
  weight: number; // percentage, e.g. 20
  maxScore: number;
  earnedScore?: number;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  courseId?: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'small' | 'medium' | 'large';
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  status: 'todo' | 'done';
  completedAt?: string;
  isOverdueRolledOver?: boolean;
  contextTag: 'phone' | 'laptop' | 'any';
  notes?: string;
  subtasks?: { id: string; title: string; done: boolean }[];
  repeatRule?: 'daily' | 'weekly' | 'none';
  createdAt: string;
  updatedAt: string;
}

export interface Exam {
  id: string;
  courseId: string;
  title: string;
  examType: 'Midterm' | 'Final' | 'Quiz' | 'Lab Practical';
  examDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  hall?: string;
  weight: number; // percentage
  targetScore: number;
  currentHp: number; // 0 to 100%
  maxHp: number;
  actualScore?: number;
  postReflection?: string;
  isDefeated: boolean;
  createdAt: string;
}

export interface ExamTopic {
  id: string;
  examId: string;
  title: string;
  isStudied: boolean;
  targetStudyDate?: string; // YYYY-MM-DD
}

export interface Project {
  id: string;
  title: string;
  courseId?: string;
  type: 'assignment' | 'lab' | 'group' | 'final' | 'research' | 'design';
  description: string;
  status: 'idea' | 'planning' | 'active' | 'review' | 'submitted' | 'graded';
  startDate?: string;
  deadline?: string;
  weight?: number;
  gradePercent?: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  dueDate?: string;
  isDone: boolean;
  order: number;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  column: 'backlog' | 'todo' | 'doing' | 'review' | 'done';
  assignee?: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  notes?: string;
  createdAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  name: string;
  role: string;
  contact?: string;
  color: string;
}

export interface ProjectMeeting {
  id: string;
  projectId: string;
  date: string;
  title: string;
  agenda: string;
  notes: string;
  actionItems: string[];
}

export interface FocusSession {
  id: string;
  courseId?: string;
  projectId?: string;
  taskId?: string;
  mode: '25/5' | '45/10' | '15/3' | 'custom' | '2min' | 'pomodoro' | string;
  minutesFocused: number;
  plannedMinutes?: number;
  actualMinutes?: number;
  plannedDurationSeconds?: number;
  actualDurationSeconds?: number;
  pauseCount?: number;
  completionMethod?: 'completed' | 'manual_finish';
  sessionType?: 'work' | 'short_break' | 'long_break';
  startedAt: string;
  completedAt: string;
  notes?: string;
}

export interface Habit {
  id: string;
  title: string;
  category: 'study' | 'health' | 'creative' | 'mindset' | 'routine' | 'other' | string;
  customCategory?: string;
  type: 'daily' | 'weekly_target' | 'minutes';
  targetCount: number;
  minimumVersionText?: string;
  color: string;
  currentStreak: number;
  bestStreak: number;
  icon: string;
  graceDaysLeft: number;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  count: number;
  isPartial: boolean;
}

export interface JournalEntry {
  id: string;
  title?: string;
  date: string; // YYYY-MM-DD
  moodScore: number; // 1-5
  energyScore: number; // 1-5
  content: string;
  wordCount: number;
  tags: string[];
  promptQuestion?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  deletedAt?: string;
  structuredReflection?: {
    happened?: string;
    mattered?: string;
    next?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface MasterWeekBlock {
  id: string;
  title: string;
  category: 'study' | 'creative' | 'health' | 'rest' | 'admin' | 'social' | 'other' | string;
  customCategory?: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  dayType: 'dorm' | 'home' | 'both';
  courseId?: string;
  blockNumber?: string;
  classNumber?: string;
  color?: string;
}

export interface DepartmentOption {
  id: string;
  name: string;
  code: string;
  faculty: string;
  cutoffGpa: number;
  availableSeats?: number;
  preferenceRank: number;
  notes?: string;
}

export type FinancialAccountType = 'bank' | 'mobile_money' | 'cash' | 'savings' | 'digital_wallet' | 'other' | 'custom';

export interface FinancialAccount {
  id: string;
  name: string;
  type?: FinancialAccountType;
  accountType?: FinancialAccountType;
  institution?: string; // e.g. 'CBE', 'Bank of Abyssinia', 'Awash Bank', 'Dashen Bank', 'Telebirr', 'HelloCash', or custom
  openingBalance: number;
  currency: string; // default 'ETB'
  notes?: string;
  isDefault?: boolean;
  isArchived?: boolean;
  color?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon?: string;
  subcategories: string[];
  isCustom?: boolean;
}

export interface Transaction {
  id: string;
  type: 'expense' | 'income' | 'transfer' | 'saving';
  amount: number;
  currency?: string;
  category: string;
  subcategory?: string;
  account?: 'cash' | 'bank' | 'mobile_money'; // legacy support
  accountId?: string; // ID of the account
  financialAccountId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  toAccountId?: string; // destination account if type === 'transfer'
  linkedTransferId?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  description?: string;
  notes?: string;
  tags?: string[];
  savingsGoalId?: string;
  debtId?: string;
  recurringId?: string;
  isDebtRepayment?: boolean;
  isSavingsContribution?: boolean;
  createdAt?: string;
}

export interface Budget {
  id: string;
  name?: string;
  category: string; // 'all' for overall budget or specific category
  period: 'monthly' | 'weekly' | 'custom';
  monthlyLimit?: number; // legacy support
  amount: number;
  month?: string; // YYYY-MM
  currency?: string;
  startDate?: string;
  endDate?: string;
  spent?: number;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  currency?: string;
  deadline?: string;
  accountId?: string;
  category?: string;
  notes?: string;
  color?: string;
  createdAt?: string;
}

export interface DebtRecord {
  id: string;
  type: 'owe' | 'owed' | 'payable' | 'receivable'; // 'owe'/'payable' = I owe someone, 'owed'/'receivable' = someone owes me
  person?: string;
  personName?: string;
  amount?: number;
  originalAmount?: number;
  paidAmount: number;
  remainingAmount?: number;
  currency?: string;
  dueDate?: string;
  status: 'pending' | 'partial' | 'settled';
  notes?: string;
  accountId?: string;
  createdAt: string;
  settledAt?: string;
}

export interface RecurringTransaction {
  id: string;
  title?: string;
  type: 'income' | 'expense';
  amount: number;
  currency?: string;
  accountId?: string;
  financialAccountId?: string;
  category: string;
  subcategory?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  intervalDays?: number;
  startDate?: string;
  nextDueDate: string;
  lastGeneratedDate?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface PomodoroSettings {
  preset?: 'classic' | 'deep_work' | 'extended' | 'custom';
  focusDurationMins: number;
  focusDurationMinutes?: number;
  shortBreakMins: number;
  shortBreakMinutes?: number;
  longBreakMins: number;
  longBreakMinutes?: number;
  // Flexible custom settings with independent minutes and seconds
  customWorkMinutes?: number;
  customWorkSeconds?: number;
  customShortBreakMinutes?: number;
  customShortBreakSeconds?: number;
  customLongBreakMinutes?: number;
  customLongBreakSeconds?: number;
  sessionsBeforeLongBreak: number;
  totalCycles: number;
  cyclesPerSession?: number;
  autoTransition?: boolean;
  autoStartBreaks?: boolean;
  autoStartWork?: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  notificationsEnabled: boolean;
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  preset: 'classic',
  focusDurationMins: 25,
  focusDurationMinutes: 25,
  shortBreakMins: 5,
  shortBreakMinutes: 5,
  longBreakMins: 15,
  longBreakMinutes: 15,
  customWorkMinutes: 25,
  customWorkSeconds: 0,
  customShortBreakMinutes: 5,
  customShortBreakSeconds: 0,
  customLongBreakMinutes: 15,
  customLongBreakSeconds: 0,
  sessionsBeforeLongBreak: 4,
  totalCycles: 2,
  cyclesPerSession: 2,
  autoTransition: false,
  autoStartBreaks: false,
  autoStartWork: false,
  soundEnabled: true,
  vibrationEnabled: true,
  notificationsEnabled: true,
};

export interface CreativeProject {
  id: string;
  title: string;
  type: 'song' | 'beat' | 'ep' | 'book' | 'story' | 'other';
  currentStage: string;
  stages: string[];
  progressPercent: number;
  targetDeadline?: string;
  linesWritten?: number;
  notes?: string;
}

export interface CreativeSession {
  id: string;
  creativeProjectId: string;
  minutes: number;
  date: string; // YYYY-MM-DD
  outputSummary: string;
}

export interface ReadingItem {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  pagesRead: number;
  rating?: number;
  notes?: string;
  isFinished: boolean;
}

export interface LearningTopic {
  id: string;
  title: string;
  status: 'queued' | 'today' | 'done';
  notes?: string;
  order: number;
}

export type StatKey = 'knowledge' | 'discipline' | 'vitality' | 'creativity' | 'teamwork';

export interface XpEvent {
  id: string;
  source: string;
  sourceId: string;
  amount: number;
  stat: StatKey;
  dayKey: string; // YYYY-MM-DD
  timestamp: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'academic' | 'focus' | 'rituals' | 'creativity' | 'meta';
  isUnlocked: boolean;
  unlockedAt?: string;
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  stat: StatKey;
  isDone: boolean;
  dayKey: string; // YYYY-MM-DD
  type: string;
}

export interface RitualRun {
  id: string;
  type: 'weekly_review' | 'monthly_reset';
  date: string;
  answers: Record<string, string>;
  isCompleted: boolean;
}

export interface DailyReflection {
  id: string;
  dateKey: string; // YYYY-MM-DD
  meaningfulAccomplishment?: string;
  tomorrowImprovement?: string;
  journalNote?: string;
  completedTaskCount?: number;
  unfinishedAction?: 'rescheduled' | 'backlog' | 'dismissed';
  createdAt: string;
  updatedAt: string;
}

export interface GoalMilestone {
  id: string;
  title: string;
  isCompleted: boolean;
  completed?: boolean;
  dueDate?: string;
}

export interface AcademicGoal {
  id: string;
  title: string;
  category: 'academic' | 'career' | 'health' | 'personal' | 'skill' | 'creative';
  targetDate?: string;
  semesterId?: string;
  courseId?: string;
  progressPercent: number; // 0-100
  status: 'active' | 'completed' | 'paused' | 'in_progress';
  milestones?: GoalMilestone[];
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AppSettings {
  id: string;
  userName: string;
  universityName: string;
  currentTermName: string;
  activeSemesterId?: string;
  dailyIntention?: string;
  dailyIntentionDate?: string;
  targetCgpa: number;
  yearlyBookGoal: number;
  isLowEnergy: boolean;
  isDormDay: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  showXpPopups: boolean;
  backupReminderDays: number;
  lastBackupDate?: string;
  theme: string;
  appearanceMode?: 'light' | 'dark' | 'system';
  designStyle?: 'editorial-retro' | 'quiet-minimal' | 'creative-studio';
  fontStyle?: 'serif' | 'sans';
  layoutDensity?: 'comfortable' | 'compact';
  cardBorderGlow?: boolean;
  pageAccents: Record<string, string>;
  pinLock?: string;
  storageProtected: boolean;
  gradingScale: { letter: string; gpa: number; minPercent: number }[];
  attendanceThresholdPercent: number;
  accountBalances?: AccountBalancesConfig;
  departmentOptions?: DepartmentOption[];
  hasCompletedOnboarding?: boolean;
  pomodoroSettings?: PomodoroSettings;
  notificationSettings?: NotificationSettings;
  primaryCurrency?: string;
  currencyExchangeRates?: Record<string, number>;
  customFinanceCategories?: FinanceCategory[];
}

export interface NotificationSettings {
  enabled: boolean;
  permissionRequested?: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "07:00"
    allowUrgentExams: boolean;
  };
  categories: {
    classes: {
      enabled: boolean;
      leadTimeMinutes: number; // default: 30
    };
    tasks: {
      enabled: boolean;
      defaultLeadTime: 'due' | '1h' | '1d'; // default: '1d'
      defaultTime: string; // "09:00"
    };
    exams: {
      enabled: boolean;
      leadDays: number[]; // default: [3, 1]
      notifyOnExamMorning: boolean; // default: true (at 07:00)
    };
    habits: {
      enabled: boolean;
      defaultTime: string; // default: "20:00"
    };
    finance: {
      enabled: boolean;
      leadDays: number; // default: 1
    };
    dailyBriefing: {
      enabled: boolean;
      time: string; // default: "07:30"
    };
    weeklyReview: {
      enabled: boolean;
      dayOfWeek: number; // 0 = Sunday
      time: string; // default: "19:00"
    };
  };
  snoozeDurationMinutes: number; // default: 10
  lastReconciledAt?: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '07:00',
    allowUrgentExams: true,
  },
  categories: {
    classes: {
      enabled: true,
      leadTimeMinutes: 30,
    },
    tasks: {
      enabled: true,
      defaultLeadTime: '1d',
      defaultTime: '09:00',
    },
    exams: {
      enabled: true,
      leadDays: [3, 1],
      notifyOnExamMorning: true,
    },
    habits: {
      enabled: false,
      defaultTime: '20:00',
    },
    finance: {
      enabled: true,
      leadDays: 1,
    },
    dailyBriefing: {
      enabled: true,
      time: '07:30',
    },
    weeklyReview: {
      enabled: true,
      dayOfWeek: 0, // Sunday
      time: '19:00',
    },
  },
  snoozeDurationMinutes: 10,
};

export interface ScheduledReminderRecord {
  id: string; // unique stable key string (e.g. 'class-session-1-mon', 'task-123')
  numericId: number; // 31-bit positive int passed to Capacitor LocalNotifications
  title: string;
  body: string;
  targetTime: string; // ISO string
  category: 'classes' | 'tasks' | 'exams' | 'habits' | 'finance' | 'briefings';
  route: string; // deep link route: '#/timetable', '#/tasks', etc.
  entityId?: string;
  extra?: Record<string, any>;
  createdAt: string;
}

export interface AccountBalancesConfig {
  initialCash: number;
  initialBank: number; // Commercial Bank of Ethiopia (CBE)
  initialMobileMoney: number; // Telebirr
  lowBalanceThreshold: number; // Default: 150 ETB
}

export const DEFAULT_ACCOUNT_BALANCES: AccountBalancesConfig = {
  initialCash: 500,
  initialBank: 2500,
  initialMobileMoney: 1200,
  lowBalanceThreshold: 150,
};

export const DEFAULT_DEPARTMENTS: DepartmentOption[] = [
  {
    id: 'dept-se',
    name: 'Software Engineering',
    code: 'SE',
    faculty: 'School of Electrical & Computer Engineering',
    cutoffGpa: 3.80,
    availableSeats: 65,
    preferenceRank: 1,
    notes: 'Primary target: Highest demand in engineering stream.',
  },
  {
    id: 'dept-cs',
    name: 'Computer Science',
    code: 'CS',
    faculty: 'College of Natural & Computational Sciences',
    cutoffGpa: 3.75,
    availableSeats: 80,
    preferenceRank: 2,
    notes: 'Secondary target: Strong algorithms & systems curriculum.',
  },
  {
    id: 'dept-ece',
    name: 'Electrical & Computer Engineering',
    code: 'ECE',
    faculty: 'School of Electrical & Computer Engineering',
    cutoffGpa: 3.65,
    availableSeats: 120,
    preferenceRank: 3,
    notes: 'Hardware, communications, embedded systems & electronics.',
  },
  {
    id: 'dept-bme',
    name: 'Biomedical Engineering',
    code: 'BME',
    faculty: 'School of Biomedical Engineering',
    cutoffGpa: 3.55,
    availableSeats: 45,
    preferenceRank: 4,
    notes: 'Medical instrumentation, biosensors, computational healthcare.',
  },
  {
    id: 'dept-me',
    name: 'Mechanical Engineering',
    code: 'ME',
    faculty: 'School of Mechanical & Industrial Engineering',
    cutoffGpa: 3.40,
    availableSeats: 140,
    preferenceRank: 5,
    notes: 'Thermodynamics, robotics, automotive & materials design.',
  },
  {
    id: 'dept-ce',
    name: 'Civil & Environmental Engineering',
    code: 'CEE',
    faculty: 'School of Civil & Environmental Engineering',
    cutoffGpa: 3.30,
    availableSeats: 160,
    preferenceRank: 6,
    notes: 'Structural engineering, hydraulics, urban infrastructure.',
  },
];
