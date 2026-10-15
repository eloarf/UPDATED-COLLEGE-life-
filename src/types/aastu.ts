export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type TaskCategory =
  | 'classes'
  | 'study'
  | 'code'
  | 'running'
  | 'music'
  | 'journal'
  | 'custom';

export interface TaskItem {
  id: string;
  time: string;
  title: string;
  category: TaskCategory;
  location?: string;
  shiftable?: boolean;
  isShifted?: boolean;
  shiftedTime?: string;
  priority?: 'high' | 'medium' | 'low';
  notes?: string;
  checklist?: { id: string; text: string; done: boolean }[];
  day?: DayOfWeek;
}

export interface Assignment {
  id: string;
  title: string;
  courseCode: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:MM
  weightPercentage?: number;
  status: 'not_started' | 'in_progress' | 'submitted';
  priority: 'high' | 'medium' | 'low';
  description?: string;
  linkOrNotes?: string;
}

export interface ExamItem {
  id: string;
  title: string;
  courseCode: string;
  examDate: string; // YYYY-MM-DD
  examTime: string; // HH:MM
  durationMinutes: number;
  room?: string;
  weightPercentage?: number;
  readinessScore: number; // 0 - 100
  syllabusTopics: { id: string; name: string; completed: boolean }[];
}

export interface JournalEntry {
  date: string; // YYYY-MM-DD
  timestamp: number;
  wins: string;
  challenges: string;
  musicProgress: string;
  gratitude: string;
  focusRating: number; // 1 to 5
}

export interface NotificationAlert {
  id: string;
  type: 'due_soon' | 'overdue' | 'missed_task' | 'exam_countdown' | 'class_now';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  priority: 'urgent' | 'warning' | 'info';
  targetId?: string;
}

export interface StreakData {
  classes: number;
  running: number;
  music: number;
  journal: number;
  perfect: number;
}

export interface DayHistoryRecord {
  percent: number;
  frozen?: boolean;
  completedCount: number;
  totalCount: number;
}

export interface AASTUState {
  schedules: Record<DayOfWeek, TaskItem[]>;
  assignments: Assignment[];
  exams: ExamItem[];
  journals: Record<string, JournalEntry>;
  completedTasks: Record<string, boolean>; // key: 'YYYY-MM-DD-day-taskId'
  shiftedTasks: Record<string, boolean>; // key: taskId
  freezesUsed: number;
  monthHistory: Record<string, DayHistoryRecord>; // key: 'YYYY-MM-DD'
  streaks: StreakData;
  notificationsEnabled: boolean;
  audioAlertsEnabled: boolean;
  lastActiveDate?: string;
}
