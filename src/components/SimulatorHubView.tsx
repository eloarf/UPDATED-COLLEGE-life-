import React from 'react';
import { ExamQuestion, ExamSession, TopicRadarAnalysis } from '../types/study';
import {
  Play,
  Clock,
  BookOpen,
  Award,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Layers,
  CheckCircle2,
  Calendar,
  FileCheck2,
} from 'lucide-react';

interface SimulatorHubViewProps {
  questions: ExamQuestion[];
  sessions: ExamSession[];
  radar: TopicRadarAnalysis;
  courseCode: string;
  hasMistakes: boolean;
  onOpenConfigModal: (preset?: { mode?: 'strict' | 'tutor'; source?: string; topic?: string }) => void;
  onReviewPastSession: (session: ExamSession) => void;
  onOpenIngestModal: () => void;
}

export const SimulatorHubView: React.FC<SimulatorHubViewProps> = ({
  questions,
  sessions,
  radar,
  courseCode,
  hasMistakes,
  onOpenConfigModal,
  onReviewPastSession,
  onOpenIngestModal,
}) => {
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const pastExamQuestions = questions.filter((q) => q.source_type === 'past_exam');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Exam Simulator Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>AI Practice Test Simulator & Auto-Grader</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {courseCode} Examination Simulator
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Practice in authentic test conditions with real past university exam papers and AI-generated modules. Features automatic multi-format grading (MCQ, Short Answer, Code) with official letter grades and rubrics.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-400">
            <span className="font-mono text-slate-300">
              <strong className="text-white">{questions.length}</strong> Questions in Bank
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-mono text-slate-300">
              <strong className="text-cyan-400">{pastExamQuestions.length}</strong> Past Exam Items
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-mono text-slate-300">
              <strong className="text-indigo-400">{completedSessions.length}</strong> Practice Tests Taken
            </span>
          </div>
        </div>

        {/* 3 Core Quick Launch Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Card 1: Strict Exam Mode */}
          <div
            onClick={() => onOpenConfigModal({ mode: 'strict' })}
            className="p-5 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-rose-500/50 rounded-2xl cursor-pointer transition-all flex flex-col justify-between group space-y-4"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                  Strict Exam Mode
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Strict timed countdown, locked answers, and realistic exam pressure. Submit to unlock letter grade and rubrics.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-rose-400">
              <span>Simulate Strict Exam</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Tutor Mode */}
          <div
            onClick={() => onOpenConfigModal({ mode: 'tutor' })}
            className="p-5 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl cursor-pointer transition-all flex flex-col justify-between group space-y-4"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Interactive Tutor Mode
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Learn as you go: instant evaluation, grading rubrics, hints, and explanations revealed after each answer.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span>Start Guided Practice</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Mistake Review Exam */}
          <div
            onClick={() => onOpenConfigModal({ source: 'mistake_review' })}
            className="p-5 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 rounded-2xl cursor-pointer transition-all flex flex-col justify-between group space-y-4"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                  Mistake Review Exam
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Generates an exam strictly from questions you previously failed across past tests until you reach mastery.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-amber-400">
              <span>Target Weak Spots</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* High-Yield Radar Quick Trigger Banner */}
      {radar && radar.weight_matrix.length > 0 && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono text-cyan-400 uppercase font-semibold">
              Top High-Yield Focus: {radar.predicted_focus_order[0]}
            </span>
            <h3 className="text-base font-bold text-white">
              Targeted Simulation for #1 Recurring Exam Topic
            </h3>
            <p className="text-xs text-slate-400 max-w-xl">
              Historical analysis shows this topic accounts for ~{radar.weight_matrix[0]?.average_exam_points_pct}% of total exam points.
            </p>
          </div>
          <button
            onClick={() => onOpenConfigModal({ topic: radar.predicted_focus_order[0] })}
            className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shrink-0 flex items-center gap-2 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Simulate Top Topic Test</span>
          </button>
        </div>
      )}

      {/* Past Completed Practice Exam Sessions History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Past Practice Test Attempts</h3>
            <p className="text-xs text-slate-400">
              Review completed exams, official letter grades, and rubrics.
            </p>
          </div>
          <button
            onClick={() => onOpenConfigModal()}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline"
          >
            + New Custom Simulation
          </button>
        </div>

        {completedSessions.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400 space-y-2">
            <Award className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-200">No Exams Completed Yet</h4>
            <p className="text-xs text-slate-500">
              Launch your first practice test above to calibrate your letter grade scorecard.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedSessions.map((s) => (
              <div
                key={s.id}
                onClick={() => onReviewPastSession(s)}
                className="p-5 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-2xl cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                      {s.title}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {s.total_questions} Questions
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                    <span>Score: {s.score_percentage}%</span>
                    <span aria-hidden="true">·</span>
                    <span>Time: {Math.round(s.time_spent_seconds / 60)} mins</span>
                    <span aria-hidden="true">·</span>
                    <span>{new Date(s.started_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {s.letter_grade && (
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-base ${
                        s.letter_grade.startsWith('A')
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : s.letter_grade.startsWith('B')
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {s.letter_grade}
                    </div>
                  )}
                  <span className="text-xs text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform">
                    Inspect Report →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
