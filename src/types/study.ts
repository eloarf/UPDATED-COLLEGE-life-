export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  difficulty: DifficultyLevel;
  memoryTip?: string;
  userRating?: 'again' | 'hard' | 'good' | 'easy';
  isBookmarked?: boolean;
}

export interface QuickQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  misconceptionWarning?: string;
  hint?: string;
  topic: string;
  difficulty: DifficultyLevel;
}

export interface MockExamQuestion {
  id: string;
  scenario?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  rubric: string[];
  points: number;
  timeLimitSeconds: number;
  topic: string;
  difficulty: DifficultyLevel;
}

export interface TopicInfo {
  name: string;
  description: string;
  importanceWeight: number;
}

export interface StudySuite {
  id: string;
  subjectTitle: string;
  summary: string;
  sourceName: string;
  createdAt: number;
  topics: TopicInfo[];
  flashcards: Flashcard[];
  quickPractice: QuickQuestion[];
  deepMockExam: MockExamQuestion[];
}

export type MistakeCategory =
  | 'concept_confusion'
  | 'detail_recall'
  | 'calculation'
  | 'time_pressure';

export interface MistakeRecord {
  id: string;
  questionId: string;
  question: string;
  scenario?: string;
  options: string[];
  userAnswerIndex: number;
  correctAnswerIndex: number;
  userAnswerText: string;
  correctAnswerText: string;
  explanation: string;
  topic: string;
  sourceType: 'quick_practice' | 'mock_exam' | 'recovery_drill';
  sourceSuiteTitle: string;
  timestamp: number;
  attemptCount: number;
  status: 'unresolved' | 'reviewing' | 'mastered';
  category: MistakeCategory;
}

export interface WeakAreaItem {
  topic: string;
  failureRate: string;
  keyConfusion: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ImprovementStep {
  stepNumber: number;
  title: string;
  action: string;
  estimatedMinutes: number;
  focusTopic: string;
}

export interface RecoveryQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
  targetedMisconception?: string;
}

export interface MistakeAnalysisReport {
  diagnosis: string;
  weakAreas: WeakAreaItem[];
  improvementPlan: ImprovementStep[];
  recoveryQuestions: RecoveryQuestion[];
}

export interface ExamAttempt {
  id: string;
  suiteId: string;
  suiteTitle: string;
  score: number;
  totalPoints: number;
  percentage: number;
  timeSpentSeconds: number;
  completedAt: number;
  answers: {
    questionId: string;
    selectedIndex: number;
    isCorrect: boolean;
  }[];
}

// ==========================================
// EXAM INTELLIGENCE & PRACTICE TEST SIMULATOR
// ==========================================

export type ExamQuestionType = 'mcq' | 'true_false' | 'short_answer' | 'code';
export type ExamSourceType = 'past_exam' | 'ai_generated' | 'lecture_module';

export interface ExamQuestion {
  id: string;
  course_id: string;
  course_code?: string;
  question_text: string;
  question_type: ExamQuestionType;
  options?: string[]; // For MCQ or True/False
  correct_answer: string;
  explanation: string;
  rubric?: string[]; // Grading criteria for subjective and code questions
  topic_tag: string;
  points: number;
  difficulty_level: DifficultyLevel;
  section_title?: string; // E.g. "Part I: Theoretical Fundamentals"
  source_type: ExamSourceType;
  year?: number;
  exam_type?: 'Midterm' | 'Final' | 'Quiz' | 'Practice';
  lecture_reference?: string; // E.g. "Lecture 5: Paging Algorithms, Slides 14-22"
  starter_code?: string; // Optional template for code questions
}

export type ExamSimulatorMode = 'strict' | 'tutor';
export type ExamSourceFilter =
  | 'past_exams_only'
  | 'ai_generated_only'
  | 'hybrid'
  | 'mistake_review';

export interface ExamSessionConfig {
  course_id: string;
  title: string;
  mode: ExamSimulatorMode;
  source_filter: ExamSourceFilter;
  time_limit_minutes: number;
  selected_topics?: string[];
  question_count?: number;
}

export interface UserExamResponse {
  id: string;
  session_id: string;
  question_id: string;
  user_answer: string;
  is_correct?: boolean;
  points_awarded?: number;
  points_possible?: number;
  what_you_got_right?: string;
  what_you_missed?: string;
  ideal_model_answer?: string;
  ai_feedback?: string;
  remediation_citation?: string;
  remediation_explanation?: string;
  time_taken_seconds?: number;
  flagged_for_review?: boolean;
}

export interface ExamDiagnosticSummary {
  weak_topics: string[];
  strong_topics: string[];
  recommended_lecture_modules: {
    topic: string;
    citation: string;
    reason: string;
  }[];
  pacing_feedback: string;
}

export interface ExamSession {
  id: string;
  course_id: string;
  title: string;
  mode: ExamSimulatorMode;
  source_filter: ExamSourceFilter;
  questions: ExamQuestion[];
  total_questions: number;
  time_limit_minutes: number;
  time_spent_seconds: number;
  score_percentage?: number;
  letter_grade?: string;
  total_points_earned?: number;
  total_possible_points?: number;
  status: 'in_progress' | 'completed';
  started_at: number;
  completed_at?: number;
  diagnostic_summary?: ExamDiagnosticSummary;
  responses?: { [questionId: string]: UserExamResponse };
}

export interface TopicRadarItem {
  topic: string;
  historical_frequency_pct: number;
  average_exam_points_pct: number;
  appearance_count: number;
  total_past_exams_analyzed: number;
  years_appeared: number[];
  recurring_pattern: string;
  yield_tier: 'Critical High-Yield' | 'Important Core' | 'Secondary Depth';
  recommended_revision_weight_pct: number;
}

export interface TopicRadarAnalysis {
  course_id: string;
  course_name: string;
  total_exams_analyzed: number;
  year_range: string;
  weight_matrix: TopicRadarItem[];
  predicted_focus_order: string[];
  executive_takeaway: string;
}

export interface AutoGradingResult {
  session_id: string;
  score_percentage: number;
  letter_grade: string;
  total_earned: number;
  total_possible: number;
  responses: UserExamResponse[];
  topic_breakdown: {
    topic: string;
    score: number;
    total: number;
    percentage: number;
    status: 'mastered' | 'weak';
  }[];
  pacing: {
    average_seconds_per_question: number;
    target_seconds_per_question: number;
    status: string;
  };
  diagnostic_summary: ExamDiagnosticSummary;
}

