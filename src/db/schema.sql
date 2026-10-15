-- ====================================================================
-- ScholarStream Exam Intelligence & Practice Simulator Database Schema
-- Compatible with PostgreSQL / Supabase
-- ====================================================================

-- 1. Store extracted or generated questions
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,
  course_code TEXT,
  question_text TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('mcq', 'true_false', 'short_answer', 'code')),
  options JSONB, -- E.g. ["A) Static", "B) Dynamic", "C) Hybrid"]
  correct_answer TEXT, -- Model answer or option key
  explanation TEXT,
  rubric JSONB, -- Array of criteria for grading short answers and code
  topic_tag TEXT NOT NULL,
  points NUMERIC(4,1) DEFAULT 5.0,
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  section_title TEXT, -- E.g. "Part I: Multiple Choice", "Part II: System Design"
  source_type TEXT CHECK (source_type IN ('past_exam', 'ai_generated', 'lecture_module')),
  year INTEGER,
  exam_type TEXT CHECK (exam_type IN ('Midterm', 'Final', 'Quiz', 'Practice')),
  lecture_reference TEXT, -- E.g. "Module 4: Virtual Memory, Section 4.2, Pages 18-24"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for high-yield topic aggregation and fast question bank queries
CREATE INDEX IF NOT EXISTS idx_exam_questions_course ON exam_questions(course_id, topic_tag);
CREATE INDEX IF NOT EXISTS idx_exam_questions_year ON exam_questions(year, exam_type);

-- 2. Store full practice exam sessions
CREATE TABLE IF NOT EXISTS exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  mode TEXT CHECK (mode IN ('strict', 'tutor')),
  source_filter TEXT CHECK (source_filter IN ('past_exams_only', 'ai_generated_only', 'hybrid', 'mistake_review')),
  total_questions INTEGER NOT NULL,
  time_limit_minutes INTEGER NOT NULL,
  time_spent_seconds INTEGER DEFAULT 0,
  score_percentage NUMERIC(5,2),
  letter_grade TEXT,
  total_points_earned NUMERIC(6,2),
  total_possible_points NUMERIC(6,2),
  status TEXT CHECK (status IN ('in_progress', 'completed')) DEFAULT 'in_progress',
  diagnostic_summary JSONB, -- Weak areas, topic masteries, study suggestions
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Store individual user responses per test attempt
CREATE TABLE IF NOT EXISTS user_exam_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES exam_questions(id),
  user_answer TEXT,
  is_correct BOOLEAN,
  points_awarded NUMERIC(4,2),
  points_possible NUMERIC(4,2),
  what_you_got_right TEXT,
  what_you_missed TEXT,
  ideal_model_answer TEXT,
  ai_feedback TEXT,
  remediation_citation TEXT, -- Lecture module and section reference
  time_taken_seconds INTEGER,
  flagged_for_review BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_responses_session ON user_exam_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_user_responses_correctness ON user_exam_responses(is_correct);
