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
  newStartTime?: string;
  newEndTime?: string;
  newRoom?: string;
}

export interface AttendanceRecord {
  id: string;
  courseId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
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
  mode: '25/5' | '45/10' | '15/3' | 'custom' | '2min';
  minutesFocused: number;
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

export interface Transaction {
  id: string;
  type: 'expense' | 'income' | 'saving';
  amount: number;
  currency: string;
  category: string;
  account: 'cash' | 'bank' | 'mobile_money';
  date: string; // YYYY-MM-DD
  notes?: string;
  savingsGoalId?: string;
}

export interface Budget {
  id: string;
  category: string;
  monthlyLimit: number;
  spent: number;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  category?: string;
  color?: string;
  createdAt?: string;
}

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

export interface AppSettings {
  id: string;
  userName: string;
  universityName: string;
  currentTermName: string;
  activeSemesterId?: string;
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
  pageAccents: Record<string, string>;
  pinLock?: string;
  storageProtected: boolean;
  gradingScale: { letter: string; gpa: number; minPercent: number }[];
  attendanceThresholdPercent: number;
  accountBalances?: AccountBalancesConfig;
  departmentOptions?: DepartmentOption[];
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
