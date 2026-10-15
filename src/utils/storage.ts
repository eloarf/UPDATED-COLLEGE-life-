import { StudySuite, MistakeRecord, ExamAttempt, ExamQuestion, ExamSession, TopicRadarAnalysis } from '../types/study';
import { SAMPLE_SUITES, INITIAL_MISTAKES } from '../data/sampleMaterials';
import { SAMPLE_PAST_EXAMS_QUESTIONS, INITIAL_TOPIC_RADAR } from '../data/sampleExams';

const STORAGE_KEYS = {
  SUITES: 'scholarstream_suites_v1',
  ACTIVE_SUITE_ID: 'scholarstream_active_suite_id_v1',
  MISTAKES: 'scholarstream_mistakes_v1',
  EXAM_ATTEMPTS: 'scholarstream_attempts_v1',
  EXAM_QUESTIONS: 'scholarstream_exam_questions_v1',
  EXAM_SESSIONS: 'scholarstream_exam_sessions_v1',
  TOPIC_RADAR: 'scholarstream_topic_radar_v1',
};

export function loadSuites(): StudySuite[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUITES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SUITES, JSON.stringify(SAMPLE_SUITES));
      return SAMPLE_SUITES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SAMPLE_SUITES;
  } catch (e) {
    console.error('Failed to load suites from storage:', e);
    return SAMPLE_SUITES;
  }
}

export function saveSuites(suites: StudySuite[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SUITES, JSON.stringify(suites));
  } catch (e) {
    console.error('Failed to save suites:', e);
  }
}

export function loadActiveSuiteId(suites: StudySuite[]): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_SUITE_ID);
    if (saved && suites.some((s) => s.id === saved)) {
      return saved;
    }
  } catch (e) {
    // fallback
  }
  return suites[0]?.id || '';
}

export function saveActiveSuiteId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SUITE_ID, id);
  } catch (e) {
    console.error('Failed to save active suite id:', e);
  }
}

export function loadMistakes(): MistakeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MISTAKES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(INITIAL_MISTAKES));
      return INITIAL_MISTAKES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_MISTAKES;
  } catch (e) {
    console.error('Failed to load mistakes:', e);
    return INITIAL_MISTAKES;
  }
}

export function saveMistakes(mistakes: MistakeRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MISTAKES, JSON.stringify(mistakes));
  } catch (e) {
    console.error('Failed to save mistakes:', e);
  }
}

export function recordMistake(
  mistake: Omit<MistakeRecord, 'id' | 'timestamp' | 'attemptCount' | 'status'>
): MistakeRecord {
  const all = loadMistakes();
  const existingIdx = all.findIndex((m) => m.questionId === mistake.questionId);

  let updatedRecord: MistakeRecord;
  if (existingIdx >= 0) {
    const prev = all[existingIdx];
    updatedRecord = {
      ...prev,
      ...mistake,
      timestamp: Date.now(),
      attemptCount: prev.attemptCount + 1,
      status: 'unresolved',
    };
    all[existingIdx] = updatedRecord;
  } else {
    updatedRecord = {
      ...mistake,
      id: 'mstk-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
      attemptCount: 1,
      status: 'unresolved',
    };
    all.unshift(updatedRecord);
  }

  saveMistakes(all);
  return updatedRecord;
}

export function resolveMistakeAsMastered(mistakeId: string): void {
  const all = loadMistakes();
  const updated = all.map((m) =>
    m.id === mistakeId ? { ...m, status: 'mastered' as const } : m
  );
  saveMistakes(updated);
}

export function deleteMistake(mistakeId: string): void {
  const all = loadMistakes();
  const updated = all.filter((m) => m.id !== mistakeId);
  saveMistakes(updated);
}

export function loadExamAttempts(): ExamAttempt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXAM_ATTEMPTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function recordExamAttempt(attempt: ExamAttempt): void {
  const all = loadExamAttempts();
  all.unshift(attempt);
  try {
    localStorage.setItem(STORAGE_KEYS.EXAM_ATTEMPTS, JSON.stringify(all.slice(0, 50)));
  } catch (e) {
    console.error('Failed to save exam attempt:', e);
  }
}

// ----------------------------------------------------
// EXAM INTELLIGENCE & PRACTICE TEST SIMULATOR HELPERS
// ----------------------------------------------------

export function loadExamQuestions(): ExamQuestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXAM_QUESTIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.EXAM_QUESTIONS, JSON.stringify(SAMPLE_PAST_EXAMS_QUESTIONS));
      return SAMPLE_PAST_EXAMS_QUESTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SAMPLE_PAST_EXAMS_QUESTIONS;
  } catch (e) {
    return SAMPLE_PAST_EXAMS_QUESTIONS;
  }
}

export function saveExamQuestions(questions: ExamQuestion[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EXAM_QUESTIONS, JSON.stringify(questions));
  } catch (e) {
    console.error('Failed to save exam questions:', e);
  }
}

export function addExamQuestions(newQuestions: ExamQuestion[]): ExamQuestion[] {
  const existing = loadExamQuestions();
  const existingIds = new Set(existing.map((q) => q.id));
  const toAdd = newQuestions.filter((q) => !existingIds.has(q.id));
  const combined = [...toAdd, ...existing];
  saveExamQuestions(combined);
  return combined;
}

export function loadTopicRadar(): TopicRadarAnalysis {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TOPIC_RADAR);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TOPIC_RADAR, JSON.stringify(INITIAL_TOPIC_RADAR));
      return INITIAL_TOPIC_RADAR;
    }
    const parsed = JSON.parse(raw);
    return parsed?.weight_matrix ? parsed : INITIAL_TOPIC_RADAR;
  } catch (e) {
    return INITIAL_TOPIC_RADAR;
  }
}

export function saveTopicRadar(analysis: TopicRadarAnalysis): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TOPIC_RADAR, JSON.stringify(analysis));
  } catch (e) {
    console.error('Failed to save topic radar:', e);
  }
}

export function loadExamSessions(): ExamSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXAM_SESSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveExamSession(session: ExamSession): void {
  const all = loadExamSessions();
  const idx = all.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    all[idx] = session;
  } else {
    all.unshift(session);
  }
  try {
    localStorage.setItem(STORAGE_KEYS.EXAM_SESSIONS, JSON.stringify(all.slice(0, 30)));
  } catch (e) {
    console.error('Failed to save exam session:', e);
  }
}

